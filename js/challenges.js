// Cargar el reto del día
async function loadDailyChallenge() {
    const contentDiv = document.getElementById('content-area');
    contentDiv.innerHTML = '<div class="loader">Buscando tu reto...</div>';

    try {
        // Obtenemos el reto #1 (Puedes hacerlo dinámico según la fecha o progreso)
        const { data: challenge, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('day_number', 1) 
            .single();

        if (error) throw error;

        // Renderizar tarjeta
        contentDiv.innerHTML = `
            <div class="challenge-card">
                <div class="card-header">
                    <span class="day-badge">Día ${challenge.day_number}</span>
                    <h2>${challenge.title || 'Reto de Relación'}</h2>
                </div>

                <div class="quote-section">
                    <p>"${challenge.quote}"</p>
                    <span class="author-cite">- ${challenge.author}</span>
                </div>

                <div class="wisdom-box">
                    <h4>🧠 Psicología Práctica</h4>
                    <p>${challenge.reflection}</p>
                </div>

                <div class="action-box">
                    <h4>🔥 Misión de Hoy</h4>
                    <p>${challenge.task}</p>
                </div>

                <div class="intention-box">
                    <h4>✨ Intención</h4>
                    <p>${challenge.intention}</p>
                </div>

                <button onclick="completeChallenge(${challenge.id})" class="btn-primary">
                    ¡Misión Cumplida! (+100 XP)
                </button>
            </div>
        `;

    } catch (err) {
        console.error(err);
        contentDiv.innerHTML = `<p>Error al cargar el reto. ¿Has corrido el script SQL?</p>`;
    }
}

// Completar reto y dar XP
async function completeChallenge(challengeId) {
    if (!currentProfile) return;

    try {
        // 1. Guardar progreso (Evitar duplicados)
        await supabase.from('user_progress').insert({
            user_id: currentProfile.id,
            last_challenge_id: challengeId
        });

        // 2. Dar XP (Llamada a función segura SQL)
        await supabase.rpc('add_xp', { user_id: currentProfile.id, points: 100 });

        // Feedback
        showModal("¡Excelente!", "Has ganado 100 XP por invertir en tu relación.");
        refreshUserProfile(); // Actualizar contador visual

    } catch (error) {
        showModal("Aviso", "Parece que ya completaste este reto hoy.");
    }
}
