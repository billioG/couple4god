// js/app.js

async function initApp() {
    // Verificar conexión
    if (!window.db) {
        console.error("⛔ window.db no existe. Revisa config.js");
        return;
    }

    try {
        const { data: { user }, error } = await window.db.auth.getUser();

        if (user) {
            console.log("Sesión activa:", user.email);
            window.currentUser = user;
            
            // Cargar datos
            await window.refreshUserProfile();
            
            // Mostrar UI
            document.getElementById('auth-view').classList.add('hidden');
            document.getElementById('main-view').classList.remove('hidden');
            
            // Cargar vista inicial (Calendario)
            if (window.loadChallengeGrid) {
                window.loadChallengeGrid();
            }
        } else {
            console.log("No hay sesión.");
            document.getElementById('auth-view').classList.remove('hidden');
            document.getElementById('main-view').classList.add('hidden');
        }

    } catch (err) {
        console.error("Error en initApp:", err);
    }
}

// Cargar perfil (CORREGIDO ERROR 406)
window.refreshUserProfile = async function() {
    if (!window.currentUser) return;

    try {
        // Usamos maybeSingle() para evitar el error 406 si no hay datos o hay multiples
        const { data, error } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .maybeSingle(); 

        if (error) throw error;
        
        if (data) {
            window.currentProfile = data;
            
            // Actualizar Header
            const nameEl = document.getElementById('display-name');
            const xpEl = document.getElementById('user-xp');
            
            if(nameEl) nameEl.innerText = data.full_name || data.email.split('@')[0];
            if(xpEl) xpEl.innerText = data.xp;
        } else {
            console.warn("Usuario autenticado pero sin perfil en tabla 'profiles'.");
            // Opcional: Crear perfil aquí si no existe
        }
    } catch (err) {
        console.error("Error cargando perfil:", err.message);
    }
};

// Navegación del Menú Flotante (CORREGIDO ReferenceError)
window.showSection = function(section) {
    const contentDiv = document.getElementById('content-area');
    
    // Resetear botones activos
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    
    if (section === 'chat') {
        contentDiv.innerHTML = `
            <div style="text-align:center; padding:40px; color:#888;">
                <h2>💬 Chat de Pareja</h2>
                <p>Próximamente...</p>
            </div>`;
    } else if (section === 'prayer') {
        contentDiv.innerHTML = `
            <div style="text-align:center; padding:40px; color:#888;">
                <h2>🙏 Oración / Meditación</h2>
                <p>Espacio para conectar espiritualmente.</p>
            </div>`;
    }
};

// Modales Globales
window.showModal = function(title, body) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const actionsEl = document.getElementById('modal-actions');

    if(titleEl) titleEl.innerText = title;
    if(bodyEl) bodyEl.innerHTML = body; // Usar innerHTML para permitir formato
    if(actionsEl) actionsEl.innerHTML = ''; // Limpiar botones anteriores

    overlay.classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Iniciar
initApp();
