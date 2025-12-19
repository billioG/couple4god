// Inicialización
async function initApp() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        currentUser = user;
        // Cargar perfil completo (XP, partner, etc)
        await refreshUserProfile();

        // Mostrar vista principal
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('main-view').classList.remove('hidden');
        
        // Cargar reto por defecto
        loadDailyChallenge();
    } else {
        // Mostrar login
        document.getElementById('auth-view').classList.remove('hidden');
        document.getElementById('main-view').classList.add('hidden');
    }
}

// Actualizar datos del usuario
async function refreshUserProfile() {
    if (!currentUser) return;
    
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        currentProfile = data;
        document.getElementById('user-xp').innerText = data.xp;
    }
}

// SOLUCIÓN PUNTO 5: Inactividad
// Cuando el usuario vuelve a la app, recargamos datos frescos
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentUser) {
        console.log("App activa: recargando datos...");
        refreshUserProfile();
        // Si estaba en la pantalla de paz, actualizar estado
        // (Podrías guardar la vista actual en una variable para ser más preciso)
    }
});

// Utilidad para Modales
function showModal(title, body) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerText = body;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Iniciar al cargar
initApp();
