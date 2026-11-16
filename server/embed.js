import { pipeline, RawImage } from '@xenova/transformers';

let extractor = null;
let tokenizer = null;
let textModel = null;
let visionModel = null;
// Use CLIP via image-feature-extraction and zero-shot? easier: use `pipeline('image-feature-extraction','Xenova/clip-vit-base-patch32')` and `pipeline('feature-extraction','Xenova/clip-vit-base-patch32')` if available. 
// Simpler: use AutoProcessor/AutoTokenizer/CLIPModel not directly exposed same way; but xenova provides clip-vit-base-patch32 for both.
async function getImageExtractor() {
  if (!extractor) extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  return extractor;
}
async function getTextExtractor() {
  if (!textModel) textModel = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
  return textModel;
}

function l2norm(vec) {
  let s = 0; for (const v of vec) s += v*v; s = Math.sqrt(s)||1; return vec.map(v=>v/s);
}

export async function embedImage(input) {
  // input can be file path or URL
  const ex = await getImageExtractor();
  const out = await ex(input, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}
export async function embedText(text) {
  const ex = await getTextExtractor();
  const out = await ex(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}
export function cosine(a,b){
  let s=0; for(let i=0;i<a.length;i++) s+=a[i]*b[i]; return s;
}
