/* Port of recherche_questions.classer (Streamlit): rank survey questions by
   closeness to what the reader typed. Same steps, same constants:
   accent-free roots of 5 letters, a small dictionary of related notions
   (fr, en, es, ht), inverse document frequency, and character trigrams for
   typos. */

let GROUPES = null;

function norm(t){
 t = String(t ?? '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
 return t.replace(/[^a-z0-9 ]+/g, ' ');
}
function racines(t){
 return norm(t).split(/\s+/).filter(m => m.length >= 3).map(m => m.slice(0, 5));
}
function compter(liste){
 const c = new Map();
 for(const x of liste) c.set(x, (c.get(x) || 0) + 1);
 return c;
}
function etendre(rac, notions){
 if(!GROUPES) GROUPES = notions.map(g => new Set(racines(g)));
 const out = compter(rac);
 for(const r of new Set(rac)){
  for(const g of GROUPES){
   if(g.has(r)) for(const v of g) out.set(v, (out.get(v) || 0) + 0.45);
  }
 }
 return out;
}
function trigrammes(t){
 t = ' ' + norm(t) + ' ';
 const c = new Map();
 for(let i = 0; i < t.length - 2; i++){ const k = t.slice(i, i + 3); c.set(k, (c.get(k) || 0) + 1); }
 return c;
}
function normeDe(a){ let s = 0; for(const v of a.values()) s += v * v; return Math.sqrt(s); }
function cos(a, b, nb){
 if(!a.size || !b.size) return 0;
 let num = 0;
 for(const [k, v] of a){ const w = b.get(k); if(w) num += v * w; }
 return num / (normeDe(a) * (nb ?? normeDe(b)));
}

const prepares = new WeakMap();
/** documents: Map(id -> text). Returns [[id, score], ...] best first, at most n. */
export function classer(documents, requete, notions, n = 10){
 if(!requete || !requete.trim()) return [];
 const qMots = etendre(racines(requete), notions);
 const qTri = trigrammes(requete);
 let prep = prepares.get(documents);
 if(!prep){
  const docs = new Map();
  for(const [k, v] of documents) docs.set(k, compter(racines(v)));
  const nd = docs.size || 1;
  const df = new Map();
  for(const c of docs.values()) for(const w of c.keys()) df.set(w, (df.get(w) || 0) + 1);
  const idf = new Map();
  for(const [w, f] of df) idf.set(w, Math.log(1 + nd / (1 + f)));
  const tri = new Map();
  for(const [k, v] of documents){ const t = trigrammes(v); tri.set(k, [t, normeDe(t)]); }
  prep = {docs, idf, tri};
  prepares.set(documents, prep);
 }
 const res = [];
 for(const [k, c] of prep.docs){
  let mots = 0;
  for(const [w, q] of qMots) if(c.has(w)) mots += Math.min(q, 1) * (prep.idf.get(w) || 0);
  const [t, nt] = prep.tri.get(k);
  const score = mots + 1.5 * cos(qTri, t, nt);
  if(score > 0.35) res.push([k, score]);
 }
 res.sort((a, b) => b[1] - a[1]);
 return res.slice(0, n);
}
