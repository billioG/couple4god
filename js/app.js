// js/app.js

async function initApp() {
    // 1. Verificación de Seguridad
    if (!window.db) {
        console.error("⛔ Deteniendo app: 'window.db' no existe. Revisa config.js");
        return;
    }

    try {
        // 2. Usamos 'window.db' en lugar de 'supabase'
        const { data: { user }, error } = await window.db.auth.getUser();

        if (error) {
            console.log("No hay sesión activa o error:", error.message);
            showLogin();
            return;
        }

        if (user) {
            console.log("Usuario detectado:", user.email);
            window.currentUser = user;
            
            // Cargar datos del perfil y luego la vista principal
            await refreshUserProfile();
            showMainView();
            loadDailyChallenge();
        } else {
            showLogin();
        }

    } catch (err) {
        console.error("Error inesperado en initApp:", err);
        showLogin();
    }
}

// Funciones auxiliares de vista
function showLogin() {
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('main-view').classList.add('hidden');
}

function showMainView() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('main-view').classList.remove('hidden');
}

// Actualizar datos del usuario (XP, Pareja)
async function refreshUserProfile() {
    if (!window.currentUser) return;
    
    // Usamos window.db
    const { data, error } = await window.db
        .from('profiles')
        .select('*')
        .eq('id', window.currentUser.id)
        .single();
    
    if (data) {
        window.currentProfile = data;
        // Actualizar contador visual de XP si existe el elemento
        const xpElement = document.getElementById('user-xp');
        if(xpElement) xpElement.innerText = data.xp;
    }
}

// Solución para recargar al volver a la app (Móvil)
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && window.currentUser) {
        console.log("App activa: refrescando datos...");
        refreshUserProfile();
    }
});

// Utilidad para Modales
window.showModal = function(title, body) {
    const modal = document.getElementById('modal-overlay');
    if(modal) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerText = body;
        // Ocultar botón primario por defecto, mostrar solo cerrar
        document.getElementById('modal-primary-btn').classList.add('hidden');
        modal.classList.remove('hidden');
    }
}

window.closeModal = function() {
    const modal = document.getElementById('modal-overlay');
    if(modal) modal.classList.add('hidden');
}

// Iniciar aplicación
initApp();
