/* Shared helpers of the tabs "Scores de résilience", "Comparer" and "Corrélations".
   Ports of explorateur.py (_barres, _tableau, _synthese, _carte), radar.py and the
   JPEG/PDF export of result_export.js. */

export function css(){
 if(!document.querySelector('link[href="css/resultats.css"]'))
  document.head.append(Object.assign(document.createElement('link'),{rel:'stylesheet',href:'css/resultats.css'}));
}

let A = null;                       // the apri object, set by each tab
export function init(apri){ A = apri; css(); }

/* ----------------------------------------------------------- texts and numbers */
let TX = {};
export function textes(t){ TX = t; }
/** TEXTES of explorateur.py, with {placeholders} */
export function T(cle, kw){
 const e = TX[cle]; let s = e ? (A.lang==='en' ? (e.en ?? e.fr) : (e.fr ?? e.en)) : cle;
 if(kw) s = s.replace(/\{(\w+)\}/g, (m,k)=> k in kw ? kw[k] : m);
 return s;
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** _f: fixed decimals, decimal comma in French */
export function f(v, dec=1){
 if(v==null || !isFinite(v)) return '—';
 const s = Number(v).toFixed(dec);
 return A.lang !== 'en' ? s.replace('.', ',') : s;
}
/** _n: a count with thousands separator */
export function n(v){
 const s = Math.trunc(v).toLocaleString('en-US');
 return A.lang !== 'en' ? s.replace(/,/g,' ') : s;
}
export const L = o => o==null ? '' : (typeof o==='object' ? (A.lang==='en' ? (o.en ?? o.fr) : (o.fr ?? o.en)) : o);

/* ------------------------------------------------------------------ widgets */
/** a labelled native select; opts = [[value, label]] ; value null allowed */
export function select({libelle, opts, valeur, surChange, placeholder, cls=''}){
 const w = document.createElement('div'); w.className = 'sc-champ '+cls;
 const id = 'sc'+Math.random().toString(36).slice(2,8);
 w.innerHTML = (libelle!=null?`<label class="libelle" for="${id}">${esc(libelle)}</label>`:'')+`<select class="champ" id="${id}"></select>`;
 const s = w.querySelector('select');
 if(placeholder!=null){ const o = new Option(placeholder, '__nul__'); s.append(o); }
 opts.forEach(([v,l],i)=>{ const o = new Option(l, '__'+i); s.append(o); if(v===valeur) o.selected = true; });
 if(placeholder!=null && (valeur==null || !opts.some(([v])=>v===valeur))) s.value='__nul__';
 s.onchange = ()=>{ const k = s.value; surChange(k==='__nul__' ? null : opts[+k.slice(2)][0]); };
 return w;
}

/** multi-select: chips with a cross, plus a select to add one; empty means all */
export function multi({libelle, opts, valeurs, surChange, placeholder, trier=true}){
 const w = document.createElement('div'); w.className = 'sc-champ sc-multi';
 const lab = v => (opts.find(o=>o[0]===v)||[v,v])[1];
 w.innerHTML = (libelle!=null?`<label class="libelle">${esc(libelle)}</label>`:'')+`<div class="sc-puces"></div>`;
 const puces = w.querySelector('.sc-puces');
 valeurs.forEach(v=>{
  const b = document.createElement('button'); b.type='button'; b.className='sc-puce';
  b.innerHTML = `${esc(lab(v))}<span aria-hidden="true">✕</span>`; b.title = A.t('Retirer','Remove');
  b.onclick = ()=>surChange(valeurs.filter(x=>x!==v));
  puces.append(b);
 });
 const reste = opts.filter(o=>!valeurs.includes(o[0]));
 if(reste.length){
  const s = document.createElement('select'); s.className='champ sc-ajout';
  s.append(new Option(valeurs.length ? '＋' : (placeholder||'…'), ''));
  reste.forEach(([v,l],i)=>s.append(new Option(l, String(i))));
  s.onchange = ()=>{ if(s.value==='') return; const v = [...valeurs, reste[+s.value][0]]; if(trier) v.sort((a,b)=>opts.findIndex(o=>o[0]===a)-opts.findIndex(o=>o[0]===b)); surChange(v); };
  puces.append(s);
 }
 return w;
}

/** searchable list (the Streamlit selectbox filters as one types) */
export function chercheur({libelle, opts, valeur, surChange, placeholder}){
 const w = document.createElement('div'); w.className = 'sc-champ sc-cherche';
 const id = 'sc'+Math.random().toString(36).slice(2,8);
 const cur = opts.find(o=>o[0]===valeur);
 w.innerHTML = (libelle!=null?`<label class="libelle" for="${id}">${esc(libelle)}</label>`:'')+
  `<div class="sc-cb"><input class="champ" id="${id}" autocomplete="off" role="combobox" aria-expanded="false" placeholder="${esc(placeholder||'')}">`+
  (cur?`<button type="button" class="sc-vider" aria-label="${esc(A.t('Effacer','Clear'))}">✕</button>`:'')+
  `<div class="sc-liste" role="listbox" hidden></div></div>`;
 const inp = w.querySelector('input'), liste = w.querySelector('.sc-liste');
 inp.value = cur ? cur[1] : '';
 let actifs = [], pos = -1;
 const dessiner = ()=>{
  const q = A.plier(inp.value===(cur&&cur[1]) ? '' : inp.value).trim();
  const mots = q.split(/\s+/).filter(Boolean);
  actifs = opts.filter(o=>{ const t = A.plier(o[1]); return mots.every(m=>t.includes(m)); }).slice(0,300);
  liste.innerHTML = actifs.length ? actifs.map((o,i)=>`<div role="option" data-i="${i}" class="${o[0]===valeur?'pris':''}${i===pos?' vise':''}">${esc(o[1])}</div>`).join('')
   : `<div class="sc-rien">${esc(A.t('Aucun résultat','No results'))}</div>`;
 };
 const ouvrir = ()=>{ pos=-1; dessiner(); liste.hidden=false; inp.setAttribute('aria-expanded','true'); };
 const fermer = ()=>{ liste.hidden=true; inp.setAttribute('aria-expanded','false'); inp.value = cur ? cur[1] : ''; };
 inp.addEventListener('focus', ()=>{ inp.select(); ouvrir(); });
 inp.addEventListener('input', ()=>{ pos=-1; dessiner(); liste.hidden=false; });
 inp.addEventListener('keydown', e=>{
  if(e.key==='ArrowDown'){ pos=Math.min(pos+1, actifs.length-1); dessiner(); e.preventDefault(); liste.querySelector('.vise')?.scrollIntoView({block:'nearest'}); }
  else if(e.key==='ArrowUp'){ pos=Math.max(pos-1,0); dessiner(); e.preventDefault(); liste.querySelector('.vise')?.scrollIntoView({block:'nearest'}); }
  else if(e.key==='Enter'){ const o = actifs[pos<0?0:pos]; if(o){ e.preventDefault(); liste.hidden=true; surChange(o[0]); } }
  else if(e.key==='Escape'){ fermer(); inp.blur(); }
 });
 liste.addEventListener('mousedown', e=>{ const d = e.target.closest('[data-i]'); if(!d) return; e.preventDefault(); liste.hidden=true; surChange(actifs[+d.dataset.i][0]); });
 inp.addEventListener('blur', ()=>setTimeout(fermer, 120));
 w.querySelector('.sc-vider')?.addEventListener('click', ()=>surChange(null));
 return w;
}

/** a folded panel that remembers whether it is open */
export function pli(titre, ouvert, surBascule){
 const d = document.createElement('details'); d.className='pli sc-pli'; d.open = !!ouvert;
 d.innerHTML = `<summary>${esc(titre)}</summary><div class="sc-pli-c"></div>`;
 d.addEventListener('toggle', ()=>surBascule && surBascule(d.open));
 return [d, d.querySelector('.sc-pli-c')];
}
export function info(texte){ return `<div class="sc-info">${esc(texte)}</div>`; }
export function note(texte, style=''){ return `<p class="note sc-note"${style?` style="${style}"`:''}>${esc(texte)}</p>`; }

/* ----------------------------------------------------------------- charts */
const ENCRE='#101728', ENCRE3='#6b7590', VERT_APRI='#2a6b3f', GRIS='#8a93a5', ROUGE='#c33a24';
export const COUL = {ENCRE, ENCRE3, VERT_APRI, GRIS, ROUGE};

/** _barres: the bar chart (mesure 'part' 0-100 or 'score' 0-10) */
export function barres(lignes, ens, mesure, {fragile=20, large=null}={}){
 if(!lignes.length) return '';
 const vmax = mesure==='part' ? 100 : 10, dec = mesure==='part' ? 0 : 2;
 const unite = mesure==='part' ? (A.lang==='en'?'%':' %') : '';
 const etroit = (large ?? 1000) < 640;
 const LARG = etroit ? 620 : 1000, H_L = 30, GAP = 9, H_AXE = 26;
 const long = Math.max(0, ...lignes.map(l=>(l.nom||'').length));
 let mg = Math.min(430, Math.max(210, Math.round(6.4*long)+14));
 if(etroit) mg = Math.min(mg, 230);
 const maxCar = Math.floor((mg-16)/6.6);
 const MG_H = 26, MG_B = 30;
 const nAxes = new Set(lignes.map(l=>l.axe).filter(Boolean)).size;
 const H = MG_H + lignes.length*(H_L+GAP) + Math.max(nAxes-1,0)*H_AXE + MG_B;
 const avecBrut = lignes.some(l=>l.raw!=null);
 const RESERVE = avecBrut ? (etroit?190:300) : (etroit?110:160), X_N = LARG-2;
 const utile = LARG - mg - RESERVE;
 const p = []; let axeVu = null, y = MG_H;
 if(ens && ens.part!=null){
  const x = mg + utile*Math.min(ens.part,vmax)/vmax;
  p.push(`<line x1="${x.toFixed(1)}" y1="${MG_H-12}" x2="${x.toFixed(1)}" y2="${H-MG_B+6}" stroke="${ENCRE3}" stroke-width="1" stroke-dasharray="3 4"/>`+
   `<text x="${x.toFixed(1)}" y="${MG_H-17}" text-anchor="middle" font-size="11" fill="${ENCRE3}">${esc(T('ex_ens'))} ${f(ens.part,dec)}${unite}</text>`);
 }
 for(const l of lignes){
  const pale = mesure==='part' && l.n < fragile;
  let coul = pale ? '#a8cbb6' : VERT_APRI;
  if(l.rang==='bas') coul = pale ? '#e6b98a' : '#c2761a';
  else if(l.rang==='haut' && !pale) coul = '#1a6b52';
  if(l.axe && l.axe!==axeVu){
   if(axeVu!==null) y += H_AXE;
   axeVu = l.axe;
   p.push(`<text x="0" y="${y-8}" font-size="9.5" font-weight="700" letter-spacing="1.2" fill="${GRIS}">${esc(l.axe.toUpperCase())}</text>`);
  }
  let nom = l.nom || '';
  const titre = nom;
  if(nom.length > maxCar && etroit) nom = nom.slice(0, maxCar-1)+'…';
  p.push(`<text x="${mg-12}" y="${y+15}" text-anchor="end" font-size="12.5" fill="${ENCRE}"><title>${esc(titre)}</title>${esc(nom)}</text>`+
   `<rect x="${mg}" y="${y+3}" width="${utile}" height="16" rx="8" fill="#eef3f0"/>`);
  if(l.part!=null){
   const w = Math.max(utile*Math.min(l.part,vmax)/vmax, 2);
   p.push(`<rect x="${mg}" y="${y+3}" width="${w.toFixed(1)}" height="16" rx="8" fill="${coul}"/>`+
    `<text x="${mg+utile+14}" y="${y+15}" font-size="12.5" font-weight="700" fill="${ENCRE}">${f(l.part,dec)}${unite}</text>`);
  } else if(l.supp){
   p.push(`<text x="${mg+utile+14}" y="${y+15}" font-size="11.5" fill="${GRIS}">n &lt; 5</text>`);
  }
  if(mesure==='score' && l.raw!=null)
   p.push(`<text x="${mg+utile+(etroit?62:88)}" y="${y+15}" font-size="12.5" font-family="Georgia,serif" font-style="italic" fill="#466c91">${A.lang !== 'en'?'brut':'raw'} : ${esc(l.raw)}</text>`);
  if(mesure==='part' && !l.supp)
   p.push(`<text x="${X_N}" y="${y+15}" font-size="11" fill="${GRIS}" text-anchor="end">${l.k}/${l.n}</text>`);
  y += H_L + GAP;
 }
 return `<svg class="sc-svg" viewBox="0 0 ${LARG} ${H}" width="100%" style="max-width:${LARG}px;display:block" role="img" font-family="Inter,system-ui,sans-serif">${p.join('')}</svg>`;
}

/** _tableau */
export function tableau(lignes, ens, mesure){
 const dec = mesure==='part' ? 1 : 2;
 const unite = mesure==='part' ? (A.lang==='en'?'%':' %') : ' / 10';
 const col = mesure==='part' ? T('ex_part') : T('ex_score');
 const r = [`<div class="sc-defile"><table class="tableau sc-tab"><thead><tr><th>${esc(T('ex_axe'))}</th><th class="num">${esc(col)}</th><th class="num">${mesure==='part'?esc(T('ex_col_n')):'n'}</th></tr></thead><tbody>`];
 const nn = l => l.supp ? 'n < 5' : (mesure==='part' ? `${l.k} / ${l.n}` : String(l.n));
 for(const l of lignes){
  let pt = '';
  if(l.rang==='haut'||l.rang==='bas') pt = `<span class="sc-pt" style="background:${l.rang==='haut'?'#1a6b52':'#c2761a'}"></span>`;
  r.push(`<tr><td>${pt}${esc(l.nom)}</td><td class="num sc-v">${l.part==null?'—':f(l.part,dec)+unite}${brutInline(l.raw)}</td><td class="num">${nn(l)}</td></tr>`);
 }
 if(ens) r.push(`<tr><td>${esc(T('ex_ens'))}</td><td class="num sc-v">${ens.part==null?'—':f(ens.part,dec)+unite}</td><td class="num">${ens.supp?'n < 5':(mesure==='part'?`${ens.k} / ${ens.n}`:ens.n)}</td></tr>`);
 r.push('</tbody></table></div>');
 return r.join('');
}
export function brutInline(raw){
 if(raw==null) return '';
 return `<span class="sc-brut">${A.lang !== 'en'?'brut':'raw'} : ${esc(raw)}</span>`;
}

/** _synthese */
export function synthese(lignes, mesure){
 const vals = lignes.filter(l=>l.part!=null).map(l=>[l.nom,l.part]);
 if(vals.length<2) return '';
 const dec = mesure==='part'?1:2, u = mesure==='part'?(A.lang==='en'?'%':' %'):'';
 const moy = vals.reduce((s,v)=>s+v[1],0)/vals.length;
 let haut = vals[0], bas = vals[0];
 for(const v of vals){ if(v[1]>haut[1]) haut=v; if(v[1]<bas[1]) bas=v; }
 return `<div class="sc-st"><span>${esc(T('ex_b_moy'))} <b>${f(moy,dec)}${u}</b></span>`+
  `<span>${esc(T('ex_b_haut'))} <b>${f(haut[1],dec)}${u}</b> ${esc(haut[0])}</span>`+
  `<span>${esc(T('ex_b_bas'))} <b>${f(bas[1],dec)}${u}</b> ${esc(bas[0])}</span>`+
  `<span>${esc(T('ex_b_ecart'))} <b>${f(haut[1]-bas[1],dec)}${u}</b></span></div>`;
}

/** radar.render_radar_svg */
const SURFACE='#ffffff', INK='#0b0b0b', INK2='#52514e', INK3='#898781', GRID='#d8d7d0', GRID_FAINT='#e7e6e0';
const SERIES = ['#2a78d6','#eb6834','#1baf7a'];
function wrap(t, largeur=16){
 const mots = String(t).split(/\s+/).filter(Boolean), l = []; let cur='';
 for(const m of mots){ const e = (cur+' '+m).trim(); if(e.length<=largeur || !cur) cur=e; else { l.push(cur); cur=m; } }
 if(cur) l.push(cur);
 return l.slice(0,3);
}
const f1 = x => f(x,1);
export function radar(axes, series, taille=620){
 const n = axes.length;
 if(n<3 || !series.length) return '';
 const W = Math.round(taille*1.28), H = taille, cx = W/2, cy = H/2;
 const R = Math.min(W/2-132, H/2-62);
 const ang = axes.map((_,i)=>-Math.PI/2 + 2*Math.PI*i/n);
 const pt = (i,v)=>{ const r = R*Math.max(0,Math.min(v,10))/10; return [cx+r*Math.cos(ang[i]), cy+r*Math.sin(ang[i])]; };
 const p = [];
 for(const a of [2,4,6,8,10]){
  const r = R*a/10;
  p.push(`<polygon points="${ang.map(t=>`${(cx+r*Math.cos(t)).toFixed(1)},${(cy+r*Math.sin(t)).toFixed(1)}`).join(' ')}" fill="none" stroke="${a===10?GRID:GRID_FAINT}" stroke-width="1"${a===10?'':' stroke-dasharray="4 4"'}/>`);
 }
 for(let i=0;i<n;i++){ const [x,y] = pt(i,10); p.push(`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${GRID_FAINT}" stroke-width="1"/>`); }
 for(const a of [2,4,6,8,10]) p.push(`<text class="rg" x="${(cx+5).toFixed(1)}" y="${(cy-R*a/10+4).toFixed(1)}">${a}</text>`);
 p.push(`<text class="rg" x="${(cx+5).toFixed(1)}" y="${(cy+4).toFixed(1)}">0</text>`);
 series.slice(0,3).forEach(([nom, vals, coul],k)=>{
  const col = coul || SERIES[k%3];
  const pts = vals.map((v,i)=>[i,v]).filter(([,v])=>v!=null);
  if(pts.length<3) return;
  const complet = pts.length===n;
  p.push(`<polygon points="${pts.map(([i,v])=>pt(i,v).map(z=>z.toFixed(1)).join(',')).join(' ')}" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-width="2" stroke-linejoin="round"${complet?'':' stroke-dasharray="7 4"'}/>`);
  for(const [i,v] of pts){ const [x,y] = pt(i,v); p.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${col}" stroke="${SURFACE}" stroke-width="2"><title>${esc(nom)} — ${esc(axes[i])} : ${f1(v)} / 10</title></circle>`); }
 });
 if(series.length===1){
  series[0][1].forEach((v,i)=>{ if(v==null) return; const [x,y] = pt(i,v);
   p.push(`<text class="rv" x="${(x+13*Math.cos(ang[i])).toFixed(1)}" y="${(y+13*Math.sin(ang[i])+4).toFixed(1)}">${f1(v)}</text>`); });
 }
 axes.forEach((lab,i)=>{
  let [x,y] = pt(i,10); const ux = Math.cos(ang[i]), uy = Math.sin(ang[i]);
  x += 16*ux; y += 16*uy;
  const anchor = Math.abs(ux)<0.34 ? 'middle' : (ux>0?'start':'end');
  const lignes = wrap(lab);
  const y0 = y - (lignes.length-1)*6.5 + (uy>0.4?5:0);
  lignes.forEach((li,j)=>p.push(`<text class="ra" x="${x.toFixed(1)}" y="${(y0+j*13).toFixed(1)}" text-anchor="${anchor}">${esc(li)}</text>`));
 });
 return `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto" role="img"><style>
.ra{font:12px system-ui,-apple-system,"Segoe UI",sans-serif;fill:${INK2}}
.rg{font:11px system-ui,-apple-system,"Segoe UI",sans-serif;fill:${INK3};font-variant-numeric:tabular-nums}
.rv{font:600 12.5px system-ui,-apple-system,"Segoe UI",sans-serif;fill:${INK};text-anchor:middle;font-variant-numeric:tabular-nums;paint-order:stroke;stroke:${SURFACE};stroke-width:3.5}
</style>${p.join('')}</svg>`;
}
export function legendeRadar(series){
 return '<div class="sc-leg">'+series.slice(0,3).map(([nom,,coul],k)=>`<span><i style="background:${coul||SERIES[k%3]}"></i>${esc(nom)}</span>`).join('')+'</div>';
}

/* ------------------------------------------------------------------- map */
function niceThresholds(vals){
 vals = vals.filter(v=>v!=null);
 if(!vals.length) return [25,50,75];
 const lo = Math.min(...vals), hi = Math.max(...vals), r1 = x=>Math.round(x*10)/10;
 if(hi-lo<0.05) return [r1(lo+0.1), r1(lo+0.2), r1(lo+0.3)];
 let best = null;
 for(const step of [1,2,2.5,5,10,15,20,25]){
  const base = Math.floor(lo/step)*step;
  if(base+3*step<=hi && base+step>lo) best = [base+step, base+2*step, base+3*step];
 }
 if(!best){
  const q = [...vals].sort((a,b)=>a-b);
  best = [q[Math.floor(q.length/4)], q[Math.floor(q.length/2)], q[Math.floor(3*q.length/4)]];
  if(new Set(best).size<3) best = [0.25,0.5,0.75].map(t=>lo+(hi-lo)*t);
 }
 return best.map(r1);
}
const fmtSeuil = x => (Number.isInteger(x) ? String(x) : x.toFixed(1)).replace('.', ',');
const fmtVal = x => x.toFixed(1).replace('.', ',');
/** _carte: values {section: value}; tpl = data/resultats/scores/carte.json; secs = section order */
export function carte(tpl, secs, valeurs, bases, unite=''){
 const vals = secs.map(s=>valeurs[s]);
 if(vals.filter(v=>v!=null).length<2) return null;
 const Tq = niceThresholds(vals), R = tpl.rampe;
 const bin = v=>{ let i=0; for(const t of Tq){ if(v<t) return i; i++; } return i; };
 const box = document.createElement('div'); box.className='sc-carte'; box.innerHTML = tpl.svg;
 const svg = box.querySelector('svg'); svg.removeAttribute('height');
 const u = unite ? ' '+unite : '';
 secs.forEach((s,i)=>{
  const v = valeurs[s];
  svg.querySelectorAll(`path[data-s="${i}"]`).forEach(pth=>pth.setAttribute('fill', v!=null ? R[bin(v)] : '#e1e0d9'));
  svg.querySelectorAll(`title[data-s="${i}"]`).forEach(t=>t.textContent = v!=null ? `${s} — ${fmtVal(v)}${u} (${T('base_carte',{n:bases[s]??''})})` : s);
  const pv = svg.querySelector(`text[data-v="${i}"]`);
  if(pv) pv.textContent = v!=null ? fmtVal(v)+unite : '';
  const pn = svg.querySelector(`text[data-n="${i}"]`);
  if(pn) pn.textContent = (!pv) ? `${s} · ${v!=null ? fmtVal(v)+unite : 'n.d.'}` : s;
 });
 const uu = unite ? ' '+unite : '';
 const leg = [[R[0], T('moins_de',{v:fmtSeuil(Tq[0]),u:uu})],[R[1], T('intervalle',{a:fmtSeuil(Tq[0]),b:fmtSeuil(Tq[1]),u:uu})],
  [R[2], T('intervalle',{a:fmtSeuil(Tq[1]),b:fmtSeuil(Tq[2]),u:uu})],[R[3], T('et_plus',{v:fmtSeuil(Tq[2]),u:uu})]];
 const l = document.createElement('div'); l.className='sc-leg-carte';
 l.innerHTML = leg.map(([c,t])=>`<span><i style="background:${c}"></i>${esc(t)}</span>`).join('');
 box.prepend(l);
 return box;
}

/* -------------------------------------------------------- JPEG / PDF export */
function pdfJpeg(canvas){
 const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.94).split(',')[1]), c=>c.charCodeAt(0));
 const enc = new TextEncoder(), chunks = [], offsets = [0]; let length = 0;
 const put = s=>{ const b = typeof s==='string' ? enc.encode(s) : s; chunks.push(b); length += b.length; };
 const w = 842, h = 842*canvas.height/canvas.width;
 put('%PDF-1.4\n');
 const obj = (k,s)=>{ offsets[k]=length; put(k+' 0 obj\n'+s+'\nendobj\n'); };
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
 offsets[4]=length; put(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); put(jpeg); put('\nendstream\nendobj\n');
 const stream = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
 obj(5,`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}\nendstream`);
 const xref = length; put('xref\n0 6\n0000000000 65535 f \n');
 offsets.slice(1).forEach(o=>put(String(o).padStart(10,'0')+' 00000 n \n'));
 put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(chunks,{type:'application/pdf'});
}
function vers_canvas(svg){
 return new Promise((ok, ko)=>{
  const c = svg.cloneNode(true);
  const vb = svg.viewBox.baseVal; const W = vb && vb.width ? vb.width : svg.clientWidth, H = vb && vb.height ? vb.height : svg.clientHeight;
  c.setAttribute('width', W); c.setAttribute('height', H); c.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)],{type:'image/svg+xml'}));
  const img = new Image();
  img.onload = ()=>{ const k = 2, cv = document.createElement('canvas'); cv.width = W*k; cv.height = H*k;
   const g = cv.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,cv.width,cv.height); g.drawImage(img,0,0,cv.width,cv.height); URL.revokeObjectURL(url); ok(cv); };
  img.onerror = ko; img.src = url;
 });
}
function telecharger(blob, nom){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000); }
/** the "JPEG ↓ PDF ↓" buttons under a chart */
export function exports(cible, nom='apri'){
 const d = document.createElement('div'); d.className='sc-exp';
 d.innerHTML = '<button type="button" class="bouton" data-f="jpg">JPEG ↓</button><button type="button" class="bouton" data-f="pdf">PDF ↓</button>';
 d.onclick = async e=>{
  const b = e.target.closest('button'); if(!b) return;
  const svg = cible.querySelector('svg'); if(!svg) return;
  const cv = await vers_canvas(svg);
  if(b.dataset.f==='jpg') cv.toBlob(bl=>telecharger(bl, nom+'.jpg'), 'image/jpeg', .94);
  else telecharger(pdfJpeg(cv), nom+'.pdf');
 };
 return d;
}

/** a section title in small capitals with a rule (exb-sec) */
export const sec = (t, style='') => `<div class="sc-sec"${style?` style="${style}"`:''}>${esc(t)}<span class="l"></span></div>`;
