// js/app.js

async function initApp() {
    // Verificación de seguridad
    if (!window.db) {
        console.error("⛔ window.db no existe. Revisa config.js");
        return;
    }

    try {
        const { data: { user } } = await window.db.auth.getUser();

        if (user) {
            console.log("Sesión activa:", user.email);
            window.currentUser = user;
            
            // 1. CARGAR PERFIL (Con auto-creación si falta)
            let { data: profile } = await window.db
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle(); // maybeSingle evita error 406 si no existe
            
            if (!profile) {
                // Crear perfil si no existe
                const { data: newP } = await window.db
                    .from('profiles')
                    .insert([{ id: user.id, email: user.email, xp: 0 }])
                    .select()
                    .single();
                profile = newP;
            }
            window.currentProfile = profile;
            updateHeaderUI();

            // 2. BUSCAR PAREJA (Corrección Error 400 Sintaxis)
            // Usamos una sintaxis limpia sin espacios extra
            const { data: couple, error: coupleError } = await window.db
                .from('couples')
                .select('*')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .maybeSingle();

            document.getElementById('auth-view').classList.add('hidden');

            if (couple) {
                // CASO A: YA TIENE PAREJA
                document.getElementById('main-view').classList.remove('hidden');
                document.getElementById('sync-view').classList.add('hidden');
                
                // Cargar calendario por defecto
                if (window.loadChallengeGrid) window.loadChallengeGrid();
                
                // Activar listeners de tiempo real (opcional si funciona)
                startRealtimeListener(couple.id);

            } else {
                // CASO B: SIN PAREJA (Mostrar código)
                document.getElementById('sync-view').classList.remove('hidden');
                document.getElementById('main-view').classList.add('hidden');
                
                if(document.getElementById('my-code')){
                    document.getElementById('my-code').innerText = profile.share_code || 'ERROR';
                }
                
                // Intentar escuchar si alguien me añade
                startSyncListener(user.id);
            }

        } else {
            // NO HAY SESIÓN
            document.getElementById('auth-view').classList.remove('hidden');
            document.getElementById('main-view').classList.add('hidden');
        }

    } catch (err) {
        console.error("Error init:", err);
    }
}

// Actualizar textos del header
function updateHeaderUI() {
    if(window.currentProfile) {
        const nameEl = document.getElementById('display-name');
        const xpEl = document.getElementById('user-xp');
        if(nameEl) nameEl.innerText = window.currentProfile.full_name || window.currentProfile.email.split('@')[0];
        if(xpEl) xpEl.innerText = window.currentProfile.xp || 0;
    }
}

// Escuchar sincronización (Intento de Realtime)
function startSyncListener(userId) {
    window.db.channel('public:couples')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couples' }, payload => {
            if(payload.new.user1_id === userId || payload.new.user2_id === userId) {
                window.showToast("¡Pareja encontrada! Entrando...", "success");
                setTimeout(() => window.location.reload(), 1500);
            }
        }).subscribe();
}

// Escuchar cambios en la pareja ya establecida
function startRealtimeListener(coupleId) {
    // Aquí podrías escuchar si te mandan bandera blanca, etc.
}

// --- FUNCIÓN DE CONEXIÓN (CORREGIDA ERROR 400) ---
window.connectCouple = async function() {
    const codeInput = document.getElementById('partner-code');
    const code = codeInput.value.toUpperCase().trim();
    const myId = window.currentUser.id;

    if (!code) return window.showToast("Ingresa el código", "error");
    
    // Validación 1: No usarse a sí mismo
    if (code === window.currentProfile.share_code) {
        return window.showToast("No puedes usar tu propio código", "error");
    }

    // Validación 2: Buscar si el código existe
    const { data: partner, error: searchError } = await window.db
        .from('profiles')
        .select('id')
        .eq('share_code', code)
        .maybeSingle();
    
    if (!partner) return window.showToast("Código no encontrado", "error");
    if (partner.id === myId) return window.showToast("No puedes vincularte a ti mismo", "error");

    // Corrección Error 400 POST: Ordenar IDs para evitar duplicados
    const [u1, u2] = [myId, partner.id].sort();

    const { error: insertError } = await window.db
        .from('couples')
        .insert([{ user1_id: u1, user2_id: u2 }]);

    if (insertError) {
        // Si ya existen (Error 23505), lo tratamos como éxito
        if (insertError.code === '23505') {
            window.showToast("¡Ya están conectados!", "success");
            window.location.reload();
        } else {
            console.error(insertError);
            window.showToast("Error al conectar. Intenta de nuevo.", "error");
        }
    } else {
        window.showToast("¡Conectados! 🎉", "success");
        window.location.reload();
    }
};

window.copyCode = function() {
    const code = document.getElementById('my-code').innerText;
    navigator.clipboard.writeText(code);
    window.showToast("Código copiado", "success");
};

// --- NAVEGACIÓN (LAS 5 SECCIONES) ---
window.showSection = function(section) {
    // 1. Actualizar estilos botones
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active'); 

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    
    // Limpiar contenido
    content.innerHTML = '';

    // 2. Cargar vistas
    switch(section) {
        case 'calendar':
            title.innerText = "Tu Calendario";
            content.innerHTML = '<div id="calendar-grid" class="calendar-grid"></div>';
            if(window.loadChallengeGrid) window.loadChallengeGrid();
            break;
            
        case 'peace':
            title.innerText = "Bandera de Paz";
            content.innerHTML = '<div id="peace-area"></div>';
            if(window.checkWhiteFlagStatus) window.checkWhiteFlagStatus();
            break;
            
        case 'prayer':
            title.innerText = "Peticiones";
            content.innerHTML = `
                <div style="background:var(--card-bg); padding:20px; border-radius:15px; text-align:center;">
                    <div style="font-size:3rem; margin-bottom:10px">🙏</div>
                    <h3>Intenciones Compartidas</h3>
                    <p style="color:#aaa; font-size:0.9rem">Escribe aquí tus deseos o peticiones para la relación.</p>
                    <textarea class="input-field" style="height:100px; margin-top:15px;" placeholder="Deseo que..."></textarea>
                    <button class="btn-primary">Guardar Petición</button>
                </div>`;
            break;
            
        case 'questions':
            title.innerText = "Preguntas Profundas";
            content.innerHTML = `
                <div style="background:var(--card-bg); padding:20px; border-radius:15px; text-align:center;">
                    <div style="font-size:3rem; margin-bottom:10px">✨</div>
                    <h3>Conexión Profunda</h3>
                    <p style="color:#aaa;">Tarjeta aleatoria para conversar hoy:</p>
                    <div style="background:#252a35; padding:20px; border-radius:10px; margin:20px 0; border:1px solid var(--primary)">
                        "¿Cuál es un recuerdo de nosotros que te hace sonreír siempre?"
                    </div>
                    <button class="btn-primary" style="background:transparent; border:1px solid var(--primary)">Nueva Pregunta</button>
                </div>`;
            break;

        case 'tips':
            title.innerText = "Sugerencias";
            content.innerHTML = `
                <div style="background:var(--card-bg); padding:20px; border-radius:15px;">
                    <h3>💡 Tip del Día</h3>
                    <p style="color:#aaa; margin-top:10px;">"El amor se demuestra en los detalles pequeños, no solo en los grandes gestos."</p>
                    <hr style="border:0; border-top:1px solid #333; margin:15px 0;">
                    <p style="font-size:0.8rem; color:var(--text-gray)">Déjanos tu feedback:</p>
                    <input type="text" class="input-field" placeholder="Escribe aquí...">
                    <button class="btn-primary">Enviar</button>
                </div>`;
            break;
    }
};

// --- UTILIDADES GLOBALES (TOASTS Y MODALES) ---
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
    const t = document.getElementById('modal-title');
    const b = document.getElementById('modal-body');
    const o = document.getElementById('modal-overlay');
    const a = document.getElementById('modal-actions');
    
    if(t) t.innerText = title;
    if(b) b.innerHTML = body;
    if(a) a.innerHTML = '';
    if(o) o.classList.remove('hidden');
}

window.closeModal = function() {
    const o = document.getElementById('modal-overlay');
    if(o) o.classList.add('hidden');
}

// Iniciar
initApp();
