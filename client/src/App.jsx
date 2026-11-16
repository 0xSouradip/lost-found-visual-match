import React, { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_META,
  INITIAL_DEMO_ITEMS,
  makeSvgThumb,
  simulateDemoSearch,
  simulateDemoClaim
} from './demoData.js'

const api = (p, opts = {}) =>
  fetch(p, opts).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  });

function getSession() {
  let s = localStorage.getItem('lf_session');
  if (!s) {
    s = 'sess-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('lf_session', s);
  }
  return s;
}

function ScoreBars({ scores }) {
  if (!scores) return null;
  const rows = [
    ['Total', scores.total],
    ['Visual similarity', scores.embedding],
    ['Attributes', scores.attributes],
    ['Time', scores.time],
    ['Location', scores.location]
  ];
  return (
    <div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ marginBottom: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">{k}</span>
            <span className="small">{(v * 100).toFixed(0)}%</span>
          </div>
          <div className="scorebar">
            <span style={{ width: `${Math.max(0, Math.min(100, v * 100))}%` }}></span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('browse');
  const [meta, setMeta] = useState(DEFAULT_META);
  const [found, setFound] = useState(INITIAL_DEMO_ITEMS);
  const [isDemo, setIsDemo] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const session = useMemo(getSession, []);

  const load = async () => {
    try {
      const data = await api('/api/found');
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        setFound(data.items);
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }
    } catch (e) {
      // Backend not running (e.g. GitHub Pages static deployment) -> demo mode
      setIsDemo(true);
      setFound((prev) => (prev.length > 0 ? prev : INITIAL_DEMO_ITEMS));
    }
  };

  useEffect(() => {
    api('/api/meta')
      .then((m) => {
        if (m && m.categories && m.locations) {
          setMeta(m);
          setIsDemo(false);
        }
      })
      .catch(() => {
        setIsDemo(true);
      });
    load();
  }, []);

  const handleAddFound = (newItem) => {
    setFound((prev) => [newItem, ...prev]);
    setMsg('Found item posted.');
    setTab('browse');
  };

  const handleClaimSuccess = (itemId) => {
    setFound((prev) => prev.filter((it) => it.id !== itemId));
    setMsg('Claim verified and recorded.');
  };

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Lost &amp; Found — Visual Match</h1>
          <p className="sub">
            Match found items to lost reports by how they look (photo or text), not just keywords. Session: <b>{session}</b>
          </p>
        </div>
        <nav>
          <button className={tab === 'browse' ? 'primary' : ''} onClick={() => setTab('browse')}>
            Browse Found ({found.length})
          </button>
          <button className={tab === 'report-found' ? 'primary' : ''} onClick={() => setTab('report-found')}>
            Report Found
          </button>
          <button className={tab === 'report-lost' ? 'primary' : ''} onClick={() => setTab('report-lost')}>
            I Lost Something
          </button>
        </nav>
      </header>

      {isDemo && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <b>⚡ Live GitHub Pages Preview:</b> Interactive prototype loaded with 20 sample items and instant visual-ranking demo. You can test searching, browsing, reporting, and claim verification live right here. (For backend CLIP neural embeddings and SQLite storage, run locally with <code>npm run dev</code>).
        </div>
      )}

      <div className="hero">
        <b>How matching works</b>
        <ul>
          <li>CLIP-style shared embeddings let a <b>text-only</b> lost report match photos of found items.</li>
          <li>Ranking blends visual similarity, attributes, time proximity, and location proximity (with pre-filters).</li>
          <li>Claims require a finder-set verification answer; on success you get a <b>masked handoff code</b> (no phone numbers exchanged).</li>
        </ul>
      </div>

      {err && <div className="panel bad">{err}</div>}
      {msg && <div className="panel ok">{msg}</div>}

      {tab === 'browse' && (
        <Browse
          items={found}
          session={session}
          isDemo={isDemo}
          onClaimDone={(claimedId) => {
            if (isDemo) {
              handleClaimSuccess(claimedId);
            } else {
              load();
              setMsg('Claim processed.');
            }
          }}
        />
      )}

      {tab === 'report-found' && (
        <ReportFound
          meta={meta}
          session={session}
          isDemo={isDemo}
          onDone={(createdItem) => {
            if (isDemo && createdItem) {
              handleAddFound(createdItem);
            } else {
              setMsg('Found item posted.');
              setTab('browse');
              load();
            }
          }}
          setErr={setErr}
        />
      )}

      {tab === 'report-lost' && (
        <ReportLost
          meta={meta}
          session={session}
          isDemo={isDemo}
          demoItems={found}
          setErr={setErr}
          onClaimDone={(claimedId) => {
            if (isDemo) {
              handleClaimSuccess(claimedId);
            } else {
              load();
            }
          }}
        />
      )}
    </div>
  );
}

function Browse({ items, onClaimDone, session, isDemo }) {
  const [claimItem, setClaimItem] = useState(null);
  return (
    <div>
      <div className="panel notice small">
        Privacy: public listings avoid exposing finder identity or exact storage location. Details are shared only after a verified claim is approved.
      </div>
      {items.length === 0 ? (
        <div className="panel muted">No open found items yet. Report a found item above.</div>
      ) : (
        <div className="grid">
          {items.map((it) => (
            <div className="card" key={it.id}>
              <img className="thumb" src={it.image_path} alt={it.category || 'found item'} />
              <div className="pad">
                <div>
                  <span className="pill">{it.category || 'Item'}</span>
                  {it.color && <span className="pill">{it.color}</span>}
                  {it.brand && <span className="pill" style={{ opacity: 0.8 }}>{it.brand}</span>}
                </div>
                <div className="small muted" style={{ marginTop: 6 }}>
                  Found at: {it.location || '—'} · {it.found_at ? new Date(it.found_at).toLocaleString() : 'time n/a'}
                </div>
                {it.description && <div className="small" style={{ marginTop: 6 }}>{it.description}</div>}
                <div style={{ marginTop: 10 }}>
                  <button className="primary" onClick={() => setClaimItem(it)}>
                    Claim this item
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {claimItem && (
        <ClaimModal
          item={claimItem}
          session={session}
          isDemo={isDemo}
          onClose={() => setClaimItem(null)}
          onDone={() => {
            const id = claimItem.id;
            setClaimItem(null);
            onClaimDone(id);
          }}
        />
      )}
    </div>
  );
}

function ClaimModal({ item, onClose, onDone, session, isDemo }) {
  const [answer, setAnswer] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        const r = simulateDemoClaim(item, answer);
        setRes(r);
        if (r.ok) setTimeout(onDone, 1500);
      } else {
        const r = await api('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ found_id: item.id, session, answer })
        });
        setRes(r);
        if (r.ok) setTimeout(onDone, 1500);
      }
    } catch (e) {
      setRes({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modalbg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Verify claim</h3>
        <p className="muted small">
          Answer the finder's verification question. Correct answers receive a masked handoff code.
        </p>
        <div className="panel">
          <b>Question:</b> {item.verification_question}
        </div>
        {!res ? (
          <form onSubmit={submit}>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              required
            />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="primary" disabled={busy}>
                {busy ? 'Checking...' : 'Submit answer'}
              </button>
              <button type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className={res.ok ? 'ok' : 'bad'}>
            <p><b>{res.ok ? 'Approved' : 'Rejected'}</b></p>
            <p>{res.message}</p>
            {res.handoff_code && (
              <div className="panel">
                <b>Handoff code:</b> {res.handoff_code}
                <div className="small muted">
                  No phone numbers exchanged. Coordinate return via this code with the organizer/desk.
                </div>
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <button onClick={res.ok ? onDone : onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportFound({ meta, session, isDemo, onDone, setErr }) {
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const form = e.target;
    try {
      if (isDemo) {
        const file = form.image?.files?.[0];
        let image_path = '';
        if (file) {
          image_path = URL.createObjectURL(file);
        } else {
          image_path = makeSvgThumb(form.category.value, form.color.value, form.brand.value);
        }
        const newItem = {
          id: 'item-' + Date.now(),
          category: form.category.value || 'Item',
          color: form.color.value || '',
          brand: form.brand.value || '',
          location: form.location.value || 'Campus',
          found_at: form.found_at.value || new Date().toISOString(),
          description: form.description.value || '',
          verification_question: form.verification_question.value,
          verification_answer: form.verification_answer.value,
          image_path,
          status: 'open'
        };
        await new Promise((r) => setTimeout(r, 400));
        form.reset();
        onDone(newItem);
      } else {
        const fd = new FormData(form);
        fd.set('session', session);
        await api('/api/found', { method: 'POST', body: fd });
        form.reset();
        onDone();
      }
    } catch (er) {
      setErr(er.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Report a found item</h2>
      <form onSubmit={submit}>
        <div>
          <label>Photo *</label>
          <input name="image" type="file" accept="image/*" required />
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Category</label>
            <select name="category" defaultValue="">
              <option value="">Select</option>
              {meta.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Color</label>
            <input name="color" placeholder="e.g. navy" />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Brand</label>
            <input name="brand" placeholder="optional" />
          </div>
          <div style={{ flex: 1 }}>
            <label>Location (zone)</label>
            <select name="location" defaultValue="">
              <option value="">Select</option>
              {meta.locations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label>Found date &amp; time</label>
          <input name="found_at" type="datetime-local" />
        </div>
        <div>
          <label>Description</label>
          <textarea
            name="description"
            placeholder="Visible details (stickers, dents). Avoid sensitive info like serial numbers."
          ></textarea>
        </div>
        <div>
          <label>Verification question *</label>
          <input
            name="verification_question"
            placeholder="e.g. What's written on the sticker?"
            required
          />
        </div>
        <div>
          <label>Verification answer (kept private) *</label>
          <input
            name="verification_answer"
            placeholder="expected answer"
            required
          />
        </div>
        <button className="primary" disabled={busy}>
          {busy ? 'Processing...' : 'Post found item'}
        </button>
      </form>
    </div>
  );
}

function ReportLost({ meta, session, isDemo, demoItems, setErr, onClaimDone }) {
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    setMatches(null);
    const form = e.target;
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        const results = simulateDemoSearch(
          form.text_query.value,
          form.category.value,
          form.color.value,
          form.location.value,
          form.lost_at.value,
          demoItems
        );
        setMatches(results);
      } else {
        const fd = new FormData(form);
        fd.set('session', session);
        const r = await api('/api/lost/search', { method: 'POST', body: fd });
        setMatches(r.matches || []);
      }
    } catch (er) {
      setErr(er.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="split">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Report lost item / search</h2>
        <p className="muted small">
          Provide a <b>photo</b> or a <b>text description</b> (or both). Text-only reports can match found photos via shared embeddings.
        </p>
        <form onSubmit={submit}>
          <div>
            <label>Photo (optional if text provided)</label>
            <input name="image" type="file" accept="image/*" />
          </div>
          <div>
            <label>Text description</label>
            <textarea
              name="text_query"
              placeholder='e.g. "navy metal bottle, cat sticker, lost near the library Tuesday"'
            ></textarea>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Category filter</label>
              <select name="category" defaultValue="">
                <option value="">Any</option>
                {meta.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Color</label>
              <input name="color" placeholder="e.g. navy" />
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Lost near (zone)</label>
              <select name="location" defaultValue="">
                <option value="">Any</option>
                {meta.locations.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Approx. lost time</label>
              <input name="lost_at" type="datetime-local" />
            </div>
          </div>
          <button className="primary" disabled={busy}>
            {busy ? 'Searching & ranking...' : 'Find matches'}
          </button>
        </form>
      </div>
      <div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Ranked matches</h3>
          {!matches && (
            <div className="muted small">Submit a search to see ranked candidates with score bars.</div>
          )}
          {matches && matches.length === 0 && (
            <div className="muted">No candidates match your filters. Try broadening search.</div>
          )}
          {matches &&
            matches.map((m) => (
              <MatchCard
                key={m.id}
                m={m}
                session={session}
                isDemo={isDemo}
                onClaimDone={() => onClaimDone(m.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ m, session, isDemo, onClaimDone }) {
  const [claim, setClaim] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <img className="thumb" src={m.image_path} alt={m.category} />
      <div className="pad">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <span className="pill">{m.category || 'Item'}</span>
            {m.color && <span className="pill">{m.color}</span>}
            {m.brand && <span className="pill" style={{ opacity: 0.8 }}>{m.brand}</span>}
          </div>
          <b>{(m.scores.total * 100).toFixed(0)}%</b>
        </div>
        <div className="small muted">
          {m.location || '—'} · {m.found_at ? new Date(m.found_at).toLocaleString() : ''}
        </div>
        {m.description && <div className="small" style={{ margin: '6px 0' }}>{m.description}</div>}
        <ScoreBars scores={m.scores} />
        <button className="primary" onClick={() => setClaim(true)}>
          Claim &amp; verify
        </button>
      </div>
      {claim && (
        <ClaimModal
          item={m}
          session={session}
          isDemo={isDemo}
          onClose={() => setClaim(false)}
          onDone={() => {
            setClaim(false);
            onClaimDone();
          }}
        />
      )}
    </div>
  );
}


function TeamView() {
  const base = import.meta.env.BASE_URL || './';
  const members = [
    {
      name: 'Souradip Ghosh',
      role: 'Lead Engineer & AI Architect',
      photo: `${base}team/souradip.jpg`,
      bio: '19-year-old student with a Pure Science background and a deep passion for technology, distributed systems, and applied AI. Architected the CLIP vector search engine, blended ranking model, and full-stack system architecture.',
      skills: 'CLIP Embeddings · Multimodal Ranking · System Architecture · Full-Stack',
      github: 'https://github.com/0xSouradip',
      email: 'mailto:ghoshsouradip02@gmail.com'
    },
    {
      name: 'Angshu Sarkar',
      role: 'Frontend Engineer',
      photo: `${base}team/angshu.jpg`,
      bio: 'Computer science student and creative frontend developer. Built the modular interactive React component library, design token synchronization, visual score breakdown displays, and responsive state handling.',
      skills: 'React · Oceanic UI System · Visual Scoring HUD · Responsive UX',
      github: 'https://github.com/0xSouradip/lost-found-visual-match',
      email: 'mailto:sarkarangshu04@gmail.com'
    },
    {
      name: 'Sneha Mukherjee',
      role: 'Frontend Engineer',
      photo: `${base}team/sneha.png`,
      bio: 'Tech student focusing on modern UI/UX engineering, WCAG accessibility standards, user flow optimization, and intuitive claim & verification security workflows.',
      skills: 'UI/UX Workflows · Accessibility (WCAG) · Claim Verification · State Trapping',
      github: 'https://github.com/0xSouradip/lost-found-visual-match',
      email: 'mailto:snehamukherjee387@gmail.com'
    }
  ];

  return (
    <div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>👥 The Engineering Team</h2>
        <p className="muted" style={{ margin: '4px 0 16px' }}>
          Passionate engineering students dedicated to creating intelligent, privacy-first technologies using multimodal AI and modern web architectures.
        </p>
        <div className="team-grid">
          {members.map((m) => (
            <div className="team-card" key={m.name}>
              <img
                className="team-avatar"
                src={m.photo}
                alt={m.name}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="team-name">{m.name}</div>
              <div className="team-role">{m.role}</div>
              <div className="team-bio">{m.bio}</div>
              <div style={{ marginBottom: 14 }}>
                <span className="pill small">{m.skills}</span>
              </div>
              <div className="team-links">
                {m.github && (
                  <a href={m.github} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                )}
                {m.email && (
                  <a href={m.email}>
                    Email
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}