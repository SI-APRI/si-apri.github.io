/* The grid of population masks precomputed by outils/export_resultats_scores.py.
   A mask is {sec, pay, sx, ab, rb}: section index (0 = all, 1..10), landscape (0 = all,
   1 Littoral, 2 Montagne), sex (0 = all, 1 Homme, 2 Femme), age bitmask (1..15, 15 = all),
   wealth bitmask (1..7, 7 = all). null means the empty group. */

export const VIDE = null;

export function creer(meta){
 const g = meta.grille, nm = meta.n_masque;
 const pos = new Int32Array(nm.length).fill(-1);
 let k = 0; nm.forEach((v,i)=>{ if(v>=meta.seuil) pos[i] = k++; });
 const secs = g.secs.slice(1), pays = g.pays.slice(1), sexes = g.sexes.slice(1);
 const idx = m => ((((m.sec*3+m.pay)*3+m.sx)*15+(m.ab-1))*7)+(m.rb-1);
 const tout = ()=>({sec:0, pay:0, sx:0, ab:15, rb:7});

 /** the mask of the population filters: {section: value|null, paysage:[], sexe:[], age:[], richesse:[]} */
 function filtre(F){
  const m = tout();
  if(F.section) m.sec = secs.indexOf(F.section)+1;
  if(F.paysage && F.paysage.length===1) m.pay = pays.indexOf(F.paysage[0])+1;
  if(F.sexe && F.sexe.length===1) m.sx = sexes.indexOf(F.sexe[0])+1;
  if(F.age && F.age.length) m.ab = F.age.reduce((b,v)=>b|(1<<g.ages.indexOf(v)),0);
  if(F.richesse && F.richesse.length) m.rb = F.richesse.reduce((b,v)=>b|(1<<g.rich.indexOf(v)),0);
  return m;
 }
 /** intersect a mask with one category of a register; null if empty */
 function et(m, axe, v){
  if(!m) return null;
  m = {...m};
  if(axe==='section'){ const i = secs.indexOf(v)+1; if(m.sec && m.sec!==i) return null; m.sec = i; }
  else if(axe==='paysage'){ const i = pays.indexOf(v)+1; if(m.pay && m.pay!==i) return null; m.pay = i; }
  else if(axe==='sexe'){ const i = sexes.indexOf(v)+1; if(m.sx && m.sx!==i) return null; m.sx = i; }
  else if(axe==='age'){ const b = 1<<g.ages.indexOf(v); if(!(m.ab & b)) return null; m.ab = b; }
  else if(axe==='richesse'){ const b = 1<<g.rich.indexOf(v); if(!(m.rb & b)) return null; m.rb = b; }
  return m;
 }
 /** households in the mask: 0 empty, -1 one to four, else the count */
 const nMenages = m => m ? nm[idx(m)] : 0;
 /** position in the compact target arrays, -1 if suppressed or empty */
 const position = m => m ? pos[idx(m)] : -1;
 return {tout, filtre, et, nMenages, position, idx};
}
