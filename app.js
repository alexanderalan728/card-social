// ⚠️ 记得把下面两行换成您自己的！(注意有引号)
const SUPABASE_URL = 'https://您的项目地址.supabase.co';
const SUPABASE_ANON_KEY = '您的密钥字符串';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 敏感词库
const badWords = ['约炮', '招嫖', '兼职', '刷单', '贷款', '裸聊', 'av', '加微', '死', '傻逼'];

// --- 页面加载时：自动查询人数 ---
(async function initCount() {
    const { count, error } = await client
        .from('users')
        .select('*', { count: 'exact', head: true }); // 只查数量
    
    if (!error && count !== null) {
        // 为了看起来人多，可以在真实人数上加个基数（比如 +500），不加就直接显示 count
        document.getElementById('totalCount').innerText = count + 500; 
    }
})();

// 1. 提交名片功能
async function submitCard() {
    const nickname = document.getElementById('nickname').value || '';
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value || '';
    const city = document.getElementById('city').value || '';
    const contact = document.getElementById('contact').value || '';

    // 校验一：敏感词
    for (let word of badWords) {
        if (nickname.includes(word) || city.includes(word)) {
            alert('🚫 输入内容包含敏感词，请修改后重试！');
            return;
        }
    }

    // 校验二：非空
    if (!nickname || !contact || !age || !city) {
        alert('请把昵称、年龄、城市和联系方式都填完整哦！');
        return;
    }

    // 校验三：长度
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
        
        // 人数+1 动画
        const countSpan = document.getElementById('totalCount');
        const currentCount = parseInt(countSpan.innerText) || 0;
        countSpan.innerText = currentCount + 1;

        // 清空
        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
        document.getElementById('age').value = '';
        document.getElementById('city').value = '';
    }
}

// 2. 抽取盲盒功能
async function drawCard(targetGender) {
    const lastDraw = localStorage.getItem('lastDrawTime');
    const now = Date.now();
    
    // 30秒冷却
    if (lastDraw && now - lastDraw < 30000) {
        alert('⏳ 休息一下，请 30 秒后再抽一次哦～');
        return;
    }
    
    // 必须注册
    const hasRegistered = localStorage.getItem('hasRegistered');
    if (!hasRegistered) {
        alert('🔒 为了公平起见，请先在上方“放入名片”加入卡池，才能抽取别人哦！');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    const resBox = document.getElementById('resultArea');
    resBox.style.display = 'none';

    // 按钮开箱动画
    const btn = targetGender === '男' ? document.querySelector('.btn-draw-male') : document.querySelector('.btn-draw-female');
    const originalText = btn.innerText;
    btn.innerText = '正在寻找缘分...';
    btn.disabled = true;

    await new Promise(r => setTimeout(r, 800)); // 延迟0.8秒

    const myContact = localStorage.getItem('myContact');

    // 排除自己
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

    // 防重复抽取逻辑
    const drawnKey = `drawn_${targetGender}`;
    let drawnData = JSON.parse(localStorage.getItem(drawnKey)) || { ids: [], time: Date.now() };

    // 超过24小时重置
    if (Date.now() - drawnData.time > 24 * 60 * 60 * 1000) {
        drawnData.ids = [];
        drawnData.time = Date.now();
    }

    // 过滤已抽
    const availableUsers = users.filter(u => !drawnData.ids.includes(u.id));

    if (availableUsers.length === 0) {
        alert('🎉 这个性别池里的人你都抽过一轮啦，24 小时后再来吧～');
        return;
    }

    // 随机抽
    const luckyUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];

    // 记录
    drawnData.ids.push(luckyUser.id);
    localStorage.setItem(drawnKey, JSON.stringify(drawnData));
    localStorage.setItem('lastDrawTime', now);

    // 展示
    document.getElementById('resNick').innerText = luckyUser.nickname;
    document.getElementById('resContact').innerText = luckyUser.contact;
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    
    // 兼容老数据
    const userAge = luckyUser.age ? luckyUser.age + '岁' : '未知年龄';
    const userCity = luckyUser.city ? luckyUser.city : '未知城市';
    document.getElementById('resInfo').innerText = `${userAge} | ${userCity}`;
    
    resBox.style.display = 'block';
    resBox.scrollIntoView({ behavior: 'smooth' });
}

// 3. 点击复制功能
function copyContact() {
    const contactText = document.getElementById('resContact').innerText;
    // 尝试新版 API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(contactText).then(() => {
            alert('✅ 微信号已复制，快去微信添加吧！');
        }).catch(() => {
            alert('复制失败，请手动长按复制');
        });
    } else {
        // 兼容旧版 API
        const textArea = document.createElement("textarea");
        textArea.value = contactText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('✅ 微信号已复制，快去微信添加吧！');
        } catch (err) {
            alert('复制失败，请手动长按复制');
        }
        document.body.removeChild(textArea);
    }
}
