// ⚠️ 您的 Supabase 配置 (保持不变)
const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const badWords = ['约炮', '招嫖', '兼职', '刷单', '贷款', '裸聊', 'av', '加微', '死', '傻逼'];

// ✨ 新增：漂亮的提示框工具
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    // 根据类型加个小图标
    const icon = type === 'success' ? '✅' : (type === 'error' ? '🚫' : '💡');
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    container.appendChild(toast);
    
    // 3秒后从 DOM 移除
    setTimeout(() => { toast.remove(); }, 3000);
}

// 初始化计数
(async function initCount() {
    const { count, error } = await client.from('users').select('*', { count: 'exact', head: true });
    if (!error && count !== null) {
        document.getElementById('totalCount').innerText = count + 500; // 假装很火
    }
})();

// UI: 切换标签
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.card').forEach(c => c.style.display = 'none');
    
    if (tab === 'send') {
        document.getElementById('send-section').style.display = 'block';
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
    } else {
        document.getElementById('receive-section').style.display = 'block';
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
    }
}

// UI: 关闭结果弹窗
function closeOverlay() {
    document.getElementById('resultOverlay').style.display = 'none';
}

// 核心功能 1: 发射信号 (注册)
async function submitCard() {
    const nickname = document.getElementById('nickname').value.trim();
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value;
    const city = document.getElementById('city').value.trim();
    const contact = document.getElementById('contact').value.trim();

    // 校验逻辑
    for (let word of badWords) {
        if (nickname.includes(word) || city.includes(word)) { showToast('包含敏感词，请修改！', 'error'); return; }
    }
    if (!nickname || !contact || !age || !city) { showToast('请将信息填写完整！', 'error'); return; }
    if (contact.length < 6) { showToast('微信号格式看起来不对哦', 'error'); return; }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '发射中...'; btn.disabled = true;

    // 写入数据库
    const { error } = await client.from('users').insert([{ nickname, gender, contact, age, city }]);
    
    btn.innerText = originalText; btn.disabled = false;

    if (error) {
        if (error.code === '23505') { // 唯一性冲突
            showToast('您已经发射过信号啦！', 'info');
            localStorage.setItem('hasRegistered', 'true');
            localStorage.setItem('myContact', contact);
        } else {
            showToast('提交失败：' + error.message, 'error');
        }
    } else {
        showToast('信号发射成功！', 'success');
        localStorage.setItem('hasRegistered', 'true');
        localStorage.setItem('myContact', contact);
        
        // 更新计数 UI
        const countSpan = document.getElementById('totalCount');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
        
        // 清空表单
        document.getElementById('nickname').value = '';
        document.getElementById('contact').value = '';
        document.getElementById('age').value = '';
        document.getElementById('city').value = '';
        
        // 自动跳转到捕捉页面
        setTimeout(() => switchTab('receive'), 1000);
    }
}

// 核心功能 2: 捕捉信号 (抽取)
async function drawCard(targetGender) {
    const todayStr = new Date().toLocaleDateString();
    const lastDrawDate = localStorage.getItem('lastDrawDate');

    if (lastDrawDate === todayStr) {
        showToast('贪多嚼不烂哦，明天再来吧！', 'info');
        return;
    }

    const hasRegistered = localStorage.getItem('hasRegistered');
    if (!hasRegistered) {
        showToast('请先发射信号(放入名片)才能捕捉别人！', 'error');
        switchTab('send');
        return;
    }

    // --- 🎬 动画流程开始 ---
    const overlay = document.getElementById('resultOverlay');
    const animBox = document.getElementById('blindBoxAnim');
    const mysteryBox = document.getElementById('mysteryBox');
    
    overlay.style.display = 'none';
    animBox.style.display = 'flex';
    mysteryBox.className = 'mystery-box shake-anim'; // 开始摇晃

    const btn = targetGender === '男' ? document.querySelector('.btn-draw-male') : document.querySelector('.btn-draw-female');
    btn.disabled = true;

    // 1.5秒的假装加载，增加期待感
    await new Promise(r => setTimeout(r, 1500));

    // 准备参数
    const myContact = localStorage.getItem('myContact') || '';
    let historyIds = JSON.parse(localStorage.getItem('historyIds')) || [];

    // 🔥 关键修改：调用数据库函数 (RPC)，而不是下载全表
    const { data, error } = await client.rpc('get_random_user', {
        target_gender: targetGender,
        exclude_contact: myContact,
        exclude_ids: historyIds
    });

    btn.disabled = false;

    if (error) {
        console.error(error);
        showToast('信号受到干扰，请重试', 'error');
        animBox.style.display = 'none';
        return;
    }

    // data 是一个数组，即使只有1条
    if (!data || data.length === 0) {
        showToast('暂无新的同频信号，稍后再试！', 'info');
        animBox.style.display = 'none';
        return;
    }

    // 选中了这个用户
    const luckyUser = data[0];
    
    // 保存历史记录
    historyIds.push(luckyUser.id);
    localStorage.setItem('historyIds', JSON.stringify(historyIds));
    localStorage.setItem('lastDrawDate', todayStr);

    // --- 💥 爆炸动画 ---
    mysteryBox.className = 'mystery-box explode-anim';
    await new Promise(r => setTimeout(r, 400));
    
    animBox.style.display = 'none';
    mysteryBox.className = 'mystery-box'; // 重置样式

    // 展示结果
    document.getElementById('resNick').innerText = luckyUser.nickname;
    document.getElementById('resContact').innerText = luckyUser.contact;
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    document.getElementById('resInfo').innerText = `${luckyUser.age || '?'}岁 | ${luckyUser.city || '未知城市'}`;
    
    overlay.style.display = 'flex';
}

// 工具：复制微信号
function copyContact() {
    const contactText = document.getElementById('resContact').innerText;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(contactText)
            .then(() => showToast('微信号已复制！', 'success'))
            .catch(() => fallbackCopy(contactText));
    } else {
        fallbackCopy(contactText);
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showToast('微信号已复制！', 'success');
    } catch (err) {
        showToast('复制失败，请长按微信号手动复制', 'error');
    }
    document.body.removeChild(textArea);
}
