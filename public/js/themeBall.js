// The theme toggle's steel ball. A tap is handled by the ordinary click listener in BaseLayout
// (DrTheme.toggle, next theme; touch only ever taps); this file adds the mouse drag (pick the ball up, let go, it drops into
// the nearest of the three pockets) and moves the ball with a small spring whenever the theme
// changes, from the button, the keyboard, ?theme= or anywhere else. A few faint filings trail
// the ball. The loop only runs while something is moving; at rest nothing is scheduled.
// Look and sizes: global.css, "Theme toggle". Loaded once from BaseLayout.astro; self-starting.
(function () {
    const btn = document.getElementById('themeToggle');
    const track = btn && btn.querySelector('.theme-toggle__track');
    if (!btn || !track || !window.DrTheme) return;

    const root = document.documentElement;
    const ball = track.querySelector('.theme-toggle__ball');
    const cv = track.querySelector('.theme-toggle__dust');
    const ctx = cv.getContext('2d');
    ctx.scale(2, 2); // the canvas is 2x the 60 x 24 groove
    const THEMES = ['dark', 'light', 'steel'];
    const C = [12, 30, 48];           // pocket centers inside the groove
    const MIN = 9, MAX = 51;          // how far a dragged ball may go
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let idx = Math.max(0, THEMES.indexOf(DrTheme.current()));
    let x = C[idx], v = 0, drag = false, moved = 0, downX = 0, suppress = false, frame = 0, last = 0;
    let color = '#1abc9c';

    // Faint filings: nine dots that rest in a loose ring around the ball and lag behind it.
    const dust = Array.from({ length: 9 }, (_, k) => {
        const a = (k / 9) * Math.PI * 2 + Math.random() * 0.5;
        return { a, r: 11.5 + Math.random() * 3, x: 0, y: 0, vx: 0, vy: 0 };
    });
    dust.forEach((d) => { d.x = x + Math.cos(d.a) * d.r; d.y = 12 + Math.sin(d.a) * d.r * 0.5; });

    function readColor() {
        color = getComputedStyle(root).getPropertyValue('--accent-fill').trim() || color;
    }

    function draw() {
        ball.style.transform = 'translateX(' + (x - 9) + 'px) scaleX(' + (1 + Math.min(0.1, Math.abs(v) * 0.02)).toFixed(3) + ')';
        ball.style.setProperty('--ball-roll', (x * 14).toFixed(0) + 'deg');
        ctx.clearRect(0, 0, 60, 24);
        if (still) return;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = color;
        for (const d of dust) { ctx.beginPath(); ctx.arc(d.x, d.y, 0.9, 0, 6.2832); ctx.fill(); }
    }

    function step(now) {
        frame = 0;
        const f = Math.min(3, (now - (last || now)) / 16.67 || 1); last = now;
        let busy = drag;
        if (!drag) {
            const t = C[idx];
            if (still) { x = t; v = 0; }
            else {
                v = (v - (x - t) * 0.1 * f) * Math.pow(0.86, f);
                x += v * f;
                if (Math.abs(v) > 0.03 || Math.abs(x - t) > 0.05) busy = true; else { x = t; v = 0; }
            }
        }
        if (!still) {
            for (const d of dust) {
                const hx = x + Math.cos(d.a) * d.r, hy = 12 + Math.sin(d.a) * d.r * 0.5;
                d.vx = (d.vx + (hx - d.x) * 0.06 * f) * Math.pow(0.8, f);
                d.vy = (d.vy + (hy - d.y) * 0.06 * f) * Math.pow(0.8, f);
                d.x += d.vx * f; d.y += d.vy * f;
                if (Math.abs(d.vx) + Math.abs(d.vy) > 0.04 || Math.abs(hx - d.x) > 0.2) busy = true;
            }
        }
        draw();
        if (busy) frame = requestAnimationFrame(step); else last = 0;
    }
    function wake() { if (!frame) frame = requestAnimationFrame(step); }

    const posOf = (e) => { const r = track.getBoundingClientRect(); return (e.clientX - r.left) * (60 / r.width); };

    btn.addEventListener('pointerdown', (e) => {
        if (e.button || e.pointerType === 'touch') return; // touch only taps: a shaky finger must never miss a theme
        drag = true; moved = 0; downX = posOf(e);
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
    });
    btn.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const p = posOf(e);
        moved = Math.max(moved, Math.abs(p - downX));
        if (moved > 4) { x = Math.max(MIN, Math.min(MAX, p)); v = 0; wake(); }
    });
    btn.addEventListener('pointerup', () => {
        if (!drag) return;
        drag = false;
        if (moved > 4) {
            suppress = true; setTimeout(() => { suppress = false; }, 80); // the click that follows a drag is not a tap
            const nearest = C.reduce((b, c, i) => (Math.abs(c - x) < Math.abs(C[b] - x) ? i : b), 0);
            DrTheme.go(THEMES[nearest]);
            idx = nearest;
        }
        wake();
    });
    btn.addEventListener('pointercancel', () => { drag = false; wake(); });
    window.addEventListener('click', (e) => {
        if (suppress && e.target.closest && e.target.closest('#themeToggle')) { e.stopImmediatePropagation(); e.preventDefault(); suppress = false; }
    }, true);

    // The ball follows the theme however it changed.
    new MutationObserver(() => {
        const next = Math.max(0, THEMES.indexOf(DrTheme.current()));
        readColor();
        if (next === idx && !drag) return;
        idx = next;
        if (!still) dust.forEach((d) => { const a = Math.random() * 6.2832; d.vx += Math.cos(a) * 2.2; d.vy += Math.sin(a) * 2.2; });
        wake();
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    readColor();
    draw();
})();
