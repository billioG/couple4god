// js/app.js

async function initApp() {
    if (!window.db) return console.error("⛔ BD no conectada");

    try {
        const { data: { user }, error } = await window.db.auth.getUser();

        if (user) {
            window.currentUser = user;
            // Intentar cargar perfil. Si falla, se crea uno nuevo.
            await window.refreshUserProfile();
            
            document.getElementById('auth-view').classList.add('hidden');
            document.getElementById('main-view').classList.remove('hidden');
            
            // Cargar calendario por defecto
            if (window.loadChallengeGrid) window.loadChallengeGrid();
        } else {
            document.getElementById('auth-view').classList.remove('hidden');
            document.getElementById('main-view').classList.add('hidden');
        }
    } catch (err) {
        console.error("Error init:", err);
    }
}

// CORRECCIÓN PRINCIPAL: Auto-reparación de perfil
window.refreshUserProfile = async function() {
    if (!window.currentUser) return;

    try {
        // 1. Intentamos buscar el perfil
        let { data, error } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .maybeSingle(); // Usar maybeSingle evita el error 406 si está vacío

        // 2. Si no existe, LO CREAMOS AUTOMÁTICAMENTE
        if (!data) {
            console.log("⚠️ Perfil no encontrado. Creando uno nuevo...");
            const { data: newProfile, error: createError } = await window.db
                .from('profiles')
                .insert([{ 
                    id: window.currentUser.id, 
                    email: window.currentUser.email,
                    xp: 0
                }])
                .select()
                .single();
            
            if (createError) throw createError;
            data = newProfile; // Usamos el perfil recién creado
        }
        
        // 3. Guardar en global y actualizar UI
        window.currentProfile = data;
        const nameEl = document.getElementById('display-name');
        if (nameEl) nameEl.innerText = data.full_name || data.email.split('@')[0];

        console.log("✅ Perfil cargado correctamente:", data.id);

    } catch (err) {
        console.error("Error fatal en perfil:", err.message);
        alert("Error cargando tu perfil. Por favor recarga la página.");
    }
};

// Navegación (Corrige el error 'showSection is not defined')
window.showSection = function(sectionId) {
    // 1. Manejo visual de botones
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    // (Opcional: añadir clase active al botón presionado)

    const contentDiv = document.getElementById('content-area');
    
    // 2. Lógica de vistas
    if (sectionId === 'calendar') {
        window.loadChallengeGrid();
    } else if (sectionId === 'rewards') {
        window.openRewards();
    } else if (sectionId === 'peace') {
        window.checkWhiteFlagStatus();
    } else {
        contentDiv.innerHTML = `<div style="padding:40px; text-align:center;"><h3>🚧 En construcción</h3><p>Sección: ${sectionId}</p></div>`;
    }
};

// Modales
window.showModal = function(title, body) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Logout
window.handleLogout = async function() {
    await window.db.auth.signOut();
    window.location.reload();
}

// --- SISTEMA DE TOASTS ---
window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

// Arrancar
initApp();
