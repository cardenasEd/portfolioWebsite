// Sprinkle effect: tiny droplets land on the "paper" and leave gray wet spots that slowly dry.
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.getElementById('sprinkle-canvas');
    const ctx = canvas.getContext('2d');

    // ---- tweak these ----
    const START_DELAY = 4000;   // ms before sprinkling starts (intro overlay lasts 7s)
    const DROPS_PER_SEC = 9;    // how heavy the sprinkle is
    const MAX_SPOTS = 400;      // safety cap
    const GROW_TIME = 600;      // ms for a spot to soak outward
    const DRY_AFTER = 12000;    // ms a spot stays fully wet
    const DRY_TIME = 8000;      // ms it takes to fade away
    const MIN_R = 3, MAX_R = 11;  // spot radius range (px)
    // ---------------------

    let w, h;
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const spots = [];

    function addSpot(now) {
        const r = MIN_R + Math.pow(Math.random(), 2) * (MAX_R - MIN_R);
        // an irregular blob made of a few overlapping circles
        const blobs = [];
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = i === 0 ? 0 : r * 0.35 * Math.random();
            blobs.push({
                dx: Math.cos(a) * d,
                dy: Math.sin(a) * d,
                k: i === 0 ? 1 : 0.55 + Math.random() * 0.35
            });
        }
        spots.push({ x: Math.random() * w, y: Math.random() * h, r, blobs, born: now });
        if (spots.length > MAX_SPOTS) spots.shift();
    }

    const easeOut = t => 1 - Math.pow(1 - t, 3);

    function drawSpot(s, now) {
        const age = now - s.born;
        const grow = easeOut(Math.min(age / GROW_TIME, 1));
        const dry = age > DRY_AFTER ? Math.max(0, 1 - (age - DRY_AFTER) / DRY_TIME) : 1;
        if (dry <= 0) return false;

        // brief impact ring as the droplet hits
        if (age < 300) {
            const t = age / 300;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * (0.4 + t * 1.3), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(90,90,100,' + (0.22 * (1 - t)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        for (const b of s.blobs) {
            const r = s.r * b.k * grow;
            if (r < 0.3) continue;
            const x = s.x + b.dx, y = s.y + b.dy;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(95,95,105,' + (0.10 * dry) + ')');
            g.addColorStop(0.75, 'rgba(95,95,105,' + (0.14 * dry) + ')');
            g.addColorStop(1, 'rgba(95,95,105,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        // slightly darker rim, like a real water stain
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * grow * 0.95, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(70,70,80,' + (0.12 * dry) + ')';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        return true;
    }

    let last = performance.now();
    let carry = 0;
    const startAt = last + START_DELAY;

    function frame(now) {
        const dt = Math.min(now - last, 100);
        last = now;

        if (now > startAt && !document.hidden) {
            carry += dt / 1000 * DROPS_PER_SEC;
            while (carry >= 1) { addSpot(now); carry--; }
        }

        ctx.clearRect(0, 0, w, h);
        for (let i = spots.length - 1; i >= 0; i--) {
            if (!drawSpot(spots[i], now)) spots.splice(i, 1);
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();