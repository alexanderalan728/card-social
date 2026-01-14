const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getEl = (id) => document.getElementById(id);
let selectedTags = [];

// --- 标签选择器逻辑 ---
document.querySelectorAll('.tag-item').forEach(item => {
    item.addEventListener('click', () => {
        item.classList.toggle('active');
        const tag = item.innerText;
        if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
        } else {
            selectedTags.push(tag);
        }
    });
});

// --- 初始化统计 ---
(async () => {
    const { count, error } = await client.from('users').select('*', { count: 'exact', head: true });
    if (!error) getEl('totalCount').innerText = (count || 0) + 548;
})();

// --- 提交名片 ---
async function submitCard() {
    const data = {
        nickname: getEl('nickname').value.trim(),
        gender: getEl('gender').value,
        age: getEl('age').value.trim(),
        city: getEl('city').value.trim(),
        mbti: getEl('mbti').value,
        tags: selectedTags.join(','), // 将数组转为字符串存储
        contact: getEl('contact').value.trim()
    };

    if (!data.nickname || !data.contact || !data.mbti) return alert('请填好昵称、MBTI和联系方式哦！');

    const btn = document.querySelector('.btn-submit');
    btn.disabled = true;
    btn.innerText = '正在上传信号...';

    const { error } = await client.from('users').insert([data]);
    btn.disabled = false;
    btn.innerText = '进入信号池';

    if (error && error.code === '23505') {
        alert('🎉 你已经存在于信号池中啦！直接去捕捉吧！');
    } else if (error) {
        return alert('上传失败：' + error.message);
    } else {
        alert('✅ 信号发射成功！');
        getEl('totalCount').innerText = parseInt(getEl('totalCount').innerText) + 1;
    }
    localStorage.setItem('hasRegistered', 'true');
    localStorage.setItem('myContact', data.contact);
}

// --- 捕捉信号 ---
async function drawCard(targetGender) {
    if (!localStorage.getItem('hasRegistered')) {
        alert('🔒 请先发射你的信号，才能捕捉别人哦！');
        return window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const today = new Date().toLocaleDateString();
    if (localStorage.getItem('lastDrawDate') === today) return alert('⏳ 能量耗尽，明天再来捕捉吧！');

    const myContact = localStorage.getItem('myContact');
    const { data: users, error } = await client.from('users').select('*').eq('gender', targetGender).neq('contact', myContact);

    if (error || !users?.length) return alert('当前频道暂无信号，换个性别试试？');

    let historyIds = JSON.parse(localStorage.getItem('historyIds')) || [];
    const available = users.filter(u => !historyIds.includes(u.id));

    if (!available.length) {
        localStorage.removeItem('historyIds');
        return alert('这一波信号你都接收过啦，重试一下！');
    }

    const lucky = available[Math.floor(Math.random() * available.length)];
    historyIds.push(lucky.id);
    localStorage.setItem('historyIds', JSON.stringify(historyIds));
    localStorage.setItem('lastDrawDate', today);

    // 渲染结果
    getEl('resNick').innerText = lucky.nickname;
    getEl('resMbti').innerText = lucky.mbti || '未知';
    getEl('resInfo').innerText = `${lucky.age}岁 | ${lucky.city}`;
    getEl('resContact').innerText = `复制微信号：${lucky.contact}`;
    getEl('resContact').dataset.content = lucky.contact;
    
    // 渲染标签
    const tagArea = getEl('resTags');
    tagArea.innerHTML = '';
    if (lucky.tags) {
        lucky.tags.split(',').forEach(t => {
            const span = document.createElement('span');
            span.className = 'tag-item active';
            span.style.fontSize = '10px';
            span.innerText = t;
            tagArea.appendChild(span);
        });
    }

    getEl('resultArea').style.display = 'block';
    getEl('resultArea').scrollIntoView({ behavior: 'smooth' });
}

// --- 极简复制 ---
function copyContact() {
    const text = getEl('resContact').dataset.content;
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    alert('✅ 信号已锁定，快去添加微信吧！');
}
