import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

// ESTADO
let user = null;
let coupleId = null;
let partnerId = null;
let currentDay = 1;
let selectedDayInModal = 1;

// --- CONTENIDO RENOVADO (Enfoque: Comunicación, Límites, Empatía) ---
const content21Days = {
  1: { tema: "Identidad", lectura: "Salmo 139:14", oracion: "Ayúdame a amarme para poder amar bien.", tarea: "Escribe en una nota 3 cosas que admiras de ti mismo/a y léelas antes de dormir." },
  2: { tema: "Escucha Activa", lectura: "Santiago 1:19", oracion: "Señor, cierra mi boca y abre mi oído.", tarea: "En la próxima charla, espera 3 segundos antes de responder. No interrumpas." },
  3: { tema: "Validación", lectura: "Romanos 12:15", oracion: "Que yo sienta lo que mi pareja siente.", tarea: "Pregunta: '¿Te sientes escuchado/a por mí últimamente?' Solo escucha la respuesta, no te defiendas." },
  4: { tema: "Límites Sanos", lectura: "Proverbios 25:28", oracion: "Dame valor para decir 'no' con amor.", tarea: "Identifica algo pequeño que haces por obligación y di 'no' o negocia una alternativa hoy." },
  5: { tema: "Lenguajes de Amor", lectura: "1 Juan 3:18", oracion: "Enséñame a amar como el otro necesita.", tarea: "Pregunta a tu pareja: '¿Qué puedo hacer hoy para que te sientas amado/a?' y hazlo." },
  6: { tema: "Respeto al Enojo", lectura: "Efesios 4:26", oracion: "Que mi ira no destruya.", tarea: "Si hay tensión, usen la palabra clave 'PAUSA'. Tómense 15 min separados antes de seguir hablando." },
  7: { tema: "Seguridad", lectura: "1 Juan 4:18", oracion: "Echa fuera el temor de nuestra relación.", tarea: "Mírala/o a los ojos y di: 'Estoy contigo en este equipo, no contra ti'." },
  8: { tema: "Comunicación Clara", lectura: "Mateo 5:37", oracion: "Que mi sí sea sí.", tarea: "No uses indirectas hoy. Pide lo que necesitas claramente (ej. 'Necesito un abrazo', no 'Nadie me quiere')." },
  9: { tema: "Empatía Profunda", lectura: "1 Pedro 3:8", oracion: "Ablanda mi corazón.", tarea: "Cuando tu pareja te cuente un problema, no des soluciones. Solo di: 'Debe ser difícil sentirse así, lo siento'." },
  10: { tema: "Perdón Rápido", lectura: "Colosenses 3:13", oracion: "Límpiame de rencor.", tarea: "Identifica una pequeña ofensa reciente y di: 'Decido perdonar esto y no volver a mencionarlo'." },
  11: { tema: "Espacio Personal", lectura: "Marcos 1:35", oracion: "Encuéntrame en el silencio.", tarea: "Regálense 1 hora de tiempo libre individual sin culpa. Al volver, agradézcanse el espacio." },
  12: { tema: "Gratitud", lectura: "1 Tes 5:18", oracion: "Abre mis ojos a lo bueno.", tarea: "Envía un mensaje de texto agradeciendo algo específico que tu pareja hizo ayer." },
  13: { tema: "Contacto Físico", lectura: "Cantares 2:6", oracion: "Santifica nuestro contacto.", tarea: "Dense un abrazo de 20 segundos sin decir nada. Solo respiren juntos." },
  14: { tema: "Check-in Semanal", lectura: "Amós 3:3", oracion: "Alinea nuestros pasos.", tarea: "Pregunta: '¿Hay algo que hice esta semana que te lastimó inconscientemente?'." },
  15: { tema: "Manejo de Crítica", lectura: "Proverbios 15:1", oracion: "Suaviza mis palabras.", tarea: "Usa la técnica 'Sandwich': Elogio + Petición de cambio + Elogio." },
  16: { tema: "Servicio", lectura: "Gálatas 5:13", oracion: "Quiero servir, no ser servido.", tarea: "Haz una tarea doméstica que usualmente hace tu pareja, sin que te lo pida y sin esperar aplausos." },
  17: { tema: "Sueños Juntos", lectura: "Habacuc 2:2", oracion: "Aviva nuestra visión.", tarea: "Dediquen 10 min a hablar del futuro: '¿Cómo nos gustaría estar en 5 años?'." },
  18: { tema: "Vulnerabilidad", lectura: "2 Cor 12:9", oracion: "Quita mi armadura.", tarea: "Confiesa un miedo o inseguridad que no suelas decir. 'A veces temo que...'." },
  19: { tema: "Límites Digitales", lectura: "Salmo 101:3", oracion: "Que nada nos distraiga.", tarea: "Cenen sin celulares. Cero pantallas durante 40 minutos. Mírense." },
  20: { tema: "Celebración", lectura: "Filipenses 4:4", oracion: "Restaura nuestro gozo.", tarea: "Pongan una canción que les guste y bailen o canten juntos (aunque sea ridículo)." },
  21: { tema: "Compromiso", lectura: "Rut 1:16", oracion: "Donde tú vayas, iré.", tarea: "Renueven su compromiso: Escribe una nueva promesa corta para esta nueva etapa y léesela." }
};

// --- AUTH & INIT ---
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    user = session.user;
    // Mostrar header SOLO cuando hay sesión
    document.getElementById("userEmailDisplay").textContent = user.email.split('@')[0];
    document.getElementById("userHeader").classList.remove("hidden");
    document.getElementById("auth").classList.add("hidden");
    await checkStatus();
  } else {
    user = null;
    // Ocultar header si no hay sesión
    document.getElementById("userHeader").classList.add("hidden");
    document.getElementById("auth").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    document.getElementById("coupleSetup").classList.add("hidden");
  }
});

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  window.location.reload(); // Recarga para limpiar estados visuales
};

async function checkStatus() {
  const { data: member } = await supabase.from("couple_members").select("couple_id").eq("user_id", user.id).maybeSingle();

  if (member) {
    coupleId = member.couple_id;
    // Buscar compañero
    const { data: partner } = await supabase.from("couple_members")
      .select("user_id")
      .eq("couple_id", coupleId).neq("user_id", user.id).maybeSingle();
      
    partnerId = partner ? partner.user_id : null;
    updatePartnerHeaderStatus();

    await loadProgress();
    document.getElementById("coupleSetup").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
  } else {
    document.getElementById("coupleSetup").classList.remove("hidden");
  }
}

async function updatePartnerHeaderStatus() {
  const el = document.getElementById("partnerStatusText");
  if (!partnerId) {
    el.textContent = "⏳ Esperando pareja...";
    el.style.color = "#fbbf24";
  } else {
    // Ver si pareja completó el día actual
    const { data } = await supabase.from("entries").select("day").eq("user_id", partnerId).eq("day", currentDay).maybeSingle();
    if (data) {
      el.textContent = `✅ Pareja completó el día ${currentDay}`;
      el.style.color = "#4ade80";
    } else {
      el.textContent = "💤 Pareja pendiente";
      el.style.color = "#94a3b8";
    }
  }
}

// --- LÓGICA DEL CALENDARIO (ADVIENTO) ---
async function loadProgress() {
  // Ver cuál es el último día completado
  const { data: entries } = await supabase.from("entries")
    .select("day")
    .eq("user_id", user.id)
    .order("day", { ascending: false });
    
  // Si tengo entradas, mi día actual es el último + 1. Si no, es el 1.
  const lastCompleted = (entries && entries.length > 0) ? entries[0].day : 0;
  currentDay = lastCompleted + 1;

  renderCalendar(lastCompleted);
}

function renderCalendar(lastCompleted) {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  // Crear 21 días
  for (let i = 1; i <= 21; i++) {
    const box = document.createElement("div");
    box.className = "day-box";
    
    let statusIcon = "🔒";
    
    if (i <= lastCompleted) {
      // Día pasado (completado)
      box.classList.add("completed");
      statusIcon = "✅";
      box.onclick = () => openModal(i, "completed");
    } else if (i === currentDay) {
      // Día actual (activo)
      box.classList.add("active");
      statusIcon = "🔥";
      box.onclick = () => openModal(i, "active");
    } else {
      // Día futuro (bloqueado)
      box.classList.add("locked");
      statusIcon = "🔒";
      box.onclick = () => {
        // Efecto de vibración o alerta simple
        alert("Completa los días anteriores para desbloquear este nivel.");
      };
    }

    box.innerHTML = `
      <div class="day-number">${i}</div>
      <div class="day-status">${statusIcon}</div>
    `;
    grid.appendChild(box);
  }
}

// --- MODAL ---
function openModal(day, status) {
  const d = content21Days[day] || { tema: "Fin", lectura: "", oracion: "", tarea: "¡Felicidades!" };
  selectedDayInModal = day;

  document.getElementById("modalTitle").textContent = `Día ${day}: ${d.tema}`;
  document.getElementById("modalLectura").textContent = d.lectura;
  document.getElementById("modalOracion").textContent = d.oracion;
  document.getElementById("modalTarea").textContent = d.tarea;

  const btn = document.getElementById("completeDayBtn");
  
  if (status === "completed") {
    btn.textContent = "Ya completado ✅";
    btn.disabled = true;
    btn.style.background = "#064e3b";
  } else {
    btn.textContent = "Marcar como Completado";
    btn.disabled = false;
    btn.style.background = "#3b82f6";
  }

  document.getElementById("dayModal").classList.remove("hidden");
}

document.getElementById("closeModalBtn").onclick = () => {
  document.getElementById("dayModal").classList.add("hidden");
};

// --- COMPLETAR DÍA ---
document.getElementById("completeDayBtn").onclick = async () => {
  const { error } = await supabase.from("entries").insert({
    couple_id: coupleId,
    user_id: user.id,
    day: selectedDayInModal
  });

  if (!error) {
    document.getElementById("dayModal").classList.add("hidden");
    alert("¡Excelente! Día registrado.");
    // Recargar calendario
    await loadProgress(); 
    updatePartnerHeaderStatus();
  } else {
    alert("Error al guardar (o ya lo completaste).");
  }
};

// --- LOGINS / REGISTRO (Igual que antes) ---
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if(!email || !password) return alert("Faltan datos");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) alert(error.message);
    else alert("Usuario creado. ¡Bienvenido!");
  }
};

document.getElementById("createCoupleBtn").onclick = async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data } = await supabase.from("couples").insert({ code }).select().single();
  if (data) {
    await supabase.from("couple_members").insert({ couple_id: data.id, user_id: user.id });
    document.getElementById("coupleCode").textContent = code;
    document.getElementById("coupleCodeBox").classList.remove("hidden");
    checkStatus();
  }
};

document.getElementById("joinCoupleBtn").onclick = async () => {
  const code = document.getElementById("joinCode").value.trim().toUpperCase();
  const { data: cp } = await supabase.from("couples").select("id").eq("code", code).maybeSingle();
  if (cp) {
    const { error } = await supabase.from("couple_members").insert({ couple_id: cp.id, user_id: user.id });
    if (!error) checkStatus();
    else alert("Error al unirse.");
  } else alert("Código inválido");
};
