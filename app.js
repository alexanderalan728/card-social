// ⚠️ 保持您的 URL 和 KEY 不变
const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const badWords = ['约炮', '招嫖', '兼职', '刷单', '贷款', '裸聊', 'av', '加微', '死', '傻逼'];

// --- 新增：页面加载时，自动查一下有多少人 ---
(async function initCount() {
    const { count, error } = await client
        .from('users')
        .select('*', { count: 'exact', head: true }); // 只查数量，不查数据，速度快
    
    if (!error && count !== null) {
        // 给个基础人气值 (比如显示真实人数 + 500)，看起来更火一点，这也是运营的小套路
        // 如果想显示真实的，就去掉 "+ 500"
        document.getElementById('totalCount').innerText = count + 500; 
    }
})();

// 1. 提交名片
async function submitCard() {
    const nickname = document.getElementById('nickname').value || '';
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value || '';
    const city = document.getElementById('city').value || '';
    const contact = document.getElementById('contact').value || '';

    // 🛡️ 校验一：敏感词
    for (let word of badWords) {
        if (nickname.includes(word) || city.includes(word)) {
            alert('🚫 输入内容包含敏感词，请修改后重试！');
            return;
        }
    }

    // 🛡️ 校验二：非空
    if (!nickname || !contact || !age || !city) {
        alert('请把昵称、年龄、城市和联系方式都填完整哦！');
        return;
    }

    // 🛡️ 校验三：微信号长度 (新增)
    if (contact.length < 6) {
        alert('❌ 请填写真实的微信号或手机号 (至少6位)！');
        return;
    }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '提交中...';
    btn.disabled = true;

    const { data, error } = await client
        .from('users')
        .insert([{ nickname, gender, contact, age, city }]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        if (error.code === '23505') {
            alert('🎉 您之前已经放入过名片啦！身份验证成功，快去抽卡吧！');
            localStorage.setItem('hasRegistered', 'true');
            localStorage.setItem('myContact', contact);
        } else {
            alert('提交失败，请重试：' + error.message);
        }
    } else {
        alert('✅ 放入成功！您现在拥有抽卡资格了！');
        localStorage.setItem('hasRegistered', 'true');
        localStorage.setItem('myContact', contact);
        
        // 成功后，人数+1 动态跳一下
        const countSpan = document.getElementById('totalCount');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;

        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
        document.getElementById('age').value = '';
        document.getElementById('city').value = '';
    }
}

// 2. 抽取盲盒
async function drawCard(targetGender) {
    const lastDraw = localStorage.getItem('lastDrawTime');
    const now = Date.now();
    if (lastDraw && now - lastDraw < 30000) {
        alert('⏳ 休息一下，请 30 秒后再抽一次哦～');
        return;
    }
    
    const hasRegistered = localStorage.getItem('hasRegistered');
    if (!hasRegistered) {
        alert('🔒 为了公平起见，请先在上方“放入名片”加入卡池，才能抽取别人哦！');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    const resBox = document.getElementById('resultArea');
    resBox.style.display = 'none';

    const btn = targetGender === '男' ? document.querySelector('.btn-draw-male') : document.querySelector('.btn-draw-female');
    const originalText = btn.innerText;
    btn.innerText = '正在寻找缘分...';
    btn.disabled = true;

    await new Promise(r => setTimeout(r, 800));

    const myContact = localStorage.getItem('myContact');

    const { data: users, error } = await client
        .from('users')
        .select('*')
        .eq('gender', targetGender)
        .neq('contact', myContact || '');

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        alert('网络有点卡，请重试');
        return;
    }

    if (!users || users.length === 0) {
        alert(`还没有 ${targetGender} 生放入名片哦，快去邀请朋友来玩！`);
        return;
    }

    // 防重复逻辑
    const drawnKey = `drawn_${targetGender}`;
    let drawnData = JSON.parse(localStorage.getItem(drawnKey)) || { ids: [], time: Date.now() };

    if (Date.now() - drawnData.time > 24 * 60 * 60 * 1000) {
        drawnData.ids = [];
        drawnData.time = Date.now();
    }

    const availableUsers = users.filter(u => !drawnData.ids.includes(u.id));

    if (availableUsers.length === 0) {
        alert('🎉 这个性别池里的人你都抽过一轮啦，24 小时后再来吧～');
        return;
    }

    const luckyUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];

    drawnData.ids.push(luckyUser.id);
    localStorage.setItem(drawnKey, JSON.stringify(drawnData));
    localStorage.setItem('lastDrawTime', now);

    document.getElementById('resNick').innerText = luckyUser.nickname;
    document.getElementById('resContact').innerText = luckyUser.contact;
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    
    const userAge = luckyUser.age ? luckyUser.age + '岁' : '未知年龄';
    const userCity = luckyUser.city ? luckyUser.city : '未知城市';
    document.getElementById('resInfo').innerText = `${userAge} | ${userCity}`;
    
    resBox.style.display = 'block';
    resBox.scrollIntoView({ behavior: 'smooth' });
}

// 3. 点击复制
function copyContact() {
    const contactText = document.getElementById('resContact').innerText;
    navigator.clipboard.writeText(contactText).then(() => {
        alert('✅ 微信号已复制，快去微信添加吧！');
    }).catch(err => {
        alert('复制失败，请手动长按复制');
    });
}
