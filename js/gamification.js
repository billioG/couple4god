// ==========================================
// LÓGICA DE GAMIFICACIÓN, PAZ Y CONTENIDO COMPARTIDO
// ==========================================

// 1. BANDERA BLANCA (GESTIÓN DE CONFLICTOS)
// ------------------------------------------

window.checkWhiteFlagStatus = async function() {
    if (!window.currentCouple || !window.currentProfile) return;

    const contentDiv = document.getElementById('peace-area');
    // Asegurar contenedor si venimos de otra vista
    if (!contentDiv) {
        const dynamic = document.getElementById('dynamic-content');
        if (dynamic) dynamic.innerHTML = '<div id="peace-area"></div>';
        else return;
    }

    const area = document.getElementById('peace-area');
    area.innerHTML = '<div class="loader">Verificando estado...</div>';

    const myId = window.currentProfile.id;

    try {
        const { data: couple, error } = await window.db
            .from('couples')
            .select('*')
            .eq('id', window.currentCouple.id)
            .single();

        if (error) throw error;

        let html = '<div style="padding:0 20px">';

        // ESTADO 1: Todo bien
        if (couple.white_flag_status === 'none' || !couple.white_flag_status) {
            html += `
                <div class="wisdom-box" style="text-align:center; padding:30px; background:var(--card-bg); border:1px solid #333; border-radius:15px;">
                    <div style="font-size:3rem; margin-bottom:10px;">🏳️</div>
                    <h3>Zona de Tregua</h3>
                    <p style="color:#aaa; margin-bottom:20px;">
                        ¿Discutieron? Levanta la bandera para pedir paz sin palabras.
                        <br><br>
                        <small style="color:var(--accent);">Ganarás <strong>10 XP</strong> por dar el primer paso.</small>
                    </p>
                    <button onclick="sendFlag('${couple.id}')" class="btn-primary" style="background:#636e72">
                        Levantar Bandera
                    </button>
                </div>
            `;
        } 
        // ESTADO 2: Bandera Enviada
        else if (couple.white_flag_status === 'sent') {
            if (couple.white_flag_sender === myId) {
                html += `
                    <div class="garden-card">
                        <h3>🏳️ Bandera Enviada</h3>
                        <p>Has dado el primer paso. Esperando a tu pareja...</p>
                        <small style="color:#888">Ya ganaste tus 10 XP.</small>
                    </div>`;
            } else {
                html += `
                    <div class="garden-card" style="border-color:var(--primary); box-shadow:0 0 15px rgba(78, 142, 255, 0.2);">
                        <h3 style="color:white">🏳️ Tu pareja pide Paz</h3>
                        <p>Tu pareja quiere arreglar las cosas. Al aceptar, la armonía se restaura.</p>
                        <br>
                        <small style="color:var(--accent);">Ganarás <strong>25 XP</strong> por aceptar.</small>
                        <button onclick="acceptFlag('${couple.id}')" class="btn-primary">
                            Aceptar Tregua (+25 XP)
                        </button>
                    </div>`;
            }
        } 
        // ESTADO 3: Paz Restaurada
        else if (couple.white_flag_status === 'accepted') {
            html += `
                <div class="garden-card" style="border-color:var(--accent)">
                    <h3 style="color:var(--accent)">✨ ¡Paz Restaurada!</h3>
                    <p>El amor es más fuerte que el orgullo. Abrácense.</p>
                    <button onclick="resetFlag('${couple.id}')" class="btn-primary" style="background:#333; margin-top:10px;">
                        Cerrar ciclo
                    </button>
                </div>
            `;
        }

        html += '</div>';
        area.innerHTML = html;

    } catch (err) {
        console.error(err);
        area.innerHTML = '<p style="text-align:center; color:red">Error de conexión.</p>';
    }
};

window.sendFlag = async function(coupleId) {
    try {
        await window.db.from('couples').update({ white_flag_status: 'sent', white_flag_sender: window.currentProfile.id }).eq('id', coupleId);
        // +10 XP al enviar
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 10 });

        window.showToast("Bandera enviada (+10 XP)", "success");
        if (window.refreshUserProfile) window.refreshUserProfile();
        window.checkWhiteFlagStatus();
    } catch (err) { console.error(err); }
};

window.acceptFlag = async function(coupleId) {
    try {
        await window.db.from('couples').update({ white_flag_status: 'accepted' }).eq('id', coupleId);
        // +25 XP al aceptar
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 25 });
        
        window.showToast("¡Paz aceptada! (+25 XP)", "success");
        if (window.refreshUserProfile) window.refreshUserProfile();
        window.checkWhiteFlagStatus();
    } catch (err) { console.error(err); }
};

window.resetFlag = async function(coupleId) {
    try {
        await window.db.from('couples').update({ white_flag_status: 'none' }).eq('id', coupleId);
        window.checkWhiteFlagStatus();
    } catch (err) { console.error(err); }
};


// 2. PETICIONES CON APOYO (PRAYERS)
// ------------------------------------------

window.loadPrayers = async function() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando intenciones...</div>';

    try {
        const { data: items, error } = await window.db
            .from('shared_content')
            .select('*')
            .eq('couple_id', window.currentCouple.id)
            .eq('type', 'request')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        let html = `
            <div style="padding:0 20px 80px 20px;">
                <div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px; border:1px solid #333;">
                    <div style="text-align:center; font-size:2rem; margin-bottom:10px">🙏</div>
                    <h3 style="text-align:center;">Muro de Peticiones</h3>
                    <p style="color:#888; font-size:0.9rem; text-align:center; margin-bottom:15px;"> Deja aquí tus deseos para que tu pareja los apoye.</p>
                    <textarea id="prayer-input" class="input-field" style="height:70px; resize:none;" placeholder="Pido por..."></textarea>
                    <button onclick="saveSharedContent('request')" class="btn-primary">Publicar</button>
                </div>
                
                <h3 class="section-title" style="padding-left:0;">Intenciones Recientes</h3>
                <div id="prayers-list">
        `;

        if(items && items.length > 0) {
            items.forEach(item => {
                const isMine = item.user_id === window.currentProfile.id;
                const supporters = item.supporters || [];
                const amISupporting = supporters.includes(window.currentProfile.id);
                
                let footerAction = '';
                
                if (!isMine) {
                    // Petición de mi pareja
                    if (amISupporting) {
                        footerAction = `<span style="color:var(--accent); font-size:0.8rem;">✨ Ya oraste por esto</span>`;
                    } else {
                        footerAction = `<button onclick="supportPrayer('${item.id}')" class="btn-support">🙏 Orar por esto (+5 XP)</button>`;
                    }
                } else {
                    // Mi petición
                    if (supporters.length > 0) {
                        footerAction = `<span style="color:var(--primary); font-size:0.8rem;">❤️ Tu pareja te apoya</span>`;
                    } else {
                        footerAction = `<span style="color:#666; font-size:0.8rem;">Esperando apoyo...</span>`;
                    }
                }

                html += `
                    <div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:10px; border-left:3px solid ${isMine ? 'var(--primary)' : '#fff'};">
                        <p style="color:#ddd; font-style:italic;">"${item.content}"</p>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                            <small style="color:#666;">${new Date(item.created_at).toLocaleDateString()}</small>
                            ${footerAction}
                        </div>
                    </div>`;
            });
        } else {
            html += `<p style="text-align:center; color:#666; margin-top:20px;">No hay peticiones aún.</p>`;
        }
        html += '</div></div>';
        container.innerHTML = html;
    } catch (err) { console.error(err); }
};

// Función para apoyar petición
window.supportPrayer = async function(contentId) {
    try {
        const { data: item } = await window.db.from('shared_content').select('supporters').eq('id', contentId).single();
        let supporters = item.supporters || [];
        
        if(!supporters.includes(window.currentProfile.id)) {
            supporters.push(window.currentProfile.id);
            await window.db.from('shared_content').update({ supporters: supporters }).eq('id', contentId);
            
            // +5 XP por apoyar
            await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 5 });
            
            window.showToast("Apoyo enviado (+5 XP)", "success");
            window.loadPrayers();
            if(window.refreshUserProfile) window.refreshUserProfile();
        }
    } catch (e) { console.error(e); }
};


// 3. PREGUNTAS PROFUNDAS
// ------------------------------------------
window.loadDeepQuestion = async function() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando...</div>';
    
    const questions = [
        "¿Cuál es un recuerdo de nosotros que te hace sonreír siempre?",
        "¿Qué es lo que más admiras de mi forma de ser?",
        "¿En qué momento te sentiste más amado/a por mí?",
        "¿Qué sueño tienes que te da miedo perseguir?",
        "¿Qué significa para ti 'hogar'?"
    ];
    
    const today = new Date();
    const index = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000) % questions.length;
    const currentQuestion = questions[index];

    try {
        const { data: answers } = await window.db
            .from('shared_content')
            .select('*')
            .eq('couple_id', window.currentCouple.id)
            .eq('type', 'answer')
            .order('created_at', { ascending: false })
            .limit(5);

        let html = `
            <div style="padding:0 20px 80px 20px;">
                <div class="garden-card" style="border-color:var(--primary); margin:0; margin-bottom:25px;">
                    <h3 style="color:#aebbc9; font-size:0.7rem;">PREGUNTA DEL DÍA</h3>
                    <h2 style="color:white; margin:15px 0; font-size:1.2rem;">"${currentQuestion}"</h2>
                </div>

                <div style="background:var(--card-bg); padding:20px; border-radius:15px; border:1px solid #333;">
                    <h4 style="margin-bottom:10px; color:white;">Tu Respuesta:</h4>
                    <textarea id="answer-input" class="input-field" style="height:80px; resize:none;" placeholder="Escribe aquí..."></textarea>
                    <button onclick="saveSharedContent('answer', '${currentQuestion}')" class="btn-primary">Compartir (+5 XP)</button>
                </div>

                <h3 class="section-title" style="padding-left:0; margin-top:30px;">Respuestas</h3>
        `;

        if(answers && answers.length > 0) {
            answers.forEach(ans => {
                const isMine = ans.user_id === window.currentProfile.id;
                html += `
                    <div style="background:#252a35; padding:15px; border-radius:12px; margin-top:10px; border:1px solid ${isMine ? '#444' : 'var(--primary)'}; position:relative;">
                        <span style="font-size:0.7rem; color:${isMine ? '#888' : 'var(--primary)'}; font-weight:bold;">
                            ${isMine ? 'Tú escribiste:' : 'Tu pareja escribió:'}
                        </span>
                        <p style="color:#ddd; margin-top:5px;">${ans.content}</p>
                    </div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    } catch (err) { console.error(err); }
};


// 4. TIENDA DE PREMIOS (CANJEAR XP)
// ------------------------------------------
window.loadRewards = async function() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando premios...</div>';

    try {
        const { data: rewards } = await window.db.from('rewards').select('*').order('cost', { ascending: true });
        const userXP = window.currentProfile.xp || 0;

        let html = `
            <div style="padding:0 20px 80px 20px;">
                <div style="text-align:center; margin-bottom:20px; padding:20px; background:linear-gradient(45deg, #1e222d, #252a35); border-radius:15px;">
                    <h2 style="color:var(--accent); font-size:2.5rem; margin:0;">${userXP} <small style="font-size:1rem;">XP</small></h2>
                    <p style="color:#888;">Tus Créditos Disponibles</p>
                </div>
                
                <h3 class="section-title" style="padding-left:0;">Canjear Premios</h3>
                <div id="rewards-list">
        `;

        if(rewards && rewards.length > 0) {
            rewards.forEach(r => {
                const canAfford = userXP >= r.cost;
                html += `
                    <div class="reward-card" style="opacity: ${canAfford ? 1 : 0.6}">
                        <div style="display:flex; align-items:center; gap:15px;">
                            <span style="font-size:2rem;">${r.icon}</span>
                            <div>
                                <div style="font-weight:bold; color:white;">${r.title}</div>
                                <div class="reward-cost">${r.cost} XP</div>
                            </div>
                        </div>
                        <button onclick="${canAfford ? `redeemReward('${r.title}', ${r.cost})` : ''}" 
                                class="btn-primary" 
                                style="width:auto; padding:8px 15px; margin:0; font-size:0.8rem; background: ${canAfford ? 'var(--primary)' : '#333'}; cursor: ${canAfford ? 'pointer' : 'not-allowed'}">
                            Canjear
                        </button>
                    </div>
                `;
            });
        } else {
            html += `<p style="text-align:center; color:#666;">No hay premios configurados.</p>`;
        }
        html += '</div></div>';
        container.innerHTML = html;
    } catch (err) { console.error(err); }
};

window.redeemReward = async function(title, cost) {
    if(!confirm(`¿Estás seguro de canjear "${title}" por ${cost} XP?`)) return;

    try {
        // Restar XP
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: -cost });
        
        window.showModal("¡Premio Canjeado!", 
            `<div style="text-align:center">
                <p style="font-size:3rem; margin:10px;">🎁</p>
                <p>Has obtenido: <b>${title}</b></p>
                <p style="color:#aaa; font-size:0.9rem; margin-top:10px;">Toma una captura y envíasela a tu pareja para cobrar tu premio.</p>
             </div>`);
        
        if(window.refreshUserProfile) window.refreshUserProfile();
        window.loadRewards(); // Recargar pantalla
    } catch (e) { 
        console.error(e); 
        window.showToast("Error al procesar canje", "error"); 
    }
};


// 5. GUARDAR CONTENIDO COMPARTIDO
// ------------------------------------------
window.saveSharedContent = async function(type, extra = '') {
    let inputId = type === 'request' ? 'prayer-input' : 'answer-input';
    const val = document.getElementById(inputId).value.trim();

    if (!val) return window.showToast("Escribe algo...", "error");

    const content = (type === 'answer') ? `[P: ${extra}]\n${val}` : val;
    const btn = document.querySelector(`button[onclick*="${type}"]`);
    if(btn) { btn.disabled = true; btn.innerText = "Guardando..."; }

    try {
        const { error } = await window.db.from('shared_content').insert({
            user_id: window.currentProfile.id,
            couple_id: window.currentCouple.id,
            type: type,
            content: content
        });

        if (error) throw error;
        
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 5 });
        window.showToast("¡Guardado! (+5 XP)", "success");
        if(window.refreshUserProfile) window.refreshUserProfile();
        
        document.getElementById(inputId).value = '';
        if (type === 'request') window.loadPrayers();
        if (type === 'answer') window.loadDeepQuestion();

    } catch (e) {
        console.error(e);
        window.showToast("Error al guardar", "error");
        if(btn) { btn.disabled = false; btn.innerText = "Reintentar"; }
    }
};
