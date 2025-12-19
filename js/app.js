// ==========================================
// LÓGICA PRINCIPAL (APP CEREBRO + CACHÉ)
// ==========================================

window.App = {
    state: {
        user: null,
        profile: null,
        couple: null,
        currentSection: 'calendar',
        cache: {}
    },

    config: {
        cacheTTL: 1000 * 60 * 2
    },

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

                // CORRECCIÓN 1: Solo mostrar si está "sent" Y no es el emisor
                if (c.white_flag_status === 'sent' && c.white_flag_sender !== App.state.user.id) {
                    const f = document.createElement('span');
                    f.id = 'flag-ind';
                    f.innerText = ' 🏳️';
                    f.style.animation = 'pop 1s infinite';
                    if (ad) ad.appendChild(f);
                }

                const pb = document.querySelector('button[title="Paz"]');
                if (pb) {
                    pb.classList.toggle('has-notification', c.white_flag_status === 'sent' && c.white_flag_sender !== App.state.profile.id);
                }
            } catch (e) {
                console.error('Error updating notifications:', e);
            }
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
            container.style.transform = 'translateY(10px)';

            setTimeout(async () => {
                container.innerHTML = '';
                container.className = 'fade-in';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';

                switch (sid) {
                    case 'calendar':
                        if (title) title.innerText = "Tu Calendario";
                        container.innerHTML = `<div class="progress-container"><div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888"><span>Tu Progreso</span><span id="progress-text">0%</span></div><div class="progress-track"><div class="progress-fill" id="progress-bar"></div><div class="milestone" style="left:33%" id="milestone-7">🌱</div><div class="milestone" style="left:66%" id="milestone-14">🌿</div><div class="milestone" style="left:100%" id="milestone-21">🌳</div></div></div><div id="calendar-grid" class="calendar-grid"></div>`;
                        if (window.loadChallengeGrid) await window.loadChallengeGrid();
                        break;

                    case 'peace':
                        if (title) title.innerText = "Bandera de Paz";
                        container.innerHTML = `<div id="peace-area"></div>`;
                        if (window.checkWhiteFlagStatus) await window.checkWhiteFlagStatus();
                        break;

                    case 'prayer':
                        if (title) title.innerText = "Peticiones";
                        if (window.loadPrayers) await window.loadPrayers();
                        break;

                    case 'questions':
                        if (title) title.innerText = "Conexión Profunda";
                        if (window.loadDeepQuestion) await window.loadDeepQuestion();
                        break;

                    case 'tips':
                        if (title) title.innerText = "Consejos";
                        if (window.loadTips) window.loadTips();
                        break;

                    case 'rewards':
                        if (title) title.innerText = "Canjear Premios";
                        if (window.loadRewards) await window.loadRewards();
                        break;

                    case 'help':
                        if (title) title.innerText = "Ayuda";
                        window.showHelpGuide();
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
                const { data: newP } = await window.db.from('profiles')
                    .insert({ id: App.state.user.id, email: App.state.user.email, xp: 0 })
                    .select()
                    .single();
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
            if (!code) return App.ui.showToast('Falta código', 'error');
            if (code === App.state.profile.share_code) return App.ui.showToast('No puedes usar tu propio código', 'error');

            const { data: p } = await window.db.from('profiles').select('id').eq('share_code', code).maybeSingle();
            if (!p) return App.ui.showToast('Código inválido', 'error');

            const [u1, u2] = [App.state.user.id, p.id].sort();
            const { error } = await window.db.from('couples').insert({ user1_id: u1, user2_id: u2 });

            if (error && error.code !== '23505') {
                App.ui.showToast('Error al conectar', 'error');
            } else {
                App.ui.showToast('Conectados!', 'success');
                setTimeout(() => location.reload(), 1000);
            }
        },

        logout: async () => {
            try {
                // CORRECCIÓN 4: Mostrar loader antes de cerrar sesión
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#13151b;color:white;font-size:1.2rem;"><div>Cerrando sesión...</div></div>';
                await window.db.auth.signOut();
                setTimeout(() => location.reload(), 500);
            } catch (e) {
                console.error(e);
                location.reload();
            }
        }
    },

    init: async function () {
        if (!window.db) return console.error('Falta DB');

        const { data: { user } } = await window.db.auth.getUser();

        if (user) {
            App.state.user = user;
            await App.actions.refreshProfile();

            const { data: couple } = await window.db.from('couples')
                .select('*')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .maybeSingle();

            document.getElementById('auth-view').classList.add('hidden');

            if (couple) {
                App.state.couple = couple;
                document.getElementById('main-view').classList.remove('hidden');
                document.getElementById('sync-view').classList.add('hidden');

                await App.ui.showSection('calendar');
                await App.ui.updateNotifications();

                const ch = window.db.channel('app_live');

                ch.on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` },
                    async () => {
                        await App.ui.updateNotifications();
                        if (App.state.currentSection === 'peace') window.checkWhiteFlagStatus();
                        App.ui.showToast('⚡ Actualización');
                    }
                );

                ch.on('postgres_changes',
                    { event: '*', schema: 'public', table: 'shared_content', filter: `couple_id=eq.${couple.id}` },
                    (pl) => {
                        App.utils.invalidateCache('all');
                        if (pl.eventType === 'UPDATE' && pl.new.type === 'request' && pl.new.user_id !== App.state.user.id) {
                            if (pl.new.status === 'ack') App.ui.showToast('👁️ Visto');
                            if (pl.new.status === 'done') App.ui.showToast('✅ Cumplido!');
                        }
                        if (App.state.currentSection === 'prayer') window.loadPrayers();
                        if (App.state.currentSection === 'questions') window.loadDeepQuestion();
                    }
                );

                ch.on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'active_redemptions' },
                    (pl) => {
                        if (pl.new.couple_id === couple.id && pl.new.user_id !== user.id) {
                            App.ui.showToast('🎁 Premio canjeado!');
                        }
                        if (App.state.currentSection === 'rewards') window.loadRewards();
                    }
                );

                ch.subscribe();
            } else {
                document.getElementById('sync-view').classList.remove('hidden');
                if (document.getElementById('my-code')) {
                    document.getElementById('my-code').innerText = App.state.profile.share_code;
                }

                window.db.channel('public:couples')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couples' }, (pl) => {
                        if (pl.new.user1_id === user.id || pl.new.user2_id === user.id) {
                            App.ui.showToast('Pareja encontrada!', 'success');
                            setTimeout(() => location.reload(), 1000);
                        }
                    })
                    .subscribe();
            }
        } else {
            document.getElementById('auth-view').classList.remove('hidden');
        }
    }
};

// CORRECCIÓN 2: Agregar guía de ayuda
window.showHelpGuide = function () {
    const content = document.getElementById('dynamic-content');
    content.innerHTML = `
    <div style="padding:20px 25px 90px;">
      <div class="help-card">
        <div style="font-size:3rem;margin-bottom:15px;">🏆</div>
        <h3>Completa Retos Diarios</h3>
        <p>Cada día aparece un nuevo reto. Tócalo para ver los detalles y completarlo. Gana XP por cada reto cumplido.</p>
      </div>

      <div class="help-card">
        <div style="font-size:3rem;margin-bottom:15px;">🙏</div>
        <h3>Haz Peticiones</h3>
        <p>Pide algo específico a tu pareja. Ellos recibirán una notificación y podrán confirmar cuando lo cumplan.</p>
      </div>

      <div class="help-card">
        <div style="font-size:3rem;margin-bottom:15px;">🏳️</div>
        <h3>Bandera de Paz</h3>
        <p>¿Tuvieron una discusión? Levanta la bandera blanca para pedir paz sin palabras.</p>
      </div>

      <div class="help-card">
        <div style="font-size:3rem;margin-bottom:15px;">💬</div>
        <h3>Pregunta del Día</h3>
        <p>Cada día una nueva pregunta para conectar profundamente. Responde y lee lo que tu pareja comparte.</p>
      </div>

      <div class="help-card">
        <div style="font-size:3rem;margin-bottom:15px;">🎁</div>
        <h3>Canjea Premios</h3>
        <p>Usa tus XP acumulados para canjear premios reales que tu pareja deberá cumplir.</p>
      </div>
    </div>`;
};

// BRIDGE
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

App.init();
