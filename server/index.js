import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import db from './db.js';
import { embedImage, embedText } from './embed.js';
import { rankCandidates, applyFilters } from './rank.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname||'.jpg')}`)
});
const upload = multer({ storage });

const LOCATIONS = ['Library','Cafeteria','Hostel','Academic Block','Sports Ground','Main Gate','Parking','Auditorium','Lab','Other'];
const CATEGORIES = ['Bottle','Bag/Backpack','Wallet','Phone','Keys','Laptop/Electronics','ID/Card','Clothing','Accessories','Other'];

app.get('/api/meta', (_,res)=>res.json({locations:LOCATIONS,categories:CATEGORIES}));

app.post('/api/found', upload.single('image'), async (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:'image required'});
    const {session, category, color, brand, location, found_at, description, verification_question, verification_answer} = req.body;
    if(!verification_question || !verification_answer) return res.status(400).json({error:'verification question and answer required'});
    const image_path = `/uploads/${req.file.filename}`;
    const full = path.join(uploadDir, req.file.filename);
    const embedding = await embedImage(full);
    const id = uuid();
    db.prepare(`INSERT INTO found_items (id,session,image_path,category,color,brand,location,found_at,description,verification_question,verification_answer,embedding) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, session||'anon', image_path, category||'', color||'', brand||'', location||'', found_at||'', description||'', verification_question, verification_answer.toLowerCase().trim(), JSON.stringify(embedding));
    res.json({ok:true,id});
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.get('/api/found', (req,res)=>{
  const items = db.prepare(`SELECT id,image_path,category,color,brand,location,found_at,description,verification_question,status,created_at FROM found_items WHERE status='open' ORDER BY created_at DESC`).all();
  res.json({items});
});

app.post('/api/lost/search', upload.single('image'), async (req,res)=>{
  try{
    const {session, text_query, category, color, location, lost_at} = req.body;
    let queryEmbedding = null;
    let image_path = null;
    if(req.file){
      image_path = `/uploads/${req.file.filename}`;
      queryEmbedding = await embedImage(path.join(uploadDir, req.file.filename));
    } else if(text_query && text_query.trim()){
      queryEmbedding = await embedText(text_query.trim());
    } else {
      return res.status(400).json({error:'provide an image or text description'});
    }
    const lostId = uuid();
    db.prepare(`INSERT INTO lost_reports (id,session,image_path,text_query,category,color,location,lost_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(lostId, session||'anon', image_path, text_query||'', category||'', color||'', location||'', lost_at||'');

    let candidates = db.prepare(`SELECT * FROM found_items WHERE status='open'`).all();
    candidates = applyFilters(candidates, {category, location});
    if(candidates.length===0) return res.json({matches:[], lostId});
    const ranked = rankCandidates({queryEmbedding, lost:{category,color,location,lost_at}, candidates});
    res.json({matches: ranked.slice(0,8), lostId});
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.post('/api/claim', (req,res)=>{
  try{
    const {found_id, lost_id, session, answer} = req.body;
    const item = db.prepare(`SELECT * FROM found_items WHERE id=?`).get(found_id);
    if(!item) return res.status(404).json({error:'item not found'});
    if(item.status!=='open') return res.status(400).json({error:'item not available'});
    const ok = (answer||'').toLowerCase().trim() === (item.verification_answer||'');
    const id = uuid();
    let handoff_code = null;
    if(ok){
      handoff_code = 'HOF-' + Math.random().toString(36).slice(2,8).toUpperCase();
      db.prepare(`UPDATE found_items SET status='claimed' WHERE id=?`).run(found_id);
    }
    db.prepare(`INSERT INTO claims (id,found_id,lost_id,session,answer,result,handoff_code) VALUES (?,?,?,?,?,?,?)`)
      .run(id, found_id, lost_id||'', session||'anon', answer||'', ok?'approved':'rejected', handoff_code);
    if(ok) return res.json({ok:true, handoff_code, message:'Verification passed. Share this handoff code with the finder to coordinate return. Personal contact details stay masked.'});
    return res.json({ok:false, message:'Verification failed. The answer did not match.'});
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.get('*', (req,res)=>{
  const f = path.join(__dirname,'..','client','dist','index.html');
  if(fs.existsSync(f)) return res.sendFile(f);
  res.status(200).send('Client not built yet. Run npm run dev for development.');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=>console.log('Server on http://localhost:'+PORT));
