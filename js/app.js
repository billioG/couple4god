async function initApp() {
    if (!window.db) return;

    // Verificar sesión
    const { data: { user } } = await window.db.auth.getUser();

    if (user) {
        window.currentUser = user;
        // Intentar cargar perfil
        let { data: profile } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        // Si no existe perfil (caso raro), crearlo vacío
        if (!profile) {
            const { data: newProfile } = await window.db
                .from('profiles')
                .insert([{ id: user.id, email: user.email }])
                .select().single();
            profile = newProfile;
        }
        
        window.currentProfile = profile;
        updateHeaderUI();

        // CHECK DE PAREJA (Nueva Lógica)
        const { data: couple } = await window.db
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .maybeSingle();

        document.getElementById('auth-view').classList.add('hidden');

        if (couple) {
            // Ya tiene pareja: Ir al App Principal
            document.getElementById('main-view').classList.remove('hidden');
            document.getElementById('sync-view').classList.add('hidden');
            window.loadChallengeGrid(); // Cargar calendario
        } else {
            // No tiene pareja: Ir a Sincronización
            document.getElementById('sync-view').classList.remove('hidden');
            document.getElementById('my-code').innerText = user.id; // Su ID es su código
        }

    } else {
        // No hay sesión: Ir a Login
        document.getElementById('auth-view').classList.remove('hidden');
    }
}

// Actualizar Header
function updateHeaderUI() {
    if(window.currentProfile) {
        document.getElementById('display-name').innerText = window.currentProfile.full_name || 'Amor';
        document.getElementById('user-xp').innerText = window.currentProfile.xp || 0;
    }
}

// Función para conectar pareja (Desde vista sync)
window.connectCouple = async function() {
    const partnerCode = document.getElementById('partner-code').value.trim();
    if (!partnerCode) return window.showToast("Ingresa un código", "error");
    
    if (partnerCode === window.currentUser.id) return window.showToast("No puedes usar tu propio código", "error");

    // Verificar si el código existe (es un ID de usuario válido)
    const { data: partner, error } = await window.db
        .from('profiles')
        .select('id')
        .eq('id', partnerCode)
        .maybeSingle();

    if (!partner) return window.showToast("Código inválido", "error");

    // Crear la pareja
    const { error: linkError } = await window.db
        .from('couples')
        .insert([{ user1_id: window.currentUser.id, user2_id: partner.id }]);

    if (linkError) {
        window.showToast("Error al vincular. ¿Ya tienen pareja?", "error");
    } else {
        window.showToast("¡Conectados! 🎉", "success");
        window.location.reload(); // Recargar para ir a la vista principal
    }
};

window.copyCode = function() {
    const code = document.getElementById('my-code').innerText;
    navigator.clipboard.writeText(code);
    window.showToast("Código copiado al portapapeles", "success");
};

// Navegación del Menú Flotante
window.showSection = function(section) {
    // Actualizar iconos activos
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    // Encontrar el botón clickeado y activarlo (lógica simplificada)
    event.currentTarget.classList.add('active'); 

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');

    if (section === 'calendar') {
        title.innerText = "Tu Calendario";
        content.innerHTML = '<div id="calendar-grid" class="calendar-grid"></div>';
        window.loadChallengeGrid();
    } 
    else if (section === 'peace') {
        title.innerText = "Bandera de Paz";
        content.innerHTML = '<div id="peace-area"></div>';
        window.checkWhiteFlagStatus(); // Función en gamification.js
    } 
    else {
        title.innerText = section.charAt(0).toUpperCase() + section.slice(1);
        content.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--text-gray);">
                <h3>🚧 En construcción</h3>
                <p>Pronto disponible...</p>
            </div>`;
    }
};

// Sistema de Toasts
window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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

// Iniciar
initApp();
