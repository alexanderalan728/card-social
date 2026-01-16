// ⚠️ 您的 Supabase 配置 (已帮您填好)
const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const badWords = ['约炮', '招嫖', '兼职', '刷单', '贷款', '裸聊', 'av', '加微', '死', '傻逼'];

(async function initCount() {
    const { count, error } = await client.from('users').select('*', { count: 'exact', head: true });
    if (!error && count !== null) document.getElementById('totalCount').innerText = count + 500;
})();

async function submitCard() {
    const nickname = document.getElementById('nickname').value || '';
    const gender = document.getElementById('gender').value;
    const age = document.getElementById('age').value || '';
    const city = document.getElementById('city').value || '';
    const contact = document.getElementById('contact').value || '';

    for (let word of badWords) { if (nickname.includes(word) || city.includes(word)) { alert('🚫 包含敏感词！'); return; } }
    if (!nickname || !contact || !age || !city) { alert('请完善信息！'); return; }
    if (contact.length < 6) { alert('❌ 微信号格式错误！'); return; }

    const btn = document.querySelector('.btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '发射中...'; btn.disabled = true;

    const { data, error } = await client.from('users').insert([{ nickname, gender, contact, age, city }]);
    btn.innerText = originalText; btn.disabled = false;

    if (error) {
        if (error.code === '23505') { alert('🎉 您已发射过信号！'); localStorage.setItem('hasRegistered', 'true'); localStorage.setItem('myContact', contact); }
        else { alert('提交失败：' + error.message); }
    } else {
        alert('✅ 信号发射成功！');
        localStorage.setItem('hasRegistered', 'true');
        localStorage.setItem('myContact', contact);
        const countSpan = document.getElementById('totalCount');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
        document.getElementById('nickname').value = ''; document.getElementById('contact').value = ''; document.getElementById('age').value = ''; document.getElementById('city').value = '';
    }
}

async function drawCard(targetGender) {
    const todayStr = new Date().toLocaleDateString();
    const lastDrawDate = localStorage.getItem('lastDrawDate');
    if (lastDrawDate === todayStr) { alert('⏳ 贪多嚼不烂哦～\n每天只能捕捉 1 个信号，明天再来吧！'); return; }

    const hasRegistered = localStorage.getItem('hasRegistered');
    if (!hasRegistered) { alert('🔒 请先发射信号(放入名片)才能捕捉别人！'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    // --- 🎬 动画开始 ---
    const overlay = document.getElementById('resultOverlay');
    const animBox = document.getElementById('blindBoxAnim');
    const mysteryBox = document.getElementById('mysteryBox');
    
    overlay.style.display = 'none';
    animBox.style.display = 'flex'; // 全屏显示动画
    mysteryBox.className = 'mystery-box shake-anim';

    const btn = targetGender === '男' ? document.querySelector('.btn-draw-male') : document.querySelector('.btn-draw-female');
    const originalText = btn.innerText;
    btn.innerText = '锁定信号中...'; btn.disabled = true;

    await new Promise(r => setTimeout(r, 1500)); // 摇晃1.5秒

    const myContact = localStorage.getItem('myContact');
    const { data: users, error } = await client.from('users').select('*').eq('gender', targetGender).neq('contact', myContact || '');

    btn.innerText = originalText; btn.disabled = false;

    if (error) { alert('信号干扰，请重试'); animBox.style.display = 'none'; return; }
    if (!users || users.length === 0) { alert('📡 暂无同频信号，请稍后再试！'); animBox.style.display = 'none'; return; }

    let historyIds = JSON.parse(localStorage.getItem('historyIds')) || [];
    const availableUsers = users.filter(u => !historyIds.includes(u.id));

    if (availableUsers.length === 0) {
        alert('🎉 此频段信号已全部捕获，明天再来吧！');
        localStorage.removeItem('historyIds');
        animBox.style.display = 'none';
        return;
    }

    const luckyUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
    historyIds.push(luckyUser.id);
    localStorage.setItem('historyIds', JSON.stringify(historyIds));
    localStorage.setItem('lastDrawDate', todayStr);

    // --- 💥 炸开 ---
    mysteryBox.className = 'mystery-box explode-anim';
    await new Promise(r => setTimeout(r, 400));
    animBox.style.display = 'none';
    mysteryBox.className = 'mystery-box';

    // 显示结果
    document.getElementById('resNick').innerText = luckyUser.nickname;
    document.getElementById('resContact').innerText = luckyUser.contact;
    document.getElementById('resIcon').innerText = targetGender === '男' ? '👦' : '👧';
    document.getElementById('resInfo').innerText = `${luckyUser.age || '未知'}岁 | ${luckyUser.city || '未知'}`;
    
    overlay.style.display = 'flex'; // 全屏显示结果
}

function copyContact() {
    const contactText = document.getElementById('resContact').innerText;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(contactText).then(() => { alert('✅ 微信号已复制！'); }).catch(() => { alert('复制失败，请长按'); });
    } else {
        const textArea = document.createElement("textarea"); textArea.value = contactText; document.body.appendChild(textArea); textArea.select();
        try { document.execCommand('copy'); alert('✅ 微信号已复制！'); } catch (err) { alert('复制失败，请长按'); }
        document.body.removeChild(textArea);
    }
}
