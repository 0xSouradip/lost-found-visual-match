import React, { useEffect, useMemo, useState } from 'react'

const api = (p, opts={}) => fetch(p, opts).then(async r=>{ const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||'Request failed'); return j; });
function getSession(){ let s=localStorage.getItem('lf_session'); if(!s){ s='sess-'+Math.random().toString(36).slice(2,8); localStorage.setItem('lf_session',s);} return s; }

function ScoreBars({scores}){
  if(!scores) return null;
  const rows = [['Total',scores.total],['Visual similarity',scores.embedding],['Attributes',scores.attributes],['Time',scores.time],['Location',scores.location]];
  return <div>{rows.map(([k,v])=> (
    <div key={k} style={{marginBottom:6}}>
      <div className="row" style={{justifyContent:'space-between'}}><span className="small muted">{k}</span><span className="small">{(v*100).toFixed(0)}%</span></div>
      <div className="scorebar"><span style={{width:`${Math.max(0,Math.min(100,v*100))}%`}}></span></div>
    </div>
  ))}</div>;
}

export default function App(){
  const [tab,setTab]=useState('browse');
  const [meta,setMeta]=useState({locations:[],categories:[]});
  const [found,setFound]=useState([]);
  const [msg,setMsg]=useState('');
  const [err,setErr]=useState('');
  const session = useMemo(getSession,[]);

  const load = async()=>{ try{ setFound((await api('/api/found')).items||[]);}catch(e){/*ignore*/} };
  useEffect(()=>{ api('/api/meta').then(setMeta).catch(()=>{}); load(); },[]);

  return <div className="wrap">
    <header>
      <div>
        <h1>Lost &amp; Found — Visual Match</h1>
        <p className="sub">Match found items to lost reports by how they look (photo or text), not just keywords. Session: <b>{session}</b></p>
      </div>
      <nav>
        <button className={tab==='browse'?'primary':''} onClick={()=>setTab('browse')}>Browse Found</button>
        <button className={tab==='report-found'?'primary':''} onClick={()=>setTab('report-found')}>Report Found</button>
        <button className={tab==='report-lost'?'primary':''} onClick={()=>setTab('report-lost')}>I Lost Something</button>
      </nav>
    </header>

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

    {tab==='browse' && <Browse items={found} session={session} onClaimDone={()=>{load(); setMsg('Claim processed.');}} />}
    {tab==='report-found' && <ReportFound meta={meta} session={session} onDone={()=>{setMsg('Found item posted.'); setTab('browse'); load();}} setErr={setErr} />}
    {tab==='report-lost' && <ReportLost meta={meta} session={session} setErr={setErr} onClaimDone={()=>{load();}} />}
  </div>;
}

function Browse({items, onClaimDone, session}){
  const [claimItem,setClaimItem]=useState(null);
  return <div>
    <div className="panel notice small">Privacy: public listings avoid exposing finder identity or exact storage location. Details are shared only after a verified claim is approved.</div>
    {items.length===0 ? <div className="panel muted">No open found items yet. Run the seed script or report a found item.</div> :
    <div className="grid">{items.map(it=> (
      <div className="card" key={it.id}>
        <img className="thumb" src={it.image_path} alt={it.category||'found item'} />
        <div className="pad">
          <div><span className="pill">{it.category||'Item'}</span>{it.color && <span className="pill">{it.color}</span>}</div>
          <div className="small muted" style={{marginTop:6}}>Found at: {it.location||'—'} · {it.found_at? new Date(it.found_at).toLocaleString(): 'time n/a'}</div>
          {it.description && <div className="small" style={{marginTop:6}}>{it.description}</div>}
          <div style={{marginTop:10}}><button className="primary" onClick={()=>setClaimItem(it)}>Claim this item</button></div>
        </div>
      </div>
    ))}</div>}
    {claimItem && <ClaimModal item={claimItem} session={session} onClose={()=>setClaimItem(null)} onDone={()=>{setClaimItem(null); onClaimDone();}} />}
  </div>;
}

function ClaimModal({item,onClose,onDone,session}){
  const [answer,setAnswer]=useState('');
  const [res,setRes]=useState(null); const [busy,setBusy]=useState(false);
  const submit=async(e)=>{ e.preventDefault(); setBusy(true); try{ const r=await api('/api/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({found_id:item.id, session, answer})}); setRes(r); if(r.ok) setTimeout(onDone,1500);}catch(e){setRes({ok:false,message:e.message});} finally{setBusy(false);} };
  return <div className="modalbg" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <h3 style={{marginTop:0}}>Verify claim</h3>
    <p className="muted small">Answer the finder's verification question. Correct answers receive a masked handoff code.</p>
    <div className="panel"><b>Question:</b> {item.verification_question}</div>
    {!res ? <form onSubmit={submit}><input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Your answer" required /><div className="row" style={{marginTop:10}}><button className="primary" disabled={busy}>{busy?'Checking...':'Submit answer'}</button><button type="button" onClick={onClose}>Cancel</button></div></form>
    : <div className={res.ok?'ok':'bad'}><p><b>{res.ok?'Approved':'Rejected'}</b></p><p>{res.message}</p>{res.handoff_code && <div className="panel"><b>Handoff code:</b> {res.handoff_code}<div className="small muted">No phone numbers exchanged. Coordinate return via this code with the organizer/desk.</div></div>}<div style={{marginTop:10}}><button onClick={res.ok?onDone:onClose}>Close</button></div></div>}
  </div></div>;
}

function ReportFound({meta,session,onDone,setErr}){
  const [busy,setBusy]=useState(false);
  const submit=async(e)=>{ e.preventDefault(); setErr(''); setBusy(true); try{ const fd=new FormData(e.target); fd.set('session',session); await api('/api/found',{method:'POST',body:fd}); e.target.reset(); onDone(); }catch(er){setErr(er.message);} finally{setBusy(false);} };
  return <div className="panel"><h2 style={{marginTop:0}}>Report a found item</h2>
    <form onSubmit={submit}>
      <div><label>Photo *</label><input name="image" type="file" accept="image/*" required /></div>
      <div className="row"><div style={{flex:1}}><label>Category</label><select name="category" defaultValue=""><option value="">Select</option>{meta.categories.map(c=><option key={c}>{c}</option>)}</select></div><div style={{flex:1}}><label>Color</label><input name="color" placeholder="e.g. navy" /></div></div>
      <div className="row"><div style={{flex:1}}><label>Brand</label><input name="brand" placeholder="optional" /></div><div style={{flex:1}}><label>Location (zone)</label><select name="location" defaultValue=""><option value="">Select</option>{meta.locations.map(l=><option key={l}>{l}</option>)}</select></div></div>
      <div><label>Found date & time</label><input name="found_at" type="datetime-local" /></div>
      <div><label>Description</label><textarea name="description" placeholder="Visible details (stickers, dents). Avoid sensitive info like serial numbers."></textarea></div>
      <div><label>Verification question *</label><input name="verification_question" placeholder="e.g. What's written on the sticker?" required /></div>
      <div><label>Verification answer (kept private) *</label><input name="verification_answer" placeholder="expected answer" required /></div>
      <button className="primary" disabled={busy}>{busy?'Uploading & embedding...':'Post found item'}</button>
    </form></div>;
}

function ReportLost({meta,session,setErr,onClaimDone}){
  const [busy,setBusy]=useState(false); const [matches,setMatches]=useState(null); const [lostId,setLostId]=useState(null);
  const submit=async(e)=>{ e.preventDefault(); setErr(''); setBusy(true); setMatches(null); try{ const fd=new FormData(e.target); fd.set('session',session); const r=await api('/api/lost/search',{method:'POST',body:fd}); setMatches(r.matches||[]); setLostId(r.lostId);}catch(er){setErr(er.message);} finally{setBusy(false);} };
  return <div className="split">
    <div className="panel"><h2 style={{marginTop:0}}>Report lost item / search</h2>
      <p className="muted small">Provide a <b>photo</b> or a <b>text description</b> (or both). Text-only reports can match found photos via shared embeddings.</p>
      <form onSubmit={submit}>
        <div><label>Photo (optional if text provided)</label><input name="image" type="file" accept="image/*" /></div>
        <div><label>Text description</label><textarea name="text_query" placeholder='e.g. "navy metal bottle, cat sticker, lost near the library Tuesday"'></textarea></div>
        <div className="row"><div style={{flex:1}}><label>Category filter</label><select name="category" defaultValue=""><option value="">Any</option>{meta.categories.map(c=><option key={c}>{c}</option>)}</select></div><div style={{flex:1}}><label>Color</label><input name="color" placeholder="e.g. navy" /></div></div>
        <div className="row"><div style={{flex:1}}><label>Lost near (zone)</label><select name="location" defaultValue=""><option value="">Any</option>{meta.locations.map(l=><option key={l}>{l}</option>)}</select></div><div style={{flex:1}}><label>Approx. lost time</label><input name="lost_at" type="datetime-local" /></div></div>
        <button className="primary" disabled={busy}>{busy?'Searching & ranking...':'Find matches'}</button>
      </form>
    </div>
    <div>
      <div className="panel"><h3 style={{marginTop:0}}>Ranked matches</h3>
        {!matches && <div className="muted small">Submit a search to see ranked candidates with score bars.</div>}
        {matches && matches.length===0 && <div className="muted">No candidates after filters. Try broadening search.</div>}
        {matches && matches.map(m=> <MatchCard key={m.id} m={m} session={session} onClaimDone={onClaimDone} />)}
      </div>
    </div>
  </div>;
}

function MatchCard({m,session,onClaimDone}){
  const [claim,setClaim]=useState(false);
  return <div className="card" style={{marginBottom:12}}>
    <img className="thumb" src={m.image_path} alt={m.category} />
    <div className="pad">
      <div className="row" style={{justifyContent:'space-between'}}><div><span className="pill">{m.category||'Item'}</span>{m.color&&<span className="pill">{m.color}</span>}</div><b>{(m.scores.total*100).toFixed(0)}%</b></div>
      <div className="small muted">{m.location||'—'} · {m.found_at? new Date(m.found_at).toLocaleString():''}</div>
      {m.description && <div className="small" style={{margin:'6px 0'}}>{m.description}</div>}
      <ScoreBars scores={m.scores} />
      <button className="primary" onClick={()=>setClaim(true)}>Claim & verify</button>
    </div>
    {claim && <ClaimModal item={m} session={session} onClose={()=>setClaim(false)} onDone={()=>{setClaim(false); onClaimDone();}} />}
  </div>;
}
