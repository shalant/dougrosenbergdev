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

            // Pointer-lit metal and grid. The light follows the pointer over the hero; with no
            // pointer it drifts across the name on its own. Reduced motion gets one fixed light.
            const letters = Array.from(hero.querySelectorAll('.hero-name__letter'));
            const name = hero.querySelector('.hero-name__letters');
            let pointer = null; // {x, y} in viewport coordinates, or null when idle
            let frame = 0;
            let inView = true;

            function light(x, y) {
                const h = hero.getBoundingClientRect();
                hero.style.setProperty('--mx', (x - h.left) + 'px');
                hero.style.setProperty('--my', (y - h.top) + 'px');
                for (const letter of letters) {
                    const r = letter.getBoundingClientRect();
                    letter.style.setProperty('--cx', (x - r.left) + 'px');
                    letter.style.setProperty('--cy', (y - r.top) + 'px');
                }
            }
            function idlePoint(t) {
                const r = name.getBoundingClientRect();
                const sweep = 0.5 + 0.5 * Math.sin(t / 2300);
                return { x: r.left + sweep * r.width, y: r.top + r.height * 0.4 };
            }
            function tick(t) {
                frame = 0;
                if (!inView) return;
                const p = pointer || idlePoint(t);
                light(p.x, p.y);
                frame = requestAnimationFrame(tick);
            }
            function wake() { if (!frame && inView && motion) frame = requestAnimationFrame(tick); }

            if (motion) {
                const move = (e) => { pointer = { x: e.clientX, y: e.clientY }; };
                const leave = () => { pointer = null; };
                hero.addEventListener('pointermove', move);
                hero.addEventListener('pointerleave', leave);
                const io = new IntersectionObserver((entries) => {
                    inView = entries[0].isIntersecting;
                    wake();
                });
                io.observe(hero);
                wake();
                cleanup.push(() => {
                    hero.removeEventListener('pointermove', move);
                    hero.removeEventListener('pointerleave', leave);
                    io.disconnect();
                    cancelAnimationFrame(frame);
                });
            } else {
                const r = name.getBoundingClientRect();
                light(r.left + r.width * 0.35, r.top + r.height * 0.4);
            }
            cleanup.push(() => {
                hero.style.removeProperty('--mx');
                hero.style.removeProperty('--my');
                letters.forEach((l) => { l.style.removeProperty('--cx'); l.style.removeProperty('--cy'); });
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
