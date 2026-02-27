# CINESONICS

**Cinematic Soundtrack Concept Generator** — Describe a movie vibe, get an AI-generated tracklist and album cover.

Built with [Pollinations.ai](https://pollinations.ai) APIs (text + image generation).

---

## Architecture

```
├── server.js              ← Express backend (API proxy + rate limiting)
├── package.json
├── .env.example           ← Template — copy to .env and add your key
├── .gitignore
├── README.md
└── public/                ← Static frontend served by Express
    ├── index.html
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── api.js         ← Calls our backend (not Pollinations directly)
    │   ├── app.js         ← Main app logic & event wiring
    │   ├── ui.js          ← DOM rendering & quota display
    │   └── particles.js   ← Ambient background animation
    └── assets/
```

## How It Works

1. Visitor enters a movie vibe and clicks **Generate**
2. Frontend calls `POST /api/generate` on our Express server
3. Server checks rate limits → proxies text request to Pollinations.ai → returns tracklist + a one-time cover token
4. Frontend renders the tracklist, then loads the album cover from `/api/cover/:token`
5. The cover endpoint proxies the image from Pollinations.ai and streams it to the browser
6. **Your API key never leaves the server.**

### Rate Limits (in-memory, resets at midnight UTC)
| Scope     | Limit           |
|-----------|-----------------|
| Per user  | 2 / day (by IP) |
| Site-wide | 11 / day        |

---

## Quick Start (local)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd cinesonics

# 2. Install dependencies
npm install

# 3. Create your .env
cp .env.example .env
# Edit .env and paste your Pollinations.ai API key

# 4. Start the server
npm start
# → http://localhost:3000
```

## Get a Pollinations API Key

Sign up free at **[enter.pollinations.ai](https://enter.pollinations.ai)**
Key types: `pk_` (publishable, rate-limited) or `sk_` (secret, higher limits).

---

## Deploying to Production

### Option A — Render (free tier)

1. Push to GitHub
2. Create a **Web Service** on [render.com](https://render.com)
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add environment variable: `POLLINATIONS_API_KEY = your_key`
6. Done — Render gives you an HTTPS URL

### Option B — Railway

1. Connect your GitHub repo at [railway.app](https://railway.app)
2. Add `POLLINATIONS_API_KEY` in the Variables tab
3. Deploy — Railway auto-detects Node.js

### Option C — Vercel / Fly.io / Any Node.js host

Same pattern: set `POLLINATIONS_API_KEY` as an environment variable in the hosting dashboard.

> **GitHub Secrets** are for CI/CD pipelines (GitHub Actions), not for runtime.
> For runtime secrets, use your hosting platform's **environment variable** settings.

---

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML / CSS / JS (no build step)
- **AI**: Pollinations.ai (text: `openai` model, image: `flux` model)
- **Fonts**: Orbitron, Inter, JetBrains Mono

---

## Credits

All AI generation is powered by **[Pollinations.ai](https://pollinations.ai)** — free, open-source AI media generation.

- Text generation: [Pollinations Text API](https://pollinations.ai)
- Image generation: [Pollinations Image API](https://pollinations.ai)
- Get an API key: [enter.pollinations.ai](https://enter.pollinations.ai)

---

## License

MIT
