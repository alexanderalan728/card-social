document.addEventListener("DOMContentLoaded", () => {

  // ✅ JS 是否运行（微信必看）
  const alive = document.getElementById("alive");
  if (alive) alive.innerText = "JS 已运行";

  // 🔑 Supabase 配置
  const SUPABASE_URL = "https://uvaofrkejypfagfvpxqk.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_gjhZbHIGXXRs5TervkJO5g_VN1L85qM";

  // ✅ 同步创建（不要动态加载）
  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  // =====================
  // 注册进入卡池
  // =====================
  const btn = document.getElementById("btn");
  const result = document.getElementById("result");

  btn.onclick = async () => {
    result.innerText = "正在注册...";

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
      return;
    }

    localStorage.setItem("my_contact", contact);
    localStorage.removeItem("used_cards"); // 新用户清空抽卡记录
    result.innerText = "注册成功，已进入卡池 🎉";
  };

  // =====================
  // 抽卡逻辑
  // =====================
  const card = document.getElementById("card");

  async function drawCard(targetGender) {
    card.innerText = "正在抽卡...";

    const myContact = localStorage.getItem("my_contact");
    if (!myContact) {
      card.innerText = "请先注册进入卡池";
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("nickname, gender, contact")
      .eq("gender", targetGender)
      .neq("contact", myContact);

    if (error || !data || data.length === 0) {
      card.innerText = "暂时没有可抽的卡";
      return;
    }

    const used = JSON.parse(localStorage.getItem("used_cards") || "[]");
    const available = data.filter(u => !used.includes(u.contact));

    if (available.length === 0) {
      card.innerText = "已经抽完啦";
      return;
    }

    const user = available[Math.floor(Math.random() * available.length)];
    used.push(user.contact);
    localStorage.setItem("used_cards", JSON.stringify(used));

    card.innerHTML = `
      <h3>🎉 抽到一张卡！</h3>
      <p>昵称：${user.nickname}</p>
      <p>性别：${user.gender}</p>
      <p>联系方式：${user.contact}</p>
    `;
  }

  document.getElementById("drawMale").onclick = () => drawCard("男");
  document.getElementById("drawFemale").onclick = () => drawCard("女");
});
