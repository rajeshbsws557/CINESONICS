/**
 * ═══════════════════════════════════════════════
 * CINESONICS — UI Rendering & DOM Helpers
 * ═══════════════════════════════════════════════
 *
 * Pure UI functions — no API calls here.
 * Renders tracklist, album cover, rate-limit bar, error states, etc.
 */

const UI = (function () {
    'use strict';

    // ───────────────────────────────────────────
    // DOM Cache (lazy getters)
    // ───────────────────────────────────────────
    const dom = {
        albumCover:      () => document.getElementById('albumCover'),
        albumLoading:    () => document.getElementById('albumLoading'),
        albumTitle:      () => document.getElementById('albumTitle'),
        albumArtist:     () => document.getElementById('albumArtist'),
        albumGenre:      () => document.getElementById('albumGenre'),
        tracklist:       () => document.getElementById('tracklist'),
        trackCount:      () => document.getElementById('trackCount'),
        totalRuntime:    () => document.getElementById('totalRuntime'),
        vibeTag:         () => document.getElementById('vibeTag'),
        resultsSection:  () => document.getElementById('resultsSection'),
        loadingOverlay:  () => document.getElementById('loadingOverlay'),
        errorMessage:    () => document.getElementById('errorMessage'),
        errorText:       () => document.getElementById('errorText'),
        generateBtn:     () => document.getElementById('generateBtn'),
        userQuota:       () => document.getElementById('userQuota'),
        globalQuota:     () => document.getElementById('globalQuota'),
        quotaBar:        () => document.getElementById('quotaBar'),
    };

    // ───────────────────────────────────────────
    // State Transitions
    // ───────────────────────────────────────────

    function showLoading() {
        dom.generateBtn().disabled = true;
        dom.resultsSection().classList.remove('active');
        dom.errorMessage().classList.remove('active');
        dom.loadingOverlay().classList.add('active');
    }

    function hideLoading() {
        dom.loadingOverlay().classList.remove('active');
        dom.generateBtn().disabled = false;
    }

    function showError(message) {
        dom.errorText().textContent = message || 'Something went wrong. Please try again.';
        dom.errorMessage().classList.add('active');
    }

    // ───────────────────────────────────────────
    // Rate-Limit Quota Bar
    // ───────────────────────────────────────────

    function updateQuota(remaining) {
        if (!remaining) return;

        const userEl   = dom.userQuota();
        const globalEl = dom.globalQuota();

        if (userEl)   userEl.textContent   = `You: ${remaining.user} left`;
        if (globalEl) globalEl.textContent = `Site: ${remaining.global} left`;

        // Color coding
        if (userEl) {
            userEl.className = 'quota-badge' +
                (remaining.user === 0 ? ' exhausted' : remaining.user === 1 ? ' low' : '');
        }
        if (globalEl) {
            globalEl.className = 'quota-badge' +
                (remaining.global === 0 ? ' exhausted' : remaining.global <= 3 ? ' low' : '');
        }

        // Disable generate button if either limit is 0
        const btn = dom.generateBtn();
        if (remaining.user === 0 || remaining.global === 0) {
            btn.disabled = true;
            btn.querySelector('span').textContent = 'Limit Reached — Try Tomorrow';
        }
    }

    function updateQuotaFromStatus(status) {
        updateQuota({
            user:   status.userRemaining,
            global: status.globalRemaining,
        });
    }

    // ───────────────────────────────────────────
    // Results Rendering
    // ───────────────────────────────────────────

    function renderResults(data, coverUrl) {
        // Album cover
        const coverEl   = dom.albumCover();
        const loadingEl = dom.albumLoading();
        loadingEl.classList.remove('hidden');
        coverEl.src    = coverUrl;
        coverEl.onload = () => loadingEl.classList.add('hidden');
        coverEl.onerror = () => {
            loadingEl.innerHTML = '<span style="color:var(--text-muted)">Cover unavailable</span>';
        };

        // Album metadata
        dom.albumTitle().textContent  = data.albumTitle  || 'Untitled Soundtrack';
        dom.albumArtist().textContent = data.albumArtist || 'Various Artists';
        dom.albumGenre().textContent  = data.genre       || 'Cinematic';
        dom.vibeTag().textContent     = data.vibeTag     || 'Cinematic';

        // Tracklist
        const tracklistEl = dom.tracklist();
        tracklistEl.innerHTML = '';
        const tracks = data.tracks || [];
        dom.trackCount().textContent = `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;

        let totalSeconds = 0;

        tracks.forEach((track, index) => {
            const li = document.createElement('li');
            li.className = 'track-item';
            li.innerHTML = `
                <span class="track-number">${String(index + 1).padStart(2, '0')}</span>
                <div class="track-info">
                    <div class="track-name">${escapeHtml(track.title || 'Untitled')}</div>
                    <div class="track-artist">${escapeHtml(track.artist || 'Unknown')}</div>
                </div>
                <span class="track-duration">${escapeHtml(track.duration || '—')}</span>
            `;
            tracklistEl.appendChild(li);

            const parts = (track.duration || '0:00').split(':');
            if (parts.length === 2) {
                totalSeconds += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            }
        });

        // Total runtime
        const totalMin = Math.floor(totalSeconds / 60);
        const totalSec = totalSeconds % 60;
        dom.totalRuntime().textContent = `Total: ${totalMin}:${String(totalSec).padStart(2, '0')}`;

        // Show results with scroll
        dom.resultsSection().classList.add('active');
        setTimeout(() => {
            dom.resultsSection().scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
    }

    // ───────────────────────────────────────────
    // Utility
    // ───────────────────────────────────────────

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ───────────────────────────────────────────
    // Public Interface
    // ───────────────────────────────────────────

    return {
        showLoading,
        hideLoading,
        showError,
        renderResults,
        updateQuota,
        updateQuotaFromStatus,
    };
})();
