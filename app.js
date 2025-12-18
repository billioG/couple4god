const supabaseUrl = "https://dsiuuymgyzkcksaqtoqk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ELEMENTOS
const auth = document.getElementById("auth");
const coupleSetup = document.getElementById("coupleSetup");
const app = document.getElementById("app");

const loginBtn = document.getElementById("loginBtn");
const createCoupleBtn = document.getElementById("createCoupleBtn");
const joinCoupleBtn = document.getElementById("joinCoupleBtn");
const completeDayBtn = document.getElementById("completeDayBtn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const joinCodeInput = document.getElementById("joinCode");

const coupleCodeBox = document.getElementById("coupleCodeBox");
const coupleCodeText = document.getElementById("coupleCode");

const dayContent = document.getElementById("dayContent");
const currentDayEl = document.getElementById("currentDay");

// ESTADO
let user = null;
let coupleId = null;
let currentDay = 1;

// RETOS
const days = {
  1: {
    lectura: "Amarse es decidir cuidar al otro incluso cuando cuesta.",
    oracion: "Gracias Dios por la persona que camina conmigo.",
    tarea: "Dile algo que admiras de tu pareja."
  }
};

// LOGIN
loginBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  user = data.user;
  auth.classList.add("hidden");
  coupleSetup.classList.remove("hidden");
};

//  CREAR CÓDIGO
function generateCoupleCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

//  CREAR PAREJA
createCoupleBtn.onclick = async () => {
  const code = generateCoupleCode();

  const { data: couple, error } = await supabase
    .from("couples")
    .insert({ code, plan: "free" })
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Error creando pareja");
    return;
  }

  await supabase.from("couple_members").insert({
    couple_id: couple.id,
    user_id: user.id
  });

  coupleId = couple.id;

  coupleCodeText.textContent = code;
  coupleCodeBox.classList.remove("hidden");

  coupleSetup.classList.add("hidden");
  app.classList.remove("hidden");

  loadDay();
};

//  UNIRSE A PAREJA
joinCoupleBtn.onclick = async () => {
  const code = joinCodeInput.value.trim();

  const { data: couple } = await supabase
    .from("couples")
    .select("*")
    .eq("code", code)
    .single();

  if (!couple) {
    alert("Código inválido");
    return;
  }

  await supabase.from("couple_members").insert({
    couple_id: couple.id,
    user_id: user.id
  });

  coupleId = couple.id;

  coupleSetup.classList.add("hidden");
  app.classList.remove("hidden");

  loadDay();
};

//  MOSTRAR DÍA
function loadDay() {
  const d = days[currentDay];

  currentDayEl.textContent = currentDay;

  dayContent.innerHTML = `
    <p><strong>📖 Lectura:</strong> ${d.lectura}</p>
    <p><strong>🙏 Oración:</strong> ${d.oracion}</p>
    <p><strong>🎯 Micro-tarea:</strong> ${d.tarea}</p>
  `;
}

//  COMPLETAR DÍA
completeDayBtn.onclick = async () => {
  await supabase.from("entries").insert({
    couple_id: coupleId,
    user_id: user.id,
    day: currentDay
  });

  alert("Esperando a tu pareja 💙");
};
