// --- BANDERA ---
window.checkWhiteFlagStatus = async function() {
    if(!window.currentCouple) return;
    const cd = document.getElementById('peace-area'); if(!cd && document.getElementById('dynamic-content')) document.getElementById('dynamic-content').innerHTML='<div id="peace-area"></div>';
    const area = document.getElementById('peace-area'); if(!area) return;
    const { data: c } = await window.db.from('couples').select('*').eq('id', window.currentCouple.id).single();
    let h = '<div style="padding:0 20px">';
    if(c.white_flag_status==='none'||!c.white_flag_status) h+=`<div style="text-align:center; padding:30px; background:var(--card-bg); border:1px solid #333; border-radius:15px;"><div style="font-size:3rem">🏳️</div><h3>Zona de Tregua</h3><p style="color:#aaa">Pide paz.<br><small style="color:var(--accent)">+10 XP</small></p><button onclick="sendFlag('${c.id}')" class="btn-primary" style="background:#636e72">Levantar Bandera</button></div>`;
    else if(c.white_flag_status==='sent') h+= (c.white_flag_sender===window.currentProfile.id) ? `<div class="garden-card"><h3>🏳️ Enviada</h3><p>Esperando...</p></div>` : `<div class="garden-card" style="border-color:var(--primary)"><h3 style="color:white">🏳️ Piden Paz</h3><p>Acepta para restaurar armonía.<br><small style="color:var(--accent)">+25 XP</small></p><button onclick="acceptFlag('${c.id}')" class="btn-primary">Aceptar</button></div>`;
    else if(c.white_flag_status==='accepted') h+=`<div class="garden-card" style="border-color:var(--accent)"><h3 style="color:var(--accent)">✨ Paz Restaurada</h3><button onclick="resetFlag('${c.id}')" class="btn-primary" style="background:#333; margin-top:10px">Cerrar</button></div>`;
    area.innerHTML = h + '</div>';
};
window.sendFlag=async(id)=>{await window.db.from('couples').update({white_flag_status:'sent',white_flag_sender:window.currentProfile.id}).eq('id',id);await window.db.rpc('add_xp',{user_id:window.currentProfile.id,points:10});window.showToast("Enviada");window.checkNotifications();window.checkWhiteFlagStatus();};
window.acceptFlag=async(id)=>{await window.db.from('couples').update({white_flag_status:'accepted'}).eq('id',id);await window.db.rpc('add_xp',{user_id:window.currentProfile.id,points:25});window.showToast("Aceptada");window.checkNotifications();window.checkWhiteFlagStatus();};
window.resetFlag=async(id)=>{await window.db.from('couples').update({white_flag_status:'none'}).eq('id',id);window.checkWhiteFlagStatus();};

// --- PETICIONES ---
window.loadPrayers = async function() {
    const c = document.getElementById('dynamic-content'); c.innerHTML='<div class="loader">Cargando...</div>';
    const {data:items} = await window.db.from('shared_content').select('*').eq('couple_id',window.currentCouple.id).eq('type','request').order('created_at',{ascending:false}).limit(10);
    let h = `<div style="padding:0 20px 80px;"><div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px; border:1px solid #333;"><h3>🙏 Petición</h3><textarea id="prayer-input" class="input-field" style="height:60px;" placeholder="¿Qué necesitas?"></textarea><button onclick="saveSharedContent('request')" class="btn-primary">Publicar</button></div><div id="prayers-list">`;
    if(items&&items.length>0) items.forEach(i => {
        const mine = i.user_id===window.currentProfile.id;
        const sups = i.supporters||[];
        const supported = sups.includes(window.currentProfile.id);
        let act = '';
        if(!mine) act = supported ? `<button disabled class="btn-support active">✅ Lo tomaste en cuenta</button>` : `<button onclick="supportPrayer('${i.id}',this)" class="btn-support">🤝 Lo tomo en cuenta</button>`;
        else act = sups.length>0 ? `<span style="color:var(--primary); font-size:0.8rem">❤️ Tu pareja escuchó</span>` : `<span style="color:#666; font-size:0.8rem">Esperando...</span>`;
        h+=`<div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:10px; border-left:3px solid ${mine?'var(--primary)':'#fff'}"><p style="color:#ddd; font-style:italic">"${i.content}"</p><div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px"><small style="color:#666">${new Date(i.created_at).toLocaleDateString()}</small>${act}</div></div>`;
    });
    else h+=`<p style="text-align:center; color:#666">No hay peticiones.</p>`;
    c.innerHTML = h+'</div></div>';
};
window.supportPrayer = async function(id, btn) {
    if(btn){btn.disabled=true; btn.innerText="...";}
    try {
        const {data:i}=await window.db.from('shared_content').select('supporters').eq('id',id).single();
        let arr=i.supporters||[]; if(!arr.includes(window.currentProfile.id)) {
            arr.push(window.currentProfile.id);
            await window.db.from('shared_content').update({supporters:arr}).eq('id',id);
            await window.db.rpc('add_xp',{user_id:window.currentProfile.id,points:5});
            window.showToast("Gracias (+5 XP)");
            if(window.refreshUserProfile) window.refreshUserProfile();
            // Actualización visual manual
            if(btn){btn.className="btn-support active"; btn.innerText="✅ Lo tomaste en cuenta";}
        }
    } catch(e){console.error(e); if(btn)btn.disabled=false;}
};

// --- PREMIOS ---
window.loadRewards = async function() {
    const c = document.getElementById('dynamic-content'); c.innerHTML='<div class="loader">Cargando...</div>';
    try {
        const { data: rw } = await window.db.from('rewards').select('*').order('cost');
        const xp = window.currentProfile.xp || 0;
        let h = `<div style="padding:0 20px 80px;"><div style="text-align:center; padding:20px; background:#252a35; border-radius:15px; margin-bottom:20px"><h2 style="color:var(--accent); margin:0">${xp} XP</h2><p style="color:#888">Disponibles</p></div>`;
        if(rw && rw.length>0) rw.forEach(r => {
            const can = xp >= r.cost;
            h+=`<div class="reward-card" style="opacity:${can?1:0.6}"><div style="display:flex; gap:10px; align-items:center;"><span style="font-size:1.5rem">${r.icon}</span><div><div>${r.title}</div><small class="reward-cost">${r.cost} XP</small></div></div><button onclick="${can?`redeemReward('${r.title}',${r.cost})`:''}" class="btn-primary" style="width:auto; padding:5px 10px; background:${can?'var(--primary)':'#333'}">Canjear</button></div>`;
        });
        else h+=`<p style="text-align:center; color:#666">No hay premios. (Crea tabla 'rewards')</p>`;
        c.innerHTML = h+'</div>';
    } catch(e){ c.innerHTML='<p>Error cargando premios.</p>'; console.error(e); }
};
window.redeemReward=async(t,c)=>{if(confirm(`¿Canjear "${t}"?`)){await window.db.rpc('add_xp',{user_id:window.currentProfile.id,points:-c});window.showModal("¡Canjeado!",`Cobrar: <b>${t}</b>`);window.loadRewards();window.refreshUserProfile();}};

// --- OTROS ---
window.loadDeepQuestion=async()=>{ /* ... igual ... */ };
window.loadTips=()=>{ /* ... igual ... */ };
window.saveSharedContent=async(type,extra='')=>{ /* ... igual ... */ 
    const id=type==='request'?'prayer-input':'answer-input'; const val=document.getElementById(id).value.trim();
    if(!val)return window.showToast("Escribe algo","error");
    await window.db.from('shared_content').insert({user_id:window.currentProfile.id,couple_id:window.currentCouple.id,type,content:(type==='answer'?`[P: ${extra}]\n${val}`:val)});
    await window.db.rpc('add_xp',{user_id:window.currentProfile.id,points:5}); window.showToast("Guardado (+5 XP)");
    if(type==='request')window.loadPrayers(); if(type==='answer')window.loadDeepQuestion();
};
