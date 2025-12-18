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

// CONTENIDO COMPLETO (21 Días)
const content21Days = {
  1: { tema: "Identidad", lectura: "Salmo 139:14", oracion: "Ayúdame a amarme para poder amar bien.", tarea: "Escribe 3 cualidades que admiras de ti mismo/a." },
  2: { tema: "Escucha Activa", lectura: "Santiago 1:19", oracion: "Señor, cierra mi boca y abre mi oído.", tarea: "En la próxima charla, espera 3 segundos antes de responder." },
  3: { tema: "Validación", lectura: "Romanos 12:15", oracion: "Que yo sienta lo que mi pareja siente.", tarea: "Pregunta: '¿Te sientes escuchado/a por mí?' Solo escucha." },
  4: { tema: "Límites", lectura: "Prov 25:28", oracion: "Dame valor para decir 'no' con amor.", tarea: "Identifica algo que haces por obligación y negocia una alternativa." },
  5: { tema: "Lenguajes Amor", lectura: "1 Juan 3:18", oracion: "Enséñame a amar como necesitas.", tarea: "Pregunta: '¿Qué puedo hacer hoy para que te sientas amado/a?'" },
  6: { tema: "Pausa", lectura: "Efesios 4:26", oracion: "Que mi ira no destruya.", tarea: "Si hay tensión, usen la palabra clave 'PAUSA' y sepárense 15 min." },
  7: { tema: "PREMIO: Cimientos", lectura: "Mateo 7:24", oracion: "Gracias por esta primer semana.", tarea: "Celebración: Compartan su postre favorito juntos.", premio: "¡Han construido los cimientos! La primer semana es la más difícil. Disfruten una cita de helado." },
  
  // Semana 2
  8: { tema: "Verdad", lectura: "Efesios 4:15", oracion: "Hablar verdad en amor.", tarea: "No uses indirectas hoy. Pide lo que necesitas claramente." },
  9: { tema: "Empatía", lectura: "1 Pedro 3:8", oracion: "Ablanda mi corazón.", tarea: "Ante un problema de ella/el, no des soluciones. Di: 'Debe ser difícil, lo siento'." },
  10: { tema: "Perdón", lectura: "Col 3:13", oracion: "Límpiame de rencor.", tarea: "Identifica una pequeña ofensa reciente y decide perdonarla hoy." },
  11: { tema: "Soledad", lectura: "Marcos 1:35", oracion: "Encuéntrame en el silencio.", tarea: "Regálense 1 hora individual. Al volver, agradézcanse el espacio." },
  12: { tema: "Gratitud", lectura: "1 Tes 5:18", oracion: "Abre mis ojos a lo bueno.", tarea: "Envía un texto agradeciendo algo específico que hizo ayer." },
  13: { tema: "Contacto", lectura: "Cantares 2:6", oracion: "Santifica nuestro contacto.", tarea: "Un abrazo de 20 segundos sin hablar. Solo respiren." },
  14: { tema: "PREMIO: Murallas", lectura: "Nehemías 2:18", oracion: "Levantémonos y edifiquemos.", tarea: "Check-in: ¿Hay algo que te lastimó esta semana?", premio: "¡Murallas de protección levantadas! Han aprendido a poner límites. Recompensa: Una noche de película en casa." },

  // Semana 3
  15: { tema: "Suavidad", lectura: "Prov 15:1", oracion: "Suaviza mis palabras.", tarea: "Usa la técnica Sandwich: Elogio + Petición + Elogio." },
  16: { tema: "Servicio", lectura: "Gálatas 5:13", oracion: "Quiero servir, no ser servido.", tarea: "Haz una tarea de tu pareja sin que te lo pida." },
  17: { tema: "Visión", lectura: "Habacuc 2:2", oracion: "Aviva nuestra visión.", tarea: "Hablen 10 min: '¿Cómo nos gustaría estar en 5 años?'" },
  18: { tema: "Vulnerabilidad", lectura: "2 Cor 12:9", oracion: "Quita mi armadura.", tarea: "Confiesa un miedo: 'A veces temo que...'." },
  19: { tema: "Desconexión", lectura: "Salmo 101:3", oracion: "Que nada nos distraiga.", tarea: "Cena sin celulares. Cero pantallas por 40 min." },
  20: { tema: "Gozo", lectura: "Filipenses 4:4", oracion: "Restaura nuestro gozo.", tarea: "Pongan una canción y bailen juntos." },
  21: { tema: "PREMIO: Pacto", lectura: "Rut 1:16", oracion: "Donde tú vayas, iré.", tarea: "Escribe una promesa corta para esta nueva etapa.", premio: "¡Campeones del Amor! Han completado el reto. Su premio final es planear una 'Segunda Luna de Miel' (aunque sea un fin de semana)." }
};

// --- AUTH & INIT ---
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    user = session.user;
    document.getElementById("userEmailDisplay").textContent = user.email.split('@')[0];
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("globalLoader").classList.remove("hidden"); // Mostrar carga
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

// --- LÓGICA PRINCIPAL ---
async function initApp() {
  try {
    // 1. Obtener Pareja
    const { data: member, error } = await supabase.from("couple_members").select("couple_id").eq("user_id", user.id).maybeSingle();
    
    document.getElementById("globalLoader").classList.add("hidden");

    if (!member) {
      document.getElementById("coupleSetup").classList.remove("hidden");
      document.getElementById("userHeader").classList.add("hidden"); // Ocultar header en setup
      return;
    }

    coupleId = member.couple_id;
    document.getElementById("userHeader").classList.remove("hidden"); // Mostrar header en app

    // 2. Obtener Compañero
    const { data: partner } = await supabase.from("couple_members")
      .select("user_id")
      .eq("couple_id", coupleId).neq("user_id", user.id).maybeSingle();
    
    partnerId = partner ? partner.user_id : null;

    // 3. Cargar Progreso y Renderizar
    await refreshData();

    document.getElementById("coupleSetup").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

  } catch (err) {
    console.error("Error init:", err);
    alert("Hubo un error de conexión. Intenta recargar.");
  }
}

async function refreshData() {
  // Obtener todas las entradas de la pareja
  const { data: entries } = await supabase.from("entries")
    .select("user_id, day, created_at")
    .eq("couple_id", coupleId);

  // Calcular max day de cada uno
  const myEntries = entries.filter(e => e.user_id === user.id);
  const partnerEntries = entries.filter(e => e.user_id === partnerId);

  // Obtener el día más alto completado
  myMaxDay = myEntries.length ? Math.max(...myEntries.map(e => e.day)) : 0;
  partnerMaxDay = partnerEntries.length ? Math.max(...partnerEntries.map(e => e.day)) : 0;

  // Lógica de Desbloqueo:
  // El nivel en el que estamos juntos es el mínimo de los dos.
  // Ejemplo: Yo hice día 5, Ella hizo día 3. El nivel completado conjunto es 3.
  // El día disponible para jugar es 3 + 1 = 4. (Yo tengo que esperar a que ella haga el 4 y 5).
  const jointProgress = Math.min(myMaxDay, partnerMaxDay);
  
  // Día que se puede jugar actualmente
  unlockableDay = jointProgress + 1; 

  // Excepción: Si yo voy más adelantado, puedo ver mis días completados, 
  // pero NO puedo avanzar al siguiente reto conjunto hasta que se igualen.
  
  updateHeaderStatus();
  renderCalendar(myEntries, partnerEntries);
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
    el.textContent = `Tu pareja ya completó el día ${partnerMaxDay}. ¡Te toca!`;
    el.style.color = "#34d399";
  } else {
    el.textContent = "Están sincronizados ❤️";
    el.style.color = "#60a5fa";
  }
}

function renderCalendar(myEntries, partnerEntries) {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  for (let i = 1; i <= 21; i++) {
    const box = document.createElement("div");
    box.className = "day-box";
    
    // Estado Visual
    const iCompleted = myEntries.some(e => e.day === i);
    const partnerCompleted = partnerEntries.some(e => e.day === i);
    
    let statusIcon = "";

    if (iCompleted) {
      box.classList.add("completed");
      statusIcon = "✅";
      // Si es día de premio y ambos completaron
      if ([7, 14, 21].includes(i) && partnerCompleted) {
        box.classList.add("reward-day");
        statusIcon = "🏆";
      }
    } else {
      // Si no he completado el día 'i'
      // Solo es "activo" si es el siguiente día inmediato (unlockableDay)
      // Y si el anterior está completo por ambos (implícito en unlockableDay)
      if (i === myMaxDay + 1) {
        // Es mi siguiente paso. 
        // PERO verificamos si puedo avanzar (Regla: UnlockableDay)
        if (i > unlockableDay) {
           // Caso: Yo voy por el 6, Ella por el 4. Joint=4. Unlockable=5.
           // i=6. 6 > 5 -> Bloqueado para mí hasta que ella avance.
           box.classList.add("locked");
           statusIcon = "⏳"; // Esperando pareja
        } else {
           box.classList.add("active");
           statusIcon = "🔥";
        }
      } else {
        box.classList.add("locked");
        statusIcon = "🔒";
      }
    }

    box.onclick = () => handleDayClick(i, iCompleted, box.classList.contains("locked"));

    // Puntos de progreso
    const dotsHtml = `
      <div class="partner-dots">
        <div class="dot me ${iCompleted ? 'done' : ''}" title="Tú"></div>
        <div class="dot partner ${partnerCompleted ? 'done' : ''}" title="Pareja"></div>
      </div>
    `;

    box.innerHTML = `<div class="day-number">${i}</div><div style="font-size:1.2rem">${statusIcon}</div>${dotsHtml}`;
    grid.appendChild(box);
  }
}

// --- MANEJO DEL MODAL ---
async function handleDayClick(day, isCompleted, isLocked) {
  if (isLocked) {
    if (day > myMaxDay + 1) return alert("Completa los días anteriores primero.");
    if (day > partnerMaxDay + 1) return alert("Tu pareja debe completar los días anteriores para que puedan avanzar juntos.");
    return;
  }

  selectedDayInModal = day;
  const d = content21Days[day];
  
  document.getElementById("modalTitle").textContent = `Día ${day}: ${d.tema}`;
  document.getElementById("modalLectura").textContent = d.lectura;
  document.getElementById("modalOracion").textContent = d.oracion;
  document.getElementById("modalTarea").textContent = d.tarea;

  const btn = document.getElementById("completeDayBtn");
  const waitMsg = document.getElementById("waitMessage");

  if (isCompleted) {
    btn.textContent = "Día Completado";
    btn.disabled = true;
    btn.style.background = "#064e3b";
    
    // Si es día de premio, mostrar botón de Ver Premio
    if ([7, 14, 21].includes(day)) {
       showReward(day); // Mostrar directo si ya está hecho
    }
  } else {
    // Validar si ya hizo uno HOY
    const canDoToday = await checkDateRestriction();
    if (!canDoToday) {
        btn.textContent = "Vuelve mañana 🌙";
        btn.disabled = true;
        btn.style.background = "#475569";
        alert("¡Wow, qué velocidad! Para que el hábito se asiente, es un reto por día. Vuelve mañana.");
    } else {
        btn.textContent = "Marcar como Completado";
        btn.disabled = false;
        btn.style.background = "#3b82f6";
    }
  }
  
  waitMsg.classList.add("hidden");
  document.getElementById("dayModal").classList.remove("hidden");
}

async function checkDateRestriction() {
  // Buscar mi última entrada
  const { data: entries } = await supabase.from("entries")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (entries && entries.length > 0) {
    const lastDate = new Date(entries[0].created_at);
    const today = new Date();
    // Comparar si es el mismo día (año, mes, día)
    return lastDate.toDateString() !== today.toDateString();
  }
  return true; // Primer día siempre se puede
}

document.getElementById("closeModalBtn").onclick = () => {
  document.getElementById("dayModal").classList.add("hidden");
};

document.getElementById("closeRewardBtn").onclick = () => {
  document.getElementById("rewardModal").classList.add("hidden");
};

function showReward(day) {
  const d = content21Days[day];
  if (d.premio) {
    document.getElementById("rewardText").textContent = d.premio;
    document.getElementById("rewardModal").classList.remove("hidden");
  }
}

// --- GUARDAR DÍA ---
document.getElementById("completeDayBtn").onclick = async () => {
  const { error } = await supabase.from("entries").insert({
    couple_id: coupleId,
    user_id: user.id,
    day: selectedDayInModal
  });

  if (!error) {
    document.getElementById("dayModal").classList.add("hidden");
    
    // Verificar si desbloqueó premio
    if ([7, 14, 21].includes(selectedDayInModal)) {
      showReward(selectedDayInModal);
    } else {
      alert("¡Día registrado! Buen trabajo.");
    }
    
    await refreshData(); 
  } else {
    alert("Error al guardar.");
  }
};

// --- (CÓDIGOS DE LOGIN/REGISTRO SON IGUALES A LA VERSIÓN ANTERIOR) ---
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
// ... (createCoupleBtn y joinCoupleBtn se mantienen igual) ...
// Copia las funciones createCoupleBtn y joinCoupleBtn del código anterior aquí si las borraste
document.getElementById("createCoupleBtn").onclick = async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data } = await supabase.from("couples").insert({ code }).select().single();
  if (data) {
    await supabase.from("couple_members").insert({ couple_id: data.id, user_id: user.id });
    document.getElementById("coupleCode").textContent = code;
    document.getElementById("coupleCodeBox").classList.remove("hidden");
    initApp();
  }
};

document.getElementById("joinCoupleBtn").onclick = async () => {
  const code = document.getElementById("joinCode").value.trim().toUpperCase();
  const { data: cp } = await supabase.from("couples").select("id").eq("code", code).maybeSingle();
  if (cp) {
    const { error } = await supabase.from("couple_members").insert({ couple_id: cp.id, user_id: user.id });
    if (!error) initApp();
    else alert("Error al unirse.");
  } else alert("Código inválido");
};
