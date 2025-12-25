// ⚠️ 保持您的 URL 和 KEY 不变
const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const badWords = ['约炮', '招嫖', '兼职', '刷单', '贷款', '裸聊', 'av', '加微', '死', '傻逼'];

// --- 页面加载时统计人数 ---
(async function initCount() {
    const { count, error } = await client
        .from('users')
        .select('*', { count: 'exact', head: true }); 

    if (!error && count !== null) {
        // 保持您原本的逻辑：真实人数 + 500
        document.getElementById('totalCount').innerText = count + 500; 
    }
})();

// --- 1. 提交名片 ---
async function submitCard() {
    const nickname = document.getElementById('nickname').value.trim();
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value.trim();
    const city = document.getElementById('city').value.trim();
    const contact = document.getElementById('contact').value.trim();

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

    // 🛡️ 校验三：微信号长度
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
        // 错误码 23505 代表唯一性冲突（联系方式重复）
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
        
        // 成功后人数+1
        const countSpan = document.getElementById('totalCount');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
        
        // 清空表单
        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
        document.getElementById('age').value = '';
        document.getElementById('city').value = '';
    }
}

// --- 2. 抽取盲盒 ---
async function drawCard(targetGender) {
    // 🚨 检查是否注册 (必须先放名片)
    const hasRegistered = localStorage.getItem('hasRegistered');
    if (!hasRegistered) {
        alert('🔒 为了公平起见，请先在上方“放入名片”加入卡池，才能抽取别人哦！');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // 🚨 检查频率 (一天一次)
    const todayStr = new Date().toLocaleDateString(); // 例如 "2024/12/26"
    const lastDrawDate = localStorage.getItem('lastDrawDate');

    if (lastDrawDate === todayStr) {
        alert('⏳ 贪多嚼不烂哦～\n\n每天只能抽取 1 次盲盒。\n请明天再来试试缘分吧！');
        return;
    }

    const resBox = document.getElementById('resultArea');
    resBox.style.display = 'none';

    const btn = targetGender === '男' ? document.querySelector('.btn-draw-male') : document.querySelector('.btn-draw-female');
    const originalText = btn.innerText;
    btn.innerText = '正在寻找缘分...';
    btn.disabled = true;

    // 模拟等待感
    await new Promise(r => setTimeout(r, 800));

    const myContact = localStorage.getItem('myContact');

    // 查询数据
    const { data: users, error } = await client
        .from('users')
        .select('*')
        .eq('gender', targetGender)
        .neq('contact', myContact || ''); // 不抽自己

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

    // 排除已经抽过的 (本地缓存历史)
    let historyIds = JSON.parse(localStorage.getItem('historyIds')) || [];
    const availableUsers = users.filter(u => !historyIds.includes(u.id));

    if (availableUsers.length === 0) {
        alert('🎉 这个性别池里的人你都抽过一轮啦！\n为了给你新机会，我们将重置记忆，下次可能抽到之前见过的人。');
        localStorage.removeItem('historyIds');
        return;
    }

    // 随机抽取
    const luckyUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];

    // 记录：今天抽过了 + 抽过这个人
    historyIds.push(luckyUser.id);
    localStorage.setItem('historyIds', JSON.stringify(historyIds));
    localStorage.setItem('lastDrawDate', todayStr);

    // 渲染结果
    document.getElementById('resNick').innerText = luckyUser.nickname;
    
    // 存微信号到 data-content 属性，并显示
    document.getElementById('resContact').innerText = `微信号：${luckyUser.contact}`;
    document.getElementById('resContact').dataset.content = luckyUser.contact;

    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    
    const userAge = luckyUser.age ? luckyUser.age + '岁' : '未知年龄';
    const userCity = luckyUser.city ? luckyUser.city : '未知城市';
    document.getElementById('resInfo').innerText = `${userAge} | ${userCity}`;
    
    resBox.style.display = 'block';
    resBox.scrollIntoView({ behavior: 'smooth' });
}

// --- 3. 复制功能 (微信兼容版) ---
function copyContact() {
    // 从 dataset 中读取纯微信号
    const contactText = document.getElementById('resContact').dataset.content;
    
    if (!contactText) return;

    // 优先尝试标准API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(contactText).then(() => {
            alert('✅ 微信号已复制，快去微信添加吧！');
        }).catch(err => {
            fallbackCopy(contactText); // 失败则降级处理
        });
    } else {
        fallbackCopy(contactText); // 不支持则直接降级
    }
}

// 降级复制方案 (通过创建隐藏输入框选中文本)
function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // 避免手机键盘弹出
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            alert('✅ 微信号已复制！');
        } else {
            alert('❌ 复制失败，请长按微信号手动复制');
        }
    } catch (err) {
        alert('❌ 您的浏览器不支持自动复制，请手动长按');
    }
    
    document.body.removeChild(textArea);
}
