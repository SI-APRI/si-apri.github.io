/* Shared helpers for the "Cadre de résilience" tabs (port of cadre_page.py). */

export function css(){
 if(!document.querySelector('link[href="css/cadre.css"]'))
  document.head.append(Object.assign(document.createElement('link'),{rel:'stylesheet',href:'css/cadre.css'}));
}

export const donnees = apri => apri.donnees('data/cadre/cadre.json');

/** T(key, {params}) in the current language, from the exported TEXTES of cadre_page.py */
export function traducteur(d, apri){
 const tx = d.textes[apri.lang] || d.textes.fr;
 return (k, kw) => {
  let s = tx[k] ?? d.textes.fr[k] ?? k;
  if(kw) for(const [a,b] of Object.entries(kw)) s = s.split('{'+a+'}').join(b);
  return s;
 };
}

/** _fmt: French decimal comma and thin spaces, as Streamlit does in both languages */
export function fmt(v, dec=1){
 if(v==null || isNaN(v)) return '—';
 v = Number(v);
 // Python's format rounds an exact tie to even (2.25 -> "2.2"); toFixed rounds it up.
 const k = v * 2 * 10**dec, p5 = 5**dec;
 let s;
 if(Number.isInteger(k) && k % p5 === 0 && k % 2 !== 0 && k / (2*10**dec) === v){
  let n = (k - Math.sign(k)) / 2;        // the candidate toward zero
  if(Math.abs(n) % 2) n += Math.sign(k); // pick the even neighbour
  s = (n / 10**dec).toFixed(dec);
 } else s = v.toFixed(dec);
 const [ent, fr] = s.split('.');
 return ent.replace(/\B(?=(\d{3})+(?!\d))/g,' ') + (fr ? ','+fr : '');
}

const ECHELLE = ["#e92720","#f45b1f","#f9ac23","#fdd019","#fce829","#c7db33","#6fc63a","#43932f","#336b2b","#2b5626","#1f4019"];
export function teinte(t){ t=Math.max(0,Math.min(1,t)); return ECHELLE[Math.round(t*(ECHELLE.length-1))]; }
export function encre(c){
 const r=parseInt(c.slice(1,3),16), v=parseInt(c.slice(3,5),16), b=parseInt(c.slice(5,7),16);
 return (0.299*r+0.587*v+0.114*b) > 150 ? '#22261a' : '#fff';
}
export function bandesCss(){
 const p = 100/ECHELLE.length;
 return ECHELLE.map((c,i)=>`${c} ${(i*p).toFixed(4)}% ${((i+1)*p).toFixed(4)}%`).join(', ');
}

/** An HTML document shown in a same-origin iframe that grows to fit its content
    (Streamlit used components.html with a fixed height and an inner scroll bar). */
export function cadreHtml(html, minH=200, titre=''){
 const f = document.createElement('iframe');
 f.className = 'cad-cadre-if'; f.title = titre; f.style.height = minH+'px';
 f.setAttribute('scrolling','no');
 let max = minH;
 f.addEventListener('load', ()=>{
  const doc = f.contentDocument; if(!doc) return;
  const ajuster = ()=>{ const h = Math.ceil(doc.documentElement.scrollHeight); if(h>max-1 || h>minH){ max=Math.max(max,h); f.style.height = max+'px'; } };
  ajuster();
  try{ new ResizeObserver(ajuster).observe(doc.body); }catch(e){}
  setTimeout(ajuster, 600); setTimeout(ajuster, 1600);
 });
 f.srcdoc = html;
 return f;
}

/* ---------- download controls (port of result_export.js) ---------- */
function telecharger(blob, ext){
 const url=URL.createObjectURL(blob), a=document.createElement('a');
 a.href=url; a.download='APRI-resultat.'+ext; document.body.append(a); a.click(); a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function pdfJpeg(canvas){
 const jpeg=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.94).split(',')[1]),c=>c.charCodeAt(0));
 const enc=new TextEncoder(), chunks=[], offsets=[0]; let length=0;
 const put=s=>{const b=typeof s==='string'?enc.encode(s):s;chunks.push(b);length+=b.length;};
 const w=842,h=842*canvas.height/canvas.width;
 put('%PDF-1.4\n');
 function obj(n,s){offsets[n]=length;put(n+' 0 obj\n'+s+'\nendobj\n');}
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
 offsets[4]=length;put(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);put(jpeg);put('\nendstream\nendobj\n');
 const stream=`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
 obj(5,`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}\nendstream`);
 const xref=length;put('xref\n0 6\n0000000000 65535 f \n');
 offsets.slice(1).forEach(o=>put(String(o).padStart(10,'0')+' 00000 n \n'));
 put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(chunks,{type:'application/pdf'});
}
async function captureSvg(svg){
 const win=svg.ownerDocument.defaultView, rect=svg.getBoundingClientRect(), clone=svg.cloneNode(true);
 const orig=[svg,...svg.querySelectorAll('*')], copies=[clone,...clone.querySelectorAll('*')];
 orig.forEach((n,i)=>{const cs=win.getComputedStyle(n);['font-family','font-size','font-weight','font-style','fill','stroke','stroke-width','stroke-dasharray','opacity','text-anchor','dominant-baseline'].forEach(k=>copies[i].style.setProperty(k,cs.getPropertyValue(k)));});
 clone.setAttribute('xmlns','http://www.w3.org/2000/svg'); clone.setAttribute('width',rect.width); clone.setAttribute('height',rect.height);
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const img=new Image(); await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=url;});
  const c=document.createElement('canvas'); c.width=Math.ceil(rect.width*2); c.height=Math.ceil(rect.height*2);
  const ctx=c.getContext('2d'); ctx.fillStyle='white'; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(img,0,0,c.width,c.height); return c;
 } finally { URL.revokeObjectURL(url); }
}
/** JPEG ↓ PDF ↓ for an SVG (getSvg returns the element when clicked), or CSV ↓ for a table */
export function barreExport(apri, cible, table=false){
 const bar=document.createElement('div'); bar.className='cad-export';
 const etat=document.createElement('span'); etat.setAttribute('role','status');
 (table?['csv']:['jpeg','pdf']).forEach(fmt=>{
  const b=document.createElement('button'); b.type='button'; b.textContent=fmt.toUpperCase()+' ↓';
  b.onclick=async()=>{
   b.disabled=true; etat.textContent=apri.t('Préparation…','Preparing…');
   try{
    const el = typeof cible==='function' ? cible() : cible;
    if(table){
     const csv=[...el.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('th,td')].map(c=>'"'+c.innerText.replaceAll('"','""')+'"').join(';')).join('\r\n');
     telecharger(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}),'csv');
    } else {
     const canvas=await captureSvg(el);
     const blob=fmt==='pdf'?pdfJpeg(canvas):await new Promise(r=>canvas.toBlob(r,'image/jpeg',.94));
     telecharger(blob, fmt==='jpeg'?'jpg':'pdf');
    }
    etat.textContent='';
   }catch(e){ etat.textContent=apri.t('Téléchargement indisponible pour ce rendu.','Download unavailable for this rendering.'); }
   finally{ b.disabled=false; }
  };
  bar.append(b);
 });
 bar.append(etat);
 return bar;
}
