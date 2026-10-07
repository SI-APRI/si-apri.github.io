/* Drawings shared by the raw-results screens, ported from explorateur.py,
   radar.py and map_render.py (same geometry, same colours). */

export const ENCRE = '#101728', ENCRE3 = '#6b7590', GRIS = '#8a93a5', VERT_APRI = '#2a6b3f';

export function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/** explorateur._f: fixed decimals, decimal comma in French */
export function f(v, dec = 1, lang = 'fr'){
 if(v == null || Number.isNaN(v)) return '—';
 const s = Number(v).toFixed(dec);
 return lang === 'fr' ? s.replace('.', ',') : s;
}
/** explorateur._n: thousands separated by a narrow space in French */
export function n(v, lang = 'fr'){
 const s = Math.trunc(v).toLocaleString('en-US');
 return lang === 'fr' ? s.replace(/,/g, ' ') : s;
}
/** "{a} and {b}" style templates of the Streamlit dictionary */
export function fmt(t, kw = {}){
 return String(t ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in kw ? String(kw[k]) : m));
}

/* ------------------------------------------------------------- bar chart */
export function barres(lignes, ens, opts){
 const {lang, ensLib, fragile = 20, vmax = 100, dec = 0, unite = ' %'} = opts;
 if(!lignes.length) return '';
 const LARG = 1000, H_L = 30, GAP = 9, H_AXE = 26;
 const long = Math.max(0, ...lignes.map(l => (l.nom || '').length));
 const MG_G = Math.min(430, Math.max(210, Math.trunc(6.4 * long) + 14)), MG_H = 26, MG_B = 30;
 const nAxes = new Set(lignes.filter(l => l.axe).map(l => l.axe)).size;
 const H = MG_H + lignes.length * (H_L + GAP) + Math.max(nAxes - 1, 0) * H_AXE + MG_B;
 const RESERVE = 160, X_N = LARG - 2;
 const utile = LARG - MG_G - RESERVE;
 const p = [];
 let axeVu = null, y = MG_H;
 if(ens && ens.part != null){
  const x = MG_G + utile * ens.part / vmax;
  p.push(`<line x1="${x.toFixed(1)}" y1="${MG_H - 12}" x2="${x.toFixed(1)}" y2="${H - MG_B + 6}" stroke="${ENCRE3}" stroke-width="1" stroke-dasharray="3 4"/>`
   + `<text x="${x.toFixed(1)}" y="${MG_H - 17}" text-anchor="middle" font-size="11" fill="${ENCRE3}">${esc(ensLib)} ${f(ens.part, dec, lang)}${unite}</text>`);
 }
 for(const l of lignes){
  const pale = l.supp || l.n < fragile;
  let coul = pale ? '#a8cbb6' : VERT_APRI;
  if(l.rang === 'bas') coul = pale ? '#e6b98a' : '#c2761a';
  else if(l.rang === 'haut' && !pale) coul = '#1a6b52';
  if(l.axe && l.axe !== axeVu){
   if(axeVu !== null) y += H_AXE;
   axeVu = l.axe;
   p.push(`<text x="0" y="${y - 8}" font-size="9.5" font-weight="700" letter-spacing="1.2" fill="${GRIS}">${esc(l.axe.toUpperCase())}</text>`);
  }
  p.push(`<text x="${MG_G - 12}" y="${y + 15}" text-anchor="end" font-size="12.5" fill="${ENCRE}">${esc(l.nom)}</text>`
   + `<rect x="${MG_G}" y="${y + 3}" width="${utile}" height="16" rx="8" fill="#eef3f0"/>`);
  if(l.part != null){
   const w = Math.max(utile * Math.min(l.part, vmax) / vmax, 2);
   p.push(`<rect x="${MG_G}" y="${y + 3}" width="${w.toFixed(1)}" height="16" rx="8" fill="${coul}"/>`
    + `<text x="${MG_G + utile + 14}" y="${y + 15}" font-size="12.5" font-weight="700" fill="${ENCRE}">${f(l.part, dec, lang)}${unite}</text>`);
  }
  if(l.supp){
   p.push(`<text x="${MG_G + utile + 14}" y="${y + 15}" font-size="12.5" font-style="italic" fill="${GRIS}">n &lt; 5</text>`);
  } else if(opts.compte !== false){
   p.push(`<text x="${X_N}" y="${y + 15}" font-size="11" fill="${GRIS}" text-anchor="end">${l.k}/${l.n}</text>`);
  }
  y += H_L + GAP;
 }
 return `<svg viewBox="0 0 ${LARG} ${H}" width="100%" style="max-width:${LARG}px;display:block" role="img" font-family="Inter,system-ui,sans-serif">${p.join('')}</svg>`;
}

/* ---------------------------------------------------------------- radar */
const R_INK = '#0b0b0b', R_INK2 = '#52514e', R_INK3 = '#898781', R_GRID = '#d8d7d0', R_FAINT = '#e7e6e0';
function wrap(texte, largeur = 16){
 const mots = String(texte).split(/\s+/).filter(Boolean), lignes = [];
 let cur = '';
 for(const m of mots){
  const essai = (cur + ' ' + m).trim();
  if(essai.length <= largeur || !cur) cur = essai; else { lignes.push(cur); cur = m; }
 }
 if(cur) lignes.push(cur);
 return lignes.slice(0, 3);
}
export function radar(axes, series, taille = 430){
 const nb = axes.length;
 if(nb < 3 || !series.length) return '';
 const fr1 = x => x.toFixed(1).replace('.', ',');
 const W = Math.trunc(taille * 1.28), H = taille, cx = W / 2, cy = H / 2;
 const R = Math.min(W / 2 - 132, H / 2 - 62), VMAX = 10;
 const ang = axes.map((_, i) => -Math.PI / 2 + 2 * Math.PI * i / nb);
 const pt = (i, v) => { const r = R * Math.max(0, Math.min(v, VMAX)) / VMAX; return [cx + r * Math.cos(ang[i]), cy + r * Math.sin(ang[i])]; };
 const p = [];
 for(const a of [2, 4, 6, 8, 10]){
  const r = R * a / VMAX;
  const poly = ang.map(t => `${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`).join(' ');
  p.push(`<polygon points="${poly}" fill="none" stroke="${a === 10 ? R_GRID : R_FAINT}" stroke-width="1"${a === 10 ? '' : ' stroke-dasharray="4 4"'}/>`);
 }
 for(let i = 0; i < nb; i++){ const [x, y] = pt(i, VMAX); p.push(`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${R_FAINT}" stroke-width="1"/>`); }
 for(const a of [2, 4, 6, 8, 10]) p.push(`<text class="rg" x="${(cx + 5).toFixed(1)}" y="${(cy - R * a / VMAX + 4).toFixed(1)}">${a}</text>`);
 p.push(`<text class="rg" x="${(cx + 5).toFixed(1)}" y="${(cy + 4).toFixed(1)}">0</text>`);
 series.slice(0, 3).forEach(([nom, vals, col]) => {
  const pts = vals.map((v, i) => [i, v]).filter(([, v]) => v != null);
  if(pts.length < 3) return;
  const poly = pts.map(([i, v]) => pt(i, v).map(z => z.toFixed(1)).join(',')).join(' ');
  p.push(`<polygon points="${poly}" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-width="2" stroke-linejoin="round"${pts.length === nb ? '' : ' stroke-dasharray="7 4"'}/>`);
  for(const [i, v] of pts){ const [x, y] = pt(i, v); p.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${col}" stroke="#fff" stroke-width="2"><title>${esc(nom)} — ${esc(axes[i])} : ${fr1(v)} / 10</title></circle>`); }
 });
 if(series.length === 1){
  series[0][1].forEach((v, i) => {
   if(v == null) return;
   const [x, y] = pt(i, v);
   p.push(`<text class="rv" x="${(x + 13 * Math.cos(ang[i])).toFixed(1)}" y="${(y + 13 * Math.sin(ang[i]) + 4).toFixed(1)}">${fr1(v)}</text>`);
  });
 }
 axes.forEach((lab, i) => {
  let [x, y] = pt(i, VMAX);
  const ux = Math.cos(ang[i]), uy = Math.sin(ang[i]);
  x += 16 * ux; y += 16 * uy;
  const anchor = Math.abs(ux) < 0.34 ? 'middle' : (ux > 0 ? 'start' : 'end');
  const lignes = wrap(lab);
  const y0 = y - (lignes.length - 1) * 6.5 + (uy > 0.4 ? 5 : 0);
  lignes.forEach((l, j) => p.push(`<text class="ra" x="${x.toFixed(1)}" y="${(y0 + j * 13).toFixed(1)}" text-anchor="${anchor}">${esc(l)}</text>`));
 });
 return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto" role="img">
 <style>.ra{font:12px Inter,system-ui,sans-serif;fill:${R_INK2}}.rg{font:11px Inter,system-ui,sans-serif;fill:${R_INK3};font-variant-numeric:tabular-nums}
 .rv{font:600 12.5px Inter,system-ui,sans-serif;fill:${R_INK};text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:3.5}</style>${p.join('')}</svg>`;
}

/* ------------------------------------------------------------------ map */
export function seuilsRonds(vals){
 vals = vals.filter(v => v != null);
 const r1 = x => Math.round(x * 10) / 10;
 if(!vals.length) return [25, 50, 75];
 const lo = Math.min(...vals), hi = Math.max(...vals);
 if(hi - lo < 0.05) return [r1(lo + 0.1), r1(lo + 0.2), r1(lo + 0.3)];
 let best = null;
 for(const step of [1, 2, 2.5, 5, 10, 15, 20, 25]){
  const base = Math.floor(lo / step) * step;
  if(base + 3 * step <= hi && base + step > lo) best = [base + step, base + 2 * step, base + 3 * step];
 }
 if(!best){
  const q = [...vals].sort((a, b) => a - b);
  best = [q[Math.trunc(q.length / 4)], q[Math.trunc(q.length / 2)], q[Math.trunc(3 * q.length / 4)]];
  if(new Set(best).size < 3) best = [0.25, 0.5, 0.75].map(k => lo + (hi - lo) * k);
 }
 return best.map(r1);
}
const fmtSeuil = x => (Number.isInteger(x) ? x.toFixed(0) : x.toFixed(1)).replace('.', ',');
const fmtVal = x => x.toFixed(1).replace('.', ',');
function classe(v, T){ let i = 0; for(const t of T){ if(v < t) return i; i++; } return i; }

/** values: {section: number}; base: {section: n} or null; returns HTML (legend + svg) */
export async function carte(apri, values, {polarite = 'neutre', unite = '%', base = null} = {}){
 const sk = await apri.donnees(`data/resultats/brut/carte_${apri.lang}.json`);
 const vals = Object.values(values).filter(v => v != null);
 if(vals.length < 2) return null;
 const T = seuilsRonds(vals);
 const ramp = sk.ramps[polarite] || sk.ramps.neutre;
 const tx = sk.textes || {};
 const doc = new DOMParser().parseFromString(sk.svg, 'image/svg+xml');
 const svg = doc.documentElement;
 svg.removeAttribute('width'); svg.setAttribute('width', '100%');
 const parJeton = {};
 for(const [s, j] of Object.entries(sk.jetons)) parJeton[j] = s;
 svg.querySelectorAll('path.sec').forEach(pth => {
  const t = pth.querySelector('title');
  const nom = (t?.textContent || '').split(' — ')[0];
  const v = values[nom];
  pth.setAttribute('fill', v != null ? ramp[classe(v, T)][0] : '#e1e0d9');
  if(t){
   const bt = base && base[nom] != null ? ' (' + fmt(apri.t('base : {n}', 'base: {n}'), {n: base[nom]}) + ')' : '';
   t.textContent = v != null ? `${nom} — ${fmtVal(v)}${unite ? ' ' + unite : ''}${bt}` : nom;
  }
 });
 svg.querySelectorAll('text.pv, text.pn').forEach(el => {
  const s = el.textContent;
  for(const [j, nom] of Object.entries(parJeton)){
   if(s.includes(j)){
    const v = values[nom];
    el.textContent = s.replace(j, v != null ? fmtVal(v) + unite : 'n.d.');
    break;
   }
  }
 });
 const u = unite ? ' ' + unite : '';
 const L = apri.lang === 'en'
  ? [`under ${fmtSeuil(T[0])}${u}`, `${fmtSeuil(T[0])} – ${fmtSeuil(T[1])}${u}`, `${fmtSeuil(T[1])} – ${fmtSeuil(T[2])}${u}`, `${fmtSeuil(T[2])}${u} and above`]
  : [`moins de ${fmtSeuil(T[0])}${u}`, `${fmtSeuil(T[0])} – ${fmtSeuil(T[1])}${u}`, `${fmtSeuil(T[1])} – ${fmtSeuil(T[2])}${u}`, `${fmtSeuil(T[2])}${u} et plus`];
 const legende = L.map((lab, i) => `<span class="brut-leg"><i style="background:${ramp[i][0]}"></i>${esc(lab)}</span>`).join('');
 return `<div class="brut-legende">${legende}</div><div class="brut-carte">${new XMLSerializer().serializeToString(svg)}</div>`;
}

/** a simple select element */
export function choix(apri, {label, options, valeur, surChoix, vide = null, cle = ''}){
 const id = 'brut-' + (cle || Math.random().toString(36).slice(2));
 const div = document.createElement('div');
 div.className = 'brut-champ';
 div.innerHTML = `<label class="libelle" for="${id}">${esc(label)}</label><select class="champ" id="${id}"></select>`;
 const sel = div.querySelector('select');
 if(vide != null){ const o = document.createElement('option'); o.value = ''; o.textContent = vide; sel.append(o); }
 for(const [v, t] of options){ const o = document.createElement('option'); o.value = String(v); o.textContent = t; sel.append(o); }
 sel.value = valeur == null ? '' : String(valeur);
 sel.onchange = () => surChoix(sel.value === '' ? null : sel.value);
 return div;
}
