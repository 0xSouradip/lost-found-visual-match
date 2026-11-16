# Lost & Found — Visual Match

Post a photo of something you found, and the system helps find the person who lost it — by **how the object looks**, not just matching keywords.

## Core idea
- **Found item:** photo + place + time + verification question.
- **Lost report:** photo **or text-only** description.
- **Shared embeddings (CLIP-style):** images and text live in the same vector space, so a text-only report (e.g. *"navy metal bottle, cat sticker, lost near the library Tuesday"*) can match photos of found items.
- **Ranking (blended):**
  - `score = 0.6·embedding_similarity + 0.2·attribute_match + 0.1·time_proximity + 0.1·location_proximity`
- **Pre-filters before vector search:** category, date window, location/zone.
- **Claim flow:** finder-set verification question; wrong answer → rejected, correct → **masked handoff code** (no phone numbers exchanged).

## Demo flow
1. Seed ~24 found items.
2. Upload a photo of a found item → system embeds and indexes it.
3. Search with a photo or **text-only** description → see ranked candidates with score bars/breakdown.
4. Claim an item by answering the verification question → receive masked handoff code on success.

## Privacy & responsible design
- Public listings avoid exposing finder identity and exact storage location.
- Verification required before claim approval/handoff.
- Avoid posting sensitive details (serial numbers, exact storage spot) in public descriptions.
- Positioning: **ranked candidates for human confirmation**, not guaranteed identification (off-the-shelf CLIP can confuse visually similar items).

## Tech stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`)
- **Embeddings:** `@xenova/transformers` CLIP (`Xenova/clip-vit-base-patch32`) for image + text in shared space
- **Vector search:** in-memory/DB scan with cosine similarity (hackathon-scale)

## Project structure
```
client/         # React UI (browse, report found, search lost, claim/verify)
server/
  index.js      # Express API + static serving
  db.js         # SQLite schema
  embed.js      # CLIP image/text embeddings
  rank.js       # filters + blended ranking
  seed.js       # seeds ~24 demo found items
uploads/        # uploaded/seed images (gitignored)
data/           # sqlite db (gitignored)
```

## Setup & run
> Requires Node.js and npm. First run downloads the CLIP model (network needed).

```bash
# install root deps
npm.cmd install

# install client deps
npm.cmd --prefix client install

# seed demo data (generates sample images + embeddings)
npm.cmd run seed

# development (API on :3001, Vite on :5173 with proxy)
npm.cmd run dev

# or build client and run server
npm.cmd run build
npm.cmd start
```
Open http://localhost:5173 (dev) or http://localhost:3001 (after build+start).

## Notes
- `better-sqlite3` is a native module and may require build tools on your system.
- Embedding/model loading happens on first use/seed; allow time for model download and inference.
- At larger scale, replace linear scan with `sqlite-vec`, `pgvector`, or FAISS and add stronger instance features (e.g. DINOv2) alongside CLIP.
