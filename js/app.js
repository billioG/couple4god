async function initApp() {
    if (!window.db) return;

    const { data: { user } } = await window.db.auth.getUser();

    if (user) {
        window.currentUser = user;
        
        // 1. Cargar Perfil (Con auto-creación si falta)
        let { data: profile } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        if (!profile) {
            const { data: newP } = await window.db.from('profiles').insert([{ id: user.id, email: user.email }]).select().single();
            profile = newP;
        }
        window.currentProfile = profile;
        updateHeaderUI();

        // 2. BUSCAR PAREJA (Sintaxis corregida)
        // Usamos sintaxis correcta para Postgrest: or=(condition,condition)
        const { data: couple } = await window.db
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .maybeSingle();

        document.getElementById('auth-view').classList.add('hidden');

        if (couple) {
            // CONECTADOS
            document.getElementById('main-view').classList.remove('hidden');
            document.getElementById('sync-view').classList.add('hidden');
            window.loadChallengeGrid();
            // Escuchar notificaciones de paz
            startRealtimeListener(couple.id);
        } else {
            // SIN PAREJA
            document.getElementById('sync-view').classList.remove('hidden');
            document.getElementById('my-code').innerText = profile.share_code || '...';
            // Escuchar si alguien me añade
            startCoupleListener(user.id);
        }

    } else {
        document.getElementById('auth-view').classList.remove('hidden');
    }
}

function updateHeaderUI() {
    if(window.currentProfile) {
        document.getElementById('display-name').innerText = window.currentProfile.full_name || 'Amor';
        document.getElementById('user-xp').innerText = window.currentProfile.xp || 0;
    }
}

// Escuchar cuando me añaden como pareja
function startCoupleListener(userId) {
    window.db.channel('public:couples')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couples' }, payload => {
            if(payload.new.user1_id === userId || payload.new.user2_id === userId) {
                window.showToast("¡Tu pareja se ha unido! 💖", "success");
                setTimeout(() => window.location.reload(), 1500);
            }
        }).subscribe();
}

// Conectar Pareja (Botón)
window.connectCouple = async function() {
    const code = document.getElementById('partner-code').value.toUpperCase().trim();
    if (!code) return window.showToast("Ingresa un código", "error");
    if (code === window.currentProfile.share_code) return window.showToast("No uses tu propio código", "error");

    // Buscar pareja
    const { data: partner } = await window.db.from('profiles').select('id').eq('share_code', code).maybeSingle();
    
    if (!partner) return window.showToast("Código no encontrado", "error");

    // Crear relación (IDs ordenados para evitar duplicados A-B vs B-A)
    const [u1, u2] = [window.currentUser.id, partner.id].sort();
    
    const { error } = await window.db.from('couples').insert([{ user1_id: u1, user2_id: u2 }]);

    if (error) {
        if(error.code === '23505') { // Código de error 'Unique violation'
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
    const code = document.getElementById('my-code').innerText;
    navigator.clipboard.writeText(code);
    window.showToast("Copiado", "success");
};

// Navegación
window.showSection = function(section) {
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active'); 

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');

    if (section === 'calendar') {
        title.innerText = "Tu Calendario";
        content.innerHTML = '<div id="calendar-grid" class="calendar-grid"></div>';
        window.loadChallengeGrid();
    } else if (section === 'peace') {
        title.innerText = "Bandera de Paz";
        content.innerHTML = '<div id="peace-area"></div>';
        window.checkWhiteFlagStatus();
    } else {
        title.innerText = "Próximamente";
        content.innerHTML = `<div style="text-align:center; padding:50px; color:#666;">En construcción 🚧</div>`;
    }
};

// Toasts & Modales
window.showToast = function(msg, type='info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`; t.innerText = msg;
    container.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
}
window.showModal = function(t, b) {
    document.getElementById('modal-title').innerText = t;
    document.getElementById('modal-body').innerHTML = b;
    document.getElementById('modal-overlay').classList.remove('hidden');
}
window.closeModal = function() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Iniciar
initApp();
