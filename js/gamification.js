window.checkWhiteFlagStatus = async function() {
    if (!window.currentProfile) return;
    
    const content = document.getElementById('peace-area');
    // Si no existe el contenedor (porque cambiamos de vista), lo buscamos o creamos en dynamic-content
    if(!content) {
        document.getElementById('dynamic-content').innerHTML = '<div id="peace-area"></div>';
    }
    const area = document.getElementById('peace-area');
    area.innerHTML = 'Cargando...';

    const myId = window.currentProfile.id;
    const { data: couple } = await window.db
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
        .maybeSingle();

    if (!couple) return;

    let html = '';
    
    if (couple.white_flag_status === 'none' || !couple.white_flag_status) {
        html = `
            <div style="text-align:center; padding:20px;">
                <div style="font-size:3rem; margin-bottom:10px;">🏳️</div>
                <h3>Zona de Tregua</h3>
                <p style="color:#aaa; margin-bottom:20px;">Si tuvieron una discusión, usa este botón para pedir paz.</p>
                <button onclick="sendFlag('${couple.id}')" class="btn-primary" style="background:#636e72">Levantar Bandera</button>
            </div>
        `;
    } else if (couple.white_flag_status === 'sent') {
        if (couple.white_flag_sender === myId) {
            html = `<div class="garden-card"><h3>🏳️ Enviada</h3><p>Esperando a tu pareja...</p></div>`;
        } else {
            html = `
                <div class="garden-card" style="border-color:var(--primary)">
                    <h3>🏳️ Tu pareja pide Paz</h3>
                    <p>Acepta para ganar +50 XP ambos.</p>
                    <button onclick="acceptFlag('${couple.id}', '${couple.white_flag_sender}')" class="btn-primary">Aceptar Tregua</button>
                </div>
            `;
        }
    } else if (couple.white_flag_status === 'accepted') {
        html = `
            <div class="garden-card" style="border-color:var(--accent)">
                <h3 style="color:var(--accent)">✨ Paz Restaurada</h3>
                <p>El amor es más fuerte.</p>
                <button onclick="resetFlag('${couple.id}')" class="btn-primary" style="background:#333; margin-top:10px;">Cerrar ciclo</button>
            </div>
        `;
    }
    
    document.getElementById('peace-area').innerHTML = html;
};

window.sendFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'sent', white_flag_sender: window.currentProfile.id }).eq('id', id);
    window.checkWhiteFlagStatus();
};

window.acceptFlag = async (id, partnerId) => {
    await window.db.from('couples').update({ white_flag_status: 'accepted' }).eq('id', id);
    await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 50 });
    await window.db.rpc('add_xp', { user_id: partnerId, points: 50 });
    window.showToast("¡Paz y +50 XP!", "success");
    window.refreshUserProfile();
    window.checkWhiteFlagStatus();
};

window.resetFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'none' }).eq('id', id);
    window.checkWhiteFlagStatus();
};
