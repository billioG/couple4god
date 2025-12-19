// ==========================================
// LÓGICA PRINCIPAL (ROUTER & ESTADO)
// ==========================================

// 1. FUNCIONES GLOBALES (Definidas antes para evitar errores)

window.refreshUserProfile = async function() {
    if (!window.currentUser) return;

    try {
        let { data, error } = await window.db.from('profiles').select('*').eq('id', window.currentUser.id).maybeSingle();

        // Auto-fix: Crear perfil si no existe
        if (!data) {
            const { data: newP } = await window.db.from('profiles').insert([{ id: window.currentUser.id, email: window.currentUser.email, xp: 0 }]).select().single();
            data = newP;
        }

        window.currentProfile = data;
        
        // Actualizar Header
        const nameEl = document.getElementById('display-name');
        const xpEl = document.getElementById('user-xp');
        if(nameEl) nameEl.innerText = data.full_name || 'Amor';
        if(xpEl) xpEl.innerText = data.xp || 0;

        // Verificar notificaciones
        if (window.checkNotifications) window.checkNotifications();

    } catch (err) { console.error(err); }
};

// Verificar Notificaciones (Punto Rojo + Bandera en Header)
window.checkNotifications = async function() {
    if (!window.currentCouple || !window.currentProfile) return;

    const myId = window.currentProfile.id;
    // Obtener estado fresco
    const { data: couple } = await window.db.from('couples').select('*').eq('id', window.currentCouple.id).single();
    
    // 1. INDICADOR EN HEADER (Banderita al lado del avatar)
    const avatarsDiv = document.querySelector('.avatars');
    const existingFlag = document.getElementById('header-flag-indicator');
    if(existingFlag) existingFlag.remove(); // Limpiar previo

    if (couple && couple.white_flag_status === 'sent') {
        const flagSpan = document.createElement('span');
        flagSpan.id = 'header-flag-indicator';
        flagSpan.innerText = ' 🏳️';
        flagSpan.style.animation = 'pop 1s infinite';
        flagSpan.title = "Hay una bandera activa";
        if(avatarsDiv) avatarsDiv.appendChild(flagSpan);
    }

    // 2. INDICADOR EN MENÚ INFERIOR (Punto rojo en botón Paz)
    const peaceBtn = document.querySelector('button[onclick="showSection(\'peace\')"]');
    if (couple && peaceBtn) {
        if (couple.white_flag_status === 'sent' && couple.white_flag_sender !== myId) {
            peaceBtn.classList.add('has-notification');
        } else {
            peaceBtn.classList.remove('has-notification');
        }
    }
};

// Navegación (Router)
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
        case 'tips': // AHORA ES PREMIOS
            if(title) title.innerText = "Canjear Premios";
            if(window.loadRewards) window.loadRewards();
            break;
        default:
            content.innerHTML = '<p>Sección desconocida</p>';
    }
};

// Conectar Pareja
window.connectCouple = async function() {
    const codeInput = document.getElementById('partner-code');
    const code = codeInput.value.toUpperCase().trim();
    const myId = window.currentUser.id;

    if (!code) return window.showToast("Ingresa el código", "error");
    if (code === window.currentProfile.share_code) return window.showToast("No uses tu propio código", "error");

    const { data: partner } = await window.db.from('profiles').select('id').eq('share_code', code).maybeSingle();
    
    if (!partner) return window.showToast("Código no encontrado", "error");
    if (partner.id === myId) return window.showToast("Error de identidad", "error");

    const [u1, u2] = [myId, partner.id].sort();

    const { error: insertError } = await window.db.from('couples').insert([{ user1_id: u1, user2_id: u2 }]);

    if (insertError) {
        if (insertError.code === '23505') {
            window.showToast("¡Ya están conectados!", "success");
            window.location.reload();
        } else {
            window.showToast("Error al conectar", "error");
        }
    } else {
        window.showToast("¡Conectados! 🎉", "success");
        window.location.reload();
    }
};

window.copyCode = function() {
    navigator.clipboard.writeText(document.getElementById('my-code').innerText);
    window.showToast("Copiado", "success");
};

window.handleLogout = async function() {
    await window.db.auth.signOut();
    window.location.reload();
};

// Utils UI
window.showToast = function(msg, type='info') {
    const container = document.getElementById('toast-container');
    if(!container) return alert(msg);
    const t = document.createElement('div');
    t.className = `toast ${type}`; t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
};

window.showModal = function(title, body) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-actions').innerHTML = '';
    document.getElementById('modal-overlay').classList.remove('hidden');
};

window.closeModal = function() { document.getElementById('modal-overlay').classList.add('hidden'); };


// 2. INICIALIZACIÓN
async function initApp() {
    if (!window.db) return console.error("Falta DB");

    const { data: { user } } = await window.db.auth.getUser();

    if (user) {
        window.currentUser = user;
        await window.refreshUserProfile();

        const { data: couple } = await window.db
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .maybeSingle();

        document.getElementById('auth-view').classList.add('hidden');

        if (couple) {
            window.currentCouple = couple;
            document.getElementById('main-view').classList.remove('hidden');
            document.getElementById('sync-view').classList.add('hidden');
            
            if (window.loadChallengeGrid) window.loadChallengeGrid();
            
            // Listener Realtime
            window.db.channel('public:couples').on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, 
                () => window.checkNotifications()
            ).subscribe();

        } else {
            document.getElementById('sync-view').classList.remove('hidden');
            document.getElementById('main-view').classList.add('hidden');
            if(document.getElementById('my-code')) document.getElementById('my-code').innerText = window.currentProfile.share_code || '...';
            
            window.db.channel('public:couples').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couples' }, payload => {
                if(payload.new.user1_id === user.id || payload.new.user2_id === user.id) {
                    window.showToast("¡Pareja encontrada!", "success");
                    setTimeout(() => window.location.reload(), 1500);
                }
            }).subscribe();
        }
    } else {
        document.getElementById('auth-view').classList.remove('hidden');
        document.getElementById('main-view').classList.add('hidden');
    }
}

initApp();
