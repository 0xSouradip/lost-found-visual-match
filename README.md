# Lost & Found — Visual Match

Post a photo of something you found, and the system helps find the person who lost it — by **how the object looks**, not by whether they typed the same keywords.

> Hackathon-ready prototype: upload/search by image or text, view ranked matches with score breakdowns, and complete a privacy-conscious claim & verification flow.

## Problem
Traditional lost-and-found systems rely on keyword search and manual scrolling. Descriptions like **"blue bottle"** vs **"navy water bottle with stickers"** often fail to match. Photos (and visual embeddings) make matching far more effective.

## Key idea
- **Found item:** photo + place + time + verification question.
- **Lost report:** **photo or text-only** description.
- **Shared embedding space (CLIP-style):** images and text are embedded into the same vector space, so a text-only report (e.g. *"navy metal bottle, cat sticker, lost near the library Tuesday"*) can match photos of found items.
- **Ranked candidates for human confirmation:** results are ranked and verified, not claimed as perfect identification.

## How it works
1. **Post found item:** upload photo + category/color/brand + location zone + found time + description + verification question/answer.
2. **Post lost report / search:** upload a photo and/or enter a text description, optionally add filters (category, color, location, time).
3. **Embed & filter:** generate query embedding, apply pre-filters (category/date window/location) to narrow candidates.
4. **Rank matches:** blend signals into a final score and show top candidates with score bars.
5. **Claim & verify:** claimant answers the finder-set verification question.
   - Wrong answer → rejected
   - Correct answer → item marked claimed and a **masked handoff code** is issued (no phone numbers exchanged)

## Ranking formula
`score = 0.6 × embedding_similarity + 0.2 × attribute_match + 0.1 × time_proximity + 0.1 × location_proximity`

- **Embedding similarity:** cosine similarity between query (image/text) and found-item image embeddings.
- **Attribute match:** overlap on structured fields (e.g. category, color).
- **Time proximity:** closer found/lost times score higher.
- **Location proximity:** same zone/area scores higher.
- **Pre-filters:** category, date window, location run before ranking to keep results relevant and fast.

## Features implemented
- Responsive web UI (browse found items, report found, report lost/search, claim flow)
- Image and **text-only** lost reports matched against found-item photos
- Ranked match list with per-signal score breakdown (visual, attributes, time, location)
- Claim verification with finder-set question/answer
- Masked handoff code on successful verification
- Session-based anonymous usage (no account signup required)
- Seed script with ~24 demo found items for quick hackathon demos
- SQLite-backed storage for items, reports, and claims

## Demo script (suggested)
1. **Seed data:** run the seed script to populate ~24 found items.
2. **Photo search:** upload a photo similar to a seeded item and show top matches + score bars.
3. **Text-only search:** enter *"navy metal bottle, cat sticker, lost near the library Tuesday"* and show the matching photo result.
4. **Verification flow:** open a match, answer the verification question (wrong → rejected, right → masked handoff code).
5. **Close:** highlight fast, visual matching with human confirmation and privacy safeguards.

## Privacy & responsible design
- Avoid exposing finder identity and exact storage location publicly.
- Verification is required before claim approval/handoff.
- Successful claims return a **masked handoff code** instead of exchanging personal contact details.
- Public descriptions should avoid sensitive details (e.g. serial numbers).
- **Limitation:** off-the-shelf CLIP can confuse visually similar items (fine-grained instance matching). This system presents **ranked candidates for human confirmation**, not guaranteed identification.

## Tech stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`)
- **Embeddings:** `@xenova/transformers` with CLIP (`Xenova/clip-vit-base-patch32`) for shared image/text embeddings
- **Search:** cosine similarity over stored embeddings with pre-filters (hackathon-scale linear scan)

## Project structure
```text
.
├── client/                 # React UI (Vite)
│   ├── src/
│   │   ├── App.jsx         # Main UI: browse/report/search/claim flows
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   └── vite.config.js
├── server/
│   ├── index.js            # Express API + static serving
│   ├── db.js               # SQLite schema/setup
│   ├── embed.js            # Image/text embedding (CLIP)
│   ├── rank.js             # Pre-filters + blended ranking
│   └── seed.js             # Demo seed data (~24 items)
├── uploads/                # Uploaded/seed images (gitignored)
├── data/                   # SQLite DB (gitignored)
├── package.json
└── README.md
```

## Setup & run
### Prerequisites
- Node.js and npm
- Internet access on first run (to download the CLIP model used by `@xenova/transformers`)
- Build tools may be required for native modules (e.g. `better-sqlite3`) depending on your environment

### Install
```bash
# from project root
npm.cmd install
npm.cmd --prefix client install
```

> Note: if your npm config blocks install scripts, some native deps/build steps (e.g. `better-sqlite3`, `sharp`, `esbuild`) may need approval/rebuild before the app runs:
> `npm.cmd install-scripts ls` / approve as appropriate, then rebuild.

### Seed demo data
```bash
npm.cmd run seed
```
This creates sample found-item images and computes/stores embeddings (first run may take time while the model downloads/loads).

### Run in development
```bash
npm.cmd run dev
```
- API server: `http://localhost:3001`
- Client (Vite dev server): `http://localhost:5173` (proxies `/api` and `/uploads` to the server)

### Build and run
```bash
npm.cmd run build
npm.cmd start
```
Open `http://localhost:3001` to use the built app served by Express.

## API overview
- `GET /api/meta` — categories and location zones
- `POST /api/found` — create found item (multipart form with image)
- `GET /api/found` — list open found items
- `POST /api/lost/search` — search by image and/or text; returns ranked matches
- `POST /api/claim` — submit verification answer and receive masked handoff code on success

## Future improvements
- Replace linear scan with vector indexing (`sqlite-vec`, `pgvector`, or FAISS)
- Add stronger instance-level matching (e.g. DINOv2 features blended with CLIP)
- Better attribute extraction (multimodal LLM -> structured tags)
- Notifications, organizer/staff dashboard, rate-limiting/abuse controls
- Map/geo-radius support and richer audit/privacy controls
