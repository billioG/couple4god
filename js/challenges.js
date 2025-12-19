// ==========================================
// LÓGICA DE RETOS (OPTIMIZADA: CACHÉ + DOM FRAGMENTS)
// ==========================================

window.loadChallengeGrid = async function () {
    // 1. Validación de Estado (Usando el nuevo Namespace App)
    if (!App.state.couple || !App.state.profile) return;

    const container = document.getElementById('calendar-grid');
    if (!container) return;

    // 2. Caché de Progreso (Evita llamadas a DB si cambias de tab rápido)
    let progressData = App.utils.getCache('challenges_progress');

    if (!progressData) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center">Cargando progreso...</p>';

        const partnerId = (App.state.couple.user1_id === App.state.profile.id)
            ? App.state.couple.user2_id
            : App.state.couple.user1_id;

        try {
            // Fetch optimizado: Traemos progreso de ambos en una sola consulta
            const { data, error } = await window.db
                .from('user_progress')
                .select('user_id, last_challenge_id, challenges(day_number), completed_at')
                .in('user_id', [App.state.profile.id, partnerId]);

            if (error) throw error;

            progressData = { raw: data, partnerId: partnerId };
            App.utils.setCache('challenges_progress', progressData); // Guardar en caché
        } catch (err) {
            console.error(err);
            container.innerHTML = '<p>Error de conexión</p>';
            return;
        }
    }

    // 3. Procesamiento de Datos (Lógica)
    const myProgress = progressData.raw.filter(p => p.user_id === App.state.profile.id);
    const partnerProgress = progressData.raw.filter(p => p.user_id === progressData.partnerId);

    // Mapear a Sets de Días (Más rápido que buscar en arrays)
    const myCompletedDays = new Set(myProgress.map(p => p.challenges?.day_number || 0));
    const partnerCompletedDays = new Set(partnerProgress.map(p => p.challenges?.day_number || 0));

    // Calcular Día Actual (Secuencial)
    let currentDay = 1;
    while (myCompletedDays.has(currentDay)) {
        currentDay++;
    }

    // Validación de Adviento (1 por día) - Opcional, para evitar trampas de fecha
    const lastDone = myProgress.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0];
    let isTodayDone = false;
    if (lastDone) {
        const doneDate = new Date(lastDone.completed_at).toDateString();
        const todayDate = new Date().toDateString();
        if (doneDate === todayDate) isTodayDone = true;
    }

    // 4. Renderizado Eficiente (DOM Fragment)
    // Creamos los elementos en memoria, no en la pantalla
    const fragment = document.createDocumentFragment();
    const totalDays = 21;

    // Actualizar Barra (Helper UI)
    updateProgressBarInternal(myCompletedDays.size, totalDays);
    updateGardenInternal(currentDay);

    for (let i = 1; i <= totalDays; i++) {
        const meDone = myCompletedDays.has(i);
        const partnerDone = partnerCompletedDays.has(i);

        const card = document.createElement('div');
        let className = 'day-card';
        let icon = '🔒';
        let indicators = '';

        // Determinar Estado
        if (meDone) {
            className += ' completed';
            icon = '✅';
            card.onclick = () => window.openChallengeModal(i, true);
        } else if (i === currentDay) {
            if (isTodayDone) {
                className += ' locked'; // Bloqueado hasta mañana
                icon = '⏳';
                card.onclick = () => App.ui.showToast('¡Reto de hoy cumplido! Vuelve mañana.', 'info');
            } else {
                className += ' active';
                icon = '🔥';
                card.onclick = () => window.openChallengeModal(i, false);
            }
        } else if (i < currentDay) {
            // Caso raro: Días anteriores no marcados (no debería pasar con lógica secuencial, pero por si acaso)
            className += ' locked';
            card.onclick = () => App.ui.showToast('Completa los días en orden.', 'error');
        } else {
            className += ' locked';
            card.onclick = () => App.ui.showToast('Completa los días anteriores.', 'error');
        }

        // Indicadores (Estrella o Puntos)
        if (meDone && partnerDone) {
            indicators = '<span class="star-icon">⭐️</span>';
        } else {
            indicators += `<span class="dot-check ${meDone ? 'done' : ''}"></span>`;
            indicators += `<span class="dot-check ${partnerDone ? 'done' : ''}"></span>`;
        }

        // Construcción del HTML interno de la tarjeta
        card.className = className;
        card.innerHTML = `
            <div class="day-number">${i}</div>
            <div class="day-icon">${icon}</div>
            <div class="indicators">${indicators}</div>
        `;

        fragment.appendChild(card);
    }

    // 5. Inyección Única (Solo un Reflow)
    container.innerHTML = '';
    container.appendChild(fragment);
};

// --- Funciones Auxiliares Internas ---

function updateProgressBarInternal(count, total) {
    const percent = (count / total) * 100;
    const bar = document.getElementById('progress-bar');
    const txt = document.getElementById('progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (txt) txt.innerText = `${Math.round(percent)}%`;

    // Desbloqueo visual de hitos
    if (count >= 7) document.getElementById('milestone-7')?.classList.add('unlocked');
    if (count >= 14) document.getElementById('milestone-14')?.classList.add('unlocked');
    if (count >= 21) document.getElementById('milestone-21')?.classList.add('unlocked');
}

function updateGardenInternal(day) {
    const plants = ['Semilla 🌱', 'Brote 🌿', 'Tallo 🎋', 'Flor 🌷', 'Árbol 🌳'];
    const idx = Math.min(Math.floor((day - 1) / 5), plants.length - 1);
    const plantData = plants[idx].split(' ');

    const elIcon = document.getElementById('garden-plant');
    const elLevel = document.getElementById('garden-level');
    const elNext = document.getElementById('garden-next');

    if (elIcon) elIcon.innerText = plantData[1];
    if (elLevel) elLevel.innerText = `Nivel ${idx + 1}: ${plantData[0]}`;
    if (elNext) elNext.innerText = `Reto actual: Día ${day}`;
}

// 6. MODAL Y COMPLETAR (Usando App.state)
window.openChallengeModal = async function (day, isCompleted) {
    App.ui.showModal(`Reto Día ${day}`, "Cargando contenido...");

    // Intentar cache de textos de retos (rara vez cambian)
    let challengeData = App.utils.getCache(`challenge_text_${day}`);

    if (!challengeData) {
        const { data } = await window.db.from('challenges').select('*').eq('day_number', day).single();
        challengeData = data;
        App.utils.setCache(`challenge_text_${day}`, data);
    }

    if (challengeData) {
        // Sanitizamos contenido por seguridad (aunque venga de nuestra DB)
        const quote = App.utils.escape(challengeData.quote);
        const task = App.utils.escape(challengeData.task);
        const reflection = App.utils.escape(challengeData.reflection);

        let html = `
            <div style="text-align:left;">
                <blockquote style="font-style:italic; border-left:3px solid var(--primary); padding-left:10px; margin:10px 0; color:white;">"${quote}"</blockquote>
                <p style="text-align:right; color:var(--primary); font-size:0.8rem; margin-bottom:20px">— ${App.utils.escape(challengeData.author)}</p>
                
                <div style="background:#252a35; padding:15px; border-radius:10px; margin-bottom:15px;">
                    <h4 style="color:var(--accent); font-size:0.75rem; margin-bottom:5px;">🧠 REFLEXIÓN</h4>
                    <p style="font-size:0.9rem; color:#ddd; line-height:1.4;">${reflection}</p>
                </div>

                <div style="background:rgba(78, 142, 255, 0.1); padding:15px; border-radius:10px; border:1px solid var(--primary); margin-bottom:15px;">
                    <h4 style="color:var(--primary); font-size:0.75rem; margin-bottom:5px;">🔥 TAREA</h4>
                    <p style="font-size:0.95em; color:white;">${task}</p>
                </div>
            </div>
        `;

        const actionsDiv = document.getElementById('modal-actions');
        const bodyDiv = document.getElementById('modal-body');

        if (!isCompleted) {
            html += `
                <div style="margin-top:15px; text-align:left;">
                    <label style="color:#aaa; font-size:0.8rem;">Tu Reflexión:</label>
                    <textarea id="challenge-reflection" class="input-field" style="height:70px; margin-top:5px;" placeholder="¿Cómo te sentiste?"></textarea>
                </div>`;
            actionsDiv.innerHTML = `<button class="btn-primary" onclick="completeChallenge(${challengeData.day_number}, this)">Completar (+20 XP)</button>`;
        } else {
            actionsDiv.innerHTML = `<p style="color:var(--accent); text-align:center; font-weight:bold;">✅ Reto Completado</p>`;
        }

        bodyDiv.innerHTML = html;
    }
};

window.completeChallenge = async function (dayNumber, btnElement) {
    const txtInput = document.getElementById('challenge-reflection');
    const text = txtInput ? txtInput.value.trim() : '';

    if (text.length < 5) return App.ui.showToast("Escribe una reflexión válida.", "error");

    // UX: Feedback inmediato en el botón
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerText = "Guardando...";
    }

    try {
        // Necesitamos el ID del reto, no el número de día
        const { data: challenge } = await window.db.from('challenges').select('id').eq('day_number', dayNumber).single();

        // Operaciones en paralelo para velocidad
        await Promise.all([
            window.db.from('user_progress').insert({
                user_id: App.state.profile.id,
                last_challenge_id: challenge.id
            }),
            window.db.from('shared_content').insert({
                user_id: App.state.profile.id,
                couple_id: App.state.couple.id,
                type: `reflection_day_${dayNumber}`,
                content: text
            }),
            window.db.rpc('add_xp', { user_id: App.state.profile.id, points: 20 })
        ]);

        // Limpiar caché para forzar recarga fresca del grid
        App.utils.invalidateCache('challenges_progress');

        // Actualizar UI Global
        await App.actions.refreshProfile();

        App.ui.closeModal();
        App.ui.showToast("¡Excelente! +20 XP", "success");

        // Recargar grid
        window.loadChallengeGrid();

    } catch (e) {
        console.error(e);
        // Manejo de error de duplicado (si el usuario hizo doble clic muy rápido)
        if (e.code === '23505') {
            App.ui.closeModal();
            window.loadChallengeGrid();
        } else {
            App.ui.showToast("Error al guardar", "error");
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerText = "Intentar de nuevo";
            }
        }
    }
};