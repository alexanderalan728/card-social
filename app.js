// ⚠️ 请将下面两行替换为您自己的 Supabase 配置！
const SUPABASE_URL = https://jbyljemznjnqrixyohms.supabase.co
const SUPABASE_ANON_KEY = sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. 提交名片功能
async function submitCard() {
    const nickname = document.getElementById('nickname').value;
    const gender = document.getElementById('gender').value;
    const contact = document.getElementById('contact').value;

    // 简单校验
    if (!nickname || !contact) {
        alert('请把昵称和联系方式填完整哦！');
        return;
    }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '提交中...';
    btn.disabled = true;

    // 插入数据到 users 表
    const { data, error } = await client
        .from('users')
        .insert([
            { nickname: nickname, gender: gender, contact: contact }
        ]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        // 专门处理“重复提交”的错误 (错误码 23505)
        if (error.code === '23505') {
            alert('🚫 这个联系方式已经在这个池子里啦，请勿重复提交！');
        } else {
            alert('提交失败，请重试：' + error.message);
        }
    } else {
        alert('✅ 放入成功！现在你可以去抽别人了，也可以等待被别人抽中！');
        // 清空输入框
        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
    }
}

// 2. 抽取盲盒功能
async function drawCard(targetGender) {
    const resBox = document.getElementById('resultArea');
    resBox.style.display = 'none'; // 先隐藏旧结果

    // 先获取这个性别一共有多少人
    // 注意：这里用了一个简单的方法，先拉取所有该性别的ID，然后随机选一个
    // (数据量大时建议优化，但几千人以内这个方法最快)
    
    const { data: users, error } = await client
        .from('users')
        .select('*')
        .eq('gender', targetGender);

    if (error) {
        alert('连接数据库失败');
        return;
    }

    if (!users || users.length === 0) {
        alert(`还没有 ${targetGender} 生放入名片哦，你是第一个的话快去放入吧！`);
        return;
    }

    // 随机选一个
    const randomIndex = Math.floor(Math.random() * users.length);
    const luckyUser = users[randomIndex];

    // 展示结果
    document.getElementById('resNick').innerText = luckyUser.nickname;
    document.getElementById('resContact').innerText = '微信号：' + luckyUser.contact;
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    
    resBox.style.display = 'block';
}
