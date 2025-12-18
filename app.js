import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

// ESTADO GLOBAL
let user = null;
let coupleId = null;
let partnerId = null;
let myMaxDay = 0;
let partnerMaxDay = 0;
let unlockableDay = 1;
let selectedDayInModal = 1;
let isRegisterMode = false; // Controla Login vs Registro
let waitInterval = null; // Para esperar a la pareja

// CONTENIDO 21 DÍAS
const content21Days = {
  1: { tema: "Identidad", lectura: "Salmo 139:14", oracion: "Ayúdame a amarme para poder amar bien.", tarea: "Escribe 3 cualidades que admiras de ti mismo/a." },
  // ... (Agrega el resto de tus días aquí) ...
  7: { tema: "PREMIO", lectura: "Mateo 7:24", oracion: "Gracias Dios.", tarea: "Cita de helado.", premio: "¡Semana 1 superada! 🍦" },
  14: { tema: "PREMIO", lectura: "Neh 2:18", oracion: "Edificamos.", tarea: "Check-in.", premio: "¡Semana 2 lista! 🎬" },
  21: { tema: "FINAL", lectura: "Rut 1:16", oracion: "Pacto eterno.", tarea: "Promesa nueva.", premio: "¡Lo lograron! Segunda Luna de Miel. ❤️" }
};

// --- ONBOARDING LOGIC ---
function checkOnboarding() {
  const done = localStorage.getItem("onboarding_done");
  if (!done) {
    document.getElementById("onboarding").classList.remove("hidden");
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("globalLoader").classList.add("hidden");
    return true; // Estamos en onboarding
  }
  return false; // Ya lo hizo
}

let currentSlide = 1;
document.getElementById("nextSlideBtn").onclick = () => {
  document.getElementById(`slide${currentSlide}`).classList.add("hidden");
  document.getElementById(`d${currentSlide}`).classList.remove("active");
  currentSlide++;
  if(currentSlide > 3) currentSlide = 3;
  
  document.getElementById(`slide${currentSlide}`).classList.remove("hidden");
  document.getElementById(`d${currentSlide}`).classList.add("active");
  
  if (currentSlide === 3) document.getElementById("nextSlideBtn").classList.add("hidden");
};

document.getElementById("finishOnboardingBtn").onclick = () => {
  localStorage.setItem("onboarding_done", "true");
  document.getElementById("onboarding").classList.add("hidden");
  // Verificar si hay sesión
  if (user) initApp();
  else showAuth();
};

// --- AUTH STATE ---
supabase.auth.onAuthStateChange(async (event, session) => {
  if (checkOnboarding()) return; // Si está en onboarding, no hacer nada aún

  if (session) {
    user = session.user;
    const name = user.user_metadata?.first_name || "Usuario";
    document.getElementById("userNameDisplay").textContent = `Hola, ${name}`;
    document.getElementById("globalLoader").classList.remove("hidden");
    document.getElementById("auth").classList.add("hidden");
    await initApp();
  } else {
    showAuth();
  }
});

function showAuth() {
  user = null;
  document.getElementById("userHeader").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("coupleSetup").classList.add("hidden");
  document.getElementById("globalLoader").classList.add("hidden");
}

// --- TOGGLE LOGIN / REGISTER ---
document.getElementById("toggleAuthBtn").onclick = () => {
  isRegisterMode = !isRegisterMode;
  const title = document.getElementById("authTitle");
  const btn = document.getElementById("authBtn");
  const toggle = document.getElementById("toggleAuthBtn");
  const nameField = document.getElementById("registerFields");

  if (isRegisterMode) {
    title.textContent = "Crear Cuenta";
    btn.textContent = "Registrarse";
    toggle.textContent = "¿Ya tienes cuenta? Ingresa";
    nameField.classList.remove("hidden");
  } else {
    title.textContent = "Iniciar Sesión";
    btn.textContent = "Ingresar";
    toggle.textContent = "¿No tienes cuenta? Regístrate";
    nameField.classList.add("hidden");
  }
};

document.getElementById("authBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if (!email || !password) return alert("Completa email y contraseña");

  if (isRegisterMode) {
    // REGISTRO
    const name = document.getElementById("userNameInput").value;
    if (!name) return alert("Por favor escribe tu nombre");
    
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: name } }
    });
    if (error) alert(error.message);
    else alert("¡Registro exitoso! Ya puedes ingresar."); // A veces auto-loguea, a veces no.
    
  } else {
    // LOGIN
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error: " + error.message);
  }
};

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  window.location.reload();
};

// --- INIT APP LOGIC ---
async function initApp() {
  try {
    const { data: member } = await supabase.from("couple_members").select("couple_id").eq("user_id", user.id).maybeSingle();
    document.getElementById("globalLoader").classList.add("hidden");

    if (!member) {
      // Usuario nuevo SIN pareja
      document.getElementById("coupleSetup").classList.remove("hidden");
      document.getElementById("setupButtons").classList.remove("hidden");
      document.getElementById("waitingRoom").classList.add("hidden");
      document.getElementById("userHeader").classList.add("hidden");
      return;
    }

    coupleId = member.couple_id;
    document.getElementById("userHeader").classList.remove("hidden");

    // Buscar compañero
    const { data: partner } = await supabase.from("couple_members")
      .select("user_id")
      .eq("couple_id", coupleId).neq("user_id", user.id).maybeSingle();
    
    if (partner) {
      // SI TIENE PAREJA -> APP
      partnerId = partner.user_id;
      if (waitInterval) clearInterval(waitInterval); // Detener espera
      document.getElementById("coupleSetup").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      await refreshData();
    } else {
      // NO TIENE PAREJA (Pero ya creó código) -> SALA DE ESPERA
      const { data: couple } = await supabase.from("couples").select("code").eq("id", coupleId).single();
      showWaitingRoom(couple.code);
    }

  } catch (err) {
    console.error(err);
    alert("Error cargando datos. Revisa tu conexión.");
  }
}

// --- WAITING ROOM LOGIC ---
function showWaitingRoom(code) {
  document.getElementById("coupleSetup").classList.remove("hidden");
  document.getElementById("setupButtons").classList.add("hidden"); // Ocultar botones iniciales
  document.getElementById("waitingRoom").classList.remove("hidden"); // Mostrar código grande
  document.getElementById("generatedCode").textContent = code;
  
  // Iniciar polling para detectar cuando se una
  if (waitInterval) clearInterval(waitInterval);
  waitInterval = setInterval(async () => {
    const { data: partner } = await supabase.from("couple_members")
      .select("user_id")
      .eq("couple_id", coupleId).neq("user_id", user.id).maybeSingle();
      
    if (partner) {
      clearInterval(waitInterval);
      initApp(); // Recargar todo para entrar a la app
    }
  }, 5000); // Revisar cada 5 segundos
}

// --- CREATE / JOIN ---
document.getElementById("createCoupleBtn").onclick = async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: couple, error } = await supabase.from("couples").insert({ code }).select().single();
  
  if (error) return alert("Error creando código");

  await supabase.from("couple_members").insert({ couple_id: couple.id, user_id: user.id });
  
  coupleId = couple.id;
  // EN LUGAR DE initApp(), mostramos la sala de espera directamente
  showWaitingRoom(code);
};

document.getElementById("joinCoupleBtn").onclick = async () => {
  const code = document.getElementById("joinCode").value.trim().toUpperCase();
  // 1. Validar código
  const { data: couple } = await supabase.from("couples").select("id").eq("code", code).maybeSingle();
  
  if (!couple) return alert("Código no encontrado");

  // 2. Unirse
  const { error } = await supabase.from("couple_members").insert({ couple_id: couple.id, user_id: user.id });
  
  if (!error) {
    // Éxito: recargar app (esto detectará la pareja y entrará al tablero)
    initApp(); 
  } else {
    alert("No pudimos unirte. ¿Quizás ya está lleno el equipo?");
  }
};

// --- DATA & CALENDAR ---
async function refreshData() {
  const { data: entries } = await supabase.from("entries").select("*").eq("couple_id", coupleId);

  const myEntries = entries.filter(e => e.user_id === user.id);
  const partnerEntries = entries.filter(e => e.user_id === partnerId);

  myMaxDay = myEntries.length ? Math.max(...myEntries.map(e => e.day)) : 0;
  partnerMaxDay = partnerEntries.length ? Math.max(...partnerEntries.map(e => e.day)) : 0;

  const jointProgress = Math.min(myMaxDay, partnerMaxDay);
  unlockableDay = jointProgress + 1; 

  updateProgressBar(jointProgress);
  renderCalendar(myEntries, partnerEntries);
}

function updateProgressBar(val) {
  const percent = (val / 21) * 100;
  document.getElementById("progressBarFill").style.width = `${percent}%`;
  if (val >= 7) document.getElementById("m7").classList.add("active");
  if (val >= 14) document.getElementById("m14").classList.add("active");
  if (val >= 21) document.getElementById("m21").classList.add("active");
}

function renderCalendar(myEntries, partnerEntries) {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  for (let i = 1; i <= 21; i++) {
    const box = document.createElement("div");
    box.className = "day-box";
    const iCompleted = myEntries.find(e => e.day === i);
    const partnerCompleted = partnerEntries.some(e => e.day === i);
    let isLocked = true;
    let statusIcon = "🔒";

    if (iCompleted) {
      box.classList.add("completed");
      statusIcon = "✅";
      isLocked = false;
      if ([7, 14, 21].includes(i) && partnerCompleted) {
        box.classList.add("reward-day");
        statusIcon = "🏆";
      }
    } else if (i === myMaxDay + 1 && i <= unlockableDay) {
      box.classList.add("active");
      statusIcon = "🔥";
      isLocked = false;
    } else if (i === myMaxDay + 1 && i > unlockableDay) {
      statusIcon = "⏳"; // Esperando pareja
    }

    const reflection = iCompleted ? iCompleted.content : "";
    box.onclick = () => handleDayClick(i, !!iCompleted, isLocked, reflection);

    box.innerHTML = `
      <div class="day-number">${i}</div>
      <div style="font-size:1.2rem">${statusIcon}</div>
      <div class="partner-dots">
        <div class="dot me ${iCompleted?'done':''}"></div>
        <div class="dot partner ${partnerCompleted?'done':''}"></div>
      </div>
    `;
    grid.appendChild(box);
  }
}

// --- MODAL HANDLING ---
async function handleDayClick(day, isCompleted, isLocked, existingReflection) {
  if (isLocked) {
    if(day > myMaxDay + 1) return alert("Completa los anteriores.");
    if(day > unlockableDay) return alert("Tu pareja debe completar los días anteriores.");
    return;
  }

  selectedDayInModal = day;
  const d = content21Days[day] || { tema: "Cargando...", lectura:"", oracion:"", tarea:"" };
  
  document.getElementById("modalTitle").textContent = `Día ${day}: ${d.tema}`;
  document.getElementById("modalLectura").textContent = d.lectura;
  document.getElementById("modalOracion").textContent = d.oracion;
  document.getElementById("modalTarea").textContent = d.tarea;

  const refInput = document.getElementById("dayReflection");
  const btn = document.getElementById("completeDayBtn");
  const evSection = document.getElementById("evidenceSection");

  if (isCompleted) {
    btn.textContent = "Día Completado";
    btn.disabled = true;
    btn.style.background = "#064e3b";
    evSection.style.display = "block";
    refInput.value = existingReflection || "Sin notas";
    refInput.disabled = true;
    if([7,14,21].includes(day)) showReward(day);
  } else {
    const canDo = await checkDateRestriction();
    if (!canDo) {
      btn.textContent = "Vuelve mañana 🌙";
      btn.disabled = true;
      btn.style.background = "#475569";
      evSection.style.display = "none";
    } else {
      btn.textContent = "Guardar";
      btn.disabled = false;
      btn.style.background = "#3b82f6";
      evSection.style.display = "block";
      refInput.value = "";
      refInput.disabled = false;
    }
  }
  document.getElementById("dayModal").classList.remove("hidden");
}

async function checkDateRestriction() {
  const { data } = await supabase.from("entries").select("created_at").eq("user_id", user.id).order("created_at", {ascending:false}).limit(1);
  if(data && data.length > 0) {
    return new Date(data[0].created_at).toDateString() !== new Date().toDateString();
  }
  return true;
}

document.getElementById("completeDayBtn").onclick = async () => {
  const ref = document.getElementById("dayReflection").value.trim();
  if(ref.length < 3) return alert("Escribe una pequeña reflexión.");
  
  const { error } = await supabase.from("entries").insert({
    couple_id: coupleId, user_id: user.id, day: selectedDayInModal, content: ref
  });
  
  if(!error) {
    document.getElementById("dayModal").classList.add("hidden");
    if([7,14,21].includes(selectedDayInModal)) showReward(selectedDayInModal);
    else alert("¡Guardado!");
    await refreshData();
  } else alert("Error guardando");
};

function showReward(day) {
  const d = content21Days[day];
  if(d.premio) {
    document.getElementById("rewardText").textContent = d.premio;
    document.getElementById("rewardModal").classList.remove("hidden");
  }
}

// Cierre de modales
document.querySelectorAll(".close-modal").forEach(b => b.onclick = () => {
  document.getElementById("dayModal").classList.add("hidden");
  document.getElementById("rewardModal").classList.add("hidden");
});
