/*
 * 远征-全屏前端.js —— 单文件全屏外壳, 原样粘贴进「酒馆助手脚本-远征-全屏外壳.json」的 content 字段部署。
 * 架构说明、面板注册表用法、状态变量分组、数据表关系、主题与颜色系统、验证方式、已知设计取舍等
 * 详见同目录 ARCHITECTURE.md, 改动前建议先读一遍。
 *
 * 分区列表(区块名 + 大致行号范围, 用 // ════ 区块名 ════ 标记, 可 grep "════" 看全部分区):
 *   常量与选择器(LS_KEYS/SEL)                          约 37-84
 *   外壳可见性与入口(隐藏原生/显隐切换/进入胶囊)         约 85-218
 *   CSS与主题变量(THEME_VARS/SHELL_CSS)                约 219-1201
 *   图标与静态素材(ICO)                                约 1202-1235
 *   面板注册表(PANELS)                                 约 1236-1256
 *   数据表(技能图标/立绘库/地图与航海数据/角色名单/兜底常量/仪表工具)  约 1257-1453
 *   状态变量(立绘选取与角色选中态)                       约 1454-1482
 *   MVU读取与派生(readMVU/currentStat/previousStat)     约 1483-1575
 *   外壳骨架与切页(ensureShell/switchTab)               约 1576-1767
 *   动效工具(入场动画/外壳进出编排/数值变化反馈)          约 1768-2020
 *   设置项(主题/选项模式/立绘模式/字号/动效/SFW)         约 2021-2177
 *   角色与画廊(角色页/画廊/灯箱)                        约 2178-2411
 *   船员                                              约 2412-2492
 *   狩猎                                              约 2493-2625
 *   地图                                              约 2626-3022
 *   正文渲染与生成 · 展示与文本处理                      约 3023-3487
 *   开场白                                             约 3488-3874
 *   正文渲染与生成 · 发送与生成/删除                     约 3875-4378
 *   变量页(renderVarTab)                               约 4379-4441
 *   渲染总控(renderAll)                                约 4442-4469
 *   事件绑定与生命周期 · 变量事件监听                     约 4470-4512
 *   事件绑定与生命周期 · 切聊天重载                       约 4513-4539
 *   init                                              约 4540-4585
 *   事件绑定与生命周期 · 快捷键与卸载清理                 约 4586-末尾
 *
 * 免责声明: 以上行号只在写这份TOC的当下准确, 后续任何一次改动都可能让行号整体漂移, 仅供粗略定位;
 * 精确位置以 grep 对应的 "// ════ 区块名 ════" 锚点注释为准, 锚点文字与本 TOC 逐字一致。
 * "正文渲染与生成"与"事件绑定与生命周期"各拆成两处不连续的区块(中间夹着"开场白"/"init"), 属实际文件结构, 不是笔误。
 */
(function () {
  // ════ 常量与选择器(LS_KEYS/SEL) ════
  const doc = window.parent.document;
  const SHELL_ID = 'exp-shell-root';
  // 本次 iframe 运行的唯一归属令牌: 用于 pagehide 时判断外壳是否已被新 iframe 接管, 避免误删
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
    storyDiff: 'exp-story-diff',
    storyDiffpanel: 'exp-story-diffpanel',
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

  // ════ 外壳可见性与入口(隐藏原生/显隐切换/进入胶囊) ════
  // 隐藏原生聊天区; 显隐切换靠 disabled
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
    // 外壳可见则隐藏原生并收起入口; 隐藏则放出原生并按情况显示入口
    ensureHideStyle().disabled = !visible;
    if (visible) hideEntry();
    else renderEntry();
  }

  function toggleShellImpl() {
    if (isShellVisible()) { commitUserEditIfOpen(); playShellExit(); return; } // 退出前落定开着的编辑器(不等待, 只是数据写入)
    try {
      bootAnimating = motionOK(); // 先立旗: 下面 switchTab 的入场交给 playShellEnter 统一编排
      // 退出期间玩家可能在原生界面删楼/swipe/编辑楼层(本脚本无从旁观), 楼层号与楼层内容都不可信:
      // 删楼后继续对话会让新楼层复用旧 message_id, 按楼层号缓存的旧内容会原样顶替新消息显示。
      // 与 init() 切聊天同款, 按楼层号缓存的状态全部作废, 重进时按当前聊天权威重建
      lastStat = null; prevStat = null;
      storyHtmlCache.clear();
      editState = null; // 防御: 退出时保存失败残留的编辑态, 其 mid 在错位后不可信, 不带进本次会话
      if (delMode) setDelMode(false); // 残留的删楼勾选在楼层号错位后会指向完全不同的楼层, 不能带着重进
      applyVisibility(true);
      updateAcuNav(); // 退出期间玩家可能装/卸了数据库插件, 每次开壳重新判一次入口显隐
      renderAll(true);
      renderStoryLog();
      // fresh 新聊天且未确认开局 → 落开场白页选幕; 其余恢复上次所在页
      if (canSelectOpening() && !openingConfirmed) switchTab('opening');
      else {
        const t = safeLSGet(LS_KEYS.tab);
        if (t && getPanel(t)) switchTab(t);
      }
      playShellEnter();
    } catch (e) {
      applyVisibility(false); // 回退: 恢复原生聊天, 不让玩家卡死在黑屏上
      throw e; // 交给外层 errorCatched(若可用)通过酒馆通知呈现给玩家
    }
  }
  // 开外壳这个交互动作是唯一没有酒馆助手 errorCatched 兜底的入口(init() 在文件末尾另有包裹);
  // 用官方 errorCatched 包一层, 报错时弹酒馆通知而不是静默卡死在黑屏上
  const toggleShell = (typeof errorCatched === 'function') ? errorCatched(toggleShellImpl) : toggleShellImpl;

  // 消息0面板「启程」按钮的事件桥: 面板 iframe 向 parent 置标志并派发事件, 这里唤起外壳。
  // 事件被消费后立即清标志, 防止残留到下次 init 误触发自动进入
  function onShellEnter(e) {
    try { window.parent.__EXP_ENTER_FLAG = false; } catch (err) {}
    // 全屏主题跟随开场面板选择: 事件 detail 优先, 否则读 localStorage(与设置页共用键)
    try {
      let t = (e && e.detail && e.detail.theme) || null;
      if (!t) t = safeLSGet(LS_KEYS.theme);
      if (t && THEMES.some(x => x.key === t) && t !== theme) applyTheme(t);
    } catch (err) {}
    if (!isShellVisible()) toggleShell();
  }

  // ---- 进入入口(浮在原生上, 仅外壳隐藏时可见) ----
  // 第0楼停在消息0入口面板(swipe 0)时不渲染: 面板本身承担入口; 其余情况给顶部胶囊兜底——
  // 包括已切到某条开场白(swipe≥1)但还没发过话的第0楼, 那时原生界面没有任何别的入口。退出用顶栏 ✕。

  // 第0楼当前 swipe: 0=消息0入口面板, ≥1=某条开场白。读不到时按0处理(不出胶囊, 与面板场景同款保守)
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

  // 胶囊贴住原生聊天区(#chat)顶部居中: 自动落在酒馆顶栏下方, 避免与之冲突; 无 #chat 时回退到视口顶部
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
  // 主题变量表: 每套主题一个对象, 只在这一处维护; themeVarsCss 把表展开成实际CSS规则, 避免5套主题各自
  // 手写一整行长CSS、改一处忘另一处漂移。色彩角色规则见下方 SHELL_CSS 主题变量注释。
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
      // sem-*: 语义"文字"色(好转/警戒/危殆/冻结)。与下面 meter-*-a/b 刻意分开: 那族是条状填充色,
      // 直接拿来写文字在深色主题下对比度只有 2.3。这四个在浅色主题里必须整体压深:
      // 固定 hex(如 #c0554a/#d08a45/#7fa05a/#7fb0d4)不跟主题走, 在近白底上对比度只有 2.2~2.9。
      'sem-good': '#7fa05a',
      'sem-warn': '#d08a45',
      'sem-bad': '#cc6e64',
      'sem-frost': '#7fb0d4',
      // scrim: 灯箱遮罩专用, 不复用 --sh-rgb —— 后者是投影色(浅色主题下是棕/藏蓝/暖灰),
      // 铺成 .78 遮罩会合成出一块中调色, 压在上面的说明字只剩 1.0:1, 几乎完全看不见。
      // 灯箱本来就该是"暗房", 浅色主题也不例外, 所以五套主题的 scrim 一律是深色。
      'scrim': 'rgba(0,0,0,.78)',
      'on-scrim': '#d8c48a',
      'on-scrim-dim': '#9aa0ab',
      // panel-hover: 浅色主题的 --panel 是不透明实色, hover 写 rgba(gold,.06) 是"替换"而非"叠加",
      // 底色会掉到页面 bg 上, 结果 hover 比常态更暗(观感是一放鼠标卡片就陷下去)。这个 token 让
      // 深色继续叠加提亮、浅色改为提亮到更白, 两边方向一致。
      'panel-hover': 'rgba(255,255,255,.07)',
      // 语义色(仪表四档质量色/名册减员统计色/地图POI色): 与上面的"结构色"是两族独立token, 见下方
      // mcol()/POITYPE/buildMarker 的调用处注释。dark 是原有硬编码hex的原样迁移, 零字面值变化。
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
      'gold': '#705921',
      'gold-hi': '#71550f',
      'gold-soft': '#6f591e',
      'gold-mid': '#b3923f',
      'gold-deep': '#7d6420',
      'gold-rgb': '122,96,42',
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
      'gold': '#775d16',
      'gold-hi': '#775a04',
      'gold-soft': '#775e15',
      'gold-mid': '#c09a30',
      'gold-deep': '#846814',
      'gold-rgb': '100,80,20',
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
      'gold': '#755c17',
      'gold-hi': '#715808',
      'gold-soft': '#755c13',
      'gold-mid': '#b3902c',
      'gold-deep': '#7d6210',
      'gold-rgb': '96,76,18',
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
  // 设置页主题色卡: 从 THEME_VARS 现取(底色/主色/金), 不手写。
  // 不单独手写一份色卡: 那样 THEME_VARS 调色后极易漏改这里, 设置页会一直显示过期的配色样本。
  function themeSwatch(key) {
    const v = THEME_VARS[key] || {};
    const stops = (v.bg || '').match(/#[0-9a-fA-F]{6}/g) || [];
    return [stops[Math.floor(stops.length / 2)] || v.panel || '#888', v.accent || v['gold-hi'], v['gold-mid']];
  }
  // 展开成 CSS 规则: dark 是无 data-theme 属性时的默认主题, 直接选根元素本身; 其余主题按 data-theme 命中
  function themeVarsCss(key, vars) {
    const sel = key === 'dark' ? '#exp-shell-root,#exp-entry' : `#exp-shell-root[data-theme="${key}"],#exp-entry[data-theme="${key}"]`;
    return sel + '{' + Object.entries(vars).map(([k, v]) => `--${k}:${v};`).join('') + '}';
  }
  const THEME_CSS = Object.entries(THEME_VARS).map(([k, v]) => themeVarsCss(k, v)).join('\n');

  const SHELL_CSS = `

/* 主题变量: 默认黑金, data-theme 切换 */
${THEME_CSS}
/* 复用度高且属性角色统一的透明度组合, 收成主题无关的固定token(仍会跟着当前主题的--gold-rgb走):
   --border-pop=浮层描边(灯箱/地图控件/POI弹窗), --border-hover=交互悬停态描边。
   --border-hover 跟 gold 而不是 accent: hover 是瞬时反馈, accent 留给 .sel/.cur/.on 等持久语义态
   (参照.exp-spoi的hover用gold/.cur用accent两态分工), 不引入新色系 */
#exp-shell-root,#exp-entry{--border-pop:rgba(var(--gold-rgb),.42);--border-hover:rgba(var(--gold-rgb),.55);}
/* 浅色主题: user气泡降低填充浓度 */
#exp-shell-root[data-theme="parchment"] .exp-story-turn.user .exp-story-text{background:rgba(var(--accent-rgb),.06);border-color:rgba(var(--accent-rgb),.28);}
#exp-shell-root[data-theme="ivory"] .exp-story-turn.user .exp-story-text{background:rgba(var(--accent-rgb),.06);border-color:rgba(var(--accent-rgb),.28);}
#exp-shell-root[data-theme="marble"] .exp-story-turn.user .exp-story-text{background:rgba(var(--accent-rgb),.06);border-color:rgba(var(--accent-rgb),.28);}
/* 字体链要覆盖三个平台: mac/iOS 命中 Songti SC, Windows 一路落到 SimSun(中易宋体, 系统自带)。
   不补 SimSun 的话 Windows 会掉到系统默认黑体, 整套衬线调性当场破功。--read-col 是正文阅读列宽,
   随字号档位走(见字号档位那段), 让每行字数恒定而不是让行宽恒定。 */
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
/* 数据库插件(ACU)入口: 默认藏, 检测到插件后由 updateAcuNav 给根元素挂 data-acu 才显示 */
#exp-shell-root .exp-nav-item[data-ext="acu"]{display:none;}
#exp-shell-root[data-acu] .exp-nav-item[data-ext="acu"]{display:flex;}
/* 主区 */
#exp-shell-root .exp-main{flex:1;display:flex;flex-direction:column;min-width:0;}
#exp-shell-root .exp-topbar{display:flex;align-items:center;gap:24px;height:calc(64px + env(safe-area-inset-top,0px));box-sizing:border-box;padding:env(safe-area-inset-top,0px) 28px 0;flex:none;border-bottom:1px solid rgba(var(--gold-rgb),.14);}
#exp-shell-root .exp-tb-info{display:contents;}
#exp-shell-root .exp-tb-item{display:flex;align-items:center;gap:8px;font-size:13.5px;letter-spacing:1.5px;color:var(--text-dim);}
#exp-shell-root .exp-tb-item svg{width:16px;height:16px;color:var(--gold);flex:none;}
#exp-shell-root .exp-panels{flex:1;position:relative;overflow:hidden;}
#exp-shell-root .exp-panel{position:absolute;inset:0;overflow-y:auto;padding:28px 32px;display:none;}
#exp-shell-root .exp-panel.active{display:block;}
/* 角色页 */
#exp-shell-root .exp-panel[data-panel="char"]{padding:12px 32px 28px;overflow:hidden;}
#exp-shell-root .exp-panel.active[data-panel="char"]{display:flex;flex-direction:column;}
/* 名字一律横排, 放不下就整条左右滑(手机竖屏五个女主刚好差一点点放不下, 换行会把名字竖成一列);
   padding-bottom 留 1px 是给选中态 ::after 下划线(bottom:-1px)让位, 否则会被 overflow 裁掉 */
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
#exp-shell-root .exp-char-stage.dead .hero-inner{filter:grayscale(1) brightness(.6);}
/* 立绘画廊(独立标签页): 顶部角色 Tabs 复用 .exp-char-tab, 下方两区网格 */
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
/* 快捷固定按钮: hover 显示(触屏常驻), 已固定时常亮金色; 点击只固定不开大图 */
#exp-shell-root .exp-gal-pin{position:absolute;right:6px;top:6px;width:23px;height:23px;border-radius:50%;border:1px solid rgba(var(--gold-rgb),.55);background:rgba(var(--pop-rgb),.78);color:var(--gold-hi);display:none;place-items:center;cursor:pointer;transition:background .15s,color .15s;}
#exp-shell-root .exp-gal-pin svg{width:12px;height:12px;}
#exp-shell-root .exp-gal-thumb:hover .exp-gal-pin{display:grid;}
#exp-shell-root .exp-gal-pin:hover{background:rgba(var(--pop-rgb),.98);}
#exp-shell-root .exp-gal-thumb.pinned .exp-gal-pin{display:grid;background:var(--gold);color:var(--on-gold,#12131a);border-color:var(--gold);}
@media(hover:none){#exp-shell-root .exp-gal-pin{display:grid;}}
/* 内容分级 SFW: 遮蔽画廊 NSFW 主题图, 由根属性 data-sfw 命中 */
#exp-shell-root .exp-gal-lock{display:none;position:absolute;inset:0;align-items:center;justify-content:center;pointer-events:none;background:radial-gradient(circle at center,rgba(8,9,12,.42),rgba(8,9,12,0) 72%);color:rgba(240,228,196,.95);}
#exp-shell-root .exp-gal-lock svg{width:24px;height:24px;filter:drop-shadow(0 1px 5px rgba(0,0,0,.55));}
#exp-shell-root[data-sfw] .exp-gal-thumb[data-pos="back"]{pointer-events:none;}
#exp-shell-root[data-sfw] .exp-gal-thumb[data-pos="back"] img{filter:blur(13px) brightness(.7) saturate(.85);transform:scale(1.1);}
#exp-shell-root[data-sfw] .exp-gal-thumb[data-pos="back"] .exp-gal-pin{display:none;}
#exp-shell-root[data-sfw] .exp-gal-thumb[data-pos="back"] .exp-gal-lock{display:flex;}
/* 大图查看器(灯箱) */
#exp-shell-root .exp-lightbox{position:absolute;inset:0;z-index:9003;display:flex;align-items:center;justify-content:center;}
#exp-shell-root .exp-lb-backdrop{position:absolute;inset:0;background:var(--scrim);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
#exp-shell-root .exp-lb-stage{position:relative;z-index:1;height:92%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;}
/* 立绘容器: 高度取「舞台可用高」与「按比例撑满视口宽所需的高」里的小者, 两个方向都不会溢出,
   立绘完整可见(若只按舞台高定尺寸, 窄屏上按高反推的图宽会超出视口: 390 宽的屏上图宽可达 496,
   左右各有 53px 被推到屏幕外看不见); 关闭按钮挂在这一层, 定位基准就是立绘本身而不是整屏 */
#exp-shell-root .exp-lb-figure{position:relative;flex:none;height:min(calc(100% - 52px),calc(100vw * 1216 / 832));aspect-ratio:832/1216;width:auto;max-width:100%;}
#exp-shell-root .exp-lb-img{width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;border:1px solid var(--border-pop);box-shadow:0 18px 60px rgba(var(--sh-rgb),.7);background:rgba(var(--fg-rgb),.06);}
#exp-shell-root .exp-lb-bar{flex:none;display:flex;align-items:center;gap:18px;}
#exp-shell-root .exp-lb-cap{font-size:13px;letter-spacing:2px;color:var(--on-scrim);}
#exp-shell-root .exp-lb-count{margin-left:10px;font-size:11.5px;letter-spacing:1px;color:var(--on-scrim-dim);}
#exp-shell-root .exp-lb-pin{display:inline-flex;align-items:center;gap:7px;font-size:12px;letter-spacing:1px;color:var(--gold-hi);background:rgba(var(--pop-rgb),.92);border:1px solid rgba(var(--gold-rgb),.45);border-radius:7px;padding:6px 14px;cursor:pointer;transition:.15s;}
#exp-shell-root .exp-lb-pin svg{width:13px;height:13px;}
#exp-shell-root .exp-lb-pin:hover{border-color:var(--gold-hi);transform:translateY(-2px);}
#exp-shell-root .exp-lb-pin.on{background:var(--accent,var(--gold));color:var(--on-accent,#12131a);border-color:var(--accent,var(--gold));}
/* 灯箱的翻页/关闭都是裸图案而不是按钮胶囊: 圆底+描边压在立绘上太抢眼。金色靠 drop-shadow
   兜住浅色立绘上的可读性; hover 只调透明度与颜色, 位移动效会跟 translateY(-50%) 的居中打架 */
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
/* 三格(好感/心声/回想)全是整行内容, 纵向 flex 即可, 不需要网格; 回想格吃掉剩余高度 */
#exp-shell-root .exp-char-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px;}
#exp-shell-root .exp-char-cell{background:var(--panel);border:1px solid rgba(var(--gold-rgb),.28);border-radius:12px;padding:16px 19px;box-shadow:var(--panel-sh,none);}
/* 心声给一个下限高度: 内容通常只有一两句, 撑出来的卡片比下面的回想矮太多, 观感失衡;
   多出来的高度直接从回想那格(flex:1 吃剩余空间)里让出来 */
#exp-shell-root .exp-char-cell.voice{min-height:176px;}
/* min-height 是矮窗口的保底: 只有 flex:1 时回想会被
   上面两格挤到几乎没有高度, 横屏手机上直接塌成一条缝 */
#exp-shell-root .exp-char-cell.memo{min-height:150px;flex:1;display:flex;flex-direction:column;}
/* 回想在宽屏分两列铺开(条目短、条数多, 单列会拖出一长条空白)。用 grid 而不是 CSS multicol:
   multicol 在定高滚动容器里溢出方向各浏览器不一致(可能横着长出第三列), grid 一定是纵向滚动 */
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
/* position:relative 是给条上的 .meter-tick 刻度线当定位基准用的(与船员页仪表条共用那套刻度) */
#exp-shell-root .cell-bar{position:relative;height:8px;border-radius:4px;background:rgba(var(--fg-rgb),.09);overflow:hidden;}
#exp-shell-root .cell-bar .fill{height:100%;border-radius:4px;transition:width .6s;}
#exp-shell-root .exp-char-cell.aff .fill{background:linear-gradient(90deg,var(--aff-a,#e0a98f),var(--aff,#c0554a));}
/* 档位轨道(好感条与船员页三仪表、狩猎技巧条共用): 四档名各占等宽一格, 格子边界与条上 25/50/75
   三道刻度线对齐。当前档的颜色由各条自己给, 默认落在金色上 */
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
/* min-width 让三张卡的数字不因位数(9/38/100)左右跳, 与好感卡 .cell-num 同一个约定 */
#exp-shell-root .meter-num{font-size:21px;font-weight:700;color:var(--num,var(--gold-hi));min-width:30px;text-align:right;}
#exp-shell-root .meter-bar{position:relative;height:9px;border-radius:5px;background:rgba(var(--fg-rgb),.16);overflow:hidden;border:1px solid rgba(var(--fg-rgb),.10);}
#exp-shell-root .meter-fill{height:100%;border-radius:5px;transition:width .6s;}
#exp-shell-root .meter-tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(var(--fg-rgb),.22);}
#exp-shell-root .meter.warn .meter-band,#exp-shell-root .meter.warn .stat-node.cur{color:var(--sem-warn);}
#exp-shell-root .meter.grave .meter-band,#exp-shell-root .meter.grave .stat-node.cur{color:var(--sem-bad);}
/* 船员页扩展: 三列仪表 + Δ箭头 + 冻结态 */
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
/* 船员名册 + 减员统计条 + 殁者名录 */
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
/* 出猎筹备(行前报告) */
/* 狩猎页是一整张清单(技巧抬头 → 一 猎物 → 二 同行 → 结论 → 出猎), 不是四张并列的卡片。
   清单里的技巧仪表要去掉自己那层卡片外壳, 否则成了卡中卡 */
#exp-shell-root .exp-hunt-sheet{background:var(--panel);border:1px solid rgba(var(--gold-rgb),.28);border-radius:12px;padding:17px 21px 19px;box-shadow:var(--panel-sh,none);}
#exp-shell-root .exp-hunt-sheet .meter{padding:0;background:none;border:none;box-shadow:none;}
#exp-shell-root .sheet-sect{display:flex;align-items:center;gap:11px;margin:20px 0 12px;}
#exp-shell-root .sheet-sect::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(var(--gold-rgb),.3),transparent);}
#exp-shell-root .exp-hunt-sheet .meter-ico{display:none;}   /* 清单里技巧一行只留文字, 不再重复一个图标 */
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
/* --arrow-x 由 setPopArrow 按锚点实测写入(弹窗被容器边夹住时三角要跟着兴趣点走), 缺省仍是正中 */
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
/* 船内: 纯图标兴趣点(不画船壳与房间框), 视觉语言同海图POI, 配色直接吃主题变量 */
#exp-shell-root .exp-ship{display:block;max-width:100%;max-height:100%;width:auto;height:auto;}
#exp-shell-root .exp-spoi{cursor:pointer;color:var(--gold-soft);transition:color .15s;}
#exp-shell-root .exp-spoi:hover{color:var(--gold-hi);}
#exp-shell-root .exp-spoi-ico{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;transform:scale(1.7);transform-box:fill-box;transform-origin:center;transition:transform .18s ease;}
/* 发光不写死颜色: drop-shadow 缺省吃 currentColor, hover 金 / 当前舱室 accent 各随其色 */
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
/* 桌面 hover 提示"这条可以双击编辑": 与全站可点元素统一的 hover 语言(提亮边框+上浮); 圈定在 hover:hover
   媒体特性内, 触屏点按不会残留粘滞的 hover 态 */
@media (hover:hover){
#exp-shell-root .exp-story-turn.user:hover .exp-story-text{border-color:var(--border-hover);background:rgba(var(--accent-rgb,var(--gold-rgb)),.16);transform:translateY(-2px);cursor:pointer;}
}
/* line-break:strict 用正式中文排版的避头尾(浏览器默认是宽松版, 会让句号落到行首);
   text-wrap:pretty 避免段末孤字。两条都是渐进增强, 不支持的浏览器忽略。 */
#exp-shell-root .exp-story-turn.assistant .exp-story-text{white-space:pre-wrap;line-height:2.05;font-size:17.5px;color:var(--text);letter-spacing:.3px;line-break:strict;text-wrap:pretty;}
/* 段间距由这里定死, 不再取决于模型输出了一个还是三个换行(见 storyParas)。
   不用首行缩进(试过 2em, 观感偏书面, 与这套界面不搭), 所以段距要给足 —— 缩进与段距是两种互斥的
   段落区分手段, 只留段距时得比"缩进+小段距"那一档更大, 否则段落界限会糊。 */
#exp-shell-root .exp-story-text p{margin:0;}
#exp-shell-root .exp-story-text p+p{margin-top:.9em;}
/* 只改色不加粗: 长对话段落里大片 accent 色再叠 600 字重会很闹 */
#exp-shell-root .exp-story-text .exp-quote{color:var(--quote,var(--accent,var(--gold-hi)));}
/* 流式新段落淡入。只有 paintStoryText 新建的 <p> 会带这个类, 复用的旧段落不重放(见该函数) */
@keyframes exp-para-in{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
#exp-shell-root .exp-para-in{animation:exp-para-in .32s ease-out both;}
#exp-shell-root .exp-story-status{font-size:12px;color:var(--text-faint);text-align:center;padding:3px 0;min-height:1.2em;letter-spacing:2px;}
#exp-shell-root .exp-story-input{flex:none;padding:10px 26px 18px;}
#exp-shell-root .exp-story-inputrow{display:flex;align-items:center;justify-content:center;gap:12px;max-width:1108px;margin:0 auto;position:relative;}
/* 桌面端: 按钮钉在行两端, 文本框两侧对称留边(174=左侧三钮162+间距12), 中心与页面中心严格对齐;
   行宽 1108 = 正文列 760 + 两侧 174, 屏幕够宽时文本框与正文等宽, 不够时收缩 */
#exp-shell-root #exp-story-del,#exp-shell-root #exp-story-diff,#exp-shell-root #exp-story-regen,#exp-shell-root #exp-story-send{position:absolute;top:calc(50% - 23px);}
#exp-shell-root #exp-story-del{left:0;}
#exp-shell-root #exp-story-diff{left:58px;}
#exp-shell-root #exp-story-regen{left:116px;}
#exp-shell-root #exp-story-send{right:116px;} /* 文本框右缘始终在行右 174 处, 116=174-12间距-46钮宽, 恰好贴着文本框 */
#exp-shell-root .exp-story-input textarea{flex:0 1 auto;width:min(760px,calc(100% - 348px));resize:none;border:1px solid rgba(var(--gold-rgb),.22);border-radius:12px;padding:12px 15px;font-family:inherit;font-size:15px;line-height:1.6;min-height:50px;max-height:146px;overflow-y:auto;background:var(--panel);color:var(--text);transition:border-color .15s;}
#exp-shell-root .exp-story-input textarea:focus{outline:none;border-color:var(--border-hover);}
#exp-shell-root .exp-story-input textarea::placeholder{color:var(--text-faint);}
#exp-shell-root .exp-iconbtn{flex:none;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent;border:1px solid rgba(var(--gold-rgb),.3);color:var(--gold);transition:.15s;}
#exp-shell-root .exp-iconbtn:hover{border-color:var(--gold-hi);color:var(--gold-hi);background:rgba(var(--gold-rgb),.08);transform:translateY(-2px);}
#exp-shell-root .exp-iconbtn svg{width:20px;height:20px;}
#exp-shell-root .exp-iconbtn.send{background:linear-gradient(180deg,var(--accent),color-mix(in srgb,var(--accent) 78%,black));color:var(--on-accent);border:none;}
#exp-shell-root .exp-iconbtn.send:hover{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 88%,white),var(--accent));color:var(--on-accent);}
#exp-shell-root .exp-iconbtn:disabled{opacity:.4;cursor:default;}
/* 正文页: 行动选项 */
#exp-shell-root .exp-story-options{max-width:var(--read-col);margin:0 auto 24px;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
#exp-shell-root .exp-story-opt{display:flex;align-items:baseline;gap:10px;padding:11px 14px;border:1px solid rgba(var(--gold-rgb),.24);border-radius:10px;background:var(--panel);color:var(--text);cursor:pointer;font-family:inherit;text-align:left;font-size:14px;line-height:1.7;box-shadow:var(--panel-sh,none);transition:border-color .15s,background .15s,transform .15s;}
#exp-shell-root .exp-story-opt:hover{border-color:var(--border-hover);background:var(--panel-hover);transform:translateY(-2px);}
#exp-shell-root .exp-story-opt-num{flex:none;color:var(--gold-soft);font-size:12px;letter-spacing:1px;}
#exp-shell-root .exp-story-opt-text{flex:1;min-width:0;}
/* 比阅读列宽出 116px 容纳右侧按钮组, 跟着 --read-col 一起走以保持与正文列同心 */
#exp-shell-root .exp-story-delbar{display:flex;align-items:center;gap:12px;max-width:calc(var(--read-col) + 116px);margin:0 auto;min-height:52px;}
#exp-shell-root .exp-story-delbar>span{flex:1;font-size:13px;color:var(--text-faint);letter-spacing:1px;}
#exp-shell-root .exp-del-btn,#exp-shell-root .exp-edit-btn{flex:none;padding:9px 26px;border-radius:10px;border:1px solid rgba(var(--gold-rgb),.3);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;font-size:14px;letter-spacing:2px;transition:.15s;}
#exp-shell-root .exp-del-btn:hover,#exp-shell-root .exp-edit-btn:hover{border-color:var(--gold-hi);background:rgba(var(--gold-rgb),.08);transform:translateY(-2px);}
#exp-shell-root .exp-del-btn.danger{border-color:rgba(192,85,74,.5);color:var(--sem-bad);}
#exp-shell-root .exp-del-btn.danger:hover{background:rgba(192,85,74,.1);border-color:var(--sem-bad);}
#exp-shell-root .exp-del-btn:disabled{opacity:.4;cursor:default;background:transparent;border-color:rgba(192,85,74,.5);}
/* 正文页: 用户楼层就地编辑(双击进入) */
#exp-shell-root .exp-story-turn.user.editing{text-align:left;}
#exp-shell-root .exp-story-edit{width:100%;}
#exp-shell-root .exp-story-edit textarea{width:100%;resize:none;border:1px solid rgba(var(--accent-rgb,var(--gold-rgb)),.4);border-radius:11px;padding:10px 14px;font-family:inherit;font-size:15px;line-height:1.85;min-height:54px;max-height:40vh;overflow-y:auto;background:var(--panel);color:var(--text);transition:border-color .15s;}
#exp-shell-root .exp-story-edit textarea:focus{outline:none;border-color:var(--border-hover);}
#exp-shell-root .exp-story-edit-row{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;}
#exp-shell-root .exp-edit-btn.primary{border-color:rgba(var(--gold-rgb),.55);color:var(--gold-hi);}
/* 关掉浏览器对这块区域的双击缩放(双触是编辑入口), 但保留长按选字——玩家能照常复制自己的发言原文 */
#exp-shell-root .exp-story-turn.user{touch-action:manipulation;}
#exp-shell-root .exp-story-turn.selable{cursor:pointer;border-radius:10px;outline:1px dashed transparent;outline-offset:6px;transition:outline-color .15s,background .15s;}
#exp-shell-root .exp-story-turn.selable:hover{outline-color:rgba(var(--accent-rgb,var(--gold-rgb)),.4);}
#exp-shell-root .exp-story-turn.delsel,#exp-shell-root .exp-story-turn.delsel:hover{outline-color:rgba(192,85,74,.7);background:rgba(192,85,74,.07);}
/* 正文页: 思维链折叠bar(罗经分隔线+海图四芒星), 挂在正文上方。收起态是一条章节分隔线: 两条向两端
   淡出的细线夹着中央星徽与「思维链」字样, 点击展开下方全文。生成中(下面 .exp-story-thinking)是
   同一条分隔线的"运转态": 星徽缓转+光点从中心沿两线流向两端, 完成后停驻、字样浮现, 观感是同一件
   东西从"运转"落回"停泊"而不是两个组件的替换 */
#exp-shell-root .exp-story-thought{max-width:760px;margin:0 auto 14px;}
#exp-shell-root .exp-story-thought-head{display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none;transition:transform .15s;}
#exp-shell-root .exp-story-thought-head:hover{transform:translateY(-2px);}
#exp-shell-root .exp-story-thought-rule{flex:1;height:1px;}
#exp-shell-root .exp-story-thought-rule.l{background:linear-gradient(90deg,transparent,rgba(var(--gold-rgb),.4));}
#exp-shell-root .exp-story-thought-rule.r{background:linear-gradient(90deg,rgba(var(--gold-rgb),.4),transparent);}
#exp-shell-root .exp-story-thought-ico{display:inline-flex;width:18px;height:18px;flex:none;color:var(--gold);transition:transform .25s;}
#exp-shell-root .exp-story-thought-ico svg{width:100%;height:100%;}
#exp-shell-root .exp-story-thought.open .exp-story-thought-ico{transform:rotate(45deg);}
/* 展开内容: 无容器纯文字, 顶部星徽分隔线作上边界, 尾部一条更淡的细线收口("细线合拢"), 零面积感 */
#exp-shell-root .exp-story-thought-body{display:none;margin:12px 0 4px;white-space:pre-wrap;font-size:13px;line-height:1.85;letter-spacing:.3px;color:var(--text-faint);}
#exp-shell-root .exp-story-thought.open .exp-story-thought-body{display:block;}
/* 生成中的"思考中"分隔线: 同一结构不带文字, 星徽缓转, 光点从中心沿两条线向两端流出(声呐脉冲) */
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
/* 变量页 */
#exp-shell-root .exp-var{font-size:13px;line-height:1.6;}
#exp-shell-root .exp-var h4{margin:0 0 10px;color:var(--gold-soft);letter-spacing:3px;border-bottom:1px solid rgba(var(--gold-rgb),.28);padding-bottom:6px;}
#exp-shell-root .exp-var pre{background:var(--panel);border:1px solid rgba(var(--gold-rgb),.18);border-radius:8px;padding:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--text);}
/* 当前变量里相对上一楼变化过的行(jsonWithHighlight 按key整行套这个class, 含嵌套内容一起高亮) */
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
/* minmax(0,1fr) 而不是 1fr: 1fr 的下限是 auto(=格子内容的最小宽度), 窄屏上卡片会顶着内容宽度
   把整页撑出横向滚动; 配合下面 .exp-open-card 的 min-width:0 让卡片真正跟着视口缩 */
#exp-shell-root .exp-open-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:24px;}
/* 开场白页限宽居中: 宽屏下卡片过宽会让卡内左对齐内容显得整页偏左 */
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
/* 自定义开局: 无立绘的居中大卡(容器脱离两列网格)与表单 */
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
#exp-shell-root .exp-custom input,#exp-shell-root .exp-custom textarea{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid rgba(var(--gold-rgb),.22);border-radius:9px;background:var(--panel);color:var(--text);font-family:inherit;font-size:14.5px;line-height:1.6;}
#exp-shell-root .exp-custom textarea{min-height:74px;resize:vertical;}
#exp-shell-root .exp-custom input:focus,#exp-shell-root .exp-custom textarea:focus{outline:none;border-color:var(--gold);}
#exp-shell-root .exp-custom-foot{display:flex;align-items:center;gap:14px;justify-content:center;}
#exp-shell-root #exp-custom-hint{font-size:13px;color:var(--sem-warn,#d08a45);min-height:1em;text-align:center;margin-top:-14px;}
#exp-shell-root #exp-custom-go{padding:14px 64px;border:none;border-radius:11px;background:var(--accent,var(--gold));color:var(--on-accent,var(--on-gold));font-family:inherit;font-size:16px;letter-spacing:5px;text-indent:5px;cursor:pointer;box-shadow:0 3px 12px rgba(var(--accent-rgb,var(--gold-rgb)),.28);transition:transform .15s;}
#exp-shell-root #exp-custom-go:hover{transform:translateY(-2px);}
#exp-shell-root #exp-custom-go:disabled{opacity:.5;cursor:default;transform:none;}
#exp-shell-root .exp-open-empty,#exp-shell-root .exp-tab-error{padding:40px 0;text-align:center;color:var(--text-faint);letter-spacing:2px;}
/* 进入入口(浮在原生上): 顶部居中胶囊 */
#exp-entry.hidden{display:none;}
#exp-entry.pill{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:9001;}
#exp-entry .exp-entry-pill{display:flex;align-items:center;gap:8px;background:linear-gradient(180deg,rgba(var(--pop-rgb),.96),rgba(var(--pop-rgb),.98));color:var(--accent,var(--gold-hi));border:1px solid rgba(var(--gold-rgb),.5);border-radius:22px;padding:9px 18px;font-family:'Noto Serif SC','Songti SC','Georgia',serif;font-size:14px;letter-spacing:3px;cursor:pointer;box-shadow:0 6px 20px rgba(var(--sh-rgb),.5);transition:.15s;}
#exp-entry .exp-entry-pill:hover{border-color:var(--accent,var(--gold));box-shadow:0 6px 22px rgba(var(--accent-rgb,var(--gold-rgb)),.28);transform:translateY(-2px);}
#exp-entry .exp-entry-pill .ico{display:inline-flex;width:18px;height:18px;}
#exp-entry .exp-entry-pill .chev{display:inline-flex;width:15px;height:15px;color:var(--gold);}
/* ===== 手机适配 ===== */
/* 断点固定用 920px: CSS自定义属性进不了媒体查询条件, 全文共6处硬编码此值(画廊网格单列、下方ABC三块、
   船员页/狩猎页两处窄屏收缩), 改动口径要跟着全部同步, 可用 "920px" 搜索定位其余几处 */
/* A. 窄屏共享收缩(竖横两朝向都生效) */
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
#exp-shell-root .exp-story-options{grid-template-columns:1fr;gap:8px;margin-bottom:18px;}
#exp-shell-root .exp-story-opt{font-size:13.5px;padding:10px 12px;}
#exp-shell-root .exp-story-input{padding:8px 10px 10px;}
#exp-shell-root .exp-story-inputrow{gap:8px;justify-content:flex-start;}
/* 手机: 恢复流式排布, 宽度优先 */
#exp-shell-root #exp-story-del,#exp-shell-root #exp-story-diff,#exp-shell-root #exp-story-regen,#exp-shell-root #exp-story-send{position:static;top:auto;}
#exp-shell-root .exp-story-input textarea{flex:1;width:auto;}
#exp-shell-root .exp-del-btn,#exp-shell-root .exp-edit-btn{padding:8px 16px;font-size:13px;letter-spacing:1px;}
#exp-shell-root .exp-story-delbar{gap:8px;min-height:46px;}
#exp-shell-root .exp-iconbtn{width:40px;height:40px;}
#exp-shell-root .exp-iconbtn svg{width:18px;height:18px;}
/* 16px 起步: iOS 聚焦小于 16px 的输入框会自动放大页面 */
#exp-shell-root .exp-story-input textarea{font-size:16px;line-height:1.5;padding:10px 13px;min-height:46px;max-height:142px;}
#exp-shell-root .exp-panel{padding:16px 12px;}
#exp-shell-root .meter{padding:13px 14px;}
/* 画廊: 触屏上不出缩略图右上角那个对勾, 固定立绘统一走灯箱底部那个按钮(小图上点对勾太容易误触) */
#exp-shell-root .exp-gal-pin,#exp-shell-root .exp-gal-thumb.pinned .exp-gal-pin{display:none;}
#exp-shell-root .exp-panel[data-panel="map"]{padding:12px 10px 14px;}
/* 地图页: 手机上两张图都铺满整块主区。桌面那套"svg 按自身比例撑开、金框贴着图边"在手机上会缩成
   一条只占三分之一屏高的窄带(横屏则相反, 会被 overflow 裁掉两层甲板) —— 因为 svg 的 max-height:100%
   量的是高度 auto 的 .exp-map, 百分比无从解析。这里直接让容器与 svg 都占满, 由 viewBox 侧收口。
   --map-fill 同时是给 JS 的信号: 海图据此把取景框比例改成跟随容器(见 syncViewAspect), 底图数据不动。*/
#exp-shell-root .exp-panel[data-panel="map"]{--map-fill:1;}
#exp-shell-root .exp-map{width:100%;height:100%;}
#exp-shell-root .exp-chart,#exp-shell-root .exp-ship{width:100%;height:100%;}
#exp-shell-root .exp-panel[data-panel="char"]{padding:10px 12px 22px;}
#exp-shell-root .exp-open-cards{grid-template-columns:minmax(0,1fr);gap:12px;}
#exp-shell-root .exp-open-card{padding:12px;gap:12px;}
#exp-shell-root .exp-open-img{width:104px;}
/* 时间/地点行在窄屏里换行显示全, 不再走桌面那套单行省略号(手机上看不见完整地点) */
#exp-shell-root .exp-open-mrow{align-items:flex-start;}
#exp-shell-root .exp-open-mrow svg{margin-top:3px;}
#exp-shell-root .exp-open-mrow span{white-space:normal;overflow:visible;text-overflow:clip;}
#exp-shell-root .exp-open-title{font-size:22px;letter-spacing:5px;}
#exp-shell-root .exp-mapctl{gap:8px;}
#exp-shell-root .exp-mapctl button{width:42px;height:42px;}
/* 船内图整卷等比缩小, SVG 内字号要反向放大补偿, 否则房名在手机上不可读 */
#exp-shell-root .exp-spoi-lab{font-size:26px;stroke-width:5;}
#exp-shell-root .exp-ship-dir{font-size:22px;}
#exp-shell-root .exp-crew-meters{grid-template-columns:1fr;gap:10px;}
#exp-shell-root .exp-prey-grid{grid-template-columns:repeat(2,1fr);}
/* 同行: 窄屏改三列等宽网格。不用 flex-wrap: 换行后「猎犬队」会孤零零占一整行,
   而分隔人与犬的那条竖线被留在上一行末尾, 成了一条没着落的竖杠 */
#exp-shell-root .exp-mate-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
#exp-shell-root .exp-mate-btn{padding:9px 4px;letter-spacing:2px;}
#exp-shell-root .exp-brief-foot{flex-direction:column;align-items:stretch;}
}
/* B. 竖屏: 侧栏变底部导航 */
@media (max-width:920px) and (orientation:portrait){
#exp-shell-root{flex-direction:column;}
#exp-shell-root .exp-main{order:1;min-height:0;}
#exp-shell-root .exp-side{order:2;width:100%;flex:none;flex-direction:row;border-right:none;border-top:1px solid rgba(var(--side-gold-rgb,var(--gold-rgb)),.26);}
#exp-shell-root .exp-side-head{display:none;}
#exp-shell-root .exp-nav{display:flex;flex:1;padding:0;overflow:visible;}
#exp-shell-root .exp-nav-item{flex:1;flex-direction:column;justify-content:center;gap:2px;padding:7px 0 calc(7px + env(safe-area-inset-bottom,0px));font-size:10px;letter-spacing:.5px;border-left:none;border-top:2px solid transparent;}
#exp-shell-root .exp-nav-item.active{border-left-color:transparent;border-top-color:var(--side-gold,var(--accent,var(--gold)));background:linear-gradient(180deg,rgba(var(--side-gold-rgb,var(--accent-rgb,var(--gold-rgb))),.13),transparent 85%);}
#exp-shell-root .exp-nav-ico{width:21px;height:21px;}
/* 角色页: 竖屏退回上下堆叠 */
#exp-shell-root .exp-panel[data-panel="char"]{overflow-y:auto;}
#exp-shell-root .exp-char-body{flex-direction:column;}
#exp-shell-root .exp-char-stage{height:auto;width:min(400px,100%);margin:0 auto;}
#exp-shell-root .hero-card{height:auto;width:100%;}
#exp-shell-root .exp-char-side{width:100%;}
#exp-shell-root .exp-char-cell.voice{min-height:0;}  /* 竖屏是上下堆叠+整页滚动, 不需要靠下限高度配平 */
#exp-shell-root .exp-char-cell.memo{height:260px;flex:none;}
#exp-shell-root .cell-memos{grid-template-columns:1fr;}
#exp-shell-root .stat-node{letter-spacing:1px;}
/* 角色/画廊的角色 tabs: 竖屏窄, 五六个名字单行放不下。整体换行成两行并居中(名字本身仍横排),
   全员一眼可见, 不用左右滑; 两行都从左边起排, 加第六位女主直接续在第二行后面。
   地图页那对二级切换不受影响(不会溢出) */
#exp-shell-root .exp-panel[data-panel="char"] .exp-char-tabs,
#exp-shell-root .exp-panel[data-panel="gallery"] .exp-char-tabs{flex-wrap:wrap;overflow:visible;row-gap:2px;padding-bottom:0;}
#exp-shell-root .exp-char-tab{padding:6px 12px 9px;letter-spacing:2px;}
/* 船内图: 竖屏换用竖版画布(SHIP_PW×SHIP_PH + 各舱 px/py), 同层拆两列、层序自上而下不变。
   --map-portrait 是给 JS 挑画布的信号, 与上面的 --map-fill 分开: 横屏要铺满但仍用横版画布 */
#exp-shell-root .exp-panel[data-panel="map"]{--map-portrait:1;}
/* 兴趣点/舱室弹窗: 桌面那套 236px 宽、12~13px 字在竖屏里几乎每句都断行, 关闭按钮也只有 20px 见方,
   拇指点不准。窄屏放开到近乎整屏宽, 字号与按钮命中区一并放大(定位逻辑不变, 由 JS 实测宽度收口) */
#exp-shell-root .exp-poipop{max-width:min(340px,calc(100vw - 44px));padding:13px 42px 14px 15px;}
#exp-shell-root .exp-poipop.room{max-width:min(340px,calc(100vw - 44px));}
#exp-shell-root .exp-md-h b{font-size:16px;}
#exp-shell-root .exp-md-h span{font-size:12.5px;}
#exp-shell-root .exp-md-desc{font-size:14px;line-height:1.6;}
#exp-shell-root .exp-poipop-x{top:4px;right:4px;width:30px;height:30px;padding:7px;}
#exp-shell-root .exp-poipop-go{margin-top:13px;padding:10px;font-size:14px;}
/* 竖版画布只有 594 宽(横版 1000), 同样的屏幕尺寸下坐标系更小, 上面那档反向放大的字号要收回来 */
#exp-shell-root .exp-spoi-lab{font-size:19px;stroke-width:3.6;}
#exp-shell-root .exp-ship-dir{font-size:17px;letter-spacing:3px;}
}
/* C. 横屏: 侧栏收成 64px 图标轨 */
@media (max-width:920px) and (orientation:landscape){
#exp-shell-root .exp-side{width:64px;}
#exp-shell-root .exp-side-head{padding:0;justify-content:center;height:52px;}
#exp-shell-root .exp-side-title{display:none;}
#exp-shell-root .exp-nav-item{justify-content:center;padding:13px 0;gap:0;}
#exp-shell-root .exp-nav-lab{display:none;}
/* 角色页: 横屏保持左立绘右属性的桌面布局(宽度够), 但视口高度只有三四百, 三张卡叠起来放不下,
   所以右栏自己滚, 三张卡都按内容高度实排、不再互相挤压(心声的配平下限在这里也没有意义) */
#exp-shell-root .exp-char-side{overflow-y:auto;}
#exp-shell-root .exp-char-cell.aff,#exp-shell-root .exp-char-cell.voice{flex:none;}
#exp-shell-root .exp-char-cell.voice{min-height:0;}
#exp-shell-root .exp-char-cell.memo{flex:none;min-height:200px;}
}
/* ===== 动效系统 ===== */
/* 令牌: 时长/缓动集中一处, 降级与移动端只覆写令牌 */
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
/* 切页与入场: JS 显式加类, animationend 移除; renderAll 重建的 DOM 不带类, 不重放 */
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
/* 外壳进场: 暗场徽标先亮相, 侧栏/顶栏/面板依次入场; exp-entering 由 playShellEnter 加/清 */
#exp-shell-root .exp-boot{position:absolute;inset:0;z-index:9004;display:grid;place-items:center;background:var(--bg);animation:exp-veil-out calc(var(--dur-boot)*.43) var(--ease-in) calc(var(--dur-boot)*.37) both;}
#exp-shell-root .exp-boot-mark{display:flex;flex-direction:column;align-items:center;gap:12px;color:var(--accent,var(--gold));filter:drop-shadow(0 0 18px rgba(var(--accent-rgb,var(--gold-rgb)),.45));animation:exp-boot-emblem calc(var(--dur-boot)*.43) var(--ease-cine) both;}
/* 浅色主题: 深色强调字的光晕在浅底上会显成灰斑, 收小减淡成微光 */
#exp-shell-root[data-theme="parchment"] .exp-boot-mark,#exp-shell-root[data-theme="ivory"] .exp-boot-mark,#exp-shell-root[data-theme="marble"] .exp-boot-mark{filter:drop-shadow(0 0 14px rgba(var(--accent-rgb),.25));}
#exp-shell-root .exp-boot-title{font-size:34px;font-weight:700;letter-spacing:12px;text-indent:12px;}
#exp-shell-root .exp-boot-sub{font-size:12px;letter-spacing:6px;text-indent:6px;text-transform:uppercase;color:var(--gold);}
#exp-shell-root.exp-entering .exp-side{animation:exp-side-in calc(var(--dur-boot)*.43) var(--ease-cine) calc(var(--dur-boot)*.33) both;}
#exp-shell-root.exp-entering .exp-topbar{animation:exp-drop calc(var(--dur-boot)*.35) var(--ease-out) calc(var(--dur-boot)*.4) both;}
#exp-shell-root.exp-leaving{animation:exp-shell-out var(--dur-exit) var(--ease-in) both;}
/* 数值反馈: 变量事件 diff 后只给变化条目加类 */
#exp-shell-root .exp-pulse{animation:exp-stat-pulse var(--dur-pulse) var(--ease-out);}
#exp-shell-root .exp-pulse .cell-num,#exp-shell-root .exp-pulse .meter-num{animation:exp-num-glow var(--dur-pulse) var(--ease-out);}
/* 灯箱开合与切图 */
#exp-shell-root .exp-lightbox.exp-lb-in .exp-lb-backdrop{animation:exp-fade var(--dur-fast) var(--ease-out) both;}
#exp-shell-root .exp-lightbox.exp-lb-in .exp-lb-stage{animation:exp-pop var(--dur-med) var(--ease-spring) both;}
#exp-shell-root .exp-lightbox.exp-lb-out{animation:exp-shell-out var(--dur-fast) var(--ease-in) both;}
#exp-shell-root .exp-lb-img{animation:exp-fade-soft var(--dur-fast) var(--ease-out);}
/* 入口胶囊: 每次重建即播一次 */
#exp-entry .exp-entry-pill{animation:exp-drop var(--dur-page) var(--ease-spring);}
/* 按压反馈 */
#exp-shell-root .exp-iconbtn:active,#exp-shell-root .exp-story-opt:active,#exp-shell-root .exp-mate-btn:active,#exp-shell-root .exp-prey-card:active,#exp-shell-root .exp-theme-opt:active,#exp-shell-root .exp-hunt-go:active,#exp-shell-root .exp-del-btn:active,#exp-shell-root .exp-edit-btn:active,#exp-shell-root .exp-tb-close:active,#exp-shell-root .exp-mapctl button:active,#exp-entry .exp-entry-pill:active{transform:scale(.97);}
/* 全局按压反馈: JS 委托在 pointerdown 加 .exp-pressed(手机端没有 hover 也没有可靠的 :active, 这是触屏的主反馈通道);
   桌面与上一条 :active 叠加(后者在后, 同优先级下胜出), 观感一致不冲突。双写类名抬高优先级, 盖过各按钮 :hover 的 translateY */
#exp-shell-root .exp-pressed.exp-pressed,#exp-entry .exp-pressed.exp-pressed{transform:scale(.96);transition:transform .08s;}
/* ===== 体验优化 ===== */
#exp-shell-root .exp-story{position:relative;}
/* 回到最新: 上翻离开底部时出现, bottom 由 JS 按输入区实际高度定位 */
#exp-shell-root .exp-story-jump{position:absolute;right:20px;bottom:120px;z-index:6;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;background:rgba(var(--pop-rgb),.92);border:1px solid rgba(var(--gold-rgb),.45);color:var(--accent,var(--gold-hi));box-shadow:0 4px 14px rgba(var(--sh-rgb),.35);opacity:0;pointer-events:none;transition:opacity var(--dur-fast) var(--ease-out),background .15s,border-color .15s,transform .15s;}
#exp-shell-root .exp-story-jump:hover{background:rgba(var(--pop-rgb),1);border-color:rgba(var(--gold-rgb),.7);transform:translateY(-2px);}
#exp-shell-root .exp-story-jump.show{opacity:1;pointer-events:auto;}
#exp-shell-root .exp-story-jump svg{width:17px;height:17px;transform:rotate(90deg);}
/* 回合变量变化摘要: Δ 按钮正上方的无框毛玻璃浮层; 水平位置由 JS 按按钮中心算(入场动画占用 transform, 不能用 translateX 居中) */
#exp-shell-root .exp-diff-panel{position:absolute;bottom:120px;z-index:7;min-width:190px;max-width:330px;max-height:60%;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:12px 18px 14px;border-radius:12px;background:rgba(var(--pop-rgb),.45);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(var(--sh-rgb),.18);font-size:12.5px;letter-spacing:1px;animation:exp-rise-sm var(--dur-med) var(--ease-out) both;}
#exp-shell-root .exp-diff-head{font-size:11px;letter-spacing:3px;color:var(--gold);margin-bottom:3px;}
#exp-shell-root .exp-diff-panel span{flex:none;display:flex;justify-content:space-between;gap:18px;}
#exp-shell-root .exp-diff-panel b{font-weight:600;color:var(--text-strong);}
#exp-shell-root .exp-diff-panel .up{color:var(--sem-good);}
#exp-shell-root .exp-diff-panel .down{color:var(--sem-bad);}
#exp-shell-root .exp-diff-panel .dim{color:var(--text-faint);}
/* 正文字号档位: 属性选择器特异性高于移动端覆写, 各端统一生效。
   --read-col 跟着字号一起放大(始终约 40 字/行): 行宽写死的话, 字号调大等于每行字数变少,
   标准档最挤、特大档最松, 方向正好反了。 */
#exp-shell-root[data-fontsize="lg"]{--read-col:760px;}
#exp-shell-root[data-fontsize="lg"] .exp-story-turn.assistant .exp-story-text{font-size:19px;}
#exp-shell-root[data-fontsize="lg"] .exp-story-turn.user .exp-story-text{font-size:17px;}
#exp-shell-root[data-fontsize="xl"]{--read-col:820px;}
#exp-shell-root[data-fontsize="xl"] .exp-story-turn.assistant .exp-story-text{font-size:20.5px;}
#exp-shell-root[data-fontsize="xl"] .exp-story-turn.user .exp-story-text{font-size:18px;}
/* 删楼二次确认武装态 */
#exp-shell-root .exp-del-btn.danger.armed{background:#a03328;border-color:#a03328;color:#fdf6f2;}
/* 移动端: 缩短时长与步长 */
@media (max-width:920px){
#exp-shell-root,#exp-entry{--dur-page:360ms;--stag:30ms;--dur-boot:820ms;--boot-lead:420ms;}
}
@media (max-width:920px) and (orientation:portrait){
#exp-shell-root.exp-entering .exp-side{animation-name:exp-side-in-up;}
}
/* 降级: 系统偏好或设置页「减弱动效」, 只覆写令牌 + 关掉常驻动画 */
@media (prefers-reduced-motion:reduce){
#exp-shell-root,#exp-entry{--dur-tap:0ms;--dur-fast:0ms;--dur-med:0ms;--dur-page:0ms;--dur-boot:0ms;--dur-exit:0ms;--dur-pulse:0ms;--stag:0ms;--boot-lead:0ms;}
#exp-shell-root .exp-spoi:hover .exp-spoi-ico,#exp-shell-root .exp-spoi.cur .exp-spoi-ico{animation:none;}
}
#exp-shell-root[data-motion="off"],#exp-entry[data-motion="off"]{--dur-tap:0ms;--dur-fast:0ms;--dur-med:0ms;--dur-page:0ms;--dur-boot:0ms;--dur-exit:0ms;--dur-pulse:0ms;--stag:0ms;--boot-lead:0ms;}
#exp-shell-root[data-motion="off"] .exp-spoi:hover .exp-spoi-ico,#exp-shell-root[data-motion="off"] .exp-spoi.cur .exp-spoi-ico{animation:none;}
`;

  // ════ 图标与静态素材(ICO) ════
  // 导航/界面 SVG 图标(线性, 免费自绘, 描边用 currentColor)
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
    delta: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M12 4.5 20 19.5H4z'/></svg>",
    chev: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M9 6l6 6-6 6'/></svg>",
    thought: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linejoin='round'><path d='M12 2.5l2 7.5 7.5 2-7.5 2-2 7.5-2-7.5L2.5 12l7.5-2z'/><path d='M6.5 6.5l2.6 2.6M17.5 6.5l-2.6 2.6M17.5 17.5l-2.6-2.6M6.5 17.5l2.6-2.6' stroke-width='1.1' opacity='.6'/></svg>",
    gear: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='3.1'/><path d='M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z'/></svg>",
    check: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12.5l4.5 4.5L19 7.5'/></svg>",
    gallery: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><rect x='3.5' y='3.5' width='7' height='7' rx='1.4'/><rect x='13.5' y='3.5' width='7' height='7' rx='1.4'/><rect x='3.5' y='13.5' width='7' height='7' rx='1.4'/><rect x='13.5' y='13.5' width='7' height='7' rx='1.4'/></svg>",
    hunt: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='7.5'/><path d='M12 2v4M12 18v4M2 12h4M18 12h4'/><circle cx='12' cy='12' r='2.3'/></svg>",
    lock: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><rect x='4.5' y='10.5' width='15' height='10' rx='2.2'/><path d='M8 10.5V7a4 4 0 0 1 8 0v3.5'/></svg>",
    paw: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='4' r='2'/><circle cx='18' cy='8' r='2'/><circle cx='20' cy='16' r='2'/><path d='M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z'/></svg>",
    frost: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.4' stroke-linecap='round'><path d='M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17'/><path d='M12 5.5 9.9 3.9M12 5.5l2.1-1.6M12 18.5l-2.1 1.6M12 18.5l2.1 1.6'/></svg>",
    up: "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M12 5l7 12H5z'/></svg>",
    down: "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M12 19L5 7h14z'/></svg>",
    db: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><ellipse cx='12' cy='5.5' rx='7.5' ry='3'/><path d='M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13'/><path d='M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3'/></svg>",
  };

  // ════ 面板注册表(PANELS) ════
  // 面板注册表: 单一数据源, 侧栏导航/DOM骨架/切页/变量重绘/入场动效/渲染错误兜底文案全部从这里生成,
  // 不要在别处再手写一份面板清单。新增一个面板只需要在这里加一条 + 写好 render 函数 + 补 CSS 样式块,
  // 至多再看要不要往 ESC_CLOSERS(管跨面板浮层的开关, 和本表是正交维度, 不并入)/onDocKey(数字键快捷,
  // 目前只有 story 一家在用, 按需扩展再泛化, 不预先设计)里加一条, 不用再去 ensureShell/switchTab/
  // renderAll 里挨个改。
  // render:null 表示这个面板不受 stat_data 驱动、不走 renderSafe 错误兜底, 是故意的, 不是漏写:
  // story 归 renderStoryLog/onStream 驱动, settings 是纯静态页, 两者都没有"变量更新后要不要重绘"这回事。
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
  const DEFAULT_TAB = 'story'; // 首次进壳/无 localStorage 记忆时的默认落座页

  // ════ 数据表(技能图标/立绘库/地图与航海数据/角色名单/兜底常量/仪表工具) ════
  // ICONS: 四项数值(物资/健康/士气/狩猎技巧)的仪表图标; 同一行还定义了 EMBLEM(罗盘徽记,
  // 侧栏/开场白页/入口胶囊共用)与 SEAL/CORNERS(装饰素材, 当前无调用方, 保留备用)
  const ICONS={"狩猎技巧": "<svg viewBox='9 -12 535 535' fill='currentColor'><path d='M331.734 20.443a4.421 4.421 0 0 0-1.802.327c-27.736 11.543-47.295 57.495-29.899 76.671 33.52 38.946 72.835 55.573 90.147 128.434 2.607 20.15 1.218 40.094 0 60.25-17.312 72.861-56.627 89.488-90.147 128.434-17.396 19.176 2.163 65.128 29.899 76.671 9.038 3.762 28.025-26.165 21.752-25.209-16.34 2.491-37.8-20.941-28.387-28.93 38.47-32.65 105.49-100.055 100.277-135.552-2.211-15.057-9.35-30.36-15.574-45.539 6.225-15.18 13.363-30.482 15.574-45.54 5.214-35.496-61.806-102.901-100.277-135.552-9.412-7.988 12.047-31.42 28.387-28.93 5.881.897-10.44-25.35-19.95-25.535zM152 24.23l-21.441 53.602L152 99.273l21.441-21.441zm-9 91.497v296.546l9-9 9 9V115.727l-2.637 2.636-6.363 6.364zm160 9.847v260.824l18-17.53V143.104zM152 428.727l-23 23v38.546l23-23 23 23v-38.546z'/></svg>", "物资": "<svg viewBox='9 11 493 493' fill='currentColor'><path d='M256 41c-43.696 0-83.28 3.58-111.37 9.197-14.047 2.81-25.26 6.196-32.21 9.483-3.476 1.643-5.842 3.293-6.88 4.306l-.013.014.014.014c1.038 1.013 3.404 2.663 6.88 4.306 6.95 3.287 18.163 6.674 32.21 9.483C172.72 83.42 212.303 87 256 87s83.28-3.58 111.37-9.197c14.047-2.81 25.26-6.196 32.21-9.483 3.476-1.643 5.842-3.293 6.88-4.306l.013-.014-.014-.014c-1.038-1.013-3.404-2.663-6.88-4.306-6.95-3.287-18.163-6.674-32.21-9.483C339.28 44.58 299.697 41 256 41zm-80 15a32 8 0 0 1 32 8 32 8 0 0 1-32 8 32 8 0 0 1-32-8 32 8 0 0 1 32-8zm-75.168 26.594c-2.832 12.035-7.414 32.162-12.05 55.28 16.735 4.338 33.52 7.99 50.327 10.995 2.988-17.203 6.707-34.438 11.27-51.708-3.186-.547-6.3-1.113-9.282-1.71-14.91-2.98-27.13-6.49-36.37-10.86-1.363-.644-2.656-1.307-3.896-1.998zm310.336 0c-1.24.69-2.533 1.354-3.895 1.998-9.24 4.37-21.462 7.88-36.37 10.86-2.93.587-5.99 1.142-9.116 1.68 5.27 16.954 9.544 34.033 12.953 51.22 16.26-2.983 32.412-6.568 48.424-10.754-4.617-23-9.175-43.017-11.996-55.004zm-67.4 17.238c-23.065 2.982-49.9 4.803-78.768 5.117v54.198c30.885-.445 61.603-3.05 91.975-7.773-3.45-17.334-7.805-34.523-13.207-51.543zm-175.475.008c-4.647 17.345-8.416 34.67-11.426 51.98 30.062 4.54 60.16 6.967 90.133 7.354V104.95c-28.842-.314-55.656-2.133-78.707-5.11zm-84.38 55.277l-5.518 30.088c128.542 30.936 239.89 29.948 353.384.137l-4.98-30.172c-110.776 28.798-228.035 29.785-342.886-.053zm350.634 48.176c-16.95 4.406-33.876 8.174-50.83 11.312 3.656 47.603 1.776 95.87-3.55 144.49 18.6-3.803 36.796-8.527 54.468-14.17C439.592 314.762 439 291.606 439 256c0-14.915-1.77-33.334-4.453-52.707zm-357.13.256C74.758 222.827 73 241.15 73 256c0 23.794 4.678 57.228 10.424 89.404 16.604 4.828 33.386 8.97 50.27 12.418-4.532-47.516-6.03-95.247-2.577-143.222-17.624-3.063-35.507-6.74-53.7-11.05zm71.546 13.944c-3.336 47.978-1.63 95.883 3.164 143.813 31.553 5.49 63.348 8.592 94.873 9.33V225.94c-31.995-.576-64.57-3.38-98.037-8.446zm216.902.19c-33.303 5.275-66.792 8.068-100.865 8.34V370.8c32.816-.174 65.224-2.93 96.64-8.25 5.61-49.032 7.722-97.417 4.225-144.866zM86.66 364.93l8.29 31.9c104.15 32.39 225.75 32.428 326.077.733l8.272-32.264c-106.024 31.367-228.01 31.34-342.64-.37zm11.236 51.666c3.816 16.945 6.585 28.183 6.704 28.662.792 2.185 4.694 6.427 12.96 10.37 7.587 3.616 18.215 6.947 30.77 9.704-2.132-12.566-4.142-25.147-6.016-37.74-15.03-3.066-29.865-6.733-44.418-10.996zm318.366 1.31c-14.934 4.36-30.254 8.052-45.852 11.086-2.007 12.08-4.16 24.172-6.43 36.272 12.422-2.745 22.935-6.05 30.46-9.637 8.376-3.994 12.302-8.315 13.02-10.473 3.26-9.78 6.178-18.815 8.802-27.248zm-255.217 13.18c1.917 12.574 3.97 25.154 6.144 37.74 23.637 3.684 51.525 5.748 79.81 6.11V439.24c-28.815-.644-57.66-3.36-85.955-8.154zm190.55 1.223c-28.306 4.484-57.373 6.847-86.595 7.07v35.556c28.358-.363 56.317-2.437 79.994-6.14 2.33-12.19 4.538-24.353 6.602-36.487z'/></svg>", "健康": "<svg viewBox='-17 -17 545 545' fill='currentColor'><path d='M196 16a30 30 0 0 0-30 30v120H46a30 30 0 0 0-30 30v120a30 30 0 0 0 30 30h120v120a30 30 0 0 0 30 30h120a30 30 0 0 0 30-30V346h120a30 30 0 0 0 30-30V196a30 30 0 0 0-30-30H346V46a30 30 0 0 0-30-30H196z'/></svg>", "士气": "<svg viewBox='-10 -13 543 543' fill='currentColor'><path d='M356.688 19.188c-6.83-.032-12.837.64-18.125 1.843-24.178 5.495-36.437 21.983-50.938 41.157-14.5 19.175-31.317 40.993-62.78 47.47C195.08 115.78 154.27 108.253 91.25 78.5c-10.013 44.88-33.406 128.62-60.906 178.656 60.093 28.5 97.245 34.926 121 30.875.01 0 .02.004.03 0 21.59-5.827 34.487-20.094 47.876-43.092 17.014-29.227 32.563-72.198 60.25-123.188l16.406 8.938c-16.69 30.735-28.802 58.617-40 82.937 8.552-6.512 18.633-11.77 31.063-14.594 27.71-6.296 65.053-.495 121.655 24.75-6.932-29.276-1.885-61.913 9.875-92.218 12.686-32.69 33.038-62.907 56.28-84.03-42.595-19.553-73.152-27.554-95.124-28.282-1.01-.033-1.993-.058-2.97-.063zm127.54 14.144c-.858-.025-1.752.062-2.664.266-4.378.977-8.94 4.424-12.084 11.097L289.53 497.31h23.61L490.972 49.368c3.475-10.153-.75-15.86-6.746-16.035z'/></svg>"},EMBLEM="<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'><circle cx='12' cy='12' r='6.2'/><circle cx='12' cy='12' r='2.1'/><path d='M12 2.2v7.7M12 14.1v7.7M2.2 12h7.7M14.1 12h7.7M5.07 5.07l5.45 5.45M13.48 13.48l5.45 5.45M18.93 5.07l-5.45 5.45M10.52 13.48l-5.45 5.45'/></svg>",SEAL="<svg viewBox='0 0 512 512' fill='currentColor'><path d='M256 15.99c-8.8 0-16 14.33-16 32 0 8.47 1.7 16.59 4.7 22.57-4.7.21-9 1.16-13.7 2.43v15.85c17.1-2.42 34.1-2.31 50 0V72.99c-4.5-1.35-9.4-2.11-13.7-2.43 3-5.98 4.7-14.1 4.7-22.57 0-17.67-7.2-32-16-32zM86.23 86.28c-6.25 6.25-1.19 21.42 11.3 33.92 6.07 6 12.97 10.6 19.37 12.7-3.2 3.5-5.6 7.2-8 11.4l11.3 11.2c9.9-13.4 21.9-25.4 35.3-35.3l-11.2-11.3c-4.2 2.2-8 5.2-11.4 8-2.1-6.4-6.7-13.3-12.7-19.3-8-6.21-24.55-20.4-33.97-11.32zm305.57 11.3c-6 6.02-10.6 12.92-12.7 19.32-3.5-3.2-7.2-5.6-11.4-8l-11.2 11.3c13.4 9.9 25.4 21.9 35.3 35.3l11.3-11.2c-2.2-4.2-5.2-8-8-11.4 6.3-2.2 13.2-6.7 19.2-12.7 12.5-12.5 17.6-27.69 11.3-33.93-9.9-7.87-28 5.62-33.8 11.31zm-142.3 7.52c-36.8 1.6-70.2 16.3-95.6 39.6-3.3 3.1-6.6 6.3-9.2 9.2-23.3 25.4-38 58.8-39.6 95.7 0 4.5-.2 9.1.1 13 1.5 36.8 16.2 70.2 39.5 95.6 3.1 3.2 6.4 6.5 9.2 9.2 25.4 23.2 58.8 37.9 95.6 39.5h.2c4.1.2 8.7 0 12.8 0 36.8-1.6 70.2-16.3 95.6-39.6 3.3-3.1 6.6-6.3 9.2-9.2 23.3-25.4 38-58.8 39.6-95.6v-.2c.2-4.2 0-8.7 0-12.8-1.6-36.8-16.3-70.2-39.6-95.6-3.1-3.3-6.3-6.6-9.2-9.2-25.4-23.3-58.8-38-95.6-39.6-4.5-.2-9.1 0-13 0zm6.5 10.7c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm6.9 28.4c25.7 1.6 49.1 11.8 67.3 27.9 3.4 3.1 6.7 6.3 9.7 9.7 16.1 18.2 26.3 41.6 27.9 67.4.4 4.6 0 9.2 0 13.7-1.6 25.7-11.8 49.1-27.9 67.3-3.1 3.4-6.3 6.7-9.7 9.7-18.2 16.1-41.6 26.3-67.4 27.9-4.6.1-9.2.4-13.7 0-25.7-1.6-49.1-11.8-67.2-27.9h-.1c-3.4-3-6.6-6.3-9.6-9.7-16.1-18.1-26.4-41.5-28-67.3-.1-4.6-.4-9.1 0-13.6.5-25.8 13.3-50.5 27.9-67.5 3.1-3.4 6.3-6.7 9.7-9.7 18.2-16.1 41.6-26.3 67.4-27.9 4.6-.4 9.2 0 13.7 0zm-94.8 12.6c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-2.9 8.2-2.9 11.3 0zm187.1 0c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-2.9 8.2-2.9 11.3 0zM240 163.3v8.7c2.5 3.2 4.4 5.5 7.8 6.8-.7 12.4-1.6 25.1-2.8 37.7 7.4-1.9 15.2-2 22.1.1-1.2-12.7-2.2-25.4-2.9-37.9 7.9-2.1 7.8-8.6 7.8-15.4-11-1.7-21.8-1.6-32 0zm-38.3 15.8c-8.7 6.2-16.4 13.9-22.6 22.6l6.2 6.2c4 .5 7 .8 10.3-.7 8.3 9.3 16.6 18.9 24.7 28.7 3.7-6.5 9.1-11.9 15.7-15.6-9.9-8.1-19.5-16.4-28.8-24.7 1.8-3.1 1.3-6.7.7-10.3zm108.6 0l-6.2 6.2c-.7 4-.8 6.9.6 10.3-9.2 8.3-18.9 16.6-28.7 24.7 6.5 3.7 11.9 9.1 15.6 15.7 8.1-9.9 16.5-19.5 24.7-28.8 3.2 1.7 6.7 1.3 10.3.7l6.2-6.2c-6.2-8.7-13.8-16.4-22.5-22.6zM423.1 231c2.5 17.1 2.3 34.1 0 50H439c1.5-4.5 2-9.4 2.3-13.7 6 3 14.2 4.7 22.7 4.7 17.7 0 32-7.2 32-16s-14.3-16-32-16c-8.5 0-16.7 1.7-22.7 4.7-.1-4.7-1-9-2.3-13.7zm-350.07.1c-1.35 4.5-2.11 9.2-2.4 13.6-6.02-3-14.15-4.6-22.6-4.6-17.67 0-32 7.2-32 16s14.33 16 32 16c8.48 0 16.61-1.7 22.6-4.7.15 4.7 1.12 9 2.4 13.7h15.8c-2.38-17.1-2.5-34.1 0-50zM256 233c-12.9 0-23 10.2-23 23s10.1 23 23 23c12.8 0 23-10.2 23-23s-10.2-23-23-23zm84 7c-3.2 2.5-5.5 4.4-6.8 7.8-12.4-.7-25.1-1.6-37.7-2.8 1.9 7.5 1.9 15.2 0 22.1 12.6-1.2 25.2-2.2 37.7-2.9 1 3.5 3.8 5.7 6.8 7.8h8.7c1.7-11 1.6-21.8 0-32zm-176.7.1c-1.7 10.9-1.5 21.8 0 32h8.7c3.1-2.5 5.6-4.3 6.7-7.8 12.5.6 25.1 1.6 37.8 2.8-2-7.5-2-15.2-.1-22.1-12.6 1.2-25.3 2.1-37.7 2.8-.9-3.5-3.8-5.7-6.7-7.7zm224.9 7.9c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm-264.4.1c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm167.9 28c-3.7 6.5-9.1 11.9-15.7 15.6 9.9 8.1 19.5 16.4 28.8 24.7-1.8 3.1-1.3 6.7-.7 10.3l6.2 6.2c8.7-6.2 16.4-13.9 22.6-22.6l-6.2-6.2c-4-.5-7-.8-10.3.7-8.3-9.3-16.6-18.9-24.7-28.7zm-71.4 0c-8.1 9.8-16.4 19.4-24.7 28.7-3.1-1.8-6.7-1.3-10.2-.7l-6.3 6.2c6.2 8.8 13.9 16.5 22.7 22.6l6.2-6.2c.5-4 .8-7-.7-10.3 9.3-8.3 18.9-16.6 28.7-24.7-6.5-3.7-12-9.1-15.7-15.6zm24.6 19.3c1.2 12.7 2.2 25.4 2.9 37.9-3.5.8-5.8 3.8-7.8 6.7v8.7c11 1.7 21.8 1.6 32 0V340c-2.5-3.2-4.4-5.5-7.8-6.8.7-12.4 1.6-25.1 2.8-37.7-7.7 1.3-15.8 1.7-22.1-.1zm-76.7 48.5c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-3 8.2-3 11.3 0zm187 0c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-3 8.3-3 11.3 0zm36.6 12.6c-9.9 13.4-21.9 25.4-35.3 35.3l11.2 11.3c4.2-2.2 8-5.2 11.4-8 2.1 6.4 6.7 13.3 12.7 19.3 12.5 12.5 27.6 17.5 33.9 11.3 6.2-6.3 1.2-21.4-11.3-33.9-6-6-12.9-10.6-19.3-12.7 3.2-3.5 5.6-7.2 8-11.4zm-271.6 0L109 367.7c2.3 4.1 5.1 8.2 8 11.4-6.4 2.1-13.3 6.7-19.37 12.7-12.47 12.5-17.52 27.6-11.3 33.9 6.24 6.3 21.47 1.2 33.97-11.3 6-6 10.6-12.9 12.7-19.3 3.5 3.2 7.2 5.6 11.4 8l11.2-11.2c-13.5-10-25.4-21.9-35.4-35.4zM256 380.2c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm-25 43V439c4.5 1.4 9.4 2.1 13.7 2.4-3 6-4.7 14.1-4.7 22.6 0 17.7 7.2 32 16 32s16-14.3 16-32c0-8.5-1.7-16.6-4.7-22.6 4.7-.2 9-1.1 13.7-2.4v-15.9c-17.1 2.5-34.1 2.4-50 .1z'/></svg>",CORNERS="<svg class='exp-corner tl' viewBox='0 0 26 26' fill='none' stroke='currentColor' stroke-width='1.3'><path d='M2 12V5a3 3 0 013-3h7'/><circle cx='6.5' cy='6.5' r='1.4' fill='currentColor' stroke='none'/></svg><svg class='exp-corner tr' viewBox='0 0 26 26' fill='none' stroke='currentColor' stroke-width='1.3'><path d='M2 12V5a3 3 0 013-3h7'/><circle cx='6.5' cy='6.5' r='1.4' fill='currentColor' stroke='none'/></svg><svg class='exp-corner bl' viewBox='0 0 26 26' fill='none' stroke='currentColor' stroke-width='1.3'><path d='M2 12V5a3 3 0 013-3h7'/><circle cx='6.5' cy='6.5' r='1.4' fill='currentColor' stroke='none'/></svg><svg class='exp-corner br' viewBox='0 0 26 26' fill='none' stroke='currentColor' stroke-width='1.3'><path d='M2 12V5a3 3 0 013-3h7'/><circle cx='6.5' cy='6.5' r='1.4' fill='currentColor' stroke='none'/></svg>";
  // 立绘全库: 每角色 7 日常主题(各3张) + 9 张 NSFW(degrade 字段, 3组×3张) = 30 张; 由 illustration/<角色>-img-links.md 解析生成
  const GAL = {
    "富兰克林": { normal:[{k:"bedroom",label:"卧房",imgs:["https://files.catbox.moe/fxckjg.png","https://files.catbox.moe/78vrad.png","https://files.catbox.moe/089l4u.png"]},{k:"cabin",label:"船长室",imgs:["https://files.catbox.moe/dmbbqw.png","https://files.catbox.moe/2n7zq3.png","https://files.catbox.moe/cu6rt6.png"]},{k:"deck",label:"露天甲板",imgs:["https://files.catbox.moe/esm8b5.png","https://files.catbox.moe/7kj76m.png","https://files.catbox.moe/63rmxy.png"]},{k:"gala",label:"晚宴",imgs:["https://files.catbox.moe/fhtqxf.png","https://files.catbox.moe/sxyoz6.png","https://files.catbox.moe/en3ta9.png"]},{k:"mess",label:"军官起居室",imgs:["https://files.catbox.moe/aq1vnt.png","https://files.catbox.moe/ql2673.png","https://files.catbox.moe/p2ljng.png"]},{k:"tea",label:"品茶",imgs:["https://files.catbox.moe/hwiggv.png","https://files.catbox.moe/u2hj0u.png","https://files.catbox.moe/7w10qu.png"]},{k:"unwind",label:"闲憩",imgs:["https://files.catbox.moe/72d0l5.png","https://files.catbox.moe/eu7y5v.png","https://files.catbox.moe/wku8hi.png"]}], degrade:[["https://files.catbox.moe/vj4fly.png","https://files.catbox.moe/vuut5q.png","https://files.catbox.moe/e0o56f.png"],["https://files.catbox.moe/608w5r.png","https://files.catbox.moe/fc4p7m.png","https://files.catbox.moe/rcuaj9.png"],["https://files.catbox.moe/vnbjt5.png","https://files.catbox.moe/asz86u.png","https://files.catbox.moe/7wpxrm.png"]] },
    "克洛泽": { normal:[{k:"arctic",label:"北极",imgs:["https://files.catbox.moe/4uyoa8.png","https://files.catbox.moe/sjutd0.png","https://files.catbox.moe/xf1u9m.png"]},{k:"engine",label:"轮机舱",imgs:["https://files.catbox.moe/z6iwsk.png","https://files.catbox.moe/ptgd81.png","https://files.catbox.moe/omw2ey.png"]},{k:"gala",label:"晚宴",imgs:["https://files.catbox.moe/ezkvap.png","https://files.catbox.moe/5yafhr.png","https://files.catbox.moe/8fkbte.png"]},{k:"log",label:"航海志",imgs:["https://files.catbox.moe/az2lyy.png","https://files.catbox.moe/ehngjz.png","https://files.catbox.moe/g0p5ro.png"]},{k:"melancholy",label:"独酌",imgs:["https://files.catbox.moe/biz7iy.png","https://files.catbox.moe/kbeyi6.png","https://files.catbox.moe/1xh9e2.png"]},{k:"sled",label:"雪橇",imgs:["https://files.catbox.moe/64zkoz.png","https://files.catbox.moe/d6zhbf.png","https://files.catbox.moe/7cebjg.png"]},{k:"vigil",label:"守夜",imgs:["https://files.catbox.moe/b69xvu.png","https://files.catbox.moe/ymb45o.png","https://files.catbox.moe/0vp93c.png"]}], degrade:[["https://files.catbox.moe/ecputz.png","https://files.catbox.moe/7bptud.png","https://files.catbox.moe/k9z43q.png"],["https://files.catbox.moe/lqrfb7.png","https://files.catbox.moe/elv60c.png","https://files.catbox.moe/iz1r6t.png"],["https://files.catbox.moe/mry9lh.png","https://files.catbox.moe/pf58ui.png","https://files.catbox.moe/832l6z.png"]] },
    "菲茨": { normal:[{k:"battle",label:"战斗",imgs:["https://files.catbox.moe/chhtpp.png","https://files.catbox.moe/y3d7cr.png","https://files.catbox.moe/aullrc.png"]},{k:"bedroom",label:"卧房",imgs:["https://files.catbox.moe/be4d8p.png","https://files.catbox.moe/hzvm3m.png","https://files.catbox.moe/nrsn9g.png"]},{k:"bunny",label:"兔女郎",imgs:["https://files.catbox.moe/5lj83v.png","https://files.catbox.moe/ju67ba.png","https://files.catbox.moe/trye6m.png"]},{k:"dinner",label:"晚餐",imgs:["https://files.catbox.moe/ooe2dm.png","https://files.catbox.moe/n4zevh.png","https://files.catbox.moe/l5ci3u.png"]},{k:"gala",label:"晚宴",imgs:["https://files.catbox.moe/favgkj.png","https://files.catbox.moe/qxlhvb.png","https://files.catbox.moe/po1tfe.png"]},{k:"medal",label:"授勋",imgs:["https://files.catbox.moe/1pp23z.png","https://files.catbox.moe/pobbxq.png","https://files.catbox.moe/yx2jz3.png"]},{k:"portrait",label:"肖像",imgs:["https://files.catbox.moe/21xa7y.png","https://files.catbox.moe/wc9n7e.png","https://files.catbox.moe/wjy5bw.png"]}], degrade:[["https://files.catbox.moe/ulu24j.png","https://files.catbox.moe/1a7gej.png","https://files.catbox.moe/b8ocmm.png"],["https://files.catbox.moe/sm5fk7.png","https://files.catbox.moe/eutvq5.png","https://files.catbox.moe/us9z7a.png"],["https://files.catbox.moe/3ytbk0.png","https://files.catbox.moe/xvo9j8.png","https://files.catbox.moe/awnwpb.png"]] },
    "瑙雅": { normal:[{k:"festival",label:"祭典",imgs:["https://files.catbox.moe/ipuk2c.png","https://files.catbox.moe/rcxnkt.png","https://files.catbox.moe/75rxv8.png"]},{k:"hunt",label:"狩猎",imgs:["https://files.catbox.moe/jjou1w.png","https://files.catbox.moe/5ega5e.png","https://files.catbox.moe/6pkbcz.png"]},{k:"igloo",label:"冰屋",imgs:["https://files.catbox.moe/ocj0m2.png","https://files.catbox.moe/8esqk3.png","https://files.catbox.moe/4ian5g.png"]},{k:"shaman",label:"萨满",imgs:["https://files.catbox.moe/vri7mq.png","https://files.catbox.moe/pkd3cr.png","https://files.catbox.moe/y4k6t9.png"]},{k:"shelter",label:"庇护",imgs:["https://files.catbox.moe/7m1ncz.png","https://files.catbox.moe/y4dst3.png","https://files.catbox.moe/ym10c8.png"]},{k:"tent",label:"兽皮帐",imgs:["https://files.catbox.moe/szxrwr.png","https://files.catbox.moe/1db6wq.png","https://files.catbox.moe/blwv2w.png"]},{k:"tundra",label:"苔原",imgs:["https://files.catbox.moe/zp4vh9.png","https://files.catbox.moe/n6ue54.png","https://files.catbox.moe/vmis41.png"]}], degrade:[["https://files.catbox.moe/bcv2f8.png","https://files.catbox.moe/4a1svc.png","https://files.catbox.moe/trra0o.png"],["https://files.catbox.moe/vonwq2.png","https://files.catbox.moe/br3p15.png","https://files.catbox.moe/syy4us.png"],["https://files.catbox.moe/u7gql4.png","https://files.catbox.moe/9ijps7.png","https://files.catbox.moe/357y9n.png"]] },
    "茜拉": { normal:[{k:"butcher",label:"分肉",imgs:["https://files.catbox.moe/drb931.png","https://files.catbox.moe/u91y9x.png","https://files.catbox.moe/88ljq9.png"]},{k:"council",label:"议事",imgs:["https://files.catbox.moe/srod40.png","https://files.catbox.moe/rvdvho.png","https://files.catbox.moe/c4jaeu.png"]},{k:"healer",label:"医者",imgs:["https://files.catbox.moe/we0zeb.png","https://files.catbox.moe/ut4vys.png","https://files.catbox.moe/c6zrpn.png"]},{k:"igloo",label:"冰屋",imgs:["https://files.catbox.moe/rkbvjo.png","https://files.catbox.moe/hozxxz.png","https://files.catbox.moe/rzkayo.png"]},{k:"tent",label:"兽皮帐",imgs:["https://files.catbox.moe/7vqclx.png","https://files.catbox.moe/oyum2n.png","https://files.catbox.moe/w7ayhw.png"]},{k:"trade",label:"交易",imgs:["https://files.catbox.moe/5as2e3.png","https://files.catbox.moe/s0utxo.png","https://files.catbox.moe/nyygrh.png"]},{k:"tundra",label:"苔原",imgs:["https://files.catbox.moe/irmumo.png","https://files.catbox.moe/6zanpj.png","https://files.catbox.moe/vylnvw.png"]}], degrade:[["https://files.catbox.moe/f05m2i.png","https://files.catbox.moe/5gsbg5.png","https://files.catbox.moe/303lko.png"],["https://files.catbox.moe/pt19ug.png","https://files.catbox.moe/j7ivbl.png","https://files.catbox.moe/y6cz34.png"],["https://files.catbox.moe/dn9n1p.png","https://files.catbox.moe/hn7kti.png","https://files.catbox.moe/gky5du.png"]] },
  };
  // ── 地图: 真实经纬度投影 ──────────────────────────────
  // 底图地理边界(经纬度). 要扩大地图只改这四个数, 所有兴趣点与岸线自动重新定位, 不必再量像素
  const GEO={W:-131,E:-69,N:77,S:65};   // 中心≈-100W,71N; 宽高比贴合容器
  const COSLAT=Math.cos((GEO.N+GEO.S)/2*Math.PI/180);
  const MAPW=1000,MAPH=Math.round(MAPW*(GEO.N-GEO.S)/((GEO.E-GEO.W)*COSLAT));
  // 海图与船内图共用的显示尺寸(svg width/height 属性, viewBox 坐标系不受影响):
  // 两图同尺寸, 且比各自坐标系放大 15%(小屏仍由 max-width/height:100% 收口)
  const MAPDW=Math.round(MAPW*1.15),MAPDH=Math.round(MAPH*1.15);
  const projX=lon=>(lon-GEO.W)/(GEO.E-GEO.W)*MAPW;
  const projY=lat=>(GEO.N-lat)/(GEO.N-GEO.S)*MAPH;
  // 兴趣点目录: 加地点=加一行(填真实经纬度即可). 别名用于匹配 stat_data.地点 首段
  // 新增一条 checklist: ①key/区/lon/lat/type/阶段/别名/desc 要填全;
  // ②type 必须在下面 POITYPE 里存在, 查不到会兜底成 POITYPE.航道 的图标(静默降级, 不报错);
  // ③区 必须是下方 REGIONS 里已存在的 idx 值;
  // ④别名字段参与 poiOf() 的子串模糊匹配(与 regionIdxOf/roomOf 同一套风险), 新增前检查是否与
  // 其它 POI 或区域别名有子串重叠。
  const POI=[
    {key:'兰开斯特海峡',区:0,lon:-83.5,lat:74.1,type:'航道',阶段:'航行期',别名:['兰开斯特'],desc:'东向敞水航道, 探险队驶入未知的入口'},
    {key:'比奇岛',区:1,lon:-91.9,lat:74.72,type:'停泊',阶段:'过冬期',别名:['Beechey','比奇'],desc:'首个越冬地, 岸上留下三座水手坟茔'},
    {key:'维多利亚海峡',区:2,lon:-100.6,lat:69.7,type:'困冰',阶段:'困冰期',别名:['维多利亚'],desc:'终年浮冰封锁, 两船在此被永久困住'},
    {key:'威廉王岛',区:3,lon:-97.8,lat:69.3,type:'登陆',阶段:'弃船徒步',别名:['King William'],desc:'弃船登陆, 向南徒步求生的绝地'},
    {key:'因纽特营地',区:4,lon:-94.5,lat:69.5,type:'营地',阶段:'弃船徒步',别名:['涅齐里克'],desc:'涅齐里克人的季节性营地'},
  ];
  // 兴趣点类型 → 图标(以原点为中心的线稿). 加类型直接往里加, 育碧式分类
  // 标记颜色不在这里给: buildMarker 按"当前所在/已见过/未见过"三态取 --poi-current/-seen/-unseen
  const POITYPE={
    航道:{ico:"<path d='M-8 -1c2.4-2.4 4.8-2.4 7.2 0M0.8 -1c2.4-2.4 4.8-2.4 7.2 0'/><path d='M-8 3c2.4-2.4 4.8-2.4 7.2 0M0.8 3c2.4-2.4 4.8-2.4 7.2 0'/>"},
    停泊:{ico:"<circle cx='0' cy='-6.5' r='2.1'/><path d='M0 -4.4V7'/><path d='M-3.4 -2h6.8'/><path d='M-5.5 3.2a5.5 5.5 0 0 0 11 0'/><path d='M-5.5 3.2l-2.2 .9M5.5 3.2l2.2 .9'/>"},
    困冰:{ico:"<path d='M0 -8V8M-6.9 -4L6.9 4M6.9 -4L-6.9 4'/>"},
    登陆:{ico:"<path d='M-3.5 8V-8'/><path d='M-3.5 -8h9.5l-2.6 3.1 2.6 3.1h-9.5'/>"},
    营地:{ico:"<path d='M0 -8L8 7H-8Z'/><path d='M0 -8V7'/>"},
  };
  const SHIPICO="<path d='M-8 2h16l-2.6 5H-5.4Z'/><path d='M0 2V-9'/><path d='M0.5 -9l6 5.5H0.5Z'/>";
  // 船内剖面: 舱室类型 → 线稿图标(以原点为中心, 同 POITYPE 的写法), 加类型直接往里加
  // 这里的 key 要和 SHIP_ROOMS[].type 对应; 对不上时渲染处 ROOMICO[r.type]||'' 会静默降级成空图标, 不报错
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
  // 船内九舱: 纯图标兴趣点, cx/cy 为图标中心(船首朝左/船尾朝右, 甲板自上而下).
  // 数据来源【设定】幽冥号与惊恐号.md; 不画船壳与房间框, 空间关系全靠图标方位表达.
  // 画布直接取海图坐标系尺寸(当前 1000x594), 两图显示尺寸天然一致; 若改 GEO 导致 MAPH 变化, 下方 cy 需重排
  // px/py 是竖屏手机专用的第二套坐标(画布 SHIP_PW×SHIP_PH, 见下), 同一层的舱室改成两列排布,
  // 层序自上而下不变。两套坐标各自独立手排, 改动其一不影响另一套。
  // 新增一条舱室 checklist: ①key/type/cx/cy/px/py/desc/crew/别名 要填全; ②type 必须能在上面 ROOMICO 里查到
  // 对应图标 key, 查不到会静默降级成空图标(不报错, 很容易漏看); ③cx/cy 是图标中心像素坐标, 没有自动
  // 防重叠机制, 需要人工核对不要和已有舱室的图标位置撞在一起。
  const SHIP_W=MAPW, SHIP_H=MAPH;
  // 竖屏画布: 比例 594:1000 贴近竖握手机的主区形状(横版那套 1000:594 在竖屏里只能缩成一条窄带)
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
  // 地图大区块: idx 即史实推进顺序; 区块由 stat_data.地点 的首段(区块名)驱动, 前端不按坐标反查.
  // poly 只用于画区块范围与填色(经纬度多边形, 与兴趣点同投影); labelAt 为区块名锚点.
  // 新增大区 checklist: ①这里加一条 {key,idx,poly,labelAt}, idx 须唯一递增(其它地方靠 idx 排序/查找);
  // ②下方 REGION_ALIAS 要补全该区所有可能出现在 stat_data.地点 首段里的别名字符串, 同样要注意
  // 子串模糊匹配风险(见 REGION_ALIAS 定义处注释)。
  const REGIONS=[
    {key:'兰开斯特水道',idx:0,poly:[[-89,77],[-69,77],[-69,72],[-89,72.6]],labelAt:[-78,74.2]},
    {key:'比奇越冬海域',idx:1,poly:[[-101,77],[-89,77],[-89,72.6],[-95,72],[-101,72.3]],labelAt:[-95,74.8]},
    {key:'维多利亚困冰区',idx:2,poly:[[-111,77],[-101,77],[-101,72.3],[-99.5,72],[-99.5,68.5],[-104,68],[-111,68.78]],labelAt:[-105,73.5]},
    {key:'威廉王岛',idx:3,poly:[[-99.5,70],[-95.5,70],[-95,68],[-98.8,67.6],[-99.5,68.5]],labelAt:[-97.4,69.0]},
    {key:'因纽特营地与南岸',idx:4,poly:[[-131,65],[-69,65],[-69,72],[-89,72.6],[-95,72],[-101,72.3],[-99.5,72],[-99.5,70],[-95.5,70],[-95,68],[-98.8,67.6],[-99.5,68.5],[-104,68],[-113,69],[-131,70.5]],labelAt:[-88,67.5]},
    {key:'西北航道',idx:5,poly:[[-131,77],[-111,77],[-111,68.78],[-113,69],[-131,70.5]],labelAt:[-121,73.5]},
  ];
  // 区名/简称 → 区块索引(容错). regionIdxOf: 先按 地点首段 字符串匹配(兼容旧存档的地标写法), 回落到 地点所属 POI 的 区, 再兜底 0
  // 注意下面的模糊匹配用的是 includes() 子串匹配(见 regionIdxOf 循环), 不是精确相等: 新地名如果恰好
  // 是已有别名的子串或超串, 会被错误命中到别的区。加新别名前先人工过一遍现有 key, 检查子串重叠风险。
  const REGION_ALIAS={'兰开斯特水道':0,'兰开斯特':0,'兰开斯特海峡':0,'比奇越冬海域':1,'比奇':1,'比奇岛':1,'维多利亚困冰区':2,'维多利亚':2,'维多利亚海峡':2,'困冰':2,'威廉王岛':3,'威廉王':3,'威廉':3,'因纽特营地与南岸':4,'因纽特':4,'南岸':4,'南方':4,'涅齐里克':4,'西北航道':5,'西北':5};
  function regionIdxOf(loc){const s=((loc||'').split(/[·・]/)[0]||'').trim();if(s){if(REGION_ALIAS[s]!=null)return REGION_ALIAS[s];for(const k in REGION_ALIAS)if(s.includes(k))return REGION_ALIAS[k];}const p=poiOf(loc);if(p&&p.区!=null)return p.区;return 0;}
  // 海岸线(经纬度多段线, 与兴趣点同投影; 描摹加拿大北极群岛主要轮廓, 扩图续写顶点即可)
  // 海岸线: Natural Earth 50m 陆地裁剪+简化(经纬度), 与兴趣点同投影; 换范围重跑 gen_coast.py
  const COAST=[[[[-86.59,71.01],[-86.55,70.99],[-86.32,71.02],[-85.64,71.15],[-85.09,71.15],[-85.0,71.14],[-85.07,71.08],[-84.99,71.03],[-84.87,71.0],[-84.82,71.03],[-84.66,71.51],[-84.66,71.59],[-84.7,71.63],[-85.34,71.7],[-85.6,71.87],[-85.91,71.99],[-85.55,72.1],[-85.41,72.21],[-85.32,72.23],[-85.02,72.22],[-84.28,72.04],[-84.35,72.09],[-84.64,72.19],[-84.84,72.31],[-84.62,72.38],[-84.85,72.41],[-85.16,72.38],[-85.34,72.42],[-85.62,72.6],[-85.65,72.72],[-85.64,72.77],[-85.57,72.86],[-85.45,72.93],[-85.26,72.95],[-84.26,72.8],[-84.27,72.84],[-85.38,73.05],[-85.45,73.11],[-85.02,73.34],[-84.62,73.39],[-84.42,73.46],[-84.09,73.46],[-83.78,73.42],[-83.91,73.51],[-83.73,73.58],[-82.84,73.72],[-82.2,73.74],[-81.61,73.7],[-81.41,73.63],[-81.24,73.48],[-81.15,73.31],[-81.03,73.25],[-80.82,73.21],[-80.6,73.12],[-80.58,73.06],[-80.62,73.0],[-80.59,72.93],[-80.43,72.82],[-80.28,72.77],[-80.32,72.72],[-81.23,72.31],[-81.24,72.28],[-80.76,72.46],[-80.61,72.45],[-80.6,72.43],[-80.7,72.34],[-80.94,72.21],[-80.69,72.1],[-80.92,72.07],[-80.95,71.92],[-80.93,71.91],[-80.8,71.93],[-80.39,72.15],[-80.18,72.21],[-79.88,72.18],[-80.11,72.33],[-80.04,72.39],[-79.83,72.45],[-79.58,72.31],[-79.43,72.34],[-79.32,72.39],[-79.0,72.27],[-79.01,72.04],[-78.78,71.93],[-78.59,71.88],[-78.86,72.1],[-78.82,72.27],[-78.7,72.35],[-78.43,72.28],[-78.12,72.28],[-77.73,72.18],[-77.52,72.18],[-77.54,72.22],[-78.29,72.36],[-78.48,72.47],[-78.42,72.57],[-77.75,72.72],[-76.89,72.72],[-76.19,72.57],[-75.7,72.57],[-75.29,72.48],[-75.12,72.38],[-75.04,72.27],[-75.05,72.23],[-75.39,72.04],[-75.54,72.01],[-75.92,71.72],[-75.82,71.75],[-75.6,71.92],[-75.15,72.06],[-74.69,72.1],[-74.27,72.04],[-74.21,71.98],[-74.21,71.94],[-74.32,71.84],[-74.89,71.73],[-75.2,71.71],[-74.96,71.67],[-74.7,71.68],[-74.83,71.57],[-74.87,71.5],[-74.84,71.41],[-75.04,71.23],[-75.0,71.22],[-74.76,71.34],[-74.6,71.58],[-74.49,71.65],[-74.14,71.68],[-73.87,71.77],[-73.71,71.75],[-73.71,71.72],[-74.2,71.4],[-74.06,71.43],[-73.71,71.59],[-73.48,71.48],[-73.4,71.37],[-73.18,71.28],[-73.19,71.35],[-73.31,71.48],[-73.28,71.54],[-72.9,71.68],[-72.58,71.61],[-71.88,71.56],[-71.46,71.46],[-71.23,71.34],[-71.19,71.28],[-71.22,71.24],[-71.5,71.11],[-71.94,71.09],[-72.63,70.83],[-72.31,70.83],[-72.01,71.01],[-71.74,71.05],[-71.37,70.98],[-71.19,70.98],[-70.83,71.11],[-70.67,71.05],[-70.64,71.01],[-70.64,70.9],[-70.76,70.79],[-71.02,70.67],[-71.59,70.57],[-71.89,70.43],[-71.73,70.4],[-71.56,70.51],[-71.43,70.55],[-71.28,70.5],[-71.28,70.43],[-71.43,70.13],[-71.31,70.21],[-70.98,70.58],[-70.56,70.74],[-69.95,70.85],[-69.8,70.83],[-69.7,70.79],[-69.29,70.78],[-69.0,70.71],[-69.0,70.3],[-69.44,70.25],[-70.06,70.07],[-70.06,70.04],[-69.91,70.03],[-69.48,70.16],[-69.0,70.2],[-69.0,69.6],[-69.23,69.55],[-69.25,69.51],[-69.0,69.53],[-69.0,69.11],[-69.04,69.1],[-69.0,69.08],[-69.0,68.85],[-69.34,68.87],[-69.0,68.79],[-69.0,65.0],[-78.03,65.0],[-77.88,65.07],[-77.36,65.2],[-77.46,65.36],[-77.33,65.45],[-77.25,65.46],[-76.48,65.37],[-76.07,65.29],[-75.83,65.23],[-75.65,65.14],[-75.52,65.06],[-75.51,65.0],[-75.36,65.0],[-75.45,65.1],[-75.77,65.26],[-75.8,65.3],[-75.71,65.32],[-75.17,65.28],[-74.98,65.38],[-74.49,65.37],[-74.24,65.48],[-73.99,65.52],[-73.55,65.49],[-73.56,65.54],[-73.75,65.77],[-74.03,65.88],[-74.28,66.01],[-74.4,66.1],[-74.43,66.14],[-74.42,66.17],[-74.37,66.21],[-73.58,66.51],[-73.28,66.67],[-73.03,66.73],[-72.99,66.77],[-72.95,66.88],[-72.79,67.03],[-72.36,67.13],[-72.22,67.25],[-72.35,67.34],[-72.58,67.66],[-72.73,67.81],[-73.06,68.11],[-73.33,68.27],[-73.33,68.31],[-73.28,68.36],[-73.64,68.29],[-73.82,68.36],[-73.88,68.43],[-73.78,68.58],[-73.82,68.69],[-74.12,68.7],[-73.97,68.58],[-73.99,68.55],[-74.27,68.54],[-74.42,68.58],[-74.65,68.71],[-74.7,68.76],[-74.7,68.81],[-74.89,68.81],[-74.91,68.82],[-74.74,68.91],[-74.95,68.96],[-74.72,69.05],[-74.85,69.07],[-75.21,68.91],[-75.52,68.95],[-75.62,68.89],[-76.23,68.73],[-76.4,68.69],[-76.59,68.7],[-76.62,68.72],[-76.62,68.76],[-76.57,68.85],[-76.59,68.97],[-76.56,69.01],[-76.38,69.05],[-76.09,69.03],[-75.86,69.06],[-75.67,69.16],[-75.65,69.21],[-75.75,69.3],[-76.46,69.47],[-76.52,69.52],[-76.52,69.59],[-76.23,69.66],[-76.51,69.68],[-76.74,69.57],[-77.09,69.64],[-77.13,69.65],[-77.11,69.67],[-76.87,69.75],[-76.86,69.78],[-77.02,69.84],[-77.59,69.85],[-77.77,70.24],[-78.28,70.23],[-78.62,70.35],[-78.98,70.58],[-79.07,70.6],[-79.16,70.58],[-79.35,70.48],[-79.41,70.4],[-79.02,70.33],[-78.93,70.29],[-78.81,70.18],[-78.78,70.05],[-78.82,70.01],[-79.09,69.93],[-79.52,69.89],[-80.67,70.05],[-81.56,70.11],[-81.65,70.09],[-81.33,70.02],[-81.02,69.9],[-80.84,69.79],[-80.92,69.73],[-81.56,69.94],[-82.29,69.84],[-83.15,70.01],[-83.86,69.96],[-84.52,70.01],[-84.91,70.08],[-85.43,70.11],[-85.78,70.04],[-86.32,70.15],[-86.48,70.29],[-86.5,70.35],[-86.4,70.47],[-86.7,70.39],[-87.12,70.41],[-87.17,70.4],[-87.06,70.33],[-87.62,70.32],[-87.84,70.25],[-88.4,70.44],[-88.85,70.52],[-89.21,70.76],[-89.37,71.0],[-89.46,71.06],[-88.7,71.05],[-87.84,70.94],[-87.18,70.99],[-87.14,71.01],[-87.87,71.21],[-89.08,71.29],[-89.69,71.42],[-89.85,71.49],[-90.03,71.95],[-89.93,72.05],[-89.66,72.18],[-89.82,72.21],[-89.86,72.25],[-89.86,72.41],[-89.7,72.57],[-89.36,72.8],[-89.29,73.02],[-89.23,73.11],[-88.98,73.25],[-88.76,73.31],[-88.71,73.4],[-87.72,73.72],[-86.41,73.85],[-85.11,73.81],[-85.01,73.78],[-84.95,73.72],[-84.97,73.69],[-85.68,73.46],[-86.09,73.26],[-86.63,72.87],[-86.67,72.76],[-86.59,72.66],[-86.32,72.46],[-86.34,72.12],[-86.22,71.9],[-86.04,71.77],[-85.08,71.4],[-85.02,71.35],[-85.41,71.23],[-85.95,71.16]]],[[[-79.3,77.0],[-79.32,76.98],[-79.22,76.94],[-78.79,76.88],[-78.46,76.97],[-78.29,76.98],[-78.0,76.85],[-77.98,76.75],[-78.12,76.64],[-78.28,76.57],[-79.51,76.31],[-80.69,76.18],[-80.96,76.18],[-81.0,76.21],[-80.83,76.37],[-80.83,76.41],[-80.97,76.47],[-81.17,76.51],[-81.72,76.49],[-82.03,76.63],[-82.31,76.66],[-82.53,76.72],[-82.26,76.57],[-82.21,76.51],[-82.23,76.47],[-83.89,76.45],[-83.99,76.5],[-84.22,76.68],[-84.28,76.36],[-85.14,76.3],[-85.68,76.35],[-86.12,76.43],[-86.3,76.49],[-86.45,76.58],[-86.56,76.52],[-86.68,76.38],[-87.35,76.45],[-87.49,76.59],[-87.5,76.39],[-88.4,76.41],[-88.48,76.58],[-88.5,76.77],[-88.61,76.65],[-88.55,76.42],[-89.57,76.49],[-89.5,76.83],[-88.75,77.0]]],[[[-94.31,71.76],[-93.81,71.77],[-93.75,71.74],[-93.78,71.67],[-93.76,71.64],[-93.26,71.46],[-93.03,71.34],[-92.95,71.26],[-92.88,71.07],[-92.9,70.92],[-92.98,70.85],[-92.36,70.63],[-92.21,70.49],[-92.05,70.39],[-92.07,70.32],[-92.05,70.3],[-91.98,70.29],[-91.82,70.34],[-91.76,70.33],[-91.56,70.18],[-91.62,70.15],[-91.86,70.13],[-92.12,70.17],[-92.32,70.24],[-92.51,70.1],[-92.13,70.08],[-91.98,70.04],[-92.89,69.67],[-92.31,69.67],[-92.23,69.65],[-92.26,69.63],[-92.21,69.6],[-91.91,69.53],[-91.72,69.55],[-91.38,69.65],[-91.2,69.64],[-91.15,69.64],[-91.17,69.62],[-91.44,69.53],[-90.67,69.52],[-90.42,69.46],[-90.68,69.43],[-90.79,69.35],[-90.82,69.29],[-90.89,69.27],[-91.0,69.28],[-91.06,69.32],[-91.24,69.29],[-90.74,69.11],[-90.48,68.88],[-90.54,68.82],[-90.51,68.69],[-90.57,68.47],[-90.25,68.27],[-90.17,68.27],[-89.9,68.49],[-89.88,68.63],[-89.78,68.74],[-89.67,69.01],[-89.28,69.26],[-89.06,69.27],[-88.04,68.81],[-87.83,68.45],[-87.83,68.3],[-87.89,68.25],[-87.99,68.24],[-88.11,68.25],[-88.24,68.34],[-88.35,68.29],[-88.31,67.95],[-88.2,67.77],[-87.5,67.36],[-87.42,67.21],[-87.36,67.18],[-87.27,67.18],[-86.92,67.36],[-86.56,67.48],[-86.48,67.71],[-86.4,67.8],[-85.95,68.07],[-85.73,68.45],[-85.74,68.58],[-85.69,68.67],[-85.49,68.77],[-85.28,68.74],[-84.87,68.77],[-85.11,68.84],[-85.08,68.91],[-84.92,68.96],[-84.86,69.07],[-85.11,69.17],[-85.28,69.17],[-85.39,69.23],[-85.43,69.35],[-85.4,69.43],[-85.44,69.49],[-85.42,69.55],[-85.5,69.65],[-85.45,69.78],[-85.53,69.84],[-85.51,69.85],[-85.02,69.8],[-84.65,69.85],[-84.32,69.84],[-83.67,69.7],[-82.62,69.69],[-82.37,69.64],[-82.39,69.6],[-82.5,69.53],[-82.75,69.49],[-82.31,69.41],[-82.21,69.3],[-82.25,69.26],[-82.23,69.25],[-81.95,69.28],[-81.73,69.26],[-81.41,69.2],[-81.32,69.14],[-81.61,69.0],[-81.95,68.91],[-81.96,68.88],[-81.38,68.85],[-81.26,68.78],[-81.28,68.66],[-81.53,68.56],[-81.91,68.46],[-82.21,68.51],[-82.5,68.48],[-82.55,68.45],[-82.41,68.36],[-82.39,68.34],[-82.42,68.3],[-82.22,68.15],[-82.15,68.14],[-82.01,68.19],[-82.1,68.02],[-82.06,67.93],[-81.87,67.8],[-81.41,67.6],[-81.29,67.5],[-81.27,67.46],[-81.39,67.19],[-81.47,67.07],[-81.63,67.0],[-81.93,66.97],[-82.2,66.76],[-82.64,66.59],[-82.95,66.55],[-83.3,66.39],[-83.52,66.37],[-83.59,66.39],[-83.65,66.48],[-84.0,66.73],[-84.21,66.74],[-84.37,66.81],[-84.27,66.84],[-84.54,66.97],[-84.85,67.03],[-85.04,66.96],[-85.11,66.89],[-85.02,66.87],[-84.86,66.94],[-84.64,66.9],[-84.22,66.68],[-83.8,66.24],[-83.91,66.21],[-84.32,66.29],[-84.48,66.18],[-85.1,66.33],[-85.44,66.54],[-85.6,66.57],[-86.06,66.52],[-86.71,66.52],[-86.74,66.51],[-86.69,66.46],[-86.75,66.42],[-86.69,66.36],[-86.11,66.23],[-86.0,66.19],[-85.96,66.12],[-86.04,66.02],[-87.08,65.44],[-87.29,65.35],[-87.45,65.34],[-87.97,65.35],[-88.67,65.61],[-88.74,65.68],[-89.09,65.74],[-89.42,65.86],[-89.75,65.94],[-89.94,65.93],[-89.85,65.87],[-89.89,65.87],[-90.32,65.93],[-91.41,65.96],[-91.04,65.83],[-91.06,65.9],[-90.98,65.92],[-89.92,65.78],[-89.6,65.65],[-89.24,65.45],[-88.97,65.35],[-87.11,65.22],[-87.03,65.2],[-87.0,65.11],[-87.1,65.0],[-131.0,65.0],[-131.0,70.01],[-130.67,70.13],[-130.5,70.14],[-130.17,70.09],[-129.94,70.09],[-129.68,70.19],[-129.54,70.11],[-129.54,70.07],[-129.65,70.0],[-130.83,69.65],[-131.0,69.63],[-130.97,69.21],[-130.88,69.32],[-130.66,69.48],[-130.35,69.66],[-129.57,69.83],[-129.11,69.88],[-128.9,69.97],[-128.94,69.88],[-129.14,69.83],[-129.16,69.8],[-129.1,69.72],[-128.97,69.71],[-128.39,69.96],[-128.28,70.11],[-127.76,70.22],[-127.68,70.26],[-127.97,70.29],[-128.04,70.33],[-127.99,70.36],[-128.17,70.42],[-128.17,70.48],[-128.13,70.52],[-127.99,70.57],[-127.75,70.52],[-127.23,70.3],[-126.93,70.06],[-126.68,69.78],[-126.25,69.55],[-125.91,69.42],[-125.52,69.35],[-125.39,69.35],[-125.17,69.43],[-125.17,69.48],[-125.36,69.63],[-125.35,69.66],[-125.22,69.73],[-125.2,69.83],[-125.08,69.82],[-124.77,69.99],[-124.99,70.03],[-124.56,70.15],[-124.44,70.11],[-124.47,69.92],[-124.41,69.77],[-124.12,69.69],[-124.14,69.65],[-124.48,69.43],[-124.43,69.38],[-124.34,69.36],[-123.53,69.39],[-123.36,69.5],[-123.21,69.54],[-123.11,69.74],[-123.03,69.81],[-122.07,69.82],[-121.53,69.78],[-120.96,69.66],[-120.14,69.38],[-118.87,69.26],[-118.1,69.04],[-117.23,68.91],[-116.06,68.84],[-116.24,68.97],[-115.63,68.97],[-114.62,68.75],[-114.22,68.55],[-114.09,68.44],[-113.96,68.4],[-114.02,68.31],[-114.1,68.27],[-114.77,68.27],[-114.85,68.2],[-115.13,68.13],[-115.19,68.08],[-115.17,68.02],[-115.43,67.9],[-115.13,67.82],[-114.66,67.8],[-114.27,67.73],[-112.5,67.68],[-112.24,67.73],[-111.58,67.76],[-111.19,67.82],[-110.99,67.79],[-110.37,67.95],[-110.22,67.95],[-110.07,67.99],[-109.94,67.89],[-109.83,67.87],[-109.63,67.73],[-109.22,67.73],[-109.04,67.69],[-108.95,67.49],[-108.85,67.42],[-108.72,67.58],[-108.61,67.6],[-108.49,67.48],[-108.35,67.4],[-107.99,67.26],[-107.91,67.16],[-107.99,67.1],[-108.22,67.05],[-108.5,67.09],[-107.76,66.68],[-107.48,66.49],[-107.26,66.4],[-107.71,66.74],[-107.75,66.96],[-107.63,67.0],[-107.5,66.94],[-107.4,66.95],[-107.16,66.88],[-107.35,67.05],[-107.28,67.1],[-107.57,67.27],[-107.64,67.38],[-107.65,67.51],[-107.95,67.7],[-107.96,67.82],[-107.76,67.91],[-107.73,67.96],[-107.8,68.04],[-106.92,68.11],[-106.79,68.14],[-106.67,68.22],[-106.42,68.2],[-106.4,68.32],[-106.27,68.38],[-105.93,68.44],[-105.78,68.53],[-105.75,68.59],[-105.93,68.64],[-106.46,68.52],[-106.54,68.46],[-106.61,68.36],[-106.85,68.39],[-107.15,68.3],[-107.3,68.3],[-107.62,68.33],[-107.74,68.29],[-107.68,68.2],[-107.73,68.17],[-108.26,68.15],[-108.72,68.3],[-108.31,68.61],[-107.44,68.69],[-106.16,68.92],[-105.69,68.83],[-105.54,68.72],[-105.46,68.58],[-105.43,68.46],[-105.38,68.41],[-105.1,68.3],[-104.96,68.31],[-104.91,68.25],[-104.65,68.23],[-104.66,68.15],[-104.49,68.06],[-104.19,68.03],[-103.9,68.04],[-103.47,68.12],[-102.84,67.85],[-102.32,67.74],[-101.88,67.75],[-101.55,67.69],[-100.46,67.84],[-99.77,67.81],[-99.15,67.72],[-98.92,67.73],[-98.41,67.81],[-98.7,67.97],[-98.72,68.04],[-98.63,68.07],[-98.41,67.99],[-97.93,67.71],[-97.45,67.62],[-97.16,67.73],[-97.14,67.8],[-97.21,67.86],[-97.55,67.96],[-97.74,67.98],[-98.11,67.9],[-98.19,67.92],[-98.5,68.12],[-98.38,68.13],[-98.65,68.36],[-98.47,68.38],[-98.22,68.32],[-97.79,68.39],[-97.91,68.45],[-97.93,68.52],[-97.83,68.53],[-97.55,68.47],[-97.41,68.5],[-97.27,68.45],[-96.98,68.26],[-96.63,68.25],[-96.43,68.31],[-96.72,68.04],[-96.53,68.06],[-96.44,68.15],[-95.97,68.25],[-96.04,68.16],[-96.2,67.72],[-96.37,67.55],[-96.37,67.51],[-96.19,67.38],[-96.14,67.27],[-95.72,67.32],[-95.7,67.3],[-95.78,67.18],[-95.56,67.22],[-95.42,67.16],[-95.42,67.01],[-95.5,66.98],[-95.77,66.97],[-96.02,67.02],[-96.22,67.0],[-96.35,67.07],[-96.42,67.05],[-96.36,66.99],[-95.89,66.74],[-95.81,66.69],[-95.79,66.62],[-95.74,66.69],[-96.02,66.87],[-96.04,66.94],[-95.63,66.92],[-95.4,66.95],[-95.35,66.98],[-95.32,67.15],[-95.26,67.26],[-95.46,67.61],[-95.65,67.74],[-95.46,68.02],[-95.13,68.08],[-94.86,68.04],[-94.74,68.07],[-93.93,68.47],[-93.45,68.62],[-93.64,68.63],[-93.68,68.69],[-93.68,68.89],[-93.77,68.97],[-93.85,69.0],[-93.9,68.98],[-93.99,68.82],[-94.06,68.78],[-94.48,68.74],[-94.6,68.8],[-94.56,68.91],[-94.08,69.12],[-94.26,69.15],[-94.28,69.24],[-94.25,69.31],[-93.62,69.42],[-93.82,69.25],[-93.75,69.23],[-93.43,69.38],[-93.54,69.38],[-93.53,69.48],[-93.65,69.52],[-94.02,69.45],[-94.27,69.46],[-94.63,69.65],[-94.71,69.65],[-94.82,69.58],[-96.05,69.83],[-96.49,70.12],[-96.55,70.21],[-96.55,70.33],[-96.23,70.54],[-96.05,70.57],[-95.88,70.55],[-95.99,70.62],[-95.89,70.69],[-96.19,70.64],[-96.36,70.68],[-96.55,70.81],[-96.55,70.89],[-96.47,71.07],[-96.52,71.13],[-96.42,71.18],[-96.45,71.24],[-96.41,71.27],[-96.06,71.41],[-95.73,71.33],[-95.56,71.34],[-95.41,71.49],[-95.77,71.51],[-95.87,71.57],[-95.62,71.69],[-95.51,71.78],[-95.2,71.9],[-94.73,71.98],[-94.56,71.98],[-94.49,71.92],[-94.48,71.85]]],[[[-73.62,67.78],[-74.48,67.8],[-74.57,67.83],[-74.68,67.91],[-74.75,68.02],[-74.71,68.07],[-74.38,68.09],[-73.49,68.0],[-73.44,67.97],[-73.41,67.79]]],[[[-93.54,75.03],[-93.48,74.95],[-93.46,74.86],[-93.57,74.67],[-94.53,74.64],[-94.8,74.66],[-95.29,74.79],[-95.87,74.83],[-96.09,74.93],[-96.18,74.95],[-96.27,74.92],[-96.39,75.0],[-96.56,74.99],[-96.6,75.03],[-96.57,75.1],[-96.38,75.21],[-96.18,75.24],[-96.12,75.3],[-96.12,75.36],[-95.95,75.44],[-95.67,75.53],[-94.88,75.63],[-94.43,75.59],[-93.91,75.42],[-93.75,75.35],[-93.5,75.14]]],[[[-118.33,75.58],[-118.61,75.52],[-118.82,75.52],[-119.39,75.62],[-118.63,75.91],[-118.14,75.99],[-117.75,76.11],[-117.63,76.12],[-117.5,76.08],[-117.63,75.97],[-118.23,75.61]]],[[[-105.29,72.92],[-105.43,72.94],[-106.07,73.2],[-106.18,73.3],[-106.53,73.41],[-106.92,73.48],[-106.95,73.51],[-106.83,73.6],[-106.61,73.7],[-105.51,73.77],[-105.11,73.74],[-104.65,73.61],[-104.56,73.54],[-104.58,73.35],[-104.62,73.31],[-104.79,73.17],[-104.97,73.09],[-105.0,73.04]]],[[[-100.0,73.95],[-99.16,73.73],[-97.67,73.89],[-97.33,73.86],[-97.11,73.79],[-97.0,73.67],[-97.16,73.59],[-97.49,73.53],[-97.6,73.54],[-97.63,73.5],[-97.59,73.47],[-97.35,73.48],[-97.23,73.42],[-97.27,73.39],[-97.8,73.29],[-98.38,73.04],[-98.44,73.0],[-98.43,72.96],[-98.37,72.93],[-97.94,73.04],[-97.64,73.03],[-97.33,72.94],[-97.3,72.92],[-97.38,72.86],[-97.08,72.76],[-97.07,72.72],[-97.16,72.64],[-97.13,72.63],[-96.67,72.71],[-96.54,72.7],[-96.45,72.55],[-96.47,72.43],[-96.64,72.34],[-96.8,72.32],[-96.67,72.27],[-96.59,72.2],[-96.62,72.15],[-96.77,72.05],[-96.62,71.97],[-96.61,71.83],[-96.95,71.79],[-97.22,71.67],[-97.58,71.63],[-98.18,71.66],[-98.28,71.72],[-98.32,71.85],[-98.46,71.77],[-98.23,71.56],[-98.2,71.44],[-98.41,71.35],[-98.66,71.3],[-98.99,71.37],[-99.17,71.37],[-99.28,71.42],[-99.4,71.56],[-99.73,71.76],[-100.33,72.0],[-100.59,72.15],[-100.98,72.21],[-101.21,72.32],[-101.5,72.28],[-101.72,72.31],[-101.97,72.49],[-102.4,72.59],[-102.66,72.72],[-102.71,72.78],[-102.55,72.98],[-102.34,73.06],[-102.2,73.08],[-101.92,73.06],[-101.75,72.94],[-101.54,72.88],[-101.27,72.72],[-101.09,72.71],[-100.48,72.77],[-100.44,72.81],[-100.4,72.98],[-100.23,72.9],[-100.13,72.91],[-100.1,72.96],[-100.24,73.1],[-100.53,73.14],[-100.54,73.2],[-100.44,73.25],[-100.34,73.27],[-100.07,73.21],[-99.83,73.21],[-100.01,73.24],[-100.37,73.36],[-100.59,73.3],[-100.89,73.28],[-101.45,73.43],[-101.52,73.49],[-101.32,73.57],[-100.98,73.6],[-100.52,73.45],[-100.54,73.51],[-100.61,73.58],[-100.78,73.61],[-100.95,73.69],[-100.98,73.73],[-100.96,73.79],[-100.48,73.84],[-99.99,73.8],[-99.91,73.85],[-100.15,73.84],[-100.23,73.89]]],[[[-84.92,65.26],[-84.84,65.26],[-84.61,65.45],[-84.5,65.46],[-84.27,65.37],[-84.08,65.22],[-83.49,65.13],[-83.27,65.0],[-86.19,65.0],[-86.11,65.42],[-86.02,65.64],[-85.81,65.83],[-85.52,65.91],[-85.44,65.85],[-85.24,65.8],[-85.18,65.75],[-85.11,65.62],[-85.24,65.51],[-85.06,65.44]]],[[[-75.68,68.32],[-75.15,68.23],[-75.08,68.17],[-75.06,68.08],[-75.13,67.97],[-75.09,67.63],[-75.13,67.54],[-75.2,67.46],[-75.4,67.37],[-75.78,67.28],[-76.69,67.24],[-77.0,67.27],[-77.22,67.51],[-77.31,67.71],[-77.23,67.85],[-76.74,68.23],[-76.36,68.32]]],[[[-79.54,73.65],[-78.29,73.67],[-77.21,73.5],[-77.01,73.36],[-76.76,73.31],[-76.57,73.16],[-76.29,73.08],[-76.31,73.0],[-76.09,72.88],[-76.4,72.82],[-77.84,72.9],[-78.31,72.88],[-79.32,72.76],[-79.5,72.76],[-79.82,72.83],[-79.98,72.89],[-80.18,73.22],[-80.62,73.27],[-80.78,73.33],[-80.82,73.38],[-80.82,73.43],[-80.8,73.47],[-80.74,73.48],[-80.83,73.53],[-80.86,73.59],[-80.85,73.72],[-80.76,73.76],[-80.41,73.77],[-80.12,73.71]]],[[[-97.7,76.47],[-97.69,76.42],[-97.74,76.34],[-97.53,76.18],[-97.53,76.11],[-97.61,76.05],[-97.65,75.98],[-97.6,75.85],[-97.89,75.76],[-97.41,75.67],[-97.41,75.55],[-97.34,75.42],[-97.65,75.51],[-97.88,75.42],[-97.85,75.26],[-97.66,75.15],[-97.8,75.12],[-98.07,75.2],[-98.08,75.15],[-97.95,75.06],[-97.99,75.05],[-98.7,75.01],[-99.16,75.02],[-99.33,75.05],[-99.63,74.98],[-100.29,75.03],[-100.48,75.19],[-100.46,75.22],[-100.15,75.25],[-100.73,75.35],[-100.71,75.41],[-100.28,75.46],[-99.76,75.63],[-99.21,75.67],[-99.19,75.7],[-99.92,75.68],[-101.21,75.59],[-101.46,75.61],[-102.54,75.51],[-102.7,75.54],[-102.8,75.6],[-102.25,75.78],[-102.27,75.81],[-102.14,75.88],[-101.94,75.88],[-101.26,75.76],[-100.97,75.8],[-101.29,75.79],[-101.51,75.92],[-101.43,75.99],[-101.82,76.04],[-101.86,76.1],[-101.53,76.22],[-101.56,76.24],[-101.91,76.23],[-102.14,76.28],[-102.1,76.33],[-101.96,76.4],[-101.79,76.45],[-101.34,76.41],[-101.14,76.35],[-101.06,76.25],[-100.11,75.96],[-99.87,75.92],[-99.69,75.96],[-99.98,76.03],[-100.11,76.12],[-99.54,76.15],[-100.41,76.24],[-99.98,76.31],[-100.82,76.44],[-100.89,76.48],[-100.83,76.52],[-100.39,76.61],[-99.81,76.63],[-99.67,76.62],[-99.17,76.45],[-98.89,76.47],[-99.02,76.61],[-98.71,76.69],[-98.24,76.58],[-97.81,76.52]]],[[[-94.29,76.91],[-93.81,76.91],[-93.23,76.77],[-93.19,76.71],[-93.2,76.67],[-93.53,76.45],[-93.0,76.62],[-92.3,76.62],[-91.79,76.68],[-91.31,76.68],[-90.74,76.58],[-90.54,76.5],[-90.62,76.46],[-91.4,76.51],[-91.44,76.5],[-91.42,76.46],[-90.85,76.44],[-89.28,76.3],[-89.22,76.26],[-89.24,76.24],[-89.41,76.19],[-90.31,76.16],[-91.41,76.22],[-91.28,76.16],[-90.71,76.08],[-90.25,76.05],[-90.03,75.97],[-89.79,75.92],[-89.7,75.85],[-89.51,75.86],[-89.28,75.8],[-89.2,75.76],[-89.26,75.7],[-89.65,75.57],[-89.28,75.56],[-88.92,75.45],[-88.84,75.46],[-88.8,75.5],[-88.86,75.59],[-88.85,75.62],[-88.64,75.66],[-88.2,75.51],[-87.73,75.58],[-87.54,75.48],[-87.36,75.59],[-87.26,75.62],[-86.81,75.49],[-86.24,75.41],[-85.95,75.4],[-85.9,75.44],[-86.07,75.5],[-85.97,75.53],[-85.58,75.58],[-85.37,75.57],[-84.99,75.64],[-84.6,75.65],[-83.93,75.82],[-83.24,75.75],[-82.15,75.83],[-81.27,75.76],[-81.15,75.74],[-81.19,75.68],[-81.17,75.67],[-81.0,75.64],[-80.32,75.63],[-80.12,75.56],[-80.29,75.49],[-80.26,75.48],[-79.66,75.45],[-79.51,75.3],[-79.51,75.26],[-79.63,75.2],[-80.38,75.03],[-80.14,74.99],[-79.66,75.02],[-79.52,74.99],[-79.4,74.92],[-79.51,74.88],[-79.94,74.83],[-80.35,74.9],[-80.15,74.8],[-80.21,74.75],[-80.22,74.66],[-80.28,74.58],[-81.23,74.57],[-81.94,74.47],[-82.93,74.57],[-83.12,74.69],[-83.1,74.82],[-83.52,74.9],[-83.54,74.89],[-83.51,74.85],[-83.36,74.8],[-83.34,74.76],[-83.39,74.67],[-83.53,74.59],[-84.43,74.51],[-84.82,74.54],[-85.06,74.61],[-85.09,74.53],[-85.13,74.52],[-85.34,74.54],[-85.44,74.6],[-85.54,74.53],[-85.81,74.5],[-86.11,74.54],[-86.34,74.51],[-86.73,74.56],[-86.67,74.49],[-86.77,74.48],[-88.42,74.49],[-88.5,74.51],[-88.56,74.57],[-88.34,74.78],[-88.53,74.83],[-88.68,74.8],[-88.85,74.69],[-88.94,74.79],[-89.06,74.75],[-89.19,74.74],[-89.22,74.73],[-89.2,74.64],[-89.56,74.55],[-89.84,74.55],[-90.55,74.61],[-90.78,74.7],[-90.97,74.72],[-90.88,74.82],[-91.13,74.74],[-91.16,74.71],[-91.13,74.65],[-91.55,74.66],[-91.96,74.79],[-92.17,75.05],[-92.06,75.1],[-92.08,75.12],[-92.35,75.23],[-92.41,75.3],[-92.41,75.41],[-92.07,75.66],[-92.19,75.85],[-92.71,76.11],[-93.09,76.35],[-93.31,76.36],[-93.67,76.27],[-94.59,76.3],[-95.27,76.26],[-95.45,76.36],[-95.84,76.42],[-96.04,76.49],[-95.65,76.58],[-95.97,76.57],[-96.88,76.74],[-96.88,76.8],[-96.59,76.76],[-96.4,76.8],[-96.81,76.91],[-96.76,76.97],[-96.69,76.99],[-94.98,77.0]]],[[[-115.97,77.0],[-115.81,76.94],[-115.91,76.91],[-116.25,76.9],[-115.94,76.74],[-115.98,76.69],[-116.22,76.61],[-117.0,76.53],[-117.04,76.37],[-117.23,76.28],[-117.49,76.27],[-117.99,76.41],[-118.02,76.45],[-118.01,76.5],[-117.81,76.73],[-117.78,76.78],[-117.82,76.8],[-118.3,76.74],[-118.41,76.66],[-118.47,76.55],[-118.79,76.51],[-118.82,76.49],[-118.8,76.46],[-118.64,76.42],[-118.62,76.37],[-118.64,76.33],[-118.85,76.26],[-118.99,76.14],[-119.17,76.13],[-119.37,76.22],[-119.52,76.34],[-119.58,76.33],[-119.65,76.28],[-119.64,76.16],[-119.74,76.12],[-119.55,76.05],[-119.53,76.0],[-119.91,75.86],[-120.41,75.83],[-120.56,76.01],[-120.64,76.03],[-120.77,76.17],[-120.85,76.18],[-120.9,76.16],[-121.02,76.02],[-121.21,75.98],[-121.91,76.03],[-122.4,75.94],[-122.53,75.95],[-122.64,76.01],[-122.65,76.03],[-122.55,76.08],[-122.61,76.12],[-122.59,76.16],[-122.9,76.13],[-122.77,76.23],[-122.42,76.39],[-121.56,76.45],[-121.1,76.66],[-120.49,76.79],[-120.36,76.89],[-120.02,77.0]]],[[[-108.29,76.06],[-107.85,76.06],[-107.72,76.0],[-107.76,75.94],[-108.02,75.8],[-107.92,75.8],[-107.54,75.9],[-107.22,75.89],[-107.05,75.85],[-106.91,75.68],[-106.89,75.78],[-106.69,75.81],[-106.82,75.87],[-106.86,75.93],[-106.68,76.02],[-106.4,76.06],[-105.9,76.01],[-105.63,75.95],[-105.56,75.88],[-105.48,75.7],[-105.52,75.63],[-105.68,75.5],[-105.7,75.41],[-105.86,75.19],[-105.97,75.13],[-107.06,74.93],[-107.82,75.0],[-108.47,74.95],[-108.75,74.99],[-108.63,75.02],[-108.83,75.06],[-109.5,74.88],[-110.39,74.81],[-110.94,74.64],[-111.73,74.5],[-112.52,74.42],[-113.02,74.4],[-113.67,74.45],[-114.27,74.6],[-114.38,74.67],[-114.31,74.72],[-112.84,74.98],[-111.67,75.02],[-111.08,75.2],[-111.03,75.23],[-111.09,75.26],[-111.62,75.17],[-112.21,75.13],[-112.6,75.21],[-112.95,75.11],[-113.71,75.07],[-113.84,75.11],[-113.89,75.21],[-113.85,75.26],[-113.76,75.32],[-113.47,75.42],[-113.88,75.38],[-114.02,75.43],[-114.07,75.39],[-114.17,75.24],[-114.51,75.28],[-114.36,75.17],[-114.36,75.14],[-114.45,75.09],[-115.02,74.98],[-115.28,75.1],[-115.41,75.11],[-115.54,75.08],[-115.61,75.01],[-115.73,74.97],[-116.14,75.04],[-116.48,75.17],[-117.0,75.16],[-117.5,75.2],[-117.6,75.27],[-117.51,75.36],[-117.26,75.46],[-116.08,75.49],[-115.34,75.62],[-115.14,75.68],[-115.12,75.71],[-116.43,75.59],[-117.03,75.6],[-117.16,75.64],[-116.97,75.75],[-116.8,75.77],[-115.48,75.84],[-114.99,75.9],[-116.34,75.88],[-116.65,75.93],[-116.66,75.96],[-116.55,76.02],[-116.61,76.07],[-116.59,76.1],[-116.21,76.19],[-114.78,76.17],[-115.82,76.27],[-115.83,76.33],[-115.78,76.36],[-115.58,76.44],[-115.0,76.5],[-114.53,76.5],[-114.19,76.45],[-114.12,76.4],[-114.11,76.35],[-114.06,76.3],[-113.82,76.21],[-113.17,76.26],[-112.7,76.2],[-111.87,75.94],[-111.87,75.91],[-112.05,75.87],[-112.08,75.85],[-112.06,75.83],[-111.55,75.82],[-111.28,75.61],[-111.05,75.55],[-109.09,75.51],[-109.01,75.51],[-108.91,75.59],[-108.9,75.62],[-108.94,75.7],[-109.8,75.86],[-109.87,75.93],[-109.45,76.02],[-109.42,76.07],[-109.43,76.11],[-109.71,76.21],[-109.91,76.22],[-110.2,76.29],[-110.28,76.33],[-110.31,76.4],[-109.86,76.52],[-109.34,76.76],[-109.1,76.81],[-108.83,76.82],[-108.47,76.74],[-108.64,76.61],[-108.63,76.59],[-108.56,76.54],[-108.51,76.44],[-108.19,76.33],[-108.12,76.23],[-108.38,76.12],[-108.41,76.09],[-108.39,76.07]]],[[[-93.17,74.16],[-92.59,74.08],[-92.22,73.97],[-91.63,74.03],[-91.09,74.01],[-90.46,73.91],[-90.35,73.87],[-90.38,73.82],[-90.57,73.69],[-90.93,73.53],[-91.25,73.3],[-91.55,73.24],[-91.43,73.19],[-91.46,73.15],[-91.79,72.92],[-92.12,72.75],[-92.39,72.72],[-93.34,72.8],[-94.21,72.76],[-93.77,72.67],[-93.57,72.56],[-93.53,72.5],[-93.56,72.42],[-93.87,72.25],[-94.04,72.03],[-94.14,72.0],[-94.5,72.04],[-95.19,72.03],[-95.17,72.18],[-95.25,72.5],[-95.55,72.78],[-95.6,72.88],[-95.59,73.17],[-95.64,73.56],[-95.63,73.7],[-95.39,73.76],[-94.7,73.66],[-94.9,73.72],[-95.13,73.88],[-95.15,73.93],[-95.12,73.99],[-94.97,74.04],[-94.48,74.11],[-93.78,74.12],[-93.41,74.18]]],[[[-97.44,69.64],[-97.24,69.67],[-96.88,69.51],[-96.3,69.34],[-95.95,69.02],[-95.75,68.9],[-95.59,68.84],[-95.37,68.89],[-95.27,68.83],[-95.47,68.75],[-95.69,68.74],[-95.89,68.63],[-96.4,68.47],[-96.6,68.46],[-97.01,68.54],[-97.47,68.54],[-97.89,68.67],[-98.24,68.74],[-98.32,68.84],[-98.54,68.8],[-98.7,68.8],[-98.83,68.84],[-98.9,68.93],[-99.06,68.92],[-99.09,68.9],[-99.09,68.86],[-99.25,68.86],[-99.44,68.92],[-99.56,69.03],[-99.46,69.13],[-98.91,69.17],[-98.46,69.33],[-98.56,69.46],[-98.45,69.48],[-98.53,69.53],[-98.55,69.57],[-98.39,69.57],[-98.22,69.48],[-98.04,69.46],[-98.16,69.51],[-98.29,69.63],[-98.3,69.69],[-98.2,69.8],[-97.79,69.86],[-97.41,69.74],[-97.39,69.7],[-97.47,69.67]]],[[[-114.52,72.59],[-113.69,72.67],[-113.58,72.65],[-113.5,72.69],[-113.49,72.82],[-113.29,72.95],[-113.07,73.0],[-112.75,72.99],[-112.05,72.89],[-111.27,72.71],[-111.25,72.67],[-111.36,72.57],[-111.61,72.44],[-111.9,72.36],[-111.68,72.3],[-111.31,72.45],[-111.25,72.45],[-111.29,72.4],[-111.27,72.36],[-111.14,72.37],[-110.78,72.53],[-110.44,72.63],[-110.21,72.66],[-110.2,72.76],[-110.55,72.86],[-110.69,72.94],[-110.66,73.01],[-110.01,72.98],[-109.12,72.73],[-108.97,72.65],[-108.99,72.6],[-108.75,72.55],[-108.63,72.41],[-108.47,72.14],[-108.28,71.9],[-108.19,71.72],[-107.81,71.63],[-107.69,71.72],[-107.35,71.82],[-107.33,71.84],[-107.38,71.89],[-107.31,71.89],[-107.54,72.03],[-107.7,72.15],[-107.79,72.3],[-107.82,72.44],[-107.93,72.52],[-107.93,72.59],[-108.0,72.65],[-108.24,73.15],[-108.2,73.18],[-107.94,73.22],[-108.08,73.28],[-108.09,73.3],[-108.03,73.35],[-107.72,73.33],[-107.11,73.19],[-106.95,73.28],[-106.48,73.2],[-105.81,73.01],[-105.42,72.79],[-105.43,72.74],[-105.32,72.63],[-105.23,72.42],[-104.88,71.98],[-104.39,71.58],[-104.36,71.38],[-104.56,71.13],[-104.57,71.1],[-104.51,71.06],[-104.17,70.93],[-103.95,70.76],[-103.58,70.63],[-103.08,70.51],[-103.0,70.54],[-103.08,70.62],[-103.09,70.65],[-103.05,70.66],[-102.75,70.52],[-101.99,70.29],[-101.68,70.28],[-101.63,70.25],[-101.62,70.17],[-101.56,70.14],[-101.09,70.14],[-100.97,70.03],[-100.91,69.81],[-100.94,69.72],[-101.04,69.67],[-101.34,69.71],[-101.48,69.85],[-101.65,69.7],[-102.23,69.84],[-102.6,69.72],[-102.53,69.62],[-102.62,69.55],[-102.92,69.56],[-103.3,69.67],[-103.43,69.67],[-103.46,69.64],[-103.42,69.61],[-103.05,69.47],[-103.04,69.37],[-103.12,69.2],[-102.88,69.34],[-102.45,69.48],[-102.15,69.49],[-101.98,69.43],[-102.07,69.34],[-102.05,69.26],[-101.87,69.24],[-101.79,69.18],[-101.79,69.13],[-101.86,69.02],[-102.9,68.82],[-103.47,68.81],[-104.07,68.87],[-104.35,68.93],[-104.57,68.87],[-105.11,68.92],[-105.17,68.96],[-105.02,69.05],[-105.02,69.08],[-106.14,69.16],[-106.34,69.22],[-106.36,69.38],[-106.42,69.41],[-106.66,69.44],[-106.86,69.35],[-107.03,69.18],[-107.44,69.0],[-108.36,68.93],[-108.95,68.76],[-109.47,68.68],[-110.85,68.58],[-111.13,68.59],[-111.31,68.54],[-112.86,68.48],[-113.13,68.49],[-113.34,68.6],[-113.62,68.84],[-113.59,68.96],[-113.69,69.2],[-114.32,69.27],[-115.62,69.28],[-116.1,69.34],[-116.51,69.42],[-116.61,69.51],[-117.1,69.8],[-117.2,70.05],[-117.14,70.1],[-116.55,70.18],[-114.59,70.31],[-112.64,70.23],[-112.19,70.28],[-111.78,70.27],[-111.63,70.31],[-112.11,70.45],[-113.76,70.69],[-115.99,70.59],[-116.33,70.62],[-116.99,70.6],[-117.59,70.63],[-118.26,70.89],[-118.38,70.97],[-118.27,71.03],[-117.81,71.16],[-115.89,71.38],[-116.05,71.42],[-116.04,71.45],[-115.98,71.47],[-115.47,71.47],[-115.3,71.49],[-115.59,71.55],[-116.78,71.44],[-117.94,71.39],[-118.19,71.44],[-118.23,71.47],[-118.15,71.53],[-117.88,71.56],[-117.74,71.66],[-118.58,71.65],[-118.87,71.69],[-118.99,71.76],[-118.98,71.91],[-118.94,71.99],[-118.59,72.17],[-118.21,72.26],[-118.25,72.31],[-118.48,72.43],[-118.37,72.53],[-117.55,72.83],[-116.57,73.05],[-114.64,73.37],[-114.3,73.33],[-114.13,73.23],[-114.05,73.07],[-114.05,72.96],[-114.18,72.81]]],[[[-119.74,74.11],[-119.47,74.2],[-119.21,74.2],[-119.15,74.17],[-119.12,74.02],[-118.74,74.19],[-118.54,74.24],[-117.97,74.27],[-117.51,74.23],[-116.95,74.1],[-115.96,73.75],[-115.63,73.67],[-115.46,73.58],[-115.39,73.5],[-115.45,73.44],[-115.52,73.42],[-116.48,73.25],[-119.08,72.64],[-119.51,72.3],[-119.77,72.24],[-120.18,72.21],[-120.19,72.13],[-120.37,71.89],[-120.44,71.63],[-120.62,71.51],[-121.47,71.39],[-121.62,71.45],[-121.75,71.44],[-122.16,71.27],[-122.55,71.19],[-122.84,71.1],[-123.1,71.09],[-123.39,71.22],[-123.68,71.49],[-124.01,71.68],[-125.3,71.97],[-125.85,71.98],[-125.77,72.05],[-125.76,72.14],[-125.58,72.18],[-125.63,72.21],[-125.63,72.25],[-125.51,72.31],[-125.38,72.42],[-124.99,72.59],[-125.03,72.64],[-125.02,72.78],[-124.97,72.84],[-124.56,72.94],[-124.59,73.01],[-124.82,73.06],[-124.84,73.08],[-124.8,73.13],[-124.59,73.24],[-124.42,73.42],[-124.11,73.53],[-124.03,73.64],[-123.8,73.77],[-123.87,73.83],[-124.09,73.86],[-124.19,73.9],[-124.58,74.25],[-124.71,74.33],[-124.7,74.35],[-121.5,74.55],[-119.94,74.25],[-119.56,74.23],[-119.72,74.15]]],[[[-94.53,75.75],[-94.75,75.77],[-94.9,75.93],[-94.5,75.99],[-94.3,75.79]]],[[[-96.78,72.94],[-96.94,72.93],[-97.09,73.0],[-97.07,73.13],[-96.86,73.19],[-96.6,73.07],[-96.67,72.96]]],[[[-97.36,74.53],[-97.66,74.47],[-97.75,74.51],[-97.42,74.63],[-97.29,74.58]]],[[[-98.27,73.87],[-98.69,73.86],[-98.97,73.81],[-99.42,73.9],[-98.82,74.02],[-97.8,74.11],[-97.7,74.11],[-97.66,74.07],[-97.75,74.01]]],[[[-90.2,69.42],[-90.18,69.36],[-90.3,69.26],[-90.36,69.26],[-90.49,69.37],[-90.32,69.43]]],[[[-90.49,69.22],[-90.57,69.21],[-90.69,69.29],[-90.77,69.29],[-90.77,69.34],[-90.6,69.37],[-90.51,69.29]]],[[[-74.88,68.35],[-74.96,68.34],[-75.31,68.47],[-75.4,68.53],[-75.4,68.59],[-75.29,68.69],[-75.07,68.68],[-74.98,68.65],[-74.8,68.46],[-74.83,68.44],[-74.82,68.39]]],[[[-78.98,68.19],[-79.06,68.18],[-79.17,68.23],[-79.15,68.34],[-78.95,68.35],[-78.87,68.31],[-78.83,68.27]]],[[[-79.43,69.79],[-79.36,69.71],[-79.55,69.63],[-79.88,69.61],[-80.05,69.63],[-79.97,69.56],[-79.95,69.52],[-79.98,69.51],[-80.16,69.54],[-80.24,69.59],[-80.33,69.59],[-80.45,69.65],[-80.79,69.69],[-80.73,69.74],[-80.47,69.74],[-80.42,69.8],[-80.21,69.8],[-80.12,69.74],[-79.59,69.81]]],[[[-78.03,69.71],[-77.97,69.64],[-78.04,69.61],[-78.47,69.5],[-78.85,69.48],[-78.58,69.64],[-78.3,69.67],[-78.2,69.74]]],[[[-83.12,66.28],[-82.93,66.26],[-83.06,66.2],[-83.21,66.28],[-83.22,66.34]]],[[[-79.21,68.85],[-79.36,68.86],[-79.39,68.94],[-79.24,69.05],[-78.93,69.12],[-78.77,69.25],[-78.66,69.26],[-78.69,69.33],[-78.65,69.35],[-78.33,69.39],[-78.23,69.3],[-78.53,69.15],[-78.85,68.92]]],[[[-77.0,69.14],[-77.22,69.14],[-77.32,69.19],[-77.38,69.27],[-77.34,69.4],[-77.11,69.44],[-76.68,69.38],[-76.69,69.33]]],[[[-86.91,70.11],[-86.69,70.12],[-86.56,70.08],[-86.52,70.02],[-86.73,69.98],[-87.19,70.02],[-87.32,70.08],[-87.32,70.1],[-87.11,70.15]]],[[[-83.73,65.8],[-83.23,65.72],[-83.33,65.63],[-83.61,65.7],[-83.65,65.66],[-83.79,65.67],[-83.8,65.71],[-83.7,65.76],[-83.81,65.79],[-84.01,65.75],[-84.12,65.77],[-84.14,65.92],[-84.37,66.01],[-84.47,66.09],[-84.41,66.13],[-84.12,66.08],[-83.79,65.97],[-83.7,65.92],[-83.71,65.86],[-83.77,65.83]]],[[[-86.6,67.74],[-86.71,67.75],[-86.89,67.84],[-86.91,67.9],[-86.85,68.01],[-86.96,68.1],[-86.88,68.19],[-86.7,68.31],[-86.57,68.29],[-86.42,68.18],[-86.4,67.89],[-86.49,67.78]]],[[[-84.67,65.58],[-84.78,65.57],[-84.93,65.69],[-85.1,65.76],[-85.17,65.94],[-85.15,66.02],[-84.94,66.01],[-84.76,65.86],[-84.6,65.66]]],[[[-102.23,76.01],[-102.01,75.94],[-102.42,75.87],[-102.58,75.78],[-103.31,75.76],[-103.04,75.92],[-103.2,75.96],[-103.77,75.89],[-103.99,75.93],[-103.8,76.04],[-104.24,76.05],[-104.41,76.11],[-104.35,76.18],[-104.01,76.22],[-103.1,76.31],[-102.73,76.31],[-102.58,76.28],[-102.49,76.1]]],[[[-101.23,76.58],[-101.49,76.58],[-101.61,76.6],[-101.17,76.67],[-100.96,76.73],[-100.27,76.73]]],[[[-104.02,76.58],[-103.72,76.6],[-103.58,76.54],[-103.03,76.43],[-103.2,76.37],[-103.47,76.33],[-104.36,76.33],[-104.58,76.54],[-104.6,76.58],[-104.59,76.61],[-104.07,76.67],[-103.96,76.64]]],[[[-89.73,76.51],[-89.97,76.49],[-90.16,76.52],[-90.56,76.75],[-90.41,76.81],[-89.95,76.84],[-89.7,76.74],[-89.71,76.7],[-89.82,76.63],[-89.8,76.56]]],[[[-96.08,75.51],[-96.16,75.48],[-96.46,75.49],[-96.68,75.39],[-96.86,75.37],[-96.97,75.41],[-97.02,75.47],[-96.98,75.51],[-96.43,75.61],[-96.37,75.65],[-95.96,75.55]]],[[[-95.31,74.51],[-95.78,74.55],[-95.85,74.58],[-95.66,74.64],[-95.51,74.64],[-95.28,74.54]]],[[[-121.08,75.75],[-121.24,75.75],[-121.22,75.78],[-121.03,75.85],[-121.04,75.9],[-120.99,75.93],[-120.89,75.93],[-120.92,75.81]]],[[[-113.56,76.74],[-113.71,76.71],[-114.75,76.76],[-114.84,76.79],[-114.42,76.88],[-113.89,76.89],[-113.52,76.83],[-113.49,76.78]]],[[[-104.12,75.04],[-104.63,75.06],[-104.89,75.15],[-104.65,75.35],[-104.47,75.41],[-104.07,75.42],[-103.8,75.35],[-103.64,75.16],[-103.81,75.08]]],[[[-100.22,68.81],[-100.4,68.72],[-100.5,68.79],[-100.6,68.77],[-100.63,68.82],[-100.61,68.99],[-100.52,69.04],[-100.33,69.0],[-100.18,68.9]]],[[[-99.99,69.01],[-100.02,68.95],[-100.14,68.97],[-100.25,69.05],[-100.15,69.13],[-100.04,69.09]]],[[[-100.31,70.5],[-100.62,70.55],[-100.68,70.65],[-100.54,70.67],[-100.28,70.59],[-100.32,70.58]]],[[[-95.51,69.57],[-95.38,69.51],[-95.4,69.42],[-95.5,69.35],[-95.73,69.35],[-95.67,69.44],[-95.7,69.54],[-95.76,69.56],[-95.81,69.56],[-95.81,69.45],[-95.89,69.35],[-95.99,69.39],[-95.98,69.51],[-95.88,69.61],[-95.71,69.62]]],[[[-101.17,69.4],[-101.27,69.39],[-101.29,69.44],[-101.21,69.48],[-101.33,69.52],[-101.35,69.56],[-101.24,69.57],[-101.03,69.5],[-101.0,69.46]]],[[[-101.85,68.59],[-102.31,68.68],[-102.01,68.83],[-101.83,68.8],[-101.72,68.72],[-101.73,68.65]]],[[[-104.54,68.41],[-104.85,68.45],[-105.05,68.56],[-104.91,68.58],[-104.6,68.56],[-104.44,68.47],[-104.46,68.43]]],[[[-107.9,67.4],[-107.95,67.32],[-108.15,67.43],[-108.13,67.63],[-108.05,67.66],[-107.99,67.62],[-107.99,67.51],[-107.91,67.47]]],[[[-109.17,67.98],[-108.97,67.98],[-108.89,67.9],[-108.92,67.88],[-109.1,67.92],[-109.16,67.95]]],[[[-108.09,67.01],[-107.81,67.0],[-107.83,66.92],[-107.94,66.86]]],[[[-109.32,67.99],[-109.5,68.05],[-109.47,68.1],[-109.34,68.05]]],[[[-79.06,75.93],[-79.05,75.87],[-79.36,75.83],[-79.54,75.83],[-79.7,75.88],[-79.01,76.15],[-78.85,76.11],[-79.06,75.99]]],[[[-69.0,76.25],[-69.37,76.33],[-69.48,76.4],[-69.0,76.53],[-69.0,76.68],[-69.67,76.74],[-69.82,76.78],[-69.89,76.83],[-69.87,76.88],[-69.69,76.99],[-70.44,76.81],[-70.73,76.84],[-70.79,76.87],[-70.73,76.93],[-71.06,77.0],[-69.0,77.0]]]];
  const AFF=['相识','熟悉','心动','深爱'];
  function tierIdx(v){ v=Math.max(0,Math.min(100,+v||0)); return v<26?0:(v<51?1:(v<76?2:3)); }
  // 角色列表: 好感/心声等按人物字段的读取与兜底结构都从这里自动派生(见 zeroByCast/emptyByCast
  // 与下方 readMVU 的 mapByCast), 这部分改名/新增角色只改这一处就行, 不必逐个兜底对象手动同步。
  // 但 CAST 同时是全文十几处下游的角色名单单一数据源, 以下几处不是自动派生的, 改名/新增角色时要人工同步检查:
  // ①CAST 数组本身; ②画廊素材表 GAL(见该常量定义处)要有同名 key, 否则该角色的立绘位会静默返回空数组;
  // ③是否需要出现在狩猎同伴选择表 MATES/MATE_LABEL 里(见 renderHuntTab 附近); ④SHIP_ROOMS[].crew 等
  // 纯展示文案字段是不是还提着旧名字(不会报错, 但文案会和实际角色名对不上)。
  const CAST = ['富兰克林', '克洛泽', '菲茨', '瑙雅', '茜拉'];
  const zeroByCast = () => CAST.reduce((o, n) => { o[n] = 0; return o; }, {});
  const emptyByCast = () => CAST.reduce((o, n) => { o[n] = ''; return o; }, {});

  // 老聊天变量读取异常时的兜底: 结构与 BLANK 同构(全部中性空值), 只在地点字段直接给出可见提示。
  // 兜底数据刻意不像一份真实的中局存档: 写上具体好感/仪表数值会被玩家当成真实进度
  const DEFAULT = {
    时间: '', 地点: '航海日志读取异常，请刷新页面或切换聊天', 身处: '随队',
    物资: 0, 健康: 0, 士气: 0, 狩猎技巧: 0,
    好感: zeroByCast(), 心声: emptyByCast(),
    名册: {}, 回想: {},
  };
  // 尚未开始的空态: 新聊天初始化事件到达前用它占位, 避免闪现 DEFAULT 那份中局假数据
  const BLANK = {
    时间: '', 地点: '', 身处: '随队',
    物资: 0, 健康: 0, 士气: 0, 狩猎技巧: 0,
    好感: zeroByCast(), 心声: emptyByCast(),
    名册: {}, 回想: {},
  };
  // 四档档位表(高→低, [下限, 档名]). 消费方: bandNames() 给轨道按低→高排四个档名、
  // bandIdx() 给轨道算当前档序号; band() 取档名(当前无调用方, 保留备用)
  const BAND_TABLE={物资:[[75,'充裕'],[50,'渐紧'],[25,'匮乏'],[0,'枯竭']],健康:[[75,'全员健康'],[50,'零星减员'],[25,'病员成片'],[0,'十不存一']],士气:[[75,'高昂'],[50,'平稳'],[25,'低落'],[0,'崩溃']],狩猎技巧:[[75,'名猎手'],[50,'猎手'],[25,'学徒猎人'],[0,'生手']]};
  function band(v,t){const B=BAND_TABLE[t];for(const[m,n]of B)if(v>=m)return n;return B.at(-1)[1]}
  function bandNames(t){return BAND_TABLE[t].map(x=>x[1]).slice().reverse()}
  function bandIdx(v,t){const B=BAND_TABLE[t];for(let i=0;i<B.length;i++)if(v>=B[i][0])return B.length-1-i;return 0}
  // 档位轨道(好感条与三档仪表共用): 四档名各占等宽一格, 格子边界正好落在条上 25/50/75 三道刻度线上,
  // 已达的档位依次点亮。当前档由 .cur 着色, 具体颜色各条自己在 CSS 里给(好感走 --aff, 仪表走告警色)
  function trackHtml(names,tier){
    return `<div class="stat-track">${names.map((t,i)=>`<span class="stat-node ${i<tier?'reached':(i===tier?'cur':'')}">${t}</span>`).join('')}</div>`;
  }
  // 仪表四档质量色: 颜色本身不查 THEME_VARS 的 JS 对象(那样会在生成HTML那一刻把颜色"烤"成写死的hex,
  // 且切主题后已渲染的旧DOM不会跟着变), 而是直接把 var(--token) 字符串塞进生成的 style 属性里, 让浏览器
  // 按当前 data-theme 现算——地图 buildMarker 的 style="color:${col}" 也是同一个套路。
  function mcol(v){return v>=75?'linear-gradient(90deg,var(--meter-good-a),var(--meter-good-b))':v>=50?'linear-gradient(90deg,var(--meter-mid-a),var(--meter-mid-b))':v>=25?'linear-gradient(90deg,var(--meter-warn-a),var(--meter-warn-b))':'linear-gradient(90deg,var(--meter-bad-a),var(--meter-bad-b))'}
  // segs: 分段格条工具, 当前无调用方(船员页减员统计条由 rosterStatHtml 自拼 .seg), 保留备用
  function segs(val,max){let h='';for(let i=0;i<max;i++)h+=`<span class="seg ${i<val?'on':''}"></span>`;return `<div class="segs">${h}</div>`}
  // opts: frozen=冻结态(冰蓝封存) delta=较上一楼变化量(冻结时不显示) skill=成长型仪表(金色填充, 无告警色)
  function meter(D,t,opts){
    const o=opts||{};
    const v=D[t];
    const skill=t==='狩猎技巧'||o.skill;
    const warn=o.frozen?' frozen':(skill?'':v<25?' grave':v<50?' warn':'');
    const ticks=[25,50,75].map(p=>`<span class="meter-tick" style="left:${p}%"></span>`).join('');
    // 档名从抬头挪到了条下的轨道里(与好感条统一), 抬头那一格只剩冻结态提示, 平时留空当撑开数字的弹性位
    const bandHtml=o.frozen?`${ICO.frost}<span>远征队失联</span>`:'';
    const d=(!o.frozen&&o.delta)?`<span class="meter-delta ${o.delta>0?'up':'down'}">${o.delta>0?ICO.up:ICO.down}${Math.abs(o.delta)}</span>`:'';
    const fill=skill?'linear-gradient(90deg,var(--gold-mid),var(--gold-deep))':mcol(v);
    return `<div class="meter${warn}" data-stat="${t}"><div class="meter-line"><span class="meter-ico">${ICONS[t]}</span><span class="meter-name">${t}</span><span class="meter-band">${bandHtml}</span>${d}<span class="meter-num">${v}</span></div><div class="meter-bar"><div class="meter-fill" style="width:${Math.max(0,Math.min(100,v))}%;background:${fill}"></div>${ticks}</div>${trackHtml(bandNames(t),bandIdx(v,t))}</div>`;
  }
  // 把 stat_data.地点 首段匹配到某个兴趣点。和 regionIdxOf/REGION_ALIAS 一样用 includes() 子串模糊匹配
  // (key/别名互相 includes), 新地点/别名如果是已有 key 或别名的子串或超串, 会被错误匹配, 加之前先人工排查。
  function poiOf(loc){const seg=((loc||'').split(/[·・]/)[0]||'').trim();if(!seg)return null;return POI.find(p=>p.key===seg||p.key.includes(seg)||seg.includes(p.key)||(p.别名||[]).some(a=>seg.includes(a)||a.includes(seg)))||null;}
  // 把 stat_data.地点 的小地点段(最后一段)匹配到某个船内舱室; 只有三段式地点(地区·大地点·小地点)才尝试匹配, 离船场景(两段式)天然不命中
  // 同样是 includes() 子串模糊匹配(key/别名互相 includes), 新舱室/别名要检查是否与现有 key 有子串重叠风险。
  function roomOf(loc){const parts=(loc||'').split(/[·・]/).map(s=>s.trim()).filter(Boolean);if(parts.length<3)return null;const seg=parts[parts.length-1];if(!seg)return null;return SHIP_ROOMS.find(r=>r.key===seg||r.key.includes(seg)||seg.includes(r.key)||(r.别名||[]).some(a=>seg.includes(a)||a.includes(seg)))||null;}
  // 三个常用的"API可能不存在/跨iframe访问可能抛错"兜底封装, 收敛掉全文件里大量重复的 try/catch 空壳；
  // 读失败返回 null, 写失败静默丢弃, 不打日志
  function safeLastMessageId() { try { return getLastMessageId(); } catch (e) { return null; } }
  function safeLSGet(key) { try { return window.parent.localStorage.getItem(key); } catch (e) { return null; } }
  function safeLSSet(key, val) { try { window.parent.localStorage.setItem(key, val); } catch (e) {} }

  // ════ 状态变量(立绘选取与角色选中态) ════
  // 角色页: Tabs 切换角色, 左立绘 + 右属性容器 (CAST 定义在前面的数据表分区, 供 DEFAULT/BLANK/readMVU 复用)
  const isDeadTag = v => v === '死亡' || v === '死'; // 死亡判定统一口径: 好感(角色页/画廊)与名册(船员页)共用
  let charSel=null;      // 当前选中的角色 tab, 跨重渲染保留

  // ── 立绘选图: 固定(pins)优先, 否则稳定随机(snap) ──
  // pins 存 localStorage(只存用户固定的那张); snap 仅内存, 进页随机定一张后缓存, 跨 renderAll 不闪动
  // 兼容既有玩家数据: localStorage 里的 pins 可能带有已移除功能存下的多余字段(如 back:[…]), loadPins 归一化时静默丢弃
  function loadPins(){let p={};try{const raw=window.parent.localStorage.getItem(LS_KEYS.pins);const parsed=raw?JSON.parse(raw):null;if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))p=parsed;}catch(e){}CAST.forEach(n=>{p[n]={front:(p[n]&&typeof p[n]==='object'&&p[n].front)||null};});return p;}
  function savePins(){safeLSSet(LS_KEYS.pins,JSON.stringify(pins));}
  let pins=loadPins();
  const snap={};         // {角色:{front:url}} 随机快照, 跨重绘保留、不落盘
  function snapOf(name){return snap[name]||(snap[name]={front:null});}
  function normalPool(name){const g=GAL[name];return g?g.normal.reduce((a,t)=>a.concat(t.imgs),[]):[];}
  function pick(arr){return arr.length?arr[Math.floor(Math.random()*arr.length)]:'';}
  // 按字符串确定性取伪随机数(mulberry32), 供"每楼随机"按楼层号播种用: 同一楼层刷新/重进结果不变, 换楼层才变
  function seededRand(seedStr){let h=2166136261;for(let i=0;i<seedStr.length;i++){h^=seedStr.charCodeAt(i);h=Math.imul(h,16777619);}let t=h>>>0;t|=0;t=(t+0x6D2B79F5)|0;let r=Math.imul(t^(t>>>15),1|t);r=(r+Math.imul(r^(r>>>7),61|r))^r;return((r^(r>>>14))>>>0)/4294967296;}
  function pickSeeded(arr,seedStr){return arr.length?arr[Math.floor(seededRand(seedStr)*arr.length)]:'';}
  function frontImg(name){const p=pins[name]&&pins[name].front;if(p)return p;const s=snapOf(name);if(!s.front)s.front=pick(normalPool(name));return s.front;}
  // 每楼随机(设置页开关): 楼层号变了就重掷全员随机快照; 画廊里固定过的坑位仍以 pins 优先, 不受影响
  let heroRollId=null;
  function maybeRerollHero(){
    if(heroMode!=='rand')return;
    const lid=safeLastMessageId();
    if(lid==null||lid===heroRollId)return;
    heroRollId=lid;
    CAST.forEach(n=>{const s=snapOf(n);s.front=pickSeeded(normalPool(n),lid+':'+n+':front');});
  }

  // ════ MVU读取与派生(readMVU/currentStat/previousStat) ════
  // 最新 stat_data 快照, 由变量事件写入。不能在事件里 getAllVariables() 重读: 那时 MVU 尚未持久化, 会读到旧值
  let lastStat = null;
  let prevStat = null;       // 上一楼变量: 由变量事件的 variables_before_update 写入
  const varFold = {};        // 变量页各折叠区开合状态(key->bool, 跨重绘保留)
  function currentStat() {
    if (lastStat) return lastStat;
    try {
      if (typeof getVariables === 'function') {
        const v = getVariables({ type: 'message', message_id: 'latest' });
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) {}
    try {
      if (typeof getAllVariables === 'function') {
        const v = getAllVariables();
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) {}
    // 第0楼阶段: 变量尚未落库时, 用 MVU 预算进 swipes_data 的当前 swipe 初值(开场面板 swipe 无数据则继续走空态)
    try {
      if (typeof getLastMessageId === 'function' && getLastMessageId() === 0 && typeof getChatMessages === 'function') {
        const m0 = getChatMessages(0, { include_swipes: true })[0];
        const sd = m0 && m0.swipes_data && m0.swipes_data[m0.swipe_id || 0];
        if (sd && sd.stat_data) return sd.stat_data;
      }
    } catch (e) {}
    return null;
  }
  // 上一楼变量: 优先用事件缓存的 prevStat; 无(如刚进聊天)则读上一楼(lastId-1)的消息作用域快照
  function previousStat() {
    if (prevStat) return prevStat;
    try {
      const lastId = getLastMessageId();
      if (typeof getVariables === 'function' && lastId != null && lastId >= 1) {
        const v = getVariables({ type: 'message', message_id: lastId - 1 });
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) {}
    return null;
  }
  // 前端读取 MVU 变量的统一入口, 返回值 R 的完整字段形状(对照下方 DEFAULT/BLANK 两个兜底字面量):
  //   时间/地点/身处: string（地点为「区块 · 大地点 · 小地点」三段式, 区块即海图分区, 直接编码在地点首段, 没有独立的区域变量）
  //   物资/健康/士气/狩猎技巧: number(已夹到 0~100)
  //   好感: {角色名: number} —— 唯一例外是标记死亡的角色, 值是字符串 '死亡'(用 isDeadTag 判断, 不能当数字用)
  //   心声: {角色名: string}
  //   名册/回想: object, 结构不固定, 原样透传 stat_data 里的同名字段
  // 取数据源走多层兜底(在下方 currentStat() 里实现): 事件缓存的 lastStat → getVariables → getAllVariables
  // → 第0楼 swipe 初值, 全部拿不到就是 null; readMVU 自己再按"聊天是否已经开始"分两种空态兜底:
  // 老聊天读取失败回 DEFAULT(地点字段带可见的错误提示), 全新聊天/第0楼回 BLANK(纯空值, 不冒充中局数据)。
  function readMVU(sdArg) {
    try {
      const sd = sdArg || currentStat();
      if (sd) {
        const g = (p, d) => {
          const x = (typeof _ !== 'undefined' && _.get) ? _.get(sd, p) : p.split('.').reduce((a, k) => a == null ? a : a[k], sd);
          return (x === undefined || x === null || x === '') ? d : x;
        };
        const cl = v => Math.max(0, Math.min(100, v));
        // 好感/心声按 CAST 逐人取值, 而不是每个字段各写5个人名: 新增角色时这里自动跟着 CAST 走
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
        // 显示双保险: 营地期间三仪表钉在上一楼的冻结值, 消除离队冻结脚本回滚落库前的一帧脏数据
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
    // 兜底分级: 已发言的老聊天读取异常才回 DEFAULT; 新聊天(第0楼/空聊天)回 BLANK 空态, 不冒充中局数据
    const lid = safeLastMessageId();
    if (lid != null && lid >= 1) return DEFAULT;
    return BLANK;
  }

  // ════ 外壳骨架与切页(ensureShell/switchTab) ════
  function getPanel(name) {
    return doc.querySelector('#exp-shell-root .exp-panel[data-panel="' + name + '"]');
  }

  // 侧栏 nav 列表 + 主区面板容器骨架; 由 PANELS 驱动生成, ensureShell 只负责挂载与状态同步
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

    // 仅带 data-tab 的是面板导航; 数据库入口(data-ext="acu")是动作按钮, 点了不切页, 单独绑
    root.querySelectorAll('.exp-nav-item[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        // 点"开场白"总是回到卡片网格: 自定义表单的第二条退出路径(第一条是表单顶部的"返回")。
        // 已在开场白页时 switchTab 会因同页早退不重绘, 这里先自行落回卡片视图
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

  // ---- 数据库插件入口(ACU/神·数据库/SP·数据库) ----
  // 该插件以酒馆助手脚本运行时处于自己的 iframe 里, 会把对外 API 挂到酒馆主窗口
  // (即本脚本的 window.parent)上; 它的新版主界面/旧版设置弹窗都挂在 parent 文档 body 下,
  // z-index 在 10000/100000+ 一档, 天然盖在本外壳(9000)之上, 不需要为它让层级。
  function acuApi() {
    try { return window.parent.AutoCardUpdaterAPI || null; } catch (e) { return null; }
  }

  // 检测口径: 主 API 对象或插件注册进魔术棒菜单的新UI入口, 任一存在即视为"装了插件"
  function acuPresent() {
    return !!(acuApi() || doc.getElementById('acu-v2-menu-item'));
  }

  // 显隐走根元素 data-acu 属性 + CSS 属性选择器, 与 fontMode/sfwMode 同一套模式
  function updateAcuNav() {
    const root = doc.getElementById(SHELL_ID);
    if (!root) return;
    if (acuPresent()) root.setAttribute('data-acu', '');
    else root.removeAttribute('data-acu');
  }

  // 插件是 6MB 的远程 bundle, 加载与初始化大概率晚于本脚本; init 后轮询补检一段时间,
  // 超时后放弃轮询, 交给每次开壳时的 updateAcuNav 兜底。iframe 销毁时定时器随之消亡, 不需清理
  let acuPollLeft = 30;
  function pollAcu() {
    updateAcuNav();
    if (!acuPresent() && --acuPollLeft > 0) setTimeout(pollAcu, 2000);
  }

  // 数据库入口的选中高亮: 插件界面开着时入口亮起(与面板导航同一套 .active 样式), 关掉后还给当前面板。
  // 插件没有"界面关闭"事件可听, 靠轮询 acuUiOpen 探测; 定时器随 iframe 销毁自动消亡, 不需 pagehide 清理
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
      // 高亮还给当前面板; 若期间玩家切过页, switchTab 已自己点亮目标项, 这里的 toggle 与之收敛一致
      const cur = root.querySelector('.exp-panel.active');
      const name = cur ? cur.dataset.panel : null;
      root.querySelectorAll('.exp-nav-item[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    }
  }

  // 收回高亮的探测: 插件界面挂载可能是异步的(懒加载 Vue 应用), 所以先等它出现过一次(seen)再按"关闭"收回;
  // 一直没出现(打开失败)则 ~10s 兜底收回, 高亮不会永远挂着
  function watchAcuClose() {
    if (acuHiTimer) clearInterval(acuHiTimer);
    let seen = false, tries = 0;
    acuHiTimer = setInterval(() => {
      if (acuUiOpen()) { seen = true; return; }
      if (seen || ++tries > 25) {
        clearInterval(acuHiTimer); acuHiTimer = null;
        setAcuNavActive(false);
      }
    }, 400);
  }

  function openAcuUI() {
    try {
      // 首选与魔术棒同款的入口: 插件注册在 parent 文档里的「SP·数据库」菜单项(打开新版主界面)。
      // 其 click 处理器在魔术棒菜单未展开时会直接开界面, 不需要先把菜单弹出来
      const v2 = doc.getElementById('acu-v2-menu-item');
      if (v2) { v2.click(); }
      else {
        const api = acuApi();
        if (api && typeof api.openSettings === 'function') api.openSettings(); // 兜底: 旧版设置弹窗
        else return;
      }
      setAcuNavActive(true); // 点击即点亮, 与面板导航一致; 打开失败/界面关闭由下面的探测收回
      watchAcuClose();
    } catch (e) { console.warn('[航海日志] 打开数据库插件界面失败', e); }
  }

  // 数据库插件的界面(新UI #acu-app-v2 / 旧UI弹窗)开着时, 本外壳的快捷键整体让行
  function acuUiOpen() {
    const v2 = doc.getElementById('acu-app-v2');
    if (v2 && v2.style.display !== 'none') return true;
    return !!doc.querySelector('.auto-card-updater-popup');
  }

  // 单页渲染隔离: 某一页渲染抛错不连累其余页面/整个外壳。panel 原本有内容(如变量事件触发的重绘)时保留旧内容;
  // panel 还是空的(首次渲染就失败, 否则会一直黑屏/白屏)才写兜底文案。switchTab 与 renderAll 共用。
  // 报错文案严格遵循 PANELS 里 label+'页' 这个拼接规律(已核实全部现有面板零例外), 不再单独维护一份文案表。
  function renderSafe(key, fn) {
    try { fn(); } catch (e) {
      const def = PANELS.find(p => p.key === key);
      console.warn('[航海日志] ' + (def ? def.label + '页' : key) + ' 渲染失败, 该页保留上次内容', e);
      const panel = getPanel(key);
      if (panel && !panel.childElementCount) panel.innerHTML = '<div class="exp-tab-error">本页渲染失败，请重试或反馈给作者</div>';
    }
  }

  // 切走正文页时的阅读位置。面板是 display:none 显隐, 隐藏期间元素没有布局, scrollTop 会被浏览器
  // 归零, 切回来就滚到顶了 —— 所以必须自己存一份。renderStoryLog 内部那套 prevTop 只管重绘, 管不到切页。
  let storyScroll = null;

  function switchTab(name) {
    const root = doc.getElementById(SHELL_ID);
    if (!root) return;
    const cur = root.querySelector('.exp-panel.active');
    if (cur && cur.dataset.panel === name) return; // 重复切当前页: 不重绘不重播入场
    if (cur && cur.dataset.panel === 'story') {
      const log = doc.getElementById(SEL.storyLog);
      // 贴底时存 null: 期间可能来了新楼层, 回来该看最新的, 不是当时那个像素位置
      storyScroll = (log && !nearBottom(log)) ? log.scrollTop : null;
    }
    closeDiffPanel(); // 离开正文页时收起变量摘要面板
    if (delMode) setDelMode(false); // 删楼选择态只在正文页有意义, 切走时一并退出, 避免切回来后输入框仍被隐藏
    root.querySelectorAll('.exp-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    root.querySelectorAll('.exp-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    // 切到自绘状态页时按当前变量重绘一次, 避免显示陈旧内容: renderAll 平时只重绘当前可见页(见其注释), 其余页还停留在上次离开时的状态
    // story/settings 的 render 是 null(见 PANELS 定义处注释), 不受 stat_data 驱动, 这里自然跳过不重绘
    const D = readMVU();
    const panelDef = PANELS.find(p => p.key === name);
    if (panelDef && panelDef.render) renderSafe(name, () => panelDef.render(D));
    if (name === 'story') {
      const log = doc.getElementById(SEL.storyLog);
      if (log) { log.scrollTop = storyScroll == null ? log.scrollHeight : storyScroll; updateJumpBtn(); }
    }
    safeLSSet(LS_KEYS.tab, name); // 记住最后所在页, 重进外壳时恢复
    if (!bootAnimating) animateTab(name); // 进场序列期间由 playShellEnter 统一编排, 这里不抢跑
  }

  // ════ 动效工具(入场动画/外壳进出编排/数值变化反馈) ════
  // ---- 动效工具 ----
  // 入场类动画只在这里和 playShellEnter 触发; renderAll 重建的 DOM 不带动画类, 变量重绘永不重放。
  // 动画状态存模块级变量, 与 charSel 同款, 重绘不重置。
  let bootAnimating = false;

  const STAG_MAX = 12; // 只 stagger 首屏, 超出的元素直接可见, 长列表不受拖累

  function animateTab(name, isBoot) {
    if (!motionOK()) return;
    const panel = getPanel(name);
    if (!panel) return;
    panel.querySelectorAll('.exp-in').forEach(el => { el.classList.remove('exp-in', 'exp-boot-lead'); el.style.removeProperty('--i'); });
    // 各页入场 stagger 的目标元素来自 PANELS 的 stagSel 字段, 未登记的页退回面板直接子元素
    const stagSel = (PANELS.find(p => p.key === name) || {}).stagSel;
    const els = Array.from(panel.querySelectorAll(stagSel || ':scope > *')).slice(0, STAG_MAX);
    els.forEach((el, i) => {
      el.style.setProperty('--i', i);
      if (isBoot) el.classList.add('exp-boot-lead');
      el.classList.add('exp-in');
      el.addEventListener('animationend', function h(e) {
        if (e.target !== el) return; // 子元素动画结束事件会冒泡上来, 不能提前清类
        el.classList.remove('exp-in', 'exp-boot-lead');
        el.style.removeProperty('--i');
        el.removeEventListener('animationend', h);
      });
    });
  }

  // 页内二级切换(角色页/画廊页的角色Tab等): 比整页入场更轻更快的 stagger
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

  // 一次性反馈动画: 加类播放, 结束(或超时兜底)后移除, 供重复触发
  function animateOnce(el, cls, timeout) {
    if (!el || !motionOK()) return;
    el.classList.remove(cls);
    void el.offsetWidth; // 强制 reflow, 连续触发时动画能重启
    el.classList.add(cls);
    const clear = () => el.classList.remove(cls);
    el.addEventListener('animationend', function h(e) { if (e.target !== el) return; clear(); el.removeEventListener('animationend', h); });
    setTimeout(clear, timeout || 1200);
  }

  // 行动选项依次浮现: 只由 runGeneration 结束路径调用
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

  // ---- 外壳进出编排 ----
  // 进入: 暗场覆盖层上罗盘徽标先亮相, 侧栏/顶栏/当前面板依次入场(时序全在 CSS 的 exp-entering 规则里)。
  // 只走 toggleShell 的进入分支; init() 的 applyVisibility(prevVisible) 路径不播, 脚本重跑/切聊天不重演。
  let bootTimer = null, leaving = false;

  function playShellEnter() {
    if (!motionOK()) { bootAnimating = false; return; }
    const root = doc.getElementById(SHELL_ID);
    if (!root) { bootAnimating = false; return; }
    if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
    const stale = root.querySelector('.exp-boot');
    if (stale) stale.remove();
    root.classList.remove('exp-entering');
    void root.offsetWidth; // 快速退出再进入时让 CSS 动画重启
    const veil = doc.createElement('div');
    veil.className = 'exp-boot';
    veil.innerHTML = `<div class="exp-boot-mark"><div class="exp-boot-title">富兰克林远征</div><div class="exp-boot-sub">The Franklin Expedition</div></div>`;
    root.appendChild(veil);
    root.classList.add('exp-entering');
    // 面板子元素接在侧栏/顶栏之后入场(delay 走 --boot-lead)
    const active = root.querySelector('.exp-panel.active');
    animateTab(active ? active.dataset.panel : 'story', true);
    bootTimer = setTimeout(() => {
      bootTimer = null;
      bootAnimating = false;
      root.classList.remove('exp-entering');
      const v = root.querySelector('.exp-boot');
      if (v) v.remove();
    }, 1250); // 略长于 --dur-boot, 定时器兜底不依赖 animationend
  }

  // 退出: 整体快速淡出后才真正隐藏; 定时器与 --dur-exit 对齐
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

  // ---- 数值变化反馈 ----
  // 变量事件里 diff 出变化条目 → renderAll 重建 DOM → playStatFx 按 data-stat 定位新 DOM 播放。
  // 初始化事件(mag_variable_initiailized)不设 delta, 首屏不脉冲。
  let statDelta = null;

  // 摘要 diff 表: 每条 value 是 {from,to}(数值型变化) 或 {text:true}(文本型变化, 只标记"变了", 不给具体差值)。
  // key 命名和下方 buildDiffRows 之间是一份隐式契约: 数值型字段直接用字段名(如 '物资'),
  // 角色相关字段拼成 '好感.'+角色名 / '心声.'+角色名 这种形式, 两处必须完全一致 ——
  // 格式对不上时对应的摘要行会静默从 Δ 面板消失, 不会报错, 很难排查。
  function diffStat(prevD, curD) {
    if (!prevD || !curD) return null;
    const out = {};
    ['物资', '健康', '士气', '狩猎技巧'].forEach(k => {
      const a = +prevD[k], b = +curD[k];
      if (Number.isFinite(a) && Number.isFinite(b) && a !== b) out[k] = { from: a, to: b };
    });
    CAST.forEach(n => {
      [['好感', prevD.好感, curD.好感]].forEach(([g, pa, ca]) => {
        const a = +((pa || {})[n]), b = +((ca || {})[n]); // '死亡' 等字符串 → NaN, 自动跳过
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

  // rAF 自写数字补间: 用父窗口 rAF(DOM 在父文档), 起点取首帧时间戳, 不与 iframe 时间原点混算
  function tweenNumber(el, from, to, dur) {
    const raf = cb => (window.parent.requestAnimationFrame || requestAnimationFrame)(cb);
    let t0 = null;
    const step = t => {
      if (!el.isConnected) return; // 中途又被重建 → 放弃, 新 DOM 已是终值
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) raf(step);
    };
    raf(step);
  }

  // 回合变量变化摘要: 输入区 Δ 按钮按需上拉查看最近一次 diff, 红绿沿用仪表涨跌配色
  let lastDelta = null;

  // 消费 diffStat 产出的 key: 数值字段名直接对应, 角色字段靠 '好感.'+角色名 这类拼接对应 ——
  // 和 diffStat 共用同一份隐式 key 格式约定, 改一处务必同步改另一处(参见 diffStat 函数上方注释)。
  function buildDiffRows(d) {
    const rows = [];
    const push = (label, ch) => {
      if (!ch) return;
      if (ch.text) { rows.push('<span class="dim"><b>' + label + '</b>已更新</span>'); return; }
      const dv = ch.to - ch.from;
      rows.push('<span class="' + (dv > 0 ? 'up' : 'down') + '"><b>' + label + '</b>' + (dv > 0 ? '+' : '-') + Math.abs(dv) + '</span>');
    };
    ['物资', '健康', '士气', '狩猎技巧'].forEach(k => push(k, d[k]));
    CAST.forEach(n => { push(n + '·好感', d['好感.' + n]); push(n + '·心声', d['心声.' + n]); });
    ['地点', '时间'].forEach(k => push(k, d[k]));
    return rows;
  }

  function onDiffOutside(e) {
    const el = doc.getElementById(SEL.storyDiffpanel);
    const btn = doc.getElementById(SEL.storyDiff);
    if (!el) return;
    if (el.contains(e.target) || (btn && btn.contains(e.target))) return;
    closeDiffPanel();
  }

  function closeDiffPanel() {
    const el = doc.getElementById(SEL.storyDiffpanel);
    if (el) el.remove();
    doc.removeEventListener('click', onDiffOutside);
  }

  function toggleDiffPanel() {
    if (doc.getElementById(SEL.storyDiffpanel)) { closeDiffPanel(); return; }
    const story = doc.querySelector('#exp-shell-root .exp-story');
    if (!story) return;
    // 事件缓存为空时(如重进外壳)按前后楼变量现算兜底
    const d = lastDelta || ((prevStat && lastStat) ? diffStat(readMVU(prevStat), readMVU(lastStat)) : null);
    const rows = d ? buildDiffRows(d) : [];
    const el = doc.createElement('div');
    el.id = SEL.storyDiffpanel;
    el.className = 'exp-diff-panel';
    el.innerHTML = '<div class="exp-diff-head">本回合 · 变量记录</div>' + (rows.length ? rows.join('') : '<span class="dim">本回合还没有变量变化</span>');
    story.appendChild(el);
    // 定位: 底边贴输入区上边, 水平中心对齐 Δ 按钮; 上树后才有实宽, 量完夹取防出界
    const btn = doc.getElementById(SEL.storyDiff);
    const input = doc.querySelector('#exp-shell-root .exp-story-input');
    if (btn && input) {
      const sr = story.getBoundingClientRect(), br = btn.getBoundingClientRect(), ir = input.getBoundingClientRect();
      const w = el.offsetWidth;
      const center = br.left + br.width / 2 - sr.left;
      el.style.left = Math.max(10, Math.min(center - w / 2, sr.width - w - 10)) + 'px';
      el.style.bottom = (sr.bottom - ir.top) + 'px';
    }
    doc.addEventListener('click', onDiffOutside); // 点面板与按钮以外处收起; 开面板的这次点击被按钮判定挡掉
  }

  function playStatFx() {
    const d = statDelta;
    statDelta = null; // 一次性消费
    if (!d || !isShellVisible()) return;
    if (!motionOK()) return;
    const root = doc.getElementById(SHELL_ID);
    if (!root) return;
    animateOnce(doc.getElementById(SEL.storyDiff), 'exp-pulse'); // 提示本回合有变化可查
    Object.entries(d).forEach(([key, ch]) => {
      root.querySelectorAll('[data-stat="' + key + '"]').forEach(box => {
        // 隐藏页(如角色页的好感格子)不在当前激活面板里, 跳过强制reflow+补间; 顶栏的地点/时间不属于任何 .exp-panel, 不受影响
        const panel = box.closest('.exp-panel');
        if (panel && !panel.classList.contains('active')) return;
        if (ch.text) { animateOnce(box, box.classList.contains('exp-tb-item') ? 'exp-tb-flash' : 'exp-fade-in'); return; }
        if (box.classList.contains('frozen')) return; // 营地冻结仪表钉在旧值, 不该闪
        const num = box.querySelector('.cell-num,.meter-num');
        // 只在显示值确为新值时补间, 防止对着 '—'(已故) 之类的占位滚数字
        if (num && num.textContent.trim() === String(ch.to)) tweenNumber(num, ch.from, ch.to, 500);
        const fill = box.querySelector('.fill,.meter-fill');
        if (fill) { // 重建的进度条没有过渡起点: 先无动画回置旧宽, 再放行过渡到新宽
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
  // 设置页: 主题切换。完整变量组在 SHELL_CSS 的 data-theme 块里, 这里只列名称与色板
  const THEMES = [
    { key: 'dark', name: '黑金远征', desc: '默认深色，午夜甲板上的黄铜灯' },
    { key: 'arctic', name: '极夜冰海', desc: '深蓝夜海，冷金是月照的浮冰' },
    { key: 'parchment', name: '羊皮纸海图', desc: '陈年纸面青墨批注，金箔作边' },
    { key: 'ivory', name: '象牙皇家蓝', desc: '象牙白配海军蓝侧栏，黄铜纽扣的帝国制服' },
    { key: 'marble', name: '大理石鎏金', desc: '冷灰石面配鎏金与酒红，军官沙龙的内饰' },
  ];
  let theme = 'dark';
  { const t = safeLSGet(LS_KEYS.theme); if (t && THEMES.some(x => x.key === t)) theme = t; }

  // 设置页: 行动选项点击行为。send=点选即发送, insert=填入输入框可改后再发
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

  // 设置页: 正文字号。std=默认, lg/xl 逐档放大, 属性挂根元素由 CSS 覆写字号
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

  // 设置页: 动画效果。full=完整动效, lite=减弱(CSS令牌归零 + JS编排全跳过)
  const MOTION_MODES = [
    { key: 'full', name: '全部动效', desc: '进场、切页、数值反馈等完整动画' },
    { key: 'lite', name: '减弱动效', desc: '关闭入场与反馈动画，仅保留即时响应' },
  ];
  let motionMode = 'full';
  { const m = safeLSGet(LS_KEYS.motion); if (MOTION_MODES.some(x => x.key === m)) motionMode = m; }

  // data-motion="off" 挂根与入口两处(入口胶囊不在外壳树内), CSS 令牌归零全靠它
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

  // JS 侧动画统一闸门: 减弱模式或系统减弱偏好时, 所有 JS 编排的动画直接跳过(静态渲染已是终值)
  function motionOK() {
    if (motionMode !== 'full') return false;
    try { if (window.parent.matchMedia('(prefers-reduced-motion:reduce)').matches) return false; } catch (e) {}
    return true;
  }

  // 设置页: 内容分级(SFW/NSFW)。sfw 时遮蔽画廊 NSFW 主题图, 全靠根属性 data-sfw 命中 CSS
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
    renderAll(true);   // 全量重建各页 DOM, 各处按新主题变量重新取色渲染
    renderSettingsTab();
    animateOnce(root, 'exp-theme-fade'); // 柔化整树重建的跳变
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
  // 回想条目「标题 · 年月 · 一句白描」: 切前两段, 余下合并为白描; 不足三段整条当白描, 容错模型不守格式
  function memoHtml(entry) {
    const parts = String(entry).split(/\s*[·・]\s*/);   // 兼容日文中点与无空格写法, 重组时统一回「 · 」
    if (parts.length >= 3) {
      return `<div class="memo-item"><div class="memo-head">${escapeHtml(parts[0])} · ${escapeHtml(parts[1])}</div><div class="memo-text">${escapeHtml(parts.slice(2).join(' · '))}</div></div>`;
    }
    return `<div class="memo-item"><div class="memo-text">${escapeHtml(String(entry))}</div></div>`;
  }

  // 窄屏上 tabs 放不下会横向滚动, 而每次切角色都是整段重绘 innerHTML, scrollLeft 会归零 ——
  // 点了最右边的茜拉却把视图弹回最左、选中项看不见。重绘后把选中项摆回可视区中间(内容没溢出时是空操作)。
  // 手写 scrollLeft 而不是 scrollIntoView: 后者可能连带滚动祖先容器(外壳在 iframe 里, 影响面不可控)
  function keepActiveTabVisible(panel) {
    const el = panel.querySelector('.exp-char-tab.active');
    const box = el && el.parentElement;
    if (!box || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft = Math.max(0, el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2);
  }

  // 角色/画廊页顶部共用的角色 Tabs: 判定已故 + 修正 charSel 落点 + 生成 tabs 标签markup,
  // 两处渲染函数共用同一份逻辑, 不各自维护一份, 避免日久走样
  // 故意如此(已与作者核实): 下面这行的修复优先级(任意存活→CAST[0])只在 charSel 还没选过
  // (null)或者指向了非法角色名时才生效, 只会在会话最开始触发一次。角色死亡不会把她移出 CAST 数组,
  // 所以中途死亡不会让 charSel 自动跳到别的角色——这是有意为之: 死亡不该打断玩家正在看的角色页,
  // 只是外观上叠加"已故"态。不要因为看着像遗漏就改成"每次渲染都重新校验存活状态"。
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
    // 较上一楼的好感变化(与船员页三仪表同一套写法): 死亡态、上一楼没数据、上一楼是'死亡'字符串(取值NaN)三种情况都不显示
    const pvAff = dead ? NaN : +_.get(previousStat() || {}, '好感.' + name);
    const affDelta = isNaN(pvAff) ? 0 : affVal - Math.max(0, Math.min(100, pvAff));
    const affTicks = [25, 50, 75].map(p => `<span class="meter-tick" style="left:${p}%"></span>`).join('');
    const deltaHtml = affDelta ? `<span class="meter-delta ${affDelta > 0 ? 'up' : 'down'}">${affDelta > 0 ? ICO.up : ICO.down}${Math.abs(affDelta)}</span>` : '';
    const front = frontImg(name);
    const voice = String((D.心声 || {})[name] || '').trim();
    // 每人至多10条(世界书规则约束模型insert时自行移除最旧一条); 前端兜底裁到最近10条, 防模型超发
    const memos = Array.isArray((D.回想 || {})[name]) ? D.回想[name].filter(x => String(x || '').trim()).slice(-10) : [];
    panel.innerHTML = `
      <div class="exp-char-tabs">${tabs}</div>
      <div class="exp-char-body">
        <div class="exp-char-stage ${dead ? 'dead' : ''}">
          <div class="hero-card">
            <div class="hero-inner">
              <div class="hero-face front"><img src="${escapeHtml(front)}" onerror="this.style.opacity=.25"></div>
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
      if (b.dataset.name === charSel) return; // 重复点当前角色不重绘不重播
      charSel = b.dataset.name;
      renderCharTab(D);
      animateSubSwitch(panel, '.exp-char-stage, .exp-char-side .exp-char-cell');
    }));
  }

  // ── 立绘画廊(独立标签页): 浏览全部 30 张(21日常+9NSFW) + 点 ◆ 固定指定立绘(金框=已固定); 随机切换走设置页「立绘显示」──
  // pos 语义: 'front'=日常主题(可固定为角色页立绘) / 'back'=NSFW主题(纯观赏, 无固定按钮)。
  // 内部标记沿用 front/back 是因为 SFW 分级的 CSS 遮蔽按 data-pos="back" 命中, 改名要连 CSS 一起动, 不值得。
  function refreshChar(){ try { renderCharTab(readMVU()); } catch (e) {} }
  function galThumb(url, pinned, pos, tier){
    const cls = pinned ? ' pinned' : '';
    const pin = pos === 'back' ? '' : `<span class="exp-gal-pin" title="${pinned ? '取消固定' : '固定为显示立绘'}">${ICO.check}</span>`;
    return `<button class="exp-gal-thumb${cls}" data-url="${url}" data-pos="${pos}" data-tier="${tier == null ? '' : tier}"><img loading="lazy" src="${url}" onerror="this.style.opacity=.2">${pin}${pos === 'back' ? '<span class="exp-gal-lock">' + ICO.lock + '</span>' : ''}</button>`;
  }
  // 30 张的平铺序列(大图左右切换用): 先 7 日常主题, 后 9 张 NSFW
  function galItems(name){
    const g = GAL[name] || { normal: [], degrade: [] };
    const items = [];
    g.normal.forEach(t => t.imgs.forEach((u, i) => items.push({ url: u, label: t.label + ' ' + (i + 1), pos: 'front', tier: null })));
    g.degrade.forEach((imgs, ti) => imgs.forEach((u, i) => items.push({ url: u, label: 'NSFW ' + (ti * 3 + i + 1), pos: 'back', tier: ti })));
    return items;
  }
  // 灯箱用序列: SFW 下滤掉 NSFW 图(恒在末尾), 防止从日常图翻页/方向键绕过遮蔽看到 NSFW 立绘; 日常图索引不变
  function lbItems(name){ const items = galItems(name); return sfwMode === 'sfw' ? items.filter(x => x.pos !== 'back') : items; }
  function togglePin(name, it){
    if (it.pos !== 'front') return;   // NSFW 图纯观赏, 没有可固定的展示位
    if (!pins[name]) pins[name] = { front: null };
    pins[name].front = (pins[name].front === it.url ? null : it.url);   // 再点一次=取消固定→随机
    savePins(); refreshChar();
  }
  function galSectionsHTML(name){
    const g = GAL[name] || { normal: [], degrade: [] };
    const p = pins[name] || { front: null };
    const normalRows = g.normal.map(t =>
      `<div class="exp-gal-theme"><span class="exp-gal-lab">${t.label}</span><div class="exp-gal-imgs">${t.imgs.map(u => galThumb(u, p.front === u, 'front', null)).join('')}</div></div>`).join('');
    const nsfwRows = g.degrade.map((imgs, ti) =>
      `<div class="exp-gal-theme"><div class="exp-gal-imgs">${imgs.map(u => galThumb(u, false, 'back', ti)).join('')}</div></div>`).join('');
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
    // 角色 tab 与角色页共用 charSel, 切换时两页同步
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
      // 点缩略图 = 查看大图; 固定走右上角快捷按钮或大图内按钮, 两个动作不冲突
      b.addEventListener('click', () => { const items = galItems(name); const idx = items.findIndex(x => x.url === it.url); openLightbox(name, idx < 0 ? 0 : idx); });
      const pin = b.querySelector('.exp-gal-pin');
      if (pin) pin.addEventListener('click', e => { e.stopPropagation(); togglePin(name, it); rerender(); });
    });
  }

  // ── 大图查看器(灯箱): 点缩略图打开, 左右切换 30 张, 内含固定按钮; Esc/背板/✕ 关闭 ──
  let lbState = null;   // {name, idx}
  function lbPinned(name, it){ const p = pins[name] || {}; return it.pos === 'front' && p.front === it.url; }
  function refreshGalleryKeepScroll(){
    const panel = getPanel('gallery');
    const body = panel ? panel.querySelector('.exp-gal-body') : null;
    const y = body ? body.scrollTop : 0;
    try { renderGalleryTab(readMVU()); } catch (e) {}
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
    // 开合动画类只在打开时挂一次, 稍后移除: 翻页 rebuild 不重播开场缩放
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
    // 预载相邻两张, 减少切换等待
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
    el.removeAttribute('id'); // 先摘 id: 淡出期间再开灯箱不会撞同名节点
    el.classList.add('exp-lb-out');
    setTimeout(() => el.remove(), 220);
  }

  // ════ 船员 ════
  // ── 船员页: 三仪表 + 船员名册 ──
  // 名册值格式「组别·身份·状态」或「组别·身份·状态·短备注」, 组别由 AI 在 MVU 里直接给出(闭集五选一,
  // 见世界书【系统】[mvu_update]变量更新规则)。前端不做任何身份关键词猜测: 靠 role.includes(关键词表)
  // 反推组别的做法, 表会越养越大、必然有误判、每加一个词都要人工查子串重叠, 不要往这个方向改。
  const ROSTER_GROUPS = ['军官', '水手与工匠', '学徒帮工', '因纽特人', '其他']; // 顺序即显示顺序; 末项兼作兜底组
  const ROSTER_BADGE = { 患病: 'ill', 重伤: 'ill', 疯癫: 'mad', 死亡: 'gone' };
  function parseRosterVal(val) {
    const seg = String(val || '').split(/[·・]/).map(s => s.trim());
    // 组别只认闭集里的精确写法, 认不出(AI 没照抄)一律落到兜底组 —— groupRoster 装桶按组别取数组,
    // 放进一个表外的组名会拿到 undefined
    return { group: ROSTER_GROUPS.includes(seg[0]) ? seg[0] : '其他', role: seg[1] || '', st: seg[2] || '健在', note: seg.slice(3).join('·') };
  }
  // 状态 → 色调 class 的统一口径; 死亡判定复用 isDeadTag(好感/名册共用), 不在这里另写一份
  function statusTone(st) { return isDeadTag(st) ? 'gone' : (ROSTER_BADGE[st] || ''); }
  function rosterItems(D) {
    const alive = [], dead = [];
    Object.entries(D.名册 || {}).forEach(([name, val]) => {
      const it = Object.assign({ name }, parseRosterVal(val));
      (isDeadTag(it.st) ? dead : alive).push(it);
    });
    return { alive, dead };
  }
  // 按组别装桶 → [{label, items}], 空组不出小节。parseRosterVal 已保证 group 必是 ROSTER_GROUPS 之一
  function groupRoster(alive) {
    const bag = new Map(ROSTER_GROUPS.map(g => [g, []]));
    alive.forEach(it => bag.get(it.group).push(it));
    return ROSTER_GROUPS.filter(g => bag.get(g).length).map(g => ({ label: g, items: bag.get(g) }));
  }
  // 减员统计条: 段宽用 flex:计数 而不是百分比 width, 免去四舍五入后各段总和不足100%露出底色白边。
  // data-seg/data-n 是给测试用的稳定锚点(不依赖像素宽度)。
  function rosterStatHtml(alive, dead) {
    const all = alive.concat(dead);
    if (!all.length) return '';
    const cnt = { ok: 0, ill: 0, mad: 0, gone: 0 };
    all.forEach(it => { cnt[statusTone(it.st) || 'ok']++; }); // 认不出的状态一律计入"健在"格
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
    // data-i 必须索引"分组后"的扁平序: 卡片是按分组顺序渲染的, 拿原始 alive 的下标会导致点谁发谁名字错位
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
  // ── 狩猎页: 常驻tab, 解锁前是锁定占位页 ──
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
  // 新增一条猎物 checklist: ①k/name/desc/verb 全部要填(verb留空会导致 huntText() 生成的
  // 出猎文案缺内容, 静默降级不报错); ②min 必须是 PREY_TIER 里已有的 key(25/50/75)之一, 否则解锁提示会显示
  // undefined(见 buildPreyGridHtml 里 PREY_TIER[p.min] 那行), 用新档位数值要同步给 PREY_TIER 加一条;
  // ③camp 可选, 标记是否要求身处营地才能选。
  // key 集合必须与 PREY 里出现过的所有 min 值完全一致, 缺一个会让对应门槛的解锁提示文案显示 undefined。
  const PREY_TIER = { 25: '学徒猎人', 50: '猎手', 75: '名猎手' };
  const MATES = ['独自', '瑙雅', '茜拉', '部落猎手', '全部落'];
  const MATE_LABEL = { 部落猎手: '几名猎手' };
  const huntSel = { prey: '观学', mates: ['独自'], dogs: false };
  function huntUnlocked(D) { return D.身处 === '营地' || D.狩猎技巧 > 0; }
  // 同伴多选的互斥规则: 「独自」「全部落」是排他单选(选中即清空其余); 具名角色/部落猎手可叠加,
  // 选了任一叠加项就自动挤掉两个排他项; 全部取消时回落「独自」—— huntSel.mates 永不为空
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
    // verb 的唯一来源是 PREY 表自己的 verb 字段(见该表定义处的新增猎物 checklist), 不要另起第二份映射表
    const preyDef = PREY.find(p => p.k === huntSel.prey);
    const verb = (preyDef && preyDef.verb) || '';
    let t = (tribe ? '全部落出动，' : list ? `和${list}` : '') + verb;
    if (!home && (huntSel.prey === '鱼' || huntSel.prey === '小猎' || huntSel.prey === '海豹')) t += '，就在船附近的冰面';
    if (huntSel.dogs) t += '，带上猎犬队';
    return t + '。';
  }
  // 猎物是否可选是游戏规则判断, 不是纯技术校验: 需同时满足技巧数值达标(v>=p.min),
  // 且如果这条猎物标了 camp(需要营地设施才能猎), 当前必须身处营地, 否则即使技巧够也锁死
  function huntUsable(D, p) {
    const v = D.狩猎技巧, home = D.身处 === '营地';
    return v >= p.min && !(p.camp && !home);
  }
  // 同伴是否可选, 按类型逐条判断:
  // ① 独自 —— 永远可选;
  // ② 部落猎手/全部落 —— 需要拉部落的人手, 只有身处营地才可选;
  // ③ 具名角色 —— 存活即可选(好感字段值不等于'死亡'); 她此刻在不在身边交给模型叙事圆场,
  //    这里只是拼一句出猎消息的快捷输入, 不做剧情位置判断(变量系统没有记录角色当前位置的字段)
  function huntMateOk(D, m) {
    const home = D.身处 === '营地';
    if (m === '独自') return true;
    if (m === '部落猎手' || m === '全部落') return home;
    return D.好感[m] !== '死亡';
  }
  // 状态归一化(有副作用): 选中猎物若已不可选则静默回退到"观学",
  // 过滤掉失效同伴(死亡/离场), 离营则清空猎犬队选择 —— 直接改写模块级 huntSel
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
    // 整页是一张清单而不是四张卡: 技巧作抬头, 猎物/同行两节做选择, 末尾一条横线收到出猎按钮
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
  // ── 地图渲染 + 缩放平移 ──
  const MAP_ASPECT = MAPH / MAPW, MAP_MINW = MAPW * 0.05;   // 最多放大约 20x
  // 视图宽高比: 桌面/横屏沿用底图自身比例(海图卡片按底图比例收口); 竖屏手机改成跟随容器实际比例,
  // 让海图铺满整块竖屏而不是缩成一条横带。底图数据(GEO/COAST/POI/投影)完全不动, 变的只是"取景框形状"。
  let viewAspect = MAP_ASPECT;
  let mapView = null;        // 当前 viewBox {x,y,w,h}, 跨重绘保留
  let mapViewAspect = null;  // mapView 是按哪个 viewAspect 算出来的, 比例变了要重新 fit 而不是硬 clamp
  let mapDragged = false;    // 区分拖动与点击
  // 地图页二级切换: chart=外部海图 / ship=船内剖面, 跨重绘保留 + localStorage 记忆上次选择
  let mapSubView = 'chart';
  { const v = safeLSGet(LS_KEYS.mapView); if (v === 'ship' || v === 'chart') mapSubView = v; }
  function setMapSubView(v) { mapSubView = v; safeLSSet(LS_KEYS.mapView, v); }
  const MAPCTL = {
    in: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'><circle cx='10.5' cy='10.5' r='6.5'/><path d='M10.5 7.5v6M7.5 10.5h6'/><path d='M15.4 15.4 20 20'/></svg>",
    out: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'><circle cx='10.5' cy='10.5' r='6.5'/><path d='M7.5 10.5h6'/><path d='M15.4 15.4 20 20'/></svg>",
    home: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'><circle cx='12' cy='12' r='7'/><path d='M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3'/><circle cx='12' cy='12' r='1.5' fill='currentColor' stroke='none'/></svg>",
    fit: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'/></svg>",
  };
  // ── 地图缩放/平移用的"经纬度→SVG viewBox 像素"坐标系统 ──
  // projX/projY(文件靠前处, GEO 常量旁)把经纬度投影成像素坐标; mapView 是当前 viewBox 的状态
  // {x,y,w,h}(左上角像素坐标+像素宽高), 缩放/拖动都是先改这个对象, 再写回 svg 的 viewBox 属性(见 applyView)。
  // clampView: 把任意视图夹到"不越出整张地图边界"且"宽高比固定为 viewAspect" —— 防止拖动/滚轮缩放
  // 把画面拉变形, 或者缩小时看见地图外的空白。
  // 视野永远不出底图: 竖屏取景框比底图高, 缩到最小倍率时先顶到 MAPH(底图只有 594 高), 此时按高度
  // 反推宽度封住宽边 —— 宁可看不到全图两侧(拖动即可找回), 也不让图外的空海露出来。
  function clampView(v) {
    v.w = Math.max(MAP_MINW, Math.min(MAPW, MAPH / viewAspect, v.w));
    v.h = v.w * viewAspect;
    v.x = Math.max(0, Math.min(MAPW - v.w, v.x));
    v.y = Math.max(0, Math.min(MAPH - v.h, v.y));
    return v;
  }
  // 按容器实际形状更新取景框比例。CSS 竖屏块会给 .exp-map-body 打上 --map-fill:1, JS 只读这一个信号,
  // 保证"CSS 认为该铺满"和"JS 按容器比例取景"永远同步(不各自写一份 920px/portrait 判断)。
  // 两个开关都打在地图页面板上(不是 .exp-map-body), 这样船内图在还没插入 DOM 之前就能查到该走哪套画布
  function mapCssFlag(panel, name) {
    return !!panel && getComputedStyle(panel).getPropertyValue(name).trim() === '1';
  }
  const mapFillMode = panel => mapCssFlag(panel, '--map-fill');          // svg 铺满容器(手机横竖屏都是)
  const mapPortraitMode = panel => mapCssFlag(panel, '--map-portrait');  // 船内图走竖版画布(仅竖屏)
  function syncViewAspect(panel) {
    const body = panel && panel.querySelector('.exp-map-body');
    let a = MAP_ASPECT;
    if (body && mapFillMode(panel)) {
      const w = body.clientWidth, h = body.clientHeight;
      if (w > 0 && h > 0) a = h / w;
    }
    if (Math.abs(a - viewAspect) > 0.002) viewAspect = a;
  }
  // fit 到当前区包围盒(带较大留白, 让四周压灰区块也露出来做上下文): 常规的"量包围盒→按比例留白→
  // 夹长宽比"算法 —— 先量出该区多边形的像素包围盒并按比例留白, 若留白后的宽高比比目标 MAP_ASPECT 更扁,
  // 就用高度反推宽度撑住比例(取两者中更大的宽度), 避免 fit 出来的视图变形。
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
    // POI 图标/区名做"反缩放"抵消 viewBox 缩放, 让它们在屏幕上恒定大小。屏幕尺寸 ∝ k * 显示宽度/视图宽度,
    // 所以 k 要按 svg 的实际显示宽度算, 不能拿写死的 MAPDW —— 竖屏铺满时显示宽度只有桌面的三分之一,
    // 按固定画布宽算(k=w/MAPW)会让图标跟着缩到看不清。1.15 是 MAPDW/MAPW, 桌面下两种算法等值。
    // 面板未激活时 rect 宽为 0(量不到), 退回 k=w/MAPW 近似; 切到地图页时 switchTab 会重绘一次, 拿到真实宽度。
    const rw = svg.getBoundingClientRect().width;
    const k = (rw > 0 ? 1.15 * mapView.w / rw : mapView.w / MAPW).toFixed(4);
    svg.querySelectorAll('.exp-poi-s, .exp-region-lab-s').forEach(g => g.setAttribute('transform', 'scale(' + k + ')'));
  }
  // 以指针为锚点缩放, 不是以画面中心缩放: 先算鼠标/触点 (ux,uy) 在当前 viewBox 里的归一化比例 fx/fy,
  // 缩放出新的宽高后, 让 viewBox 挪到"同一个比例点仍落在同一屏幕像素位置" —— 体验上就是鼠标不动、
  // 画面在指针下方原地放大缩小, 而不是整张图围绕中心跳动。
  function zoomAround(svg, factor, ux, uy) {
    removePoiPopup(svg.parentNode);
    const fx = (ux - mapView.x) / mapView.w, fy = (uy - mapView.y) / mapView.h;
    let w = Math.max(MAP_MINW, Math.min(MAPW, mapView.w * factor));
    mapView = clampView({ x: ux - fx * w, y: uy - fy * (w * viewAspect), w: w, h: w * viewAspect });
    applyView(svg);
  }
  // 手指/鼠标交互: 单指(单键)拖动平移, 双指捏合缩放。桌面滚轮缩放照旧。
  // 手机上没有滚轮也没有 hover, 缩放只剩右上角那两个按钮(每次固定 1.5 倍、锚在画面中心), 想快速看清
  // 某个兴趣点得点好几下再拖回来 —— 捏合是这里真正缺的那一半。.exp-chart 上已有 touch-action:none,
  // 浏览器不会抢走多指手势。
  // 双指期间把两指中点当锚: 记下捏合开始时中点下的底图坐标, 每帧让这个坐标重新回到当前中点下方,
  // 于是"缩放"和"两指一起挪"是同一套公式, 不必再单独处理双指平移。
  function bindMapInteraction(svg) {
    const pts = new Map();   // 当前按下的指针 pointerId → 屏幕坐标, size 决定走单指还是双指
    let drag = null;         // 单指平移: 起点 + 起点时的视图快照
    let pinch = null;        // 双指缩放: 起始间距 + 中点下的底图坐标 + 起点时的视图宽
    const rectOf = () => svg.getBoundingClientRect();
    const two = () => { const a = [...pts.values()]; return [a[0], a[1]]; };
    // 双指中点与间距, 以及中点此刻对应的底图坐标
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
      // 两指张开 d 变大 → viewBox 变窄 → 放大, 所以是 w * d0/d
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
        // 进入双指: 停掉单指拖动, 并且标记成"拖过了" —— 捏合结束抬手时不该顺带点开底下的兴趣点
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
    // 双指抬起一根后剩下的那根接着平移: 拿它当新起点重开一次 drag, 否则视图会从捏合前的快照跳一下。
    // mapDragged 保持 true(这一串手势整体算拖动), 抬手时不弹兴趣点详情
    const lift = e => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const p = [...pts.values()][0]; drag = { x: p.x, y: p.y, v: Object.assign({}, mapView) }; }
      else if (pts.size === 0) drag = null;
    };
    svg.addEventListener('pointerup', lift);
    svg.addEventListener('pointercancel', lift);
    // 鼠标滑出元素外就当松开(触屏的指针是隐式捕获到元素上的, 走 pointerup, 不能在这里一并清掉)
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { pts.clear(); drag = null; pinch = null; } });
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const r = rectOf();
      const ux = mapView.x + (e.clientX - r.left) / r.width * mapView.w;
      const uy = mapView.y + (e.clientY - r.top) / r.height * mapView.h;
      zoomAround(svg, e.deltaY > 0 ? 1.18 : 1 / 1.18, ux, uy);
    }, { passive: false });
  }
  // 经纬网格/海岸线只取决于静态的 GEO/COAST 数据, 与变量无关; 惰性缓存一次, 避免地图页每回合变量更新
  // 都重新遍历约35KB的海岸线坐标数据重新拼一遍SVG path
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
  // 只高亮当前区: 当前区暖金淡染, 画在海岸线之下(不糊海图)
  function buildRegionsUnder(curIdx) {
    const r = REGIONS.find(x => x.idx === curIdx);
    return r ? `<path class="exp-region-fill cur" d="${regionPath(r)}"/>` : '';
  }
  // 其余区(不分走没走过)一律压灰暗雾 + 全部区描边 + 全部区名(反缩放组), 画在海岸线之上
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
    // 透明命中圆(同船内 buildShipMarker 的做法): 图标是 fill:none 的线稿, 只有描边本身能命中, 手机上
    // 航道那种两根细波浪线在屏幕上才 20×9px, 手指根本点不中。放在反向缩放的 .exp-poi-s 里, 屏幕上
    // 恒定约 41px 直径, 不随缩放变大变小
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
  // 小三角对准锚点。弹窗被容器左右边夹住时(窄屏很常见: 弹窗宽度已经接近整屏), 三角原本固定在弹窗
  // 正中, 会指到离兴趣点很远的地方; 这里按锚点与弹窗左缘的实际差值摆三角, 并留出圆角不让它跑到角上
  function setPopArrow(pop, anchorX, left, pw) {
    const x = Math.max(16, Math.min(pw - 16, anchorX - (left - pw / 2)));
    pop.style.setProperty('--arrow-x', x.toFixed(1) + 'px');
  }
  // 点击兴趣点 → 在其上方弹出小窗介绍(整页只留一张大海图, 详情走弹窗)
  function showPoiPopup(mapEl, gEl, p, seen) {
    removePoiPopup(mapEl);
    const pop = doc.createElement('div');
    pop.className = 'exp-poipop';
    pop.innerHTML = detailHtml(p, seen) + `<button class="exp-poipop-x" title="关闭">${ICO.close}</button>`;
    mapEl.appendChild(pop);
    const mr = mapEl.getBoundingClientRect(), gr = gEl.getBoundingClientRect();
    const anchorX = gr.left - mr.left + gr.width / 2;
    let left = anchorX;
    // 先在 left:0 量自然宽再锁死: 绝对定位盒的布局宽度会被 left 偏移到容器右缘的剩余空间挤压,
    // 靠右的锚点不锁宽会被压成细长条
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
  // 船内剖面: 舱室详情(简介+常见人物)。两船共用同一份舱室文案, 不按幽冥号/惊恐号分陈设
  function roomDetailHtml(r) {
    if (!r) return "<span class='exp-md-empty'>不在船上</span>";
    return `<div class="exp-md-h"><b>${r.key}</b></div><div class="exp-md-desc">${r.desc}</div><div class="exp-md-desc" style="color:var(--text-faint)">常见：${r.crew}</div>`;
  }
  // 点击舱室 → 弹窗(加宽版 .room, 房间文案比海图POI长)。竖向选边+贴边夹紧:
  // 图标行离容器上下边都近, 长文案哪侧放不下就换侧, 两侧都放不下时贴容器边(箭头允许偏离图标)
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
    // 同 showPoiPopup: 先 left:0 量自然宽并锁死, 防止靠右锚点把弹窗挤成细长条
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
    // 容器的 pointerdown 会先于 click 关掉弹窗, 拦下冒泡保住 click
    if (go) go.addEventListener('pointerdown', e => e.stopPropagation());
    if (go) go.addEventListener('click', e => {
      e.stopPropagation();
      if (sending) return;
      pop.remove();
      switchTab('story');
      sendText(`去${r.key}看看`);
    });
  }
  // 船内舱室 marker: 透明命中圆(扩大点击区) + 线稿图标 + 名字; 当前舱室常驻放大+发光, 结构同海图 buildMarker
  function buildShipMarker(r, isCur, pv) {
    const x = pv ? r.px : r.cx, y = pv ? r.py : r.cy;
    return `<g class="exp-spoi${isCur ? ' cur' : ''}" data-room="${r.key}" transform="translate(${x},${y})"><circle r="30" fill="transparent"/><g class="exp-spoi-ico">${ROOMICO[r.type] || ''}</g><text class="exp-spoi-lab" y="47">${r.key}</text></g>`;
  }
  // 横竖屏互转/窗口改尺寸后, 地图页两张图的取景比例与画布选择都要重算 —— 只在地图页当前可见时重绘,
  // 其余页不受影响(它们全是纯 CSS 自适应)。防抖 200ms: 旋转过程中 resize 会连发十几次
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
  // 地图页顶层入口: 二级切换(外部海图/船内)做成顶部标签, 复用角色页 Tabs 样式; 始终可切, 不依赖当前叙事位置
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
    // 只有当前高亮区显示兴趣点, 压灰区不显示; 区块与POI都从 stat_data.地点 的首段解析(同一数据源,
    // 两者不会不同步); poiOf 解析不出时(如西北航道暂无POI)船标缺席, 区块高亮仍由 regionIdxOf 兜底
    const inCur = p => p.区 === curIdx;
    const isCurPoi = p => !!(cur && p.key === cur.key);
    const markers = POI.filter(p => inCur(p) || isCurPoi(p)).map(p => buildMarker(p, true, isCurPoi(p))).join('');
    const svg = `<svg class="exp-chart" width="${MAPDW}" height="${MAPDH}" preserveAspectRatio="xMidYMid slice">${buildGraticule()}${buildRegionsUnder(curIdx)}${buildCoast()}${buildRegionsOver(curIdx)}${markers}</svg>`;
    const ctl = `<div class="exp-mapctl"><button data-z="in" title="放大">${MAPCTL.in}</button><button data-z="out" title="缩小">${MAPCTL.out}</button><button data-z="home" title="回到当前海域">${MAPCTL.home}</button><button data-z="fit" title="全览">${MAPCTL.fit}</button></div>`;
    panel.innerHTML = `${swHtml}<div class="exp-map-body"><div class="exp-map">${svg}${ctl}</div></div>`;
    const mapEl = panel.querySelector('.exp-map');
    const svgEl = panel.querySelector('svg.exp-chart');
    // 先挂 DOM 再量容器: 取景框比例得按渲染后的真实尺寸算, 之后才能定 mapView(fit 也依赖 viewAspect)。
    // 取景框形状变了(首次量到真实容器 / 横竖屏互转)就重新 fit 一次 —— 沿用旧视图只 clamp 的话, 会拿
    // 横版比例算出来的宽视图去套竖屏, 上下多出两条空海。
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
      // 缩到最小倍率。桌面/横屏的取景框比底图扁, 这一档正好是整张底图(名副其实的全览); 竖屏取景框更高,
      // 宽边被底图高度反推封住(见 clampView), 这一档只能是"最大的不越界一屏" —— 那就保持当前视野中心
      // 原地缩小, 不像全览那样归位到左上角, 免得把玩家正在看的那片海甩出屏幕。
      else if (z === 'fit') {
        const fw = Math.min(MAPW, MAPH / viewAspect);
        mapView = clampView({ x: cx - fw / 2, y: cy - (fw * viewAspect) / 2, w: fw, h: fw * viewAspect });
        applyView(svgEl);
      }
    }));
  }
  function renderShipPanel(panel, D, swHtml) {
    const room = roomOf(D.地点);
    // 极淡的甲板分层虚线(非船壳, 只给四层一个空间参照) + 左侧竖排层名
    // 竖屏走第二套画布(SHIP_PW×SHIP_PH + 各舱的 px/py): 同一层拆成两列, 层序自上而下不变
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

  // ════ 正文渲染与生成 · 展示与文本处理 ════
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 各预设实际会用来包思维链正文的标签名。开合标签经常对不上名(很多预设的开头标签只是随手起的分类名,
  // 结尾标签才是"思考结束"的权威信号, 比如某预设开 <draft> 却收 </draft_notes>), 下面不要求开合同名
  // (见 THOUGHT_OPEN_RE/THOUGHT_CLOSE_RE 是两条独立正则, 不用 \1 反向引用), 两侧出现过的标签名都收进同一张表即可
  // 不收 <thought>/<os>: 小猫之神预设里它们是展示给玩家看的角色内心独白(display正则替换成"内心"折叠块),
  // 收进来会把叙事内容当思维链吞掉, 它们走 stripPresetNoise 的去标签留内文
  // preparation: 夏瑾预设的备用思维链开场标签, 与 </thinking> 同级("移除额外tag"正则把两者当等价的
  // "思考结束"标记), 该预设默认配置只用 <thinking>, 收录是防玩家开了它的可选变体prompt时不会漏抓
  // draft: 某预设直接用它包全部思考正文(不是外层空壳), 结尾却写 </draft_notes> 收尾, 两个都要收
  const THOUGHT_TAG_NAMES = ['thinking', 'think', 'cot', 'reasoning', 'meow', 'think_nya~', 'konatan_planning~', 'draft_notes', 'draft', 'preparation'];
  const THOUGHT_TAG_RE = THOUGHT_TAG_NAMES.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const THOUGHT_OPEN_RE = '<(?:' + THOUGHT_TAG_RE + ')>';
  const THOUGHT_CLOSE_RE = '<\\/(?:' + THOUGHT_TAG_RE + ')>';

  // 很多预设(小猫之神等)用的是"puppeting"技巧: 开头标签(如 <think_nya~>)其实写在发给AI的提示词末尾,
  // 由AI续写而非自己生成, 所以AI真正吐出来的正文里天生就没有这个开头标签, 只会在思考结束时自己补一个
  // 闭合标签收尾。这不是个别预设疏漏, 是这类写法的正常形态, 所以下面这条兜底不是小概率分支。
  // 只在完全找不到任何已知开标签时才会用到(见下方两处调用), 闭合标签前先出现了
  // <maintext>/<content>/<options> 就不算数(说明那只是正文自己巧合提到的词, 不是真收尾)。
  // 命中返回 {bodyEnd, tagEnd}(思考正文结束位置/整个匹配含闭合标签的结束位置), 没命中返回 null
  function bareThoughtMatch(raw) {
    const m = new RegExp('^([\\s\\S]*?)' + THOUGHT_CLOSE_RE, 'i').exec(raw);
    if (!m) return null;
    if (/<maintext>|<content>|<options>/i.test(m[0])) return null;
    return { bodyEnd: m[1].length, tagEnd: m[0].length };
  }

  // 剥掉常见思维链包裹块: 闭合的整块删(开合标签名不要求相同, 见上); 未闭合但后面跟着正文标签(Maya预设有
  // "漏写</thinking>直接接正文"的已知形态)只删到正文标签为止, 不能把整层正文吞掉; 未闭合且后面没有正文
  // 标签(流式中)才删到结尾。<maintext>/<options> 成对标签, 不剥会被正文/选项提取错抓。
  // 以上三种都没命中(没有任何已知开标签)时, 再试裸奔思考(见 bareThoughtMatch)
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

  // 从原始楼层文本里把思维链正文抠出来(用于展示, 不影响 stripThink 的丢弃逻辑): 闭合标签块全收集拼接;
  // 没有闭合块时, 先试"未闭合但后面跟着正文标签"(漏写闭合的已落库楼层), 只抓到正文标签为止;
  // streaming=true 再兜底抓未闭合的尾部内容, 给流式过程中的实时预览用; 都没命中时再试裸奔思考(见上)
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
      if (bare) parts.push(raw.slice(0, bare.bodyEnd).trim());
    }
    return parts.join('\n\n').trim();
  }

  // 把用户自己配置的酒馆显示正则跑在抠出的文本上: 阅读视图不走酒馆的渲染管线,
  // 预设里「仅格式显示」的清理正则(杀自检/杀格式碎片)在这里补一遍, 用户换预设也不用改前端
  // 旧版酒馆助手没有这个 API 或调用失败时, 原样返回不影响上屏。
  // 显示正则可能反过来往文本里注入HTML(如双人成行双语模式把 "词"『注音』 换成 <ruby> 标签),
  // 阅读视图是转义上屏的, 注入的HTML会变成源码文字, 跑完后再剥一遍: <rt>注音整块删, <ruby>壳去标签留原词
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

  // 市面预设(Maya/Izumi/小猫之神/TGbreak/Kemini/双人成行)会让模型往楼层里输出各种附加功能块与元噪音。
  // 酒馆里预设自带的display正则会各自处理, 但阅读视图是转义后上屏的纯文本, 那些"替换成HTML卡片"的美化
  // 正则在这里反而会把HTML源码当文字露出来, 所以必须在 applyDisplayRegexes 之前把这些块处理掉。
  // 整块删除: 纯元功能/小剧场类(摘要/吐槽/弹幕/选项卡/事件进度/免责声明等), 与卡的阅读体验无关;
  // 去标签留内文: 包裹着叙事内容的容器(<content>正文容器/<SexualScene>场景/<thought><os>内心独白)与
  // 内联排版标签(预设让模型给心理描写加 <p style=> / <font> 之类, 标签删掉字要留下)
  // style/script: 极少见, 但真出现时内文是CSS/JS源码, 绝不能当正文露出来, 所以走整块删而不是去标签
  const PRESET_STRIP_TAGS = ['details', 'summary', 'tucao', 'danmu', 'konatan_chat', 'progress', 'current_event',
    'htmlcontent', 'guifan', 'done', 'disclaimer', 'w2g', 'VariableCheck', 'memo', 'draft', 'Interleaving',
    'choice', 'safe', 'theater', 'recap', 'background', 'parallel_world', 'meow_FM', 'time_format',
    'aftertalk', 'Shiosai', 'snow', 'quote', 'htm1fenge', 'math', 'finish', 'WF', 'style', 'script'];
  // 后半截是内联排版标签: 明月秋青这类预设的「正文小美化」会让模型往正文里写 <font size>/<br>/<div style>
  // 甚至整块聊天气泡HTML, 阅读视图是转义上屏的, 不去标签这些尖括号会当文字露出来
  const PRESET_UNWRAP_TAGS = ['content', 'writing_process', 'Chain_of_Thought', 'SexualScene', 'thought', 'os',
    'font', 'span', 'p', 'div', 'b', 'i', 'em', 'strong', 'hr', 'img', 'a', 'small', 'big', 'u', 'center', 'mark'];
  // 闭合整块删, 未闭合(流式中/漏写闭合)删到结尾, 与 UpdateVariable 的兜底策略一致
  const PRESET_STRIP_RE = new RegExp('<(' + PRESET_STRIP_TAGS.join('|') + ')(?:\\s[^>]*)?>[\\s\\S]*?(?:<\\/\\1\\s*>|$)', 'gi');
  // 结尾的 \s*\/?> 是为了同时吃掉自闭合写法(<br/>、<img src="…" />)
  const PRESET_UNWRAP_RE = new RegExp('<\\/?(?:' + PRESET_UNWRAP_TAGS.join('|') + ')(?:\\s[^>]*?)?\\s*\\/?>', 'gi');
  function stripPresetNoise(text) {
    return text
      .replace(PRESET_STRIP_RE, '')
      .replace(/<(?:角色)?状态面板>[\s\S]*?(?:<\/(?:角色)?状态面板>|$)/g, '')
      .replace(/<Q>[\s\S]*?(?:<\/WF>|$)/gi, '') // 双人成行抗空回块: <Q>开头</WF>结尾的错位配对, 通用规则抓不到
      .replace(/<br\s*\/?>/gi, '\n')  // 换行标签换成真换行(气泡是 white-space:pre-wrap), 直接去标签会把两行黏成一行
      .replace(PRESET_UNWRAP_RE, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^\s*###\s*正文\s*$/gm, '');
  }

  // 正文容器标签, 按优先级排列。卡自己的世界书要求模型输出 <maintext>, 但有些预设(明月秋青 Myriad Stars
  // 等)在自己的「输出格式」里硬性规定正文包在 <content> 里、且明令"不得有额外标签", 模型会跟着预设走,
  // 整层回复里根本不会出现 <maintext>——两个都认。两个同时出现时以 <maintext> 为准: Maya 那类预设写的是
  // <maintext><content>正文</content></maintext> 的嵌套形态, 取外层才不会漏掉 content 之外的正文,
  // 内层 content 标签由 PRESET_UNWRAP_TAGS 去标签留内文。
  const MAIN_TAG_NAMES = ['maintext', 'content'];
  // 在(已剥掉思维链的)文本里定位正文块。取最后一个开标签: 未包裹的思维链里若复述过举例标签,
  // 只会出现在真正文标签之前。返回 {body, closed}, 一个都没有返回 null。
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

  // 从原始楼层文本抠出正文容器(<maintext>/<content>)的内容; 兼容未闭合(流式中); 无标签时回退为去掉变量更新块的原文
  // streaming: 流式中间态, 正文标签未出现前(思维链阶段)一律不上屏, 未闭合时剥半截标签碎片
  function extractMainText(raw, streaming) {
    if (!raw) return '';
    // 消息0的入口面板占位楼层: 阅读视图里不显示, 也绝不能喂给显示正则(会被面板正则换成整段HTML)
    if (/^\s*(?:<StatusPlaceHolderImpl\s*\/?>\s*)*【开场介绍】/.test(raw)) return '';
    const s = stripThink(raw);
    const main = findMainBlock(s);
    if (main) {
      const body = main.body;
      // 闭合但模型误把变量指令写进标签内部: 顺手清掉, 避免指令原文混进正文
      if (main.closed) return applyDisplayRegexes(stripPresetNoise(body.replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, ''))).trim();
      // 未闭合(流式中/模型漏写闭合): 剥掉误入的选项与变量块与占位符, 再剥半截标签碎片
      // 漏写 </maintext>(或 </content>)的已落库楼层也会走到这里(非流式), 占位符是 MVU 事后追加, 同样要剥
      // 末尾未闭合的 <!--(流式中注释还没写完)单独剥: 半截标签规则只认 <字母 开头, 抓不到 <!
      return applyDisplayRegexes(stripPresetNoise(body
        .replace(/<options>[\s\S]*$/i, '')
        .replace(/<branches>[\s\S]*$/i, '')
        .replace(/<UpdateVariable>[\s\S]*$/i, '')
        .replace(/<StatusPlaceHolderImpl\s*\/?>/gi, ''))
        .replace(/<!--[\s\S]*$/, '')
        .replace(/<\/?[a-z]*$/i, '')).trim();
    }
    // 流式中还没出现正文标签: 前面全是思维链等非正文内容, 一律不上屏, 等正文标签再出字
    if (streaming) return '';
    // 回退: 完整回复确实没有约定标签时, 去掉变量更新块/选项块/占位符, 显示剩余原文
    // UpdateVariable 补 |$ 兜底: 模型漏写闭合标签时指令原文不会露出
    return applyDisplayRegexes(stripPresetNoise(s
      .replace(/<UpdateVariable>[\s\S]*?(?:<\/UpdateVariable>|$)/gi, '')
      .replace(/<options>[\s\S]*?(?:<\/options>|$)/gi, '')
      .replace(/<branches>[\s\S]*?(?:<\/branches>|$)/gi, '')
      .replace(/<StatusPlaceHolderImpl\s*\/?>/gi, ''))).trim();
  }

  // 从楼层文本抠出 <options> 里的行动选项; 只认完整闭合标签, 流式未闭合时返回空数组, 按钮不闪现半截
  // 与正文同款: 先剥思维链块, 再取最后一对, 防思维链里的举例标签被错抓
  // 无 <options> 时回退认 PrismFox(双人成行)类预设的 <branches> 块: 字母编号(A.内容)最多10条,
  // 外层可能套 <details><summary> 折叠, 非字母编号行(含这些包装标签)被行匹配自然滤掉
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
        .slice(0, 6); // 防模型超发
    }
    const b = s.toLowerCase().lastIndexOf('<branches>');
    if (b < 0) return [];
    const body = s.slice(b + '<branches>'.length);
    const j = body.toLowerCase().indexOf('</branches>');
    if (j < 0) return [];
    return applyDisplayRegexes(body.slice(0, j)).split('\n')
      .map(l => (l.match(/^\s*[A-Za-z][.、)]\s*(.+?)\s*$/) || [])[1])
      .filter(Boolean)
      .slice(0, 10); // branches 规范就是10条(A-J), 上限对齐
  }

  function optionsHtml(opts) {
    return '<div class="exp-story-options">' + opts.map((t, i) =>
      '<button class="exp-story-opt" data-idx="' + i + '"><span class="exp-story-opt-num">' + (i + 1) + '</span><span class="exp-story-opt-text">' + escapeHtml(t) + '</span></button>'
    ).join('') + '</div>';
  }

  // 输入框单行起步自动增高: 高度跟随内容, 上限交给 CSS max-height 收口(手机字号不同也无需改 JS)
  // 只从 input 事件与 onSend 触发(story 面板可见时), 面板隐藏时 scrollHeight 为 0 会塌, 由 min-height 兜底
  function autogrowStoryTA() {
    const ta = doc.getElementById(SEL.storyTextarea);
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight + 2) + 'px';
    updateJumpBtn(); // 输入区增高后重定位回到最新按钮
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
            <button class="exp-iconbtn" id="${SEL.storyDiff}" title="本回合变量变化">${ICO.delta}</button>
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
    // 触屏双触(double-tap)进入编辑: 原生 dblclick 在移动端不可靠, 自行判定, 见 onStoryTapDown/Up
    doc.getElementById(SEL.storyLog).addEventListener('pointerdown', onStoryTapDown);
    doc.getElementById(SEL.storyLog).addEventListener('pointerup', onStoryTapUp);
    doc.getElementById(SEL.storyJump).addEventListener('click', () => scrollStoryToEnd(!sending)); // 流式中平滑滚动追不上增长的底部, 生成期间直接跳
    doc.getElementById(SEL.storyDiff).addEventListener('click', toggleDiffPanel);
    doc.getElementById(SEL.storySend).addEventListener('click', onSendButton);
    doc.getElementById(SEL.storyRegen).addEventListener('click', onRegenerate);
    doc.getElementById(SEL.storyDel).addEventListener('click', onDelToggle);
    doc.getElementById(SEL.delCancel).addEventListener('click', () => setDelMode(false));
    doc.getElementById(SEL.delConfirm).addEventListener('click', onDelConfirm);
    const ta = doc.getElementById(SEL.storyTextarea);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sending) onSend(); }
    });
    ta.addEventListener('input', autogrowStoryTA);
    autogrowStoryTA();
  }

  // 正文上屏前的最后一道加工: 先转义, 再把成对引号连内容包成高亮span,
  // 颜色吃当前主题的 --accent(黑金=金, 大理石=红...), 和酒馆原生给对话上色的阅读习惯一致
  // 中文引号“…”为主(可跨行); 英文直引号"…"兜底(模型偶尔溜出来), 转义后是 &quot;, 限单行防错配
  // streaming=true(逐帧刷新的临时气泡)时跳过高亮, 只转义: 引号高亮只认成对闭合, 流式中一句话里
  // 前一半引号先上屏时还没配对, 等闭合字符流到才会突然整段变色, 逐token不断有新引号闭合就变成
  // 持续的颜色跳动("一卡一卡"), 比不高亮更影响阅读观感。生成结束后 renderStoryLog 权威落地时
  // (即 storyTurnHtml 走的默认参数)统一补上高亮, 只在那一刻变色一次, 不在流式过程里反复变
  // 正文切成段落 HTML 片段数组。段落结构由这里归一, 不再取决于模型输出了一个还是三个换行:
  // pre-wrap 直出时单个 \n 会让段间距等于行距(段落界限当场消失), 双 \n 又偏空, 排版跟着预设飘。
  // 连续空行折叠成一段边界; 引号高亮必须在 split 之前做, 后一条正则靠 \n 定行边界。
  function storyParas(text, streaming) {
    const escaped = escapeHtml(text);
    const marked = streaming ? escaped : escaped
      .replace(/“([^”]*)”/g, '<span class="exp-quote">“$1”</span>')
      .replace(/&quot;([^\n]*?)&quot;/g, '<span class="exp-quote">&quot;$1&quot;</span>');
    return marked.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }

  function storyTextHtml(text, streaming) {
    return storyParas(text, streaming).map(s => '<p>' + s + '</p>').join('');
  }

  // 流式增量重绘: 逐段比对, 只改内容变了的段、只新建多出来的段。
  // 不走整体 innerHTML 覆盖有两个原因: ① 新段落淡入才能只作用于真正新增的那几段, 否则每帧
  // 全部重建、动画每帧重放; ② 长回复下每帧全量重建是 O(n²) 级的开销。
  function paintStoryText(body, text) {
    const parts = storyParas(text, true);
    const kids = body.children;
    const anim = motionOK();
    for (let i = 0; i < parts.length; i++) {
      if (i < kids.length) {
        if (kids[i].innerHTML !== parts[i]) kids[i].innerHTML = parts[i];
      } else {
        const p = doc.createElement('p');
        p.innerHTML = parts[i];
        if (anim && i > 0) p.className = 'exp-para-in'; // 首段跟着气泡入场动画走, 不叠第二层
        body.appendChild(p);
      }
    }
    while (kids.length > parts.length) body.removeChild(kids[kids.length - 1]);
  }

  // 折叠成一条罗经分隔线: 两条淡出细线夹着一枚静止星徽, 不带任何文字(对阅读侵入最小), 点击星徽展开
  // 下方全文, 展开时星徽旋转45度作为开合状态提示; mid 为空(流式中, 楼层还没落库)时不带 data-fold-mid,
  // 点击只切本地class、不进 thoughtFoldOpen 持久化
  function thoughtFoldHtml(thought, mid, open) {
    const midAttr = (mid == null) ? '' : ' data-fold-mid="' + mid + '"';
    return '<div class="exp-story-thought' + (open ? ' open' : '') + '"' + midAttr + '>'
      + '<div class="exp-story-thought-head" title="思维链"><span class="exp-story-thought-rule l"></span><span class="exp-story-thought-ico">' + ICO.thought + '</span><span class="exp-story-thought-rule r"></span></div>'
      + '<div class="exp-story-thought-body">' + escapeHtml(thought) + '</div>'
      + '</div>';
  }

  // thought 非空时(只会是assistant回合)在正文上方多渲染一条折叠bar; open 决定初始展开状态, 由调用方按 thoughtFoldOpen 传入
  function storyTurnHtml(role, text, mid, thought, open) {
    const cls = role === 'user' ? 'user' : 'assistant';
    const midAttr = (mid == null) ? '' : ' data-mid="' + mid + '"';
    // 用户楼层可双击就地编辑(见 openUserEdit), title 兼作功能提示
    const titleAttr = (cls === 'user' && mid != null) ? ' title="双击编辑这条发言"' : '';
    const foldHtml = thought ? thoughtFoldHtml(thought, mid, open) : '';
    return '<div class="exp-story-turn ' + cls + '"' + midAttr + titleAttr + '>' + foldHtml + '<div class="exp-story-text">' + storyTextHtml(text) + '</div></div>';
  }

  // 智能跟随: 只有本就贴近底部才自动滚到最新, 上翻阅读时不被重绘/流式拽回
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

  // 历史楼层的正文/思维链提取结果按楼层号缓存(缓存提取结果而非最终HTML, 折叠面板开合状态在拼HTML这一步
  // 单独读取, 不用因为开合状态变化就让提取结果缓存失效): 长对话下 renderStoryLog 每回合都会重扫全部楼层,
  // 已落库楼层的文本不会再变, 缓存后省掉重复的多趟正则解析。删楼/重开/切开场白等会改变楼层内容或编号的地方需清缓存(见各调用处)。
  const storyHtmlCache = new Map();
  // 思维链折叠面板开合状态(mid->开合), 跨重绘保留、不持久化, 与变量页 varFold 同一套约定
  const thoughtFoldOpen = new Set();

  // 取当前楼层数据; 尚无有效楼层(lastId 缺失或为负)时返回 null
  // hide_state:'unhidden': 被 /hide 隐藏的楼层(不进上下文)同样不进阅读视图, 与原生界面口径一致
  function fetchStoryMessages() {
    const lastId = getLastMessageId();
    if (lastId == null || lastId < 0) return null;
    return getChatMessages('0-' + lastId, { hide_state: 'unhidden' });
  }

  // 单条楼层 → {role, text, thought, mid}, 按 message_id 缓存(get-or-compute)
  // thought 优先取酒馆原生思维链(m.extra.reasoning): 开了"自动解析"的预设(如 DeepSeek 前后缀 <think>/</think>)
  // 会被酒馆在流式阶段就摘出来存进这里, 正文里根本不会再留标签, 标签正则抓不到; 没开自动解析、
  // 模型直接把标签写进正文的预设仍走 extractThought 兜底
  function cachedTurnData(m) {
    let data = storyHtmlCache.get(m.message_id);
    if (data === undefined) {
      data = m.role === 'user'
        ? { role: 'user', text: m.message, thought: '', mid: m.message_id }
        : { role: 'assistant', text: extractMainText(m.message), thought: (m.extra && m.extra.reasoning) || extractThought(m.message), mid: m.message_id };
      storyHtmlCache.set(m.message_id, data);
    }
    return data;
  }

  // 提取结果 → 最终HTML, 不缓存(拼字符串很便宜), 每次都读当前 thoughtFoldOpen 决定折叠面板初始展开态
  function turnHtml(data) {
    if (!data.text) return '';
    const open = thoughtFoldOpen.has(data.mid);
    return storyTurnHtml(data.role, data.text, data.mid, data.thought, open);
  }

  // 删除模式: 楼层可点选(第0楼开场白除外), 点击切换选中集合, 不渲染行动选项
  function renderDelModeLog(log) {
    log.querySelectorAll('.exp-story-turn').forEach(t => {
      const mid = +t.dataset.mid;
      if (!(mid >= 1)) return;
      t.classList.add('selable');
      if (delSel.has(mid)) t.classList.add('delsel');
      t.addEventListener('click', e => {
        // 点的是思维链折叠头: 这次点击只用来展开/收起(冒泡到 #exp-story-log 的 onStoryLogClick 处理),
        // 不连带把整条楼层标记为待删除——折叠头的监听器挂在冒泡路径更外层的log容器上, 这里必须自己让开
        if (e.target.closest('.exp-story-thought-head')) return;
        if (delSel.has(mid)) { delSel.delete(mid); t.classList.remove('delsel'); }
        else { delSel.add(mid); t.classList.add('delsel'); }
        updateDelBar();
      });
    });
  }

  // 思维链折叠头点击: 委托到 #exp-story-log 上一次性绑定(ensureStoryDom), 不管是权威渲染(renderStoryLog
  // 整体重建innerHTML)还是流式中途插入的临时折叠bar都能响应, 不用每次渲染后单独重新绑定。
  // 只切这一个节点的 open class(不触发整页重绘); 流式中的临时bar没有 data-fold-mid, 只切class不持久化;
  // stopPropagation 防止删除模式下点到折叠头连带把整条楼层选中/取消选中
  function onStoryLogClick(e) {
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

  // 正常模式: 行动选项只挂在最新一条 AI 回复后; 生成期间不渲染, 历史楼层不渲染
  function renderNormalLog(log, messages) {
    const last = messages[messages.length - 1];
    if (!sending && last && last.role !== 'user') {
      const opts = extractOptions(last.message);
      if (opts.length) {
        log.insertAdjacentHTML('beforeend', optionsHtml(opts));
        log.querySelectorAll('.exp-story-opt').forEach(b =>
          b.addEventListener('click', () => onOptionClick(opts[+b.dataset.idx])));
      }
    }
  }

  function renderStoryLog() {
    const log = doc.getElementById(SEL.storyLog);
    if (!log) return;
    try {
      // 首次渲染(尚无内容)总是落底; 已有内容时只有贴近底部才跟随, 否则保住阅读位置
      const stick = !log.childElementCount || nearBottom(log);
      const prevTop = log.scrollTop;
      let messages = fetchStoryMessages();
      if (!messages) { log.innerHTML = ''; return; }
      // 自家原生生成期间被外部触发的整体重建(如重进外壳): 原生管线边生成边写楼层, 末尾可能是半成品,
      // 只画到生成前的基线楼层。流式气泡被 innerHTML 整体重建抹掉后, 下一帧 flushStream 按 genId
      // 找不到会重插(见 runGeneration 内注释), 半成品楼层因此永远只以流式气泡形态出现, 也不进 storyHtmlCache
      if (sending && genBaselineId != null) messages = messages.filter(m => m.message_id <= genBaselineId);
      // 自定义开局路径: 第0楼始终停在消息0面板占位(swipe 0), 不属于正文, 过滤不显示
      if (messages.length && messages[0].message_id === 0 && floor0SwipeId() === 0) messages = messages.slice(1);
      log.innerHTML = messages.map(m => turnHtml(cachedTurnData(m))).join('');
      if (delMode) {
        renderDelModeLog(log);
      } else {
        renderNormalLog(log, messages);
        applyUserEdit(log); // 编辑器开着时(外部触发的整体重绘)按 editState 恢复, 未保存的草稿不丢
      }
      log.scrollTop = stick ? log.scrollHeight : prevTop;
      updateJumpBtn();
    } catch (e) {
      console.warn('[航海日志] 正文渲染失败', e);
      if (!log.childElementCount) setStoryStatus('航海日志加载失败，请重新进入或反馈给作者');
    }
  }

  // ════ 开场白 ════
  // ---- 切换开场白 ----
  // 第 0 楼的所有 swipe = 消息0入口面板 + 各开场白; MVU 初始化时已把每条的变量预算进 swipes_data。
  // 选择入口在侧栏「开场白」页; 玩家一旦发言, 第 0 楼锁定。

  // 兼容两种YAML写法: 内联"字段: 值"单行, 或块状列表"字段:\n  - 值\n  - 值"
  function parseYamlField(body, field) {
    const inline = (body.match(new RegExp('^[ \\t]*' + field + ':[ \\t]*(.+?)[ \\t]*$', 'm')) || [])[1] || '';
    if (inline) return inline;
    const block = body.match(new RegExp('^[ \\t]*' + field + ':[ \\t]*\\n((?:[ \\t]*-[ \\t]*.+\\n?)+)', 'm'));
    if (!block) return '';
    return block[1].split('\n')
      .map(l => (l.match(/^[ \t]*-[ \t]*(.+?)[ \t]*$/) || [])[1])
      .filter(Boolean).join('、');
  }

  // 开场白卡片的兜底标题: 取该 swipe <initvar> 里地点字段的首段; 解析不出时用「开局 N」
  function openingLabel(text, idx) {
    const m = String(text || '').match(/<initvar>([\s\S]*?)<\/initvar>/i);
    const body = m ? m[1] : String(text || '');
    const locRaw = parseYamlField(body, '地点');
    const loc = locRaw.split(/[·・]/)[0].trim();
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
    if (openingBusy || sending) return; // 发送流程正占用第0楼(记录中/生成中), 不允许此时切换 swipe
    if (getLastMessageId() !== 0) return;
    const info = readOpenings();
    if (!info || n === info.cur || !info.swipes[n]) return;
    openingBusy = true;
    try {
      if (typeof setChatMessages === 'function') {
        await setChatMessages([{ message_id: 0, swipe_id: n }]);
        // 定点跳 swipe 没有原生路径(/swipe 只能±1且滑到末尾会触发生成), 保留酒馆助手 API + 手动补发
        // MESSAGE_SWIPED 给依赖它的插件(如数据库类按 swipe 重载数据); 数据先行事件后发, 与原生时序一致
        try { await eventEmit(tavern_events.MESSAGE_SWIPED, 0); } catch (e) { console.warn('[航海日志] 补发swipe事件失败', e); }
      }
      storyHtmlCache.delete(0); // 第0楼切到另一条 swipe, 正文变了, 旧缓存作废
      // 优先用 MVU 为该 swipe 预算好的变量; 读不到则清缓存回退到通用读取
      let sd = null;
      try {
        const m0 = getChatMessages(0, { include_swipes: true })[0];
        sd = m0 && m0.swipes_data && m0.swipes_data[n];
      } catch (e) {}
      // $internal 是 MVU 的内部簿记字段, 不属于业务变量; 全文各处缓存/对比 stat_data 时一律剔除
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

  // ---- 开场白/序章标签页 ----
  // 第0楼 swipe0 是开场面板(无<initvar>), 其余 swipe 才是开场白。
  // 事实字段(时间/地点)从各 swipe 的 <initvar> 实时解析; 策划文案存 OPENINGS_META,
  // 与 opening/00入口与序章.md 的「开场白卡片」表保持同步。
  let openingConfirmed = false;   // 本次运行内已在开场白页确认过开局

  // fresh 新聊天(只有第0楼, 玩家未发言) → 可选开场白
  function canSelectOpening() {
    const lid = safeLastMessageId();
    return lid === 0;
  }

  // 防呆: 当前还停在消息0入口面板 swipe(无<initvar>)时不该直接对话
  function onPanelSwipe() {
    try {
      if (getLastMessageId() !== 0) return false;
      const m0 = getChatMessages(0)[0];
      return !!m0 && !/<initvar>/i.test(String(m0.message || ''));
    } catch (e) { return false; }
  }

  const OPENINGS_META = [
    { who: '富兰克林', act: '第一幕', role: '远征队总指挥官、幽冥号船长', img: ['富兰克林', 'cabin', 0], blurb: '一八四五年八月，出航头一年，一切顺利。这夜轮到你去送晚茶，头一回敲开了船长室的门' },
    { who: '克洛泽', act: '第二幕', role: '远征队副指挥官、惊恐号船长', img: ['克洛泽', 'log', 0], blurb: '一八四五年冬，比奇岛越冬。你被派去惊恐号清点物资，在储藏甲板翻出几只鼓包的罐头，身后站着克洛泽' },
    { who: '菲茨', act: '第三幕', role: '幽冥号执行官', img: ['菲茨', 'portrait', 0], blurb: '一八四六年冬，船被死冰困住，富兰克林病故。你去船长室清点遗物，撞见了往后这条船上说了算的菲茨' },
    { who: '瑙雅', act: '第四幕', role: '因纽特见习萨满', img: ['瑙雅', 'tent', 1], blurb: '一八四八年春，南撤途中你掉了队，倒在雪原上。醒来时人在一顶兽皮帐里，救你的因纽特姑娘叫瑙雅' },
    { who: '茜拉', act: '第五幕', role: '因纽特前任萨满、瑙雅母亲', img: ['茜拉', 'council', 0], blurb: '一八四八年春，瑙雅带你去见部族。营地里说一不二的是她母亲茜拉，你能不能留下，由她一句话定' },
    { who: '富兰克林、克洛泽与菲茨', act: 'if线一', line: 'if困冰', role: '远征队总指挥官、副指挥官、执行官', img: ['富兰克林', 'mess', 0], blurb: '一八四八年二月，困冰第三年。军官们在船长室争执不下，富兰克林转过头来问你，底下的船员心里怎么想' },
    { who: '富兰克林与克洛泽', act: 'if线二', line: 'if出使', role: '远征队正副指挥官', img: ['克洛泽', 'sled', 0], blurb: '一八四八年五月，全船被叫上露天甲板。富兰克林与克洛泽要带队上岸和因纽特人换东西，正在人堆里挑人' },
    { who: '菲茨与富兰克林', act: 'if线三', line: 'if开冰', role: '幽冥号执行官、远征队总指挥官', img: ['菲茨', 'battle', 0], blurb: '一八四八年七月，靠船的冰裂开了缝。菲茨要用船上的火药炸出一条水道，转身就把你点进了开冰队' },
    { who: '克洛泽与富兰克林', act: 'if线四', line: 'if冲刺', role: '远征队副指挥官、总指挥官', img: ['克洛泽', 'engine', 0], blurb: '一八四八年七月，冰面化开一道缝。两船抢在它合拢前起航，克洛泽叫住你，让你在各处岗位之间传话' },
    { who: '克洛泽与菲茨', act: 'if线五', line: 'if南撤', role: '远征队副指挥官、幽冥号执行官', img: ['克洛泽', 'log', 1], blurb: '一八四八年八月，粮撑不到明年。克洛泽下到下层甲板宣布弃船南撤，同伴收拾着行李问你走不走得出去' },
    { who: '富兰克林、克洛泽与菲茨', act: 'if线六', line: 'if东进', role: '远征队总指挥官、副指挥官、执行官', img: ['富兰克林', 'cabin', 1], blurb: '一八四八年八月，船又能动了。你去船长室添煤，在门外听见了军官们的决定，富兰克林开门让你先别声张' },
    { who: '克洛泽与菲茨', act: 'if线七', line: 'if勘途', role: '远征队副指挥官、幽冥号执行官', img: ['克洛泽', 'arctic', 0], blurb: '一八四八年七月，威廉王岛。你跟着克洛泽上岸打猎，追着熊的脚印爬上坡顶，望见远处横着一条细细的黑线' },
  ];

  // META 的 img 三元组 [角色, 主题k, 序号] → 立绘 URL; 指向的图不存在时静默回空串(卡片无图, 不报错)
  function metaImg(m) {
    try {
      const g = GAL[m.img[0]];
      const t = g.normal.find(x => x.k === m.img[1]);
      return t.imgs[m.img[2]] || '';
    } catch (e) { return ''; }
  }

  // META↔swipe 匹配: 一律按序号对位, 不靠内容字段匹配(if线与正传同规则; if线分组由 META.line 决定)。
  // 维护纪律: 卡内开场白 swipe 顺序与 OPENINGS_META 数组顺序必须保持一致——增删/调序开场白时
  // 务必同步 META 表, 序号是唯一的匹配信号, 错位不会报错只会静默套错文案与立绘。
  function metaForSwipe(ordinal) {
    return OPENINGS_META[ordinal] || null;
  }

  // ---- 自定义开局 ----
  // 玩家自选船只/职位/登船时节+自由填写外貌背景 → 前端直写初始变量(user档案进 stat_data, 世界书
  // user设定条目按档案渲染) → 以 user 身份发一条"开场信息"指令楼 → 走既有 /send+/trigger 生成管线出开场白。
  // 第0楼全程停留在消息0面板(不占用 swipe), renderStoryLog 对面板楼做了过滤; 指令楼按设计保留不删。
  // 职位菜单与《船员生活》编制表保持一致; 军官层是女性编制, user 选军官即"全队唯一的男军官"特例
  // (officer 标记驱动指令楼与世界书 user设定的特例备注), 指挥官/船长/执行官三个主角职位不开放
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
  // 登船时节: 时间/区块/三仪表初值按原本时间线取自同期正传开场白的 initvar(合法组合, 不拍脑袋);
  // 「困冰长夜」按默认轨迹富兰克林已病故(1846年11月), 早于该节点的三档全员在世
  const CUSTOM_STAGES = [
    { key: 'sail', name: '出航伊始', time: '1845年8月15日 09:00 · 极昼', region: '兰开斯特水道', stats: [95, 90, 90], blurb: '船队刚驶入兰开斯特水道，一切顺利，前程未卜' },
    { key: 'beechey', name: '比奇越冬', time: '1845年12月22日 11:00 · 极夜', region: '比奇越冬海域', stats: [75, 75, 65], blurb: '第一个冬天，在比奇岛暂作停留，休整船队' },
    { key: 'beset', name: '困冰之初', time: '1846年9月30日 14:00 · 白夜', region: '维多利亚困冰区', stats: [60, 60, 50], blurb: '秋日，船被维多利亚海峡的冰困住了' },
    { key: 'longnight', name: '困冰长夜', time: '1846年12月20日 15:00 · 极夜', region: '维多利亚困冰区', stats: [45, 50, 35], blurb: '第二个冬天，船在维多利亚海峡丝毫未动' },
  ];

  let openingView = 'cards'; // 开场白页子视图: 'cards' 卡片网格 / 'custom' 自定义表单(仅可选期)
  const customForm = { ship: '幽冥号', role: null, stage: null, look: '', past: '' };

  // 自定义卡与十二幕卡结构不同: 无立绘、居中独占一行(容器 .custom-solo 脱离两列网格)
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
      opt('stage', `data-stage="${s.key}"`, f.stage === s.key, `<b>${s.name}</b><i>${s.time.split(' ')[0]} · ${s.region}</i><span>${s.blurb}</span>`)).join('') + '</div>';
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

  // 指令楼用第三人称 {{user}} 指代玩家角色: 宏要在 /send 的斜杠解析层被替换成 persona 名, 所以
  // 本函数返回的文本自带转义(自由输入逐字段转义, 模板部分不转义以放行 {{user}} 宏), sendText 收到
  // preEscaped 后不再整体转义。mock 不模拟宏替换, 预览里楼层显示字面 {{user}}, 真机为 persona 名
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
      const stat = {
        时间: stage.time,
        地点: stage.region + ' · ' + f.ship + ' · 下层甲板',
        身处: '随队',
        物资: stage.stats[0], 健康: stage.stats[1], 士气: stage.stats[2],
        狩猎技巧: 0,
        名册: {},
        好感: Object.assign({ 富兰克林: 0, 克洛泽: 0, 菲茨: 0, 瑙雅: 0, 茜拉: 0 }, stage.affinity || {}),
        心声: {}, 回想: {},
        user档案: { 船: f.ship, 职位: f.role, 外貌: f.look.trim(), 背景: f.past.trim() },
      };
      if (typeof insertOrAssignVariables !== 'function') throw new Error('环境缺少 insertOrAssignVariables, 无法写入自定义开局, 请更新酒馆助手');
      await insertOrAssignVariables({ stat_data: stat }, { type: 'chat' });
      lastStat = stat; prevStat = null; // 与变量事件同款: 本地缓存立即可用, 顶栏与仪表即刻按新开局渲染
      openingConfirmed = true;
      openingView = 'cards';
      switchTab('story');
      renderAll(true);
      await sendText(buildCustomInstruction(f, stage, role), { customStart: true, preEscaped: true });
      // 失败路径由 sendText 统一呈现(状态栏报错), 指令未入楼时玩家可回开场白页重试
    } catch (e) {
      if (hint) hint.textContent = '出错: ' + (e && e.message ? e.message : e);
    } finally { customBusy = false; }
  }

  // 第0楼全部 swipe(含单条), 供开场白页与防呆使用; readOpenings 要求>=2条, 分工不同
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

  // NAV 标签随锁定状态改名: 可选时「开场白」, 开始对话后「序章」
  function updateOpeningNav() {
    const lab = doc.querySelector('#exp-shell-root .exp-nav-item[data-tab="opening"] .exp-nav-lab');
    if (!lab) return;
    const lid = safeLastMessageId();
    lab.textContent = (lid === 0) ? '开场白' : '序章';
  }

  // 单张开场白卡片: 拼出卡片 HTML, 并回报是否 If 线(供分组用)
  function buildOpeningCardHtml(it, ord, cur, selectable) {
    const meta = metaForSwipe(ord);
    const body = (String(it.text).match(/<initvar>([\s\S]*?)<\/initvar>/i) || [])[1] || '';
    const time = parseYamlField(body, '时间');
    const loc = parseYamlField(body, '地点');
    const img = meta ? metaImg(meta) : '';
    const mrow = (ico, text) => `<div class="exp-open-mrow">${ico}<span>${escapeHtml(text)}</span></div>`;
    const html = `
      <div class="exp-open-card${selectable ? ' sel' : ''}${it.i === cur ? ' cur' : ''}" data-swipe="${it.i}">
        <div class="exp-open-img">${img ? `<img loading="lazy" src="${img}" onerror="this.style.opacity=.2">` : ''}</div>
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

  // 分组: META 带 line 字段的归 if 线, 其余(含解析失败的兜底卡)归正传
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
    // 自定义组: 可选期恒在最前; 序章只读期只有当初走的是自定义开局(第0楼仍停在面板 swipe 0)才展示并标"当前"
    const customGroup = items.length && (selectable || cur === 0)
      ? sect('自定义') + `<div class="exp-open-cards custom-solo">${customCardHtml(selectable, !selectable && cur === 0)}</div>`
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
        if (card.dataset.custom) { openingView = 'custom'; renderOpeningTab(); return; }
        card.classList.add('busy');
        chooseOpening(+card.dataset.swipe);
      });
    });
  }

  // 选定开局: 切 swipe(已是当前则跳过) → 记确认 → 落座正文页
  async function chooseOpening(n) {
    const lid = safeLastMessageId();
    if (lid !== 0) return;
    const info = readOpeningsAll();
    if (!info) return;
    if (n !== info.cur) await switchOpening(n);
    openingConfirmed = true;
    switchTab('story');
  }

  // ════ 正文渲染与生成 · 发送与生成/删除 ════
  function setStoryStatus(text) {
    const el = doc.getElementById(SEL.storyStatus);
    if (el) el.textContent = text || '';
  }

  let sending = false;
  let currentGenId = null;
  let stopped = false;
  let pendingStop = false; // 点停止时生成还没真正开始(仍在记录用户消息阶段, currentGenId 还是空): 记一笔, 落库后直接放弃本次生成
  // 自家原生生成进行中时"生成开始前的末楼 id"。原生管线(/trigger)边生成边把半成品楼层写进聊天,
  // 非 null 即表示 chat 尾部可能有半成品: renderStoryLog 据此截断, 避免半成品楼层与流式气泡双显。
  // 读写方: runGeneration 入口置、finally 权威渲染前清; renderStoryLog 消费。新增重绘入口时须过这道闸
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

  // ---- 删除楼层: 垃圾桶进入多选, 点楼层勾选, 确认后整层删除; AI与玩家楼层都可删, 第0楼开场白不动
  let delMode = false;
  const delSel = new Set();

  // 二次确认: 第一次点删除进入武装态(变红), 3秒内再点才真删; 改选/超时自动回退
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
    delMode = on;
    delSel.clear();
    const row = doc.querySelector('#exp-shell-root .exp-story-inputrow');
    const bar = doc.getElementById(SEL.storyDelbar);
    if (row) row.style.display = on ? 'none' : '';
    if (bar) bar.style.display = on ? '' : 'none';
    if (on) closeDiffPanel(); // 输入行隐藏了, 摘要面板一并收起
    if (on && bar) animateOnce(bar, 'exp-in-soft'); // 进入删楼模式浮现工具栏; 退出即时收起
    updateDelBar();
    setStoryStatus('');
    renderStoryLog();
  }

  async function onDelToggle() {
    if (sending) return;
    if (delMode) { setDelMode(false); return; }
    await commitUserEditIfOpen(); // 删楼选择态会重建日志, 先落定开着的编辑器
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
    if (Date.now() - delArmedAt < 300) return; // 双击/连点误触当成同一次点击, 忽略掉这次"确认", 武装态保留等玩家真正再点一次
    if (delArmTimer) { clearTimeout(delArmTimer); delArmTimer = null; }
    delArmed = false;
    const ids = Array.from(delSel).sort((a, b) => a - b);
    if (btn) { btn.disabled = true; btn.classList.remove('armed'); }
    setStoryStatus('删除中...');
    try {
      // 原生 /cut(闭区间, 每删一楼发一次 MESSAGE_DELETED 供插件感知): 连续 id 合并成段少跑几趟,
      // 段间按起点降序执行——先删高楼层段, 低楼层段的 id 不会因前移而错位
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
      storyHtmlCache.clear(); // 楼层号整体前移, 旧缓存的 message_id 全部对不上号
      setDelMode(false);
      renderAll(true);
    } catch (e) {
      // /cut 无事务: 中途失败时前面的段已删成, 楼层号已整体位移, delSel 里剩余的 id 全部不可信——
      // 留在删除模式会让玩家按错位的楼层再删。安全做法是按"删除已发生"收尾: 清缓存、退出删除模式、整体重渲染。
      // 报错必须写在 setDelMode 之后: setDelMode 内部会清空状态行
      lastStat = null; prevStat = null;
      storyHtmlCache.clear();
      setDelMode(false);
      renderAll(true);
      setStoryStatus('出错: ' + (e && e.message ? e.message : e));
    }
  }

  // ---- 用户楼层就地编辑: 双击自己的发言直接改文本, 主要配合"重新生成"用(发错话不用整层删AI+用户楼) ----
  // editState 非空即编辑中: {mid, draft}; draft 随输入实时同步, renderStoryLog 整体重建后由
  // applyUserEdit 按它恢复编辑器, 变量事件等外部触发的重绘不会吃掉玩家打了一半的字
  let editState = null;

  // 把编辑态套到已渲染的日志 DOM 上: 目标用户楼层整体替换成编辑器(用户楼层没有思维链折叠bar, 整层替换无损)
  function applyUserEdit(log) {
    if (!editState) return;
    const turn = log.querySelector('.exp-story-turn.user[data-mid="' + editState.mid + '"]');
    if (!turn) { editState = null; return; } // 楼层已不在(被删/错位): 编辑态失去对象, 放弃
    turn.classList.add('editing');
    turn.innerHTML = '<div class="exp-story-edit">'
      + '<textarea title="Ctrl+Enter 保存, Esc 取消"></textarea>'
      + '<div class="exp-story-edit-row">'
      + '<button class="exp-edit-btn exp-edit-cancel">取消</button>'
      + '<button class="exp-edit-btn primary exp-edit-save">保存</button>'
      + '</div></div>';
    const ta = turn.querySelector('textarea');
    ta.value = editState.draft;
    const grow = () => { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }; // 上限交给 CSS max-height
    grow();
    ta.addEventListener('input', () => { if (editState) editState.draft = ta.value; grow(); });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); closeUserEdit(true); }
      // Esc 不在这里处理: onDocKey 的 Escape 分支先于"焦点在输入框"的排除判断, ESC_CLOSERS 一处收口
    });
    turn.querySelector('.exp-edit-save').addEventListener('click', () => closeUserEdit(true));
    turn.querySelector('.exp-edit-cancel').addEventListener('click', () => closeUserEdit(false));
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  async function openUserEdit(mid) {
    if (sending || delMode || openingBusy) return;
    if (editState) {
      if (editState.mid === mid) return; // 双击的就是编辑中的这层(如双击选词): 不重开, 草稿不动
      await closeUserEdit(true);        // 换目标: 先落定上一处, 草稿不静默丢弃
      if (editState) return;            // 上一处保存失败仍占着编辑态, 不抢
    }
    let raw = null;
    try {
      const m = getChatMessages(mid)[0];
      if (m && m.role === 'user') raw = m.message; // 只编辑用户楼层, 编辑器里给未经显示管线的原文
    } catch (e) {}
    if (raw == null) return;
    editState = { mid: mid, draft: raw };
    const log = doc.getElementById(SEL.storyLog);
    if (log) {
      applyUserEdit(log); // 直接套在现有 DOM 上, 不整体重建(保住滚动位置)
      animateOnce(log.querySelector('.exp-story-edit'), 'exp-in-soft'); // 进场淡入上浮; 外部重绘恢复编辑器的路径不重播
    }
    setStoryStatus('编辑中...');
  }

  // save=true 保存草稿(空内容视为放弃, 还原原文), false 直接还原; 保存失败时编辑器保持打开不吞草稿
  async function closeUserEdit(save) {
    if (!editState) return;
    const mid = editState.mid;
    const text = String(editState.draft == null ? '' : editState.draft).trim();
    if (save && text) {
      try {
        await setChatMessages([{ message_id: mid, message: text }], { refresh: 'affected' });
        storyHtmlCache.delete(mid); // 楼层文本变了, 缓存的提取结果作废
      } catch (e) {
        setStoryStatus('出错: ' + (e && e.message ? e.message : e));
        return;
      }
      // 改正文没有会发原生事件的路径(斜杠命令只能改角色/名字), 手动补发给依赖编辑事件的插件:
      // MESSAGE_EDITED=数据已改, MESSAGE_UPDATED=DOM 已绘(refresh:'affected' 到这里已完成原生重绘)。
      // 补发失败不影响"保存成功", 不走上面的 return; 插件在回调里改写楼层的话, 下方权威渲染会读到最新内容
      try {
        await eventEmit(tavern_events.MESSAGE_EDITED, mid);
        await eventEmit(tavern_events.MESSAGE_UPDATED, mid);
      } catch (e) { console.warn('[航海日志] 补发编辑事件失败', e); }
    }
    editState = null;
    setStoryStatus(save && !text ? '空内容未保存, 已还原' : '');
    renderStoryLog();
  }

  // 其他会动楼层/重建日志的动作(发送/重新生成/进删楼/退出外壳)接管前, 把开着的编辑器先落定:
  // 有内容直接保存——玩家"改完就点重新生成"的主流程不需要先点保存; 空内容还原原文
  function commitUserEditIfOpen() {
    return editState ? closeUserEdit(true) : Promise.resolve();
  }

  // 双击自己的发言进入就地编辑(桌面); 委托绑定在日志容器上(ensureStoryDom), 整体重建 innerHTML 后依然有效
  function onStoryLogDblclick(e) {
    const turn = e.target.closest('.exp-story-turn.user');
    if (!turn || turn.classList.contains('editing')) return;
    const mid = +turn.dataset.mid;
    if (!Number.isInteger(mid)) return;
    openUserEdit(mid); // 可否进入(生成中/删楼中等)由 openUserEdit 统一把关
  }

  // ---- 触屏双触(double-tap)进入编辑 ----
  // 原生 dblclick 在移动端不可靠(iOS Safari 常不派发/被双击缩放吃掉), 触屏用两次快速轻点自行判定;
  // CSS 给用户楼层加了 touch-action:manipulation 关掉浏览器双击缩放, 但保留长按选字(能照常复制原文)。
  // 桌面鼠标仍走原生 dblclick; 个别环境两路对同一楼层重复触发时, 由 openUserEdit 的同 mid 分支挡下(幂等)
  let tapDown = null; // {x, y, t} 本次触摸按下点: 用于判定"这是一次轻点"(按住短、位移小)
  let lastTap = null; // {mid, x, y, t} 上一次轻点: 与本次组成双触
  const TAP_MOVE_TOL = 12, TAP_HOLD_MS = 350, TAP_GAP_MS = 400, TAP_RADIUS = 30;

  function onStoryTapDown(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    tapDown = { x: e.clientX, y: e.clientY, t: Date.now() };
  }

  function onStoryTapUp(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    const down = tapDown;
    tapDown = null;
    // 不是轻点(按住太久=长按选字, 位移太大=滚动/拖动): 不参与双触判定, 连带清掉半次记录防错配
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
    lastTap = null; // 消费掉: 三连点不会连开两次
    openUserEdit(mid); // 可否进入(生成中/删楼中等)由 openUserEdit 统一把关
  }

  // 发送与重生成共用: 挂流式 → /trigger 原生生成(原生自己落库) → 校验落库; 生成期间点"停止"中断。
  // 调用方须已 setGenerating(true) 上锁; 本函数在 finally 统一解锁。
  // genId 自产自用: 只作流式气泡 DOM 标记与"本次生成期间"过滤旗标, 原生管线没有生成 id 概念
  async function runGeneration() {
    stopped = false;
    const genId = 'exp_gen_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    currentGenId = genId;
    genBaselineId = safeLastMessageId(); // 生成前基线: 此后 chat 尾部新出现的楼层是原生流式正在写的半成品
    setStoryStatus('生成中...');

    // 按 genId 标记查找/新建气泡, 不缓存节点引用: renderStoryLog 可能在生成期间被外部触发(如重进外壳)
    // 整体重建 #exp-story-log, 缓存的节点引用会失效, 误抓到的"最后一个子节点"可能是真实楼层气泡
    let streamRAF = null;
    let latestFullText = '';
    // 酒馆原生思维链("推理"设置开了自动解析时): reasoningState 从 none→thinking→done,
    // 标签在流式阶段就被酒馆摘走存进这里, 不会再出现在 latestFullText 里(见 onReasoning)
    let liveReasoning = '';
    let reasoningState = 'none';
    // 显示进度落后于"已到达的文本"(revealedLen), 每帧只追一部分差距(而不是直接跳到最新), 把后端一次性
    // 推来一大段文本(常见于代理/网关攒批转发, 不是逐字符真流式)摊开成连续几帧的渐进增长, 消掉肉眼可见的
    // "整段突然冒出来"的颗粒感; 差距越大追得越快(等比逼近, 每帧消掉约1/6), 不会让追赶过程持续很久,
    // 也不需要按具体后端的推送节奏调一个固定的"每秒几个字"速度。真正到达的文本永远是上限, 不会显示还没
    // 生成出来的内容; 生成结束后 finally 里 cancelAnimationFrame 直接丢弃还没追完的尾巴, 交给权威渲染
    // (renderStoryLog)一次性补全——一次性补全的"跳"只会出现这一次, 不会在生成过程中反复出现。
    let revealedLen = 0;
    const flushStream = () => {
      streamRAF = null;
      const log = doc.getElementById(SEL.storyLog);
      if (!log) return;
      const target = extractMainText(latestFullText, true);
      const existing = log.querySelector('[data-stream-genid="' + genId + '"]');
      const stick = nearBottom(log); // 更新前判定: 玩家上翻阅读时不被逐 token 拽回底部
      if (!target) {
        // 还没出现正文标签(<maintext>/<content>): 思维链阶段。抓到思维链内容就展示"思考中"分隔线(缓转星徽+从中心向两端
        // 流出的光点, 不露出具体文字——思维链原文常复述格式要求/夹杂举例标签, 直接流出来观感杂乱且没
        // 意义, 等标签闭合后统一折叠展示); 一个标签都还没吐出时维持原来的占位 "…" 气泡
        // 优先用酒馆原生 reasoningState(自动解析开启时标签不会留在正文流里); extractThought 兜底给
        // 没开自动解析、标签留在正文里的预设
        const liveThought = liveReasoning || extractThought(latestFullText, true);
        const wantThinking = reasoningState !== 'none' || !!liveThought;
        setStoryStatus(wantThinking ? '思考中...' : '构思中...');
        const html = wantThinking
          ? '<div class="exp-story-thinking"><span class="exp-story-thinking-rule l"></span><span class="exp-story-thinking-ico">' + ICO.thought + '</span><span class="exp-story-thinking-rule r"></span></div>'
          : '<div class="exp-story-text">' + storyTextHtml('…', true) + '</div>';
        if (existing && existing.classList.contains('thinking') === wantThinking) {
          if (wantThinking) { /* 纯装饰样式, 内容不随思维链文字增长而变化, 不用每帧重写 */ } else { existing.innerHTML = html; }
        } else {
          if (existing) existing.remove(); // 气泡类型("思考中"/占位)切换时结构不同, 不复用节点
          log.insertAdjacentHTML('beforeend', '<div class="exp-story-turn assistant' + (wantThinking ? ' thinking' : '') + (motionOK() ? ' exp-in-bubble' : '') + '" data-stream-genid="' + genId + '">' + html + '</div>');
        }
        if (stick) log.scrollTop = log.scrollHeight;
        updateJumpBtn();
        return; // 不排下一帧, 等下一次 onStream(新token到达)再重新渲染快照, 避免空转 rAF
      }
      setStoryStatus('生成中...');
      if (revealedLen > target.length) revealedLen = target.length; // 防御性钳位, 目前实测不会发生
      const gap = target.length - revealedLen;
      if (gap > 0) revealedLen = Math.min(target.length, revealedLen + Math.max(1, Math.ceil(gap / 6)));
      const text = target.slice(0, revealedLen);
      if (existing && !existing.classList.contains('thinking')) {
        // 只更新正文内部, 不整体重建元素: 气泡入场动画不随 token 重放, 顶部折叠bar(含玩家可能已点开的状态)保持不动
        const body = existing.querySelector('.exp-story-text');
        if (body) paintStoryText(body, text || '…');
      } else {
        if (existing) existing.remove(); // 从"思考中"样式切到正文气泡, 结构不同不复用节点
        // 走到这里说明正文标签已出现, 意味着思维链标签也已经闭合(闭合标签在正文标签之前), 直接按非流式取完整思维链
        const thought = liveReasoning || extractThought(latestFullText);
        const foldHtml = thought ? thoughtFoldHtml(thought, null, false) : '';
        log.insertAdjacentHTML('beforeend', '<div class="exp-story-turn assistant' + (motionOK() ? ' exp-in-bubble' : '') + '" data-stream-genid="' + genId + '">' + foldHtml + '<div class="exp-story-text">' + storyTextHtml(text || '…', true) + '</div></div>');
      }
      if (stick) log.scrollTop = log.scrollHeight;
      updateJumpBtn();
      // 还没追上最新文本: 继续排下一帧接着追; 追上后停止排帧, 等下一次 onStream 或本帧后续到达的文本再启动
      if (revealedLen < target.length) streamRAF = requestAnimationFrame(flushStream);
    };
    // 逐token到达时只记最新全文, 每帧最多真正渲染一次(rAF合并), 避免长回复下每个token都全量重跑正则+
    // 整段innerHTML替换(O(n^2)级)造成可感知卡顿; 最终结果由生成结束后的 renderStoryLog 权威落地, 丢中间帧不影响正确性。
    // 原生 STREAM_TOKEN_RECEIVED 的参数是累计全文(不是增量), 且没有生成 id: 以 currentGenId 仍是本次 genId
    // 作"本次生成期间"过滤(sending 锁保证前端不并发; /trigger 期间原生生成锁被本次持有, 窗口内的 token 必属本次)
    const onStream = (fullText) => {
      if (currentGenId !== genId) return;
      // 停止意图重发: 玩家在 /trigger 内建启动延迟(~101ms)或等锁窗口内点停止时, stopGeneration 会空转,
      // 首个 token 到达即补一刀, 把竞态窗口收敛到一个 token
      if (stopped) { try { SillyTavern.stopGeneration(); } catch (e) {} }
      latestFullText = fullText;
      if (streamRAF == null) streamRAF = requestAnimationFrame(flushStream);
    };
    eventOn(tavern_events.STREAM_TOKEN_RECEIVED, onStream);
    // 原生落库的辅助信号: 记下新楼 id 供 finally 精确失效缓存; 成败主判据按末楼增量, 不依赖此事件
    let receivedId = null;
    const onReceived = mid => { if (currentGenId === genId) receivedId = mid; };
    eventOn(tavern_events.MESSAGE_RECEIVED, onReceived);
    // 酒馆原生"推理"自动解析: 标签在流式阶段就被摘走存进这里, 不进 latestFullText。
    // 只有一路生成在跑(sending 锁着), 不需要按 message_id 过滤
    const onReasoning = (reasoning, duration, mid, state) => {
      liveReasoning = reasoning || liveReasoning;
      reasoningState = state;
      if (streamRAF == null) streamRAF = requestAnimationFrame(flushStream);
    };
    eventOn(tavern_events.STREAM_REASONING_DONE, onReasoning);

    try {
      // 用户消息已入楼层, /trigger 不会再建用户楼(原生输入框为空); await=true 等整条 Generate 管线跑完,
      // 原生自己落库并写好 extra.reasoning, 本前端不手动 createChatMessages(否则同一回复出现双楼层)
      if (typeof triggerSlash !== 'function') throw new Error('环境缺少 triggerSlash, 无法走原生生成管线, 请更新酒馆助手');
      await triggerSlash('/trigger await=true');
      // 成败判定不信返回值(其他脚本占着生成锁时 /trigger 等锁10s超时会静默返回空串): 查末楼是否新增非用户楼层
      const after = safeLastMessageId();
      const newFloor = (after != null && genBaselineId != null && after > genBaselineId)
        ? (getChatMessages(after)[0] || null) : null;
      const gotReply = !!(newFloor && newFloor.role !== 'user');
      if (stopped) setStoryStatus('已停止'); // 半截文本已按原生语义保留成正式楼层, 玩家可读可删可重生成
      else if (gotReply) setStoryStatus('');
      else setStoryStatus('未收到回复，可点击左侧按钮重新生成');
    } catch (e) {
      setStoryStatus(stopped ? '已停止' : ('出错: ' + (e && e.message ? e.message : e)));
    } finally {
      eventRemoveListener(tavern_events.STREAM_TOKEN_RECEIVED, onStream);
      eventRemoveListener(tavern_events.STREAM_REASONING_DONE, onReasoning);
      eventRemoveListener(tavern_events.MESSAGE_RECEIVED, onReceived);
      if (streamRAF != null) { cancelAnimationFrame(streamRAF); streamRAF = null; } // 丢弃尚未执行的末帧, 避免在权威渲染之后再插一次过期的临时气泡
      // 生成期间 onVarUpdateEnded 可能按当时的末楼缓存过半截正文, 防御性失效(receivedId 优先, 兜底末楼)
      const rid = receivedId != null ? receivedId : safeLastMessageId();
      if (rid != null && rid >= 0) storyHtmlCache.delete(rid);
      genBaselineId = null; // 必须在权威渲染之前清, 否则新楼层被 renderStoryLog 的生成期截断挡住不显示
      currentGenId = null;
      setGenerating(false);
      renderStoryLog();
      animateOptions(); // 只在生成结束路径播放选项浮现; init/重进外壳的 renderStoryLog 不播
      renderAll();
    }
  }

  // 玩家文本进 /send 前的转义: 文本会经过酒馆斜杠命令解析器, 管道符会截断命令、{{...}}会被当宏替换。
  // 转义顺序必须先反斜杠再其他, 否则会把刚转出来的反斜杠再转一遍。
  // mock 环境只做对应的逆变换, 不模拟真实解析器的宏替换——转义的完备性只能真机验证(见 tests/README.md)
  function escapeSlashText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
  }

  // 发送一段文本: 输入框与行动选项共用; 返回是否成功入楼, false 时调用方自行恢复
  // opts.customStart: 自定义开局的指令楼——第0楼合法地停在消息0面板上, 跳过下面的防呆拦截
  async function sendText(text, opts) {
    if (sending || delMode || openingBusy || !text) return false; // 开场白正在切换(第0楼swipe), 避免与本次发送错位
    await commitUserEditIfOpen(); // 编辑器开着时先落定草稿再发送, 两处输入不互相吞
    if (editState) return false;  // 保存失败, 编辑器还开着: 拦下发送, 玩家先处理编辑器里的报错
    // 防呆: 还停在开场面板页时拦下发送, 引导先选开场白
    if (!(opts && opts.customStart) && onPanelSwipe()) {
      switchTab('opening');
      setStoryStatus('请先选择一条开场白');
      return false;
    }
    setGenerating(true); // 立即上锁, 覆盖"记录+生成"整段, 防重复发送
    try {
      setStoryStatus('记录中...');
      // 原生 /send: 只入楼不触发生成(生成由 runGeneration 的 /trigger 单独发起, "记录与生成分离"语义保留),
      // 原生自发 MESSAGE_SENT/USER_MESSAGE_RENDERED 供插件感知; 不带 at= 参数(会 reloadCurrentChat 全量重渲染)
      if (typeof triggerSlash !== 'function') throw new Error('环境缺少 triggerSlash, 无法走原生发送管线, 请更新酒馆助手');
      const beforeSend = safeLastMessageId();
      // preEscaped: 调用方已按字段转义(自定义开局指令楼, 模板里的 {{user}} 宏须放行), 不再整体转义
      await triggerSlash('/send ' + ((opts && opts.preEscaped) ? text : escapeSlashText(text)));
      // triggerSlash 失败可能是静默的(不抛错): 按楼层增量判定, 末楼必须 +1 且是用户楼
      const afterSend = safeLastMessageId();
      const sentFloor = afterSend != null ? (getChatMessages(afterSend)[0] || null) : null;
      if (afterSend !== (beforeSend == null ? -1 : beforeSend) + 1 || !sentFloor || sentFloor.role !== 'user') {
        throw new Error('用户消息未能入楼');
      }
      renderStoryLog();
      scrollStoryToEnd(); // 自己发言总是回到最新, 即便刚才在上翻
      const log = doc.getElementById(SEL.storyLog);
      if (log) { const turns = log.querySelectorAll('.exp-story-turn.user'); animateOnce(turns[turns.length - 1], 'exp-in-bubble'); }
    } catch (e) {
      pendingStop = false; // 清掉可能残留的停止意图, 避免污染下一次发送
      setStoryStatus('出错: ' + (e && e.message ? e.message : e));
      setGenerating(false);
      return false;
    }
    // 记录阶段(还没进 runGeneration/没有 currentGenId)就被按了停止: 消息已入楼层, 但放弃这次生成
    // 悬空的 user 楼层留给"重生成"直接重试, 和现有的失败/中止路径走同一套恢复逻辑
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
    if (!ok) { ta.value = text; autogrowStoryTA(); } // 失败/被拦时还回输入框
  }

  // 行动选项点击: 按设置直接发送, 或填入输入框改后再发
  function onOptionClick(text) {
    if (sending) return;
    if (optionMode === 'insert') {
      const ta = doc.getElementById(SEL.storyTextarea);
      if (ta) { ta.value = text; autogrowStoryTA(); ta.focus(); }
      return;
    }
    sendText(text);
  }

  // 发送按钮: 空闲时发送, 生成中时充当停止
  function onSendButton() {
    if (!sending) { onSend(); return; }
    if (currentGenId) {
      // 生成已经真正开始(拿到了 genId): 原生全局停止。先置 stopped 再调 API——若停止点落在 /trigger 的
      // 内建启动延迟/等锁窗口内, stopGeneration 会空转, onStream 的停止重发分支靠这个标志补刀。
      // 原生停止会把半截文本保留成正式楼层(有意接受的原生语义, 停止≠丢弃);
      // 想改成"停止即丢弃半截"的做法: runGeneration 的 stopped 分支里对新增末楼补一次 /cut, 代价是插件会先看到
      // 楼层出现再看到被删, 且与原生界面的停止行为不一致, 故不默认启用
      stopped = true;
      try {
        if (SillyTavern && typeof SillyTavern.stopGeneration === 'function') SillyTavern.stopGeneration();
        else console.warn('[航海日志] 环境缺少 SillyTavern.stopGeneration, 无法停止原生生成');
      } catch (e) {}
    } else {
      // 还在"记录用户消息"阶段, 没有可停的生成请求: 只记意图, 不调用全局停止
      // (那会误杀页面上其他脚本正在跑的生成), sendText 落库后会自己看这个标志放弃本次生成
      pendingStop = true;
    }
    setStoryStatus('停止中...');
  }

  // 重生成: 上一条是回复则删掉重roll, 是悬空 user 楼层(上次失败/中止)则直接重试; 开场白不动
  async function onRegenerate() {
    if (sending || delMode) return;
    await commitUserEditIfOpen(); // 编辑→直接点重roll的主流程: 草稿先落定, 新回复按改后的发言生成
    if (editState) return;        // 保存失败, 编辑器还开着: 不带着未落定的草稿去重roll
    const lastId = getLastMessageId();
    if (lastId == null || lastId < 0) return;
    const last = getChatMessages(lastId)[0];
    const isReply = last && last.role !== 'user';
    if (isReply && lastId === 0) return; // 开场白不可重生成
    setGenerating(true);
    try {
      if (isReply) {
        // 原生 /cut 删末楼(发 MESSAGE_DELETED, 数据库类插件可同步回滚该楼数据);
        // triggerSlash 失败可能是静默的, 按末楼 id 回退与否校验删除真的发生了
        if (typeof triggerSlash !== 'function') throw new Error('环境缺少 triggerSlash, 无法走原生删楼管线, 请更新酒馆助手');
        await triggerSlash('/cut ' + lastId);
        if (safeLastMessageId() !== lastId - 1) throw new Error('删除上一条回复未生效');
        lastStat = null; prevStat = null; // 删掉的回复带走了它的变量
        storyHtmlCache.delete(lastId); // 该楼内容即将被新回复取代, 旧缓存作废
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
  // 递归比较 prev/cur, 把值不同的叶子路径收进 out(路径用 '.' 拼接, 数组下标同样当一段拼, 如 '角色列表.0.姓名')。
  // 两边都是同类型的对象/数组(普通对象对普通对象, 数组对数组)时才往下钻取具体是哪个子键变了;
  // 类型对不上(比如整段从对象变成了字符串)或一边缺失(新增/删除)就整段直接标记为变化, 不再往里细分
  function collectChangedPaths(prev, cur, prefix, out) {
    if (_.isEqual(prev, cur)) return;
    const bothObj = cur !== null && typeof cur === 'object' && prev !== null && typeof prev === 'object'
      && Array.isArray(cur) === Array.isArray(prev);
    if (!bothObj) { out.add(prefix); return; }
    const keys = Array.isArray(cur) ? cur.map((_v, i) => i) : Object.keys(cur);
    keys.forEach(k => collectChangedPaths(prev[k], cur[k], prefix ? prefix + '.' + k : String(k), out));
  }

  // 手写复刻 JSON.stringify(obj,null,2) 的缩进/引号/逗号格式(不能偷懒调JSON.stringify再拼字符串, 那样拿不到
  // 每个key对应的具体文本位置), 同时按 collectChangedPaths 算出的路径集合, 给变化过的那个key整行
  // (含其下全部嵌套内容, 一次性套一层高亮span)。没变的部分和 JSON.stringify(obj,null,2) 的输出逐字节一致。
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
    // 只标当前楼相对上一楼变化过的行, 上一楼那份历史快照本身不需要高亮
    const changed = new Set();
    if (prev) collectChangedPaths(prev, cur, '', changed);
    // 每段一个可折叠区; 以后要堆叠更多楼层直接往数组里加
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
    maybeRerollHero();   // 「每楼随机」开着且楼层号变了, 先重掷立绘快照再渲染
    const D = precomputedD || readMVU();
    const timeEl = doc.getElementById(SEL.topbarTime);
    if (timeEl) timeEl.textContent = D.时间 || '';
    const locEl = doc.getElementById(SEL.tbLoc);
    if (locEl) locEl.textContent = D.地点 || '';
    // BLANK 空态提示; 初始化事件到达重绘后自动清掉。生成中不碰状态行
    if (!sending) {
      const lid = safeLastMessageId();
      const blank = (lid == null || lid <= 0) && !D.时间 && !D.地点;
      const st = doc.getElementById(SEL.storyStatus);
      if (blank) setStoryStatus('航志初始化中…');
      else if (st && st.textContent === '航志初始化中…') setStoryStatus('');
    }
    // 变量事件每回合都触发, 默认只重绘当前可见页; 其余页在 switchTab 切过去时无条件补渲染,
    // 长对话下把每回合的 7 页重建降到 1 页。full=true 用于切主题/删楼/切开场白/首屏等低频结构性刷新, 一次性重绘全部。
    // story/settings 的 render 是 null(见 PANELS 定义处注释), filter 天然把它们排除在外, 不用再单独提醒"无需在此重绘"。
    const root = doc.getElementById(SHELL_ID);
    const activeEl = root && root.querySelector('.exp-panel.active');
    const activeName = activeEl ? activeEl.dataset.panel : null;
    const targets = (full || !activeName)
      ? PANELS.filter(p => p.render)
      : PANELS.filter(p => p.render && p.key === activeName);
    targets.forEach(p => renderSafe(p.key, () => p.render(D)));
  }

  // ════ 事件绑定与生命周期 · 变量事件监听 ════
  // 具名引用(而非内联箭头函数): 脚本重跑(换聊天/reload, 见下方"切聊天重载")时需要在 pagehide 里精确摘掉这两个
  // 监听器, 否则每次重跑都会在酒馆助手事件总线上叠加一份, 之后每次变量更新触发 N 次重绘(N随重跑次数递增)
  const onVarUpdateEnded = (variables, variables_before_update) => {
    try {
      if (!variables || !variables.stat_data) return;
      if (!variables_before_update || !_.isEqual(variables.stat_data, variables_before_update.stat_data)) {
        if (variables_before_update && variables_before_update.stat_data) prevStat = _.cloneDeep(_.omit(variables_before_update.stat_data, ['$internal']));
        lastStat = _.cloneDeep(_.omit(variables.stat_data, ['$internal']));
        const lid = safeLastMessageId();
        storyHtmlCache.delete(lid); // 该楼可能在前端外生成/改写(如原生流式中途重进时缓存过半截正文), 下次渲染按最新内容重取
        // 用事件回传的前后值 diff 变化条目, 重绘后按 data-stat 定位播放滚动+脉冲
        const afterD = readMVU(variables.stat_data);
        statDelta = (variables_before_update && variables_before_update.stat_data)
          ? diffStat(readMVU(variables_before_update.stat_data), afterD)
          : null;
        if (statDelta) { lastDelta = statDelta; closeDiffPanel(); } // 摘要面板内容已过期, 收起
        renderAll(false, afterD); // afterD 与 renderAll 内部会算出的 D 是同一份数据, 直接复用省一次重复计算
        playStatFx();
        // 两类来源都会走到这里: ① 前端外完成的生成(重进外壳前原生界面的回合), 变量事件是它唯一的
        // "生成完成"信号, 补一次正文重建让该楼即时上屏; ② 自家原生生成期间(原生管线边生成边写楼层,
        // MVU 随流式中途解析), 此时闸门拦下 renderStoryLog——半成品楼层交给流式气泡与 finally 的权威渲染,
        // 但闸外的变量侧更新(lastStat/renderAll/playStatFx)照跑, 仪表随流式实时跳动是有意行为。
        // 外壳隐藏时白干, 重进时反正会整体重建
        if (isShellVisible() && !sending) renderStoryLog();
      }
    } catch (e) {
      console.warn('[航海日志] 变量更新渲染失败', e);
    }
  };
  eventOn('mag_variable_update_ended', onVarUpdateEnded);

  // 新聊天首屏: MVU 初始化发的是 VARIABLE_INITIALIZED(非 UPDATE_ENDED), 监听它拿到初始变量后重绘
  const onVarInitialized = variables => {
    try {
      if (variables && variables.stat_data) lastStat = _.cloneDeep(_.omit(variables.stat_data, ['$internal']));
      renderAll(true);
    } catch (e) {
      console.warn('[航海日志] 变量初始化渲染失败', e);
    }
  };
  eventOn('mag_variable_initiailized', onVarInitialized);

  // ════ 事件绑定与生命周期 · 切聊天重载 ════
  // 本脚本是"脚本库"类型脚本, 常驻在自己独立的iframe里(doc = window.parent.document 就是因为脚本本身
  // 和被操作的酒馆页面不是同一个document), 不属于随楼层消息生灭的消息iframe。酒馆切换聊天(含在角色下
  // 开一个新聊天, 不删旧的)默认*不会*销毁重建这个iframe, 也就不会重跑本文件、不会触发下面的 pagehide——
  // 官方文档原话是"如果需要跨聊天文件注入或在新开聊天时重新注入, 你可以监听 CHAT_CHANGED 事件"——反过来说,
  // 默认情况下就是不会重新注入。不处理的后果: lastStat/prevStat/storyHtmlCache(按裸 message_id 缓存正文/思维链提取结果)和整个外壳
  // DOM 都会停留在旧聊天那次 init() 建立的状态, 但 mag_variable_update_ended 等事件是全局事件总线、不区分
  // 聊天文件, 新聊天照样会在同一个脚本实例上触发——新旧聊天楼层号一重叠, storyHtmlCache 就把旧聊天缓存的
  // 正文当成新聊天的内容显示出来, 变量 diff 也会拿旧聊天的 lastStat 去和新聊天的新值比出没道理的跳变。
  // 用官方推荐的 reloadIframe()(本质是这个iframe自己的 location.reload())而不是手写"清哪些缓存/挪哪些DOM":
  // 一次真正的 reload 会让 pagehide 清理和 init() 首屏初始化各自照常完整走一遍, 不用为"手动重跑一遍 init() 会
  // 不会让某个只在顶层注册一次的监听器(比如下面 positionPill 的 resize 监听)重复叠加"这类细节操心。
  // lastKnownChatId 用 SillyTavern.getCurrentChatId() 而不是等第一次 CHAT_CHANGED 事件来定基准: 脚本注入
  // 时机如果晚于酒馆派发的第一次 CHAT_CHANGED, 等事件来定基准会把用户第一次真正切聊天误判成"首次建档"而漏判。
  // 同一聊天内因重新应用正则等原因重复触发 CHAT_CHANGED 时 chat_id 不变, 不应该借机重载打断玩家。
  let lastKnownChatId = null;
  try { lastKnownChatId = SillyTavern.getCurrentChatId(); } catch (e) {}
  const onChatChanged = chatId => {
    if (lastKnownChatId !== null && lastKnownChatId !== chatId) { try { reloadIframe(); } catch (e) {} return; }
    lastKnownChatId = chatId;
  };
  eventOn(tavern_events.CHAT_CHANGED, onChatChanged);

  // 玩家在原生界面用左右箭头滑动第0楼(入口面板↔开场白)时, 胶囊显隐要跟着变: 面板在场让位, 开场白在场兜底。
  // 外壳内切开场白也发这个事件, 但那时外壳可见、入口本就收起, isShellVisible 守卫住不误渲染
  eventOn(tavern_events.MESSAGE_SWIPED, () => { if (!isShellVisible()) renderEntry(); });

  // ════ init ════
  async function init() {
    // 等 MVU 脚本就绪再初始化(时序依赖: 首屏 readMVU 要能读到变量); 等待失败/超时不阻断,
    // 后续 mag_variable_initiailized 事件到达时还会整体重绘一次
    try {
      if (typeof waitGlobalInitialized === 'function') await waitGlobalInitialized('Mvu');
    } catch (e) {}
    lastStat = null; prevStat = null; // 切聊天清缓存, 按当前聊天重读, 避免首屏空白
    storyHtmlCache.clear(); // 切到另一个聊天, message_id 与内容全部对不上号
    // 脚本重跑时旧外壳监听器已失效, 先删旧壳再重建
    const prevVisible = isShellVisible(); // 首次加载无外壳 → false(原生优先); 切聊天保留上次状态
    ['exp-shell-root', 'exp-entry'].forEach(id => {
      const el = doc.getElementById(id);
      if (el) el.remove();
    });
    ensureShell();
    ensureEntry();
    ensureStoryDom();
    applyVisibility(prevVisible);
    pollAcu(); // 数据库插件入口: 立即判一次显隐, 未检测到则限时轮询等它加载
    // 事件桥: 消息0面板「全屏启程」。外壳未就绪时面板点击只置标志, 这里补进
    try { window.parent.addEventListener('exp-shell-enter', onShellEnter); } catch (e) {}
    try { doc.addEventListener('keydown', onDocKey); } catch (e) {}
    try {
      doc.addEventListener('pointerdown', onPressDown);
      doc.addEventListener('pointermove', onPressMove);
      doc.addEventListener('pointerup', clearPressed);
      doc.addEventListener('pointercancel', clearPressed);
    } catch (e) {}
    try {
      if (window.parent.__EXP_ENTER_FLAG) {
        window.parent.__EXP_ENTER_FLAG = false;
        if (!isShellVisible()) toggleShell();
      }
    } catch (e) {}
    try {
      renderAll(true);
      renderStoryLog();
      // 切聊天时外壳保持可见的路径: fresh 且未确认开局 → 落开场白页
      if (isShellVisible() && canSelectOpening() && !openingConfirmed) switchTab('opening');
    } catch (e) {
      applyVisibility(false); // 回退: 恢复原生聊天, 不让玩家卡死在黑屏上
      throw e; // 交给外层 errorCatched(若可用)通过酒馆通知呈现给玩家
    }
  }

  // ════ 事件绑定与生命周期 · 快捷键与卸载清理 ════
  // Esc 收起浮层用的关闭栈: 按优先级列出"当前是否打开 + 怎么关掉"。新增一种可用Esc关闭的浮层时,
  // 只需要在这个数组里加一条, 不用再去 onDocKey 里找准确的插入位置手写 if 分支。
  // 灯箱是独立的模态层(自己的 lbKey 监听器, 打开/关闭时动态挂摘), 不进这个表, onDocKey 见 lbState 直接让行。
  const ESC_CLOSERS = [
    { isOpen: () => !!doc.getElementById(SEL.storyDiffpanel), close: closeDiffPanel },
    { isOpen: () => !!doc.querySelector('#exp-shell-root .exp-poipop'), close: () => doc.querySelector('#exp-shell-root .exp-poipop').remove() },
    { isOpen: () => !!editState, close: () => closeUserEdit(false) }, // Esc=放弃草稿还原原文(编辑器的通行语义)
    { isOpen: () => delMode, close: () => setDelMode(false) },
  ];

  // 快捷键: Esc 从上到下关掉当前最上层浮层; 正文页按数字 1-9 直接点选对应行动选项
  // (数字键在 输入框聚焦/生成中/删楼/灯箱打开 时不抢键; Esc 不受这些限制)
  function onDocKey(e) {
    try {
      if (!isShellVisible()) return;
      if (acuUiOpen()) return; // 数据库插件界面盖在外壳上时不抢 Esc/数字键
      // Esc: 依次收起一层浮层。灯箱有自己的 lbKey 处理, 这里让行不重复关
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

  // ---- 全局按压反馈 ----
  // 手机端没有 hover, 可点元素按下缺少即时反馈; pointerdown 统一加 .exp-pressed(下陷), 释放/滑走回弹。
  // 清单以上方 CSS 的 :active 缩放规则为基准, 另补侧栏导航/思维链折叠头/回到最新按钮;
  // 桌面鼠标同样生效, 与 :active 叠加表现一致。监听挂 doc(委托), 面板重绘重建 DOM 不影响
  const PRESSABLE_SEL = '.exp-nav-item,.exp-iconbtn,.exp-story-opt,.exp-mate-btn,.exp-prey-card,.exp-theme-opt,.exp-hunt-go,.exp-del-btn,.exp-edit-btn,.exp-tb-close,.exp-mapctl button,.exp-entry-pill,.exp-story-thought-head,.exp-story-jump';
  let pressState = null; // {el, x, y}

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
    // 按住后滑动超过阈值: 玩家在滚动不是在点按, 立即回弹
    if (Math.abs(e.clientX - pressState.x) > 12 || Math.abs(e.clientY - pressState.y) > 12) clearPressed();
  }

  // iframe 销毁(切聊天/reload/关闭聊天)时清理
  window.addEventListener('pagehide', () => {
    try {
      window.parent.removeEventListener('resize', positionPill);
      window.parent.removeEventListener('resize', onMapResize);
      window.parent.removeEventListener('exp-shell-enter', onShellEnter);
      doc.removeEventListener('keydown', onDocKey);
      doc.removeEventListener('click', onDiffOutside);
      doc.removeEventListener('pointerdown', onPressDown);
      doc.removeEventListener('pointermove', onPressMove);
      doc.removeEventListener('pointerup', clearPressed);
      doc.removeEventListener('pointercancel', clearPressed);
      eventRemoveListener('mag_variable_update_ended', onVarUpdateEnded);
      eventRemoveListener('mag_variable_initiailized', onVarInitialized);
      eventRemoveListener(tavern_events.CHAT_CHANGED, onChatChanged);
      const root = doc.getElementById(SHELL_ID);
      // 仅清理属于本次运行的外壳; 已被新 iframe 接管(owner 不同)则不动
      if (!root || root.dataset.owner === SHELL_TOKEN) {
        if (root) root.remove();
        const entry = doc.getElementById(SEL.entry);
        if (entry && entry.dataset.owner === SHELL_TOKEN) entry.remove();
        const style = doc.getElementById(SEL.shellStyle);
        if (style) style.remove();
        // 放出原生聊天, 避免脚本卸载后原生界面仍被隐藏
        const hideStyle = doc.getElementById(SEL.shellHideStyle);
        if (hideStyle) hideStyle.remove();
      }
    } catch (e) {}
  });

  // 启动: 酒馆助手环境用 jQuery ready + 官方 errorCatched 包裹(init 抛错时弹酒馆通知而非静默失败);
  // 两者任一缺失(如本地预览页)退回原生 DOMContentLoaded, 行为一致但没有报错通知
  if (typeof $ === 'function' && typeof errorCatched === 'function') {
    $(errorCatched(init));
  } else {
    (document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', init) : init();
  }
})();
