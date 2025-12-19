// js/app.js

// 1. DEFINIR FUNCIONES GLOBALES PRIMERO
window.refreshUserProfile = async function() {
    if (!window.currentUser) return;

    try {
        let { data, error } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .maybeSingle();

        if (error) throw error;
        
        // Auto-creación si no existe
        if (!data) {
            const { data: newP } = await window.db
                .from('profiles')
                .insert([{ id: window.currentUser.id, email: window.currentUser.email }])
                .select().single();
            data = newP;
        }

        window.currentProfile = data;
        
        // Actualizar UI Header
        const nameEl = document.getElementById('display-name');
        const xpEl = document.getElementById('user-xp');
        if(nameEl) nameEl.innerText = data.full_name || 'Usuario';
        if(xpEl) xpEl.innerText = data.xp || 0;

    } catch (err) {
        console.error("Error en refreshUserProfile:", err);
    }
};

window.showSection = function(section) {
    // Actualizar iconos
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active'); 

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    
    // Limpiar
    content.innerHTML = '';

    if (section === 'calendar') {
        title.innerText = "Tu Calendario";
        content.innerHTML = '<div id="calendar-grid" class="calendar-grid"></div>';
        if(window.loadChallengeGrid) window.loadChallengeGrid();
    } 
    else if (section === 'peace') {
        title.innerText = "Bandera de Paz";
        content.innerHTML = '<div id="peace-area"></div>';
        if(window.checkWhiteFlagStatus) window.checkWhiteFlagStatus();
    } 
    else if (section === 'rewards') {
        title.innerText = "Recompensas";
        if(window.openRewards) window.openRewards();
    }
    // NUEVAS SECCIONES
    else if (section === 'prayer') {
        title.innerText = "Peticiones del Corazón";
        if(window.loadPrayers) window.loadPrayers();
    }
    else if (section === 'questions') {
        title.innerText = "Conexión Profunda";
        if(window.loadDeepQuestion) window.loadDeepQuestion();
    }
    else if (section === 'tips') {
        title.innerText = "Sugerencias";
        content.innerHTML = `
            <div style="background:#1e222d; padding:20px; border-radius:15px; border:1px solid #333;">
                <h3>💡 Tip del Día</h3>
                <p style="color:#aaa; margin-top:10px;">"Cuando tu pareja hable, intenta no preparar tu respuesta mientras escuchas. Solo escucha."</p>
            </div>`;
    }
};

// Utils Globales
window.showToast = function(msg, type='info') {
    const container = document.getElementById('toast-container');
    if(!container) return alert(msg);
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
}

window.showModal = function(title, body) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-actions').innerHTML = ''; // Limpiar botones viejos
    document.getElementById('modal-overlay').classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

window.handleLogout = async function() {
    await window.db.auth.signOut();
    window.location.reload();
}

// 2. INICIALIZAR APP
async function initApp() {
    if (!window.db) return console.error("DB no conectada");

    const { data: { user } } = await window.db.auth.getUser();

    if (user) {
        window.currentUser = user;
        await window.refreshUserProfile(); // Cargar perfil ANTES de mostrar nada

        // Verificar Pareja
        const { data: couple } = await window.db
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .maybeSingle();
        
        window.currentCouple = couple; // Guardar pareja en global para usarla fácil

        document.getElementById('auth-view').classList.add('hidden');

        if (couple) {
            document.getElementById('main-view').classList.remove('hidden');
            window.loadChallengeGrid(); // Cargar inicio
            
            // Listener para actualizaciones en tiempo real
            window.db.channel('public:couples').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples' }, payload => {
                if(payload.new.id === couple.id) {
                     window.showToast("¡Hay novedades en tu relación!", "success");
                     // Recargar la vista actual si es necesario
                }
            }).subscribe();

        } else {
            document.getElementById('sync-view').classList.remove('hidden');
            if(document.getElementById('my-code')) {
                document.getElementById('my-code').innerText = window.currentProfile.share_code || '...';
            }
        }
    } else {
        document.getElementById('auth-view').classList.remove('hidden');
    }
}

// Arrancar
initApp();
