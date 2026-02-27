/**
 * ═══════════════════════════════════════════════
 * CINESONICS — Backend Server
 * ═══════════════════════════════════════════════
 *
 * Express server that:
 *   1. Serves the static frontend
 *   2. Proxies requests to Pollinations.ai (API key stays server-side)
 *   3. Enforces rate limits:
 *        - Per-user: 2 generations / day  (by IP)
 *        - Global:  11 generations / day  (entire site)
 *      Both reset at midnight UTC.
 *
 * Environment variables (set in .env or hosting dashboard):
 *   POLLINATIONS_API_KEY  — Your Pollinations.ai API key
 *   PORT                  — Server port (default: 3000)
 */

require('dotenv').config();
const express  = require('express');
const crypto   = require('crypto');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Trust proxy (for correct client IP behind Render / Railway / etc.) ───
app.set('trust proxy', 1);
app.use(express.json());

// ─── Serve static frontend files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════
// Rate-Limiting Store  (in-memory, resets daily)
// ═══════════════════════════════════════════════

const DAILY_GLOBAL_LIMIT = 11;
const DAILY_USER_LIMIT   = 2;

const store = {
    globalCount: 0,
    resetDate:   todayUTC(),
    users:       new Map(),   // ip → { count, date }
};

// One-time-use cover tokens:  token → { url, expiresAt }
const coverTokens = new Map();

function todayUTC() {
    return new Date().toISOString().split('T')[0];   // "YYYY-MM-DD"
}

/** Reset counters if the calendar day (UTC) has changed. */
function resetIfNewDay() {
    const today = todayUTC();
    if (store.resetDate !== today) {
        store.globalCount = 0;
        store.resetDate   = today;
        store.users.clear();
        console.log(`[rate-limit] New day ${today} — counters reset`);
    }
}

/** Best-effort real client IP. */
function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

/** Get or create per-user record. */
function userRecord(ip) {
    const today = todayUTC();
    let rec = store.users.get(ip);
    if (!rec || rec.date !== today) {
        rec = { count: 0, date: today };
        store.users.set(ip, rec);
    }
    return rec;
}

// ═══════════════════════════════════════════════
// Prompts  (kept server-side so they can't be tampered with)
// ═══════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a cinematic soundtrack concept designer. You create fictional but believable soundtrack tracklists for movie scenes. You invent creative track names and fictional artist/band names that feel authentic to the genre. Always respond with valid JSON only, no markdown.`;

function buildUserPrompt(vibe) {
    return `Create a conceptual movie soundtrack for this vibe:

"${vibe}"

Return a JSON object with this exact structure:
{
  "albumTitle": "string — a creative, evocative album title",
  "albumArtist": "string — the main artist, composer, or 'Various Artists'",
  "genre": "string — short genre/mood label, e.g. 'Dark Electronic / Industrial'",
  "vibeTag": "string — very short 2-3 word vibe label",
  "tracks": [
    {
      "title": "string — creative track name",
      "artist": "string — fictional artist/band name",
      "duration": "string — realistic duration like '3:42'"
    }
  ]
}

Requirements:
- Generate 8-12 tracks
- Track names should be cinematic, evocative, and match the vibe
- Artist names should feel authentic to the genre
- Durations should be realistic (2:30 – 6:00 range, maybe one longer atmospheric track)
- The album title should capture the essence of the movie scene
- Be creative and specific — avoid generic names

Return ONLY the JSON object, nothing else.`;
}

function buildImagePrompt(vibe) {
    return `Cinematic movie soundtrack album cover art. ${vibe}. Moody atmospheric lighting, dramatic composition, professional album artwork quality, no text, no words, no letters, dark cinematic color palette with neon accents, gritty photographic style, high contrast, volumetric lighting, 4k detailed`;
}

// ═══════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════

// ─── GET /api/status — public rate-limit info ──

app.get('/api/status', (req, res) => {
    resetIfNewDay();
    const ip  = clientIp(req);
    const rec = userRecord(ip);

    res.json({
        globalRemaining: Math.max(0, DAILY_GLOBAL_LIMIT - store.globalCount),
        userRemaining:   Math.max(0, DAILY_USER_LIMIT   - rec.count),
        globalLimit:     DAILY_GLOBAL_LIMIT,
        userLimit:       DAILY_USER_LIMIT,
        resetsAt:        'midnight UTC',
    });
});

// ─── POST /api/generate — main generation endpoint ──

app.post('/api/generate', async (req, res) => {
    resetIfNewDay();

    const ip  = clientIp(req);
    const rec = userRecord(ip);

    // ── Check global limit ──
    if (store.globalCount >= DAILY_GLOBAL_LIMIT) {
        return res.status(429).json({
            error: 'Daily site-wide generation limit reached. Please come back tomorrow!',
            type:  'global_limit',
        });
    }

    // ── Check per-user limit ──
    if (rec.count >= DAILY_USER_LIMIT) {
        return res.status(429).json({
            error: `You've used your ${DAILY_USER_LIMIT} free generations for today. Come back tomorrow!`,
            type:  'user_limit',
        });
    }

    // ── Validate input ──
    const vibe = typeof req.body.vibe === 'string' ? req.body.vibe.trim() : '';
    if (!vibe || vibe.length > 600) {
        return res.status(400).json({ error: 'Please provide a vibe (max 600 characters).' });
    }

    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) {
        console.error('[server] POLLINATIONS_API_KEY is not set!');
        return res.status(500).json({ error: 'Server misconfigured — API key missing.' });
    }

    try {
        // ── Call Pollinations Text API ──
        const textRes = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'qwen-safety',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user',   content: buildUserPrompt(vibe) },
                ],
                temperature: 0.9,
            }),
        });

        if (!textRes.ok) {
            const code = textRes.status;
            if (code === 401) throw new Error('Server API key is invalid.');
            if (code === 402) throw new Error('API balance exhausted. Contact the site owner.');
            throw new Error(`Pollinations text API error (${code})`);
        }

        const textData = await textRes.json();
        const content  = textData.choices?.[0]?.message?.content;
        if (!content) throw new Error('No content returned from AI');

        // Parse JSON (handle potential markdown wrapping)
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr   = jsonMatch ? jsonMatch[1].trim() : content.trim();
        let tracklist;
        try {
            tracklist = JSON.parse(jsonStr);
        } catch {
            console.error('[server] JSON parse failed:', content);
            throw new Error('AI returned unparseable data — please try again');
        }

        if (!Array.isArray(tracklist.tracks) || tracklist.tracks.length === 0) {
            throw new Error('AI returned an empty tracklist');
        }

        // ── Generate a one-time cover token ──
        const token      = crypto.randomUUID();
        const imgPrompt  = buildImagePrompt(vibe);
        const imageUrl   = `https://gen.pollinations.ai/image/${encodeURIComponent(imgPrompt)}`
            + `?model=flux&width=768&height=768&nologo=true&seed=${Date.now()}`
            + `&key=${encodeURIComponent(apiKey)}`;

        coverTokens.set(token, {
            url:       imageUrl,
            expiresAt: Date.now() + 5 * 60 * 1000,   // 5-minute TTL
        });

        // ── Increment counters ONLY after success ──
        store.globalCount++;
        rec.count++;

        console.log(`[generate] ip=${ip}  user=${rec.count}/${DAILY_USER_LIMIT}  global=${store.globalCount}/${DAILY_GLOBAL_LIMIT}`);

        res.json({
            tracklist,
            coverToken: token,
            remaining: {
                user:   Math.max(0, DAILY_USER_LIMIT   - rec.count),
                global: Math.max(0, DAILY_GLOBAL_LIMIT - store.globalCount),
            },
        });

    } catch (err) {
        console.error('[generate] Error:', err.message);
        res.status(500).json({ error: err.message || 'Generation failed. Please try again.' });
    }
});

// ─── GET /api/cover/:token — proxy album cover image ──

app.get('/api/cover/:token', async (req, res) => {
    const entry = coverTokens.get(req.params.token);

    if (!entry) {
        return res.status(404).json({ error: 'Cover not found or already used.' });
    }

    if (Date.now() > entry.expiresAt) {
        coverTokens.delete(req.params.token);
        return res.status(410).json({ error: 'Cover token expired.' });
    }

    try {
        const imgRes = await fetch(entry.url);
        if (!imgRes.ok) throw new Error(`Image API ${imgRes.status}`);

        // Stream image bytes to the browser
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        res.set('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(buffer);

        coverTokens.delete(req.params.token);   // one-time use
    } catch (err) {
        console.error('[cover] Proxy error:', err.message);
        res.status(502).json({ error: 'Failed to load album cover.' });
    }
});

// ─── Periodic cleanup of expired tokens ──
setInterval(() => {
    const now = Date.now();
    for (const [tok, entry] of coverTokens) {
        if (now > entry.expiresAt) coverTokens.delete(tok);
    }
}, 60_000);

// ═══════════════════════════════════════════════
// Start
// ═══════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  CINESONICS server listening on :${PORT}     ║`);
    console.log(`  ║  http://localhost:${PORT}                  ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
    console.log(`  API key: ${process.env.POLLINATIONS_API_KEY ? '✓ loaded' : '✗ MISSING — set POLLINATIONS_API_KEY in .env'}`);
    console.log(`  Limits:  ${DAILY_USER_LIMIT}/user/day · ${DAILY_GLOBAL_LIMIT}/site/day\n`);
});
