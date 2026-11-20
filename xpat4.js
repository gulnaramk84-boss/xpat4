/* ============================================================
   xpat4.js — Shared utilities for xpat4.org
   - 3-language system (RU / EN / ZH) with browser auto-detect
   - AI Chat Widget (Claude API; falls back to WhatsApp when no key is set)
   - WhatsApp escalation to Gulnara Mambetaliyeva
   ============================================================ */

/* ── CONFIG ── */
const XPAT4_CONFIG = {
  // API-ключи НЕ хранить здесь — репозиторий публичный!
  // Ключ вводится через admin.html → кнопка "🤖 API" → сохраняется в localStorage браузера
  CLAUDE_API_KEYS: [], // оставить пустым
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  CLAUDE_MODEL:   'claude-sonnet-4-20250514',
  GULNARA_WA:     '996700522667',
};

let _apiKeyIndex = 0;

function getActiveApiKey() {
  // Читаем из localStorage — туда ключ вводится через admin.html
  const stored = localStorage.getItem('xpat4-claude-key');
  if (stored && stored.startsWith('sk-ant')) return stored;
  // Запасной вариант — массив в конфиге (если вдруг заполнен)
  const keys = XPAT4_CONFIG.CLAUDE_API_KEYS.filter(k => k && k.length > 10);
  if (keys.length) return keys[_apiKeyIndex % keys.length];
  return '';
}

function rotateApiKey() {
  _apiKeyIndex++;
  console.warn('xpat4: API key rotated');
  return true;
}

/* ── NAV CSS INJECTION ── */
/* Injected via JS so there is ONE source of truth across all pages */
(function() {
  var style = document.createElement('style');
  style.id = 'xpat4-nav-css';
  style.textContent = `
    nav {
      position: fixed !important;
      top: 0; left: 0; right: 0;
      z-index: 100;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 18px 48px;
      background: rgba(250,248,244,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(26,24,20,0.12);
      box-sizing: border-box;
    }
    .logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 22px; font-weight: 400;
      color: #1a1814; text-decoration: none;
      letter-spacing: 0.04em; flex-shrink: 0;
    }
    .logo span { color: #2d5a3d; }
    .nav-center {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 28px;
      list-style: none !important;
      margin: 0; padding: 0;
    }
    .nav-center li {
      list-style: none !important;
      margin: 0; padding: 0;
      display: inline !important;
    }
    .nav-center a {
      font-size: 13px; font-weight: 400;
      color: rgba(26,24,20,0.6);
      text-decoration: none;
      letter-spacing: 0.02em;
      transition: color 0.2s;
      display: inline !important;
    }
    .nav-center a:hover { color: #1a1814; }
    .nav-right {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 16px; flex-shrink: 0;
    }
    .lang-switch {
      display: flex !important;
      flex-direction: row !important;
      gap: 2px;
      background: rgba(26,24,20,0.08);
      border-radius: 3px; padding: 3px;
    }
    .lang-btn {
      font-size: 11px; font-weight: 500;
      letter-spacing: 0.06em;
      padding: 5px 10px; border: none;
      background: transparent; cursor: pointer;
      color: rgba(26,24,20,0.6);
      border-radius: 2px;
      transition: background 0.15s, color 0.15s;
      font-family: 'DM Sans', sans-serif;
    }
    .lang-btn.active {
      background: #faf8f4; color: #1a1814;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .gt-btn { font-size: 14px !important; padding: 4px 8px !important; opacity: 0.7; }
    .gt-btn:hover { opacity: 1 !important; background: rgba(45,90,61,0.08) !important; }
    .nav-cta {
      font-size: 13px; font-weight: 500;
      color: #2d5a3d; text-decoration: none;
      border: 1px solid #2d5a3d;
      padding: 7px 18px; border-radius: 2px;
      white-space: nowrap;
      transition: background 0.2s, color 0.2s;
    }
    .nav-cta:hover { background: #2d5a3d; color: #fff; }
    /* Burger — hidden on desktop */
    .nav-burger {
      display: none !important;
      flex-direction: column;
      gap: 5px; background: none; border: none;
      cursor: pointer; padding: 4px;
    }
    .nav-burger span {
      display: block;
      width: 22px; height: 2px;
      background: #1a1814; border-radius: 2px;
    }
    /* Mobile menu — hidden by default */
    .mobile-menu {
      display: none !important;
      position: fixed;
      top: 60px; left: 0; right: 0;
      background: #faf8f4;
      border-bottom: 1px solid rgba(26,24,20,0.12);
      padding: 16px 24px;
      z-index: 99;
      flex-direction: column; gap: 0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
    .mobile-menu.open { display: flex !important; }
    .mobile-menu a {
      font-size: 16px; color: rgba(26,24,20,0.7);
      text-decoration: none;
      padding: 12px 0;
      border-bottom: 1px solid rgba(26,24,20,0.08);
      display: block !important;
      transition: color 0.2s;
    }
    .mobile-menu a:last-child { border-bottom: none; }
    .mobile-menu a:hover { color: #1a1814; }
    /* ── RESPONSIVE ── */
    @media (max-width: 900px) {
      nav { padding: 14px 20px !important; }
      .nav-center { display: none !important; }
      .nav-cta { display: none !important; }
      .nav-burger { display: flex !important; }
    }
    /* ── FOOTER ── */
    footer {
      padding: 36px 48px !important;
      border-top: 1px solid rgba(26,24,20,0.12);
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 20px;
      flex-wrap: wrap;
    }
    .footer-logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px; font-weight: 400;
      color: rgba(26,24,20,0.6); text-decoration: none;
    }
    .footer-logo span { color: #2d5a3d; }
    .footer-links {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      gap: 20px !important;
      list-style: none !important;
      margin: 0 !important; padding: 0 !important;
    }
    .footer-links li {
      list-style: none !important;
      margin: 0 !important; padding: 0 !important;
      display: inline !important;
    }
    .footer-links a {
      font-size: 12px;
      color: rgba(26,24,20,0.35);
      text-decoration: none;
      letter-spacing: 0.03em;
      transition: color 0.2s;
      display: inline !important;
    }
    .footer-links a:hover { color: rgba(26,24,20,0.6); }
    .footer-copy { font-size: 12px; color: rgba(26,24,20,0.3); }
    @media (max-width: 700px) {
      footer { padding: 28px 20px !important; flex-direction: column !important; align-items: flex-start !important; }
      .footer-links { gap: 14px !important; }
    }
  `;
  document.head.appendChild(style);
})();

/* ── LANGUAGE SYSTEM ── */
window.XPAT4 = window.XPAT4 || {};

XPAT4.detectLang = function() {
  const saved = localStorage.getItem('xpat4-lang');
  if (saved && (saved === 'ru' || saved === 'en')) return saved;
  const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  if (nav.startsWith('ru') || nav.startsWith('ky')) return 'ru';
  return 'en';
};

XPAT4.currentLang = XPAT4.detectLang();

XPAT4.setLang = function(lang) {
  XPAT4.currentLang = lang;
  localStorage.setItem('xpat4-lang', lang);
  document.documentElement.lang = lang === 'ru' ? 'ru' : 'en';
  document.documentElement.dir = 'ltr';
  document.body.style.direction = '';

  // Remove RTL style if any
  const rtl = document.getElementById('xpat4-rtl');
  if (rtl) rtl.remove();

  // Update active button
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });

  // Update all tagged elements
  document.querySelectorAll('[data-ru]').forEach(el => {
    const text = el.getAttribute('data-' + lang) || el.getAttribute('data-en') || el.getAttribute('data-ru');
    if (text !== null) el.innerHTML = text;
  });

  // Update select options
  document.querySelectorAll('select option[data-ru]').forEach(opt => {
    const t = opt.getAttribute('data-' + lang) || opt.getAttribute('data-en');
    if (t) opt.textContent = t;
  });

  document.dispatchEvent(new CustomEvent('xpat4-lang-change', { detail: { lang } }));
};

// Google Translate — opens translation in new tab
window.openGoogleTranslate = function() {
  const url = encodeURIComponent(window.location.href);
  window.open('https://translate.google.com/translate?sl=auto&tl=auto&u=' + url, '_blank');
};

/* ── AI CHAT WIDGET ── */
XPAT4.WIDGET_I18N = {
  ru: {
    title:       'Помощник xpat4',
    subtitle:    'Спросите об экспат-жизни в КР',
    placeholder: 'Введите вопрос…',
    send:        'Отправить',
    greeting:    'Привет! Я помогу с вопросами о жизни и документах в Кыргызстане. Спрашивайте — виза, регистрация, работа, бизнес.',
    thinking:    'Думаю…',
    escalate_msg:'Это сложный вопрос — лучше проконсультируйтесь с Гульнарой Мамбеталиевой лично.',
    wa_btn:      'Написать Гульнаре в WhatsApp',
    error:       'Ошибка соединения. Попробуйте ещё раз.',
    no_key_msg:  'ИИ-помощник сейчас недоступен — но вы можете написать Гульнаре напрямую, она ответит лично.',
    wa_greeting: 'Здравствуйте, Гульнара! С сайта xpat4.org пришёл вопрос от потенциального клиента:\n\n',
    wa_suffix:   '\n\nПожалуйста, ответьте клиенту или дайте добро на ответ от нашего ИИ-помощника.',
  },
  en: {
    title:       'xpat4 Assistant',
    subtitle:    'Ask about expat life in Kyrgyzstan',
    placeholder: 'Type your question…',
    send:        'Send',
    greeting:    'Hi! I can help with questions about living in Kyrgyzstan — visas, registration, work permits, business setup.',
    thinking:    'Thinking…',
    escalate_msg:'This is a complex question — I recommend a personal consultation with Gulnara Mambetaliyeva.',
    wa_btn:      'Message Gulnara on WhatsApp',
    error:       'Connection error. Please try again.',
    no_key_msg:  'The AI assistant is temporarily unavailable — but you can message Gulnara directly and she\'ll reply personally.',
    wa_greeting: 'Hello Gulnara! A potential client from xpat4.org sent a question:\n\n',
    wa_suffix:   '\n\nPlease reply to the client or give approval for our AI assistant to respond.',
  },
  zh: {
    title:       'xpat4 助手',
    subtitle:    '询问吉尔吉斯斯坦的外籍人士生活',
    placeholder: '输入您的问题…',
    send:        '发送',
    greeting:    '您好！我可以帮助解答在吉尔吉斯斯坦生活的问题——签证、注册、工作许可、商业注册等。',
    thinking:    '思考中…',
    escalate_msg:'这是一个复杂的问题，建议您直接咨询顾问古尔纳拉·马姆别塔利耶娃。',
    wa_btn:      '通过WhatsApp联系古尔纳拉',
    error:       '连接错误，请重试。',
    no_key_msg:  'AI助手暂时不可用——但您可以直接联系古尔纳拉，她会亲自回复。',
    wa_greeting: '您好，古尔纳拉！来自xpat4.org网站的潜在客户提出了以下问题：\n\n',
    wa_suffix:   '\n\n请回复客户，或批准我们的AI助手代为回答。',
  }
};

XPAT4.WIDGET_HUMAN = {
  ru: {
    title: 'Вопрос Гульнаре',
    subtitle: 'Ответит лично, в WhatsApp',
    placeholder: 'Ваш вопрос, гражданство и сроки…',
    greeting: 'Опишите ситуацию: гражданство, сколько вы уже в Кыргызстане и что нужно сделать. Мы подготовим сообщение Гульнаре Мамбеталиевой, миграционному консультанту, и откроем WhatsApp. Многие ответы уже есть в гайдах: xpat4.org/guides',
    no_key_msg: 'Готово. Нажмите кнопку: откроется WhatsApp с вашим вопросом, его останется только отправить.',
    wa_greeting: 'Здравствуйте, Гульнара! Вопрос с сайта xpat4.org',
    wa_suffix: '',
    powered: 'Отвечает человек, а не бот · xpat4.org'
  },
  en: {
    title: 'Ask Gulnara',
    subtitle: 'She replies personally on WhatsApp',
    placeholder: 'Your question, citizenship and dates…',
    greeting: 'Describe your situation: citizenship, how long you have been in Kyrgyzstan and what you need to do. We will prepare a message to Gulnara Mambetaliyeva, a migration consultant, and open WhatsApp. Many answers are already in the guides: xpat4.org/guides',
    no_key_msg: 'Done. Tap the button: WhatsApp opens with your question ready to send.',
    wa_greeting: 'Hello Gulnara! A question from xpat4.org',
    wa_suffix: '',
    powered: 'A person replies, not a bot · xpat4.org'
  },
  zh: {
    title: '向古尔纳拉提问',
    subtitle: '她会在WhatsApp上亲自回复',
    placeholder: '您的问题、国籍和时间…',
    greeting: '请描述您的情况：国籍、已在吉尔吉斯斯坦停留多久、需要办理什么。我们会为移民顾问古尔纳拉·马姆别塔利耶娃准备好消息并打开WhatsApp。许多答案已在指南中：xpat4.org/guides',
    no_key_msg: '准备好了。点击按钮，WhatsApp将打开并附上您的问题，直接发送即可。',
    wa_greeting: '您好，古尔纳拉！来自xpat4.org的问题',
    wa_suffix: '',
    powered: '由真人回复，而非机器人 · xpat4.org'
  }
};
XPAT4.widgetText = function (lang) {
  const base = XPAT4.WIDGET_I18N[lang] || XPAT4.WIDGET_I18N.en;
  if (getActiveApiKey()) return Object.assign({ powered: 'Powered by Claude AI · xpat4.org' }, base);
  return Object.assign({}, base, XPAT4.WIDGET_HUMAN[lang] || XPAT4.WIDGET_HUMAN.en);
};

XPAT4.AI_SYSTEM_PROMPT = `You are xpat4 Assistant — a helpful AI for foreigners (expats) moving to or living in Kyrgyzstan. The website xpat4.org connects expats with verified specialists.

DETECT the language of each user message and ALWAYS respond in the SAME language (Russian, English, or Chinese).

RESPONSE FORMAT — return ONLY valid JSON, never plain text:
• Simple/general question  → {"type":"answer","text":"Your brief answer (2-4 sentences max)"}
• Complex/personal question → {"type":"escalate","summary":"Brief description of what client needs in their language"}

CLASSIFY as SIMPLE (answer directly):
- Visa-free entry duration for specific nationality
- e-Visa: available, cost ~$20-50, apply at evisa.e-gov.kg
- Registration (OVPG) basics: required if you stay longer than the registration-free period. Since 23 Sept 2026 that period is 30 days for citizens of the USA, EU, UK, Japan, South Korea and several other countries (and 30 days for EAEU citizens). For other nationalities say the list must be checked with Kyzmat. Fine for staying without a visa or registration: Art. 431 of the Code of Offences, 55 calculation indices (about 5,500 KGS) for up to 1 month, rising to 200 indices (about 20,000 KGS) for over a year; expulsion if an order to fix the violation is ignored for 30 days. Do not quote other fine amounts
- General cost of living in Bishkek
- Which banks accept foreigners
- EAEU countries (Russia, Kazakhstan, Belarus, Armenia): can work/live without work permit
- Company registration basics (OsOO = LLC, from 1 day)
- Basic facts: climate, languages, currency (KGS), internet

CLASSIFY as COMPLEX (escalate to human expert):
- Specific personal legal situations or document problems
- Residence permit (VNJ) application for their specific case
- Citizenship and naturalization
- Tax obligations and optimization
- Business registration details and structure advice
- Work permit for specific employer/situation
- Property purchase by foreigners
- Banking issues or refused transactions
- Any legal disputes or violations
- Anything requiring document review or legal opinion

KEY FACTS:
- Visa-free: Russia/Belarus/Armenia/Kazakhstan = unlimited; EU = 30 days; USA/UK = 60 days of visa-free stay, but only the first 30 days without registration; China = by agreement (check evisa.e-gov.kg)
- e-Visa: all nationalities can apply online
- Registration must be filed no later than the last day of the registration-free period (30 days for USA/EU/UK/Japan/Korea and EAEU citizens since 23 Sept 2026); hotels register guests automatically; re-register within 10 working days after a change of address or passport; leaving Kyrgyzstan for 30+ days cancels the registration
- VNJ (residence permit): 1-5 years, based on work/marriage/study/investment
- Apartment Bishkek: $200-400 budget, $400-800 mid, $800-1500 premium
- Banks: KICB, Optima Bank, RSK, Bakai Bank
- Company: OsOO (LLC equivalent), IP (sole trader), registration 1 day min
- Expert: Gulnara Mambetaliyeva, xpat4.org specialist

Always be warm, concise, and helpful. Never give detailed legal advice on complex matters.`;

XPAT4.initWidget = function() {
  const lang = XPAT4.currentLang;
  const i18n = XPAT4.widgetText(lang);

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #xpat-btn {
      position:fixed; bottom:24px; right:24px; width:54px; height:54px;
      background:var(--accent,#2d5a3d); border:none; border-radius:50%;
      cursor:pointer; z-index:9999; box-shadow:0 4px 20px rgba(45,90,61,0.35);
      display:flex; align-items:center; justify-content:center;
      transition:transform 0.2s, box-shadow 0.2s;
    }
    #xpat-btn:hover { transform:scale(1.08); box-shadow:0 6px 28px rgba(45,90,61,0.45); }
    #xpat-btn svg { width:24px; height:24px; fill:none; stroke:#fff; stroke-width:2; stroke-linecap:round; }
    #xpat-badge {
      position:absolute; top:-3px; right:-3px; width:16px; height:16px;
      background:#e05c3a; border-radius:50%; border:2px solid #fff;
      display:none;
    }
    #xpat-panel {
      position:fixed; bottom:92px; right:24px; width:340px;
      background:#faf8f4; border:1px solid rgba(26,24,20,0.12);
      border-radius:6px; box-shadow:0 8px 40px rgba(26,24,20,0.14);
      z-index:9998; display:flex; flex-direction:column; overflow:hidden;
      max-height:520px;
      opacity:0; transform:translateY(16px) scale(0.97);
      pointer-events:none; transition:all 0.25s cubic-bezier(0.16,1,0.3,1);
    }
    #xpat-panel.open { opacity:1; transform:none; pointer-events:all; }
    #xpat-header {
      padding:16px 18px; background:#2d5a3d; color:#fff;
      display:flex; align-items:center; justify-content:space-between; gap:10px;
    }
    #xpat-header-info { display:flex; align-items:center; gap:10px; }
    #xpat-avatar {
      width:34px; height:34px; background:rgba(255,255,255,0.2);
      border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-size:14px; flex-shrink:0;
    }
    #xpat-title { font-weight:500; font-size:14px; line-height:1.2; }
    #xpat-subtitle { font-size:11px; opacity:0.7; margin-top:1px; }
    #xpat-close {
      background:none; border:none; color:rgba(255,255,255,0.7);
      cursor:pointer; font-size:20px; line-height:1; padding:2px;
      transition:color 0.2s; flex-shrink:0;
    }
    #xpat-close:hover { color:#fff; }
    #xpat-messages {
      flex:1; overflow-y:auto; padding:16px; display:flex;
      flex-direction:column; gap:12px; min-height:200px; max-height:320px;
    }
    .xpat-msg {
      max-width:88%; padding:10px 14px; border-radius:4px;
      font-size:13px; line-height:1.55; font-weight:300;
    }
    .xpat-msg.bot { background:#f0f4f1; color:#1a1814; align-self:flex-start; }
    .xpat-msg.user {
      background:#2d5a3d; color:#fff; align-self:flex-end; font-weight:400;
    }
    .xpat-msg.thinking {
      background:#f0f4f1; color:rgba(26,24,20,0.4);
      font-style:italic; align-self:flex-start;
    }
    .xpat-escalate-card {
      background:#fff; border:1px solid rgba(45,90,61,0.2);
      border-radius:4px; padding:14px; margin-top:8px;
    }
    .xpat-wa-btn {
      display:block; width:100%; margin-top:10px;
      background:#25d366; color:#fff; border:none;
      border-radius:4px; padding:10px 16px;
      font-size:13px; font-weight:500; cursor:pointer;
      text-decoration:none; text-align:center;
      transition:opacity 0.2s;
    }
    .xpat-wa-btn:hover { opacity:0.88; }
    #xpat-input-row {
      display:flex; gap:8px; padding:12px 14px;
      border-top:1px solid rgba(26,24,20,0.1);
      background:#fff;
    }
    #xpat-input {
      flex:1; border:1px solid rgba(26,24,20,0.15); border-radius:4px;
      padding:9px 12px; font-size:13px; font-family:'DM Sans',sans-serif;
      outline:none; background:#faf8f4; color:#1a1814;
      transition:border-color 0.2s; resize:none; max-height:80px;
    }
    #xpat-input:focus { border-color:rgba(45,90,61,0.5); }
    #xpat-send {
      background:#2d5a3d; border:none; border-radius:4px;
      color:#fff; width:36px; height:36px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:opacity 0.2s; align-self:flex-end;
    }
    #xpat-send:hover { opacity:0.85; }
    #xpat-send svg { width:16px; height:16px; fill:none; stroke:#fff; stroke-width:2.5; stroke-linecap:round; }
    #xpat-powered {
      text-align:center; font-size:10px; color:rgba(26,24,20,0.3);
      padding:6px; background:#fff; border-top:1px solid rgba(26,24,20,0.06);
      letter-spacing:0.04em;
    }
    @media(max-width:400px) {
      #xpat-panel { width:calc(100vw - 20px); right:10px; bottom:84px; }
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button id="xpat-btn" aria-label="${i18n.title}" aria-haspopup="dialog" title="${i18n.title}">
      <span id="xpat-badge"></span>
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
    <div id="xpat-panel" role="dialog" aria-label="${i18n.title}">
      <div id="xpat-header">
        <div id="xpat-header-info">
          <div id="xpat-avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg></div>
          <div>
            <div id="xpat-title">${i18n.title}</div>
            <div id="xpat-subtitle">${i18n.subtitle}</div>
          </div>
        </div>
        <button id="xpat-close" aria-label="Close">×</button>
      </div>
      <div id="xpat-messages"></div>
      <div id="xpat-input-row">
        <textarea id="xpat-input" rows="1" placeholder="${i18n.placeholder}"></textarea>
        <button id="xpat-send" aria-label="${i18n.send}">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div id="xpat-powered">${i18n.powered}</div>
    </div>
  `;
  document.body.appendChild(wrap);

  // State
  let isOpen = false;
  let isTyping = false;
  let conversation = [];
  let greeted = false;

  const panel    = document.getElementById('xpat-panel');
  const btn      = document.getElementById('xpat-btn');
  const badge    = document.getElementById('xpat-badge');
  const closeBtn = document.getElementById('xpat-close');
  const msgs     = document.getElementById('xpat-messages');
  const input    = document.getElementById('xpat-input');
  const sendBtn  = document.getElementById('xpat-send');

  function getLang() { return XPAT4.currentLang || 'en'; }
  function getI18n() { return XPAT4.widgetText(getLang()); }

  function addMsg(text, role, html) {
    const div = document.createElement('div');
    div.className = 'xpat-msg ' + role;
    if (html) div.innerHTML = text;
    else div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showGreeting() {
    if (greeted) return;
    greeted = true;
    const g = getI18n().greeting.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace('xpat4.org/guides', '<a href="/guides">xpat4.org/guides</a>');
    addMsg(g, 'bot', true);
  }

  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) {
      showGreeting();
      input.focus();
      badge.style.display = 'none';
    }
  }

  btn.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', () => { isOpen = false; panel.classList.remove('open'); });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  });
  sendBtn.addEventListener('click', sendMsg);

  async function sendMsg() {
    const text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    input.style.height = 'auto';

    addMsg(text, 'user');
    conversation.push({ role: 'user', content: text });

    if (!getActiveApiKey()) {
      handleEscalate(text, getI18n().no_key_msg);
      return;
    }

    isTyping = true;
    const thinkEl = addMsg(getI18n().thinking, 'thinking');

    try {
      const response = await callAI(conversation);
      thinkEl.remove();

      let parsed;
      try {
        // Strip possible markdown fences
        const clean = response.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { type: 'answer', text: response };
      }

      if (parsed.type === 'escalate') {
        handleEscalate(parsed.summary || text);
      } else {
        const answerText = parsed.text || response;
        addMsg(answerText, 'bot');
        conversation.push({ role: 'assistant', content: JSON.stringify(parsed) });
      }
    } catch (err) {
      thinkEl.remove();
      addMsg(getI18n().error, 'bot');
      console.error('xpat4 AI error:', err);
    }

    isTyping = false;
  }

  function handleEscalate(summary, message) {
    const t = getI18n();
    const page = (document.title || '').split(' — ')[0];
    const waText = encodeURIComponent(t.wa_greeting + (page ? ' (' + page + ', ' + location.href.split('?')[0] + ')' : '') + ':\n\n' + summary + (t.wa_suffix || ''));
    const waUrl  = `https://wa.me/${XPAT4_CONFIG.GULNARA_WA}?text=${waText}`;

    const html = `
      <div class="xpat-escalate-card">
        <div style="font-size:13px;line-height:1.5;color:#1a1814;">${message || t.escalate_msg}</div>
        <a class="xpat-wa-btn" href="${waUrl}" target="_blank" rel="noopener">${t.wa_btn}</a>
      </div>
    `;
    addMsg(html, 'bot', true);
    conversation.push({ role: 'assistant', content: '{"type":"escalate"}' });

    // Show badge if panel closed
    if (!isOpen) { badge.style.display = 'block'; }
  }

  async function callAI(messages) {
    return callClaude(messages);
  }

  async function callClaude(messages, attempt) {
    attempt = attempt || 0;
    const key = getActiveApiKey();
    if (!key) throw new Error('No API key configured');

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
        'anthropic-beta': 'messages-2023-06-01'
    };

    const res = await fetch(XPAT4_CONFIG.CLAUDE_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model:      XPAT4_CONFIG.CLAUDE_MODEL,
        max_tokens: 600,
        system:     XPAT4.AI_SYSTEM_PROMPT,
        messages:   messages
      })
    });

    // Rate limit or auth error → try next key (max 1 rotation per call)
    if ((res.status === 429 || res.status === 401) && attempt === 0) {
      const rotated = rotateApiKey();
      return callClaude(messages, 1);
    }

    if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // Update widget language when lang changes
  XPAT4.updateWidgetLang = function(lang) {
    const t = XPAT4.widgetText(lang);
    const pw = document.getElementById('xpat-powered');
    if (pw) pw.textContent = t.powered;
    const titleEl    = document.getElementById('xpat-title');
    const subtitleEl = document.getElementById('xpat-subtitle');
    if (titleEl)    titleEl.textContent    = t.title;
    if (subtitleEl) subtitleEl.textContent = t.subtitle;
    if (input)      input.placeholder      = t.placeholder;
    if (btn)        btn.title              = t.title;
    if (!greeted) return;
    // Show greeting in new lang on first message only - don't reset conversation
  };
};

/* ── PROJECT CARDS (our other projects, shown where they fit) ── */
XPAT4.PROJECTS = {
  resumelink: {
    url: 'https://resumelink.cc/',
    ru: { title: 'ResumeLink — резюме в виде ссылки и QR-кода', desc: 'Загрузите резюме в PDF или DOCX и получите личную ссылку, QR-код и оценку ATS. Бесплатно, без регистрации.' },
    en: { title: 'ResumeLink — your resume as a link and QR code', desc: 'Upload a PDF or DOCX resume and get a personal link, a QR code and an ATS score. Free, no signup.' },
    zh: { title: 'ResumeLink — 把简历变成链接和二维码', desc: '上传PDF或DOCX简历，即可获得个人链接、二维码和ATS评分。免费，无需注册。' }
  },
  fundan: {
    url: 'https://fundan.cc/',
    ru: { title: 'Fundan — поиск грантов и инвесторов', desc: 'ИИ подбирает гранты, акселераторы и инвесторов для Кыргызстана и Центральной Азии. Поиск бесплатный, полный доступ платный.' },
    en: { title: 'Fundan — find grants and investors', desc: 'AI matches grants, accelerators and investors for Kyrgyzstan and Central Asia. Search is free; full access is paid.' },
    zh: { title: 'Fundan — 寻找资助和投资人', desc: 'AI为吉尔吉斯斯坦和中亚匹配资助、加速器和投资人。搜索免费，完整功能付费。' }
  },
  ratekit: {
    url: 'https://ratekit.org/',
    ru: { title: 'RateKit — калькуляторы для фрилансеров и основателей', desc: 'Ставка фрилансера, комиссии Stripe и PayPal, НДС, инвойсы, а для американцев — расчёт FEIE (форма 2555). Бесплатно.' },
    en: { title: 'RateKit — calculators for freelancers and founders', desc: 'Freelance rate, Stripe and PayPal fees, VAT, invoices and, for US expats, the FEIE (Form 2555). Free.' },
    zh: { title: 'RateKit — 面向自由职业者和创业者的计算器', desc: '自由职业费率、Stripe与PayPal手续费、增值税、发票，以及面向美国侨民的FEIE（2555表）。免费。' }
  }
};
XPAT4.PROJECT_I18N = {
  ru: { tag: 'Полезный сервис', go: 'Открыть' },
  en: { tag: 'Useful service', go: 'Open' },
  zh: { tag: '实用服务', go: '打开' }
};
XPAT4.renderProjects = function() {
  const lang = ['ru', 'en', 'zh'].includes(XPAT4.currentLang) ? XPAT4.currentLang : 'en';
  const ui = XPAT4.PROJECT_I18N[lang];
  document.querySelectorAll('[data-xp-project]').forEach(el => {
    const p = XPAT4.PROJECTS[el.getAttribute('data-xp-project')];
    if (!p) return;
    const t = p[lang] || p.en;
    el.innerHTML = '<a class="xp-card" href="' + p.url + '" target="_blank" rel="noopener">' +
      '<span class="xp-tag">' + ui.tag + '</span>' +
      '<span class="xp-title">' + t.title + '</span>' +
      '<span class="xp-desc">' + t.desc + '</span>' +
      '<span class="xp-go">' + ui.go + ' →</span></a>';
  });
};
(function() {
  if (document.getElementById('xpat4-proj-css')) return;
  const s = document.createElement('style');
  s.id = 'xpat4-proj-css';
  s.textContent = [
    '.xp-proj{margin:32px 0 0}',
    '.xp-wrap{box-sizing:border-box;max-width:896px;margin:0 auto;padding:0 48px 56px}.xp-wrap .xp-proj{margin:0}',
    '.xp-card{display:grid;grid-template-columns:1fr auto;column-gap:24px;row-gap:4px;padding:20px 24px;border:1px solid rgba(26,24,20,.12);background:#f5f0e8;text-decoration:none;color:#1a1814;transition:border-color .2s,background .2s}',
    '.xp-card:hover{border-color:#2d5a3d;background:#f0ebe0}',
    '.xp-tag{grid-column:1/-1;font:500 10px/1 "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#2d5a3d;margin-bottom:6px}',
    '.xp-title{font:400 19px/1.3 "Cormorant Garamond",serif;color:#1a1814}',
    '.xp-desc{grid-column:1;font:300 13px/1.6 "DM Sans",sans-serif;color:rgba(26,24,20,.6)}',
    '.xp-go{grid-column:2;grid-row:2/4;align-self:center;font:500 12px "DM Sans",sans-serif;color:#2d5a3d;white-space:nowrap}',
    '.xp-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:1100px;margin:0 auto;padding:0 48px 72px}',
    '.xp-row .xp-proj{margin:0}.xp-row .xp-card{height:100%;grid-template-columns:1fr}',
    '.xp-row .xp-go{grid-column:1;grid-row:auto;margin-top:8px}',
    '@media(max-width:700px){.xp-wrap{padding:0 20px 40px}}',
    '@media(max-width:900px){.xp-row{grid-template-columns:1fr;padding:0 20px 48px}.xp-card{grid-template-columns:1fr}.xp-go{grid-column:1;grid-row:auto;margin-top:8px}}'
  ].join('\n');
  document.head.appendChild(s);
})();
document.addEventListener('xpat4-lang-change', XPAT4.renderProjects);

/* ── Mobile menu: aria-expanded sync ── */
(function () {
  function sync() {
    var m = document.getElementById("mobile-menu");
    if (!m) return;
    var set = function () {
      var b = document.getElementById("nav-burger");
      if (b) b.setAttribute("aria-expanded", m.classList.contains("open") ? "true" : "false");
    };
    new MutationObserver(set).observe(m, { attributes: true, attributeFilter: ["class"] });
    set();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync); else sync();
})();

/* ── SITE SEARCH (Ctrl+K) ── */
XPAT4.SEARCH_I18N = {
  ru: { btn: 'Поиск', ph: 'Найти: регистрация, просрочка, ВНЖ, налоги…', hint: 'Enter — открыть · ↑↓ — выбрать · Esc — закрыть', empty: 'Ничего не нашлось.', ask: 'Спросите Гульнару →', try: 'Часто ищут', loading: 'Загружаем…', types: { guide: 'Гайд', article: 'Статья', news: 'Новость', page: 'Раздел' }, sugg: ['регистрация', 'просрочка', 'разрешение на работу', 'налоги', 'ВНЖ', 'цифровой кочевник'] },
  en: { btn: 'Search', ph: 'Search: registration, overstay, residence permit, taxes…', hint: 'Enter to open · ↑↓ to move · Esc to close', empty: 'Nothing found.', ask: 'Ask Gulnara →', try: 'Popular', loading: 'Loading…', types: { guide: 'Guide', article: 'Article', news: 'News', page: 'Section' }, sugg: ['registration', 'overstay', 'work permit', 'taxes', 'residence permit', 'digital nomad'] },
  zh: { btn: '搜索', ph: '搜索：登记、超期、居留许可、税…', hint: 'Enter 打开 · ↑↓ 选择 · Esc 关闭', empty: '没有找到结果。', ask: '向古尔纳拉提问 →', try: '热门搜索', loading: '加载中…', types: { guide: '指南', article: '文章', news: '新闻', page: '栏目' }, sugg: ['registration', 'overstay', 'work permit', 'taxes', 'ВНЖ', 'digital nomad'] }
};
(function () {
  let index = null, loading = null, open = false, sel = 0, results = [];
  const L = () => XPAT4.SEARCH_I18N[XPAT4.currentLang] || XPAT4.SEARCH_I18N.ru;
  const norm = (s) => (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„()\[\],.;:!?/\\]/g, ' ');
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // crude Russian/English stemming: drop typical endings so "регистрацию" finds "регистрация"
  const stem = (w) => {
    if (/[а-я]/.test(w)) { if (w.length > 6) return w.slice(0, w.length - 2); if (w.length > 4) return w.slice(0, w.length - 1); return w; }
    if (w.length > 5) return w.replace(/(ing|ed|es|s)$/, '');
    return w;
  };
  const tokens = (q) => norm(q).split(/\s+/).filter((w) => w.length >= 2).map(stem);

  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch('/search-index.json?v=' + new Date().toISOString().slice(0, 10)).then((r) => r.json()).then((d) => {
        index = d.map((x) => Object.assign(x, { _t: norm(x.t + ' ' + (x.te || '')), _h: norm(x.h), _d: norm(x.d), _b: norm(x.b) }));
        return index;
      });
    }
    return loading;
  }

  function search(q) {
    const ts = tokens(q);
    if (!ts.length || !index) return [];
    const now = Date.now();
    const scored = [];
    for (const x of index) {
      let score = 0, hit = 0;
      for (const t of ts) {
        let s = 0;
        if (x._t.includes(t)) s += 10;
        if (x._h.includes(t)) s += 4;
        if (x._d.includes(t)) s += 3;
        if (x._b.includes(t)) s += 1 + Math.min(3, (x._b.split(t).length - 1) * 0.3);
        if (s) hit++;
        score += s;
      }
      if (!hit) continue;
      if (hit < ts.length) score *= 0.35;           // prefer pages that match every word
      if (x.k === 'guide') score += 4;
      else if (x.k === 'page') score += 1;
      if (x.k === 'news' && x.dt) { const days = (now - Date.parse(x.dt)) / 864e5; score += days < 30 ? 2 : days < 90 ? 1 : 0; }
      scored.push({ x, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 12).map((s) => s.x);
  }

  function snippet(x, q) {
    const ts = tokens(q);
    const text = x.b || x.d || '';
    const low = norm(text);
    let at = -1;
    for (const t of ts) { const i = low.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
    let s = at < 0 ? text.slice(0, 150) : (at > 60 ? '…' : '') + text.slice(Math.max(0, at - 60), at + 110);
    s = esc(s) + (text.length > 170 ? '…' : '');
    for (const t of ts) {
      if (t.length < 3) continue;
      const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[а-яёa-z]*)', 'gi');
      s = s.replace(re, '<mark>$1</mark>');
    }
    return s;
  }

  function css() {
    if (document.getElementById('xpat4-search-css')) return;
    const st = document.createElement('style');
    st.id = 'xpat4-search-css';
    st.textContent = [
      '.xs-btn{display:inline-flex;align-items:center;gap:8px;font:400 13px "DM Sans",sans-serif;color:rgba(26,24,20,.7);background:rgba(26,24,20,.05);border:1px solid rgba(26,24,20,.1);border-radius:100px;padding:7px 12px 7px 11px;cursor:pointer;transition:border-color .2s,color .2s;white-space:nowrap}',
      '.xs-btn:hover{border-color:#2d5a3d;color:#1a1814}',
      '.xs-btn kbd{font:500 11px "DM Sans",sans-serif;color:rgba(26,24,20,.55);border:1px solid rgba(26,24,20,.15);border-radius:4px;padding:1px 5px;background:#faf8f4}',
      '@media(max-width:900px){.xs-btn .xs-label,.xs-btn kbd{display:none}.xs-btn{padding:8px;border-radius:50%}}',
      '.xs-ov{position:fixed;inset:0;z-index:100000;background:rgba(26,24,20,.42);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding:10vh 16px 16px}',
      '.xs-ov.open{display:flex}',
      '.xs-box{width:100%;max-width:640px;background:#faf8f4;border:1px solid rgba(26,24,20,.12);box-shadow:0 30px 80px -30px rgba(26,24,20,.55);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;max-height:76vh}',
      '.xs-top{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(26,24,20,.1)}',
      '.xs-top svg{flex-shrink:0;color:#2d5a3d}',
      '.xs-in{flex:1;border:0;outline:0;background:transparent;font:400 17px "DM Sans",sans-serif;color:#1a1814}',
      '.xs-close{border:0;background:rgba(26,24,20,.06);color:rgba(26,24,20,.7);border-radius:6px;font:500 12px "DM Sans",sans-serif;padding:5px 8px;cursor:pointer}',
      '.xs-list{overflow-y:auto;padding:8px}',
      '.xs-item{display:block;padding:12px 14px;border-radius:8px;text-decoration:none;color:#1a1814}',
      '.xs-item.sel,.xs-item:hover{background:#f0ebe0}',
      '.xs-meta{display:flex;gap:8px;align-items:center;font:500 11px "DM Sans",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#2d5a3d;margin-bottom:4px}',
      '.xs-meta span+span{color:rgba(26,24,20,.55);letter-spacing:0;text-transform:none;font-weight:400}',
      '.xs-title{font:400 19px/1.3 "Cormorant Garamond",serif}',
      '.xs-snip{font:300 13px/1.55 "DM Sans",sans-serif;color:rgba(26,24,20,.7);margin-top:3px}',
      '.xs-snip mark{background:#e8f0ea;color:#1a1814;padding:0 2px;border-radius:2px}',
      '.xs-empty{padding:22px 16px;font:400 14px "DM Sans",sans-serif;color:rgba(26,24,20,.7)}',
      '.xs-empty a{color:#2d5a3d}',
      '.xs-sugg{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
      '.xs-sugg button{font:400 13px "DM Sans",sans-serif;border:1px solid rgba(26,24,20,.15);background:#fff;border-radius:100px;padding:6px 12px;cursor:pointer;color:#1a1814}',
      '.xs-sugg button:hover{border-color:#2d5a3d}',
      '.xs-foot{padding:10px 18px;border-top:1px solid rgba(26,24,20,.1);font:400 12px "DM Sans",sans-serif;color:rgba(26,24,20,.6)}',
      '@media(max-width:600px){.xs-ov{padding:0}.xs-box{max-width:none;max-height:100vh;height:100%;border-radius:0}.xs-foot{display:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  const ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  let ov, input, list, foot;

  function build() {
    css();
    ov = document.createElement('div');
    ov.className = 'xs-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="xs-box"><div class="xs-top">' + ICON + '<input class="xs-in" type="search" autocomplete="off" spellcheck="false" aria-label="Search"><button class="xs-close" type="button">Esc</button></div><div class="xs-list" role="listbox"></div><div class="xs-foot"></div></div>';
    document.body.appendChild(ov);
    input = ov.querySelector('.xs-in'); list = ov.querySelector('.xs-list'); foot = ov.querySelector('.xs-foot');
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelector('.xs-close').addEventListener('click', close);
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { const a = list.querySelectorAll('.xs-item')[sel]; if (a) { e.preventDefault(); location.href = a.getAttribute('href'); close(); } }
    });
  }

  function move(d) {
    const items = list.querySelectorAll('.xs-item');
    if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    items.forEach((a, i) => a.classList.toggle('sel', i === sel));
    items[sel].scrollIntoView({ block: 'nearest' });
  }

  function render() {
    const t = L(); const q = input.value.trim();
    input.placeholder = t.ph; foot.textContent = t.hint;
    if (!index) { list.innerHTML = '<div class="xs-empty">' + t.loading + '</div>'; return; }
    if (!q) {
      list.innerHTML = '<div class="xs-empty">' + t.try + '<div class="xs-sugg">' + t.sugg.map((s) => '<button type="button">' + esc(s) + '</button>').join('') + '</div></div>';
      list.querySelectorAll('.xs-sugg button').forEach((b) => b.addEventListener('click', () => { input.value = b.textContent; render(); input.focus(); }));
      return;
    }
    results = search(q); sel = 0;
    if (!results.length) { list.innerHTML = '<div class="xs-empty">' + t.empty + ' <a href="/contact#brief">' + t.ask + '</a></div>'; return; }
    list.innerHTML = results.map((x, i) => {
      const date = x.dt ? new Date(x.dt).toLocaleDateString(XPAT4.currentLang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
      const title = (XPAT4.currentLang === 'en' && x.te) ? x.te : x.t;
      return '<a class="xs-item' + (i === 0 ? ' sel' : '') + '" role="option" href="' + esc(x.u) + '"><div class="xs-meta"><span>' + esc(t.types[x.k] || '') + '</span>' + (date ? '<span>' + esc(date) + '</span>' : '') + '</div><div class="xs-title">' + esc(title) + '</div><div class="xs-snip">' + snippet(x, q) + '</div></a>';
    }).join('');
    list.querySelectorAll('.xs-item').forEach((a) => a.addEventListener('click', close));
  }

  function openSearch() {
    if (!ov) build();
    open = true; ov.classList.add('open'); document.documentElement.style.overflow = 'hidden';
    input.value = ''; render(); setTimeout(() => input.focus(), 10);
    load().then(render).catch(() => { list.innerHTML = '<div class="xs-empty">—</div>'; });
  }
  function close() { if (!ov) return; open = false; ov.classList.remove('open'); document.documentElement.style.overflow = ''; }
  XPAT4.openSearch = openSearch;

  function addButton() {
    const right = document.querySelector('nav .nav-right');
    if (!right || right.querySelector('.xs-btn')) return;
    css();
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'xs-btn';
    b.setAttribute('aria-label', 'Поиск по сайту (Ctrl+K)');
    b.innerHTML = ICON + '<span class="xs-label">' + L().btn + '</span><kbd>Ctrl K</kbd>';
    b.addEventListener('click', openSearch);
    right.insertBefore(b, right.firstChild);
    document.addEventListener('xpat4-lang-change', () => { const s = b.querySelector('.xs-label'); if (s) s.textContent = L().btn; if (open) render(); });
  }

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л')) { e.preventDefault(); open ? close() : openSearch(); }
    else if (e.key === '/' && !typing && !open) { e.preventDefault(); openSearch(); }
    else if (e.key === 'Escape' && open) { close(); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();

/* ── AUTO-INIT on DOMContentLoaded ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    XPAT4.setLang(XPAT4.currentLang);
    XPAT4.initWidget();
  });
} else {
  XPAT4.setLang(XPAT4.currentLang);
  XPAT4.initWidget();
}
