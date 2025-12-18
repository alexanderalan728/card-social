// ⚠️ 请先把自己原来的 URL 和 KEY 填在下面引号里！
const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 🛡️ 敏感词黑名单 (您可以随时在这里加词) ---
const badWords = ['约炮', '招嫖', '兼职', '刷单', '贷款', '裸聊', 'av', '加微', '死', '傻逼'];

// 1. 提交名片功能
async function submitCard() {
    // 获取页面上的输入值
    const nickname = document.getElementById('nickname').value || '';
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value || '';    // 新增：年龄
    const city = document.getElementById('city').value || '';  // 新增：城市
    const contact = document.getElementById('contact').value || '';

    // --- 🛡️ 第一道关卡：敏感词过滤 ---
    // 检查昵称和城市是否包含违规词
    for (let word of badWords) {
        if (nickname.includes(word) || city.includes(word)) {
            alert('🚫 输入内容包含敏感词，请修改后重试！');
            return; // 直接打断，不准提交
        }
    }

    // --- 第二道关卡：非空校验 ---
    if (!nickname || !contact || !age || !city) {
        alert('请把昵称、年龄、城市和联系方式都填完整哦！');
        return;
    }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '提交中...';
    btn.disabled = true;

    // 插入数据
    const { data, error } = await client
        .from('users')
        .insert([
            { 
                nickname: nickname, 
                gender: gender, 
                contact: contact,
                age: age,
                city: city
            }
        ]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        if (error.code === '23505') {
            alert('🚫 这个联系方式已经在这个池子里啦，请勿重复提交！');
        } else {
            alert('提交失败，请重试：' + error.message);
        }
    } else {
        alert('✅ 放入成功！坐等缘分降临！');
        // 清空输入框
        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
        document.getElementById('age').value = '';
        document.getElementById('city').value = '';
    }
}

// 2. 抽取盲盒功能
async function drawCard(targetGender) {
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

    // 随机选一个
    const randomIndex = Math.floor(Math.random() * users.length);
    const luckyUser = users[randomIndex];

    // 展示结果
    document.getElementById('resNick').innerText = luckyUser.nickname;
    document.getElementById('resContact').innerText = '微信号：' + luckyUser.contact;
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    
    // 智能展示年龄城市（防止老数据报错）
    const userAge = luckyUser.age ? luckyUser.age + '岁' : '未知年龄';
    const userCity = luckyUser.city ? luckyUser.city : '未知城市';
    document.getElementById('resInfo').innerText = `${userAge} | ${userCity}`;
    
    resBox.style.display = 'block';
}
