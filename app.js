

/* =====================================================
   SUPABASE
===================================================== */
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

const SUPABASE_URL = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =====================================================
   GLOBAL STATE
===================================================== */
let user = null;
let coupleId = null;
let members = [];
let currentDay = null;
let myPause = null;
let partnerPause = null;

/* =====================================================
   DOM
===================================================== */
const auth = document.getElementById("auth");
const app = document.getElementById("app");
const coupleSetup = document.getElementById("coupleSetup");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const createCoupleBtn = document.getElementById("createCoupleBtn");
const joinCoupleBtn = document.getElementById("joinCoupleBtn");
const joinCodeInput = document.getElementById("joinCode");
const coupleMsg = document.getElementById("coupleMsg");

const daysBox = document.getElementById("days");
const modal = document.getElementById("dayModal");
const modalTitle = document.getElementById("modalTitle");
const modalTask = document.getElementById("modalTask");
const taskArea = document.getElementById("taskArea");
const modalDoneBtn = document.getElementById("modalDoneBtn");

const feedList = document.getElementById("feedList");
const badgesBox = document.getElementById("badges");
const storiesRow = document.getElementById("storiesRow");

const notifBell = document.getElementById("notifBell");
const pauseBtn = document.getElementById("pauseBtn");

/* =====================================================
   DAY CONTENT
===================================================== */
const dayData = {
  1:{reading:"Nombrar lo que sientes abre la puerta al entendimiento.",prayer:"Dame claridad para entender mi corazón.",taskType:"text",prompt:"¿Qué emoción sentiste hoy?",dopamine:"🌱 Emoción reconocida"},
  2:{reading:"Pausar también es amar.",prayer:"Enséñame a responder con calma.",taskType:"scroll_stop",prompt:"Respira 3 veces conscientemente.",dopamine:"🧘 Autocontrol"},
  3:{reading:"La honestidad sana.",prayer:"Ayúdame a hablar con verdad.",taskType:"choice",options:["Amor","Miedo","Cansancio"],prompt:"¿Desde dónde reaccionaste?",dopamine:"💡 Conciencia"},
  7:{reading:"Expresarse libera.",prayer:"Dame valentía emocional.",taskType:"audio",prompt:"Graba cómo te sentiste esta semana.",dopamine:"🎙 Voz auténtica",story:true},
  12:{reading:"La belleza habita en lo simple.",prayer:"Gracias por la paz.",taskType:"photo",prompt:"Foto de algo que te dio paz.",dopamine:"📸 Presencia",story:true},
  18:{reading:"Decir amor lo multiplica.",prayer:"Enséñame a valorar.",taskType:"video",prompt:"Video de 15s agradeciendo a tu pareja.",dopamine:"🎥 Aprecio",story:true}
};

/* =====================================================
   AUTH
===================================================== */
loginBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  let { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) await supabase.auth.signUp({ email, password });

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
  await checkCouple();
}
checkUser();

/* =====================================================
   COUPLE SETUP
===================================================== */
async function checkCouple() {
  const { data } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    coupleSetup.classList.remove("hidden");
    app.classList.add("hidden");
    return;
  }

  coupleId = data.couple_id;
  coupleSetup.classList.add("hidden");
  app.classList.remove("hidden");

  initApp();
}

createCoupleBtn.onclick = async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  coupleMsg.textContent = "Creando espacio...";

  const { data: couple } = await supabase
    .from("couples")
    .insert({ code })
    .select()
    .single();

  await supabase.from("couple_members").insert({
    couple_id: couple.id,
    user_id: user.id
  });

  coupleMsg.innerHTML = `💌 Comparte este código:<br><strong>${code}</strong>`;
  setTimeout(() => location.reload(), 2500);
};

joinCoupleBtn.onclick = async () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) return;

  coupleMsg.textContent = "Uniéndote...";

  const { data: couple } = await supabase
    .from("couples")
    .select("id")
    .eq("code", code)
    .single();

  if (!couple) {
    coupleMsg.textContent = "Código inválido";
    return;
  }

  await supabase.from("couple_members").insert({
    couple_id: couple.id,
    user_id: user.id
  });

  coupleMsg.textContent = "💙 Conectados";
  setTimeout(() => location.reload(), 1500);
};

/* =====================================================
   INIT APP
===================================================== */
async function initApp() {
  await loadMembers();
  await loadPauseStatus();
  loadDays();
  loadFeed();
  loadStories();
  loadBadges();
  loadProgress();
}

/* =====================================================
   MEMBERS
===================================================== */
async function loadMembers() {
  const { data } = await supabase
    .from("couple_members")
    .select("user_id")
    .eq("couple_id", coupleId);

  members = data.map(m => m.user_id);
}

/* =====================================================
   PAUSE MODE
===================================================== */
async function loadPauseStatus() {
  const mine = await supabase
    .from("pause_status")
    .select("*")
    .eq("user_id", user.id)
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(1);

  const partner = await supabase
    .from("pause_status")
    .select("*")
    .neq("user_id", user.id)
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(1);

  myPause = mine.data?.[0];
  partnerPause = partner.data?.[0];

  pauseBtn.textContent = isPauseActive(myPause) ? "⏸ En pausa" : "⏸ Pausa";
}

function isPauseActive(p) {
  return p?.active && new Date(p.until) > new Date();
}

pauseBtn.onclick = async () => {
  const hours = prompt("¿Cuántas horas necesitas?");
  if (!hours) return;

  const until = new Date(Date.now() + hours * 3600000).toISOString();

  await supabase.from("pause_status").insert({
    couple_id: coupleId,
    user_id: user.id,
    active: true,
    until
  });

  notifyPartner("⏸ Tu pareja activó una pausa consciente");
  loadPauseStatus();
};

/* =====================================================
   DAYS GRID
===================================================== */
async function loadDays() {
  daysBox.innerHTML = "";

  for (let d = 1; d <= 21; d++) {
    const { data } = await supabase
      .from("entries")
      .select("user_id")
      .eq("couple_id", coupleId)
      .eq("day", d);

    const div = document.createElement("div");
    div.className = "day";
    div.textContent = data.length === members.length ? d : "🔒";
    div.onclick = () => openModal(d);
    daysBox.appendChild(div);
  }
}

/* =====================================================
   MODAL
===================================================== */
async function openModal(day) {
  await loadPauseStatus();

  if (isPauseActive(partnerPause)) {
    modalTitle.textContent = "⏸ Pausa consciente";
    modalTask.textContent = "Tu pareja está cuidando su espacio.";
    taskArea.innerHTML = "";
    modal.classList.remove("hidden");
    return;
  }

  currentDay = day;

  const { data } = await supabase
    .from("entries")
    .select("user_id")
    .eq("couple_id", coupleId)
    .eq("day", day);

  if (data.length < members.length) {
    modalTitle.textContent = `Día ${day}`;
    modalTask.textContent = "🔒 Ambos deben completar este día.";
    taskArea.innerHTML = "";
    modal.classList.remove("hidden");
    return;
  }

  const d = dayData[day];
  modalTitle.textContent = `Día ${day}`;
  modalTask.innerHTML = `
    <p><strong>📖 Lectura:</strong> ${d.reading}</p>
    <p><strong>🙏 Oración:</strong> ${d.prayer}</p>
    <hr>
    <p><strong>🎯 Micro-tarea:</strong> ${d.prompt}</p>
  `;
  renderTask(d);
  modal.classList.remove("hidden");
}
window.closeModal = () => modal.classList.add("hidden");

/* =====================================================
   TASKS
===================================================== */
function renderTask(d) {
  taskArea.innerHTML = "";
  modalDoneBtn.classList.add("hidden");

  if (d.taskType === "text") {
    const t = document.createElement("textarea");
    taskArea.appendChild(t);
    modalDoneBtn.classList.remove("hidden");
    modalDoneBtn.onclick = () => saveEntry("text", t.value);
  }

  if (d.taskType === "choice") {
    d.options.forEach(o => {
      const b = document.createElement("button");
      b.textContent = o;
      b.onclick = () => saveEntry("text", o);
      taskArea.appendChild(b);
    });
  }

  if (["audio","photo","video"].includes(d.taskType)) {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = `${d.taskType}/*`;
    i.onchange = e => uploadFile(e.target.files[0], d.taskType);
    taskArea.appendChild(i);
  }

  if (d.taskType === "scroll_stop") {
    const b = document.createElement("button");
    b.textContent = "Listo";
    b.onclick = () => saveEntry("text", "Hecho conscientemente");
    taskArea.appendChild(b);
  }
}

/* =====================================================
   SAVE
===================================================== */
async function saveEntry(type, content) {
  await supabase.from("entries").insert({
    couple_id: coupleId,
    user_id: user.id,
    day: currentDay,
    type,
    content_text: content,
    dopamine: dayData[currentDay].dopamine,
    is_story: !!dayData[currentDay].story
  });

  finishTask();
}

async function uploadFile(file, type) {
  const path = `${coupleId}/${user.id}/${Date.now()}-${file.name}`;
  await supabase.storage.from("entries").upload(path, file);
  const url = supabase.storage.from("entries").getPublicUrl(path).data.publicUrl;

  await supabase.from("entries").insert({
    couple_id: coupleId,
    user_id: user.id,
    day: currentDay,
    type,
    content_url: url,
    dopamine: dayData[currentDay].dopamine,
    is_story: !!dayData[currentDay].story
  });

  finishTask();
}

/* =====================================================
   FINISH
===================================================== */
function finishTask() {
  showDopamine(dayData[currentDay].dopamine);
  notifyPartner(`💙 Tu pareja completó el día ${currentDay}`);
  closeModal();
  loadDays();
  loadFeed();
  loadStories();
  loadBadges();
  loadProgress();
}

/* =====================================================
   FEED
===================================================== */
async function loadFeed() {
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false });

  feedList.innerHTML = "";

  data.forEach(e => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `<strong>Día ${e.day}</strong>`;
    feedList.appendChild(card);
  });
}

/* =====================================================
   STORIES
===================================================== */
async function loadStories() {
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("is_story", true)
    .gte("created_at", since);

  storiesRow.innerHTML = "";

  data.forEach(s => {
    const div = document.createElement("div");
    div.className = "story";
    div.textContent = "✨";
    div.onclick = () => openStory(s);
    storiesRow.appendChild(div);
  });
}

function openStory(s) {
  modalTitle.textContent = "Momento";
  modalTask.innerHTML = "";
  taskArea.innerHTML =
    s.type === "photo" ? `<img src="${s.content_url}" style="width:100%">` :
    s.type === "video" ? `<video src="${s.content_url}" controls autoplay style="width:100%"></video>` :
    s.type === "audio" ? `<audio src="${s.content_url}" controls autoplay></audio>` :
    `<p>${s.content_text}</p>`;
  modal.classList.remove("hidden");
}

/* =====================================================
   BADGES
===================================================== */
async function loadBadges() {
  const { data } = await supabase
    .from("badges")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("user_id", user.id);

  badgesBox.innerHTML = "";
  data.forEach(b => {
    const s = document.createElement("span");
    s.textContent = b.badge;
    badgesBox.appendChild(s);
  });
}

/* =====================================================
   PROGRESS
===================================================== */
async function loadProgress() {
  const { data } = await supabase
    .from("entries")
    .select("day,user_id")
    .eq("couple_id", coupleId);

  const progress = {};
  data.forEach(e => {
    progress[e.day] = progress[e.day] || new Set();
    progress[e.day].add(e.user_id);
  });

  Object.keys(progress).forEach(d => {
    if (progress[d].size === members.length) {
      // completado juntos
    }
  });
}

/* =====================================================
   NOTIFICATIONS
===================================================== */
async function notifyPartner(message) {
  await supabase.from("notifications").insert({
    couple_id: coupleId,
    user_id: members.find(id => id !== user.id),
    message
  });
}

notifBell.onclick = async () => {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id);

  alert(data.map(n => "• " + n.message).join("\n"));
};

/* =====================================================
   DOPAMINE
===================================================== */
function showDopamine(text) {
  const d = document.createElement("div");
  d.textContent = text;
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
