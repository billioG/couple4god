import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

// ESTADO
let user = null;
let coupleId = null;
let partnerId = null;
let isRegistering = false;
let pollingInterval = null;
let selectedDay = 1;

// CONTENIDO (Resumido para copiar, usa tu lista completa)
const content21Days = {
  1: { tema: "Identidad", lectura: "Salmo 139:14", oracion: "Ayúdame a amarme.", tarea: "Escribe 3 cualidades tuyas." },
  // ... pega tus 21 días aquí ...
  7: { tema: "HITO 1", lectura: "Mateo 7:24", oracion: "Gracias.", tarea: "Celebrar.", premio: "¡Helado juntos! 🍦" },
  14: { tema: "HITO 2", lectura: "Neh 2:18", oracion: "Seguimos.", tarea: "Check-in.", premio: "Noche de cine 🎬" },
  21: { tema: "FINAL", lectura: "Rut 1:16", oracion: "Pacto.", tarea: "Promesa.", premio: "Luna de Miel ❤️" }
};

// --- 1. ONBOARDING ---
function checkOnboarding() {
  if (!localStorage.getItem("intro_done")) {
    document.getElementById("onboarding").classList.remove("hidden");
    return true;
  }
  return false;
}

let slideIndex = 1;
document.getElementById("nextSlideBtn").onclick = () => {
  document.getElementById(`slide${slideIndex}`).classList.remove("active");
  document.getElementById(`dot${slideIndex}`).classList.remove("active");
  slideIndex++;
  if(slideIndex > 3) slideIndex = 3;
  document.getElementById(`slide${slideIndex}`).classList.add("active");
  document.getElementById(`dot${slideIndex}`).classList.add("active");
  if(slideIndex === 3) document.getElementById("nextSlideBtn").classList.add("hidden");
};

document.getElementById("startAppBtn").onclick = () => {
  localStorage.setItem("intro_done", "true");
  document.getElementById("onboarding").classList.add("hidden");
  checkSession();
};

// --- 2. SESIÓN Y AUTH ---
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    user = session.user;
    const name = user.user_metadata?.first_name || "Usuario";
    document.getElementById("userNameDisplay").textContent = `Hola, ${name}`;
    if (!checkOnboarding()) initApp();
  } else {
    showAuthScreen();
  }
});

function showAuthScreen() {
  document.getElementById("userHeader").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");
  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("app").classList.add("hidden");
}

function checkSession() {
  if (user) initApp();
  else showAuthScreen();
}

// TOGGLE LOGIN/REGISTRO
document.getElementById("toggleAuth").onclick = () => {
  isRegistering = !isRegistering;
  const title = document.getElementById("authTitle");
  const btn = document.getElementById("authBtn");
  const nameField = document.getElementById("nameFieldContainer");
  const toggle = document.getElementById("toggleAuth");

  if (isRegistering) {
    title.textContent = "Crear Cuenta Nueva";
    btn.textContent = "Registrarse";
    nameField.classList.remove("hidden");
    toggle.textContent = "¿Ya tienes cuenta? Inicia Sesión";
  } else {
    title.textContent = "Iniciar Sesión";
    btn.textContent = "Ingresar";
    nameField.classList.add("hidden");
    toggle.textContent = "¿No tienes cuenta? Regístrate aquí";
  }
};

document.getElementById("authBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if (!email || !password) return alert("Faltan datos");

  if (isRegistering) {
    const name = document.getElementById("userNameInput").value;
    if (!name) return alert("Escribe tu nombre");
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { first_name: name } }
    });
    if (error) alert(error.message);
    else alert("¡Registro exitoso! Revisa tu correo o intenta ingresar.");
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }
};

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  window.location.reload();
};

// --- 3. LÓGICA DE ESTADOS (Wait Room vs App) ---
async function initApp() {
  document.getElementById("auth").classList.add("hidden");
  
  // Buscar membresía
  const { data: member } = await supabase.from("couple_members").select("couple_id").eq("user_id", user.id).maybeSingle();

  if (!member) {
    // SIN PAREJA -> SETUP
    document.getElementById("setupSection").classList.remove("hidden");
    document.getElementById("setupActions").classList.remove("hidden");
    document.getElementById("waitingRoom").classList.add("hidden");
    return;
  }

  coupleId = member.couple_id;
  document.getElementById("userHeader").classList.remove("hidden");

  // Buscar si hay OTRA persona en la misma pareja
  const { data: partner } = await supabase.from("couple_members")
    .select("user_id")
    .eq("couple_id", coupleId)
    .neq("user_id", user.id)
    .maybeSingle();

  if (partner) {
    // TIENE COMPAÑERO -> APP
    partnerId = partner.user_id;
    document.getElementById("setupSection").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    if (pollingInterval) clearInterval(pollingInterval);
    loadCalendar();
  } else {
    // ESTÁ SOLO -> SALA DE ESPERA
    const { data: couple } = await supabase.from("couples").select("code").eq("id", coupleId).single();
    document.getElementById("setupSection").classList.remove("hidden");
    document.getElementById("setupActions").classList.add("hidden");
    document.getElementById("waitingRoom").classList.remove("hidden");
    document.getElementById("displayCode").textContent = couple.code;
    
    // Polling para detectar cuando llegue la pareja
    if (!pollingInterval) {
      pollingInterval = setInterval(initApp, 5000);
    }
  }
}

// --- 4. ACCIONES CREAR / UNIR ---
document.getElementById("createCoupleBtn").onclick = async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: couple } = await supabase.from("couples").insert({ code }).select().single();
  
  if (couple) {
    await supabase.from("couple_members").insert({ couple_id: couple.id, user_id: user.id });
    initApp(); // Recargará y enviará a Sala de Espera
  }
};

document.getElementById("joinCoupleBtn").onclick = async () => {
  const code = document.getElementById("joinCode").value.trim().toUpperCase();
  const { data: couple } = await supabase.from("couples").select("id").eq("code", code).maybeSingle();
  
  if (couple) {
    const { error } = await supabase.from("couple_members").insert({ couple_id: couple.id, user_id: user.id });
    if (!error) initApp(); // Recargará y enviará a App (porque ya hay pareja)
    else alert("Error al unirse (¿Quizás ya están completos?)");
  } else {
    alert("Código no existe");
  }
};

// --- 5. CALENDARIO Y PROGRESO ---
async function loadCalendar() {
  const { data: entries } = await supabase.from("entries").select("*").eq("couple_id", coupleId);
  
  const myEntries = entries.filter(e => e.user_id === user.id);
  const partnerEntries = entries.filter(e => e.user_id === partnerId);
  
  const myMax = myEntries.length ? Math.max(...myEntries.map(e => e.day)) : 0;
  const partnerMax = partnerEntries.length ? Math.max(...partnerEntries.map(e => e.day)) : 0;
  
  // Regla: Desbloqueo solo si ambos terminaron el anterior
  const jointProgress = Math.min(myMax, partnerMax);
  const unlockableDay = jointProgress + 1;

  // Header status
  const statusEl = document.getElementById("headerStatus");
  if (myMax > partnerMax) statusEl.textContent = "Esperando a tu pareja...";
  else if (myMax < partnerMax) statusEl.textContent = "¡Tu pareja te espera!";
  else statusEl.textContent = "Sincronizados ❤️";

  // Barra
  const pct = (jointProgress / 21) * 100;
  document.getElementById("progressBarFill").style.width = `${pct}%`;
  if(jointProgress>=7) document.getElementById("m7").classList.add("active");
  if(jointProgress>=14) document.getElementById("m14").classList.add("active");
  if(jointProgress>=21) document.getElementById("m21").classList.add("active");

  // Grid
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";
  
  for(let i=1; i<=21; i++) {
    const box = document.createElement("div");
    box.className = "day-box";
    const done = myEntries.find(e => e.day === i);
    const pDone = partnerEntries.some(e => e.day === i);
    
    let icon = "🔒";
    let statusClass = "locked";
    
    if (done) {
      icon = "✅";
      statusClass = "completed";
      if ([7,14,21].includes(i) && pDone) { icon = "🏆"; statusClass = "reward-day"; }
    } else if (i === myMax + 1 && i <= unlockableDay) {
      icon = "🔥";
      statusClass = "active";
    } else if (i === myMax + 1 && i > unlockableDay) {
      icon = "⏳"; // Yo listo, ella no
    }

    box.className = `day-box ${statusClass}`;
    box.innerHTML = `
      <div class="day-number">${i}</div>
      <div style="font-size:1.2rem">${icon}</div>
      <div class="partner-dots">
        <div class="dot me ${done?'done':''}"></div>
        <div class="dot partner ${pDone?'done':''}"></div>
      </div>
    `;
    
    box.onclick = () => openDayModal(i, done, statusClass);
    grid.appendChild(box);
  }
}

// --- 6. MODAL Y GUARDADO ---
function openDayModal(day, entry, status) {
  if (status === "locked" || status === "reward-day") return; // Bloqueado o premio ya visto
  
  // Bloqueo de espera
  if (status !== "active" && status !== "completed") {
    return alert("Tu pareja debe completar los días anteriores.");
  }

  selectedDay = day;
  const d = content21Days[day] || { tema:"...", lectura:"", oracion:"", tarea:"" };
  
  document.getElementById("modalTitle").textContent = `Día ${day}: ${d.tema}`;
  document.getElementById("modalLectura").textContent = d.lectura;
  document.getElementById("modalOracion").textContent = d.oracion;
  document.getElementById("modalTarea").textContent = d.tarea;
  document.getElementById("dayModal").classList.remove("hidden");

  const btn = document.getElementById("saveDayBtn");
  const txt = document.getElementById("dayReflection");

  if (entry) {
    btn.disabled = true;
    btn.textContent = "Completado";
    btn.style.background = "#064e3b";
    txt.value = entry.content || "Sin notas";
    txt.disabled = true;
  } else {
    btn.disabled = false;
    btn.textContent = "Completar";
    btn.style.background = "#3b82f6";
    txt.value = "";
    txt.disabled = false;
  }
}

document.getElementById("saveDayBtn").onclick = async () => {
  const content = document.getElementById("dayReflection").value;
  if(content.length < 5) return alert("Escribe una breve reflexión.");

  const { error } = await supabase.from("entries").insert({
    couple_id: coupleId, user_id: user.id, day: selectedDay, content
  });

  if (!error) {
    document.getElementById("dayModal").classList.add("hidden");
    loadCalendar();
    // Chequear premio
    if ([7,14,21].includes(selectedDay)) {
      const d = content21Days[selectedDay];
      document.getElementById("rewardText").textContent = d.premio;
      document.getElementById("rewardModal").classList.remove("hidden");
    }
  } else {
    alert("Error (asegúrate de haber ejecutado el SQL nuevo en Supabase)");
  }
};

document.getElementById("closeModalBtn").onclick = () => document.getElementById("dayModal").classList.add("hidden");
