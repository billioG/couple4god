import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

// VARIABLES
let user = null;
let coupleId = null;
let partnerId = null;
let myMaxDay = 0;
let partnerMaxDay = 0;
let unlockableDay = 1;
let selectedDayInModal = 1;

// CONTENIDO COMPLETO (Simplificado para el ejemplo, usa tu lista completa)
const content21Days = {
  1: { tema: "Identidad", lectura: "Salmo 139:14", oracion: "Ayúdame a amarme para poder amar bien.", tarea: "Escribe 3 cualidades que admiras de ti mismo/a." },
  // ... Pega aquí todo tu contenido anterior de los 21 días ...
  7: { tema: "PREMIO", lectura: "Mateo 7:24", oracion: "Gracias Dios.", tarea: "Cita de helado.", premio: "¡Semana 1 superada! Disfruten un helado juntos. 🍦" },
  14: { tema: "PREMIO", lectura: "Neh 2:18", oracion: "Edificamos.", tarea: "Check-in.", premio: "¡Semana 2 lista! Noche de películas. 🎬" },
  21: { tema: "FINAL", lectura: "Rut 1:16", oracion: "Pacto eterno.", tarea: "Promesa nueva.", premio: "¡Lo lograron! Segunda Luna de Miel. ❤️" }
};
// Nota: Asegúrate de tener los 21 días definidos en el objeto content21Days para que no dé error.

// --- AUTH & INIT ---
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    user = session.user;
    // 4. Mostrar Nombre (Metadatos o fallback a email)
    const displayName = user.user_metadata?.first_name || user.email.split('@')[0];
    document.getElementById("userNameDisplay").textContent = `Hola, ${displayName}`;
    
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("globalLoader").classList.remove("hidden");
    await initApp();
  } else {
    resetState();
  }
});

function resetState() {
  user = null;
  coupleId = null;
  partnerId = null;
  document.getElementById("userHeader").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("coupleSetup").classList.add("hidden");
  document.getElementById("globalLoader").classList.add("hidden");
}

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  window.location.reload();
};

// --- LOGIN CON NOMBRE ---
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("userNameInput").value; // Nuevo campo

  if(!email || !password) return alert("Faltan datos");

  // Intento de Login
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    // Si falla, intentamos Registro
    if (!name) return alert("Para registrarte por primera vez, escribe tu nombre.");
    
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: name } // Guardamos el nombre aquí
      }
    });

    if (signUpError) alert(signUpError.message);
    else alert("¡Bienvenido! Ya estás registrado.");
  }
};

// --- LÓGICA APP ---
async function initApp() {
  try {
    const { data: member } = await supabase.from("couple_members").select("couple_id").eq("user_id", user.id).maybeSingle();
    document.getElementById("globalLoader").classList.add("hidden");

    if (!member) {
      document.getElementById("coupleSetup").classList.remove("hidden");
      document.getElementById("userHeader").classList.add("hidden");
      return;
    }

    coupleId = member.couple_id;
    document.getElementById("userHeader").classList.remove("hidden");

    const { data: partner } = await supabase.from("couple_members")
      .select("user_id")
      .eq("couple_id", coupleId).neq("user_id", user.id).maybeSingle();
    
    partnerId = partner ? partner.user_id : null;

    await refreshData();
    document.getElementById("coupleSetup").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

  } catch (err) {
    console.error(err);
  }
}

async function refreshData() {
  const { data: entries } = await supabase.from("entries").select("*").eq("couple_id", coupleId);

  const myEntries = entries.filter(e => e.user_id === user.id);
  const partnerEntries = entries.filter(e => e.user_id === partnerId);

  myMaxDay = myEntries.length ? Math.max(...myEntries.map(e => e.day)) : 0;
  partnerMaxDay = partnerEntries.length ? Math.max(...partnerEntries.map(e => e.day)) : 0;

  // Lógica de Desbloqueo Conjunto
  const jointProgress = Math.min(myMaxDay, partnerMaxDay);
  unlockableDay = jointProgress + 1; 

  updateHeaderStatus();
  updateProgressBar(jointProgress); // Barra basada en progreso conjunto
  renderCalendar(myEntries, partnerEntries);
}

// 1. BARRA DE PROGRESO
function updateProgressBar(completedDays) {
  const percent = (completedDays / 21) * 100;
  document.getElementById("progressBarFill").style.width = `${percent}%`;

  // Activar emojis
  if (completedDays >= 7) document.getElementById("m7").classList.add("active");
  if (completedDays >= 14) document.getElementById("m14").classList.add("active");
  if (completedDays >= 21) document.getElementById("m21").classList.add("active");
}

function updateHeaderStatus() {
  const el = document.getElementById("partnerStatusText");
  if (!partnerId) {
    el.textContent = "Esperando pareja...";
    el.style.color = "#fbbf24";
  } else if (myMaxDay > partnerMaxDay) {
    el.textContent = `Tu pareja va por el día ${partnerMaxDay}. ¡Anímala!`;
    el.style.color = "#fbbf24";
  } else if (myMaxDay < partnerMaxDay) {
    el.textContent = `Tu pareja te espera en el día ${partnerMaxDay + 1}.`;
    el.style.color = "#34d399";
  } else {
    el.textContent = "Sincronizados ❤️";
    el.style.color = "#60a5fa";
  }
}

function renderCalendar(myEntries, partnerEntries) {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  for (let i = 1; i <= 21; i++) {
    const box = document.createElement("div");
    box.className = "day-box";
    
    const iCompleted = myEntries.find(e => e.day === i); // Buscamos el objeto entry completo
    const partnerCompleted = partnerEntries.some(e => e.day === i);
    
    let statusIcon = "";
    let isLocked = true;

    if (iCompleted) {
      box.classList.add("completed");
      statusIcon = "✅";
      isLocked = false; 
      // Si ambos terminaron un hito
      if ([7, 14, 21].includes(i) && partnerCompleted) {
        box.classList.add("reward-day");
        statusIcon = "🏆";
      }
    } else {
      // Bloqueo estricto: Solo desbloquear si es el siguiente Y si unlockable lo permite
      if (i === myMaxDay + 1 && i <= unlockableDay) {
         box.classList.add("active");
         statusIcon = "🔥";
         isLocked = false;
      } else {
         box.classList.add("locked");
         statusIcon = "🔒";
         isLocked = true;
      }
    }

    // Pasamos el contenido de la reflexión si existe
    const reflectionText = iCompleted ? iCompleted.content : "";
    box.onclick = () => handleDayClick(i, !!iCompleted, isLocked, reflectionText);

    const dotsHtml = `
      <div class="partner-dots">
        <div class="dot me ${iCompleted ? 'done' : ''}"></div>
        <div class="dot partner ${partnerCompleted ? 'done' : ''}"></div>
      </div>
    `;
    box.innerHTML = `<div class="day-number">${i}</div><div style="font-size:1.2rem">${statusIcon}</div>${dotsHtml}`;
    grid.appendChild(box);
  }
}

// 2. MANEJO ESTRICTO DEL MODAL Y EVIDENCIA
async function handleDayClick(day, isCompleted, isLocked, existingReflection) {
  // BLOQUEO REAL: Si está bloqueado, NO hacemos nada.
  if (isLocked) {
    alert("🔒 Debes completar los días anteriores junto a tu pareja para avanzar.");
    return; // Sale de la función, no abre modal.
  }

  selectedDayInModal = day;
  const d = content21Days[day] || { tema: "Cargando", lectura: "...", tarea: "..." };
  
  document.getElementById("modalTitle").textContent = `Día ${day}: ${d.tema}`;
  document.getElementById("modalLectura").textContent = d.lectura;
  document.getElementById("modalOracion").textContent = d.oracion;
  document.getElementById("modalTarea").textContent = d.tarea;

  const reflectionInput = document.getElementById("dayReflection");
  const btn = document.getElementById("completeDayBtn");
  const evidenceSection = document.getElementById("evidenceSection");

  if (isCompleted) {
    btn.textContent = "Día Completado";
    btn.disabled = true;
    btn.style.background = "#064e3b";
    
    // Mostrar lo que escribió (Solo lectura)
    evidenceSection.style.display = "block";
    reflectionInput.value = existingReflection || "Sin notas.";
    reflectionInput.disabled = true;

    if ([7, 14, 21].includes(day)) showReward(day);
  } else {
    // Validar fecha (1 por día)
    const canDoToday = await checkDateRestriction();
    
    if (!canDoToday) {
        btn.textContent = "Vuelve mañana 🌙";
        btn.disabled = true;
        btn.style.background = "#475569";
        evidenceSection.style.display = "none";
    } else {
        btn.textContent = "Guardar y Completar";
        btn.disabled = false;
        btn.style.background = "#3b82f6";
        evidenceSection.style.display = "block";
        reflectionInput.value = "";
        reflectionInput.disabled = false;
    }
  }
  
  document.getElementById("dayModal").classList.remove("hidden");
}

async function checkDateRestriction() {
  const { data: entries } = await supabase.from("entries")
    .select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);

  if (entries && entries.length > 0) {
    return new Date(entries[0].created_at).toDateString() !== new Date().toDateString();
  }
  return true;
}

// 3. COMPLETAR CON EVIDENCIA
document.getElementById("completeDayBtn").onclick = async () => {
  const reflection = document.getElementById("dayReflection").value.trim();
  
  // Validación: Campo obligatorio
  if (reflection.length < 5) {
    alert("⚠️ Por favor escribe una breve reflexión sobre la tarea para continuar.");
    return;
  }

  const { error } = await supabase.from("entries").insert({
    couple_id: coupleId,
    user_id: user.id,
    day: selectedDayInModal,
    content: reflection // Guardamos la evidencia aquí
  });

  if (!error) {
    document.getElementById("dayModal").classList.add("hidden");
    if ([7, 14, 21].includes(selectedDayInModal)) showReward(selectedDayInModal);
    else alert("¡Reflexión guardada! Gran trabajo.");
    await refreshData();
  } else {
    alert("Error al guardar.");
  }
};

function showReward(day) {
  const d = content21Days[day];
  if (d && d.premio) {
    document.getElementById("rewardText").textContent = d.premio;
    document.getElementById("rewardModal").classList.remove("hidden");
  }
}

// Cierre de modales
document.querySelectorAll(".close-modal").forEach(btn => {
  btn.onclick = () => {
    document.getElementById("dayModal").classList.add("hidden");
    document.getElementById("rewardModal").classList.add("hidden");
  };
});

// Create/Join functions (Iguales que antes)
document.getElementById("createCoupleBtn").onclick = async () => { /* ... Copia tu lógica anterior ... */ 
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data } = await supabase.from("couples").insert({ code }).select().single();
  if (data) {
    await supabase.from("couple_members").insert({ couple_id: data.id, user_id: user.id });
    document.getElementById("coupleCode").textContent = code;
    document.getElementById("coupleCodeBox").classList.remove("hidden");
    initApp();
  }
};
document.getElementById("joinCoupleBtn").onclick = async () => { /* ... Copia tu lógica anterior ... */
  const code = document.getElementById("joinCode").value.trim().toUpperCase();
  const { data: cp } = await supabase.from("couples").select("id").eq("code", code).maybeSingle();
  if (cp) {
    const { error } = await supabase.from("couple_members").insert({ couple_id: cp.id, user_id: user.id });
    if (!error) initApp();
    else alert("Error al unirse.");
  } else alert("Código inválido");
};
