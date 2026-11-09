const D = window.PAPER;
const COLOR = {
  conclusion:'#FEB64F', data:'#E8D2B5', challenge:'#9EA9DA', background:'#A6D6A8', practice:'#CE93D9'
};
const LABEL = {
  conclusion:'主要结论/观点', data:'数据/结果', challenge:'挑战/局限',
  background:'背景', practice:'实践建议'
};
const refById = Object.fromEntries(D.refs.map(r => [r.id, r]));
const pairByK = Object.fromEntries(D.pairs.map(p => [p.k, p]));

/* ---------- 构建句子索引 ---------- */
const sentences = [];  // {el, text, type, ks, done}
let si = 0;

function el(tag, cls, txt){ const n = document.createElement(tag); if(cls) n.className = cls; if(txt!=null) n.textContent = txt; return n; }

/* ---------- 渲染正文 ---------- */
const paper = document.getElementById('paper');
D.blocks.forEach((b, bi) => {
  if (b.style === 'Heading1') {
    const h = el('h1', null, b.sents.map(s => s.t).join(' '));
    paper.appendChild(h);
    return;
  }
  const cls = {Heading2:'h2', Heading3:'h3', Heading4:'h4'}[b.style];
  if (cls) {
    const h = el('div', cls, b.sents.map(s => s.t).join(' '));
    paper.appendChild(h);
    return;
  }
  const p = el('p');
  b.sents.forEach((s, idx) => {
    if (!s.cites || !s.cites.length) {
      const pl = el('span', 'plain', s.t);
      p.appendChild(pl);
      p.appendChild(document.createTextNode(' '));
      return;
    }
    const wrap = el('span', 'cite-sent');
    wrap.style.setProperty('--c', COLOR[s.type] || '#ccc');
    wrap.dataset.type = s.type;
    wrap.textContent = s.t;
    const chips = el('span', 'chips');
    s.cites.forEach(k => {
      const c = el('span', 'chip', pairByK[k].ref);
      c.dataset.k = k; c.style.setProperty('--c', COLOR[s.type] || '#ccc');
      c.addEventListener('click', e => { e.stopPropagation(); openPair(k, true); });
      chips.appendChild(c);
    });
    wrap.appendChild(chips);
    p.appendChild(wrap);
    p.appendChild(document.createTextNode(' '));
    const rec = {el:wrap, text:s.t, type:s.type, ks:s.cites.slice()};
    wrap.dataset.sid = si;
    sentences.push(rec);
    si++;
    wrap.addEventListener('mouseenter', () => showSentence(rec));
    wrap.addEventListener('click', () => showSentence(rec));
  });
  paper.appendChild(p);
});

/* ---------- 参考文献 ---------- */
paper.appendChild(el('div', 'h2', 'References'));
D.refs.forEach(r => {
  const p = el('p', 'ref', r.full);
  paper.appendChild(p);
});

/* ---------- 已核对状态 ---------- */
const KEY = 'refcheck.done.v1';
let done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
function paintDone(){
  sentences.forEach(s => {
    const id = s.el.dataset.sid;
    s.el.classList.toggle('done', done.has(id));
  });
  document.getElementById('progText').textContent = `${done.size} / ${sentences.length}`;
  document.getElementById('barFill').style.width = (done.size / sentences.length * 100) + '%';
}

/* ---------- 面板 ---------- */
let current = null;
const phEmpty = document.getElementById('phEmpty');
const phBody  = document.getElementById('phBody');

function showSentence(rec){
  current = rec;
  document.querySelectorAll('.cite-sent.on').forEach(n => n.classList.remove('on'));
  rec.el.classList.add('on');
  phEmpty.hidden = true; phBody.hidden = false;

  const badge = document.getElementById('typeBadge');
  badge.textContent = LABEL[rec.type] || rec.type;
  badge.style.setProperty('--c', COLOR[rec.type] || '#ccc');
  document.getElementById('sentText').textContent = rec.text;

  const mb = document.getElementById('markBtn');
  const id = rec.el.dataset.sid;
  const setMb = () => {
    mb.classList.toggle('on', done.has(id));
    mb.textContent = done.has(id) ? '✓ 已核对（点击取消）' : '标记已核对';
  };
  setMb();
  mb.onclick = () => {
    if (done.has(id)) done.delete(id); else done.add(id);
    localStorage.setItem(KEY, JSON.stringify([...done]));
    paintDone(); setMb();
    if (done.has(id)) { const nxt = sentences.find(s => !done.has(s.el.dataset.sid) && Number(s.el.dataset.sid) > Number(id)); if (nxt) setTimeout(()=>goto(nxt), 180); }
  };

  const box = document.getElementById('srcs');
  box.innerHTML = '';
  box.className = 'srclist';
  rec.ks.forEach(k => box.appendChild(srcCard(pairByK[k], COLOR[rec.type])));
  document.getElementById('viewer').hidden = true;
}

function srcCard(p, color){
  const r = refById[p.ref] || {authors:'', year:'', full:''};
  const card = el('div', 'src');
  const h = el('div', 'sh');
  h.appendChild(el('span', 'idtag', p.ref));
  h.appendChild(el('span', 'jal', `${r.authors.split(',')[0]} · ${r.year} · p.${p.page}`));
  card.appendChild(h);
  card.appendChild(el('div', 'gloss', p.gloss));
  card.appendChild(el('p', 'quote', '“' + p.src + '”'));
  card.appendChild(el('div', 'hlhint', '下方页面中的黄色高亮 = 这一句在原文里的位置'));
  const m = el('div', 'meta');
  m.appendChild(el('span', null, '点击查看来源页 →'));
  card.appendChild(m);
  card.addEventListener('click', () => openPair(p.k, false, card));
  return card;
}

function openPair(k, alsoPanel, card){
  const p = pairByK[k];
  if (!p) return;
  if (alsoPanel) {
    const rec = sentences.find(s => s.ks.includes(k));
    if (rec) showSentence(rec);
  }
  document.querySelectorAll('.src.on').forEach(n => n.classList.remove('on'));
  if (card) card.classList.add('on');
  else {
    const cards = [...document.querySelectorAll('.src')];
    cards.forEach((c, i) => { if (c.querySelector('.idtag')?.textContent === p.ref) c.classList.add('on'); });
  }
  const v = document.getElementById('viewer');
  v.hidden = false;
  document.getElementById('vLabel').textContent = `${p.ref} · 第 ${p.page} 页 · 高亮处即被引用原句`;
  const img = document.getElementById('vImg');
  const box = document.querySelector('.vimg');
  img.onload = () => {
    const target = p.hy ? Math.max(0, p.hy * img.clientHeight - 140) : 0;
    box.scrollTop = target;
  };
  img.src = p.img;
  const rf = refById[p.ref] || {};
  const a = document.getElementById('vPdf');
  if (rf.pdf) {
    a.href = rf.pdf + '#page=' + p.page;
    a.textContent = '在 PDF 中打开 ↗';
  } else if (rf.doi) {
    a.href = 'https://doi.org/' + rf.doi;
    a.textContent = '到 DOI 原文 ↗';
  } else {
    a.removeAttribute('href');
    a.textContent = '';
  }
  v.scrollIntoView({behavior:'smooth', block:'nearest'});
}

/* ---------- 图例过滤 ---------- */
const legend = document.getElementById('legend');
const offTypes = new Set();
Object.keys(LABEL).forEach(t => {
  const b = el('div', 'lg');
  const sw = el('span', 'sw'); sw.style.background = COLOR[t];
  b.appendChild(sw); b.appendChild(document.createTextNode(LABEL[t]));
  b.onclick = () => {
    if (offTypes.has(t)) { offTypes.delete(t); b.classList.remove('off'); }
    else { offTypes.add(t); b.classList.add('off'); }
    document.querySelectorAll('.cite-sent').forEach(n => {
      const ty = n.dataset.type;
      n.style.display = offTypes.has(ty) ? 'inline' : '';
      n.querySelectorAll('.chips').forEach(c => c.style.display = offTypes.has(ty) ? 'none' : '');
      if (offTypes.has(ty)) { n.style.background = 'transparent'; n.style.boxShadow = 'none'; }
      else { n.style.background = ''; n.style.boxShadow = ''; }
    });
  };
  legend.appendChild(b);
});

/* ---------- 只看引用句 ---------- */
document.getElementById('onlyCited').onchange = e => {
  document.body.classList.toggle('only-cited', e.target.checked);
};

/* ---------- 键盘 ---------- */
let cursor = -1;
function goto(rec){
  const i = sentences.indexOf(rec); cursor = i;
  showSentence(rec);
  rec.el.scrollIntoView({behavior:'smooth', block:'center'});
}
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); if (cursor < sentences.length-1) goto(sentences[cursor+1]); }
  else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); if (cursor > 0) goto(sentences[cursor-1]); }
  else if (e.key === 'x' && current) { document.getElementById('markBtn').click(); }
});

paintDone();
if (sentences.length) { cursor = 0; }

/* ---------- 深链 #k12 ---------- */
function fromHash(){
  const m = /^#k?(\d+)$/.exec(location.hash);
  if (!m) return;
  const k = Number(m[1]);
  const p = pairByK[k];
  if (!p) return;
  const rec = sentences.find(s => s.ks.includes(k));
  if (rec) { showSentence(rec); rec.el.scrollIntoView({block:'center'}); }
  setTimeout(() => openPair(k, false), 60);
}
window.addEventListener('hashchange', fromHash);
fromHash();
