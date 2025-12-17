import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

const SUPABASE_URL = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const logoutBtn = document.getElementById("logoutBtn");
const loginBtn = document.getElementById("loginBtn");
const emailInp = document.getElementById("email");
const passInp = document.getElementById("password");
const authMsg = document.getElementById("authMsg");
const welcome = document.getElementById("welcome");
const daysBox = document.getElementById("days");
const rewardBox = document.getElementById("reward");
const rewardText = document.getElementById("rewardText");
const rewardImg = document.getElementById("rewardImg");

let user = null;
let partner = null;

checkUser();
async function checkUser() {
  const { data } = await supabase.auth.getSession();
  user = data?.session?.user ?? null;
  if (user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    welcome.textContent = `Hola, ${user.email}`;
    loadProgress();
  }
}

loginBtn.onclick = async () => {
  const email = emailInp.value.trim();
  const pass = passInp.value.trim();
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    const { error: signUpErr } = await supabase.auth.signUp({ email, password: pass });
    if (signUpErr) return (authMsg.textContent = signUpErr.message);
  }
  checkUser();
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

async function loadProgress() {
  daysBox.innerHTML = "";
  // Obtener progreso propio
  const { data: me } = await supabase.from("progress").select("day").eq("user_id", user.id);
  const myDays = new Set(me.map((x) => x.day));
  // Obtener pareja (cualquier otro usuario)
  const { data: all } = await supabase.from("progress").select("user_id, day");
  const partners = all.filter((x) => x.user_id !== user.id);
  const partnerDays = new Set(partners.map((x) => x.day));
  for (let d = 1; d <= 21; d++) {
    const div = document.createElement("div");
    div.className = "day";
    div.textContent = d;
    if (myDays.has(d)) div.classList.add("done");
    div.onclick = () => toggleDay(d);
    daysBox.appendChild(div);
  }
  // Recompensa si ambos hoy
  const today = new Date().getDate() % 21 || 21;
  if (myDays.has(today) && partnerDays.has(today)) showReward(today);
}

async function toggleDay(day) {
  const { data } = await supabase.from("progress").select().eq("user_id", user.id).eq("day", day).single();
  if (data) {
    await supabase.from("progress").delete().eq("id", data.id);
  } else {
    await supabase.from("progress").insert({ user_id: user.id, day });
  }
  loadProgress();
}

async function showReward(day) {
  const { data } = await supabase.from("rewards").select().eq("day", day).single();
  if (data) {
    rewardText.textContent = data.message;
    rewardImg.src = data.image_url;
    rewardBox.classList.remove("hidden");
  }
}
