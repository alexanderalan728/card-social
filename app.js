const SUPABASE_URL = "https://uvaofrkejypfagfvpxqk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gjhZbHIGXXRs5TervkJO5g_VN1L85qM";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
function canDrawToday() {
  const today = new Date().toISOString().slice(0, 10);
  const drawData = JSON.parse(localStorage.getItem("draw_limit"));

  if (!drawData || drawData.date !== today) {
    localStorage.setItem(
      "draw_limit",
      JSON.stringify({ date: today, count: 0 })
    );
    return true;
  }

  return drawData.count < 1; // 👈 一天 1 次
}

function recordDraw() {
  const data = JSON.parse(localStorage.getItem("draw_limit"));
  data.count += 1;
  localStorage.setItem("draw_limit", JSON.stringify(data));
}

const btn = document.getElementById("btn");
const result = document.getElementById("result");
const card = document.getElementById("card");

btn.onclick = async () => {
  const nickname = document.getElementById("nickname").value.trim();
  const gender = document.getElementById("gender").value;
  const contact = document.getElementById("contact").value.trim();

  if (!nickname || !contact) {
    result.innerText = "请填写完整信息";
    return;
  }

  const { error } = await supabase
    .from("users")
    .insert([{ nickname, gender, contact }]);

  if (error) {
    result.innerText = "你已经在卡池里了 😄";
  } else {
    localStorage.setItem("my_contact", contact);
    result.innerText = "注册成功，已进入卡池 🎉";
  }
};

async function drawCard(targetGender) {  if (!canDrawToday()) {
    card.innerText = "今天已经抽过啦，明天再来 😄";
    return;
  }

  const myContact = localStorage.getItem("my_contact");

  if (!myContact) {
    card.innerText = "请先注册进入卡池";
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("gender", targetGender)
    .neq("contact", myContact);

  if (error || !data || data.length === 0) {
    card.innerText = "暂时没有可抽的卡";
    return;
  }

  const randomUser = data[Math.floor(Math.random() * data.length)];
recordDraw();

  card.innerHTML = `
    <h3>🎉 抽到一张卡！</h3>
    <p>昵称：${randomUser.nickname}</p>
    <p>性别：${randomUser.gender}</p>
    <p>联系方式：${randomUser.contact}</p>
  `;
}

document.getElementById("drawMale").onclick = () => drawCard("男");
document.getElementById("drawFemale").onclick = () => drawCard("女");
