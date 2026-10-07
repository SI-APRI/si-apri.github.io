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
 t(fr, en){ return apri.lang === 'en' ? (en ?? fr) : fr; },
 /** pick from an object {fr, en} or return the value */
 tt(o){ return (o && typeof o === 'object' && ('fr' in o || 'en' in o)) ? apri.t(o.fr, o.en) : o; },
 /** fetch JSON once (path relative to the site root, e.g. 'data/fiches/fiches.json') */
 donnees(chemin){
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
 nombre(n, dec=0){ return n==null||isNaN(n)?'–':Number(n).toLocaleString(apri.lang==='en'?'en-GB':'fr-FR',{minimumFractionDigits:dec,maximumFractionDigits:dec}); },
 pct(x, dec=0){ return x==null||isNaN(x)?'–':apri.nombre(x*100,dec)+(apri.lang==='en'?'%':' %'); },
 /** strip accents and lowercase, for search */
 plier(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); },
 onLangue(cb){ ecouteurs.add(cb); return ()=>ecouteurs.delete(cb); },
 /** draw the standard tab bar; returns the bar element */
 barreOnglets(onglets, actif, surChoix){
  const bar = document.createElement('div'); bar.className='onglets'; bar.setAttribute('role','tablist');
  onglets.forEach((o,i)=>{
   const b=document.createElement('button'); b.type='button'; b.setAttribute('role','tab');
   b.setAttribute('aria-selected', String(o.id===actif));
   b.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span>${apri.esc(apri.t(o.fr,o.en))}</span>`;
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

export function changerLangue(l){
 apri.lang = l; document.documentElement.lang = l;
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
