import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

const SUPABASE_URL = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let user = null;
let currentDay = null;

const dayData = {
  1:{title:"Nombrar emoción",taskType:"text",prompt:"Escribe una emoción que sentiste hoy.",dopamine:"🌱 Emoción reconocida"},
  2:{title:"Pausa consciente",taskType:"scroll_stop",prompt:"Respira 3 veces antes de seguir.",dopamine:"🧠 Control recuperado"},
  3:{title:"Origen reacción",taskType:"choice",prompt:"¿Desde dónde reaccionaste hoy?",options:["Amor","Miedo","Cansancio"],dopamine:"💡 Conciencia"},
  4:{title:"Espacio personal",taskType:"reflection",prompt:"Haz algo solo para ti hoy.",dopamine:"🧘 Autonomía"},
  5:{title:"Necesidad",taskType:"text",prompt:"¿Qué necesitas hoy?",dopamine:"🧭 Claridad"},
  6:{title:"Escucha",taskType:"choice",prompt:"¿Escuchaste sin interrumpir?",options:["Sí","Me costó","Lo intento"],dopamine:"👂 Escucha"},
  7:{title:"Semana 1",taskType:"audio",prompt:"Graba cómo te sentiste esta semana.",dopamine:"🎙 Voz auténtica",story:true},
  8:{title:"Hablar desde el yo",taskType:"text",prompt:"Redacta: Yo siento…",dopamine:"💬 Comunicación"},
  9:{title:"Respetar límite",taskType:"reflection",prompt:"Respeta un límite hoy.",dopamine:"🤝 Respeto"},
  10:{title:"No reaccionar",taskType:"scroll_stop",prompt:"Espera 60s antes de responder.",dopamine:"⏸ Dominio"},
  11:{title:"Reconocer",taskType:"text",prompt:"Algo que valoras del otro.",dopamine:"❤️ Aprecio"},
  12:{title:"Paz",taskType:"photo",prompt:"Foto de algo que te dio paz.",dopamine:"📸 Presencia",story:true},
  13:{title:"Verdad",taskType:"audio",prompt:"Graba algo importante.",dopamine:"🕊 Verdad"},
  14:{title:"Revisión",taskType:"choice",prompt:"¿Qué cambió más?",options:["Comunicación","Control","Claridad"],dopamine:"🌿 Progreso"},
  15:{title:"Límite",taskType:"text",prompt:"Escribe un límite sano.",dopamine:"🧱 Límite"},
  16:{title:"Humildad",taskType:"reflection",prompt:"Reconoce una falla propia.",dopamine:"🙇 Humildad"},
  17:{title:"Empatía",taskType:"choice",prompt:"¿Pensaste en el otro?",options:["Sí","Un poco","Ahora sí"],dopamine:"🧠 Empatía"},
 18:{title:"Aprecio",taskType:"video",prompt:"Video de 15s valorando al otro.",dopamine:"🎥 Aprecio",story:true},
  19:{title:"Soltar",taskType:"text",prompt:"¿Qué decides soltar hoy?",dopamine:"🙏 Confianza"},
  20:{title:"Reparar",taskType:"audio",prompt:"Disculpa breve si es sincera.",dopamine:"🩹 Reparación"},
  21:{title:"Cierre",taskType:"choice",prompt:"¿Cómo te sientes?",options:["Paz","Claridad","Discernimiento"],dopamine:"🌟 Completado"}
};

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


loginBtn.onclick = async () => {
  const email = email.value;
  const password = password.value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  loadDays();
  loadFeed();
  loadBadges();
  loadStories();
}
checkUser();

function loadDays() {
  daysBox.innerHTML = "";
  for (let d = 1; d <= 21; d++) {
    const div = document.createElement("div");
    div.className = "day";
    div.textContent = d;
    div.onclick = () => openModal(d);
    daysBox.appendChild(div);
  }
}

function openModal(day) {
  currentDay = day;
  modalTitle.textContent = `Día ${day}`;
  modalTask.textContent = dayData[day].prompt;
  renderTask(day);
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}
window.closeModal = closeModal;

function renderTask(day) {
  taskArea.innerHTML = "";
  const t = dayData[day];

  if (t.taskType === "text") {
    taskArea.innerHTML = `<textarea></textarea>`;
    modalDoneBtn.onclick = () => saveText(taskArea.querySelector("textarea").value);
    modalDoneBtn.classList.remove("hidden");
  }

  if (t.taskType === "choice") {
    t.options.forEach(o => {
      const b = document.createElement("button");
      b.textContent = o;
      b.onclick = () => saveText(o);
      taskArea.appendChild(b);
    });
    modalDoneBtn.classList.add("hidden");
  }

  if (["audio","photo","video"].includes(t.taskType)) {
    taskArea.innerHTML = `<input type="file" accept="${t.taskType}/*">`;
    taskArea.querySelector("input").onchange = e => saveFile(e.target.files[0], t.taskType);
    modalDoneBtn.classList.add("hidden");
  }

  if (t.taskType === "scroll_stop") {
    taskArea.innerHTML = `<button onclick="completeInstant()">Listo</button>`;
    modalDoneBtn.classList.add("hidden");
  }
}

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


function completeInstant() {
  saveText("Hecho conscientemente");
}

function finishTask() {
  showDopamine(dayData[currentDay].dopamine);

  notifyPartner(
    `💌 Tu pareja completó el día ${currentDay}: ${dayData[currentDay].title}`
  );

  closeModal();
  loadFeed();
  checkBadges();
  calculateWeeklyInsight();
loadInsights();

}

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

async function loadFeed() {
  const { data } = await supabase
    .from("entries")
    .select("*")
    .order("created_at",{ascending:false});

  feedList.innerHTML = "";

  for (const e of data) {
    if (e.user_id !== user.id) {
      const unlocked = await bothCompleted(entry.day);
      if (!unlocked) {
        feedList.innerHTML += `
          <div class="feed-card locked">
            🔒 Completa el día ${entry.day} para compartir este momento juntos 💙
          </div>`;
        continue;
      }
    }

    const c = document.createElement("div");
    c.className = "feed-card";
    c.innerHTML = `<strong>Día ${entry.day}</strong><br>${e.type}`;
    feedList.appendChild(c);
    const reactionsDiv = document.createElement("div");
reactionsDiv.className = "reactions";

["❤️","🔥","🥹","🙏"].forEach(e => {
  const b = document.createElement("span");
  b.className = "reaction-btn";
  b.textContent = e;
  b.onclick = () => react(entry.id, e);
  reactionsDiv.appendChild(b);
});

c.appendChild(reactionsDiv);

const summary = document.createElement("div");
c.appendChild(summary);
loadReactions(entry.id, summary);

  }
}


async function checkBadges() {
  const { data } = await supabase.from("entries").select("type").eq("user_id", user.id);
  const count = t => data.filter(e => e.type === t).length;

  if (count("audio") >= 3) giveBadge("🎙 Comunicación");
  if (count("text") >= 3) giveBadge("✍️ Honestidad");
  if (count("photo") >= 2) giveBadge("📸 Presencia");
  if (count("video") >= 1) giveBadge("🎥 Aprecio");
}

async function giveBadge(name) {
  await supabase.from("badges").insert({ user_id: user.id, badge: name });
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

async function notifyPartner(message) {
  // En este MVP notificamos a todos menos al usuario actual
  const { data: users } = await supabase.from("profiles").select("id");

  users
    .filter(u => u.id !== user.id)
    .forEach(async u => {
      await supabase.from("notifications").insert({
        user_id: u.id,
        message
      });
    });
}

const notifBell = document.getElementById("notifBell");

notifBell.onclick = async () => {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  alert(
    data.map(n => "• " + n.message).join("\n")
  );

  await supabase
    .from("notifications")
    .update({ seen: true })
    .eq("user_id", user.id);
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

const storiesRow = document.getElementById("storiesRow");

async function loadStories() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("is_story", true)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  storiesRow.innerHTML = "";

  data.forEach(s => {
    const div = document.createElement("div");
    div.className = "story";
    div.textContent = s.type === "audio" ? "🎙" :
                      s.type === "photo" ? "📸" :
                      s.type === "video" ? "🎥" : "💬";

    div.onclick = () => openStory(s);
    storiesRow.appendChild(div);
  });
}

function openStory(story) {
  let content = "";

  if (story.type === "photo")
    content = `<img src="${story.content_url}" style="width:100%">`;

  if (story.type === "video")
    content = `<video src="${story.content_url}" autoplay controls style="width:100%"></video>`;

  if (story.type === "audio")
    content = `<audio src="${story.content_url}" autoplay controls></audio>`;

  if (story.type === "text")
    content = `<p>${story.content_text}</p>`;

  modalTitle.textContent = "Momento";
  taskArea.innerHTML = content;
  modalTask.textContent = "";
  modalDoneBtn.classList.add("hidden");
  modal.classList.remove("hidden");
}

let partnerId = null;

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

async function react(entryId, emoji) {
  await supabase.from("reactions").insert({
    entry_id: entryId,
    user_id: user.id,
    emoji
  });

  showDopamine(emoji);
}

async function loadReactions(entryId, container) {
  const { data } = await supabase
    .from("reactions")
    .select("emoji")
    .eq("entry_id", entryId);

  const summary = {};
  data.forEach(r => summary[r.emoji] = (summary[r.emoji] || 0) + 1);

  container.innerHTML = Object.keys(summary)
    .map(e => `${e} ${summary[e]}`)
    .join(" ");
}

function generateInsight(stats) {
  if (stats.audio >= 2 && stats.text >= 2)
    return "💬 Esta semana hubo apertura y comunicación sincera. Eso construye confianza.";

  if (stats.text >= 3)
    return "✍️ Expresarte por escrito muestra claridad emocional. Vas en buen camino.";

  if (stats.audio >= 2)
    return "🎙 Hablar desde la voz es un acto de valentía emocional.";

  if (stats.photo + stats.video >= 2)
    return "📸 Estuviste presente y consciente. Eso fortalece el vínculo.";

  return "🌱 Pequeños pasos también son progreso. La constancia importa más que la perfección.";
}

async function calculateWeeklyInsight() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("entries")
    .select("type")
    .eq("user_id", user.id)
    .gte("created_at", since);

  if (!data || data.length === 0) return;

  const stats = { text:0, audio:0, photo:0, video:0 };
  data.forEach(e => stats[e.type]++);

  const message = generateInsight(stats);
  const week = Math.ceil((Date.now() - new Date(data[0].created_at)) / (7 * 24 * 60 * 60 * 1000));

  await supabase.from("insights").insert({
    user_id: user.id,
    week,
    message
  });
}

async function loadInsights() {
  const { data } = await supabase
    .from("insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || !data.length) return;

  const card = document.createElement("div");
  card.className = "feed-card";
  card.innerHTML = `
    <strong>🧠 Insight semanal</strong>
    <p>${data[0].message}</p>
  `;

  feedList.prepend(card);
}

