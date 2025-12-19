// ==========================================
// LÓGICA DE RETOS Y CALENDARIO
// ==========================================

window.loadChallengeGrid = async function() {
    if (!window.currentProfile || !window.currentCouple) return;

    // Restaurar estructura de barra si falta (por cambio de vista)
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
        const partnerId = (window.currentCouple.user1_id === window.currentProfile.id) ? window.currentCouple.user2_id : window.currentCouple.user1_id;

        // Obtener progreso con FECHA para validar "uno por día"
        const { data: myData } = await window.db.from('user_progress').select('challenges(day_number), completed_at').eq('user_id', window.currentProfile.id);
        const { data: partnerData } = await window.db.from('user_progress').select('challenges(day_number)').eq('user_id', partnerId);

        const myCompleted = new Set(myData.map(d => d.challenges?.day_number).filter(n => n));
        const partnerCompleted = new Set(partnerData.map(d => d.challenges?.day_number).filter(n => n));

        // Calcular último día hecho y fecha
        let lastDayDone = 0;
        let lastDate = null;
        
        // Ordenamos para encontrar el último
        const sortedProgress = myData.sort((a,b) => b.challenges.day_number - a.challenges.day_number);
        if(sortedProgress.length > 0) {
            lastDayDone = sortedProgress[0].challenges.day_number;
            lastDate = new Date(sortedProgress[0].completed_at);
        }

        let currentDay = lastDayDone + 1;

        // LÓGICA DE ADVIENTO (PUNTO 6): Si el último se hizo hoy, el siguiente se bloquea
        const today = new Date();
        let isTodayDone = false;
        if (lastDate) {
            if (lastDate.getDate() === today.getDate() && 
                lastDate.getMonth() === today.getMonth() && 
                lastDate.getFullYear() === today.getFullYear()) {
                isTodayDone = true;
            }
        }

        if(window.updateProgressBar) window.updateProgressBar(myCompleted.size, 21);
        if(window.updateGardenDisplay) window.updateGardenDisplay(currentDay);

        let html = '';
        for (let i = 1; i <= 21; i++) {
            const meDone = myCompleted.has(i);
            const partnerDone = partnerCompleted.has(i);
            
            let className = 'locked';
            let icon = '🔒';
            let action = `onclick="window.showToast('Espera a mañana para el siguiente reto.', 'error')"`;
            
            if (i > currentDay) {
                action = `onclick="window.showToast('Completa los días anteriores.', 'error')"`;
            }

            if (meDone) {
                className = 'completed';
                icon = '✅';
                action = `onclick="openChallengeModal(${i}, true)"`;
            } else if (i === currentDay) {
                if (isTodayDone) {
                    // Si ya hice uno hoy, este (el siguiente) se muestra bloqueado pero con aviso "Vuelve mañana"
                    className = 'locked'; 
                    icon = '⏳'; // Reloj de arena
                    action = `onclick="window.showToast('¡Has cumplido por hoy! Vuelve mañana.', 'info')"`;
                } else {
                    className = 'active';
                    icon = '🔥';
                    action = `onclick="openChallengeModal(${i}, false)"`;
                }
            }

            let indicators = '';
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

window.updateProgressBar = function(c, t) {
    const p = (c / t) * 100;
    const bar = document.getElementById('progress-bar');
    if(bar) bar.style.width = `${p}%`;
    const txt = document.getElementById('progress-text');
    if(txt) txt.innerText = `${Math.round(p)}%`;
    if (c >= 7) document.getElementById('milestone-7')?.classList.add('unlocked');
    if (c >= 14) document.getElementById('milestone-14')?.classList.add('unlocked');
    if (c >= 21) document.getElementById('milestone-21')?.classList.add('unlocked');
};

window.updateGardenDisplay = function(day) {
    const plants = ['Semilla 🌱', 'Brote 🌿', 'Tallo 🎋', 'Flor 🌷', 'Árbol 🌳'];
    const idx = Math.min(Math.floor((day - 1) / 5), plants.length - 1);
    const elIcon = document.getElementById('garden-plant');
    if(elIcon) elIcon.innerText = plants[idx].split(' ')[1];
    const elLevel = document.getElementById('garden-level');
    if(elLevel) elLevel.innerText = `Nivel ${idx + 1}: ${plants[idx].split(' ')[0]}`;
    const elNext = document.getElementById('garden-next');
    if(elNext) elNext.innerText = `Reto del día ${day}`;
};

// MODAL COMPLETO (PUNTO 3)
window.openChallengeModal = async function(day, isCompleted) {
    window.showModal(`Reto Día ${day}`, "Cargando...");
    const { data } = await window.db.from('challenges').select('*').eq('day_number', day).single();

    if(data) {
        let html = `
            <div style="text-align:left;">
                <blockquote style="font-style:italic; border-left:3px solid var(--primary); padding-left:10px; margin:10px 0; color:white;">"${data.quote}"</blockquote>
                <p style="text-align:right; color:var(--primary); font-size:0.8rem; margin-bottom:20px">— ${data.author}</p>
                
                <div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:15px;">
                    <h4 style="color:var(--accent); text-transform:uppercase; font-size:0.75rem; margin-bottom:5px;">🧠 Reflexión</h4>
                    <p style="font-size:0.9rem; color:#ddd; line-height:1.4;">${data.reflection}</p>
                </div>

                <div style="background:rgba(78, 142, 255, 0.1); padding:15px; border-radius:10px; border:1px solid var(--primary); margin-bottom:15px;">
                    <h4 style="color:var(--primary); text-transform:uppercase; font-size:0.75rem; margin-bottom:5px;">🔥 Tarea</h4>
                    <p style="font-size:0.95em; color:white;">${data.task}</p>
                </div>

                <div style="text-align:center; padding:10px; border-top:1px solid #333;">
                    <p style="font-size:0.8rem; color:#888; font-style:italic;">✨ Intención: ${data.intention}</p>
                </div>
            </div>
        `;

        if (!isCompleted) {
            html += `
                <div style="margin-top:15px; text-align:left;">
                    <label style="color:#aaa; font-size:0.8rem;">Tu Reflexión (Obligatoria):</label>
                    <textarea id="challenge-reflection" class="input-field" style="height:70px;"></textarea>
                </div>`;
            const actions = document.getElementById('modal-actions');
            actions.innerHTML = `<button class="btn-primary" onclick="completeChallenge(${data.day_number})">Completar</button>`;
        } else {
             const actions = document.getElementById('modal-actions');
             actions.innerHTML = `<p style="color:var(--accent); text-align:center;">✅ Completado</p>`;
        }
        document.getElementById('modal-body').innerHTML = html;
    }
};

window.completeChallenge = async function(dayNumber) {
    const txt = document.getElementById('challenge-reflection').value.trim();
    if(txt.length < 5) return window.showToast("Escribe una reflexión válida.", "error");

    const btn = document.querySelector('#modal-actions button');
    if(btn) btn.disabled = true;

    try {
        const { data: c } = await window.db.from('challenges').select('id').eq('day_number', dayNumber).single();
        
        await window.db.from('user_progress').insert({ user_id: window.currentProfile.id, last_challenge_id: c.id });
        await window.db.from('shared_content').insert({ user_id: window.currentProfile.id, couple_id: window.currentCouple.id, type: `reflection_day_${dayNumber}`, content: txt });
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 20 });
        
        window.closeModal();
        window.showToast("¡Reto Completado! +20 XP", "success");
        window.loadChallengeGrid();
        if(window.refreshUserProfile) window.refreshUserProfile();
    } catch(e) {
        console.error(e);
        window.showToast("Error al guardar", "error");
        if(btn) btn.disabled = false;
    }
};
