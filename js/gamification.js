// ==========================================
// GAMIFICACIÓN Y SOCIAL
// ==========================================

// 1. BANDERA BLANCA
window.checkWhiteFlagStatus = async function() {
    if(!window.currentCouple) return;
    const cd = document.getElementById('peace-area'); if(!cd && document.getElementById('dynamic-content')) return;
    const area = document.getElementById('peace-area'); if(!area) return;

    try {
        const { data: c } = await window.db.from('couples').select('*').eq('id', window.currentCouple.id).single();
        let h = '<div style="padding:0 20px">';
        if(c.white_flag_status==='none'||!c.white_flag_status) h+=`<div style="text-align:center; padding:30px; background:var(--card-bg); border:1px solid #333; border-radius:15px;"><div style="font-size:3rem">🏳️</div><h3>Zona de Tregua</h3><p style="color:#aaa">Pide paz.<br><small style="color:var(--accent)">+10 XP</small></p><button onclick="sendFlag('${c.id}')" class="btn-primary" style="background:#636e72">Levantar Bandera</button></div>`;
        else if(c.white_flag_status==='sent') h+= (c.white_flag_sender===window.currentProfile.id) ? `<div class="garden-card"><h3>🏳️ Bandera Enviada</h3><p>Esperando...</p></div>` : `<div class="garden-card" style="border-color:var(--primary)"><h3 style="color:white">🏳️ Piden Paz</h3><p>Acepta para restaurar armonía.<br><small style="color:var(--accent)">+25 XP</small></p><button onclick="acceptFlag('${c.id}')" class="btn-primary">Aceptar</button></div>`;
        else if(c.white_flag_status==='accepted') h+=`<div class="garden-card" style="border-color:var(--accent)"><h3 style="color:var(--accent)">✨ Paz Restaurada</h3><button onclick="resetFlag('${c.id}')" class="btn-primary" style="background:#333; margin-top:10px">Cerrar</button></div>`;
        area.innerHTML = h + '</div>';
    } catch(e) { console.error(e); }
};
window.sendFlag=async(id)=>{await window.db.from('couples').update({white_flag_status:'sent',white_flag_sender:window.currentProfile.id}).eq('id',id);await window.db.rpc('add_xp',{user_id:window.currentProfile.id,points:10});await window.refreshUserProfile();window.showToast("Enviada (+10 XP)");window.checkNotifications();window.checkWhiteFlagStatus();};
window.acceptFlag=async(id)=>{await window.db.from('couples').update({white_flag_status:'accepted'}).eq('id',id);await window.db.rpc('add_xp',{user_id:window.currentProfile.id,points:25});await window.refreshUserProfile();window.showToast("Aceptada (+25 XP)");window.checkNotifications();window.checkWhiteFlagStatus();};
window.resetFlag=async(id)=>{await window.db.from('couples').update({white_flag_status:'none'}).eq('id',id);window.checkWhiteFlagStatus();};

// 2. PETICIONES
window.loadPrayers = async function() {
    const c = document.getElementById('dynamic-content'); c.innerHTML='<div class="loader">Cargando...</div>';
    const {data:items} = await window.db.from('shared_content').select('*').eq('couple_id',window.currentCouple.id).eq('type','request').order('created_at',{ascending:false}).limit(10);
    
    let h = `<div style="padding:0 20px 80px;"><div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px; border:1px solid #333;"><h3>🙏 Petición</h3><textarea id="prayer-input" class="input-field" style="height:60px;" placeholder="¿Qué necesitas?"></textarea><button onclick="saveSharedContent('request')" class="btn-primary">Publicar</button></div><div id="prayers-list">`;
    
    if(items&&items.length>0) items.forEach(i => {
        const mine = i.user_id===window.currentProfile.id;
        const status = i.status || 'pending';
        let statusHtml = '';

        if (!mine) { 
            if(status === 'pending') statusHtml = `<button onclick="updatePrayerStatus('${i.id}', 'ack')" class="btn-primary" style="margin:5px 0; font-size:0.8rem; background:var(--primary)">👁️ Enterado</button>`;
            else if(status === 'ack') statusHtml = `<button onclick="updatePrayerStatus('${i.id}', 'done')" class="btn-action-green" style="margin:5px 0;">✅ Marcar Cumplido</button>`;
            else statusHtml = `<span class="status-badge status-done">¡Cumplido! 🎉</span>`;
        } else { 
            if(status === 'pending') statusHtml = `<span class="status-badge status-pending">Esperando...</span>`;
            else if(status === 'ack') statusHtml = `<span class="status-badge status-process">En Proceso ⏳</span>`;
            else statusHtml = `<span class="status-badge status-done">¡Tu pareja cumplió! ❤️</span>`;
        }

        h+=`<div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:10px; border-left:3px solid ${mine?'var(--primary)':'#fff'}"><p style="color:#ddd; font-style:italic">"${i.content}"</p><div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px"><small style="color:#666">${new Date(i.created_at).toLocaleDateString()}</small><div>${statusHtml}</div></div></div>`;
    });
    else h+=`<p style="text-align:center; color:#666">No hay peticiones.</p>`;
    c.innerHTML = h+'</div></div>';
};

window.updatePrayerStatus = async function(id, status) {
    try {
        const { error } = await window.db.from('shared_content').update({status: status}).eq('id', id);
        if(error) throw error;
        
        if(status === 'done') {
            await window.db.rpc('add_xp', {user_id: window.currentProfile.id, points: 20});
            await window.refreshUserProfile();
            window.showToast("¡Gracias! (+20 XP)", "success");
        } else {
            window.showToast("Estado actualizado");
        }
        window.loadPrayers();
    } catch(e) { console.error(e); window.showToast("Error al actualizar", "error"); }
};

// 3. PREMIOS
window.loadRewards = async function() {
    const c = document.getElementById('dynamic-content'); c.innerHTML='<div class="loader">Cargando...</div>';
    
    const { data: active } = await window.db.from('active_redemptions').select('*').eq('couple_id', window.currentCouple.id).eq('status', 'pending');
    const { data: rw } = await window.db.from('rewards').select('*').order('cost');
    const xp = window.currentProfile.xp || 0;

    let h = `<div style="padding:0 20px 80px;">
        <div style="text-align:center; padding:20px; background:#252a35; border-radius:15px; margin-bottom:20px">
            <h2 style="color:var(--accent); margin:0">${xp} XP</h2><p style="color:#888">Disponibles</p>
        </div>`;

    if(active && active.length > 0) {
        h += `<h3>⚠️ Canjes Activos</h3>`;
        active.forEach(a => {
            const iRedeemed = a.user_id === window.currentProfile.id; 
            if (iRedeemed) {
                h += `<div class="reward-card pending-reward">
                    <div><b>PEDISTE:</b> ${a.reward_title}</div>
                    <button onclick="completeRedemption('${a.id}')" class="btn-action-green">✅ Ya lo recibí</button>
                </div>`;
            } else {
                h += `<div class="reward-card pending-reward"><div><b>DEBES CUMPLIR:</b> ${a.reward_title}</div><small style="color:var(--text-gray)">Tu pareja debe confirmar</small></div>`;
            }
        });
        h += `<hr style="border:0; border-top:1px solid #333; margin:20px 0;">`;
    }

    h += `<h3>Catálogo</h3>`;
    if(rw) rw.forEach(r => {
        const can = xp >= r.cost;
        h+=`<div class="reward-card" style="opacity:${can?1:0.6}"><div style="display:flex; gap:10px; align-items:center;"><span style="font-size:1.5rem">${r.icon}</span><div><div>${r.title}</div><small class="reward-cost">${r.cost} XP</small></div></div><button onclick="${can?`redeemReward('${r.title}',${r.cost})`:''}" class="btn-primary" style="width:auto; padding:5px 10px; background:${can?'var(--primary)':'#333'}">Canjear</button></div>`;
    });
    c.innerHTML = h+'</div>';
};

window.redeemReward = async (t, c) => {
    if(confirm(`¿Canjear "${t}"?`)) {
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: -c });
        await window.db.from('active_redemptions').insert({couple_id: window.currentCouple.id, user_id: window.currentProfile.id, reward_title: t});
        window.showModal("¡Canjeado!", `Tu pareja verá que te debe: <b>${t}</b>`);
        await window.refreshUserProfile();
        window.loadRewards();
    }
};

window.completeRedemption = async (id) => {
    if(confirm("¿Confirmas que ya recibiste este premio?")) {
        await window.db.from('active_redemptions').update({status: 'completed'}).eq('id', id);
        window.showToast("¡Disfrútalo! Canje cerrado.");
        window.loadRewards();
    }
};

// 4. OTROS
window.loadDeepQuestion = async function() {
    const c = document.getElementById('dynamic-content'); c.innerHTML='<div class="loader">Cargando...</div>';
    const qs = ["¿Recuerdo feliz?", "¿Qué admiras?", "¿Cuándo te sentiste amado?", "¿Miedo?", "¿Hogar?"];
    const q = qs[Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/86400000)%qs.length];
    
    const {data:ans} = await window.db.from('shared_content')
        .select('*')
        .eq('couple_id', window.currentCouple.id)
        .eq('type', 'answer')
        .order('created_at', { ascending: false });

    let h = `<div style="padding:0 20px 80px;">
        <div class="garden-card" style="margin:0 0 20px;">
            <h3 style="color:#aaa; font-size:0.8rem">HOY</h3>
            <h2 style="color:white; margin:10px 0;">"${q}"</h2>
        </div>
        <div style="background:var(--card-bg); padding:15px; border-radius:15px; border:1px solid #333;">
            <textarea id="answer-input" class="input-field" style="height:70px;" placeholder="Respuesta..."></textarea>
            <button onclick="saveSharedContent('answer', '${q}', this)" class="btn-primary">Compartir (+5 XP)</button>
        </div>
        <h3 style="margin-top:30px;">Respuestas</h3>`;
    
    if(ans) ans.forEach(a => { 
        h += `<div style="background:#252a35; padding:15px; margin-top:10px; border-radius:10px;">
                <small style="color:#888">${a.user_id===window.currentProfile.id?'Tú':'Tu pareja'}:</small>
                <p style="color:#ddd; margin-top:5px;">${a.content}</p>
              </div>`; 
    });
    c.innerHTML = h+'</div>';
};

window.loadTips = function() {
    const tips = ["Escucha para entender.", "Un abrazo largo cura.", "Agradece algo hoy.", "No duerman enojados."];
    document.getElementById('dynamic-content').innerHTML = `<div style="padding:40px; text-align:center;"><h1>💡</h1><h3>Consejo</h3><div style="background:#222; padding:20px; border-radius:10px; margin-top:20px">"${tips[Math.floor(Math.random()*tips.length)]}"</div></div>`;
};

// 5. FUNCIÓN DE GUARDADO CON BLOQUEO DE BOTÓN
window.saveSharedContent = async function(type, extra='', btn) { 
    const id = type==='request' ? 'prayer-input' : 'answer-input'; 
    const val = document.getElementById(id).value.trim();
    
    if(!val) return window.showToast("Escribe algo", "error");
    
    // BLOQUEAR BOTÓN
    if(btn) { 
        btn.disabled = true; 
        btn.innerText = "Guardando..."; 
        btn.style.opacity = "0.5"; 
    }

    try {
        await window.db.from('shared_content').insert({
            user_id: window.currentProfile.id,
            couple_id: window.currentCouple.id,
            type: type,
            content: (type==='answer' ? `[P: ${extra}]\n${val}` : val)
        });
        
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 5 }); 
        await window.refreshUserProfile();
        window.showToast("Guardado (+5 XP)", "success");
        
        // Recargar vista
        if(type==='request') window.loadPrayers(); 
        if(type==='answer') window.loadDeepQuestion();

    } catch (e) {
        console.error(e);
        window.showToast("Error al guardar", "error");
        // Reactivar botón si falló
        if(btn) {
            btn.disabled = false;
            btn.innerText = "Reintentar";
            btn.style.opacity = "1";
        }
    }
};
