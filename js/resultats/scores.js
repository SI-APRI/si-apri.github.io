/* Analyser les résultats · Scores de résilience — port of explorateur.render_scores.
   Every score is looked up in the precomputed grid (outils/export_resultats_scores.py). */
import * as O from './commun_scores/outils.js';
import {creer} from './commun_scores/grille.js';

const D = 'data/resultats/scores/';
const REGISTRES = [['section','ex_ax_section'],['sexe','ex_ax_sexe'],['age','ex_ax_age'],['richesse','ex_ax_richesse'],['paysage','ex_ax_paysage']];
const FILTRES = [['section','ex_f_section'],['sexe','ex_ax_sexe'],['age','ex_ax_age'],['richesse','ex_ax_richesse'],['paysage','ex_f_paysage']];

const etat0 = ()=>({dim:null, ind:null, dims:[{axe:'section', cats:null}], F:{section:null, sexe:[], age:[], richesse:[], paysage:[]},
 cmp:{}, mode:'actuel', forme:'barres', k:5, kEc:5, ouvF:false, ouvC:false});
let S = etat0();
let tour = 0;

export async function chargerCible(apri, code){
 return apri.donnees(D+'cibles/'+(code.startsWith('d:') ? 'd_'+code.slice(2) : 'i_'+code.slice(2))+'.json');
}
/** {n, sc, raw} of a target on a mask (_score_cible + _valeur_brute) */
export function valeur(G, meta, fichier, code, m){
 const nm = G.nMenages(m), p = G.position(m);
 if(code.startsWith('d:')) return {n:nm, sc: p>=0 ? fichier.s[p] : null, raw:null};
 if(p<0) return {n: nm===0 ? 0 : -1, sc:null, raw:null};
 const nb = fichier.n[p];
 if(nb<5) return {n:nb, sc:null, raw:null};
 const ind = meta.inds[+code.slice(2)], v = fichier.r[p];
 return {n:nb, sc:fichier.s[p], raw: v==null ? '—' : O.f(v, ind.dec)+(ind.unite ? ' '+ind.unite : '')};
}

export default async function render(el, apri){
 const moi = ++tour;
 O.init(apri);
 const [meta, carteTpl] = await Promise.all([apri.donnees(D+'meta.json'), apri.donnees(D+'carte.json')]);
 if(moi!==tour) return;
 O.textes(meta.textes);
 const {T, esc, L} = O;
 const G = creer(meta);
 const lib = v => L(meta.valeurs[v]) || v;
 const nomInd = i => L(i.nom);
 const nomDim = c => L(meta.dims.find(d=>d.code===c).nom);
 const inds = [...meta.inds].sort((a,b)=>a.dim.localeCompare(b.dim) || nomInd(a).localeCompare(nomInd(b), apri.lang));
 const redessiner = ()=>render(el, apri);

 el.innerHTML = '';
 const racine = document.createElement('div'); racine.className = 'sc-racine'; el.append(racine);

 // ---- reset
 const tete = document.createElement('div'); tete.className='sc-tete';
 tete.innerHTML = `<button type="button" class="sc-lien">${esc(T('ex_b_raz'))}</button>`;
 tete.querySelector('button').onclick = ()=>{ const {dim, ind} = S; S = etat0(); S.dim = dim; S.ind = ind; redessiner(); };
 racine.append(tete);

 // ---- what is measured
 const zq = document.createElement('div'); zq.className='sc-rangee sc-q'; racine.append(zq);
 zq.append(O.select({libelle:T('ex_s_dim'), opts:[[null, T('ex_s_toutes')], ...meta.dims.map(d=>[d.code, L(d.nom)])], valeur:S.dim,
  surChange:v=>{ S.dim=v; S.ind=null; redessiner(); }}));
 const visibles = inds.filter(x=>S.dim==null || x.dim===S.dim);
 zq.append(O.select({libelle:T('ex_s_ind'), cls:'large',
  opts:[[null, T(S.dim ? 'ex_s_tous_i' : 'ex_s_tous_i0')], ...visibles.map(x=>[x.id, S.dim ? nomInd(x) : `${nomDim(x.dim)} · ${nomInd(x)}`])],
  valeur:S.ind, surChange:v=>{ S.ind=v; redessiner(); }}));

 // ---- projection (breakdown criteria)
 racine.append(zoneProjection());
 function zoneProjection(){
  const z = document.createElement('div'); z.className='sc-proj';
  const dispo = REGISTRES.map(r=>r[0]);
  S.dims.forEach((d,i)=>{
   const r = document.createElement('div'); r.className='sc-rangee sc-crit';
   const libres = dispo.filter(a=>a===d.axe || !S.dims.some(x=>x.axe===a));
   r.append(O.select({libelle:T('ex_dim_n',{n:i+1}), opts:libres.map(a=>[a, T(REGISTRES.find(x=>x[0]===a)[1])]), valeur:d.axe,
    surChange:v=>{ S.dims[i] = {axe:v, cats:null}; redessiner(); }}));
   const vals = meta.registres[d.axe];
   const m = O.multi({libelle:T('ex_dim_cat'), opts:vals.map(v=>[v, lib(v)]), valeurs: d.cats==null ? vals : d.cats,
    placeholder:T('ex_dim_toutes'), surChange:v=>{ d.cats = v; redessiner(); }});
   m.classList.add('large'); r.append(m);
   const x = document.createElement('button'); x.type='button'; x.className='bouton sc-x'; x.textContent='✕'; x.title=T('ex_dim_oter');
   x.onclick = ()=>{ S.dims.splice(i,1); redessiner(); };
   r.append(x);
   z.append(r);
  });
  if(!S.dims.length) z.insertAdjacentHTML('beforeend', `<p class="sc-x-txt"><b>${esc(T('ex_tout_ech'))}</b> · ${esc(T('ex_tout_x'))}</p>`);
  if(S.dims.length < dispo.length){
   const b = document.createElement('button'); b.type='button'; b.className='sc-plus'; b.textContent = '＋ '+T('ex_dim_plus');
   b.onclick = ()=>{ S.dims.push({axe: dispo.find(a=>!S.dims.some(x=>x.axe===a)), cats:null}); redessiner(); };
   z.append(b);
  }
  return z;
 }
 const choisies = S.dims.map(d=>[d.axe, (d.cats && d.cats.length) ? d.cats : meta.registres[d.axe]]);

 // ---- target
 let ind = null, cible, libCible;
 if(S.ind!=null){ ind = meta.inds[S.ind]; cible = 'i:'+ind.id; libCible = nomInd(ind); }
 else if(S.dim!=null){
  const dm = meta.dims.find(d=>d.code===S.dim);
  if(!dm.n_ind){ racine.insertAdjacentHTML('beforeend', carteVide(S.dim)); return; }
  cible = 'd:'+S.dim; libCible = nomDim(S.dim);
 } else {
  racine.insertAdjacentHTML('beforeend', `<p class="sc-x-txt" style="margin-top:10px">${esc(T('ex_s_vide_choix'))}</p>`);
  return;
 }

 // ---- population filters (folded)
 const nAct = (S.F.section?1:0) + ['sexe','age','richesse','paysage'].reduce((s,a)=>s+S.F[a].length,0);
 const [pf, pfc] = O.pli(T('ex_b_pop') + (nAct ? ' · '+T('ex_b_pop_n',{n:nAct}) : ''), S.ouvF || nAct, o=>S.ouvF=o);
 racine.append(pf);
 if(nAct){
  const b = document.createElement('button'); b.type='button'; b.className='sc-lien'; b.textContent = T('ex_raz');
  b.onclick = ()=>{ S.F = etat0().F; redessiner(); }; pfc.append(b);
 }
 const rf = document.createElement('div'); rf.className='sc-rangee sc-filtres'; pfc.append(rf);
 for(const [a, cle] of FILTRES){
  const opts = meta.registres[a].map(v=>[v, lib(v)]);
  if(a==='section') rf.append(O.select({libelle:T(cle), opts:[[null, T('ex_f_tous')], ...opts], valeur:S.F.section, surChange:v=>{ S.F.section=v; S.ouvF=true; redessiner(); }}));
  else rf.append(O.multi({libelle:T(cle), opts, valeurs:S.F[a], placeholder:T('ex_f_tous'), surChange:v=>{ S.F[a]=v; S.ouvF=true; redessiner(); }}));
 }
 pfc.insertAdjacentHTML('beforeend', O.note(apri.t(T('ex_filtres_x')+' Version statique : une section communale à la fois.',
  T('ex_filtres_x')+' Static version: one communal section at a time.')));

 // ---- compare several indicators (folded)
 const cleCmp = String(S.dim);
 const cmp = S.cmp[cleCmp] || [];
 const [pc, pcc] = O.pli(T('ex_s_comp'), S.ouvC || cmp.length, o=>S.ouvC=o);
 racine.append(pc);
 const mc = O.multi({libelle:null, opts:visibles.map(x=>[x.id, nomInd(x)]), valeurs:cmp, placeholder:T('ex_s_comp'),
  surChange:v=>{ S.cmp[cleCmp] = v.slice(0,8); S.ouvC=true; redessiner(); }});
 pcc.append(mc);

 const filtre = G.filtre(S.F);
 const nF = G.nMenages(filtre);
 if(nF===0){ racine.insertAdjacentHTML('beforeend', O.info(T('ex_s_vide'))); return; }

 // ---- results header: mode and drawing
 const formes = ['barres'];
 if(choisies.length===1 && choisies[0][0]==='section') formes.push('carte');
 formes.push('radar','tableau');
 if(!formes.includes(S.forme)) S.forme = 'barres';
 const rh = document.createElement('div'); rh.className='sc-rangee sc-res'; racine.append(rh);
 rh.insertAdjacentHTML('beforeend', O.sec(T('ex_res'), 'flex:1 1 160px;margin-top:22px'));
 rh.append(O.select({libelle:T('ex_s_mode'), opts:['actuel','bas','haut','ecarts'].map(m=>[m, T('ex_s_m_'+m)]), valeur:S.mode, surChange:v=>{ S.mode=v; redessiner(); }}));
 rh.append(O.select({libelle:T('ex_format'), opts:formes.map(x=>[x, T('ex_'+x)]), valeur:S.forme, surChange:v=>{ S.forme=v; redessiner(); }}));
 if(!formes.includes('carte')) racine.insertAdjacentHTML('beforeend', O.note(T('ex_pourquoi_carte'), 'margin:2px 0 6px'));

 const zr = document.createElement('div'); zr.className='sc-resultat'; racine.append(zr);
 zr.innerHTML = `<div class="chargement">${esc(apri.t('Chargement…','Loading…'))}</div>`;

 // the files needed by this view
 const besoin = new Set([cible]);
 const compares = cmp.map(i=>meta.inds[i]);
 if(compares.length) compares.forEach(x=>besoin.add('i:'+x.id));
 else if(!choisies.length && (S.mode==='bas'||S.mode==='haut')) visibles.forEach(x=>besoin.add('i:'+x.id));
 const fic = {};
 await Promise.all([...besoin].map(async c=>{ fic[c] = await chargerCible(apri, c); }));
 if(moi!==tour) return;
 zr.innerHTML = '';
 const val = (c, m) => valeur(G, meta, fic[c], c, m);
 const pose = nAct > 0;
 const noteN = (style)=> pose ? O.note(nF<0 ? `n < 5 / ${O.n(meta.n)}` : T('ex_s_n',{n:O.n(nF), t:O.n(meta.n)}), style) : '';

 // ---- gaps between groups
 if(S.mode==='ecarts'){
  zr.insertAdjacentHTML('beforeend', O.note(T('ex_s_ec_x'), 'margin:2px 0 6px'));
  const r = document.createElement('div'); r.className='sc-rangee'; zr.append(r);
  r.append(O.select({libelle:T('ex_s_combien'), opts:[5,10,20].map(k=>[k,String(k)]), valeur:S.kEc, surChange:v=>{ S.kEc=v; redessiner(); }}));
  const paires = [];
  for(const [a, labk] of REGISTRES){
   const sc = [];
   for(const v of meta.registres[a]){
    const x = val(cible, G.et(filtre, a, v));
    if(x.n>0 && x.sc!=null) sc.push([lib(v), x.sc, x.n]);
   }
   for(let i=0;i<sc.length;i++) for(let j=i+1;j<sc.length;j++){
    let [la,sa,na] = sc[i], [lb,sb,nb] = sc[j];
    if(sb<sa) [la,sa,na,lb,sb,nb] = [lb,sb,nb,la,sa,na];
    paires.push({registre:T(labk), a:la, b:lb, sa, sb, d:sa-sb, na, nb});
   }
  }
  paires.sort((x,y)=>x.d-y.d);
  if(!paires.length){ zr.insertAdjacentHTML('beforeend', O.info(T('ex_s_ec_rien'))); return; }
  zr.insertAdjacentHTML('beforeend', `<div class="sc-defile"><table class="tableau sc-tab"><thead><tr><th>${esc(T('ex_s_ec_col'))}</th><th>${esc(T('ex_s_ec_reg'))}</th><th class="num">${esc(T('ex_score'))}</th><th class="num">${esc(T('ex_col_n'))}</th><th class="num">${esc(T('ex_s_ecart'))}</th></tr></thead><tbody>`+
   paires.slice(0,S.kEc).map(x=>`<tr${Math.min(x.na,x.nb)<meta.n_fragile?' class="sc-pale"':''}><td><b>${esc(x.a)}</b> <span class="sc-gris">${esc(T('ex_s_ec_vs'))}</span> ${esc(x.b)}</td><td class="sc-gris">${esc(x.registre)}</td><td class="num"><b>${O.f(x.sa,2)}</b> <span class="sc-gris2">/ ${O.f(x.sb,2)}</span></td><td class="num sc-gris">${x.na} / ${x.nb}</td><td class="num sc-v" style="color:${O.COUL.ROUGE}">${O.f(x.d,2)}</td></tr>`).join('')+
   '</tbody></table></div>');
  return;
 }

 const sel = val(cible, filtre);
 const ligneInd = x=>{ const v = val('i:'+x.id, filtre); return {nom:nomInd(x), cle:x.dim, axe:nomDim(x.dim), n:v.n, part:v.sc, score:v.sc, raw:v.raw, supp:v.n===-1}; };
 let titre, lignes;
 if(compares.length){
  titre = T('ex_s_comp_t');
  lignes = compares.map(ligneInd).filter(l=>l.n && (l.score!=null || l.supp));
 } else if(choisies.length){
  titre = S.mode==='bas' ? T('ex_s_bas_a') : S.mode==='haut' ? T('ex_s_haut_a') : libCible;
  const axeLib = choisies.length===1 ? T(REGISTRES.find(r=>r[0]===choisies[0][0])[1]) : T('ex_croise');
  lignes = [];
  const rec = (k, m, noms, cles)=>{
   if(k===choisies.length){
    if(!m) return;
    const v = val(cible, m);
    if(v.n!==0) lignes.push({nom:noms.join(' · '), cle:cles.join('|'), axe:axeLib, n:v.n, part:v.sc, score:v.sc, raw:v.raw, supp:v.n===-1});
    return;
   }
   const [a, gardees] = choisies[k];
   for(const v of meta.registres[a]) if(gardees.includes(v)) rec(k+1, G.et(m, a, v), [...noms, lib(v)], [...cles, v]);
  };
  rec(0, filtre, [], []);
 } else if(S.mode==='bas' || S.mode==='haut'){
  titre = T(S.mode==='bas' ? 'ex_s_bas_i' : 'ex_s_haut_i');
  lignes = visibles.map(ligneInd).filter(l=>l.n>0 && l.score!=null);
 } else {
  if(ind){
   zr.insertAdjacentHTML('beforeend', `<p class="sc-gros"><strong>${sel.sc==null ? '—' : O.f(sel.sc,2)+' / 10'}</strong>${O.brutInline(sel.raw)}</p>`);
  }
  if(sel.sc==null) zr.insertAdjacentHTML('beforeend', O.info(sel.n===-1 ? apri.t('Moins de 5 ménages : valeur masquée.','Fewer than 5 households: value hidden.') : T('ex_s_rien')));
  zr.insertAdjacentHTML('beforeend', noteN('margin:8px 0 0'));
  return;
 }
 if(!lignes.length){ zr.insertAdjacentHTML('beforeend', O.info(T('ex_s_rien'))); return; }

 if(S.mode==='bas' || S.mode==='haut'){
  const r = document.createElement('div'); r.className='sc-rangee'; zr.append(r);
  r.append(O.select({libelle:T('ex_s_combien'), opts:[5,10,20].map(k=>[k,String(k)]), valeur:S.k, surChange:v=>{ S.k=v; redessiner(); }}));
  lignes = lignes.filter(l=>l.score!=null).sort((a,b)=> S.mode==='haut' ? b.score-a.score : a.score-b.score).slice(0,S.k);
 }
 zr.insertAdjacentHTML('beforeend', `<div class="sc-titre">${esc(titre)}</div>`);
 const ens = {n:sel.n, part:sel.sc, score:sel.sc, supp:sel.n===-1};
 let forme = S.forme;
 const mesurees = lignes.filter(l=>l.score!=null);
 if(forme==='radar' && mesurees.length<3){ zr.insertAdjacentHTML('beforeend', O.info(T('ex_radar_court'))); forme='barres'; }
 const dessin = document.createElement('div'); dessin.className='sc-dessin'; zr.append(dessin);
 if(forme==='carte'){
  const vals = {}, bases = {};
  lignes.forEach(l=>{ if(l.score!=null){ vals[l.cle]=l.score; bases[l.cle]=l.n; } });
  const c = O.carte(carteTpl, meta.registres.section, vals, bases, '');
  if(!c){ zr.insertBefore(apri.h(O.info(T('ex_s_carte_sec'))), dessin); forme='barres'; }
  else dessin.append(c);
 }
 if(forme==='radar') dessin.innerHTML = `<div style="max-width:760px;margin:6px auto 0">${O.radar(mesurees.map(l=>l.nom), [[libCible, mesurees.map(l=>l.score), O.COUL.VERT_APRI]], 430)}</div>`;
 else if(forme==='tableau') dessin.innerHTML = O.tableau(lignes, ens, 'score');
 else if(forme==='barres') dessin.innerHTML = O.barres(lignes, ens, 'score', {large: el.clientWidth});
 if(forme!=='tableau') zr.append(O.exports(dessin, 'apri-scores'));
 if(forme==='radar' || forme==='carte')
  zr.insertAdjacentHTML('beforeend', '<div class="sc-liste-v">'+mesurees.map(l=>`<span>${esc(l.nom)} · <strong>${O.f(l.score,2)} / 10</strong>${O.brutInline(l.raw)}</span>`).join('')+'</div>');
 zr.insertAdjacentHTML('beforeend', O.synthese(lignes, 'score'));
 zr.insertAdjacentHTML('beforeend', noteTerritoriale(S.dim, ind) + noteCouverture(S.dim, ind));
 zr.insertAdjacentHTML('beforeend', noteN('margin:6px 0 0'));

 function noteTerritoriale(dim, ind){
  if(ind) return ind.terr ? O.note(T('ex_s_terr_un'), 'margin:8px 0 0') : '';
  const d = meta.dims.find(x=>x.code===dim);
  if(!d || !d.n_terr) return '';
  return O.note(T('ex_s_terr',{k:d.n_terr, n:d.n_ind, p:O.f(d.part_terr,0)}), 'margin:8px 0 0');
 }
 function noteCouverture(dim, ind){
  if(ind || dim==null) return '';
  const d = meta.dims.find(x=>x.code===dim);
  if(!d || d.couv==null || !d.n_ind || d.couv>=55) return '';
  return O.note(T('ex_s_couv',{k:d.n_ind, n:d.n_ref, p:O.f(d.couv,0)}), 'margin:8px 0 0');
 }
 function carteVide(dim){
  return `<div class="sc-vide-dim"><div class="t">${esc(T('ex_s_dim_vide_t'))}</div><p>${esc(T('ex_s_dim_vide'))}</p>`+
   (dim==='dim3' ? `<p>${esc(T('ex_s_dim_vide_env'))}</p>` : '')+'</div>';
 }
}
