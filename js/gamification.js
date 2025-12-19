// --- BANDERA BLANCA (PAZ) ---

async function checkWhiteFlagStatus() {
    const contentDiv = document.getElementById('content-area');
    const myId = currentProfile.id;

    // Buscar si tengo pareja y el estado
    const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
        .single();

    if (!couple) {
        contentDiv.innerHTML = `<p style="text-align:center; margin-top:20px">Aún no tienes pareja vinculada.</p>`;
        return;
    }

    let html = `<h2>🏳️ Zona de Paz</h2><br>`;

    if (couple.white_flag_status === 'none') {
        html += `
            <p>Si tuvieron una discusión, usa este botón para pedir una tregua.</p>
            <br>
            <button onclick="sendWhiteFlag('${couple.id}')" class="btn-secondary">
                Levantar Bandera Blanca
            </button>
        `;
    } 
    else if (couple.white_flag_status === 'sent') {
        if (couple.white_flag_sender === myId) {
            html += `<p class="loader">Esperando que tu pareja acepte la paz...</p>`;
        } else {
            // ¡Aquí es donde la pareja ve la solicitud!
            html += `
                <div class="action-box" style="background:#e3f2fd">
                    <h3>Tu pareja pide Paz</h3>
                    <p>Al aceptar, ambos ganarán 50 XP y se restaurará la armonía.</p>
                    <button onclick="acceptWhiteFlag('${couple.id}', '${couple.white_flag_sender}')" class="btn-primary">
                        Aceptar Tregua (+50 XP)
                    </button>
                </div>
            `;
        }
    } 
    else if (couple.white_flag_status === 'accepted') {
        html += `<div class="wisdom-box"><h3>✨ ¡Reconciliación exitosa!</h3><p>La paz ha sido restaurada.</p></div>`;
        // Botón para resetear (opcional)
        setTimeout(() => resetFlag(couple.id), 5000); 
    }

    contentDiv.innerHTML = html;
}

// Enviar bandera
async function sendWhiteFlag(coupleId) {
    await supabase.from('couples').update({
        white_flag_status: 'sent',
        white_flag_sender: currentProfile.id
    }).eq('id', coupleId);
    checkWhiteFlagStatus();
}

// Aceptar bandera (SOLUCIÓN PUNTO 2)
async function acceptWhiteFlag(coupleId, partnerId) {
    // 1. Actualizar DB
    await supabase.from('couples').update({
        white_flag_status: 'accepted'
    }).eq('id', coupleId);

    // 2. Dar puntos a AMBOS
    await supabase.rpc('add_xp', { user_id: currentProfile.id, points: 50 });
    await supabase.rpc('add_xp', { user_id: partnerId, points: 50 });

    showModal("🕊️ Paz Restaurada", "Ambos han ganado +50 XP. ¡Vayan a abrazarse!");
    
    refreshUserProfile(); // Actualizar mi contador
    checkWhiteFlagStatus();
}

// Reseteo automático o manual para futuras peleas
async function resetFlag(coupleId) {
    await supabase.from('couples').update({ white_flag_status: 'none' }).eq('id', coupleId);
    checkWhiteFlagStatus();
}

// --- TIENDA DE PREMIOS ---
async function openRewards() {
    const contentDiv = document.getElementById('content-area');
    contentDiv.innerHTML = '<div class="loader">Cargando premios...</div>';

    const { data: rewards } = await supabase.from('rewards').select('*');

    let html = `<h2>🎁 Canjea tus Puntos</h2><div class="rewards-grid">`;
    
    rewards.forEach(reward => {
        const canAfford = currentProfile.xp >= reward.xp_cost;
        html += `
            <div class="challenge-card" style="margin-bottom:10px">
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <div style="font-size:2em">${reward.icon || '🎟️'}</div>
                    <div style="text-align:right">
                        <h4>${reward.title}</h4>
                        <small>${reward.xp_cost} XP</small>
                    </div>
                </div>
                <button 
                    onclick="redeemReward(${reward.id}, ${reward.xp_cost})" 
                    class="${canAfford ? 'btn-primary' : 'btn-secondary'}" 
                    ${!canAfford ? 'disabled style="opacity:0.5"' : ''}>
                    ${canAfford ? 'Canjear' : 'Faltan puntos'}
                </button>
            </div>
        `;
    });
    html += '</div>';
    contentDiv.innerHTML = html;
}
