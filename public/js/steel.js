// Steel theme extras: the pointer-lit metal name, the lit grid, the engraved dial with a
// scroll-driven needle, a scroll-progress ring, and etch-in section titles. All of it lives
// only while <html data-theme="steel"> (a hidden theme, see theme.js); under any other theme
// nothing is injected, no listener is left running, and the classes are removed again.
// Loaded once from BaseLayout.astro; it starts itself (see the last line).
// Colors, sizes and the animation itself are CSS (global.css, "Steel theme extras").
window.DrSteel = (function () {
    const TITLES = '.work-heading,.about-heading,.casual-heading,.contact-heading,.experience-heading,.music-heading,.skills-heading';
    const SVG = 'http://www.w3.org/2000/svg';
    const root = document.documentElement;
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let live = null; // teardown for the running theme, or null

    function el(name, attrs, parent) {
        const node = document.createElementNS(SVG, name);
        for (const k in attrs) node.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(node);
        return node;
    }

    function buildDial() {
        const wrap = document.createElement('div');
        wrap.className = 'steel-dial';
        wrap.setAttribute('aria-hidden', 'true');
        const svg = el('svg', { viewBox: '-400 -400 800 800', focusable: 'false' }, wrap);
        [380, 300, 210, 120].forEach((r) => el('circle', { r, class: 'steel-dial__ring' }, svg));
        for (let i = 0; i < 120; i++) {
            const major = i % 10 === 0;
            const len = major ? 26 : 12;
            el('line', {
                x1: 0, y1: -380, x2: 0, y2: -380 + len,
                class: major ? 'steel-dial__tick steel-dial__tick--major' : 'steel-dial__tick',
                transform: 'rotate(' + (i * 3) + ')',
            }, svg);
        }
        const needle = el('g', { class: 'steel-dial__needle' }, svg);
        el('line', { x1: 0, y1: 40, x2: 0, y2: -300, class: 'steel-dial__hand' }, needle);
        el('circle', { r: 9, class: 'steel-dial__hub' }, svg);
        return wrap;
    }

    function buildProgress() {
        const wrap = document.createElement('div');
        wrap.className = 'steel-progress';
        wrap.setAttribute('aria-hidden', 'true');
        const svg = el('svg', { viewBox: '-26 -26 52 52', focusable: 'false' }, wrap);
        el('circle', { r: 20, class: 'steel-progress__track' }, svg);
        el('circle', { r: 20, class: 'steel-progress__arc', pathLength: 100 }, svg);
        const label = document.createElement('span');
        label.className = 'steel-progress__label';
        label.textContent = '0';
        wrap.appendChild(label);
        return { wrap, label };
    }

    function start() {
        if (live) return;
        const cleanup = [];
        const motion = !reduceMotion();
        const hero = document.querySelector('.hero-section');

        // Scroll progress: drives the dial needle and the ring.
        const progress = buildProgress();
        document.body.appendChild(progress.wrap);
        cleanup.push(() => progress.wrap.remove());
        let scrollFrame = 0;
        function readScroll() {
            scrollFrame = 0;
            const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const p = Math.min(1, Math.max(0, window.scrollY / max));
            root.style.setProperty('--steel-p', p.toFixed(4));
            progress.label.textContent = Math.round(p * 100);
        }
        function onScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(readScroll); }
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        readScroll();
        cleanup.push(() => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            cancelAnimationFrame(scrollFrame);
            root.style.removeProperty('--steel-p');
        });

        if (hero) {
            const dial = buildDial();
            hero.insertBefore(dial, hero.firstChild);
            cleanup.push(() => dial.remove());

            // Pointer-lit metal and grid. The light follows a fine pointer over the hero; with no
            // pointer it drifts across the name on its own. Reduced motion and touch screens get
            // one fixed light and no loop at all.
            //
            // Performance (2026-11-20): this loop used to read getBoundingClientRect() on the hero
            // and on every letter of the name, and write two custom properties to each of them,
            // every animation frame. Reads interleaved with writes forced a layout per letter per
            // frame, and --mx/--my on the hero restyled its whole subtree (the dial's ~130 SVG
            // nodes included). Under a 4x CPU slowdown that was about 49 ms a frame, which kept
            // the main thread busy. Now the geometry is measured once (and again on resize), each
            // frame only writes one pair of variables on the name and one on the grid, and the
            // idle drift runs at about 30 fps and not on touch screens. Each letter turns the
            // shared point into its own with calc(--nx - --ox) in CSS, so JS touches 2 elements
            // per frame, not 19.
            const letters = Array.from(hero.querySelectorAll('.hero-name__letter'));
            const name = hero.querySelector('.hero-name__letters');
            const grid = hero.querySelector('.hero-grid-bg') || hero;
            let pointer = null; // {x, y} in viewport coordinates, or null when idle
            let frame = 0;
            let inView = true;
            let dead = false;
            let geo = null; // page-space boxes, measured once; null until the entrance has settled
            let scrollX = window.scrollX;
            let scrollY = window.scrollY;

            // Layout reads happen here only, never in the frame loop. The letters rise in with a
            // transform, so this waits for that to finish before measuring.
            function measure() {
                scrollX = window.scrollX;
                scrollY = window.scrollY;
                const hr = hero.getBoundingClientRect();
                const nr = name.getBoundingClientRect();
                geo = { hx: hr.left + scrollX, hy: hr.top + scrollY, nx: nr.left + scrollX, ny: nr.top + scrollY, w: nr.width, h: nr.height };
                for (const letter of letters) {
                    const r = letter.getBoundingClientRect();
                    letter.style.setProperty('--ox', (r.left - nr.left).toFixed(1) + 'px');
                    letter.style.setProperty('--oy', (r.top - nr.top).toFixed(1) + 'px');
                }
            }
            // Point in viewport coordinates. Writes only: no layout is read.
            function light(x, y) {
                name.style.setProperty('--nx', (x - (geo.nx - scrollX)).toFixed(1) + 'px');
                name.style.setProperty('--ny', (y - (geo.ny - scrollY)).toFixed(1) + 'px');
                grid.style.setProperty('--mx', (x - (geo.hx - scrollX)).toFixed(1) + 'px');
                grid.style.setProperty('--my', (y - (geo.hy - scrollY)).toFixed(1) + 'px');
            }
            function restPoint() {
                return { x: geo.nx - scrollX + geo.w * 0.35, y: geo.ny - scrollY + geo.h * 0.4 };
            }
            function idlePoint(t) {
                const sweep = 0.5 + 0.5 * Math.sin(t / 2300);
                return { x: geo.nx - scrollX + sweep * geo.w, y: geo.ny - scrollY + geo.h * 0.4 };
            }
            let last = 0;
            function tick(t) {
                frame = 0;
                if (!inView || dead) return;
                if (pointer || t - last >= 32) {
                    last = t;
                    const p = pointer || idlePoint(t);
                    light(p.x, p.y);
                }
                frame = requestAnimationFrame(tick);
            }
            function wake() { if (!frame && inView && !dead && geo && loops) frame = requestAnimationFrame(tick); }

            // Only a fine pointer gets the moving light; a phone has no pointer to follow, and
            // its idle drift was the whole cost.
            const loops = motion && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
            const onScrollPos = () => { scrollX = window.scrollX; scrollY = window.scrollY; };
            window.addEventListener('scroll', onScrollPos, { passive: true });
            let ro = null;
            let io = null;
            const move = (e) => { pointer = { x: e.clientX, y: e.clientY }; };
            const leave = () => { pointer = null; };

            const settle = () => {
                const waits = [];
                if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
                for (const letter of letters) for (const a of letter.getAnimations()) waits.push(a.finished.catch(() => {}));
                return Promise.race([Promise.all(waits), new Promise((res) => setTimeout(res, 2500))]);
            };
            const begin = () => {
                if (dead) return;
                measure();
                if (loops) {
                    hero.addEventListener('pointermove', move);
                    hero.addEventListener('pointerleave', leave);
                    io = new IntersectionObserver((entries) => {
                        inView = entries[0].isIntersecting;
                        wake();
                    });
                    io.observe(hero);
                    wake();
                } else {
                    const p = restPoint();
                    light(p.x, p.y);
                }
                // A resize or a late font changes the boxes: measure again, once per frame at most.
                let queued = 0;
                ro = new ResizeObserver(() => {
                    if (queued) return;
                    queued = requestAnimationFrame(() => {
                        queued = 0;
                        if (dead) return;
                        measure();
                        if (!loops) { const p = restPoint(); light(p.x, p.y); }
                    });
                });
                ro.observe(hero);
                ro.observe(name);
            };
            // Start once the page has loaded and the letters have risen, so the first paint and
            // the entrance are never competing with it.
            const go = () => settle().then(begin);
            if (document.readyState === 'complete') go();
            else window.addEventListener('load', go, { once: true });

            cleanup.push(() => {
                dead = true;
                window.removeEventListener('load', go);
                window.removeEventListener('scroll', onScrollPos);
                hero.removeEventListener('pointermove', move);
                hero.removeEventListener('pointerleave', leave);
                if (io) io.disconnect();
                if (ro) ro.disconnect();
                cancelAnimationFrame(frame);
                name.style.removeProperty('--nx');
                name.style.removeProperty('--ny');
                grid.style.removeProperty('--mx');
                grid.style.removeProperty('--my');
                hero.style.removeProperty('--mx');
                hero.style.removeProperty('--my');
                letters.forEach((l) => { l.style.removeProperty('--ox'); l.style.removeProperty('--oy'); });
            });
        }

        // Section titles are etched in left to right as they arrive. The title itself is clipped
        // to nothing until revealed, so it is the parent that is observed.
        if (motion) {
            const titles = Array.from(document.querySelectorAll(TITLES));
            const seen = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.querySelectorAll(TITLES).forEach((t) => t.classList.add('is-etched'));
                    seen.unobserve(entry.target);
                }
            }, { rootMargin: '0px 0px -12% 0px' });
            titles.forEach((t) => { t.classList.add('steel-etch'); if (t.parentElement) seen.observe(t.parentElement); });
            cleanup.push(() => {
                seen.disconnect();
                titles.forEach((t) => t.classList.remove('steel-etch', 'is-etched'));
            });
        }

        live = () => { cleanup.forEach((fn) => fn()); live = null; };
    }

    function sync() {
        if (root.getAttribute('data-theme') === 'steel') start();
        else if (live) live();
    }

    function init() {
        sync();
        new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }

    return { init };
})();

// Self-starting: this runs at the end of <body>, after the content exists, so no inline call
// is needed (an inline script would have to be re-hashed in public/_headers).
window.DrSteel.init();
