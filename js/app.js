// ==========================================
// LÓGICA PRINCIPAL (ROUTER & ESTADO)
// ==========================================

// 1. CARGA DE PERFIL
window.refreshUserProfile = async function() {
    if (!window.currentUser) return;

    try {
        let { data, error } = await window.db.from('profiles').select('*').eq('id', window.currentUser.id).maybeSingle();

        if (!data) {
            const { data: newP } = await window.db.from('profiles').insert([{ id: window.currentUser.id, email: window.currentUser.email, xp: 0 }]).select().single();
            data = newP;
        }

        window.currentProfile = data;
        
        // Header UI
        const nameEl = document.getElementById('display-name');
        const xpEl = document.getElementById('user-xp');
        if(nameEl) nameEl.innerText = data.full_name || 'Amor';
        if(xpEl) xpEl.innerText = data.xp || 0;

        // Verificar notificaciones
        if (window.checkNotifications) window.checkNotifications();

    } catch (err) { console.error(err); }
};

// 2. NOTIFICACIONES (PUNTO 1)
window.checkNotifications = async function() {
    if (!window.currentCouple || !window.currentProfile) return;

    const myId = window.currentProfile.id;
    // Forzamos traer el dato fresco
    const { data: couple } = await window.db.from('couples').select('*').eq('id', window.currentCouple.id).single();
    
    // HEADER: Icono al lado de avatars
    const avatarsDiv = document.querySelector('.avatars');
    const existingFlag = document.getElementById('header-flag-indicator');
    if(existingFlag) existingFlag.remove();

    if (couple && couple.white_flag_status === 'sent') {
        const flag = document.createElement('span');
        flag.id = 'header-flag-indicator';
        flag.innerText = ' 🏳️';
        flag.title = "Bandera activa";
        if(avatarsDiv) avatarsDiv.appendChild(flag);
    }

    // MENÚ INFERIOR: Punto rojo en Paz
    const peaceBtn = document.querySelector('button[title="Paz"]'); // Busca por título
    if (couple && peaceBtn) {
        if (couple.white_flag_status === 'sent' && couple.white_flag_sender !== myId) {
            peaceBtn.classList.add('has-notification');
        } else {
            peaceBtn.classList.remove('has-notification');
        }
    }
};

// 3. ROUTER (PUNTO 2)
window.showSection = function(sectionId) {
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    if(event && event.currentTarget) {
        event.currentTarget.classList.add('active');
        if(sectionId === 'peace') event.currentTarget.classList.remove('has-notification');
    }

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    content.innerHTML = '';

    switch(sectionId) {
        case 'calendar':
            if(title) title.innerText = "Tu Calendario";
            content.innerHTML = '<div id="calendar-grid" class="calendar-grid"></div>';
            // Restaurar barra progreso si se borró
            if (!document.querySelector('.progress-container')) {
                 // El HTML ya lo tiene, si loadChallengeGrid lo necesita, lo inyectará
            }
            if(window.loadChallengeGrid) window.loadChallengeGrid();
            break;
        case 'peace':
            if(title) title.innerText = "Bandera de Paz";
            content.innerHTML = '<div id="peace-area"></div>';
            if(window.checkWhiteFlagStatus) window.checkWhiteFlagStatus();
            break;
        case 'prayer':
            if(title) title.innerText = "Peticiones";
            if(window.loadPrayers) window.loadPrayers();
            break;
        case 'questions':
            if(title) title.innerText = "Conexión Profunda";
            if(window.loadDeepQuestion) window.loadDeepQuestion();
            break;
        case 'tips': 
            if(title) title.innerText = "Sugerencias";
            if(window.loadTips) window.loadTips();
            break;
        case 'rewards': 
            if(title) title.innerText = "Canjear Premios";
            if(window.loadRewards) window.loadRewards();
            break;
    }
};

// 4. ONBOARDING (PUNTO 7)
window.checkOnboarding = function() {
    const seen = localStorage.getItem('onboarding_seen');
    if (!seen) {
        document.getElementById('onboarding-view').classList.remove('hidden');
    }
};

window.finishOnboarding = function() {
    localStorage.setItem('onboarding_seen', 'true');
    document.getElementById('onboarding-view').classList.add('hidden');
};

// ... (Conectar pareja, copyCode, logout igual que siempre) ...
window.connectCouple = async function() {
    const code = document.getElementById('partner-code').value.toUpperCase().trim();
    const myId = window.currentUser.id;
    if (!code) return window.showToast("Ingresa código", "error");
    if (code === window.currentProfile.share_code) return window.showToast("No uses tu propio código", "error");

    const { data: partner } = await window.db.from('profiles').select('id').eq('share_code', code).maybeSingle();
    if (!partner) return window.showToast("Código inválido", "error");
    if (partner.id === myId) return window.showToast("Error identidad", "error");

    const [u1, u2] = [myId, partner.id].sort();
    const { error } = await window.db.from('couples').insert([{ user1_id: u1, user2_id: u2 }]);

    if (error && error.code !== '23505') window.showToast("Error al conectar", "error");
    else { window.showToast("¡Conectados!", "success"); window.location.reload(); }
};

window.copyCode = function() { navigator.clipboard.writeText(document.getElementById('my-code').innerText); window.showToast("Copiado", "success"); };
window.handleLogout = async function() { await window.db.auth.signOut(); window.location.reload(); };

// UTILS
window.showToast = function(msg, type='info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`; t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
};
window.showModal = function(t, b) {
    document.getElementById('modal-title').innerText = t;
    document.getElementById('modal-body').innerHTML = b;
    document.getElementById('modal-actions').innerHTML = '';
    document.getElementById('modal-overlay').classList.remove('hidden');
};
window.closeModal = function() { document.getElementById('modal-overlay').classList.add('hidden'); };

// INIT
async function initApp() {
    if (!window.db) return;
    window.checkOnboarding(); // Checar onboarding al inicio

    const { data: { user } } = await window.db.auth.getUser();
    if (user) {
        window.currentUser = user;
        await window.refreshUserProfile();

        const { data: couple } = await window.db.from('couples').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();

        document.getElementById('auth-view').classList.add('hidden');
        if (couple) {
            window.currentCouple = couple;
            document.getElementById('main-view').classList.remove('hidden');
            if (window.loadChallengeGrid) window.loadChallengeGrid();
            
            // Listener Realtime
            window.db.channel('public:couples').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, 
                () => { window.checkNotifications(); window.showToast("Novedades en tu relación", "info"); }
            ).subscribe();
        } else {
            document.getElementById('sync-view').classList.remove('hidden');
            if(document.getElementById('my-code')) document.getElementById('my-code').innerText = window.currentProfile.share_code || '...';
        }
    } else {
        document.getElementById('auth-view').classList.remove('hidden');
    }
}
initApp();
