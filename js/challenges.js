window.loadChallengeGrid = async function() {
    if (!window.currentProfile) return;

    // Asegurar contenedor
    const dynamicContainer = document.getElementById('dynamic-content');
    if (!document.getElementById('calendar-grid')) {
        dynamicContainer.innerHTML = '<div id="calendar-grid" class="calendar-grid"></div>';
    }
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center">Cargando...</p>';

    try {
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
            let clickAction = `onclick="window.showToast('Completa los días anteriores', 'error')"`;
            let dots = '● ●';

            if (i < currentDay) {
                className = 'completed';
                icon = '✅';
                dots = '';
                clickAction = `onclick="openChallengeModal(${i}, true)"`;
            } else if (i === currentDay) {
                className = 'active';
                icon = '🔥';
                dots = '';
                clickAction = `onclick="openChallengeModal(${i}, false)"`;
            }

            html += `
                <div class="day-card ${className}" ${clickAction}>
                    <div class="day-number">${i}</div>
                    <div class="day-icon">${icon}</div>
                    <div style="font-size:0.6rem; opacity:0.3; margin-top:2px">${dots}</div>
                </div>
            `;
        }

        grid.innerHTML = html;
        window.updateGardenDisplay(currentDay);

    } catch (err) {
        console.error(err);
    }
};

window.updateGardenDisplay = function(day) {
    const plants = ['Semilla 🌱', 'Brote 🌿', 'Tallo 🎋', 'Flor 🌷', 'Árbol 🌳'];
    const index = Math.min(Math.floor((day - 1) / 5), 4);
    const plant = plants[index];
    
    document.getElementById('garden-level').innerText = `Nivel ${index + 1}: ${plant.split(' ')[0]}`;
    document.getElementById('garden-plant').innerText = plant.split(' ')[1];
    document.getElementById('garden-next').innerText = `Faltan ${5 - ((day - 1) % 5)} días para evolucionar 🚀`;
};

window.openChallengeModal = async function(day, completed) {
    window.showModal(`Día ${day}`, "Cargando...");
    const { data } = await window.db.from('challenges').select('*').eq('day_number', day).single();
    
    if(data) {
        let html = `
            <blockquote style="font-style:italic; border-left:3px solid var(--primary); padding-left:10px; margin:10px 0; color:white;">"${data.quote}"</blockquote>
            <p style="text-align:right; color:var(--primary); font-size:0.9em; margin-bottom:20px">— ${data.author}</p>
            <div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:15px;">
                <h4 style="color:var(--accent); margin-bottom:5px;">🧠 Sabiduría</h4>
                <p style="font-size:0.9em; color:#ddd;">${data.reflection}</p>
            </div>
            <div style="background:rgba(78, 142, 255, 0.1); padding:15px; border-radius:10px; border:1px solid var(--primary);">
                <h4 style="color:var(--primary); margin-bottom:5px;">🔥 Misión</h4>
                <p style="font-size:0.9em; color:white;">${data.task}</p>
            </div>
            <p style="margin-top:15px; text-align:center; font-style:italic; font-size:0.85em; color:#8b9bb4">✨ ${data.intention}</p>
        `;
        
        const actions = document.getElementById('modal-actions');
        document.getElementById('modal-body').innerHTML = html;
        
        if (!completed) {
            actions.innerHTML = `<button class="btn-primary" onclick="completeChallenge(${data.id})">¡Completado! (+100 XP)</button>`;
        } else {
            actions.innerHTML = `<p style="color:var(--accent); text-align:center; width:100%; margin-top:10px;">✅ Reto completado</p>`;
        }
    }
};

window.completeChallenge = async function(id) {
    try {
        await window.db.from('user_progress').insert({ user_id: window.currentProfile.id, last_challenge_id: id });
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 100 });
        
        window.closeModal();
        window.showToast("¡Excelente! +100 XP", "success");
        
        // Recargar todo
        await window.refreshUserProfile();
        window.loadChallengeGrid();
    } catch(e) {
        console.error(e);
    }
};
