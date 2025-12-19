// ==========================================
// GAMIFICACIÓN Y SOCIAL
// ==========================================

// 1. BANDERA BLANCA
// ------------------------------------------
window.checkWhiteFlagStatus = async function() {
    if (!window.currentCouple) return;
    const contentDiv = document.getElementById('peace-area');
    if (!contentDiv) {
        const dyn = document.getElementById('dynamic-content');
        if (dyn) dyn.innerHTML = '<div id="peace-area"></div>'; else return;
    }
    
    const area = document.getElementById('peace-area');
    const myId = window.currentProfile.id;

    try {
        const { data: couple } = await window.db.from('couples').select('*').eq('id', window.currentCouple.id).single();
        
        let html = '<div style="padding:0 20px">';
        if (couple.white_flag_status === 'none' || !couple.white_flag_status) {
            html += `<div class="wisdom-box" style="text-align:center; padding:30px; background:var(--card-bg); border:1px solid #333; border-radius:15px;">
                <div style="font-size:3rem; margin-bottom:10px;">🏳️</div>
                <h3>Zona de Tregua</h3>
                <p style="color:#aaa;">¿Discutieron? Levanta la bandera para pedir paz.<br><small style="color:var(--accent);">+10 XP al enviar</small></p>
                <button onclick="sendFlag('${couple.id}')" class="btn-primary" style="background:#636e72">Levantar Bandera</button></div>`;
        } else if (couple.white_flag_status === 'sent') {
            if (couple.white_flag_sender === myId) {
                html += `<div class="garden-card"><h3>🏳️ Bandera Enviada</h3><p>Esperando respuesta...</p></div>`;
            } else {
                html += `<div class="garden-card" style="border-color:var(--primary);"><h3 style="color:white">🏳️ Tu pareja pide Paz</h3>
                <p>Al aceptar, la armonía se restaura.<br><small style="color:var(--accent);">+25 XP al aceptar</small></p>
                <button onclick="acceptFlag('${couple.id}')" class="btn-primary">Aceptar Tregua</button></div>`;
            }
        } else if (couple.white_flag_status === 'accepted') {
            html += `<div class="garden-card" style="border-color:var(--accent)"><h3 style="color:var(--accent)">✨ Paz Restaurada</h3>
            <p>El amor gana.</p><button onclick="resetFlag('${couple.id}')" class="btn-primary" style="background:#333; margin-top:10px;">Cerrar ciclo</button></div>`;
        }
        html += '</div>';
        area.innerHTML = html;
    } catch (e) { console.error(e); }
};

window.sendFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'sent', white_flag_sender: window.currentProfile.id }).eq('id', id);
    await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 10 });
    window.showToast("Bandera enviada", "success");
    window.checkWhiteFlagStatus();
};
window.acceptFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'accepted' }).eq('id', id);
    await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 25 });
    window.showToast("Paz aceptada", "success");
    window.checkWhiteFlagStatus();
};
window.resetFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'none' }).eq('id', id);
    window.checkWhiteFlagStatus();
};

// 2. PETICIONES (Con penalización y botón mejorado)
// ------------------------------------------
window.loadPrayers = async function() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando...</div>';

    // Checar expiradas
    await checkExpiredRequests();

    const { data: items } = await window.db.from('shared_content').select('*').eq('couple_id', window.currentCouple.id).eq('type', 'request').order('created_at', { ascending: false }).limit(10);

    let html = `
        <div style="padding:0 20px 80px 20px;">
            <div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px; border:1px solid #333;">
                <h3>🙏 Nueva Petición</h3>
                <textarea id="prayer-input" class="input-field" style="height:60px;" placeholder="¿Qué necesitas de tu pareja hoy?"></textarea>
                <button onclick="saveSharedContent('request')" class="btn-primary">Publicar</button>
            </div>
            <div id="prayers-list">`;

    if(items && items.length > 0) {
        items.forEach(item => {
            const isMine = item.user_id === window.currentProfile.id;
            const supporters = item.supporters || [];
            const amISupporting = supporters.includes(window.currentProfile.id);
            let action = '';

            if (!isMine) {
                // Petición de la pareja
                if (amISupporting) {
                    // Botón deshabilitado con estilo "Active"
                    action = `<button disabled class="btn-support active">✅ Lo tomo en cuenta</button>`;
                } else {
                    // Botón habilitado
                    action = `<button onclick="supportPrayer('${item.id}', this)" class="btn-support">🤝 Lo tomo en cuenta</button>`;
                }
            } else {
                // Mi petición
                if(supporters.length > 0) action = `<span style="color:var(--primary); font-size:0.8rem;">❤️ Tu pareja te escuchó</span>`;
                else action = `<span style="color:#666; font-size:0.8rem;">Esperando respuesta...</span>`;
            }

            html += `
                <div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:10px; border-left:3px solid ${isMine?'var(--primary)':'#fff'};">
                    <p style="color:#ddd; font-style:italic;">"${item.content}"</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <small style="color:#666;">${new Date(item.created_at).toLocaleDateString()}</small>
                        ${action}
                    </div>
                </div>`;
        });
    } else html += `<p style="text-align:center; color:#666;">No hay peticiones recientes.</p>`;
    
    html += '</div></div>';
    container.innerHTML = html;
};

// Función Penalización 24h
async function checkExpiredRequests() {
    try {
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const partnerId = (window.currentCouple.user1_id === window.currentProfile.id) ? window.currentCouple.user2_id : window.currentCouple.user1_id;
        
        const { data: expired } = await window.db.from('shared_content')
            .select('id, supporters')
            .eq('user_id', partnerId)
            .eq('type', 'request')
            .lt('created_at', yesterday)
            .eq('penalized', false);

        if(expired) {
            for(let req of expired) {
                if(!req.supporters || req.supporters.length === 0) {
                    await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: -5 });
                    await window.db.from('shared_content').update({ penalized: true }).eq('id', req.id);
                    window.showToast("Perdiste 5 XP por ignorar una petición", "error");
                }
            }
        }
    } catch(e) { console.error(e); }
}

// Función Apoyar (Actualiza UI al instante)
window.supportPrayer = async function(id, btn) {
    if(btn) { btn.disabled = true; btn.innerText = "Enviando..."; }
    try {
        const { data: item } = await window.db.from('shared_content').select('supporters').eq('id', id).single();
        let arr = item.supporters || [];
        if(!arr.includes(window.currentProfile.id)) {
            arr.push(window.currentProfile.id);
            await window.db.from('shared_content').update({ supporters: arr }).eq('id', id);
            await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 5 });
            window.showToast("Gracias por escuchar (+5 XP)", "success");
            // No recargamos toda la lista para evitar saltos, solo actualizamos visualmente si es posible
            // Pero como queremos que la pareja lo vea, el Realtime se encargará de actualizar la lista completa
        }
    } catch(e) { 
        console.error(e); 
        window.showToast("Error", "error");
        if(btn) { btn.disabled = false; btn.innerText = "Reintentar"; }
    }
};

// 3. PREGUNTAS Y PREMIOS (Mantener funciones anteriores)
window.loadDeepQuestion = async function() { /* ... Código anterior de preguntas ... */ 
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando...</div>';
    
    const questions = ["¿Cuál es un recuerdo feliz nuestro?", "¿Qué admiras de mí?", "¿Cuándo te sentiste más amado?", "¿Qué sueño te da miedo?", "¿Qué es 'hogar' para ti?"];
    const today = new Date();
    const index = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000) % questions.length;
    const q = questions[index];

    const { data: ans } = await window.db.from('shared_content').select('*').eq('couple_id', window.currentCouple.id).eq('type', 'answer').order('created_at', { ascending: false });

    let html = `<div style="padding:0 20px 80px;">
        <div class="garden-card" style="margin:0 0 20px;"><h3 style="color:#aaa; font-size:0.8rem">PREGUNTA DEL DÍA</h3><h2 style="color:white; margin:10px 0;">"${q}"</h2></div>
        <div style="background:var(--card-bg); padding:15px; border-radius:15px; border:1px solid #333;">
            <textarea id="answer-input" class="input-field" style="height:70px;" placeholder="Tu respuesta..."></textarea>
            <button onclick="saveSharedContent('answer', '${q}')" class="btn-primary">Compartir (+5 XP)</button>
        </div>
        <h3 style="margin-top:30px;">Respuestas</h3>`;
    
    if(ans) ans.forEach(a => {
        const mine = a.user_id === window.currentProfile.id;
        html += `<div style="background:#252a35; padding:15px; margin-top:10px; border-radius:10px; border:1px solid ${mine?'#444':'var(--primary)'}"><small style="color:${mine?'#888':'var(--primary)'}">${mine?'Tú':'Tu pareja'}:</small><p style="color:#ddd; margin-top:5px;">${a.content}</p></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
};

window.loadRewards = async function() { /* ... Código anterior de premios ... */ 
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando...</div>';
    const { data: rw } = await window.db.from('rewards').select('*').order('cost');
    const xp = window.currentProfile.xp || 0;
    let html = `<div style="padding:0 20px 80px;"><h2 style="text-align:center; color:var(--accent);">${xp} XP</h2><div id="rewards-list">`;
    if(rw) rw.forEach(r => {
        const can = xp >= r.cost;
        html += `<div class="reward-card" style="opacity:${can?1:0.6}"><div style="display:flex; gap:10px; align-items:center;"><span style="font-size:1.5rem">${r.icon}</span><div><div>${r.title}</div><small class="reward-cost">${r.cost} XP</small></div></div><button onclick="${can?`redeemReward('${r.title}',${r.cost})`:''}" class="btn-primary" style="width:auto; padding:5px 10px; font-size:0.8rem; background:${can?'var(--primary)':'#333'}">Canjear</button></div>`;
    });
    html += '</div></div>';
    container.innerHTML = html;
};

window.redeemReward = async (t, c) => {
    if(confirm(`¿Canjear "${t}"?`)) {
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: -c });
        window.showModal("¡Canjeado!", `Cobrar: <b>${t}</b>`);
        window.loadRewards();
    }
};

window.loadTips = function() {
    const tips = ["Escucha para entender.", "Un abrazo largo cura.", "Agradece algo hoy.", "No duerman enojados."];
    const t = tips[Math.floor(Math.random()*tips.length)];
    document.getElementById('dynamic-content').innerHTML = `<div style="padding:40px; text-align:center;"><h1>💡</h1><h3>Consejo</h3><div style="background:#222; padding:20px; border-radius:10px; margin-top:20px">"${t}"</div></div>`;
};

// GUARDAR GENÉRICO
window.saveSharedContent = async function(type, extra='') {
    const id = type==='request'?'prayer-input':'answer-input';
    const val = document.getElementById(id).value.trim();
    if(!val) return window.showToast("Escribe algo", "error");
    const content = (type==='answer')?`[P: ${extra}]\n${val}`:val;
    
    try {
        await window.db.from('shared_content').insert({ user_id: window.currentProfile.id, couple_id: window.currentCouple.id, type, content });
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 5 });
        window.showToast("Guardado (+5 XP)", "success");
        if(type==='request') window.loadPrayers();
        if(type==='answer') window.loadDeepQuestion();
    } catch(e) { window.showToast("Error", "error"); }
};
