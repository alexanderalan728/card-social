// ⚠️ 您的 Supabase 配置 (已帮您填好)
const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 敏感词库 (防封号)
const badWords = ['约炮', '招嫖', '兼职', '刷单', '贷款', '裸聊', 'av', '加微', '死', '傻逼'];

// --- 页面加载时：自动查询人数 ---
(async function initCount() {
    const { count, error } = await client
        .from('users')
        .select('*', { count: 'exact', head: true }); 
    
    if (!error && count !== null) {
        // 显示真实人数 + 500 (基数，为了好看)
        document.getElementById('totalCount').innerText = count + 572; 
    }
})();

// --- 1. 发射信号 (提交名片) ---
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
        alert('请把昵称、年龄、坐标和微信号都填完整哦！');
        return;
    }

    // 校验三：长度
    if (contact.length < 6) {
        alert('❌ 请填写真实的微信号或手机号 (至少6位)！');
        return;
    }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '发射中...';
    btn.disabled = true;

    const { data, error } = await client
        .from('users')
        .insert([{ nickname, gender, contact, age, city }]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        if (error.code === '23505') {
            alert('🎉 您之前已经发射过信号啦！无需重复提交，快去捕捉别人吧！');
            localStorage.setItem('hasRegistered', 'true');
            localStorage.setItem('myContact', contact);
        } else {
            alert('提交失败，请重试：' + error.message);
        }
    } else {
        alert('✅ 信号发射成功！现在您可以去捕捉同频信号了！');
        localStorage.setItem('hasRegistered', 'true');
        localStorage.setItem('myContact', contact);
        
        // 人数+1 动画
        const countSpan = document.getElementById('totalCount');
        const currentCount = parseInt(countSpan.innerText) || 0;
        countSpan.innerText = currentCount + 1;

        // 清空输入框
        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
        document.getElementById('age').value = '';
        document.getElementById('city').value = '';
    }
}

// --- 2. 捕捉信号 (每天限一次 + 摇晃动画) ---
async function drawCard(targetGender) {
    // 🚨 限制 1：每天只能抽一次
    const todayStr = new Date().toLocaleDateString(); // 获取今天日期，如 "2025/1/15"
    const lastDrawDate = localStorage.getItem('lastDrawDate');
    
    if (lastDrawDate === todayStr) {
        alert('⏳ 贪多嚼不烂哦～\n\n每天只能捕捉 1 个信号。\n请明天再来试试缘分吧！');
        return;
    }

    // 🚨 限制 2：必须先注册
    const hasRegistered = localStorage.getItem('hasRegistered');
    if (!hasRegistered) {
        alert('🔒 为了公平起见，请先在上方“发射信号”加入卡池，才能捕捉别人哦！');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // --- 🎬 动画开始 ---
    const resBox = document.getElementById('resultArea');
    const animBox = document.getElementById('blindBoxAnim');
    const mysteryBox = document.getElementById('mysteryBox');
    
    // 隐藏旧结果，显示盲盒
    resBox.style.display = 'none';
    animBox.style.display = 'block';
    mysteryBox.className = 'mystery-box shake-anim'; // 开始摇晃

    // 按钮状态
    const btn = targetGender === '男' ? document.querySelector('.btn-draw-male') : document.querySelector('.btn-draw-female');
    const originalText = btn.innerText;
    btn.innerText = '正在锁定信号...';
    btn.disabled = true;

    // 强制摇晃 1.5秒 (增加紧张感)
    await new Promise(r => setTimeout(r, 1500));

    // 获取数据
    const myContact = localStorage.getItem('myContact');
    const { data: users, error } = await client
        .from('users')
        .select('*')
        .eq('gender', targetGender)
        .neq('contact', myContact || ''); // 不抽自己

    // 恢复按钮
    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        alert('信号干扰，请重试');
        animBox.style.display = 'none';
        return;
    }

    if (!users || users.length === 0) {
        alert(`📡 暂无同频信号，请稍后再试！`);
        animBox.style.display = 'none';
        return;
    }

    // --- 筛选逻辑：排除已经抽过的人 ---
    let historyIds = JSON.parse(localStorage.getItem('historyIds')) || [];
    const availableUsers = users.filter(u => !historyIds.includes(u.id));

    if (availableUsers.length === 0) {
        alert('🎉 这个频段的信号你都捕捉过一遍啦！\n为了给你新机会，我们将重置记忆，下次可能遇到“老熟人”。');
        localStorage.removeItem('historyIds'); // 重置历史
        animBox.style.display = 'none';
        return;
    }

    // 随机抽取
    const luckyUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];

    // 📝 记录：今天抽过了 + 抽过这个人
    historyIds.push(luckyUser.id);
    localStorage.setItem('historyIds', JSON.stringify(historyIds));
    localStorage.setItem('lastDrawDate', todayStr); // 记录今天日期

    // --- 💥 炸开效果 ---
    mysteryBox.className = 'mystery-box explode-anim';
    await new Promise(r => setTimeout(r, 400));
    animBox.style.display = 'none';
    mysteryBox.className = 'mystery-box';

    // 渲染结果
    document.getElementById('resNick').innerText = luckyUser.nickname;
    document.getElementById('resContact').innerText = luckyUser.contact;
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    
    const userAge = luckyUser.age ? luckyUser.age + '岁' : '未知年龄';
    const userCity = luckyUser.city ? luckyUser.city : '未知城市';
    document.getElementById('resInfo').innerText = `${userAge} | ${userCity}`;
    
    resBox.style.display = 'block';
    resBox.scrollIntoView({ behavior: 'smooth' });
}

// --- 3. 点击复制 ---
function copyContact() {
    const contactText = document.getElementById('resContact').innerText;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(contactText).then(() => {
            alert('✅ 信号源(微信号)已复制！');
        }).catch(() => {
            alert('复制失败，请手动长按复制');
        });
    } else {
        // 兼容旧版浏览器
        const textArea = document.createElement("textarea");
        textArea.value = contactText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('✅ 信号源(微信号)已复制！');
        } catch (err) {
            alert('复制失败，请手动长按复制');
        }
        document.body.removeChild(textArea);
    }
}
