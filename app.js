// ⚠️ 记得换成您自己的 URL 和 KEY (保持不变)
const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const badWords = ['约炮', '招嫖', '兼职', '刷单', '贷款', '裸聊', 'av', '加微', '死', '傻逼'];

// 1. 提交名片功能
async function submitCard() {
    const nickname = document.getElementById('nickname').value || '';
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value || '';
    const city = document.getElementById('city').value || '';
    const contact = document.getElementById('contact').value || '';

    // 敏感词过滤
    for (let word of badWords) {
        if (nickname.includes(word) || city.includes(word)) {
            alert('🚫 输入内容包含敏感词，请修改后重试！');
            return;
        }
    }

    if (!nickname || !contact || !age || !city) {
        alert('请把昵称、年龄、城市和联系方式都填完整哦！');
        return;
    }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '提交中...';
    btn.disabled = true;

    // 修复了这里的方括号语法错误
    const { data, error } = await client
        .from('users')
        .insert([{ nickname, gender, contact, age, city }]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        if (error.code === '23505') {
            alert('🎉 您之前已经放入过名片啦！身份验证成功，快去抽卡吧！');
            localStorage.setItem('hasRegistered', 'true');
            // 记录自己的联系方式，防止抽到自己
            localStorage.setItem('myContact', contact);
        } else {
            alert('提交失败，请重试：' + error.message);
        }
    } else {
        alert('✅ 放入成功！您现在拥有抽卡资格了！');
        localStorage.setItem('hasRegistered', 'true');
        // 记录自己的联系方式，防止抽到自己
        localStorage.setItem('myContact', contact);

        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
        document.getElementById('age').value = '';
        document.getElementById('city').value = '';
    }
}

// 2. 抽取盲盒功能
async function drawCard(targetGender) {
    // === 限制 1：30秒冷却 ===
    const lastDraw = localStorage.getItem('lastDrawTime');
    const now = Date.now();
    if (lastDraw && now - lastDraw < 30000) {
        alert('⏳ 休息一下，请 30 秒后再抽一次哦～');
        return;
    }
    
    // === 限制 2：必须注册 ===
    const hasRegistered = localStorage.getItem('hasRegistered');
    if (!hasRegistered) {
        alert('🔒 为了公平起见，请先在上方“放入名片”加入卡池，才能抽取别人哦！');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    const resBox = document.getElementById('resultArea');
    resBox.style.display = 'none';

    // UI 交互：开箱中...
    const btn = targetGender === '男' ? document.querySelector('.btn-draw-male') : document.querySelector('.btn-draw-female');
    const originalText = btn.innerText;
    btn.innerText = '正在寻找缘分...';
    btn.disabled = true;

    // 模拟延迟 800ms
    await new Promise(r => setTimeout(r, 800));

    // 获取自己的联系方式（为了不抽到自己）
    const myContact = localStorage.getItem('myContact');

    // 修复了这里的星号语法错误
    const { data: users, error } = await client
        .from('users')
        .select('*')
        .eq('gender', targetGender)
        .neq('contact', myContact || ''); // 排除自己

    // 恢复按钮
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

    // === 核心逻辑：防重复抽人（24小时内） ===
    const drawnKey = `drawn_${targetGender}`; // 修复：只定义一次
    let drawnData = JSON.parse(localStorage.getItem(drawnKey));

    if (!drawnData) {
        drawnData = { ids: [], time: Date.now() };
    }

    // 超过 24 小时重置历史记录
    if (Date.now() - drawnData.time > 24 * 60 * 60 * 1000) {
        drawnData.ids = [];
        drawnData.time = Date.now();
    }

    // 过滤掉已经抽过的人
    const availableUsers = users.filter(u => !drawnData.ids.includes(u.id));

    if (availableUsers.length === 0) {
        alert('🎉 这个性别池里的人你都抽过一轮啦，24 小时后再来吧～（或者等新用户加入）');
        // 可选：如果想让他们重新抽，可以把下面两行注释解开
        // drawnData.ids = [];
        // localStorage.setItem(drawnKey, JSON.stringify(drawnData));
        return;
    }

    // 随机选一个“没抽过的”
    const luckyUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];

    // 记录本次已抽
    drawnData.ids.push(luckyUser.id);
    localStorage.setItem(drawnKey, JSON.stringify(drawnData));
    localStorage.setItem('lastDrawTime', now); // 记录本次抽卡时间用于冷却

    // === 展示结果 ===
    document.getElementById('resNick').innerText = luckyUser.nickname;
    
    // 这里要注意：如果你的 contact 是纯数字，不影响，但如果是微信号，直接显示
    // 之前代码里有两行 resContact，我合并了
    document.getElementById('resContact').innerText = luckyUser.contact; 
    
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';

    const userAge = luckyUser.age ? luckyUser.age + '岁' : '未知年龄';
    const userCity = luckyUser.city ? luckyUser.city : '未知城市';
    document.getElementById('resInfo').innerText = `${userAge} | ${userCity}`;

    resBox.style.display = 'block';

    // 自动滚动到底部看结果
    resBox.scrollIntoView({ behavior: 'smooth' });
}

// 3. 点击复制功能
function copyContact() {
    const contactText = document.getElementById('resContact').innerText;
    navigator.clipboard.writeText(contactText).then(() => {
        alert('✅ 微信号已复制，快去微信添加吧！');
    }).catch(err => {
        alert('复制失败，请手动长按复制');
    });
}
