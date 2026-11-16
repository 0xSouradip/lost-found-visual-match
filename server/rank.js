import { cosine } from './embed.js';

function parseDate(d){ const t = d ? new Date(d).getTime() : NaN; return isNaN(t)?null:t; }
function daysBetween(a,b){ if(a==null||b==null) return null; return Math.abs(a-b)/(1000*60*60*24); }
function normStr(s){ return (s||'').toString().trim().toLowerCase(); }

export function rankCandidates({queryEmbedding, lost, candidates}){
  const lostTime = parseDate(lost.lost_at);
  const results = candidates.map(item => {
    const itemEmb = JSON.parse(item.embedding);
    const embSim = cosine(queryEmbedding, itemEmb); // normalized embeddings
    const sim = Math.max(0, Math.min(1, (embSim+1)/2)); // map [-1,1] to [0,1] for display-ish but cosine on normalized is [ -1,1]; better keep as is
    const sim01 = Math.max(0, Math.min(1, embSim));

    // attribute match
    let attrs = 0, total = 0;
    const pairs = [['category', lost.category, item.category], ['color', lost.color, item.color]];
    for(const [k,a,b] of pairs){ if(normStr(a)){ total++; if(normStr(a) && normStr(a)===normStr(b)) attrs++; else if(normStr(a) && normStr(b) && normStr(b).includes(normStr(a))) attrs+=0.5; } }
    const attrScore = total? attrs/total : 0.5; // neutral if not specified

    // time proximity
    const foundTime = parseDate(item.found_at);
    const d = daysBetween(lostTime, foundTime);
    const timeScore = d==null ? 0.5 : Math.max(0, 1 - d/14); // within 2 weeks

    // location proximity (zone match simple)
    const locScore = (normStr(lost.location) && normStr(lost.location)===normStr(item.location)) ? 1 : (normStr(lost.location)? 0.3 : 0.5);

    const score = 0.6*sim01 + 0.2*attrScore + 0.1*timeScore + 0.1*locScore;
    return {
      ...item,
      verification_answer: undefined,
      embedding: undefined,
      scores: { total: score, embedding: sim01, attributes: attrScore, time: timeScore, location: locScore }
    };
  });
  results.sort((a,b)=>b.scores.total - a.scores.total);
  return results;
}

export function applyFilters(items, {category, from, to, location}){
  return items.filter(it => {
    if(category && normStr(it.category)!==normStr(category)) return false;
    if(location && normStr(it.location)!==normStr(location)) return false;
    const t = parseDate(it.found_at);
    if(from){ const f=parseDate(from); if(f && t && t < f) return false; }
    if(to){ const tt=parseDate(to); if(tt && t && t > tt+24*3600*1000) return false; }
    return true;
  });
}
