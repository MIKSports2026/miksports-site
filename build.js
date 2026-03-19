/**
 * MIK 빌드 스크립트
 * - content/news/*.md     → public/news/{slug}.html  (뉴스 상세 페이지)
 * - content/calendar/*.md → public/calendar-data.json
 * - content/gallery/*.md  → public/gallery-data.json
 * - public/news-data.json (뉴스 목록 — news 페이지에서 fetch)
 * - HTML 파일들 → public/ 복사
 */
const fs   = require('fs');
const path = require('path');

// ───────────────────────────────────────────────────────────
// 헬퍼
// ───────────────────────────────────────────────────────────
function ensure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseMd(filepath) {
  const raw   = fs.readFileSync(filepath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon < 0) return;
    const key = line.slice(0, colon).trim();
    let   val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (val !== '' && !isNaN(val)) val = Number(val);
    meta[key] = val;
  });
  return { meta, body: match[2].trim() };
}

function mdToHtml(md = '') {
  const lines = md.split('\n');
  const out   = [];
  let inList  = false;

  for (const line of lines) {
    if (line.startsWith('### '))        { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if (line.startsWith('## '))   { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if (line.startsWith('# '))    { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h1>${inline(line.slice(2))}</h1>`); }
    else if (line.startsWith('> '))    { if (inList) { out.push('</ul>'); inList = false; } out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); }
    else if (line.match(/^[-*] /))     { if (!inList) { out.push('<ul>'); inList = true; }  out.push(`<li>${inline(line.slice(2))}</li>`); }
    else if (line.trim() === '')        { if (inList) { out.push('</ul>'); inList = false; } out.push(''); }
    else                                { if (inList) { out.push('</ul>'); inList = false; } out.push(`<p>${inline(line)}</p>`); }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function inline(s = '') {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function fmtDate(d = '') { return String(d).slice(0, 10).replace(/-/g, '.'); }

const CAT = {
  press:  { label: '보도자료',       cls: 'cat-press',  bg: 't-dark'  },
  race:   { label: '레이스 리포트', cls: 'cat-race',   bg: 't-dark'  },
  notice: { label: '공지사항',       cls: 'cat-notice', bg: 't-blue'  },
  biz:    { label: '비즈니스',       cls: 'cat-biz',    bg: 't-grey'  },
};

// ───────────────────────────────────────────────────────────
// 디렉토리 준비
// ───────────────────────────────────────────────────────────
['public', 'public/news', 'public/uploads'].forEach(ensure);

// ───────────────────────────────────────────────────────────
// HTML 파일 복사
// ───────────────────────────────────────────────────────────
const HTML_FILES = [
  'mik-homepage-white.html',
  'mik-identity.html',
  'mik-business.html',
  'mik-racing.html',
  'mik-news.html',
  'mik-contact.html',
];
HTML_FILES.forEach(f => {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, path.join('public', f));
    console.log(`  copied: ${f}`);
  } else {
    console.warn(`  WARN: ${f} not found`);
  }
});

if (fs.existsSync('sitemap.xml')) fs.copyFileSync('sitemap.xml', 'public/sitemap.xml');
if (fs.existsSync('admin'))       fs.cpSync('admin', 'public/admin', { recursive: true });

// ───────────────────────────────────────────────────────────
// 뉴스 처리
// ───────────────────────────────────────────────────────────
let allNews = [];
const newsDir = 'content/news';

if (fs.existsSync(newsDir)) {
  fs.readdirSync(newsDir)
    .filter(f => f.endsWith('.md'))
    .forEach(file => {
      const { meta, body } = parseMd(path.join(newsDir, file));
      const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '');
      allNews.push({ ...meta, slug, body });
    });
}

// 날짜 내림차순
allNews.sort((a, b) => String(b.date).localeCompare(String(a.date)));

// ── 뉴스 상세 페이지 생성 ─────────────────────────────────
allNews.forEach(n => {
  const cat  = CAT[n.category] || CAT.notice;
  const html = buildDetailPage(n, cat);
  fs.writeFileSync(`public/news/${n.slug}.html`, html);
  console.log(`  news detail: public/news/${n.slug}.html`);
});

// ── news-data.json (news 페이지에서 fetch) ─────────────────
const newsData = allNews.map(n => ({
  slug:      n.slug,
  title:     n.title,
  category:  n.category,
  date:      n.date,
  excerpt:   n.excerpt || '',
  thumbnail: n.thumbnail || null,
  featured:  n.featured || false,
  external_url: n.external_url || null,
}));
fs.writeFileSync('public/news-data.json', JSON.stringify(newsData, null, 2));
console.log(`  news-data.json: ${newsData.length}건`);

// ───────────────────────────────────────────────────────────
// 캘린더 JSON
// ───────────────────────────────────────────────────────────
const calDir = 'content/calendar';
let calData  = [];
if (fs.existsSync(calDir)) {
  fs.readdirSync(calDir).filter(f => f.endsWith('.md')).forEach(f => {
    const { meta } = parseMd(path.join(calDir, f));
    calData.push(meta);
  });
}
calData.sort((a, b) => (a.round || 0) - (b.round || 0));
fs.writeFileSync('public/calendar-data.json', JSON.stringify(calData, null, 2));
console.log(`  calendar-data.json: ${calData.length}건`);

// ───────────────────────────────────────────────────────────
// 갤러리 JSON
// ───────────────────────────────────────────────────────────
const galDir = 'content/gallery';
let galData  = [];
if (fs.existsSync(galDir)) {
  fs.readdirSync(galDir).filter(f => f.endsWith('.md')).forEach(f => {
    const { meta } = parseMd(path.join(galDir, f));
    galData.push(meta);
  });
}
galData.sort((a, b) => String(b.date).localeCompare(String(a.date)));
fs.writeFileSync('public/gallery-data.json', JSON.stringify(galData, null, 2));
console.log(`  gallery-data.json: ${galData.length}건`);

console.log('\n✅  Build complete!');

// ───────────────────────────────────────────────────────────
// 뉴스 상세 페이지 템플릿
// ───────────────────────────────────────────────────────────
function buildDetailPage(n, cat) {
  const bodyHtml    = mdToHtml(n.body);
  const thumbStyle  = n.thumbnail
    ? `background:url('${n.thumbnail}') center/cover no-repeat;`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${n.title} — MIK</title>
<meta name="description" content="${(n.excerpt || '').replace(/"/g, '&quot;').slice(0, 155)}">
<meta property="og:title"       content="${n.title} — MIK">
<meta property="og:description" content="${(n.excerpt || '').replace(/"/g, '&quot;').slice(0, 155)}">
<meta property="og:url"         content="https://www.miksports.com/news/${n.slug}">
<meta property="og:type"        content="article">
${n.thumbnail ? `<meta property="og:image" content="${n.thumbnail}">` : ''}
<link rel="canonical" href="https://www.miksports.com/news/${n.slug}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": ${JSON.stringify(n.title)},
  "datePublished": "${n.date || ''}",
  "description": ${JSON.stringify(n.excerpt || '')},
  "publisher": { "@type": "Organization", "name": "㈜MIK", "url": "https://www.miksports.com" }
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--blue:#0055FF;--cyan:#00D9C8;--deep:#0a0a14;--mid:#444455;--sub:#888899;--line:#e4e4ec;--surface:#f5f5f8;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#fff;color:var(--deep);font-family:'Pretendard',sans-serif;line-height:1.7;}
/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:100;height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(16px);}
.logo{font-family:'Orbitron',sans-serif;font-weight:900;font-size:1rem;text-decoration:none;color:var(--deep);display:flex;align-items:center;gap:8px;}
.logo .b{color:var(--blue);}
.logo .d{width:1px;height:14px;background:var(--line);}
.nav-links{display:flex;gap:28px;list-style:none;}
.nav-links a{color:var(--sub);text-decoration:none;font-size:.76rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;transition:color .2s;}
.nav-links a:hover{color:var(--deep);}
.nav-cta{background:var(--blue);color:#fff;padding:.5rem 1.2rem;border-radius:3px;font-size:.74rem;font-weight:700;font-family:'Orbitron',sans-serif;letter-spacing:.1em;text-decoration:none;}
/* ARTICLE */
.container{max-width:840px;margin:0 auto;padding:112px 24px 100px;}
.breadcrumb{display:flex;align-items:center;gap:8px;font-size:.72rem;color:var(--sub);margin-bottom:22px;font-family:'Orbitron',sans-serif;letter-spacing:.08em;}
.breadcrumb a{color:var(--sub);text-decoration:none;}
.breadcrumb a:hover{color:var(--blue);}
.breadcrumb .sep{color:var(--line);}
.a-cat{display:inline-block;font-family:'Orbitron',sans-serif;font-size:.6rem;letter-spacing:.2em;padding:.22rem .6rem;border-radius:20px;margin-bottom:14px;font-weight:700;}
.cat-press {background:#e8f0ff;color:var(--blue);}
.cat-race  {background:var(--deep);color:var(--cyan);}
.cat-notice{background:#e0faf5;color:#007a6e;}
.cat-biz   {background:#f0f0f0;color:var(--mid);}
h1.a-title{font-family:'Orbitron',sans-serif;font-weight:900;font-size:clamp(1.4rem,3vw,2rem);line-height:1.2;margin-bottom:12px;}
.a-date{font-size:.8rem;color:var(--sub);padding-bottom:24px;margin-bottom:32px;border-bottom:1px solid var(--line);}
.a-thumb{width:100%;height:300px;border-radius:8px;margin-bottom:36px;overflow:hidden;background:var(--deep);display:flex;align-items:center;justify-content:center;}
.a-thumb-placeholder{font-family:'Orbitron',sans-serif;font-weight:900;font-size:2rem;color:rgba(0,217,200,.25);}
.a-body{font-size:.97rem;color:var(--mid);line-height:1.95;}
.a-body h1,.a-body h2,.a-body h3{font-family:'Orbitron',sans-serif;font-weight:700;color:var(--deep);margin:2rem 0 .8rem;}
.a-body h2{font-size:1.1rem;} .a-body h3{font-size:.95rem;}
.a-body p{margin-bottom:1.15rem;}
.a-body strong{color:var(--deep);font-weight:600;}
.a-body em{font-style:italic;}
.a-body code{background:var(--surface);padding:.1rem .35rem;border-radius:3px;font-family:monospace;font-size:.88em;}
.a-body blockquote{border-left:3px solid var(--blue);padding:12px 20px;background:var(--surface);margin:1.5rem 0;color:var(--mid);}
.a-body ul{padding-left:1.4rem;margin-bottom:1.15rem;}
.a-body li{margin-bottom:.45rem;}
.a-body a{color:var(--blue);text-decoration:underline;}
.a-tags{display:flex;gap:7px;flex-wrap:wrap;margin-top:36px;padding-top:24px;border-top:1px solid var(--line);}
.a-tag{font-size:.71rem;background:var(--surface);color:var(--sub);padding:.22rem .65rem;border-radius:20px;}
.ext-link{display:inline-flex;align-items:center;gap:8px;margin-top:24px;padding:12px 20px;background:var(--surface);border:1px solid var(--line);border-radius:6px;color:var(--blue);text-decoration:none;font-size:.85rem;transition:border-color .2s;}
.ext-link:hover{border-color:var(--blue);}
.back{display:inline-flex;align-items:center;gap:8px;margin-top:40px;font-family:'Orbitron',sans-serif;font-size:.7rem;letter-spacing:.1em;color:var(--blue);text-decoration:none;transition:gap .2s;}
.back:hover{gap:14px;}
</style>
</head>
<body>
<nav>
  <a href="/mik-homepage-white.html" class="logo"><span class="b">MIK</span><span class="d"></span>MOTION IN KOREA</a>
  <ul class="nav-links">
    <li><a href="/mik-identity.html">IDENTITY</a></li>
    <li><a href="/mik-business.html">BUSINESS</a></li>
    <li><a href="/mik-racing.html">ASSETS</a></li>
    <li><a href="/mik-news.html">NEWS</a></li>
    <li><a href="/mik-contact.html">CONTACT</a></li>
  </ul>
  <a href="/mik-contact.html" class="nav-cta">CONTACT US</a>
</nav>

<div class="container">
  <div class="breadcrumb">
    <a href="/mik-homepage-white.html">HOME</a><span class="sep">/</span>
    <a href="/mik-news.html">NEWS</a><span class="sep">/</span>
    <span>${n.title}</span>
  </div>

  <span class="a-cat ${cat.cls}">${cat.label}</span>
  <h1 class="a-title">${n.title}</h1>
  <div class="a-date">${fmtDate(n.date)}</div>

  <div class="a-thumb" style="${thumbStyle}">
    ${!n.thumbnail ? `<span class="a-thumb-placeholder">MIK</span>` : ''}
  </div>

  <div class="a-body">${bodyHtml}</div>

  ${n.external_url ? `<a href="${n.external_url}" target="_blank" rel="noopener" class="ext-link">원문 기사 보기 →</a>` : ''}
  ${(n.tags || []).length ? `<div class="a-tags">${(n.tags || []).map(t => `<span class="a-tag">${t}</span>`).join('')}</div>` : ''}

  <a href="/mik-news.html" class="back">← 뉴스 목록으로</a>
</div>
</body>
</html>`;
}
