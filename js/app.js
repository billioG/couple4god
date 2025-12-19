// ==========================================
// LÓGICA PRINCIPAL (ROUTER, ESTADO Y REALTIME)
// ==========================================

// VARIABLES GLOBALES DE ESTADO
window.currentUser = null;
window.currentProfile = null;
window.currentCouple = null;
window.currentSection = 'calendar'; // Sección por defecto

// ------------------------------------------
// 1. LÓGICA DE ONBOARDING (CARRUSEL)
// ------------------------------------------
let currentSlide = 0;
const totalSlides = 6;

window.nextSlide = function() {
    if (currentSlide < totalSlides - 1) {
        currentSlide++;
        updateSlider();
    } else {
        window.finishOnboarding();
    }
};

function updateSlider() {
    const slider = document.getElementById('ob-slider');
    const dots = document.querySelectorAll('.dot');
    const btnNext = document.getElementById('btn-ob-next');
    const btnSkip = document.getElementById('btn-ob-skip');

    if(slider) slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));

    if (btnNext && btnSkip) {
        if (currentSlide === totalSlides - 1) {
            btnNext.innerText = "¡Comenzar!";
            btnSkip.classList.add('hidden');
        } else {
            btnNext.innerText = "Siguiente";
            btnSkip.classList.remove('hidden');
        }
    }
}

window.checkOnboarding = function() {
    // Si no existe la marca en localStorage, mostramos el onboarding
    if (!localStorage.getItem('onboarding_seen')) {
        const view = document.getElementById('onboarding-view');
        if(view) view.classList.remove('hidden');
    }
};

window.finishOnboarding = function() {
    localStorage.setItem('onboarding_seen', 'true');
    const view = document.getElementById('onboarding-view');
    if(view) view.classList.add('hidden');
};


// ------------------------------------------
// 2. GESTIÓN DE PERFIL
// ------------------------------------------
window.refreshUserProfile = async function() {
    if (!window.currentUser) return;

    try {
        let { data, error } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .maybeSingle();

        // Auto-crear perfil si no existe
        if (!data) {
            const { data: newP } = await window.db
                .from('profiles')
                .insert([{ id: window.currentUser.id, email: window.currentUser.email, xp: 0 }])
                .select()
                .single();
            data = newP;
        }

        window.currentProfile = data;
        
        // Actualizar UI Header
        const nameEl = document.getElementById('display-name');
        const xpEl = document.getElementById('user-xp');
        if(nameEl) nameEl.innerText = data.full_name || 'Amor';
        if(xpEl) xpEl.innerText = data.xp || 0;

        // Verificar notificaciones después de cargar perfil
        await window.checkNotifications();

    } catch (err) {
        console.error("Error perfil:", err);
    }
};


// ------------------------------------------
// 3. SISTEMA DE NOTIFICACIONES (CORREGIDO)
// ------------------------------------------
window.checkNotifications = async function() {
    // Necesitamos tener pareja y perfil cargados
    if (!window.currentCouple || !window.currentProfile) return;

    const myId = window.currentProfile.id;

    try {
        // CONSULTA FRESCA: No confiamos en window.currentCouple, pedimos el dato real a la DB
        const { data: couple, error } = await window.db
            .from('couples')
            .select('white_flag_status, white_flag_sender')
            .eq('id', window.currentCouple.id)
            .single();

        if (error || !couple) return;

        // A. INDICADOR EN HEADER (Banderita al lado de los avatares)
        const avatarsDiv = document.querySelector('.avatars');
        const existingFlag = document.getElementById('header-flag-indicator');
        if(existingFlag) existingFlag.remove(); // Limpiar siempre primero

        if (couple.white_flag_status === 'sent') {
            const flag = document.createElement('span');
            flag.id = 'header-flag-indicator';
            flag.innerText = ' 🏳️';
            flag.style.animation = 'pop 1s infinite'; // Animación para llamar la atención
            flag.title = "Bandera Blanca Activa";
            flag.style.cursor = "help";
            if(avatarsDiv) avatarsDiv.appendChild(flag);
        }

        // B. INDICADOR EN MENÚ INFERIOR (Punto rojo en botón Paz)
        // Buscamos el botón por el atributo onclick o title
        const peaceBtn = document.querySelector('button[onclick="showSection(\'peace\')"]');
        
        if (peaceBtn) {
            // Lógica: Si está enviada Y NO fui yo quien la envió, muéstrame el punto rojo
            if (couple.white_flag_status === 'sent' && couple.white_flag_sender !== myId) {
                peaceBtn.classList.add('has-notification');
            } else {
                peaceBtn.classList.remove('has-notification');
            }
        }

    } catch (e) {
        console.error("Error checkNotifications:", e);
    }
};


// ------------------------------------------
// 4. ROUTER / NAVEGACIÓN (CORREGIDO CALENDARIO)
// ------------------------------------------
window.showSection = async function(sectionId) {
    // Actualizar estado visual de botones
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    if(event && event.currentTarget) {
        event.currentTarget.classList.add('active');
        // Si entro a Paz, quito la notificación visualmente (opcional)
        if(sectionId === 'peace') event.currentTarget.classList.remove('has-notification');
    }

    // Guardar sección actual para el Realtime
    window.currentSection = sectionId;

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    
    // LIMPIEZA TOTAL DEL CONTENIDO
    content.innerHTML = ''; 

    switch(sectionId) {
        case 'calendar':
            if(title) title.innerText = "Tu Calendario";
            // Inyectamos la estructura base del calendario y barra
            content.innerHTML = `
                <div class="progress-container">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888; margin-bottom:5px;">
                        <span>Tu Progreso</span><span id="progress-text">0%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" id="progress-bar"></div>
                        <div class="milestone" style="left:33%" id="milestone-7">👫</div>
                        <div class="milestone" style="left:66%" id="milestone-14">🎁</div>
                        <div class="milestone" style="left:100%" id="milestone-21">❤️</div>
                    </div>
                </div>
                <div id="calendar-grid" class="calendar-grid"></div>
            `;
            // Llamamos a la función que llena la cuadrícula
            if(window.loadChallengeGrid) await window.loadChallengeGrid();
            break;

        case 'peace':
            if(title) title.innerText = "Bandera de Paz";
            content.innerHTML = '<div id="peace-area"></div>';
            if(window.checkWhiteFlagStatus) await window.checkWhiteFlagStatus();
            break;

        case 'prayer':
            if(title) title.innerText = "Peticiones";
            // Aseguramos que el perfil esté cargado para saber si "yo" ya apoyé
            if(!window.currentProfile) await window.refreshUserProfile();
            if(window.loadPrayers) await window.loadPrayers();
            break;

        case 'questions':
            if(title) title.innerText = "Conexión Profunda";
            if(window.loadDeepQuestion) await window.loadDeepQuestion();
            break;

        case 'tips': // Sugerencias
            if(title) title.innerText = "Sugerencias";
            if(window.loadTips) window.loadTips();
            break;

        case 'rewards': // Premios
            if(title) title.innerText = "Canjear Premios";
            if(window.loadRewards) await window.loadRewards();
            break;
            
        default:
            console.log("Sección desconocida:", sectionId);
    }
};


// ------------------------------------------
// 5. GESTIÓN DE PAREJA (CONEXIÓN)
// ------------------------------------------
window.connectCouple = async function() {
    const codeInput = document.getElementById('partner-code');
    const code = codeInput.value.toUpperCase().trim();
    const myId = window.currentUser.id;

    if (!code) return window.showToast("Ingresa el código", "error");
    if (code === window.currentProfile.share_code) return window.showToast("No puedes usar tu propio código", "error");

    const { data: partner } = await window.db.from('profiles').select('id').eq('share_code', code).maybeSingle();
    
    if (!partner) return window.showToast("Código no encontrado", "error");
    if (partner.id === myId) return window.showToast("Error de identidad", "error");

    // Ordenar IDs para evitar duplicados
    const [u1, u2] = [myId, partner.id].sort();

    const { error: insertError } = await window.db.from('couples').insert([{ user1_id: u1, user2_id: u2 }]);

    if (insertError) {
        if (insertError.code === '23505') {
            window.showToast("¡Ya están conectados!", "success");
            setTimeout(() => window.location.reload(), 1000);
        } else {
            console.error(insertError);
            window.showToast("Error al conectar", "error");
        }
    } else {
        window.showToast("¡Conectados! 🎉", "success");
        setTimeout(() => window.location.reload(), 1000);
    }
};

window.copyCode = function() {
    navigator.clipboard.writeText(document.getElementById('my-code').innerText);
    window.showToast("Código copiado", "success");
};

window.handleLogout = async function() {
    await window.db.auth.signOut();
    window.location.reload();
};


// ------------------------------------------
// 6. UTILIDADES UI
// ------------------------------------------
window.showToast = function(msg, type='info') {
    const container = document.getElementById('toast-container');
    if(!container) return alert(msg);
    
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    
    // Animación
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(-20px)';
        setTimeout(() => t.remove(), 300);
    }, 3000);
};

window.showModal = function(title, body) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-actions').innerHTML = '';
    document.getElementById('modal-overlay').classList.remove('hidden');
};

window.closeModal = function() {
    document.getElementById('modal-overlay').classList.add('hidden');
};


// ------------------------------------------
// 7. INICIALIZACIÓN Y REALTIME
// ------------------------------------------
async function initApp() {
    if (!window.db) {
        console.error("⛔ Falta config.js o conexión a DB");
        return;
    }

    // Verificar si mostramos Onboarding
    window.checkOnboarding();

    try {
        const { data: { user } } = await window.db.auth.getUser();

        if (user) {
            window.currentUser = user;
            
            // 1. Cargar Perfil (ESENCIAL para que funcionen los botones de peticiones al recargar)
            await window.refreshUserProfile();

            // 2. Buscar Pareja
            const { data: couple } = await window.db
                .from('couples')
                .select('*')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .maybeSingle();

            document.getElementById('auth-view').classList.add('hidden');

            if (couple) {
                // --- USUARIO CON PAREJA ---
                window.currentCouple = couple;
                document.getElementById('main-view').classList.remove('hidden');
                document.getElementById('sync-view').classList.add('hidden');
                
                // Cargar vista inicial (Calendario)
                if (window.loadChallengeGrid) await window.loadChallengeGrid();
                
                // --- LISTENERS DE REALTIME (ACTUALIZACIÓN EN VIVO) ---
                const channel = window.db.channel('public:app_changes');

                // A. Escuchar cambios en la PAREJA (Bandera Blanca)
                channel.on('postgres_changes', 
                    { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, 
                    () => {
                        window.checkNotifications(); // Actualiza punto rojo
                        // Si el usuario está viendo la pantalla de paz, recargarla
                        if (window.currentSection === 'peace' && window.checkWhiteFlagStatus) {
                            window.checkWhiteFlagStatus();
                        }
                        window.showToast("🔔 Tu pareja actualizó el estado de la relación", "info");
                    }
                );

                // B. Escuchar cambios en CONTENIDO COMPARTIDO (Peticiones, Preguntas, Respuestas)
                // Esto permite que si tu pareja apoya tu petición, tu pantalla se actualice sola
                channel.on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'shared_content', filter: `couple_id=eq.${couple.id}` }, 
                    () => {
                        // Recargar solo la sección activa
                        if (window.currentSection === 'prayer' && window.loadPrayers) window.loadPrayers();
                        if (window.currentSection === 'questions' && window.loadDeepQuestion) window.loadDeepQuestion();
                    }
                );

                channel.subscribe();

            } else {
                // --- USUARIO SIN PAREJA (SYNC) ---
                document.getElementById('sync-view').classList.remove('hidden');
                document.getElementById('main-view').classList.add('hidden');
                
                if(document.getElementById('my-code')) {
                    document.getElementById('my-code').innerText = window.currentProfile.share_code || '...';
                }
                
                // Escuchar si alguien me añade
                window.db.channel('public:couples_insert').on(
                    'postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'couples' }, 
                    payload => {
                        if(payload.new.user1_id === user.id || payload.new.user2_id === user.id) {
                            window.showToast("¡Pareja encontrada! Entrando...", "success");
                            setTimeout(() => window.location.reload(), 1500);
                        }
                    }
                ).subscribe();
            }

        } else {
            // --- NO LOGUEADO ---
            document.getElementById('auth-view').classList.remove('hidden');
            document.getElementById('main-view').classList.add('hidden');
        }

    } catch (err) {
        console.error("Error init:", err);
    }
}

// Arrancar la aplicación
initApp();
