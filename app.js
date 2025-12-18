import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);

// STATE
let user = null;
let coupleId = null;
let partnerId = null;
let isRegistering = false;
let pollingInterval = null;
let selectedDay = 1;

// CONTENT
const dateIdeas = ["Cocinar juntos 🍝", "Ver estrellas ✨", "Juegos mesa 🎲", "Ver fotos viejas 📸", "Orar juntos 🙏", "Masajes 🦶", "Cartas amor 💌", "Desayuno cama 🥐"];
const content21Days = {
  1: { tema: "Identidad", lectura: "Salmo 139:14", oracion: "Ayúdame a amarme.", tarea: "Escribe 3 cualidades tuyas." },
  // ... (Completa los días)
  7: { tema: "Hito 1", lectura: "Mat 7:24", oracion: "Gracias.", tarea: "Celebrar.", premio: "¡Helado juntos! 🍦" },
  14: { tema: "Hito 2", lectura: "Neh 2:18", oracion: "Construir.", tarea: "Check-in.", premio: "Noche de cine 🎬" },
  21: { tema: "FINAL", lectura: "Rut 1:16", oracion: "Pacto.", tarea: "Promesa.", premio: "Luna de Miel ❤️" }
};

// --- ONBOARDING ---
let slideIndex = 1;
function checkOnboarding() {
  if (!localStorage.getItem("intro_done")) {
    document.getElementById("onboarding").classList.remove("hidden");
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("globalLoader").classList.add("hidden");
    return true;
  }
  return false;
}
document.getElementById("nextSlideBtn").onclick = () => {
  document.getElementById(`slide${slideIndex}`).classList.remove("active");
  document.getElementById(`dot${slideIndex}`).classList.remove("active");
  slideIndex++;
  if(slideIndex>3) slideIndex=3;
  document.getElementById(`slide${slideIndex}`).classList.add("active");
  document.getElementById(`dot${slideIndex}`).classList.add("active");
  if(slideIndex===3) document.getElementById("nextSlideBtn").classList.add("hidden");
};
document.getElementById("startAppBtn").onclick = () => {
  localStorage.setItem("intro_done", "true");
  document.getElementById("onboarding").classList.add("hidden");
  if(user) initApp(); else resetUI();
};

// --- AUTH ---
supabase.auth.onAuthStateChange(async (e, session) => {
  if (session) {
    user = session.user;
    if (checkOnboarding()) return; // Esperar
    document.getElementById("userNameDisplay").textContent = `Hola, ${user.user_metadata?.first_name || 'Amigo'}`;
    document.getElementById("globalLoader").classList.remove("hidden");
    await initApp();
  } else {
    resetUI();
  }
});

function resetUI() {
  if(checkOnboarding()) return;
  user = null;
  document.getElementById("globalLoader").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("coupleSetup").classList.add("hidden");
  document.getElementById("userHeader").classList.add("hidden");
  document.getElementById("toolsBar").classList.add("hidden");
}

// --- INIT APP ---
async function initApp() {
  try {
    document.getElementById("auth").classList.add("hidden");
    const { data: member } = await supabase.from("couple_members").select("*").eq("user_id", user.id).maybeSingle();
    
    document.getElementById("globalLoader").classList.add("hidden");

    if (!member) {
      document.getElementById("coupleSetup").classList.remove("hidden");
      document.getElementById("setupActions").classList.remove("hidden");
      document.getElementById("waitingRoom").classList.add("hidden");
      return;
    }

    coupleId = member.couple_id;
    document.getElementById("userHeader").classList.remove("hidden");
    if(member.current_streak > 0) {
        document.getElementById("streakBadge").textContent = `🔥 ${member.current_streak}`;
        document.getElementById("streakBadge").style.display = 'block';
    }

    // Check Mood
    const today = new Date().toISOString().split('T')[0];
    if(member.last_mood_date !== today) document.getElementById("moodModal").classList.remove("hidden");
    else document.getElementById("myMoodDisplay").textContent = member.current_mood;

    const { data: partner } = await supabase.from("couple_members").select("user_id").eq("couple_id", coupleId).neq("user_id", user.id).maybeSingle();

    if (partner) {
      partnerId = partner.user_id;
      if (pollingInterval) clearInterval(pollingInterval);
      
      const { data: couple } = await supabase.from("couples").select("is_premium").eq("id", coupleId).single();
      if(!couple?.is_premium) document.getElementById("adBanner").classList.remove("hidden");

      document.getElementById("coupleSetup").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("toolsBar").classList.remove("hidden");
      await loadData();
    } else {
      const { data: cp } = await supabase.from("couples").select("code").eq("id", coupleId).single();
      showWaitingRoom(cp.code);
    }
  } catch(err) {
    console.error(err);
    document.getElementById("globalLoader").classList.add("hidden");
    alert("Error de conexión. Recarga.");
  }
}

function showWaitingRoom(code) {
  document.getElementById("coupleSetup").classList.remove("hidden");
  document.getElementById("setupActions").classList.add("hidden");
  document.getElementById("waitingRoom").classList.remove("hidden");
  document.getElementById("displayCode").textContent = code;
  if (!pollingInterval) pollingInterval = setInterval(initApp, 5000);
}

// --- DATA ---
async function loadData() {
  const { data: entries } = await supabase.from("entries").select("*").eq("couple_id", coupleId);
  const myEntries = entries.filter(e => e.user_id === user.id);
  const pEntries = entries.filter(e => e.user_id === partnerId);

  const myMax = myEntries.length ? Math.max(...myEntries.map(e => e.day)) : 0;
  const pMax = pEntries.length ? Math.max(...pEntries.map(e => e.day)) : 0;
  const joint = Math.min(myMax, pMax);
  const unlockable = joint + 1;

  const pct = (joint / 21) * 100;
  document.getElementById("progressBarFill").style.width = `${pct}%`;
  if(joint>=7) document.getElementById("m7").classList.add("active");
  if(joint>=14) document.getElementById("m14").classList.add("active");
  if(joint>=21) document.getElementById("m21").classList.add("active");

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";
  
  for(let i=1; i<=21; i++) {
    const box = document.createElement("div");
    const done = myEntries.find(e => e.day === i);
    const pDone = pEntries.some(e => e.day === i);
    let icon="🔒", css="locked";
    
    if (done) {
      icon="✅"; css="completed";
      if ([7,14,21].includes(i) && pDone) { icon="🏆"; css="reward-day"; }
    } else if (i === myMax + 1 && i <= unlockable) {
      icon="🔥"; css="active";
    } else if (i === myMax + 1 && i > unlockable) {
      icon="⏳"; 
    }

    box.className = `day-box ${css}`;
    box.innerHTML = `<div style="font-weight:bold;">${i}</div><div style="font-size:1.5rem">${icon}</div><div class="partner-dots"><div class="dot me ${done?'done':''}"></div><div class="dot partner ${pDone?'done':''}"></div></div>`;
    box.onclick = () => openDayModal(i, !!done, css, done?.content);
    grid.appendChild(box);
  }
}

// --- FEATURES ---
window.saveMood = async (emoji) => {
  const today = new Date().toISOString().split('T')[0];
  await supabase.from("couple_members").update({ current_mood: emoji, last_mood_date: today }).eq("user_id", user.id);
  document.getElementById("moodModal").classList.add("hidden");
  document.getElementById("myMoodDisplay").textContent = emoji;
};

document.getElementById("openPrayerBtn").onclick = async () => {
  document.getElementById("prayerModal").classList.remove("hidden");
  loadPrayers();
};
async function loadPrayers() {
  const { data } = await supabase.from("prayers").select("*").eq("couple_id", coupleId).order("created_at", {ascending:false});
  const list = document.getElementById("prayerList");
  list.innerHTML = "";
  if(data) data.forEach(p => {
    const isMine = p.user_id === user.id;
    const div = document.createElement("div");
    div.className = "prayer-item";
    div.innerHTML = `<span>${isMine?'Yo':'Pareja'}: ${p.content}</span> ${!isMine ? `<span class="pray-action ${p.partner_praying?'active':''}" onclick="prayFor('${p.id}')">${p.partner_praying ? '🙏 Orando' : 'Orar'}</span>` : ''}`;
    list.appendChild(div);
  });
}
window.prayFor = async (id) => {
  await supabase.from("prayers").update({ partner_praying: true }).eq("id", id);
  loadPrayers();
  showToast("Marcado como orando", "success");
};
document.getElementById("addPrayerBtn").onclick = async () => {
  const txt = document.getElementById("newPrayerText").value;
  if(txt) {
    await supabase.from("prayers").insert({ couple_id: coupleId, user_id: user.id, content: txt });
    document.getElementById("newPrayerText").value = "";
    loadPrayers();
  }
};

document.getElementById("openDateBtn").onclick = () => {
  document.getElementById("dateModal").classList.remove("hidden");
  window.generateDate();
};
window.generateDate = () => {
  const idea = dateIdeas[Math.floor(Math.random() * dateIdeas.length)];
  document.getElementById("dateIdea").textContent = idea;
};

document.getElementById("openFeedbackBtn").onclick = () => document.getElementById("feedbackModal").classList.remove("hidden");
document.getElementById("sendFeedbackBtn").onclick = async () => {
  const msg = document.getElementById("feedbackText").value;
  if(msg) {
    await supabase.from("feedback").insert({ user_id: user.id, message: msg });
    showToast("Enviado", "success");
    document.getElementById("feedbackModal").classList.add("hidden");
  }
};

// --- AUTH BUTTONS ---
document.getElementById("toggleAuth").onclick = () => {
  isRegistering = !isRegistering;
  document.getElementById("authTitle").textContent = isRegistering ? "Crear Cuenta" : "Iniciar Sesión";
  document.getElementById("authBtn").textContent = isRegistering ? "Registrarse" : "Ingresar";
  document.getElementById("registerFields").classList.toggle("hidden");
  document.getElementById("toggleAuth").textContent = isRegistering ? "¿Ya tienes cuenta? Ingresa" : "¿Crear cuenta nueva?";
};

document.getElementById("authBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if(!email || !password) return showToast("Faltan datos", "error");
  
  document.getElementById("globalLoader").classList.remove("hidden");

  if(isRegistering) {
    const name = document.getElementById("userNameInput").value;
    if(!name) {
       document.getElementById("globalLoader").classList.add("hidden");
       return showToast("Falta nombre", "error");
    }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: name } } });
    if(error) showToast(error.message, "error");
    else showToast("Creado. Ingresa.", "success");
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) showToast("Error al ingresar", "error");
  }
  document.getElementById("globalLoader").classList.add("hidden");
};

// --- MODAL DÍA ---
function openDayModal(day, isDone, status, content) {
  if (status === "locked" || status === "reward-day") return;
  if (status !== "active" && status !== "completed") return showToast("Tu pareja debe completar los anteriores.", "error");

  selectedDay = day;
  const d = content21Days[day] || { tema: "Día " + day, lectura: "", oracion: "", tarea: "" };
  document.getElementById("modalTitle").textContent = d.tema;
  document.getElementById("modalLectura").textContent = d.lectura;
  document.getElementById("modalOracion").textContent = d.oracion;
  document.getElementById("modalTarea").textContent = d.tarea;
  
  const btn = document.getElementById("saveDayBtn");
  const txt = document.getElementById("dayReflection");
  const ev = document.getElementById("evidenceSection");

  document.getElementById("dayModal").classList.remove("hidden");

  if(isDone) {
    btn.textContent = "Completado"; btn.disabled = true; btn.style.background = "#064e3b";
    txt.value = content || "Sin notas"; txt.disabled = true; ev.style.display = "block";
  } else {
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
}

async function checkDate() {
  const { data } = await supabase.from("entries").select("created_at").eq("user_id", user.id).order("created_at", {ascending:false}).limit(1);
  if(data && data.length > 0) return new Date(data[0].created_at).toDateString() !== new Date().toDateString();
  return true;
}

document.getElementById("saveDayBtn").onclick = async () => {
  const note = document.getElementById("dayReflection").value;
  if(note.length < 5) return showToast("Escribe algo...", "error");
  const { error } = await supabase.from("entries").insert({ couple_id: coupleId, user_id: user.id, day: selectedDay, content: note });
  if(!error) {
    document.getElementById("dayModal").classList.add("hidden");
    fireConfetti();
    showToast("¡Listo!", "success");
    await loadData();
    if([7,14,21].includes(selectedDay)) {
      document.getElementById("rewardText").textContent = content21Days[selectedDay].premio;
      document.getElementById("rewardModal").classList.remove("hidden");
    }
  } else showToast("Error", "error");
};

// Utils
document.getElementById("logoutBtn").onclick = async () => { await supabase.auth.signOut(); window.location.reload(); };
document.getElementById("removeAdsBtn").onclick = async () => { if(confirm("¿Pagar?")) { await supabase.from("couples").update({ is_premium: true }).eq("id", coupleId); initApp(); } };
window.closeModals = () => document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
function showToast(msg, type) { const d = document.createElement("div"); d.className="toast"; d.style.borderLeftColor = type==='error'?'#ef4444':'#10b981'; d.textContent = msg; document.getElementById("toast-container").appendChild(d); setTimeout(()=>d.remove(),3000); }
function fireConfetti() { const c = document.getElementById('confetti-canvas'); const x = c.getContext('2d'); c.width=window.innerWidth; c.height=window.innerHeight; let p=[]; for(let i=0;i<100;i++) p.push({x:Math.random()*c.width,y:Math.random()*c.height-c.height,c:`hsl(${Math.random()*360},100%,50%)`,s:Math.random()*5+2}); function a(){x.clearRect(0,0,c.width,c.height);p.forEach(o=>{o.y+=o.s;x.fillStyle=o.c;x.fillRect(o.x,o.y,5,5)});if(p.some(o=>o.y<c.height))requestAnimationFrame(a);else x.clearRect(0,0,c.width,c.height);} a(); }

document.getElementById("createCoupleBtn").onclick = async () => { const c=Math.random().toString(36).substring(2,8).toUpperCase(); const {data}=await supabase.from("couples").insert({code:c}).select().single(); await supabase.from("couple_members").insert({couple_id:data.id, user_id:user.id}); initApp(); };
document.getElementById("joinCoupleBtn").onclick = async () => { const c=document.getElementById("joinCode").value.toUpperCase(); const {data:cp}=await supabase.from("couples").select("id").eq("code",c).maybeSingle(); if(cp){ await supabase.from("couple_members").insert({couple_id:cp.id, user_id:user.id}); initApp(); } else showToast("Código inválido", "error"); };
