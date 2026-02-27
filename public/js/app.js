/**
 * ═══════════════════════════════════════════════
 * CINESONICS — Application Entry Point
 * ═══════════════════════════════════════════════
 *
 * Wires up event listeners and orchestrates the
 * generation flow.  Depends on:
 *   - js/api.js       (backend communication)
 *   - js/ui.js        (DOM rendering)
 *   - js/particles.js (background animation)
 */

(function () {
    'use strict';

    // ───────────────────────────────────────────
    // DOM References
    // ───────────────────────────────────────────
    const vibeInput   = document.getElementById('vibeInput');
    const charCurrent = document.getElementById('charCurrent');
    const generateBtn = document.getElementById('generateBtn');
    const retryBtn    = document.getElementById('retryBtn');

    // ───────────────────────────────────────────
    // Character Counter
    // ───────────────────────────────────────────
    vibeInput.addEventListener('input', () => {
        charCurrent.textContent = vibeInput.value.length;
    });

    // ───────────────────────────────────────────
    // Quick Vibe Buttons
    // ───────────────────────────────────────────
    document.querySelectorAll('.quick-vibe').forEach(btn => {
        btn.addEventListener('click', () => {
            vibeInput.value = btn.dataset.vibe;
            charCurrent.textContent = vibeInput.value.length;
            vibeInput.focus();
        });
    });

    // ───────────────────────────────────────────
    // Generate Handler
    // ───────────────────────────────────────────
    let lastVibe = '';

    async function handleGenerate() {
        const vibe = vibeInput.value.trim();
        if (!vibe) {
            vibeInput.focus();
            return;
        }

        lastVibe = vibe;
        UI.showLoading();

        try {
            // Single call to our backend — it handles text + image
            const result = await PollinationsAPI.generate(vibe);

            // Render tracklist immediately, album cover loads via token URL
            const coverUrl = PollinationsAPI.getCoverUrl(result.coverToken);
            UI.renderResults(result.tracklist, coverUrl);

            // Update quota display with remaining counts from server
            if (result.remaining) {
                UI.updateQuota(result.remaining);
            }

        } catch (err) {
            console.error('Generation failed:', err);
            UI.showError(err.message);
        } finally {
            UI.hideLoading();
        }
    }

    // ───────────────────────────────────────────
    // Event Bindings
    // ───────────────────────────────────────────
    generateBtn.addEventListener('click', handleGenerate);
    retryBtn.addEventListener('click', handleGenerate);

    // Ctrl + Enter shortcut
    vibeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleGenerate();
        }
    });

    // ───────────────────────────────────────────
    // Initial Quota Fetch
    // ───────────────────────────────────────────
    async function loadQuota() {
        try {
            const status = await PollinationsAPI.getStatus();
            UI.updateQuotaFromStatus(status);
        } catch (e) {
            console.warn('Could not fetch quota status:', e);
        }
    }

    loadQuota();
})();
