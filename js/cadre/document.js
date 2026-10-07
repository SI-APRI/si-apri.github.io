/* Cadre de résilience · Document complet (cadre_page._v_document).
   Streamlit: st.download_button("PDF ↓") for IRLA_UNEP_V4.pdf, then st.pdf(height=760)
   (a scrolling reader with + / − zoom buttons) and pdf_navigation.render() (↑ / ↓ buttons
   that scroll the reader by 90 % of its height). Here the same reader is drawn with
   pdf.js (pages rendered lazily as they come into view); if pdf.js cannot load, the
   browser's own PDF viewer is used instead. */
import {css} from './commun.js';

const PDF = 'data/cadre/IRLA_UNEP_V4.pdf';
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
let charge = null;   // the loaded document, shared across re-renders
let zoom = 1;        // reader zoom, kept across language changes

function chargerPdf(){
 if(!charge) charge = (async()=>{
  const lib = await import(PDFJS+'pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc = PDFJS+'pdf.worker.min.mjs';
  return lib.getDocument({url: PDF}).promise;
 })();
 charge.catch(()=>{ charge = null; });
 return charge;
}

export default async function render(el, apri){
 css();
 const esc = apri.esc;
 el.innerHTML = '';
 const haut = apri.t('Monter dans le document','Scroll document up');
 const bas = apri.t('Descendre dans le document','Scroll document down');
 const racine = apri.h(`<div class="cad-doc">
  <a class="cad-doc-dl" href="${PDF}" download="IRLA_UNEP_V4.pdf">PDF ↓</a>
  <div class="cad-pdf" role="region" aria-label="IRLA_UNEP_V4.pdf">
   <div class="cad-pdf-defile" tabindex="0"><div class="cad-pdf-pages"><div class="chargement">${esc(apri.t('Chargement…','Loading…'))}</div></div></div>
   <nav class="cad-pdf-nav"><button type="button" data-d="-1" title="${esc(haut)}" aria-label="${esc(haut)}">↑</button><button type="button" data-d="1" title="${esc(bas)}" aria-label="${esc(bas)}">↓</button></nav>
   <div class="cad-pdf-zoom"><button type="button" data-z="1" title="${esc(apri.t('Agrandir','Zoom in'))}" aria-label="${esc(apri.t('Agrandir','Zoom in'))}">+</button><button type="button" data-z="-1" title="${esc(apri.t('Réduire','Zoom out'))}" aria-label="${esc(apri.t('Réduire','Zoom out'))}">−</button></div>
  </div></div>`);
 el.append(racine);
 const defile = racine.querySelector('.cad-pdf-defile'), pages = racine.querySelector('.cad-pdf-pages');
 racine.querySelectorAll('.cad-pdf-nav button').forEach(b=>b.onclick=()=>
  defile.scrollBy({top: Number(b.dataset.d)*defile.clientHeight*0.9, behavior:'smooth'}));

 let doc;
 try{ doc = await chargerPdf(); }
 catch(e){
  console.warn('pdf.js', e);
  racine.querySelector('.cad-pdf-zoom').remove();
  pages.innerHTML = `<object class="cad-pdf-natif" data="${PDF}" type="application/pdf"><p class="cad-pdf-repli">${esc(apri.t('Le document ne peut pas s\'afficher ici.','The document cannot be displayed here.'))} <a href="${PDF}" target="_blank" rel="noopener">IRLA_UNEP_V4.pdf</a></p></object>`;
  return;
 }
 if(!el.contains(racine)) return;   // redrawn meanwhile

 // page sizes at scale 1 (PDF points = CSS px, as the Streamlit reader shows them)
 const tailles = [];
 for(let i=1;i<=doc.numPages;i++){ const p = await doc.getPage(i); const v = p.getViewport({scale:1}); tailles.push([v.width, v.height]); }
 if(!el.contains(racine)) return;
 pages.innerHTML = '';
 const cases = tailles.map((t,i)=>{ const c = document.createElement('div'); c.className='cad-pdf-page'; c.dataset.n = i+1; pages.append(c); return c; });

 // fit the width on narrow screens, never wider than the reader
 const echelle = ()=>{ const dispo = defile.clientWidth - 32; const base = Math.min(1, dispo / Math.max(...tailles.map(t=>t[0]))); return base*zoom; };
 const rendues = new Map();   // page -> scale drawn
 function dimensionner(){
  const s = echelle();
  cases.forEach((c,i)=>{ c.style.width = Math.floor(tailles[i][0]*s)+'px'; c.style.height = Math.floor(tailles[i][1]*s)+'px'; });
 }
 async function dessinerPage(c){
  const n = Number(c.dataset.n), s = echelle();
  if(rendues.get(n)===s) return;
  rendues.set(n, s);
  const page = await doc.getPage(n);
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  const v = page.getViewport({scale: s*dpr});
  const cv = document.createElement('canvas'); cv.width = Math.floor(v.width); cv.height = Math.floor(v.height);
  cv.setAttribute('aria-label', apri.t('Page ','Page ')+n);
  await page.render({canvasContext: cv.getContext('2d'), viewport: v}).promise;
  if(rendues.get(n)!==s) return;   // zoom changed while drawing
  c.replaceChildren(cv);
 }
 const visibles = new Set();
 const io = new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){ visibles.add(e.target); dessinerPage(e.target); } else visibles.delete(e.target);
 }), {root: defile, rootMargin: '900px 0px'});
 dimensionner();
 cases.forEach(c=>io.observe(c));

 const zoomer = z=>{
  const rel = defile.scrollTop / Math.max(1, defile.scrollHeight);
  zoom = z; dimensionner();
  defile.scrollTop = rel * defile.scrollHeight;
  visibles.forEach(dessinerPage);
 };
 racine.querySelectorAll('.cad-pdf-zoom button').forEach(b=>b.onclick=()=>{
  const z = Number(b.dataset.z) > 0 ? Math.min(3, zoom*1.25) : Math.max(0.4, zoom/1.25);
  zoomer(Math.round(z*1000)/1000);
 });
 let largeur = defile.clientWidth;
 new ResizeObserver(()=>{ if(Math.abs(defile.clientWidth-largeur)>4){ largeur = defile.clientWidth; zoomer(zoom); } }).observe(defile);
}
