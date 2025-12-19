// ==========================================
// LÓGICA PRINCIPAL (ROUTER, ESTADO Y REALTIME)
// ==========================================

// VARIABLES DE ESTADO GLOBAL
window.currentUser = null;
window.currentProfile = null;
window.currentCouple = null;
window.currentSection = 'calendar'; // Sección inicial por defecto

// -----------------------------------------------------------
// 1. LÓGICA DE ONBOARDING (CARRUSEL)
// -----------------------------------------------------------
let currentSlide = 0;
const totalSlides = 4; // Ajustado a las 4 pantallas del HTML actual

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

    // 1. Mover el carrusel (CSS Transform)
    if (slider) {
        slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    // 2. Actualizar puntos activos (Indicadores)
    if (dots.length > 0) {
        dots.forEach((d, i) => {
            d.classList.toggle('active', i === currentSlide);
        });
    }

    // 3. Actualizar textos de botones
    if (btnNext && btnSkip) {
        if (currentSlide === totalSlides - 1) {
            btnNext.innerText = "¡Comenzar!";
            btnSkip.classList.add('hidden'); // Ocultar "Saltar" en el último paso
        } else {
            btnNext.innerText = "Siguiente";
            btnSkip.classList.remove('hidden');
        }
    }
}

window.checkOnboarding = function() {
    // Si NO existe la marca en localStorage, mostramos el onboarding
    if (!localStorage.getItem('ob_seen')) {
        const view = document.getElementById('onboarding-view');
        if (view) view.classList.remove('hidden');
    }
};

window.finishOnboarding = function() {
    localStorage.setItem('ob_seen', 'true');
    const view = document.getElementById('onboarding-view');
    if (view) view.classList.add('hidden');
};


// -----------------------------------------------------------
// 2. GESTIÓN DE PERFIL DE USUARIO
// -----------------------------------------------------------
window.refreshUserProfile = async function() {
    if (!window.currentUser) return;

    try {
        let { data, error } = await window.db
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .maybeSingle();

        // Auto-crear perfil si falla la primera vez (Safety check)
        if (!data) {
            const { data: newP } = await window.db
                .from('profiles')
                .insert([{ id: window.currentUser.id, email: window.currentUser.email, xp: 0 }])
                .select()
                .single();
            data = newP;
        }

        window.currentProfile = data;
        
        // Actualizar Header UI (Nombre y XP)
        const nameEl = document.getElementById('display-name');
        const xpEl = document.getElementById('user-xp');
        if (nameEl) nameEl.innerText = data.full_name || 'Amor';
        if (xpEl) xpEl.innerText = data.xp || 0;

        // Verificar notificaciones al cargar perfil
        await window.checkNotifications();

    } catch (err) {
        console.error("Error cargando perfil:", err);
    }
};


// -----------------------------------------------------------
// 3. SISTEMA DE NOTIFICACIONES (HEADER Y MENÚ)
// -----------------------------------------------------------
window.checkNotifications = async function() {
    if (!window.currentCouple || !window.currentProfile) return;

    try {
        // Consultar estado fresco de la DB
        const { data: couple } = await window.db
            .from('couples')
            .select('white_flag_status, white_flag_sender')
            .eq('id', window.currentCouple.id)
            .single();

        if (!couple) return;

        // A. Banderita en el Header
        const avatarsDiv = document.querySelector('.avatars');
        const existingFlag = document.getElementById('flag-ind');
        if (existingFlag) existingFlag.remove();

        if (couple.white_flag_status === 'sent') {
            const flag = document.createElement('span');
            flag.id = 'flag-ind';
            flag.innerText = ' 🏳️';
            flag.style.animation = 'pop 1s infinite';
            if (avatarsDiv) avatarsDiv.appendChild(flag);
        }

        // B. Punto Rojo en el Menú (Botón Paz)
        const peaceBtn = document.querySelector('button[title="Paz"]');
        if (peaceBtn) {
            // Solo notificar si la bandera NO la envié yo
            if (couple.white_flag_status === 'sent' && couple.white_flag_sender !== window.currentProfile.id) {
                peaceBtn.classList.add('has-notification');
            } else {
                peaceBtn.classList.remove('has-notification');
            }
        }

    } catch (e) { console.error(e); }
};


// -----------------------------------------------------------
// 4. ROUTER (NAVEGACIÓN ENTRE SECCIONES)
// -----------------------------------------------------------
window.showSection = async function(sectionId) {
    // Actualizar iconos activos en el menú
    document.querySelectorAll('.nav-icon').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
        // Quitar notificación visual si entramos a esa sección
        if (sectionId === 'peace') event.currentTarget.classList.remove('has-notification');
    }

    window.currentSection = sectionId;
    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    
    // LIMPIEZA DE CONTENIDO
    content.innerHTML = ''; 

    switch(sectionId) {
        case 'calendar':
            if(title) title.innerText = "Tu Calendario";
            // Inyectamos la estructura base para que el grid no se vea gigante
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
            if (window.loadChallengeGrid) await window.loadChallengeGrid();
            break;

        case 'peace':
            if(title) title.innerText = "Bandera de Paz";
            content.innerHTML = '<div id="peace-area"></div>';
            if (window.checkWhiteFlagStatus) await window.checkWhiteFlagStatus();
            break;

        case 'prayer':
            if(title) title.innerText = "Peticiones";
            // Asegurar perfil para verificar estados de peticiones
            if (!window.currentProfile) await window.refreshUserProfile();
            if (window.loadPrayers) await window.loadPrayers();
            break;

        case 'questions':
            if(title) title.innerText = "Conexión Profunda";
            if (window.loadDeepQuestion) await window.loadDeepQuestion();
            break;

        case 'tips': 
            if(title) title.innerText = "Sugerencias";
            if (window.loadTips) window.loadTips();
            break;

        case 'rewards': 
            if(title) title.innerText = "Canjear Premios";
            if (window.loadRewards) await window.loadRewards();
            break;
    }
};


// -----------------------------------------------------------
// 5. INICIALIZACIÓN Y REALTIME (CORE)
// -----------------------------------------------------------
async function initApp() {
    if (!window.db) {
        console.error("Falta conexión a DB");
        return;
    }

    // 1. Verificar Onboarding al inicio
    window.checkOnboarding();

    const { data: { user } } = await window.db.auth.getUser();

    if (user) {
        window.currentUser = user;
        
        // 2. Cargar Perfil
        await window.refreshUserProfile();

        // 3. Buscar Pareja
        const { data: couple } = await window.db
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .maybeSingle();

        document.getElementById('auth-view').classList.add('hidden');

        if (couple) {
            // --- CONECTADO CON PAREJA ---
            window.currentCouple = couple;
            document.getElementById('main-view').classList.remove('hidden');
            document.getElementById('sync-view').classList.add('hidden');
            
            // Cargar inicio
            if (window.loadChallengeGrid) await window.loadChallengeGrid();
            await window.checkNotifications();

            // --- REALTIME LISTENERS (ESCUCHA EVENTOS EN VIVO) ---
            const channel = window.db.channel('app_live_updates');

            // A. Cambios en la Pareja (Bandera Blanca)
            channel.on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, 
                async () => {
                    await window.checkNotifications();
                    if (window.currentSection === 'peace') window.checkWhiteFlagStatus();
                    // Solo notificar si cambió el estado a 'sent' o 'accepted'
                    window.showToast("🔔 Estado de pareja actualizado");
                }
            );

            // B. Cambios en Contenido (Peticiones, Preguntas)
            channel.on('postgres_changes', 
                { event: '*', schema: 'public', table: 'shared_content', filter: `couple_id=eq.${couple.id}` }, 
                (payload) => {
                    // 1. Notificar si mi pareja marcó "Enterado" o "Cumplido" en MI petición
                    if (payload.eventType === 'UPDATE' && payload.new.type === 'request') {
                        if (payload.new.user_id === window.currentProfile.id) {
                            if (payload.new.status === 'ack') window.showToast("👁️ Tu pareja vio tu petición");
                            if (payload.new.status === 'done') window.showToast("🎉 ¡Tu pareja cumplió tu petición!");
                        }
                    }

                    // Recargar vistas activas para reflejar cambios
                    if (window.currentSection === 'prayer') window.loadPrayers();
                    if (window.currentSection === 'questions') window.loadDeepQuestion();
                }
            );

            // C. Cambios en Canjes Activos (Premios)
            channel.on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'active_redemptions' }, 
                (payload) => {
                    // Si el nuevo registro es de mi pareja (user_id !== yo)
                    if (payload.new.couple_id === couple.id && payload.new.user_id !== user.id) {
                        window.showToast("🎁 ¡Tu pareja canjeó un premio!");
                        if (window.currentSection === 'rewards') window.loadRewards();
                    }
                }
            );

            channel.subscribe();

        } else {
            // --- SIN PAREJA (SYNC) ---
            document.getElementById('sync-view').classList.remove('hidden');
            if (document.getElementById('my-code')) {
                document.getElementById('my-code').innerText = window.currentProfile.share_code;
            }
            
            // Listener para autoconexión cuando el otro ingresa el código
            window.db.channel('public:couples').on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'couples' }, 
                (payload) => {
                    if (payload.new.user1_id === user.id || payload.new.user2_id === user.id) {
                        window.showToast("¡Pareja encontrada!", "success");
                        setTimeout(() => location.reload(), 1000);
                    }
                }
            ).subscribe();
        }

    } else {
        // --- NO LOGUEADO ---
        document.getElementById('auth-view').classList.remove('hidden');
    }
}


// -----------------------------------------------------------
// 6. UTILIDADES Y CONEXIÓN MANUAL
// -----------------------------------------------------------
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

    if (error && error.code !== '23505') {
        window.showToast("Error al conectar", "error");
    } else {
        window.showToast("¡Conectados!", "success");
        location.reload();
    }
};

window.copyCode = function() {
    navigator.clipboard.writeText(document.getElementById('my-code').innerText);
    window.showToast("Copiado", "success");
};

window.handleLogout = async function() {
    await window.db.auth.signOut();
    location.reload();
};

window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { 
        t.style.opacity = '0'; 
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

// Arrancar la aplicación
initApp();
