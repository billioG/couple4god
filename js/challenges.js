// js/challenges.js

async function loadChallengeGrid() {
    if (!window.currentProfile) return;
    
    // Resaltar icono del menú
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    document.querySelector('button[onclick="loadChallengeGrid()"]').classList.add('active');

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '<p style="text-align:center; width:100%">Cargando...</p>';

    try {
        // 1. Obtener progreso
        const { count } = await window.db
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', window.currentProfile.id);

        const currentDay = count + 1;
        const totalDays = 21; // Total de retos

        let html = '';

        for (let i = 1; i <= totalDays; i++) {
            let stateClass = '';
            let icon = '';
            let dots = '● ●'; // Los puntitos de abajo
            let clickEvent = '';

            if (i < currentDay) {
                // Pasado
                stateClass = 'completed';
                icon = '✅'; 
                clickEvent = `onclick="openChallengeModal(${i}, true)"`; // Ver solo lectura
            } else if (i === currentDay) {
                // Actual (Fuego)
                stateClass = 'active';
                icon = '🔥';
                clickEvent = `onclick="openChallengeModal(${i}, false)"`; // Ver para completar
            } else {
                // Futuro (Bloqueado)
                stateClass = 'locked';
                icon = '🔒';
                dots = '● ●';
                clickEvent = `onclick="alert('¡No te adelantes! Completa el día actual.')"`;
            }

            html += `
                <div class="day-btn ${stateClass}" ${clickEvent}>
                    <div class="day-num">${i}</div>
                    <div class="day-icon">${icon}</div>
                    <div style="font-size: 0.6rem; opacity: 0.5; margin-top: 2px;">${dots}</div>
                </div>
            `;
        }

        grid.innerHTML = html;
        
        // Actualizar el Jardín también
        updateGardenDisplay(currentDay);

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p>Error cargando calendario</p>';
    }
}

// Actualizar la tarjeta verde de arriba
function updateGardenDisplay(currentDay) {
    const plants = ['Semilla 🌱', 'Brote 🌿', 'Tallo 🎋', 'Flor 🌷', 'Árbol 🌳'];
    // Lógica simple para subir de nivel cada 5 días
    const levelIndex = Math.floor((currentDay - 1) / 5); 
    const currentPlant = plants[Math.min(levelIndex, plants.length - 1)];
    const daysToNext = 5 - ((currentDay - 1) % 5);

    document.getElementById('garden-plant').innerText = currentPlant.split(' ')[1];
    document.getElementById('garden-level').innerText = `Nivel ${levelIndex + 1}: ${currentPlant.split(' ')[0]}`;
    document.getElementById('garden-next').innerText = `Faltan ${daysToNext} día(s) para evolucionar 🚀`;
}

// Abrir Modal
window.openChallengeModal = async function(day, isCompleted) {
    window.showModal(`Día ${day}`, "Cargando sabiduría...");

    const { data: challenge } = await window.db
        .from('challenges')
        .select('*')
        .eq('day_number', day)
        .single();

    if(challenge) {
        let content = `
            <p style="font-style:italic; font-size: 1.1em">"${challenge.quote}"</p>
            <p style="text-align:right; color: var(--primary); margin-bottom: 15px;">— ${challenge.author}</p>
            <div style="background:#2d3436; padding:15px; border-radius:10px; margin-bottom:15px">
                <h4 style="color:#aebbc9">Misión:</h4>
                <p>${challenge.task}</p>
            </div>
        `;

        if (!isCompleted) {
            content += `<button class="btn-primary" onclick="completeChallenge(${challenge.id})">¡Completado! (+XP)</button>`;
        } else {
            content += `<p style="text-align:center; color: var(--accent-green)">✨ Reto completado</p>`;
        }

        // Actualizar modal ya abierto
        document.getElementById('modal-body').innerHTML = content;
        // Inyectar botón en acciones si es necesario (o dejarlo en el body como arriba)
    }
}
