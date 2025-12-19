// ==========================================
// LÓGICA DEL CALENDARIO Y RETOS
// ==========================================

// 1. Cargar la Cuadrícula de Retos
window.loadChallengeGrid = async function() {
    // Seguridad: Si no hay perfil cargado, no hacemos nada
    if (!window.currentProfile) {
        console.warn("Esperando perfil para cargar calendario...");
        return;
    }

    // Asegurar que el contenedor existe (Por si venimos de otra sección)
    const dynamicContainer = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    
    // Si el contenedor del grid no existe, lo creamos
    if (!document.getElementById('calendar-grid')) {
        if(title) title.innerText = "Tu Calendario";
        dynamicContainer.innerHTML = '<div id="calendar-grid" class="calendar-grid"></div>';
    }

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#888;">Cargando tu camino...</p>';

    // Resaltar icono en el menú flotante
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    const calBtn = document.querySelector('button[onclick="showSection(\'calendar\')"]');
    if(calBtn) calBtn.classList.add('active');

    try {
        // Consultar progreso en la base de datos
        const { count, error } = await window.db
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', window.currentProfile.id);

        if (error) throw error;

        // El día actual es el total de completados + 1
        const currentDay = (count || 0) + 1;
        const totalDays = 21; // Total de retos en el sistema

        let html = '';

        for (let i = 1; i <= totalDays; i++) {
            let className = 'locked';
            let icon = '🔒';
            let dots = '● ●';
            let clickAction = `onclick="window.showToast('Completa los días anteriores primero', 'error')"`;

            // Lógica de estados
            if (i < currentDay) {
                // Días pasados
                className = 'completed';
                icon = '✅';
                dots = '';
                clickAction = `onclick="openChallengeModal(${i}, true)"`; // true = ya completado (solo lectura)
            } else if (i === currentDay) {
                // Día actual (Disponible)
                className = 'active';
                icon = '🔥';
                dots = '';
                clickAction = `onclick="openChallengeModal(${i}, false)"`; // false = no completado (puede accionar)
            }

            // HTML de cada tarjeta del día
            html += `
                <div class="day-card ${className}" ${clickAction}>
                    <div class="day-number">${i}</div>
                    <div class="day-icon">${icon}</div>
                    <div style="font-size: 0.6rem; opacity: 0.3; margin-top: 2px;">${dots}</div>
                </div>
            `;
        }

        grid.innerHTML = html;
        
        // Actualizar también la tarjeta verde del Jardín
        window.updateGardenDisplay(currentDay);

    } catch (err) {
        console.error("Error cargando calendario:", err);
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--danger)">Error de conexión. Intenta recargar.</p>';
    }
};

// 2. Lógica del Jardín (Evolución de la planta)
window.updateGardenDisplay = function(currentDay) {
    const plants = ['Semilla 🌱', 'Brote 🌿', 'Tallo 🎋', 'Flor 🌷', 'Árbol 🌳'];
    
    // Calcula el nivel (cada 5 días sube de nivel)
    const levelIndex = Math.min(Math.floor((currentDay - 1) / 5), plants.length - 1);
    const currentPlant = plants[levelIndex];
    
    // Calcula cuánto falta para el siguiente nivel
    const daysToNext = 5 - ((currentDay - 1) % 5);

    const iconEl = document.getElementById('garden-plant');
    const levelEl = document.getElementById('garden-level');
    const nextEl = document.getElementById('garden-next');

    if (iconEl) iconEl.innerText = currentPlant.split(' ')[1]; // Solo el emoji
    if (levelEl) levelEl.innerText = `Nivel ${levelIndex + 1}: ${currentPlant.split(' ')[0]}`; // Solo texto
    if (nextEl) nextEl.innerText = `Faltan ${daysToNext} día(s) para evolucionar 🚀`;
};

// 3. Abrir el Modal con el contenido del Libro/Reto
window.openChallengeModal = async function(day, isCompleted) {
    window.showModal(`Día ${day}`, "Cargando sabiduría...");

    try {
        const { data: challenge, error } = await window.db
            .from('challenges')
            .select('*')
            .eq('day_number', day)
            .single();

        if (error) throw error;

        if (challenge) {
            const bodyEl = document.getElementById('modal-body');
            const actionsEl = document.getElementById('modal-actions');
            
            // Construir HTML del contenido
            let content = `
                <div style="margin-bottom: 20px;">
                    <blockquote style="font-style:italic; font-size: 1.1em; color:#fff; border-left:3px solid var(--primary); padding-left:15px; margin:10px 0;">
                        "${challenge.quote}"
                    </blockquote>
                    <p style="text-align:right; color: var(--primary); font-size:0.9em; font-weight:bold;">— ${challenge.author}</p>
                </div>
                
                <div style="background:#252a35; padding:15px; border-radius:12px; margin-bottom:15px; border:1px solid #444;">
                    <h4 style="color:var(--accent); margin-bottom:5px; text-transform:uppercase; font-size:0.8rem; letter-spacing:1px;">🧠 Píldora de Sabiduría</h4>
                    <p style="font-size:0.95em; color:#ddd; line-height:1.5;">${challenge.reflection || challenge.content}</p>
                </div>

                <div style="background:rgba(78, 142, 255, 0.1); padding:15px; border-radius:12px; border:1px solid var(--primary); margin-bottom:15px;">
                    <h4 style="color:var(--primary); margin-bottom:5px; text-transform:uppercase; font-size:0.8rem; letter-spacing:1px;">🔥 Misión de Hoy</h4>
                    <p style="font-size:1em; color:white; font-weight:500;">${challenge.task}</p>
                </div>

                <div style="text-align:center; margin-top:20px; padding:10px; border-top:1px solid #333;">
                    <p style="font-size:0.9em; color:#8b9bb4; font-style:italic;">✨ Intención: "${challenge.intention}"</p>
                </div>
            `;
            
            bodyEl.innerHTML = content;
            
            // Botón de acción
            if (!isCompleted) {
                actionsEl.innerHTML = `<button class="btn-primary" onclick="completeChallenge(${challenge.id})">¡Misión Cumplida! (+100 XP)</button>`;
            } else {
                actionsEl.innerHTML = `<p style="text-align:center; color:var(--accent); width:100%; margin-top:10px; font-weight:bold;">✅ Reto completado</p>`;
            }
        }
    } catch (err) {
        console.error(err);
        document.getElementById('modal-body').innerText = "Error cargando el contenido. Por favor intenta de nuevo.";
        document.getElementById('modal-actions').innerHTML = '';
    }
};

// 4. Completar el Reto
window.completeChallenge = async function(challengeId) {
    if (!window.currentProfile) return;

    // Deshabilitar botón para evitar doble click
    const btn = document.querySelector('#modal-actions button');
    if(btn) {
        btn.disabled = true;
        btn.innerText = "Guardando...";
    }

    try {
        // A. Guardar en historial
        const { error: insertError } = await window.db
            .from('user_progress')
            .insert({
                user_id: window.currentProfile.id,
                last_challenge_id: challengeId
            });

        if (insertError) throw insertError;

        // B. Sumar Puntos (Usando la función segura RPC)
        const { error: rpcError } = await window.db
            .rpc('add_xp', { 
                user_id: window.currentProfile.id, 
                points: 100 
            });

        if (rpcError) throw rpcError;

        // C. Feedback y Recarga
        window.closeModal();
        window.showToast("¡Excelente! Has ganado 100 XP 🎉", "success");
        
        // Actualizar UI
        await window.refreshUserProfile(); // Actualiza XP en header
        window.loadChallengeGrid();      // Actualiza candados y jardín

    } catch (error) {
        console.error("Error al completar:", error);
        window.showToast("Hubo un error al guardar tu progreso.", "error");
        if(btn) {
            btn.disabled = false;
            btn.innerText = "Intentar de nuevo";
        }
    }
};
