// ==========================================
// APP PRINCIPAL & REALTIME
// ==========================================

window.refreshUserProfile = async function() {
    if (!window.currentUser) return;
    let { data } = await window.db.from('profiles').select('*').eq('id', window.currentUser.id).maybeSingle();
    if (!data) {
        const { data: newP } = await window.db.from('profiles').insert([{ id: window.currentUser.id, email: window.currentUser.email, xp: 0 }]).select().single();
        data = newP;
    }
    window.currentProfile = data;
    document.getElementById('display-name').innerText = data.full_name || 'Amor';
    document.getElementById('user-xp').innerText = data.xp || 0;
    if (window.checkNotifications) window.checkNotifications();
};

window.checkNotifications = async function() {
    if (!window.currentCouple || !window.currentProfile) return;
    const { data: couple } = await window.db.from('couples').select('*').eq('id', window.currentCouple.id).single();
    
    // Header Icon
    const div = document.querySelector('.avatars');
    const old = document.getElementById('header-flag');
    if(old) old.remove();
    if (couple && couple.white_flag_status === 'sent') {
        const sp = document.createElement('span'); sp.id='header-flag'; sp.innerText='🏳️'; sp.style.animation='pop 1s infinite';
        div.appendChild(sp);
    }

    // Menu Dot
    const btn = document.querySelector('button[title="Paz"]');
    if (couple && btn) {
        if (couple.white_flag_status === 'sent' && couple.white_flag_sender !== window.currentProfile.id) {
            btn.classList.add('has-notification');
        } else btn.classList.remove('has-notification');
    }
};

window.showSection = function(section) {
    document.querySelectorAll('.nav-icon').forEach(b => b.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    
    // Estado de sección actual para Realtime
    window.currentSection = section; 

    const content = document.getElementById('dynamic-content');
    const title = document.getElementById('section-title');
    content.innerHTML = '';

    if(section === 'calendar') { title.innerText = "Calendario"; content.innerHTML = '<div id="calendar-grid"></div>'; if(window.loadChallengeGrid) window.loadChallengeGrid(); }
    else if(section === 'peace') { title.innerText = "Bandera de Paz"; content.innerHTML = '<div id="peace-area"></div>'; if(window.checkWhiteFlagStatus) window.checkWhiteFlagStatus(); }
    else if(section === 'prayer') { title.innerText = "Peticiones"; if(window.loadPrayers) window.loadPrayers(); }
    else if(section === 'questions') { title.innerText = "Conexión"; if(window.loadDeepQuestion) window.loadDeepQuestion(); }
    else if(section === 'tips') { title.innerText = "Sugerencias"; if(window.loadTips) window.loadTips(); }
    else if(section === 'rewards') { title.innerText = "Premios"; if(window.loadRewards) window.loadRewards(); }
};

// ... (Conexión, Logout, Utils igual que antes) ...
window.connectCouple = async function() { /* Usa el código anterior de connect */ };
window.copyCode = function() { navigator.clipboard.writeText(document.getElementById('my-code').innerText); window.showToast("Copiado"); };
window.handleLogout = async function() { await window.db.auth.signOut(); window.location.reload(); };
window.showToast = function(m, t='info') {
    const c = document.getElementById('toast-container');
    const d = document.createElement('div'); d.className=`toast ${t}`; d.innerText=m;
    c.appendChild(d); setTimeout(()=>d.remove(),3000);
};
window.showModal = function(t, b) {
    document.getElementById('modal-title').innerText=t; document.getElementById('modal-body').innerHTML=b;
    document.getElementById('modal-actions').innerHTML=''; document.getElementById('modal-overlay').classList.remove('hidden');
};
window.closeModal = function() { document.getElementById('modal-overlay').classList.add('hidden'); };

// INIT & LISTENERS
async function initApp() {
    if (!window.db) return;
    const { data: { user } } = await window.db.auth.getUser();
    
    // Onboarding
    if(!localStorage.getItem('seen_onboarding')) document.getElementById('onboarding-view').classList.remove('hidden');
    window.finishOnboarding = () => { localStorage.setItem('seen_onboarding', 'true'); document.getElementById('onboarding-view').classList.add('hidden'); };

    if (user) {
        window.currentUser = user;
        await window.refreshUserProfile();
        const { data: couple } = await window.db.from('couples').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();

        document.getElementById('auth-view').classList.add('hidden');
        if (couple) {
            window.currentCouple = couple;
            document.getElementById('main-view').classList.remove('hidden');
            if (window.loadChallengeGrid) window.loadChallengeGrid();
            
            // LISTENER MAESTRO (Punto 1 y 4 - Actualización inmediata)
            const channel = window.db.channel('app-changes');
            
            // 1. Cambios en PAREJA (Bandera)
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, 
                () => { 
                    window.checkNotifications(); 
                    if(window.currentSection === 'peace') window.checkWhiteFlagStatus(); // Recargar si estoy viendo
                    window.showToast("Tu relación se actualizó ✨");
                }
            );

            // 2. Cambios en CONTENIDO (Peticiones/Preguntas/Reflexiones)
            channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shared_content', filter: `couple_id=eq.${couple.id}` }, 
                () => {
                    if(window.currentSection === 'prayer') window.loadPrayers();
                    if(window.currentSection === 'questions') window.loadDeepQuestion();
                    window.showToast("Nuevo mensaje de tu pareja 💌");
                }
            );
            
            // 3. Cambios en APOYOS (Update en shared_content)
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shared_content', filter: `couple_id=eq.${couple.id}` },
                () => {
                    if(window.currentSection === 'prayer') window.loadPrayers(); // Para que el botón cambie a "Tu pareja te escuchó"
                }
            );

            channel.subscribe();

        } else {
            document.getElementById('sync-view').classList.remove('hidden');
            if(document.getElementById('my-code')) document.getElementById('my-code').innerText = window.currentProfile.share_code;
            
            // Listener Conexión
            window.db.channel('public:couples').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couples' }, p => {
                if(p.new.user1_id === user.id || p.new.user2_id === user.id) location.reload();
            }).subscribe();
        }
    } else {
        document.getElementById('auth-view').classList.remove('hidden');
    }
}
initApp();
