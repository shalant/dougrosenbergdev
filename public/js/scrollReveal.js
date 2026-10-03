// Fades .reveal-on-scroll sections in as they enter the viewport. Loaded once from
// BaseLayout.astro, which calls DrScrollReveal.init() from its own inline <script>.
window.DrScrollReveal = (function () {
    let initialized = false;
    let observer = null;

    function bindTargets() {
        const targets = document.querySelectorAll('.reveal-on-scroll:not([data-reveal-bound])');
        if (!targets.length) return;
        targets.forEach(el => {
            el.setAttribute('data-reveal-bound', 'true');
            observer.observe(el);
        });
    }

    function init() {
        if (initialized) return;
        initialized = true;

        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        // threshold 0 + a positive bottom margin: reveal as the section's top edge
        // approaches the viewport, not once 15% of the section is visible. Sections
        // are very tall on phones (hundreds of px), so a fractional threshold left
        // the next section blank for ~30% of a screen of scrolling (2026-10-02).
        }, { threshold: 0, rootMargin: '0px 0px 10% 0px' });

        bindTargets();
    }

    return { init };
})();
