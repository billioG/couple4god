import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

const SUPABASE_URL = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== DATOS DE LOS 21 DÍAS =====
const dayData = {
  1: { reading: "Salmo 139:1-14", prayer: "Dios, enséñame a verme como Tú me ves.", task: "Escribe 3 cualidades tuyas que nada tienen que ver con ella.", color: "#e91e63" },
  2: { reading: "Mateo 5:37", prayer: "Quiero ser sí-sí, no-sí; ayúdame a dejar el miedo.", task: "Practica decir 'no' a un micro-pedido.", color: "#f06292" },
  3: { reading: "1 Juan 4:18", prayer: "Saco fuera el miedo que me hace controlar.", task: "Cuando sientas ansiedad, respira 4-7-8 y di: 'No soy dueño de su libertad'.", color: "#f48fb1" },
  4: { reading: "Gálatas 6:5", prayer: "Cada quien lleva su carga.", task: "No lleves su mochila, no mandes mensaje hasta que ella responda el anterior.", color: "#ba68c8" },
  5: { reading: "Santiago 1:19", prayer: "Rápido en escuchar, lento para hablar.", task: "En la próxima conversación cuenta hasta 3 antes de responder.", color: "#ce93d8" },
  6: { reading: "2 Cor 12:9", prayer: "Mi gracia te basta; mi poder se perfecciona en tu debilidad.", task: "Anota un momento en que te humilló; pide gracia para no vengarte.", color: "#9575cd" },
  7: { reading: "Repaso", prayer: "Agradecimiento por los 7 pasos.", task: "Comparte con un amigo cómo te sientes.", color: "#b39ddb" },
  8: { reading: "Efesios 4:15-16", prayer: "Habla verdad en amor, ni agresivo ni cobarde.", task: "Redacta un mensaje corto de límite amoroso (no lo envíes aún).", color: "#7986cb" },
  9: { reading: "Proverbios 25:28", prayer: "Ciudad sin muros: así el hombre sin dominio.", task: "Practica la frase: 'Si no me das esa información, yo elegiré no seguir la conversación'.", color: "#9fa8da" },
  10: { reading: "Mateo 18:15", prayer: "Vete a él a solas.", task: "Programa una cita presencial (café, parque). No por WhatsApp.", color: "#64b5f6" },
  11: { reading: "Colosenses 3:13", prayer: "Soportaos y perdonáos.", task: "Prepara tu mente: si ella se enoja, escucha 5 min sin interrumpir.", color: "#90caf9" },
  12: { reading: "1 Tesalonicenses 5:23", prayer: "Que vuestro espíritu, alma y cuerpo se conserven.", task: "Bloquea 30 min para hacer ejercicio o caminar solo; celular en avión.", color: "#4fc3f7" },
  13: { reading: "Santiago 5:12", prayer: "Sea vuestro sí, sí; vuestro no, no.", task: "Envía el mensaje del día 8. Solo una vez. No insistas.", color: "#81d4fa" },
  14: { reading: "Repaso", prayer: "Lee en voz alta tus límites redactados.", task: "Pídele a Dios que prepare el corazón de ella.", color: "#80deea" },
  15: { reading: "Gálatas 6:7-8", prayer: "No nos cansemos de hacer bien.", task: "Si ella cumplió, celebra sin sobrecompensar (un abrazo, no un regalo caro).", color: "#4db6ac" },
  16: { reading: "Lucas 15:20", prayer: "El padre la vio y tuvo compasión.", task: "Si ella no cumplió, retira tu disponibilidad esa noche (ve con amigos).", color: "#80cbc4" },
  17: { reading: "Romanos 12:18", prayer: "Si es posible, vivid en paz con todos.", task: "Redacta una carta (no la envíes) contando cómo te sientes sin acusar.", color: "#a5d6a7" },
  18: { reading: "1 Pedro 3:7", prayer: "Vivid con ellas con entendimiento.", task: "Pregúntale: '¿Qué necesitas de mí para sentirte libre y segura?'", color: "#c5e1a5" },
  19: { reading: "Salmo 37:5", prayer: "Encomienda a Jehová tu camino.", task: "Entrégale la relación a Dios: escribe 'Señor, ya no soy el juez' y guárdalo en la Biblia.", color: "#fff176" },
  20: { reading: "2 Corintios 2:6-8", prayer: "Perdonad y confortad.", task: "Si hay señales de arrepentimiento, ofrece una nueva oportunidad con límite claro.", color: "#ffd54f" },
  21: { reading: "Revelación 21:5", prayer: "He aquí que todo lo nuevo.", task: "Evalúa: ¿Ella está dispuesta a cambiar? Decide con oración y consejo pastoral.", color: "#ffb74d" }
};

// ===== RESTO DEL CÓDIGO (igual que antes) =====
// ... (todo el código de login, logout, etc. desde checkUser hasta notifyHit) ...
// PEGA AQUÍ TODO EL CÓDIGO DE app.js QUE TE DI ANTES (después de la constante dayData)

// ===== MODIFICACIONES CLAVE =====

// Reemplaza la función loadProgress COMPLETA por esta:
async function loadProgress() {
  daysBox.innerHTML = "";
  rewardBox.classList.add("hidden");
  
  const { data: me, error: err1 } = await supabase
    .from("progress")
    .select("day")
    .eq("user_id", user.id)
    .order("day");
  
  if (err1) {
    console.error("Error mi progreso:", err1);
    authMsg.textContent = "Error DB: " + err1.message;
    return;
  }
  
  const myDays = new Set(me?.map((x) => x.day) || []);
  
  const { data: all, error: err2 } = await supabase
    .from("progress")
    .select("user_id, day");
  
  if (err2) {
    console.error("Error progreso general:", err2);
    return;
  }
  
  const partners = all?.filter((x) => x.user_id !== user.id) || [];
  const partnerDays = new Set(partners.map((x) => x.day));
  
  // DÍA ACTUAL (para bloquear futuros)
  const today = new Date().getDate() % 21 || 21;
  
  for (let d = 1; d <= 21; d++) {
    const div = document.createElement("div");
    div.className = "day";
    div.textContent = d;
    div.style.borderColor = dayData[d].color;
    
    // Estado del día
    const isLocked = d > today;
    const isDone = myDays.has(d);
    const isToday = d === today;
    
    if (isLocked) div.classList.add("locked");
    if (isDone) div.classList.add("done");
    if (isToday && !isDone) div.classList.add("today");
    
    // Evento click
    div.onclick = () => openModal(d, partnerDays);
    daysBox.appendChild(div);
  }
  
  checkMilestone();
}

// ===== FUNCIONES DEL MODAL =====
function openModal(day, partnerDays) {
  const modal = document.getElementById("dayModal");
  const title = document.getElementById("modalTitle");
  const reading = document.getElementById("modalReading");
  const prayer = document.getElementById("modalPrayer");
  const task = document.getElementById("modalTask");
  const btn = document.getElementById("modalDoneBtn");
  const status = document.getElementById("modalStatus");
  
  const today = new Date().getDate() % 21 || 21;
  const isLocked = day > today;
  const isDone = document.querySelector(`.day:nth-child(${day})`)?.classList.contains("done") || false;
  const partnerHasIt = partnerDays.has(day);
  
  if (isLocked) {
    status.textContent = "⏰ Este día aún no está disponible. Espera a la fecha.";
    btn.classList.add("hidden");
  } else {
    status.innerHTML = isDone ? "✅ Ya completaste este día" : "📅 Disponible";
    status.innerHTML += partnerHasIt ? "<br>💕 Tu pareja ya lo hizo" : "<br>⏳ Tu pareja aún no lo hace";
    btn.classList.toggle("hidden", isDone);
    btn.onclick = () => markDayFromModal(day);
  }
  
  title.textContent = `Día ${day}`;
  reading.textContent = dayData[day].reading;
  prayer.textContent = dayData[day].prayer;
  task.textContent = dayData[day].task;
  
  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("dayModal").classList.add("hidden");
}

async function markDayFromModal(day) {
  await toggleDay(day);
  closeModal();
}

// ===== MODIFICACIÓN EN toggleDay =====
// Añade al final de toggleDay (después de loadProgress()):
// Verificar si ambos completaron y mostrar recompensa
const { data: all, error: errAll } = await supabase
  .from("progress")
  .select("user_id, day");

if (!errAll) {
  const partners = all.filter((x) => x.user_id !== user.id);
  const partnerHasDay = partners.some((p) => p.day === day);
  const iHaveDay = !data; // true si acabo de insertar
  
  if (iHaveDay && partnerHasDay) {
    showReward(day);
    checkMilestone();
  }
}
