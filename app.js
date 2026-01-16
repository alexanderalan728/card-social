const SUPABASE_URL = 'https://jbyljemznjnqrixyohms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DI6RRfMXVspDzfnAkV61og_qpmnjmYg';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async function initCount(){
    const { count } = await client.from('users').select('*', { count:'exact', head:true });
    if(count !== null) document.getElementById('totalCount').innerText = count + 500;
})();

/* 🧭 首次引导 */
(function(){
    if(!localStorage.getItem('introSeen')){
        document.getElementById('introOverlay').style.display = 'flex';
    }
})();
function closeIntro(){
    localStorage.setItem('introSeen','true');
    document.getElementById('introOverlay').style.display = 'none';
}

/* 📡 发射 */
async function submitCard(){
    const nickname = nickname.value;
    const gender = gender.value;
    const age = age.value;
    const city = city.value;
    const contact = contact.value;
    if(!nickname||!age||!city||!contact) return alert('请完善信息');
    await client.from('users').insert([{nickname,gender,age,city,contact}]);
    localStorage.setItem('hasRegistered','true');
    localStorage.setItem('myContact',contact);
    alert('信号已发射');
}

/* 🎁 捕捉 */
async function drawCard(g){
    if(!localStorage.getItem('hasRegistered')) return alert('请先发射信号');

    const anim = document.getElementById('blindBoxAnim');
    const box = document.getElementById('mysteryBox');
    anim.style.display='flex';
    box.className='mystery-box apple-float';

    await new Promise(r=>setTimeout(r,1500));

    box.className='mystery-box apple-pop';
    await new Promise(r=>setTimeout(r,500));
    anim.style.display='none';

    alert('捕捉完成（示例）');
}
