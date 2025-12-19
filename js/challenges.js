// js/challenges.js

window.loadChallengeGrid = async function() {
    if (!window.currentProfile || !window.currentCouple) return;

    const dynamicContainer = document.getElementById('dynamic-content');
    if (!document.getElementById('calendar-grid')) {
        // Inyectamos también la barra de progreso si no existe
        // Nota: En index.html ya está la estructura, solo llenamos el grid
    }

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center">Cargando progreso de ambos...</p>';

    try {
        // 1. Obtener progreso MÍO y de mi PAREJA
        const partnerId = (window.currentCouple.user1_id === window.currentProfile.id) 
                          ? window.currentCouple.user2_id 
                          : window.currentCouple.user1_id;

        // Traer todos los registros de progreso de ambos
        const { data: allProgress } = await window.db
            .from('user_progress')
            .select('user_id, last_challenge_id')
            .in('user_id', [window.currentProfile.id, partnerId]);

        // Organizar datos
        // Convertimos a un Set de IDs de retos completados para búsqueda rápida
        const myCompleted = new Set(allProgress.filter(p => p.user_id === window.currentProfile.id).map(p => p.last_challenge_id));
        const partnerCompleted = new Set(allProgress.filter(p => p.user_id === partnerId).map(p => p.last_challenge_id));

        // Determinar día actual (basado en mis completados + 1)
        const myCount = myCompleted.size;
        const currentDay = myCount + 1;
        const totalDays = 21;

        // Actualizar Barra de Progreso (Punto 3)
        updateProgressBar(myCount, totalDays);

        let html = '';

        for (let i = 1; i <= totalDays; i++) {
            // Verificar quién completó este día (ID del reto = i, asumiendo IDs secuenciales 1-21)
            // Si tus IDs de retos en DB no son 1-21, esto requiere ajuste. 
            // Asumo que en la tabla challenges, id = day_number para simplificar.
            const meDone = myCompleted.has(i);
            const partnerDone = partnerCompleted.has(i);

            let className = 'locked';
            let mainIcon = '🔒';
            let indicatorsHtml = '';
            let clickAction = `onclick="window.showToast('Día bloqueado', 'error')"`;

            // Lógica de Estado Principal
            if (meDone) {
                className = 'completed';
                mainIcon = '✅';
                clickAction = `onclick="openChallengeModal(${i}, true)"`;
            } else if (i === currentDay) {
                className = 'active';
                mainIcon = '🔥';
                clickAction = `onclick="openChallengeModal(${i}, false)"`;
            }

            // Lógica de Indicadores (Punto 4)
            // Asumimos: Azul = Male, Rosa = Female.
            // Si no tenemos el género de la pareja a mano, usaremos lógica simple:
            // Mi punto siempre a la izquierda, pareja a la derecha, o colores fijos si cargamos el perfil de la pareja.
            
            // Para simplificar: Azul = Hombre, Rosa = Mujer.
            // Necesitamos saber el género de cada uno.
            // window.currentProfile.gender nos dice el mío.
            // Asumiremos colores basados en eso.

            if (meDone && partnerDone) {
                indicatorsHtml = '<span class="star-icon">⭐️</span>'; // Ambos listos
            } else {
                // Punto Mío
                if (meDone) {
                    const colorClass = window.currentProfile.gender === 'male' ? 'dot-blue' : 'dot-pink';
                    indicatorsHtml += `<span class="dot ${colorClass}"></span>`;
                }
                // Punto Pareja (Adivinamos color opuesto o gris si no sabemos)
                if (partnerDone) {
                    const partnerColor = window.currentProfile.gender === 'male' ? 'dot-pink' : 'dot-blue';
                    indicatorsHtml += `<span class="dot ${partnerColor}"></span>`;
                }
            }

            html += `
                <div class="day-card ${className}" ${clickAction}>
                    <div class="day-number">${i}</div>
                    <div class="day-icon">${mainIcon}</div>
                    <div class="indicators">${indicatorsHtml}</div>
                </div>
            `;
        }

        grid.innerHTML = html;
        window.updateGardenDisplay(currentDay);

    } catch (err) {
        console.error("Error grid:", err);
    }
};

// Actualizar Barra (Punto 3)
function updateProgressBar(completedCount, total) {
    const percent = (completedCount / total) * 100;
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('progress-text').innerText = `${Math.round(percent)}%`;

    // Desbloquear hitos visualmente
    if (completedCount >= 7) document.getElementById('milestone-7').classList.add('unlocked');
    if (completedCount >= 14) document.getElementById('milestone-14').classList.add('unlocked');
    if (completedCount >= 21) document.getElementById('milestone-21').classList.add('unlocked');
}

// Abrir Modal (Con Reflexión - Punto 4)
window.openChallengeModal = async function(day, isCompleted) {
    window.showModal(`Reto Día ${day}`, "Cargando...");
    
    const { data: challenge } = await window.db.from('challenges').select('*').eq('day_number', day).single();

    if(challenge) {
        let html = `
            <blockquote style="font-style:italic; border-left:3px solid var(--primary); padding-left:10px; margin:10px 0; color:white;">"${challenge.quote}"</blockquote>
            <p style="text-align:right; color:var(--primary); font-size:0.9em; margin-bottom:20px">— ${challenge.author}</p>
            
            <div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:15px;">
                <h4 style="color:var(--accent); margin-bottom:5px;">🧠 Sabiduría</h4>
                <p style="font-size:0.9em; color:#ddd;">${challenge.reflection}</p>
            </div>

            <div style="background:rgba(78, 142, 255, 0.1); padding:15px; border-radius:10px; border:1px solid var(--primary);">
                <h4 style="color:var(--primary); margin-bottom:5px;">🔥 Misión</h4>
                <p style="font-size:0.9em; color:white;">${challenge.task}</p>
            </div>
        `;
        
        // Campo de Reflexión (Obligatorio para completar)
        if (!isCompleted) {
            html += `
                <div style="margin-top:20px;">
                    <p style="font-size:0.9em; color:#aaa; margin-bottom:5px;">Para completar, escribe una breve reflexión:</p>
                    <textarea id="challenge-reflection" class="input-field" style="height:80px; font-size:0.9rem;" placeholder="¿Cómo te sentiste?"></textarea>
                </div>
            `;
        } else {
             // Si ya completó, podríamos mostrar su reflexión anterior (requiere query extra)
             html += `<p style="color:var(--accent); text-align:center; margin-top:15px;">✅ Reto completado</p>`;
        }

        const actions = document.getElementById('modal-actions');
        document.getElementById('modal-body').innerHTML = html;
        
        if (!isCompleted) {
            actions.innerHTML = `<button class="btn-primary" onclick="completeChallenge(${challenge.id})">Completar Reto</button>`;
        } else {
            actions.innerHTML = '';
        }
    }
};

// Completar Reto (Guardando Reflexión)
window.completeChallenge = async function(id) {
    const reflectionText = document.getElementById('challenge-reflection').value.trim();
    
    if (reflectionText.length < 5) {
        return window.showToast("Por favor escribe una reflexión real.", "error");
    }

    try {
        // 1. Guardar progreso
        await window.db.from('user_progress').insert({ 
            user_id: window.currentProfile.id, 
            last_challenge_id: id 
        });

        // 2. Guardar Reflexión en Shared Content (Para que la pareja la vea si quieres implementarlo luego)
        await window.db.from('shared_content').insert({
            user_id: window.currentProfile.id,
            couple_id: window.currentCouple.id,
            type: `reflection_day_${id}`, // Tipo especial para identificar el día
            content: reflectionText
        });

        // 3. Dar XP
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 100 });
        
        window.closeModal();
        window.showToast("¡Reto Completado! +100 XP", "success");
        
        await window.refreshUserProfile();
        window.loadChallengeGrid();

    } catch(e) {
        console.error(e);
        window.showToast("Error al guardar", "error");
    }
};
