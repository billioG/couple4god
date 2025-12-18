import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- PWA ---
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);

// --- ESTADO ---
let user = null;
let coupleId = null;
let partnerId = null;
let isRegistering = false;
let pollingInterval = null;
let selectedDay = 1;
let isPremium = false;

const content21Days = {
  1: { tema: "Identidad", lectura: "Salmo 139:14", oracion: "Ayúdame a amarme para amar bien.", tarea: "Escribe 3 cualidades que admiras de ti mismo/a." },
  2: { tema: "Escucha Activa", lectura: "Santiago 1:19", oracion: "Señor, cierra mi boca y abre mi oído.", tarea: "En la próxima charla, espera 3 segundos antes de responder." },
  3: { tema: "Validación", lectura: "Romanos 12:15", oracion: "Que yo sienta lo que mi pareja siente.", tarea: "Pregunta: '¿Te sientes escuchado/a por mí?' Solo escucha." },
  4: { tema: "Límites", lectura: "Prov 25:28", oracion: "Dame valor para decir 'no' con amor.", tarea: "Identifica algo que haces por obligación y negocia una alternativa." },
  5: { tema: "Lenguajes Amor", lectura: "1 Juan 3:18", oracion: "Enséñame a amar como necesitas.", tarea: "Pregunta: '¿Qué puedo hacer hoy para que te sientas amado/a?'" },
  6: { tema: "Pausa", lectura: "Efesios 4:26", oracion: "Que mi ira no destruya.", tarea: "Si hay tensión, usen la palabra clave 'PAUSA' y sepárense 15 min." },
  7: { tema: "Hito 1", lectura: "Mateo 7:24", oracion: "Gracias.", tarea: "Celebrar.", premio: "¡Helado juntos! 🍦" },
  8: { tema: "Verdad", lectura: "Efesios 4:15", oracion: "Hablar verdad en amor.", tarea: "No uses indirectas hoy. Pide lo que necesitas claramente." },
  9: { tema: "Empatía", lectura: "1 Pedro 3:8", oracion: "Ablanda mi corazón.", tarea: "Ante un problema de ella/el, no des soluciones. Di: 'Debe ser difícil, lo siento'." },
  10: { tema: "Perdón", lectura: "Col 3:13", oracion: "Límpiame de rencor.", tarea: "Identifica una pequeña ofensa reciente y decide perdonarla hoy." },
  11: { tema: "Soledad", lectura: "Marcos 1:35", oracion: "Encuéntrame en el silencio.", tarea: "Regálense 1 hora individual. Al volver, agradézcanse el espacio." },
  12: { tema: "Gratitud", lectura: "1 Tes 5:18", oracion: "Abre mis ojos a lo bueno.", tarea: "Envía un texto agradeciendo algo específico que hizo ayer." },
  13: { tema: "Contacto", lectura: "Cantares 2:6", oracion: "Santifica nuestro contacto.", tarea: "Un abrazo de 20 segundos sin hablar. Solo respiren." },
  14: { tema: "Hito 2", lectura: "Neh 2:18", oracion: "Construir.", tarea: "Check-in.", premio: "Noche de cine 🎬" },
  15: { tema: "Suavidad", lectura: "Prov 15:1", oracion: "Suaviza mis palabras.", tarea: "Usa la técnica Sandwich: Elogio + Petición + Elogio." },
  16: { tema: "Servicio", lectura: "Gálatas 5:13", oracion: "Quiero servir, no ser servido.", tarea: "Haz una tarea de tu pareja sin que te lo pida." },
  17: { tema: "Visión", lectura: "Habacuc 2:2", oracion: "Aviva nuestra visión.", tarea: "Hablen 10 min: '¿Cómo nos gustaría estar en 5 años?'" },
  18: { tema: "Vulnerabilidad", lectura: "2 Cor 12:9", oracion: "Quita mi armadura.", tarea: "Confiesa un miedo: 'A veces temo que...'." },
  19: { tema: "Desconexión", lectura: "Salmo 101:3", oracion: "Que nada nos distraiga.", tarea: "Cena sin celulares. Cero pantallas por 40 min." },
  20: { tema: "Gozo", lectura: "Filipenses 4:4", oracion: "Restaura nuestro gozo.", tarea: "Pongan una canción y bailen juntos." },
  21: { tema: "FINAL", lectura: "Rut 1:16", oracion: "Pacto.", tarea: "Promesa.", premio: "Luna de Miel ❤️" }
};

// --- ONBOARDING LOGIC ---
let slideIndex = 1;

// Verificar al inicio si debe mostrarse el onboarding
function shouldShowOnboarding() {
  if (!localStorage.getItem("intro_done")) {
    document.getElementById("onboarding").classList.remove("hidden");
    document.getElementById("auth").classList.add("hidden"); // Ocultar Auth
    document.getElementById("globalLoader").classList.add("hidden"); // Ocultar Loader
    return true; 
  }
  return false;
}

// Navegación de slides
document.getElementById("nextSlideBtn").onclick = () => {
  document.getElementById(`slide${slideIndex}`).classList.remove("active");
  document.getElementById(`dot${slideIndex}`).classList.remove("active");
  slideIndex++;
  
  if(slideIndex > 3) slideIndex = 3;
  
  document.getElementById(`slide${slideIndex}`).classList.add("active");
  document.getElementById(`dot${slideIndex}`).classList.add("active");
  
  if(slideIndex === 3) document.getElementById("nextSlideBtn").classList.add("hidden");
};

// Finalizar Onboarding y Mostrar Auth
document.getElementById("startAppBtn").onclick = () => {
  localStorage.setItem("intro_done", "true");
  document.getElementById("onboarding").classList.add("hidden");
  
  // Una vez terminado, decidimos qué mostrar (Login o App)
  if (user) initApp();
  else resetUI();
};

// --- AUTH & SESSION ---
supabase.auth.onAuthStateChange(async (e, session) => {
  user = session?.user || null;

  // IMPORTANTE: Si el onboarding está activo, NO hacemos nada visualmente todavía.
  // El usuario sigue en el tutorial. Cuando le de a "Comenzar", se disparará la lógica.
  if (shouldShowOnboarding()) return;

  if (user) {
    const name = user.user_metadata?.first_name || "Amigo/a";
    document.getElementById("userNameDisplay").textContent = `Hola, ${name}`;
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("globalLoader").classList.remove("hidden");
    await initApp();
  } else {
    resetUI();
  }
});

function resetUI() {
  // Asegurarnos de que no mostramos el login si el onboarding está pendiente
  if (!localStorage.getItem("intro_done")) return;

  user = null;
  document.getElementById("globalLoader").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");
  
  // Ocultar resto de la app
  document.getElementById("app").classList.add("hidden");
  document.getElementById("coupleSetup").classList.add("hidden");
  document.getElementById("userHeader").classList.add("hidden");
  document.getElementById("adBanner").classList.add("hidden");
  document.getElementById("feedbackBtn").classList.add("hidden");
}

// --- APP LOGIC ---
async function initApp() {
  try {
    // 1. Obtener Miembro
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
      document.getElementById("streakBadge").textContent = `🔥 ${member.current_streak} días`;
      document.getElementById("streakBadge").classList.remove("hidden");
    }

    // 2. Obtener Pareja
    const { data: partner } = await supabase.from("couple_members").select("user_id").eq("couple_id", coupleId).neq("user_id", user.id).maybeSingle();

    if (partner) {
      partnerId = partner.user_id;
      if (pollingInterval) clearInterval(pollingInterval);
      
      const { data: couple } = await supabase.from("couples").select("is_premium").eq("id", coupleId).single();
      isPremium = couple.is_premium;
      if(!isPremium) document.getElementById("adBanner").classList.remove("hidden");
      else document.getElementById("adBanner").classList.add("hidden");

      document.getElementById("coupleSetup").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("feedbackBtn").classList.remove("hidden");
      await loadData();
    } else {
      const { data: cp } = await supabase.from("couples").select("code").eq("id", coupleId).single();
      showWaitingRoom(cp.code);
    }
  } catch(err) { console.error(err); }
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
    
    const content = done ? done.content : "";
    box.onclick = () => openDayModal(i, !!done, css, content);
    grid.appendChild(box);
  }
}

// --- MODAL & ACTIONS ---
function openDayModal(day, isDone, status, content) {
  if (status === "locked" || status === "reward-day") return;
  if (status !== "active" && status !== "completed") return showToast("Tu pareja debe completar los días anteriores.", "error");

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
  if(note.length < 5) return showToast("Escribe una breve reflexión.", "error");

  const { error } = await supabase.from("entries").insert({ couple_id: coupleId, user_id: user.id, day: selectedDay, content: note });
  if(!error) {
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

// --- UTILS ---
// Toggle Auth
document.getElementById("toggleAuth").onclick = () => {
  isRegistering = !isRegistering;
  const title = document.getElementById("authTitle");
  const btn = document.getElementById("authBtn");
  const reg = document.getElementById("registerFields");
  const tog = document.getElementById("toggleAuth");

  if(isRegistering) {
    title.textContent="Crear Cuenta"; btn.textContent="Registrarse"; reg.classList.remove("hidden");
    tog.textContent="¿Ya tienes cuenta? Ingresa";
  } else {
    title.textContent="Iniciar Sesión"; btn.textContent="Ingresar"; reg.classList.add("hidden");
    tog.textContent="¿Crear cuenta nueva?";
  }
};

document.getElementById("authBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if(!email || !password) return showToast("Faltan datos", "error");

  document.getElementById("globalLoader").classList.remove("hidden");

  if(isRegistering) {
    const name = document.getElementById("userNameInput").value;
    if(!name) { document.getElementById("globalLoader").classList.add("hidden"); return showToast("Falta nombre", "error"); }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: name } } });
    if(error) showToast(error.message, "error");
    else showToast("Cuenta creada. Ingresa.", "success");
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) showToast("Credenciales incorrectas", "error");
  }
  document.getElementById("globalLoader").classList.add("hidden");
};

// Otros botones
document.getElementById("logoutBtn").onclick = async () => { await supabase.auth.signOut(); window.location.reload(); };
document.getElementById("removeAdsBtn").onclick = async () => {
  if(confirm("¿Quitar anuncios? (Demo)")) {
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
    showToast("¡Gracias!", "success");
    document.getElementById("feedbackModal").classList.add("hidden");
  }
};

window.closeModals = () => document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
function showToast(msg, type) {
  const d = document.createElement("div"); d.className="toast";
  d.style.borderLeftColor = type==='error'?'#ef4444':'#10b981';
  d.textContent = msg;
  document.getElementById("toast-container").appendChild(d);
  setTimeout(()=>d.remove(),3000);
}
function fireConfetti() {
  const c = document.getElementById('confetti-canvas'); const x = c.getContext('2d');
  c.width=window.innerWidth; c.height=window.innerHeight;
  let p=[]; for(let i=0;i<100;i++) p.push({x:Math.random()*c.width,y:Math.random()*c.height-c.height,c:`hsl(${Math.random()*360},100%,50%)`,s:Math.random()*5+2});
  function a(){x.clearRect(0,0,c.width,c.height);p.forEach(o=>{o.y+=o.s;x.fillStyle=o.c;x.fillRect(o.x,o.y,5,5)});if(p.some(o=>o.y<c.height))requestAnimationFrame(a);else x.clearRect(0,0,c.width,c.height);} a();
}

document.getElementById("createCoupleBtn").onclick = async () => { const c=Math.random().toString(36).substring(2,8).toUpperCase(); const {data}=await supabase.from("couples").insert({code:c}).select().single(); await supabase.from("couple_members").insert({couple_id:data.id, user_id:user.id}); initApp(); };
document.getElementById("joinCoupleBtn").onclick = async () => { const c=document.getElementById("joinCode").value.toUpperCase(); const {data:cp}=await supabase.from("couples").select("id").eq("code",c).maybeSingle(); if(cp){ await supabase.from("couple_members").insert({couple_id:cp.id, user_id:user.id}); initApp(); } else showToast("Código inválido", "error"); };
