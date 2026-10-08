/* APRI static site runtime.
   Each section lives in js/<id>.js and exports:
     export const onglets = [{id, fr, en, dfr?, den?}]   // sub-tabs, [] if none
     export default async function render(el, apri, onglet)  // draws into el
   render() is called when the section first comes near the viewport, again when
   the language changes, and again when the reader picks a sub-tab (menu or hash
   "#section/onglet"). It must draw everything from scratch into el. */

export const SECTIONS = [
 {id:'territoire', fr:'Le territoire', en:'The territory'},
 {id:'cadre', fr:'Cadre de résilience', en:'Resilience Framework'},
 {id:'resultats', fr:'Analyser les résultats', en:'Analyse results'},
 {id:'boucles', fr:'Boucles de rétroaction', en:'Feedback Loops'},
 {id:'fiches', fr:"Fiches d'intervention", en:'Intervention Profiles'},
 {id:'ressources', fr:'Ressources', en:'Resources'},
 {id:'apropos', fr:'À propos', en:'About APRI', menu:'ressources'},
 {id:'contact', fr:'Contact', en:'Contact', menu:'ressources'},
];

/* Four languages. French and English are written in the code and the data.
   Spanish (es) and Haitian Creole (ht) come from dictionaries in data/i18n/<lang>/:
   ui.json for the interface, and one file per data file (its path with dots, e.g.
   data.cadre.cadre.json) for the content.
   A dictionary maps a French (or English) text to its translation; texts with
   variables are kept as patterns where {0}, {1}... stand for the variable parts.
   Missing translation: Spanish falls back to English, Creole to French. */
export const LANGUES = ['fr','en','es','ht'];
const TRADUITES = new Set(['es','ht']);
const LOCALE = {fr:'fr-FR', en:'en-GB', es:'es-DO', ht:'fr-FR'};
const dicos = new Map();   // 'es/ui.json' -> Promise<{m:Map, p:[[RegExp,string]]}>
function chargerDico(chemin){
 if(!dicos.has(chemin)) dicos.set(chemin, fetch('data/i18n/'+chemin).then(r=>r.ok?r.json():{}).catch(()=>({})).then(o=>{
  const m = new Map(Object.entries(o.s||{}));
  const p = (o.p||[]).map(([motif, tr])=>{
   const re = new RegExp('^'+motif.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{(\d+)\}/g,'([\\s\\S]*?)')+'$');
   const ordre = [...motif.matchAll(/\{(\d+)\}/g)].map(x=>+x[1]);
   return [re, tr, ordre];
  });
  return {m, p};
 }));
 return dicos.get(chemin);
}
let ui = {m:new Map(), p:[]};          // interface dictionary of the current language
function chercher(d, s){
 if(s==null || !d) return null;
 const v = d.m.get(s); if(v!=null) return v;
 const k = s.trim(); if(k!==s){ const w = d.m.get(k); if(w!=null) return s.replace(k, w); }
 if(s.length>600 || !d.p.length) return null;
 for(const [re, tr, ordre] of d.p){
  const r = re.exec(s); if(!r) continue;
  const val = {}; ordre.forEach((n,i)=>val[n]=r[i+1]);
  return tr.replace(/\{(\d+)\}/g, (_,n)=>val[n] ?? '');
 }
 return null;
}
export function traduire(s){ return chercher(ui, s); }
/* content of a data file in Spanish or Creole: every French slot receives the translation */
function traduireDonnees(o, d, l){
 const tr = (fr, en) => { const v = chercher(d, fr) ?? chercher(ui, fr); return v ?? (l==='es' && typeof en==='string' && en ? en : fr); };
 const arbre = (a, b) => typeof a==='string' ? tr(a, typeof b==='string'?b:null)
  : Array.isArray(a) ? a.map((v,i)=>arbre(v, Array.isArray(b)?b[i]:null))
  : a && typeof a==='object' ? Object.fromEntries(Object.entries(a).map(([k,v])=>[k, arbre(v, b&&typeof b==='object'?b[k]:null)])) : a;
 // every French slot gets the translation, and so does its English twin, so that
 // code choosing either language field shows the translated text
 const jumeau = k => k==='fr' ? 'en' : k.endsWith('_fr') ? k.slice(0,-3)+'_en' : (/^[a-z]+fr$/.test(k) ? k.slice(0,-2)+'en' : null);
 const marche = x => {
  if(Array.isArray(x)) return x.map(marche);
  if(!x || typeof x!=='object') return x;
  const y = {}, faits = new Set();
  for(const [k,v] of Object.entries(x)){
   const j = jumeau(k);
   if(j && (j in x || k==='fr' || k.endsWith('_fr'))){
    let t;
    const en = x[j] ?? (k.endsWith('_fr') ? x[k.slice(0,-3)] : undefined);
    if(typeof v==='string') t = tr(v, en);
    else if(v && typeof v==='object') t = arbre(v, en);
    else { y[k] = v; continue; }
    y[k] = t; faits.add(k);
    if(j in x){ y[j] = t; faits.add(j); }
    if(k==='fr') y[l] = t;
   }
  }
  for(const [k,v] of Object.entries(x)) if(!faits.has(k) && !(k in y)) y[k] = marche(v);
  return y;
 };
 return marche(o);
}

const cache = new Map();
const paquets = new Map();
let _manifeste;
function manifeste(){
 if(_manifeste===undefined) _manifeste = fetch('data/paquets.json').then(r=>r.ok?r.json():null).catch(()=>null);
 return _manifeste;
}
const ecouteurs = new Set();
const etat = {};            // per-section open tab
const rendus = new Map();   // section id -> {mod, el}

export const apri = {
 lang: 'fr',
 /** pick the text for the current language */
 t(fr, en){
  const l = apri.lang;
  if(l === 'fr') return fr;
  if(l === 'en') return en ?? fr;
  return traduire(fr) ?? traduire(en) ?? (l === 'es' ? (en ?? fr) : fr);
 },
 /** pick from an object {fr, en} or return the value */
 tt(o){ return (o && typeof o === 'object' && ('fr' in o || 'en' in o)) ? (o[apri.lang] ?? apri.t(o.fr, o.en)) : o; },
 /** fetch JSON once (path relative to the site root, e.g. 'data/fiches/fiches.json') */
 donnees(chemin){
  const l = apri.lang;
  if(!TRADUITES.has(l)) return apri.donneesBrutes(chemin);
  const cle = l+'|'+chemin;
  if(!cache.has(cle)) cache.set(cle, Promise.all([apri.donneesBrutes(chemin), chargerDico(l+'/'+chemin.replace(/\//g,'.'))]).then(([o,d])=>traduireDonnees(o,d,l)));
  return cache.get(cle);
 },
 donneesBrutes(chemin){
  // On the published site, folders of many small files are packed into a few
  // bundles (outils/empaqueter.py); data/paquets.json says which bundle holds a path.
  if(!cache.has(chemin)) cache.set(chemin, (async()=>{
   const index = await manifeste();
   if(index && chemin in index){
    const b = 'data/paquets/'+index[chemin]+'.json';
    if(!paquets.has(b)) paquets.set(b, fetch(b).then(r=>{ if(!r.ok) throw new Error(b+' '+r.status); return r.json(); }));
    return (await paquets.get(b))[chemin];
   }
   const r = await fetch(chemin); if(!r.ok) throw new Error(chemin+' '+r.status); return r.json();
  })());
  return cache.get(chemin);
 },
 esc(s){ return String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
 /** build an element from an HTML string */
 h(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; },
 /** number formatting in the current language */
 nombre(n, dec=0){ return n==null||isNaN(n)?'–':Number(n).toLocaleString(LOCALE[apri.lang]||'fr-FR',{minimumFractionDigits:dec,maximumFractionDigits:dec}); },
 pct(x, dec=0){ return x==null||isNaN(x)?'–':apri.nombre(x*100,dec)+(apri.lang==='en'||apri.lang==='es'?'%':' %'); },
 /** strip accents and lowercase, for search */
 plier(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); },
 onLangue(cb){ ecouteurs.add(cb); return ()=>ecouteurs.delete(cb); },
 /** draw the standard tab bar; returns the bar element */
 barreOnglets(onglets, actif, surChoix){
  const bar = document.createElement('div'); bar.className='onglets'; bar.setAttribute('role','tablist');
  onglets.forEach((o,i)=>{
   const b=document.createElement('button'); b.type='button'; b.setAttribute('role','tab');
   b.setAttribute('aria-selected', String(o.id===actif));
   b.innerHTML=`<span>${apri.esc(apri.t(o.fr,o.en))}</span>`;
   b.onclick=()=>surChoix(o.id);
   bar.append(b);
  });
  return bar;
 },
 /** go to a section (and tab) */
 aller(section, onglet){
  const h = '#'+section+(onglet?'/'+onglet:'');
  location.hash=h;
 },
 /** open tab of a section */
 onglet(section){ return etat[section]; },
};
window.apri = apri;

async function dessiner(id){
 const r = rendus.get(id); if(!r) return;
 const el = r.el;
 try{ await r.mod.default(el, apri, etat[id]); }
 catch(e){ console.error(id, e); el.innerHTML = `<div class="vide">${apri.t('Cette rubrique n\'a pas pu se charger.','This section could not load.')}</div>`; }
}

export async function charger(id){
 if(rendus.has(id)) return rendus.get(id);
 const el = document.getElementById('contenu-'+id);
 const mod = await import(`./${id}.js`);
 if(!etat[id] && mod.onglets?.length) etat[id] = mod.onglets[0].id;
 rendus.set(id, {mod, el});
 await dessiner(id);
 return rendus.get(id);
}

export async function changerLangue(l){
 if(!LANGUES.includes(l)) l = 'fr';
 if(TRADUITES.has(l)) ui = await chargerDico(l+'/ui.json');
 apri.lang = l; document.documentElement.lang = l;
 surveillerDom();
 try{ localStorage.setItem('apri_lang', l); }catch(e){}
 for(const id of rendus.keys()) dessiner(id);
 ecouteurs.forEach(cb=>{ try{cb(l);}catch(e){} });
}

export async function choisirOnglet(id, onglet){
 if(onglet) etat[id] = onglet;
 if(rendus.has(id)) await dessiner(id); else await charger(id);
}

export async function appliquerHash(){
 const [sec, ong] = decodeURIComponent(location.hash.slice(1)).split('/');
 if(!sec) return;
 const cible = document.getElementById(sec); if(!cible) return;
 // the address stays clean: the hash is read, then removed from the bar
 history.replaceState(null, '', location.pathname + location.search);
 if(SECTIONS.some(s=>s.id===sec)) await choisirOnglet(sec, ong);
 cible.scrollIntoView({behavior:'smooth'});
 // sections above may still be drawing and change height: settle on the target
 // unless the reader has started scrolling elsewhere
 const jeton = (appliquerHash.jeton = (appliquerHash.jeton||0)+1);
 for(const ms of [700, 1600, 3000, 5000]){
  setTimeout(()=>{
   if(jeton!==appliquerHash.jeton) return;
   const y = cible.getBoundingClientRect().top;
   if(Math.abs(y) > 4) scrollBy({top:y, behavior:'instant'});
  }, ms);
 }
 const annuler = ()=>{ appliquerHash.jeton++; };
 setTimeout(()=>{ addEventListener('wheel', annuler, {once:true, passive:true}); addEventListener('touchmove', annuler, {once:true, passive:true}); }, 800);
}

export async function menus(){
 // sub-tabs of each section, read from the modules without drawing them
 const out = {};
 await Promise.all(SECTIONS.map(async s=>{
  try{ const m = await import(`./${s.id}.js`); out[s.id] = m.onglets || []; }catch(e){ out[s.id] = []; }
 }));
 return out;
}

/** a section made of sub-tabs, each drawn by js/<section>/<tab>.js (default export render(el, apri)) */
export function sectionAOnglets(section, onglets){
 return async function render(el, apri, actif){
  actif = actif || onglets[0].id;
  el.innerHTML = '';
  el.append(apri.barreOnglets(onglets, actif, id=>apri.aller(section, id)));
  const zone = document.createElement('div'); zone.className = 'zone-onglet'; zone.dataset.onglet = actif;
  zone.innerHTML = `<div class="chargement">${apri.t('Chargement…','Loading…')}</div>`;
  el.append(zone);
  try{ const m = await import(`./${section}/${actif}.js`); zone.innerHTML=''; await m.default(zone, apri); }
  catch(e){ console.error(section, actif, e); zone.innerHTML = `<div class="vide">${apri.t('Cet onglet est en cours de migration.','This tab is being migrated.')}</div>`; }
 };
}

/* Texts written straight into the page by older code paths (not through apri.t)
   are translated as they appear, when the language is Spanish or Creole. */
const ATTRS = ['title','aria-label','placeholder','alt'];
let observateur;
function traduireNoeud(n){
 if(!TRADUITES.has(apri.lang)) return;
 if(n.nodeType===3){
  const p = n.parentNode; if(!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) return;
  const s = n.nodeValue; if(!s || !/[A-Za-zÀ-ÿ]/.test(s)) return;
  const v = traduire(s); if(v!=null && v!==s) n.nodeValue = v;
  return;
 }
 if(n.nodeType!==1 || /^(SCRIPT|STYLE|TEXTAREA|IFRAME)$/.test(n.nodeName)) return;
 for(const a of ATTRS){ const s = n.getAttribute(a); if(s){ const v = traduire(s); if(v!=null && v!==s) n.setAttribute(a, v); } }
 if(n.nodeName==='INPUT' && /^(button|submit)$/.test(n.type) && n.value){ const v = traduire(n.value); if(v!=null) n.value = v; }
 const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
 let x; while((x = w.nextNode())){
  if(x.nodeType===3) traduireNoeud(x);
  else if(!/^(SCRIPT|STYLE|TEXTAREA|IFRAME)$/.test(x.nodeName)) for(const a of ATTRS){ const s = x.getAttribute(a); if(s){ const v = traduire(s); if(v!=null && v!==s) x.setAttribute(a, v); } }
 }
}
function surveillerDom(){
 if(!TRADUITES.has(apri.lang)){ observateur?.disconnect(); observateur = null; return; }
 if(!observateur){
  observateur = new MutationObserver(ms=>{
   for(const m of ms){
    if(m.type==='characterData') traduireNoeud(m.target);
    else m.addedNodes.forEach(traduireNoeud);
   }
  });
  observateur.observe(document.body, {childList:true, subtree:true, characterData:true});
 }
 traduireNoeud(document.body);
}
