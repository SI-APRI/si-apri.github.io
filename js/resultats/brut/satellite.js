/* Satellite source (Streamlit: environnement_cadre.render_satellite + satellite_page.render).
   Section-level measurements only, nothing per household. */
import {carte, esc, f, fmt, choix, ENCRE, ENCRE3, VERT_APRI} from './graphes.js';

export default async function render({gauche, droite, apri, etat, redessiner}){
 const D = await apri.donnees('data/resultats/brut/satellite.json');
 const L = apri.lang;
 const T = (cle, kw) => fmt((D.textes[cle] || {})[L] ?? (D.textes[cle] || {}).fr ?? cle, kw);

 // ---- the protocol, folded (environnement_cadre.render_satellite)
 const proto = document.createElement('div'); proto.className = 'brut-proto';
 for(const b of D.protocole[L] || D.protocole.fr){
  if(!b.titre){ if(b.html) proto.insertAdjacentHTML('beforeend', b.html); continue; }
  const d = document.createElement('details'); d.className = 'pli';
  d.innerHTML = `<summary>${esc(b.titre)}</summary><div class="brut-pli-corps">${b.html}</div>`;
  proto.append(d);
 }
 droite.append(proto);

 // ---- the measurements (satellite_page.render)
 const zone = document.createElement('div'); zone.className = 'brut-sat';
 droite.append(zone);
 zone.innerHTML = `<div class="brut-titre-bloc">${esc(T('sat_titre'))}</div><p class="brut-intro">${esc((D.textes.sat_intro_n || {})[L] || '')}</p>`;
 const cats = D.cats;
 if(!cats.includes(etat.cat)) etat.cat = cats[0];
 etat.m ??= {}; etat.forme ??= 'barres';
 zone.append(choix(apri, {label: L === 'fr' ? 'Thème' : 'Theme', cle: 'satcat',
  options: cats.map(c => [c, T('sat_c_' + c)]), valeur: etat.cat,
  surChoix: v => { etat.cat = v || cats[0]; redessiner(); }}));
 const lot = D.mesures.filter(m => m.cat === etat.cat);
 let k = etat.m[etat.cat] ?? 0;
 if(k >= lot.length) k = 0;
 const m = lot[k];
 const premier = Object.values(m.par)[0];
 const rang = document.createElement('div'); rang.className = 'brut-sat-rang';
 zone.append(rang);
 rang.append(choix(apri, {label: T('sat_mesure'), cle: 'satm',
  options: lot.map((x, i) => [i, Object.values(x.par)[0].lib[L]]), valeur: k,
  surChoix: v => { etat.m[etat.cat] = Number(v || 0); redessiner(); }}));
 let annee = '-';
 if(m.annees.length){
  annee = m.annees.includes(etat.annee) ? etat.annee : m.annees[0];
  rang.append(choix(apri, {label: T('sat_annee'), cle: 'sata', options: m.annees.map(a => [a, a]), valeur: annee,
   surChoix: v => { etat.annee = v; redessiner(); }}));
 } else rang.append(document.createElement('div'));
 rang.append(choix(apri, {label: T('sat_format'), cle: 'satf',
  options: ['barres', 'carte', 'tableau'].map(x => [x, T('sat_' + x)]), valeur: etat.forme,
  surChoix: v => { etat.forme = v || 'barres'; redessiner(); }}));

 const p = m.par[annee] || premier;
 const vals = p.vals, moy = p.moy, lib = p.lib[L];
 const dessin = document.createElement('div'); dessin.className = 'brut-dessin';
 zone.append(dessin);
 let forme = etat.forme;
 if(forme === 'carte'){
  const html = await carte(apri, vals, {polarite: m.pol, unite: m.unite || ''});
  if(html == null) forme = 'barres'; else dessin.innerHTML = html;
 }
 if(forme === 'barres') dessin.innerHTML = barresSat(vals, m.unite, m.dec, moy, L, T('sat_ens'));
 else if(forme === 'tableau'){
  dessin.innerHTML = `<div class="brut-tabwrap"><table class="tableau brut-tab"><thead><tr><th>${esc(T('sat_col_sec'))}</th><th class="num">${esc(lib)}</th></tr></thead><tbody>`
   + Object.entries(vals).map(([s, v]) => `<tr><td>${esc(s)}</td><td class="num v">${f(v, m.dec, L)}${esc(m.unite)}</td></tr>`).join('')
   + (moy != null ? `<tr class="brut-tab-ens"><td>${esc(T('sat_ens'))}</td><td class="num v">${f(moy, m.dec, L)}${esc(m.unite)}</td></tr>` : '')
   + '</tbody></table></div>';
 }
 zone.insertAdjacentHTML('beforeend', `<ul class="brut-puces"><li>${esc(T('sat_ventile'))}</li><li><b>${esc(T('sat_source'))}</b> · ${esc(m.src[L])}</li></ul>`);
 if(m.lecture){
  const tpl = m.lecture[L] || m.lecture.fr;
  const lignes = Object.entries(vals).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  zone.insertAdjacentHTML('beforeend', `<div class="brut-lab">${esc(T('sat_lecture'))}</div><ul class="brut-puces">`
   + lignes.map(([s, v]) => `<li>${esc(fmt(tpl, {s, v: f(Math.abs(v), m.dec, L), vs: f(v, m.dec, L), a: m.a0, a2: m.a2}))}</li>`).join('') + '</ul>');
 }
 for(const b of m.dossier[L] || []){
  if(!b.titre) continue;
  const d = document.createElement('details'); d.className = 'pli';
  d.innerHTML = `<summary>${esc(b.titre)}</summary><div class="brut-pli-corps">${b.html}</div>`;
  zone.append(d);
 }
}

/* satellite_page._barres: one bar per section, the territory in dashes, negative values allowed */
function barresSat(vals, unite, dec, moy, L, ensLib){
 const lignes = Object.entries(vals);
 if(!lignes.length) return '';
 const bornes = [...Object.values(vals), ...(moy != null ? [moy] : []), 0];
 const vmin = Math.min(...bornes), vmax = Math.max(...bornes);
 const etendue = (vmax - vmin) || 1;
 const LARG = 1000, H_L = 28, GAP = 9, MG_G = 190, MG_H = 30, MG_B = 22;
 const H = MG_H + lignes.length * (H_L + GAP) + MG_B;
 const utile = LARG - MG_G - 120;
 const x0 = MG_G + utile * (0 - vmin) / etendue;
 const p = [];
 let y = MG_H;
 if(moy != null){
  const x = MG_G + utile * (moy - vmin) / etendue;
  p.push(`<line x1="${x.toFixed(1)}" y1="${MG_H - 14}" x2="${x.toFixed(1)}" y2="${H - MG_B + 4}" stroke="${ENCRE3}" stroke-width="1" stroke-dasharray="3 4"/>`
   + `<text x="${x.toFixed(1)}" y="${MG_H - 19}" text-anchor="middle" font-size="11" fill="${ENCRE3}">${esc(ensLib)} ${f(moy, dec, L)}${esc(unite)}</text>`);
 }
 for(const [nom, v] of lignes){
  const xa = MG_G + utile * (Math.min(v, 0) - vmin) / etendue;
  const xb = MG_G + utile * (Math.max(v, 0) - vmin) / etendue;
  p.push(`<text x="${MG_G - 12}" y="${y + 15}" text-anchor="end" font-size="12.5" fill="${ENCRE}">${esc(nom)}</text>`
   + `<rect x="${xa.toFixed(1)}" y="${y + 3}" width="${Math.max(xb - xa, 2).toFixed(1)}" height="16" rx="4" fill="${VERT_APRI}"/>`
   + `<text x="${LARG - 4}" y="${y + 15}" text-anchor="end" font-size="12.5" font-weight="700" fill="${ENCRE}">${f(v, dec, L)}${esc(unite)}</text>`);
  y += H_L + GAP;
 }
 p.push(`<line x1="${x0.toFixed(1)}" y1="${MG_H - 2}" x2="${x0.toFixed(1)}" y2="${H - MG_B + 2}" stroke="#d8e0ea" stroke-width="1"/>`);
 return `<svg viewBox="0 0 ${LARG} ${H}" width="100%" style="max-width:${LARG}px;display:block" role="img" font-family="Inter,system-ui,sans-serif">${p.join('')}</svg>`;
}
