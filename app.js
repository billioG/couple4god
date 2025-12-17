import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

const SUPABASE_URL = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =====================================================
   SUPABASE
===================================================== */
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

const SUPABASE_URL = "TU_SUPABASE_URL";
const SUPABASE_KEY = "TU_SUPABASE_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let user = null;
let partnerId = null;
let currentDay = null;
let myPause = null;
let partnerPause = null;

/* =====================================================
   DOM
===================================================== */
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
const pauseBtn = document.getElementById("pauseBtn");

/* =====================================================
   DAY DATA (LECTURA + ORACIÓN + TAREA)
===================================================== */
const dayData = {
  1:{title:"Nombrar emoción",reading:"Reconocer lo que sientes es el primer paso para amar mejor.",prayer:"Señor, dame claridad para entender mi corazón.",taskType:"text",prompt:"Escribe una emoción que sentiste hoy.",dopamine:"🌱 Emoción reconocida"},
  2:{title:"Pausa consciente",reading:"No toda reacción necesita una respuesta inmediata.",prayer:"Dame dominio propio.",taskType:"scroll_stop",prompt:"Respira profundo 3 veces antes de continuar.",dopamine:"🧠 Autocontrol"},
  3:{title:"Origen",reading:"Comprender el origen cambia el impacto.",prayer:"Muéstrame desde dónde reacciono.",taskType:"choice",options:["Amor","Miedo","Cansancio"],prompt:"¿Desde dónde reaccionaste hoy?",dopamine:"💡 Conciencia"},
  7:{title:"Semana 1",reading:"Hablar libera.",prayer:"Permíteme expresarme con verdad.",taskType:"audio",prompt:"Graba cómo te sentiste esta semana.",dopamine:"🎙 Voz auténtica",story:true},
  12:{title:"Paz",reading:"La paz se reconoce en lo simple.",prayer:"Gracias por la calma.",taskType:"photo",prompt:"Foto de algo que te dio paz.",dopamine:"📸 Presencia",story:true},
  18:{title:"Aprecio",reading:"El amor dicho en voz alta sana.",prayer:"Ayúdame a expresar amor.",taskType:"video",prompt:"Video de 15s valorando a tu pareja.",dopamine:"🎥 Aprecio",story:true}
};

/* =====================================================
   AUTH
===================================================== */
loginBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
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
  app.classList.remove("hidden");

  await loadPartner();
  await loadPauseStatus();
  loadDays();
  loadFeed();
  loadStories();
  loadBadges();
  loadInsights();
  loadProgress();
}
checkUser();

/* =====================================================
   COUPLE
===================================================== */
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

/* =====================================================
   PAUSE MODE
===================================================== */
async function loadPauseStatus() {
  const mine = await supabase.from("pause_status").select("*").eq("user_id", user.id).order("created_at",{ascending:false}).limit(1);
  const partner = await supabase.from("pause_status").select("*").eq("user_id", partnerId).order("created_at",{ascending:false}).limit(1);
  myPause = mine.data?.[0];
  partnerPause = partner.data?.[0];

  if (isPauseActive(myPause)) {
    pauseBtn.textContent = "⏸ En pausa";
    pauseBtn.style.opacity = "0.6";
  } else {
    pauseBtn.textContent = "⏸ Pausa";
    pauseBtn.style.opacity = "1";
  }
}

function isPauseActive(p) {
  return p?.active && new Date(p.until) > new Date();
}

pauseBtn.onclick = async () => {
  const hours = prompt("¿Cuántas horas necesitas? (ej: 12, 24)");
  if (!hours) return;
  const until = new Date(Date.now() + hours * 3600000).toISOString();
  await supabase.from("pause_status").insert({
    user_id: user.id,
    active: true,
    until,
    reason: "Pausa consciente"
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
    const div = document.createElement("div");
    div.className = "day";
    const unlocked = await bothCompleted(d);
    div.textContent = unlocked ? d : "🔒";
    div.style.opacity = unlocked ? "1" : "0.4";
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
    modalTask.innerHTML = "Tu pareja está cuidando su espacio.";
    taskArea.innerHTML = "";
    modal.classList.remove("hidden");
    return;
  }

  currentDay = day;
  if (!(await bothCompleted(day))) {
    modalTitle.textContent = `Día ${day}`;
    modalTask.innerHTML = "🔒 Se desbloquea cuando ambos lo completan.";
    taskArea.innerHTML = "";
    modal.classList.remove("hidden");
    return;
  }

  const d = dayData[day];
  modalTitle.textContent = `Día ${day}`;
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

/* =====================================================
   SAVE
===================================================== */
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
  calculateWeeklyInsight();
  loadProgress();
}

/* =====================================================
   FEED
===================================================== */
async function loadFeed() {
  await loadPauseStatus();
  if (isPauseActive(partnerPause)) {
    feedList.innerHTML = `<div class="feed-card locked">⏸ Pausa consciente activa</div>`;
    return;
  }

  const { data } = await supabase.from("entries").select("*").order("created_at",{ascending:false});
  feedList.innerHTML = "";

  for (const e of data) {
    if (e.user_id !== user.id && !(await bothCompleted(e.day))) {
      feedList.innerHTML += `<div class="feed-card locked">🔒 Completa el día ${e.day}</div>`;
      continue;
    }
    const c = document.createElement("div");
    c.className = "feed-card";
    c.innerHTML = `<strong>Día ${e.day}</strong>`;
    feedList.appendChild(c);
  }
}

/* =====================================================
   STORIES
===================================================== */
async function loadStories() {
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data } = await supabase.from("entries").select("*").eq("is_story",true).gte("created_at",since);
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
  taskArea.innerHTML =
    s.type==="photo"?`<img src="${s.content_url}" style="width:100%">`:
    s.type==="video"?`<video src="${s.content_url}" controls autoplay style="width:100%"></video>`:
    s.type==="audio"?`<audio src="${s.content_url}" controls autoplay></audio>`:
    `<p>${s.content_text}</p>`;
  modal.classList.remove("hidden");
}

/* =====================================================
   BADGES
===================================================== */
async function checkBadges() {
  const { data } = await supabase.from("entries").select("type").eq("user_id", user.id);
  const c = t => data.filter(e=>e.type===t).length;
  if (c("audio")>=3) giveBadge("🎙 Comunicación");
  if (c("text")>=3) giveBadge("✍️ Honestidad");
  if (c("photo")>=2) giveBadge("📸 Presencia");
  if (c("video")>=1) giveBadge("🎥 Aprecio");
}

async function giveBadge(badge) {
  await supabase.from("badges").insert({user_id:user.id,badge});
  loadBadges();
}

async function loadBadges() {
  const { data } = await supabase.from("badges").select("*").eq("user_id",user.id);
  badgesBox.innerHTML = "";
  data.forEach(b=>{
    const s=document.createElement("span");
    s.className="badge";
    s.textContent=b.badge;
    badgesBox.appendChild(s);
  });
}

/* =====================================================
   INSIGHTS
===================================================== */
function generateInsight(stats) {
  if (stats.audio>=2 && stats.text>=2) return "💬 Comunicación y apertura marcaron la semana.";
  if (stats.text>=3) return "✍️ Claridad emocional en crecimiento.";
  if (stats.audio>=2) return "🎙 Valentía emocional presente.";
  return "🌱 Cada paso cuenta.";
}

async function calculateWeeklyInsight() {
  const since=new Date(Date.now()-604800000).toISOString();
  const { data }=await supabase.from("entries").select("type").eq("user_id",user.id).gte("created_at",since);
  if (!data?.length) return;
  const stats={text:0,audio:0,photo:0,video:0};
  data.forEach(e=>stats[e.type]++);
  await supabase.from("insights").insert({
    user_id:user.id,
    week:Math.ceil(Date.now()/604800000),
    message:generateInsight(stats)
  });
}

async function loadInsights() {
  const { data }=await supabase.from("insights").select("*").order("created_at",{ascending:false}).limit(1);
  if (!data?.length) return;
  const c=document.createElement("div");
  c.className="feed-card";
  c.innerHTML=`<strong>🧠 Insight semanal</strong><p>${data[0].message}</p>`;
  feedList.prepend(c);
}

/* =====================================================
   NUESTRO PROGRESO (NUEVO)
===================================================== */
async function loadProgress() {
  const { data } = await supabase.from("entries").select("day,created_at").in("user_id",[user.id,partnerId]);
  if (!data?.length) return;

  const progress = {};
  data.forEach(e=>{
    progress[e.day]=(progress[e.day]||0)+1;
  });

  const c=document.createElement("div");
  c.className="feed-card";
  c.innerHTML="<strong>📈 Nuestro progreso</strong>";
  Object.keys(progress).sort((a,b)=>a-b).forEach(d=>{
    if (progress[d]===2) c.innerHTML+=`<p>✔ Día ${d} completado juntos</p>`;
  });

  feedList.prepend(c);
}

/* =====================================================
   NOTIFICATIONS
===================================================== */
async function notifyPartner(message) {
  await supabase.from("notifications").insert({
    user_id: partnerId,
    message
  });
}

notifBell.onclick = async () => {
  const { data } = await supabase.from("notifications").select("*").eq("user_id",user.id);
  alert(data.map(n=>"• "+n.message).join("\n"));
};

/* =====================================================
   DOPAMINE
===================================================== */
function showDopamine(msg) {
  const d=document.createElement("div");
  d.textContent=msg;
  d.style.position="fixed";
  d.style.bottom="20%";
  d.style.left="50%";
  d.style.transform="translateX(-50%)";
  d.style.background="#fff";
  d.style.color="#000";
  d.style.padding="1rem";
  d.style.borderRadius="20px";
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),1200);
}

/* =====================================================
   PWA
===================================================== */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

