// --- ESTADO GLOBAL ---
window.currentUser = null; window.currentProfile = null; window.currentCouple = null; window.currentSection = 'calendar';

// --- ONBOARDING ---
let currentSlide = 0; const totalSlides = 6;
window.nextSlide = function() { if (currentSlide < totalSlides - 1) { currentSlide++; updateSlider(); } else { window.finishOnboarding(); } };
function updateSlider() {
    const s = document.getElementById('ob-slider'); const dots = document.querySelectorAll('.dot');
    const bn = document.getElementById('btn-ob-next'); const bs = document.getElementById('btn-ob-skip');
    if(s) s.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((d,i) => d.classList.toggle('active', i===currentSlide));
    if(bn) { bn.innerText = (currentSlide === totalSlides - 1) ? "¡Comenzar!" : "Siguiente"; bs.classList.toggle('hidden', currentSlide === totalSlides -1); }
}
window.checkOnboarding = function() { if(!localStorage.getItem('ob_seen')) document.getElementById('onboarding-view').classList.remove('hidden'); };
window.finishOnboarding = function() { localStorage.setItem('ob_seen', 'true'); document.getElementById('onboarding-view').classList.add('hidden'); };

// --- GESTIÓN PERFIL ---
window.refreshUserProfile = async function() {
    if(!window.currentUser) return;
    let { data } = await window.db.from('profiles').select('*').eq('id', window.currentUser.id).maybeSingle();
    if(!data) { const { data: newP } = await window.db.from('profiles').insert([{ id:window.currentUser.id, email:window.currentUser.email, xp:0 }]).select().single(); data = newP; }
    window.currentProfile = data;
    document.getElementById('display-name').innerText = data.full_name || 'Amor';
    document.getElementById('user-xp').innerText = data.xp || 0;
    await window.checkNotifications();
};

// --- NOTIFICACIONES ---
window.checkNotifications = async function() {
    if(!window.currentCouple || !window.currentProfile) return;
    const { data: c } = await window.db.from('couples').select('white_flag_status, white_flag_sender').eq('id', window.currentCouple.id).single();
    if(!c) return;

    // Flag Header
    const ad = document.querySelector('.avatars'); const old = document.getElementById('flag-ind'); if(old) old.remove();
    if(c.white_flag_status === 'sent') { const s = document.createElement('span'); s.id='flag-ind'; s.innerText=' 🏳️'; s.style.animation='pop 1s infinite'; if(ad) ad.appendChild(s); }

    // Menu Dot
    const pb = document.querySelector('button[title="Paz"]');
    if(pb) pb.classList.toggle('has-notification', c.white_flag_status === 'sent' && c.white_flag_sender !== window.currentProfile.id);
};

// --- ROUTER ---
window.showSection = async function(sid) {
    document.querySelectorAll('.nav-icon').forEach(b => b.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    window.currentSection = sid;
    const c = document.getElementById('dynamic-content'); const t = document.getElementById('section-title'); c.innerHTML = ''; 

    switch(sid) {
        case 'calendar':
            t.innerText = "Tu Calendario";
            c.innerHTML = `<div class="progress-container"><div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888;"><span>Progreso</span><span id="progress-text">0%</span></div><div class="progress-track"><div class="progress-fill" id="progress-bar"></div><div class="milestone" style="left:33%" id="milestone-7">👫</div><div class="milestone" style="left:66%" id="milestone-14">🎁</div><div class="milestone" style="left:100%" id="milestone-21">❤️</div></div></div><div id="calendar-grid" class="calendar-grid"></div>`;
            if(window.loadChallengeGrid) await window.loadChallengeGrid(); break;
        case 'peace': t.innerText="Bandera de Paz"; c.innerHTML='<div id="peace-area"></div>'; if(window.checkWhiteFlagStatus) await window.checkWhiteFlagStatus(); break;
        case 'prayer': t.innerText="Peticiones"; if(!window.currentProfile) await window.refreshUserProfile(); if(window.loadPrayers) await window.loadPrayers(); break;
        case 'questions': t.innerText="Conexión Profunda"; if(window.loadDeepQuestion) await window.loadDeepQuestion(); break;
        case 'tips': t.innerText="Sugerencias"; if(window.loadTips) window.loadTips(); break;
        case 'rewards': t.innerText="Premios"; if(window.loadRewards) await window.loadRewards(); break;
    }
};

// --- INIT ---
async function initApp() {
    if(!window.db) return;
    window.checkOnboarding();
    const { data: { user } } = await window.db.auth.getUser();

    if(user) {
        window.currentUser = user;
        await window.refreshUserProfile();
        const { data: couple } = await window.db.from('couples').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
        document.getElementById('auth-view').classList.add('hidden');

        if(couple) {
            window.currentCouple = couple;
            document.getElementById('main-view').classList.remove('hidden');
            if(window.loadChallengeGrid) await window.loadChallengeGrid();
            await window.checkNotifications();

            // REALTIME UPDATES
            // 1. Pareja (Bandera)
            window.db.channel('public:couples').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter:`id=eq.${couple.id}` }, async () => {
                await window.checkNotifications();
                if(window.currentSection==='peace') window.checkWhiteFlagStatus();
                window.showToast("🔔 Tu pareja actualizó el estado");
            }).subscribe();

            // 2. Contenido (Peticiones, Preguntas, Apoyos)
            window.db.channel('public:shared').on('postgres_changes', { event: '*', schema: 'public', table: 'shared_content', filter:`couple_id=eq.${couple.id}` }, () => {
                // Recargar si estamos viendo la sección para ver cambios en vivo
                if(window.currentSection==='prayer') window.loadPrayers();
                if(window.currentSection==='questions') window.loadDeepQuestion();
            }).subscribe();

        } else {
            document.getElementById('sync-view').classList.remove('hidden');
            if(document.getElementById('my-code')) document.getElementById('my-code').innerText = window.currentProfile.share_code;
        }
    } else {
        document.getElementById('auth-view').classList.remove('hidden');
    }
}

// --- UTILS ---
window.connectCouple=async function(){const c=document.getElementById('partner-code').value.toUpperCase().trim();const m=window.currentUser.id;if(!c)return window.showToast("Ingresa código","error");if(c===window.currentProfile.share_code)return window.showToast("No tu código","error");const{data:p}=await window.db.from('profiles').select('id').eq('share_code',c).maybeSingle();if(!p)return window.showToast("Inválido","error");const[u1,u2]=[m,p.id].sort();const{error}=await window.db.from('couples').insert([{user1_id:u1,user2_id:u2}]);if(error&&error.code!=='23505')window.showToast("Error","error");else{window.showToast("¡Conectados!");location.reload();}};
window.copyCode=function(){navigator.clipboard.writeText(document.getElementById('my-code').innerText);window.showToast("Copiado");};
window.handleLogout=async function(){await window.db.auth.signOut();location.reload();};
window.showToast=function(m,t='info'){const c=document.getElementById('toast-container');const d=document.createElement('div');d.className=`toast ${t}`;d.innerText=m;c.appendChild(d);setTimeout(()=>d.remove(),3000);};
window.showModal=function(t,b){document.getElementById('modal-title').innerText=t;document.getElementById('modal-body').innerHTML=b;document.getElementById('modal-actions').innerHTML='';document.getElementById('modal-overlay').classList.remove('hidden');};
window.closeModal=function(){document.getElementById('modal-overlay').classList.add('hidden');};
initApp();
