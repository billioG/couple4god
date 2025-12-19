// js/challenges.js

async function loadDailyChallenge() {
    if (!window.db) return;

    const contentDiv = document.getElementById('content-area');
    contentDiv.innerHTML = '<div class="loader">Cargando el reto de hoy...</div>';

    try {
        // Obtenemos el reto #1 (Puedes cambiar este número según la lógica de días)
        const { data: challenge, error } = await window.db
            .from('challenges')
            .select('*')
            .eq('day_number', 1) 
            .single();

        if (error) throw error;

        if (!challenge) {
            contentDiv.innerHTML = '<p>No hay reto disponible para hoy.</p>';
            return;
        }

        // Renderizar tarjeta HTML
        contentDiv.innerHTML = `
            <div class="challenge-card">
                <div class="card-header">
                    <span class="day-badge">Día ${challenge.day_number}</span>
                    <h2>${challenge.author} dice:</h2>
                </div>

                <div class="quote-section">
                    <p>"${challenge.quote}"</p>
                </div>

                <div class="wisdom-box">
                    <h4>💡 Píldora de Sabiduría</h4>
                    <p>${challenge.reflection || challenge.content}</p>
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
        console.error("Error cargando reto:", err);
        contentDiv.innerHTML = `<p style="text-align:center; color:red">Error cargando el contenido. Revisa tu conexión.</p>`;
    }
}

// Función global para completar reto
window.completeChallenge = async function(challengeId) {
    if (!window.currentProfile) return;

    try {
        // 1. Guardar progreso
        const { error: progressError } = await window.db.from('user_progress').insert({
            user_id: window.currentProfile.id,
            last_challenge_id: challengeId
        });

        if(progressError) throw progressError;

        // 2. Dar XP
        await window.db.rpc('add_xp', { user_id: window.currentProfile.id, points: 100 });

        showModal("¡Excelente!", "Has ganado 100 XP por invertir en tu relación.");
        
        // Actualizar UI
        if(typeof refreshUserProfile === 'function') refreshUserProfile();

    } catch (error) {
        console.log(error);
        showModal("Aviso", "Ya has completado este reto anteriormente.");
    }
}
