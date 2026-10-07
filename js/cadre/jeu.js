/* "Comprendre en jouant": the resilience framework as a four-level game.
   1 the three capacities (attributes), 2 the seven dimensions (real indicators),
   3 from a raw value to a 0-10 score (real published scales), 4 from indicator
   scores to a dimension score (real weights). Everything comes from cadre.json,
   except the situations of level 1, written as teaching examples. */
import {css, donnees, teinte, encre, fmt} from './commun.js';

const DIM_COUL = {dim1:'#4f7ea8', dim2:'#7a5ea8', dim3:'#2f7a5b', dim4:'#c98a1b', dim5:'#c0603f', dim6:'#3f9a9a', dim7:'#9a5a7a'};
const ATTR = [
 {id:'a1', fr:'Anticiper', en:'Anticipate', c:'#397fa3'},
 {id:'a2', fr:'Absorber', en:'Absorb', c:'#c98a1b'},
 {id:'a3', fr:"S'adapter", en:'Adapt', c:'#2f7a5b'},
];
// teaching situations, one capacity each (definitions from the framework)
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
const NIVEAUX = [
 {fr:'Trois capacités', en:'Three capacities'},
 {fr:'Sept dimensions', en:'Seven dimensions'},
 {fr:'De la mesure au score', en:'From measure to score'},
 {fr:'Le score de la dimension', en:'The dimension score'},
];

// game state survives language changes and tab switches during the visit
let J = null;
const melanger = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

/* ---------- published scales: text bands -> numeric intervals ---------- */
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

function preparer(d){
 const I = d.indicateurs;
 // level 3 pool: household percentages whose published score our reading of the scale reproduces
 const mesures = I.filter(x=>{
  if(x.valeur==null || x.score==null || !x.bandes || x.bandes.length!==11 || x.ec?.unite!=='pct') return false;
  if(x.valeur<0 || x.valeur>100) return false;
  const iv = intervalles(x.bandes); if(!iv) return false;
  x._iv = iv;
  return iv.filter(b=>x.valeur>=b.lo && x.valeur<=b.hi).some(b=>b.sc===x.score);
 });
 return {I, mesures};
}

function nouvellePartie(P){
 const parDim = {};
 for(const x of P.I) (parDim[x.dim] ||= []).push(x);
 return {
  niveau:0, points:[0,0,0,0], fini:[false,false,false,false],
  n1:{cartes: melanger(SITUATIONS).slice(0,6), i:0, rep:null},
  n2:{cartes: melanger(Object.keys(parDim).map(k=>melanger(parDim[k])[0])), i:0, rep:null},
  n3:{cartes: melanger(P.mesures).slice(0,3), i:0, choix:null, valeur:null},
  n4:{dim:'dim2', plus:{}, budget:5},
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
   <h2>${t('Comprendre la résilience en jouant','Understanding resilience by playing')}</h2>
   <p class="note">${t("Quatre niveaux pour découvrir ce que mesure APRI, et comment une réponse d'enquête devient un score de résilience.","Four levels to discover what APRI measures, and how a survey answer becomes a resilience score.")}</p></div>
  <div class="jeu-total" title="${t('Points','Points')}"><b>${total}</b><span>${t('points','points')}</span></div>
 </div>`));

 // level path
 const chemin = apri.h(`<div class="jeu-chemin" role="tablist"></div>`);
 NIVEAUX.forEach((n,i)=>{
  const b = apri.h(`<button type="button" class="${i===J.niveau?'ici':''} ${J.fini[i]?'fait':''}" role="tab" aria-selected="${i===J.niveau}">
   <i>${J.fini[i]?'✓':i+1}</i><span>${e(t(n.fr,n.en))}</span></button>`);
  b.onclick = ()=>{ J.niveau=i; render(el, apri); };
  chemin.append(b);
 });
 racine.append(chemin);

 const scene = apri.h(`<div class="jeu-scene"></div>`); racine.append(scene);

 function suivant(i){
  J.fini[i] = true;
  J.niveau = J.fini.every(Boolean) ? 4 : Math.min(i+1, 3);
  render(el, apri);
  el.closest('section')?.scrollIntoView({behavior:'smooth'});
 }
 const barre = (i,n)=>`<div class="jeu-barre"><i style="width:${Math.round(100*i/n)}%"></i></div><div class="note">${i<n?t('Carte','Card')+' '+(i+1)+' / '+n:''}</div>`;

 /* ---------- level 1: three capacities ---------- */
 function niveau1(s){
  const N = J.n1, n = N.cartes.length;
  s.append(apri.h(`<div class="jeu-consigne"><h3>${t('Niveau 1 · Trois capacités','Level 1 · Three capacities')}</h3>
   <p>${t("La résilience, c'est la capacité d'un territoire à faire face aux chocs. APRI la mesure à travers trois attributs. Lisez la situation : quelle capacité montre‑t‑elle ?","Resilience is a territory's capacity to cope with shocks. APRI measures it through three attributes. Read the situation: which capacity does it show?")}</p></div>`));
  const leg = apri.h(`<div class="jeu-attrs"></div>`);
  ATTR.forEach(a=>leg.append(apri.h(`<div class="jeu-attr" style="--c:${a.c}"><b>${e(t(a.fr,a.en))}</b><span>${e(T('cad_'+a.id))}</span></div>`)));
  s.append(leg);
  if(N.i>=n){ return bilan(s, 0, t(`Vous avez reconnu ${J.points[0]} situations sur ${n}.`,`You recognised ${J.points[0]} situations out of ${n}.`), ()=>{ J.n1={cartes:melanger(SITUATIONS).slice(0,6),i:0,rep:null}; J.points[0]=0; J.fini[0]=false; render(el,apri); }); }
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
   const ok = N.rep===c.a, a = ATTR.find(x=>x.id===c.a);
   carte.querySelector('.jeu-retour').innerHTML = `<p class="${ok?'oui':'non'}">${ok?t('Bravo !','Well done!'):t('Pas tout à fait.','Not quite.')} ${t('C\'est','This is')} <b>${e(t(a.fr,a.en))}</b> : ${e(T('cad_'+a.id)).toLowerCase()}.</p>`;
   const suiv = apri.h(`<button type="button" class="bouton primaire">${N.i+1<n?t('Situation suivante','Next situation'):t('Voir le bilan','See the result')} →</button>`);
   suiv.onclick = ()=>{ N.i++; N.rep=null; render(el,apri); };
   carte.querySelector('.jeu-retour').append(suiv);
  }
  s.append(carte); s.append(apri.h(barre(N.i,n)));
 }

 /* ---------- level 2: seven dimensions ---------- */
 function niveau2(s){
  const N = J.n2, n = N.cartes.length;
  s.append(apri.h(`<div class="jeu-consigne"><h3>${t('Niveau 2 · Sept dimensions','Level 2 · Seven dimensions')}</h3>
   <p>${t(`Ces capacités se mesurent avec ${P.I.length} indicateurs, rangés en sept dimensions du paysage et de la société. Voici un vrai indicateur d'APRI : dans quelle dimension va‑t‑il ?`,`These capacities are measured with ${P.I.length} indicators, grouped into seven dimensions of the landscape and society. Here is a real APRI indicator: which dimension does it belong to?`)}</p></div>`));
  if(N.i>=n){ return bilan(s, 1, t(`Vous avez bien rangé ${J.points[1]} indicateurs sur ${n}.`,`You placed ${J.points[1]} indicators out of ${n} correctly.`), ()=>{ const parDim={}; for(const x of P.I)(parDim[x.dim]||=[]).push(x); J.n2={cartes:melanger(Object.keys(parDim).map(k=>melanger(parDim[k])[0])),i:0,rep:null}; J.points[1]=0; J.fini[1]=false; render(el,apri); }); }
  const x = N.cartes[N.i];
  const metr = apri.lang==='en' ? (x.metrique_en||x.metrique) : (x.metrique_fr||x.metrique);
  const carte = apri.h(`<div class="jeu-carte"><div class="etiquette">${t('Indicateur','Indicator')}</div>
   <div class="jeu-indic">${e(nomInd(x))}</div>${metr?`<p class="note jeu-metr">${e(metr.length>230?metr.slice(0,230)+'…':metr)}</p>`:''}
   <div class="jeu-dims"></div><div class="jeu-retour" aria-live="polite"></div></div>`);
  const zone = carte.querySelector('.jeu-dims');
  d.dims.forEach(k=>{
   const b = apri.h(`<button type="button" class="jeu-dim" style="--c:${DIM_COUL[k]}">${e(nomDim(k))}</button>`);
   if(N.rep){ b.disabled=true; if(k===x.dim) b.classList.add('bon'); else if(k===N.rep) b.classList.add('faux'); }
   b.onclick = ()=>{ N.rep=k; if(k===x.dim) J.points[1]++; render(el,apri); };
   zone.append(b);
  });
  if(N.rep){
   const ok = N.rep===x.dim;
   const nb = P.I.filter(y=>y.dim===x.dim).length;
   carte.querySelector('.jeu-retour').innerHTML = `<p class="${ok?'oui':'non'}">${ok?t('Exact !','Correct!'):t('Raté.','Missed.')} ${t('Il appartient à','It belongs to')} <b>${e(nomDim(x.dim))}</b>, ${t(`qui compte ${nb} indicateurs. Son poids dans l'indice : ${fmt(x.poids,2)}, fixé par un groupe d'experts.`,`which has ${nb} indicators. Its weight in the index: ${fmt(x.poids,2)}, set by an expert panel.`)}</p>`;
   const suiv = apri.h(`<button type="button" class="bouton primaire">${N.i+1<n?t('Indicateur suivant','Next indicator'):t('Voir le bilan','See the result')} →</button>`);
   suiv.onclick = ()=>{ N.i++; N.rep=null; render(el,apri); };
   carte.querySelector('.jeu-retour').append(suiv);
  }
  s.append(carte); s.append(apri.h(barre(N.i,n)));
 }

 /* ---------- level 3: raw value -> score ---------- */
 function niveau3(s){
  const N = J.n3, n = N.cartes.length;
  s.append(apri.h(`<div class="jeu-consigne"><h3>${t('Niveau 3 · De la mesure au score','Level 3 · From measure to score')}</h3>
   <p>${t("L'enquête donne une valeur brute, par exemple un pourcentage de ménages. Un barème publié la transforme en score de 0 à 10. Devinez le score, puis faites varier la valeur pour voir le barème travailler.","The survey gives a raw value, for instance a share of households. A published scale turns it into a score from 0 to 10. Guess the score, then move the value to watch the scale at work.")}</p>
   <p class="note">${e(T('cad_echelle'))}</p></div>`));
  if(N.i>=n){ return bilan(s, 2, t(`Vous marquez ${J.points[2]} points sur ${3*n} possibles.`,`You score ${J.points[2]} points out of ${3*n}.`), ()=>{ J.n3={cartes:melanger(P.mesures).slice(0,3),i:0,choix:null,valeur:null}; J.points[2]=0; J.fini[2]=false; render(el,apri); }); }
  const x = N.cartes[N.i], inv = x.ec?.sens==='inv';
  const v = N.valeur ?? x.valeur;
  const sc = scorePour(x._iv, v);
  const carte = apri.h(`<div class="jeu-carte jeu-n3">
   <div class="jeu-n3-g">
    <div class="etiquette">${t('Indicateur','Indicator')} · ${e(nomDim(x.dim))}</div>
    <div class="jeu-indic">${e(nomInd(x))}</div>
    <div class="jeu-brute"><span>${t('Valeur brute mesurée','Measured raw value')}</span><b>${pctTxt(x.valeur)}</b></div>
    <p class="note">${inv?t('Attention : ici, plus la valeur est haute, plus la situation est critique. Le barème est inversé.','Careful: here, the higher the value, the more critical the situation. The scale is reversed.'):t('Ici, plus la valeur est haute, plus la situation est favorable.','Here, the higher the value, the more favourable the situation.')}</p>
    <div class="jeu-retour" aria-live="polite"></div>
   </div>
   <div class="jeu-echelle" role="group" aria-label="${t('Barème','Scale')}"></div>
  </div>`);
  const ech = carte.querySelector('.jeu-echelle');
  [...x._iv].reverse().forEach(b=>{
   const c = teinte(b.sc/10);
   const r = apri.h(`<button type="button" class="jeu-palier" style="--c:${c};--i:${encre(c)}"><b>${b.sc}</b><span>${e(b.txt)}</span></button>`);
   if(N.choix!=null){
    r.disabled = true;
    if(b.sc===x.score) r.classList.add('bon'); else if(b.sc===N.choix) r.classList.add('faux');
    if(b.sc===sc) r.classList.add('courant');
   }
   r.onclick = ()=>{ N.choix=b.sc; const ec=Math.abs(b.sc-x.score); J.points[2]+= ec===0?3:ec===1?1:0; render(el,apri); };
   ech.append(r);
  });
  if(N.choix==null){
   carte.querySelector('.jeu-retour').innerHTML = `<p class="jeu-astuce">${t('Cliquez sur le palier du barème où tombe cette valeur.','Click the step of the scale where this value falls.')}</p>`;
  } else {
   const ec = Math.abs(N.choix-x.score);
   const ret = carte.querySelector('.jeu-retour');
   ret.innerHTML = `<p class="${ec===0?'oui':'non'}">${ec===0?t('Exact, +3 points !','Exact, +3 points!'):ec===1?t('Presque, +1 point.','Close, +1 point.'):t('Raté.','Missed.')} ${t('Le score publié est','The published score is')} <b>${x.score} / 10</b>.</p>
    <div class="jeu-curseur"><label>${t('Et si la valeur changeait ?','What if the value changed?')} <b>${pctTxt(v)}</b> → <span class="jeu-pastille" style="background:${teinte((sc??0)/10)};color:${encre(teinte((sc??0)/10))}">${sc??'–'} / 10</span></label>
    <input type="range" min="0" max="100" step="0.1" value="${v}" aria-label="${t('Valeur brute','Raw value')}"></div>
    <p class="note">${t('Le score ne bouge pas en continu : il saute quand la valeur franchit un seuil du barème.','The score does not move smoothly: it jumps when the value crosses a threshold of the scale.')}</p>`;
   const curs = ret.querySelector('input');
   curs.oninput = ()=>{
    N.valeur = parseFloat(curs.value);
    const s2 = scorePour(x._iv, N.valeur), c2 = teinte((s2??0)/10);
    ret.querySelector('label b').textContent = pctTxt(N.valeur);
    const p = ret.querySelector('.jeu-pastille'); p.textContent=(s2??'–')+' / 10'; p.style.background=c2; p.style.color=encre(c2);
    ech.querySelectorAll('.jeu-palier').forEach(r=>r.classList.toggle('courant', Number(r.querySelector('b').textContent)===s2));
   };
   const suiv = apri.h(`<button type="button" class="bouton primaire">${N.i+1<n?t('Indicateur suivant','Next indicator'):t('Voir le bilan','See the result')} →</button>`);
   suiv.onclick = ()=>{ N.i++; N.choix=null; N.valeur=null; render(el,apri); };
   ret.append(suiv);
  }
  s.append(carte); s.append(apri.h(barre(N.i,n)));
 }

 /* ---------- level 4: weighted dimension score ---------- */
 function niveau4(s){
  const N = J.n4;
  const xs = P.I.filter(x=>x.dim===N.dim && x.score!=null).sort((a,b)=>b.poids-a.poids);
  const sw = xs.reduce((a,x)=>a+x.poids,0);
  const sDe = plus => xs.reduce((a,x)=>a+Math.min(10,x.score+(plus[x.ligne]||0))*x.poids,0)/sw;
  const base = sDe({}), actuel = sDe(N.plus);
  const depense = Object.values(N.plus).reduce((a,b)=>a+b,0), reste = N.budget-depense;
  // best possible: each point goes where weight is highest and the score not yet 10
  const marges = []; xs.forEach(x=>{ for(let k=x.score;k<10;k++) marges.push(x.poids/sw); });
  marges.sort((a,b)=>b-a);
  const meilleur = base + marges.slice(0,N.budget).reduce((a,b)=>a+b,0);
  s.append(apri.h(`<div class="jeu-consigne"><h3>${t('Niveau 4 · Le score de la dimension','Level 4 · The dimension score')}</h3>
   <p>${t(`Les scores des indicateurs d'une dimension se combinent en une moyenne pondérée : somme des (score × poids) divisée par la somme des poids. Vous avez <b>${N.budget} points d'amélioration</b> à répartir. Où les placer pour faire monter le plus le score de la dimension ?`,`The indicator scores of a dimension combine into a weighted mean: sum of (score × weight) divided by the sum of weights. You have <b>${N.budget} improvement points</b> to spend. Where should they go to raise the dimension score the most?`)}</p></div>`));
  const choixDim = apri.h(`<div class="pastilles"></div>`);
  d.dims.forEach(k=>{
   const nk = P.I.filter(x=>x.dim===k && x.score!=null).length;
   if(nk<2) return;
   const b = apri.h(`<button type="button" class="bouton" aria-pressed="${k===N.dim}" style="--c:${DIM_COUL[k]}">${e(nomDim(k))}</button>`);
   b.onclick = ()=>{ N.dim=k; N.plus={}; render(el,apri); };
   choixDim.append(b);
  });
  s.append(choixDim);
  const coul = teinte(actuel/10);
  const carte = apri.h(`<div class="jeu-carte">
   <div class="jeu-n4-tete">
    <div class="jeu-jauge"><span>${t('Score de la dimension','Dimension score')}</span><b style="color:${coul}">${fmt(actuel,2)}</b><small>${t('départ','start')} ${fmt(base,2)}</small></div>
    <div class="jeu-budget">${Array.from({length:N.budget},(_,i)=>`<i class="${i<depense?'pris':''}"></i>`).join('')}<span>${reste} ${t(reste>1?'points restants':'point restant', reste>1?'points left':'point left')}</span></div>
   </div>
   <div class="jeu-n4-liste"></div><div class="jeu-retour" aria-live="polite"></div></div>`);
  const liste = carte.querySelector('.jeu-n4-liste');
  const pmax = Math.max(...xs.map(x=>x.poids));
  xs.forEach(x=>{
   const p = N.plus[x.ligne]||0, sc = Math.min(10, x.score+p), c = teinte(sc/10);
   const l = apri.h(`<div class="jeu-n4-l">
    <div class="nom">${e(nomInd(x))}<small>${t('poids','weight')} ${fmt(x.poids,2)}</small><i class="poids" style="width:${Math.round(100*x.poids/pmax)}%"></i></div>
    <div class="jeu-n4-sc"><div class="piste"><i style="width:${sc*10}%;background:${c}"></i>${p?`<em style="left:${x.score*10}%;width:${(sc-x.score)*10}%"></em>`:''}</div><b>${sc}</b></div>
    <div class="jeu-n4-b"><button type="button" class="moins" aria-label="−" ${p?'':'disabled'}>−</button><button type="button" class="plus" aria-label="+" ${reste>0&&sc<10?'':'disabled'}>+</button></div>
   </div>`);
   l.querySelector('.plus').onclick = ()=>{ N.plus[x.ligne]=p+1; render(el,apri); };
   l.querySelector('.moins').onclick = ()=>{ N.plus[x.ligne]=p-1; if(!N.plus[x.ligne]) delete N.plus[x.ligne]; render(el,apri); };
   liste.append(l);
  });
  const ret = carte.querySelector('.jeu-retour');
  if(reste===0){
   const r = (actuel-base)/((meilleur-base)||1);
   const etoiles = r>0.995?3:r>=0.8?2:1;
   const gagne = [0,4,7,10][etoiles];
   ret.innerHTML = `<p class="${etoiles===3?'oui':'non'}">${'★'.repeat(etoiles)}${'☆'.repeat(3-etoiles)} ${t(`Vous gagnez ${fmt(actuel-base,2)} point sur la dimension ; le maximum possible était ${fmt(meilleur-base,2)}.`,`You gain ${fmt(actuel-base,2)} on the dimension; the best possible was ${fmt(meilleur-base,2)}.`)}
    ${etoiles<3?t(" L'astuce : un même point compte plus sur un indicateur au poids élevé.",' The trick: the same point counts more on a heavily weighted indicator.'):''}</p>`;
   const fin = apri.h(`<div class="pastilles"><button type="button" class="bouton">${t('Recommencer','Try again')}</button><button type="button" class="bouton primaire">${t('Valider et terminer','Validate and finish')} →</button></div>`);
   fin.children[0].onclick = ()=>{ N.plus={}; render(el,apri); };
   fin.children[1].onclick = ()=>{ J.points[3]=gagne; suivant(3); };
   ret.append(fin);
  } else {
   ret.innerHTML = `<p class="jeu-astuce">${t('Cliquez sur + pour ajouter un point à un indicateur. La barre fine sous chaque nom montre son poids.','Click + to add a point to an indicator. The thin bar under each name shows its weight.')}</p>`;
  }
  s.append(carte);
  s.append(apri.h(`<p class="note">${t("Scores des indicateurs calculés sur les valeurs de tout l'échantillon, tels que publiés dans le barème. L'onglet « Scores de résilience » calcule ménage par ménage puis fait la moyenne : les deux chiffres peuvent donc légèrement différer.","Indicator scores computed on whole-sample values, as published in the scale. The “Resilience Scores” tab computes household by household then averages, so the two figures may differ slightly.")}</p>`));
 }

 /* ---------- end of a level ---------- */
 function bilan(s, i, texte, rejouer){
  const max = [J.n1.cartes.length, J.n2.cartes.length, 3*J.n3.cartes.length, 10][i];
  const r = J.points[i]/max, etoiles = r>=0.99?3:r>=0.6?2:1;
  const b = apri.h(`<div class="jeu-carte jeu-bilan"><div class="jeu-etoiles">${'★'.repeat(etoiles)}<span>${'☆'.repeat(3-etoiles)}</span></div><p>${e(texte)}</p>
   <div class="pastilles"><button type="button" class="bouton">${t('Rejouer ce niveau','Replay this level')}</button><button type="button" class="bouton primaire">${i<3?t('Niveau suivant','Next level'):t('Terminer','Finish')} →</button></div></div>`);
  b.querySelectorAll('button')[0].onclick = rejouer;
  b.querySelectorAll('button')[1].onclick = ()=>suivant(i);
  s.append(b);
 }

 /* ---------- the whole chain ---------- */
 function finale(s){
  const tot = J.points.reduce((a,b)=>a+b,0);
  const xs = P.I.filter(x=>x.score!=null);
  const glob = xs.reduce((a,x)=>a+x.score*x.poids,0)/xs.reduce((a,x)=>a+x.poids,0);
  const etapes = [
   [t('Valeur brute','Raw value'), t("Ce que l'enquête ou le satellite mesure : 72,8 % des ménages ont une eau améliorée.","What the survey or satellite measures: 72.8% of households have improved water.")],
   [t('Barème','Scale'), t('Des seuils publiés découpent la valeur en 11 paliers.','Published thresholds cut the value into 11 steps.')],
   [t('Score 0 à 10','Score 0 to 10'), t('La valeur tombe dans un palier : ici le score 4.','The value falls into one step: here score 4.')],
   [t('× poids','× weight'), t("Chaque indicateur pèse selon l'avis des experts.","Each indicator weighs according to the experts.")],
   [t('Score de dimension','Dimension score'), t('Moyenne pondérée des indicateurs de la dimension.','Weighted mean of the dimension\'s indicators.')],
   [t('Indice global','Overall index'), t(`Les dimensions s'agrègent à leur tour : ${fmt(glob,2)} / 10 sur les valeurs de l'échantillon.`,`Dimensions aggregate in turn: ${fmt(glob,2)} / 10 on sample values.`)],
  ];
  s.append(apri.h(`<div class="jeu-carte jeu-bilan"><div class="jeu-etoiles">🏅</div>
   <h3>${t(`Bravo, ${tot} points !`,`Well done, ${tot} points!`)}</h3>
   <p>${t('Vous avez parcouru toute la chaîne qui mène d\'une réponse d\'enquête à l\'indice de résilience :','You have walked the whole chain from a survey answer to the resilience index:')}</p>
   <ol class="jeu-chaine">${etapes.map(([a,b])=>`<li><b>${e(a)}</b><span>${e(b)}</span></li>`).join('')}</ol>
   <div class="pastilles" style="justify-content:center"><button type="button" class="bouton">${t('Rejouer depuis le début','Play again from the start')}</button><button type="button" class="bouton primaire">${t('Voir le calcul indicateur par indicateur','See the calculation indicator by indicator')} →</button></div></div>`));
  const bs = s.querySelectorAll('.pastilles button');
  bs[0].onclick = ()=>{ J = nouvellePartie(P); render(el,apri); };
  bs[1].onclick = ()=>apri.aller('cadre','indicateurs');
 }

 // draw the current level (after the helpers above are defined)
 [niveau1, niveau2, niveau3, niveau4, finale][J.fini.every(Boolean) && J.niveau===4 ? 4 : J.niveau](scene);
}
