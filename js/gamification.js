// ==========================================
// GAMIFICACIÓN Y SOCIAL (OPTIMIZADO)
// ==========================================

// -------------------------------------------------------------------------
// 1. BANDERA BLANCA (TREGUA)
// -------------------------------------------------------------------------
window.checkWhiteFlagStatus = async function () {
    if (!App.state.couple) return;

    // Verificamos si el contenedor existe en el DOM actual
    const area = document.getElementById('peace-area');
    if (!area && document.getElementById('dynamic-content')) return;

    try {
        // Consultamos estado fresco (No usamos caché aquí para inmediatez)
        const { data: c } = await window.db.from('couples')
            .select('*')
            .eq('id', App.state.couple.id)
            .single();

        let h = '<div style="padding:10px 25px;">';

        if (c.white_flag_status === 'none' || !c.white_flag_status) {
            h += `<div style="text-align:center; padding:30px; background:var(--card-bg); border:1px solid #333; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                <div style="font-size:3.5rem; margin-bottom:15px; animation:float 3s infinite ease-in-out;">🏳️</div>
                <h3 style="color:white; margin-bottom:10px;">Zona de Tregua</h3>
                <p style="color:#aaa; font-size:0.95rem; line-height:1.5;">¿Hubo una discusión? Pide paz sin palabras.<br><small style="color:var(--accent); font-weight:bold;">+10 XP al enviar</small></p>
                <button onclick="sendFlag('${c.id}')" class="btn-primary" style="background:#4a5568; margin-top:20px;">Levantar Bandera</button>
            </div>`;
        }
        else if (c.white_flag_status === 'sent') {
            const isMe = c.white_flag_sender === App.state.user.id;
            if (isMe) {
                h += `<div class="garden-card">
                    <div style="font-size:3rem;">🏳️</div>
                    <h3>Bandera Enviada</h3>
                    <p style="color:#ccc;">Esperando a que tu pareja acepte la tregua...</p>
                 </div>`;
            } else {
                h += `<div class="garden-card" style="border-color:var(--primary); background:rgba(78, 142, 255, 0.1);">
                    <div style="font-size:3rem;">🏳️</div>
                    <h3 style="color:white;">Piden Paz</h3>
                    <p style="color:#ddd;">Tu pareja quiere arreglar las cosas.<br><small style="color:var(--accent);">+25 XP al aceptar</small></p>
                    <button onclick="acceptFlag('${c.id}')" class="btn-primary">Aceptar Tregua</button>
                 </div>`;
            }
        }
        else if (c.white_flag_status === 'accepted') {
            h += `<div class="garden-card" style="border-color:var(--accent); background:rgba(0, 210, 133, 0.1);">
                <div style="font-size:3rem;">✨</div>
                <h3 style="color:var(--accent);">Paz Restaurada</h3>
                <p>El ciclo se ha cerrado con amor.</p>
                <button onclick="resetFlag('${c.id}')" class="btn-primary" style="background:#333; margin-top:15px;">Cerrar Pantalla</button>
            </div>`;
        }

        if (area) area.innerHTML = h + '</div>';
    } catch (e) { console.error(e); }
};

// Acciones de Bandera
window.sendFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'sent', white_flag_sender: App.state.user.id }).eq('id', id);
    await window.db.rpc('add_xp', { user_id: App.state.user.id, points: 10 });
    await App.actions.refreshProfile();
    App.ui.showToast("Enviada (+10 XP)");
    window.checkNotifications();
    window.checkWhiteFlagStatus();
};

window.acceptFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'accepted' }).eq('id', id);
    await window.db.rpc('add_xp', { user_id: App.state.user.id, points: 25 });
    await App.actions.refreshProfile();
    App.ui.showToast("Aceptada (+25 XP)");
    window.checkNotifications();
    window.checkWhiteFlagStatus();
};

window.resetFlag = async (id) => {
    await window.db.from('couples').update({ white_flag_status: 'none' }).eq('id', id);
    window.checkWhiteFlagStatus();
};


// -------------------------------------------------------------------------
// 2. PETICIONES (CON ESTADOS Y SEGURIDAD)
// -------------------------------------------------------------------------
window.loadPrayers = async function () {
    const c = document.getElementById('dynamic-content');

    // Intentar cargar desde caché para velocidad
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
        <div style="background:var(--card-bg); padding:20px; border-radius:20px; margin-bottom:25px; border:1px solid #333; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            <h3 style="color:var(--primary); margin-bottom:10px;">🙏 Petición</h3>
            <textarea id="prayer-input" class="input-field" style="height:70px;" placeholder="¿Qué necesitas de tu pareja hoy?"></textarea>
            <button onclick="saveSharedContent('request')" class="btn-primary">Publicar</button>
        </div>
        <div id="prayers-list">`;

    if (items && items.length > 0) {
        items.forEach(i => {
            const mine = i.user_id === App.state.user.id;
            const status = i.status || 'pending';
            let statusHtml = '';

            // Lógica de botones según quién sea el dueño
            if (!mine) {
                // Es de mi PAREJA (Yo debo responder)
                if (status === 'pending') {
                    statusHtml = `<button onclick="updatePrayerStatus('${i.id}', 'ack')" class="btn-primary" style="margin:8px 0; font-size:0.85rem; padding: 10px; background:#4a5568;">👁️ Enterado</button>`;
                } else if (status === 'ack') {
                    statusHtml = `<button onclick="updatePrayerStatus('${i.id}', 'done')" class="btn-action-green" style="margin:8px 0; width:100%;">✅ Marcar Cumplido</button>`;
                } else {
                    statusHtml = `<div style="text-align:right; margin-top:5px;"><span class="status-badge status-done">¡Cumplido! 🎉</span></div>`;
                }
            } else {
                // Es MÍA (Yo solo veo el estado)
                if (status === 'pending') {
                    statusHtml = `<span class="status-badge status-pending">Esperando...</span>`;
                } else if (status === 'ack') {
                    statusHtml = `<span class="status-badge status-process">En Proceso ⏳</span>`;
                } else {
                    statusHtml = `<span class="status-badge status-done">¡Tu pareja cumplió! ❤️</span>`;
                }
            }

            // Renderizado Seguro (Escape HTML)
            h += `<div style="background:#252a35; padding:20px; border-radius:16px; margin-bottom:15px; border-left:4px solid ${mine ? 'var(--primary)' : '#fff'}; box-shadow:0 5px 15px rgba(0,0,0,0.2);">
                <p style="color:#eee; font-style:italic; font-size:1.05rem; margin-bottom:10px;">"${App.utils.escape(i.content)}"</p>
                <div style="display:flex; justify-content:space-between; align-items:end; margin-top:10px; flex-wrap:wrap;">
                    <small style="color:#666; margin-bottom:5px;">${new Date(i.created_at).toLocaleDateString()}</small>
                    <div style="flex-grow:1; text-align:right;">${statusHtml}</div>
                </div>
            </div>`;
        });
    } else {
        h += `<p style="text-align:center; color:#666; margin-top:30px;">No hay peticiones aún.</p>`;
    }

    c.innerHTML = h + '</div></div>';
};

window.updatePrayerStatus = async function (id, status) {
    try {
        const { error } = await window.db.from('shared_content').update({ status: status }).eq('id', id);
        if (error) throw error;

        if (status === 'done') {
            // Dar XP a quien cumplió la acción (usuario actual)
            await window.db.rpc('add_xp', { user_id: App.state.user.id, points: 20 });
            await App.actions.refreshProfile();
            App.ui.showToast("¡Gracias! (+20 XP)", "success");
        } else {
            App.ui.showToast("Estado actualizado");
        }

        App.utils.invalidateCache('prayers'); // Limpiar caché para ver cambios
        window.loadPrayers();
    } catch (e) {
        console.error(e);
        App.ui.showToast("Error al actualizar. Revisa conexión.", "error");
    }
};


// -------------------------------------------------------------------------
// 3. PREMIOS (LÓGICA INVERTIDA: QUIEN PIDE, CONFIRMA)
// -------------------------------------------------------------------------
window.loadRewards = async function () {
    const c = document.getElementById('dynamic-content');

    // Obtener canjes activos (sin caché para ver estado real)
    const { data: active } = await window.db.from('active_redemptions')
        .select('*')
        .eq('couple_id', App.state.couple.id)
        .eq('status', 'pending');

    // Obtener catálogo (con caché)
    let rw = App.utils.getCache('rewards_catalog');
    if (!rw) {
        c.innerHTML = '<div class="loader">Cargando...</div>';
        const { data } = await window.db.from('rewards').select('*').order('cost');
        rw = data;
        App.utils.setCache('rewards_catalog', rw);
    }

    const xp = App.state.profile.xp || 0;

    let h = `<div style="padding:10px 25px 90px 25px;">
        <div style="text-align:center; padding:25px; background:#252a35; border-radius:20px; margin-bottom:30px; box-shadow:0 10px 30px rgba(0,0,0,0.3); border:1px solid #444;">
            <h1 style="color:var(--accent); margin:0; font-size:3rem; text-shadow:0 0 20px rgba(0,210,133,0.2);">${xp}</h1>
            <p style="color:#888; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">XP Disponibles</p>
        </div>`;

    // SECCIÓN: PREMIOS PENDIENTES
    if (active && active.length > 0) {
        h += `<h3 style="margin-left:5px; margin-bottom:15px; color:#fff;">⚠️ Pendientes</h3>`;
        active.forEach(a => {
            const iRedeemed = a.user_id === App.state.user.id;
            const titleSafe = App.utils.escape(a.reward_title);

            if (iRedeemed) {
                // YO LO PEDÍ -> YO DEBO CONFIRMAR QUE LO RECIBÍ
                h += `<div class="reward-card pending-reward">
                    <div>
                        <div style="font-size:0.8rem; color:var(--accent); font-weight:bold;">PEDISTE:</div>
                        <div style="font-size:1.1rem; font-weight:bold;">${titleSafe}</div>
                    </div>
                    <button onclick="completeRedemption('${a.id}')" class="btn-action-green">✅ Confirmar Recibido</button>
                </div>`;
            } else {
                // MI PAREJA LO PIDIÓ -> YO DEBO CUMPLIR (Solo veo aviso)
                h += `<div class="reward-card pending-reward" style="opacity:0.8;">
                    <div>
                        <div style="font-size:0.8rem; color:#aaa; font-weight:bold;">DEBES CUMPLIR:</div>
                        <div style="font-size:1.1rem; font-weight:bold;">${titleSafe}</div>
                    </div>
                    <div style="text-align:right;">
                        <small style="color:var(--text-gray)">Esperando<br>confirmación</small>
                    </div>
                </div>`;
            }
        });
        h += `<hr style="border:0; border-top:1px solid #333; margin:30px 0;">`;
    }

    // SECCIÓN: CATÁLOGO
    h += `<h3 style="margin-left:5px; margin-bottom:15px; color:#fff;">Catálogo</h3>`;
    if (rw) {
        rw.forEach(r => {
            const can = xp >= r.cost;
            h += `<div class="reward-card" style="opacity:${can ? 1 : 0.5}">
                <div style="display:flex; gap:15px; align-items:center;">
                    <span style="font-size:2rem; filter:drop-shadow(0 0 5px rgba(255,255,255,0.2));">${r.icon}</span>
                    <div>
                        <div style="font-weight:bold; font-size:1.1rem; margin-bottom:5px;">${App.utils.escape(r.title)}</div>
                        <small class="reward-cost">${r.cost} XP</small>
                    </div>
                </div>
                <button onclick="${can ? `redeemReward('${App.utils.escape(r.title)}',${r.cost})` : ''}" 
                        class="btn-primary" 
                        style="width:auto; padding:8px 16px; margin:0; ${can ? '' : 'background:#333; cursor:not-allowed; box-shadow:none;'}">
                    Canjear
                </button>
            </div>`;
        });
    }

    c.innerHTML = h + '</div>';
};

window.redeemReward = async (t, c) => {
    if (confirm(`¿Quieres canjear "${t}" por ${c} XP?`)) {
        // Restar XP
        await window.db.rpc('add_xp', { user_id: App.state.user.id, points: -c });
        // Crear registro de canje
        await window.db.from('active_redemptions').insert({
            couple_id: App.state.couple.id,
            user_id: App.state.user.id,
            reward_title: t
        });

        await App.actions.refreshProfile();
        window.loadRewards();
        App.ui.showToast("¡Canjeado! Ahora tu pareja lo verá.");
    }
};

window.completeRedemption = async (id) => {
    if (confirm("¿Confirmas que tu pareja ya cumplió este premio?")) {
        await window.db.from('active_redemptions').update({ status: 'completed' }).eq('id', id);
        App.ui.showToast("¡Genial! Disfrútalo.");
        window.loadRewards();
    }
};


// -------------------------------------------------------------------------
// 4. CONEXIÓN PROFUNDA (PREGUNTA DIARIA)
// -------------------------------------------------------------------------
window.loadDeepQuestion = async function () {
    const c = document.getElementById('dynamic-content');

    // Caché para respuestas previas
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

    // Selección de pregunta basada en el día del año (consistente para ambos)
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
            <h3 style="color:#aaa; font-size:0.9rem; letter-spacing:2px; text-transform:uppercase;">Pregunta del Día</h3>
            <h2 style="color:white; margin:15px 0; font-size:1.5rem;">"${q}"</h2>
        </div>
        
        <div style="background:var(--card-bg); padding:20px; border-radius:20px; border:1px solid #333; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            <textarea id="answer-input" class="input-field" style="height:80px;" placeholder="Tu respuesta sincera..."></textarea>
            <button onclick="saveSharedContent('answer', '${q}', this)" class="btn-primary">Compartir (+5 XP)</button>
        </div>
        
        <h3 style="margin-top:35px; margin-left:5px; color:white;">Respuestas</h3>`;

    if (ans && ans.length > 0) {
        ans.forEach(a => {
            const mine = a.user_id === App.state.user.id;
            h += `<div style="background:#252a35; padding:20px; margin-top:15px; border-radius:16px; border:1px solid ${mine ? '#444' : 'var(--primary)'};">
                <small style="color:${mine ? '#888' : 'var(--primary)'}; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">${mine ? 'Tú' : 'Tu pareja'}</small>
                <p style="color:#ddd; margin-top:8px; line-height:1.5; font-size:1.05rem;">${App.utils.escape(a.content)}</p>
            </div>`;
        });
    } else {
        h += `<p style="color:#666; text-align:center; margin-top:20px;">Aún no hay respuestas hoy.</p>`;
    }

    c.innerHTML = h + '</div>';
};

window.loadTips = function () {
    const tips = ["Escucha para entender, no para responder.", "Un abrazo de 20 segundos libera oxitocina.", "Agradece al menos una cosa pequeña hoy.", "Nunca se vayan a dormir enojados."];
    const tip = tips[Math.floor(Math.random() * tips.length)];

    document.getElementById('dynamic-content').innerHTML = `
        <div style="padding:40px; text-align:center; display:flex; flex-direction:column; justify-content:center; height:60vh;">
            <div style="font-size:4rem; margin-bottom:20px;">💡</div>
            <h2 style="color:white; margin-bottom:20px;">Consejo del Día</h2>
            <div style="background:#222; padding:30px; border-radius:20px; border:1px solid var(--accent);">
                <p style="font-size:1.2rem; line-height:1.6; font-style:italic;">"${tip}"</p>
            </div>
        </div>`;
};


// -------------------------------------------------------------------------
// 5. FUNCIÓN GENERAL DE GUARDADO (COMPARTIDA)
// -------------------------------------------------------------------------
window.saveSharedContent = async (type, extra = '', btn) => {
    const id = type === 'request' ? 'prayer-input' : 'answer-input';
    const val = document.getElementById(id).value.trim();

    if (!val) return App.ui.showToast("Escribe algo primero", "error");

    // BLOQUEO DE BOTÓN (Evita spam de XP)
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

        // Invalidar caché para que al recargar aparezca el nuevo item
        if (type === 'request') App.utils.invalidateCache('prayers');
        if (type === 'answer') App.utils.invalidateCache('answers');

        await App.actions.refreshProfile();
        App.ui.showToast("Guardado (+5 XP)", "success");

        // Recargar la vista correspondiente
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