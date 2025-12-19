// ==========================================
// GAMIFICACIÓN Y SOCIAL (OPTIMIZADO)
// ==========================================

// -------------------------------------------------------------------------
// 1. BANDERA BLANCA (TREGUA)
// -------------------------------------------------------------------------
window.checkWhiteFlagStatus = async function () {
    if (!App.state.couple) return;

    const area = document.getElementById('peace-area');
    if (!area && document.getElementById('dynamic-content')) return;

    try {
        const { data: c } = await window.db.from('couples')
            .select('*')
            .eq('id', App.state.couple.id)
            .single();

        let h = '<div style="padding:10px 25px;">';

        if (c.white_flag_status === 'none' || !c.white_flag_status) {
            h += `<div style="text-align:center; padding:30px; background:var(--card-bg); border:1px solid #333; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                <div style="font-size:2.5rem; margin-bottom:15px; animation:float 3s infinite ease-in-out;">🏳️</div>
                <h3 style="color:white; margin-bottom:10px; font-size:1.3rem;">Zona de Tregua</h3>
                <p style="color:#aaa; font-size:0.9rem; line-height:1.5;">¿Hubo una discusión? Pide paz sin palabras.<br><small style="color:var(--accent); font-weight:bold;">+10 XP al enviar</small></p>
                <button onclick="sendFlag('${c.id}')" class="btn-primary" style="background:#4a5568; margin-top:20px;">Levantar Bandera</button>
            </div>`;
        }
        else if (c.white_flag_status === 'sent') {
            const isMe = c.white_flag_sender === App.state.user.id;
            if (isMe) {
                h += `<div class="garden-card">
                    <div style="font-size:2.5rem;">🏳️</div>
                    <h3 style="font-size:1.2rem;">Bandera Enviada</h3>
                    <p style="color:#ccc; font-size:0.9rem;">Esperando a que tu pareja acepte...</p>
                 </div>`;
            } else {
                h += `<div class="garden-card" style="border-color:var(--primary); background:rgba(78, 142, 255, 0.1);">
                    <div style="font-size:2.5rem;">🏳️</div>
                    <h3 style="color:white; font-size:1.2rem;">Piden Paz</h3>
                    <p style="color:#ddd; font-size:0.9rem;">Tu pareja quiere arreglar las cosas.<br><small style="color:var(--accent);">+25 XP</small></p>
                    <button onclick="acceptFlag('${c.id}')" class="btn-primary">Aceptar Tregua</button>
                 </div>`;
            }
        }
        else if (c.white_flag_status === 'accepted') {
            h += `<div class="garden-card" style="border-color:var(--accent); background:rgba(0, 210, 133, 0.1);">
                <div style="font-size:2.5rem;">✨</div>
                <h3 style="color:var(--accent); font-size:1.2rem;">Paz Restaurada</h3>
                <p style="font-size:0.9rem;">El ciclo se ha cerrado con amor.</p>
                <button onclick="resetFlag('${c.id}')" class="btn-primary" style="background:#333; margin-top:15px;">Cerrar Pantalla</button>
            </div>`;
        }

        if (area) area.innerHTML = h + '</div>';
    } catch (e) { console.error(e); }
};

window.sendFlag = async (id) => {
    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Enviando...';
        btn.style.opacity = '0.5';
    }

    try {
        await window.db.from('couples').update({
            white_flag_status: 'sent',
            white_flag_sender: App.state.user.id
        }).eq('id', id);

        await window.db.rpc('add_xp', { user_id: App.state.user.id, points: 10 });
        await App.actions.refreshProfile();
        App.ui.showToast('Enviada (+10 XP)');
        await App.ui.updateNotifications();
        await window.checkWhiteFlagStatus();
    } catch (e) {
        console.error(e);
        App.ui.showToast('Error al enviar', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Levantar Bandera';
            btn.style.opacity = '1';
        }
    }
};

window.acceptFlag = async (id) => {
    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Aceptando...';
        btn.style.opacity = '0.5';
    }

    try {
        await window.db.from('couples').update({
            white_flag_status: 'accepted'
        }).eq('id', id);

        await window.db.rpc('add_xp', { user_id: App.state.user.id, points: 25 });
        await App.actions.refreshProfile();
        App.ui.showToast('Aceptada (+25 XP)');
        await App.ui.updateNotifications();
        await window.checkWhiteFlagStatus();
    } catch (e) {
        console.error(e);
        App.ui.showToast('Error al aceptar', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Aceptar Tregua';
            btn.style.opacity = '1';
        }
    }
};

window.resetFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'none' }).eq('id', id);
    await App.ui.updateNotifications(); // Actualizar para quitar la notificación
    window.checkWhiteFlagStatus();
};


// -------------------------------------------------------------------------
// 2. PETICIONES
// -------------------------------------------------------------------------
window.loadPrayers = async function () {
    const c = document.getElementById('dynamic-content');
    let items = App.utils.getCache('prayers');

    if (!items) {
        c.innerHTML = '<div class="loader">Cargando...</div>';
        const { data } = await window.db.from('shared_content')
            .select('*')
            .eq('couple_id', App.state.couple.id)
            .eq('type', 'request')
            .order('created_at', { ascending: false })
            .limit(10);
        items = data;
        App.utils.setCache('prayers', items);
    }

    let h = `<div style="padding: 10px 25px 90px 25px;">
        <div style="background:var(--card-bg); padding:20px; border-radius:20px; margin-bottom:25px; border:1px solid #333;">
            <h3 style="color:var(--primary); margin-bottom:10px; font-size:1.1rem;">🙏 Petición</h3>
            <textarea id="prayer-input" class="input-field" style="height:70px;" placeholder="¿Qué necesitas de tu pareja hoy?"></textarea>
            <button onclick="saveSharedContent('request')" class="btn-primary">Publicar</button>
        </div>
        <div id="prayers-list">`;

    if (items && items.length > 0) {
        items.forEach(i => {
            const mine = i.user_id === App.state.user.id;
            const status = i.status || 'pending';
            let statusHtml = '';

            if (!mine) {
                if (status === 'pending') {
                    statusHtml = `<button onclick="updatePrayerStatus('${i.id}', 'ack')" class="btn-primary" style="margin:8px 0; font-size:0.85rem; padding:10px; background:#4a5568;">👁️ Enterado</button>`;
                } else if (status === 'ack') {
                    statusHtml = `<button onclick="updatePrayerStatus('${i.id}', 'done')" class="btn-action-green" style="margin:8px 0; width:100%;">✅ Cumplido</button>`;
                } else {
                    statusHtml = `<div style="text-align:right; margin-top:5px;"><span class="status-badge status-done">¡Cumplido! 🎉</span></div>`;
                }
            } else {
                if (status === 'pending') {
                    statusHtml = `<span class="status-badge status-pending">Esperando...</span>`;
                } else if (status === 'ack') {
                    statusHtml = `<span class="status-badge status-process">En Proceso ⏳</span>`;
                } else {
                    statusHtml = `<span class="status-badge status-done">¡Tu pareja cumplió! ❤️</span>`;
                }
            }

            h += `<div style="background:#252a35; padding:20px; border-radius:16px; margin-bottom:15px; border-left:4px solid ${mine ? 'var(--primary)' : '#fff'};">
                <p style="color:#eee; font-style:italic; font-size:0.95rem; margin-bottom:10px;">"${App.utils.escape(i.content)}"</p>
                <div style="display:flex; justify-content:space-between; align-items:end; margin-top:10px; flex-wrap:wrap;">
                    <small style="color:#666; margin-bottom:5px; font-size:0.75rem;">${new Date(i.created_at).toLocaleDateString()}</small>
                    <div style="flex-grow:1; text-align:right;">${statusHtml}</div>
                </div>
            </div>`;
        });
    } else {
        h += `<p style="text-align:center; color:#666; margin-top:30px; font-size:0.9rem;">No hay peticiones aún.</p>`;
    }

    c.innerHTML = h + '</div></div>';
};

window.updatePrayerStatus = async function (id, status) {
    try {
        const { error } = await window.db.from('shared_content').update({ status: status }).eq('id', id);
        if (error) throw error;

        if (status === 'done') {
            await window.db.rpc('add_xp', { user_id: App.state.user.id, points: 20 });
            await App.actions.refreshProfile();
            App.ui.showToast("¡Gracias! (+20 XP)", "success");
        } else {
            App.ui.showToast("Estado actualizado");
        }

        App.utils.invalidateCache('prayers');
        window.loadPrayers();
    } catch (e) {
        console.error(e);
        App.ui.showToast("Error al actualizar", "error");
    }
};


// -------------------------------------------------------------------------
// 3. PREMIOS
// -------------------------------------------------------------------------
window.loadRewards = async function () {
    const c = document.getElementById('dynamic-content');

    const { data: active } = await window.db.from('active_redemptions')
        .select('*')
        .eq('couple_id', App.state.couple.id)
        .eq('status', 'pending');

    let rw = App.utils.getCache('rewards_catalog');
    if (!rw) {
        c.innerHTML = '<div class="loader">Cargando...</div>';
        const { data } = await window.db.from('rewards').select('*').order('cost');
        rw = data;
        App.utils.setCache('rewards_catalog', rw);
    }

    const xp = App.state.profile.xp || 0;

    let h = `<div style="padding:10px 25px 90px 25px;">
        <div style="text-align:center; padding:20px; background:#252a35; border-radius:20px; margin-bottom:25px;">
            <h1 style="color:var(--accent); margin:0; font-size:2.5rem;">${xp}</h1>
            <p style="color:#888; font-weight:bold; font-size:0.8rem; letter-spacing:1px; text-transform:uppercase;">XP Disponibles</p>
        </div>`;

    if (active && active.length > 0) {
        h += `<h3 style="margin-left:5px; margin-bottom:15px; color:#fff; font-size:1.1rem;">⚠️ Pendientes</h3>`;
        active.forEach(a => {
            const iRedeemed = a.user_id === App.state.user.id;
            const titleSafe = App.utils.escape(a.reward_title);

            if (iRedeemed) {
                h += `<div class="reward-card pending-reward">
                    <div>
                        <div style="font-size:0.75rem; color:var(--accent); font-weight:bold;">PEDISTE:</div>
                        <div style="font-size:1rem; font-weight:bold;">${titleSafe}</div>
                    </div>
                    <button onclick="completeRedemption('${a.id}')" class="btn-action-green">✅ Recibido</button>
                </div>`;
            } else {
                h += `<div class="reward-card pending-reward" style="opacity:0.8;">
                    <div>
                        <div style="font-size:0.75rem; color:#aaa; font-weight:bold;">DEBES CUMPLIR:</div>
                        <div style="font-size:1rem; font-weight:bold;">${titleSafe}</div>
                    </div>
                    <div style="text-align:right;">
                        <small style="color:var(--text-gray); font-size:0.75rem;">Esperando<br>confirmación</small>
                    </div>
                </div>`;
            }
        });
        h += `<hr style="border:0; border-top:1px solid #333; margin:25px 0;">`;
    }

    h += `<h3 style="margin-left:5px; margin-bottom:15px; color:#fff; font-size:1.1rem;">Catálogo</h3>`;
    if (rw) {
        rw.forEach(r => {
            const can = xp >= r.cost;
            h += `<div class="reward-card" style="opacity:${can ? 1 : 0.5}">
                <div style="display:flex; gap:15px; align-items:center;">
                    <span style="font-size:1.8rem;">${r.icon}</span>
                    <div>
                        <div style="font-weight:bold; font-size:0.95rem; margin-bottom:5px;">${App.utils.escape(r.title)}</div>
                        <small class="reward-cost">${r.cost} XP</small>
                    </div>
                </div>
                <button onclick="${can ? `redeemReward('${App.utils.escape(r.title)}',${r.cost})` : ''}" 
                        class="btn-primary" 
                        style="width:auto; padding:8px 16px; margin:0; font-size:0.85rem; ${can ? '' : 'background:#333; cursor:not-allowed;'}">
                    Canjear
                </button>
            </div>`;
        });
    }

    c.innerHTML = h + '</div>';
};

window.redeemReward = async (t, c) => {
    if (confirm(`¿Canjear "${t}" por ${c} XP?`)) {
        await window.db.rpc('add_xp', { user_id: App.state.user.id, points: -c });
        await window.db.from('active_redemptions').insert({
            couple_id: App.state.couple.id,
            user_id: App.state.user.id,
            reward_title: t
        });
        await App.actions.refreshProfile();
        window.loadRewards();
        App.ui.showToast("¡Canjeado!");
    }
};

window.completeRedemption = async (id) => {
    if (confirm("¿Tu pareja cumplió este premio?")) {
        await window.db.from('active_redemptions').update({ status: 'completed' }).eq('id', id);
        App.ui.showToast("¡Genial!");
        window.loadRewards();
    }
};


// -------------------------------------------------------------------------
// 4. CONEXIÓN PROFUNDA
// -------------------------------------------------------------------------
window.loadDeepQuestion = async function () {
    const c = document.getElementById('dynamic-content');
    let ans = App.utils.getCache('answers');

    if (!ans) {
        c.innerHTML = '<div class="loader">Cargando...</div>';
        const { data } = await window.db.from('shared_content')
            .select('*')
            .eq('couple_id', App.state.couple.id)
            .eq('type', 'answer')
            .order('created_at', { ascending: false });
        ans = data;
        App.utils.setCache('answers', ans);
    }

    const qs = [
        "¿Cuál es un recuerdo feliz que tienes de nosotros?",
        "¿Qué es algo que admiras profundamente de mí?",
        "¿En qué momento te sentiste más amado por mí?",
        "¿Qué sueño tienes que te da un poco de miedo?",
        "¿Qué significa 'hogar' para ti?",
        "¿Cuál es tu lenguaje del amor favorito?",
        "¿Qué te gustaría que hiciéramos más seguido?"
    ];
    const q = qs[Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000) % qs.length];

    let h = `<div style="padding:10px 25px 90px 25px;">
        <div class="garden-card" style="margin:0 0 25px;">
            <h3 style="color:#aaa; font-size:0.8rem; letter-spacing:2px; text-transform:uppercase; margin-bottom:10px;">Pregunta del Día</h3>
            <h2 style="color:white; margin:0; font-size:1.2rem; line-height:1.4;">"${q}"</h2>
        </div>

        <div style="background:var(--card-bg); padding:20px; border-radius:20px; border:1px solid #333;">
            <textarea id="answer-input" class="input-field" style="height:80px;" placeholder="Tu respuesta sincera..."></textarea>
            <button onclick="saveSharedContent('answer', '${q}', this)" class="btn-primary">Compartir (+5 XP)</button>
        </div>

        <h3 style="margin-top:30px; margin-left:5px; color:white; font-size:1rem;">Respuestas</h3>`;

    if (ans && ans.length > 0) {
        ans.forEach(a => {
            const mine = a.user_id === App.state.user.id;
            h += `<div style="background:#252a35; padding:20px; margin-top:15px; border-radius:16px; border:1px solid ${mine ? '#444' : 'var(--primary)'};">
                <small style="color:${mine ? '#888' : 'var(--primary)'}; font-weight:bold; text-transform:uppercase; font-size:0.7rem; letter-spacing:1px;">${mine ? 'Tú' : 'Tu pareja'}</small>
                <p style="color:#ddd; margin-top:8px; line-height:1.5; font-size:0.95rem;">${App.utils.escape(a.content)}</p>
            </div>`;
        });
    } else {
        h += `<p style="color:#666; text-align:center; margin-top:20px; font-size:0.9rem;">Aún no hay respuestas.</p>`;
    }

    c.innerHTML = h + '</div>';
};

// CORRECCIÓN 5: Mejorar espacio en tips
window.loadTips = function () {
    const tips = [
        "Escucha para entender, no para responder.",
        "Un abrazo de 20 segundos libera oxitocina.",
        "Agradece al menos una cosa pequeña hoy.",
        "Nunca se vayan a dormir enojados."
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];

    document.getElementById('dynamic-content').innerHTML = `
        <div style="padding:20px 25px; text-align:center; display:flex; flex-direction:column; justify-content:center; min-height:50vh;">
            <div style="font-size:3rem; margin-bottom:20px;">💡</div>
            <h2 style="color:white; margin-bottom:25px; font-size:1.3rem;">Consejo del Día</h2>
            <div style="background:#222; padding:25px; border-radius:20px; border:1px solid var(--accent);">
                <p style="font-size:1rem; line-height:1.6; font-style:italic;">"${tip}"</p>
            </div>
        </div>`;
};


// -------------------------------------------------------------------------
// 5. FUNCIÓN GENERAL DE GUARDADO
// -------------------------------------------------------------------------
window.saveSharedContent = async (type, extra = '', btn) => {
    const id = type === 'request' ? 'prayer-input' : 'answer-input';
    const val = document.getElementById(id).value.trim();

    if (!val) return App.ui.showToast("Escribe algo primero", "error");

    if (btn) {
        btn.disabled = true;
        btn.innerText = "Guardando...";
        btn.style.opacity = "0.5";
    }

    try {
        await window.db.from('shared_content').insert({
            user_id: App.state.user.id,
            couple_id: App.state.couple.id,
            type: type,
            content: (type === 'answer' ? `[P: ${extra}]\n${val}` : val)
        });

        await window.db.rpc('add_xp', { user_id: App.state.user.id, points: 5 });

        if (type === 'request') App.utils.invalidateCache('prayers');
        if (type === 'answer') App.utils.invalidateCache('answers');

        await App.actions.refreshProfile();
        App.ui.showToast("Guardado (+5 XP)", "success");

        if (type === 'request') window.loadPrayers();
        if (type === 'answer') window.loadDeepQuestion();

    } catch (e) {
        console.error(e);
        App.ui.showToast("Error al guardar", "error");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Reintentar";
            btn.style.opacity = "1";
        }
    }
};
