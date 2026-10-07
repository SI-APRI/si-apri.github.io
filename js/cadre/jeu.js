/* "Le cadre en bref": the resilience framework presented in five interactive steps.
   1 the three capacities, 2 what each dimension weighs, 3 where the data come from,
   4 from a raw value to a 0-10 score, 5 how indicators make a dimension score.
   Everything comes from cadre.json, except the situations of step 1, written as
   teaching examples from the framework's definitions. */
import {css, donnees, teinte, encre, fmt} from './commun.js';

const DIM_COUL = {dim1:'#4f7ea8', dim2:'#7a5ea8', dim3:'#2f7a5b', dim4:'#c98a1b', dim5:'#c0603f', dim6:'#3f9a9a', dim7:'#9a5a7a'};
const ATTR = [
 {id:'a1', fr:'Anticiper', en:'Anticipate', c:'#397fa3'},
 {id:'a2', fr:'Absorber', en:'Absorb', c:'#c98a1b'},
 {id:'a3', fr:"S'adapter", en:'Adapt', c:'#2f7a5b'},
];
const SITUATIONS = [
 {a:'a1', fr:"Le comité local diffuse l'alerte cyclone deux jours avant l'arrivée de la tempête.", en:'The local committee spreads the hurricane warning two days before the storm arrives.'},
 {a:'a1', fr:"Chaque famille connaît son plan d'évacuation et sait où se trouve l'abri le plus proche.", en:'Every family knows its evacuation plan and where the nearest shelter is.'},
 {a:'a1', fr:"Les agriculteurs suivent le bulletin des pluies et retardent les semis quand la sécheresse s'annonce.", en:'Farmers follow the rainfall bulletin and delay sowing when a drought is forecast.'},
 {a:'a2', fr:"Après une récolte perdue, la famille vit sur son stock de grains et sur l'argent envoyé par un proche.", en:'After a lost harvest, the family lives on its grain stock and on money sent by a relative.'},
 {a:'a2', fr:"La maison, solidement construite, reste debout pendant l'ouragan.", en:'The well built house stays standing during the hurricane.'},
 {a:'a2', fr:"Le lendemain du choc, les voisins s'entraident pour dégager la route et soigner les blessés.", en:'The day after the shock, neighbours help each other clear the road and care for the injured.'},
 {a:'a3', fr:"Après trois sécheresses, la coopérative remplace le maïs par des cultures qui supportent le manque d'eau.", en:'After three droughts, the cooperative replaces maize with crops that tolerate water shortage.'},
 {a:'a3', fr:"La commune replante la mangrove et interdit de reconstruire dans la zone inondable.", en:'The municipality replants the mangrove and bans rebuilding in the flood zone.'},
 {a:'a3', fr:"Les pêcheurs ferment ensemble les zones de frai et développent l'apiculture pour diversifier leurs revenus.", en:'Fishers jointly close spawning grounds and take up beekeeping to diversify their income.'},
];
// the four data sources of the framework (texts cad_so1..4 in cadre.json)
const SOURCES = [
 {id:'menage', k:'cad_so1', c:'#397fa3', ic:'🏠'},
 {id:'geo', k:'cad_so2', c:'#2f7a5b', ic:'🛰'},
 {id:'bio', k:'cad_so3', c:'#7a5ea8', ic:'🦋'},
 {id:'inst', k:'cad_so4', c:'#c98a1b', ic:'🏛'},
];
const BIO = /richesse sp|shannon|simpson|phylog|abondance relative|diversit[ée] fonctionnelle/i;
const ETAPES = [
 {fr:'Trois capacités', en:'Three capacities'},
 {fr:'Sept dimensions', en:'Seven dimensions'},
 {fr:'Avec quelles données ?', en:'With what data?'},
 {fr:'De la mesure au score', en:'From measure to score'},
 {fr:'Le score de la dimension', en:'The dimension score'},
];
const N_ET = ETAPES.length;

let J = null;   // state kept for the visit (language changes, tab switches)
const melanger = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

/* published scales: text bands -> numeric intervals */
function nombre(s){ return parseFloat(s.replace(/[   ]/g,'').replace(',', '.')); }
function intervalles(bandes){
 const out = [];
 for(const [sc, txt] of bandes){
  const t = String(txt).replace(/[()]/g,'').trim();
  const ns = (t.match(/-?\d[\d   ]*(?:,\d+)?/g) || []).map(nombre);
  let lo, hi;
  if(/[≤<]/.test(t)){ lo=-Infinity; hi=ns[0]; }
  else if(/[≥>]/.test(t)){ lo=ns[0]; hi=Infinity; }
  else if(ns.length===2){ [lo,hi]=ns; }
  else return null;
  if(lo==null || hi==null || isNaN(lo) || isNaN(hi)) return null;
  out.push({sc, txt:t, lo, hi});
 }
 return out;
}
function scorePour(iv, v){ const h = iv.filter(b=>v>=b.lo && v<=b.hi); return h.length ? h[0].sc : null; }

/* which of the four sources feeds an indicator */
function sourceDe(x){
 if(x.source==='satellite' || x.source==='geospatial') return 'geo';
 if(x.source==='OCB') return 'inst';
 if(BIO.test(x.nom_fr||'')) return 'bio';
 if(x.source==='menage_regle' || (x.etat!=='absent' && x.calcule)) return 'menage';
 return null;
}

function preparer(d){
 const I = d.indicateurs;
 const mesures = I.filter(x=>{
  if(x.valeur==null || x.score==null || !x.bandes || x.bandes.length!==11 || x.ec?.unite!=='pct') return false;
  if(x.valeur<0 || x.valeur>100) return false;
  const iv = intervalles(x.bandes); if(!iv) return false;
  x._iv = iv;
  return iv.filter(b=>x.valeur>=b.lo && x.valeur<=b.hi).some(b=>b.sc===x.score);
 });
 const parSource = {};
 for(const x of I){ const s = sourceDe(x); if(s) (parSource[s] ||= []).push(x); }
 const poidsDim = Object.fromEntries(Object.entries(d.stats.dims).map(([k,v])=>[k, v.poids]));
 return {I, mesures, parSource, poidsDim};
}

function pairesDims(P){
 // pairs of dimensions whose weights differ clearly (at least 4 points)
 const ks = Object.keys(P.poidsDim), out = [];
 for(let i=0;i<ks.length;i++) for(let j=i+1;j<ks.length;j++)
  if(Math.abs(P.poidsDim[ks[i]]-P.poidsDim[ks[j]])>=4) out.push(melanger([ks[i],ks[j]]));
 return melanger(out).slice(0,5);
}
function cartesSources(P){
 // two indicators from each source the data really has, shuffled
 return melanger(SOURCES.flatMap(s=>melanger(P.parSource[s.id]||[]).slice(0,2)));
}
function duelsDimension(P, dim){
 // pairs of scored indicators of one dimension with clearly different weights
 const xs = P.I.filter(x=>x.dim===dim && x.score!=null && x.score<=8);
 const out = [];
 for(let i=0;i<xs.length;i++) for(let j=i+1;j<xs.length;j++)
  if(Math.abs(xs[i].poids-xs[j].poids)>=0.8) out.push(melanger([xs[i],xs[j]]));
 return melanger(out).slice(0,3);
}

function nouvellePartie(P){
 const dims = Object.keys(P.poidsDim).filter(k=>duelsDimension(P,k).length>=3);
 const dim = dims.includes('dim2') ? 'dim2' : dims[0];
 return {
  etape:0, points:Array(N_ET).fill(0), fini:Array(N_ET).fill(false), finale:false,
  e1:{cartes: melanger(SITUATIONS).slice(0,6), i:0, rep:null},
  e2:{paires: pairesDims(P), i:0, rep:null},
  e3:{cartes: cartesSources(P), i:0, rep:null},
  e4:{cartes: melanger(P.mesures).slice(0,3), i:0, choix:null, valeur:null},
  e5:{dim, duels: duelsDimension(P, dim), i:0, rep:null},
 };
}

export default async function render(el, apri){
 css();
 const d = await donnees(apri);
 const P = preparer(d);
 if(!J) J = nouvellePartie(P);
 const t = apri.t, e = apri.esc;
 const T = k => (d.textes[apri.lang]||d.textes.fr)[k] ?? d.textes.fr[k] ?? k;
 const nomDim = k => T(k);
 const nomInd = x => apri.lang==='en' ? (x.nom || x.nom_fr) : (x.nom_fr || x.nom);
 const pctTxt = v => fmt(v,1)+(apri.lang==='en'?'%':' %');

 el.innerHTML = '';
 const racine = apri.h(`<div class="jeu"></div>`); el.append(racine);
 const total = J.points.reduce((a,b)=>a+b,0);
 racine.append(apri.h(`<div class="jeu-tete">
  <div><div class="etiquette">${t('Cadre de résilience','Resilience framework')}</div>
   <h2>${t("Ce que mesure APRI, et d'où viennent ses scores","What APRI measures, and where its scores come from")}</h2>
   <p class="note">${t('Cinq étapes, à cliquer.','Five steps, to click through.')}</p></div>
  <div class="jeu-total" title="${t('Bonnes réponses','Correct answers')}"><b>${total}</b><span>${t('points','points')}</span></div>
 </div>`));

 const chemin = apri.h(`<div class="jeu-chemin" role="tablist"></div>`);
 ETAPES.forEach((n,i)=>{
  const b = apri.h(`<button type="button" class="${i===J.etape&&!J.finale?'ici':''} ${J.fini[i]?'fait':''}" role="tab" aria-selected="${i===J.etape}">
   <i>${J.fini[i]?'✓':i+1}</i><span>${e(t(n.fr,n.en))}</span></button>`);
  b.onclick = ()=>{ J.etape=i; J.finale=false; render(el, apri); };
  chemin.append(b);
 });
 racine.append(chemin);
 const scene = apri.h(`<div class="jeu-scene"></div>`); racine.append(scene);

 function suivant(i){
  J.fini[i] = true;
  if(J.fini.every(Boolean)) J.finale = true; else J.etape = Math.min(i+1, N_ET-1);
  render(el, apri);
  el.closest('section')?.scrollIntoView({behavior:'smooth'});
 }
 const barre = (i,n)=>`<div class="jeu-barre"><i style="width:${Math.round(100*i/n)}%"></i></div><div class="note">${i<n?(i+1)+' / '+n:''}</div>`;
 const consigne = (i, txt) => apri.h(`<div class="jeu-consigne"><h3>${i+1} · ${e(t(ETAPES[i].fr,ETAPES[i].en))}</h3><p>${txt}</p></div>`);
 function suite(ret, dernier, avancer){
  const b = apri.h(`<button type="button" class="bouton primaire">${dernier?t('Terminer cette étape','Finish this step'):t('Suivant','Next')} →</button>`);
  b.onclick = avancer; ret.append(b);
 }
 function bilan(s, i, max, rejouer){
  const r = J.points[i]/max, etoiles = r>=0.99?3:r>=0.6?2:1;
  const b = apri.h(`<div class="jeu-carte jeu-bilan"><div class="jeu-etoiles">${'★'.repeat(etoiles)}<span>${'☆'.repeat(3-etoiles)}</span></div>
   <p>${t(`${J.points[i]} sur ${max}`,`${J.points[i]} out of ${max}`)}</p>
   <div class="pastilles"><button type="button" class="bouton">${t('Recommencer','Start again')}</button><button type="button" class="bouton primaire">${i<N_ET-1?t('Étape suivante','Next step'):t('Terminer','Finish')} →</button></div></div>`);
  b.querySelectorAll('button')[0].onclick = rejouer;
  b.querySelectorAll('button')[1].onclick = ()=>suivant(i);
  s.append(b);
 }

 /* ---------- 1. three capacities ---------- */
 function etape1(s){
  const N = J.e1, n = N.cartes.length;
  s.append(consigne(0, t("La résilience, c'est la capacité d'un territoire à faire face aux chocs. APRI la regarde sous trois angles. Quelle capacité montre cette situation ?","Resilience is a territory's capacity to cope with shocks. APRI looks at it from three angles. Which capacity does this situation show?")));
  const leg = apri.h(`<div class="jeu-attrs"></div>`);
  ATTR.forEach(a=>leg.append(apri.h(`<div class="jeu-attr" style="--c:${a.c}"><b>${e(t(a.fr,a.en))}</b><span>${e(T('cad_'+a.id))}</span></div>`)));
  s.append(leg);
  if(N.i>=n) return bilan(s, 0, n, ()=>{ J.e1={cartes:melanger(SITUATIONS).slice(0,6),i:0,rep:null}; J.points[0]=0; J.fini[0]=false; render(el,apri); });
  const c = N.cartes[N.i];
  const carte = apri.h(`<div class="jeu-carte"><div class="jeu-situation">« ${e(t(c.fr,c.en))} »</div><div class="jeu-choix"></div><div class="jeu-retour" aria-live="polite"></div></div>`);
  const zone = carte.querySelector('.jeu-choix');
  ATTR.forEach(a=>{
   const b = apri.h(`<button type="button" class="jeu-bouton" style="--c:${a.c}">${e(t(a.fr,a.en))}</button>`);
   if(N.rep){ b.disabled = true; if(a.id===c.a) b.classList.add('bon'); else if(a.id===N.rep) b.classList.add('faux'); }
   b.onclick = ()=>{ N.rep=a.id; if(a.id===c.a) J.points[0]++; render(el,apri); };
   zone.append(b);
  });
  if(N.rep){
   const ok = N.rep===c.a, a = ATTR.find(x=>x.id===c.a), ret = carte.querySelector('.jeu-retour');
   ret.innerHTML = `<p class="${ok?'oui':'non'}">${ok?t('Bien vu.','Well spotted.'):t('Pas tout à fait.','Not quite.')} ${t("C'est",'This is')} <b>${e(t(a.fr,a.en))}</b> : ${e(T('cad_'+a.id)).toLowerCase()}.</p>`;
   suite(ret, N.i+1>=n, ()=>{ N.i++; N.rep=null; render(el,apri); });
  }
  s.append(carte); s.append(apri.h(barre(N.i,n)));
 }

 /* ---------- 2. seven dimensions: which weighs more ---------- */
 function etape2(s){
  const N = J.e2, n = N.paires.length;
  const tot = Object.values(P.poidsDim).reduce((a,b)=>a+b,0);
  s.append(consigne(1, t("Les indicateurs sont rangés en sept dimensions. Chacune pèse plus ou moins dans l'indice, selon le nombre et l'importance de ses indicateurs. Des deux, laquelle pèse le plus ?","Indicators are grouped into seven dimensions. Each weighs more or less in the index, depending on the number and importance of its indicators. Of the two, which one weighs more?")));
  const vueTout = ()=>{
   const ks = Object.keys(P.poidsDim).sort((a,b)=>P.poidsDim[b]-P.poidsDim[a]), max = P.poidsDim[ks[0]];
   return `<div class="jeu-poids">${ks.map(k=>`<div class="l"><span>${e(nomDim(k))}</span><i style="width:${Math.round(100*P.poidsDim[k]/max)}%;background:${DIM_COUL[k]}"></i><b>${Math.round(100*P.poidsDim[k]/tot)} %</b></div>`).join('')}</div>`;
  };
  if(N.i>=n){
   s.append(apri.h(`<div class="jeu-carte">${vueTout()}<p class="note">${t("Part de chaque dimension dans l'indice. Le poids d'une dimension est la somme des poids de ses indicateurs, fixés par un groupe d'experts.","Share of each dimension in the index. A dimension's weight is the sum of its indicators' weights, set by an expert panel.")}</p></div>`));
   return bilan(s, 1, n, ()=>{ J.e2={paires:pairesDims(P),i:0,rep:null}; J.points[1]=0; J.fini[1]=false; render(el,apri); });
  }
  const [a,b] = N.paires[N.i], gagne = P.poidsDim[a]>P.poidsDim[b] ? a : b;
  const nb = k => P.I.filter(x=>x.dim===k).length;
  const carte = apri.h(`<div class="jeu-carte"><div class="jeu-duel"></div><div class="jeu-retour" aria-live="polite"></div></div>`);
  const zone = carte.querySelector('.jeu-duel');
  [a,b].forEach((k,i)=>{
   const btn = apri.h(`<button type="button" class="jeu-dim jeu-gros" style="--c:${DIM_COUL[k]}"><span>${e(nomDim(k))}</span>${N.rep?`<small>${nb(k)} ${t('indicateurs','indicators')} · ${Math.round(100*P.poidsDim[k]/tot)} % ${t("de l'indice","of the index")}</small>`:''}</button>`);
   if(N.rep){ btn.disabled=true; if(k===gagne) btn.classList.add('bon'); else if(k===N.rep) btn.classList.add('faux'); }
   btn.onclick = ()=>{ N.rep=k; if(k===gagne) J.points[1]++; render(el,apri); };
   zone.append(btn);
   if(i===0) zone.append(apri.h(`<div class="jeu-ou">${t('ou','or')}</div>`));
  });
  if(N.rep){
   const ret = carte.querySelector('.jeu-retour');
   ret.innerHTML = `<p class="${N.rep===gagne?'oui':'non'}">${N.rep===gagne?t('Oui.','Yes.'):t('Non.','No.')} <b>${e(nomDim(gagne))}</b> ${t('pèse plus lourd dans l\'indice.','weighs more in the index.')}</p>`;
   suite(ret, N.i+1>=n, ()=>{ N.i++; N.rep=null; render(el,apri); });
  }
  s.append(carte); s.append(apri.h(barre(N.i,n)));
 }

 /* ---------- 3. with what data ---------- */
 function etape3(s){
  const N = J.e3, n = N.cartes.length;
  s.append(consigne(2, t("Pour renseigner les indicateurs, APRI croise quatre sources. D'où vient cette mesure ?","To fill in the indicators, APRI combines four sources. Where does this measure come from?")));
  const leg = apri.h(`<div class="jeu-sources"></div>`);
  SOURCES.forEach(so=>leg.append(apri.h(`<div class="jeu-src" style="--c:${so.c}"><b><i>${so.ic}</i>${e(T(so.k+'_t'))}</b><span>${e(T(so.k+'_x'))}</span></div>`)));
  s.append(leg);
  if(N.i>=n) return bilan(s, 2, n, ()=>{ J.e3={cartes:cartesSources(P),i:0,rep:null}; J.points[2]=0; J.fini[2]=false; render(el,apri); });
  const x = N.cartes[N.i], bonne = sourceDe(x);
  const metr = apri.lang==='en' ? (x.metrique_en||x.metrique) : (x.metrique_fr||x.metrique);
  const carte = apri.h(`<div class="jeu-carte"><div class="etiquette">${t('Indicateur','Indicator')}</div>
   <div class="jeu-indic">${e(nomInd(x))}</div>${metr?`<p class="note jeu-metr">${e(metr.length>200?metr.slice(0,200)+'…':metr)}</p>`:''}
   <div class="jeu-choix"></div><div class="jeu-retour" aria-live="polite"></div></div>`);
  const zone = carte.querySelector('.jeu-choix');
  SOURCES.forEach(so=>{
   const b = apri.h(`<button type="button" class="jeu-bouton" style="--c:${so.c}">${so.ic} ${e(T(so.k+'_t'))}</button>`);
   if(N.rep){ b.disabled=true; if(so.id===bonne) b.classList.add('bon'); else if(so.id===N.rep) b.classList.add('faux'); }
   b.onclick = ()=>{ N.rep=so.id; if(so.id===bonne) J.points[2]++; render(el,apri); };
   zone.append(b);
  });
  if(N.rep){
   const so = SOURCES.find(z=>z.id===bonne), ret = carte.querySelector('.jeu-retour');
   const detail = x.src && x.etat!=='absent' ? (apri.lang==='en'?x.src.en:x.src.fr) : '';
   ret.innerHTML = `<p class="${N.rep===bonne?'oui':'non'}">${N.rep===bonne?t('Exact.','Correct.'):t('Non.','No.')} ${t('Source','Source')} : <b>${e(T(so.k+'_t'))}</b>${detail?` · <span class="note">${e(detail.length>140?detail.slice(0,140)+'…':detail)}</span>`:''}</p>`
    + (x.etat==='absent'?`<p class="note">${t("Cet indicateur est prévu : ses données seront collectées lors d'une prochaine campagne.","This indicator is planned: its data will be collected in a future round.")}</p>`:'');
   suite(ret, N.i+1>=n, ()=>{ N.i++; N.rep=null; render(el,apri); });
  }
  s.append(carte); s.append(apri.h(barre(N.i,n)));
 }

 /* ---------- 4. raw value -> score ---------- */
 function etape4(s){
  const N = J.e4, n = N.cartes.length;
  s.append(consigne(3, t("L'enquête donne une valeur brute, par exemple un pourcentage de ménages. Un barème publié la range sur une échelle de 0 à 10. Sur quel palier tombe cette valeur ?","The survey gives a raw value, for instance a share of households. A published scale places it on a 0 to 10 scale. Which step does this value fall on?")));
  if(N.i>=n) return bilan(s, 3, 3*n, ()=>{ J.e4={cartes:melanger(P.mesures).slice(0,3),i:0,choix:null,valeur:null}; J.points[3]=0; J.fini[3]=false; render(el,apri); });
  const x = N.cartes[N.i], inv = x.ec?.sens==='inv';
  const v = N.valeur ?? x.valeur, sc = scorePour(x._iv, v);
  const carte = apri.h(`<div class="jeu-carte jeu-n3">
   <div class="jeu-n3-g">
    <div class="etiquette">${t('Indicateur','Indicator')} · ${e(nomDim(x.dim))}</div>
    <div class="jeu-indic">${e(nomInd(x))}</div>
    <div class="jeu-brute"><span>${t('Valeur mesurée','Measured value')}</span><b>${pctTxt(x.valeur)}</b></div>
    <p class="note">${inv?t('Ici, plus la valeur est haute, plus la situation est critique : le barème est inversé.','Here, the higher the value, the more critical the situation: the scale is reversed.'):t('Ici, plus la valeur est haute, mieux c\'est.','Here, the higher the value, the better.')}</p>
    <div class="jeu-retour" aria-live="polite"></div>
   </div>
   <div class="jeu-echelle" role="group" aria-label="${t('Barème','Scale')}"></div>
  </div>`);
  const ech = carte.querySelector('.jeu-echelle');
  [...x._iv].reverse().forEach(b=>{
   const c = teinte(b.sc/10);
   const r = apri.h(`<button type="button" class="jeu-palier" style="--c:${c};--i:${encre(c)}"><b>${b.sc}</b><span>${e(b.txt)}</span></button>`);
   if(N.choix!=null){ r.disabled = true; if(b.sc===x.score) r.classList.add('bon'); else if(b.sc===N.choix) r.classList.add('faux'); if(b.sc===sc) r.classList.add('courant'); }
   r.onclick = ()=>{ N.choix=b.sc; const ec=Math.abs(b.sc-x.score); J.points[3]+= ec===0?3:ec===1?1:0; render(el,apri); };
   ech.append(r);
  });
  const ret = carte.querySelector('.jeu-retour');
  if(N.choix==null){
   ret.innerHTML = `<p class="jeu-astuce">${t('Cliquez sur le palier du barème.','Click the step of the scale.')}</p>`;
  } else {
   const ec = Math.abs(N.choix-x.score);
   ret.innerHTML = `<p class="${ec===0?'oui':'non'}">${ec===0?t('Exact, +3.','Exact, +3.'):ec===1?t('Presque, +1.','Close, +1.'):t('Raté.','Missed.')} ${t('Le score est','The score is')} <b>${x.score} / 10</b>.</p>
    <div class="jeu-curseur"><label>${t('Faites varier la valeur :','Move the value:')} <b>${pctTxt(v)}</b> → <span class="jeu-pastille" style="background:${teinte((sc??0)/10)};color:${encre(teinte((sc??0)/10))}">${sc??'–'} / 10</span></label>
    <input type="range" min="0" max="100" step="0.1" value="${v}" aria-label="${t('Valeur','Value')}"></div>`;
   const curs = ret.querySelector('input');
   curs.oninput = ()=>{
    N.valeur = parseFloat(curs.value);
    const s2 = scorePour(x._iv, N.valeur), c2 = teinte((s2??0)/10);
    ret.querySelector('label b').textContent = pctTxt(N.valeur);
    const p = ret.querySelector('.jeu-pastille'); p.textContent=(s2??'–')+' / 10'; p.style.background=c2; p.style.color=encre(c2);
    ech.querySelectorAll('.jeu-palier').forEach(r=>r.classList.toggle('courant', Number(r.querySelector('b').textContent)===s2));
   };
   suite(ret, N.i+1>=n, ()=>{ N.i++; N.choix=null; N.valeur=null; render(el,apri); });
  }
  s.append(carte); s.append(apri.h(barre(N.i,n)));
 }

 /* ---------- 5. dimension score: which improvement counts more ---------- */
 function etape5(s){
  const N = J.e5, n = N.duels.length;
  const xs = P.I.filter(x=>x.dim===N.dim && x.score!=null);
  const sw = xs.reduce((a,x)=>a+x.poids,0);
  const base = xs.reduce((a,x)=>a+x.score*x.poids,0)/sw;
  s.append(consigne(4, t(`Le score d'une dimension réunit les scores de ses indicateurs, chacun compté selon son poids. Ici, <b>${e(nomDim(N.dim))}</b>. Si l'on gagne <b>2 points</b> sur un seul indicateur, lequel fait le plus monter la dimension ?`,`A dimension's score brings together its indicators' scores, each counted by its weight. Here, <b>${e(nomDim(N.dim))}</b>. If we gain <b>2 points</b> on a single indicator, which one raises the dimension more?`)));
  if(N.i>=n) return bilan(s, 4, n, ()=>{ J.e5={dim:N.dim,duels:duelsDimension(P,N.dim),i:0,rep:null}; J.points[4]=0; J.fini[4]=false; render(el,apri); });
  const duel = N.duels[N.i], gagne = duel[0].poids>duel[1].poids ? duel[0] : duel[1];
  const apres = x => base + Math.min(2, 10-x.score)*x.poids/sw;
  const jauge = (val, avant) => `<div class="jeu-jauge2"><div class="piste"><i style="width:${val*10}%;background:${teinte(val/10)}"></i>${avant!=null?`<u style="left:${avant*10}%"></u>`:''}</div><b>${fmt(val,1)}</b></div>`;
  const pmax = Math.max(...xs.map(x=>x.poids)), pmin = Math.min(...xs.map(x=>x.poids));
  const carte = apri.h(`<div class="jeu-carte">
   <div class="jeu-dimscore"><span>${t('Score de la dimension aujourd\'hui','Dimension score today')}</span>${jauge(base)}</div>
   <div class="jeu-duel"></div><div class="jeu-retour" aria-live="polite"></div></div>`);
  const zone = carte.querySelector('.jeu-duel');
  duel.forEach((x,i)=>{
   const poidsPx = 12 + Math.round(34*(x.poids-pmin)/((pmax-pmin)||1));
   const btn = apri.h(`<button type="button" class="jeu-dim jeu-gros jeu-ind" style="--c:${DIM_COUL[N.dim]}">
     <span>${e(nomInd(x))}</span>
     <small>${t('score','score')} ${x.score} / 10 · ${t('poids','weight')} <em class="jeu-poid" style="width:${poidsPx}px;height:${poidsPx}px" title="${fmt(x.poids,2)}"></em></small>
     ${N.rep?`<div class="jeu-apres">${t('dimension','dimension')} ${jauge(apres(x), base)}<em class="jeu-gain">+${fmt(apres(x)-base,2)}</em></div>`:''}
   </button>`);
   if(N.rep){ btn.disabled=true; if(x===gagne) btn.classList.add('bon'); else if(x.ligne===N.rep) btn.classList.add('faux'); }
   btn.onclick = ()=>{ N.rep=x.ligne; if(x===gagne) J.points[4]++; render(el,apri); };
   zone.append(btn);
   if(i===0) zone.append(apri.h(`<div class="jeu-ou">${t('ou','or')}</div>`));
  });
  if(N.rep){
   const ret = carte.querySelector('.jeu-retour');
   ret.innerHTML = `<p class="${N.rep===gagne.ligne?'oui':'non'}">${N.rep===gagne.ligne?t('Oui.','Yes.'):t('Non.','No.')} ${t("Le même gain compte plus sur l'indicateur au plus gros poids : c'est lui qui tire la moyenne.","The same gain counts more on the indicator with the bigger weight: it pulls the average more.")}</p>`;
   suite(ret, N.i+1>=n, ()=>{ N.i++; N.rep=null; render(el,apri); });
  }
  s.append(carte); s.append(apri.h(barre(N.i,n)));
 }

 function finale(s){
  const tot = J.points.reduce((a,b)=>a+b,0);
  const b = apri.h(`<div class="jeu-carte jeu-bilan"><div class="jeu-etoiles">★★★</div>
   <h3>${t(`Bravo, ${tot} points !`,`Well done, ${tot} points!`)}</h3>
   <div class="pastilles" style="justify-content:center"><button type="button" class="bouton">${t('Recommencer depuis le début','Start again from the beginning')}</button></div></div>`);
  b.querySelector('button').onclick = ()=>{ J = nouvellePartie(P); render(el,apri); };
  s.append(b);
 }

 (J.finale ? finale : [etape1, etape2, etape3, etape4, etape5][J.etape])(scene);
}
