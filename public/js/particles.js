/**
 * ═══════════════════════════════════════════════
 * CINESONICS — Particle Background Animation
 * ═══════════════════════════════════════════════
 *
 * Renders floating ambient particles on a full-screen canvas.
 * Colors alternate between cyan and magenta to match the theme.
 */

(function initParticles() {
    'use strict';

    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const PARTICLE_COUNT = 50;
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.3 + 0.05,
            hue: Math.random() > 0.5 ? 185 : 320, // cyan or magenta
        };
    }

    function init() {
        resize();
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.opacity})`;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    init();
    animate();
})();
