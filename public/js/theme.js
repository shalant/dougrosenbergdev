// Light/dark theme: reads a saved preference, falls back to dark (the site's intended default —
// deliberately ignores the OS/browser color-scheme setting so first-time visitors always see the
// brand's dark navy+teal look), and applies it via a data-theme attribute on <html>. `apply()`
// also runs synchronously and inline from BaseLayout.astro's <head> (see the blocking <script>
// there) — before any paint — so there's no flash of the wrong theme on load.
// DrTheme.toggle() is called later from the #themeToggle click listener, also wired up inline
// in BaseLayout.astro.
window.DrTheme = (function () {
    const STORAGE_KEY = 'dr-theme';

    function resolve() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
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
        const next = current() === 'light' ? 'dark' : 'light';
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
        const transition = document.startViewTransition(() => apply(next));
        transition.finished.finally(() => root.classList.remove('theme-switching'));
        return next;
    }

    function current() {
        return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    return { resolve, apply, toggle, current };
})();
