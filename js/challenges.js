// ==========================================
// LÓGICA DE RETOS Y CALENDARIO (BLINDADO)
// ==========================================

// 1. Cargar Grid
window.loadChallengeGrid = async function() {
    // Si no hay perfil o pareja, detenemos (evita errores de carga prematura)
    if (!window.currentProfile || !window.currentCouple) return;

    // Asegurar contenedor dinámico
    const dynamicContainer = document.getElementById('dynamic-content');
    
    // Si el contenedor del grid no existe, restauramos la estructura de la Barra de Progreso
    if (!document.getElementById('calendar-grid') && dynamicContainer) {
        dynamicContainer.innerHTML = `
            <div class="progress-container">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888; margin-bottom:5px;">
                    <span>Tu Progreso</span>
                    <span id="progress-text">0%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" id="progress-bar"></div>
                    <div class="milestone" style="left: 33%;" id="milestone-7">👫</div>
                    <div class="milestone" style="left: 66%;" id="milestone-14">🎁</div>
                    <div class="milestone" style="left: 100%;" id="milestone-21">❤️</div>
                </div>
            </div>
            <div id="calendar-grid" class="calendar-grid"></div>
        `;
    }

    const grid = document.getElementById('calendar-grid');
    if (grid) grid.innerHTML = '<p style="grid-column:1/-1; text-align:center">Cargando...</p>';

    try {
        const partnerId = (window.currentCouple.user1_id === window.currentProfile.id) 
                          ? window.currentCouple.user2_id 
                          : window.currentCouple.user1_id;

        // Traer TODO el progreso de la pareja
        const { data: allProgress } = await window.db
            .from('user_progress')
            .select('user_id, last_challenge_id')
            .in('user_id', [window.currentProfile.id, partnerId]);

        // Sets para búsqueda rápida
        const myCompleted = new Set(allProgress.filter(p => p.user_id === window.currentProfile.id).map(p => p.last_challenge_id));
        const partnerCompleted = new Set(allProgress.filter(p => p.user_id === partnerId).map(p => p.last_challenge_id));

        // Lógica Secuencial: El día actual es el siguiente al último que YO completé
        let currentDay = 1;
        while (myCompleted.has(currentDay)) {
            currentDay++;
        }
        
        const totalDays = 21;

        // Actualizar Barra (con seguridad)
        if (window.updateProgressBar) window.updateProgressBar(myCompleted.size, totalDays);

        let html = '';

        for (let i = 1; i <= totalDays; i++) {
            const meDone = myCompleted.has(i);
            const partnerDone = partnerCompleted.has(i);
            
            let className = 'locked';
            let mainIcon = '🔒';
            let indicatorsHtml = '';
            let clickAction = `onclick="window.showToast('Completa los días anteriores', 'error')"`;

            // ESTADOS PRINCIPALES
            if (meDone) {
                className = 'completed'; // Ya lo hice (Verde)
                mainIcon = '✅';
                clickAction = `onclick="openChallengeModal(${i}, true)"`; // Solo lectura
            } else if (i === currentDay) {
                className = 'active'; // Me toca hoy (Fuego)
                mainIcon = '🔥';
                clickAction = `onclick="openChallengeModal(${i}, false)"`; // Para hacer
            }

            // INDICADORES INFERIORES (Estrella o Puntos)
            if (meDone && partnerDone) {
                indicatorsHtml = '<span class="star-icon">⭐️</span>';
            } else {
                // Punto Izq: Yo / Punto Der: Pareja
                indicatorsHtml += `<span class="dot-check ${meDone ? 'done' : ''}"></span>`;
                indicatorsHtml += `<span class="dot-check ${partnerDone ? 'done' : ''}"></span>`;
            }

            html += `
                <div class="day-card ${className}" ${clickAction}>
                    <div class="day-number">${i}</div>
                    <div class="day-icon">${mainIcon}</div>
                    <div class="indicators">${indicatorsHtml}</div>
                </div>
            `;
        }

        if (grid) grid.innerHTML = html;
        
        // Actualizar Jardín (Llamada segura)
        if (typeof window.updateGardenDisplay === 'function') {
            window.updateGardenDisplay(currentDay);
        }

    } catch (err) {
        console.error("Error en loadChallengeGrid:", err);
        if (grid) grid.innerHTML = '<p>Error de conexión</p>';
    }
};

// 2. Barra de Progreso
window.updateProgressBar = function(count, total) {
    const percent = (count / total) * 100;
    const bar = document.getElementById('progress-bar');
    const txt = document.getElementById('progress-text');
    
    if(bar) bar.style.width = `${percent}%`;
    if(txt) txt.innerText = `${Math.round(percent)}%`;

    // Desbloquear iconos visualmente con seguridad (?.)
    if (count >= 7) document.getElementById('milestone-7')?.classList.add('unlocked');
    if (count >= 14) document.getElementById('milestone-14')?.classList.add('unlocked');
    if (count >= 21) document.getElementById('milestone-21')?.classList.add('unlocked');
};

// 3. Jardín (CORREGIDO ERROR NULL)
window.updateGardenDisplay = function(day) {
    const plants = ['Semilla 🌱', 'Brote 🌿', 'Tallo 🎋', 'Flor 🌷', 'Árbol 🌳'];
    const levelIndex = Math.min(Math.floor((day - 1) / 5), plants.length - 1);
    const plant = plants[levelIndex];
    
    // Obtenemos elementos
    const iconEl = document.getElementById('garden-plant');
    const levelEl = document.getElementById('garden-level');
    const nextEl = document.getElementById('garden-next'); // Este es el que suele fallar

    // Verificamos que existan ANTES de escribir (Esto soluciona tu error)
    if(iconEl) iconEl.innerText = plant.split(' ')[1];
    if(levelEl) levelEl.innerText = `Nivel ${levelIndex + 1}: ${plant.split(' ')[0]}`;
    
    if(nextEl) {
        const daysLeft = 5 - ((day - 1) % 5);
        nextEl.innerText = (levelIndex >= 4) ? "¡Máximo Nivel!" : `Faltan ${daysLeft} días para evolucionar 🚀`;
    }
};

// 4. Abrir Modal (Con Reflexión)
window.openChallengeModal = async function(day, isCompleted) {
    window.showModal(`Reto Día ${day}`, "Cargando...");
    
    const { data } = await window.db.from('challenges').select('*').eq('day_number', day).single();
    
    if(data) {
        let html = `
            <blockquote style="font-style:italic; border-left:3px solid var(--primary); padding-left:10px; margin:10px 0; color:white;">"${data.quote}"</blockquote>
            <p style="text-align:right; color:var(--primary); font-size:0.8rem; margin-bottom:20px">— ${data.author}</p>
            
            <div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:15px; text-align:left;">
                <h4 style="color:var(--accent); margin-bottom:5px; text-transform:uppercase; font-size:0.75rem;">🧠 Sabiduría</h4>
                <p style="font-size:0.9rem; color:#ddd; line-height:1.4;">${data.reflection}</p>
            </div>

            <div style="background:rgba(78, 142, 255, 0.1); padding:15px; border-radius:10px; border:1px solid var(--primary); margin-bottom:15px; text-align:left;">
                <h4 style="color:var(--primary); margin-bottom:5px; text-transform:uppercase; font-size:0.75rem;">🔥 Misión de Hoy</h4>
                <p style="font-size:0.95em; color:white;">${data.task}</p>
            </div>
        `;
        
        // Campo de Reflexión
        if (!isCompleted) {
            html += `
                <div style="margin-top:20px; text-align:left;">
                    <label style="font-size:0.8rem; color:#aaa; display:block; margin-bottom:5px;">Para completar, escribe una reflexión:</label>
                    <textarea id="challenge-reflection" class="input-field" style="height:80px; font-size:0.9rem; width:100%;" placeholder="¿Cómo te sentiste? ¿Qué aprendiste?"></textarea>
                </div>
            `;
            const actions = document.getElementById('modal-actions');
            if(actions) actions.innerHTML = `<button class="btn-primary" onclick="completeChallenge(${data.id})">Completar (+20 XP)</button>`;
        } else {
             html += `<div style="text-align:center; padding:10px; border:1px dashed var(--accent); border-radius:8px; margin-top:10px; color:var(--accent);">✅ Reto Completado</div>`;
             const actions = document.getElementById('modal-actions');
             if(actions) actions.innerHTML = '';
        }

        const bodyEl = document.getElementById('modal-body');
        if(bodyEl) bodyEl.innerHTML = html;
    }
};

// 5. Completar Reto
window.completeChallenge = async function(id) {
    const reflectionInput = document.getElementById('challenge-reflection');
    const reflectionText = reflectionInput ? reflectionInput.value.trim() : '';
    
    if (reflectionText.length < 5) {
        return window.showToast("Escribe una reflexión real para continuar", "error");
    }

    // Deshabilitar botón para evitar doble click
    const btn = document.querySelector('#modal-actions button');
    if(btn) { btn.disabled = true; btn.innerText = "Guardando..."; }

    try {
        // A. Guardar progreso
        await window.db.from('user_progress').insert({ 
            user_id: window.currentProfile.id, 
            last_challenge_id: id 
        });

        // B. Guardar la reflexión
        await window.db.from('shared_content').insert({
            user_id: window.currentProfile.id,
            couple_id: window.currentCouple.id,
            type: `reflection_day_${id}`,
            content: reflectionText
        });

        // C. Dar XP
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 20 });
        
        window.closeModal();
        window.showToast("¡Reto Completado! +20 XP", "success");
        
        if(window.refreshUserProfile) window.refreshUserProfile();
        window.loadChallengeGrid();

    } catch(e) {
        console.error(e);
        if (e.code === '23505') {
            window.closeModal();
            window.loadChallengeGrid(); // Ya estaba hecho, solo recargamos
        } else {
            window.showToast("Error al guardar", "error");
            if(btn) { btn.disabled = false; btn.innerText = "Intentar de nuevo"; }
        }
    }
};
