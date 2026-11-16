// Light/dark (and hidden steel) theme: reads a saved preference, falls back to dark (the site's intended default —
// deliberately ignores the OS/browser color-scheme setting so first-time visitors always see the
// brand's dark navy+teal look), and applies it via a data-theme attribute on <html>. `apply()`
// also runs synchronously and inline from BaseLayout.astro's <head> (see the blocking <script>
// there) — before any paint — so there's no flash of the wrong theme on load.
// DrTheme.toggle() is called later from the #themeToggle click listener, also wired up inline
// in BaseLayout.astro.
window.DrTheme = (function () {
    const STORAGE_KEY = 'dr-theme';

    // 'steel' is a hidden third theme with no toggle state, only a URL entry: ?theme=steel is
    // remembered like the others, and ?theme=dark or ?theme=light leaves it. The toggle button
    // still flips light and dark, and from steel it goes to dark.
    const THEMES = ['dark', 'light', 'steel'];

    function resolve() {
        try {
            const asked = new URLSearchParams(location.search).get('theme');
            if (THEMES.indexOf(asked) !== -1) {
                localStorage.setItem(STORAGE_KEY, asked);
                return asked;
            }
        } catch (e) { /* storage unavailable: fall through to the saved value or the default */ }
        const saved = localStorage.getItem(STORAGE_KEY);
        if (THEMES.indexOf(saved) !== -1) return saved;
        return 'dark';
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        return theme;
    }

    // The new theme spreads out from the toggle in a growing circle (a same-document view
    // transition; the clip-path animation lives in global.css under "Theme switch reveal").
    // Falls back to an instant swap without View Transitions support or with reduced motion.
    function toggle() {
        const next = current() === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);

        const root = document.documentElement;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!document.startViewTransition || reduceMotion) return apply(next);

        const button = document.getElementById('themeToggle');
        const rect = button ? button.getBoundingClientRect() : null;
        const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const y = rect ? rect.top + rect.height / 2 : 0;
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        root.style.setProperty('--theme-reveal-x', x + 'px');
        root.style.setProperty('--theme-reveal-y', y + 'px');
        root.style.setProperty('--theme-reveal-r', radius + 'px');

        root.classList.add('theme-switching');
        let applied = false;
        const transition = document.startViewTransition(() => {
            applied = true;
            apply(next);
        });
        // The attribute is only set inside the transition callback, which runs after the browser
        // captures the old frame. If that never happens (the ubuntu-26.04 Playwright WebKit build
        // never got there, so the toggle did nothing), apply the theme directly instead of leaving
        // the click dead. The storage check skips this if a later toggle already superseded `next`.
        const watchdog = setTimeout(() => {
            if (!applied && localStorage.getItem(STORAGE_KEY) === next) apply(next);
            transition.skipTransition();
            root.classList.remove('theme-switching');
        }, 600);
        transition.finished.finally(() => {
            clearTimeout(watchdog);
            root.classList.remove('theme-switching');
        });
        return next;
    }

    function current() {
        const t = document.documentElement.getAttribute('data-theme');
        return t === 'light' || t === 'steel' ? t : 'dark';
    }

    return { resolve, apply, toggle, current };
})();
