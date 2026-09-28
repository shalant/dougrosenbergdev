// GA4 Consent Mode v2: only shows the banner when analytics_storage actually
// defaults to denied for this visitor and no prior choice is stored yet
// (BaseLayout.astro's head script already read localStorage synchronously and
// set gtag('consent', 'default', ...) before GA4's config call fires, so a
// returning visitor's analytics_storage state is correct from the very first
// pageview - this file only handles the first-visit banner and the
// gtag('consent', 'update', ...) call once they choose). The EU-timezone
// check mirrors BaseLayout.astro's - see its comment for why it's a
// best-effort heuristic rather than real geo-IP.
window.DrConsent = (function () {
    const STORAGE_KEY = 'dr-consent';

    function init() {
        if (localStorage.getItem(STORAGE_KEY)) return;
        if (!/^Europe\//.test(Intl.DateTimeFormat().resolvedOptions().timeZone)) return;

        const banner = document.getElementById('consentBanner');
        if (!banner) return;
        banner.hidden = false;

        document.getElementById('consentAccept')?.addEventListener('click', () => choose('granted', banner));
        document.getElementById('consentDecline')?.addEventListener('click', () => choose('denied', banner));
    }

    function choose(value, banner) {
        localStorage.setItem(STORAGE_KEY, value);
        if (typeof gtag === 'function') gtag('consent', 'update', { analytics_storage: value });
        banner.hidden = true;
    }

    return { init };
})();
