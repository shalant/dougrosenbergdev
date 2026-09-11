// Opens/closes the shared <dialog id="contactDialog"> that ContactDialog.astro
// mounts once inside Header.astro (present on every page Header renders on).
// Delegated on document, same pattern as DrNav, so any current or future
// element carrying data-contact-trigger works without a matching per-element
// listener - including the webdesign hero's own "get in touch" button.
window.DrContactDialog = (function () {
    let initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;

        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-contact-trigger]');
            if (trigger) {
                if (typeof gtag === 'function') gtag('event', 'contact_dialog_open');
                document.getElementById('contactDialog')?.showModal();
                return;
            }
            if (e.target.closest('#closeContactDialog')) {
                document.getElementById('contactDialog')?.close();
            }
        });
    }

    return { init };
})();
