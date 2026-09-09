// 3D ring hero for /webdesign. Cards orbit a cylinder and are individually
// counter-rotated every frame so they always billboard toward the camera —
// nothing goes edge-on or disappears on the far side. Opacity/size chase an
// angle-derived target through an exponential smoothing filter (slower than
// a snap, faster than looking laggy), peaking left of dead-center rather
// than exactly on it. Paint order (z-index) is driven off that same
// smoothed opacity instead of the browser's native 3D depth sort — depth
// sort flips abruptly at an arbitrary geometric threshold between two
// already-bright overlapping cards, which reads as a pop; opacity-driven
// z-index means the swap lands where the two cards are already
// near-equally prominent. Which images end up in the ring is decided in
// C# (WebDesignPage.razor) — this module only animates whatever list it's
// handed.
window.DrRing = (function () {
    // All the geometry below (radius, perspective, card size) was tuned by
    // eye at this container width. Everything scales off it proportionally
    // instead of having separate desktop/mobile magic numbers that can (and
    // did) silently drift out of sync — a ring tuned only for ~1536px reads
    // as "barely visible, just one zoomed-in card" on a ~390px phone, since
    // its true diameter is still ~2.5x the viewport and gets clipped by
    // .wd2-hero's overflow:hidden.
    const BASE_WIDTH = 1536;
    const BASE_RADIUS = 486;
    const BASE_PERSPECTIVE = 5670;
    const BASE_CARD_W = 405;
    const BASE_CARD_H = 253;
    const MIN_SCALE = 0.42;

    function init(containerId, images) {
        const ring = document.getElementById(containerId);
        if (!ring || !images || images.length === 0) return;
        if (ring.dataset.ringInit === '1') return; // don't double-init the same element
        ring.dataset.ringInit = '1';

        const stage = ring.parentElement; // .wd2-hero — perspective lives here
        const N = images.length;
        const durationMs = 42000;
        const peakOffsetDeg = -19.2;
        const smoothingTauSec = 1.2;
        const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

        let radius = BASE_RADIUS;

        function applyScale() {
            const containerWidth = stage.clientWidth || window.innerWidth;
            const scale = Math.min(1, Math.max(MIN_SCALE, containerWidth / BASE_WIDTH));
            radius = BASE_RADIUS * scale;
            stage.style.perspective = `${BASE_PERSPECTIVE * scale}px`;

            const cardW = BASE_CARD_W * scale;
            const cardH = BASE_CARD_H * scale;
            for (const card of cards) {
                card.orbit.style.width = `${cardW}px`;
                card.orbit.style.height = `${cardH}px`;
                card.orbit.style.marginLeft = `${-cardW / 2}px`;
                card.orbit.style.marginTop = `${-cardH / 2}px`;
            }
        }

        const cards = images.map((src, i) => {
            const baseAngle = (360 / N) * i;

            const orbit = document.createElement('div');
            orbit.className = 'wd2-hero__card-orbit';

            const img = document.createElement('img');
            img.alt = '';
            img.loading = 'eager';

            orbit.appendChild(img);
            ring.appendChild(orbit);

            // curOpacity/curScale are the actually-rendered, smoothed values;
            // they chase the angle-derived target below rather than snapping.
            // loaded starts false and the target opacity is forced to 0 until
            // the image actually finishes downloading (see render()) — with
            // ~12 full-size images loading at different speeds, letting each
            // one snap straight to its angle-based opacity the instant its
            // <img> element exists (before the browser has any pixels to
            // show) is what read as a buggy, staggered pop-in. This way each
            // card fades in smoothly, staggered naturally by its own load
            // time, through the same easing already used for everything else.
            const card = { orbit, img, baseAngle, curOpacity: 0, curScale: 0.62, loaded: false };
            img.addEventListener('load', () => { card.loaded = true; }, { once: true });
            img.src = src;
            return card;
        });

        applyScale();

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(applyScale, 150);
        });

        function computeTargets(worldAngle) {
            let delta = worldAngle - peakOffsetDeg;
            delta = ((delta + 180) % 360 + 360) % 360 - 180; // wrap to [-180, 180]
            const rad = (delta * Math.PI) / 180;
            const facing = (Math.cos(rad) + 1) / 2; // 0..1
            // Incoming (still approaching the peak) fades in a little more
            // gently than the outgoing side fades out.
            const fadeExp = delta < 0 ? 1.3 : 1.6;
            const fadeEase = 1 - Math.pow(1 - facing, fadeExp);
            return {
                opacity: 0.18 + 0.82 * fadeEase,
                scale: 0.62 + 0.68 * facing,
            };
        }

        function render(ringAngle, dtSec) {
            const alpha = dtSec === null ? 1 : 1 - Math.exp(-dtSec / smoothingTauSec);
            for (const card of cards) {
                const worldAngle = card.baseAngle + ringAngle;
                card.orbit.style.transform = `rotateY(${worldAngle}deg) translateZ(${radius}px)`;

                const target = computeTargets(worldAngle);
                const targetOpacity = card.loaded ? target.opacity : 0;
                card.curOpacity += (targetOpacity - card.curOpacity) * alpha;
                card.curScale += (target.scale - card.curScale) * alpha;

                card.img.style.opacity = card.curOpacity.toFixed(3);
                // Counter-rotate by the exact opposite of the orbit rotation
                // so the image always billboards toward the camera, then
                // apply the smoothed scale on top of whatever perspective/
                // translateZ already contributes.
                card.img.style.transform = `rotateY(${-worldAngle}deg) scale(${card.curScale.toFixed(3)})`;
                card.orbit.style.zIndex = Math.round(card.curOpacity * 1000);
            }
        }

        render(0, null); // first paint: snap straight to target, nothing to chase yet

        if (!reduceMotion) {
            let start = null;
            let last = null;
            function frame(now) {
                if (start === null) { start = now; last = now; }
                const dtSec = Math.min((now - last) / 1000, 0.1); // clamp huge gaps (tab backgrounded, etc.)
                last = now;
                const t = ((now - start) % durationMs) / durationMs;
                render(t * 360, dtSec);
                requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
        }
    }

    return { init };
})();
