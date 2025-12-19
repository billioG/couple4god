// ==========================================
// LÓGICA PRINCIPAL (APP CEREBRO) - LISTO PROD
// ==========================================

window.App = {
    state: {
        user: null,
        profile: null,
        couple: null,
        currentSection: 'calendar',
        cache: {}
    },

    config: { cacheTTL: 1000 * 60 * 5 }, // 5 minutos cache

    utils: {
        escape: (str) => str ? str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t])) : '',

        getCache: (key) => {
            const i = App.state.cache[key];
            if (!i) return null;
            if (Date.now() - i.timestamp > App.config.cacheTTL) {
                delete App.state.cache[key];
                return null;
            }
            return i.data;
        },

        setCache: (k, d) => App.state.cache[k] = { data: d, timestamp: Date.now() },
        invalidateCache: (k) => k === 'all' ? App.state.cache = {} : delete App.state.cache[k]
    },

    ui: {
        showToast: (msg, type = 'info') => {
            const c = document.getElementById('toast-container');
            if (!c) return alert(msg);
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            t.innerText = msg;
            c.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0';
                t.style.transform = 'translateY(-20px)';
                setTimeout(() => t.remove(), 300);
            }, 3000);
        },

        showModal: (t, b) => {
            document.getElementById('modal-title').innerText = t;
            document.getElementById('modal-body').innerHTML = b;
            document.getElementById('modal-actions').innerHTML = '';
            document.getElementById('modal-overlay').classList.remove('hidden');
        },

        closeModal: () => document.getElementById('modal-overlay').classList.add('hidden'),

        updateNotifications: async () => {
            if (!App.state.couple) return;
            try {
                const { data: c } = await window.db.from('couples')
                    .select('white_flag_status, white_flag_sender')
                    .eq('id', App.state.couple.id)
                    .single();

                if (!c) return;
                const ad = document.querySelector('.avatars');
                const old = document.getElementById('flag-ind');
                if (old) old.remove();

                if (c.white_flag_status === 'sent' && c.white_flag_sender !== App.state.user.id) {
                    const f = document.createElement('span');
                    f.id = 'flag-ind';
                    f.innerText = ' 🏳️';
                    f.style.animation = 'pop 1s infinite';
                    if (ad) ad.appendChild(f);
                }
                const pb = document.querySelector('button[title="Paz"]');
                if (pb) pb.classList.toggle('has-notification', c.white_flag_status === 'sent' && c.white_flag_sender !== App.state.profile.id);
            } catch (e) { console.error(e); }
        },

        showSection: async (sid) => {
            document.querySelectorAll('.nav-icon').forEach(b => b.classList.remove('active'));
            const btn = document.querySelector(`button[onclick="showSection('${sid}')"]`) ||
                document.querySelector(`button[title="${sid.charAt(0).toUpperCase() + sid.slice(1)}"]`);

            if (btn) {
                btn.classList.add('active');
                if (sid === 'peace') btn.classList.remove('has-notification');
            }

            App.state.currentSection = sid;
            const container = document.getElementById('dynamic-content');
            const title = document.getElementById('section-title');

            container.style.opacity = '0';

            setTimeout(async () => {
                container.innerHTML = '';
                container.className = 'fade-in';
                container.style.opacity = '1';

                const sectionTitles = {
                    calendar: "Tu Calendario",
                    peace: "Bandera de Paz",
                    prayer: "Peticiones",
                    questions: "Conexión Profunda",
                    tips: "Consejos",
                    rewards: "Canjear Premios",
                    help: "Ayuda"
                };

                if (title && sectionTitles[sid]) title.innerText = sectionTitles[sid];

                switch (sid) {
                    case 'calendar':
                        container.innerHTML = `<div class="progress-container"><div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888"><span>Tu Progreso</span><span id="progress-text">0%</span></div><div class="progress-track"><div class="progress-fill" id="progress-bar"></div><div class="milestone" style="left:33%" id="milestone-7">🌱</div><div class="milestone" style="left:66%" id="milestone-14">🌿</div><div class="milestone" style="left:100%" id="milestone-21">🌳</div></div></div><div id="calendar-grid" class="calendar-grid"></div>`;
                        if (window.loadChallengeGrid) await window.loadChallengeGrid();
                        break;
                    case 'peace':
                        container.innerHTML = `<div id="peace-area"></div>`;
                        if (window.checkWhiteFlagStatus) await window.checkWhiteFlagStatus();
                        break;
                    case 'prayer':
                        if (window.loadPrayers) await window.loadPrayers();
                        break;
                    case 'questions':
                        if (window.loadDeepQuestion) await window.loadDeepQuestion();
                        break;
                    case 'tips':
                        if (window.loadTips) window.loadTips();
                        break;
                    case 'rewards':
                        if (window.loadRewards) await window.loadRewards();
                        break;
                    case 'help':
                        if (window.showHelpGuide) window.showHelpGuide();
                        break;
                }
            }, 100);
        }
    },

    actions: {
        refreshProfile: async () => {
            if (!App.state.user) return;
            let { data } = await window.db.from('profiles').select('*').eq('id', App.state.user.id).maybeSingle();

            if (!data) {
                // Autoreparación si el perfil no existe
                const { data: newP } = await window.db.from('profiles')
                    .insert({ id: App.state.user.id, email: App.state.user.email, xp: 0 })
                    .select().single();
                data = newP;
            }
            App.state.profile = data;

            const nameEl = document.getElementById('display-name');
            const xpEl = document.getElementById('user-xp');
            if (nameEl) nameEl.innerText = App.utils.escape(data.full_name || 'Amor');
            if (xpEl) xpEl.innerText = data.xp || 0;

            await App.ui.updateNotifications();
        },

        connectCouple: async () => {
            const code = document.getElementById('partner-code').value.toUpperCase().trim();
            if (!code) return App.ui.showToast('Ingresa un código', 'error');
            if (code === App.state.profile.share_code) return App.ui.showToast('No uses tu propio código', 'error');

            const { data: p } = await window.db.from('profiles').select('id').eq('share_code', code).maybeSingle();
            if (!p) return App.ui.showToast('Código inválido', 'error');

            const [u1, u2] = [App.state.user.id, p.id].sort();
            const { error } = await window.db.from('couples').insert({ user1_id: u1, user2_id: u2 });

            if (error) {
                App.ui.showToast('Error al conectar o ya vinculados', 'error');
            } else {
                App.ui.showToast('¡Conectados!', 'success');
                setTimeout(() => location.reload(), 1000);
            }
        },

        logout: async () => {
            // Loader simple al salir
            document.body.innerHTML = '<div style="display:flex;height:100vh;justify-content:center;align-items:center;background:#13151b;color:white;">Cerrando sesión...</div>';
            await window.db.auth.signOut();
            location.reload();
        }
    },

    init: async function () {
        if (!window.db) return console.error('Falta DB');

        // Manejo de Onboarding
        const seenOb = localStorage.getItem('onboarding_seen');
        if (!seenOb) {
            document.getElementById('auth-view').classList.add('hidden');
            document.getElementById('onboarding-view').classList.remove('hidden');
            // La lógica de onboarding está al final del archivo
            return;
        }

        const { data: { user } } = await window.db.auth.getUser();

        if (user) {
            App.state.user = user;
            document.getElementById('auth-view').classList.add('hidden');
            document.getElementById('onboarding-view').classList.add('hidden');

            await App.actions.refreshProfile();

            const { data: couple } = await window.db.from('couples')
                .select('*')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .maybeSingle();

            if (couple) {
                // FLUJO: YA TIENE PAREJA
                App.state.couple = couple;
                document.getElementById('main-view').classList.remove('hidden');
                document.getElementById('sync-view').classList.add('hidden');

                await App.ui.showSection('calendar');
                await App.ui.updateNotifications();

                // SUBSCRIPCIÓN REALTIME
                const ch = window.db.channel('app_live');
                ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` },
                    async () => {
                        await App.ui.updateNotifications();
                        if (App.state.currentSection === 'peace') window.checkWhiteFlagStatus();
                        App.ui.showToast('🔔 Actualización de pareja');
                    }
                );
                ch.on('postgres_changes', { event: '*', schema: 'public', table: 'shared_content', filter: `couple_id=eq.${couple.id}` },
                    (pl) => {
                        if (pl.eventType === 'INSERT' && pl.new.user_id !== App.state.user.id) App.ui.showToast('💬 Nuevo mensaje');
                        App.utils.invalidateCache('all'); // Limpieza simple
                        // Recargas en caliente si estás en esa sección
                        if (App.state.currentSection === 'prayer') window.loadPrayers();
                        if (App.state.currentSection === 'questions') window.loadDeepQuestion();
                    }
                );
                ch.subscribe();

            } else {
                // FLUJO: SIN PAREJA (SYNC)
                document.getElementById('sync-view').classList.remove('hidden');
                document.getElementById('main-view').classList.add('hidden');
                if (document.getElementById('my-code') && App.state.profile) {
                    document.getElementById('my-code').innerText = App.state.profile.share_code || '...';
                }

                // Escuchar si alguien se vincula conmigo
                window.db.channel('public:couples')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couples' }, (pl) => {
                        if (pl.new.user1_id === user.id || pl.new.user2_id === user.id) {
                            App.ui.showToast('¡Pareja encontrada!', 'success');
                            setTimeout(() => location.reload(), 1500);
                        }
                    })
                    .subscribe();
            }
        } else {
            // NO LOGUEADO
            document.getElementById('auth-view').classList.remove('hidden');
            document.getElementById('main-view').classList.add('hidden');
            document.getElementById('sync-view').classList.add('hidden');
        }
    }
};

// --- EXPOSICIÓN GLOBAL (BRIDGE) ---
window.showSection = App.ui.showSection;
window.connectCouple = App.actions.connectCouple;
window.copyCode = () => {
    navigator.clipboard.writeText(document.getElementById('my-code').innerText);
    App.ui.showToast('Copiado ✓');
};
window.handleLogout = App.actions.logout;
window.showToast = App.ui.showToast;
window.showModal = App.ui.showModal;
window.closeModal = App.ui.closeModal;
window.refreshUserProfile = App.actions.refreshProfile;

// --- LÓGICA DE ONBOARDING (Faltante en tu versión anterior) ---
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');

window.showSlide = (n) => {
    // Si no encuentra slides (ej. estamos en main view), salir
    const sl = document.querySelectorAll('.slide');
    if (sl.length === 0) return;

    sl.forEach(s => s.style.display = 'none');
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));

    sl[n].style.display = 'block';
    const allDots = document.querySelectorAll('.dot');
    if (allDots[n]) allDots[n].classList.add('active');

    const btn = document.getElementById('btn-ob-next');
    if (btn) {
        if (n === sl.length - 1) {
            btn.innerText = "Comenzar";
            btn.onclick = window.finishOnboarding;
        } else {
            btn.innerText = "Siguiente";
            btn.onclick = window.nextSlide;
        }
    }
};

window.nextSlide = () => {
    const sl = document.querySelectorAll('.slide');
    if (currentSlide < sl.length - 1) {
        currentSlide++;
        window.showSlide(currentSlide);
    }
};

window.finishOnboarding = () => {
    localStorage.setItem('onboarding_seen', 'true');
    document.getElementById('onboarding-view').classList.add('hidden');
    // Reiniciar app para que el Router decida a dónde ir (Auth o Main)
    App.init();
};

// Inicializar
App.init();

// Inicializar slider si está visible
if (!localStorage.getItem('onboarding_seen')) {
    setTimeout(() => window.showSlide(0), 100);
}