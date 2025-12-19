// js/gamification.js

// Verificar estado de la bandera (Botón Paz)
window.checkWhiteFlagStatus = async function() {
    // Seguridad: Si no hay perfil cargado, no hacemos nada
    if (!window.currentProfile || !window.currentProfile.id) {
        console.warn("Perfil no cargado aún.");
        return; 
    }

    const contentDiv = document.getElementById('content-area');
    const myId = window.currentProfile.id;

    // Buscar si tengo pareja vinculada
    // Nota: Ajusta la lógica si tu tabla couples es diferente
    const { data: couple, error } = await window.db
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
        .maybeSingle();

    if (error) {
        console.error("Error buscando pareja:", error);
        return;
    }

    if (!couple) {
        contentDiv.innerHTML = `
            <div class="garden-card" style="background:var(--card-dark); border-color:#333;">
                <h3 style="color:var(--text-main)">💔 Sin vínculo</h3>
                <p>Aún no tienes una pareja vinculada en la app.</p>
            </div>`;
        return;
    }

    let html = `<h2 class="section-title">🏳️ Zona de Paz</h2><div style="padding:0 20px">`;

    if (couple.white_flag_status === 'none' || !couple.white_flag_status) {
        html += `
            <div class="wisdom-box" style="background:var(--card-dark); color:white; border:1px solid #333;">
                <h4>¿Discusión difícil?</h4>
                <p>Usa este botón para pedir una tregua a tu pareja. Es el primer paso para reconciliarse.</p>
            </div>
            <br>
            <button onclick="sendWhiteFlag('${couple.id}')" class="btn-primary" style="background:var(--text-muted)">
                🏳️ Levantar Bandera Blanca
            </button>
        `;
    } 
    else if (couple.white_flag_status === 'sent') {
        if (couple.white_flag_sender === myId) {
            html += `
                <div class="garden-card">
                    <h3>🏳️ Bandera Enviada</h3>
                    <p>Esperando que tu pareja acepte la tregua...</p>
                </div>`;
        } else {
            // ¡La pareja ve esto!
            html += `
                <div class="garden-card" style="border-color:var(--primary)">
                    <h3 style="color:white">🏳️ Tu pareja pide Paz</h3>
                    <p>Al aceptar, ambos ganarán 50 XP y se restaurará la armonía.</p>
                    <button onclick="acceptWhiteFlag('${couple.id}', '${couple.white_flag_sender}')" class="btn-primary">
                        Aceptar Tregua (+50 XP)
                    </button>
                </div>
            `;
        }
    } 
    else if (couple.white_flag_status === 'accepted') {
        html += `
            <div class="garden-card" style="border-color:var(--accent-green)">
                <h3 style="color:var(--accent-green)">✨ ¡Paz Restaurada!</h3>
                <p>El conflicto ha terminado. Abrácense.</p>
                <button onclick="resetFlag('${couple.id}')" class="btn-primary" style="margin-top:10px; background:#333">
                    Nueva conversación
                </button>
            </div>`;
    }

    html += '</div>';
    contentDiv.innerHTML = html;
};

// Enviar bandera
window.sendWhiteFlag = async function(coupleId) {
    if (!window.currentProfile) return;
    
    const { error } = await window.db
        .from('couples')
        .update({ 
            white_flag_status: 'sent', 
            white_flag_sender: window.currentProfile.id 
        })
        .eq('id', coupleId);
    
    if(!error) window.checkWhiteFlagStatus();
};

// Aceptar bandera
window.acceptWhiteFlag = async function(coupleId, partnerId) {
    if (!window.currentProfile) return;

    // 1. Actualizar estado
    const { error } = await window.db
        .from('couples')
        .update({ white_flag_status: 'accepted' })
        .eq('id', coupleId);

    if (!error) {
        // 2. Dar puntos (RPC)
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 50 });
        await window.db.rpc('add_xp', { user_id: partnerId, points: 50 });

        window.showModal("🕊️ Paz Restaurada", "Han ganado +50 XP. ¡El amor gana!");
        window.refreshUserProfile(); // Actualizar header
        window.checkWhiteFlagStatus();
    }
};

// Resetear bandera
window.resetFlag = async function(coupleId) {
    await window.db.from('couples').update({ white_flag_status: 'none' }).eq('id', coupleId);
    window.checkWhiteFlagStatus();
};

// --- TIENDA DE PREMIOS ---
window.openRewards = async function() {
    if (!window.db) return;

    const contentDiv = document.getElementById('content-area');
    contentDiv.innerHTML = '<div style="text-align:center; padding:20px">Cargando premios...</div>';

    const { data: rewards, error } = await window.db.from('rewards').select('*');

    if (error) {
        console.error(error);
        return;
    }

    let html = `<h2 class="section-title">🎁 Canjea tus Puntos</h2><div style="padding:0 20px; padding-bottom:80px;">`;
    
    rewards.forEach(reward => {
        const canAfford = (window.currentProfile?.xp || 0) >= reward.xp_cost;
        html += `
            <div style="background:var(--card-dark); padding:15px; border-radius:15px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; border:1px solid #333;">
                <div style="font-size:2rem; margin-right:15px;">${reward.icon || '🎟️'}</div>
                <div style="flex:1;">
                    <h4 style="color:white; margin-bottom:5px;">${reward.title}</h4>
                    <small style="color:var(--primary); font-weight:bold;">${reward.xp_cost} XP</small>
                </div>
                <button 
                    onclick="alert('Función de canje en construcción')" 
                    class="btn-primary" 
                    style="width:auto; padding:8px 15px; margin:0; ${!canAfford ? 'opacity:0.5; background:#333;' : ''}"
                    ${!canAfford ? 'disabled' : ''}>
                    Canjear
                </button>
            </div>
        `;
    });
    html += '</div>';
    contentDiv.innerHTML = html;
};
