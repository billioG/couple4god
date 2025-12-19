// js/challenges.js

window.loadChallengeGrid = async function() {
    // Seguridad
    if (!window.currentProfile) {
        console.log("Esperando perfil para cargar calendario...");
        return;
    }

    const grid = document.getElementById('calendar-grid');
    if (!grid) return; // Si no estamos en la vista correcta

    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center">Cargando...</p>';

    try {
        // Obtener progreso real
        const { count } = await window.db
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', window.currentProfile.id);

        const currentDay = (count || 0) + 1;
        const totalDays = 21;

        let html = '';

        for (let i = 1; i <= totalDays; i++) {
            let className = 'locked';
            let icon = '🔒';
            let clickAction = `onclick="alert('Debes completar los días anteriores.')"`;

            // Lógica de estados
            if (i < currentDay) {
                className = 'completed'; // Días pasados (Verde)
                icon = '✅';
                clickAction = `onclick="openChallengeModal(${i}, true)"`;
            } else if (i === currentDay) {
                className = 'active'; // Día actual (Azul + Fuego)
                icon = '🔥';
                clickAction = `onclick="openChallengeModal(${i}, false)"`;
            }

            // HTML de cada tarjeta
            html += `
                <div class="day-card ${className}" ${clickAction}>
                    <div class="day-number">${i}</div>
                    <div class="day-icon">${icon}</div>
                </div>
            `;
        }

        // Inyectar en el DOM
        grid.innerHTML = html;
        
        // Actualizar el Jardín
        window.updateGardenDisplay(currentDay);

    } catch (err) {
        console.error("Error calendario:", err);
        grid.innerHTML = '<p>Error de conexión</p>';
    }
};

window.updateGardenDisplay = function(day) {
    const plants = ['Semilla 🌱', 'Brote 🌿', 'Tallo 🎋', 'Flor 🌷', 'Árbol 🌳'];
    const levelIndex = Math.min(Math.floor((day - 1) / 5), plants.length - 1);
    
    document.getElementById('garden-level').innerText = `Nivel ${levelIndex + 1}: ${plants[levelIndex].split(' ')[0]}`;
    document.getElementById('garden-plant').innerText = plants[levelIndex].split(' ')[1];
    document.getElementById('garden-next').innerText = `Faltan ${5 - ((day - 1) % 5)} días para evolucionar 🚀`;
};

window.openChallengeModal = async function(day, isCompleted) {
    window.showModal(`Día ${day}`, "Cargando...");
    
    const { data } = await window.db.from('challenges').select('*').eq('day_number', day).single();
    
    if(data) {
        let content = `
            <p style="font-style:italic; margin-bottom:10px;">"${data.quote}"</p>
            <p style="color:var(--primary); text-align:right; margin-bottom:20px;">— ${data.author}</p>
            <div style="background:#252a35; padding:15px; border-radius:10px; text-align:left; border:1px solid #333;">
                <h4 style="color:var(--accent); margin-bottom:5px;">Misión:</h4>
                <p>${data.task}</p>
            </div>
        `;
        
        if(!isCompleted) {
            content += `<button class="btn-primary" onclick="completeChallenge(${data.id})">¡Completado!</button>`;
        }
        
        document.getElementById('modal-body').innerHTML = content;
    }
};

window.completeChallenge = async function(id) {
    if(!window.currentProfile) return;
    
    await window.db.from('user_progress').insert({ user_id: window.currentProfile.id, last_challenge_id: id });
    await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 100 });
    
    window.closeModal();
    window.showModal("¡Genial!", "Has ganado 100 XP");
    window.refreshUserProfile();
    window.loadChallengeGrid();
};
