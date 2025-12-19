// js/app.js

async function initApp() {
    if (!window.db) return;

    // 1. Verificar sesión
    const { data: { user } } = await window.db.auth.getUser();

    if (user) {
        window.currentUser = user;
        
        // 2. Cargar o Crear Perfil
        let { data: profile } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        if (!profile) {
            // Si no existe, lo creamos
            const { data: newP } = await window.db
                .from('profiles')
                .insert([{ id: user.id, email: user.email }])
                .select()
                .single();
            profile = newP;
        }
        window.currentProfile = profile;
        updateHeaderUI();

        // 3. BUSCAR PAREJA (Corrección del Error 400)
        // Usamos una sintaxis más limpia para evitar el Bad Request
        const { data: couple, error } = await window.db
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .maybeSingle();

        // Ocultar login
        document.getElementById('auth-view').classList.add('hidden');

        if (couple) {
            // --- CASO A: YA TIENEN PAREJA ---
            console.log("Pareja encontrada:", couple.id);
            document.getElementById('main-view').classList.remove('hidden');
            document.getElementById('sync-view').classList.add('hidden');
            
            // Iniciar lógica del calendario
            if (window.loadChallengeGrid) window.loadChallengeGrid();
            
            // Escuchar cambios en la bandera de paz
            // (Asegúrate de tener esta función en gamification.js o aquí)
             if (window.checkWhiteFlagStatus) window.checkWhiteFlagStatus();

        } else {
            // --- CASO B: SIN PAREJA (Sincronización) ---
            console.log("Sin pareja, esperando conexión...");
            document.getElementById('sync-view').classList.remove('hidden');
            document.getElementById('main-view').classList.add('hidden');
            
            // Mostrar mi código
            if(document.getElementById('my-code')) {
                document.getElementById('my-code').innerText = profile.share_code || 'ERROR';
            }
            
            // ACTIVAR ESCUCHA EN TIEMPO REAL
            // Esto hace que si tu pareja ingresa el código, tu pantalla cambie sola
            startListeningForMatch(user.id);
        }

    } else {
        // No hay sesión
        document.getElementById('auth-view').classList.remove('hidden');
    }
}

// --- FUNCIÓN MÁGICA DE SINCRONIZACIÓN ---
function startListeningForMatch(myUserId) {
    console.log("Escuchando si alguien se conecta conmigo...");
    
    const channel = window.db.channel('couple-sync')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'couples' },
            (payload) => {
                const newCouple = payload.new;
                // Si la nueva pareja creada me incluye a mí...
                if (newCouple.user1_id === myUserId || newCouple.user2_id === myUserId) {
                    window.showToast("¡Pareja conectada! Entrando... 🚀", "success");
                    
                    // Esperar 1.5s y recargar para entrar al calendario
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            }
        )
        .subscribe();
}

// Actualizar Header
function updateHeaderUI() {
    if(window.currentProfile) {
        const nameEl = document.getElementById('display-name');
        const xpEl = document.getElementById('user-xp');
        if(nameEl) nameEl.innerText = window.currentProfile.full_name || window.currentProfile.email.split('@')[0];
        if(xpEl) xpEl.innerText = window.currentProfile.xp || 0;
    }
}

// --- CONECTAR PAREJA (Botón) ---
window.connectCouple = async function() {
    const codeInput = document.getElementById('partner-code');
    const code = codeInput.value.toUpperCase().trim(); // Convertir a mayúsculas
    
    if (!code) return window.showToast("Ingresa el código", "error");
    if (code === window.currentProfile.share_code) return window.showToast("No puedes usar tu propio código", "error");

    // 1. Buscar quién es el dueño del código
    const { data: partner, error: searchError } = await window.db
        .from('profiles')
        .select('id')
        .eq('share_code', code)
        .maybeSingle();
    
    if (!partner) {
        return window.showToast("Código incorrecto o no existe", "error");
    }

    // 2. Crear la relación
    // IMPORTANTE: Ordenamos los IDs alfabéticamente para que siempre sea (A, B)
    // Esto evita el error de duplicados si intentan conectarse al mismo tiempo
    const ids = [window.currentUser.id, partner.id].sort();
    const user1 = ids[0];
    const user2 = ids[1];

    const { error: insertError } = await window.db
        .from('couples')
        .insert([{ user1_id: user1, user2_id: user2 }]);

    if (insertError) {
        // Si el error es código 23505, significa que YA existen como pareja
        if (insertError.code === '23505') {
            window.showToast("¡Ya estaban conectados! Entrando...", "success");
            setTimeout(() => window.location.reload(), 1000);
        } else {
            console.error(insertError);
            window.showToast("Error al conectar. Intenta de nuevo.", "error");
        }
    } else {
        window.showToast("¡Conexión exitosa! 🎉", "success");
        // La recarga sucederá automáticamente por el Listener, 
        // pero por seguridad recargamos aquí también para el que dio clic.
        setTimeout(() => window.location.reload(), 1000);
    }
};

window.copyCode = function() {
    const code = document.getElementById('my-code').innerText;
    navigator.clipboard.writeText(code);
    window.showToast("Código copiado", "success");
};

// Navegación
window.showSection = function(section) {
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    // Intentar activar el botón si existe el evento
    if(event && event.currentTarget) event.currentTarget.classList.add('active'); 

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    
    // Limpiar contenido previo
    content.innerHTML = '';

    if (section === 'calendar') {
        if(title) title.innerText = "Tu Calendario";
        content.innerHTML = '<div id="calendar-grid" class="calendar-grid"></div>';
        if(window.loadChallengeGrid) window.loadChallengeGrid();
    } 
    else if (section === 'peace') {
        if(title) title.innerText = "Bandera de Paz";
        content.innerHTML = '<div id="peace-area"></div>';
        if(window.checkWhiteFlagStatus) window.checkWhiteFlagStatus();
    } 
    else if (section === 'rewards') {
        if(title) title.innerText = "Recompensas";
        if(window.openRewards) window.openRewards();
    }
    else {
        if(title) title.innerText = "Próximamente";
        content.innerHTML = `<div style="text-align:center; padding:50px; color:#666;">En construcción 🚧</div>`;
    }
};

// Toasts & Modales
window.showToast = function(msg, type='info') {
    const container = document.getElementById('toast-container');
    if(!container) return alert(msg); // Fallback

    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
}

window.showModal = function(title, body) {
    const tEl = document.getElementById('modal-title');
    const bEl = document.getElementById('modal-body');
    const oEl = document.getElementById('modal-overlay');
    const aEl = document.getElementById('modal-actions');
    
    if(tEl) tEl.innerText = title;
    if(bEl) bEl.innerHTML = body;
    if(aEl) aEl.innerHTML = ''; // Limpiar botones viejos
    if(oEl) oEl.classList.remove('hidden');
}

window.closeModal = function() {
    const oEl = document.getElementById('modal-overlay');
    if(oEl) oEl.classList.add('hidden');
}

// Logout
window.handleLogout = async function() {
    await window.db.auth.signOut();
    window.location.reload();
}

// Iniciar app
initApp();
