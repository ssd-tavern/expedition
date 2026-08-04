(function () {

  // ════ 常量与选择器(LS_KEYS/SEL) ════
  const doc = window.parent.document;
  const SHELL_ID = 'exp-shell-root';
  const SHELL_TOKEN = 'exp_' + Math.random().toString(36).slice(2) + '_' + Date.now();

  const LS_KEYS = {
    tab: 'exp_shell_tab',
    theme: 'exp_shell_theme',
    pins: 'exp_shell_pins',
    optionMode: 'exp_shell_option_mode',
    heroMode: 'exp_shell_hero_mode',
    fontSize: 'exp_shell_fontsize',
    motion: 'exp_shell_motion',
    sfw: 'exp_shell_sfw',
    mapView: 'exp_shell_mapview',
  };

  const SEL = {
    entry: 'exp-entry',
    entryEnter: 'exp-entry-enter',
    shellHideStyle: 'exp-shell-hide-style',
    shellStyle: 'exp-shell-style',
    tbClose: 'exp-tb-close',
    tbLoc: 'exp-tb-loc',
    topbarTime: 'exp-topbar-time',
    storyLog: 'exp-story-log',
    storyTextarea: 'exp-story-textarea',
    storyStatus: 'exp-story-status',
    storySend: 'exp-story-send',
    storyRegen: 'exp-story-regen',
    storyDel: 'exp-story-del',
    storyDelbar: 'exp-story-delbar',
    storyJump: 'exp-story-jump',
    delCount: 'exp-del-count',
    delCancel: 'exp-del-cancel',
    delConfirm: 'exp-del-confirm',
    lightbox: 'exp-lightbox',
    acuNav: 'exp-nav-acu',
    customBack: 'exp-custom-back',
    customGo: 'exp-custom-go',
    customLook: 'exp-custom-look',
    customPast: 'exp-custom-past',
    customHint: 'exp-custom-hint',
  };


  // 护栏调试口: 平时静默; 控制台执行 localStorage.expDebug='1' 后, 被try/catch吞掉的错误会输出
  function dbg(tag, e) {
    try { if (window.parent.localStorage.getItem('expDebug')) console.warn('[远征dbg]', tag, e); } catch (err) {}
  }
  // ════ 外壳可见性与入口(隐藏原生/显隐切换/进入胶囊) ════
  function ensureHideStyle() {
    let style = doc.getElementById(SEL.shellHideStyle);
    if (!style) {
      style = doc.createElement('style');
      style.id = SEL.shellHideStyle;
      style.textContent = '#chat, #form_sheld { display: none !important; }';
      doc.head.appendChild(style);
    }
    return style;
  }

  function isShellVisible() {
    const root = doc.getElementById(SHELL_ID);
    return root ? root.dataset.visible !== 'false' : false;
  }

  function applyVisibility(visible) {
    const root = doc.getElementById(SHELL_ID);
    if (root) {
      root.dataset.visible = visible ? 'true' : 'false';
      root.style.display = visible ? 'flex' : 'none';
    }
    ensureHideStyle().disabled = !visible;
    if (visible) hideEntry();
    else renderEntry();
  }

  function toggleShellImpl() {
    if (isShellVisible()) { commitUserEditIfOpen(); playShellExit(); return; }
    try {
      bootAnimating = motionOK();
      lastStat = null; prevStat = null;
      storyCacheDrop();
      editState = null;
      if (delMode) setDelMode(false);
      applyVisibility(true);
      updateAcuNav();
      renderAll(true);
      renderStoryLog();
      if (canSelectOpening() && !openingConfirmed) switchTab('opening');
      else {
        const t = safeLSGet(LS_KEYS.tab);
        if (t && getPanel(t)) switchTab(t);
      }
      playShellEnter();
    } catch (e) {
      applyVisibility(false);
      throw e;
    }
  }
  const toggleShell = (typeof errorCatched === 'function') ? errorCatched(toggleShellImpl) : toggleShellImpl;

  function onShellEnter(e) {
    try { window.parent.__EXP_ENTER_FLAG = false; } catch (err) {}
    try {
      let t = (e && e.detail && e.detail.theme) || null;
      if (!t) t = safeLSGet(LS_KEYS.theme);
      if (t && THEMES.some(x => x.key === t) && t !== theme) applyTheme(t);
    } catch (err) {}
    if (!isShellVisible()) toggleShell();
  }

  function floor0SwipeId() {
    try {
      const m0 = getChatMessages(0, { include_swipes: true })[0];
      return m0 ? (m0.swipe_id || 0) : 0;
    } catch (e) { return 0; }
  }

  function ensureEntry() {
    let el = doc.getElementById(SEL.entry);
    if (!el) {
      el = doc.createElement('div');
      el.id = SEL.entry;
      el.dataset.owner = SHELL_TOKEN;
      el.className = 'hidden';
      doc.body.appendChild(el);
    }
    if (theme === 'dark') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme);
    if (motionMode === 'lite') el.setAttribute('data-motion', 'off'); else el.removeAttribute('data-motion');
    return el;
  }

  function hideEntry() {
    const el = doc.getElementById(SEL.entry);
    if (el) { el.className = 'hidden'; el.innerHTML = ''; }
  }

  function renderEntry() {
    const el = ensureEntry();
    const lastId = safeLastMessageId();
    if (lastId === 0 && floor0SwipeId() === 0) { el.className = 'hidden'; el.innerHTML = ''; return; }
    el.className = 'pill';
    el.innerHTML = `<button class="exp-entry-pill" id="${SEL.entryEnter}"><span class="ico">${EMBLEM}</span><span>富兰克林远征</span><span class="chev">${ICO.chev}</span></button>`;
    positionPill();
    const enter = doc.getElementById(SEL.entryEnter);
    if (enter) enter.addEventListener('click', toggleShell);
  }

  function positionPill() {
    const el = doc.getElementById(SEL.entry);
    if (!el || el.className !== 'pill') return;
    const chat = doc.getElementById('chat');
    if (chat) {
      const r = chat.getBoundingClientRect();
      el.style.left = (r.left + r.width / 2) + 'px';
      el.style.top = (r.top + 10) + 'px';
    } else {
      el.style.left = '50%';
      el.style.top = 'calc(14px + env(safe-area-inset-top, 0px))';
    }
    el.style.transform = 'translateX(-50%)';
  }
  window.parent.addEventListener('resize', positionPill);
  window.parent.addEventListener('resize', onMapResize);

  // ════ CSS与主题变量(THEME_VARS/SHELL_CSS) ════
  const THEME_VARS = {
    dark: {
      'accent': '#e4c479',
      'quote': '#e4c479',
      'accent-rgb': '228,196,121',
      'on-accent': '#17140d',
      'gold': '#c8a34d',
      'gold-hi': '#e4c479',
      'gold-soft': '#d8c48a',
      'gold-mid': '#d9b45f',
      'gold-deep': '#a8842f',
      'gold-rgb': '200,163,77',
      'on-gold': '#17140d',
      'fg-rgb': '255,255,255',
      'pop-rgb': '16,20,24',
      'sh-rgb': '0,0,0',
      'text': '#c9cdd6',
      'text-strong': '#dcdee4',
      'text-dim': '#9aa0ab',
      'text-faint': '#8a929c',
      'aff': '#e0896f',
      'cor': '#c39ad8',
      'bg': 'radial-gradient(130% 90% at 80% 6%,#181a20 0%,#101115 52%,#0b0c0f 100%)',
      'bg-side': 'linear-gradient(180deg,#0d0e12,#0a0b0d)',
      'panel': 'rgba(255,255,255,.03)',
      'sem-good': '#7fa05a',
      'sem-warn': '#d08a45',
      'sem-bad': '#cc6e64',
      'sem-frost': '#7fb0d4',
      'scrim': 'rgba(0,0,0,.78)',
      'on-scrim': '#d8c48a',
      'on-scrim-dim': '#9aa0ab',
      'panel-hover': 'rgba(255,255,255,.07)',
      'meter-good-a': '#7fa05a', 'meter-good-b': '#6b8e4e',
      'meter-mid-a': '#d6b25e', 'meter-mid-b': '#c8a558',
      'meter-warn-a': '#d08a45', 'meter-warn-b': '#bf6f2c',
      'meter-bad-a': '#b23a2e', 'meter-bad-b': '#9c2a22',
      'poi-current': '#a5382b', 'poi-seen': '#5a3d1c', 'poi-unseen': '#7a6138',
    },
    parchment: {
      'accent': '#016575',
      'quote': '#006280',
      'accent-rgb': '1,101,117',
      'on-accent': '#eef7f6',
      'brand': '#2d5f66',
      'num': '#1d1710',
      'gold': '#8a6a17',
      'gold-hi': '#a07a1e',
      'gold-soft': '#7f6318',
      'gold-mid': '#b3923f',
      'gold-deep': '#7d6420',
      'gold-rgb': '140,105,20',
      'on-gold': '#faf4e0',
      'fg-rgb': '62,50,24',
      'pop-rgb': '248,244,233',
      'sh-rgb': '100,80,36',
      'text': '#2e2517',
      'text-strong': '#1d1710',
      'text-dim': '#4a402b',
      'text-faint': '#645b49',
      'aff': '#2d5f66',
      'cor': '#6d3390',
      'aff-a': '#5b8b90',
      'bg': 'radial-gradient(130% 90% at 80% 6%,#f1ead8 0%,#ebe3d0 52%,#ded3b7 100%)',
      'bg-side': 'linear-gradient(180deg,#01414c,#002c33)',
      'panel': '#fbf9f0',
      'sem-good': '#456420',
      'sem-warn': '#8b4a09',
      'sem-bad': '#96423a',
      'sem-frost': '#305c7e',
      'scrim': 'rgba(46,36,16,.86)',
      'on-scrim': '#c8b78d',
      'on-scrim-dim': '#bcb2a0',
      'panel-hover': '#f4f0e2',
      'side-text': '#7caeb6',
      'side-text-hi': '#d4e5e8',
      'side-title': '#e8d9ae',
      'side-active': '#e4c479',
      'side-gold': '#d9b45f',
      'side-gold-rgb': '217,180,95',
      'side-fg-rgb': '255,255,255',
      'panel-sh': '0 1px 4px rgba(100,80,36,.15)',
      'meter-good-a': '#5f7a42', 'meter-good-b': '#4a6034',
      'meter-mid-a': '#a5843a', 'meter-mid-b': '#8a6c2e',
      'meter-warn-a': '#a86432', 'meter-warn-b': '#8f5225',
      'meter-bad-a': '#8f3527', 'meter-bad-b': '#752a1e',
      'poi-current': '#8f3527', 'poi-seen': '#7d6420', 'poi-unseen': '#a19680',
    },
    ivory: {
      'accent': '#1f3a5f',
      'quote': '#315caa',
      'accent-rgb': '31,58,95',
      'on-accent': '#f6f3ea',
      'gold': '#8a6a17',
      'gold-hi': '#a07a1e',
      'gold-soft': '#7f6318',
      'gold-mid': '#c09a30',
      'gold-deep': '#846814',
      'gold-rgb': '140,105,20',
      'on-gold': '#fdfaf1',
      'fg-rgb': '31,58,95',
      'pop-rgb': '253,252,247',
      'sh-rgb': '31,58,95',
      'text': '#26303c',
      'text-strong': '#161f2a',
      'text-dim': '#36485e',
      'text-faint': '#556274',
      'aff': '#8e2f24',
      'cor': '#6d3390',
      'aff-a': '#b85548',
      'bg': 'radial-gradient(130% 90% at 80% 6%,#faf7ec 0%,#f2eede 52%,#e2dcc6 100%)',
      'bg-side': 'linear-gradient(180deg,#1f3a5f,#152a47)',
      'panel': '#fefdf6',
      'sem-good': '#4a6926',
      'sem-warn': '#925011',
      'sem-bad': '#9d463d',
      'sem-frost': '#346183',
      'scrim': 'rgba(14,24,42,.86)',
      'on-scrim': '#c2ae76',
      'on-scrim-dim': '#a7b0ba',
      'panel-hover': '#f8f6ea',
      'panel-sh': '0 1px 4px rgba(31,58,95,.10)',
      'side-title': '#e8d9ae',
      'side-text': '#93a7c4',
      'side-text-hi': '#dbe4f0',
      'side-active': '#e4c479',
      'side-gold': '#d9b45f',
      'side-gold-rgb': '217,180,95',
      'side-fg-rgb': '255,255,255',
      'meter-good-a': '#4f7a3a', 'meter-good-b': '#3d6129',
      'meter-mid-a': '#95792a', 'meter-mid-b': '#7a6320',
      'meter-warn-a': '#a05e2a', 'meter-warn-b': '#874e20',
      'meter-bad-a': '#8e2f24', 'meter-bad-b': '#742519',
      'poi-current': '#8e2f24', 'poi-seen': '#7a5f0e', 'poi-unseen': '#9aa8b8',
    },
    arctic: {
      'accent': '#7fb0d4',
      'quote': '#e3c082',
      'accent-rgb': '127,176,212',
      'on-accent': '#0c141d',
      'brand': '#7fb0d4',
      'gold': '#b7a05a',
      'gold-hi': '#e6d494',
      'gold-soft': '#cdba79',
      'gold-mid': '#d8c47e',
      'gold-deep': '#94803f',
      'gold-rgb': '183,160,90',
      'on-gold': '#10161c',
      'fg-rgb': '200,225,244',
      'pop-rgb': '14,23,32',
      'sh-rgb': '0,0,0',
      'text': '#c2d1dd',
      'text-strong': '#dde8f1',
      'text-dim': '#8aa0b2',
      'text-faint': '#758c9d',
      'aff': '#e0896f',
      'cor': '#b78fce',
      'bg': 'radial-gradient(130% 90% at 80% 6%,#17242f 0%,#0f1821 52%,#090f16 100%)',
      'bg-side': 'linear-gradient(180deg,#0d151e,#090f15)',
      'panel': 'rgba(200,225,244,.045)',
      'sem-good': '#7fa05a',
      'sem-warn': '#d08a45',
      'sem-bad': '#d0776d',
      'sem-frost': '#7fb0d4',
      'scrim': 'rgba(0,0,0,.78)',
      'on-scrim': '#cdba79',
      'on-scrim-dim': '#8aa0b2',
      'panel-hover': 'rgba(200,225,244,.09)',
      'meter-good-a': '#7ba888', 'meter-good-b': '#5f8d70',
      'meter-mid-a': '#cdb877', 'meter-mid-b': '#b39c5c',
      'meter-warn-a': '#d9925a', 'meter-warn-b': '#c07840',
      'meter-bad-a': '#c1503f', 'meter-bad-b': '#a53c2d',
      'poi-current': '#c25a3f', 'poi-seen': '#5a4a3a', 'poi-unseen': '#7a6a56',
    },
    marble: {
      'gold': '#8a6a17',
      'gold-hi': '#a07a1e',
      'gold-soft': '#7f6318',
      'gold-mid': '#b3902c',
      'gold-deep': '#7d6210',
      'gold-rgb': '140,105,20',
      'on-gold': '#fdfcf5',
      'fg-rgb': '46,44,38',
      'pop-rgb': '253,252,250',
      'sh-rgb': '70,66,52',
      'text': '#32302a',
      'text-strong': '#201e18',
      'text-dim': '#49463c',
      'text-faint': '#635f55',
      'aff': '#7a2230',
      'cor': '#6d3390',
      'accent': '#7a2230',
      'quote': '#983e52',
      'accent-rgb': '122,34,48',
      'on-accent': '#fdf6f2',
      'brand': '#7a2230',
      'num': '#201e18',
      'aff-a': '#b0485c',
      'bg': 'radial-gradient(130% 90% at 80% 6%,#f5f4f0 0%,#eceae3 52%,#dcd9cf 100%)',
      'bg-side': 'linear-gradient(180deg,#681d29,#4c151e)',
      'panel': '#fdfcfa',
      'sem-good': '#486723',
      'sem-warn': '#8c4c0d',
      'sem-bad': '#9b443c',
      'sem-frost': '#386385',
      'scrim': 'rgba(30,28,22,.86)',
      'on-scrim': '#c5b485',
      'on-scrim-dim': '#b0aa9c',
      'panel-hover': '#f6f4ef',
      'side-text': '#c69aa1',
      'side-text-hi': '#eddee0',
      'side-title': '#e8d9ae',
      'side-active': '#e4c479',
      'side-gold': '#d9b45f',
      'side-gold-rgb': '217,180,95',
      'side-fg-rgb': '255,255,255',
      'panel-sh': '0 1px 4px rgba(60,55,40,.12)',
      'meter-good-a': '#5c7a3f', 'meter-good-b': '#4a6531',
      'meter-mid-a': '#b3902c', 'meter-mid-b': '#7d6210',
      'meter-warn-a': '#a06428', 'meter-warn-b': '#87511f',
      'meter-bad-a': '#7a2230', 'meter-bad-b': '#5f1a25',
      'poi-current': '#7a2230', 'poi-seen': '#7d6210', 'poi-unseen': '#9e998a',
    },
  };
  function themeSwatch(key) {
    const v = THEME_VARS[key] || {};
    const stops = (v.bg || '').match(/#[0-9a-fA-F]{6}/g) || [];
    return [stops[Math.floor(stops.length / 2)] || v.panel || '#888', v.accent || v['gold-hi'], v['gold-mid']];
  }
  function themeVarsCss(key, vars) {
    const sel = key === 'dark' ? '#exp-shell-root,#exp-entry' : `#exp-shell-root[data-theme="${key}"],#exp-entry[data-theme="${key}"]`;
    return sel + '{' + Object.entries(vars).map(([k, v]) => `--${k}:${v};`).join('') + '}';
  }
  const THEME_CSS = Object.entries(THEME_VARS).map(([k, v]) => themeVarsCss(k, v)).join('\n');

  const SHELL_CSS = `

${THEME_CSS}
#exp-shell-root,#exp-entry{--border-pop:rgba(var(--gold-rgb),.42);--border-hover:rgba(var(--gold-rgb),.55);}
#exp-shell-root[data-theme="parchment"] .exp-story-turn.user .exp-story-text{background:rgba(var(--accent-rgb),.06);border-color:rgba(var(--accent-rgb),.28);}
#exp-shell-root[data-theme="ivory"] .exp-story-turn.user .exp-story-text{background:rgba(var(--accent-rgb),.06);border-color:rgba(var(--accent-rgb),.28);}
#exp-shell-root[data-theme="marble"] .exp-story-turn.user .exp-story-text{background:rgba(var(--accent-rgb),.06);border-color:rgba(var(--accent-rgb),.28);}
#exp-shell-root{position:fixed;inset:0;height:100vh;height:100dvh;z-index:9000;display:flex;flex-direction:row;font-family:'Noto Serif SC','Source Han Serif SC','Songti SC','SimSun','Georgia',serif;color:var(--text);background:var(--bg);--read-col:700px;}
#exp-shell-root *{box-sizing:border-box;}
#exp-shell-root ::-webkit-scrollbar{width:8px;height:8px;}
#exp-shell-root ::-webkit-scrollbar-thumb{background:rgba(var(--gold-rgb),.22);border-radius:4px;}
#exp-shell-root ::-webkit-scrollbar-track{background:transparent;}

/* 侧栏 */
#exp-shell-root .exp-side{width:226px;flex:none;display:flex;flex-direction:column;background:var(--bg-side);border-right:1px solid rgba(var(--side-gold-rgb,var(--gold-rgb)),.26);}
#exp-shell-root .exp-side-head{display:flex;align-items:center;gap:11px;height:64px;box-sizing:border-box;padding:0 20px;border-bottom:1px solid rgba(var(--side-gold-rgb,var(--gold-rgb)),.26);}
#exp-shell-root .exp-emblem{width:26px;height:26px;color:var(--side-gold,var(--brand,var(--gold)));flex:none;display:inline-flex;}
#exp-shell-root .exp-emblem svg{width:100%;height:100%;}
#exp-shell-root .exp-side-title{font-size:16px;letter-spacing:4px;color:var(--side-title,var(--brand,var(--gold-soft)));font-weight:600;}
#exp-shell-root .exp-nav{flex:1;overflow-y:auto;padding:12px 0;}
#exp-shell-root .exp-nav-item{display:flex;align-items:center;gap:13px;padding:12px 22px;color:var(--side-text,var(--text-faint));cursor:pointer;border-left:3px solid transparent;font-size:15px;letter-spacing:4px;transition:color .15s,background .15s;}
#exp-shell-root .exp-nav-item:hover{color:var(--side-text-hi,var(--text));background:rgba(var(--side-fg-rgb,var(--fg-rgb)),.03);}
#exp-shell-root .exp-nav-item.active{color:var(--side-active,var(--accent,var(--gold-hi)));border-left-color:var(--side-gold,var(--accent,var(--gold)));background:linear-gradient(90deg,rgba(var(--side-gold-rgb,var(--accent-rgb,var(--gold-rgb))),.13),transparent 85%);}
#exp-shell-root .exp-nav-ico{width:19px;height:19px;flex:none;display:inline-flex;}
#exp-shell-root .exp-nav-ico svg{width:100%;height:100%;}
#exp-shell-root .exp-nav-item[data-ext="acu"]{display:none;}
#exp-shell-root[data-acu] .exp-nav-item[data-ext="acu"]{display:flex;}

/* 主区 */
#exp-shell-root .exp-main{flex:1;display:flex;flex-direction:column;min-width:0;}
#exp-shell-root .exp-topbar{display:flex;align-items:center;gap:24px;height:calc(64px + env(safe-area-inset-top,0px));box-sizing:border-box;padding:env(safe-area-inset-top,0px) 28px 0;flex:none;border-bottom:1px solid rgba(var(--gold-rgb),.14);}
#exp-shell-root .exp-tb-info{display:contents;}
#exp-shell-root .exp-tb-item{display:flex;align-items:center;gap:8px;font-size:13.5px;letter-spacing:1.5px;color:var(--text-dim);}
#exp-shell-root .exp-season{color:var(--gold-soft);}
#exp-shell-root .exp-season::before{content:'／';color:rgba(var(--gold-rgb),.5);}
#exp-shell-root .exp-tb-item svg{width:16px;height:16px;color:var(--gold);flex:none;}
#exp-shell-root .exp-panels{flex:1;position:relative;overflow:hidden;}
#exp-shell-root .exp-panel{position:absolute;inset:0;overflow-y:auto;padding:28px 32px;display:none;}
#exp-shell-root .exp-panel.active{display:block;}

/* 角色页 */
#exp-shell-root .exp-panel[data-panel="char"]{padding:12px 32px 28px;overflow:hidden;}
#exp-shell-root .exp-panel.active[data-panel="char"]{display:flex;flex-direction:column;}
#exp-shell-root .exp-char-tabs{flex:none;display:flex;gap:4px;border-bottom:1px solid rgba(var(--gold-rgb),.24);margin-bottom:16px;overflow-x:auto;overflow-y:hidden;padding-bottom:1px;scrollbar-width:none;-ms-overflow-style:none;}
#exp-shell-root .exp-char-tabs::-webkit-scrollbar{display:none;}
#exp-shell-root .exp-char-tab{position:relative;flex:none;white-space:nowrap;padding:6px 22px 9px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:15px;letter-spacing:3px;color:var(--text-dim);transition:color .15s;}
#exp-shell-root .exp-char-tab:hover{color:var(--accent,var(--gold-soft));}
#exp-shell-root .exp-char-tab.active{color:var(--accent,var(--gold-hi));}
#exp-shell-root .exp-char-tab.active::after{content:'';position:absolute;left:16px;right:16px;bottom:-1px;height:2px;background:linear-gradient(90deg,transparent,var(--accent,var(--gold)),transparent);}
#exp-shell-root .exp-char-tab.dead{color:var(--text-faint);}
#exp-shell-root .exp-char-tab.dead:hover{color:var(--text-faint);}
#exp-shell-root .exp-char-tab.dead.active{color:var(--text-dim);}
#exp-shell-root .exp-char-tab .tab-dead{font-size:10px;color:var(--sem-bad);margin-left:7px;letter-spacing:1px;}
#exp-shell-root .exp-char-body{flex:1;min-height:0;display:flex;gap:30px;align-items:stretch;max-width:1080px;width:100%;margin:0 auto;}
#exp-shell-root .exp-char-stage{flex:none;height:100%;}
#exp-shell-root .hero-card{height:100%;width:auto;aspect-ratio:832/1216;position:relative;}
#exp-shell-root .hero-inner{position:absolute;inset:0;}
#exp-shell-root .hero-face{position:absolute;inset:0;border-radius:14px;overflow:hidden;border:1px solid rgba(var(--gold-rgb),.35);box-shadow:0 8px 24px rgba(var(--sh-rgb),.55);transition:border-color .15s,box-shadow .15s;}
#exp-shell-root .hero-face img{width:100%;height:100%;object-fit:cover;object-position:center 5%;display:block;}
#exp-shell-root .exp-noart{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;width:100%;height:100%;min-height:120px;color:var(--text-faint);background:rgba(var(--fg-rgb),.04);}
#exp-shell-root .exp-noart svg{width:clamp(26px,26%,54px);height:auto;opacity:.5;}
#exp-shell-root .exp-noart span{font-size:12px;letter-spacing:3px;text-indent:3px;}
#exp-shell-root .exp-gal-grid .exp-noart{grid-column:1/-1;padding:26px 0;border:1px dashed rgba(var(--gold-rgb),.25);border-radius:9px;background:rgba(var(--fg-rgb),.03);}
#exp-shell-root .exp-char-stage.dead .hero-inner{filter:grayscale(1) brightness(.6);}
#exp-shell-root .exp-panel[data-panel="gallery"]{padding:12px 32px 24px;overflow:hidden;}
#exp-shell-root .exp-panel.active[data-panel="gallery"]{display:flex;flex-direction:column;}
#exp-shell-root .exp-gal-body{flex:1;min-height:0;overflow-y:auto;padding-right:4px;}
#exp-shell-root .exp-gal-sec{margin-top:8px;}
#exp-shell-root .exp-gal-sec + .exp-gal-sec{margin-top:22px;}
#exp-shell-root .exp-gal-sec-head{display:flex;align-items:center;justify-content:space-between;padding:8px 0 10px;}
#exp-shell-root .exp-gal-sec-head>span{font-size:12.5px;font-weight:600;letter-spacing:2px;color:var(--gold);}
#exp-shell-root .exp-gal-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 32px;}
#exp-shell-root .exp-gal-theme{min-width:0;}
#exp-shell-root .exp-gal-lab{display:block;font-size:12px;letter-spacing:2px;color:var(--text-dim);margin:0 0 7px 2px;}
#exp-shell-root .exp-gal-imgs{display:flex;gap:10px;min-width:0;}
#exp-shell-root .exp-gal-thumb{position:relative;flex:1;max-width:200px;aspect-ratio:832/1216;padding:0;border:1.5px solid rgba(var(--gold-rgb),.16);border-radius:9px;overflow:hidden;background:rgba(var(--fg-rgb),.05);cursor:pointer;transition:border-color .15s,transform .15s;}
#exp-shell-root .exp-gal-thumb:hover{border-color:rgba(var(--gold-rgb),.6);transform:translateY(-2px);}
#exp-shell-root .exp-gal-thumb img{width:100%;height:100%;object-fit:cover;object-position:center 8%;display:block;}
#exp-shell-root .exp-gal-thumb.pinned{border-color:var(--gold-hi);box-shadow:0 0 0 1.5px var(--gold-mid),0 6px 18px rgba(var(--gold-rgb),.35);}
#exp-shell-root .exp-gal-pin{position:absolute;right:6px;top:6px;width:23px;height:23px;border-radius:50%;border:1px solid rgba(var(--gold-rgb),.55);background:rgba(var(--pop-rgb),.78);color:var(--gold-hi);display:none;place-items:center;cursor:pointer;transition:background .15s,color .15s;}
#exp-shell-root .exp-gal-pin svg{width:12px;height:12px;}
#exp-shell-root .exp-gal-thumb:hover .exp-gal-pin{display:grid;}
#exp-shell-root .exp-gal-pin:hover{background:rgba(var(--pop-rgb),.98);}
#exp-shell-root .exp-gal-thumb.pinned .exp-gal-pin{display:grid;background:var(--gold);color:var(--on-gold,#12131a);border-color:var(--gold);}
@media(hover:none){#exp-shell-root .exp-gal-pin{display:grid;}}
#exp-shell-root .exp-gal-lock{display:none;position:absolute;inset:0;align-items:center;justify-content:center;pointer-events:none;background:radial-gradient(circle at center,rgba(8,9,12,.42),rgba(8,9,12,0) 72%);color:rgba(240,228,196,.95);}
#exp-shell-root .exp-gal-lock svg{width:24px;height:24px;filter:drop-shadow(0 1px 5px rgba(0,0,0,.55));}
#exp-shell-root[data-sfw] .exp-gal-thumb[data-pos="back"]{pointer-events:none;}
#exp-shell-root[data-sfw] .exp-gal-thumb[data-pos="back"] img{filter:blur(13px) brightness(.7) saturate(.85);transform:scale(1.1);}
#exp-shell-root[data-sfw] .exp-gal-thumb[data-pos="back"] .exp-gal-pin{display:none;}
#exp-shell-root[data-sfw] .exp-gal-thumb[data-pos="back"] .exp-gal-lock{display:flex;}
#exp-shell-root .exp-lightbox{position:absolute;inset:0;z-index:9003;display:flex;align-items:center;justify-content:center;}
#exp-shell-root .exp-lb-backdrop{position:absolute;inset:0;background:var(--scrim);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
#exp-shell-root .exp-lb-stage{position:relative;z-index:1;height:92%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;}
#exp-shell-root .exp-lb-figure{position:relative;flex:none;height:min(calc(100% - 52px),calc(100vw * 1216 / 832));aspect-ratio:832/1216;width:auto;max-width:100%;}
#exp-shell-root .exp-lb-img{width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;border:1px solid var(--border-pop);box-shadow:0 18px 60px rgba(var(--sh-rgb),.7);background:rgba(var(--fg-rgb),.06);}
#exp-shell-root .exp-lb-bar{flex:none;display:flex;align-items:center;gap:18px;}
#exp-shell-root .exp-lb-cap{font-size:13px;letter-spacing:2px;color:var(--on-scrim);}
#exp-shell-root .exp-lb-count{margin-left:10px;font-size:11.5px;letter-spacing:1px;color:var(--on-scrim-dim);}
#exp-shell-root .exp-lb-pin{display:inline-flex;align-items:center;gap:7px;font-size:12px;letter-spacing:1px;color:var(--gold-hi);background:rgba(var(--pop-rgb),.92);border:1px solid rgba(var(--gold-rgb),.45);border-radius:7px;padding:6px 14px;cursor:pointer;transition:.15s;}
#exp-shell-root .exp-lb-pin svg{width:13px;height:13px;}
#exp-shell-root .exp-lb-pin:hover{border-color:var(--gold-hi);transform:translateY(-2px);}
#exp-shell-root .exp-lb-pin.on{background:var(--accent,var(--gold));color:var(--on-accent,#12131a);border-color:var(--accent,var(--gold));}
#exp-shell-root .exp-lb-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:46px;height:46px;border:none;background:none;padding:0;color:var(--on-scrim);opacity:.85;display:grid;place-items:center;cursor:pointer;filter:drop-shadow(0 1px 4px rgba(0,0,0,.75));transition:opacity .15s,color .15s;}
#exp-shell-root .exp-lb-nav:hover{opacity:1;color:var(--gold-hi);}
#exp-shell-root .exp-lb-nav svg{width:30px;height:30px;}
#exp-shell-root .exp-lb-nav.prev{left:6px;}
#exp-shell-root .exp-lb-nav.prev svg{transform:rotate(180deg);}
#exp-shell-root .exp-lb-nav.next{right:6px;}
#exp-shell-root .exp-lb-close{position:absolute;top:8px;right:8px;z-index:2;width:38px;height:38px;border:none;background:none;padding:0;color:var(--on-scrim);opacity:.85;display:grid;place-items:center;cursor:pointer;filter:drop-shadow(0 1px 4px rgba(0,0,0,.75));transition:opacity .15s,color .15s;}
#exp-shell-root .exp-lb-close:hover{opacity:1;color:var(--gold-hi);}
#exp-shell-root .exp-lb-close svg{width:26px;height:26px;}
@media(max-width:920px){#exp-shell-root .exp-panel[data-panel="gallery"]{padding:10px 12px 18px;}#exp-shell-root .exp-gal-grid{grid-template-columns:1fr;gap:14px;}#exp-shell-root .exp-gal-thumb{max-width:none;}}
#exp-shell-root .exp-char-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px;}
#exp-shell-root .exp-char-cell{background:var(--panel);border:1px solid rgba(var(--gold-rgb),.28);border-radius:12px;padding:16px 19px;box-shadow:var(--panel-sh,none);}
#exp-shell-root .exp-char-cell.voice{min-height:176px;}
#exp-shell-root .exp-char-cell.memo{min-height:150px;flex:1;display:flex;flex-direction:column;}
#exp-shell-root .cell-memos{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;align-content:start;gap:11px 26px;padding-right:6px;}
#exp-shell-root .cell-memos.empty{color:var(--text-faint);font-size:13px;overflow:visible;grid-template-columns:1fr;}
#exp-shell-root .memo-head{font-size:12.5px;color:var(--gold-soft);letter-spacing:1px;margin-bottom:3px;}
#exp-shell-root .memo-head::before{content:'◆ ';font-size:9px;}
#exp-shell-root .memo-text{font-size:13.5px;line-height:1.75;color:var(--text-dim);}
#exp-shell-root .cell-head{display:flex;align-items:center;gap:9px;margin-bottom:13px;}
#exp-shell-root .cell-ico{display:inline-flex;width:18px;height:18px;color:var(--gold);flex:none;}
#exp-shell-root .cell-ico svg{width:100%;height:100%;}
#exp-shell-root .cell-name{font-size:13.5px;font-weight:600;letter-spacing:3px;color:var(--gold-soft);}
#exp-shell-root .cell-tier{font-size:13px;letter-spacing:1px;flex:1;text-align:right;margin-right:9px;}
#exp-shell-root .exp-char-cell.aff .cell-tier{color:var(--aff);}
#exp-shell-root .cell-num{font-size:24px;font-weight:700;color:var(--num,var(--gold-hi));line-height:1;min-width:34px;text-align:right;}
#exp-shell-root .cell-bar{position:relative;height:8px;border-radius:4px;background:rgba(var(--fg-rgb),.09);overflow:hidden;}
#exp-shell-root .cell-bar .fill{height:100%;border-radius:4px;transition:width .6s;}
#exp-shell-root .exp-char-cell.aff .fill{background:linear-gradient(90deg,var(--aff-a,#e0a98f),var(--aff,#c0554a));}
#exp-shell-root .stat-track{display:flex;margin-top:9px;}
#exp-shell-root .stat-node{flex:1;min-width:0;font-size:11px;letter-spacing:2px;color:var(--text-faint);transition:color .4s;}
#exp-shell-root .stat-node.reached{color:var(--gold-soft);}
#exp-shell-root .stat-node.cur{color:var(--gold-hi);font-weight:600;}
#exp-shell-root .exp-char-cell.aff .stat-node.cur{color:var(--aff);}
#exp-shell-root .cell-voice{font-size:13.5px;line-height:1.9;color:var(--text);letter-spacing:.5px;}
#exp-shell-root .cell-voice.empty{color:var(--text-faint);border-left:2px solid rgba(var(--gold-rgb),.25);padding-left:12px;}

/* 船员页 */
#exp-shell-root .exp-crew{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:14px;}
#exp-shell-root .meter{padding:16px 19px;background:var(--panel);border:1px solid rgba(var(--gold-rgb),.28);border-radius:12px;box-shadow:var(--panel-sh,none);}
#exp-shell-root .meter-line{display:flex;align-items:center;gap:9px;margin-bottom:7px;}
#exp-shell-root .meter-ico{display:inline-flex;align-items:center;color:var(--gold);}
#exp-shell-root .meter-ico svg{width:20px;height:20px;}
#exp-shell-root .meter-name{font-size:15px;font-weight:600;color:var(--text-strong);letter-spacing:2px;}
#exp-shell-root .meter-band{font-size:13px;color:var(--text-dim);flex:1;}
#exp-shell-root .meter-num{font-size:21px;font-weight:700;color:var(--num,var(--gold-hi));min-width:30px;text-align:right;}
#exp-shell-root .meter-bar{position:relative;height:9px;border-radius:5px;background:rgba(var(--fg-rgb),.16);overflow:hidden;border:1px solid rgba(var(--fg-rgb),.10);}
#exp-shell-root .meter-fill{height:100%;border-radius:5px;transition:width .6s;}
#exp-shell-root .meter-tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(var(--fg-rgb),.22);}
#exp-shell-root .meter.warn .meter-band,#exp-shell-root .meter.warn .stat-node.cur{color:var(--sem-warn);}
#exp-shell-root .meter.grave .meter-band,#exp-shell-root .meter.grave .stat-node.cur{color:var(--sem-bad);}
#exp-shell-root .exp-crew-meters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
#exp-shell-root .meter-delta{display:inline-flex;align-items:center;gap:2px;font-size:11.5px;font-weight:600;margin-right:9px;flex:none;}
#exp-shell-root .meter-delta svg{width:9px;height:9px;}
#exp-shell-root .meter-delta.up{color:var(--sem-good);}
#exp-shell-root .meter-delta.down{color:var(--sem-bad);}
#exp-shell-root .meter.frozen{border-color:rgba(127,176,212,.4);}
#exp-shell-root .meter.frozen .meter-fill{filter:saturate(.25) brightness(.85);}
#exp-shell-root .meter.frozen .meter-band{color:var(--sem-frost);display:inline-flex;align-items:center;gap:5px;}
#exp-shell-root .meter.frozen .meter-band svg{width:12px;height:12px;flex:none;}
#exp-shell-root .meter.frozen .meter-num{color:var(--text-faint);}
#exp-shell-root .exp-crew-empty{color:var(--text-faint);letter-spacing:2px;font-size:13px;padding:16px 0;text-align:center;}
#exp-shell-root .exp-roster-stat{margin-bottom:14px;}
#exp-shell-root .exp-roster-bar{display:flex;height:10px;border-radius:5px;overflow:hidden;background:rgba(var(--fg-rgb),.08);}
#exp-shell-root .exp-roster-bar .seg.ok,#exp-shell-root .exp-roster-legend .ok i{background:var(--meter-good-a);}
#exp-shell-root .exp-roster-bar .seg.ill,#exp-shell-root .exp-roster-legend .ill i{background:var(--meter-warn-a);}
#exp-shell-root .exp-roster-bar .seg.mad,#exp-shell-root .exp-roster-legend .mad i{background:var(--cor);}
#exp-shell-root .exp-roster-bar .seg.gone,#exp-shell-root .exp-roster-legend .gone i{background:var(--text-faint);opacity:.55;}
#exp-shell-root .exp-roster-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:12.5px;color:var(--text-dim);letter-spacing:1px;}
#exp-shell-root .exp-roster-legend .tot{color:var(--text-strong);}
#exp-shell-root .exp-roster-legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;vertical-align:middle;}
#exp-shell-root .exp-roster-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:12px;}
#exp-shell-root .exp-roster-card{border:1px solid rgba(var(--gold-rgb),.28);border-radius:10px;background:rgba(var(--fg-rgb),.02);padding:11px 14px;transition:border-color .15s,transform .15s;}
#exp-shell-root .exp-roster-card.alive{cursor:pointer;}
#exp-shell-root .exp-roster-card.alive:hover{border-color:var(--border-hover);transform:translateY(-1px);}
#exp-shell-root .exp-roster-card.dead{filter:grayscale(1);opacity:.65;}
#exp-shell-root .exp-roster-top{display:flex;align-items:baseline;gap:8px;}
#exp-shell-root .exp-roster-name{font-size:14.5px;font-weight:600;color:var(--text-strong);letter-spacing:1px;flex:1;min-width:0;}
#exp-shell-root .exp-roster-badge{font-size:10.5px;letter-spacing:2px;border:1px solid rgba(var(--gold-rgb),.4);color:var(--gold-soft);border-radius:5px;padding:1px 7px;flex:none;}
#exp-shell-root .exp-roster-badge.ill{border-color:rgba(208,138,69,.55);color:var(--sem-warn);}
#exp-shell-root .exp-roster-badge.mad{border-color:rgba(195,154,216,.55);color:var(--cor);}
#exp-shell-root .exp-roster-badge.gone{border-color:rgba(var(--fg-rgb),.2);color:var(--text-faint);}
#exp-shell-root .exp-roster-role{font-size:13px;color:var(--text-dim);margin-top:4px;letter-spacing:.5px;}
#exp-shell-root .exp-roster-note{font-size:12.5px;color:var(--text-faint);margin-top:5px;letter-spacing:.5px;}
#exp-shell-root .exp-roster-sect{display:flex;align-items:center;gap:14px;margin:16px 0 10px;}
#exp-shell-root .exp-roster-sect::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(var(--gold-rgb),.3),transparent);}
#exp-shell-root .exp-roster-sect span{font-size:11.5px;letter-spacing:3px;color:var(--text-faint);}

/* 狩猎页 */
#exp-shell-root .exp-hunt{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:14px;}
#exp-shell-root .exp-hunt-lock{max-width:520px;margin:14vh auto 0;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;}
#exp-shell-root .exp-hunt-lock-ico{width:46px;height:46px;color:var(--text-faint);opacity:.5;}
#exp-shell-root .exp-hunt-lock-ico svg{width:100%;height:100%;}
#exp-shell-root .exp-hunt-lock-t{font-size:16px;letter-spacing:4px;color:var(--text-dim);}
#exp-shell-root .exp-hunt-lock-d{font-size:13px;line-height:2;letter-spacing:1px;color:var(--text-faint);}
#exp-shell-root .exp-prey-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
#exp-shell-root .exp-prey-card{display:flex;flex-direction:column;gap:6px;text-align:left;padding:12px 14px;border:1px solid rgba(var(--gold-rgb),.28);border-radius:10px;background:rgba(var(--fg-rgb),.02);cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s;}
#exp-shell-root .exp-prey-card:hover{border-color:var(--border-hover);transform:translateY(-2px);}
#exp-shell-root .exp-prey-card.sel{border-color:var(--accent,var(--gold));box-shadow:0 0 0 1px var(--accent,var(--gold));}
#exp-shell-root .exp-prey-card.locked{opacity:.45;cursor:default;}
#exp-shell-root .exp-prey-card.locked:hover{border-color:rgba(var(--gold-rgb),.22);}
#exp-shell-root .exp-prey-name{font-size:14.5px;font-weight:600;letter-spacing:2px;color:var(--text-strong);}
#exp-shell-root .exp-prey-desc{font-size:13px;line-height:1.7;color:var(--text-dim);}
#exp-shell-root .exp-prey-req{font-size:12px;letter-spacing:1px;color:var(--gold-soft);}
#exp-shell-root .exp-mate-row{display:flex;gap:10px;}
#exp-shell-root .exp-mate-btn{padding:8px 22px;border:1px solid rgba(var(--gold-rgb),.25);border-radius:9px;background:transparent;color:var(--text-dim);font-family:inherit;font-size:13.5px;letter-spacing:3px;cursor:pointer;transition:.15s;}
#exp-shell-root .exp-mate-btn:hover{border-color:var(--border-hover);color:var(--text);transform:translateY(-2px);}
#exp-shell-root .exp-mate-btn.sel{border-color:var(--accent,var(--gold));color:var(--accent,var(--gold-hi));box-shadow:0 0 0 1px var(--accent,var(--gold));}
#exp-shell-root .exp-mate-btn.disabled{opacity:.4;cursor:default;}
#exp-shell-root .exp-hunt-sheet{background:var(--panel);border:1px solid rgba(var(--gold-rgb),.28);border-radius:12px;padding:17px 21px 19px;box-shadow:var(--panel-sh,none);}
#exp-shell-root .exp-hunt-sheet .meter{padding:0;background:none;border:none;box-shadow:none;}
#exp-shell-root .sheet-sect{display:flex;align-items:center;gap:11px;margin:20px 0 12px;}
#exp-shell-root .sheet-sect::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(var(--gold-rgb),.3),transparent);}
#exp-shell-root .exp-hunt-sheet .meter-ico{display:none;}
#exp-shell-root .sheet-lab{flex:none;font-size:13px;font-weight:600;letter-spacing:3px;color:var(--gold-soft);}
#exp-shell-root .sheet-rule{height:1px;background:linear-gradient(90deg,rgba(var(--gold-rgb),.35),transparent);margin:20px 0 15px;}
#exp-shell-root .exp-brief-foot{display:flex;align-items:center;justify-content:center;}
#exp-shell-root .exp-hunt-go{flex:none;padding:10px 34px;border:none;border-radius:9px;background:linear-gradient(180deg,var(--accent),color-mix(in srgb,var(--accent) 78%,black));color:var(--on-accent);font-family:inherit;font-size:14px;letter-spacing:4px;text-indent:4px;cursor:pointer;box-shadow:0 3px 12px rgba(var(--accent-rgb,var(--gold-rgb)),.28);transition:transform .15s;}
#exp-shell-root .exp-hunt-go:hover{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 88%,white),var(--accent));transform:translateY(-2px);}

/* 地图页 */
#exp-shell-root .exp-panel[data-panel="map"]{padding:22px 28px 26px;overflow:hidden;}
#exp-shell-root .exp-panel.active[data-panel="map"]{display:flex;flex-direction:column;}
#exp-shell-root .exp-map-body{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;}
#exp-shell-root .exp-map{position:relative;max-width:100%;max-height:100%;min-width:0;min-height:0;border-radius:12px;overflow:hidden;border:1px solid rgba(var(--gold-rgb),.32);box-shadow:0 8px 30px rgba(var(--sh-rgb),.55);line-height:0;}
#exp-shell-root .exp-chart{display:block;max-width:100%;max-height:100%;width:auto;height:auto;background:radial-gradient(140% 160% at 52% 18%,#6b9496,#578082 50%,#46696c);cursor:grab;touch-action:none;}
#exp-shell-root .exp-chart:active{cursor:grabbing;}
#exp-shell-root .exp-grid{stroke:rgba(240,231,205,.22);stroke-width:1;vector-effect:non-scaling-stroke;}
#exp-shell-root .exp-coast{fill:rgba(204,185,136,.88);stroke:rgba(101,76,37,.8);stroke-width:1;stroke-linejoin:round;vector-effect:non-scaling-stroke;}
#exp-shell-root .exp-region-fill,#exp-shell-root .exp-region-fog,#exp-shell-root .exp-region-line{pointer-events:none;}
#exp-shell-root .exp-region-fill.cur{fill:rgba(var(--gold-rgb),.17);}
#exp-shell-root .exp-region-fog{fill:rgba(var(--sh-rgb),.34);}
#exp-shell-root .exp-region-line{fill:none;vector-effect:non-scaling-stroke;stroke-linejoin:round;}
#exp-shell-root .exp-region-line.cur{stroke:rgba(var(--gold-rgb),.62);stroke-width:1.6;}
#exp-shell-root .exp-region-line.fog{stroke:rgba(var(--fg-rgb),.10);stroke-width:1;}
#exp-shell-root .exp-region-lab{font-family:Georgia,serif;font-size:17px;letter-spacing:2px;paint-order:stroke;stroke-width:3.4;stroke-linejoin:round;pointer-events:none;text-anchor:middle;dominant-baseline:middle;}
#exp-shell-root .exp-region-lab.cur{fill:var(--gold-hi);stroke:rgba(var(--pop-rgb),.85);font-weight:600;}
#exp-shell-root .exp-region-lab.fog{fill:var(--text-faint);stroke:rgba(var(--sh-rgb),.5);opacity:.5;letter-spacing:3px;}
#exp-shell-root .exp-poi{cursor:pointer;color:#5a3d1c;transition:opacity .15s;}
#exp-shell-root .exp-poi:not(.seen){opacity:.6;}
#exp-shell-root .exp-poi:hover{opacity:1;}
#exp-shell-root .exp-poi-ico{fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
#exp-shell-root .exp-poi-lab{fill:#3a2b12;font-size:15px;font-family:Georgia,serif;paint-order:stroke;stroke:rgba(243,235,212,.92);stroke-width:3.6;stroke-linejoin:round;}
#exp-shell-root .exp-poi:not(.seen) .exp-poi-lab{display:none;}
#exp-shell-root .exp-poi:not(.seen):hover .exp-poi-lab{display:block;}
@media(hover:none){#exp-shell-root .exp-poi:not(.seen) .exp-poi-lab{display:block;}}
#exp-shell-root .exp-poi-ring{fill:none;stroke:#a5382b;stroke-width:1.8;opacity:.85;}
#exp-shell-root .exp-poi.cur .exp-poi-ico{stroke-width:2.2;}
#exp-shell-root .exp-mapctl{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:6px;z-index:2;}
#exp-shell-root .exp-mapctl button{width:33px;height:33px;padding:6px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-pop);border-radius:7px;background:rgba(var(--pop-rgb),.85);color:var(--gold-soft);cursor:pointer;transition:transform .15s;}
#exp-shell-root .exp-mapctl button:hover{background:rgba(var(--gold-rgb),.2);color:var(--gold-hi);transform:translateY(-2px);}
#exp-shell-root .exp-mapctl svg{width:100%;height:100%;}
#exp-shell-root .exp-poipop{position:absolute;z-index:3;max-width:236px;min-width:120px;padding:11px 34px 12px 14px;border:1px solid var(--border-pop);border-radius:9px;background:rgba(var(--pop-rgb),.95);box-shadow:0 10px 28px rgba(var(--sh-rgb),.6);transform:translate(-50%,calc(-100% - 13px));}
#exp-shell-root .exp-poipop.below{transform:translate(-50%,13px);}
#exp-shell-root .exp-poipop::after{content:'';position:absolute;left:var(--arrow-x,50%);bottom:-7px;transform:translateX(-50%) rotate(45deg);width:12px;height:12px;background:rgba(var(--pop-rgb),.95);border-right:1px solid var(--border-pop);border-bottom:1px solid var(--border-pop);}
#exp-shell-root .exp-poipop.below::after{bottom:auto;top:-7px;left:var(--arrow-x,50%);border:none;border-left:1px solid var(--border-pop);border-top:1px solid var(--border-pop);}
#exp-shell-root .exp-poipop.room{max-width:320px;}
#exp-shell-root .exp-poipop.room .exp-md-h{margin-bottom:12px;}
#exp-shell-root .exp-poipop-x{position:absolute;top:7px;right:7px;width:20px;height:20px;padding:3px;border:none;background:none;color:var(--text-faint);cursor:pointer;transition:transform .15s;}
#exp-shell-root .exp-poipop-x:hover{color:var(--gold-hi);transform:translateY(-2px);}
#exp-shell-root .exp-poipop-x svg{width:100%;height:100%;}
#exp-shell-root .exp-poipop-go{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-top:11px;padding:7px 10px;border:1px solid rgba(var(--accent-rgb,var(--gold-rgb)),.45);border-radius:8px;background:transparent;color:var(--accent,var(--gold-hi));cursor:pointer;font-family:inherit;font-size:13px;letter-spacing:2px;transition:border-color .15s,background .15s,transform .15s;}
#exp-shell-root .exp-poipop-go:hover{border-color:var(--accent,var(--gold));background:rgba(var(--accent-rgb,var(--gold-rgb)),.08);transform:translateY(-2px);}
#exp-shell-root .exp-poipop-go:disabled{opacity:.4;cursor:default;}
#exp-shell-root .exp-poipop-go svg{width:15px;height:15px;flex:none;}
#exp-shell-root .exp-md-h{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;}
#exp-shell-root .exp-md-h b{color:var(--num,var(--gold-hi));font-size:15px;}
#exp-shell-root .exp-md-h span{color:var(--text-dim);font-size:12px;letter-spacing:1px;}
#exp-shell-root .exp-md-desc{margin-top:6px;color:var(--text);font-size:13px;line-height:1.55;}
#exp-shell-root .exp-md-empty{color:var(--text-faint);letter-spacing:1px;}
#exp-shell-root .exp-ship{display:block;max-width:100%;max-height:100%;width:auto;height:auto;}
#exp-shell-root .exp-spoi{cursor:pointer;color:var(--gold-soft);transition:color .15s;}
#exp-shell-root .exp-spoi:hover{color:var(--gold-hi);}
#exp-shell-root .exp-spoi-ico{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;transform:scale(1.7);transform-box:fill-box;transform-origin:center;transition:transform .18s ease;}
@keyframes exp-spoi-glow{0%,100%{filter:drop-shadow(0 0 2.5px);}50%{filter:drop-shadow(0 0 8px);}}
#exp-shell-root .exp-spoi:hover .exp-spoi-ico,#exp-shell-root .exp-spoi.cur .exp-spoi-ico{transform:scale(2.05);animation:exp-spoi-glow 2.4s ease-in-out infinite;}
#exp-shell-root .exp-spoi-lab{fill:var(--text-dim);font-size:14.5px;font-family:Georgia,serif;letter-spacing:1px;text-anchor:middle;paint-order:stroke;stroke:rgba(var(--pop-rgb),.8);stroke-width:3.4;stroke-linejoin:round;pointer-events:none;transition:fill .15s;}
#exp-shell-root .exp-spoi:hover .exp-spoi-lab{fill:var(--text);}
#exp-shell-root .exp-spoi.cur{color:var(--accent,var(--gold-hi));}
#exp-shell-root .exp-spoi.cur .exp-spoi-lab{fill:var(--accent,var(--gold-hi));font-weight:600;}
#exp-shell-root .exp-ship-dir{fill:var(--text-faint);font-size:12px;letter-spacing:4px;font-family:Georgia,serif;opacity:.75;}
#exp-shell-root .exp-ship-lvl{stroke:rgba(var(--gold-rgb),.12);stroke-width:1;stroke-dasharray:2 7;}

/* 正文页 */
#exp-shell-root .exp-panel[data-panel="story"]{padding:0;overflow:hidden;}
#exp-shell-root .exp-story{display:flex;flex-direction:column;height:100%;}
#exp-shell-root .exp-story-log{flex:1;overflow-y:auto;padding:36px 32px 20px;}
#exp-shell-root .exp-story-turn{max-width:var(--read-col);margin:0 auto 24px;}
#exp-shell-root .exp-story-turn.user{text-align:right;}
#exp-shell-root .exp-story-turn.user .exp-story-text{display:inline-block;text-align:left;background:rgba(var(--accent-rgb,var(--gold-rgb)),.10);border:1px solid rgba(var(--accent-rgb,var(--gold-rgb)),.26);color:var(--text-strong);border-radius:11px;padding:9px 14px;white-space:pre-wrap;font-size:16px;line-height:1.85;transition:transform .12s,border-color .12s,background .12s;}
@media (hover:hover){
#exp-shell-root .exp-story-turn.user:hover .exp-story-text{border-color:var(--border-hover);background:rgba(var(--accent-rgb,var(--gold-rgb)),.16);transform:translateY(-2px);cursor:pointer;}
}
#exp-shell-root .exp-story-turn.assistant .exp-story-text{white-space:pre-wrap;line-height:2.05;font-size:17.5px;color:var(--text);letter-spacing:.3px;line-break:strict;text-wrap:pretty;}
#exp-shell-root .exp-story-text p{margin:0;}
#exp-shell-root .exp-story-text p+p{margin-top:.9em;}
#exp-shell-root .exp-story-text .exp-quote{color:var(--quote,var(--accent,var(--gold-hi)));}
@keyframes exp-para-in{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
#exp-shell-root .exp-para-in{animation:exp-para-in .32s ease-out both;}
#exp-shell-root .exp-story-status{font-size:12px;color:var(--text-faint);text-align:center;padding:3px 0;min-height:1.2em;letter-spacing:2px;}
#exp-shell-root .exp-story-input{flex:none;padding:10px 26px 18px;}
#exp-shell-root .exp-story-inputrow{display:flex;align-items:center;gap:16px;max-width:960px;margin:0 auto;}
#exp-shell-root .exp-story-input textarea{flex:1;min-width:0;max-width:760px;resize:none;border:1px solid rgba(var(--gold-rgb),.22)!important;border-radius:12px;padding:12px 15px;font-family:inherit;font-size:15px;line-height:1.6;min-height:50px;max-height:146px;overflow-y:auto;background:var(--panel)!important;color:var(--text)!important;transition:border-color .15s;}
#exp-shell-root .exp-story-input textarea:focus{outline:none;border-color:var(--border-hover)!important;}
#exp-shell-root .exp-story-input textarea::placeholder{color:var(--text-faint)!important;}
#exp-shell-root .exp-iconbtn{flex:none;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent;border:1px solid rgba(var(--gold-rgb),.3);color:var(--gold);transition:.15s;}
#exp-shell-root .exp-iconbtn:hover{border-color:var(--gold-hi);color:var(--gold-hi);background:rgba(var(--gold-rgb),.08);transform:translateY(-2px);}
#exp-shell-root .exp-iconbtn svg{width:20px;height:20px;}
#exp-shell-root .exp-iconbtn.send{background:linear-gradient(180deg,var(--accent),color-mix(in srgb,var(--accent) 78%,black));color:var(--on-accent);border:none;}
#exp-shell-root .exp-iconbtn.send:hover{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 88%,white),var(--accent));color:var(--on-accent);}
#exp-shell-root .exp-iconbtn:disabled{opacity:.4;cursor:default;}
#exp-shell-root .exp-story-options{max-width:min(640px,var(--read-col));margin:0 auto 24px;}
#exp-shell-root .exp-story-opthead{display:flex;align-items:center;gap:14px;margin-bottom:10px;font-size:11px;letter-spacing:3px;color:var(--text-faint);}
#exp-shell-root .exp-story-opthead::before,#exp-shell-root .exp-story-opthead::after{content:'';flex:1;height:1px;}
#exp-shell-root .exp-story-opthead::before{background:linear-gradient(90deg,transparent,rgba(var(--gold-rgb),.25));}
#exp-shell-root .exp-story-opthead::after{background:linear-gradient(90deg,rgba(var(--gold-rgb),.25),transparent);}
#exp-shell-root .exp-story-opt{display:flex;align-items:baseline;gap:12px;width:100%;padding:7px 10px;margin:0;border:none;background:none;color:var(--text-dim);cursor:pointer;font-family:inherit;text-align:left;font-size:14.5px;line-height:1.8;letter-spacing:.3px;border-radius:8px;transition:color .15s,background .15s,transform .15s;}
#exp-shell-root .exp-story-opt:hover{color:var(--text-strong);background:rgba(var(--fg-rgb),.035);transform:translateX(3px);}
#exp-shell-root .exp-story-opt-num{flex:none;color:var(--gold-soft);font-size:12px;letter-spacing:0;opacity:.8;}
#exp-shell-root .exp-story-opt:hover .exp-story-opt-num{opacity:1;color:var(--gold-hi);}
#exp-shell-root .exp-story-opt-text{flex:1;min-width:0;}
#exp-shell-root .exp-story-delbar{display:flex;align-items:center;gap:12px;max-width:calc(var(--read-col) + 116px);margin:0 auto;min-height:52px;}
#exp-shell-root .exp-story-delbar>span{flex:1;font-size:13px;color:var(--text-faint);letter-spacing:1px;}
#exp-shell-root .exp-del-btn,#exp-shell-root .exp-edit-btn{flex:none;padding:9px 26px;border-radius:10px;border:1px solid rgba(var(--gold-rgb),.3);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;font-size:14px;letter-spacing:2px;transition:.15s;}
#exp-shell-root .exp-del-btn:hover,#exp-shell-root .exp-edit-btn:hover{border-color:var(--gold-hi);background:rgba(var(--gold-rgb),.08);transform:translateY(-2px);}
#exp-shell-root .exp-del-btn.danger{border-color:rgba(192,85,74,.5);color:var(--sem-bad);}
#exp-shell-root .exp-del-btn.danger:hover{background:rgba(192,85,74,.1);border-color:var(--sem-bad);}
#exp-shell-root .exp-del-btn:disabled{opacity:.4;cursor:default;background:transparent;border-color:rgba(192,85,74,.5);}
#exp-shell-root .exp-story-turn.user.editing{text-align:left;}
#exp-shell-root .exp-story-edit{width:100%;}
#exp-shell-root .exp-story-edit textarea{width:100%;resize:none;border:1px solid rgba(var(--accent-rgb,var(--gold-rgb)),.4)!important;border-radius:11px;padding:10px 14px;font-family:inherit;font-size:15px;line-height:1.85;min-height:54px;max-height:40vh;overflow-y:auto;background:var(--panel)!important;color:var(--text)!important;transition:border-color .15s;}
#exp-shell-root .exp-story-edit textarea:focus{outline:none;border-color:var(--border-hover)!important;}
#exp-shell-root .exp-story-edit-row{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;}
#exp-shell-root .exp-edit-btn.primary{border-color:rgba(var(--gold-rgb),.55);color:var(--gold-hi);}
#exp-shell-root .exp-story-turn.user{touch-action:manipulation;}
#exp-shell-root .exp-story-turn.selable{cursor:pointer;border-radius:10px;outline:1px dashed transparent;outline-offset:6px;transition:outline-color .15s,background .15s;}
#exp-shell-root .exp-story-turn.selable:hover{outline-color:rgba(var(--accent-rgb,var(--gold-rgb)),.4);}
#exp-shell-root .exp-story-turn.delsel,#exp-shell-root .exp-story-turn.delsel:hover{outline-color:rgba(192,85,74,.7);background:rgba(192,85,74,.07);}
#exp-shell-root .exp-story-thought{max-width:760px;margin:0 auto 14px;}
#exp-shell-root .exp-story-thought-head{display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none;transition:transform .15s;}
#exp-shell-root .exp-story-thought-head:hover{transform:translateY(-2px);}
#exp-shell-root .exp-story-thought-rule{flex:1;height:1px;}
#exp-shell-root .exp-story-thought-rule.l{background:linear-gradient(90deg,transparent,rgba(var(--gold-rgb),.4));}
#exp-shell-root .exp-story-thought-rule.r{background:linear-gradient(90deg,rgba(var(--gold-rgb),.4),transparent);}
#exp-shell-root .exp-story-thought-ico{display:inline-flex;width:18px;height:18px;flex:none;color:var(--gold);transition:transform .25s;}
#exp-shell-root .exp-story-thought-ico svg{width:100%;height:100%;}
#exp-shell-root .exp-story-thought.open .exp-story-thought-ico{transform:rotate(45deg);}
#exp-shell-root .exp-story-thought-body{display:none;margin:12px 0 4px;white-space:pre-wrap;font-size:13px;line-height:1.85;letter-spacing:.3px;color:var(--text-faint);}
#exp-shell-root .exp-story-thought.open .exp-story-thought-body{display:block;}
#exp-shell-root .exp-story-turn.thinking{max-width:760px;margin:0 auto 24px;}
#exp-shell-root .exp-story-thinking{display:flex;align-items:center;gap:14px;}
#exp-shell-root .exp-story-thinking-rule{flex:1;height:1px;position:relative;overflow:hidden;}
#exp-shell-root .exp-story-thinking-rule.l{background:linear-gradient(90deg,transparent,rgba(var(--gold-rgb),.4));}
#exp-shell-root .exp-story-thinking-rule.r{background:linear-gradient(90deg,rgba(var(--gold-rgb),.4),transparent);}
#exp-shell-root .exp-story-thinking-rule::after{content:'';position:absolute;top:0;bottom:0;width:70px;background:linear-gradient(90deg,transparent,rgba(var(--gold-rgb),.9),transparent);}
#exp-shell-root .exp-story-thinking-rule.l::after{animation:exp-think-out-l 1.9s ease-in infinite;}
#exp-shell-root .exp-story-thinking-rule.r::after{animation:exp-think-out-r 1.9s ease-in infinite;}
#exp-shell-root .exp-story-thinking-ico{display:inline-flex;width:22px;height:22px;flex:none;color:var(--gold);animation:exp-think-spin 12s linear infinite;}
#exp-shell-root .exp-story-thinking-ico svg{width:100%;height:100%;}
@keyframes exp-think-out-l{0%{right:-70px;}100%{right:100%;}}
@keyframes exp-think-out-r{0%{left:-70px;}100%{left:100%;}}
@keyframes exp-think-spin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion:reduce){#exp-shell-root .exp-story-thinking-rule::after{display:none;}#exp-shell-root .exp-story-thinking-ico{animation:none;}}

/* 楼尾静默行 */
#exp-shell-root .exp-ff-wrap{margin-top:14px;}
#exp-shell-root .exp-story-turn.selable .exp-ff-wrap{pointer-events:none;}
#exp-shell-root .exp-ff{display:flex;flex-wrap:wrap;align-items:center;gap:9px 15px;font-size:12.5px;letter-spacing:1px;color:var(--text-faint);}
#exp-shell-root .exp-ff-voices{display:inline-flex;flex-wrap:wrap;align-items:center;gap:9px 12px;}
#exp-shell-root .exp-ff-item{flex:none;display:inline-flex;align-items:center;gap:4px;border:none;background:none;padding:0;margin:0;font-family:inherit;font-size:inherit;letter-spacing:inherit;color:var(--text-faint);cursor:pointer;transition:color .15s;}
#exp-shell-root .exp-ff-item:hover,#exp-shell-root .exp-ff-item.open{color:var(--text-dim);}
#exp-shell-root .exp-ff-item .up,#exp-shell-root .exp-ff-item .down{display:inline-flex;align-items:center;gap:2px;font-size:11px;opacity:.8;transition:opacity .15s;}
#exp-shell-root .exp-ff-item .up{color:var(--sem-good);}
#exp-shell-root .exp-ff-item .down{color:var(--sem-bad);}
#exp-shell-root .exp-ff-item svg{width:9px;height:9px;}
#exp-shell-root .exp-ff-item:hover .up,#exp-shell-root .exp-ff-item:hover .down,#exp-shell-root .exp-ff-item.open .up,#exp-shell-root .exp-ff-item.open .down{opacity:1;}
#exp-shell-root .exp-ff-gap{flex:1;min-width:12px;}
#exp-shell-root .exp-ff-label{flex:none;color:rgba(var(--accent-rgb,var(--gold-rgb)),.75);}
#exp-shell-root .exp-ff-voice{flex:none;display:inline-flex;align-items:center;gap:6px;border:none;background:none;padding:0;margin:0;font-family:inherit;font-size:12.5px;letter-spacing:1px;color:var(--accent,var(--gold-soft));cursor:pointer;opacity:.85;transition:opacity .15s;}
#exp-shell-root .exp-ff-voice img{width:26px;height:26px;border-radius:50%;object-fit:cover;object-position:50% 12%;border:1px solid rgba(var(--accent-rgb,var(--gold-rgb)),.45);transition:border-color .15s;display:block;}
#exp-shell-root .exp-ff-voice:hover,#exp-shell-root .exp-ff-voice.open{opacity:1;}
#exp-shell-root .exp-ff-voice:hover img,#exp-shell-root .exp-ff-voice.open img{border-color:var(--accent,var(--gold-hi));}
#exp-shell-root .exp-ff-caret{display:inline-flex;width:11px;height:11px;flex:none;opacity:.65;transform:rotate(90deg);transition:transform .2s;}
#exp-shell-root .exp-ff-voice.open .exp-ff-caret{transform:rotate(270deg);}
#exp-shell-root .exp-ff-caret svg{width:100%;height:100%;display:block;}
#exp-shell-root .exp-ff-detail{margin-top:8px;animation:exp-ff-in .18s ease;}
#exp-shell-root .exp-ff-line{font-size:12.5px;letter-spacing:1px;color:var(--text-faint);border-left:2px solid rgba(var(--gold-rgb),.3);padding-left:10px;line-height:1.8;}
#exp-shell-root .exp-ff-line .new{color:var(--text-dim);}
#exp-shell-root .exp-ff-line .stage{color:var(--gold-soft);}
@keyframes exp-ff-in{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}

/* 心声卡 */
#exp-shell-root .exp-vc-wrap{margin-top:12px;animation:exp-ff-in .2s ease;}
#exp-shell-root .exp-vc{display:flex;gap:16px;padding:16px;border:1px solid rgba(var(--gold-rgb),.22);border-radius:13px;background:var(--panel);box-shadow:var(--panel-sh,none);}
#exp-shell-root .exp-vc-img{flex:none;width:168px;aspect-ratio:832/1216;border-radius:9px;overflow:hidden;border:1px solid rgba(var(--gold-rgb),.3);padding:0;background:none;cursor:pointer;transition:border-color .15s,transform .15s;}
#exp-shell-root .exp-vc-img:hover{border-color:var(--accent,var(--gold-hi));transform:translateY(-2px);}
#exp-shell-root .exp-vc-img img{width:100%;height:100%;object-fit:cover;display:block;}
#exp-shell-root .exp-vc-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;}
#exp-shell-root .exp-vc-head{display:flex;align-items:baseline;gap:10px;font-size:13.5px;font-weight:600;letter-spacing:3px;color:var(--gold-soft);padding-bottom:8px;border-bottom:1px solid rgba(var(--gold-rgb),.18);}
#exp-shell-root .exp-vc-tabs{display:inline-flex;align-items:baseline;gap:7px;font-weight:400;letter-spacing:2px;}
#exp-shell-root .exp-vc-tab{border:none;background:none;padding:0;margin:0;cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:2px;color:var(--text-faint);transition:color .15s;}
#exp-shell-root .exp-vc-tab:hover{color:var(--text-dim);}
#exp-shell-root .exp-vc-tab.on{color:var(--accent,var(--gold-hi));font-weight:600;}
#exp-shell-root .exp-vc-sep{font-size:11px;color:rgba(var(--gold-rgb),.35);}
#exp-shell-root .exp-vc-text{font-size:14.5px;line-height:2.05;color:var(--text);letter-spacing:.3px;}
#exp-shell-root .exp-vc-memos{max-height:206px;overflow-y:auto;display:flex;flex-direction:column;gap:13px;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(var(--gold-rgb),.3) transparent;}
#exp-shell-root .exp-vc-memos::-webkit-scrollbar{width:4px;}
#exp-shell-root .exp-vc-memos::-webkit-scrollbar-thumb{background:rgba(var(--gold-rgb),.3);border-radius:2px;}
#exp-shell-root .exp-vc-memo{font-size:13.5px;line-height:1.95;color:var(--text);letter-spacing:.3px;}
#exp-shell-root .exp-vc-memo b{font-weight:600;letter-spacing:1px;color:var(--gold-soft);}
#exp-shell-root .exp-vc-empty{font-size:13.5px;line-height:1.9;color:var(--text-faint);letter-spacing:.5px;border-left:2px solid rgba(var(--gold-rgb),.25);padding-left:12px;}
@media (prefers-reduced-motion:reduce){#exp-shell-root .exp-ff-detail,#exp-shell-root .exp-vc-wrap{animation:none;}}
#exp-shell-root[data-motion="off"] .exp-ff-detail,#exp-shell-root[data-motion="off"] .exp-vc-wrap{animation:none;}

/* 正文插图 */
#exp-shell-root .exp-illust{margin:1em 0;text-align:center;}
#exp-shell-root .exp-illust img{max-width:100%;max-height:60vh;border-radius:10px;border:1px solid rgba(var(--gold-rgb),.18);cursor:pointer;box-shadow:0 4px 20px rgba(var(--sh-rgb),.25);transition:border-color .15s;}
#exp-shell-root .exp-illust img:hover{border-color:rgba(var(--gold-rgb),.55);}
#exp-shell-root .exp-illust video{max-width:100%;max-height:60vh;border-radius:10px;border:1px solid rgba(var(--gold-rgb),.18);box-shadow:0 4px 20px rgba(var(--sh-rgb),.25);}
#exp-shell-root .exp-story-text p.exp-ill-slot{margin:1em 0;text-align:center;}
#exp-shell-root .exp-story-text p.exp-ill-slot:empty{display:none;}
#exp-shell-root .exp-illust-lb{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .18s;}
#exp-shell-root .exp-illust-lb.exp-lb-in{opacity:1;}
#exp-shell-root .exp-illust-lb.exp-lb-out{opacity:0;}
#exp-shell-root .exp-illust-lb .exp-lb-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
#exp-shell-root .exp-illust-lb .exp-lb-stage{position:relative;display:flex;align-items:center;justify-content:center;max-width:92vw;max-height:92vh;}
#exp-shell-root .exp-illust-lb .exp-lb-stage img{max-width:92vw;max-height:90vh;border-radius:10px;object-fit:contain;box-shadow:0 8px 40px rgba(0,0,0,.6);}

/* 变量页 */
#exp-shell-root .exp-var{font-size:13px;line-height:1.6;}
#exp-shell-root .exp-var h4{margin:0 0 10px;color:var(--gold-soft);letter-spacing:3px;border-bottom:1px solid rgba(var(--gold-rgb),.28);padding-bottom:6px;}
#exp-shell-root .exp-var pre{background:var(--panel);border:1px solid rgba(var(--gold-rgb),.18);border-radius:8px;padding:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--text);}
#exp-shell-root .exp-var-changed{background:rgba(var(--gold-rgb),.16);color:var(--text-strong);}
#exp-shell-root .exp-var-fold{margin-top:14px;border-top:1px solid rgba(var(--gold-rgb),.18);padding-top:10px;}
#exp-shell-root .exp-var-fold:first-child{margin-top:0;border-top:none;padding-top:0;}
#exp-shell-root .exp-var-foldhead{display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--gold-soft);letter-spacing:3px;font-size:14px;user-select:none;padding:4px 0;transition:transform .15s;}
#exp-shell-root .exp-var-foldhead:hover{color:var(--gold-hi);transform:translateY(-2px);}
#exp-shell-root .exp-var-arrow{display:inline-flex;width:14px;height:14px;color:var(--gold);transition:transform .18s;}
#exp-shell-root .exp-var-arrow svg{width:100%;height:100%;}
#exp-shell-root .exp-var-fold.open .exp-var-arrow{transform:rotate(90deg);}
#exp-shell-root .exp-var-foldbody{display:none;margin-top:8px;}
#exp-shell-root .exp-var-fold.open .exp-var-foldbody{display:block;}

/* 设置页 */
#exp-shell-root .exp-set{max-width:640px;margin:0 auto;}
#exp-shell-root .exp-set h4{margin:0 0 14px;color:var(--gold-soft);letter-spacing:3px;font-size:14px;border-bottom:1px solid rgba(var(--gold-rgb),.28);padding-bottom:8px;}
#exp-shell-root .exp-set h4:not(:first-child){margin-top:26px;}
#exp-shell-root .exp-theme-list{display:flex;flex-direction:column;gap:10px;}
#exp-shell-root .exp-theme-opt{display:flex;align-items:center;gap:14px;padding:13px 16px;border:1px solid rgba(var(--gold-rgb),.2);border-radius:11px;background:var(--panel);cursor:pointer;transition:border-color .15s,transform .15s;font-family:inherit;text-align:left;width:100%;box-shadow:var(--panel-sh,none);}
#exp-shell-root .exp-theme-opt:hover{border-color:rgba(var(--accent-rgb,var(--gold-rgb)),.45);transform:translateY(-2px);}
#exp-shell-root .exp-theme-opt.sel{border-color:var(--accent,var(--gold));box-shadow:0 0 0 1px var(--accent,var(--gold));}
#exp-shell-root .exp-theme-sw{display:flex;gap:5px;flex:none;}
#exp-shell-root .exp-theme-sw i{width:16px;height:16px;border-radius:50%;border:1px solid rgba(var(--fg-rgb),.25);}
#exp-shell-root .exp-theme-name{font-size:14px;letter-spacing:2px;color:var(--text-strong);font-weight:600;}
#exp-shell-root .exp-theme-desc{font-size:13px;color:var(--text-dim);letter-spacing:.5px;margin-top:3px;}
#exp-shell-root .exp-theme-check{margin-left:auto;width:18px;height:18px;color:var(--accent,var(--gold));flex:none;opacity:0;}
#exp-shell-root .exp-theme-opt.sel .exp-theme-check{opacity:1;}

/* 顶栏退出 ✕ */
#exp-shell-root .exp-tb-close{flex:none;margin-left:auto;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent;border:1px solid rgba(var(--gold-rgb),.28);color:var(--text-dim);transition:.15s;}
#exp-shell-root .exp-tb-close:hover{color:var(--gold-hi);border-color:rgba(var(--gold-rgb),.55);background:rgba(var(--gold-rgb),.08);transform:translateY(-2px);}
#exp-shell-root .exp-tb-close svg{width:17px;height:17px;}

/* 开场白/序章页 */
#exp-shell-root .exp-panel[data-panel="opening"]{overflow-y:auto;}
#exp-shell-root .exp-open{max-width:1080px;margin:0 auto;padding-bottom:26px;}
#exp-shell-root .exp-open-head{display:flex;flex-direction:column;align-items:center;gap:7px;padding:16px 0 4px;text-align:center;}
#exp-shell-root .exp-open-emblem{width:44px;height:44px;color:var(--accent,var(--gold));}
#exp-shell-root .exp-open-emblem svg{width:100%;height:100%;}
#exp-shell-root .exp-open-eyebrow{font-size:11px;letter-spacing:4px;color:var(--gold);}
#exp-shell-root .exp-open-title{font-size:26px;font-weight:700;letter-spacing:7px;color:var(--accent,var(--gold-hi));text-indent:7px;}
#exp-shell-root .exp-open-sub{font-size:12.5px;letter-spacing:3px;color:var(--text-dim);}
#exp-shell-root .exp-open-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:24px;}
#exp-shell-root .exp-open-head,#exp-shell-root .exp-open-sect,#exp-shell-root .exp-open-cards,#exp-shell-root .exp-open-foot,#exp-shell-root .exp-open-empty{max-width:1080px;margin-left:auto;margin-right:auto;}
#exp-shell-root .exp-open-sect{display:flex;align-items:center;gap:16px;margin-top:34px;}
#exp-shell-root .exp-open-sect::before{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--gold-rgb),.38));}
#exp-shell-root .exp-open-sect::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(var(--gold-rgb),.38),transparent);}
#exp-shell-root .exp-open-sect-lab{font-size:12px;letter-spacing:4px;text-indent:4px;color:var(--gold);white-space:nowrap;}
#exp-shell-root .exp-open-sect+.exp-open-cards{margin-top:16px;}
#exp-shell-root .exp-open-card{display:flex;min-width:0;gap:16px;padding:16px;border:1px solid rgba(var(--gold-rgb),.22);border-radius:13px;background:var(--panel);box-shadow:var(--panel-sh,none);transition:border-color .15s,transform .15s,box-shadow .15s;}
#exp-shell-root .exp-open-card.sel{cursor:pointer;}
#exp-shell-root .exp-open-card.sel:hover{border-color:var(--border-hover);transform:translateY(-2px);box-shadow:0 10px 26px rgba(var(--sh-rgb),.28);}
#exp-shell-root .exp-open-card.cur{border-color:rgba(var(--accent-rgb,var(--gold-rgb)),.62);box-shadow:0 0 0 1px rgba(var(--accent-rgb,var(--gold-rgb)),.42);}
#exp-shell-root .exp-open-card.busy{opacity:.6;pointer-events:none;}
#exp-shell-root .exp-open-img{flex:none;width:132px;aspect-ratio:832/1216;border-radius:9px;overflow:hidden;background:rgba(var(--fg-rgb),.05);border:1px solid rgba(var(--gold-rgb),.18);}
#exp-shell-root .exp-open-img img{width:100%;height:100%;object-fit:cover;display:block;}
#exp-shell-root .exp-open-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;}
#exp-shell-root .exp-open-act{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:3px;color:var(--gold);}
#exp-shell-root .exp-open-cur{font-size:10.5px;letter-spacing:2px;color:var(--on-gold);background:var(--gold);border-radius:9px;padding:2px 8px 2px 10px;}
#exp-shell-root .exp-open-name{font-size:19px;font-weight:700;letter-spacing:4px;color:var(--text-strong);}
#exp-shell-root .exp-open-role{font-size:13px;letter-spacing:1.5px;color:var(--text-dim);}
#exp-shell-root .exp-open-meta{display:flex;flex-direction:column;gap:3px;margin-top:2px;}
#exp-shell-root .exp-open-mrow{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--text-faint);min-width:0;}
#exp-shell-root .exp-open-mrow svg{flex:none;width:13px;height:13px;color:var(--gold);}
#exp-shell-root .exp-open-mrow span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#exp-shell-root .exp-open-blurb{font-size:13px;line-height:1.8;color:var(--text);margin-top:2px;}
#exp-shell-root .exp-open-go{align-self:center;margin-top:auto;padding:8px 20px;border-radius:8px;background:var(--accent,var(--gold));color:var(--on-accent,var(--on-gold));font-size:13px;letter-spacing:3px;text-indent:3px;box-shadow:0 3px 12px rgba(var(--accent-rgb,var(--gold-rgb)),.28);}
#exp-shell-root .exp-open-foot{margin-top:18px;text-align:center;font-size:12px;letter-spacing:2px;color:var(--text-faint);}
#exp-shell-root .exp-open-cards.custom-solo{display:block;}
#exp-shell-root .exp-open-card.custom{flex-direction:column;align-items:center;text-align:center;gap:8px;max-width:600px;margin:0 auto;padding:28px 36px;}
#exp-shell-root .exp-open-card.custom .exp-custom-emblem{display:inline-flex;color:var(--gold);margin-bottom:2px;}
#exp-shell-root .exp-open-card.custom .exp-custom-emblem svg{width:42px;height:42px;}
#exp-shell-root .exp-open-card.custom .exp-open-go{margin-top:10px;}
#exp-shell-root .exp-custom{max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:26px;}
#exp-shell-root .exp-custom-back{align-self:flex-start;background:none;border:none;color:var(--text-faint);font-family:inherit;font-size:14px;letter-spacing:1px;cursor:pointer;padding:4px 0;}
#exp-shell-root .exp-custom-back:hover{color:var(--gold-soft);}
#exp-shell-root .exp-custom-lab{font-size:15px;letter-spacing:2px;color:var(--gold-soft);margin-bottom:10px;}
#exp-shell-root .exp-custom-grp{font-size:12.5px;letter-spacing:1px;color:var(--text-faint);margin:6px 0 4px;}
#exp-shell-root .exp-custom-opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;}
#exp-shell-root .exp-custom-opt{display:flex;flex-direction:column;gap:3px;text-align:left;padding:9px 12px;border:1px solid rgba(var(--gold-rgb),.22);border-radius:9px;background:var(--panel);color:var(--text);font-family:inherit;cursor:pointer;transition:border-color .15s,transform .15s;}
#exp-shell-root .exp-custom-opt:hover{border-color:var(--border-hover);transform:translateY(-2px);}
#exp-shell-root .exp-custom-opt.on{border-color:var(--gold);box-shadow:0 0 0 1px rgba(var(--gold-rgb),.45) inset;}
#exp-shell-root .exp-custom-opt b{font-size:15px;font-weight:600;}
#exp-shell-root .exp-custom-opt i{font-style:normal;font-size:12.5px;color:var(--gold-soft);}
#exp-shell-root .exp-custom-opt span{font-size:13.5px;color:var(--text-faint);line-height:1.5;}
#exp-shell-root .exp-custom input,#exp-shell-root .exp-custom textarea{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid rgba(var(--gold-rgb),.22)!important;border-radius:9px;background:var(--panel)!important;color:var(--text)!important;font-family:inherit;font-size:14.5px;line-height:1.6;}
#exp-shell-root .exp-custom textarea{min-height:74px;resize:vertical;}
#exp-shell-root .exp-custom input:focus,#exp-shell-root .exp-custom textarea:focus{outline:none;border-color:var(--gold)!important;}
#exp-shell-root .exp-custom-foot{display:flex;align-items:center;gap:14px;justify-content:center;}
#exp-shell-root #exp-custom-hint{font-size:13px;color:var(--sem-warn,#d08a45);min-height:1em;text-align:center;margin-top:-14px;}
#exp-shell-root #exp-custom-go{padding:14px 64px;border:none;border-radius:11px;background:var(--accent,var(--gold));color:var(--on-accent,var(--on-gold));font-family:inherit;font-size:16px;letter-spacing:5px;text-indent:5px;cursor:pointer;box-shadow:0 3px 12px rgba(var(--accent-rgb,var(--gold-rgb)),.28);transition:transform .15s;}
#exp-shell-root #exp-custom-go:hover{transform:translateY(-2px);}
#exp-shell-root #exp-custom-go:disabled{opacity:.5;cursor:default;transform:none;}
#exp-shell-root .exp-open-empty,#exp-shell-root .exp-tab-error{padding:40px 0;text-align:center;color:var(--text-faint);letter-spacing:2px;}
#exp-entry.hidden{display:none;}
#exp-entry.pill{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:9001;}
#exp-entry .exp-entry-pill{display:flex;align-items:center;gap:8px;background:linear-gradient(180deg,rgba(var(--pop-rgb),.96),rgba(var(--pop-rgb),.98));color:var(--accent,var(--gold-hi));border:1px solid rgba(var(--gold-rgb),.5);border-radius:22px;padding:9px 18px;font-family:'Noto Serif SC','Songti SC','Georgia',serif;font-size:14px;letter-spacing:3px;cursor:pointer;box-shadow:0 6px 20px rgba(var(--sh-rgb),.5);transition:.15s;}
#exp-entry .exp-entry-pill:hover{border-color:var(--accent,var(--gold));box-shadow:0 6px 22px rgba(var(--accent-rgb,var(--gold-rgb)),.28);transform:translateY(-2px);}
#exp-entry .exp-entry-pill .ico{display:inline-flex;width:18px;height:18px;}
#exp-entry .exp-entry-pill .chev{display:inline-flex;width:15px;height:15px;color:var(--gold);}

/* ===== 手机适配 ===== */
@media (max-width:920px){
#exp-shell-root .exp-topbar{height:calc(52px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 12px 0;gap:10px;}
#exp-shell-root .exp-tb-info{display:flex;flex-direction:column;justify-content:center;gap:2px;flex:1;min-width:0;}
#exp-shell-root .exp-tb-item{font-size:12.5px;letter-spacing:.5px;min-width:0;}
#exp-shell-root .exp-tb-item svg{width:13px;height:13px;}
#exp-shell-root .exp-tb-item span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#exp-shell-root .exp-story-log{padding:18px 14px 12px;}
#exp-shell-root .exp-story-turn{margin-bottom:18px;}
#exp-shell-root .exp-story-turn.assistant .exp-story-text{font-size:15.5px;line-height:1.95;}
#exp-shell-root .exp-story-turn.user .exp-story-text{font-size:14px;line-height:1.8;}
#exp-shell-root .exp-story-options{margin-bottom:18px;}
#exp-shell-root .exp-story-opt{font-size:13.5px;padding:8px 8px;gap:10px;}
#exp-shell-root .exp-ff{gap:8px 12px;font-size:12px;}
#exp-shell-root .exp-ff-voice{font-size:12px;gap:5px;}
#exp-shell-root .exp-ff-voice img{width:22px;height:22px;}
#exp-shell-root .exp-vc{gap:12px;padding:12px;}
#exp-shell-root .exp-vc-img{width:118px;}
#exp-shell-root .exp-vc-text{font-size:13.5px;line-height:1.95;}
#exp-shell-root .exp-vc-memo,#exp-shell-root .exp-vc-empty{font-size:12.5px;line-height:1.85;}
#exp-shell-root .exp-vc-memos{max-height:148px;}
#exp-shell-root .exp-illust img,#exp-shell-root .exp-illust video{max-height:45vh;}
#exp-shell-root .exp-story-input{padding:8px 10px 10px;}
#exp-shell-root .exp-story-inputrow{gap:8px;justify-content:flex-start;}
#exp-shell-root .exp-story-input textarea{max-width:none;}
#exp-shell-root .exp-del-btn,#exp-shell-root .exp-edit-btn{padding:8px 16px;font-size:13px;letter-spacing:1px;}
#exp-shell-root .exp-story-delbar{gap:8px;min-height:46px;}
#exp-shell-root .exp-iconbtn{width:40px;height:40px;}
#exp-shell-root .exp-iconbtn svg{width:18px;height:18px;}
#exp-shell-root .exp-story-input textarea{font-size:16px;line-height:1.5;padding:10px 13px;min-height:46px;max-height:142px;}
#exp-shell-root .exp-panel{padding:16px 12px;}
#exp-shell-root .meter{padding:13px 14px;}
#exp-shell-root .exp-gal-pin,#exp-shell-root .exp-gal-thumb.pinned .exp-gal-pin{display:none;}
#exp-shell-root .exp-panel[data-panel="map"]{padding:12px 10px 14px;}
#exp-shell-root .exp-panel[data-panel="map"]{--map-fill:1;}
#exp-shell-root .exp-map{width:100%;height:100%;}
#exp-shell-root .exp-chart,#exp-shell-root .exp-ship{width:100%;height:100%;}
#exp-shell-root .exp-panel[data-panel="char"]{padding:10px 12px 22px;}
#exp-shell-root .exp-open-cards{grid-template-columns:minmax(0,1fr);gap:12px;}
#exp-shell-root .exp-open-card{padding:12px;gap:12px;}
#exp-shell-root .exp-open-img{width:104px;}
#exp-shell-root .exp-open-mrow{align-items:flex-start;}
#exp-shell-root .exp-open-mrow svg{margin-top:3px;}
#exp-shell-root .exp-open-mrow span{white-space:normal;overflow:visible;text-overflow:clip;}
#exp-shell-root .exp-open-title{font-size:22px;letter-spacing:5px;}
#exp-shell-root .exp-mapctl{gap:8px;}
#exp-shell-root .exp-mapctl button{width:42px;height:42px;}
#exp-shell-root .exp-spoi-lab{font-size:26px;stroke-width:5;}
#exp-shell-root .exp-ship-dir{font-size:22px;}
#exp-shell-root .exp-crew-meters{grid-template-columns:1fr;gap:10px;}
#exp-shell-root .exp-prey-grid{grid-template-columns:repeat(2,1fr);}
#exp-shell-root .exp-mate-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
#exp-shell-root .exp-mate-btn{padding:9px 4px;letter-spacing:2px;}
#exp-shell-root .exp-brief-foot{flex-direction:column;align-items:stretch;}
}
@media (max-width:920px) and (orientation:portrait){
#exp-shell-root{flex-direction:column;}
#exp-shell-root .exp-main{order:1;min-height:0;}
#exp-shell-root .exp-side{order:2;width:100%;flex:none;flex-direction:row;border-right:none;border-top:1px solid rgba(var(--side-gold-rgb,var(--gold-rgb)),.26);}
#exp-shell-root .exp-side-head{display:none;}
#exp-shell-root .exp-nav{display:flex;flex:1;padding:0;overflow:visible;}
#exp-shell-root .exp-nav-item{flex:1;flex-direction:column;justify-content:center;gap:2px;padding:7px 0 calc(7px + env(safe-area-inset-bottom,0px));font-size:10px;letter-spacing:.5px;border-left:none;border-top:2px solid transparent;}
#exp-shell-root .exp-nav-item.active{border-left-color:transparent;border-top-color:var(--side-gold,var(--accent,var(--gold)));background:linear-gradient(180deg,rgba(var(--side-gold-rgb,var(--accent-rgb,var(--gold-rgb))),.13),transparent 85%);}
#exp-shell-root .exp-nav-ico{width:21px;height:21px;}
#exp-shell-root .exp-panel[data-panel="char"]{overflow-y:auto;}
#exp-shell-root .exp-char-body{flex-direction:column;}
#exp-shell-root .exp-char-stage{height:auto;width:min(400px,100%);margin:0 auto;}
#exp-shell-root .hero-card{height:auto;width:100%;}
#exp-shell-root .exp-char-side{width:100%;}
#exp-shell-root .exp-char-cell.voice{min-height:0;}
#exp-shell-root .exp-char-cell.memo{height:260px;flex:none;}
#exp-shell-root .cell-memos{grid-template-columns:1fr;}
#exp-shell-root .stat-node{letter-spacing:1px;}
#exp-shell-root .exp-panel[data-panel="char"] .exp-char-tabs,
#exp-shell-root .exp-panel[data-panel="gallery"] .exp-char-tabs{flex-wrap:wrap;overflow:visible;row-gap:2px;padding-bottom:0;}
#exp-shell-root .exp-char-tab{padding:6px 12px 9px;letter-spacing:2px;}
#exp-shell-root .exp-panel[data-panel="map"]{--map-portrait:1;}
#exp-shell-root .exp-poipop{max-width:min(340px,calc(100vw - 44px));padding:13px 42px 14px 15px;}
#exp-shell-root .exp-poipop.room{max-width:min(340px,calc(100vw - 44px));}
#exp-shell-root .exp-md-h b{font-size:16px;}
#exp-shell-root .exp-md-h span{font-size:12.5px;}
#exp-shell-root .exp-md-desc{font-size:14px;line-height:1.6;}
#exp-shell-root .exp-poipop-x{top:4px;right:4px;width:30px;height:30px;padding:7px;}
#exp-shell-root .exp-poipop-go{margin-top:13px;padding:10px;font-size:14px;}
#exp-shell-root .exp-spoi-lab{font-size:19px;stroke-width:3.6;}
#exp-shell-root .exp-ship-dir{font-size:17px;letter-spacing:3px;}
}
@media (max-width:920px) and (orientation:landscape){
#exp-shell-root .exp-side{width:64px;}
#exp-shell-root .exp-side-head{padding:0;justify-content:center;height:52px;}
#exp-shell-root .exp-side-title{display:none;}
#exp-shell-root .exp-nav-item{justify-content:center;padding:13px 0;gap:0;}
#exp-shell-root .exp-nav-lab{display:none;}
#exp-shell-root .exp-char-side{overflow-y:auto;}
#exp-shell-root .exp-char-cell.aff,#exp-shell-root .exp-char-cell.voice{flex:none;}
#exp-shell-root .exp-char-cell.voice{min-height:0;}
#exp-shell-root .exp-char-cell.memo{flex:none;min-height:200px;}
}

/* ===== 动效系统 ===== */
#exp-shell-root,#exp-entry{--dur-tap:120ms;--dur-fast:200ms;--dur-med:320ms;--dur-page:460ms;--dur-boot:1150ms;--dur-exit:240ms;--dur-pulse:600ms;--stag:45ms;--boot-lead:560ms;--ease-out:cubic-bezier(.25,.6,.3,1);--ease-cine:cubic-bezier(.16,.84,.28,1);--ease-spring:cubic-bezier(.34,1.45,.5,1);--ease-in:cubic-bezier(.5,0,.75,.4);}
@keyframes exp-rise{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
@keyframes exp-rise-sm{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
@keyframes exp-fade{from{opacity:0;}to{opacity:1;}}
@keyframes exp-fade-soft{from{opacity:.25;}to{opacity:1;}}
@keyframes exp-theme-soft{from{opacity:.55;}to{opacity:1;}}
@keyframes exp-drop{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:none;}}
@keyframes exp-side-in{from{opacity:0;transform:translateX(-26px);}to{opacity:1;transform:none;}}
@keyframes exp-side-in-up{from{opacity:0;transform:translateY(26px);}to{opacity:1;transform:none;}}
@keyframes exp-boot-emblem{from{opacity:0;transform:scale(.82);}to{opacity:1;transform:scale(1);}}
@keyframes exp-veil-out{from{opacity:1;}to{opacity:0;}}
@keyframes exp-shell-out{to{opacity:0;}}
@keyframes exp-pop{from{opacity:0;transform:scale(.94);}to{opacity:1;transform:none;}}
@keyframes exp-stat-pulse{0%{box-shadow:0 0 0 0 rgba(var(--gold-rgb),.5);}70%{box-shadow:0 0 0 9px rgba(var(--gold-rgb),0);}100%{box-shadow:0 0 0 0 rgba(var(--gold-rgb),0);}}
@keyframes exp-num-glow{0%,100%{text-shadow:none;}35%{text-shadow:0 0 12px rgba(var(--gold-rgb),.85);}}
#exp-shell-root .exp-in{animation:exp-rise var(--dur-page) var(--ease-cine) both;animation-delay:calc(var(--i,0)*var(--stag));}
#exp-shell-root .exp-in.exp-boot-lead{animation-delay:calc(var(--boot-lead) + var(--i,0)*var(--stag));}
#exp-shell-root .exp-in-soft{animation:exp-rise var(--dur-med) var(--ease-cine) both;}
#exp-shell-root .exp-in-bubble{animation:exp-rise-sm var(--dur-med) var(--ease-out) both;}
#exp-shell-root .exp-in-opt{animation:exp-rise-sm var(--dur-med) var(--ease-out) both;animation-delay:calc(var(--i,0)*var(--stag));}
#exp-shell-root .exp-in-sub{animation:exp-rise-sm var(--dur-med) var(--ease-cine) both;animation-delay:calc(var(--i,0)*var(--stag));}
#exp-shell-root .exp-var-fold.open .exp-var-foldbody{animation:exp-fade-soft var(--dur-fast) var(--ease-out);}
#exp-shell-root .exp-fade-in{animation:exp-fade-soft var(--dur-med) var(--ease-out) both;}
#exp-shell-root .exp-tb-flash{animation:exp-fade-soft var(--dur-fast) var(--ease-out) both;}
#exp-shell-root .exp-theme-fade{animation:exp-theme-soft calc(var(--dur-fast)*1.3) var(--ease-out);}
#exp-shell-root .exp-boot{position:absolute;inset:0;z-index:9004;display:grid;place-items:center;background:var(--bg);animation:exp-veil-out calc(var(--dur-boot)*.43) var(--ease-in) calc(var(--dur-boot)*.37) both;}
#exp-shell-root .exp-boot-mark{display:flex;flex-direction:column;align-items:center;gap:12px;color:var(--accent,var(--gold));filter:drop-shadow(0 0 18px rgba(var(--accent-rgb,var(--gold-rgb)),.45));animation:exp-boot-emblem calc(var(--dur-boot)*.43) var(--ease-cine) both;}
#exp-shell-root[data-theme="parchment"] .exp-boot-mark,#exp-shell-root[data-theme="ivory"] .exp-boot-mark,#exp-shell-root[data-theme="marble"] .exp-boot-mark{filter:drop-shadow(0 0 14px rgba(var(--accent-rgb),.25));}
#exp-shell-root .exp-boot-title{font-size:34px;font-weight:700;letter-spacing:12px;text-indent:12px;}
#exp-shell-root .exp-boot-sub{font-size:12px;letter-spacing:6px;text-indent:6px;text-transform:uppercase;color:var(--gold);}
#exp-shell-root.exp-entering .exp-side{animation:exp-side-in calc(var(--dur-boot)*.43) var(--ease-cine) calc(var(--dur-boot)*.33) both;}
#exp-shell-root.exp-entering .exp-topbar{animation:exp-drop calc(var(--dur-boot)*.35) var(--ease-out) calc(var(--dur-boot)*.4) both;}
#exp-shell-root.exp-leaving{animation:exp-shell-out var(--dur-exit) var(--ease-in) both;}
#exp-shell-root .exp-pulse{animation:exp-stat-pulse var(--dur-pulse) var(--ease-out);}
#exp-shell-root .exp-pulse .cell-num,#exp-shell-root .exp-pulse .meter-num{animation:exp-num-glow var(--dur-pulse) var(--ease-out);}

/* 灯箱开合与切图 */
#exp-shell-root .exp-lightbox.exp-lb-in .exp-lb-backdrop{animation:exp-fade var(--dur-fast) var(--ease-out) both;}
#exp-shell-root .exp-lightbox.exp-lb-in .exp-lb-stage{animation:exp-pop var(--dur-med) var(--ease-spring) both;}
#exp-shell-root .exp-lightbox.exp-lb-out{animation:exp-shell-out var(--dur-fast) var(--ease-in) both;}
#exp-shell-root .exp-lb-img{animation:exp-fade-soft var(--dur-fast) var(--ease-out);}
#exp-entry .exp-entry-pill{animation:exp-drop var(--dur-page) var(--ease-spring);}

/* 按压反馈 */
#exp-shell-root .exp-iconbtn:active,#exp-shell-root .exp-story-opt:active,#exp-shell-root .exp-mate-btn:active,#exp-shell-root .exp-prey-card:active,#exp-shell-root .exp-theme-opt:active,#exp-shell-root .exp-hunt-go:active,#exp-shell-root .exp-del-btn:active,#exp-shell-root .exp-edit-btn:active,#exp-shell-root .exp-tb-close:active,#exp-shell-root .exp-mapctl button:active,#exp-entry .exp-entry-pill:active{transform:scale(.97);}
#exp-shell-root .exp-pressed.exp-pressed,#exp-entry .exp-pressed.exp-pressed{transform:scale(.96);transition:transform .08s;}

/* ===== 体验优化 ===== */
#exp-shell-root .exp-story{position:relative;}
#exp-shell-root .exp-story-jump{position:absolute;right:20px;bottom:120px;z-index:6;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;background:rgba(var(--pop-rgb),.92);border:1px solid rgba(var(--gold-rgb),.45);color:var(--accent,var(--gold-hi));box-shadow:0 4px 14px rgba(var(--sh-rgb),.35);opacity:0;pointer-events:none;transition:opacity var(--dur-fast) var(--ease-out),background .15s,border-color .15s,transform .15s;}
#exp-shell-root .exp-story-jump:hover{background:rgba(var(--pop-rgb),1);border-color:rgba(var(--gold-rgb),.7);transform:translateY(-2px);}
#exp-shell-root .exp-story-jump.show{opacity:1;pointer-events:auto;}
#exp-shell-root .exp-story-jump svg{width:17px;height:17px;transform:rotate(90deg);}
#exp-shell-root[data-fontsize="lg"]{--read-col:760px;}
#exp-shell-root[data-fontsize="lg"] .exp-story-turn.assistant .exp-story-text{font-size:19px;}
#exp-shell-root[data-fontsize="lg"] .exp-story-turn.user .exp-story-text{font-size:17px;}
#exp-shell-root[data-fontsize="xl"]{--read-col:820px;}
#exp-shell-root[data-fontsize="xl"] .exp-story-turn.assistant .exp-story-text{font-size:20.5px;}
#exp-shell-root[data-fontsize="xl"] .exp-story-turn.user .exp-story-text{font-size:18px;}

/* 删楼二次确认武装态 */
#exp-shell-root .exp-del-btn.danger.armed{background:#a03328;border-color:#a03328;color:#fdf6f2;}
@media (max-width:920px){
#exp-shell-root,#exp-entry{--dur-page:360ms;--stag:30ms;--dur-boot:820ms;--boot-lead:420ms;}
}
@media (max-width:920px) and (orientation:portrait){
#exp-shell-root.exp-entering .exp-side{animation-name:exp-side-in-up;}
}
@media (prefers-reduced-motion:reduce){
#exp-shell-root,#exp-entry{--dur-tap:0ms;--dur-fast:0ms;--dur-med:0ms;--dur-page:0ms;--dur-boot:0ms;--dur-exit:0ms;--dur-pulse:0ms;--stag:0ms;--boot-lead:0ms;}
#exp-shell-root .exp-spoi:hover .exp-spoi-ico,#exp-shell-root .exp-spoi.cur .exp-spoi-ico{animation:none;}
}
#exp-shell-root[data-motion="off"],#exp-entry[data-motion="off"]{--dur-tap:0ms;--dur-fast:0ms;--dur-med:0ms;--dur-page:0ms;--dur-boot:0ms;--dur-exit:0ms;--dur-pulse:0ms;--stag:0ms;--boot-lead:0ms;}
#exp-shell-root[data-motion="off"] .exp-spoi:hover .exp-spoi-ico,#exp-shell-root[data-motion="off"] .exp-spoi.cur .exp-spoi-ico{animation:none;}
`;

  // ════ 图标与静态素材(ICO) ════
  const ICO = {
    story: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M4 5.5A2 2 0 0 1 6 4h5v15.5H6a2 2 0 0 0-2 1.5z'/><path d='M20 5.5A2 2 0 0 0 18 4h-5v15.5h5a2 2 0 0 1 2 1.5z'/></svg>",
    char: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='8' r='3.6'/><path d='M5.5 20a6.5 6.5 0 0 1 13 0'/></svg>",
    crew: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='8.5' r='3'/><path d='M3.5 19a5.5 5.5 0 0 1 11 0'/><path d='M16 6.3a3 3 0 0 1 0 5.4'/><path d='M17.6 19a5.6 5.6 0 0 0-2.3-4.5'/></svg>",
    map: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z'/><path d='M9 4v14M15 6v14'/></svg>",
    var: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M9 4c-2 0-2.4 1.6-2.4 4S6.2 12 4.6 12c1.6 0 2 1.6 2 4s.4 4 2.4 4'/><path d='M15 4c2 0 2.4 1.6 2.4 4s.4 4 2 4c-1.6 0-2 1.6-2 4s-.4 4-2.4 4'/></svg>",
    send: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h13M13 6l6 6-6 6'/></svg>",
    stop: "<svg viewBox='0 0 24 24' fill='currentColor'><rect x='7' y='7' width='10' height='10' rx='2'/></svg>",
    regen: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M20 11a8 8 0 0 0-13.7-4.7L4 8.5'/><path d='M4 4v4.5h4.5'/><path d='M4 13a8 8 0 0 0 13.7 4.7L20 15.5'/><path d='M20 20v-4.5h-4.5'/></svg>",
    memoir: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M9.5 6.5C6.9 7.8 5.2 10 5.2 12.6c0 2.2 1.4 3.7 3.2 3.7 1.7 0 2.9-1.2 2.9-2.8 0-1.6-1.1-2.7-2.6-2.7-.3 0-.6 0-.8.1.3-1.3 1.4-2.5 3-3.3z'/><path d='M18.6 6.5C16 7.8 14.3 10 14.3 12.6c0 2.2 1.4 3.7 3.2 3.7 1.7 0 2.9-1.2 2.9-2.8 0-1.6-1.1-2.7-2.6-2.7-.3 0-.6 0-.8.1.3-1.3 1.4-2.5 3-3.3z'/></svg>",
    trash: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M3 6h18'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'/><path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><path d='M10 11v6M14 11v6'/></svg>",
    aff: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M12 20.5C7 16.5 3.5 13.2 3.5 9.4A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.5 2.7c0 3.8-3.5 7.1-8.5 11.1z'/></svg>",
    voice: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M21 11.7c0 4-4 7.2-9 7.2-1 0-2-.1-2.9-.4L4 20l1.5-3.4C4 15.3 3 13.6 3 11.7c0-4 4-7.2 9-7.2s9 3.2 9 7.2z'/></svg>",
    pin: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M12 21c4-4.6 6-7.9 6-11a6 6 0 1 0-12 0c0 3.1 2 6.4 6 11z'/><circle cx='12' cy='10' r='2.3'/></svg>",
    clock: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='8.5'/><path d='M12 7.5V12l3.2 2'/></svg>",
    compass: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M15.6 8.4l-2.3 4.9-4.9 2.3 2.3-4.9z'/></svg>",
    close: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M6 6l12 12M18 6L6 18'/></svg>",
    chev: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M9 6l6 6-6 6'/></svg>",
    thought: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linejoin='round'><path d='M12 2.5l2 7.5 7.5 2-7.5 2-2 7.5-2-7.5L2.5 12l7.5-2z'/><path d='M6.5 6.5l2.6 2.6M17.5 6.5l-2.6 2.6M17.5 17.5l-2.6-2.6M6.5 17.5l2.6-2.6' stroke-width='1.1' opacity='.6'/></svg>",
    gear: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='3.1'/><path d='M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z'/></svg>",
    check: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12.5l4.5 4.5L19 7.5'/></svg>",
    gallery: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><rect x='3.5' y='3.5' width='7' height='7' rx='1.4'/><rect x='13.5' y='3.5' width='7' height='7' rx='1.4'/><rect x='3.5' y='13.5' width='7' height='7' rx='1.4'/><rect x='13.5' y='13.5' width='7' height='7' rx='1.4'/></svg>",
    hunt: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='7.5'/><path d='M12 2v4M12 18v4M2 12h4M18 12h4'/><circle cx='12' cy='12' r='2.3'/></svg>",
    lock: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><rect x='4.5' y='10.5' width='15' height='10' rx='2.2'/><path d='M8 10.5V7a4 4 0 0 1 8 0v3.5'/></svg>",
    paw: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='4' r='2'/><circle cx='18' cy='8' r='2'/><circle cx='20' cy='16' r='2'/><path d='M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z'/></svg>",
    frost: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.4' stroke-linecap='round'><path d='M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17'/><path d='M12 5.5 9.9 3.9M12 5.5l2.1-1.6M12 18.5l-2.1 1.6M12 18.5l2.1 1.6'/></svg>",
    noart: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='3' width='16' height='18' rx='1.8'/><circle cx='12' cy='9.4' r='2.7'/><path d='M6.8 18.7c.9-3 2.8-4.7 5.2-4.7s4.3 1.7 5.2 4.7'/></svg>",
    up: "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M12 5l7 12H5z'/></svg>",
    down: "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M12 19L5 7h14z'/></svg>",
    db: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><ellipse cx='12' cy='5.5' rx='7.5' ry='3'/><path d='M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13'/><path d='M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3'/></svg>",
  };

  // ════ 面板注册表(PANELS) ════
  const PANELS = [
    { key: 'opening', label: '开场白', ico: ICO.compass, render: renderOpeningTab, stagSel: '.exp-open-head, .exp-open-sect, .exp-open-cards .exp-open-card, .exp-open-foot' },
    { key: 'story', label: '正文', ico: ICO.story, render: null, stagSel: '.exp-story-log, .exp-story-input' },
    { key: 'char', label: '角色', ico: ICO.char, render: renderCharTab, stagSel: '.exp-char-tabs, .exp-char-stage, .exp-char-side .exp-char-cell' },
    { key: 'gallery', label: '画廊', ico: ICO.gallery, render: renderGalleryTab, stagSel: '.exp-char-tabs, .exp-gal-sec-head, .exp-gal-theme' },
    { key: 'crew', label: '船员', ico: ICO.crew, render: renderCrewTab, stagSel: '.exp-crew-meters .meter, .exp-crew > :not(.exp-crew-meters)' },
    { key: 'hunt', label: '狩猎', ico: ICO.hunt, render: renderHuntTab, stagSel: '.exp-hunt > *, .exp-hunt-lock > *' },
    { key: 'map', label: '地图', ico: ICO.map, render: renderMapTab, stagSel: '.exp-char-tabs, .exp-map-body' },
    { key: 'var', label: '变量', ico: ICO.var, render: renderVarTab, stagSel: '.exp-var-fold' },
    { key: 'settings', label: '设置', ico: ICO.gear, render: null, stagSel: '.exp-set h4, .exp-theme-list' },
  ];
  const DEFAULT_TAB = 'story';

  // ════ 数据表(技能图标/立绘库/地图与航海数据/角色名单/兜底常量/仪表工具) ════
  const ICONS={"狩猎技巧": "<svg viewBox='9 -12 535 535' fill='currentColor'><path d='M331.734 20.443a4.421 4.421 0 0 0-1.802.327c-27.736 11.543-47.295 57.495-29.899 76.671 33.52 38.946 72.835 55.573 90.147 128.434 2.607 20.15 1.218 40.094 0 60.25-17.312 72.861-56.627 89.488-90.147 128.434-17.396 19.176 2.163 65.128 29.899 76.671 9.038 3.762 28.025-26.165 21.752-25.209-16.34 2.491-37.8-20.941-28.387-28.93 38.47-32.65 105.49-100.055 100.277-135.552-2.211-15.057-9.35-30.36-15.574-45.539 6.225-15.18 13.363-30.482 15.574-45.54 5.214-35.496-61.806-102.901-100.277-135.552-9.412-7.988 12.047-31.42 28.387-28.93 5.881.897-10.44-25.35-19.95-25.535zM152 24.23l-21.441 53.602L152 99.273l21.441-21.441zm-9 91.497v296.546l9-9 9 9V115.727l-2.637 2.636-6.363 6.364zm160 9.847v260.824l18-17.53V143.104zM152 428.727l-23 23v38.546l23-23 23 23v-38.546z'/></svg>", "物资": "<svg viewBox='9 11 493 493' fill='currentColor'><path d='M256 41c-43.696 0-83.28 3.58-111.37 9.197-14.047 2.81-25.26 6.196-32.21 9.483-3.476 1.643-5.842 3.293-6.88 4.306l-.013.014.014.014c1.038 1.013 3.404 2.663 6.88 4.306 6.95 3.287 18.163 6.674 32.21 9.483C172.72 83.42 212.303 87 256 87s83.28-3.58 111.37-9.197c14.047-2.81 25.26-6.196 32.21-9.483 3.476-1.643 5.842-3.293 6.88-4.306l.013-.014-.014-.014c-1.038-1.013-3.404-2.663-6.88-4.306-6.95-3.287-18.163-6.674-32.21-9.483C339.28 44.58 299.697 41 256 41zm-80 15a32 8 0 0 1 32 8 32 8 0 0 1-32 8 32 8 0 0 1-32-8 32 8 0 0 1 32-8zm-75.168 26.594c-2.832 12.035-7.414 32.162-12.05 55.28 16.735 4.338 33.52 7.99 50.327 10.995 2.988-17.203 6.707-34.438 11.27-51.708-3.186-.547-6.3-1.113-9.282-1.71-14.91-2.98-27.13-6.49-36.37-10.86-1.363-.644-2.656-1.307-3.896-1.998zm310.336 0c-1.24.69-2.533 1.354-3.895 1.998-9.24 4.37-21.462 7.88-36.37 10.86-2.93.587-5.99 1.142-9.116 1.68 5.27 16.954 9.544 34.033 12.953 51.22 16.26-2.983 32.412-6.568 48.424-10.754-4.617-23-9.175-43.017-11.996-55.004zm-67.4 17.238c-23.065 2.982-49.9 4.803-78.768 5.117v54.198c30.885-.445 61.603-3.05 91.975-7.773-3.45-17.334-7.805-34.523-13.207-51.543zm-175.475.008c-4.647 17.345-8.416 34.67-11.426 51.98 30.062 4.54 60.16 6.967 90.133 7.354V104.95c-28.842-.314-55.656-2.133-78.707-5.11zm-84.38 55.277l-5.518 30.088c128.542 30.936 239.89 29.948 353.384.137l-4.98-30.172c-110.776 28.798-228.035 29.785-342.886-.053zm350.634 48.176c-16.95 4.406-33.876 8.174-50.83 11.312 3.656 47.603 1.776 95.87-3.55 144.49 18.6-3.803 36.796-8.527 54.468-14.17C439.592 314.762 439 291.606 439 256c0-14.915-1.77-33.334-4.453-52.707zm-357.13.256C74.758 222.827 73 241.15 73 256c0 23.794 4.678 57.228 10.424 89.404 16.604 4.828 33.386 8.97 50.27 12.418-4.532-47.516-6.03-95.247-2.577-143.222-17.624-3.063-35.507-6.74-53.7-11.05zm71.546 13.944c-3.336 47.978-1.63 95.883 3.164 143.813 31.553 5.49 63.348 8.592 94.873 9.33V225.94c-31.995-.576-64.57-3.38-98.037-8.446zm216.902.19c-33.303 5.275-66.792 8.068-100.865 8.34V370.8c32.816-.174 65.224-2.93 96.64-8.25 5.61-49.032 7.722-97.417 4.225-144.866zM86.66 364.93l8.29 31.9c104.15 32.39 225.75 32.428 326.077.733l8.272-32.264c-106.024 31.367-228.01 31.34-342.64-.37zm11.236 51.666c3.816 16.945 6.585 28.183 6.704 28.662.792 2.185 4.694 6.427 12.96 10.37 7.587 3.616 18.215 6.947 30.77 9.704-2.132-12.566-4.142-25.147-6.016-37.74-15.03-3.066-29.865-6.733-44.418-10.996zm318.366 1.31c-14.934 4.36-30.254 8.052-45.852 11.086-2.007 12.08-4.16 24.172-6.43 36.272 12.422-2.745 22.935-6.05 30.46-9.637 8.376-3.994 12.302-8.315 13.02-10.473 3.26-9.78 6.178-18.815 8.802-27.248zm-255.217 13.18c1.917 12.574 3.97 25.154 6.144 37.74 23.637 3.684 51.525 5.748 79.81 6.11V439.24c-28.815-.644-57.66-3.36-85.955-8.154zm190.55 1.223c-28.306 4.484-57.373 6.847-86.595 7.07v35.556c28.358-.363 56.317-2.437 79.994-6.14 2.33-12.19 4.538-24.353 6.602-36.487z'/></svg>", "健康": "<svg viewBox='-17 -17 545 545' fill='currentColor'><path d='M196 16a30 30 0 0 0-30 30v120H46a30 30 0 0 0-30 30v120a30 30 0 0 0 30 30h120v120a30 30 0 0 0 30 30h120a30 30 0 0 0 30-30V346h120a30 30 0 0 0 30-30V196a30 30 0 0 0-30-30H346V46a30 30 0 0 0-30-30H196z'/></svg>", "士气": "<svg viewBox='-10 -13 543 543' fill='currentColor'><path d='M356.688 19.188c-6.83-.032-12.837.64-18.125 1.843-24.178 5.495-36.437 21.983-50.938 41.157-14.5 19.175-31.317 40.993-62.78 47.47C195.08 115.78 154.27 108.253 91.25 78.5c-10.013 44.88-33.406 128.62-60.906 178.656 60.093 28.5 97.245 34.926 121 30.875.01 0 .02.004.03 0 21.59-5.827 34.487-20.094 47.876-43.092 17.014-29.227 32.563-72.198 60.25-123.188l16.406 8.938c-16.69 30.735-28.802 58.617-40 82.937 8.552-6.512 18.633-11.77 31.063-14.594 27.71-6.296 65.053-.495 121.655 24.75-6.932-29.276-1.885-61.913 9.875-92.218 12.686-32.69 33.038-62.907 56.28-84.03-42.595-19.553-73.152-27.554-95.124-28.282-1.01-.033-1.993-.058-2.97-.063zm127.54 14.144c-.858-.025-1.752.062-2.664.266-4.378.977-8.94 4.424-12.084 11.097L289.53 497.31h23.61L490.972 49.368c3.475-10.153-.75-15.86-6.746-16.035z'/></svg>"},EMBLEM="<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'><circle cx='12' cy='12' r='6.2'/><circle cx='12' cy='12' r='2.1'/><path d='M12 2.2v7.7M12 14.1v7.7M2.2 12h7.7M14.1 12h7.7M5.07 5.07l5.45 5.45M13.48 13.48l5.45 5.45M18.93 5.07l-5.45 5.45M10.52 13.48l-5.45 5.45'/></svg>",SEAL="<svg viewBox='0 0 512 512' fill='currentColor'><path d='M256 15.99c-8.8 0-16 14.33-16 32 0 8.47 1.7 16.59 4.7 22.57-4.7.21-9 1.16-13.7 2.43v15.85c17.1-2.42 34.1-2.31 50 0V72.99c-4.5-1.35-9.4-2.11-13.7-2.43 3-5.98 4.7-14.1 4.7-22.57 0-17.67-7.2-32-16-32zM86.23 86.28c-6.25 6.25-1.19 21.42 11.3 33.92 6.07 6 12.97 10.6 19.37 12.7-3.2 3.5-5.6 7.2-8 11.4l11.3 11.2c9.9-13.4 21.9-25.4 35.3-35.3l-11.2-11.3c-4.2 2.2-8 5.2-11.4 8-2.1-6.4-6.7-13.3-12.7-19.3-8-6.21-24.55-20.4-33.97-11.32zm305.57 11.3c-6 6.02-10.6 12.92-12.7 19.32-3.5-3.2-7.2-5.6-11.4-8l-11.2 11.3c13.4 9.9 25.4 21.9 35.3 35.3l11.3-11.2c-2.2-4.2-5.2-8-8-11.4 6.3-2.2 13.2-6.7 19.2-12.7 12.5-12.5 17.6-27.69 11.3-33.93-9.9-7.87-28 5.62-33.8 11.31zm-142.3 7.52c-36.8 1.6-70.2 16.3-95.6 39.6-3.3 3.1-6.6 6.3-9.2 9.2-23.3 25.4-38 58.8-39.6 95.7 0 4.5-.2 9.1.1 13 1.5 36.8 16.2 70.2 39.5 95.6 3.1 3.2 6.4 6.5 9.2 9.2 25.4 23.2 58.8 37.9 95.6 39.5h.2c4.1.2 8.7 0 12.8 0 36.8-1.6 70.2-16.3 95.6-39.6 3.3-3.1 6.6-6.3 9.2-9.2 23.3-25.4 38-58.8 39.6-95.6v-.2c.2-4.2 0-8.7 0-12.8-1.6-36.8-16.3-70.2-39.6-95.6-3.1-3.3-6.3-6.6-9.2-9.2-25.4-23.3-58.8-38-95.6-39.6-4.5-.2-9.1 0-13 0zm6.5 10.7c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm6.9 28.4c25.7 1.6 49.1 11.8 67.3 27.9 3.4 3.1 6.7 6.3 9.7 9.7 16.1 18.2 26.3 41.6 27.9 67.4.4 4.6 0 9.2 0 13.7-1.6 25.7-11.8 49.1-27.9 67.3-3.1 3.4-6.3 6.7-9.7 9.7-18.2 16.1-41.6 26.3-67.4 27.9-4.6.1-9.2.4-13.7 0-25.7-1.6-49.1-11.8-67.2-27.9h-.1c-3.4-3-6.6-6.3-9.6-9.7-16.1-18.1-26.4-41.5-28-67.3-.1-4.6-.4-9.1 0-13.6.5-25.8 13.3-50.5 27.9-67.5 3.1-3.4 6.3-6.7 9.7-9.7 18.2-16.1 41.6-26.3 67.4-27.9 4.6-.4 9.2 0 13.7 0zm-94.8 12.6c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-2.9 8.2-2.9 11.3 0zm187.1 0c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-2.9 8.2-2.9 11.3 0zM240 163.3v8.7c2.5 3.2 4.4 5.5 7.8 6.8-.7 12.4-1.6 25.1-2.8 37.7 7.4-1.9 15.2-2 22.1.1-1.2-12.7-2.2-25.4-2.9-37.9 7.9-2.1 7.8-8.6 7.8-15.4-11-1.7-21.8-1.6-32 0zm-38.3 15.8c-8.7 6.2-16.4 13.9-22.6 22.6l6.2 6.2c4 .5 7 .8 10.3-.7 8.3 9.3 16.6 18.9 24.7 28.7 3.7-6.5 9.1-11.9 15.7-15.6-9.9-8.1-19.5-16.4-28.8-24.7 1.8-3.1 1.3-6.7.7-10.3zm108.6 0l-6.2 6.2c-.7 4-.8 6.9.6 10.3-9.2 8.3-18.9 16.6-28.7 24.7 6.5 3.7 11.9 9.1 15.6 15.7 8.1-9.9 16.5-19.5 24.7-28.8 3.2 1.7 6.7 1.3 10.3.7l6.2-6.2c-6.2-8.7-13.8-16.4-22.5-22.6zM423.1 231c2.5 17.1 2.3 34.1 0 50H439c1.5-4.5 2-9.4 2.3-13.7 6 3 14.2 4.7 22.7 4.7 17.7 0 32-7.2 32-16s-14.3-16-32-16c-8.5 0-16.7 1.7-22.7 4.7-.1-4.7-1-9-2.3-13.7zm-350.07.1c-1.35 4.5-2.11 9.2-2.4 13.6-6.02-3-14.15-4.6-22.6-4.6-17.67 0-32 7.2-32 16s14.33 16 32 16c8.48 0 16.61-1.7 22.6-4.7.15 4.7 1.12 9 2.4 13.7h15.8c-2.38-17.1-2.5-34.1 0-50zM256 233c-12.9 0-23 10.2-23 23s10.1 23 23 23c12.8 0 23-10.2 23-23s-10.2-23-23-23zm84 7c-3.2 2.5-5.5 4.4-6.8 7.8-12.4-.7-25.1-1.6-37.7-2.8 1.9 7.5 1.9 15.2 0 22.1 12.6-1.2 25.2-2.2 37.7-2.9 1 3.5 3.8 5.7 6.8 7.8h8.7c1.7-11 1.6-21.8 0-32zm-176.7.1c-1.7 10.9-1.5 21.8 0 32h8.7c3.1-2.5 5.6-4.3 6.7-7.8 12.5.6 25.1 1.6 37.8 2.8-2-7.5-2-15.2-.1-22.1-12.6 1.2-25.3 2.1-37.7 2.8-.9-3.5-3.8-5.7-6.7-7.7zm224.9 7.9c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm-264.4.1c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm167.9 28c-3.7 6.5-9.1 11.9-15.7 15.6 9.9 8.1 19.5 16.4 28.8 24.7-1.8 3.1-1.3 6.7-.7 10.3l6.2 6.2c8.7-6.2 16.4-13.9 22.6-22.6l-6.2-6.2c-4-.5-7-.8-10.3.7-8.3-9.3-16.6-18.9-24.7-28.7zm-71.4 0c-8.1 9.8-16.4 19.4-24.7 28.7-3.1-1.8-6.7-1.3-10.2-.7l-6.3 6.2c6.2 8.8 13.9 16.5 22.7 22.6l6.2-6.2c.5-4 .8-7-.7-10.3 9.3-8.3 18.9-16.6 28.7-24.7-6.5-3.7-12-9.1-15.7-15.6zm24.6 19.3c1.2 12.7 2.2 25.4 2.9 37.9-3.5.8-5.8 3.8-7.8 6.7v8.7c11 1.7 21.8 1.6 32 0V340c-2.5-3.2-4.4-5.5-7.8-6.8.7-12.4 1.6-25.1 2.8-37.7-7.7 1.3-15.8 1.7-22.1-.1zm-76.7 48.5c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-3 8.2-3 11.3 0zm187 0c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-3 8.3-3 11.3 0zm36.6 12.6c-9.9 13.4-21.9 25.4-35.3 35.3l11.2 11.3c4.2-2.2 8-5.2 11.4-8 2.1 6.4 6.7 13.3 12.7 19.3 12.5 12.5 27.6 17.5 33.9 11.3 6.2-6.3 1.2-21.4-11.3-33.9-6-6-12.9-10.6-19.3-12.7 3.2-3.5 5.6-7.2 8-11.4zm-271.6 0L109 367.7c2.3 4.1 5.1 8.2 8 11.4-6.4 2.1-13.3 6.7-19.37 12.7-12.47 12.5-17.52 27.6-11.3 33.9 6.24 6.3 21.47 1.2 33.97-11.3 6-6 10.6-12.9 12.7-19.3 3.5 3.2 7.2 5.6 11.4 8l11.2-11.2c-13.5-10-25.4-21.9-35.4-35.4zM256 380.2c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm-25 43V439c4.5 1.4 9.4 2.1 13.7 2.4-3 6-4.7 14.1-4.7 22.6 0 17.7 7.2 32 16 32s16-14.3 16-32c0-8.5-1.7-16.6-4.7-22.6 4.7-.2 9-1.1 13.7-2.4v-15.9c-17.1 2.5-34.1 2.4-50 .1z'/></svg>",CORNERS="<svg class='exp-corner tl' viewBox='0 0 26 26' fill='none' stroke='currentColor' stroke-width='1.3'><path d='M2 12V5a3 3 0 013-3h7'/><circle cx='6.5' cy='6.5' r='1.4' fill='currentColor' stroke='none'/></svg><svg class='exp-corner tr' viewBox='0 0 26 26' fill='none' stroke='currentColor' stroke-width='1.3'><path d='M2 12V5a3 3 0 013-3h7'/><circle cx='6.5' cy='6.5' r='1.4' fill='currentColor' stroke='none'/></svg><svg class='exp-corner bl' viewBox='0 0 26 26' fill='none' stroke='currentColor' stroke-width='1.3'><path d='M2 12V5a3 3 0 013-3h7'/><circle cx='6.5' cy='6.5' r='1.4' fill='currentColor' stroke='none'/></svg><svg class='exp-corner br' viewBox='0 0 26 26' fill='none' stroke='currentColor' stroke-width='1.3'><path d='M2 12V5a3 3 0 013-3h7'/><circle cx='6.5' cy='6.5' r='1.4' fill='currentColor' stroke='none'/></svg>";
  const GAL = {
    "富兰克林": { normal:[{k:"bedroom",label:"卧房",imgs:["https://files.catbox.moe/fxckjg.png","https://files.catbox.moe/78vrad.png","https://files.catbox.moe/089l4u.png"]},{k:"cabin",label:"船长室",imgs:["https://files.catbox.moe/dmbbqw.png","https://files.catbox.moe/2n7zq3.png","https://files.catbox.moe/cu6rt6.png"]},{k:"deck",label:"露天甲板",imgs:["https://files.catbox.moe/esm8b5.png","https://files.catbox.moe/7kj76m.png","https://files.catbox.moe/63rmxy.png"]},{k:"gala",label:"晚宴",imgs:["https://files.catbox.moe/fhtqxf.png","https://files.catbox.moe/sxyoz6.png","https://files.catbox.moe/en3ta9.png"]},{k:"mess",label:"军官起居室",imgs:["https://files.catbox.moe/aq1vnt.png","https://files.catbox.moe/ql2673.png","https://files.catbox.moe/p2ljng.png"]},{k:"tea",label:"品茶",imgs:["https://files.catbox.moe/hwiggv.png","https://files.catbox.moe/u2hj0u.png","https://files.catbox.moe/7w10qu.png"]},{k:"unwind",label:"闲憩",imgs:["https://files.catbox.moe/72d0l5.png","https://files.catbox.moe/eu7y5v.png","https://files.catbox.moe/wku8hi.png"]}], degrade:[["https://files.catbox.moe/vj4fly.png","https://files.catbox.moe/vuut5q.png","https://files.catbox.moe/e0o56f.png"],["https://files.catbox.moe/608w5r.png","https://files.catbox.moe/fc4p7m.png","https://files.catbox.moe/rcuaj9.png"],["https://files.catbox.moe/vnbjt5.png","https://files.catbox.moe/asz86u.png","https://files.catbox.moe/7wpxrm.png"]] },
    "克洛泽": { normal:[{k:"arctic",label:"北极",imgs:["https://files.catbox.moe/4uyoa8.png","https://files.catbox.moe/sjutd0.png","https://files.catbox.moe/xf1u9m.png"]},{k:"engine",label:"轮机舱",imgs:["https://files.catbox.moe/z6iwsk.png","https://files.catbox.moe/ptgd81.png","https://files.catbox.moe/omw2ey.png"]},{k:"gala",label:"晚宴",imgs:["https://files.catbox.moe/ezkvap.png","https://files.catbox.moe/5yafhr.png","https://files.catbox.moe/8fkbte.png"]},{k:"log",label:"航海志",imgs:["https://files.catbox.moe/az2lyy.png","https://files.catbox.moe/ehngjz.png","https://files.catbox.moe/g0p5ro.png"]},{k:"melancholy",label:"独酌",imgs:["https://files.catbox.moe/biz7iy.png","https://files.catbox.moe/kbeyi6.png","https://files.catbox.moe/1xh9e2.png"]},{k:"sled",label:"雪橇",imgs:["https://files.catbox.moe/64zkoz.png","https://files.catbox.moe/d6zhbf.png","https://files.catbox.moe/7cebjg.png"]},{k:"vigil",label:"守夜",imgs:["https://files.catbox.moe/b69xvu.png","https://files.catbox.moe/ymb45o.png","https://files.catbox.moe/0vp93c.png"]}], degrade:[["https://files.catbox.moe/ecputz.png","https://files.catbox.moe/7bptud.png","https://files.catbox.moe/k9z43q.png"],["https://files.catbox.moe/lqrfb7.png","https://files.catbox.moe/elv60c.png","https://files.catbox.moe/iz1r6t.png"],["https://files.catbox.moe/mry9lh.png","https://files.catbox.moe/pf58ui.png","https://files.catbox.moe/832l6z.png"]] },
    "菲茨": { normal:[{k:"battle",label:"战斗",imgs:["https://files.catbox.moe/chhtpp.png","https://files.catbox.moe/y3d7cr.png","https://files.catbox.moe/aullrc.png"]},{k:"bedroom",label:"卧房",imgs:["https://files.catbox.moe/be4d8p.png","https://files.catbox.moe/hzvm3m.png","https://files.catbox.moe/nrsn9g.png"]},{k:"bunny",label:"兔女郎",imgs:["https://files.catbox.moe/5lj83v.png","https://files.catbox.moe/ju67ba.png","https://files.catbox.moe/trye6m.png"]},{k:"dinner",label:"晚餐",imgs:["https://files.catbox.moe/ooe2dm.png","https://files.catbox.moe/n4zevh.png","https://files.catbox.moe/l5ci3u.png"]},{k:"gala",label:"晚宴",imgs:["https://files.catbox.moe/favgkj.png","https://files.catbox.moe/qxlhvb.png","https://files.catbox.moe/po1tfe.png"]},{k:"medal",label:"授勋",imgs:["https://files.catbox.moe/1pp23z.png","https://files.catbox.moe/pobbxq.png","https://files.catbox.moe/yx2jz3.png"]},{k:"portrait",label:"肖像",imgs:["https://files.catbox.moe/21xa7y.png","https://files.catbox.moe/wc9n7e.png","https://files.catbox.moe/wjy5bw.png"]}], degrade:[["https://files.catbox.moe/ulu24j.png","https://files.catbox.moe/1a7gej.png","https://files.catbox.moe/b8ocmm.png"],["https://files.catbox.moe/sm5fk7.png","https://files.catbox.moe/eutvq5.png","https://files.catbox.moe/us9z7a.png"],["https://files.catbox.moe/3ytbk0.png","https://files.catbox.moe/xvo9j8.png","https://files.catbox.moe/awnwpb.png"]] },
    "古德瑟": { normal:[{k:"cabin",label:"夜谈",imgs:["https://files.catbox.moe/6b34qo.png","https://files.catbox.moe/w54squ.png","https://files.catbox.moe/13p06t.png"]},{k:"deck",label:"速写",imgs:["https://files.catbox.moe/4md1hj.png","https://files.catbox.moe/8xa9os.png","https://files.catbox.moe/69t1ef.png"]},{k:"gala",label:"晚宴",imgs:["https://files.catbox.moe/y55gjq.png","https://files.catbox.moe/0wvxot.png","https://files.catbox.moe/89g4ru.png"]},{k:"investigate",label:"验铅",imgs:["https://files.catbox.moe/brb9ur.png","https://files.catbox.moe/273k0n.png","https://files.catbox.moe/mdjoqp.png"]},{k:"medbay",label:"医务室",imgs:["https://files.catbox.moe/ho0u3f.png","https://files.catbox.moe/ffpfjz.png","https://files.catbox.moe/x211k6.png"]},{k:"novel",label:"偷读",imgs:["https://files.catbox.moe/kssjfl.png","https://files.catbox.moe/cn1xrt.png","https://files.catbox.moe/c43ju5.png"]},{k:"specimen",label:"标本",imgs:["https://files.catbox.moe/lbegpu.png","https://files.catbox.moe/k8fb3f.png","https://files.catbox.moe/7fjkm4.png"]}], degrade:[["https://files.catbox.moe/7fwtfp.png","https://files.catbox.moe/2yh4d6.png","https://files.catbox.moe/fyq65o.png"],["https://files.catbox.moe/1qhlfd.png","https://files.catbox.moe/1fluq7.png","https://files.catbox.moe/cnk0va.png"],["https://files.catbox.moe/maxlza.png","https://files.catbox.moe/vzz5ku.png","https://files.catbox.moe/ywojo2.png"]] },
    "瑙雅": { normal:[{k:"festival",label:"祭典",imgs:["https://files.catbox.moe/ipuk2c.png","https://files.catbox.moe/rcxnkt.png","https://files.catbox.moe/75rxv8.png"]},{k:"hunt",label:"狩猎",imgs:["https://files.catbox.moe/jjou1w.png","https://files.catbox.moe/5ega5e.png","https://files.catbox.moe/6pkbcz.png"]},{k:"igloo",label:"冰屋",imgs:["https://files.catbox.moe/ocj0m2.png","https://files.catbox.moe/8esqk3.png","https://files.catbox.moe/4ian5g.png"]},{k:"shaman",label:"萨满",imgs:["https://files.catbox.moe/vri7mq.png","https://files.catbox.moe/pkd3cr.png","https://files.catbox.moe/y4k6t9.png"]},{k:"shelter",label:"庇护",imgs:["https://files.catbox.moe/7m1ncz.png","https://files.catbox.moe/y4dst3.png","https://files.catbox.moe/ym10c8.png"]},{k:"tent",label:"兽皮帐",imgs:["https://files.catbox.moe/szxrwr.png","https://files.catbox.moe/1db6wq.png","https://files.catbox.moe/blwv2w.png"]},{k:"tundra",label:"苔原",imgs:["https://files.catbox.moe/zp4vh9.png","https://files.catbox.moe/n6ue54.png","https://files.catbox.moe/vmis41.png"]}], degrade:[["https://files.catbox.moe/bcv2f8.png","https://files.catbox.moe/4a1svc.png","https://files.catbox.moe/trra0o.png"],["https://files.catbox.moe/vonwq2.png","https://files.catbox.moe/br3p15.png","https://files.catbox.moe/syy4us.png"],["https://files.catbox.moe/u7gql4.png","https://files.catbox.moe/9ijps7.png","https://files.catbox.moe/357y9n.png"]] },
    "茜拉": { normal:[{k:"butcher",label:"分肉",imgs:["https://files.catbox.moe/drb931.png","https://files.catbox.moe/u91y9x.png","https://files.catbox.moe/88ljq9.png"]},{k:"council",label:"议事",imgs:["https://files.catbox.moe/srod40.png","https://files.catbox.moe/rvdvho.png","https://files.catbox.moe/c4jaeu.png"]},{k:"healer",label:"医者",imgs:["https://files.catbox.moe/we0zeb.png","https://files.catbox.moe/ut4vys.png","https://files.catbox.moe/c6zrpn.png"]},{k:"igloo",label:"冰屋",imgs:["https://files.catbox.moe/rkbvjo.png","https://files.catbox.moe/hozxxz.png","https://files.catbox.moe/rzkayo.png"]},{k:"tent",label:"兽皮帐",imgs:["https://files.catbox.moe/7vqclx.png","https://files.catbox.moe/oyum2n.png","https://files.catbox.moe/w7ayhw.png"]},{k:"trade",label:"交易",imgs:["https://files.catbox.moe/5as2e3.png","https://files.catbox.moe/s0utxo.png","https://files.catbox.moe/nyygrh.png"]},{k:"tundra",label:"苔原",imgs:["https://files.catbox.moe/irmumo.png","https://files.catbox.moe/6zanpj.png","https://files.catbox.moe/vylnvw.png"]}], degrade:[["https://files.catbox.moe/f05m2i.png","https://files.catbox.moe/5gsbg5.png","https://files.catbox.moe/303lko.png"],["https://files.catbox.moe/pt19ug.png","https://files.catbox.moe/j7ivbl.png","https://files.catbox.moe/y6cz34.png"],["https://files.catbox.moe/dn9n1p.png","https://files.catbox.moe/hn7kti.png","https://files.catbox.moe/gky5du.png"]] },
  };
  const GEO={W:-131,E:-69,N:77,S:65};
  const COSLAT=Math.cos((GEO.N+GEO.S)/2*Math.PI/180);
  const MAPW=1000,MAPH=Math.round(MAPW*(GEO.N-GEO.S)/((GEO.E-GEO.W)*COSLAT));
  const MAPDW=Math.round(MAPW*1.15),MAPDH=Math.round(MAPH*1.15);
  const projX=lon=>(lon-GEO.W)/(GEO.E-GEO.W)*MAPW;
  const projY=lat=>(GEO.N-lat)/(GEO.N-GEO.S)*MAPH;
  const POI=[
    {key:'兰开斯特海峡',区:0,lon:-83.5,lat:74.1,type:'航道',阶段:'航行期',别名:['兰开斯特'],desc:'东向敞水航道, 探险队驶入未知的入口'},
    {key:'比奇岛',区:1,lon:-91.9,lat:74.72,type:'停泊',阶段:'过冬期',别名:['Beechey','比奇'],desc:'首个越冬地, 岸上留下三座水手坟茔'},
    {key:'维多利亚海峡',区:2,lon:-100.6,lat:69.7,type:'困冰',阶段:'困冰期',别名:['维多利亚'],desc:'终年浮冰封锁, 两船在此被永久困住'},
    {key:'威廉王岛',区:3,lon:-97.8,lat:69.3,type:'登陆',阶段:'弃船徒步',别名:['King William'],desc:'弃船登陆, 向南徒步求生的绝地'},
    {key:'因纽特营地',区:4,lon:-94.5,lat:69.5,type:'营地',阶段:'弃船徒步',别名:['涅齐里克'],desc:'涅齐里克人的季节性营地'},
  ];
  const POITYPE={
    航道:{ico:"<path d='M-8 -1c2.4-2.4 4.8-2.4 7.2 0M0.8 -1c2.4-2.4 4.8-2.4 7.2 0'/><path d='M-8 3c2.4-2.4 4.8-2.4 7.2 0M0.8 3c2.4-2.4 4.8-2.4 7.2 0'/>"},
    停泊:{ico:"<circle cx='0' cy='-6.5' r='2.1'/><path d='M0 -4.4V7'/><path d='M-3.4 -2h6.8'/><path d='M-5.5 3.2a5.5 5.5 0 0 0 11 0'/><path d='M-5.5 3.2l-2.2 .9M5.5 3.2l2.2 .9'/>"},
    困冰:{ico:"<path d='M0 -8V8M-6.9 -4L6.9 4M6.9 -4L-6.9 4'/>"},
    登陆:{ico:"<path d='M-3.5 8V-8'/><path d='M-3.5 -8h9.5l-2.6 3.1 2.6 3.1h-9.5'/>"},
    营地:{ico:"<path d='M0 -8L8 7H-8Z'/><path d='M0 -8V7'/>"},
  };
  const SHIPICO="<path d='M-8 2h16l-2.6 5H-5.4Z'/><path d='M0 2V-9'/><path d='M0.5 -9l6 5.5H0.5Z'/>";
  const ROOMICO={
    deck:"<circle r='6'/><path d='M0 -9v3M0 6v3M-9 0h3M6 0h3M-6.4 -6.4l2.1 2.1M4.3 4.3l2.1 2.1M-6.4 6.4l2.1-2.1M4.3 -4.3l2.1-2.1'/>",
    berth:"<rect x='-8' y='-1' width='16' height='7' rx='1.5'/><path d='M-8 -1v-3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3'/>",
    galley:"<path d='M-6 -1h12v4a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z'/><path d='M-7 -1h14'/><path d='M-8 -3.5l1.4 2.5M8 -3.5l-1.4 2.5'/>",
    sick:"<circle r='7.5'/><path d='M0 -4v8M-4 0h8'/>",
    officer:"<path d='M0 -5.5c-2-1.3-5-1.7-8-.8v9.6c3-.9 6-.5 8 .8c2-1.3 5-1.7 8-.8v-9.6c-3-.9-6-.5-8 .8Z'/><path d='M0 -5.5v9.6'/>",
    engine:"<circle r='3'/><path d='M0 -8v2.6M0 5.4V8M-8 0h2.6M5.4 0H8M-5.7 -5.7l1.8 1.8M3.9 3.9l1.8 1.8M-5.7 5.7l1.8-1.8M3.9 -3.9l1.8-1.8'/>",
    captain:"<circle r='7.5'/><path d='M3.8 -3.8l-1.9 4.1-4.1 1.9 1.9-4.1z'/>",
    storage:"<rect x='-7.5' y='-6' width='15' height='12' rx='1'/><path d='M-7.5 0h15M0 -6v12'/>",
    hold:"<circle cy='-5.5' r='2'/><path d='M0 -3.5V7'/><path d='M-5.5 1.5a5.5 5.5 0 0 0 11 0'/><path d='M-7 -1.2h14'/>",
  };
  const SHIP_W=MAPW, SHIP_H=MAPH;
  const SHIP_PW=594, SHIP_PH=1000;
  const SHIP_ROOMS=[
    {key:'露天甲板',type:'deck',cx:500,cy:58,px:297,py:110,
      desc:'掌舵、瞭望、升降帆缆、收放小艇之处。船尾后甲板是军官发号施令、周日礼拜与集会之地，过冬时整层加盖帆布顶棚保暖，兼作活动与排戏的场地',
      crew:'值更水手、瞭望员、水手长；航海长与冰区领航员在此定向，船长常立于后甲板',
      别名:['甲板','后甲板','舵舱','操舵','瞭望台','前甲板']},
    {key:'下层甲板',type:'berth',cx:189,cy:198,px:175,py:310,
      desc:'船首方向的下层空间，水手的居所。夜里挂吊床安睡，白天收起、支起餐桌分食，角落常备一架手摇风琴供闲时取乐',
      crew:'普通水手、学徒帮工、海军陆战队员',
      别名:['水手舱','水手起居舱','吊床舱']},
    {key:'厨房',type:'galley',cx:428,cy:198,px:419,py:310,
      desc:'全船的炉灶所在，一台大铁炉既煮三餐、又融冰取水，并通过暖气管道为各舱送暖，是过冬时最要紧的一处',
      crew:'厨子及其下手；学徒帮工常被差来添柴、搬运、刷洗',
      别名:['炉灶','伙房']},
    {key:'医务室',type:'sick',cx:617,cy:198,px:175,py:450,
      desc:'诊治伤病、存放药品器械之处，过冬时坏血病与冻伤的病号多聚于此',
      crew:'船医，伤病的船员',
      别名:['病舱','药房']},
    {key:'军官起居室与军官舱',type:'officer',cx:828,cy:198,px:419,py:450,
      desc:'船尾一带的军官生活区。起居室供军官用餐、议事、消遣，备有上千册藏书与海图仪器；两侧是执行官、航海长、船医、事务长等人的独立小舱',
      crew:'各级女性军官',
      别名:['军官厅','军官起居室','军官舱','军官区','起居室']},
    {key:'轮机舱与锅炉房',type:'engine',cx:428,cy:339,px:175,py:650,
      desc:'船的深处，放着蒸汽机和锅炉，旁边就是煤舱。机器一开，舱里又闷又热又吵，和外面的严寒完全两样',
      crew:'轮机长与司炉',
      别名:['引擎室','轮机舱','锅炉房','机舱']},
    {key:'船长室',type:'captain',cx:828,cy:339,px:419,py:650,
      desc:'位于船尾的宽敞舱室，船长在这里起居、办公、铺开海图议事，是全船最体面的房间',
      crew:'船长独居，副手与军官受召前来议事',
      别名:['船长舱']},
    {key:'储藏甲板',type:'storage',cx:333,cy:479,px:175,py:850,
      desc:'最底层的储物舱，堆放够吃几年的口粮：成箱的锡焊罐头、腌肉、饼干、面粉和桶装烈酒，由事务长清点看管',
      crew:'事务长，奉命取货的水手与学徒帮工',
      别名:['储藏室','储物舱']},
    {key:'舱底',type:'hold',cx:689,cy:479,px:419,py:850,
      desc:'船的最底部，放着压舱物、淡水柜和煤舱；以前炸弹船的火药库也在这里，现在主要用来存放东西。又暗又潮又冷',
      crew:'平日少有人至，搬运或检修时才下去',
      别名:[]},
  ];
  const REGIONS=[
    {key:'兰开斯特水道',idx:0,poly:[[-89,77],[-69,77],[-69,72],[-89,72.6]],labelAt:[-78,74.2]},
    {key:'比奇越冬海域',idx:1,poly:[[-101,77],[-89,77],[-89,72.6],[-95,72],[-101,72.3]],labelAt:[-95,74.8]},
    {key:'维多利亚困冰区',idx:2,poly:[[-111,77],[-101,77],[-101,72.3],[-99.5,72],[-99.5,68.5],[-104,68],[-111,68.78]],labelAt:[-105,73.5]},
    {key:'威廉王岛',idx:3,poly:[[-99.5,70],[-95.5,70],[-95,68],[-98.8,67.6],[-99.5,68.5]],labelAt:[-97.4,69.0]},
    {key:'因纽特营地与南岸',idx:4,poly:[[-131,65],[-69,65],[-69,72],[-89,72.6],[-95,72],[-101,72.3],[-99.5,72],[-99.5,70],[-95.5,70],[-95,68],[-98.8,67.6],[-99.5,68.5],[-104,68],[-113,69],[-131,70.5]],labelAt:[-88,67.5]},
    {key:'西北航道',idx:5,poly:[[-131,77],[-111,77],[-111,68.78],[-113,69],[-131,70.5]],labelAt:[-121,73.5]},
  ];
  const REGION_ALIAS={'兰开斯特水道':0,'兰开斯特':0,'兰开斯特海峡':0,'比奇越冬海域':1,'比奇':1,'比奇岛':1,'维多利亚困冰区':2,'维多利亚':2,'维多利亚海峡':2,'困冰':2,'威廉王岛':3,'威廉王':3,'威廉':3,'因纽特营地与南岸':4,'因纽特':4,'南岸':4,'南方':4,'涅齐里克':4,'西北航道':5,'西北':5};
  function regionIdxOf(loc){const s=((loc||'').split('／')[0]||'').trim();if(s){if(REGION_ALIAS[s]!=null)return REGION_ALIAS[s];for(const k in REGION_ALIAS)if(s.includes(k))return REGION_ALIAS[k];}const p=poiOf(loc);if(p&&p.区!=null)return p.区;return 0;}
  const COAST=[[[[-86.59,71.01],[-86.55,70.99],[-86.32,71.02],[-85.64,71.15],[-85.09,71.15],[-85.0,71.14],[-85.07,71.08],[-84.99,71.03],[-84.87,71.0],[-84.82,71.03],[-84.66,71.51],[-84.66,71.59],[-84.7,71.63],[-85.34,71.7],[-85.6,71.87],[-85.91,71.99],[-85.55,72.1],[-85.41,72.21],[-85.32,72.23],[-85.02,72.22],[-84.28,72.04],[-84.35,72.09],[-84.64,72.19],[-84.84,72.31],[-84.62,72.38],[-84.85,72.41],[-85.16,72.38],[-85.34,72.42],[-85.62,72.6],[-85.65,72.72],[-85.64,72.77],[-85.57,72.86],[-85.45,72.93],[-85.26,72.95],[-84.26,72.8],[-84.27,72.84],[-85.38,73.05],[-85.45,73.11],[-85.02,73.34],[-84.62,73.39],[-84.42,73.46],[-84.09,73.46],[-83.78,73.42],[-83.91,73.51],[-83.73,73.58],[-82.84,73.72],[-82.2,73.74],[-81.61,73.7],[-81.41,73.63],[-81.24,73.48],[-81.15,73.31],[-81.03,73.25],[-80.82,73.21],[-80.6,73.12],[-80.58,73.06],[-80.62,73.0],[-80.59,72.93],[-80.43,72.82],[-80.28,72.77],[-80.32,72.72],[-81.23,72.31],[-81.24,72.28],[-80.76,72.46],[-80.61,72.45],[-80.6,72.43],[-80.7,72.34],[-80.94,72.21],[-80.69,72.1],[-80.92,72.07],[-80.95,71.92],[-80.93,71.91],[-80.8,71.93],[-80.39,72.15],[-80.18,72.21],[-79.88,72.18],[-80.11,72.33],[-80.04,72.39],[-79.83,72.45],[-79.58,72.31],[-79.43,72.34],[-79.32,72.39],[-79.0,72.27],[-79.01,72.04],[-78.78,71.93],[-78.59,71.88],[-78.86,72.1],[-78.82,72.27],[-78.7,72.35],[-78.43,72.28],[-78.12,72.28],[-77.73,72.18],[-77.52,72.18],[-77.54,72.22],[-78.29,72.36],[-78.48,72.47],[-78.42,72.57],[-77.75,72.72],[-76.89,72.72],[-76.19,72.57],[-75.7,72.57],[-75.29,72.48],[-75.12,72.38],[-75.04,72.27],[-75.05,72.23],[-75.39,72.04],[-75.54,72.01],[-75.92,71.72],[-75.82,71.75],[-75.6,71.92],[-75.15,72.06],[-74.69,72.1],[-74.27,72.04],[-74.21,71.98],[-74.21,71.94],[-74.32,71.84],[-74.89,71.73],[-75.2,71.71],[-74.96,71.67],[-74.7,71.68],[-74.83,71.57],[-74.87,71.5],[-74.84,71.41],[-75.04,71.23],[-75.0,71.22],[-74.76,71.34],[-74.6,71.58],[-74.49,71.65],[-74.14,71.68],[-73.87,71.77],[-73.71,71.75],[-73.71,71.72],[-74.2,71.4],[-74.06,71.43],[-73.71,71.59],[-73.48,71.48],[-73.4,71.37],[-73.18,71.28],[-73.19,71.35],[-73.31,71.48],[-73.28,71.54],[-72.9,71.68],[-72.58,71.61],[-71.88,71.56],[-71.46,71.46],[-71.23,71.34],[-71.19,71.28],[-71.22,71.24],[-71.5,71.11],[-71.94,71.09],[-72.63,70.83],[-72.31,70.83],[-72.01,71.01],[-71.74,71.05],[-71.37,70.98],[-71.19,70.98],[-70.83,71.11],[-70.67,71.05],[-70.64,71.01],[-70.64,70.9],[-70.76,70.79],[-71.02,70.67],[-71.59,70.57],[-71.89,70.43],[-71.73,70.4],[-71.56,70.51],[-71.43,70.55],[-71.28,70.5],[-71.28,70.43],[-71.43,70.13],[-71.31,70.21],[-70.98,70.58],[-70.56,70.74],[-69.95,70.85],[-69.8,70.83],[-69.7,70.79],[-69.29,70.78],[-69.0,70.71],[-69.0,70.3],[-69.44,70.25],[-70.06,70.07],[-70.06,70.04],[-69.91,70.03],[-69.48,70.16],[-69.0,70.2],[-69.0,69.6],[-69.23,69.55],[-69.25,69.51],[-69.0,69.53],[-69.0,69.11],[-69.04,69.1],[-69.0,69.08],[-69.0,68.85],[-69.34,68.87],[-69.0,68.79],[-69.0,65.0],[-78.03,65.0],[-77.88,65.07],[-77.36,65.2],[-77.46,65.36],[-77.33,65.45],[-77.25,65.46],[-76.48,65.37],[-76.07,65.29],[-75.83,65.23],[-75.65,65.14],[-75.52,65.06],[-75.51,65.0],[-75.36,65.0],[-75.45,65.1],[-75.77,65.26],[-75.8,65.3],[-75.71,65.32],[-75.17,65.28],[-74.98,65.38],[-74.49,65.37],[-74.24,65.48],[-73.99,65.52],[-73.55,65.49],[-73.56,65.54],[-73.75,65.77],[-74.03,65.88],[-74.28,66.01],[-74.4,66.1],[-74.43,66.14],[-74.42,66.17],[-74.37,66.21],[-73.58,66.51],[-73.28,66.67],[-73.03,66.73],[-72.99,66.77],[-72.95,66.88],[-72.79,67.03],[-72.36,67.13],[-72.22,67.25],[-72.35,67.34],[-72.58,67.66],[-72.73,67.81],[-73.06,68.11],[-73.33,68.27],[-73.33,68.31],[-73.28,68.36],[-73.64,68.29],[-73.82,68.36],[-73.88,68.43],[-73.78,68.58],[-73.82,68.69],[-74.12,68.7],[-73.97,68.58],[-73.99,68.55],[-74.27,68.54],[-74.42,68.58],[-74.65,68.71],[-74.7,68.76],[-74.7,68.81],[-74.89,68.81],[-74.91,68.82],[-74.74,68.91],[-74.95,68.96],[-74.72,69.05],[-74.85,69.07],[-75.21,68.91],[-75.52,68.95],[-75.62,68.89],[-76.23,68.73],[-76.4,68.69],[-76.59,68.7],[-76.62,68.72],[-76.62,68.76],[-76.57,68.85],[-76.59,68.97],[-76.56,69.01],[-76.38,69.05],[-76.09,69.03],[-75.86,69.06],[-75.67,69.16],[-75.65,69.21],[-75.75,69.3],[-76.46,69.47],[-76.52,69.52],[-76.52,69.59],[-76.23,69.66],[-76.51,69.68],[-76.74,69.57],[-77.09,69.64],[-77.13,69.65],[-77.11,69.67],[-76.87,69.75],[-76.86,69.78],[-77.02,69.84],[-77.59,69.85],[-77.77,70.24],[-78.28,70.23],[-78.62,70.35],[-78.98,70.58],[-79.07,70.6],[-79.16,70.58],[-79.35,70.48],[-79.41,70.4],[-79.02,70.33],[-78.93,70.29],[-78.81,70.18],[-78.78,70.05],[-78.82,70.01],[-79.09,69.93],[-79.52,69.89],[-80.67,70.05],[-81.56,70.11],[-81.65,70.09],[-81.33,70.02],[-81.02,69.9],[-80.84,69.79],[-80.92,69.73],[-81.56,69.94],[-82.29,69.84],[-83.15,70.01],[-83.86,69.96],[-84.52,70.01],[-84.91,70.08],[-85.43,70.11],[-85.78,70.04],[-86.32,70.15],[-86.48,70.29],[-86.5,70.35],[-86.4,70.47],[-86.7,70.39],[-87.12,70.41],[-87.17,70.4],[-87.06,70.33],[-87.62,70.32],[-87.84,70.25],[-88.4,70.44],[-88.85,70.52],[-89.21,70.76],[-89.37,71.0],[-89.46,71.06],[-88.7,71.05],[-87.84,70.94],[-87.18,70.99],[-87.14,71.01],[-87.87,71.21],[-89.08,71.29],[-89.69,71.42],[-89.85,71.49],[-90.03,71.95],[-89.93,72.05],[-89.66,72.18],[-89.82,72.21],[-89.86,72.25],[-89.86,72.41],[-89.7,72.57],[-89.36,72.8],[-89.29,73.02],[-89.23,73.11],[-88.98,73.25],[-88.76,73.31],[-88.71,73.4],[-87.72,73.72],[-86.41,73.85],[-85.11,73.81],[-85.01,73.78],[-84.95,73.72],[-84.97,73.69],[-85.68,73.46],[-86.09,73.26],[-86.63,72.87],[-86.67,72.76],[-86.59,72.66],[-86.32,72.46],[-86.34,72.12],[-86.22,71.9],[-86.04,71.77],[-85.08,71.4],[-85.02,71.35],[-85.41,71.23],[-85.95,71.16]]],[[[-79.3,77.0],[-79.32,76.98],[-79.22,76.94],[-78.79,76.88],[-78.46,76.97],[-78.29,76.98],[-78.0,76.85],[-77.98,76.75],[-78.12,76.64],[-78.28,76.57],[-79.51,76.31],[-80.69,76.18],[-80.96,76.18],[-81.0,76.21],[-80.83,76.37],[-80.83,76.41],[-80.97,76.47],[-81.17,76.51],[-81.72,76.49],[-82.03,76.63],[-82.31,76.66],[-82.53,76.72],[-82.26,76.57],[-82.21,76.51],[-82.23,76.47],[-83.89,76.45],[-83.99,76.5],[-84.22,76.68],[-84.28,76.36],[-85.14,76.3],[-85.68,76.35],[-86.12,76.43],[-86.3,76.49],[-86.45,76.58],[-86.56,76.52],[-86.68,76.38],[-87.35,76.45],[-87.49,76.59],[-87.5,76.39],[-88.4,76.41],[-88.48,76.58],[-88.5,76.77],[-88.61,76.65],[-88.55,76.42],[-89.57,76.49],[-89.5,76.83],[-88.75,77.0]]],[[[-94.31,71.76],[-93.81,71.77],[-93.75,71.74],[-93.78,71.67],[-93.76,71.64],[-93.26,71.46],[-93.03,71.34],[-92.95,71.26],[-92.88,71.07],[-92.9,70.92],[-92.98,70.85],[-92.36,70.63],[-92.21,70.49],[-92.05,70.39],[-92.07,70.32],[-92.05,70.3],[-91.98,70.29],[-91.82,70.34],[-91.76,70.33],[-91.56,70.18],[-91.62,70.15],[-91.86,70.13],[-92.12,70.17],[-92.32,70.24],[-92.51,70.1],[-92.13,70.08],[-91.98,70.04],[-92.89,69.67],[-92.31,69.67],[-92.23,69.65],[-92.26,69.63],[-92.21,69.6],[-91.91,69.53],[-91.72,69.55],[-91.38,69.65],[-91.2,69.64],[-91.15,69.64],[-91.17,69.62],[-91.44,69.53],[-90.67,69.52],[-90.42,69.46],[-90.68,69.43],[-90.79,69.35],[-90.82,69.29],[-90.89,69.27],[-91.0,69.28],[-91.06,69.32],[-91.24,69.29],[-90.74,69.11],[-90.48,68.88],[-90.54,68.82],[-90.51,68.69],[-90.57,68.47],[-90.25,68.27],[-90.17,68.27],[-89.9,68.49],[-89.88,68.63],[-89.78,68.74],[-89.67,69.01],[-89.28,69.26],[-89.06,69.27],[-88.04,68.81],[-87.83,68.45],[-87.83,68.3],[-87.89,68.25],[-87.99,68.24],[-88.11,68.25],[-88.24,68.34],[-88.35,68.29],[-88.31,67.95],[-88.2,67.77],[-87.5,67.36],[-87.42,67.21],[-87.36,67.18],[-87.27,67.18],[-86.92,67.36],[-86.56,67.48],[-86.48,67.71],[-86.4,67.8],[-85.95,68.07],[-85.73,68.45],[-85.74,68.58],[-85.69,68.67],[-85.49,68.77],[-85.28,68.74],[-84.87,68.77],[-85.11,68.84],[-85.08,68.91],[-84.92,68.96],[-84.86,69.07],[-85.11,69.17],[-85.28,69.17],[-85.39,69.23],[-85.43,69.35],[-85.4,69.43],[-85.44,69.49],[-85.42,69.55],[-85.5,69.65],[-85.45,69.78],[-85.53,69.84],[-85.51,69.85],[-85.02,69.8],[-84.65,69.85],[-84.32,69.84],[-83.67,69.7],[-82.62,69.69],[-82.37,69.64],[-82.39,69.6],[-82.5,69.53],[-82.75,69.49],[-82.31,69.41],[-82.21,69.3],[-82.25,69.26],[-82.23,69.25],[-81.95,69.28],[-81.73,69.26],[-81.41,69.2],[-81.32,69.14],[-81.61,69.0],[-81.95,68.91],[-81.96,68.88],[-81.38,68.85],[-81.26,68.78],[-81.28,68.66],[-81.53,68.56],[-81.91,68.46],[-82.21,68.51],[-82.5,68.48],[-82.55,68.45],[-82.41,68.36],[-82.39,68.34],[-82.42,68.3],[-82.22,68.15],[-82.15,68.14],[-82.01,68.19],[-82.1,68.02],[-82.06,67.93],[-81.87,67.8],[-81.41,67.6],[-81.29,67.5],[-81.27,67.46],[-81.39,67.19],[-81.47,67.07],[-81.63,67.0],[-81.93,66.97],[-82.2,66.76],[-82.64,66.59],[-82.95,66.55],[-83.3,66.39],[-83.52,66.37],[-83.59,66.39],[-83.65,66.48],[-84.0,66.73],[-84.21,66.74],[-84.37,66.81],[-84.27,66.84],[-84.54,66.97],[-84.85,67.03],[-85.04,66.96],[-85.11,66.89],[-85.02,66.87],[-84.86,66.94],[-84.64,66.9],[-84.22,66.68],[-83.8,66.24],[-83.91,66.21],[-84.32,66.29],[-84.48,66.18],[-85.1,66.33],[-85.44,66.54],[-85.6,66.57],[-86.06,66.52],[-86.71,66.52],[-86.74,66.51],[-86.69,66.46],[-86.75,66.42],[-86.69,66.36],[-86.11,66.23],[-86.0,66.19],[-85.96,66.12],[-86.04,66.02],[-87.08,65.44],[-87.29,65.35],[-87.45,65.34],[-87.97,65.35],[-88.67,65.61],[-88.74,65.68],[-89.09,65.74],[-89.42,65.86],[-89.75,65.94],[-89.94,65.93],[-89.85,65.87],[-89.89,65.87],[-90.32,65.93],[-91.41,65.96],[-91.04,65.83],[-91.06,65.9],[-90.98,65.92],[-89.92,65.78],[-89.6,65.65],[-89.24,65.45],[-88.97,65.35],[-87.11,65.22],[-87.03,65.2],[-87.0,65.11],[-87.1,65.0],[-131.0,65.0],[-131.0,70.01],[-130.67,70.13],[-130.5,70.14],[-130.17,70.09],[-129.94,70.09],[-129.68,70.19],[-129.54,70.11],[-129.54,70.07],[-129.65,70.0],[-130.83,69.65],[-131.0,69.63],[-130.97,69.21],[-130.88,69.32],[-130.66,69.48],[-130.35,69.66],[-129.57,69.83],[-129.11,69.88],[-128.9,69.97],[-128.94,69.88],[-129.14,69.83],[-129.16,69.8],[-129.1,69.72],[-128.97,69.71],[-128.39,69.96],[-128.28,70.11],[-127.76,70.22],[-127.68,70.26],[-127.97,70.29],[-128.04,70.33],[-127.99,70.36],[-128.17,70.42],[-128.17,70.48],[-128.13,70.52],[-127.99,70.57],[-127.75,70.52],[-127.23,70.3],[-126.93,70.06],[-126.68,69.78],[-126.25,69.55],[-125.91,69.42],[-125.52,69.35],[-125.39,69.35],[-125.17,69.43],[-125.17,69.48],[-125.36,69.63],[-125.35,69.66],[-125.22,69.73],[-125.2,69.83],[-125.08,69.82],[-124.77,69.99],[-124.99,70.03],[-124.56,70.15],[-124.44,70.11],[-124.47,69.92],[-124.41,69.77],[-124.12,69.69],[-124.14,69.65],[-124.48,69.43],[-124.43,69.38],[-124.34,69.36],[-123.53,69.39],[-123.36,69.5],[-123.21,69.54],[-123.11,69.74],[-123.03,69.81],[-122.07,69.82],[-121.53,69.78],[-120.96,69.66],[-120.14,69.38],[-118.87,69.26],[-118.1,69.04],[-117.23,68.91],[-116.06,68.84],[-116.24,68.97],[-115.63,68.97],[-114.62,68.75],[-114.22,68.55],[-114.09,68.44],[-113.96,68.4],[-114.02,68.31],[-114.1,68.27],[-114.77,68.27],[-114.85,68.2],[-115.13,68.13],[-115.19,68.08],[-115.17,68.02],[-115.43,67.9],[-115.13,67.82],[-114.66,67.8],[-114.27,67.73],[-112.5,67.68],[-112.24,67.73],[-111.58,67.76],[-111.19,67.82],[-110.99,67.79],[-110.37,67.95],[-110.22,67.95],[-110.07,67.99],[-109.94,67.89],[-109.83,67.87],[-109.63,67.73],[-109.22,67.73],[-109.04,67.69],[-108.95,67.49],[-108.85,67.42],[-108.72,67.58],[-108.61,67.6],[-108.49,67.48],[-108.35,67.4],[-107.99,67.26],[-107.91,67.16],[-107.99,67.1],[-108.22,67.05],[-108.5,67.09],[-107.76,66.68],[-107.48,66.49],[-107.26,66.4],[-107.71,66.74],[-107.75,66.96],[-107.63,67.0],[-107.5,66.94],[-107.4,66.95],[-107.16,66.88],[-107.35,67.05],[-107.28,67.1],[-107.57,67.27],[-107.64,67.38],[-107.65,67.51],[-107.95,67.7],[-107.96,67.82],[-107.76,67.91],[-107.73,67.96],[-107.8,68.04],[-106.92,68.11],[-106.79,68.14],[-106.67,68.22],[-106.42,68.2],[-106.4,68.32],[-106.27,68.38],[-105.93,68.44],[-105.78,68.53],[-105.75,68.59],[-105.93,68.64],[-106.46,68.52],[-106.54,68.46],[-106.61,68.36],[-106.85,68.39],[-107.15,68.3],[-107.3,68.3],[-107.62,68.33],[-107.74,68.29],[-107.68,68.2],[-107.73,68.17],[-108.26,68.15],[-108.72,68.3],[-108.31,68.61],[-107.44,68.69],[-106.16,68.92],[-105.69,68.83],[-105.54,68.72],[-105.46,68.58],[-105.43,68.46],[-105.38,68.41],[-105.1,68.3],[-104.96,68.31],[-104.91,68.25],[-104.65,68.23],[-104.66,68.15],[-104.49,68.06],[-104.19,68.03],[-103.9,68.04],[-103.47,68.12],[-102.84,67.85],[-102.32,67.74],[-101.88,67.75],[-101.55,67.69],[-100.46,67.84],[-99.77,67.81],[-99.15,67.72],[-98.92,67.73],[-98.41,67.81],[-98.7,67.97],[-98.72,68.04],[-98.63,68.07],[-98.41,67.99],[-97.93,67.71],[-97.45,67.62],[-97.16,67.73],[-97.14,67.8],[-97.21,67.86],[-97.55,67.96],[-97.74,67.98],[-98.11,67.9],[-98.19,67.92],[-98.5,68.12],[-98.38,68.13],[-98.65,68.36],[-98.47,68.38],[-98.22,68.32],[-97.79,68.39],[-97.91,68.45],[-97.93,68.52],[-97.83,68.53],[-97.55,68.47],[-97.41,68.5],[-97.27,68.45],[-96.98,68.26],[-96.63,68.25],[-96.43,68.31],[-96.72,68.04],[-96.53,68.06],[-96.44,68.15],[-95.97,68.25],[-96.04,68.16],[-96.2,67.72],[-96.37,67.55],[-96.37,67.51],[-96.19,67.38],[-96.14,67.27],[-95.72,67.32],[-95.7,67.3],[-95.78,67.18],[-95.56,67.22],[-95.42,67.16],[-95.42,67.01],[-95.5,66.98],[-95.77,66.97],[-96.02,67.02],[-96.22,67.0],[-96.35,67.07],[-96.42,67.05],[-96.36,66.99],[-95.89,66.74],[-95.81,66.69],[-95.79,66.62],[-95.74,66.69],[-96.02,66.87],[-96.04,66.94],[-95.63,66.92],[-95.4,66.95],[-95.35,66.98],[-95.32,67.15],[-95.26,67.26],[-95.46,67.61],[-95.65,67.74],[-95.46,68.02],[-95.13,68.08],[-94.86,68.04],[-94.74,68.07],[-93.93,68.47],[-93.45,68.62],[-93.64,68.63],[-93.68,68.69],[-93.68,68.89],[-93.77,68.97],[-93.85,69.0],[-93.9,68.98],[-93.99,68.82],[-94.06,68.78],[-94.48,68.74],[-94.6,68.8],[-94.56,68.91],[-94.08,69.12],[-94.26,69.15],[-94.28,69.24],[-94.25,69.31],[-93.62,69.42],[-93.82,69.25],[-93.75,69.23],[-93.43,69.38],[-93.54,69.38],[-93.53,69.48],[-93.65,69.52],[-94.02,69.45],[-94.27,69.46],[-94.63,69.65],[-94.71,69.65],[-94.82,69.58],[-96.05,69.83],[-96.49,70.12],[-96.55,70.21],[-96.55,70.33],[-96.23,70.54],[-96.05,70.57],[-95.88,70.55],[-95.99,70.62],[-95.89,70.69],[-96.19,70.64],[-96.36,70.68],[-96.55,70.81],[-96.55,70.89],[-96.47,71.07],[-96.52,71.13],[-96.42,71.18],[-96.45,71.24],[-96.41,71.27],[-96.06,71.41],[-95.73,71.33],[-95.56,71.34],[-95.41,71.49],[-95.77,71.51],[-95.87,71.57],[-95.62,71.69],[-95.51,71.78],[-95.2,71.9],[-94.73,71.98],[-94.56,71.98],[-94.49,71.92],[-94.48,71.85]]],[[[-73.62,67.78],[-74.48,67.8],[-74.57,67.83],[-74.68,67.91],[-74.75,68.02],[-74.71,68.07],[-74.38,68.09],[-73.49,68.0],[-73.44,67.97],[-73.41,67.79]]],[[[-93.54,75.03],[-93.48,74.95],[-93.46,74.86],[-93.57,74.67],[-94.53,74.64],[-94.8,74.66],[-95.29,74.79],[-95.87,74.83],[-96.09,74.93],[-96.18,74.95],[-96.27,74.92],[-96.39,75.0],[-96.56,74.99],[-96.6,75.03],[-96.57,75.1],[-96.38,75.21],[-96.18,75.24],[-96.12,75.3],[-96.12,75.36],[-95.95,75.44],[-95.67,75.53],[-94.88,75.63],[-94.43,75.59],[-93.91,75.42],[-93.75,75.35],[-93.5,75.14]]],[[[-118.33,75.58],[-118.61,75.52],[-118.82,75.52],[-119.39,75.62],[-118.63,75.91],[-118.14,75.99],[-117.75,76.11],[-117.63,76.12],[-117.5,76.08],[-117.63,75.97],[-118.23,75.61]]],[[[-105.29,72.92],[-105.43,72.94],[-106.07,73.2],[-106.18,73.3],[-106.53,73.41],[-106.92,73.48],[-106.95,73.51],[-106.83,73.6],[-106.61,73.7],[-105.51,73.77],[-105.11,73.74],[-104.65,73.61],[-104.56,73.54],[-104.58,73.35],[-104.62,73.31],[-104.79,73.17],[-104.97,73.09],[-105.0,73.04]]],[[[-100.0,73.95],[-99.16,73.73],[-97.67,73.89],[-97.33,73.86],[-97.11,73.79],[-97.0,73.67],[-97.16,73.59],[-97.49,73.53],[-97.6,73.54],[-97.63,73.5],[-97.59,73.47],[-97.35,73.48],[-97.23,73.42],[-97.27,73.39],[-97.8,73.29],[-98.38,73.04],[-98.44,73.0],[-98.43,72.96],[-98.37,72.93],[-97.94,73.04],[-97.64,73.03],[-97.33,72.94],[-97.3,72.92],[-97.38,72.86],[-97.08,72.76],[-97.07,72.72],[-97.16,72.64],[-97.13,72.63],[-96.67,72.71],[-96.54,72.7],[-96.45,72.55],[-96.47,72.43],[-96.64,72.34],[-96.8,72.32],[-96.67,72.27],[-96.59,72.2],[-96.62,72.15],[-96.77,72.05],[-96.62,71.97],[-96.61,71.83],[-96.95,71.79],[-97.22,71.67],[-97.58,71.63],[-98.18,71.66],[-98.28,71.72],[-98.32,71.85],[-98.46,71.77],[-98.23,71.56],[-98.2,71.44],[-98.41,71.35],[-98.66,71.3],[-98.99,71.37],[-99.17,71.37],[-99.28,71.42],[-99.4,71.56],[-99.73,71.76],[-100.33,72.0],[-100.59,72.15],[-100.98,72.21],[-101.21,72.32],[-101.5,72.28],[-101.72,72.31],[-101.97,72.49],[-102.4,72.59],[-102.66,72.72],[-102.71,72.78],[-102.55,72.98],[-102.34,73.06],[-102.2,73.08],[-101.92,73.06],[-101.75,72.94],[-101.54,72.88],[-101.27,72.72],[-101.09,72.71],[-100.48,72.77],[-100.44,72.81],[-100.4,72.98],[-100.23,72.9],[-100.13,72.91],[-100.1,72.96],[-100.24,73.1],[-100.53,73.14],[-100.54,73.2],[-100.44,73.25],[-100.34,73.27],[-100.07,73.21],[-99.83,73.21],[-100.01,73.24],[-100.37,73.36],[-100.59,73.3],[-100.89,73.28],[-101.45,73.43],[-101.52,73.49],[-101.32,73.57],[-100.98,73.6],[-100.52,73.45],[-100.54,73.51],[-100.61,73.58],[-100.78,73.61],[-100.95,73.69],[-100.98,73.73],[-100.96,73.79],[-100.48,73.84],[-99.99,73.8],[-99.91,73.85],[-100.15,73.84],[-100.23,73.89]]],[[[-84.92,65.26],[-84.84,65.26],[-84.61,65.45],[-84.5,65.46],[-84.27,65.37],[-84.08,65.22],[-83.49,65.13],[-83.27,65.0],[-86.19,65.0],[-86.11,65.42],[-86.02,65.64],[-85.81,65.83],[-85.52,65.91],[-85.44,65.85],[-85.24,65.8],[-85.18,65.75],[-85.11,65.62],[-85.24,65.51],[-85.06,65.44]]],[[[-75.68,68.32],[-75.15,68.23],[-75.08,68.17],[-75.06,68.08],[-75.13,67.97],[-75.09,67.63],[-75.13,67.54],[-75.2,67.46],[-75.4,67.37],[-75.78,67.28],[-76.69,67.24],[-77.0,67.27],[-77.22,67.51],[-77.31,67.71],[-77.23,67.85],[-76.74,68.23],[-76.36,68.32]]],[[[-79.54,73.65],[-78.29,73.67],[-77.21,73.5],[-77.01,73.36],[-76.76,73.31],[-76.57,73.16],[-76.29,73.08],[-76.31,73.0],[-76.09,72.88],[-76.4,72.82],[-77.84,72.9],[-78.31,72.88],[-79.32,72.76],[-79.5,72.76],[-79.82,72.83],[-79.98,72.89],[-80.18,73.22],[-80.62,73.27],[-80.78,73.33],[-80.82,73.38],[-80.82,73.43],[-80.8,73.47],[-80.74,73.48],[-80.83,73.53],[-80.86,73.59],[-80.85,73.72],[-80.76,73.76],[-80.41,73.77],[-80.12,73.71]]],[[[-97.7,76.47],[-97.69,76.42],[-97.74,76.34],[-97.53,76.18],[-97.53,76.11],[-97.61,76.05],[-97.65,75.98],[-97.6,75.85],[-97.89,75.76],[-97.41,75.67],[-97.41,75.55],[-97.34,75.42],[-97.65,75.51],[-97.88,75.42],[-97.85,75.26],[-97.66,75.15],[-97.8,75.12],[-98.07,75.2],[-98.08,75.15],[-97.95,75.06],[-97.99,75.05],[-98.7,75.01],[-99.16,75.02],[-99.33,75.05],[-99.63,74.98],[-100.29,75.03],[-100.48,75.19],[-100.46,75.22],[-100.15,75.25],[-100.73,75.35],[-100.71,75.41],[-100.28,75.46],[-99.76,75.63],[-99.21,75.67],[-99.19,75.7],[-99.92,75.68],[-101.21,75.59],[-101.46,75.61],[-102.54,75.51],[-102.7,75.54],[-102.8,75.6],[-102.25,75.78],[-102.27,75.81],[-102.14,75.88],[-101.94,75.88],[-101.26,75.76],[-100.97,75.8],[-101.29,75.79],[-101.51,75.92],[-101.43,75.99],[-101.82,76.04],[-101.86,76.1],[-101.53,76.22],[-101.56,76.24],[-101.91,76.23],[-102.14,76.28],[-102.1,76.33],[-101.96,76.4],[-101.79,76.45],[-101.34,76.41],[-101.14,76.35],[-101.06,76.25],[-100.11,75.96],[-99.87,75.92],[-99.69,75.96],[-99.98,76.03],[-100.11,76.12],[-99.54,76.15],[-100.41,76.24],[-99.98,76.31],[-100.82,76.44],[-100.89,76.48],[-100.83,76.52],[-100.39,76.61],[-99.81,76.63],[-99.67,76.62],[-99.17,76.45],[-98.89,76.47],[-99.02,76.61],[-98.71,76.69],[-98.24,76.58],[-97.81,76.52]]],[[[-94.29,76.91],[-93.81,76.91],[-93.23,76.77],[-93.19,76.71],[-93.2,76.67],[-93.53,76.45],[-93.0,76.62],[-92.3,76.62],[-91.79,76.68],[-91.31,76.68],[-90.74,76.58],[-90.54,76.5],[-90.62,76.46],[-91.4,76.51],[-91.44,76.5],[-91.42,76.46],[-90.85,76.44],[-89.28,76.3],[-89.22,76.26],[-89.24,76.24],[-89.41,76.19],[-90.31,76.16],[-91.41,76.22],[-91.28,76.16],[-90.71,76.08],[-90.25,76.05],[-90.03,75.97],[-89.79,75.92],[-89.7,75.85],[-89.51,75.86],[-89.28,75.8],[-89.2,75.76],[-89.26,75.7],[-89.65,75.57],[-89.28,75.56],[-88.92,75.45],[-88.84,75.46],[-88.8,75.5],[-88.86,75.59],[-88.85,75.62],[-88.64,75.66],[-88.2,75.51],[-87.73,75.58],[-87.54,75.48],[-87.36,75.59],[-87.26,75.62],[-86.81,75.49],[-86.24,75.41],[-85.95,75.4],[-85.9,75.44],[-86.07,75.5],[-85.97,75.53],[-85.58,75.58],[-85.37,75.57],[-84.99,75.64],[-84.6,75.65],[-83.93,75.82],[-83.24,75.75],[-82.15,75.83],[-81.27,75.76],[-81.15,75.74],[-81.19,75.68],[-81.17,75.67],[-81.0,75.64],[-80.32,75.63],[-80.12,75.56],[-80.29,75.49],[-80.26,75.48],[-79.66,75.45],[-79.51,75.3],[-79.51,75.26],[-79.63,75.2],[-80.38,75.03],[-80.14,74.99],[-79.66,75.02],[-79.52,74.99],[-79.4,74.92],[-79.51,74.88],[-79.94,74.83],[-80.35,74.9],[-80.15,74.8],[-80.21,74.75],[-80.22,74.66],[-80.28,74.58],[-81.23,74.57],[-81.94,74.47],[-82.93,74.57],[-83.12,74.69],[-83.1,74.82],[-83.52,74.9],[-83.54,74.89],[-83.51,74.85],[-83.36,74.8],[-83.34,74.76],[-83.39,74.67],[-83.53,74.59],[-84.43,74.51],[-84.82,74.54],[-85.06,74.61],[-85.09,74.53],[-85.13,74.52],[-85.34,74.54],[-85.44,74.6],[-85.54,74.53],[-85.81,74.5],[-86.11,74.54],[-86.34,74.51],[-86.73,74.56],[-86.67,74.49],[-86.77,74.48],[-88.42,74.49],[-88.5,74.51],[-88.56,74.57],[-88.34,74.78],[-88.53,74.83],[-88.68,74.8],[-88.85,74.69],[-88.94,74.79],[-89.06,74.75],[-89.19,74.74],[-89.22,74.73],[-89.2,74.64],[-89.56,74.55],[-89.84,74.55],[-90.55,74.61],[-90.78,74.7],[-90.97,74.72],[-90.88,74.82],[-91.13,74.74],[-91.16,74.71],[-91.13,74.65],[-91.55,74.66],[-91.96,74.79],[-92.17,75.05],[-92.06,75.1],[-92.08,75.12],[-92.35,75.23],[-92.41,75.3],[-92.41,75.41],[-92.07,75.66],[-92.19,75.85],[-92.71,76.11],[-93.09,76.35],[-93.31,76.36],[-93.67,76.27],[-94.59,76.3],[-95.27,76.26],[-95.45,76.36],[-95.84,76.42],[-96.04,76.49],[-95.65,76.58],[-95.97,76.57],[-96.88,76.74],[-96.88,76.8],[-96.59,76.76],[-96.4,76.8],[-96.81,76.91],[-96.76,76.97],[-96.69,76.99],[-94.98,77.0]]],[[[-115.97,77.0],[-115.81,76.94],[-115.91,76.91],[-116.25,76.9],[-115.94,76.74],[-115.98,76.69],[-116.22,76.61],[-117.0,76.53],[-117.04,76.37],[-117.23,76.28],[-117.49,76.27],[-117.99,76.41],[-118.02,76.45],[-118.01,76.5],[-117.81,76.73],[-117.78,76.78],[-117.82,76.8],[-118.3,76.74],[-118.41,76.66],[-118.47,76.55],[-118.79,76.51],[-118.82,76.49],[-118.8,76.46],[-118.64,76.42],[-118.62,76.37],[-118.64,76.33],[-118.85,76.26],[-118.99,76.14],[-119.17,76.13],[-119.37,76.22],[-119.52,76.34],[-119.58,76.33],[-119.65,76.28],[-119.64,76.16],[-119.74,76.12],[-119.55,76.05],[-119.53,76.0],[-119.91,75.86],[-120.41,75.83],[-120.56,76.01],[-120.64,76.03],[-120.77,76.17],[-120.85,76.18],[-120.9,76.16],[-121.02,76.02],[-121.21,75.98],[-121.91,76.03],[-122.4,75.94],[-122.53,75.95],[-122.64,76.01],[-122.65,76.03],[-122.55,76.08],[-122.61,76.12],[-122.59,76.16],[-122.9,76.13],[-122.77,76.23],[-122.42,76.39],[-121.56,76.45],[-121.1,76.66],[-120.49,76.79],[-120.36,76.89],[-120.02,77.0]]],[[[-108.29,76.06],[-107.85,76.06],[-107.72,76.0],[-107.76,75.94],[-108.02,75.8],[-107.92,75.8],[-107.54,75.9],[-107.22,75.89],[-107.05,75.85],[-106.91,75.68],[-106.89,75.78],[-106.69,75.81],[-106.82,75.87],[-106.86,75.93],[-106.68,76.02],[-106.4,76.06],[-105.9,76.01],[-105.63,75.95],[-105.56,75.88],[-105.48,75.7],[-105.52,75.63],[-105.68,75.5],[-105.7,75.41],[-105.86,75.19],[-105.97,75.13],[-107.06,74.93],[-107.82,75.0],[-108.47,74.95],[-108.75,74.99],[-108.63,75.02],[-108.83,75.06],[-109.5,74.88],[-110.39,74.81],[-110.94,74.64],[-111.73,74.5],[-112.52,74.42],[-113.02,74.4],[-113.67,74.45],[-114.27,74.6],[-114.38,74.67],[-114.31,74.72],[-112.84,74.98],[-111.67,75.02],[-111.08,75.2],[-111.03,75.23],[-111.09,75.26],[-111.62,75.17],[-112.21,75.13],[-112.6,75.21],[-112.95,75.11],[-113.71,75.07],[-113.84,75.11],[-113.89,75.21],[-113.85,75.26],[-113.76,75.32],[-113.47,75.42],[-113.88,75.38],[-114.02,75.43],[-114.07,75.39],[-114.17,75.24],[-114.51,75.28],[-114.36,75.17],[-114.36,75.14],[-114.45,75.09],[-115.02,74.98],[-115.28,75.1],[-115.41,75.11],[-115.54,75.08],[-115.61,75.01],[-115.73,74.97],[-116.14,75.04],[-116.48,75.17],[-117.0,75.16],[-117.5,75.2],[-117.6,75.27],[-117.51,75.36],[-117.26,75.46],[-116.08,75.49],[-115.34,75.62],[-115.14,75.68],[-115.12,75.71],[-116.43,75.59],[-117.03,75.6],[-117.16,75.64],[-116.97,75.75],[-116.8,75.77],[-115.48,75.84],[-114.99,75.9],[-116.34,75.88],[-116.65,75.93],[-116.66,75.96],[-116.55,76.02],[-116.61,76.07],[-116.59,76.1],[-116.21,76.19],[-114.78,76.17],[-115.82,76.27],[-115.83,76.33],[-115.78,76.36],[-115.58,76.44],[-115.0,76.5],[-114.53,76.5],[-114.19,76.45],[-114.12,76.4],[-114.11,76.35],[-114.06,76.3],[-113.82,76.21],[-113.17,76.26],[-112.7,76.2],[-111.87,75.94],[-111.87,75.91],[-112.05,75.87],[-112.08,75.85],[-112.06,75.83],[-111.55,75.82],[-111.28,75.61],[-111.05,75.55],[-109.09,75.51],[-109.01,75.51],[-108.91,75.59],[-108.9,75.62],[-108.94,75.7],[-109.8,75.86],[-109.87,75.93],[-109.45,76.02],[-109.42,76.07],[-109.43,76.11],[-109.71,76.21],[-109.91,76.22],[-110.2,76.29],[-110.28,76.33],[-110.31,76.4],[-109.86,76.52],[-109.34,76.76],[-109.1,76.81],[-108.83,76.82],[-108.47,76.74],[-108.64,76.61],[-108.63,76.59],[-108.56,76.54],[-108.51,76.44],[-108.19,76.33],[-108.12,76.23],[-108.38,76.12],[-108.41,76.09],[-108.39,76.07]]],[[[-93.17,74.16],[-92.59,74.08],[-92.22,73.97],[-91.63,74.03],[-91.09,74.01],[-90.46,73.91],[-90.35,73.87],[-90.38,73.82],[-90.57,73.69],[-90.93,73.53],[-91.25,73.3],[-91.55,73.24],[-91.43,73.19],[-91.46,73.15],[-91.79,72.92],[-92.12,72.75],[-92.39,72.72],[-93.34,72.8],[-94.21,72.76],[-93.77,72.67],[-93.57,72.56],[-93.53,72.5],[-93.56,72.42],[-93.87,72.25],[-94.04,72.03],[-94.14,72.0],[-94.5,72.04],[-95.19,72.03],[-95.17,72.18],[-95.25,72.5],[-95.55,72.78],[-95.6,72.88],[-95.59,73.17],[-95.64,73.56],[-95.63,73.7],[-95.39,73.76],[-94.7,73.66],[-94.9,73.72],[-95.13,73.88],[-95.15,73.93],[-95.12,73.99],[-94.97,74.04],[-94.48,74.11],[-93.78,74.12],[-93.41,74.18]]],[[[-97.44,69.64],[-97.24,69.67],[-96.88,69.51],[-96.3,69.34],[-95.95,69.02],[-95.75,68.9],[-95.59,68.84],[-95.37,68.89],[-95.27,68.83],[-95.47,68.75],[-95.69,68.74],[-95.89,68.63],[-96.4,68.47],[-96.6,68.46],[-97.01,68.54],[-97.47,68.54],[-97.89,68.67],[-98.24,68.74],[-98.32,68.84],[-98.54,68.8],[-98.7,68.8],[-98.83,68.84],[-98.9,68.93],[-99.06,68.92],[-99.09,68.9],[-99.09,68.86],[-99.25,68.86],[-99.44,68.92],[-99.56,69.03],[-99.46,69.13],[-98.91,69.17],[-98.46,69.33],[-98.56,69.46],[-98.45,69.48],[-98.53,69.53],[-98.55,69.57],[-98.39,69.57],[-98.22,69.48],[-98.04,69.46],[-98.16,69.51],[-98.29,69.63],[-98.3,69.69],[-98.2,69.8],[-97.79,69.86],[-97.41,69.74],[-97.39,69.7],[-97.47,69.67]]],[[[-114.52,72.59],[-113.69,72.67],[-113.58,72.65],[-113.5,72.69],[-113.49,72.82],[-113.29,72.95],[-113.07,73.0],[-112.75,72.99],[-112.05,72.89],[-111.27,72.71],[-111.25,72.67],[-111.36,72.57],[-111.61,72.44],[-111.9,72.36],[-111.68,72.3],[-111.31,72.45],[-111.25,72.45],[-111.29,72.4],[-111.27,72.36],[-111.14,72.37],[-110.78,72.53],[-110.44,72.63],[-110.21,72.66],[-110.2,72.76],[-110.55,72.86],[-110.69,72.94],[-110.66,73.01],[-110.01,72.98],[-109.12,72.73],[-108.97,72.65],[-108.99,72.6],[-108.75,72.55],[-108.63,72.41],[-108.47,72.14],[-108.28,71.9],[-108.19,71.72],[-107.81,71.63],[-107.69,71.72],[-107.35,71.82],[-107.33,71.84],[-107.38,71.89],[-107.31,71.89],[-107.54,72.03],[-107.7,72.15],[-107.79,72.3],[-107.82,72.44],[-107.93,72.52],[-107.93,72.59],[-108.0,72.65],[-108.24,73.15],[-108.2,73.18],[-107.94,73.22],[-108.08,73.28],[-108.09,73.3],[-108.03,73.35],[-107.72,73.33],[-107.11,73.19],[-106.95,73.28],[-106.48,73.2],[-105.81,73.01],[-105.42,72.79],[-105.43,72.74],[-105.32,72.63],[-105.23,72.42],[-104.88,71.98],[-104.39,71.58],[-104.36,71.38],[-104.56,71.13],[-104.57,71.1],[-104.51,71.06],[-104.17,70.93],[-103.95,70.76],[-103.58,70.63],[-103.08,70.51],[-103.0,70.54],[-103.08,70.62],[-103.09,70.65],[-103.05,70.66],[-102.75,70.52],[-101.99,70.29],[-101.68,70.28],[-101.63,70.25],[-101.62,70.17],[-101.56,70.14],[-101.09,70.14],[-100.97,70.03],[-100.91,69.81],[-100.94,69.72],[-101.04,69.67],[-101.34,69.71],[-101.48,69.85],[-101.65,69.7],[-102.23,69.84],[-102.6,69.72],[-102.53,69.62],[-102.62,69.55],[-102.92,69.56],[-103.3,69.67],[-103.43,69.67],[-103.46,69.64],[-103.42,69.61],[-103.05,69.47],[-103.04,69.37],[-103.12,69.2],[-102.88,69.34],[-102.45,69.48],[-102.15,69.49],[-101.98,69.43],[-102.07,69.34],[-102.05,69.26],[-101.87,69.24],[-101.79,69.18],[-101.79,69.13],[-101.86,69.02],[-102.9,68.82],[-103.47,68.81],[-104.07,68.87],[-104.35,68.93],[-104.57,68.87],[-105.11,68.92],[-105.17,68.96],[-105.02,69.05],[-105.02,69.08],[-106.14,69.16],[-106.34,69.22],[-106.36,69.38],[-106.42,69.41],[-106.66,69.44],[-106.86,69.35],[-107.03,69.18],[-107.44,69.0],[-108.36,68.93],[-108.95,68.76],[-109.47,68.68],[-110.85,68.58],[-111.13,68.59],[-111.31,68.54],[-112.86,68.48],[-113.13,68.49],[-113.34,68.6],[-113.62,68.84],[-113.59,68.96],[-113.69,69.2],[-114.32,69.27],[-115.62,69.28],[-116.1,69.34],[-116.51,69.42],[-116.61,69.51],[-117.1,69.8],[-117.2,70.05],[-117.14,70.1],[-116.55,70.18],[-114.59,70.31],[-112.64,70.23],[-112.19,70.28],[-111.78,70.27],[-111.63,70.31],[-112.11,70.45],[-113.76,70.69],[-115.99,70.59],[-116.33,70.62],[-116.99,70.6],[-117.59,70.63],[-118.26,70.89],[-118.38,70.97],[-118.27,71.03],[-117.81,71.16],[-115.89,71.38],[-116.05,71.42],[-116.04,71.45],[-115.98,71.47],[-115.47,71.47],[-115.3,71.49],[-115.59,71.55],[-116.78,71.44],[-117.94,71.39],[-118.19,71.44],[-118.23,71.47],[-118.15,71.53],[-117.88,71.56],[-117.74,71.66],[-118.58,71.65],[-118.87,71.69],[-118.99,71.76],[-118.98,71.91],[-118.94,71.99],[-118.59,72.17],[-118.21,72.26],[-118.25,72.31],[-118.48,72.43],[-118.37,72.53],[-117.55,72.83],[-116.57,73.05],[-114.64,73.37],[-114.3,73.33],[-114.13,73.23],[-114.05,73.07],[-114.05,72.96],[-114.18,72.81]]],[[[-119.74,74.11],[-119.47,74.2],[-119.21,74.2],[-119.15,74.17],[-119.12,74.02],[-118.74,74.19],[-118.54,74.24],[-117.97,74.27],[-117.51,74.23],[-116.95,74.1],[-115.96,73.75],[-115.63,73.67],[-115.46,73.58],[-115.39,73.5],[-115.45,73.44],[-115.52,73.42],[-116.48,73.25],[-119.08,72.64],[-119.51,72.3],[-119.77,72.24],[-120.18,72.21],[-120.19,72.13],[-120.37,71.89],[-120.44,71.63],[-120.62,71.51],[-121.47,71.39],[-121.62,71.45],[-121.75,71.44],[-122.16,71.27],[-122.55,71.19],[-122.84,71.1],[-123.1,71.09],[-123.39,71.22],[-123.68,71.49],[-124.01,71.68],[-125.3,71.97],[-125.85,71.98],[-125.77,72.05],[-125.76,72.14],[-125.58,72.18],[-125.63,72.21],[-125.63,72.25],[-125.51,72.31],[-125.38,72.42],[-124.99,72.59],[-125.03,72.64],[-125.02,72.78],[-124.97,72.84],[-124.56,72.94],[-124.59,73.01],[-124.82,73.06],[-124.84,73.08],[-124.8,73.13],[-124.59,73.24],[-124.42,73.42],[-124.11,73.53],[-124.03,73.64],[-123.8,73.77],[-123.87,73.83],[-124.09,73.86],[-124.19,73.9],[-124.58,74.25],[-124.71,74.33],[-124.7,74.35],[-121.5,74.55],[-119.94,74.25],[-119.56,74.23],[-119.72,74.15]]],[[[-94.53,75.75],[-94.75,75.77],[-94.9,75.93],[-94.5,75.99],[-94.3,75.79]]],[[[-96.78,72.94],[-96.94,72.93],[-97.09,73.0],[-97.07,73.13],[-96.86,73.19],[-96.6,73.07],[-96.67,72.96]]],[[[-97.36,74.53],[-97.66,74.47],[-97.75,74.51],[-97.42,74.63],[-97.29,74.58]]],[[[-98.27,73.87],[-98.69,73.86],[-98.97,73.81],[-99.42,73.9],[-98.82,74.02],[-97.8,74.11],[-97.7,74.11],[-97.66,74.07],[-97.75,74.01]]],[[[-90.2,69.42],[-90.18,69.36],[-90.3,69.26],[-90.36,69.26],[-90.49,69.37],[-90.32,69.43]]],[[[-90.49,69.22],[-90.57,69.21],[-90.69,69.29],[-90.77,69.29],[-90.77,69.34],[-90.6,69.37],[-90.51,69.29]]],[[[-74.88,68.35],[-74.96,68.34],[-75.31,68.47],[-75.4,68.53],[-75.4,68.59],[-75.29,68.69],[-75.07,68.68],[-74.98,68.65],[-74.8,68.46],[-74.83,68.44],[-74.82,68.39]]],[[[-78.98,68.19],[-79.06,68.18],[-79.17,68.23],[-79.15,68.34],[-78.95,68.35],[-78.87,68.31],[-78.83,68.27]]],[[[-79.43,69.79],[-79.36,69.71],[-79.55,69.63],[-79.88,69.61],[-80.05,69.63],[-79.97,69.56],[-79.95,69.52],[-79.98,69.51],[-80.16,69.54],[-80.24,69.59],[-80.33,69.59],[-80.45,69.65],[-80.79,69.69],[-80.73,69.74],[-80.47,69.74],[-80.42,69.8],[-80.21,69.8],[-80.12,69.74],[-79.59,69.81]]],[[[-78.03,69.71],[-77.97,69.64],[-78.04,69.61],[-78.47,69.5],[-78.85,69.48],[-78.58,69.64],[-78.3,69.67],[-78.2,69.74]]],[[[-83.12,66.28],[-82.93,66.26],[-83.06,66.2],[-83.21,66.28],[-83.22,66.34]]],[[[-79.21,68.85],[-79.36,68.86],[-79.39,68.94],[-79.24,69.05],[-78.93,69.12],[-78.77,69.25],[-78.66,69.26],[-78.69,69.33],[-78.65,69.35],[-78.33,69.39],[-78.23,69.3],[-78.53,69.15],[-78.85,68.92]]],[[[-77.0,69.14],[-77.22,69.14],[-77.32,69.19],[-77.38,69.27],[-77.34,69.4],[-77.11,69.44],[-76.68,69.38],[-76.69,69.33]]],[[[-86.91,70.11],[-86.69,70.12],[-86.56,70.08],[-86.52,70.02],[-86.73,69.98],[-87.19,70.02],[-87.32,70.08],[-87.32,70.1],[-87.11,70.15]]],[[[-83.73,65.8],[-83.23,65.72],[-83.33,65.63],[-83.61,65.7],[-83.65,65.66],[-83.79,65.67],[-83.8,65.71],[-83.7,65.76],[-83.81,65.79],[-84.01,65.75],[-84.12,65.77],[-84.14,65.92],[-84.37,66.01],[-84.47,66.09],[-84.41,66.13],[-84.12,66.08],[-83.79,65.97],[-83.7,65.92],[-83.71,65.86],[-83.77,65.83]]],[[[-86.6,67.74],[-86.71,67.75],[-86.89,67.84],[-86.91,67.9],[-86.85,68.01],[-86.96,68.1],[-86.88,68.19],[-86.7,68.31],[-86.57,68.29],[-86.42,68.18],[-86.4,67.89],[-86.49,67.78]]],[[[-84.67,65.58],[-84.78,65.57],[-84.93,65.69],[-85.1,65.76],[-85.17,65.94],[-85.15,66.02],[-84.94,66.01],[-84.76,65.86],[-84.6,65.66]]],[[[-102.23,76.01],[-102.01,75.94],[-102.42,75.87],[-102.58,75.78],[-103.31,75.76],[-103.04,75.92],[-103.2,75.96],[-103.77,75.89],[-103.99,75.93],[-103.8,76.04],[-104.24,76.05],[-104.41,76.11],[-104.35,76.18],[-104.01,76.22],[-103.1,76.31],[-102.73,76.31],[-102.58,76.28],[-102.49,76.1]]],[[[-101.23,76.58],[-101.49,76.58],[-101.61,76.6],[-101.17,76.67],[-100.96,76.73],[-100.27,76.73]]],[[[-104.02,76.58],[-103.72,76.6],[-103.58,76.54],[-103.03,76.43],[-103.2,76.37],[-103.47,76.33],[-104.36,76.33],[-104.58,76.54],[-104.6,76.58],[-104.59,76.61],[-104.07,76.67],[-103.96,76.64]]],[[[-89.73,76.51],[-89.97,76.49],[-90.16,76.52],[-90.56,76.75],[-90.41,76.81],[-89.95,76.84],[-89.7,76.74],[-89.71,76.7],[-89.82,76.63],[-89.8,76.56]]],[[[-96.08,75.51],[-96.16,75.48],[-96.46,75.49],[-96.68,75.39],[-96.86,75.37],[-96.97,75.41],[-97.02,75.47],[-96.98,75.51],[-96.43,75.61],[-96.37,75.65],[-95.96,75.55]]],[[[-95.31,74.51],[-95.78,74.55],[-95.85,74.58],[-95.66,74.64],[-95.51,74.64],[-95.28,74.54]]],[[[-121.08,75.75],[-121.24,75.75],[-121.22,75.78],[-121.03,75.85],[-121.04,75.9],[-120.99,75.93],[-120.89,75.93],[-120.92,75.81]]],[[[-113.56,76.74],[-113.71,76.71],[-114.75,76.76],[-114.84,76.79],[-114.42,76.88],[-113.89,76.89],[-113.52,76.83],[-113.49,76.78]]],[[[-104.12,75.04],[-104.63,75.06],[-104.89,75.15],[-104.65,75.35],[-104.47,75.41],[-104.07,75.42],[-103.8,75.35],[-103.64,75.16],[-103.81,75.08]]],[[[-100.22,68.81],[-100.4,68.72],[-100.5,68.79],[-100.6,68.77],[-100.63,68.82],[-100.61,68.99],[-100.52,69.04],[-100.33,69.0],[-100.18,68.9]]],[[[-99.99,69.01],[-100.02,68.95],[-100.14,68.97],[-100.25,69.05],[-100.15,69.13],[-100.04,69.09]]],[[[-100.31,70.5],[-100.62,70.55],[-100.68,70.65],[-100.54,70.67],[-100.28,70.59],[-100.32,70.58]]],[[[-95.51,69.57],[-95.38,69.51],[-95.4,69.42],[-95.5,69.35],[-95.73,69.35],[-95.67,69.44],[-95.7,69.54],[-95.76,69.56],[-95.81,69.56],[-95.81,69.45],[-95.89,69.35],[-95.99,69.39],[-95.98,69.51],[-95.88,69.61],[-95.71,69.62]]],[[[-101.17,69.4],[-101.27,69.39],[-101.29,69.44],[-101.21,69.48],[-101.33,69.52],[-101.35,69.56],[-101.24,69.57],[-101.03,69.5],[-101.0,69.46]]],[[[-101.85,68.59],[-102.31,68.68],[-102.01,68.83],[-101.83,68.8],[-101.72,68.72],[-101.73,68.65]]],[[[-104.54,68.41],[-104.85,68.45],[-105.05,68.56],[-104.91,68.58],[-104.6,68.56],[-104.44,68.47],[-104.46,68.43]]],[[[-107.9,67.4],[-107.95,67.32],[-108.15,67.43],[-108.13,67.63],[-108.05,67.66],[-107.99,67.62],[-107.99,67.51],[-107.91,67.47]]],[[[-109.17,67.98],[-108.97,67.98],[-108.89,67.9],[-108.92,67.88],[-109.1,67.92],[-109.16,67.95]]],[[[-108.09,67.01],[-107.81,67.0],[-107.83,66.92],[-107.94,66.86]]],[[[-109.32,67.99],[-109.5,68.05],[-109.47,68.1],[-109.34,68.05]]],[[[-79.06,75.93],[-79.05,75.87],[-79.36,75.83],[-79.54,75.83],[-79.7,75.88],[-79.01,76.15],[-78.85,76.11],[-79.06,75.99]]],[[[-69.0,76.25],[-69.37,76.33],[-69.48,76.4],[-69.0,76.53],[-69.0,76.68],[-69.67,76.74],[-69.82,76.78],[-69.89,76.83],[-69.87,76.88],[-69.69,76.99],[-70.44,76.81],[-70.73,76.84],[-70.79,76.87],[-70.73,76.93],[-71.06,77.0],[-69.0,77.0]]]];
  const AFF=['相识','熟悉','心动','深爱'];
  function tierIdx(v){ v=Math.max(0,Math.min(100,+v||0)); return v<26?0:(v<51?1:(v<76?2:3)); }
  function noArt(cap){ return `<div class="exp-noart">${ICO.noart}<span>${cap}</span></div>`; }
  const CAST = ['富兰克林', '克洛泽', '菲茨', '古德瑟', '瑙雅', '茜拉'];
  const zeroByCast = () => CAST.reduce((o, n) => { o[n] = 0; return o; }, {});
  const emptyByCast = () => CAST.reduce((o, n) => { o[n] = ''; return o; }, {});

  const DEFAULT = {
    时间: '', 地点: '航海日志读取异常，请刷新页面或切换聊天', 身处: '随队',
    物资: 0, 健康: 0, 士气: 0, 狩猎技巧: 0,
    好感: zeroByCast(), 心声: emptyByCast(),
    名册: {}, 回想: {},
  };
  const BLANK = {
    时间: '', 地点: '', 身处: '随队',
    物资: 0, 健康: 0, 士气: 0, 狩猎技巧: 0,
    好感: zeroByCast(), 心声: emptyByCast(),
    名册: {}, 回想: {},
  };
  const BAND_TABLE={物资:[[75,'充裕'],[50,'渐紧'],[25,'匮乏'],[0,'枯竭']],健康:[[75,'全员健康'],[50,'零星减员'],[25,'病员成片'],[0,'十不存一']],士气:[[75,'高昂'],[50,'平稳'],[25,'低落'],[0,'崩溃']],狩猎技巧:[[75,'名猎手'],[50,'猎手'],[25,'学徒猎人'],[0,'生手']]};
  function band(v,t){const B=BAND_TABLE[t];for(const[m,n]of B)if(v>=m)return n;return B.at(-1)[1]}
  function bandNames(t){return BAND_TABLE[t].map(x=>x[1]).slice().reverse()}
  function bandIdx(v,t){const B=BAND_TABLE[t];for(let i=0;i<B.length;i++)if(v>=B[i][0])return B.length-1-i;return 0}
  function trackHtml(names,tier){
    return `<div class="stat-track">${names.map((t,i)=>`<span class="stat-node ${i<tier?'reached':(i===tier?'cur':'')}">${t}</span>`).join('')}</div>`;
  }
  function mcol(v){return v>=75?'linear-gradient(90deg,var(--meter-good-a),var(--meter-good-b))':v>=50?'linear-gradient(90deg,var(--meter-mid-a),var(--meter-mid-b))':v>=25?'linear-gradient(90deg,var(--meter-warn-a),var(--meter-warn-b))':'linear-gradient(90deg,var(--meter-bad-a),var(--meter-bad-b))'}
  function segs(val,max){let h='';for(let i=0;i<max;i++)h+=`<span class="seg ${i<val?'on':''}"></span>`;return `<div class="segs">${h}</div>`}
  function meter(D,t,opts){
    const o=opts||{};
    const v=D[t];
    const skill=t==='狩猎技巧'||o.skill;
    const warn=o.frozen?' frozen':(skill?'':v<25?' grave':v<50?' warn':'');
    const ticks=[25,50,75].map(p=>`<span class="meter-tick" style="left:${p}%"></span>`).join('');
    const bandHtml=o.frozen?`${ICO.frost}<span>远征队失联</span>`:'';
    const d=(!o.frozen&&o.delta)?`<span class="meter-delta ${o.delta>0?'up':'down'}">${o.delta>0?ICO.up:ICO.down}${Math.abs(o.delta)}</span>`:'';
    const fill=skill?'linear-gradient(90deg,var(--gold-mid),var(--gold-deep))':mcol(v);
    return `<div class="meter${warn}" data-stat="${t}"><div class="meter-line"><span class="meter-ico">${ICONS[t]}</span><span class="meter-name">${t}</span><span class="meter-band">${bandHtml}</span>${d}<span class="meter-num">${v}</span></div><div class="meter-bar"><div class="meter-fill" style="width:${Math.max(0,Math.min(100,v))}%;background:${fill}"></div>${ticks}</div>${trackHtml(bandNames(t),bandIdx(v,t))}</div>`;
  }
  function poiOf(loc){const seg=((loc||'').split('／')[0]||'').trim();if(!seg)return null;return POI.find(p=>p.key===seg||p.key.includes(seg)||seg.includes(p.key)||(p.别名||[]).some(a=>seg.includes(a)||a.includes(seg)))||null;}
  function roomOf(loc){const parts=(loc||'').split('／').map(s=>s.trim()).filter(Boolean);if(parts.length<3)return null;const seg=parts[parts.length-1];if(!seg)return null;return SHIP_ROOMS.find(r=>r.key===seg||r.key.includes(seg)||seg.includes(r.key)||(r.别名||[]).some(a=>seg.includes(a)||a.includes(seg)))||null;}
  function safeLastMessageId() { try { return getLastMessageId(); } catch (e) { return null; } }
  function safeLSGet(key) { try { return window.parent.localStorage.getItem(key); } catch (e) { return null; } }
  function safeLSSet(key, val) { try { window.parent.localStorage.setItem(key, val); } catch (e) { dbg('lsSet', e); } }

  // ════ 状态变量(立绘选取与角色选中态) ════
  const isDeadTag = v => v === '死亡' || v === '死';
  let charSel=null;

  function loadPins(){let p={};try{const raw=window.parent.localStorage.getItem(LS_KEYS.pins);const parsed=raw?JSON.parse(raw):null;if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))p=parsed;}catch(e){}CAST.forEach(n=>{p[n]={front:(p[n]&&typeof p[n]==='object'&&p[n].front)||null};});return p;}
  function savePins(){safeLSSet(LS_KEYS.pins,JSON.stringify(pins));}
  let pins=loadPins();
  const snap={};
  function snapOf(name){return snap[name]||(snap[name]={front:null});}
  function normalPool(name){const g=GAL[name];return g?g.normal.reduce((a,t)=>a.concat(t.imgs),[]):[];}
  function pick(arr){return arr.length?arr[Math.floor(Math.random()*arr.length)]:'';}
  function seededRand(seedStr){let h=2166136261;for(let i=0;i<seedStr.length;i++){h^=seedStr.charCodeAt(i);h=Math.imul(h,16777619);}let t=h>>>0;t|=0;t=(t+0x6D2B79F5)|0;let r=Math.imul(t^(t>>>15),1|t);r=(r+Math.imul(r^(r>>>7),61|r))^r;return((r^(r>>>14))>>>0)/4294967296;}
  function pickSeeded(arr,seedStr){return arr.length?arr[Math.floor(seededRand(seedStr)*arr.length)]:'';}
  function frontImg(name){const p=pins[name]&&pins[name].front;if(p)return p;const s=snapOf(name);if(!s.front)s.front=pick(normalPool(name));return s.front;}
  let heroRollId=null;
  function maybeRerollHero(){
    if(heroMode!=='rand')return;
    const lid=safeLastMessageId();
    if(lid==null||lid===heroRollId)return;
    heroRollId=lid;
    CAST.forEach(n=>{const s=snapOf(n);s.front=pickSeeded(normalPool(n),lid+':'+n+':front');});
  }

  // ════ MVU读取与派生(readMVU/currentStat/previousStat) ════
  let lastStat = null;
  let prevStat = null;
  const varFold = {};
  function currentStat() {
    if (lastStat) return lastStat;
    try {
      if (typeof getVariables === 'function') {
        const v = getVariables({ type: 'message', message_id: 'latest' });
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) { dbg('stat:latest', e); }
    try {
      if (typeof getAllVariables === 'function') {
        const v = getAllVariables();
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) { dbg('stat:all', e); }
    try {
      if (typeof getLastMessageId === 'function' && getLastMessageId() === 0 && typeof getChatMessages === 'function') {
        const m0 = getChatMessages(0, { include_swipes: true })[0];
        const sd = m0 && m0.swipes_data && m0.swipes_data[m0.swipe_id || 0];
        if (sd && sd.stat_data) return sd.stat_data;
      }
    } catch (e) { dbg('stat:swipe0', e); }
    return null;
  }
  function previousStat() {
    if (prevStat) return prevStat;
    try {
      const lastId = getLastMessageId();
      if (typeof getVariables === 'function' && lastId != null && lastId >= 1) {
        const v = getVariables({ type: 'message', message_id: lastId - 1 });
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) { dbg('stat:prev', e); }
    return null;
  }
  function readMVU(sdArg) {
    try {
      const sd = sdArg || currentStat();
      if (sd) {
        const g = (p, d) => {
          const x = (typeof _ !== 'undefined' && _.get) ? _.get(sd, p) : p.split('.').reduce((a, k) => a == null ? a : a[k], sd);
          return (x === undefined || x === null || x === '') ? d : x;
        };
        const cl = v => Math.max(0, Math.min(100, v));
        const mapByCast = (prefix, fallback) => CAST.reduce((o, n) => { o[n] = g(prefix + '.' + n, fallback); return o; }, {});
        const R = {
          时间: g('时间', ''),
          地点: g('地点', ''),
          身处: (sd.身处 === '营地' || sd.身处 === '随队') ? sd.身处 : '随队',
          物资: cl(+g('物资', 0) || 0),
          健康: cl(+g('健康', 0) || 0),
          士气: cl(+g('士气', 0) || 0),
          狩猎技巧: cl(+g('狩猎技巧', 0) || 0),
          好感: mapByCast('好感', 0),
          心声: mapByCast('心声', ''),
          名册: (sd.名册 && typeof sd.名册 === 'object') ? sd.名册 : {},
          回想: (sd.回想 && typeof sd.回想 === 'object') ? sd.回想 : {},
        };
        if (R.身处 === '营地' && !sdArg) {
          const pv = previousStat();
          if (pv) ['物资', '健康', '士气'].forEach(k => {
            const x = +_.get(pv, k);
            if (!isNaN(x)) R[k] = cl(x);
          });
        }
        return R;
      }
    } catch (e) {
      console.warn('[航海日志] 读取MVU变量失败，使用兜底值', e);
    }
    const lid = safeLastMessageId();
    if (lid != null && lid >= 1) return DEFAULT;
    return BLANK;
  }

  // ════ 展示格式化(fmtPlace/fmtTime/fmtMemoir) ════
  const SEASONS = ['极昼', '白夜', '极夜'];
  function segsOf(s) { return String(s == null ? '' : s).split('／').map(x => x.trim()).filter(Boolean); }
  function fmtPlace(s) { return segsOf(s).join('／'); }
  function fmtTimeHtml(s) {
    const p = segsOf(s);
    if (!p.length) return '';
    const tail = p[p.length - 1];
    if (p.length > 1 && SEASONS.includes(tail)) {
      return escapeHtml(p.slice(0, -1).join(' ')) + '<span class="exp-season">' + escapeHtml(tail) + '</span>';
    }
    return escapeHtml(p.join(' '));
  }
  function fmtMemoir(entry) {
    const p = segsOf(entry);
    if (p.length >= 3) return { head: p[0] + '（' + p[1] + '）', body: p.slice(2).join('　') };
    return { head: '', body: String(entry == null ? '' : entry).trim() };
  }

  // ════ 外壳骨架与切页(ensureShell/switchTab) ════
  function getPanel(name) {
    return doc.querySelector('#exp-shell-root .exp-panel[data-panel="' + name + '"]');
  }

  function buildShellSkeletonHtml() {
    return `
      <div class="exp-side">
        <div class="exp-side-head"><span class="exp-emblem">${EMBLEM}</span><span class="exp-side-title">富兰克林远征</span></div>
        <div class="exp-nav">
          ${PANELS.map(p => `<div class="exp-nav-item${p.key === DEFAULT_TAB ? ' active' : ''}" data-tab="${p.key}"><span class="exp-nav-ico">${p.ico}</span><span class="exp-nav-lab">${p.label}</span></div>`).join('')}
          <div class="exp-nav-item" id="${SEL.acuNav}" data-ext="acu"><span class="exp-nav-ico">${ICO.db}</span><span class="exp-nav-lab">数据库</span></div>
        </div>
      </div>
      <div class="exp-main">
        <div class="exp-topbar">
          <div class="exp-tb-info">
            <span class="exp-tb-item" data-stat="地点">${ICO.pin}<span id="${SEL.tbLoc}"></span></span>
            <span class="exp-tb-item" data-stat="时间">${ICO.clock}<span id="${SEL.topbarTime}"></span></span>
          </div>
          <button class="exp-tb-close" id="${SEL.tbClose}" title="退出到原生">${ICO.close}</button>
        </div>
        <div class="exp-panels">
          ${PANELS.map(p => `<div class="exp-panel${p.key === DEFAULT_TAB ? ' active' : ''}" data-panel="${p.key}"></div>`).join('')}
        </div>
      </div>
    `;
  }

  function ensureShell() {
    if (doc.getElementById(SHELL_ID)) return;
    const style = doc.createElement('style');
    style.id = SEL.shellStyle;
    style.textContent = SHELL_CSS;
    doc.head.appendChild(style);

    const root = doc.createElement('div');
    root.id = SHELL_ID;
    root.dataset.owner = SHELL_TOKEN;
    root.innerHTML = buildShellSkeletonHtml();
    if (theme !== 'dark') root.setAttribute('data-theme', theme);
    if (motionMode === 'lite') root.setAttribute('data-motion', 'off');
    if (fontMode !== 'std') root.setAttribute('data-fontsize', fontMode);
    if (sfwMode === 'sfw') root.setAttribute('data-sfw', '');
    doc.body.appendChild(root);
    renderSettingsTab();

    root.querySelectorAll('.exp-nav-item[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'opening' && openingView !== 'cards') { openingView = 'cards'; renderOpeningTab(); }
        switchTab(btn.dataset.tab);
      });
    });
    const acuBtn = doc.getElementById(SEL.acuNav);
    if (acuBtn) acuBtn.addEventListener('click', openAcuUI);
    updateAcuNav();
    const closeBtn = doc.getElementById(SEL.tbClose);
    if (closeBtn) closeBtn.addEventListener('click', toggleShell);
  }

  function acuApi() {
    try { return window.parent.AutoCardUpdaterAPI || null; } catch (e) { return null; }
  }

  function acuPresent() {
    return !!(acuApi() || doc.getElementById('acu-v2-menu-item'));
  }

  function updateAcuNav() {
    const root = doc.getElementById(SHELL_ID);
    if (!root) return;
    if (acuPresent()) root.setAttribute('data-acu', '');
    else root.removeAttribute('data-acu');
  }

  let acuPollLeft = 30;
  function pollAcu() {
    updateAcuNav();
    if (!acuPresent() && --acuPollLeft > 0) setTimeout(pollAcu, 2000);
  }

  let acuHiTimer = null;
  function setAcuNavActive(on) {
    const root = doc.getElementById(SHELL_ID);
    const acuBtn = doc.getElementById(SEL.acuNav);
    if (!root || !acuBtn) return;
    if (on) {
      root.querySelectorAll('.exp-nav-item[data-tab]').forEach(b => b.classList.remove('active'));
      acuBtn.classList.add('active');
    } else {
      acuBtn.classList.remove('active');
      const cur = root.querySelector('.exp-panel.active');
      const name = cur ? cur.dataset.panel : null;
      root.querySelectorAll('.exp-nav-item[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    }
  }

  function raiseAcuUi() {
    const v2 = doc.getElementById('acu-app-v2');
    if (v2 && v2.style.zIndex !== '9200') v2.style.setProperty('z-index', '9200', 'important');
    doc.querySelectorAll('.auto-card-updater-popup').forEach(el => {
      if (el.style.zIndex !== '9200') el.style.setProperty('z-index', '9200', 'important');
    });
  }

  function watchAcuClose() {
    if (acuHiTimer) clearInterval(acuHiTimer);
    let seen = false, tries = 0;
    acuHiTimer = setInterval(() => {
      if (acuUiOpen()) { seen = true; raiseAcuUi(); return; }
      if (seen || ++tries > 25) {
        clearInterval(acuHiTimer); acuHiTimer = null;
        setAcuNavActive(false);
      }
    }, 400);
  }

  function openAcuUI() {
    try {
      const v2 = doc.getElementById('acu-v2-menu-item');
      if (v2) { v2.click(); }
      else {
        const api = acuApi();
        if (api && typeof api.openSettings === 'function') api.openSettings();
        else return;
      }
      raiseAcuUi();
      setAcuNavActive(true);
      watchAcuClose();
    } catch (e) { console.warn('[航海日志] 打开数据库插件界面失败', e); }
  }

  function acuUiOpen() {
    const v2 = doc.getElementById('acu-app-v2');
    if (v2 && v2.style.display !== 'none') return true;
    return !!doc.querySelector('.auto-card-updater-popup');
  }

  function renderSafe(key, fn) {
    try { fn(); } catch (e) {
      const def = PANELS.find(p => p.key === key);
      console.warn('[航海日志] ' + (def ? def.label + '页' : key) + ' 渲染失败, 该页保留上次内容', e);
      const panel = getPanel(key);
      if (panel && !panel.childElementCount) panel.innerHTML = '<div class="exp-tab-error">本页渲染失败，请重试或反馈给作者</div>';
    }
  }

  let storyScroll = null;

  function switchTab(name) {
    const root = doc.getElementById(SHELL_ID);
    if (!root) return;
    const cur = root.querySelector('.exp-panel.active');
    if (cur && cur.dataset.panel === name) return;
    if (cur && cur.dataset.panel === 'story') {
      const log = doc.getElementById(SEL.storyLog);
      storyScroll = (log && !nearBottom(log)) ? log.scrollTop : null;
    }
    if (delMode) setDelMode(false);
    root.querySelectorAll('.exp-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    root.querySelectorAll('.exp-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    const D = readMVU();
    const panelDef = PANELS.find(p => p.key === name);
    if (panelDef && panelDef.render) renderSafe(name, () => panelDef.render(D));
    if (name === 'story') {
      const log = doc.getElementById(SEL.storyLog);
      if (log) { log.scrollTop = storyScroll == null ? log.scrollHeight : storyScroll; updateJumpBtn(); }
    }
    safeLSSet(LS_KEYS.tab, name);
    if (!bootAnimating) animateTab(name);
  }

  // ════ 动效工具(入场动画/外壳进出编排/数值变化反馈) ════
  let bootAnimating = false;

  const STAG_MAX = 12;

  function animateTab(name, isBoot) {
    if (!motionOK()) return;
    const panel = getPanel(name);
    if (!panel) return;
    panel.querySelectorAll('.exp-in').forEach(el => { el.classList.remove('exp-in', 'exp-boot-lead'); el.style.removeProperty('--i'); });
    const stagSel = (PANELS.find(p => p.key === name) || {}).stagSel;
    const els = Array.from(panel.querySelectorAll(stagSel || ':scope > *')).slice(0, STAG_MAX);
    els.forEach((el, i) => {
      el.style.setProperty('--i', i);
      if (isBoot) el.classList.add('exp-boot-lead');
      el.classList.add('exp-in');
      el.addEventListener('animationend', function h(e) {
        if (e.target !== el) return;
        el.classList.remove('exp-in', 'exp-boot-lead');
        el.style.removeProperty('--i');
        el.removeEventListener('animationend', h);
      });
    });
  }

  function animateSubSwitch(panel, sel) {
    if (!motionOK() || !panel) return;
    const els = Array.from(panel.querySelectorAll(sel)).slice(0, STAG_MAX);
    els.forEach((el, i) => {
      el.style.setProperty('--i', i);
      el.classList.add('exp-in-sub');
      el.addEventListener('animationend', function h(e) {
        if (e.target !== el) return;
        el.classList.remove('exp-in-sub');
        el.style.removeProperty('--i');
        el.removeEventListener('animationend', h);
      });
    });
  }

  function animateOnce(el, cls, timeout) {
    if (!el || !motionOK()) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    const clear = () => el.classList.remove(cls);
    el.addEventListener('animationend', function h(e) { if (e.target !== el) return; clear(); el.removeEventListener('animationend', h); });
    setTimeout(clear, timeout || 1200);
  }

  function animateOptions() {
    if (!motionOK()) return;
    const log = doc.getElementById(SEL.storyLog);
    if (!log) return;
    log.querySelectorAll('.exp-story-opt').forEach((b, i) => {
      b.style.setProperty('--i', i);
      b.classList.add('exp-in-opt');
      b.addEventListener('animationend', function h(e) {
        if (e.target !== b) return;
        b.classList.remove('exp-in-opt');
        b.style.removeProperty('--i');
        b.removeEventListener('animationend', h);
      });
    });
  }

  let bootTimer = null, leaving = false;

  function playShellEnter() {
    if (!motionOK()) { bootAnimating = false; return; }
    const root = doc.getElementById(SHELL_ID);
    if (!root) { bootAnimating = false; return; }
    if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
    const stale = root.querySelector('.exp-boot');
    if (stale) stale.remove();
    root.classList.remove('exp-entering');
    void root.offsetWidth;
    const veil = doc.createElement('div');
    veil.className = 'exp-boot';
    veil.innerHTML = `<div class="exp-boot-mark"><div class="exp-boot-title">富兰克林远征</div><div class="exp-boot-sub">The Franklin Expedition</div></div>`;
    root.appendChild(veil);
    root.classList.add('exp-entering');
    const active = root.querySelector('.exp-panel.active');
    animateTab(active ? active.dataset.panel : 'story', true);
    bootTimer = setTimeout(() => {
      bootTimer = null;
      bootAnimating = false;
      root.classList.remove('exp-entering');
      const v = root.querySelector('.exp-boot');
      if (v) v.remove();
    }, 1250);
  }

  function playShellExit() {
    if (leaving) return;
    const root = doc.getElementById(SHELL_ID);
    if (!root || !motionOK()) { applyVisibility(false); return; }
    leaving = true;
    root.classList.add('exp-leaving');
    setTimeout(() => {
      leaving = false;
      root.classList.remove('exp-leaving');
      applyVisibility(false);
    }, 240);
  }

  let statDelta = null;

  function diffStat(prevD, curD) {
    if (!prevD || !curD) return null;
    const out = {};
    ['物资', '健康', '士气', '狩猎技巧'].forEach(k => {
      const a = +prevD[k], b = +curD[k];
      if (Number.isFinite(a) && Number.isFinite(b) && a !== b) out[k] = { from: a, to: b };
    });
    CAST.forEach(n => {
      [['好感', prevD.好感, curD.好感]].forEach(([g, pa, ca]) => {
        const a = +((pa || {})[n]), b = +((ca || {})[n]);
        if (Number.isFinite(a) && Number.isFinite(b) && a !== b) out[g + '.' + n] = { from: a, to: b };
      });
      const va = String((prevD.心声 || {})[n] || ''), vb = String((curD.心声 || {})[n] || '');
      if (va !== vb && vb) out['心声.' + n] = { text: true };
    });
    ['时间', '地点'].forEach(k => {
      const a = String(prevD[k] || ''), b = String(curD[k] || '');
      if (a !== b && b) out[k] = { text: true };
    });
    return Object.keys(out).length ? out : null;
  }

  function tweenNumber(el, from, to, dur) {
    const raf = cb => (window.parent.requestAnimationFrame || requestAnimationFrame)(cb);
    let t0 = null;
    const step = t => {
      if (!el.isConnected) return;
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) raf(step);
    };
    raf(step);
  }

  function playStatFx() {
    const d = statDelta;
    statDelta = null;
    if (!d || !isShellVisible()) return;
    if (!motionOK()) return;
    const root = doc.getElementById(SHELL_ID);
    if (!root) return;
    Object.entries(d).forEach(([key, ch]) => {
      root.querySelectorAll('[data-stat="' + key + '"]').forEach(box => {
        const panel = box.closest('.exp-panel');
        if (panel && !panel.classList.contains('active')) return;
        if (ch.text) { animateOnce(box, box.classList.contains('exp-tb-item') ? 'exp-tb-flash' : 'exp-fade-in'); return; }
        if (box.classList.contains('frozen')) return;
        const num = box.querySelector('.cell-num,.meter-num');
        if (num && num.textContent.trim() === String(ch.to)) tweenNumber(num, ch.from, ch.to, 500);
        const fill = box.querySelector('.fill,.meter-fill');
        if (fill) {
          fill.style.transition = 'none';
          fill.style.width = Math.max(0, Math.min(100, ch.from)) + '%';
          void fill.offsetWidth;
          fill.style.transition = '';
          fill.style.width = Math.max(0, Math.min(100, ch.to)) + '%';
        }
        animateOnce(box, 'exp-pulse');
      });
    });
  }

  // ════ 设置项(主题/选项模式/立绘模式/字号/动效/SFW) ════
  const THEMES = [
    { key: 'dark', name: '黑金远征', desc: '默认深色，午夜甲板上的黄铜灯' },
    { key: 'arctic', name: '极夜冰海', desc: '深蓝夜海，冷金是月照的浮冰' },
    { key: 'parchment', name: '羊皮纸海图', desc: '陈年纸面青墨批注，金箔作边' },
    { key: 'ivory', name: '象牙皇家蓝', desc: '象牙白配海军蓝侧栏，黄铜纽扣的帝国制服' },
    { key: 'marble', name: '大理石鎏金', desc: '冷灰石面配鎏金与酒红，军官沙龙的内饰' },
  ];
  let theme = 'dark';
  { const t = safeLSGet(LS_KEYS.theme); if (t && THEMES.some(x => x.key === t)) theme = t; }

  const OPTION_MODES = [
    { key: 'send', name: '直接发送', desc: '点选后立即作为你的行动发出' },
    { key: 'insert', name: '填入输入框', desc: '点选后填进输入框，可修改后再发送' },
  ];
  let optionMode = 'send';
  { const m = safeLSGet(LS_KEYS.optionMode); if (OPTION_MODES.some(x => x.key === m)) optionMode = m; }

  function applyOptionMode(key) {
    optionMode = key;
    safeLSSet(LS_KEYS.optionMode, key);
    renderSettingsTab();
  }

  const HERO_MODES = [
    { key: 'stable', name: '固定显示', desc: '进入时随机定一张后保持不变，可在画廊固定指定立绘' },
    { key: 'rand', name: '每楼随机', desc: '每有新楼层随机换一张，画廊里固定过的立绘不受影响' },
  ];
  let heroMode = 'stable';
  { const m = safeLSGet(LS_KEYS.heroMode); if (HERO_MODES.some(x => x.key === m)) heroMode = m; }

  function applyHeroMode(key) {
    heroMode = key;
    safeLSSet(LS_KEYS.heroMode, key);
    renderSettingsTab();
  }

  const FONT_MODES = [
    { key: 'std', name: '标准', desc: '默认字号' },
    { key: 'lg', name: '较大', desc: '正文放大一档' },
    { key: 'xl', name: '特大', desc: '正文放大两档' },
  ];
  let fontMode = 'std';
  { const m = safeLSGet(LS_KEYS.fontSize); if (FONT_MODES.some(x => x.key === m)) fontMode = m; }

  function applyFontMode(key) {
    fontMode = key;
    safeLSSet(LS_KEYS.fontSize, key);
    const root = doc.getElementById(SHELL_ID);
    if (root) { if (key === 'std') root.removeAttribute('data-fontsize'); else root.setAttribute('data-fontsize', key); }
    renderSettingsTab();
  }

  const MOTION_MODES = [
    { key: 'full', name: '全部动效', desc: '进场、切页、数值反馈等完整动画' },
    { key: 'lite', name: '减弱动效', desc: '关闭入场与反馈动画，仅保留即时响应' },
  ];
  let motionMode = 'full';
  { const m = safeLSGet(LS_KEYS.motion); if (MOTION_MODES.some(x => x.key === m)) motionMode = m; }

  function syncMotionAttr() {
    [SHELL_ID, 'exp-entry'].forEach(id => {
      const el = doc.getElementById(id);
      if (!el) return;
      if (motionMode === 'lite') el.setAttribute('data-motion', 'off'); else el.removeAttribute('data-motion');
    });
  }

  function applyMotionMode(key) {
    motionMode = key;
    safeLSSet(LS_KEYS.motion, key);
    syncMotionAttr();
    renderSettingsTab();
  }

  function motionOK() {
    if (motionMode !== 'full') return false;
    try { if (window.parent.matchMedia('(prefers-reduced-motion:reduce)').matches) return false; } catch (e) { dbg('motionQuery', e); }
    return true;
  }

  const SFW_MODES = [
    { key: 'nsfw', name: 'NSFW模式', desc: '显示所有立绘' },
    { key: 'sfw', name: 'SFW模式', desc: '显示日常立绘，隐藏NSFW主题' },
  ];
  let sfwMode = 'nsfw';
  { const m = safeLSGet(LS_KEYS.sfw); if (SFW_MODES.some(x => x.key === m)) sfwMode = m; }

  function applySfwMode(key) {
    sfwMode = key;
    safeLSSet(LS_KEYS.sfw, key);
    const root = doc.getElementById(SHELL_ID);
    if (root) { if (key === 'sfw') root.setAttribute('data-sfw', ''); else root.removeAttribute('data-sfw'); }
    renderSettingsTab();
  }

  function applyTheme(key) {
    theme = key;
    const root = doc.getElementById(SHELL_ID);
    if (root) { if (key === 'dark') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', key); }
    const entry = doc.getElementById(SEL.entry);
    if (entry) { if (key === 'dark') entry.removeAttribute('data-theme'); else entry.setAttribute('data-theme', key); }
    safeLSSet(LS_KEYS.theme, key);
    renderAll(true);
    renderSettingsTab();
    animateOnce(root, 'exp-theme-fade');
  }

  function renderSettingsTab() {
    const panel = getPanel('settings');
    if (!panel) return;
    panel.innerHTML = `<div class="exp-set"><h4>界面主题</h4><div class="exp-theme-list">${THEMES.map(t => `
      <button class="exp-theme-opt ${t.key === theme ? 'sel' : ''}" data-key="${t.key}">
        <span class="exp-theme-sw">${themeSwatch(t.key).map(c => `<i style="background:${c}"></i>`).join('')}</span>
        <span><span class="exp-theme-name">${t.name}</span><div class="exp-theme-desc">${t.desc}</div></span>
        <span class="exp-theme-check">${ICO.check}</span>
      </button>`).join('')}</div>
    <h4>内容分级</h4><div class="exp-theme-list">${SFW_MODES.map(o => `
      <button class="exp-theme-opt ${o.key === sfwMode ? 'sel' : ''}" data-sfw-key="${o.key}">
        <span><span class="exp-theme-name">${o.name}</span><div class="exp-theme-desc">${o.desc}</div></span>
        <span class="exp-theme-check">${ICO.check}</span>
      </button>`).join('')}</div>
    <h4>行动选项</h4><div class="exp-theme-list">${OPTION_MODES.map(o => `
      <button class="exp-theme-opt ${o.key === optionMode ? 'sel' : ''}" data-mode="${o.key}">
        <span><span class="exp-theme-name">${o.name}</span><div class="exp-theme-desc">${o.desc}</div></span>
        <span class="exp-theme-check">${ICO.check}</span>
      </button>`).join('')}</div>
    <h4>立绘显示</h4><div class="exp-theme-list">${HERO_MODES.map(o => `
      <button class="exp-theme-opt ${o.key === heroMode ? 'sel' : ''}" data-hero="${o.key}">
        <span><span class="exp-theme-name">${o.name}</span><div class="exp-theme-desc">${o.desc}</div></span>
        <span class="exp-theme-check">${ICO.check}</span>
      </button>`).join('')}</div>
    <h4>正文字号</h4><div class="exp-theme-list">${FONT_MODES.map(o => `
      <button class="exp-theme-opt ${o.key === fontMode ? 'sel' : ''}" data-font="${o.key}">
        <span><span class="exp-theme-name">${o.name}</span><div class="exp-theme-desc">${o.desc}</div></span>
        <span class="exp-theme-check">${ICO.check}</span>
      </button>`).join('')}</div>
    <h4>动画效果</h4><div class="exp-theme-list">${MOTION_MODES.map(o => `
      <button class="exp-theme-opt ${o.key === motionMode ? 'sel' : ''}" data-motion-key="${o.key}">
        <span><span class="exp-theme-name">${o.name}</span><div class="exp-theme-desc">${o.desc}</div></span>
        <span class="exp-theme-check">${ICO.check}</span>
      </button>`).join('')}</div></div>`;
    panel.querySelectorAll('.exp-theme-opt[data-key]').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.key)));
    panel.querySelectorAll('.exp-theme-opt[data-sfw-key]').forEach(b => b.addEventListener('click', () => applySfwMode(b.dataset.sfwKey)));
    panel.querySelectorAll('.exp-theme-opt[data-mode]').forEach(b => b.addEventListener('click', () => applyOptionMode(b.dataset.mode)));
    panel.querySelectorAll('.exp-theme-opt[data-hero]').forEach(b => b.addEventListener('click', () => applyHeroMode(b.dataset.hero)));
    panel.querySelectorAll('.exp-theme-opt[data-motion-key]').forEach(b => b.addEventListener('click', () => applyMotionMode(b.dataset.motionKey)));
    panel.querySelectorAll('.exp-theme-opt[data-font]').forEach(b => b.addEventListener('click', () => applyFontMode(b.dataset.font)));
  }

  // ════ 角色与画廊(角色页/画廊/灯箱) ════
  function memoHtml(entry) {
    const m = fmtMemoir(entry);
    return `<div class="memo-item">${m.head ? `<div class="memo-head">${escapeHtml(m.head)}</div>` : ''}<div class="memo-text">${escapeHtml(m.body)}</div></div>`;
  }

  function keepActiveTabVisible(panel) {
    const el = panel.querySelector('.exp-char-tab.active');
    const box = el && el.parentElement;
    if (!box || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft = Math.max(0, el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2);
  }

  function castTabsState(D) {
    const isDead = n => isDeadTag(D.好感[n]);
    if (!charSel || !CAST.includes(charSel)) charSel = CAST.find(n => !isDead(n)) || CAST[0];
    const html = CAST.map(n =>
      `<button class="exp-char-tab ${n === charSel ? 'active' : ''} ${isDead(n) ? 'dead' : ''}" data-name="${n}">${n}${isDead(n) ? '<span class="tab-dead">已故</span>' : ''}</button>`
    ).join('');
    return { isDead, html };
  }

  function renderCharTab(D) {
    const panel = getPanel('char');
    if (!panel) return;
    const { isDead, html: tabs } = castTabsState(D);
    const name = charSel, dead = isDead(name);
    const affVal = Math.max(0, Math.min(100, +D.好感[name] || 0)), affTier = tierIdx(affVal);
    const pvAff = dead ? NaN : +_.get(previousStat() || {}, '好感.' + name);
    const affDelta = isNaN(pvAff) ? 0 : affVal - Math.max(0, Math.min(100, pvAff));
    const affTicks = [25, 50, 75].map(p => `<span class="meter-tick" style="left:${p}%"></span>`).join('');
    const deltaHtml = affDelta ? `<span class="meter-delta ${affDelta > 0 ? 'up' : 'down'}">${affDelta > 0 ? ICO.up : ICO.down}${Math.abs(affDelta)}</span>` : '';
    const front = frontImg(name);
    const voice = String((D.心声 || {})[name] || '').trim();
    const memos = Array.isArray((D.回想 || {})[name]) ? D.回想[name].filter(x => String(x || '').trim()).slice(-10) : [];
    panel.innerHTML = `
      <div class="exp-char-tabs">${tabs}</div>
      <div class="exp-char-body">
        <div class="exp-char-stage ${dead ? 'dead' : ''}">
          <div class="hero-card">
            <div class="hero-inner">
              <div class="hero-face front">${front ? `<img src="${escapeHtml(front)}" onerror="this.style.opacity=.25">` : noArt('立绘待补')}</div>
            </div>
          </div>
        </div>
        <div class="exp-char-side">
          <div class="exp-char-cell aff" data-stat="好感.${name}">
            <div class="cell-head"><span class="cell-ico">${ICO.aff}</span><span class="cell-name">好感</span><span class="cell-tier">${dead ? '已故' : ''}</span>${deltaHtml}<span class="cell-num">${dead ? '—' : affVal}</span></div>
            <div class="cell-bar"><div class="fill" style="width:${dead ? 0 : affVal}%"></div>${dead ? '' : affTicks}</div>
            ${dead ? '' : trackHtml(AFF, affTier)}
          </div>
          <div class="exp-char-cell voice" data-stat="心声.${name}">
            <div class="cell-head"><span class="cell-ico">${ICO.voice}</span><span class="cell-name">心声</span></div>
            <div class="cell-voice ${voice ? '' : 'empty'}">${voice ? escapeHtml(voice) : '她的心声还没有传到这里'}</div>
          </div>
          <div class="exp-char-cell memo">
            <div class="cell-head"><span class="cell-ico">${ICO.memoir}</span><span class="cell-name">回想</span></div>
            ${memos.length ? `<div class="cell-memos">${memos.map(memoHtml).join('')}</div>` : '<div class="cell-memos empty">还没有留下回想</div>'}
          </div>
        </div>
      </div>`;
    keepActiveTabVisible(panel);
    panel.querySelectorAll('.exp-char-tab').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.name === charSel) return;
      charSel = b.dataset.name;
      renderCharTab(D);
      animateSubSwitch(panel, '.exp-char-stage, .exp-char-side .exp-char-cell');
    }));
  }

  function refreshChar(){ try { renderCharTab(readMVU()); } catch (e) { dbg('refreshChar', e); } }
  function galThumb(url, pinned, pos, tier){
    const cls = pinned ? ' pinned' : '';
    const pin = pos === 'back' ? '' : `<span class="exp-gal-pin" title="${pinned ? '取消固定' : '固定为显示立绘'}">${ICO.check}</span>`;
    return `<button class="exp-gal-thumb${cls}" data-url="${url}" data-pos="${pos}" data-tier="${tier == null ? '' : tier}"><img loading="lazy" src="${url}" onerror="this.style.opacity=.2">${pin}${pos === 'back' ? '<span class="exp-gal-lock">' + ICO.lock + '</span>' : ''}</button>`;
  }
  function galItems(name){
    const g = GAL[name] || { normal: [], degrade: [] };
    const items = [];
    g.normal.forEach(t => t.imgs.forEach((u, i) => items.push({ url: u, label: t.label + ' ' + (i + 1), pos: 'front', tier: null })));
    g.degrade.forEach((imgs, ti) => imgs.forEach((u, i) => items.push({ url: u, label: 'NSFW ' + (ti * 3 + i + 1), pos: 'back', tier: ti })));
    return items;
  }
  function lbItems(name){ const items = galItems(name); return sfwMode === 'sfw' ? items.filter(x => x.pos !== 'back') : items; }
  function togglePin(name, it){
    if (it.pos !== 'front') return;
    if (!pins[name]) pins[name] = { front: null };
    pins[name].front = (pins[name].front === it.url ? null : it.url);
    savePins(); refreshChar();
  }
  function galSectionsHTML(name){
    const g = GAL[name] || { normal: [], degrade: [] };
    const p = pins[name] || { front: null };
    const normalRows = g.normal.length ? g.normal.map(t =>
      `<div class="exp-gal-theme"><span class="exp-gal-lab">${t.label}</span><div class="exp-gal-imgs">${t.imgs.map(u => galThumb(u, p.front === u, 'front', null)).join('')}</div></div>`).join('') : noArt('立绘待补');
    const nsfwRows = g.degrade.length ? g.degrade.map((imgs, ti) =>
      `<div class="exp-gal-theme"><div class="exp-gal-imgs">${imgs.map(u => galThumb(u, false, 'back', ti)).join('')}</div></div>`).join('') : noArt('立绘待补');
    return `<div class="exp-gal-body">
      <div class="exp-gal-sec"><div class="exp-gal-sec-head"><span>SFW</span></div><div class="exp-gal-grid">${normalRows}</div></div>
      <div class="exp-gal-sec"><div class="exp-gal-sec-head"><span>NSFW</span></div><div class="exp-gal-grid">${nsfwRows}</div></div>
    </div>`;
  }
  function renderGalleryTab(D){
    const panel = getPanel('gallery');
    if (!panel) return;
    const { html: tabs } = castTabsState(D);
    const name = charSel;
    panel.innerHTML = `<div class="exp-char-tabs">${tabs}</div>${galSectionsHTML(name)}`;
    keepActiveTabVisible(panel);
    panel.querySelectorAll('.exp-char-tab').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.name === charSel) return;
      charSel = b.dataset.name;
      renderGalleryTab(D);
      refreshChar();
      animateSubSwitch(panel, '.exp-gal-sec-head, .exp-gal-theme');
    }));
    bindGalleryPanel(panel, name, D);
  }
  function bindGalleryPanel(panel, name, D){
    if (!pins[name]) pins[name] = { front: null };
    const keepScroll = fn => { const body = panel.querySelector('.exp-gal-body'); const y = body ? body.scrollTop : 0; fn(); const b2 = panel.querySelector('.exp-gal-body'); if (b2) b2.scrollTop = y; };
    const rerender = () => keepScroll(() => renderGalleryTab(D));
    panel.querySelectorAll('.exp-gal-thumb').forEach(b => {
      const it = { url: b.dataset.url, pos: b.dataset.pos, tier: b.dataset.tier === '' ? null : +b.dataset.tier };
      b.addEventListener('click', () => { const items = galItems(name); const idx = items.findIndex(x => x.url === it.url); openLightbox(name, idx < 0 ? 0 : idx); });
      const pin = b.querySelector('.exp-gal-pin');
      if (pin) pin.addEventListener('click', e => { e.stopPropagation(); togglePin(name, it); rerender(); });
    });
  }

  let lbState = null;
  function lbPinned(name, it){ const p = pins[name] || {}; return it.pos === 'front' && p.front === it.url; }
  function refreshGalleryKeepScroll(){
    const panel = getPanel('gallery');
    const body = panel ? panel.querySelector('.exp-gal-body') : null;
    const y = body ? body.scrollTop : 0;
    try { renderGalleryTab(readMVU()); } catch (e) { dbg('refreshGallery', e); }
    const b2 = panel ? panel.querySelector('.exp-gal-body') : null;
    if (b2) b2.scrollTop = y;
  }
  function openLightbox(name, idx){
    const root = doc.getElementById(SHELL_ID);
    if (!root || !GAL[name]) return;
    closeLightbox();
    const wrap = doc.createElement('div');
    wrap.id = SEL.lightbox;
    wrap.className = 'exp-lightbox';
    root.appendChild(wrap);
    lbState = { name, idx };
    renderLightbox(wrap);
    if (motionOK()) {
      wrap.classList.add('exp-lb-in');
      setTimeout(() => wrap.classList.remove('exp-lb-in'), 400);
    }
    doc.addEventListener('keydown', lbKey);
  }
  function renderLightbox(wrap){
    const name = lbState.name, items = lbItems(name), it = items[lbState.idx];
    if (!it) { closeLightbox(); return; }
    const pinned = lbPinned(name, it);
    const pinBtn = it.pos === 'front'
      ? `<button class="exp-lb-pin${pinned ? ' on' : ''}">${ICO.check}<span>${pinned ? '已固定，点击取消' : '固定为显示立绘'}</span></button>`
      : '';
    wrap.innerHTML = `
      <div class="exp-lb-backdrop"></div>
      <div class="exp-lb-stage">
        <div class="exp-lb-figure">
          <img class="exp-lb-img" src="${it.url}" onerror="this.style.opacity=.25">
          <button class="exp-lb-close" title="关闭">${ICO.close}</button>
        </div>
        <div class="exp-lb-bar">
          <span class="exp-lb-cap">${name}　${it.label}<span class="exp-lb-count">${lbState.idx + 1} / ${items.length}</span></span>
          ${pinBtn}
        </div>
      </div>
      <button class="exp-lb-nav prev" title="上一张">${ICO.chev}</button>
      <button class="exp-lb-nav next" title="下一张">${ICO.chev}</button>`;
    [lbState.idx - 1, lbState.idx + 1].forEach(i => { const n = items[(i + items.length) % items.length]; const im = new Image(); im.src = n.url; });
    wrap.querySelector('.exp-lb-backdrop').addEventListener('click', closeLightbox);
    wrap.querySelector('.exp-lb-close').addEventListener('click', closeLightbox);
    wrap.querySelector('.exp-lb-nav.prev').addEventListener('click', () => lbStep(-1));
    wrap.querySelector('.exp-lb-nav.next').addEventListener('click', () => lbStep(1));
    const pinEl = wrap.querySelector('.exp-lb-pin');
    if (pinEl) pinEl.addEventListener('click', () => { togglePin(name, it); refreshGalleryKeepScroll(); renderLightbox(wrap); });
  }
  function lbStep(d){
    const wrap = doc.getElementById(SEL.lightbox);
    if (!wrap || !lbState) return;
    const len = lbItems(lbState.name).length;
    lbState.idx = (lbState.idx + d + len) % len;
    renderLightbox(wrap);
  }
  function lbKey(e){
    if (!lbState) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') lbStep(-1);
    else if (e.key === 'ArrowRight') lbStep(1);
  }
  function closeLightbox(){
    const el = doc.getElementById(SEL.lightbox);
    lbState = null;
    doc.removeEventListener('keydown', lbKey);
    if (!el) return;
    if (!motionOK()) { el.remove(); return; }
    el.removeAttribute('id');
    el.classList.add('exp-lb-out');
    setTimeout(() => el.remove(), 220);
  }

  // ════ 船员 ════
  const ROSTER_GROUPS = ['军官', '水手与工匠', '学徒帮工', '因纽特人', '其他'];
  const ROSTER_BADGE = { 患病: 'ill', 重伤: 'ill', 疯癫: 'mad', 死亡: 'gone' };
  function parseRosterVal(val) {
    const seg = String(val || '').split('／').map(s => s.trim());
    return { group: ROSTER_GROUPS.includes(seg[0]) ? seg[0] : '其他', role: seg[1] || '', st: seg[2] || '健在', note: seg.slice(3).join('／') };
  }
  function statusTone(st) { return isDeadTag(st) ? 'gone' : (ROSTER_BADGE[st] || ''); }
  function rosterItems(D) {
    const alive = [], dead = [];
    Object.entries(D.名册 || {}).forEach(([name, val]) => {
      const it = Object.assign({ name }, parseRosterVal(val));
      (isDeadTag(it.st) ? dead : alive).push(it);
    });
    return { alive, dead };
  }
  function groupRoster(alive) {
    const bag = new Map(ROSTER_GROUPS.map(g => [g, []]));
    alive.forEach(it => bag.get(it.group).push(it));
    return ROSTER_GROUPS.filter(g => bag.get(g).length).map(g => ({ label: g, items: bag.get(g) }));
  }
  function rosterStatHtml(alive, dead) {
    const all = alive.concat(dead);
    if (!all.length) return '';
    const cnt = { ok: 0, ill: 0, mad: 0, gone: 0 };
    all.forEach(it => { cnt[statusTone(it.st) || 'ok']++; });
    const SEG = [['ok', '健在'], ['ill', '伤病'], ['mad', '疯癫'], ['gone', '已故']];
    const bar = SEG.filter(([k]) => cnt[k]).map(([k]) => `<span class="seg ${k}" data-seg="${k}" data-n="${cnt[k]}" style="flex:${cnt[k]}"></span>`).join('');
    const leg = SEG.filter(([k]) => cnt[k]).map(([k, n]) => `<span class="lg ${k}" data-seg="${k}"><i></i>${n} ${cnt[k]}</span>`).join('');
    return `<div class="exp-roster-stat"><div class="exp-roster-bar">${bar}</div><div class="exp-roster-legend"><span class="tot">在册 ${all.length} 人</span>${leg}</div></div>`;
  }
  function rosterCard(it, i) {
    const aliveCls = isDeadTag(it.st) ? ' dead' : ' alive';
    return `<div class="exp-roster-card${aliveCls}"${isDeadTag(it.st) ? '' : ` data-i="${i}"`}>
      <div class="exp-roster-top"><span class="exp-roster-name">${escapeHtml(it.name)}</span><span class="exp-roster-badge ${ROSTER_BADGE[it.st] || ''}">${escapeHtml(it.st)}</span></div>
      ${it.role ? `<div class="exp-roster-role">${escapeHtml(it.role)}</div>` : ''}
      ${it.note ? `<div class="exp-roster-note">${escapeHtml(it.note)}</div>` : ''}
    </div>`;
  }

  function crewCell(ico, title, body) {
    return `<div class="exp-char-cell"><div class="cell-head"><span class="cell-ico">${ico}</span><span class="cell-name">${title}</span></div>${body}</div>`;
  }

  function renderCrewTab(D) {
    const panel = getPanel('crew');
    if (!panel) return;
    const frozen = D.身处 === '营地';
    const pv = previousStat();
    const m = t => meter(D, t, { frozen, delta: (!frozen && pv) ? D[t] - (+_.get(pv, t) || 0) : 0 });
    const { alive, dead } = rosterItems(D);
    const groups = groupRoster(alive);
    const flat = groups.reduce((a, g) => a.concat(g.items), []);
    let fi = 0;
    const rosterBody = (alive.length || dead.length)
      ? rosterStatHtml(alive, dead)
        + groups.map(g => `<div class="exp-roster-sect"><span>${g.label}</span></div><div class="exp-roster-grid">${g.items.map(it => rosterCard(it, fi++)).join('')}</div>`).join('')
        + (dead.length ? `<div class="exp-roster-sect"><span>死者名录</span></div><div class="exp-roster-grid">${dead.map(it => rosterCard(it)).join('')}</div>` : '')
      : '<div class="exp-crew-empty">还没跟船上的人混熟</div>';
    panel.innerHTML = `<div class="exp-crew">
      <div class="exp-crew-meters">${m('物资')}${m('健康')}${m('士气')}</div>
      ${crewCell(ICO.crew, '船员名册', rosterBody)}
    </div>`;
    panel.querySelectorAll('.exp-roster-card.alive[data-i]').forEach(c => c.addEventListener('click', () => {
      if (sending) return;
      onOptionClick('去找' + flat[+c.dataset.i].name + '。');
      switchTab('story');
    }));
  }

  // ════ 狩猎 ════
  const PREY = [
    { k: '观学', name: '随行观学', min: 0, desc: '跟着猎队跑腿打杂，帮着背肉、看狗、凿冰洞' },
    { k: '鱼', name: '冰下钓鱼', min: 25, desc: '在冰面上凿个洞，把鱼线放下去，守着等鱼上钩', verb: '去冰上凿孔钓鱼' },
    { k: '小猎', name: '雪套小猎', min: 25, desc: '在灌木丛和雪地边上下套子，抓雷鸟和白兔', verb: '去下套子，抓雷鸟和白兔' },
    { k: '海豹', name: '守呼吸孔', min: 25, desc: '蹲在海豹换气的水洞边上，等它探出头那一刻下手', verb: '去守呼吸孔，猎头海豹' },
    { k: '驯鹿', name: '驯鹿围猎', min: 50, camp: true, desc: '分几路把鹿群往一处赶，再用弓箭长矛扎', verb: '去围猎驯鹿' },
    { k: '麝牛', name: '麝牛', min: 50, camp: true, desc: '会围成一圈顶着不跑的硬骨头，得靠狗缠住、人上去扎', verb: '去猎麝牛' },
    { k: '海象', name: '海象', min: 75, camp: true, desc: '浮冰边上的大家伙，一对大牙能掀船也能伤人', verb: '去浮冰边猎海象' },
    { k: '熊', name: '猎熊', min: 75, camp: true, desc: '先让猎犬把它缠住，人再凑上去扎矛子', verb: '去猎熊' },
  ];
  const PREY_TIER = { 25: '学徒猎人', 50: '猎手', 75: '名猎手' };
  const MATES = ['独自', '瑙雅', '茜拉', '部落猎手', '全部落'];
  const MATE_LABEL = { 部落猎手: '几名猎手' };
  const huntSel = { prey: '观学', mates: ['独自'], dogs: false };
  function huntUnlocked(D) { return D.身处 === '营地' || D.狩猎技巧 > 0; }
  function toggleMate(m) {
    let ms = huntSel.mates.slice();
    if (m === '独自') ms = ['独自'];
    else if (m === '全部落') ms = ['全部落'];
    else {
      ms = ms.filter(x => x !== '独自' && x !== '全部落');
      ms = ms.includes(m) ? ms.filter(x => x !== m) : ms.concat(m);
      if (!ms.length) ms = ['独自'];
    }
    huntSel.mates = ms;
  }
  function huntText(D) {
    const home = D.身处 === '营地';
    const tribe = huntSel.mates.includes('全部落');
    const list = huntSel.mates.filter(m => m !== '独自' && m !== '全部落').map(m => MATE_LABEL[m] || m).join('、');
    if (huntSel.prey === '观学') {
      let t = `跟着${tribe ? '全部落的猎队' : (list || '猎队')}出猎，打下手，多看多学`;
      if (huntSel.dogs) t += '，带上猎犬队';
      return t + '。';
    }
    const preyDef = PREY.find(p => p.k === huntSel.prey);
    const verb = (preyDef && preyDef.verb) || '';
    let t = (tribe ? '全部落出动，' : list ? `和${list}` : '') + verb;
    if (!home && (huntSel.prey === '鱼' || huntSel.prey === '小猎' || huntSel.prey === '海豹')) t += '，就在船附近的冰面';
    if (huntSel.dogs) t += '，带上猎犬队';
    return t + '。';
  }
  function huntUsable(D, p) {
    const v = D.狩猎技巧, home = D.身处 === '营地';
    return v >= p.min && !(p.camp && !home);
  }
  function huntMateOk(D, m) {
    const home = D.身处 === '营地';
    if (m === '独自') return true;
    if (m === '部落猎手' || m === '全部落') return home;
    return D.好感[m] !== '死亡';
  }
  function normalizeHuntSelection(D) {
    const home = D.身处 === '营地';
    if (!PREY.some(p => p.k === huntSel.prey && huntUsable(D, p))) huntSel.prey = '观学';
    huntSel.mates = huntSel.mates.filter(m => huntMateOk(D, m));
    if (!huntSel.mates.length) huntSel.mates = ['独自'];
    if (!home) huntSel.dogs = false;
  }
  function buildPreyGridHtml(D) {
    const v = D.狩猎技巧;
    return `<div class="exp-prey-grid">${PREY.map(p => {
      const ok = huntUsable(D, p);
      const req = ok ? '' : (v < p.min ? `「${PREY_TIER[p.min]}」可解锁` : '需在营地');
      return `<button class="exp-prey-card${huntSel.prey === p.k ? ' sel' : ''}${ok ? '' : ' locked'}" data-prey="${p.k}"${ok ? '' : ' disabled'}>
        <span class="exp-prey-name">${p.name}</span>
        <span class="exp-prey-desc">${p.desc}</span>
        ${req ? `<span class="exp-prey-req">${req}</span>` : ''}
      </button>`;
    }).join('')}</div>`;
  }
  function buildMateRowHtml(D) {
    const home = D.身处 === '营地';
    const mateBtn = (m, sel, ok) => `<button class="exp-mate-btn${sel ? ' sel' : ''}${ok ? '' : ' disabled'}" data-mate="${m}"${ok ? '' : ' disabled'}>${m}</button>`;
    return `<div class="exp-mate-row">${MATES.map(m => mateBtn(m, huntSel.mates.includes(m), huntMateOk(D, m))).join('')}${mateBtn('猎犬队', huntSel.dogs, home)}</div>`;
  }
  function renderHuntTab(D) {
    const panel = getPanel('hunt'); if (!panel) return;
    if (!huntUnlocked(D)) {
      panel.innerHTML = `<div class="exp-hunt-lock">
        <span class="exp-hunt-lock-ico">${ICO.hunt}</span>
        <div class="exp-hunt-lock-t">船上没人会这门手艺</div>
        <div class="exp-hunt-lock-d">北边的冰原上，有人靠打猎生活<br>等跟因纽特人一块儿过日子、学过他们的本事，这一页才打得开</div>
      </div>`;
      return;
    }
    normalizeHuntSelection(D);
    const sect = (ico, lab) => `<div class="sheet-sect"><span class="cell-ico">${ico}</span><span class="sheet-lab">${lab}</span></div>`;
    panel.innerHTML = `<div class="exp-hunt">
      <div class="exp-hunt-sheet">
        <div class="cell-head"><span class="cell-ico">${ICO.hunt}</span><span class="cell-name">出猎</span></div>
        ${meter(D, '狩猎技巧')}
        ${sect(ICO.paw, '猎物')}${buildPreyGridHtml(D)}
        ${sect(ICO.char, '同行')}${buildMateRowHtml(D)}
        <div class="sheet-rule"></div>
        <div class="exp-brief-foot"><button class="exp-hunt-go">出　猎</button></div>
      </div>
    </div>`;
    panel.querySelectorAll('.exp-prey-card:not(.locked)').forEach(b => b.addEventListener('click', () => { huntSel.prey = b.dataset.prey; renderHuntTab(D); animateOnce(panel.querySelector('.exp-hunt-go'), 'exp-fade-in'); }));
    panel.querySelectorAll('.exp-mate-btn:not(.disabled)').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.mate === '猎犬队') huntSel.dogs = !huntSel.dogs;
      else toggleMate(b.dataset.mate);
      renderHuntTab(D);
      animateOnce(panel.querySelector('.exp-hunt-go'), 'exp-fade-in');
    }));
    const go = panel.querySelector('.exp-hunt-go');
    if (go) go.addEventListener('click', () => {
      if (sending) return;
      onOptionClick(huntText(D));
      switchTab('story');
    });
  }

  // ════ 地图 ════
  const MAP_ASPECT = MAPH / MAPW, MAP_MINW = MAPW * 0.05;
  let viewAspect = MAP_ASPECT;
  let mapView = null;
  let mapViewAspect = null;
  let mapDragged = false;
  let mapSubView = 'chart';
  { const v = safeLSGet(LS_KEYS.mapView); if (v === 'ship' || v === 'chart') mapSubView = v; }
  function setMapSubView(v) { mapSubView = v; safeLSSet(LS_KEYS.mapView, v); }
  const MAPCTL = {
    in: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'><circle cx='10.5' cy='10.5' r='6.5'/><path d='M10.5 7.5v6M7.5 10.5h6'/><path d='M15.4 15.4 20 20'/></svg>",
    out: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'><circle cx='10.5' cy='10.5' r='6.5'/><path d='M7.5 10.5h6'/><path d='M15.4 15.4 20 20'/></svg>",
    home: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'><circle cx='12' cy='12' r='7'/><path d='M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3'/><circle cx='12' cy='12' r='1.5' fill='currentColor' stroke='none'/></svg>",
    fit: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'/></svg>",
  };
  function clampView(v) {
    v.w = Math.max(MAP_MINW, Math.min(MAPW, MAPH / viewAspect, v.w));
    v.h = v.w * viewAspect;
    v.x = Math.max(0, Math.min(MAPW - v.w, v.x));
    v.y = Math.max(0, Math.min(MAPH - v.h, v.y));
    return v;
  }
  function mapCssFlag(panel, name) {
    return !!panel && getComputedStyle(panel).getPropertyValue(name).trim() === '1';
  }
  const mapFillMode = panel => mapCssFlag(panel, '--map-fill');
  const mapPortraitMode = panel => mapCssFlag(panel, '--map-portrait');
  function syncViewAspect(panel) {
    const body = panel && panel.querySelector('.exp-map-body');
    let a = MAP_ASPECT;
    if (body && mapFillMode(panel)) {
      const w = body.clientWidth, h = body.clientHeight;
      if (w > 0 && h > 0) a = h / w;
    }
    if (Math.abs(a - viewAspect) > 0.002) viewAspect = a;
  }
  function fitViewToRegions(curIdx) {
    const r = REGIONS.find(x => x.idx === curIdx) || REGIONS[0];
    const xs = [], ys = [];
    r.poly.forEach(p => { xs.push(projX(p[0])); ys.push(projY(p[1])); });
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = Math.max((maxX - minX) * 0.35, 80), padY = Math.max((maxY - minY) * 0.35, 80);
    let w = (maxX - minX) + 2 * padX;
    const h = (maxY - minY) + 2 * padY;
    if (w * viewAspect < h) w = h / viewAspect;
    return clampView({ x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - (w * viewAspect) / 2, w: w, h: w * viewAspect });
  }
  function applyView(svg) {
    if (!svg || !mapView) return;
    svg.setAttribute('viewBox', mapView.x.toFixed(1) + ' ' + mapView.y.toFixed(1) + ' ' + mapView.w.toFixed(1) + ' ' + mapView.h.toFixed(1));
    const rw = svg.getBoundingClientRect().width;
    const k = (rw > 0 ? 1.15 * mapView.w / rw : mapView.w / MAPW).toFixed(4);
    svg.querySelectorAll('.exp-poi-s, .exp-region-lab-s').forEach(g => g.setAttribute('transform', 'scale(' + k + ')'));
  }
  function zoomAround(svg, factor, ux, uy) {
    removePoiPopup(svg.parentNode);
    const fx = (ux - mapView.x) / mapView.w, fy = (uy - mapView.y) / mapView.h;
    let w = Math.max(MAP_MINW, Math.min(MAPW, mapView.w * factor));
    mapView = clampView({ x: ux - fx * w, y: uy - fy * (w * viewAspect), w: w, h: w * viewAspect });
    applyView(svg);
  }
  function bindMapInteraction(svg) {
    const pts = new Map();
    let drag = null;
    let pinch = null;
    const rectOf = () => svg.getBoundingClientRect();
    const two = () => { const a = [...pts.values()]; return [a[0], a[1]]; };
    function pinchStart() {
      const [a, b] = two(), r = rectOf();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      pinch = {
        d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        w: mapView.w,
        ux: mapView.x + (mx - r.left) / r.width * mapView.w,
        uy: mapView.y + (my - r.top) / r.height * mapView.h,
      };
    }
    function pinchMove() {
      const [a, b] = two(), r = rectOf();
      const d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const w = Math.max(MAP_MINW, Math.min(MAPW, pinch.w * pinch.d / d));
      const h = w * viewAspect;
      const fx = (mx - r.left) / r.width, fy = (my - r.top) / r.height;
      mapView = clampView({ x: pinch.ux - fx * w, y: pinch.uy - fy * h, w: w, h: h });
      applyView(svg);
    }
    svg.addEventListener('pointerdown', e => {
      if (!e.target.closest('.exp-poi')) removePoiPopup(svg.parentNode);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        drag = null;
        mapDragged = true;
        pinchStart();
      } else {
        pinch = null;
        drag = { x: e.clientX, y: e.clientY, v: Object.assign({}, mapView) };
        mapDragged = false;
      }
    });
    svg.addEventListener('pointermove', e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) { pinchMove(); return; }
      if (!drag) return;
      const r = rectOf();
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) mapDragged = true;
      mapView = clampView({ x: drag.v.x - (e.clientX - drag.x) / r.width * drag.v.w, y: drag.v.y - (e.clientY - drag.y) / r.height * drag.v.h, w: drag.v.w, h: drag.v.h });
      applyView(svg);
    });
    const lift = e => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const p = [...pts.values()][0]; drag = { x: p.x, y: p.y, v: Object.assign({}, mapView) }; }
      else if (pts.size === 0) drag = null;
    };
    svg.addEventListener('pointerup', lift);
    svg.addEventListener('pointercancel', lift);
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { pts.clear(); drag = null; pinch = null; } });
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const r = rectOf();
      const ux = mapView.x + (e.clientX - r.left) / r.width * mapView.w;
      const uy = mapView.y + (e.clientY - r.top) / r.height * mapView.h;
      zoomAround(svg, e.deltaY > 0 ? 1.18 : 1 / 1.18, ux, uy);
    }, { passive: false });
  }
  let graticuleCache = null;
  function buildGraticule() {
    if (graticuleCache != null) return graticuleCache;
    let s = '';
    for (let lon = Math.ceil(GEO.W / 10) * 10; lon <= GEO.E; lon += 10) { const x = projX(lon).toFixed(1); s += `<line class="exp-grid" x1="${x}" y1="0" x2="${x}" y2="${MAPH}"/>`; }
    for (let lat = Math.ceil(GEO.S / 2) * 2; lat <= GEO.N; lat += 2) { const y = projY(lat).toFixed(1); s += `<line class="exp-grid" x1="0" y1="${y}" x2="${MAPW}" y2="${y}"/>`; }
    return (graticuleCache = s);
  }
  let coastCache = null;
  function buildCoast() {
    if (coastCache != null) return coastCache;
    return (coastCache = COAST.map(rings => {
      const d = rings.map(r => r.map((p, i) => (i ? 'L' : 'M') + projX(p[0]).toFixed(1) + ' ' + projY(p[1]).toFixed(1)).join(' ') + 'Z').join(' ');
      return `<path class="exp-coast" d="${d}"/>`;
    }).join(''));
  }
  function regionPath(r) {
    return r.poly.map((p, i) => (i ? 'L' : 'M') + projX(p[0]).toFixed(1) + ' ' + projY(p[1]).toFixed(1)).join(' ') + 'Z';
  }
  function buildRegionsUnder(curIdx) {
    const r = REGIONS.find(x => x.idx === curIdx);
    return r ? `<path class="exp-region-fill cur" d="${regionPath(r)}"/>` : '';
  }
  function buildRegionsOver(curIdx) {
    let s = REGIONS.filter(r => r.idx !== curIdx).map(r => `<path class="exp-region-fog" d="${regionPath(r)}"/>`).join('');
    s += REGIONS.map(r => {
      const st = r.idx === curIdx ? 'cur' : 'fog';
      return `<path class="exp-region-line ${st}" d="${regionPath(r)}"/>`;
    }).join('');
    s += REGIONS.map(r => {
      const st = r.idx === curIdx ? 'cur' : 'fog';
      const lx = projX(r.labelAt[0]).toFixed(1), ly = projY(r.labelAt[1]).toFixed(1);
      return `<g transform="translate(${lx},${ly})"><g class="exp-region-lab-s"><text class="exp-region-lab ${st}">${r.key}</text></g></g>`;
    }).join('');
    return s;
  }
  function buildMarker(p, seen, isCur) {
    const x = projX(p.lon).toFixed(1), y = projY(p.lat).toFixed(1);
    const t = POITYPE[p.type] || POITYPE.航道;
    const glyph = isCur ? SHIPICO : t.ico;
    const ring = isCur ? "<circle class='exp-poi-ring' r='16'/>" : '';
    const col = isCur ? 'var(--poi-current)' : (seen ? 'var(--poi-seen)' : 'var(--poi-unseen)');
    return `<g class="exp-poi${seen ? ' seen' : ''}${isCur ? ' cur' : ''}" data-poi="${p.key}" transform="translate(${x},${y})" style="color:${col}"><g class="exp-poi-s"><circle r="18" fill="transparent"/>${ring}<g class="exp-poi-ico">${glyph}</g><text class="exp-poi-lab" y="27" text-anchor="middle">${p.key}</text></g></g>`;
  }
  function detailHtml(p, seen) {
    if (!p) return "<span class='exp-md-empty'>海图之外</span>";
    if (!seen) return "<div class='exp-md-h'><b>?</b><span>尚未抵达</span></div>";
    return `<div class="exp-md-h"><b>${p.key}</b><span>${p.阶段}　${p.type}</span></div><div class="exp-md-desc">${p.desc || ''}</div>`;
  }
  function removePoiPopup(mapEl) {
    const pop = mapEl && mapEl.querySelector('.exp-poipop');
    if (pop) pop.remove();
  }
  function setPopArrow(pop, anchorX, left, pw) {
    const x = Math.max(16, Math.min(pw - 16, anchorX - (left - pw / 2)));
    pop.style.setProperty('--arrow-x', x.toFixed(1) + 'px');
  }
  function showPoiPopup(mapEl, gEl, p, seen) {
    removePoiPopup(mapEl);
    const pop = doc.createElement('div');
    pop.className = 'exp-poipop';
    pop.innerHTML = detailHtml(p, seen) + `<button class="exp-poipop-x" title="关闭">${ICO.close}</button>`;
    mapEl.appendChild(pop);
    const mr = mapEl.getBoundingClientRect(), gr = gEl.getBoundingClientRect();
    const anchorX = gr.left - mr.left + gr.width / 2;
    let left = anchorX;
    pop.style.left = '0px';
    const pw = pop.offsetWidth;
    pop.style.width = pw + 'px';
    const ph = pop.offsetHeight;
    left = Math.max(pw / 2 + 8, Math.min(mr.width - pw / 2 - 8, left));
    const topAbove = gr.top - mr.top - gr.height / 2;
    if (topAbove - ph - 13 < 4) { pop.classList.add('below'); pop.style.top = (gr.bottom - mr.top - gr.height / 2) + 'px'; }
    else pop.style.top = topAbove + 'px';
    pop.style.left = left + 'px';
    setPopArrow(pop, anchorX, left, pw);
    pop.querySelector('.exp-poipop-x').addEventListener('click', e => { e.stopPropagation(); pop.remove(); });
  }
  function roomDetailHtml(r) {
    if (!r) return "<span class='exp-md-empty'>不在船上</span>";
    return `<div class="exp-md-h"><b>${r.key}</b></div><div class="exp-md-desc">${r.desc}</div><div class="exp-md-desc" style="color:var(--text-faint)">常见：${r.crew}</div>`;
  }
  function showRoomPopup(mapEl, gEl, r) {
    removePoiPopup(mapEl);
    const pop = doc.createElement('div');
    pop.className = 'exp-poipop room';
    const goBtn = r ? `<button class="exp-poipop-go"><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M15.5 8.5l-2.2 5-5 2.2 2.2-5z'/></svg>去这里看看</button>` : '';
    pop.innerHTML = roomDetailHtml(r) + goBtn + `<button class="exp-poipop-x" title="关闭">${ICO.close}</button>`;
    mapEl.appendChild(pop);
    const mr = mapEl.getBoundingClientRect(), gr = gEl.getBoundingClientRect();
    const anchorX = gr.left - mr.left + gr.width / 2;
    let left = anchorX;
    pop.style.left = '0px';
    const pw = pop.offsetWidth;
    pop.style.width = pw + 'px';
    const ph = pop.offsetHeight;
    left = Math.max(pw / 2 + 8, Math.min(mr.width - pw / 2 - 8, left));
    const topAbove = gr.top - mr.top - gr.height / 2;
    const topBelow = gr.bottom - mr.top - gr.height / 2;
    const fitsAbove = topAbove - ph - 13 >= 4;
    const fitsBelow = topBelow + 13 + ph <= mr.height - 4;
    if (fitsAbove || (!fitsBelow && topAbove > mr.height - topBelow)) {
      pop.style.top = Math.max(ph + 17, topAbove) + 'px';
    } else {
      pop.classList.add('below');
      pop.style.top = Math.max(-9, Math.min(topBelow, mr.height - 17 - ph)) + 'px';
    }
    pop.style.left = left + 'px';
    setPopArrow(pop, anchorX, left, pw);
    pop.querySelector('.exp-poipop-x').addEventListener('click', e => { e.stopPropagation(); pop.remove(); });
    const go = pop.querySelector('.exp-poipop-go');
    if (go) go.addEventListener('pointerdown', e => e.stopPropagation());
    if (go) go.addEventListener('click', e => {
      e.stopPropagation();
      if (sending) return;
      pop.remove();
      switchTab('story');
      sendText(`去${r.key}看看`);
    });
  }
  function buildShipMarker(r, isCur, pv) {
    const x = pv ? r.px : r.cx, y = pv ? r.py : r.cy;
    return `<g class="exp-spoi${isCur ? ' cur' : ''}" data-room="${r.key}" transform="translate(${x},${y})"><circle r="30" fill="transparent"/><g class="exp-spoi-ico">${ROOMICO[r.type] || ''}</g><text class="exp-spoi-lab" y="47">${r.key}</text></g>`;
  }
  let mapResizeTimer = null;
  function onMapResize() {
    if (mapResizeTimer) clearTimeout(mapResizeTimer);
    mapResizeTimer = setTimeout(() => {
      mapResizeTimer = null;
      const panel = getPanel('map');
      if (!panel || !panel.classList.contains('active') || !panel.childElementCount) return;
      renderSafe('map', () => renderMapTab(readMVU()));
    }, 200);
  }
  function renderMapTab(D) {
    const panel = getPanel('map');
    if (!panel) return;
    const tab = (sw, lab) => `<button class="exp-char-tab${mapSubView === sw ? ' active' : ''}" data-sw="${sw}">${lab}</button>`;
    const swHtml = `<div class="exp-char-tabs">${tab('chart', '海图')}${tab('ship', '船内')}</div>`;
    if (mapSubView === 'ship') renderShipPanel(panel, D, swHtml);
    else renderChartPanel(panel, D, swHtml);
    panel.querySelectorAll('.exp-char-tab[data-sw]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.sw === mapSubView) return;
      setMapSubView(b.dataset.sw);
      renderMapTab(D);
      animateOnce(panel.querySelector('.exp-map-body'), 'exp-in-soft');
    }));
  }
  function renderChartPanel(panel, D, swHtml) {
    const curIdx = regionIdxOf(D.地点);
    const cur = poiOf(D.地点);
    const inCur = p => p.区 === curIdx;
    const isCurPoi = p => !!(cur && p.key === cur.key);
    const markers = POI.filter(p => inCur(p) || isCurPoi(p)).map(p => buildMarker(p, true, isCurPoi(p))).join('');
    const svg = `<svg class="exp-chart" width="${MAPDW}" height="${MAPDH}" preserveAspectRatio="xMidYMid slice">${buildGraticule()}${buildRegionsUnder(curIdx)}${buildCoast()}${buildRegionsOver(curIdx)}${markers}</svg>`;
    const ctl = `<div class="exp-mapctl"><button data-z="in" title="放大">${MAPCTL.in}</button><button data-z="out" title="缩小">${MAPCTL.out}</button><button data-z="home" title="回到当前海域">${MAPCTL.home}</button><button data-z="fit" title="全览">${MAPCTL.fit}</button></div>`;
    panel.innerHTML = `${swHtml}<div class="exp-map-body"><div class="exp-map">${svg}${ctl}</div></div>`;
    const mapEl = panel.querySelector('.exp-map');
    const svgEl = panel.querySelector('svg.exp-chart');
    syncViewAspect(panel);
    if (!mapView || mapViewAspect !== viewAspect) { mapView = fitViewToRegions(curIdx); mapViewAspect = viewAspect; }
    else mapView = clampView(mapView);
    applyView(svgEl);
    bindMapInteraction(svgEl);
    panel.querySelectorAll('.exp-poi').forEach(g => g.addEventListener('click', () => {
      if (mapDragged) return;
      const p = POI.find(x => x.key === g.dataset.poi);
      if (p) showPoiPopup(mapEl, g, p, inCur(p) || isCurPoi(p));
    }));
    panel.querySelectorAll('.exp-mapctl button').forEach(b => b.addEventListener('click', () => {
      removePoiPopup(mapEl);
      const z = b.dataset.z, cx = mapView.x + mapView.w / 2, cy = mapView.y + mapView.h / 2;
      if (z === 'in') zoomAround(svgEl, 1 / 1.5, cx, cy);
      else if (z === 'out') zoomAround(svgEl, 1.5, cx, cy);
      else if (z === 'home') { mapView = fitViewToRegions(curIdx); applyView(svgEl); }
      else if (z === 'fit') {
        const fw = Math.min(MAPW, MAPH / viewAspect);
        mapView = clampView({ x: cx - fw / 2, y: cy - (fw * viewAspect) / 2, w: fw, h: fw * viewAspect });
        applyView(svgEl);
      }
    }));
  }
  function renderShipPanel(panel, D, swHtml) {
    const room = roomOf(D.地点);
    const pv = mapPortraitMode(panel);
    const W = pv ? SHIP_PW : SHIP_W, H = pv ? SHIP_PH : SHIP_H;
    const DECKS = pv
      ? [{ cy: 110, name: '露天' }, { cy: 380, name: '下层' }, { cy: 650, name: '深处' }, { cy: 850, name: '底层' }]
      : [{ cy: 58, name: '露天' }, { cy: 198, name: '下层' }, { cy: 339, name: '深处' }, { cy: 479, name: '底层' }];
    const LVLS = pv ? [200, 545, 750] : [128, 269, 409];
    const labX = pv ? 26 : 36, lvlX0 = pv ? 52 : 70, lvlX1 = W - (pv ? 26 : 40);
    const lvls = LVLS.map(y => `<line class="exp-ship-lvl" x1="${lvlX0}" y1="${y}" x2="${lvlX1}" y2="${y}"/>`).join('');
    const dirs = DECKS.map(d => `<text class="exp-ship-dir" x="${labX}" y="${d.cy}" text-anchor="middle" writing-mode="vertical-rl">${d.name}</text>`).join('');
    const markers = SHIP_ROOMS.map(r => buildShipMarker(r, !!(room && r.key === room.key), pv)).join('');
    const svg = `<svg class="exp-ship" width="${MAPDW}" height="${MAPDH}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${lvls}${dirs}${markers}</svg>`;
    panel.innerHTML = `${swHtml}<div class="exp-map-body"><div class="exp-map">${svg}</div></div>`;
    const mapEl = panel.querySelector('.exp-map');
    mapEl.addEventListener('pointerdown', e => { if (!e.target.closest('.exp-spoi')) removePoiPopup(mapEl); });
    panel.querySelectorAll('.exp-spoi').forEach(g => g.addEventListener('click', () => {
      const r = SHIP_ROOMS.find(x => x.key === g.dataset.room);
      if (r) showRoomPopup(mapEl, g, r);
    }));
  }

  // ════ 正文渲染与生成｜展示与文本处理 ════
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const THOUGHT_TAG_NAMES = ['thinking', 'think', 'cot', 'reasoning', 'meow', 'think_nya~', 'konatan_planning~', 'draft_notes', 'draft', 'preparation'];
  const THOUGHT_TAG_RE = THOUGHT_TAG_NAMES.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const THOUGHT_OPEN_RE = '<(?:' + THOUGHT_TAG_RE + ')>';
  const THOUGHT_CLOSE_RE = '(?:<\\/(?:' + THOUGHT_TAG_RE + ')>|<!--\\s*(?:end_of_梳理|1·思考结束|end_of_Subtext_think)\\s*-->|我将进行符合需求的创作：|#{1,6}\\s*正式创作)';
  // 明月秋青系: 思维链以[metacognition]/[love_qkll]开头, 可能没有任何闭合标记直接接正文
  const THOUGHT_HEAD_RE = /^\s*\[(?:metacognition|love_qkll)\]/i;

  function bareThoughtMatch(raw) {
    const m = new RegExp('^([\\s\\S]*?)' + THOUGHT_CLOSE_RE, 'i').exec(raw);
    if (m && !/<maintext>|<content>|<options>/i.test(m[0])) return { bodyEnd: m[1].length, tagEnd: m[0].length };
    if (THOUGHT_HEAD_RE.test(raw)) {
      const b = String(raw).search(/<maintext>|<content>/i);
      if (b > 0) return { bodyEnd: b, tagEnd: b };
    }
    return null;
  }

  function stripThink(raw) {
    const s = String(raw);
    const afterOpenBased = s
      .replace(new RegExp(THOUGHT_OPEN_RE + '[\\s\\S]*?' + THOUGHT_CLOSE_RE, 'gi'), '')
      .replace(new RegExp(THOUGHT_OPEN_RE + '[\\s\\S]*?(?=<maintext>|<content>)', 'i'), '')
      .replace(new RegExp(THOUGHT_OPEN_RE + '[\\s\\S]*$', 'i'), '');
    if (afterOpenBased !== s) return afterOpenBased;
    const bare = bareThoughtMatch(s);
    return bare ? s.slice(bare.tagEnd) : s;
  }

  function extractThought(raw, streaming) {
    if (!raw) return '';
    const re = new RegExp(THOUGHT_OPEN_RE + '([\\s\\S]*?)' + THOUGHT_CLOSE_RE, 'gi');
    let m, parts = [];
    while ((m = re.exec(raw))) parts.push(m[1].trim());
    if (!parts.length) {
      const om = raw.match(new RegExp(THOUGHT_OPEN_RE + '([\\s\\S]*?)(?=<maintext>|<content>)', 'i'));
      if (om) parts.push(om[1].trim());
      else if (streaming) {
        const os = raw.match(new RegExp(THOUGHT_OPEN_RE + '([\\s\\S]*)$', 'i'));
        if (os) parts.push(os[1].trim());
      }
    }
    if (!parts.length) {
      const bare = bareThoughtMatch(raw);
      if (bare) parts.push(raw.slice(0, bare.bodyEnd).replace(THOUGHT_HEAD_RE, '').trim());
    }
    return parts.join('\n\n').trim();
  }

  function applyDisplayRegexes(text) {
    if (!text) return text;
    try {
      if (typeof formatAsTavernRegexedString === 'function') {
        text = formatAsTavernRegexedString(text, 'ai_output', 'display');
      }
    } catch (e) { console.warn('[远征前端] 应用酒馆显示正则失败, 按原文显示:', e); }
    return text
      .replace(/<rt(?:\s[^>]*)?>[\s\S]*?<\/rt>/gi, '')
      .replace(/<\/?ruby(?:\s[^>]*)?>/gi, '');
  }

  const PRESET_STRIP_TAGS = ['details', 'summary', 'tucao', 'danmu', 'konatan_chat', 'progress', 'current_event',
    'htmlcontent', 'guifan', 'done', 'disclaimer', 'w2g', 'VariableCheck', 'memo', 'draft', 'Interleaving',
    'choice', 'safe', 'theater', 'recap', 'background', 'parallel_world', 'meow_FM', 'time_format',
    'aftertalk', 'Shiosai', 'snow', 'quote', 'htm1fenge', 'math', 'finish', 'WF', 'style', 'script', 'scene', 'image', 'imgthink'];
  const PRESET_UNWRAP_TAGS = ['content', 'writing_process', 'Chain_of_Thought', 'SexualScene', 'thought', 'os',
    'font', 'span', 'p', 'div', 'b', 'i', 'em', 'strong', 'hr', 'img', 'a', 'small', 'big', 'u', 'center', 'mark', '正文', 'images'];
  const PRESET_STRIP_RE = new RegExp('<(' + PRESET_STRIP_TAGS.join('|') + ')(?:\\s[^>]*)?>[\\s\\S]*?(?:<\\/\\1\\s*>|$)', 'gi');
  const PRESET_UNWRAP_RE = new RegExp('<\\/?(?:' + PRESET_UNWRAP_TAGS.join('|') + ')(?:\\s[^>]*?)?\\s*\\/?>', 'gi');
  function stripPresetNoise(text) {
    return text
      .replace(PRESET_STRIP_RE, '')
      .replace(/<(?:角色)?状态面板>[\s\S]*?(?:<\/(?:角色)?状态面板>|$)/g, '')
      .replace(/<Q>[\s\S]*?(?:<\/WF>|$)/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(PRESET_UNWRAP_RE, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^\s*###\s*正文\s*$/gm, '')
      .replace(/image###[\s\S]*?###/g, '');
  }

  // 插图槽位占位符: 正文提取时把st-chatu8标记换成该字符, 渲染时按序对应原生DOM里的图
  const ILL_TOKEN = '\uE97F';
  function tokenizeIllustMarkers(s) {
    const re = illustMarkerRe();
    return s
      .replace(/<image(?:\s[^>]*)?>([\s\S]*?)<\/image\s*>/gi, (m, inner) => {
        const n = (inner.match(re) || []).length;
        return n ? '\n' + Array(n).fill(ILL_TOKEN).join('\n') + '\n' : '';
      })
      .replace(re, '\n' + ILL_TOKEN + '\n');
  }

  const MAIN_TAG_NAMES = ['maintext', 'content', '正文'];
  function findMainBlock(s) {
    for (const tag of MAIN_TAG_NAMES) {
      const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>', 'gi');
      let m, last = null;
      while ((m = re.exec(s))) last = m;
      if (!last) continue;
      const body = s.slice(last.index + last[0].length);
      const j = body.toLowerCase().indexOf('</' + tag + '>');
      return j >= 0 ? { body: body.slice(0, j), closed: true } : { body: body, closed: false };
    }
    return null;
  }

  function extractMainText(raw, streaming) {
    if (!raw) return '';
    if (/^\s*(?:<StatusPlaceHolderImpl\s*\/?>\s*)*【开场介绍】/.test(raw)) return '';
    const s = stripThink(raw);
    const main = findMainBlock(s);
    if (main) {
      const body = main.body;
      if (main.closed) return applyDisplayRegexes(stripPresetNoise(tokenizeIllustMarkers(body.replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, '')))).trim();
      return applyDisplayRegexes(stripPresetNoise(tokenizeIllustMarkers(body
        .replace(/<options>[\s\S]*$/i, '')
        .replace(/<branches>[\s\S]*$/i, '')
        .replace(/<UpdateVariable>[\s\S]*$/i, '')
        .replace(/<StatusPlaceHolderImpl\s*\/?>/gi, '')))
        .replace(/<!--[\s\S]*$/, '')
        .replace(/<\/?[a-z]*$/i, '')).trim();
    }
    if (streaming) return '';
    return applyDisplayRegexes(stripPresetNoise(tokenizeIllustMarkers(s
      .replace(/<UpdateVariable>[\s\S]*?(?:<\/UpdateVariable>|$)/gi, '')
      .replace(/<options>[\s\S]*?(?:<\/options>|$)/gi, '')
      .replace(/<branches>[\s\S]*?(?:<\/branches>|$)/gi, '')
      .replace(/<StatusPlaceHolderImpl\s*\/?>/gi, '')))).trim();
  }

  function extractOptions(raw) {
    if (!raw) return [];
    const s = stripThink(raw);
    const i = s.toLowerCase().lastIndexOf('<options>');
    if (i >= 0) {
      const body = s.slice(i + '<options>'.length);
      const j = body.toLowerCase().indexOf('</options>');
      if (j < 0) return [];
      return applyDisplayRegexes(body.slice(0, j)).split('\n')
        .map(l => l.replace(/^\s*(?:\d+[.、)]|[-*])\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 6);
    }
    const b = s.toLowerCase().lastIndexOf('<branches>');
    if (b < 0) return [];
    const body = s.slice(b + '<branches>'.length);
    const j = body.toLowerCase().indexOf('</branches>');
    if (j < 0) return [];
    return applyDisplayRegexes(body.slice(0, j)).split('\n')
      .map(l => (l.match(/^\s*[A-Za-z][.、)]\s*(.+?)\s*$/) || [])[1])
      .filter(Boolean)
      .slice(0, 10);
  }

  function optionsHtml(opts) {
    return '<div class="exp-story-options"><div class="exp-story-opthead">行动</div>' + opts.map((t, i) =>
      '<button class="exp-story-opt" data-idx="' + i + '"><span class="exp-story-opt-num">' + (i + 1) + '</span><span class="exp-story-opt-text">' + escapeHtml(t) + '</span></button>'
    ).join('') + '</div>';
  }

  function autogrowStoryTA() {
    const ta = doc.getElementById(SEL.storyTextarea);
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight + 2) + 'px';
    updateJumpBtn();
  }

  function ensureStoryDom() {
    const panel = getPanel('story');
    if (!panel || panel.querySelector('.exp-story')) return;
    panel.innerHTML = `
      <div class="exp-story">
        <div class="exp-story-log" id="${SEL.storyLog}"></div>
        <div class="exp-story-status" id="${SEL.storyStatus}"></div>
        <div class="exp-story-input">
          <div class="exp-story-inputrow">
            <button class="exp-iconbtn" id="${SEL.storyDel}" title="删除楼层">${ICO.trash}</button>
            <button class="exp-iconbtn" id="${SEL.storyRegen}" title="删除并重新生成上一条回复">${ICO.regen}</button>
            <textarea id="${SEL.storyTextarea}" rows="1" placeholder="书写你的命运..."></textarea>
            <button class="exp-iconbtn send" id="${SEL.storySend}" title="发送">${ICO.send}</button>
          </div>
          <div class="exp-story-delbar" id="${SEL.storyDelbar}" style="display:none">
            <span id="${SEL.delCount}">点选要删除的楼层</span>
            <button class="exp-del-btn" id="${SEL.delCancel}">取消</button>
            <button class="exp-del-btn danger" id="${SEL.delConfirm}" disabled>删除</button>
          </div>
        </div>
        <button class="exp-story-jump" id="${SEL.storyJump}" title="回到最新">${ICO.chev}</button>
      </div>
    `;
    doc.getElementById(SEL.storyLog).addEventListener('scroll', updateJumpBtn);
    doc.getElementById(SEL.storyLog).addEventListener('click', onStoryLogClick);
    doc.getElementById(SEL.storyLog).addEventListener('dblclick', onStoryLogDblclick);
    doc.getElementById(SEL.storyLog).addEventListener('pointerdown', onStoryTapDown);
    doc.getElementById(SEL.storyLog).addEventListener('pointerup', onStoryTapUp);
    doc.getElementById(SEL.storyJump).addEventListener('click', () => scrollStoryToEnd(!sending));
    doc.getElementById(SEL.storySend).addEventListener('click', onSendButton);
    doc.getElementById(SEL.storyRegen).addEventListener('click', onRegenerate);
    doc.getElementById(SEL.storyDel).addEventListener('click', onDelToggle);
    doc.getElementById(SEL.delCancel).addEventListener('click', () => setDelMode(false));
    doc.getElementById(SEL.delConfirm).addEventListener('click', onDelConfirm);
    const ta = doc.getElementById(SEL.storyTextarea);
    let composing = false;
    ta.addEventListener('compositionstart', () => { composing = true; });
    ta.addEventListener('compositionend', () => { composing = false; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !composing && !e.isComposing) { e.preventDefault(); if (!sending) onSend(); }
    });
    ta.addEventListener('input', autogrowStoryTA);
    autogrowStoryTA();
  }

  function storyParas(text, streaming) {
    const escaped = escapeHtml(text);
    const marked = streaming ? escaped : escaped
      .replace(/“([^”]*)”/g, '<span class="exp-quote">“$1”</span>')
      .replace(/&quot;([^\n]*?)&quot;/g, '<span class="exp-quote">&quot;$1&quot;</span>');
    return marked.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }

  function storyTextHtml(text, streaming) {
    return storyParas(text, streaming).map(s =>
      s === ILL_TOKEN ? '<p class="exp-illust exp-ill-slot"></p>' : '<p>' + s + '</p>'
    ).join('');
  }

  function syncStoryParas(body, parts, anim) {
    const kids = body.children;
    for (let i = 0; i < parts.length; i++) {
      const isSlot = parts[i] === ILL_TOKEN;
      let el = i < kids.length ? kids[i] : null;
      if (el && isSlot !== el.classList.contains('exp-ill-slot')) {
        const p = doc.createElement('p');
        if (isSlot) p.className = 'exp-illust exp-ill-slot';
        body.replaceChild(p, el);
        el = p;
      }
      if (!el) {
        el = doc.createElement('p');
        if (isSlot) el.className = 'exp-illust exp-ill-slot';
        else if (anim && i > 0) el.className = 'exp-para-in';
        body.appendChild(el);
      }
      if (!isSlot && el.innerHTML !== parts[i]) el.innerHTML = parts[i];
    }
    while (kids.length > parts.length) body.removeChild(kids[kids.length - 1]);
  }

  function paintStoryText(body, text) {
    syncStoryParas(body, storyParas(text, true), motionOK());
  }

  function thoughtFoldHtml(thought, mid, open) {
    const midAttr = (mid == null) ? '' : ' data-fold-mid="' + mid + '"';
    return '<div class="exp-story-thought' + (open ? ' open' : '') + '"' + midAttr + '>'
      + '<div class="exp-story-thought-head" title="思维链"><span class="exp-story-thought-rule l"></span><span class="exp-story-thought-ico">' + ICO.thought + '</span><span class="exp-story-thought-rule r"></span></div>'
      + '<div class="exp-story-thought-body">' + escapeHtml(thought) + '</div>'
      + '</div>';
  }

  // ════ 楼尾静默行与心声卡 ════
  function ffArrow(dv) {
    return '<span class="' + (dv > 0 ? 'up' : 'down') + '">' + (dv > 0 ? ICO.up : ICO.down) + Math.abs(dv) + '</span>';
  }
  function ffLine(label, ch, stage) {
    return label + '　' + ch.from + (ch.to > ch.from ? ' 升至 ' : ' 降至 ')
      + '<span class="new">' + ch.to + '</span>　<span class="stage">' + stage + '</span>';
  }
  function footItems(d) {
    const items = [];
    if (!d || !d.delta) return items;
    VAR_DISPLAY.forEach(v => {
      if (v.kind === 'aff') {
        CAST.forEach(n => {
          const ch = d.delta[v.path + '.' + n];
          if (!ch || ch.text) return;
          items.push({ key: 'stat:' + v.path + '.' + n, label: n, dv: ch.to - ch.from, line: ffLine(n + '的好感', ch, AFF[tierIdx(ch.to)]) });
        });
      } else {
        const ch = d.delta[v.path];
        if (!ch || ch.text) return;
        items.push({ key: 'stat:' + v.path, label: v.path, dv: ch.to - ch.from, line: ffLine(v.path, ch, band(ch.to, v.path)) });
      }
    });
    return items;
  }
  function footVoices(d) {
    return (d && d.delta) ? CAST.filter(n => d.delta['心声.' + n]) : [];
  }
  function voiceCardHtml(mid, name, tab) {
    const d = floorData(mid) || {};
    const img = frontImg(name);
    const voice = String((d.心声 || {})[name] || '').trim();
    const list = Array.isArray((d.回想 || {})[name]) ? d.回想[name].filter(x => String(x || '').trim()) : [];
    const body = tab === 'memoir'
      ? (list.length
        ? '<div class="exp-vc-memos">' + list.slice().reverse().map(x => {
            const m = fmtMemoir(x);
            return '<div class="exp-vc-memo">' + (m.head ? '<b>' + escapeHtml(m.head) + '</b>　' : '') + escapeHtml(m.body) + '</div>';
          }).join('') + '</div>'
        : '<div class="exp-vc-empty">还没有留下回想</div>')
      : (voice ? '<div class="exp-vc-text">' + escapeHtml(voice) + '</div>' : '<div class="exp-vc-empty">她的心声还没有传到这里</div>');
    const tabBtn = (k, label) => '<button class="exp-vc-tab' + (tab === k ? ' on' : '') + '" data-foot-tab="voice:' + name + ':' + k + '">' + label + '</button>';
    return '<div class="exp-vc-wrap"><div class="exp-vc">'
      + '<button class="exp-vc-img" data-foot-char="' + name + '" title="翻到' + name + '">'
      + (img ? '<img src="' + escapeHtml(img) + '" alt="' + name + '" onerror="this.style.opacity=.25">' : noArt('立绘待补')) + '</button>'
      + '<div class="exp-vc-main">'
      + '<div class="exp-vc-head">' + name + '<span class="exp-vc-tabs">' + tabBtn('voice', '心声') + '<span class="exp-vc-sep">｜</span>' + tabBtn('memoir', '回想') + '</span></div>'
      + body
      + '</div></div></div>';
  }
  function floorFootInner(mid) {
    const d = floorData(mid);
    if (!d) return '';
    const items = footItems(d), voices = footVoices(d);
    if (!items.length && !voices.length) return '';
    const open = String(footOpen.get(mid) || '').split(':');
    const openKey = open[0] === 'stat' ? open.join(':') : '';
    const openName = open[0] === 'voice' ? open[1] : '';
    const row = '<div class="exp-ff">'
      + items.map(it => '<button class="exp-ff-item' + (openKey === it.key ? ' open' : '') + '" data-foot-item="' + it.key + '">'
        + it.label + ffArrow(it.dv) + '</button>').join('')
      + '<span class="exp-ff-gap"></span>'
      + (voices.length ? '<span class="exp-ff-voices"><span class="exp-ff-label">心声</span>' + voices.map(n => {
          const img = frontImg(n);
          return '<button class="exp-ff-voice' + (openName === n ? ' open' : '') + '" data-foot-item="voice:' + n + '">'
            + (img ? '<img src="' + escapeHtml(img) + '" alt="" onerror="this.style.opacity=.2">' : '')
            + '<span>' + n + '</span><span class="exp-ff-caret">' + ICO.chev + '</span></button>';
        }).join('') + '</span>' : '')
      + '</div>';
    let panel = '';
    if (openKey) {
      const it = items.find(x => x.key === openKey);
      if (it) panel = '<div class="exp-ff-detail"><div class="exp-ff-line">' + it.line + '</div></div>';
    } else if (openName && CAST.includes(openName)) {
      panel = voiceCardHtml(mid, openName, open[2] === 'memoir' ? 'memoir' : 'voice');
    }
    return row + panel;
  }
  function floorFootHtml(mid) {
    const inner = floorFootInner(mid);
    return inner ? '<div class="exp-ff-wrap" data-foot-mid="' + mid + '">' + inner + '</div>' : '';
  }
  function openChar(name) {
    if (!CAST.includes(name)) return;
    charSel = name;
    const root = doc.getElementById(SHELL_ID);
    const cur = root && root.querySelector('.exp-panel.active');
    if (cur && cur.dataset.panel === 'char') {
      refreshChar();
      animateSubSwitch(getPanel('char'), '.exp-char-stage, .exp-char-side .exp-char-cell');
    } else switchTab('char');
  }

  function storyTurnHtml(role, text, mid, thought, open, foot) {
    const cls = role === 'user' ? 'user' : 'assistant';
    const midAttr = (mid == null) ? '' : ' data-mid="' + mid + '"';
    const titleAttr = (cls === 'user' && mid != null) ? ' title="双击编辑这条发言"' : '';
    const foldHtml = thought ? thoughtFoldHtml(thought, mid, open) : '';
    let textHtml = storyTextHtml(text), tail = '';
    if (cls === 'assistant' && mid != null) {
      const filled = fillIllustSlots(textHtml, mid);
      textHtml = filled.html;
      tail = filled.tail;
    }
    return '<div class="exp-story-turn ' + cls + '"' + midAttr + titleAttr + '>' + foldHtml
      + '<div class="exp-story-text">' + textHtml + '</div>' + tail + (foot || '') + '</div>';
  }

  function nearBottom(log) { return log.scrollHeight - log.scrollTop - log.clientHeight < 80; }

  function updateJumpBtn() {
    const log = doc.getElementById(SEL.storyLog);
    const btn = doc.getElementById(SEL.storyJump);
    if (!log || !btn) return;
    const show = log.scrollHeight > log.clientHeight && !nearBottom(log);
    if (show) {
      const input = doc.querySelector('#exp-shell-root .exp-story-input');
      const status = doc.getElementById(SEL.storyStatus);
      btn.style.bottom = (((input && input.offsetHeight) || 0) + ((status && status.offsetHeight) || 0) + 14) + 'px';
    }
    btn.classList.toggle('show', show);
  }

  function scrollStoryToEnd(smooth) {
    const log = doc.getElementById(SEL.storyLog);
    if (!log) return;
    if (smooth && motionOK()) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
    else log.scrollTop = log.scrollHeight;
    updateJumpBtn();
  }

  const storyHtmlCache = new Map();
  const thoughtFoldOpen = new Set();
  const lastRenderedRef = new Map();
  let currentOptions = null;

  // ════ 逐楼变量(floorData/楼尾展示配置) ════
  const floorCache = new Map();
  const footOpen = new Map();
  function storyCacheDrop(id) {
    if (Number.isInteger(id)) {
      storyHtmlCache.delete(id);
      floorCache.delete(id);
      floorCache.delete(id + 1);
      lastRenderedRef.delete(id);
      lastRenderedRef.delete(id + 1);
      illustCache.delete(id);
    } else {
      storyHtmlCache.clear();
      floorCache.clear();
      footOpen.clear();
      lastRenderedRef.clear();
      illustCache.clear();
    }
  }
  function msgStat(mid) {
    try {
      if (typeof getVariables === 'function' && Number.isInteger(mid) && mid >= 0) {
        const v = getVariables({ type: 'message', message_id: mid });
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) { dbg('msgStat', e); }
    return null;
  }
  function floorData(mid) {
    if (floorCache.has(mid)) return floorCache.get(mid);
    let out = null;
    try {
      const cur = msgStat(mid);
      if (cur) {
        const curD = readMVU(cur);
        const prev = mid >= 1 ? msgStat(mid - 1) : null;
        let delta = prev ? diffStat(readMVU(prev), curD) : null;
        // 营地期间这三项对外冻结, 楼尾不报它们的变化
        if (delta && curD.身处 === '营地') ['物资', '健康', '士气'].forEach(k => { delete delta[k]; });
        if (delta && !Object.keys(delta).length) delta = null;
        out = { delta, 好感: curD.好感, 心声: curD.心声, 回想: curD.回想 };
      }
    } catch (e) {
      console.warn('[航海日志] 逐楼变量读取失败', e);
    }
    floorCache.set(mid, out);
    return out;
  }
  const VAR_DISPLAY = [
    { path: '好感', kind: 'aff' },
    { path: '物资', kind: 'meter' },
    { path: '健康', kind: 'meter' },
    { path: '士气', kind: 'meter' },
    { path: '狩猎技巧', kind: 'meter' },
  ];

  function fetchStoryMessages() {
    const lastId = getLastMessageId();
    if (lastId == null || lastId < 0) return null;
    // 不用hide_state:'unhidden': 新生成楼层is_system缺失(undefined)会被其严格比较误滤掉
    const msgs = getChatMessages('0-' + lastId);
    return msgs ? msgs.filter(m => m.is_hidden !== true) : null;
  }

  function userDisplayText(raw) {
    const m = String(raw).match(/<本轮用户输入>\s*([\s\S]*?)\s*<\/本轮用户输入>/);
    return m ? m[1] : raw;
  }

  // 酒馆助手把swipe_info[swipe_id]当extra返回, 思维链藏在其内层extra里; 无swipe_info时才是消息extra本身
  function nativeReasoning(m) {
    const ex = m.extra;
    if (!ex) return '';
    return ex.reasoning || (ex.extra && ex.extra.reasoning) || '';
  }

  function cachedTurnData(m) {
    let data = storyHtmlCache.get(m.message_id);
    if (data === undefined) {
      data = m.role === 'user'
        ? { role: 'user', text: userDisplayText(m.message), thought: '', mid: m.message_id }
        : { role: 'assistant', text: extractMainText(m.message), thought: nativeReasoning(m) || extractThought(m.message), mid: m.message_id };
      storyHtmlCache.set(m.message_id, data);
    }
    return data;
  }

  function turnHtml(data, skipFoot) {
    if (!data.text) return '';
    const open = thoughtFoldOpen.has(data.mid);
    const foot = (!skipFoot && data.role !== 'user' && Number.isInteger(data.mid)) ? floorFootHtml(data.mid) : '';
    return storyTurnHtml(data.role, data.text, data.mid, data.thought, open, foot);
  }

  function applyDelModeClasses(log) {
    log.querySelectorAll('.exp-story-turn').forEach(t => {
      const mid = +t.dataset.mid;
      if (!(mid >= 1)) return;
      t.classList.add('selable');
      if (delSel.has(mid)) t.classList.add('delsel');
    });
  }

  function refreshFoot(el) {
    const wrap = el.closest('.exp-ff-wrap');
    if (!wrap) return;
    const mid = +wrap.dataset.footMid;
    wrap.innerHTML = floorFootInner(mid);
  }
  function onStoryLogClick(e) {
    if (delMode) {
      const head = e.target.closest('.exp-story-thought-head');
      if (head) {
        e.stopPropagation();
        const fold = head.closest('.exp-story-thought');
        const open = !fold.classList.contains('open');
        fold.classList.toggle('open', open);
        const midAttr = fold.dataset.foldMid;
        if (midAttr != null) { const mid = +midAttr; if (open) thoughtFoldOpen.add(mid); else thoughtFoldOpen.delete(mid); }
        return;
      }
      const turn = e.target.closest('.exp-story-turn');
      if (turn) {
        const mid = +turn.dataset.mid;
        if (mid >= 1) {
          if (delSel.has(mid)) { delSel.delete(mid); turn.classList.remove('delsel'); }
          else { delSel.add(mid); turn.classList.add('delsel'); }
          updateDelBar();
        }
      }
      return;
    }
    const illustImg = e.target.closest('.exp-illust img');
    if (illustImg) { e.stopPropagation(); openIllustLightbox(illustImg); return; }
    const optBtn = e.target.closest('.exp-story-opt');
    if (optBtn) {
      e.stopPropagation();
      const idx = +optBtn.dataset.idx;
      if (currentOptions && currentOptions[idx] != null) onOptionClick(currentOptions[idx]);
      return;
    }
    const charBtn = e.target.closest('[data-foot-char]');
    if (charBtn) { e.stopPropagation(); openChar(charBtn.dataset.footChar); return; }
    const tabBtn = e.target.closest('[data-foot-tab]');
    if (tabBtn) {
      e.stopPropagation();
      const wrap = tabBtn.closest('.exp-ff-wrap');
      if (wrap) { footOpen.set(+wrap.dataset.footMid, tabBtn.dataset.footTab); refreshFoot(tabBtn); }
      return;
    }
    const item = e.target.closest('[data-foot-item]');
    if (item) {
      e.stopPropagation();
      const wrap = item.closest('.exp-ff-wrap');
      if (wrap) {
        const mid = +wrap.dataset.footMid;
        const key = item.dataset.footItem;
        const cur = String(footOpen.get(mid) || '');
        const same = key.indexOf('voice:') === 0 ? cur.indexOf(key + ':') === 0 : cur === key;
        if (same) footOpen.delete(mid);
        else footOpen.set(mid, key.indexOf('voice:') === 0 ? key + ':voice' : key);
        refreshFoot(item);
      }
      return;
    }
    const head = e.target.closest('.exp-story-thought-head');
    if (!head) return;
    e.stopPropagation();
    const fold = head.closest('.exp-story-thought');
    const open = !fold.classList.contains('open');
    fold.classList.toggle('open', open);
    const midAttr = fold.dataset.foldMid;
    if (midAttr != null) {
      const mid = +midAttr;
      if (open) thoughtFoldOpen.add(mid); else thoughtFoldOpen.delete(mid);
    }
  }

  function patchOptionsStrip(log, messages) {
    const existing = log.querySelector('.exp-story-options');
    if (existing) existing.remove();
    currentOptions = null;
    const last = messages[messages.length - 1];
    if (!sending && last && last.role !== 'user') {
      const opts = extractOptions(last.message);
      if (opts.length) {
        currentOptions = opts;
        log.insertAdjacentHTML('beforeend', optionsHtml(opts));
      }
    }
  }

  function updateTurnContent(el, data) {
    if (el.classList.contains('editing')) return;
    const textEl = el.querySelector('.exp-story-text');
    if (textEl) syncStoryParas(textEl, storyParas(data.text, false), false);
    const existingThought = el.querySelector('.exp-story-thought');
    if (data.thought) {
      const open = thoughtFoldOpen.has(data.mid);
      if (existingThought) {
        existingThought.classList.toggle('open', open);
        const body = existingThought.querySelector('.exp-story-thought-body');
        const newBody = escapeHtml(data.thought);
        if (body && body.innerHTML !== newBody) body.innerHTML = newBody;
      } else {
        el.insertAdjacentHTML('afterbegin', thoughtFoldHtml(data.thought, data.mid, open));
      }
    } else if (existingThought) {
      existingThought.remove();
    }
    if (data.role !== 'user' && Number.isInteger(data.mid)) updateIllusts(el, data.mid);
    if (data.role !== 'user' && Number.isInteger(data.mid)) {
      const existingFoot = el.querySelector('.exp-ff-wrap');
      const newFootHtml = floorFootHtml(data.mid);
      if (newFootHtml) {
        if (existingFoot) existingFoot.innerHTML = floorFootInner(data.mid);
        else el.insertAdjacentHTML('beforeend', newFootHtml);
      } else if (existingFoot) {
        existingFoot.remove();
      }
    }
  }

  function patchStoryLog(log, messages, coldStart) {
    const desiredMids = new Set();
    const desiredData = [];
    for (const m of messages) {
      const data = cachedTurnData(m);
      if (!data.text) continue;
      desiredMids.add(m.message_id);
      desiredData.push({ mid: m.message_id, data });
    }
    const existingByMid = new Map();
    const toRemove = [];
    for (const child of Array.from(log.children)) {
      const midAttr = child.dataset.mid;
      if (midAttr != null) {
        const mid = +midAttr;
        if (desiredMids.has(mid)) existingByMid.set(mid, child);
        else toRemove.push(child);
      } else {
        toRemove.push(child);
      }
    }
    for (const el of toRemove) el.remove();
    let cursor = log.firstElementChild;
    for (const { mid, data } of desiredData) {
      const existing = existingByMid.get(mid);
      if (existing) {
        if (existing !== cursor) log.insertBefore(existing, cursor);
        else cursor = cursor.nextElementSibling;
        if (lastRenderedRef.get(mid) !== data) {
          updateTurnContent(existing, data);
          lastRenderedRef.set(mid, data);
        }
      } else {
        const html = turnHtml(data, coldStart);
        if (html) {
          const tpl = doc.createElement('template');
          tpl.innerHTML = html;
          const newEl = tpl.content.firstElementChild;
          if (motionOK() && !coldStart) newEl.classList.add('exp-in-bubble');
          log.insertBefore(newEl, cursor);
          lastRenderedRef.set(mid, data);
        }
      }
    }
    for (const [mid] of lastRenderedRef) {
      if (!desiredMids.has(mid)) lastRenderedRef.delete(mid);
    }
  }

  let footerBackfillRAF = null;
  function scheduleFooterBackfill(log) {
    if (footerBackfillRAF != null) cancelAnimationFrame(footerBackfillRAF);
    const turns = Array.from(log.querySelectorAll('.exp-story-turn.assistant'));
    let i = turns.length - 1;
    function chunk() {
      footerBackfillRAF = null;
      const deadline = performance.now() + 8;
      while (i >= 0 && performance.now() < deadline) {
        const t = turns[i--];
        const mid = +t.dataset.mid;
        if (Number.isInteger(mid) && !t.querySelector('.exp-ff-wrap')) {
          const footHtml = floorFootHtml(mid);
          if (footHtml) t.insertAdjacentHTML('beforeend', footHtml);
        }
      }
      if (i >= 0) footerBackfillRAF = requestAnimationFrame(chunk);
    }
    footerBackfillRAF = requestAnimationFrame(chunk);
  }

  function renderStoryLog() {
    const log = doc.getElementById(SEL.storyLog);
    if (!log) return;
    try {
      const stick = !log.childElementCount || nearBottom(log);
      const prevTop = log.scrollTop;
      let messages = fetchStoryMessages();
      if (!messages) { log.innerHTML = ''; lastRenderedRef.clear(); return; }
      if (sending && genBaselineId != null) messages = messages.filter(m => m.message_id <= genBaselineId);
      if (messages.length && messages[0].message_id === 0 && floor0SwipeId() === 0) messages = messages.slice(1);
      const coldStart = lastRenderedRef.size === 0 && messages.length > 0;
      patchStoryLog(log, messages, coldStart);
      if (delMode) {
        applyDelModeClasses(log);
      } else {
        patchOptionsStrip(log, messages);
        applyUserEdit(log);
      }
      log.scrollTop = stick ? log.scrollHeight : prevTop;
      updateJumpBtn();
      if (coldStart) scheduleFooterBackfill(log);
    } catch (e) {
      console.warn('[航海日志] 正文渲染失败', e);
      if (!log.childElementCount) setStoryStatus('航海日志加载失败，请重新进入或反馈给作者');
    }
  }

  // ════ 开场白 ════
  function parseYamlField(body, field) {
    const inline = (body.match(new RegExp('^[ \\t]*' + field + ':[ \\t]*(.+?)[ \\t]*$', 'm')) || [])[1] || '';
    if (inline) return inline;
    const block = body.match(new RegExp('^[ \\t]*' + field + ':[ \\t]*\\n((?:[ \\t]*-[ \\t]*.+\\n?)+)', 'm'));
    if (!block) return '';
    return block[1].split('\n')
      .map(l => (l.match(/^[ \t]*-[ \t]*(.+?)[ \t]*$/) || [])[1])
      .filter(Boolean).join('、');
  }

  function openingLabel(text, idx) {
    const m = String(text || '').match(/<initvar>([\s\S]*?)<\/initvar>/i);
    const body = m ? m[1] : String(text || '');
    const locRaw = parseYamlField(body, '地点');
    const loc = locRaw.split('／')[0].trim();
    return loc || ('开局 ' + (idx + 1));
  }

  function readOpenings() {
    try {
      if (typeof getChatMessages !== 'function') return null;
      const m0 = getChatMessages(0, { include_swipes: true })[0];
      if (!m0 || !Array.isArray(m0.swipes) || m0.swipes.length < 2) return null;
      return { swipes: m0.swipes, cur: m0.swipe_id || 0, data: m0.swipes_data || [] };
    } catch (e) { return null; }
  }

  let openingBusy = false;
  async function switchOpening(n) {
    if (openingBusy || sending) return;
    if (getLastMessageId() !== 0) return;
    const info = readOpenings();
    if (!info || n === info.cur || !info.swipes[n]) return;
    openingBusy = true;
    try {
      if (typeof setChatMessages === 'function') {
        await setChatMessages([{ message_id: 0, swipe_id: n }]);
        try { await eventEmit(tavern_events.MESSAGE_SWIPED, 0); } catch (e) { console.warn('[航海日志] 补发swipe事件失败', e); }
      }
      storyCacheDrop(0);
      let sd = null;
      try {
        const m0 = getChatMessages(0, { include_swipes: true })[0];
        sd = m0 && m0.swipes_data && m0.swipes_data[n];
      } catch (e) { dbg('swipe0data', e); }
      lastStat = (sd && sd.stat_data) ? _.cloneDeep(_.omit(sd.stat_data, ['$internal'])) : null;
      prevStat = null;
    } catch (e) {
      console.warn('[航海日志] 切换开场白失败', e);
    } finally {
      openingBusy = false;
    }
    renderAll(true);
    renderStoryLog();
  }

  let openingConfirmed = false;

  function canSelectOpening() {
    const lid = safeLastMessageId();
    return lid === 0;
  }

  function onPanelSwipe() {
    try {
      if (getLastMessageId() !== 0) return false;
      const m0 = getChatMessages(0)[0];
      return !!m0 && !/<initvar>/i.test(String(m0.message || ''));
    } catch (e) { return false; }
  }

  const OPENINGS_META = [
    { who: '富兰克林', act: '第一幕', role: '远征队总指挥官、幽冥号船长', img: ['富兰克林', 'cabin', 0], blurb: '一八四五年八月，出航头一年，一切顺利。这夜轮到你去送晚茶，头一回敲开了船长室的门' },
    { who: '古德瑟', act: '第二幕', role: '幽冥号助理外科医生、博物学家', img: ['古德瑟', 'medbay', 0], blurb: '一八四五年九月，比奇岛越冬在即。你搬木料豁开了手臂，头一回踏进医务室，给你缝针的是全船最年轻的军官' },
    { who: '克洛泽', act: '第三幕', role: '远征队副指挥官、惊恐号船长', img: ['克洛泽', 'log', 0], blurb: '一八四五年冬，比奇岛越冬。你被派去惊恐号清点物资，在储藏甲板翻出几只鼓包的罐头，身后站着克洛泽' },
    { who: '菲茨', act: '第四幕', role: '幽冥号执行官', img: ['菲茨', 'portrait', 0], blurb: '一八四六年冬，船被死冰困住，富兰克林病故。你去船长室清点遗物，撞见了往后这条船上说了算的菲茨' },
    { who: '瑙雅', act: '第五幕', role: '因纽特见习萨满', img: ['瑙雅', 'tent', 1], blurb: '一八四八年春，南撤途中你掉了队，倒在雪原上。醒来时人在一顶兽皮帐里，救你的因纽特姑娘叫瑙雅' },
    { who: '茜拉', act: '第六幕', role: '因纽特前任萨满、瑙雅母亲', img: ['茜拉', 'council', 0], blurb: '一八四八年春，瑙雅带你去见部族。营地里说一不二的是她母亲茜拉，你能不能留下，由她一句话定' },
    { who: '古德瑟', act: 'if线一', line: 'if验铅', role: '幽冥号助理外科医生', img: ['古德瑟', 'investigate', 0], blurb: '一八四七年十一月，第三冬合拢。深夜古德瑟把你叫进满地病历的医务室，她说船队的毒不在冰里，在货舱里' },
    { who: '富兰克林、克洛泽与菲茨', act: 'if线二', line: 'if困冰', role: '远征队总指挥官、副指挥官、执行官', img: ['富兰克林', 'mess', 0], blurb: '一八四八年二月，困冰第三年。军官们在船长室争执不下，富兰克林转过头来问你，底下的船员心里怎么想' },
    { who: '富兰克林与克洛泽', act: 'if线三', line: 'if出使', role: '远征队正副指挥官', img: ['克洛泽', 'sled', 0], blurb: '一八四八年五月，全船被叫上露天甲板。富兰克林与克洛泽要带队上岸和因纽特人换东西，正在人堆里挑人' },
    { who: '菲茨与富兰克林', act: 'if线四', line: 'if开冰', role: '幽冥号执行官、远征队总指挥官', img: ['菲茨', 'battle', 0], blurb: '一八四八年七月，靠船的冰裂开了缝。菲茨要用船上的火药炸出一条水道，转身就把你点进了开冰队' },
    { who: '克洛泽与富兰克林', act: 'if线五', line: 'if冲刺', role: '远征队副指挥官、总指挥官', img: ['克洛泽', 'engine', 0], blurb: '一八四八年七月，冰面化开一道缝。两船抢在它合拢前起航，克洛泽叫住你，让你在各处岗位之间传话' },
    { who: '克洛泽与菲茨', act: 'if线六', line: 'if勘途', role: '远征队副指挥官、幽冥号执行官', img: ['克洛泽', 'arctic', 0], blurb: '一八四八年七月，威廉王岛。你跟着克洛泽上岸打猎，追着熊的脚印爬上坡顶，望见远处横着一条细细的黑线' },
    { who: '富兰克林、克洛泽与菲茨', act: 'if线七', line: 'if东进', role: '远征队总指挥官、副指挥官、执行官', img: ['富兰克林', 'cabin', 1], blurb: '一八四八年八月，船又能动了。你去船长室添煤，在门外听见了军官们的决定，富兰克林开门让你先别声张' },
    { who: '克洛泽与菲茨', act: 'if线八', line: 'if南撤', role: '远征队副指挥官、幽冥号执行官', img: ['克洛泽', 'log', 1], blurb: '一八四八年八月，粮撑不到明年。克洛泽下到下层甲板宣布弃船南撤，同伴收拾着行李问你走不走得出去' },
  ];

  function metaImg(m) {
    if (!m || !m.img) return '';
    try {
      const g = GAL[m.img[0]];
      const t = g.normal.find(x => x.k === m.img[1]);
      return t.imgs[m.img[2]] || '';
    } catch (e) { return ''; }
  }

  function metaForSwipe(ordinal) {
    return OPENINGS_META[ordinal] || null;
  }

  const CUSTOM_ROLES = [
    { group: '军官', officer: true, roles: [
      ['尉官', '轮流值更，当值时代表船长指挥甲板'],
      ['航海长', '掌航线测算、船位与海图'],
      ['冰区领航员', '专责判读冰情，指挥船穿行冰隙'],
      ['船医', '管全船伤病，兼做博物记录'],
      ['事务长', '管账册、食物配给与物资收发'],
      ['文书', '抄录公文与航海日志'],
    ] },
    { group: '准士官与工匠', roles: [
      ['水手长', '传令派活，管缆索、帆具与水手风纪'],
      ['木匠', '管船体与舱室修缮'],
      ['轮机长', '管蒸汽机与螺旋桨，带着司炉烧锅炉'],
      ['舵手', '掌舵并带班瞭望'],
      ['帆缝匠', '缝补船帆与一切帆布物件'],
      ['填缝匠', '给船板接缝填麻灌胶，防漏水'],
      ['铁匠', '打铁修具，兼管军械保养'],
      ['厨子', '处理食材，管全船三餐'],
    ] },
    { group: '水手与杂役', roles: [
      ['普通水手', '操帆、凿冰、拉纤，船上的力气活'],
      ['司炉', '轮机舱里铲煤烧火'],
      ['侍从', '伺候军官起居与军官室膳食'],
      ['学徒帮工', '哪儿缺人去哪儿'],
    ] },
  ];
  function customRoleInfo(name) {
    for (const g of CUSTOM_ROLES) { const r = g.roles.find(x => x[0] === name); if (r) return { desc: r[1], officer: !!g.officer }; }
    return null;
  }
  const CUSTOM_STAGES = [
    { key: 'sail', name: '出航伊始', time: '1845年8月15日 09:00／极昼', region: '兰开斯特水道', stats: [95, 90, 90], blurb: '船队刚驶入兰开斯特水道，一切顺利，前程未卜' },
    { key: 'beechey', name: '比奇越冬', time: '1845年12月22日 11:00／极夜', region: '比奇越冬海域', stats: [75, 75, 65], blurb: '第一个冬天，在比奇岛暂作停留，休整船队' },
    { key: 'beset', name: '困冰之初', time: '1846年9月30日 14:00／白夜', region: '维多利亚困冰区', stats: [60, 60, 50], blurb: '秋日，船被维多利亚海峡的冰困住了' },
    { key: 'longnight', name: '困冰长夜', time: '1846年12月20日 15:00／极夜', region: '维多利亚困冰区', stats: [45, 50, 35], blurb: '第二个冬天，船在维多利亚海峡丝毫未动' },
    { key: 'nosummer', name: '夏汛落空', time: '1847年8月10日 14:00／极昼', region: '维多利亚困冰区', stats: [35, 40, 30], blurb: '盼了一整个夏天的开冰没有来，全队认清要在冰里熬第三个冬天' },
    { key: 'thirdwinter', name: '困冰三年', time: '1848年2月15日 16:00／极夜', region: '维多利亚困冰区', stats: [25, 30, 15], blurb: '第三个冬天最深处，存粮见底，坏血病在下层甲板蔓延' },
    { key: 'march', name: '弃船南撤', time: '1848年5月10日 12:00／白夜', region: '威廉王岛', stats: [15, 22, 15], place: '南撤队伍／营帐', blurb: '两船已弃，全队拖着雪橇沿西岸南下，指望走到巴克河' },
    { key: 'return', name: '折返回船', time: '1848年7月20日 16:00／极昼', region: '维多利亚困冰区', stats: [18, 28, 20], blurb: '南边走不通，一部分人折返回船，靠舱里剩下的存粮续命' },
  ];

  let openingView = 'cards';
  const CUSTOM_SWIPE = 1;
  const customForm = { ship: '幽冥号', role: null, stage: null, look: '', past: '' };

  function customCardHtml(selectable, isCur) {
    return `
      <div class="exp-open-card custom${selectable ? ' sel' : ''}${isCur ? ' cur' : ''}" data-custom="1">
        <span class="exp-custom-emblem">${EMBLEM}</span>
        <div class="exp-open-name">书写你自己的远征${isCur ? ' <span class="exp-open-cur">当前</span>' : ''}</div>
        <div class="exp-open-blurb">选择船只与职位，从任一时节登船</div>
        ${selectable ? '<span class="exp-open-go">由此启程</span>' : ''}
      </div>`;
  }

  function renderCustomForm(panel) {
    const f = customForm;
    const opt = (cls, data, on, inner) => `<button type="button" class="exp-custom-opt ${cls}${on ? ' on' : ''}" ${data}>${inner}</button>`;
    const shipsHtml = ['幽冥号', '惊恐号'].map(s =>
      opt('ship', `data-ship="${s}"`, f.ship === s, `<b>${s}</b><span>${s === '幽冥号' ? '富兰克林船长的旗舰' : '克洛泽船长的座舰'}</span>`)).join('');
    const rolesHtml = CUSTOM_ROLES.map(g =>
      `<div class="exp-custom-grp">${g.group}</div><div class="exp-custom-opts">` +
      g.roles.map(r => opt('role', `data-role="${escapeHtml(r[0])}"`, f.role === r[0], `<b>${escapeHtml(r[0])}</b><span>${escapeHtml(r[1])}</span>`)).join('') +
      '</div>').join('');
    const stagesHtml = '<div class="exp-custom-opts">' + CUSTOM_STAGES.map(s =>
      opt('stage', `data-stage="${s.key}"`, f.stage === s.key, `<b>${s.name}</b><i>${s.time.split(' ')[0]}／${s.region}</i><span>${s.blurb}</span>`)).join('') + '</div>';
    panel.innerHTML = `
      <div class="exp-open">
        <div class="exp-open-head">
          <span class="exp-open-emblem">${EMBLEM}</span>
          <div class="exp-open-eyebrow">THE FRANKLIN EXPEDITION</div>
          <div class="exp-open-title">自定义开局</div>
          <div class="exp-open-sub">报上你的来历，从你选定的那一天登船</div>
        </div>
        <div class="exp-custom">
          <button type="button" id="${SEL.customBack}" class="exp-custom-back">← 返回开场白</button>
          <div><div class="exp-custom-lab">所在船只</div><div class="exp-custom-opts">${shipsHtml}</div></div>
          <div><div class="exp-custom-lab">职位</div>${rolesHtml}</div>
          <div><div class="exp-custom-lab">登船的时节</div>${stagesHtml}</div>
          <div><div class="exp-custom-lab">外貌（可留空）</div><input id="${SEL.customLook}" maxlength="60" placeholder="描述你的样貌" value="${escapeHtml(f.look)}"></div>
          <div><div class="exp-custom-lab">背景经历（可留空）</div><textarea id="${SEL.customPast}" maxlength="200" placeholder="描述你的背景经历">${escapeHtml(f.past)}</textarea></div>
          <div class="exp-custom-foot"><button type="button" id="${SEL.customGo}">启程</button></div>
          <div id="${SEL.customHint}"></div>
        </div>
      </div>`;
    doc.getElementById(SEL.customBack).addEventListener('click', () => { openingView = 'cards'; renderOpeningTab(); });
    panel.querySelectorAll('.exp-custom-opt.ship').forEach(b => b.addEventListener('click', () => { f.ship = b.dataset.ship; renderCustomForm(panel); }));
    panel.querySelectorAll('.exp-custom-opt.role').forEach(b => b.addEventListener('click', () => { f.role = b.dataset.role; renderCustomForm(panel); }));
    panel.querySelectorAll('.exp-custom-opt.stage').forEach(b => b.addEventListener('click', () => { f.stage = b.dataset.stage; renderCustomForm(panel); }));
    doc.getElementById(SEL.customLook).addEventListener('input', e => { f.look = e.target.value; });
    doc.getElementById(SEL.customPast).addEventListener('input', e => { f.past = e.target.value; });
    doc.getElementById(SEL.customGo).addEventListener('click', startCustomOpening);
  }

  function buildCustomInstruction(f, stage, role) {
    const lines = [
      '以下是{{user}}的开场信息：',
      '身份：' + f.ship + '上的' + f.role + '（' + role.desc + (role.officer ? '；女性军官主导的舰队里破例任官的男性，全队独一份' : '') + '）',
      '时间：' + stage.time,
      '地点：' + stage.region,
      '处境：' + stage.blurb,
    ];
    if (f.look.trim()) lines.push('外貌：' + escapeSlashText(f.look.trim()));
    if (f.past.trim()) lines.push('背景：' + escapeSlashText(f.past.trim()));
    lines.push('请据此生成这次远征的开场白：从{{user}}在船上的日常切入，自然引出此刻的处境与在场的人物');
    return lines.join('\n');
  }

  let customBusy = false;
  async function startCustomOpening() {
    if (customBusy || sending || openingBusy) return;
    const f = customForm;
    const stage = CUSTOM_STAGES.find(s => s.key === f.stage);
    const role = customRoleInfo(f.role);
    const hint = doc.getElementById(SEL.customHint);
    if (!stage || !role) { if (hint) hint.textContent = '请先选好职位与登船的时节'; return; }
    customBusy = true;
    try {
      const info = readOpenings();
      if (info && info.cur !== CUSTOM_SWIPE) {
        await switchOpening(CUSTOM_SWIPE);
        const check = readOpenings();
        if (check && check.cur !== CUSTOM_SWIPE) throw new Error('未能切到自定义开局页, 请手动划到第二页开场白再试');
      }
      const stat = {
        时间: stage.time,
        地点: stage.region + '／' + (stage.place || f.ship + '／下层甲板'),
        身处: '随队',
        物资: stage.stats[0], 健康: stage.stats[1], 士气: stage.stats[2],
        狩猎技巧: 0,
        好感: Object.assign({ 富兰克林: 0, 克洛泽: 0, 菲茨: 0, 古德瑟: 0, 瑙雅: 0, 茜拉: 0 }, stage.affinity || {}),
        心声: emptyByCast(), 回想: {},
        名册: {},
        user档案: { 船: f.ship, 职位: f.role, 外貌: f.look.trim(), 背景: f.past.trim() },
      };
      if (typeof insertOrAssignVariables !== 'function') throw new Error('环境缺少 insertOrAssignVariables, 无法写入自定义开局, 请更新酒馆助手');
      // MVU变量链挂在楼层级变量上, 写chat级不会被MVU读到
      await insertOrAssignVariables({ stat_data: stat }, { type: 'message', message_id: 0 });
      lastStat = stat; prevStat = null;
      openingConfirmed = true;
      openingView = 'cards';
      switchTab('story');
      renderAll(true);
      await sendText(buildCustomInstruction(f, stage, role), { customStart: true, preEscaped: true });
    } catch (e) {
      if (hint) hint.textContent = '出错: ' + (e && e.message ? e.message : e);
    } finally { customBusy = false; }
  }

  function readOpeningsAll() {
    try {
      if (typeof getChatMessages !== 'function') return null;
      const m0 = getChatMessages(0, { include_swipes: true })[0];
      if (!m0) return null;
      const swipes = (Array.isArray(m0.swipes) && m0.swipes.length) ? m0.swipes : [m0.message || ''];
      return { swipes, cur: m0.swipe_id || 0 };
    } catch (e) { return null; }
  }

  function openingItems() {
    const info = readOpeningsAll();
    if (!info) return { items: [], cur: -1 };
    const items = [];
    info.swipes.forEach((t, i) => { if (/<initvar>/i.test(String(t || ''))) items.push({ i, text: t }); });
    return { items, cur: info.cur };
  }

  function updateOpeningNav() {
    const lab = doc.querySelector('#exp-shell-root .exp-nav-item[data-tab="opening"] .exp-nav-lab');
    if (!lab) return;
    const lid = safeLastMessageId();
    lab.textContent = (lid === 0) ? '开场白' : '序章';
  }

  function buildOpeningCardHtml(it, ord, cur, selectable) {
    const meta = metaForSwipe(ord);
    const body = (String(it.text).match(/<initvar>([\s\S]*?)<\/initvar>/i) || [])[1] || '';
    const time = parseYamlField(body, '时间');
    const loc = parseYamlField(body, '地点');
    const img = meta ? metaImg(meta) : '';
    const mrow = (ico, text) => `<div class="exp-open-mrow">${ico}<span>${escapeHtml(text)}</span></div>`;
    const html = `
      <div class="exp-open-card${selectable ? ' sel' : ''}${it.i === cur ? ' cur' : ''}" data-swipe="${it.i}">
        <div class="exp-open-img">${img ? `<img loading="lazy" src="${img}" onerror="this.style.opacity=.2">` : noArt('配图待出')}</div>
        <div class="exp-open-body">
          <div class="exp-open-act"><span>${escapeHtml(meta ? meta.act : ('开局 ' + (ord + 1)))}</span>${it.i === cur ? '<span class="exp-open-cur">当前</span>' : ''}</div>
          <div class="exp-open-name">${escapeHtml(meta ? meta.who : openingLabel(it.text, ord))}</div>
          ${meta ? `<div class="exp-open-role">${escapeHtml(meta.role)}</div>` : ''}
          <div class="exp-open-meta">
            ${time ? mrow(ICO.clock, time) : ''}
            ${loc ? mrow(ICO.pin, loc) : ''}
          </div>
          ${meta ? `<div class="exp-open-blurb">${escapeHtml(meta.blurb)}</div>` : ''}
          ${selectable ? '<span class="exp-open-go">从这里上船</span>' : ''}
        </div>
      </div>`;
    return { html, isIfLine: !!(meta && meta.line) };
  }

  function groupOpeningCards(items, cur, selectable) {
    const mainCards = [], ifCards = [];
    items.forEach((it, ord) => {
      const { html, isIfLine } = buildOpeningCardHtml(it, ord, cur, selectable);
      (isIfLine ? ifCards : mainCards).push(html);
    });
    return { mainCards, ifCards };
  }

  function renderOpeningTab() {
    const panel = getPanel('opening');
    if (!panel) return;
    updateOpeningNav();
    const lid = safeLastMessageId();
    const selectable = lid === 0;
    if (selectable && openingView === 'custom') { renderCustomForm(panel); return; }
    const { items, cur } = openingItems();
    const { mainCards, ifCards } = groupOpeningCards(items, cur, selectable);
    const sect = lab => `<div class="exp-open-sect"><span class="exp-open-sect-lab">${lab}</span></div>`;
    const customGroup = items.length && (selectable || cur === CUSTOM_SWIPE)
      ? sect('自定义') + `<div class="exp-open-cards custom-solo">${customCardHtml(selectable, !selectable && cur === CUSTOM_SWIPE)}</div>`
      : '';
    let cardsHtml;
    if (!items.length) cardsHtml = '<div class="exp-open-empty">聊天尚未开始，暂无可选开场</div>';
    else if (!ifCards.length) cardsHtml = customGroup + `<div class="exp-open-cards">${mainCards.join('')}</div>`;
    else cardsHtml = customGroup +
      (mainCards.length ? sect('正传') + `<div class="exp-open-cards">${mainCards.join('')}</div>` : '') +
      sect('If线') + `<div class="exp-open-cards">${ifCards.join('')}</div>`;
    panel.innerHTML = `
      <div class="exp-open">
        <div class="exp-open-head">
          <span class="exp-open-emblem">${EMBLEM}</span>
          <div class="exp-open-eyebrow">THE FRANKLIN EXPEDITION</div>
          <div class="exp-open-title">${selectable ? '启程之幕' : '序章'}</div>
          <div class="exp-open-sub">${selectable ? '选择你登船的那一天' : '这一程的起点'}</div>
        </div>
        ${cardsHtml}
        ${items.length
          ? `<div class="exp-open-foot">${selectable ? '落笔后随航程锁定，此页转为序章回顾' : '航程已开始，开局随之锁定'}</div>`
          : ''}
      </div>`;
    if (!selectable) return;
    panel.querySelectorAll('.exp-open-card.sel').forEach(card => {
      card.addEventListener('click', () => {
        if (openingBusy) return;
        if (card.dataset.custom) {
          openingView = 'custom';
          const info = readOpenings();
          if (info && info.cur !== CUSTOM_SWIPE) { switchOpening(CUSTOM_SWIPE); return; }
          renderOpeningTab();
          return;
        }
        card.classList.add('busy');
        chooseOpening(+card.dataset.swipe);
      });
    });
  }

  async function chooseOpening(n) {
    const lid = safeLastMessageId();
    if (lid !== 0) return;
    const info = readOpeningsAll();
    if (!info) return;
    if (n !== info.cur) await switchOpening(n);
    openingConfirmed = true;
    switchTab('story');
  }

  // ════ 正文渲染与生成｜发送与生成/删除 ════
  function setStoryStatus(text) {
    const el = doc.getElementById(SEL.storyStatus);
    if (el) el.textContent = text || '';
  }

  let sending = false;
  let currentGenId = null;
  let stopped = false;
  let pendingStop = false;
  let genBaselineId = null;

  function setGenerating(on) {
    sending = on;
    const ta = doc.getElementById(SEL.storyTextarea);
    const send = doc.getElementById(SEL.storySend);
    const regen = doc.getElementById(SEL.storyRegen);
    const del = doc.getElementById(SEL.storyDel);
    if (ta) ta.disabled = on;
    if (send) { send.innerHTML = on ? ICO.stop : ICO.send; send.title = on ? '停止' : '发送'; }
    if (regen) regen.disabled = on;
    if (del) del.disabled = on;
  }

  let delMode = false;
  const delSel = new Set();

  let delArmed = false, delArmTimer = null, delArmedAt = 0;

  function updateDelBar() {
    delArmed = false;
    if (delArmTimer) { clearTimeout(delArmTimer); delArmTimer = null; }
    const n = delSel.size;
    const count = doc.getElementById(SEL.delCount);
    const btn = doc.getElementById(SEL.delConfirm);
    if (count) count.textContent = n ? ('已选 ' + n + ' 楼') : '点选要删除的楼层';
    if (btn) { btn.disabled = !n; btn.classList.remove('armed'); btn.textContent = n ? ('删除 ' + n + ' 楼') : '删除'; }
  }

  function setDelMode(on) {
    if (!on) {
      const log = doc.getElementById(SEL.storyLog);
      if (log) log.querySelectorAll('.exp-story-turn.selable').forEach(t => t.classList.remove('selable', 'delsel'));
    }
    delMode = on;
    delSel.clear();
    const row = doc.querySelector('#exp-shell-root .exp-story-inputrow');
    const bar = doc.getElementById(SEL.storyDelbar);
    if (row) row.style.display = on ? 'none' : '';
    if (bar) bar.style.display = on ? '' : 'none';
    if (on && bar) animateOnce(bar, 'exp-in-soft');
    updateDelBar();
    setStoryStatus('');
    renderStoryLog();
  }

  async function onDelToggle() {
    if (sending) return;
    if (delMode) { setDelMode(false); return; }
    await commitUserEditIfOpen();
    if (editState) return;
    const lastId = safeLastMessageId();
    if (lastId == null || lastId < 1) { setStoryStatus('还没有可删除的楼层'); return; }
    setDelMode(true);
  }

  async function onDelConfirm() {
    if (!delMode || !delSel.size || sending) return;
    const btn = doc.getElementById(SEL.delConfirm);
    if (!delArmed) {
      delArmed = true;
      delArmedAt = Date.now();
      if (btn) { btn.classList.add('armed'); btn.textContent = '再点一次删除 ' + delSel.size + ' 楼'; }
      delArmTimer = setTimeout(updateDelBar, 3000);
      return;
    }
    if (Date.now() - delArmedAt < 300) return;
    if (delArmTimer) { clearTimeout(delArmTimer); delArmTimer = null; }
    delArmed = false;
    const ids = Array.from(delSel).sort((a, b) => a - b);
    if (btn) { btn.disabled = true; btn.classList.remove('armed'); }
    setStoryStatus('删除中...');
    try {
      if (typeof triggerSlash !== 'function') throw new Error('环境缺少 triggerSlash, 无法走原生删楼管线, 请更新酒馆助手');
      const segs = [];
      ids.forEach(id => {
        const cur = segs[segs.length - 1];
        if (cur && id === cur[1] + 1) cur[1] = id; else segs.push([id, id]);
      });
      for (const [a, b] of segs.reverse()) {
        await triggerSlash(a === b ? '/cut ' + a : '/cut ' + a + '-' + b);
      }
      lastStat = null; prevStat = null;
      storyCacheDrop();
      setDelMode(false);
      renderAll(true);
    } catch (e) {
      lastStat = null; prevStat = null;
      storyCacheDrop();
      setDelMode(false);
      renderAll(true);
      setStoryStatus('出错: ' + (e && e.message ? e.message : e));
    }
  }

  let editState = null;

  function applyUserEdit(log) {
    if (!editState) return;
    const turn = log.querySelector('.exp-story-turn.user[data-mid="' + editState.mid + '"]');
    if (!turn) { editState = null; return; }
    turn.classList.add('editing');
    turn.innerHTML = '<div class="exp-story-edit">'
      + '<textarea title="Ctrl+Enter 保存, Esc 取消"></textarea>'
      + '<div class="exp-story-edit-row">'
      + '<button class="exp-edit-btn exp-edit-cancel">取消</button>'
      + '<button class="exp-edit-btn primary exp-edit-save">保存</button>'
      + '</div></div>';
    const ta = turn.querySelector('textarea');
    ta.value = editState.draft;
    const grow = () => { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
    grow();
    ta.addEventListener('input', () => { if (editState) editState.draft = ta.value; grow(); });
    let editComposing = false;
    ta.addEventListener('compositionstart', () => { editComposing = true; });
    ta.addEventListener('compositionend', () => { editComposing = false; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !editComposing && !e.isComposing) { e.preventDefault(); closeUserEdit(true); }
    });
    turn.querySelector('.exp-edit-save').addEventListener('click', () => closeUserEdit(true));
    turn.querySelector('.exp-edit-cancel').addEventListener('click', () => closeUserEdit(false));
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  async function openUserEdit(mid) {
    if (sending || delMode || openingBusy) return;
    if (editState) {
      if (editState.mid === mid) return;
      await closeUserEdit(true);
      if (editState) return;
    }
    let raw = null;
    try {
      const m = getChatMessages(mid)[0];
      if (m && m.role === 'user') raw = m.message;
    } catch (e) { dbg('readUserMsg', e); }
    if (raw == null) return;
    editState = { mid: mid, draft: raw };
    const log = doc.getElementById(SEL.storyLog);
    if (log) {
      applyUserEdit(log);
      animateOnce(log.querySelector('.exp-story-edit'), 'exp-in-soft');
    }
    setStoryStatus('编辑中...');
  }

  async function closeUserEdit(save) {
    if (!editState) return;
    const mid = editState.mid;
    const text = String(editState.draft == null ? '' : editState.draft).trim();
    if (save && text) {
      try {
        await setChatMessages([{ message_id: mid, message: text }], { refresh: 'affected' });
        storyCacheDrop(mid);
      } catch (e) {
        setStoryStatus('出错: ' + (e && e.message ? e.message : e));
        return;
      }
      try {
        await eventEmit(tavern_events.MESSAGE_EDITED, mid);
        await eventEmit(tavern_events.MESSAGE_UPDATED, mid);
      } catch (e) { console.warn('[航海日志] 补发编辑事件失败', e); }
    }
    editState = null;
    setStoryStatus(save && !text ? '空内容未保存, 已还原' : '');
    renderStoryLog();
  }

  function commitUserEditIfOpen() {
    return editState ? closeUserEdit(true) : Promise.resolve();
  }

  function onStoryLogDblclick(e) {
    const turn = e.target.closest('.exp-story-turn.user');
    if (!turn || turn.classList.contains('editing')) return;
    const mid = +turn.dataset.mid;
    if (!Number.isInteger(mid)) return;
    openUserEdit(mid);
  }

  let tapDown = null;
  let lastTap = null;
  const TAP_MOVE_TOL = 12, TAP_HOLD_MS = 350, TAP_GAP_MS = 400, TAP_RADIUS = 30;

  function onStoryTapDown(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    tapDown = { x: e.clientX, y: e.clientY, t: Date.now() };
  }

  function onStoryTapUp(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    const down = tapDown;
    tapDown = null;
    if (!down || Date.now() - down.t > TAP_HOLD_MS
      || Math.abs(e.clientX - down.x) > TAP_MOVE_TOL || Math.abs(e.clientY - down.y) > TAP_MOVE_TOL) { lastTap = null; return; }
    const turn = e.target.closest('.exp-story-turn.user');
    if (!turn || turn.classList.contains('editing')) { lastTap = null; return; }
    const mid = +turn.dataset.mid;
    if (!Number.isInteger(mid)) { lastTap = null; return; }
    const prev = lastTap;
    lastTap = { mid: mid, x: e.clientX, y: e.clientY, t: Date.now() };
    const isDouble = prev && prev.mid === mid && (lastTap.t - prev.t) < TAP_GAP_MS
      && Math.abs(e.clientX - prev.x) < TAP_RADIUS && Math.abs(e.clientY - prev.y) < TAP_RADIUS;
    if (!isDouble) return;
    lastTap = null;
    openUserEdit(mid);
  }

  async function runGeneration() {
    stopped = false;
    const genId = 'exp_gen_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    currentGenId = genId;
    genBaselineId = safeLastMessageId();
    setStoryStatus('生成中...');

    let streamRAF = null;
    let latestFullText = '';
    let liveReasoning = '';
    let reasoningState = 'none';
    let revealedLen = 0;
    const flushStream = () => {
      streamRAF = null;
      const log = doc.getElementById(SEL.storyLog);
      if (!log) return;
      const target = extractMainText(latestFullText, true);
      const existing = log.querySelector('[data-stream-genid="' + genId + '"]');
      const stick = nearBottom(log);
      if (!target) {
        const liveThought = liveReasoning || extractThought(latestFullText, true);
        const wantThinking = reasoningState !== 'none' || !!liveThought;
        setStoryStatus(wantThinking ? '思考中...' : '构思中...');
        const html = wantThinking
          ? '<div class="exp-story-thinking"><span class="exp-story-thinking-rule l"></span><span class="exp-story-thinking-ico">' + ICO.thought + '</span><span class="exp-story-thinking-rule r"></span></div>'
          : '<div class="exp-story-text">' + storyTextHtml('…', true) + '</div>';
        if (existing && existing.classList.contains('thinking') === wantThinking) {
          if (wantThinking) {  } else { existing.innerHTML = html; }
        } else {
          if (existing) existing.remove();
          log.insertAdjacentHTML('beforeend', '<div class="exp-story-turn assistant' + (wantThinking ? ' thinking' : '') + (motionOK() ? ' exp-in-bubble' : '') + '" data-stream-genid="' + genId + '">' + html + '</div>');
        }
        if (stick) log.scrollTop = log.scrollHeight;
        updateJumpBtn();
        return;
      }
      setStoryStatus('生成中...');
      if (revealedLen > target.length) revealedLen = target.length;
      const gap = target.length - revealedLen;
      if (gap > 0) revealedLen = Math.min(target.length, revealedLen + Math.max(1, Math.ceil(gap / 6)));
      const text = target.slice(0, revealedLen);
      if (existing && !existing.classList.contains('thinking')) {
        const body = existing.querySelector('.exp-story-text');
        if (body) paintStoryText(body, text || '…');
      } else {
        if (existing) existing.remove();
        const thought = liveReasoning || extractThought(latestFullText);
        const foldHtml = thought ? thoughtFoldHtml(thought, null, false) : '';
        log.insertAdjacentHTML('beforeend', '<div class="exp-story-turn assistant' + (motionOK() ? ' exp-in-bubble' : '') + '" data-stream-genid="' + genId + '">' + foldHtml + '<div class="exp-story-text">' + storyTextHtml(text || '…', true) + '</div></div>');
      }
      if (stick) log.scrollTop = log.scrollHeight;
      updateJumpBtn();
      if (revealedLen < target.length) streamRAF = requestAnimationFrame(flushStream);
    };
    const onStream = (fullText) => {
      if (currentGenId !== genId) return;
      if (stopped) { try { SillyTavern.stopGeneration(); } catch (e) { dbg('stopGen', e); } }
      latestFullText = fullText;
      if (streamRAF == null) streamRAF = requestAnimationFrame(flushStream);
    };
    eventOn(tavern_events.STREAM_TOKEN_RECEIVED, onStream);
    let receivedId = null;
    const onReceived = mid => { if (currentGenId === genId) receivedId = mid; };
    eventOn(tavern_events.MESSAGE_RECEIVED, onReceived);
    const onReasoning = (reasoning, duration, mid, state) => {
      liveReasoning = reasoning || liveReasoning;
      reasoningState = state;
      if (streamRAF == null) streamRAF = requestAnimationFrame(flushStream);
    };
    eventOn(tavern_events.STREAM_REASONING_DONE, onReasoning);

    try {
      if (typeof triggerSlash !== 'function') throw new Error('环境缺少 triggerSlash, 无法走原生生成管线, 请更新酒馆助手');
      await triggerSlash('/trigger await=true');
      const after = safeLastMessageId();
      const newFloor = (after != null && genBaselineId != null && after > genBaselineId)
        ? (getChatMessages(after)[0] || null) : null;
      const gotReply = !!(newFloor && newFloor.role !== 'user');
      if (stopped) setStoryStatus('已停止');
      else if (gotReply) setStoryStatus('');
      else setStoryStatus('未收到回复，可点击左侧按钮重新生成');
    } catch (e) {
      setStoryStatus(stopped ? '已停止' : ('出错: ' + (e && e.message ? e.message : e)));
    } finally {
      eventRemoveListener(tavern_events.STREAM_TOKEN_RECEIVED, onStream);
      eventRemoveListener(tavern_events.STREAM_REASONING_DONE, onReasoning);
      eventRemoveListener(tavern_events.MESSAGE_RECEIVED, onReceived);
      if (streamRAF != null) { cancelAnimationFrame(streamRAF); streamRAF = null; }
      const rid = receivedId != null ? receivedId : safeLastMessageId();
      if (rid != null && rid >= 0) storyCacheDrop(rid);
      genBaselineId = null;
      currentGenId = null;
      setGenerating(false);
      renderStoryLog();
      animateOptions();
      renderAll();
    }
  }

  function escapeSlashText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
  }

  async function sendText(text, opts) {
    if (sending || delMode || openingBusy || !text) return false;
    await commitUserEditIfOpen();
    if (editState) return false;
    if (!(opts && opts.customStart) && onPanelSwipe()) {
      switchTab('opening');
      setStoryStatus('请先选择一条开场白');
      return false;
    }
    setGenerating(true);
    try {
      setStoryStatus('记录中...');
      if (typeof triggerSlash !== 'function') throw new Error('环境缺少 triggerSlash, 无法走原生发送管线, 请更新酒馆助手');
      const beforeSend = safeLastMessageId();
      await triggerSlash('/send ' + ((opts && opts.preEscaped) ? text : escapeSlashText(text)));
      const afterSend = safeLastMessageId();
      const sentFloor = afterSend != null ? (getChatMessages(afterSend)[0] || null) : null;
      if (afterSend !== (beforeSend == null ? -1 : beforeSend) + 1 || !sentFloor || sentFloor.role !== 'user') {
        throw new Error('用户消息未能入楼');
      }
      renderStoryLog();
      scrollStoryToEnd();
      const log = doc.getElementById(SEL.storyLog);
      if (log) { const turns = log.querySelectorAll('.exp-story-turn.user'); animateOnce(turns[turns.length - 1], 'exp-in-bubble'); }
    } catch (e) {
      pendingStop = false;
      setStoryStatus('出错: ' + (e && e.message ? e.message : e));
      setGenerating(false);
      return false;
    }
    if (pendingStop) {
      pendingStop = false;
      setStoryStatus('已停止');
      setGenerating(false);
      return true;
    }
    await runGeneration();
    return true;
  }

  async function onSend() {
    const ta = doc.getElementById(SEL.storyTextarea);
    if (!ta || sending) return;
    const text = ta.value.trim();
    if (!text) return;
    ta.value = '';
    autogrowStoryTA();
    const ok = await sendText(text);
    if (!ok) { ta.value = text; autogrowStoryTA(); }
  }

  function onOptionClick(text) {
    if (sending) return;
    if (optionMode === 'insert') {
      const ta = doc.getElementById(SEL.storyTextarea);
      if (ta) { ta.value = text; autogrowStoryTA(); ta.focus(); }
      return;
    }
    sendText(text);
  }

  function onSendButton() {
    if (!sending) { onSend(); return; }
    if (currentGenId) {
      stopped = true;
      try {
        if (SillyTavern && typeof SillyTavern.stopGeneration === 'function') SillyTavern.stopGeneration();
        else console.warn('[航海日志] 环境缺少 SillyTavern.stopGeneration, 无法停止原生生成');
      } catch (e) { dbg('stopGen2', e); }
    } else {
      pendingStop = true;
    }
    setStoryStatus('停止中...');
  }

  async function onRegenerate() {
    if (sending || delMode) return;
    await commitUserEditIfOpen();
    if (editState) return;
    const lastId = getLastMessageId();
    if (lastId == null || lastId < 0) return;
    const last = getChatMessages(lastId)[0];
    const isReply = last && last.role !== 'user';
    if (isReply && lastId === 0) return;
    setGenerating(true);
    try {
      if (isReply) {
        if (typeof triggerSlash !== 'function') throw new Error('环境缺少 triggerSlash, 无法走原生删楼管线, 请更新酒馆助手');
        await triggerSlash('/cut ' + lastId);
        if (safeLastMessageId() !== lastId - 1) throw new Error('删除上一条回复未生效');
        lastStat = null; prevStat = null;
        storyCacheDrop(lastId);
        renderStoryLog();
        renderAll(true);
      }
    } catch (e) {
      setStoryStatus('出错: ' + (e && e.message ? e.message : e));
      setGenerating(false);
      return;
    }
    await runGeneration();
  }

  // ════ 变量页(renderVarTab) ════
  function collectChangedPaths(prev, cur, prefix, out) {
    if (_.isEqual(prev, cur)) return;
    const bothObj = cur !== null && typeof cur === 'object' && prev !== null && typeof prev === 'object'
      && Array.isArray(cur) === Array.isArray(prev);
    if (!bothObj) { out.add(prefix); return; }
    const keys = Array.isArray(cur) ? cur.map((_v, i) => i) : Object.keys(cur);
    keys.forEach(k => collectChangedPaths(prev[k], cur[k], prefix ? prefix + '.' + k : String(k), out));
  }

  function jsonWithHighlight(val, path, indent, changed) {
    if (val === null || typeof val !== 'object') return escapeHtml(JSON.stringify(val));
    const isArr = Array.isArray(val);
    const keys = isArr ? val.map((_v, i) => i) : Object.keys(val);
    if (!keys.length) return isArr ? '[]' : '{}';
    const childIndent = indent + '  ';
    const body = keys.map((k, i) => {
      const childPath = path ? path + '.' + k : String(k);
      const keyPrefix = isArr ? '' : escapeHtml(JSON.stringify(String(k))) + ': ';
      const inner = jsonWithHighlight(val[k], childPath, childIndent, changed);
      const comma = i < keys.length - 1 ? ',' : '';
      const line = childIndent + keyPrefix + inner + comma;
      return changed.has(childPath) ? '<span class="exp-var-changed">' + line + '</span>' : line;
    }).join('\n');
    return (isArr ? '[\n' : '{\n') + body + '\n' + indent + (isArr ? ']' : '}');
  }

  function renderVarTab() {
    const panel = getPanel('var');
    if (!panel) return;
    const cur = _.omit(currentStat() || {}, ['$internal']);
    const prevRaw = previousStat();
    const prev = prevRaw ? _.omit(prevRaw, ['$internal']) : null;
    const changed = new Set();
    if (prev) collectChangedPaths(prev, cur, '', changed);
    const sections = [
      { key: 'cur', title: '当前变量 stat_data', html: jsonWithHighlight(cur, '', '', changed), def: true },
      { key: 'prev', title: '上一楼变量', html: prev ? escapeHtml(JSON.stringify(prev, null, 2)) : '暂无上一楼数据', def: false },
    ];
    panel.innerHTML = '<div class="exp-var">' + sections.map(s => {
      const open = (s.key in varFold) ? varFold[s.key] : s.def;
      return `<div class="exp-var-fold${open ? ' open' : ''}" data-fold="${s.key}">
          <div class="exp-var-foldhead"><span class="exp-var-arrow">${ICO.chev}</span><span>${s.title}</span></div>
          <pre class="exp-var-foldbody">${s.html}</pre>
        </div>`;
    }).join('') + '</div>';
    panel.querySelectorAll('.exp-var-fold').forEach(fold => {
      const head = fold.querySelector('.exp-var-foldhead');
      if (head) head.addEventListener('click', () => {
        varFold[fold.dataset.fold] = !fold.classList.contains('open');
        fold.classList.toggle('open', varFold[fold.dataset.fold]);
      });
    });
  }

  // ════ 渲染总控(renderAll) ════
  function renderAll(full, precomputedD) {
    maybeRerollHero();
    const D = precomputedD || readMVU();
    const timeEl = doc.getElementById(SEL.topbarTime);
    if (timeEl) timeEl.innerHTML = fmtTimeHtml(D.时间);
    const locEl = doc.getElementById(SEL.tbLoc);
    if (locEl) locEl.textContent = fmtPlace(D.地点);
    if (!sending) {
      const lid = safeLastMessageId();
      const blank = (lid == null || lid <= 0) && !D.时间 && !D.地点;
      const st = doc.getElementById(SEL.storyStatus);
      if (blank) setStoryStatus('航志初始化中…');
      else if (st && st.textContent === '航志初始化中…') setStoryStatus('');
    }
    const root = doc.getElementById(SHELL_ID);
    const activeEl = root && root.querySelector('.exp-panel.active');
    const activeName = activeEl ? activeEl.dataset.panel : null;
    const targets = (full || !activeName)
      ? PANELS.filter(p => p.render)
      : PANELS.filter(p => p.render && p.key === activeName);
    targets.forEach(p => renderSafe(p.key, () => p.render(D)));
  }

  // ════ 事件绑定与生命周期｜变量事件监听 ════
  // 注册即记账: 常驻监听一律走onEvent, pagehide统一注销, 不维护手写清单
  const boundEvents = [];
  function onEvent(name, fn) {
    boundEvents.push([name, fn]);
    eventOn(name, fn);
  }

  const onVarUpdateEnded = (variables, variables_before_update) => {
    try {
      if (!variables || !variables.stat_data) return;
      if (!variables_before_update || !_.isEqual(variables.stat_data, variables_before_update.stat_data)) {
        if (variables_before_update && variables_before_update.stat_data) prevStat = _.cloneDeep(_.omit(variables_before_update.stat_data, ['$internal']));
        lastStat = _.cloneDeep(_.omit(variables.stat_data, ['$internal']));
        const lid = safeLastMessageId();
        storyCacheDrop(lid);
        const afterD = readMVU(variables.stat_data);
        statDelta = (variables_before_update && variables_before_update.stat_data)
          ? diffStat(readMVU(variables_before_update.stat_data), afterD)
          : null;
        renderAll(false, afterD);
        playStatFx();
        if (isShellVisible() && !sending) renderStoryLog();
      }
    } catch (e) {
      console.warn('[航海日志] 变量更新渲染失败', e);
    }
  };
  onEvent('mag_variable_update_ended', onVarUpdateEnded);

  const onVarInitialized = variables => {
    try {
      if (variables && variables.stat_data) lastStat = _.cloneDeep(_.omit(variables.stat_data, ['$internal']));
      renderAll(true);
    } catch (e) {
      console.warn('[航海日志] 变量初始化渲染失败', e);
    }
  };
  onEvent('mag_variable_initiailized', onVarInitialized);

  // ════ 事件绑定与生命周期｜切聊天重载 ════
  let lastKnownChatId = null;
  try { lastKnownChatId = SillyTavern.getCurrentChatId(); } catch (e) { dbg('getChatId', e); }
  const onChatChanged = chatId => {
    if (lastKnownChatId !== null && lastKnownChatId !== chatId) { try { reloadIframe(); } catch (e) { dbg('reloadIframe', e); } return; }
    lastKnownChatId = chatId;
  };
  onEvent(tavern_events.CHAT_CHANGED, onChatChanged);

  // 数据库等插件改写楼层(如user消息规划改写)后刷新显示
  const onMsgMutated = mid => {
    const id = Number(mid);
    storyCacheDrop(id);
    if (isShellVisible() && !sending && !delMode && !editState) renderStoryLog();
  };
  onEvent(tavern_events.MESSAGE_EDITED, onMsgMutated);
  onEvent(tavern_events.MESSAGE_UPDATED, onMsgMutated);
  // st-chatu8等插件直接改写mes后只调renderMessage(发RENDERED事件), 不发MESSAGE_EDITED
  onEvent(tavern_events.CHARACTER_MESSAGE_RENDERED, onMsgMutated);
  onEvent(tavern_events.USER_MESSAGE_RENDERED, onMsgMutated);
  onEvent(tavern_events.MESSAGE_SWIPED, mid => {
    onMsgMutated(mid);
    if (!isShellVisible()) renderEntry();
  });
  // 原生侧删楼不会通知具体楼层号(参数是删后长度), 全量失效兜底
  onEvent(tavern_events.MESSAGE_DELETED, () => {
    storyCacheDrop();
    if (isShellVisible() && !sending && !delMode && !editState) renderStoryLog();
  });

  // ════ init ════
  async function init() {
    try {
      if (typeof waitGlobalInitialized === 'function') await waitGlobalInitialized('Mvu');
    } catch (e) { dbg('waitMvu', e); }
    lastStat = null; prevStat = null;
    storyCacheDrop();
    const prevVisible = isShellVisible();
    ['exp-shell-root', 'exp-entry'].forEach(id => {
      const el = doc.getElementById(id);
      if (el) el.remove();
    });
    ensureShell();
    ensureEntry();
    ensureStoryDom();
    applyVisibility(prevVisible);
    pollAcu();
    try { window.parent.addEventListener('exp-shell-enter', onShellEnter); } catch (e) { dbg('parentEnterEvt', e); }
    try { doc.addEventListener('keydown', onDocKey); } catch (e) { dbg('docKeydown', e); }
    try {
      doc.addEventListener('pointerdown', onPressDown);
      doc.addEventListener('pointermove', onPressMove);
      doc.addEventListener('pointerup', clearPressed);
      doc.addEventListener('pointercancel', clearPressed);
    } catch (e) { dbg('pointerEvt', e); }
    try {
      if (window.parent.__EXP_ENTER_FLAG) {
        window.parent.__EXP_ENTER_FLAG = false;
        if (!isShellVisible()) toggleShell();
      }
    } catch (e) { dbg('enterFlag', e); }
    try {
      renderAll(true);
      renderStoryLog();
      initIllustObserver();
      if (isShellVisible() && canSelectOpening() && !openingConfirmed) switchTab('opening');
    } catch (e) {
      applyVisibility(false);
      throw e;
    }
  }

  // ════ 事件绑定与生命周期｜快捷键与卸载清理 ════
  const ESC_CLOSERS = [
    { isOpen: () => !!doc.querySelector('#exp-shell-root .exp-poipop'), close: () => doc.querySelector('#exp-shell-root .exp-poipop').remove() },
    { isOpen: () => !!editState, close: () => closeUserEdit(false) },
    { isOpen: () => delMode, close: () => setDelMode(false) },
  ];

  function onDocKey(e) {
    try {
      if (!isShellVisible()) return;
      if (acuUiOpen()) return;
      if (e.key === 'Escape') {
        if (lbState) return;
        const hit = ESC_CLOSERS.find(c => c.isOpen());
        if (hit) { e.preventDefault(); hit.close(); }
        return;
      }
      if (sending || delMode || lbState) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return;
      const root = doc.getElementById(SHELL_ID);
      if (!root) return;
      const active = root.querySelector('.exp-panel.active');
      if (!active || active.dataset.panel !== 'story') return;
      const n = +e.key;
      if (!(n >= 1 && n <= 9)) return;
      const opts = doc.querySelectorAll('#exp-story-log .exp-story-opt');
      if (opts[n - 1]) { e.preventDefault(); opts[n - 1].click(); }
    } catch (err) {}
  }

  const PRESSABLE_SEL = '.exp-nav-item,.exp-iconbtn,.exp-story-opt,.exp-mate-btn,.exp-prey-card,.exp-theme-opt,.exp-hunt-go,.exp-del-btn,.exp-edit-btn,.exp-tb-close,.exp-mapctl button,.exp-entry-pill,.exp-story-thought-head,.exp-story-jump';
  let pressState = null;

  function clearPressed() {
    if (!pressState) return;
    pressState.el.classList.remove('exp-pressed');
    pressState = null;
  }

  function onPressDown(e) {
    const el = e.target.closest && e.target.closest(PRESSABLE_SEL);
    if (!el || el.disabled) return;
    clearPressed();
    pressState = { el: el, x: e.clientX, y: e.clientY };
    el.classList.add('exp-pressed');
  }

  function onPressMove(e) {
    if (!pressState) return;
    if (Math.abs(e.clientX - pressState.x) > 12 || Math.abs(e.clientY - pressState.y) > 12) clearPressed();
  }

  window.addEventListener('pagehide', () => {
    try {
      window.parent.removeEventListener('resize', positionPill);
      window.parent.removeEventListener('resize', onMapResize);
      window.parent.removeEventListener('exp-shell-enter', onShellEnter);
      doc.removeEventListener('keydown', onDocKey);
      doc.removeEventListener('pointerdown', onPressDown);
      doc.removeEventListener('pointermove', onPressMove);
      doc.removeEventListener('pointerup', clearPressed);
      doc.removeEventListener('pointercancel', clearPressed);
      disconnectIllustObserver();
      boundEvents.forEach(([name, fn]) => { try { eventRemoveListener(name, fn); } catch (e) { dbg('unbind:' + name, e); } });
      boundEvents.length = 0;
      const root = doc.getElementById(SHELL_ID);
      if (!root || root.dataset.owner === SHELL_TOKEN) {
        if (root) root.remove();
        const entry = doc.getElementById(SEL.entry);
        if (entry && entry.dataset.owner === SHELL_TOKEN) entry.remove();
        const style = doc.getElementById(SEL.shellStyle);
        if (style) style.remove();
        const hideStyle = doc.getElementById(SEL.shellHideStyle);
        if (hideStyle) hideStyle.remove();
      }
    } catch (e) { dbg('pagehide', e); }
  });

  if (typeof $ === 'function' && typeof errorCatched === 'function') {
    $(errorCatched(init));
  } else {
    (document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', init) : init();
  }
  // ════ st-chatu8 插图集成 ════
  const illustCache = new Map();

  function chatu8Active() {
    try {
      const v = getVariables({ type: 'chat' });
      // 插件写入的zhihuiji可能是字符串'true'或布尔true(设置UI与默认值类型不一致)
      if (v && (v.zhihuiji === 'true' || v.zhihuiji === true)) return true;
    } catch (e) { dbg('chatu8Active', e); }
    try {
      const s = (SillyTavern.getContext().extensionSettings || {})['st-chatu8'];
      return !!s && (s.scriptEnabled === true || s.scriptEnabled === 'true');
    } catch (e) { return false; }
  }

  // 标记符号玩家可在插件设置里改, 运行时读取; 读不到时退回默认值
  function chatu8Tags() {
    try {
      const s = (SillyTavern.getContext().extensionSettings || {})['st-chatu8'];
      if (s && s.startTag && s.endTag) return { start: String(s.startTag), end: String(s.endTag) };
    } catch (e) { dbg('chatu8Tags', e); }
    return { start: 'image###', end: '###' };
  }

  function illustMarkerRe() {
    const t = chatu8Tags();
    const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let src = esc(t.start) + '[\\s\\S]*?' + esc(t.end);
    // 插件的XML转换等路径无视设置硬编码产出image###, 自定义标记时两种都认
    if (t.start !== 'image###') src += '|image###[\\s\\S]*?###';
    return new RegExp(src, 'g');
  }

  // 按DOM序返回每个插图位: null=生成中或失败, 否则{src, video}
  // span是稳定锚点(生成中为空span, container成功后才出现); 无span时兜底扫旧版容器
  function scanNativeImages(mesId) {
    try {
      const mesEl = doc.querySelector('#chat .mes[mesid="' + mesId + '"] .mes_text');
      if (!mesEl) return [];
      let units = mesEl.querySelectorAll('.st-chatu8-image-span');
      if (!units.length) units = mesEl.querySelectorAll('.st-chatu8-image-container');
      return Array.from(units).map(u => {
        const media = u.querySelector('img, video');
        const src = media && (media.currentSrc || media.src);
        return src ? { src: src, video: media.tagName === 'VIDEO' } : null;
      });
    } catch (e) { return []; }
  }

  function illustSrcs(mid) {
    if (!Number.isInteger(mid) || !chatu8Active()) return [];
    let srcs = illustCache.get(mid);
    if (srcs === undefined) {
      srcs = scanNativeImages(mid);
      illustCache.set(mid, srcs);
    }
    return srcs;
  }

  function illustMediaHtml(item) {
    if (item.video) return '<video src="' + escapeHtml(item.src) + '" controls loop muted playsinline preload="metadata"></video>';
    return '<img src="' + escapeHtml(item.src) + '" loading="lazy">';
  }

  // 楼底插图块: 槽位没消化完的图(如世界书楼尾标记产出)仍追加在楼层底部
  function illustTailHtml(mid, from) {
    const srcs = illustSrcs(mid);
    if (from >= srcs.length) return '';
    return srcs.slice(from).filter(Boolean).map(item =>
      '<div class="exp-illust" data-illust-mid="' + mid + '">' + illustMediaHtml(item) + '</div>'
    ).join('');
  }

  // 初始建楼: 在字符串层面把正文里的空槽位按序填上图, 返回处理后的正文与楼底块
  function fillIllustSlots(textHtml, mid) {
    const srcs = illustSrcs(mid);
    let k = 0;
    const html = textHtml.replace(/<p class="exp-illust exp-ill-slot"><\/p>/g, () => {
      const item = srcs[k++];
      return '<p class="exp-illust exp-ill-slot">' + (item ? illustMediaHtml(item) : '') + '</p>';
    });
    return { html: html, tail: illustTailHtml(mid, k) };
  }

  function updateIllusts(turnEl, mid) {
    if (!Number.isInteger(mid)) return;
    const srcs = illustSrcs(mid);
    const slots = turnEl.querySelectorAll('.exp-story-text .exp-ill-slot');
    slots.forEach((slot, i) => {
      const item = srcs[i] || null;
      const media = slot.querySelector('img, video');
      if (!item) { if (media) slot.innerHTML = ''; return; }
      const want = item.video ? 'VIDEO' : 'IMG';
      if (!media || media.tagName !== want) slot.innerHTML = illustMediaHtml(item);
      else if (media.getAttribute('src') !== item.src) media.setAttribute('src', item.src);
    });
    const tailHtml = illustTailHtml(mid, slots.length);
    const existingTail = Array.from(turnEl.querySelectorAll('.exp-illust')).filter(el => !el.classList.contains('exp-ill-slot'));
    if (!tailHtml && !existingTail.length) return;
    existingTail.forEach(el => el.remove());
    if (tailHtml) {
      const foot = turnEl.querySelector('.exp-ff-wrap');
      if (foot) foot.insertAdjacentHTML('beforebegin', tailHtml);
      else turnEl.insertAdjacentHTML('beforeend', tailHtml);
    }
  }

  // ==== 灯箱 ====
  function openIllustLightbox(imgEl) {
    const src = imgEl.src;
    if (!src) return;
    const root = doc.getElementById(SHELL_ID);
    if (!root) return;
    let lb = root.querySelector('.exp-illust-lb');
    if (lb) lb.remove();
    lb = doc.createElement('div');
    lb.className = 'exp-illust-lb';
    lb.innerHTML = '<div class="exp-lb-backdrop"></div>'
      + '<div class="exp-lb-stage"><img src="' + escapeHtml(src) + '"></div>';
    lb.addEventListener('click', e => {
      if (!e.target.closest('.exp-lb-stage img')) {
        lb.classList.add('exp-lb-out');
        setTimeout(() => lb.remove(), 180);
      }
    });
    root.appendChild(lb);
    requestAnimationFrame(() => lb.classList.add('exp-lb-in'));
  }

  // ==== MutationObserver ====
  let illustObserver = null;

  function chatu8Node(n) {
    if (!n || n.nodeType !== 1) return false;
    return (n.matches && n.matches('.st-chatu8-image-container, .st-chatu8-image-span'))
      || (n.querySelector && !!n.querySelector('.st-chatu8-image-container, .st-chatu8-image-span'))
      || (n.closest && !!n.closest('.st-chatu8-image-container, .st-chatu8-image-span'));
  }

  function initIllustObserver() {
    const chat = doc.getElementById('chat');
    if (!chat || illustObserver) return;
    let raf = 0;
    // 跨批次累积受影响楼层: rAF去抖会丢弃旧批次的muts, 楼层号必须先攒下来
    const pendingMids = new Set();
    illustObserver = new MutationObserver(muts => {
      let dirty = false;
      for (const m of muts) {
        let hit = false;
        if (m.type === 'attributes') {
          hit = chatu8Node(m.target);
        } else {
          for (const n of m.addedNodes) {
            if (chatu8Node(n)) { hit = true; break; }
          }
          if (!hit) for (const n of m.removedNodes) {
            if (chatu8Node(n) || (m.target && chatu8Node(m.target))) { hit = true; break; }
          }
        }
        if (!hit) continue;
        dirty = true;
        let el = m.target;
        while (el && el !== chat) {
          if (el.classList && el.classList.contains('mes') && el.getAttribute('mesid')) {
            pendingMids.add(+el.getAttribute('mesid'));
            break;
          }
          el = el.parentElement;
        }
      }
      if (!dirty) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const n = pendingMids.size;
        for (const mid of pendingMids) {
          illustCache.delete(mid);
          storyCacheDrop(mid);
        }
        pendingMids.clear();
        if (n > 0 && isShellVisible() && !sending) renderStoryLog();
      });
    });
    illustObserver.observe(chat, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  }

  function disconnectIllustObserver() {
    if (illustObserver) { illustObserver.disconnect(); illustObserver = null; }
  }
})();
