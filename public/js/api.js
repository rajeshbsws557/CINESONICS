/**
 * ═══════════════════════════════════════════════
 * CINESONICS — API Client  (talks to OUR backend)
 * ═══════════════════════════════════════════════
 *
 * All requests go to the Express server, which proxies
 * to Pollinations.ai with the API key stored server-side.
 * The key NEVER reaches the browser.
 */

const PollinationsAPI = (function () {
    'use strict';

    /**
     * Ask the server to generate a tracklist + album cover token.
     * @param {string} vibe — Movie scene description
     * @returns {Promise<{ tracklist, coverToken, remaining }>}
     */
    async function generate(vibe) {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vibe }),
        });

        const data = await res.json();

        if (!res.ok) {
            const err  = new Error(data.error || `Server error (${res.status})`);
            err.type   = data.type || 'unknown';
            err.status = res.status;
            throw err;
        }

        return data;
    }

    /**
     * Fetch current rate-limit status from the server.
     * @returns {Promise<{ globalRemaining, userRemaining, globalLimit, userLimit }>}
     */
    async function getStatus() {
        const res = await fetch('/api/status');
        return res.json();
    }

    /**
     * Build the cover-image URL for a given one-time token.
     * @param {string} token
     * @returns {string} URL pointing to /api/cover/:token
     */
    function getCoverUrl(token) {
        return `/api/cover/${token}`;
    }

    return { generate, getStatus, getCoverUrl };
})();
