export const DEFAULT_META = {
  locations: ['Library', 'Cafeteria', 'Hostel', 'Academic Block', 'Sports Ground', 'Main Gate', 'Parking', 'Auditorium', 'Lab', 'Other'],
  categories: ['Bottle', 'Bag/Backpack', 'Wallet', 'Phone', 'Keys', 'Laptop/Electronics', 'ID/Card', 'Clothing', 'Accessories', 'Other']
};

const CATEGORY_ICONS = {
  'Bottle': '🧴',
  'Bag/Backpack': '🎒',
  'Wallet': '👛',
  'Phone': '📱',
  'Keys': '🔑',
  'Laptop/Electronics': '💻',
  'ID/Card': '🪪',
  'Clothing': '👕',
  'Accessories': '☂️',
  'Other': '📦'
};

const COLOR_MAP = {
  navy: '#1e3a8a',
  blue: '#2563eb',
  black: '#1f2937',
  grey: '#4b5563',
  gray: '#4b5563',
  brown: '#78350f',
  white: '#94a3b8',
  silver: '#64748b',
  red: '#dc2626',
  green: '#16a34a',
  pink: '#db2777',
  gold: '#d97706'
};

export function makeSvgThumb(category = 'Item', color = '', brand = '') {
  const normColor = (color || '').toLowerCase().trim();
  const hex = COLOR_MAP[normColor] || '#475569';
  const icon = CATEGORY_ICONS[category] || '📦';
  const title = [brand, category].filter(Boolean).join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220" viewBox="0 0 360 220">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${hex}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#383838" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect width="360" height="220" fill="url(#bg)"/>
    <circle cx="180" cy="85" r="46" fill="#383838" fill-opacity="0.65" stroke="#F6C56B" stroke-width="2"/>
    <text x="180" y="96" fill="#EDEDED" font-size="34" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-anchor="middle">${icon}</text>
    <text x="180" y="152" fill="#EDEDED" font-size="16" font-weight="600" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-anchor="middle">${escapeXml(title)}</text>
    <text x="180" y="176" fill="#B8B8B8" font-size="13" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-anchor="middle">${escapeXml(color ? `Color: ${color}` : '')}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe = '') {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

const RAW_DEMO_ITEMS = [
  { id: 'demo-1', category: 'Bottle', color: 'navy', brand: 'Hydro Flask', location: 'Library', found_at: '2026-11-10T14:30', description: 'Navy metal bottle, dented lid, cat sticker', verification_question: "What's written on the sticker?", verification_answer: 'meow' },
  { id: 'demo-2', category: 'Bottle', color: 'blue', brand: 'Milton', location: 'Cafeteria', found_at: '2026-11-11T09:00', description: 'Light blue plastic bottle, no stickers', verification_question: 'What brand logo is on it?', verification_answer: 'milton' },
  { id: 'demo-3', category: 'Bottle', color: 'black', brand: 'Cello', location: 'Sports Ground', found_at: '2026-11-09T18:00', description: 'Black sports bottle, white cap', verification_question: 'What color is the cap?', verification_answer: 'white' },
  { id: 'demo-4', category: 'Bag/Backpack', color: 'black', brand: 'Wildcraft', location: 'Academic Block', found_at: '2026-11-12T11:00', description: 'Black backpack, red keychain on zipper', verification_question: 'What color is the keychain?', verification_answer: 'red' },
  { id: 'demo-5', category: 'Bag/Backpack', color: 'blue', brand: 'Skybags', location: 'Library', found_at: '2026-11-08T16:00', description: 'Blue backpack with laptop sleeve', verification_question: 'What brand is it?', verification_answer: 'skybags' },
  { id: 'demo-6', category: 'Bag/Backpack', color: 'grey', brand: 'Nike', location: 'Sports Ground', found_at: '2026-11-13T07:30', description: 'Grey gym bag, shoe compartment', verification_question: 'Any brand name visible?', verification_answer: 'nike' },
  { id: 'demo-7', category: 'Wallet', color: 'brown', brand: '', location: 'Cafeteria', found_at: '2026-11-11T13:00', description: 'Brown leather wallet, worn edges', verification_question: 'How many card slots inside (approx)?', verification_answer: '6' },
  { id: 'demo-8', category: 'Wallet', color: 'black', brand: '', location: 'Parking', found_at: '2026-11-12T19:00', description: 'Black slim wallet', verification_question: 'Is it leather or fabric?', verification_answer: 'fabric' },
  { id: 'demo-9', category: 'Phone', color: 'black', brand: 'Samsung', location: 'Auditorium', found_at: '2026-11-10T17:00', description: 'Black phone with cracked corner protector', verification_question: 'What brand?', verification_answer: 'samsung' },
  { id: 'demo-10', category: 'Phone', color: 'white', brand: '', location: 'Lab', found_at: '2026-11-13T10:15', description: 'White phone, clear case with flower', verification_question: 'What is on the case?', verification_answer: 'flower' },
  { id: 'demo-11', category: 'Keys', color: 'silver', brand: '', location: 'Main Gate', found_at: '2026-11-09T08:00', description: 'Bunch of 3 keys with blue tag', verification_question: 'What color is the key tag?', verification_answer: 'blue' },
  { id: 'demo-12', category: 'Keys', color: 'silver', brand: '', location: 'Hostel', found_at: '2026-11-12T22:00', description: 'Single key with red keyring', verification_question: 'What color is the keyring?', verification_answer: 'red' },
  { id: 'demo-13', category: 'Laptop/Electronics', color: 'silver', brand: 'Dell', location: 'Library', found_at: '2026-11-11T20:00', description: 'Silver laptop charger, Dell tip', verification_question: 'Which brand charger?', verification_answer: 'dell' },
  { id: 'demo-14', category: 'Laptop/Electronics', color: 'white', brand: 'Apple', location: 'Cafeteria', found_at: '2026-11-13T12:00', description: 'White earbuds case, small scratch on top', verification_question: 'Any scratch location?', verification_answer: 'top' },
  { id: 'demo-15', category: 'ID/Card', color: 'blue', brand: '', location: 'Academic Block', found_at: '2026-11-10T10:00', description: 'Blue ID card holder with lanyard', verification_question: 'What color is the holder?', verification_answer: 'blue' },
  { id: 'demo-16', category: 'Clothing', color: 'red', brand: '', location: 'Sports Ground', found_at: '2026-11-08T18:30', description: 'Red hoodie, left on bench', verification_question: 'What type of clothing?', verification_answer: 'hoodie' },
  { id: 'demo-17', category: 'Clothing', color: 'green', brand: '', location: 'Hostel', found_at: '2026-11-12T07:00', description: 'Green cap', verification_question: 'What item is it?', verification_answer: 'cap' },
  { id: 'demo-18', category: 'Accessories', color: 'black', brand: '', location: 'Auditorium', found_at: '2026-11-11T16:00', description: 'Black umbrella, wooden handle', verification_question: 'What kind of handle?', verification_answer: 'wooden' },
  { id: 'demo-19', category: 'Accessories', color: 'pink', brand: '', location: 'Library', found_at: '2026-11-13T15:00', description: 'Pink scarf with white dots', verification_question: 'What pattern is on it?', verification_answer: 'dots' },
  { id: 'demo-20', category: 'Bottle', color: 'green', brand: '', location: 'Lab', found_at: '2026-11-09T11:00', description: 'Green transparent bottle, leaf sticker', verification_question: 'What sticker is on it?', verification_answer: 'leaf' }
];

export const INITIAL_DEMO_ITEMS = RAW_DEMO_ITEMS.map(it => ({
  ...it,
  image_path: makeSvgThumb(it.category, it.color, it.brand),
  status: 'open'
}));

export function simulateDemoSearch(queryText = '', filterCat = '', filterColor = '', filterLoc = '', filterTime = '', items = INITIAL_DEMO_ITEMS) {
  const q = queryText.toLowerCase();
  const qWords = q.split(/\W+/).filter(w => w.length > 2);

  const scored = items.map(it => {
    if (filterCat && it.category && it.category.toLowerCase() !== filterCat.toLowerCase()) {
      return null;
    }

    let matchCount = 0;
    const targetText = `${it.category} ${it.color} ${it.brand} ${it.description} ${it.location}`.toLowerCase();
    
    for (const w of qWords) {
      if (targetText.includes(w)) matchCount++;
    }

    let sim = 0.45;
    if (qWords.length > 0) {
      sim = Math.min(0.96, 0.45 + (matchCount / qWords.length) * 0.5);
    } else {
      sim = 0.70;
    }

    let attr = 0.5;
    if (filterColor) {
      if (it.color && it.color.toLowerCase().includes(filterColor.toLowerCase())) attr += 0.4;
      else attr -= 0.2;
    }
    if (filterCat && it.category && it.category.toLowerCase() === filterCat.toLowerCase()) {
      attr += 0.3;
    }
    attr = Math.max(0.1, Math.min(0.98, attr));

    let loc = 0.5;
    if (filterLoc) {
      loc = (it.location && it.location.toLowerCase() === filterLoc.toLowerCase()) ? 0.95 : 0.2;
    }

    let time = 0.75;
    if (filterTime && it.found_at) {
      const diffHrs = Math.abs(new Date(filterTime) - new Date(it.found_at)) / 36e5;
      time = Math.max(0.2, 1 - Math.min(diffHrs / 96, 0.8));
    }

    const total = 0.6 * sim + 0.2 * attr + 0.1 * time + 0.1 * loc;

    return {
      ...it,
      scores: {
        total: Math.round(total * 100) / 100,
        embedding: Math.round(sim * 100) / 100,
        attributes: Math.round(attr * 100) / 100,
        time: Math.round(time * 100) / 100,
        location: Math.round(loc * 100) / 100
      }
    };
  }).filter(Boolean);

  scored.sort((a, b) => b.scores.total - a.scores.total);
  return scored;
}

export function simulateDemoClaim(item, answer = '') {
  const normA = (answer || '').toLowerCase().trim();
  const expected = (item.verification_answer || '').toLowerCase().trim();
  if (normA && expected && normA === expected) {
    const code = 'LF-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    return {
      ok: true,
      message: 'Verification successful! Present this handoff code at the designated help desk.',
      handoff_code: code
    };
  }
  return {
    ok: false,
    message: 'Verification answer did not match finder\'s records. Please try again or visit help desk.'
  };
}
