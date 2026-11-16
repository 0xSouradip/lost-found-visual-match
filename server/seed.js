import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import db from './db.js';
import { embedImage } from './embed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// Minimal 24-bit BMP generator (solid/striped background with simple label block)
function makeBMP(w,h,bg,accent){
  const rowSize = Math.floor((24*w + 31)/32)*4;
  const pixelDataSize = rowSize*h;
  const fileSize = 54 + pixelDataSize;
  const buf = Buffer.alloc(fileSize);
  buf.write('BM',0); buf.writeUInt32LE(fileSize,2); buf.writeUInt32LE(54,10);
  buf.writeUInt32LE(40,14); buf.writeInt32LE(w,18); buf.writeInt32LE(h,22);
  buf.writeUInt16LE(1,26); buf.writeUInt16LE(24,28); buf.writeUInt32LE(pixelDataSize,34);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      let c = bg;
      // simple accent stripe/shape for visual distinction
      if(x>40 && x<w-40 && y>40 && y<120) c = accent;
      if(x>60 && x<140 && y>140 && y<h-60) c = accent;
      if(((x/20|0)+(y/20|0))%7===0) c = [(c[0]+20)%256,(c[1]+20)%256,(c[2]+20)%256];
      const off = 54 + y*rowSize + x*3;
      buf[off]=c[2]; buf[off+1]=c[1]; buf[off+2]=c[0];
    }
  }
  return buf;
}

const items = [
  {category:'Bottle', color:'navy', brand:'Hydro Flask', location:'Library', found_at:'2026-11-10T14:30', description:'Navy metal bottle, dented lid, cat sticker', q:"What's written on the sticker?", a:'meow', bg:[20,40,90], ac:[230,180,60]},
  {category:'Bottle', color:'blue', brand:'Milton', location:'Cafeteria', found_at:'2026-11-11T09:00', description:'Light blue plastic bottle, no stickers', q:'What brand logo is on it?', a:'milton', bg:[60,120,200], ac:[240,240,240]},
  {category:'Bottle', color:'black', brand:'Cello', location:'Sports Ground', found_at:'2026-11-09T18:00', description:'Black sports bottle, white cap', q:'What color is the cap?', a:'white', bg:[30,30,30], ac:[220,220,220]},
  {category:'Bag/Backpack', color:'black', brand:'Wildcraft', location:'Academic Block', found_at:'2026-11-12T11:00', description:'Black backpack, red keychain on zipper', q:'What color is the keychain?', a:'red', bg:[25,25,25], ac:[200,40,40]},
  {category:'Bag/Backpack', color:'blue', brand:'Skybags', location:'Library', found_at:'2026-11-08T16:00', description:'Blue backpack with laptop sleeve', q:'What brand is it?', a:'skybags', bg:[40,70,160], ac:[240,240,240]},
  {category:'Bag/Backpack', color:'grey', brand:'Nike', location:'Sports Ground', found_at:'2026-11-13T07:30', description:'Grey gym bag, shoe compartment', q:'Any brand name visible?', a:'nike', bg:[110,110,120], ac:[30,30,30]},
  {category:'Wallet', color:'brown', brand:'', location:'Cafeteria', found_at:'2026-11-11T13:00', description:'Brown leather wallet, worn edges', q:'How many card slots inside (approx)?', a:'6', bg:[120,70,30], ac:[60,30,10]},
  {category:'Wallet', color:'black', brand:'', location:'Parking', found_at:'2026-11-12T19:00', description:'Black slim wallet', q:'Is it leather or fabric?', a:'fabric', bg:[20,20,20], ac:[80,80,80]},
  {category:'Phone', color:'black', brand:'Samsung', location:'Auditorium', found_at:'2026-11-10T17:00', description:'Black phone with cracked corner protector', q:'What brand?', a:'samsung', bg:[15,15,18], ac:[70,130,220]},
  {category:'Phone', color:'white', brand:'', location:'Lab', found_at:'2026-11-13T10:15', description:'White phone, clear case with flower', q:'What is on the case?', a:'flower', bg:[240,240,245], ac:[220,120,160]},
  {category:'Keys', color:'silver', brand:'', location:'Main Gate', found_at:'2026-11-09T08:00', description:'Bunch of 3 keys with blue tag', q:'What color is the key tag?', a:'blue', bg:[180,180,190], ac:[40,90,200]},
  {category:'Keys', color:'silver', brand:'', location:'Hostel', found_at:'2026-11-12T22:00', description:'Single key with red keyring', q:'What color is the keyring?', a:'red', bg:[170,170,170], ac:[200,50,50]},
  {category:'Laptop/Electronics', color:'silver', brand:'Dell', location:'Library', found_at:'2026-11-11T20:00', description:'Silver laptop charger, Dell tip', q:'Which brand charger?', a:'dell', bg:[200,200,205], ac:[40,80,160]},
  {category:'Laptop/Electronics', color:'white', brand:'Apple', location:'Cafeteria', found_at:'2026-11-13T12:00', description:'White earbuds case, small scratch on top', q:'Any scratch location?', a:'top', bg:[245,245,245], ac:[180,180,180]},
  {category:'ID/Card', color:'blue', brand:'', location:'Academic Block', found_at:'2026-11-10T10:00', description:'Blue ID card holder with lanyard', q:'What color is the holder?', a:'blue', bg:[50,90,180], ac:[230,230,230]},
  {category:'Clothing', color:'red', brand:'', location:'Sports Ground', found_at:'2026-11-08T18:30', description:'Red hoodie, left on bench', q:'What type of clothing?', a:'hoodie', bg:[180,40,40], ac:[30,30,30]},
  {category:'Clothing', color:'green', brand:'', location:'Hostel', found_at:'2026-11-12T07:00', description:'Green cap', q:'What item is it?', a:'cap', bg:[40,140,70], ac:[20,60,30]},
  {category:'Accessories', color:'black', brand:'', location:'Auditorium', found_at:'2026-11-11T16:00', description:'Black umbrella, wooden handle', q:'What kind of handle?', a:'wooden', bg:[30,30,35], ac:[150,110,70]},
  {category:'Accessories', color:'pink', brand:'', location:'Library', found_at:'2026-11-13T15:00', description:'Pink scarf with white dots', q:'What pattern is on it?', a:'dots', bg:[230,120,170], ac:[255,255,255]},
  {category:'Bottle', color:'green', brand:'', location:'Lab', found_at:'2026-11-09T11:00', description:'Green transparent bottle, leaf sticker', q:'What sticker is on it?', a:'leaf', bg:[60,150,80], ac:[200,230,120]},
  {category:'Bag/Backpack', color:'red', brand:'', location:'Parking', found_at:'2026-11-10T19:30', description:'Small red sling bag', q:'What type of bag?', a:'sling', bg:[170,40,50], ac:[240,220,220]},
  {category:'Wallet', color:'blue', brand:'', location:'Main Gate', found_at:'2026-11-13T09:00', description:'Blue canvas wallet, zip closure', q:'Does it have zip or button?', a:'zip', bg:[50,80,150], ac:[30,40,80]},
  {category:'Accessories', color:'gold', brand:'', location:'Cafeteria', found_at:'2026-11-12T14:00', description:'Gold-colored bracelet', q:'What accessory is it?', a:'bracelet', bg:[210,170,60], ac:[120,90,20]},
  {category:'Laptop/Electronics', color:'black', brand:'', location:'Academic Block', found_at:'2026-11-11T15:30', description:'Black USB drive with yellow stripe', q:'What color stripe on it?', a:'yellow', bg:[25,25,25], ac:[230,200,40]},
];

async function run(){
  console.log('Seeding', items.length, 'items (this will download/load the CLIP model on first run)...');
  db.exec('DELETE FROM claims; DELETE FROM lost_reports; DELETE FROM found_items;');
  for(const it of items){
    const fname = `seed-${Date.now()}-${Math.random().toString(36).slice(2)}.bmp`;
    const full = path.join(uploadDir, fname);
    fs.writeFileSync(full, makeBMP(320,240,it.bg,it.ac));
    const embedding = await embedImage(full);
    const id = uuid();
    db.prepare(`INSERT INTO found_items (id,session,image_path,category,color,brand,location,found_at,description,verification_question,verification_answer,embedding,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,'seed',`/uploads/${fname}`,it.category,it.color,it.brand,it.location,it.found_at,it.description,it.q,it.a.toLowerCase(),JSON.stringify(embedding),'open');
    console.log(' +', it.category, it.color, it.location);
  }
  console.log('Seed complete.');
}
run().catch(e=>{ console.error(e); process.exit(1); });
