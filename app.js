import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

// ESTADO GLOBAL
let user = null;
let coupleId = null;
let partnerId = null;
let currentDay = 1;
let pollingInterval = null;

// CONTENIDO COMPLETO (Base de datos local)
const content21Days = {
  1: { lectura: "Salmo 139:1-14", oracion: "Dios, enséñame a verme como Tú me ves.", tarea: "Escribe 3 cualidades tuyas que nada tienen que ver con ella." },
  2: { lectura: "Mateo 5:37", oracion: "Quiero ser sí-sí, no-sí; ayúdame a dejar el miedo.", tarea: "Practica decir “no” a un micro-pedido (ej. préstame tu cargador)." },
  3: { lectura: "1 Juan 4:18", oracion: "Saco fuera el miedo que me hace controlar.", tarea: "Cuando sientas ansiedad, respira 4-7-8 y di: “No soy dueño de su libertad.”" },
  4: { lectura: "Gálatas 6:5", oracion: "Cada quien lleva su carga.", tarea: "No lleves su mochila, no mandes mensaje hasta que ella responda el anterior." },
  5: { lectura: "Santiago 1:19", oracion: "Rápido en escuchar, lento para hablar.", tarea: "En la próxima conversación cuenta hasta 3 antes de responder." },
  6: { lectura: "2 Cor 12:9", oracion: "Mi gracia te basta; mi poder se perfecciona en tu debilidad.", tarea: "Anota un momento en que te humilló; pide gracia para no vengarte." },
  7: { lectura: "Repaso Semana 1", oracion: "Releé tu lista de cualidades; celebra que ya diste 7 pasos.", tarea: "Comparte con un amigo de confianza o líder cómo te sientes." },
  8: { lectura: "Efesios 4:15-16", oracion: "Habla verdad en amor, ni agresivo ni cobarde.", tarea: "Redacta el mensaje de límites propuesto. (No lo envíes aún)." },
  9: { lectura: "Proverbios 25:28", oracion: "Ciudad sin muros: así el hombre sin dominio.", tarea: "Practica la frase: “Si no me das esa información, yo elegiré no seguir la conversación ahora.”" },
  10: { lectura: "Mateo 18:15", oracion: "Vete a él a solas.", tarea: "Programa una cita presencial (café, parque). No por WhatsApp." },
  11: { lectura: "Colosenses 3:13", oracion: "Soportaos y perdonáos.", tarea: "Si ella se enoja, no te defiendas; escucha 5 min sin interrumpir." },
  12: { lectura: "1 Tesalonicenses 5:23", oracion: "Que vuestro espíritu, alma y cuerpo se conserven.", tarea: "Bloquea 30 min para hacer ejercicio solo; celular en avión." },
  13: { lectura: "Santiago 5:12", oracion: "Sea vuestro sí, sí; vuestro no, no.", tarea: "Envía el mensaje del día 8. Solo una vez. No insistas." },
  14: { lectura: "Repaso Semana 2", oracion: "Pídele a Dios que prepare el corazón de ella.", tarea: "Lee en voz alta tus límites redactados." },
  15: { lectura: "Gálatas 6:7-8", oracion: "No nos cansemos de hacer bien.", tarea: "Si ella cumplió, celebra sin sobrecompensar (un abrazo)." },
  16: { lectura: "Lucas 15:20", oracion: "El padre la vio y tuvo compasión.", tarea: "Si ella no cumplió, simplemente retira tu disponibilidad esa noche amablemente." },
  17: { lectura: "Romanos 12:18", oracion: "Si es posible, vivid en paz con todos.", tarea: "Redacta una carta (no la envíes) contando cómo te sientes sin acusar." },
  18: { lectura: "1 Pedro 3:7", oracion: "Vivid con ellas con entendimiento.", tarea: "Pregúntale: “¿Qué necesitas de mí para sentirte libre y segura?”" },
  19: { lectura: "Salmo 37:5", oracion: "Encomienda a Jehová tu camino.", tarea: "Escribe en un papel “Señor, ya no soy el juez” y guárdalo en la Biblia." },
  20: { lectura: "2 Corintios 2:6-8", oracion: "Perdonad y confortad.", tarea: "Si hay arrepentimiento, ofrece una nueva oportunidad con un límite claro." },
  21: { lectura: "Revelación 21:5", oracion: "He aquí que todo lo nuevo.", tarea: "Evalúa: ¿Estás dispuesto a seguir sin desgastarte? Decide con oración." }
};

// --- GESTIÓN DE SESIÓN ---
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    user = session.user;
    document.getElementById("userEmailDisplay").textContent = user.email;
    document.getElementById("userHeader").classList.remove("hidden");
    await checkStatus();
  } else {
    resetState();
    showSection("auth");
  }
});

function resetState() {
  user = null;
  coupleId = null;
  partnerId = null;
  if (pollingInterval) clearInterval(pollingInterval);
  document.getElementById("userHeader").classList.add("hidden");
}

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
};

// --- INICIALIZACIÓN DE DATOS ---
async function checkStatus() {
  // 1. Verificar si tiene pareja
  const { data: member } = await supabase.from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (member) {
    coupleId = member.couple_id;
    
    // 2. Buscar ID del compañero
    const { data: partner } = await supabase.from("couple_members")
      .select("user_id")
      .eq("couple_id", coupleId)
      .neq("user_id", user.id)
      .maybeSingle();
      
    partnerId = partner ? partner.user_id : null;
    
    await loadProgress();
    showSection("app");
    
    // 3. Iniciar Polling (cada 10 segs actualiza estado)
    updatePartnerStatus();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(updatePartnerStatus, 10000); 

  } else {
    showSection("coupleSetup");
  }
}

// --- ACTUALIZACIÓN DINÁMICA ---
async function updatePartnerStatus() {
  const statusEl = document.getElementById("partnerStatus");
  
  if (!partnerId) {
    statusEl.textContent = "⏳ Esperando que tu pareja se una...";
    statusEl.style.background = "#334155"; 
    statusEl.style.color = "#fff";
    statusEl.style.borderLeft = "4px solid #94a3b8";
    return;
  }

  // Verificar si la pareja completó el día actual
  const { data } = await supabase.from("entries")
    .select("day")
    .eq("user_id", partnerId)
    .eq("day", currentDay)
    .maybeSingle();

  if (data) {
    statusEl.textContent = "✅ Tu pareja ya completó el reto de hoy.";
    statusEl.style.background = "rgba(16, 185, 129, 0.2)";
    statusEl.style.color = "#6ee7b7";
    statusEl.style.borderLeft = "4px solid #10b981";
  } else {
    statusEl.textContent = "💤 Tu pareja aún no ha completado el reto.";
    statusEl.style.background = "rgba(245, 158, 11, 0.2)";
    statusEl.style.color = "#fcd34d";
    statusEl.style.borderLeft = "4px solid #f59e0b";
  }
}

async function loadProgress() {
  const { data: entries } = await supabase.from("entries")
    .select("day")
    .eq("user_id", user.id)
    .order("day", { ascending: false });
    
  // Calcular día actual
  if (entries && entries.length > 0) {
    currentDay = entries[0].day + 1;
  } else {
    currentDay = 1;
  }

  // Renderizar contenido
  if (currentDay > 21) {
    document.getElementById("dayContent").innerHTML = "<h3>🎉 ¡Reto Completado!</h3><p>Han terminado los 21 días de transformación.</p>";
    document.getElementById("completeDayBtn").classList.add("hidden");
    document.getElementById("currentDay").textContent = "Final";
    return;
  }

  const d = content21Days[currentDay];
  document.getElementById("currentDay").textContent = currentDay;
  document.getElementById("dayContent").innerHTML = `
    <p style="margin-bottom:10px;"><strong>📖 Lectura:</strong> ${d.lectura}</p>
    <p style="margin-bottom:10px;"><strong>🙏 Oración:</strong> ${d.oracion}</p>
    <p style="margin-bottom:10px; color:#60a5fa;"><strong>🎯 Tarea:</strong> ${d.tarea}</p>
  `;
  document.getElementById("completeDayBtn").classList.remove("hidden");
}

// --- BOTONES DE ACCIÓN ---
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if(!email || !password) return alert("Ingresa correo y contraseña");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Si falla login, intentamos registro automático
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) alert(error.message);
    else alert("Usuario nuevo registrado. ¡Bienvenido!");
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
    else alert("Error al unirse (quizás ya eres miembro).");
  } else {
    alert("Código no encontrado");
  }
};

document.getElementById("completeDayBtn").onclick = async () => {
  const { error } = await supabase.from("entries").insert({
    couple_id: coupleId,
    user_id: user.id,
    day: currentDay
  });

  if (!error) {
    // Recargar estado local inmediatamente
    await loadProgress(); 
    updatePartnerStatus();
    alert("¡Día registrado! Sigue así.");
  }
};

function showSection(id) {
  ["auth", "coupleSetup", "app"].forEach(s => document.getElementById(s).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
