// js/gamification.js

// --- BANDERA DE PAZ (Corregido) ---
window.checkWhiteFlagStatus = async function() {
    if (!window.currentCouple) return;
    
    const contentDiv = document.getElementById('content-area');
    // Asegurar contenedor si venimos de otra vista
    if(!document.getElementById('peace-area')) {
        document.getElementById('dynamic-content').innerHTML = '<div id="peace-area"></div>';
    }
    const area = document.getElementById('peace-area');
    const myId = window.currentProfile.id;
    const couple = window.currentCouple;

    // Recargar datos frescos de la pareja por si cambiaron
    const { data: freshCouple } = await window.db.from('couples').select('*').eq('id', couple.id).single();
    const status = freshCouple.white_flag_status;
    const sender = freshCouple.white_flag_sender;

    let html = '<div style="padding:0 20px">';

    if (status === 'none' || !status) {
        html += `
            <div class="wisdom-box" style="text-align:center; padding:30px;">
                <div style="font-size:3rem;">🏳️</div>
                <h3>Zona de Tregua</h3>
                <p>¿Discutieron? Levanta la bandera para pedir paz sin decir palabras.</p>
                <button onclick="sendFlag()" class="btn-primary" style="background:#636e72">Levantar Bandera</button>
            </div>`;
    } else if (status === 'sent') {
        if (sender === myId) {
            html += `<div class="garden-card"><h3>🏳️ Enviada</h3><p>Esperando a tu pareja...</p></div>`;
        } else {
            html += `
                <div class="garden-card" style="border-color:var(--primary)">
                    <h3>🏳️ Tu pareja pide Paz</h3>
                    <p>Al aceptar, ganan +50 XP ambos y termina el conflicto.</p>
                    <button onclick="acceptFlag()" class="btn-primary">Aceptar Tregua</button>
                </div>`;
        }
    } else if (status === 'accepted') {
        html += `
            <div class="garden-card" style="border-color:var(--accent)">
                <h3 style="color:var(--accent)">✨ ¡Paz Restaurada!</h3>
                <p>El amor es más fuerte que el orgullo.</p>
                <button onclick="resetFlag()" class="btn-primary" style="background:#333; margin-top:10px">Nueva etapa</button>
            </div>`;
    }
    html += '</div>';
    area.innerHTML = html;
};

window.sendFlag = async () => {
    await window.db.from('couples').update({ white_flag_status: 'sent', white_flag_sender: window.currentProfile.id }).eq('id', window.currentCouple.id);
    window.checkWhiteFlagStatus();
};

window.acceptFlag = async () => {
    // 1. Actualizar DB
    await window.db.from('couples').update({ white_flag_status: 'accepted' }).eq('id', window.currentCouple.id);
    
    // 2. Dar Puntos
    const partnerId = (window.currentCouple.user1_id === window.currentProfile.id) ? window.currentCouple.user2_id : window.currentCouple.user1_id;
    await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 50 });
    await window.db.rpc('add_xp', { user_id: partnerId, points: 50 });

    // 3. Refrescar TODO
    window.showToast("¡Paz y +50 XP!", "success");
    if(window.refreshUserProfile) window.refreshUserProfile(); // <-- Aquí llamamos a la función global corregida
    window.checkWhiteFlagStatus();
};

window.resetFlag = async () => {
    await window.db.from('couples').update({ white_flag_status: 'none' }).eq('id', window.currentCouple.id);
    window.checkWhiteFlagStatus();
};


// --- SECCIÓN 2: PETICIONES (Requests) ---
window.loadPrayers = async function() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando intenciones...</div>';

    // 1. Cargar peticiones existentes (Mías y de mi pareja)
    const { data: items } = await window.db
        .from('shared_content')
        .select('*')
        .eq('couple_id', window.currentCouple.id)
        .eq('type', 'request')
        .order('created_at', { ascending: false });

    let html = `
        <div style="padding:0 20px 80px 20px;">
            <div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px; border:1px solid #333;">
                <h3>🙏 Nueva Petición</h3>
                <textarea id="prayer-input" class="input-field" style="height:80px; margin-top:10px;" placeholder="Deseo que... / Pido fuerza para..."></textarea>
                <button onclick="saveSharedContent('request')" class="btn-primary">Publicar</button>
            </div>
            
            <h3>Muro de Intenciones</h3>
            <div id="prayers-list">
    `;

    if(items && items.length > 0) {
        items.forEach(item => {
            const isMine = item.user_id === window.currentProfile.id;
            html += `
                <div style="background:${isMine ? 'rgba(78, 142, 255, 0.1)' : '#252a35'}; padding:15px; border-radius:10px; margin-bottom:10px; border-left: 3px solid ${isMine ? 'var(--primary)' : 'var(--accent)'}">
                    <p style="color:white; font-style:italic">"${item.content}"</p>
                    <small style="color:#666; display:block; margin-top:5px; text-align:right">
                        ${isMine ? 'Tú' : 'Tu pareja'} - ${new Date(item.created_at).toLocaleDateString()}
                    </small>
                </div>
            `;
        });
    } else {
        html += `<p style="color:#666; text-align:center">Aún no hay peticiones.</p>`;
    }
    html += '</div></div>';
    container.innerHTML = html;
};


// --- SECCIÓN 3: PREGUNTAS PROFUNDAS (Deep Questions) ---
window.loadDeepQuestion = async function() {
    const container = document.getElementById('dynamic-content');
    
    // Preguntas estáticas (Podrías moverlas a DB)
    const questions = [
        "¿Cuál es un recuerdo de nosotros que te hace sonreír siempre?",
        "¿Qué es lo que más admiras de mi forma de ser?",
        "¿En qué momento te sentiste más amado/a por mí?",
        "¿Qué sueño tienes que te da miedo perseguir?",
        "¿Qué significa para ti 'hogar'?"
    ];
    // Usar el día del año para rotar la pregunta
    const todayIndex = new Date().getDate() % questions.length;
    const currentQuestion = questions[todayIndex];

    // Cargar respuestas ya hechas hoy
    // (Simplificado: Cargamos las últimas 2 respuestas de tipo 'answer')
    const { data: answers } = await window.db
        .from('shared_content')
        .select('*')
        .eq('couple_id', window.currentCouple.id)
        .eq('type', 'answer')
        .order('created_at', { ascending: false })
        .limit(2);

    let html = `
        <div style="padding:0 20px 80px 20px;">
            <div class="garden-card" style="border-color:var(--primary); margin:0; margin-bottom:20px;">
                <h3 style="color:#aebbc9; font-size:0.8rem;">PREGUNTA DEL DÍA</h3>
                <h2 style="color:white; margin:10px 0;">"${currentQuestion}"</h2>
            </div>

            <div style="background:var(--card-bg); padding:20px; border-radius:15px; border:1px solid #333;">
                <h4>Tu Respuesta:</h4>
                <textarea id="answer-input" class="input-field" style="height:80px; margin-top:10px;" placeholder="Escribe desde el corazón..."></textarea>
                <button onclick="saveSharedContent('answer', '${currentQuestion}')" class="btn-primary">Compartir</button>
            </div>

            <h3 style="margin-top:30px;">Respuestas Recientes</h3>
    `;

    if(answers && answers.length > 0) {
        answers.forEach(ans => {
            const isMine = ans.user_id === window.currentProfile.id;
            // Opcional: Ocultar respuesta de pareja hasta que yo responda (Gamificación avanzada)
            html += `
                <div style="background:#252a35; padding:15px; border-radius:10px; margin-top:10px; border:1px solid #444;">
                    <small style="color:var(--primary)">${isMine ? 'Tú' : 'Tu pareja'} dijo:</small>
                    <p style="color:#ddd; margin-top:5px;">${ans.content}</p>
                </div>
            `;
        });
    } else {
        html += `<p style="color:#666; text-align:center; margin-top:10px;">Sean los primeros en responder hoy.</p>`;
    }

    html += '</div>';
    container.innerHTML = html;
};


// FUNCIÓN GENÉRICA PARA GUARDAR CONTENIDO (Peticiones y Respuestas)
window.saveSharedContent = async function(type, extraContext = '') {
    let inputId = type === 'request' ? 'prayer-input' : 'answer-input';
    const content = document.getElementById(inputId).value.trim();

    if (!content) return window.showToast("Escribe algo primero", "error");

    const fullContent = extraContext ? `[${extraContext}] \n${content}` : content;

    const { error } = await window.db.from('shared_content').insert({
        user_id: window.currentProfile.id,
        couple_id: window.currentCouple.id,
        type: type,
        content: fullContent
    });

    if (error) {
        console.error(error);
        window.showToast("Error al guardar", "error");
    } else {
        window.showToast("¡Guardado!", "success");
        // Recargar la sección correspondiente
        if (type === 'request') window.loadPrayers();
        if (type === 'answer') window.loadDeepQuestion();
        
        // Dar puntos por participar (Opcional)
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 20 });
        window.refreshUserProfile();
    }
};
