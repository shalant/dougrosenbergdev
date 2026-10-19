// Pointer-following motion: the soft light on [data-spotlight] cards and the
// hero portrait leaning toward the cursor. Desktop pointers only, and nothing
// with reduced motion. Loaded once from BaseLayout.astro, which calls
// DrMotion.init() from its own inline <script>.
window.DrMotion = (function () {
    const MAX_TILT_X = 8; // degrees, left/right
    const MAX_TILT_Y = 6; // degrees, up/down

    function spotlight() {
        document.addEventListener('pointermove', (e) => {
            const card = e.target.closest && e.target.closest('[data-spotlight]');
            if (!card) return;
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
            card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
        });
    }

    function tilt() {
        const hero = document.querySelector('.hero-section');
        const portrait = document.getElementById('heroPortrait');
        if (!hero || !portrait) return;
        let frame = 0;

        hero.addEventListener('pointermove', (e) => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const rect = portrait.getBoundingClientRect();
                const clamp = (v) => Math.max(-1, Math.min(1, v));
                const x = clamp((e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2));
                const y = clamp((e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2));
                portrait.style.setProperty('--tilt-x', (x * MAX_TILT_X).toFixed(2) + 'deg');
                portrait.style.setProperty('--tilt-y', (-y * MAX_TILT_Y).toFixed(2) + 'deg');
            });
        });

        hero.addEventListener('pointerleave', () => {
            cancelAnimationFrame(frame);
            frame = 0;
            portrait.style.setProperty('--tilt-x', '0deg');
            portrait.style.setProperty('--tilt-y', '0deg');
        });
    }

    function init() {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        spotlight();
        tilt();
    }

    return { init };
})();
