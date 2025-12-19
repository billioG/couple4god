// ==========================================
// LÓGICA PRINCIPAL (ROUTER & ESTADO)
// ==========================================

// 1. DEFINICIÓN DE FUNCIONES GLOBALES
// (Se definen antes de initApp para estar disponibles para otros scripts)

// Cargar o Crear Perfil de Usuario
window.refreshUserProfile = async function() {
    if (!window.currentUser) return;

    try {
        // Intentamos obtener el perfil
        let { data, error } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .maybeSingle(); // maybeSingle evita errores si la tabla está vacía

        // Si no existe perfil, lo creamos automáticamente (Auto-fix)
        if (!data) {
            console.log("Creando perfil nuevo...");
            const { data: newP, error: createError } = await window.db
                .from('profiles')
                .insert([{ 
                    id: window.currentUser.id, 
                    email: window.currentUser.email,
                    xp: 0
                }])
                .select()
                .single();
            
            if (createError) throw createError;
            data = newP;
        }

        // Guardar en variable global
        window.currentProfile = data;
        
        // Actualizar la interfaz (Header)
        const nameEl = document.getElementById('display-name');
        const xpEl = document.getElementById('user-xp');
        if(nameEl) nameEl.innerText = data.full_name || 'Amor';
        if(xpEl) xpEl.innerText = data.xp || 0;

        // Verificar si hay notificaciones pendientes (Punto rojo)
        if (window.checkNotifications) window.checkNotifications();

    } catch (err) {
        console.error("Error en refreshUserProfile:", err);
    }
};

// Verificar Notificaciones (Punto Rojo en el menú)
window.checkNotifications = async function() {
    if (!window.currentCouple || !window.currentProfile) return;

    const myId = window.currentProfile.id;
    // Consultar estado de la bandera
    const { data: couple } = await window.db
        .from('couples')
        .select('white_flag_status, white_flag_sender')
        .eq('id', window.currentCouple.id)
        .maybeSingle();
    
    const peaceBtn = document.querySelector('button[onclick="showSection(\'peace\')"]');

    if (couple && peaceBtn) {
        // Si hay bandera enviada Y NO fui yo quien la envió = NOTIFICACIÓN
        if (couple.white_flag_status === 'sent' && couple.white_flag_sender !== myId) {
            peaceBtn.classList.add('has-notification'); // Clase definida en CSS
        } else {
            peaceBtn.classList.remove('has-notification');
        }
    }
};

// Navegación del Menú Flotante
window.showSection = function(sectionId) {
    // 1. Actualizar iconos activos visualmente
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    if(event && event.currentTarget) {
        event.currentTarget.classList.add('active');
        // Si entramos a Paz, quitamos la notificación visualmente
        if(sectionId === 'peace') event.currentTarget.classList.remove('has-notification');
    }

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    
    // Limpiar contenido anterior
    content.innerHTML = '';

    // 2. Cargar la vista correspondiente
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

        case 'tips':
            if(title) title.innerText = "Sugerencias";
            content.innerHTML = `
                <div style="background:var(--card-bg); padding:20px; border-radius:15px; border:1px solid #333; text-align:center;">
                    <h3>💡 Tip del Día</h3>
                    <p style="color:#aaa; margin-top:10px;">"El amor maduro dice: Te necesito porque te amo. El amor inmaduro dice: Te amo porque te necesito." - Erich Fromm</p>
                </div>`;
            break;
            
        default:
            console.log("Sección no reconocida:", sectionId);
    }
};

// Conectar Pareja (Botón en vista Sync)
window.connectCouple = async function() {
    const codeInput = document.getElementById('partner-code');
    const code = codeInput.value.toUpperCase().trim();
    const myId = window.currentUser.id;

    if (!code) return window.showToast("Ingresa el código", "error");
    
    // Validación: No usarse a sí mismo
    if (code === window.currentProfile.share_code) {
        return window.showToast("No puedes usar tu propio código", "error");
    }

    // 1. Buscar dueño del código
    const { data: partner } = await window.db
        .from('profiles')
        .select('id')
        .eq('share_code', code)
        .maybeSingle();
    
    if (!partner) return window.showToast("Código no encontrado", "error");
    if (partner.id === myId) return window.showToast("Error de identidad", "error");

    // 2. Crear relación (Ordenamos IDs para evitar duplicados A-B vs B-A)
    const [u1, u2] = [myId, partner.id].sort();

    const { error: insertError } = await window.db
        .from('couples')
        .insert([{ user1_id: u1, user2_id: u2 }]);

    if (insertError) {
        // Código 23505 significa que ya existen
        if (insertError.code === '23505') {
            window.showToast("¡Ya están conectados!", "success");
            window.location.reload();
        } else {
            console.error(insertError);
            window.showToast("Error al conectar", "error");
        }
    } else {
        window.showToast("¡Conectados! 🎉", "success");
        window.location.reload();
    }
};

// Copiar código al portapapeles
window.copyCode = function() {
    const code = document.getElementById('my-code').innerText;
    navigator.clipboard.writeText(code);
    window.showToast("Código copiado", "success");
};

// Logout
window.handleLogout = async function() {
    await window.db.auth.signOut();
    window.location.reload();
};

// --- UTILIDADES UI (Toasts y Modales) ---

window.showToast = function(msg, type='info') {
    const container = document.getElementById('toast-container');
    if(!container) return alert(msg); // Fallback por si acaso
    
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    
    // Animación de entrada y salida
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(-20px)';
        setTimeout(() => t.remove(), 300);
    }, 3000);
};

window.showModal = function(title, body) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-actions').innerHTML = ''; // Limpiar botones anteriores
    document.getElementById('modal-overlay').classList.remove('hidden');
};

window.closeModal = function() {
    document.getElementById('modal-overlay').classList.add('hidden');
};


// 2. INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================

async function initApp() {
    if (!window.db) {
        console.error("⛔ window.db no existe. Revisa config.js");
        return;
    }

    try {
        const { data: { user } } = await window.db.auth.getUser();

        if (user) {
            console.log("Sesión activa:", user.email);
            window.currentUser = user;
            
            // 1. Cargar Perfil (Función robusta definida arriba)
            await window.refreshUserProfile();

            // 2. Buscar Pareja
            const { data: couple } = await window.db
                .from('couples')
                .select('*')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .maybeSingle();

            document.getElementById('auth-view').classList.add('hidden');

            if (couple) {
                // --- USUARIO CONECTADO ---
                window.currentCouple = couple;
                document.getElementById('main-view').classList.remove('hidden');
                document.getElementById('sync-view').classList.add('hidden');
                
                // Cargar Calendario por defecto
                if (window.loadChallengeGrid) window.loadChallengeGrid();
                
                // Activar listener para notificaciones en tiempo real
                window.db.channel('public:couples').on(
                    'postgres_changes', 
                    { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, 
                    payload => {
                        window.checkNotifications(); // Actualizar punto rojo
                        // Opcional: window.showToast("Tu pareja actualizó algo", "info");
                    }
                ).subscribe();

            } else {
                // --- USUARIO SIN PAREJA (SYNC) ---
                document.getElementById('sync-view').classList.remove('hidden');
                document.getElementById('main-view').classList.add('hidden');
                
                if(document.getElementById('my-code')){
                    document.getElementById('my-code').innerText = window.currentProfile.share_code || '...';
                }
                
                // Listener para detectar si me añaden
                window.db.channel('public:couples').on(
                    'postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'couples' }, 
                    payload => {
                        if(payload.new.user1_id === user.id || payload.new.user2_id === user.id) {
                            window.showToast("¡Pareja encontrada! 💖", "success");
                            setTimeout(() => window.location.reload(), 1500);
                        }
                    }
                ).subscribe();
            }

        } else {
            // --- NO HAY SESIÓN ---
            document.getElementById('auth-view').classList.remove('hidden');
            document.getElementById('main-view').classList.add('hidden');
        }

    } catch (err) {
        console.error("Error inicializando app:", err);
    }
}

// Iniciar todo
initApp();
