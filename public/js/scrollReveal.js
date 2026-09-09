// Fades .reveal-on-scroll sections in as they enter the viewport. Loaded once in
// index.html and started from Index.razor via JS interop.
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
        }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

        bindTargets();

        // Sections render statically on first paint, but some (Casual/Music/etc.) swap
        // their "loading..." placeholder for real markup once their JSON arrives — watch
        // for that instead of guessing how long it takes.
        new MutationObserver(() => bindTargets()).observe(document.body, { childList: true, subtree: true });
    }

    return { init };
})();
