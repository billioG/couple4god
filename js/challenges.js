// js/challenges.js

// Cargar la cuadrícula (Calendario)
window.loadChallengeGrid = async function() {
    if (!window.currentProfile) return;

    // Activar icono en menú
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    const calBtn = document.querySelector('button[onclick="loadChallengeGrid()"]');
    if(calBtn) calBtn.classList.add('active');

    const grid = document.getElementById('calendar-grid');
    if(!grid) return;
    
    grid.innerHTML = '<p style="text-align:center; width:100%; grid-column:1/-1;">Cargando...</p>';

    try {
        // 1. Obtener progreso
        const { count } = await window.db
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', window.currentProfile.id);

        const currentDay = (count || 0) + 1;
        const totalDays = 21;

        let html = '';

        for (let i = 1; i <= totalDays; i++) {
            let stateClass = 'locked';
            let icon = '🔒';
            let dots = '● ●';
            let clickEvent = `onclick="alert('Completa los días anteriores primero.')"`;

            if (i < currentDay) {
                stateClass = 'completed';
                icon = '✅'; 
                clickEvent = `onclick="openChallengeModal(${i}, true)"`;
            } else if (i === currentDay) {
                stateClass = 'active';
                icon = '🔥';
                clickEvent = `onclick="openChallengeModal(${i}, false)"`;
            }

            html += `
                <div class="day-btn ${stateClass}" ${clickEvent}>
                    <div class="day-num">${i}</div>
                    <div class="day-icon">${icon}</div>
                    <div style="font-size: 0.5rem; opacity: 0.3; margin-top: 2px;">${dots}</div>
                </div>
            `;
        }

        grid.innerHTML = html;
        window.updateGardenDisplay(currentDay);

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center;">Error cargando datos.</p>';
    }
};

// Actualizar el Jardín (Tarjeta verde)
window.updateGardenDisplay = function(currentDay) {
    const plants = ['Semilla 🌱', 'Brote 🌿', 'Tallo 🎋', 'Flor 🌷', 'Árbol 🌳'];
    const levelIndex = Math.min(Math.floor((currentDay - 1) / 5), plants.length - 1);
    const currentPlant = plants[levelIndex];
    const daysToNext = 5 - ((currentDay - 1) % 5);

    const iconEl = document.getElementById('garden-plant');
    const levelEl = document.getElementById('garden-level');
    const nextEl = document.getElementById('garden-next');

    if(iconEl) iconEl.innerText = currentPlant.split(' ')[1];
    if(levelEl) levelEl.innerText = `Nivel ${levelIndex + 1}: ${currentPlant.split(' ')[0]}`;
    if(nextEl) nextEl.innerText = `Faltan ${daysToNext} día(s) para evolucionar 🚀`;
};

// Abrir Modal de Reto
window.openChallengeModal = async function(day, isCompleted) {
    window.showModal(`Día ${day}`, "Cargando contenido...");

    const { data: challenge } = await window.db
        .from('challenges')
        .select('*')
        .eq('day_number', day)
        .single();

    if(challenge) {
        const bodyEl = document.getElementById('modal-body');
        const actionsEl = document.getElementById('modal-actions');
        
        let content = `
            <blockquote style="font-style:italic; font-size: 1.1em; color:#fff; border-left:3px solid var(--primary); padding-left:10px; margin:10px 0;">
                "${challenge.quote}"
            </blockquote>
            <p style="text-align:right; color: var(--primary); margin-bottom: 20px; font-size:0.9em;">— ${challenge.author}</p>
            
            <div style="background:#2d3436; padding:15px; border-radius:10px; margin-bottom:15px; border:1px solid #444;">
                <h4 style="color:var(--accent-green); margin-bottom:5px;">🧠 Sabiduría</h4>
                <p style="font-size:0.95em; color:#ccc;">${challenge.reflection}</p>
            </div>

            <div style="background:rgba(78, 142, 255, 0.1); padding:15px; border-radius:10px; border:1px solid var(--primary);">
                <h4 style="color:var(--primary); margin-bottom:5px;">🔥 Misión de Hoy</h4>
                <p style="font-size:0.95em; color:white;">${challenge.task}</p>
            </div>

            <p style="margin-top:15px; font-size:0.9em; text-align:center; color:#8b9bb4;">
                <i>✨ Intención: ${challenge.intention}</i>
            </p>
        `;
        
        bodyEl.innerHTML = content;
        
        if (!isCompleted) {
            actionsEl.innerHTML = `<button class="btn-primary" onclick="completeChallenge(${challenge.id})">¡Misión Cumplida! (+100 XP)</button>`;
        } else {
            actionsEl.innerHTML = `<p style="text-align:center; color:var(--accent-green); width:100%; margin-top:10px;">✅ Día completado</p>`;
        }
    }
};

// Completar Reto
window.completeChallenge = async function(challengeId) {
    if (!window.currentProfile) return;

    try {
        await window.db.from('user_progress').insert({
            user_id: window.currentProfile.id,
            last_challenge_id: challengeId
        });

        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 100 });

        window.closeModal();
        window.showModal("¡Excelente!", "Has ganado 100 XP. Sigue así.");
        
        // Recargar
        window.refreshUserProfile();
        window.loadChallengeGrid();

    } catch (error) {
        console.error(error);
        window.closeModal(); // Cerrar si hubo error (probablemente duplicado)
        alert("Ya completaste este reto hoy.");
    }
};
