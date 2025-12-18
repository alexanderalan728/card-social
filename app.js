// ⚠️ 记得换成您自己的 URL 和 KEY (保持不变)
const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 敏感词
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

    const { data, error } = await client
        .from('users')
        .insert([{ nickname, gender, contact, age, city }]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        // 特殊处理：如果提示“重复提交”，说明他以前注册过
        if (error.code === '23505') {
            alert('🎉 您之前已经放入过名片啦！身份验证成功，快去抽卡吧！');
            // 关键点：既然他已经在库里了，就补发一个“通行证”
            localStorage.setItem('hasRegistered', 'true');
        } else {
            alert('提交失败，请重试：' + error.message);
        }
    } else {
        alert('✅ 放入成功！您现在拥有抽卡资格了！');
        // 关键点：注册成功，发“通行证”
        localStorage.setItem('hasRegistered', 'true');
        
        // 清空输入框
        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
        document.getElementById('age').value = '';
        document.getElementById('city').value = '';
    }
}

// 2. 抽取盲盒功能
async function drawCard(targetGender) {
    // 🛡️ 第一步：检查有没有“通行证”
    const hasRegistered = localStorage.getItem('hasRegistered');
    if (!hasRegistered) {
        alert('🔒 为了公平起见，请先在上方“放入名片”加入卡池，才能抽取别人哦！');
        // 自动滚动到顶部，提示他去填表
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return; // 直接拦截，不准往下执行
    }

    const resBox = document.getElementById('resultArea');
    resBox.style.display = 'none';

    // 获取该性别所有用户
    const { data: users, error } = await client
        .from('users')
        .select('*')
        .eq('gender', targetGender);

    if (error) {
        alert('连接数据库失败，请刷新重试');
        return;
    }

    if (!users || users.length === 0) {
        alert(`还没有 ${targetGender} 生放入名片哦，快去邀请朋友来玩！`);
        return;
    }

    const randomIndex = Math.floor(Math.random() * users.length);
    const luckyUser = users[randomIndex];

    document.getElementById('resNick').innerText = luckyUser.nickname;
    document.getElementById('resContact').innerText = '微信号：' + luckyUser.contact;
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    
    const userAge = luckyUser.age ? luckyUser.age + '岁' : '未知年龄';
    const userCity = luckyUser.city ? luckyUser.city : '未知城市';
    document.getElementById('resInfo').innerText = `${userAge} | ${userCity}`;
    
    resBox.style.display = 'block';
}
