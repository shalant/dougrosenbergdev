// /reading: pick a book on the shelf. The selected spine leans (CSS, on aria-current) and
// its panel shows. Without this script every panel is visible and the spines are plain links to
// them (see the <noscript> rule in the page), so nothing here is required to read the page.
(function () {
    'use strict';
    var root = document.querySelector('[data-shelf]');
    if (!root) return;

    var spines = Array.prototype.slice.call(root.querySelectorAll('.spine'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('.paper'));

    function select(i, focus) {
        spines.forEach(function (s, j) {
            if (j === i) s.setAttribute('aria-current', 'true');
            else s.removeAttribute('aria-current');
        });
        panels.forEach(function (p, j) { p.classList.toggle('is-current', j === i); });
        if (focus) spines[i].focus();
    }

    spines.forEach(function (s, i) {
        s.addEventListener('click', function (e) {
            e.preventDefault();
            select(i, false);
        });
        s.addEventListener('keydown', function (e) {
            var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
            if (next === null || next < 0 || next >= spines.length) return;
            e.preventDefault();
            select(next, true);
        });
    });

    // A link like /reading#paper-3 opens that book.
    var m = /^#paper-(\d+)$/.exec(window.location.hash);
    if (m && +m[1] < spines.length) select(+m[1], false);
})();
