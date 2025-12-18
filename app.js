import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- PWA: REGISTRO SW ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
}

// ESTADO
let user = null;
let coupleId = null;
let partnerId = null;
let isRegistering = false;
let pollingInterval = null;
let selectedDay = 1;
let isPremium = false;

// CONTENIDO (21 Días)
const content21Days = {
  1: { tema: "Identidad", lectura: "Salmo 139:14", oracion: "Ayúdame a amarme.", tarea: "Escribe 3 cualidades tuyas.", premio: null },
  // ... (Agrega tus días aquí) ...
  7: { tema: "Hito 1", lectura: "Mateo 7:24", oracion: "Gracias.", tarea: "Celebrar.", premio: "¡Semana 1 lista! 🍦" },
  14: { tema: "Hito 2", lectura: "Neh 2:18", oracion: "Construir.", tarea: "Check-in.", premio: "¡Semana 2 lista! 🎬" },
  21: { tema: "Gran Final", lectura: "Rut 1:16", oracion: "Pacto.", tarea: "Promesa.", premio: "¡Segunda Luna de Miel! ❤️" }
};

// --- AUTH ---
supabase.auth.onAuthStateChange(async (e, session) => {
  if (session) {
    user = session.user;
    const name = user.user_metadata?.first_name || "Amigo/a";
    document.getElementById("userNameDisplay").textContent = `Hola, ${name}`;
    document.getElementById("auth").classList.add("hidden");
    await initApp();
  } else {
    resetUI();
  }
});

function resetUI() {
  document.getElementById("globalLoader").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("coupleSetup").classList.add("hidden");
  document.getElementById("userHeader").classList.add("hidden");
  document.getElementById("adBanner").classList.add("hidden");
  document.getElementById("feedbackBtn").classList.add("hidden");
}

// TOGGLE AUTH
document.getElementById("toggleAuth").onclick = () => {
  isRegistering = !isRegistering;
  const title = document.getElementById("authTitle");
  const btn = document.getElementById("authBtn");
  const toggle = document.getElementById("toggleAuth");
  const nameField = document.getElementById("registerFields");

  if (isRegistering) {
    title.textContent = "Crear Cuenta";
    btn.textContent = "Registrarse";
    toggle.textContent = "¿Ya tienes cuenta? Ingresa";
    nameField.classList.remove("hidden");
  } else {
    title.textContent = "Iniciar Sesión";
    btn.textContent = "Ingresar";
    toggle.textContent = "¿No tienes cuenta? Crear una";
    nameField.classList.add("hidden");
  }
};

document.getElementById("authBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) return showToast("Faltan datos", "error");

  document.getElementById("globalLoader").classList.remove("hidden"); // Feedback visual

  if (isRegistering) {
    const name = document.getElementById("userNameInput").value;
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: name } } });
    if (error) showToast(error.message, "error");
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showToast("Credenciales incorrectas", "error");
  }
  document.getElementById("globalLoader").classList.add("hidden");
};

document.getElementById("logoutBtn").onclick = async () => { await supabase.auth.signOut(); window.location.reload(); };

// --- APP LOGIC ---
async function initApp() {
  document.getElementById("globalLoader").classList.add("hidden");
  
  // 1. Obtener Miembro y Datos Extra (Racha)
  const { data: member } = await supabase.from("couple_members").select("*").eq("user_id", user.id).maybeSingle();

  if (!member) {
    document.getElementById("coupleSetup").classList.remove("hidden");
    document.getElementById("setupActions").classList.remove("hidden");
    document.getElementById("waitingRoom").classList.add("hidden");
    return;
  }

  coupleId = member.couple_id;
  document.getElementById("userHeader").classList.remove("hidden");
  
  // Mostrar Racha (Dopamina)
  if(member.current_streak > 0) {
    const badge = document.getElementById("streakBadge");
    badge.textContent = `🔥 ${member.current_streak} días`;
    badge.classList.remove("hidden");
  }

  // 2. Obtener Pareja (Suscripción) y Compañero
  const { data: couple } = await supabase.from("couples").select("code, is_premium").eq("id", coupleId).single();
  const { data: partner } = await supabase.from("couple_members").select("user_id").eq("couple_id", coupleId).neq("user_id", user.id).maybeSingle();

  if (partner) {
    partnerId = partner.user_id;
    if (pollingInterval) clearInterval(pollingInterval);
    
    // Configurar UI
    document.getElementById("coupleSetup").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("feedbackBtn").classList.remove("hidden");
    
    // Monetización
    isPremium = couple.is_premium;
    if(!isPremium) document.getElementById("adBanner").classList.remove("hidden");
    
    await loadData();
  } else {
    // Sala de espera
    document.getElementById("coupleSetup").classList.remove("hidden");
    document.getElementById("setupActions").classList.add("hidden");
    document.getElementById("waitingRoom").classList.remove("hidden");
    document.getElementById("displayCode").textContent = couple.code;
    if (!pollingInterval) pollingInterval = setInterval(initApp, 5000);
  }
}

// --- CORE DATA ---
async function loadData() {
  const { data: entries } = await supabase.from("entries").select("*").eq("couple_id", coupleId);
  const myEntries = entries.filter(e => e.user_id === user.id);
  const pEntries = entries.filter(e => e.user_id === partnerId);

  const myMax = myEntries.length ? Math.max(...myEntries.map(e => e.day)) : 0;
  const pMax = pEntries.length ? Math.max(...pEntries.map(e => e.day)) : 0;
  
  const joint = Math.min(myMax, pMax);
  const unlockable = joint + 1;

  // Renderizar Barra
  const pct = (joint / 21) * 100;
  document.getElementById("progressBarFill").style.width = `${pct}%`;
  if(joint>=7) document.getElementById("m7").classList.add("active");
  if(joint>=14) document.getElementById("m14").classList.add("active");
  if(joint>=21) document.getElementById("m21").classList.add("active");

  // Renderizar Grid
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";
  
  for(let i=1; i<=21; i++) {
    const box = document.createElement("div");
    const done = myEntries.find(e => e.day === i);
    const pDone = pEntries.some(e => e.day === i);
    
    let icon = "🔒", css = "locked";
    
    if (done) {
      icon = "✅"; css = "completed";
      if ([7,14,21].includes(i) && pDone) { icon = "🏆"; css = "reward-day"; }
    } else if (i === myMax + 1 && i <= unlockable) {
      icon = "🔥"; css = "active";
    } else if (i === myMax + 1 && i > unlockable) {
      icon = "⏳";
    }

    box.className = `day-box ${css}`;
    box.innerHTML = `<div style="font-weight:bold;">${i}</div><div style="font-size:1.5rem">${icon}</div><div class="partner-dots"><div class="dot me ${done?'done':''}"></div><div class="dot partner ${pDone?'done':''}"></div></div>`;
    
    const content = done ? done.content : "";
    box.onclick = () => openDayModal(i, !!done, css, content);
    grid.appendChild(box);
  }
}

// --- MODALES & ACTIONS ---
function openDayModal(day, isDone, status, content) {
  if (status === "locked" || status === "reward-day") return;
  if (status === "active" || status === "completed") {
    selectedDay = day;
    const d = content21Days[day] || { tema: "Día " + day, lectura: "", oracion: "", tarea: "" };
    
    document.getElementById("modalTitle").textContent = d.tema;
    document.getElementById("modalLectura").textContent = d.lectura;
    document.getElementById("modalOracion").textContent = d.oracion;
    document.getElementById("modalTarea").textContent = d.tarea;
    document.getElementById("dayModal").classList.remove("hidden");

    const btn = document.getElementById("saveDayBtn");
    const txt = document.getElementById("dayReflection");
    const ev = document.getElementById("evidenceSection");

    if (isDone) {
      btn.textContent = "Completado"; btn.disabled = true; btn.style.background = "#064e3b";
      txt.value = content || "Sin notas"; txt.disabled = true; ev.style.display = "block";
    } else {
      // Validar fecha (1 por día) para Dopamina Sana
      checkDate().then(can => {
        if(!can) {
          btn.textContent = "Vuelve mañana 🌙"; btn.disabled = true; btn.style.background = "#475569";
          ev.style.display = "none";
        } else {
          btn.textContent = "Completar"; btn.disabled = false; btn.style.background = "#10b981";
          txt.value = ""; txt.disabled = false; ev.style.display = "block";
        }
      });
    }
  } else {
    showToast("Tu pareja debe completar los días anteriores.", "error");
  }
}

async function checkDate() {
  const { data } = await supabase.from("entries").select("created_at").eq("user_id", user.id).order("created_at", {ascending:false}).limit(1);
  if(data && data.length > 0) return new Date(data[0].created_at).toDateString() !== new Date().toDateString();
  return true;
}

document.getElementById("saveDayBtn").onclick = async () => {
  const note = document.getElementById("dayReflection").value;
  if(note.length < 5) return showToast("Escribe una breve reflexión.", "error");

  const { error } = await supabase.from("entries").insert({ couple_id: coupleId, user_id: user.id, day: selectedDay, content: note });
  if(!error) {
    // DOPAMINA: UPDATE STREAK
    await supabase.rpc('increment_streak', { user_uuid: user.id }); // (Opcional si sabes crear RPC, sino ignora)
    
    document.getElementById("dayModal").classList.add("hidden");
    fireConfetti();
    showToast("¡Día Completado!", "success");
    await loadData();
    
    if([7,14,21].includes(selectedDay)) {
      document.getElementById("rewardText").textContent = content21Days[selectedDay].premio;
      document.getElementById("rewardModal").classList.remove("hidden");
    }
  } else showToast("Error al guardar.", "error");
};

// --- FEATURES EXTRAS (Monetización y Feedback) ---
document.getElementById("removeAdsBtn").onclick = async () => {
  if(confirm("¿Pagar $2.99 para quitar anuncios? (Demo)")) {
    await supabase.from("couples").update({ is_premium: true }).eq("id", coupleId);
    showToast("¡Eres Premium! 💎", "success");
    initApp();
  }
};

document.getElementById("feedbackBtn").onclick = () => document.getElementById("feedbackModal").classList.remove("hidden");
document.getElementById("sendFeedbackBtn").onclick = async () => {
  const msg = document.getElementById("feedbackText").value;
  if(msg.length > 5) {
    await supabase.from("feedback").insert({ user_id: user.id, message: msg });
    showToast("¡Gracias por tu opinión!", "success");
    document.getElementById("feedbackModal").classList.add("hidden");
  }
};

// UTILS
window.closeModals = () => {
  document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
};
function showToast(msg, type) {
  const d = document.createElement("div");
  d.className = "toast";
  d.style.borderLeftColor = type === 'error' ? '#ef4444' : '#10b981';
  d.textContent = msg;
  document.getElementById("toast-container").appendChild(d);
  setTimeout(() => d.remove(), 3000);
}
function fireConfetti() {
  const c = document.getElementById('confetti-canvas'); const x = c.getContext('2d');
  c.width=window.innerWidth; c.height=window.innerHeight;
  let p=[]; for(let i=0;i<100;i++) p.push({x:Math.random()*c.width,y:Math.random()*c.height-c.height,c:`hsl(${Math.random()*360},100%,50%)`,s:Math.random()*5+2});
  function a(){x.clearRect(0,0,c.width,c.height);p.forEach(o=>{o.y+=o.s;x.fillStyle=o.c;x.fillRect(o.x,o.y,5,5)});if(p.some(o=>o.y<c.height))requestAnimationFrame(a);else x.clearRect(0,0,c.width,c.height);} a();
}

// SETUP BUTTONS (Igual que antes)
document.getElementById("createCoupleBtn").onclick = async () => { const c=Math.random().toString(36).substring(2,8).toUpperCase(); const {data}=await supabase.from("couples").insert({code:c}).select().single(); await supabase.from("couple_members").insert({couple_id:data.id, user_id:user.id}); initApp(); };
document.getElementById("joinCoupleBtn").onclick = async () => { const c=document.getElementById("joinCode").value.toUpperCase(); const {data:cp}=await supabase.from("couples").select("id").eq("code",c).maybeSingle(); if(cp){ await supabase.from("couple_members").insert({couple_id:cp.id, user_id:user.id}); initApp(); } else showToast("Código inválido", "error"); };
