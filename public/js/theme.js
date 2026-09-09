// Light/dark theme: reads a saved preference, falls back to dark (the site's intended default —
// deliberately ignores the OS/browser color-scheme setting so first-time visitors always see the
// brand's dark navy+teal look), and applies it via a data-theme attribute on <html>. `apply()`
// also runs synchronously and inline from index.html's <head> (see the blocking <script> there) —
// before Blazor boots, before any paint — so there's no flash of the wrong theme on load.
// DrTheme.toggle() is called later, after render, from Header.razor's toggle button via IJSRuntime.
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

    function toggle() {
        const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem(STORAGE_KEY, next);
        return apply(next);
    }

    function current() {
        return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    return { resolve, apply, toggle, current };
})();
