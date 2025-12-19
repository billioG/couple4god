// js/challenges.js

window.loadChallengeGrid = async function() {
    if (!window.currentProfile || !window.currentCouple) return;

    // ... (Mantén la lógica de inyección de HTML del contenedor igual que antes) ...
    // Asegúrate de que el contenedor exista:
    const dynamicContainer = document.getElementById('dynamic-content');
    if (!document.getElementById('calendar-grid') && dynamicContainer) {
        dynamicContainer.innerHTML = `
            <div class="progress-container">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888; margin-bottom:5px;">
                    <span>Tu Progreso</span><span id="progress-text">0%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" id="progress-bar"></div>
                    <div class="milestone" style="left:33%" id="milestone-7">👫</div>
                    <div class="milestone" style="left:66%" id="milestone-14">🎁</div>
                    <div class="milestone" style="left:100%" id="milestone-21">❤️</div>
                </div>
            </div>
            <div id="calendar-grid" class="calendar-grid"></div>
        `;
    }

    const grid = document.getElementById('calendar-grid');
    if(grid) grid.innerHTML = '<p style="grid-column:1/-1; text-align:center">Cargando...</p>';

    try {
        const partnerId = (window.currentCouple.user1_id === window.currentProfile.id) 
                          ? window.currentCouple.user2_id : window.currentCouple.user1_id;

        // IMPORTANTE: Unimos user_progress con challenges para saber el day_number real
        // Esto soluciona el problema de que el ID 4 marque el día 1.
        const { data: myData } = await window.db.from('user_progress').select('challenges(day_number)').eq('user_id', window.currentProfile.id);
        const { data: partnerData } = await window.db.from('user_progress').select('challenges(day_number)').eq('user_id', partnerId);

        // Creamos Sets basados en DAY_NUMBER, no en ID
        const myCompleted = new Set(myData.map(d => d.challenges?.day_number).filter(n => n));
        const partnerCompleted = new Set(partnerData.map(d => d.challenges?.day_number).filter(n => n));

        let currentDay = 1;
        while (myCompleted.has(currentDay)) currentDay++;
        
        // Actualizar barra y jardín
        if(window.updateProgressBar) window.updateProgressBar(myCompleted.size, 21);
        if(window.updateGardenDisplay) window.updateGardenDisplay(currentDay);

        let html = '';
        for (let i = 1; i <= 21; i++) {
            const meDone = myCompleted.has(i);
            const partnerDone = partnerCompleted.has(i);
            
            let className = 'locked';
            let icon = '🔒';
            let action = `onclick="window.showToast('¡No te adelantes! Completa el día actual.', 'error')"`;
            let indicators = '';

            if (meDone) {
                className = 'completed';
                icon = '✅';
                action = `onclick="openChallengeModal(${i}, true)"`;
            } else if (i === currentDay) {
                className = 'active';
                icon = '🔥';
                action = `onclick="openChallengeModal(${i}, false)"`;
            }

            if (meDone && partnerDone) indicators = '<span class="star-icon">⭐️</span>';
            else {
                indicators += `<span class="dot-check ${meDone ? 'done' : ''}"></span>`;
                indicators += `<span class="dot-check ${partnerDone ? 'done' : ''}"></span>`;
            }

            html += `
                <div class="day-card ${className}" ${action}>
                    <div class="day-number">${i}</div>
                    <div class="day-icon">${icon}</div>
                    <div class="indicators">${indicators}</div>
                </div>`;
        }
        if(grid) grid.innerHTML = html;

    } catch (e) { console.error(e); }
};

// ... (updateProgressBar y updateGardenDisplay igual que antes) ...

window.completeChallenge = async function(dayNumber) { // OJO: Recibimos dayNumber, no ID directo
    const input = document.getElementById('challenge-reflection');
    const text = input ? input.value.trim() : '';

    // VALIDACIÓN (Problema 3)
    if (text.length < 10) {
        // Mostramos el error y DETENEMOS la función
        window.showToast("⚠️ La reflexión es muy corta. Escribe al menos una frase completa.", "error");
        return; 
    }

    const btn = document.querySelector('#modal-actions button');
    if(btn) { btn.disabled = true; btn.innerText = "Guardando..."; }

    try {
        // 1. Buscar el ID real del reto basado en el número de día
        const { data: challenge } = await window.db.from('challenges').select('id').eq('day_number', dayNumber).single();
        
        if(!challenge) throw new Error("Reto no encontrado");

        // 2. Guardar
        await window.db.from('user_progress').insert({ 
            user_id: window.currentProfile.id, 
            last_challenge_id: challenge.id // Guardamos el ID correcto
        });

        // 3. Dar XP
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 20 });
        
        window.closeModal();
        window.showToast("¡Excelente! +20 XP", "success");
        window.loadChallengeGrid();
        if(window.refreshUserProfile) window.refreshUserProfile();

    } catch (e) {
        console.error(e);
        window.showToast("Error al guardar", "error");
        if(btn) btn.disabled = false;
    }
};

// Asegúrate de actualizar openChallengeModal para llamar a completeChallenge con el dayNumber
window.openChallengeModal = async function(day, isCompleted) {
    window.showModal(`Día ${day}`, "Cargando...");
    const { data } = await window.db.from('challenges').select('*').eq('day_number', day).single();
    
    if(data) {
        // ... (HTML del contenido igual que antes) ...
        let html = `...contenido del reto... (usa el código anterior)`;
        // AGREGAR EL TEXTAREA
         if (!isCompleted) {
            html = `
                <blockquote style="font-style:italic; border-left:3px solid var(--primary); padding-left:10px; margin:10px 0; color:white;">"${data.quote}"</blockquote>
                <p style="text-align:right; color:var(--primary); font-size:0.8rem; margin-bottom:20px">— ${data.author}</p>
                <div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:15px;"><p>${data.task}</p></div>
                <div style="margin-top:20px; text-align:left;">
                    <label style="color:#aaa; font-size:0.8rem;">Reflexión (Mínimo 10 letras):</label>
                    <textarea id="challenge-reflection" class="input-field" style="height:80px;"></textarea>
                </div>
            `;
            const actions = document.getElementById('modal-actions');
            // Pasamos data.day_number para asegurar consistencia
            actions.innerHTML = `<button class="btn-primary" onclick="completeChallenge(${data.day_number})">Completar (+20 XP)</button>`;
        } else {
            html = `<p style="text-align:center; color:var(--accent)">✅ Completado</p>`;
            document.getElementById('modal-actions').innerHTML = '';
        }
        document.getElementById('modal-body').innerHTML = html;
    }
};
