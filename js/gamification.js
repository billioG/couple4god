// ==========================================
// LÓGICA DE GAMIFICACIÓN, PAZ Y CONTENIDO COMPARTIDO
// ==========================================

// 1. BANDERA BLANCA (GESTIÓN DE CONFLICTOS)
// ------------------------------------------

window.checkWhiteFlagStatus = async function() {
    // Seguridad: Si no hay pareja cargada, no podemos mostrar esto
    if (!window.currentCouple || !window.currentProfile) {
        console.warn("Esperando datos de pareja...");
        return;
    }

    const contentDiv = document.getElementById('peace-area');
    // Si la función se llama desde otra vista, aseguramos que el contenedor exista
    if (!contentDiv) {
        const dynamic = document.getElementById('dynamic-content');
        if (dynamic) {
            dynamic.innerHTML = '<div id="peace-area"></div>';
        } else {
            return;
        }
    }

    const area = document.getElementById('peace-area');
    area.innerHTML = '<div class="loader">Verificando estado de paz...</div>';

    const myId = window.currentProfile.id;

    try {
        // Consultar estado actualizado de la pareja
        const { data: couple, error } = await window.db
            .from('couples')
            .select('*')
            .eq('id', window.currentCouple.id)
            .single();

        if (error) throw error;

        let html = '<div style="padding:0 20px">';

        // ESTADO 1: Todo bien (Ninguna bandera activa)
        if (couple.white_flag_status === 'none' || !couple.white_flag_status) {
            html += `
                <div class="wisdom-box" style="text-align:center; padding:30px; background:var(--card-bg); border:1px solid #333;">
                    <div style="font-size:3rem; margin-bottom:10px;">🏳️</div>
                    <h3>Zona de Tregua</h3>
                    <p style="color:#aaa; margin-bottom:20px;">
                        ¿Discutieron? Levanta la bandera para pedir paz sin necesidad de palabras.
                        <br><br>
                        <small style="color:var(--accent);">Ganarás <strong>10 XP</strong> por dar el primer paso.</small>
                    </p>
                    <button onclick="sendFlag('${couple.id}')" class="btn-primary" style="background:#636e72">
                        Levantar Bandera Blanca
                    </button>
                </div>
            `;
        } 
        // ESTADO 2: Bandera Enviada (Esperando respuesta)
        else if (couple.white_flag_status === 'sent') {
            if (couple.white_flag_sender === myId) {
                // Yo la envié
                html += `
                    <div class="garden-card">
                        <h3>🏳️ Bandera Enviada</h3>
                        <p>Has dado el primer paso. Esperando a que tu pareja acepte la tregua...</p>
                        <small style="color:#888">Ya ganaste tus 10 XP.</small>
                    </div>`;
            } else {
                // Mi pareja la envió (Me toca aceptar)
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
        // ESTADO 3: Paz Restaurada (Ambos aceptaron)
        else if (couple.white_flag_status === 'accepted') {
            html += `
                <div class="garden-card" style="border-color:var(--accent)">
                    <h3 style="color:var(--accent)">✨ ¡Paz Restaurada!</h3>
                    <p>El amor es más fuerte que el orgullo. Tómense un momento para abrazarse.</p>
                    <button onclick="resetFlag('${couple.id}')" class="btn-primary" style="background:#333; margin-top:10px;">
                        Cerrar ciclo y continuar
                    </button>
                </div>
            `;
        }

        html += '</div>';
        area.innerHTML = html;

    } catch (err) {
        console.error("Error en bandera:", err);
        area.innerHTML = '<p style="text-align:center; color:red">Error de conexión.</p>';
    }
};

// Acción: Enviar Bandera (+10 XP)
window.sendFlag = async function(coupleId) {
    try {
        // 1. Actualizar estado en DB
        const { error } = await window.db
            .from('couples')
            .update({ 
                white_flag_status: 'sent', 
                white_flag_sender: window.currentProfile.id 
            })
            .eq('id', coupleId);

        if (error) throw error;

        // 2. Dar 10 XP al remitente (Punto 2 del requerimiento)
        await window.db.rpc('add_xp', { 
            user_id: window.currentProfile.id, 
            points: 10 
        });

        // 3. Feedback
        window.showToast("Bandera enviada (+10 XP)", "success");
        if (window.refreshUserProfile) window.refreshUserProfile(); // Actualizar header
        window.checkWhiteFlagStatus(); // Recargar vista

    } catch (err) {
        window.showToast("Error al enviar bandera", "error");
        console.error(err);
    }
};

// Acción: Aceptar Bandera (+25 XP)
window.acceptFlag = async function(coupleId) {
    try {
        // 1. Actualizar estado en DB
        const { error } = await window.db
            .from('couples')
            .update({ white_flag_status: 'accepted' })
            .eq('id', coupleId);

        if (error) throw error;

        // 2. Dar 25 XP al que acepta (Punto 2 del requerimiento)
        await window.db.rpc('add_xp', { 
            user_id: window.currentProfile.id, 
            points: 25 
        });
        
        // Opcional: Si quieres ser justo, también puedes dar puntos al que envió la bandera originalmente aquí, 
        // pero siguiendo tu instrucción estricta, solo sumamos al que acepta en este momento.

        // 3. Feedback
        window.showToast("¡Paz aceptada! (+25 XP)", "success");
        if (window.refreshUserProfile) window.refreshUserProfile();
        window.checkWhiteFlagStatus();

    } catch (err) {
        window.showToast("Error al aceptar", "error");
        console.error(err);
    }
};

// Acción: Resetear estado (Para futuras peleas)
window.resetFlag = async function(coupleId) {
    try {
        await window.db
            .from('couples')
            .update({ white_flag_status: 'none' })
            .eq('id', coupleId);
            
        window.checkWhiteFlagStatus();
    } catch (err) {
        console.error(err);
    }
};


// 2. PETICIONES (PRAYERS / INTENTIONS)
// ------------------------------------------

window.loadPrayers = async function() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando intenciones...</div>';

    try {
        // Cargar peticiones de la tabla shared_content
        const { data: items, error } = await window.db
            .from('shared_content')
            .select('*')
            .eq('couple_id', window.currentCouple.id)
            .eq('type', 'request')
            .order('created_at', { ascending: false })
            .limit(10); // Mostrar las últimas 10

        if (error) throw error;

        let html = `
            <div style="padding:0 20px 80px 20px;">
                <div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px; border:1px solid #333;">
                    <div style="text-align:center; font-size:2rem; margin-bottom:10px">🙏</div>
                    <h3 style="text-align:center; margin-bottom:10px;">Intenciones Compartidas</h3>
                    <p style="color:#888; font-size:0.9rem; text-align:center; margin-bottom:15px;">
                        Deja aquí tus deseos o peticiones para que tu pareja las lea y apoye.
                    </p>
                    <textarea id="prayer-input" class="input-field" style="height:80px; resize:none;" placeholder="Deseo que... / Pido fuerza para..."></textarea>
                    <button onclick="saveSharedContent('request')" class="btn-primary">Publicar Petición</button>
                </div>
                
                <h3 class="section-title" style="padding-left:0;">Muro de Peticiones</h3>
                <div id="prayers-list">
        `;

        if(items && items.length > 0) {
            items.forEach(item => {
                const isMine = item.user_id === window.currentProfile.id;
                // Estilo diferente si es mío o de mi pareja
                const borderStyle = isMine ? '3px solid var(--primary)' : '3px solid var(--accent)';
                const bgStyle = isMine ? 'rgba(78, 142, 255, 0.05)' : 'rgba(0, 210, 133, 0.05)';

                html += `
                    <div style="background:${bgStyle}; padding:15px; border-radius:10px; margin-bottom:10px; border-left: ${borderStyle};">
                        <p style="color:var(--text-white); font-style:italic; line-height:1.4;">"${item.content}"</p>
                        <small style="color:var(--text-gray); display:block; margin-top:8px; text-align:right; font-size:0.75rem;">
                            ${isMine ? 'Tú' : 'Tu pareja'} • ${new Date(item.created_at).toLocaleDateString()}
                        </small>
                    </div>
                `;
            });
        } else {
            html += `<div style="text-align:center; padding:30px; color:#666; border:1px dashed #333; border-radius:10px;">
                        No hay peticiones aún. Sé el primero en escribir una.
                     </div>`;
        }

        html += '</div></div>';
        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="text-align:center; padding:20px;">Error al cargar datos.</p>';
    }
};


// 3. PREGUNTAS PROFUNDAS (DEEP QUESTIONS)
// ------------------------------------------

window.loadDeepQuestion = async function() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = '<div class="loader">Cargando pregunta del día...</div>';
    
    // Lista de preguntas (Podrías mover esto a una tabla en DB en el futuro)
    const questions = [
        "¿Cuál es un recuerdo de nosotros que te hace sonreír siempre?",
        "¿Qué es lo que más admiras de mi forma de ser?",
        "¿En qué momento te sentiste más amado/a por mí?",
        "¿Qué sueño tienes que te da miedo perseguir?",
        "¿Qué significa para ti 'hogar'?",
        "¿Qué es algo que te gustaría que hiciéramos más seguido?",
        "¿Cómo te gustaría que nos cuidáramos cuando seamos viejitos?"
    ];
    
    // Seleccionar pregunta basada en el día del año para que ambos vean la misma
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const questionIndex = dayOfYear % questions.length;
    const currentQuestion = questions[questionIndex];

    try {
        // Cargar respuestas de hoy (type='answer')
        const { data: answers, error } = await window.db
            .from('shared_content')
            .select('*')
            .eq('couple_id', window.currentCouple.id)
            .eq('type', 'answer')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        let html = `
            <div style="padding:0 20px 80px 20px;">
                
                <div class="garden-card" style="border-color:var(--primary); margin:0; margin-bottom:25px; box-shadow:0 0 20px rgba(78, 142, 255, 0.1);">
                    <h3 style="color:#aebbc9; font-size:0.7rem; letter-spacing:2px; text-transform:uppercase;">PREGUNTA DEL DÍA</h3>
                    <h2 style="color:white; margin:15px 0; font-size:1.3rem; line-height:1.4;">"${currentQuestion}"</h2>
                </div>

                <div style="background:var(--card-bg); padding:20px; border-radius:15px; border:1px solid #333;">
                    <h4 style="margin-bottom:10px; color:var(--text-white);">Tu Respuesta:</h4>
                    <textarea id="answer-input" class="input-field" style="height:100px; resize:none;" placeholder="Escribe desde el corazón..."></textarea>
                    <button onclick="saveSharedContent('answer', '${currentQuestion}')" class="btn-primary">Compartir Respuesta (+5 XP)</button>
                </div>

                <h3 class="section-title" style="padding-left:0; margin-top:30px;">Respuestas</h3>
        `;

        if(answers && answers.length > 0) {
            answers.forEach(ans => {
                const isMine = ans.user_id === window.currentProfile.id;
                html += `
                    <div style="background:#252a35; padding:20px; border-radius:12px; margin-top:15px; border:1px solid ${isMine ? '#444' : 'var(--primary)'}; position:relative;">
                        <span style="position:absolute; top:-10px; left:15px; background:var(--bg-dark); padding:0 10px; font-size:0.8rem; color:${isMine ? '#888' : 'var(--primary)'}; font-weight:bold;">
                            ${isMine ? 'Tú escribiste:' : 'Tu pareja escribió:'}
                        </span>
                        <p style="color:#ddd; margin-top:5px; white-space: pre-wrap;">${ans.content}</p>
                        <small style="color:#555; display:block; margin-top:10px; font-size:0.7rem;">
                            ${new Date(ans.created_at).toLocaleDateString()}
                        </small>
                    </div>
                `;
            });
        } else {
            html += `<p style="color:#666; text-align:center; margin-top:20px;">Aún no hay respuestas. ¡Sé el primero!</p>`;
        }

        html += '</div>';
        container.innerHTML = html;

    } catch (err) {
        console.error(err);
    }
};


// 4. FUNCIÓN COMPARTIDA PARA GUARDAR (Punto 2 y 3)
// ------------------------------------------

window.saveSharedContent = async function(type, questionText = '') {
    let inputId = type === 'request' ? 'prayer-input' : 'answer-input';
    const inputEl = document.getElementById(inputId);
    const content = inputEl.value.trim();

    if (!content) return window.showToast("Escribe algo antes de enviar", "error");

    // Si es una respuesta, guardamos también la pregunta para contexto futuro
    // (Opcional: podrías guardar solo la respuesta si prefieres)
    const finalContent = (type === 'answer') 
        ? `[P: ${questionText}]\nR: ${content}` 
        : content;

    const btn = document.querySelector(`button[onclick*="${type}"]`);
    if(btn) { btn.disabled = true; btn.innerText = "Guardando..."; }

    try {
        const { error } = await window.db
            .from('shared_content')
            .insert({
                user_id: window.currentProfile.id,
                couple_id: window.currentCouple.id,
                type: type,
                content: finalContent
            });

        if (error) throw error;

        // Recompensa pequeña por participar
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 5 });
        if(window.refreshUserProfile) window.refreshUserProfile();

        window.showToast("¡Guardado exitosamente!", "success");
        
        // Limpiar y Recargar
        inputEl.value = '';
        if (type === 'request') window.loadPrayers();
        if (type === 'answer') window.loadDeepQuestion();

    } catch (err) {
        console.error(err);
        window.showToast("Error al guardar", "error");
        if(btn) { btn.disabled = false; btn.innerText = "Intentar de nuevo"; }
    }
};
