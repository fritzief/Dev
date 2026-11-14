/* Helpers */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Splash landing */
(function splash() {
  const el = $('#splash'), btn = $('#splash-enter');
  const done = () => { document.body.classList.remove('splash-lock'); };
  if (!el || document.documentElement.classList.contains('no-splash')) { done(); return; }
  
  const typed = $('.splash-typed', el), text = 'Fritzie Faura';
  if (reduceMotion) { typed.textContent = text; el.classList.add('typed'); }
  else {
    let n = 0;
    setTimeout(function tick() {
      n++;
      typed.textContent = text.slice(0, n);
      if (n < text.length) setTimeout(tick, 110);
      else setTimeout(() => el.classList.add('typed'), 250);
    }, 500);
  }
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    try { sessionStorage.setItem('splash-seen', '1'); } catch (e) {}
    el.classList.add('hide');
    done();
    if (window.__startMusic) window.__startMusic();
    setTimeout(() => el.remove(), 800);
    removeEventListener('keydown', onKey);
  };
  const onKey = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); close(); } };
  btn.addEventListener('click', close);
  addEventListener('keydown', onKey);
  btn.focus({ preventScroll: true });
})();

/* Menu */
(function menu() {
  const btn = $('#menu-btn'), drawer = $('#drawer'), scrim = $('#scrim');
  if (!btn || !drawer) return;
  const set = (open) => {
    drawer.classList.toggle('open', open);
    scrim.classList.toggle('on', open);
    btn.setAttribute('aria-expanded', open);
  };
  btn.addEventListener('click', () => set(!drawer.classList.contains('open')));
  scrim.addEventListener('click', () => set(false));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
})();

/* Theme */
(function theme() {
  const btn = $('#theme-btn');
  if (!btn) return;
  const root = document.documentElement;
  const metaTheme = $('meta[name="theme-color"]');
  const apply = (t) => {
    if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    btn.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
    if (metaTheme) metaTheme.setAttribute('content', t === 'dark' ? '#1b0b0f' : '#f6e8de');
  };
  
  apply('light');
  btn.addEventListener('click', () => {
    apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
})();


(function spy() {
  const links = $$('.drawer nav a[href^="#"]');
  const secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  secs.forEach(s => io.observe(s));
})();


(function filters() {
  $$('.filters').forEach(wrap => {
    const scope = wrap.closest('section') || document;
    wrap.addEventListener('click', e => {
      const b = e.target.closest('button[data-f]');
      if (!b) return;
      $$('button', wrap).forEach(x => x.classList.toggle('on', x === b));
      $$('.card', scope).forEach(c => {
        c.hidden = b.dataset.f !== 'all' && c.dataset.cat !== b.dataset.f;
      });
      scope.dispatchEvent(new CustomEvent('filterchange'));
    });
  });
})();


(function carousel() {
  const root = $('#cert-carousel');
  if (!root) return;
  const track = $('.carousel-track', root);
  const dotsBox = $('.car-dots', root);
  const count = $('.car-count', root);
  const section = root.closest('section');
  let slides = [], cur = 0, raf, lockTimer, locked = false;

  const visible = () => $$('.card', track).filter(c => !c.hidden);

  
  const leftFor = i => {
    const s = slides[i];
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    return Math.min(max, Math.max(0, s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2));
  };

  
  function jump(left) {
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = left;
    requestAnimationFrame(() => { track.style.scrollBehavior = ''; });
  }

  function goTo(i, smooth = true) {
    if (!slides.length) return;
    cur = (i + slides.length) % slides.length;
    const animate = smooth && !reduceMotion;
    locked = true;
    clearTimeout(lockTimer);
    if (animate) track.scrollTo({ left: leftFor(cur), behavior: 'smooth' });
    else jump(leftFor(cur));
    lockTimer = setTimeout(() => { locked = false; }, animate ? 700 : 50);
    mark();
  }

  function mark() {
    $$('button', dotsBox).forEach((d, n) => {
      d.classList.toggle('on', n === cur);
      d.setAttribute('aria-selected', n === cur);
    });
    count.textContent = slides.length ? (cur + 1) + ' / ' + slides.length : 'No certificates in this category.';
    $$('.car-btn', root).forEach(b => { b.disabled = slides.length < 2; });
  }

  function build() {
    slides = visible();
    dotsBox.textContent = '';
    slides.forEach((s, n) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'Certificate ' + (n + 1));
      d.addEventListener('click', () => goTo(n));
      dotsBox.appendChild(d);
    });
    cur = 0;
    if (slides.length) jump(leftFor(0)); else jump(0);
    mark();
  }

  // Follow finger swipes / manual scrollinng
  track.addEventListener('scroll', () => {
    if (locked) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (!slides.length) return;
      let best = 0, dist = Infinity;
      slides.forEach((s, n) => {
        const d = Math.abs(leftFor(n) - track.scrollLeft);
        if (d < dist) { dist = d; best = n; }
      });
      if (best !== cur) { cur = best; mark(); }
    });
  }, { passive: true });

  $$('.car-btn', root).forEach(b => b.addEventListener('click', () => goTo(cur + Number(b.dataset.dir))));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(cur - 1); }
  });
  section.addEventListener('filterchange', build);

  // Re-center after rotating the phone or resizing the window
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => goTo(cur, false), 120); });
  addEventListener('orientationchange', () => setTimeout(() => goTo(cur, false), 250));
  addEventListener('load', () => goTo(cur, false)); 
  build();
})();

/* Dots */
(function dots() {
  const c = $('#dots');
  if (!c || reduceMotion) return;
  const ctx = c.getContext('2d');
  const root = document.documentElement;
  let w, h, pts = [], color = '#c9967f';
  const readColor = () => { color = getComputedStyle(root).getPropertyValue('--rose').trim() || '#c9967f'; };
  const resize = () => {
    w = c.width = innerWidth; h = c.height = innerHeight;
    pts = Array.from({ length: Math.round(w * h / 28000) }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.6 + .6, vy: Math.random() * .25 + .05
    }));
  };
  resize(); readColor();
  new MutationObserver(readColor).observe(root, { attributes: true, attributeFilter: ['data-theme', 'style'] });
  // Phones change innerHeight while scrolling (address bar), so only rebuild when the width changes.
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth !== lastW) { lastW = innerWidth; resize(); }
  });
  (function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.globalAlpha = .35;
    pts.forEach(p => {
      p.y -= p.vy; if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    });
    requestAnimationFrame(draw);
  })();
})();

/* Stars: small twinkling stars, dark mode only */
(function stars() {
  const root = document.documentElement;
  const c = document.createElement('canvas');
  c.id = 'stars';
  c.setAttribute('aria-hidden', 'true');
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let w, h, list = [], color = '#f1d3c8', raf = 0, lastW = innerWidth;

  const isDark = () => root.getAttribute('data-theme') === 'dark';
  const readColor = () => { color = getComputedStyle(root).getPropertyValue('--petal').trim() || '#f1d3c8'; };

  function build() {
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(160, Math.round(w * h / 9000));
    list = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.1 + .3,
      a: Math.random() * .5 + .3,
      sp: Math.random() * 1.5 + .5,
      ph: Math.random() * 6.283,
      big: Math.random() < .12
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = .6;
    list.forEach(s => {
      const tw = reduceMotion ? 1 : .55 + .45 * Math.sin(t / 1000 * s.sp + s.ph);
      ctx.globalAlpha = s.a * tw;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      if (s.big) {
        const k = s.r * 3.5;
        ctx.beginPath();
        ctx.moveTo(s.x - k, s.y); ctx.lineTo(s.x + k, s.y);
        ctx.moveTo(s.x, s.y - k); ctx.lineTo(s.x, s.y + k);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  const loop = t => { draw(t); raf = requestAnimationFrame(loop); };

  function update() {
    cancelAnimationFrame(raf); raf = 0;
    if (!isDark()) { ctx.clearRect(0, 0, w, h); return; }
    readColor();
    if (reduceMotion) draw(0); else raf = requestAnimationFrame(loop);
  }

  build(); update();
  // re-run when the theme or the color wheel changes
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-theme', 'style'] });
  addEventListener('resize', () => {
    if (innerWidth !== lastW) { lastW = innerWidth; build(); update(); }
  });
})();

/* Player */
(function player() {
  // File names must match the files in the music/ folder exactly.
  const tracks = [
    { title: 'Daylight',              artist: 'Taylor Swift', src: 'music/Taylor Swift - Daylight.m4a' },
    { title: 'Enchanted',             artist: 'Taylor Swift', src: 'music/Taylor Swift - Enchanted.m4a' },
    { title: 'I Knew It, I Knew You', artist: 'Taylor Swift', src: 'music/Taylor Swift - I Knew It, I Knew You.m4a' },
    { title: 'Lover',                 artist: 'Taylor Swift', src: 'music/Taylor Swift - Lover.m4a' },
    { title: 'Opalite',               artist: 'Taylor Swift', src: 'music/Taylor Swift - Opalite.m4a' },
    { title: 'Paper Rings',           artist: 'Taylor Swift', src: 'music/Taylor Swift - Paper Rings.m4a' },
    { title: 'Ruin the Friendship',   artist: 'Taylor Swift', src: 'music/Taylor Swift - Ruin the Friendship.m4a' },
    { title: 'So High School',        artist: 'Taylor Swift', src: 'music/Taylor Swift - So High School.m4a' },
    { title: 'Style',                 artist: 'Taylor Swift', src: 'music/Taylor Swift - Style.m4a' },
    { title: 'The Fate of Ophelia',   artist: 'Taylor Swift', src: 'music/Taylor Swift - The Fate of Ophelia.m4a' },
    { title: 'You Belong With Me',    artist: 'Taylor Swift', src: 'music/Taylor Swift - You Belong With Me.m4a' }
  ];

  const el = id => document.getElementById(id);
  const root = el('player');
  if (!root) return;

  /* Saved state (track, position, volume, was it playing) */
  const KEY = 'player-state';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = typeof saved.vol === 'number' ? Math.min(1, Math.max(0, saved.vol)) : 0.7;
  el('vol').value = audio.volume;

  let idx = 0, shuffle = false, repeat = true, seeking = false;
  let wantPlay = true;                      
  let pendingSeek = null;                  
  let autoPaused = false;                   
  let failures = 0, lastSave = 0;
  // While the splash screen is showing, the music waits for the "Enter portfolio" tap.
  const splashActive = !!document.getElementById('splash') && !document.documentElement.classList.contains('no-splash');
  let started = !splashActive;

  const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
  const setNote = t => { el('note').textContent = t || ''; };

  function save() {
    const t = pendingSeek != null ? pendingSeek : (audio.currentTime || 0);
    try { localStorage.setItem(KEY, JSON.stringify({ i: idx, t, playing: wantPlay, vol: audio.volume })); } catch (e) {}
  }

  // Playlist
  const list = el('tracks');
  tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.innerHTML = '<div><span></span><small></small></div>';
    li.querySelector('span').textContent = t.title;
    li.querySelector('small').textContent = t.artist;
    li.addEventListener('click', () => { load(i); play(); });
    list.appendChild(li);
  });

  function load(i, startAt) {
    idx = (i + tracks.length) % tracks.length;
    const t = tracks[idx];
    pendingSeek = startAt > 0 ? startAt : null;
    audio.src = encodeURI(t.src);
    el('title').textContent = el('mini-title').textContent = t.title;
    el('artist').textContent = el('mini-artist').textContent = t.artist;
    [...list.children].forEach((li, n) => li.classList.toggle('on', n === idx));
    el('seek').value = 0; el('cur').textContent = '0:00'; el('dur').textContent = '0:00';
    setNote('');
  }

  function play() {
    const p = audio.play();
    if (p && p.catch) p.catch(err => {
      if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return; 
      setNote('Couldn’t play this track. Check the file name in the music folder.');
    });
  }
  function toggle() { audio.paused ? play() : audio.pause(); }

  function next(auto) {
    if (shuffle && tracks.length > 1) {
      let n; do { n = Math.floor(Math.random() * tracks.length); } while (n === idx);
      load(n);
    } else {
      if (auto && !repeat && idx === tracks.length - 1) { wantPlay = false; audio.pause(); save(); return; }
      load(idx + 1);
    }
    play();
  }

  // Events
  audio.addEventListener('play', () => { wantPlay = true; sync(true); save(); });
  audio.addEventListener('playing', () => { failures = 0; setNote(''); });
  audio.addEventListener('pause', () => {
    if (autoPaused) autoPaused = false;          
    else if (!audio.ended) wantPlay = false;     
    sync(false); save();
  });
  audio.addEventListener('ended', () => next(true));
  
  audio.addEventListener('error', () => {
    const bad = tracks[idx].title;
    failures++;
    if (failures < tracks.length) {
      load(idx + 1); play();
      setNote('Skipped “' + bad + '” (file not found or unreadable).');
    } else {
      setNote('Couldn’t load any track. Check the file names in the music folder.');
    }
  });
  audio.addEventListener('loadedmetadata', () => {
    el('dur').textContent = fmt(audio.duration);
    if (pendingSeek != null) {
      if (isFinite(audio.duration)) audio.currentTime = Math.min(pendingSeek, Math.max(0, audio.duration - 1));
      pendingSeek = null;
    }
  });
  audio.addEventListener('timeupdate', () => {
    el('cur').textContent = fmt(audio.currentTime);
    if (audio.duration && !seeking) el('seek').value = (audio.currentTime / audio.duration) * 100;
    const now = Date.now();
    if (now - lastSave > 1000) { lastSave = now; save(); }
  });

  function sync(playing) {
    const icon = playing ? '❚❚' : '▶';
    el('mini-play').textContent = icon; el('play').textContent = icon;
    el('vinyl').classList.toggle('spin', playing);
    el('vinyl-mini').classList.toggle('spin', playing);
  }

  // Controls
  el('mini-play').addEventListener('click', toggle);
  el('play').addEventListener('click', toggle);
  el('next').addEventListener('click', () => next(false));
  el('prev').addEventListener('click', () => {
    if (audio.currentTime > 3) audio.currentTime = 0; else { load(idx - 1); play(); }
  });
  el('shuffle').addEventListener('click', e => {
    shuffle = !shuffle;
    e.currentTarget.classList.toggle('on', shuffle);
    e.currentTarget.setAttribute('aria-pressed', shuffle);
  });
  el('repeat').addEventListener('click', e => {
    repeat = !repeat;
    e.currentTarget.classList.toggle('on', repeat);
    e.currentTarget.setAttribute('aria-pressed', repeat);
  });
  el('seek').addEventListener('pointerdown', () => { seeking = true; });
  el('seek').addEventListener('pointerup', () => { seeking = false; });
  el('seek').addEventListener('change', () => { seeking = false; });
  el('seek').addEventListener('input', e => { if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration; });
  el('vol').addEventListener('input', e => { audio.volume = e.target.value; save(); });

  el('expand').addEventListener('click', e => {
    const open = root.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', open);
  });

  // Tap anywhere outside the player to close the playlist (handy on phones)
  document.addEventListener('click', e => {
    if (root.classList.contains('open') && !root.contains(e.target)) {
      root.classList.remove('open');
      el('expand').setAttribute('aria-expanded', 'false');
    }
  });

  /* Stop when the site is closed or hidden, resume when it comes back */
  const halt = () => {
    save();
    if (!audio.paused) { autoPaused = true; audio.pause(); }
  };
  addEventListener('pagehide', halt);
  addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) halt();
    else if (started && wantPlay && audio.paused) play();
  });
  addEventListener('pageshow', e => { if (e.persisted && started && wantPlay && audio.paused) play(); });

  
  load(0, 0);

  const wake = ['pointerup', 'mouseup', 'touchend', 'click', 'keydown'];
  const hint = on => el('mini-play').classList.toggle('attention', on);
  const kick = e => {
    if (!audio.paused) return;
    if (e && e.target && e.target.closest && e.target.closest('#mini-play, #play')) return;
    play();
  };
  const stopWaiting = () => { wake.forEach(ev => document.removeEventListener(ev, kick)); hint(false); };
  audio.addEventListener('playing', stopWaiting);

  window.__startMusic = () => { started = true; wantPlay = true; play(); };

  if (started && wantPlay) {
    const p = audio.play();
    if (p && p.catch) p.catch(err => {
      if (err && err.name === 'AbortError') return;
      wake.forEach(ev => document.addEventListener(ev, kick, { passive: true }));
      hint(true);
    });
  }
})();

/* Contact */
(function contact() {
  const form = document.getElementById('contactform');
  if (!form) return;
  const alertBox = document.getElementById('form-alert');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const f = form.elements;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending...';

    try {
      const res = await fetch('https://formsubmit.co/ajax/fritzieabuyabor@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: f.name.value,
          email: f.email.value,
          _subject: f.subject.value,
          message: f.message.value,
          _replyto: f.email.value,
          _honey: f._honey.value
        })
      });
      if (!res.ok) throw new Error('bad response');
      alertBox.textContent = 'Thanks! Your message was sent.';
      form.reset();
    } catch (err) {
      alertBox.textContent = 'Something went wrong. Please email fritzieabuyabor@gmail.com directly.';
    }
    alertBox.hidden = false;
    btn.disabled = false; btn.textContent = 'Submit message';
  });
})();

/* Extras */
(function extras() {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* Shared */
  const menuBtn = document.getElementById('menu-btn');
  const drawer = document.getElementById('drawer');
  const scrim = document.getElementById('scrim');
  const colorBtn = document.getElementById('color-btn');
  const colorPop = document.getElementById('colorpop');

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    if (scrim) scrim.classList.toggle('on', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open);
  }
  function setColor(open) {
    if (!colorPop) return;
    colorPop.hidden = !open;
    if (colorBtn) colorBtn.setAttribute('aria-expanded', open);
  }

  /* Typing */
  (function typedLoop() {
    const el = document.querySelector('.typed-name');
    if (!el) return;
    const text = 'Fritzie Faura';
    if (reduce) { el.textContent = text; return; }
    let i = 0, dir = 1;
    (function tick() {
      i += dir;
      el.textContent = text.slice(0, i);
      let wait = dir === 1 ? 120 : 60;
      if (i === text.length) { dir = -1; wait = 1600; }
      else if (i === 0) { dir = 1; wait = 500; }
      setTimeout(tick, wait);
    })();
  })();

  /* Ripples */
  (function ripples() {
    if (reduce) return;
    const c = document.createElement('canvas');
    c.id = 'ripples';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    let w, h, rings = [], running = false;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      w = innerWidth; h = innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); addEventListener('resize', resize);
    const color = () => getComputedStyle(root).getPropertyValue('--accent').trim() || '#7d1426';

    function add(x, y, max, life, delay) {
      rings.push({ x, y, max, life, t: -(delay || 0) });
      if (!running) { running = true; requestAnimationFrame(frame); }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      const col = color();
      rings = rings.filter(r => r.t < r.life);
      rings.forEach(r => {
        r.t += 16;
        if (r.t < 0) return;
        const p = r.t / r.life, e = 1 - Math.pow(1 - p, 3);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.max * e, 0, 6.283);
        ctx.strokeStyle = col;
        ctx.globalAlpha = (1 - p) * .55;
        ctx.lineWidth = 2.5 * (1 - p) + .5;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      if (rings.length) requestAnimationFrame(frame); else { running = false; ctx.clearRect(0, 0, w, h); }
    }
    addEventListener('pointerdown', e => {
      add(e.clientX, e.clientY, 120, 900, 0);
      add(e.clientX, e.clientY, 80, 800, 140);
      add(e.clientX, e.clientY, 45, 700, 280);
    });
    let lx = -999, ly = -999, lt = 0;
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const now = performance.now();
      if (now - lt < 110 || Math.hypot(e.clientX - lx, e.clientY - ly) < 45) return;
      lt = now; lx = e.clientX; ly = e.clientY;
      add(lx, ly, 38, 650, 0);
    });
  })();

  /* Wheel */
  (function colorWheel() {
    if (!colorBtn || !colorPop) return;
    const cv = colorPop.querySelector('canvas');
    const wrap = colorPop.querySelector('.wheel-wrap');
    const dot = colorPop.querySelector('.wheel-dot');
    const swWrap = document.getElementById('swatches');
    const ctx = cv.getContext('2d');
    const S = cv.width, R = S / 2;

    // Draw
    const img = ctx.createImageData(S, S);
    const hsv = (hue, s, v) => {
      const f = n => { const k = (n + hue / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
      return [f(5) * 255, f(3) * 255, f(1) * 255];
    };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x - R + .5, dy = y - R + .5, r = Math.hypot(dx, dy) / R, i = (y * S + x) * 4;
      if (r > 1) { img.data[i + 3] = 0; continue; }
      const hue = (360 - Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      const rgb = hsv(hue, Math.min(1, r * 1.05), 1);
      img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    const VARS = ['--bg', '--surface', '--ink', '--muted', '--line', '--accent', '--deep', '--rose', '--petal', '--on', '--shift'];
    let cur = null;

    function apply() {
      if (!cur) { VARS.forEach(v => root.style.removeProperty(v)); return; }
      const h = cur.h, sat = Math.round(30 + 60 * cur.s);
      const dark = root.getAttribute('data-theme') === 'dark';
      const set = (k, v) => root.style.setProperty(k, v);
      const hsl = (s, l) => 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
      if (dark) {
        set('--bg', hsl(45, 7));      set('--surface', hsl(35, 11));
        set('--ink', hsl(50, 92));    set('--muted', hsl(15, 66));
        set('--line', hsl(25, 20));   set('--accent', hsl(sat, 62));
        set('--deep', hsl(sat, 22));  set('--rose', hsl(35, 66));
        set('--petal', hsl(55, 86));  set('--on', hsl(45, 7));
      } else {
        set('--bg', hsl(55, 92));     set('--surface', hsl(60, 96));
        set('--ink', hsl(55, 12));    set('--muted', hsl(15, 45));
        set('--line', hsl(35, 83));   set('--accent', hsl(sat, 30));
        set('--deep', hsl(sat, 30));  set('--rose', hsl(40, 64));
        set('--petal', hsl(60, 94));  set('--on', hsl(60, 96));
      }
      set('--shift', (h - 350) + 'deg');
    }
    function placeDot() {
      if (!cur) { dot.style.left = '50%'; dot.style.top = '50%'; return; }
      const a = -cur.h * Math.PI / 180, r = Math.min(1, cur.s) * 50;
      dot.style.left = (50 + Math.cos(a) * r) + '%';
      dot.style.top = (50 + Math.sin(a) * r) + '%';
    }
    function choose(h, s) {
      cur = { h: Math.round(h), s: s };
      apply(); placeDot();
    }
    function pick(e) {
      const b = wrap.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      const rad = b.width / 2, d = Math.min(Math.hypot(dx, dy), rad);
      const h = (360 - Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      choose(h, Math.max(.25, d / rad));
    }

    let down = false;
    wrap.addEventListener('pointerdown', e => { down = true; try { wrap.setPointerCapture(e.pointerId); } catch (x) {} pick(e); });
    wrap.addEventListener('pointermove', e => { if (down) pick(e); });
    wrap.addEventListener('pointerup',   () => { down = false; });
    wrap.addEventListener('pointercancel', () => { down = false; });

    // Swatches
    [20, 150, 200, 260, 320].forEach(hue => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', 'Color ' + hue);
      b.style.background = 'hsl(' + hue + ', 70%, 45%)';
      b.addEventListener('click', () => choose(hue, .8));
      swWrap.appendChild(b);
    });

    document.getElementById('color-reset').addEventListener('click', () => {
      cur = null; apply(); placeDot();
    });
    colorBtn.addEventListener('click', () => setColor(colorPop.hidden));

    // Observer
    new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    apply(); placeDot();
  })();

  /* Tour */
  (function tour() {
    const tourBtn = document.getElementById('tour-btn');
    if (!tourBtn) return;
    const q = s => document.querySelector(s);

    const steps = [
      { el: '.portrait',               t: 'Welcome!',     d: 'Hi, I’m Fritzie. This quick tour shows you around my portfolio.' },
      { el: '#menu-btn',               t: 'Menu button',  d: 'Tap this button to open the menu.' },
      { el: '.drawer nav',             t: 'Quick links',  d: 'Jump to any section of the site from here.', drawer: true },
      { el: '#colorpop',               t: 'Color wheel',  d: 'Drag on the wheel or tap a swatch to recolor the whole site.', drawer: true, color: true },
      { el: '#theme-btn',              t: 'Dark mode',    d: 'Switch between light and dark mode.', drawer: true },
      { el: '#cv-btn',                 t: 'Download CV',  d: 'Grab a copy of my CV as a PDF.', drawer: true },
      { el: '#about .prose p',         t: 'About me',     d: 'A short intro about who I am and what I’m studying.' },
      { el: '#projects .filters',      t: 'Projects',     d: 'Filter my work by Websites or Web apps.' },
      { el: '#skills .group',          t: 'Skills',       d: 'The languages, design tools, and IT skills I work with.' },
      { el: '#certificates .filters',  t: 'Certificates', d: 'Filter my certificates by category, then swipe or use the arrows to browse them.' },
      { el: '#education .timeline',    t: 'Education',    d: 'Where I’m studying Information Technology.' },
      { el: '#contactform .form-row',  t: 'Contact',      d: 'Send me a message in the form below. It goes straight to my email.' },
      { el: '#player',                 t: 'Music player', d: 'Press play, or tap the arrow to open the full playlist.' },
      { el: '#menu-btn',               t: 'That’s it!',   d: 'Open the menu and press “Website tour” any time to replay this.' }
    ];

    let i = -1, spot = null, card = null, block = null, raf = 0, idle = 0, timers = [];

    const isFixed = el =>
      getComputedStyle(el).position === 'fixed' || !!el.closest('#player, #drawer, #menu-btn');

    function start() {
      end();
      block = document.createElement('div'); block.className = 'tour-block';
      spot  = document.createElement('div'); spot.className  = 'tour-spot';
      card  = document.createElement('div'); card.className  = 'tour-card bottom';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', 'Website tour');
      document.body.append(block, spot, card);
      addEventListener('resize', track);
      addEventListener('scroll', onScroll, true);
      show(0);
    }

    function end() {
      clearTimeout(idle);
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout); timers = [];
      [block, spot, card].forEach(n => n && n.remove());
      block = spot = card = null; i = -1;
      removeEventListener('resize', track);
      removeEventListener('scroll', onScroll, true);
      setDrawer(false); setColor(false);
    }

    
    function onScroll() {
      if (!spot) return;
      spot.classList.add('moving');
      clearTimeout(idle);
      idle = setTimeout(() => { if (spot) spot.classList.remove('moving'); }, 150);
      track();
    }

    function revealInDrawer(el) {
      if (!drawer) return;
      const dr = drawer.getBoundingClientRect(), r = el.getBoundingClientRect(), pad = 12;
      if (r.height > dr.height - pad * 2 || r.top < dr.top + pad) drawer.scrollTop += r.top - dr.top - pad;
      else if (r.bottom > dr.bottom - pad) drawer.scrollTop += r.bottom - dr.bottom + pad;
    }

    function track() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!spot || i < 0) return;
        const el = q(steps[i].el); if (!el) return;
        const b = el.getBoundingClientRect(), p = 8, m = 4;
        
        const top = Math.max(b.top - p, m), bottom = Math.min(b.bottom + p, innerHeight - m);
        const left = Math.max(b.left - p, m), right = Math.min(b.right + p, innerWidth - m);
        spot.style.top = top + 'px';
        spot.style.left = left + 'px';
        spot.style.width = Math.max(0, right - left) + 'px';
        spot.style.height = Math.max(0, bottom - top) + 'px';
        card.className = 'tour-card ' + ((top + bottom) / 2 > innerHeight * .5 ? 'top' : 'bottom');
      });
    }

    function show(n) {
      i = n;
      const s = steps[i];
      timers.forEach(clearTimeout); timers = [];
      setDrawer(!!s.drawer);
      setColor(!!s.color);

      const el = q(s.el);
    
      if (!el || !el.getClientRects().length) {
        return n < steps.length - 1 ? show(n + 1) : end();
      }

      if (s.drawer) revealInDrawer(el);
      else if (!isFixed(el)) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });

      card.innerHTML =
        '<h3></h3><p></p><div class="tour-foot"><span class="mono"></span><div>' +
        '<button type="button" class="skip" data-a="skip">Skip</button>' +
        (i > 0 ? '<button type="button" data-a="back">Back</button>' : '') +
        '<button type="button" class="primary" data-a="next">' + (i === steps.length - 1 ? 'Done' : 'Next') + '</button></div></div>';
      card.querySelector('h3').textContent = s.t;
      card.querySelector('p').textContent = s.d;
      card.querySelector('.mono').textContent = (i + 1) + ' / ' + steps.length;
      try { card.querySelector('.primary').focus({ preventScroll: true }); } catch (e) {}

      track();
      timers = [setTimeout(track, 350), setTimeout(track, 750)];
    }

    const next = () => (i >= steps.length - 1 ? end() : show(i + 1));

    document.addEventListener('click', e => {
      const b = e.target.closest('.tour-card button'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'next') next(); else if (a === 'back') show(i - 1); else end();
    });
    document.addEventListener('keydown', e => {
      if (i < 0) return;
      if (e.key === 'Escape') end();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft' && i > 0) show(i - 1);
    });
    tourBtn.addEventListener('click', () => { setDrawer(false); setTimeout(start, 200); });
  })();
})();
