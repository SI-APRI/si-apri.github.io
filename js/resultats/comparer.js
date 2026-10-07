/* Analyser les résultats · Comparer — port of explorateur.render_comparaison.
   Up to three profiles (one value or all in each register) drawn on branches that are
   dimensions, indicators or survey answers. All values are precomputed aggregates. */
import * as O from './commun_scores/outils.js';
import {creer} from './commun_scores/grille.js';
import {chargerCible, valeur} from './scores.js';

const DS = 'data/resultats/scores/', DC = 'data/resultats/comparer/';
const REGISTRES = [['section','ex_ax_section'],['sexe','ex_ax_sexe'],['age','ex_ax_age'],['richesse','ex_ax_richesse'],['paysage','ex_ax_paysage']];
const COULEURS = ['#1a6b52', '#c26a1a', '#3b6ea5'];

const etat0 = ()=>({cibles:[], qs:[{q:null, r:null}], ouvQ:false, profils:[{},{},{}], forme:'barres'});
let S = etat0();
let tour = 0;

export default async function render(el, apri){
 const moi = ++tour;
 O.init(apri);
 const [meta, qm] = await Promise.all([apri.donnees(DS+'meta.json'), apri.donnees(DC+'questions.json')]);
 if(moi!==tour) return;
 O.textes(meta.textes);
 const {T, esc, L} = O;
 const G = creer(meta);
 const lib = v => L(meta.valeurs[v]) || v;
 const nomInd = i => L(i.nom);
 const nomDim = c => L(meta.dims.find(d=>d.code===c).nom);
 const redessiner = ()=>render(el, apri);
 const inds = [...meta.inds].sort((a,b)=>a.dim.localeCompare(b.dim) || nomInd(a).localeCompare(nomInd(b), apri.lang));
 const opts = [...meta.dims.map(d=>['d:'+d.code, L(d.nom)]), ...inds.map(x=>['i:'+x.id, `${nomDim(x.dim)} · ${nomInd(x)}`])];
 const libOpt = c => (opts.find(o=>o[0]===c)||[c,c])[1];

 el.innerHTML = '';
 const racine = document.createElement('div'); racine.className='sc-racine'; el.append(racine);
 const tete = document.createElement('div'); tete.className='sc-tete';
 tete.innerHTML = `<button type="button" class="sc-lien">${esc(T('ex_b_raz'))}</button>`;
 tete.querySelector('button').onclick = ()=>{ S = etat0(); redessiner(); };
 racine.append(tete);

 // ---- 1. the branches
 racine.insertAdjacentHTML('beforeend', O.sec(T('ex_c_sur'), 'margin:0 0 2px'));
 const m = O.multi({libelle:T('ex_c_branches'), opts, valeurs:S.cibles, placeholder:T('ex_c_branches_ph'), trier:false,
  surChange:v=>{ S.cibles = v.slice(0,12); redessiner(); }});
 racine.append(m);
 const branches = S.cibles.map(c=>({lib:libOpt(c), cible:['s', c]}));

 const [pq, pqc] = O.pli(T('ex_c_ajouter_q'), S.ouvQ || S.qs.length>1 || S.qs.some(x=>x.q!=null), o=>S.ouvQ=o);
 racine.append(pq);
 const qopts = qm.questions.map(q=>[q.i, L(q.lib)]);
 S.qs.forEach((x,i)=>{
  const r = document.createElement('div'); r.className='sc-rangee sc-crit'; pqc.append(r);
  const c = O.chercheur({libelle:T('ex_c_q_n',{n:i+1}), opts:qopts, valeur:x.q, placeholder:T('ex_b_choisir_q'),
   surChange:v=>{ S.qs[i] = {q:v, r:null}; S.ouvQ = true; redessiner(); }});
  c.classList.add('large'); r.append(c);
  const q = qm.questions.find(z=>z.i===x.q);
  if(q) r.append(O.select({libelle:T('ex_reponse'), opts:q.mods.map(md=>[md.v, L(md)]), valeur:x.r, placeholder:T('ex_c_choisir_r'),
   surChange:v=>{ S.qs[i].r = v; S.ouvQ = true; redessiner(); }}));
  else r.append(apri.h(`<div class="sc-champ"><label class="libelle">${esc(T('ex_reponse'))}</label><select class="champ" disabled><option>${esc(T('ex_c_choisir_r'))}</option></select></div>`));
  const b = document.createElement('button'); b.type='button'; b.className='bouton sc-x'; b.textContent='✕'; b.title=T('ex_dim_oter');
  b.onclick = ()=>{ S.qs.splice(i,1); if(!S.qs.length) S.qs=[{q:null,r:null}]; S.ouvQ = true; redessiner(); };
  r.append(b);
  if(q && x.r!=null) branches.push({lib: L(q.mods.find(md=>md.v===x.r)), cible:['q', q, x.r]});
 });
 const plus = document.createElement('button'); plus.type='button'; plus.className='sc-plus'; plus.textContent='＋ '+T('ex_c_q_plus');
 plus.onclick = ()=>{ S.qs.push({q:null,r:null}); S.ouvQ = true; redessiner(); };
 pqc.append(plus);

 if(!branches.length){ racine.insertAdjacentHTML('beforeend', `<p class="sc-x-txt" style="margin-top:10px">${esc(T('ex_c_vide_s'))}</p>`); return; }

 // ---- 2. the profiles
 const profils = [];
 S.profils.forEach((p,i)=>{
  racine.insertAdjacentHTML('beforeend', O.sec(T('ex_c_profil',{n:i+1}), 'margin:14px 0 2px'));
  const r = document.createElement('div'); r.className='sc-rangee sc-profil'; racine.append(r);
  let mq = G.tout(); const nom = [];
  for(const [a, cle] of REGISTRES){
   r.append(O.select({libelle:T(cle), opts:[[null, T('ex_p_tous')], ...meta.registres[a].map(v=>[v, lib(v)])], valeur:p[a]??null,
    surChange:v=>{ S.profils[i][a] = v; redessiner(); }}));
   if(p[a]){ mq = G.et(mq, a, p[a]); nom.push(lib(p[a])); }
  }
  // the profile index of comparer/q files: (((sec*3+pay)*3+sx)*5+age)*4+wealth
  const pidx = mq ? (((mq.sec*3+mq.pay)*3+mq.sx)*5 + (p.age ? meta.grille.ages.indexOf(p.age)+1 : 0))*4 + (p.richesse ? meta.grille.rich.indexOf(p.richesse)+1 : 0) : -1;
  profils.push({nom: nom.length ? nom.join(' · ') : T('ex_tout_ech'), m: mq, pidx, coul: COULEURS[i]});
 });
 const actifs = profils.filter(p=>G.nMenages(p.m)!==0);

 // ---- 3. values
 const zr = document.createElement('div'); racine.append(zr);
 zr.innerHTML = `<div class="chargement">${esc(apri.t('Chargement…','Loading…'))}</div>`;
 const fic = {};
 await Promise.all(branches.map(async b=>{
  if(b.cible[0]==='s') fic[b.cible[1]] = await chargerCible(apri, b.cible[1]);
  else fic['q'+b.cible[1].i] = await apri.donnees(DC+'q/'+b.cible[1].i+'.json');
 }));
 if(moi!==tour) return;
 zr.innerHTML = '';
 const posQ = {};
 const valQ = (q, mod, p)=>{
  const d = fic['q'+q.i];
  if(!posQ[q.i]){ const ps = new Int32Array(d.n.length).fill(-1); let k=0; d.n.forEach((v,i)=>{ if(v>=5) ps[i]=k++; }); posQ[q.i] = ps; }
  const nb = d.n[p.pidx];
  if(nb<5) return {n:nb, k:null, v:null};
  const k = d.k[q.mods.findIndex(md=>md.v===mod)][posQ[q.i][p.pidx]];
  return {n:nb, k, v:100*k/nb};
 };
 const lignes = []; let pct = false;
 for(const b of branches){
  for(const p of actifs){
   let x;
   if(b.cible[0]==='q'){ const r = valQ(b.cible[1], b.cible[2], p); x = {n:r.n, k:r.k, part:r.v, pct:true}; pct = true; }
   else { const r = valeur(G, meta, fic[b.cible[1]], b.cible[1], p.m); x = {n:r.n, k:null, part:r.sc, pct:false}; }
   if(x.n===0) continue;
   lignes.push({nom:p.nom, axe:b.lib, n:x.n, k:x.k, part:x.part, score:x.part, pct:x.pct, supp:x.n===-1});
  }
 }

 // ---- 4. the drawing
 const formes = ['barres', ...(branches.length>=3 ? ['radar'] : [])];
 if(!formes.includes(S.forme)) S.forme = 'barres';
 const rh = document.createElement('div'); rh.className='sc-rangee sc-res'; zr.append(rh);
 rh.insertAdjacentHTML('beforeend', O.sec(T('ex_res'), 'flex:1 1 160px;margin-top:22px'));
 rh.append(O.select({libelle:T('ex_format'), opts:formes.map(x=>[x, T('ex_'+x)]), valeur:S.forme, surChange:v=>{ S.forme=v; redessiner(); }}));
 if(branches.length<3) zr.insertAdjacentHTML('beforeend', O.note(T('ex_c_radar_3'), 'margin:2px 0 6px'));
 if(!lignes.length){ zr.insertAdjacentHTML('beforeend', O.info(T('ex_s_rien'))); return; }
 const dessin = document.createElement('div'); dessin.className='sc-dessin'; zr.append(dessin);
 if(S.forme==='radar'){
  const axes = branches.map(b=>b.lib);
  const series = actifs.map(p=>[p.nom, axes.map(a=>{ const l = lignes.find(x=>x.axe===a && x.nom===p.nom); return !l || l.part==null ? null : (l.pct ? l.part/10 : l.part); }), p.coul]);
  dessin.innerHTML = `<div style="max-width:860px;margin:6px auto 0">${O.radar(axes, series, 470)}</div>`;
  zr.insertAdjacentHTML('beforeend', O.legendeRadar(series));
  if(pct) zr.insertAdjacentHTML('beforeend', O.note(T('ex_c_radar_pct'), 'margin:6px 0 0'));
 } else {
  const h = [];
  for(const estPct of [false, true]){
   const bloc = lignes.filter(l=>l.pct===estPct);
   if(bloc.length) h.push(O.barres(bloc, null, estPct ? 'part' : 'score', {fragile:meta.n_fragile, large:el.clientWidth}));
  }
  dessin.innerHTML = h.join('');
 }
 zr.append(O.exports(dessin, 'apri-comparer'));
}
