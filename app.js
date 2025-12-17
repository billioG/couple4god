import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

const SUPABASE_URL = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


let user = null;
let partnerId = null;
let currentDay = null;

/* ===============================
   DOM ELEMENTS
================================ */
const auth = document.getElementById("auth");
const app = document.getElementById("app");
const daysBox = document.getElementById("days");
const modal = document.getElementById("dayModal");
const modalTitle = document.getElementById("modalTitle");
const modalTask = document.getElementById("modalTask");
const taskArea = document.getElementById("taskArea");
const modalDoneBtn = document.getElementById("modalDoneBtn");
const feedList = document.getElementById("feedList");
const badgesBox = document.getElementById("badges");
const storiesRow = document.getElementById("storiesRow");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const notifBell = document.getElementById("notifBell");

/* ===============================
   DAY DATA (LECTURA + ORACIÓN + TAREA)
================================ */
const dayData = {
  1:{
    title:"Nombrar emoción",
    reading:"Reconocer lo que sientes es el primer acto de honestidad contigo mismo.",
    prayer:"Señor, ayúdame a entender lo que siento sin miedo.",
    taskType:"text",
    prompt:"Escribe una emoción que sentiste hoy.",
    dopamine:"🌱 Emoción reconocida"
  },
  2:{
    title:"Pausa consciente",
    reading:"No toda reacción merece una respuesta inmediata.",
    prayer:"Dame sabiduría para detenerme antes de reaccionar.",
    taskType:"scroll_stop",
    prompt:"Respira profundo 3 veces antes de continuar.",
    dopamine:"🧠 Autocontrol"
  },
  3:{
    title:"Origen de reacción",
    reading:"Entender desde dónde reaccionas cambia el resultado.",
    prayer:"Muéstrame desde dónde nace mi reacción.",
    taskType:"choice",
    options:["Amor","Miedo","Cansancio"],
    prompt:"¿Desde dónde reaccionaste hoy?",
    dopamine:"💡 Conciencia"
  },
  7:{
    title:"Semana 1",
    reading:"Hablar libera lo que pesa.",
    prayer:"Permíteme expresarme con verdad.",
    taskType:"audio",
    prompt:"Graba cómo te sentiste esta semana.",
    dopamine:"🎙 Voz auténtica",
    story:true
  },
  12:{
    title:"Paz",
    reading:"La paz se reconoce en lo simple.",
    prayer:"Gracias por los momentos de calma.",
    taskType:"photo",
    prompt:"Toma una foto de algo que te dio paz.",
    dopamine:"📸 Presencia",
    story:true
  },
  18:{
    title:"Aprecio",
    reading:"Apreciar en voz alta sana.",
    prayer:"Ayúdame a expresar amor sin reservas.",
    taskType:"video",
    prompt:"Graba un video de 15s valorando a tu pareja.",
    dopamine:"🎥 Aprecio",
    story:true
  }
};

/* ===============================
   AUTH
================================ */
loginBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await supabase.auth.signUp({ email, password });
  }
  checkUser();
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

async function checkUser() {
  const { data } = await supabase.auth.getSession();
  user = data.session?.user;
  if (!user) return;

  auth.classList.add("hidden");
  app.classList.remove("hidden");

  await loadPartner();
  loadDays();
  loadFeed();
  loadStories();
  loadBadges();
  loadInsights();
}
checkUser();

/* ===============================
   COUPLE
================================ */
async function loadPartner() {
  const { data } = await supabase
    .from("couples")
    .select("*")
    .or(`user1.eq.${user.id},user2.eq.${user.id}`)
    .single();

  partnerId = data.user1 === user.id ? data.user2 : data.user1;
}

async function bothCompleted(day) {
  const { data } = await supabase
    .from("entries")
    .select("user_id")
    .eq("day", day)
    .in("user_id", [user.id, partnerId]);

  return data.length === 2;
}

/* ===============================
   DAYS GRID
================================ */
async function loadDays() {
  daysBox.innerHTML = "";
  for (let d = 1; d <= 21; d++) {
    const div = document.createElement("div");
    div.className = "day";

    const unlocked = await bothCompleted(d);
    if (!unlocked) {
      div.textContent = "🔒";
      div.style.opacity = "0.4";
    } else {
      div.textContent = d;
    }

    div.onclick = () => openModal(d);
    daysBox.appendChild(div);
  }
}

/* ===============================
   MODAL
================================ */
async function openModal(day) {
  currentDay = day;
  const unlocked = await bothCompleted(day);

  modalTitle.textContent = `Día ${day}`;
  taskArea.innerHTML = "";
  modalDoneBtn.classList.add("hidden");

  if (!unlocked) {
    modalTask.innerHTML = "🔒 Este día se desbloquea cuando ambos lo completan.";
    modal.classList.remove("hidden");
    return;
  }

  const d = dayData[day];
  modalTask.innerHTML = `
    <p><strong>📖 Lectura:</strong> ${d.reading || ""}</p>
    <p><strong>🙏 Oración:</strong> ${d.prayer || ""}</p>
    <hr>
    <p><strong>🎯 Micro-tarea:</strong> ${d.prompt}</p>
  `;

  renderTask(d);
  modal.classList.remove("hidden");
}

window.closeModal = () => modal.classList.add("hidden");

/* ===============================
   TASK RENDER
================================ */
function renderTask(d) {
  taskArea.innerHTML = "";

  if (d.taskType === "text") {
    const t = document.createElement("textarea");
    taskArea.appendChild(t);
    modalDoneBtn.classList.remove("hidden");
    modalDoneBtn.onclick = () => saveText(t.value);
  }

  if (d.taskType === "choice") {
    d.options.forEach(o => {
      const b = document.createElement("button");
      b.textContent = o;
      b.onclick = () => saveText(o);
      taskArea.appendChild(b);
    });
  }

  if (["audio","photo","video"].includes(d.taskType)) {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = `${d.taskType}/*`;
    i.onchange = e => saveFile(e.target.files[0], d.taskType);
    taskArea.appendChild(i);
  }

  if (d.taskType === "scroll_stop") {
    const b = document.createElement("button");
    b.textContent = "Listo";
    b.onclick = () => saveText("Hecho conscientemente");
    taskArea.appendChild(b);
  }
}

/* ===============================
   SAVE
================================ */
async function saveText(text) {
  await supabase.from("entries").insert({
    user_id: user.id,
    day: currentDay,
    type: "text",
    content_text: text,
    dopamine: dayData[currentDay].dopamine,
    is_story: !!dayData[currentDay].story
  });
  finishTask();
}

async function saveFile(file, type) {
  const bucket = `entries-${type}s`;
  const path = `${user.id}/${Date.now()}-${file.name}`;
  await supabase.storage.from(bucket).upload(path, file);

  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  await supabase.from("entries").insert({
    user_id: user.id,
    day: currentDay,
    type,
    content_url: url,
    dopamine: dayData[currentDay].dopamine,
    is_story: !!dayData[currentDay].story
  });
  finishTask();
}

/* ===============================
   FINISH
================================ */
function finishTask() {
  showDopamine(dayData[currentDay].dopamine);
  notifyPartner(`💙 Tu pareja completó el día ${currentDay}`);
  closeModal();
  loadDays();
  loadFeed();
  loadStories();
  checkBadges();
  calculateWeeklyInsight();
}

/* ===============================
   FEED
================================ */
async function loadFeed() {
  const { data } = await supabase
    .from("entries")
    .select("*")
    .order("created_at",{ascending:false});

  feedList.innerHTML = "";

  for (const entry of data) {
    if (entry.user_id !== user.id && !(await bothCompleted(entry.day))) {
      feedList.innerHTML += `
        <div class="feed-card locked">
          🔒 Completa el día ${entry.day} para ver este momento juntos 💙
        </div>`;
      continue;
    }

    const c = document.createElement("div");
    c.className = "feed-card";
    c.innerHTML = `<strong>Día ${entry.day}</strong>`;
    feedList.appendChild(c);
  }
}

/* ===============================
   STORIES
================================ */
async function loadStories() {
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("is_story", true)
    .gte("created_at", since);

  storiesRow.innerHTML = "";
  data.forEach(s => {
    const d = document.createElement("div");
    d.className = "story";
    d.textContent = "✨";
    d.onclick = () => openStory(s);
    storiesRow.appendChild(d);
  });
}

function openStory(s) {
  modalTitle.textContent = "Momento";
  modalTask.textContent = "";
  modalDoneBtn.classList.add("hidden");

  if (s.type === "photo") taskArea.innerHTML = `<img src="${s.content_url}" style="width:100%">`;
  if (s.type === "video") taskArea.innerHTML = `<video src="${s.content_url}" autoplay controls style="width:100%"></video>`;
  if (s.type === "audio") taskArea.innerHTML = `<audio src="${s.content_url}" autoplay controls></audio>`;
  if (s.type === "text") taskArea.innerHTML = `<p>${s.content_text}</p>`;

  modal.classList.remove("hidden");
}

/* ===============================
   BADGES
================================ */
async function checkBadges() {
  const { data } = await supabase.from("entries").select("type").eq("user_id", user.id);
  const c = t => data.filter(e => e.type === t).length;

  if (c("audio") >= 3) giveBadge("🎙 Comunicación");
  if (c("text") >= 3) giveBadge("✍️ Honestidad");
  if (c("photo") >= 2) giveBadge("📸 Presencia");
  if (c("video") >= 1) giveBadge("🎥 Aprecio");
}

async function giveBadge(badge) {
  await supabase.from("badges").insert({ user_id: user.id, badge });
  loadBadges();
}

async function loadBadges() {
  const { data } = await supabase.from("badges").select("*").eq("user_id", user.id);
  badgesBox.innerHTML = "";
  data.forEach(b => {
    const s = document.createElement("span");
    s.className = "badge";
    s.textContent = b.badge;
    badgesBox.appendChild(s);
  });
}

/* ===============================
   INSIGHTS
================================ */
function generateInsight(stats) {
  if (stats.audio >= 2 && stats.text >= 2)
    return "💬 Esta semana hubo apertura y comunicación sincera.";
  if (stats.text >= 3)
    return "✍️ Expresarte con claridad fortalece el vínculo.";
  if (stats.audio >= 2)
    return "🎙 Hablar desde la voz es valentía emocional.";
  return "🌱 Cada pequeño paso cuenta.";
}

async function calculateWeeklyInsight() {
  const since = new Date(Date.now() - 604800000).toISOString();
  const { data } = await supabase
    .from("entries")
    .select("type")
    .eq("user_id", user.id)
    .gte("created_at", since);

  if (!data?.length) return;

  const stats = { text:0, audio:0, photo:0, video:0 };
  data.forEach(e => stats[e.type]++);

  await supabase.from("insights").insert({
    user_id: user.id,
    week: Math.ceil(Date.now() / 604800000),
    message: generateInsight(stats)
  });
}

async function loadInsights() {
  const { data } = await supabase
    .from("insights")
    .select("*")
    .order("created_at",{ascending:false})
    .limit(1);

  if (!data?.length) return;

  const c = document.createElement("div");
  c.className = "feed-card";
  c.innerHTML = `<strong>🧠 Insight semanal</strong><p>${data[0].message}</p>`;
  feedList.prepend(c);
}

/* ===============================
   NOTIFICATIONS
================================ */
async function notifyPartner(message) {
  await supabase.from("notifications").insert({
    user_id: partnerId,
    message
  });
}

notifBell.onclick = async () => {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at",{ascending:false});

  alert(data.map(n => "• " + n.message).join("\n"));
};

/* ===============================
   DOPAMINE
================================ */
function showDopamine(msg) {
  const d = document.createElement("div");
  d.textContent = msg;
  d.style.position = "fixed";
  d.style.bottom = "20%";
  d.style.left = "50%";
  d.style.transform = "translateX(-50%)";
  d.style.background = "#fff";
  d.style.color = "#000";
  d.style.padding = "1rem";
  d.style.borderRadius = "20px";
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1200);
}

/* ===============================
   PWA
================================ */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
