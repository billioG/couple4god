//Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(supabaseUrl, supabaseKey);

// ESTADO GLOBAL
let user = null;
let coupleId = null;
let currentDay = 1;

const content21Days = {
  1: { lectura: "Salmo 139:1-14", oracion: "Dios, enséñame a verme como Tú me ves.", tarea: "Escribe 3 cualidades tuyas que nada tienen que ver con ella." },
  2: { lectura: "Mateo 5:37", oracion: "Quiero ser sí-sí, no-sí; ayúdame a dejar el miedo.", tarea: "Practica decir “no” a un micro-pedido (ej. préstame tu cargador)." },
  3: { lectura: "1 Juan 4:18", oracion: "Saco fuera el miedo que me hace controlar.", tarea: "Cuando sientas ansiedad, respira 4-7-8 y di: “No soy dueño de su libertad.”" },
  4: { lectura: "Gálatas 6:5", oracion: "Cada quien lleva su carga.", tarea: "No lleves su mochila, no mandes mensaje hasta que ella responda el anterior." },
  5: { lectura: "Santiago 1:19", oracion: "Rápido en escuchar, lento para hablar.", tarea: "En la próxima conversación cuenta hasta 3 antes de responder." },
  6: { lectura: "2 Cor 12:9", oracion: "Mi gracia te basta; mi poder se perfecciona en tu debilidad.", tarea: "Anota un momento en que te humilló; pide gracia para no vengarte." },
  7: { lectura: "Repaso de Semana 1", oracion: "Gracias por estos 7 días de identidad.", tarea: "Comparte con un amigo de confianza o líder cómo te sientes." },
  8: { lectura: "Efesios 4:15-16", oracion: "Habla verdad en amor, ni agresivo ni cobarde.", tarea: "Redacta el mensaje de límites propuesto (No lo envíes aún)." },
  9: { lectura: "Proverbios 25:28", oracion: "Ciudad sin muros: así el hombre sin dominio.", tarea: "Practica la frase de retiro ante falta de información." },
  10: { lectura: "Mateo 18:15", oracion: "Vete a él a solas.", tarea: "Programa una cita presencial (café, parque). No por WhatsApp." },
  11: { lectura: "Colosenses 3:13", oracion: "Soportaos y perdonáos.", tarea: "Escucha 5 min sin interrumpir si ella se enoja." },
  12: { lectura: "1 Tesalonicenses 5:23", oracion: "Que vuestro espíritu, alma y cuerpo se conserven.", tarea: "Bloquea 30 min para caminar solo; celular en avión." },
  13: { lectura: "Santiago 5:12", oracion: "Sea vuestro sí, sí; vuestro no, no.", tarea: "Envía el mensaje redactado el día 8. Solo una vez." },
  14: { lectura: "Repaso de Semana 2", oracion: "Pídele a Dios que prepare el corazón de ella.", tarea: "Lee en voz alta tus límites redactados." },
  15: { lectura: "Gálatas 6:7-8", oracion: "No nos cansemos de hacer bien.", tarea: "Si ella cumplió, celebra con un abrazo (sin sobrecompensar)." },
  16: { lectura: "Lucas 15:20", oracion: "El padre la vio y tuvo compasión.", tarea: "Si ella no cumplió, retira tu disponibilidad esa noche amablemente." },
  17: { lectura: "Romanos 12:18", oracion: "Si es posible, vivid en paz con todos.", tarea: "Redacta una carta expresando tus sentimientos sin acusar." },
  18: { lectura: "1 Pedro 3:7", oracion: "Vivid con ellas con entendimiento.", tarea: "Pregúntale qué necesita para sentirse libre y segura." },
  19: { lectura: "Salmo 37:5", oracion: "Señor, ya no soy el juez.", tarea: "Escribe la entrega en un papel y guárdalo en tu Biblia." },
  20: { lectura: "2 Corintios 2:6-8", oracion: "Perdonad y confortad.", tarea: "Si hay arrepentimiento, ofrece nueva oportunidad con límite claro." },
  21: { lectura: "Revelación 21:5", oracion: "He aquí que todo lo nuevo.", tarea: "Evalúa con oración y consejo pastoral el futuro de la relación." }
};

// --- AUTH ---
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    user = session.user;
    initApp();
  } else {
    showSection("auth");
  }
});

async function initApp() {
  const { data: member } = await supabase.from("couple_members").select("couple_id").eq("user_id", user.id).single();
  if (member) {
    coupleId = member.couple_id;
    await syncProgress();
    showSection("app");
  } else {
    showSection("coupleSetup");
  }
}

async function syncProgress() {
  const { data: entries } = await supabase.from("entries").select("day").eq("couple_id", coupleId).order("day", { ascending: false });
  if (entries && entries.length > 0) {
    // Lógica: El día actual es el último día completado por AMBOS + 1
    // Simplificado para el MVP: El día más alto registrado por el usuario
    const userEntries = entries.filter(e => e.user_id === user.id);
    currentDay = userEntries.length > 0 ? userEntries[0].day + 1 : 1;
    if (currentDay > 21) currentDay = 21;
  }
  loadDayUI();
}

function loadDayUI() {
  const d = content21Days[currentDay];
  document.getElementById("currentDay").textContent = currentDay;
  document.getElementById("dayContent").innerHTML = `
    <div style="text-align:left; padding:10px;">
      <p><strong>📖 Lectura:</strong> ${d.lectura}</p>
      <p><strong>🙏 Oración:</strong> ${d.oracion}</p>
      <p><strong>🎯 Micro-tarea:</strong> ${d.tarea}</p>
    </div>
  `;
}

// --- EVENTOS ---
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) alert(signUpError.message);
    else alert("Cuenta creada. Revisa tu email o intenta ingresar.");
  }
};

document.getElementById("createCoupleBtn").onclick = async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: cp } = await supabase.from("couples").insert({ code }).select().single();
  if (cp) {
    await supabase.from("couple_members").insert({ couple_id: cp.id, user_id: user.id });
    document.getElementById("coupleCode").textContent = code;
    document.getElementById("coupleCodeBox").classList.remove("hidden");
  }
};

document.getElementById("joinCoupleBtn").onclick = async () => {
  const code = document.getElementById("joinCode").value.trim();
  const { data: cp } = await supabase.from("couples").select("id").eq("code", code).single();
  if (cp) {
    await supabase.from("couple_members").insert({ couple_id: cp.id, user_id: user.id });
    initApp();
  } else alert("Código inválido");
};

document.getElementById("completeDayBtn").onclick = async () => {
  const { error } = await supabase.from("entries").insert({ couple_id: coupleId, user_id: user.id, day: currentDay });
  if (!error) {
    alert("¡Día enviado! Esperando a tu pareja para avanzar al siguiente 💙");
    syncProgress();
  }
};

function showSection(id) {
  ["auth", "coupleSetup", "app"].forEach(s => document.getElementById(s).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
