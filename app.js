// app.js - 로그인/키 없이 '공개 URL'에서 JSON 로드
(function(){
  let ALL = []; // [{topic,q,a}]
  let topics = [];

  
const fileInput = document.getElementById('fileInput');
const fileLoad  = document.getElementById('fileLoad');
const fileName  = document.getElementById('fileName');

async function loadFromFile(file){
  try{
    setUrlStatus('로컬 파일 읽는 중...');
    const text = await file.text();
    const data = JSON.parse(text);
    ALL = flattenData(data);
    console.log('[Load/File] parsed length =', Array.isArray(ALL) ? ALL.length : 'N/A');
    console.log('[Load/File] parsed =', Array.isArray(ALL) ? ALL.length : 'N/A');
    state.i = 0; state.ok = 0; state.ng = 0;
    buildTopics();
    applyFilter();
    buildIndex();
fileName && (fileName.textContent = file.name ? `(${file.name})` : '');
    setUrlStatus(`로컬 파일 로드 완료 (${file.name})`);
  }catch(e){
    setUrlStatus('파일 파싱 실패 - ' + e.message);
  }
}

// Single button = select + load
fileLoad.addEventListener('click', async () => {
  const f = fileInput?.files?.[0];
  if (!f) { fileInput && fileInput.click(); return; }
  await loadFromFile(f);
});
fileInput && fileInput.addEventListener('change', () => {
  const f = fileInput?.files?.[0];
  if (f) loadFromFile(f);
});
  const els = {
    question: document.getElementById('question'),
    answer: document.getElementById('answer'),
    idx: document.getElementById('idx'),
    tot: document.getElementById('tot'),
    ok: document.getElementById('ok'),
    ng: document.getElementById('ng'),
    acc: document.getElementById('acc'),
    bar: document.getElementById('bar'),
    modeLabel: document.getElementById('modeLabel'),
    orderLabel: document.getElementById('orderLabel'),
    filterLabel: document.getElementById('filterLabel'),
    topicLabel: document.getElementById('topicLabel'),
    input: document.getElementById('q'),
    topicSelect: document.getElementById('topicSelect'),
    urlInput: document.getElementById('urlInput'),
    urlLoad: document.getElementById('urlLoad'),
    urlStatus: document.getElementById('urlStatus'),
  };

  const btn = {
    prev: document.getElementById('prev'),
    next: document.getElementById('next'),
    reveal: document.getElementById('reveal'),
    good: document.getElementById('markGood'),
    bad: document.getElementById('markBad'),
    clear: document.getElementById('clear'),
    toggleMode: document.getElementById('toggleMode'),
    toggleShuffle: document.getElementById('toggleShuffle'),
  };

  const storeKey = 'flashcards.topicjson.urlonly.v1';
  let state = {
    deck: [],
    order: 'seq',          // 'seq' | 'shuffle'
    mode: 'study',         // 'study' | 'quiz'
    i: 0,
    show: false,
    ok: 0,
    ng: 0,
    filter: '',
    topic: 'all',          // 'all' | 'all_random' | topic name
  };

  function setLoading(msg){
    els.question.textContent = msg || '카드를 불러오는 중...';
    els.answer.textContent = '';
    els.tot.textContent = '0';
    els.idx.textContent = '0';
  }
  function setUrlStatus(t){ if (els.urlStatus) els.urlStatus.textContent = '상태: ' + t; }

  function save(){
    localStorage.setItem(storeKey, JSON.stringify({
      order: state.order, mode: state.mode, i: state.i, ok: state.ok, ng: state.ng, filter: state.filter, topic: state.topic
    }));
  }
  function load(){
    try{
      const s = JSON.parse(localStorage.getItem(storeKey) || 'null');
      if(!s) return;
      state.order = s.order || 'seq';
      state.mode = s.mode || 'study';
      state.i = +s.i || 0;
      state.ok = +s.ok || 0; state.ng = +s.ng || 0;
      if (s.filter) { state.filter = s.filter; els.input.value = s.filter; }
      if (s.topic) state.topic = s.topic;
    }catch(e){}
  }

  function fisherYates(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

  function buildTopics(){
    const set = new Set();
    ALL.forEach(c => { if (c.topic) set.add(c.topic); });
    const arr = Array.from(set).sort((a,b)=>a.localeCompare(b));
    topics = arr.length?arr:['기본'];
    els.topicSelect.innerHTML = '';
    els.topicSelect.append(new Option('전체', 'all'));
    els.topicSelect.append(new Option('전체(랜덤)', 'all_random'));
    topics.forEach(t => els.topicSelect.append(new Option(t, t)));
    els.topicSelect.value = state.topic;
    if (els.topicSelect.value !== state.topic) { els.topicSelect.value = 'all'; state.topic = 'all'; }
  }

  function filteredByTopic(){
    if (state.topic === 'all' || state.topic === 'all_random') return ALL.slice();
    return ALL.filter(c => c.topic === state.topic);
  }

  function applyFilter(){
    let deck = filteredByTopic();
    if (state.topic === 'all_random') state.order = 'shuffle';

    const f = state.filter.trim().toLowerCase();
    if (f) deck = deck.filter(c => (c.q||'').toLowerCase().includes(f) || (c.a||'').toLowerCase().includes(f) || (c.topic||'').toLowerCase().includes(f));

    deck = (state.order==='shuffle') ? fisherYates(deck.slice()) : deck.slice();

    state.deck = deck;
    if (state.i >= deck.length) state.i = 0;

    els.filterLabel.textContent = f || '없음';
    els.tot.textContent = deck.length;
    els.topicLabel.textContent = (state.topic === 'all') ? '전체' : (state.topic === 'all_random' ? '전체(랜덤)' : state.topic);

    updateCard(true);
  
  buildIndex();
}

  function updateCard(resetShow=false){
    const host = document.getElementById('card');
    if (state.deck.length === 0){
      els.question.textContent = '카드가 없습니다(주제/필터를 확인하세요).';
      els.answer.textContent = '';
      host.classList.add('empty');
      return;
    }
    host.classList.remove('empty');
    const c = state.deck[state.i];
    els.question.textContent = (c.topic ? `[${c.topic}] ` : '') + (c.q||'');
    els.answer.textContent = c.a||'';
    if (resetShow) state.show = (state.mode === 'study');
    els.answer.classList.toggle('hidden', !state.show);

    els.idx.textContent = state.i + 1;
    els.tot.textContent = state.deck.length;
    els.ok.textContent = state.ok;
    els.ng.textContent = state.ng;
    const tried = state.ok + state.ng;
    const acc = tried ? Math.round((state.ok / tried) * 100) : 0;
    els.acc.textContent = acc + '%';
    const progress = Math.round(((state.i + 1) / Math.max(state.deck.length, 1)) * 100);
    els.bar.style.setProperty('--w', progress + '%');

    els.modeLabel.textContent = state.mode === 'study' ? '학습' : '퀴즈';
    els.orderLabel.textContent = state.order === 'shuffle' ? '무작위' : '순차';
  }

  function flip(){ state.show = !state.show; els.answer.classList.toggle('hidden', !state.show); }
  
function showCompleteMessage(){
  const host = document.getElementById('card');
  host.classList.add('complete');
  els.question.textContent = '선택한 주제 학습 완료!';
  els.answer.classList.remove('hidden');
  const tried = state.ok + state.ng;
  const acc = tried ? Math.round((state.ok / tried) * 100) : 0;
  els.answer.innerHTML = [
    `<div>총 <strong>${state.deck.length}</strong>문항을 모두 봤습니다.</div>`,
    `<div class="muted" style="margin:6px 0 12px;">정답 ${state.ok} · 오답 ${state.ng} · 정확도 ${acc}%</div>`,
    `<div style="display:flex;gap:8px;flex-wrap:wrap;">` +
      `<button id="btnReplay" class="accent" type="button">다시 보기</button>` +
    `</div>`
  ].join('');
  // actions
  setTimeout(()=>{
    const r = document.getElementById('btnReplay');
    const a = document.getElementById('btnAll');
    r && r.addEventListener('click', ()=>{ state.i = 0; state.ok=0; state.ng=0; host.classList.remove('complete'); updateCard(true); save(); window.scrollTo({top:0,behavior:'smooth'}); });
    a && a.addEventListener('click', ()=>{ state.topic='all'; buildTopics(); applyFilter(); buildIndex(); host.classList.remove('complete'); save(); window.scrollTo({top:0,behavior:'smooth'}); });
  }, 0);
}
function next(){
  if (!state.deck.length) return;
  if (state.i >= state.deck.length - 1){ showCompleteMessage(); return; }
  state.i += 1; updateCard(true); save();
}

  function prev()
  {
    if (!state.deck.length) 
      return; 
    if (state.i <= 0)
    {
      state.i = 0;
      updateCard(true); 
      save(); 
      return; 
    } 
    state.i -= 1; 
    updateCard(true); 
    save(); 
  }

  function mark(ok){
    if (state.mode !== 'quiz'){ flip(); return; }
    if (!state.show){ flip(); return; }
    if (ok) state.ok++; else state.ng++;
    next(); save();
  }

  // ===== URL에서 데이터 불러오기 =====
  function parseDriveIdOrDirect(url){
    const s = (url||'').trim();
    if (!s) return { direct: '', id: '' };
    // if looks like raw JSON URL, return direct
    if (/^https?:\/\/.+\.(json)(\?.*)?$/i.test(s)) return { direct: s, id: '' };
    // if GCS style without .json query could still be fine
    if (/^https?:\/\/[^ ]+storage\.googleapis\.com\/.+/i.test(s)) return { direct: s, id: '' };
    // try drive id from URL
    const m1 = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    const id = m1 ? m1[1] : (m2 ? m2[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(s) ? s : ''));
    return { direct: '', id };
  }

  function flattenData(data){
    const flat = [];
    if (Array.isArray(data)){
      data.forEach(x => flat.push({ topic: String(x.topic||''), q: String(x.q||''), a: String(x.a||'') }));
    } else if (data && typeof data === 'object'){
      for (const [topic, arr] of Object.entries(data)){
        if (!Array.isArray(arr)) continue;
        arr.forEach(item => {
          let q='', a='';
          if (Array.isArray(item)){ q = String(item[0]||''); a = String(item[1]||''); }
          else if (item && typeof item === 'object'){ q = String(item.q||''); a = String(item.a||''); }
          flat.push({ topic: String(topic), q, a });
        });
      }
    }
    return flat;
  }

  async function fetchJson(url){
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json') || ct.includes('text/json')){
      return await res.json();
    } else {
      const txt = await res.text();
      try { return JSON.parse(txt); }
      catch { throw new Error('JSON 파싱 실패(콘텐츠 타입: ' + ct + ')'); }
    }
  }

  async function loadFromUrl(inputUrl){
    try{
      setUrlStatus('불러오는 중...');
      const { direct, id } = parseDriveIdOrDirect(inputUrl);
      let url = direct;
      if (!url && id){
        // Drive 공유는 CORS가 막힐 수 있음. 우선 uc 엔드포인트 시도.
        url = 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id);
      }
      if (!url) throw new Error('지원되는 URL/ID 형식이 아닙니다. (GCS 공개 URL 권장)');
      const data = await fetchJson(url);
      ALL = flattenData(data);
    console.log('[Load/URL] parsed length =', Array.isArray(ALL) ? ALL.length : 'N/A');
    console.log('[Load/URL] parsed =', Array.isArray(ALL) ? ALL.length : 'N/A');
      state.i = 0; state.ok = 0; state.ng = 0;
      buildTopics();
      applyFilter();
      buildIndex();
setUrlStatus('로드 완료');
    }catch(e){
      setUrlStatus('오류: ' + e.message + ' (Drive는 CORS로 실패할 수 있습니다. GCS 공개 URL을 권장)');
    }
  }

  // events
  btn.reveal.addEventListener('click', () => { flip(); save(); });
  btn.next.addEventListener('click', () => { next(); });
  btn.prev.addEventListener('click', () => { prev(); });
  btn.good.addEventListener('click', () => mark(true));
  btn.bad.addEventListener('click', () => mark(false));

  btn.clear.addEventListener('click', () => { els.input.value=''; state.filter=''; applyFilter(); save(); });
  els.input.addEventListener('input', (e) => { state.filter=e.target.value; applyFilter(); save(); });

  btn.toggleMode.addEventListener('click', () => {
    state.mode = state.mode === 'study' ? 'quiz' : 'study';
    btn.toggleMode.textContent = state.mode === 'study' ? '퀴즈 모드' : '학습 모드';
    updateCard(true); save();
  });
  btn.toggleShuffle.addEventListener('click', () => {
    state.order = state.order === 'seq' ? 'shuffle' : 'seq';
    btn.toggleShuffle.textContent = state.order === 'seq' ? '섞기' : '정렬';
    applyFilter(); save();
  });

  els.topicSelect.addEventListener('change', (e) => {
    state.topic = e.target.value;
    if (state.topic === 'all_random') state.order = 'shuffle';
    applyFilter(); save();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === ' '){ e.preventDefault(); flip(); save(); }
    else if (e.key === 'ArrowRight') { next(); }
    else if (e.key === 'ArrowLeft') { prev(); }
    else if (e.key === '1') { mark(true); }
    else if (e.key === '0') { mark(false); }
    else if (e.key.toLowerCase() === 'f') { els.input.focus(); }
  });

  async function loadLocal(){
    try{
      setLoading('로컬 cards.json 불러오는 중...');
      const res = await fetch('cards.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      ALL = flattenData(data);
    console.log('[Load/URL] parsed length =', Array.isArray(ALL) ? ALL.length : 'N/A');
    console.log('[Load/Local] parsed length =', Array.isArray(ALL) ? ALL.length : 'N/A');
    console.log('[Load/URL] parsed =', Array.isArray(ALL) ? ALL.length : 'N/A');
    console.log('[Load/Local] parsed =', Array.isArray(ALL) ? ALL.length : 'N/A');
      buildTopics();
      applyFilter();
      buildIndex();
}catch(e){
      setLoading('로컬 로드 실패: ' + e.message + ' (URL에서 직접 로드 가능)');
    }
  }

  (function init(){ load(); loadLocal(); els.urlLoad.addEventListener('click', ()=> loadFromUrl(els.urlInput.value)); })();

// ---- Index builder (all topics + questions) ----

function buildIndex() {
  console.log('[Index] buildIndex: start');
  const box = document.getElementById('indexBody');
  const bodyExists = !!box;
  console.log('[Index] indexBody exists =', bodyExists);
  const deck = Array.isArray(state.deck) ? state.deck : [];
  console.log('[Index] deck length =', deck.length, 'order =', state.order, 'topic =', state.topic, 'filter =', state.filter);

  if (!box) { console.warn('[Index] indexBody not found.'); return; }

  if (!deck.length) {
    box.innerHTML = '<div class="muted">표시할 항목이 없습니다. (필터/주제/덱 확인)</div>';
    return;
  }

  // Group by topic but PRESERVE current deck order
  const groups = {};
  const topicOrder = [];
  for (let i = 0; i < deck.length; i++) {
    const c = deck[i];
    const t = c.topic || '(no topic)';
    if (!groups[t]) { groups[t] = []; topicOrder.push(t); }
    groups[t].push({ card: c, idx: i });
  }

  const frag = document.createElement('div');

  for (const t of topicOrder) {
    const arr = groups[t];
    const h = document.createElement('div');
    h.className = 'index-topic';
    h.textContent = t;
    const ul = document.createElement('ul');
    ul.className = 'index-list';
    for (const item of arr) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = item.card.q || '(질문)';
      btn.addEventListener('click', () => {
        console.log('[Index] jump → idx =', item.idx, 'topic =', t);
            // 정렬 보정: 섞기 → 정렬
            state.order = 'seq';
            buildTopics();
            applyFilter();
            // 새 덱에서 동일 카드의 위치를 검색(q+a 키로)
            const qv = item.card.q || '';
            const av = item.card.a || '';
            const newIdx = state.deck.findIndex(x => (x.q||'') === qv && (x.a||'') === av);
            state.i = newIdx >= 0 ? newIdx : 0;
            updateCard(true);
            save();
            window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      li.appendChild(btn);
      ul.appendChild(li);
    }
    frag.appendChild(h);
    frag.appendChild(ul);
  }

  box.innerHTML = '';
  box.appendChild(frag);
  console.log('[Index] buildIndex: done');
}

})();


// ---- Index builder (topics + questions) ----

// ---- Index builder (all topics + questions) ----
function buildIndex() {
  console.log('[Index] buildIndex: start');

  const box = document.getElementById('indexBody');
  const bodyExists = !!box;
  console.log('[Index] interviewBody exists =', bodyExists);

  // Log ALL first (before any early return)
  const isArray = Array.isArray(ALL);
  console.log('[Index] typeof ALL =', typeof ALL);
  console.log('[Index] isArray(ALL) =', isArray);
  if (isArray) { console.log('[Index] ALL length =', ALL.length); }

  if (!box) {
    console.warn('[Index] interviewBody not found. skip render.');
    return;
  }

  // Group by topic
  const groups = {};
  if (Array.isArray(ALL)) {
    for (const c of ALL) {
      if (!c) { continue; }
      const t = c.topic || '(no topic)';
      if (!groups[t]) { groups[t] = []; }
      groups[t].push(c);
    }
  } else {
    console.warn('[Index] ALL is not an array. value =', ALL);
  }

  const topics = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  console.log('[Index] topic count =', topics.length);

  if (!topics.length) {
    box.innerHTML = '<div class="muted">표시할 항목이 없습니다. (ALL 비어있음 또는 topic 없음)</div>';
    return;
  }

  const frag = document.createElement('div');

  for (const t of topics) {
    console.log('[Index] render topic =', t, 'items =', groups[t].length);

    const h = document.createElement('div');
    h.className = 'index-topic';
    h.textContent = t;

    const ul = document.createElement('ul');
    ul.className = 'index-list';

    for (const card of groups[t]) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = card.q || '(질문)';

      btn.addEventListener('click', () => {
        console.log('[Index] click → topic:', t, '| q:', card.q);

        state.topic = t;
        buildTopics();
        applyFilter();

        const idx = state.deck.findIndex(x => x.q === card.q && x.a === card.a);
        console.log('[Index] deck length =', state.deck.length, 'jump idx =', idx);

        if (idx >= 0) {
          state.i = idx;
          updateCard(true);
          save();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      li.appendChild(btn);
      ul.appendChild(li);
    }

    frag.appendChild(h);
    frag.appendChild(ul);
  }

  box.innerHTML = '';
  box.appendChild(frag);

  console.log('[Index] buildIndex: done');
}
