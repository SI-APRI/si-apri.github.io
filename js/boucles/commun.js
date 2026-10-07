/* Shared by the six tabs of "Boucles de rétroaction": data loading, the system
   chosen once (central variable, size), texts, number format, exports. */
import * as E from './moteur.js';

export const COUL = {
  ENCRE: '#101728', ENCRE2: '#3c4761', ENCRE3: '#6b7590',
  VERT_APRI: '#2a6b3f', VERT: '#1a8a4f', ROUGE: '#c33a24', GRIS: '#8a93a5', AMBRE: '#c9821f',
};

/** THE SYSTEM IS CHOSEN ONCE (systeme_complexe._systeme): the six tabs read the
    same central variable and size, like Streamlit's session keys bcl_centre /
    bcl_n. Kept in memory for the visit. */
export const etat = {
  centre: null, n: 10, pop: 'Total',
  iso: null,          // index of the isolated loop (construire)
  varRel: null,       // variable of the relations tab
  pousse: null,       // pushed variables (simuler); null = never touched
  d: {},              // push of each variable (simuler)
};

const modeles = {};
let donnees = null, textes = null;

export function css() {
  if (!document.querySelector('link[href="css/boucles.css"]'))
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'css/boucles.css' }));
}

/** the model in the current language, and the system coordinates */
export async function charger(apri) {
  css();
  [donnees, textes] = await Promise.all([apri.donnees('data/boucles/modele.json'), apri.donnees('data/boucles/textes.json')]);
  const lang = apri.lang;
  if (!modeles[lang]) modeles[lang] = E.creerModele(donnees, lang);
  const m = modeles[lang];
  const ids = E.trier(m.ids, i => [m.noms[i]]);
  if (!ids.includes(etat.centre)) etat.centre = ids[0];
  if (!m.C.TAILLES.includes(etat.n)) etat.n = 10;
  const s = { centre: etat.centre, pop: etat.pop, n: etat.n, ids };
  return { m, s, T: fabriquerT(lang), f: fabriquerF(lang), L: lang };
}

/* Wording revised after the scientific review (BRIEF_BOUCLES.md): these
   strings replace the Streamlit ones. "Bascule"/"pivot" and "the loops take
   over" described the model's arithmetic, not an ecological tipping point. */
const SURCHARGE = {
  sx_bascule: { fr: 'très reliée', en: 'highly linked' },
  sx_bascule_x: { fr: 'Une variable « très reliée » est prise à la fois dans des boucles qui amplifient et dans des boucles qui freinent : beaucoup d’effets s’y croisent. Ce n’est pas un point de bascule, le modèle n’en connaît pas.',
    en: 'A “highly linked” variable sits both in loops that amplify and in loops that dampen: many effects cross there. It is not a tipping point; the model has none.' },
  sx_col_porte: { fr: 'Effet d’ensemble d’une poussée d’un point', en: 'Overall effect of a one-point push' },
  sx_col_porte_x: { fr: 'Ce que bouge, au total, une poussée d’un point sur cette variable, partout ailleurs dans le système (boucles comprises). C’est un calcul du modèle, pas un compte de flèches.',
    en: 'How much a one-point push on this variable moves, in total, everywhere else in the system (loops included). It is a model calculation, not a count of arrows.' },
  sd_basc: { fr: 'Relais {k} : l’effet a changé de sens pour {v}, une boucle le ramène dans l’autre sens.', en: 'Relay {k}: the effect changed direction for {v}, a loop is bringing it back the other way.' },
  sd_basc_r: { fr: 'Relais {k} : ce relais porte plus que le précédent, le modèle amplifie fortement ce choc à cet endroit.', en: 'Relay {k}: this relay carries more than the one before, the model amplifies this shock strongly here.' },
  sd_basc_b: { fr: 'Relais {k} : ce relais porte moins que le précédent, le choc commence à s’éteindre.', en: 'Relay {k}: this relay carries less than the one before, the shock is starting to fade.' },
  sd_bcl_x: { fr: 'boucles qui passent par elles dans ce périmètre, qui amplifient (R) ou qui freinent (B) ; être dans les deux veut dire que beaucoup d’effets s’y croisent',
    en: 'loops running through them inside this perimeter, amplifying (R) or dampening (B); being in both means many effects cross there' },
  sd_mul_x: { fr: 'ce que bouge au total, ailleurs, une hausse d’un point chez chacune, boucles comprises', en: 'how much a one-point rise in each of them moves elsewhere in total, loops included' },
  sd_connect_x: { fr: 'effet sur la variable poussée d’une hausse d’un point chez chacune, dans ce périmètre, boucles comprises', en: 'effect on the pushed variable of a one-point rise in each of them, inside this perimeter, loops included' },
  sd_leg_e: { fr: 'score sur 10, et une flèche qui dit dans quel sens et combien il bouge', en: 'score out of 10, and an arrow saying which way and how much it moves' },
  sy_intro: { fr: 'Chaque variable porte un niveau sur dix, celui mesuré par l’enquête là où il existe. Cliquez dans une barre pour lui imposer une autre valeur : la variable est alors tenue, l’écart qu’elle crée circule aussitôt dans le modèle, et chaque autre variable monte ou descend selon ce que ses voisines lui font, jusqu’à stabilisation. Ce qui a bougé, et dans quelle mesure, est nommé sous les barres. Lecture et pause servent à reprendre la propagation tour par tour.',
    en: 'Every variable holds a level out of ten, the one measured by the survey where it exists. Click inside a bar to impose a different value: that variable is then held, the gap it creates travels through the model at once, and each other variable rises or falls according to what its neighbours do to it, until everything settles. What moved, and how much, is named under the bars. Play and pause let you take the propagation back round by round.' },
};

function fabriquerT(lang) {
  const T = (cle, kw) => {
    const e = SURCHARGE[cle] || textes[cle];
    let t = e ? (e[lang] ?? e.fr ?? cle) : cle;
    if (kw) t = t.replace(/\{(\w+)\}/g, (x, k) => (k in kw ? String(kw[k]) : x));
    return t;
  };
  T.schema = textes._schema[lang];
  T.prov = textes._provenance[lang];
  return T;
}

/** systeme_complexe._f — fixed decimals, optional sign, French comma */
function fabriquerF(lang) {
  return (v, dec = 2, signe = false) => {
    if (v == null) return '—';
    let s = Number(v).toFixed(dec);
    if (signe && !s.startsWith('-')) s = '+' + s;
    return lang === 'fr' ? s.replace('.', ',') : s;
  };
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** a labelled select, Streamlit selectbox look */
export function choix(libelle, options, valeur, surChange, cls = '') {
  const w = document.createElement('label');
  w.className = 'bcl-champ ' + cls;
  w.innerHTML = `<span class="libelle">${esc(libelle)}</span>`;
  const s = document.createElement('select');
  s.className = 'champ';
  for (const [v, t] of options) {
    const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o);
  }
  s.value = valeur;
  s.onchange = () => surChange(s.value);
  w.append(s);
  return w;
}

// --------------------------------------------------------------- exports
// Ported from result_export.js: under every diagram a JPEG and a PDF button,
// under every table a CSV button.
function telecharger(blob, ext) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'APRI-resultat.' + ext; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function pdfJpeg(canvas) {
  const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', .94).split(',')[1]), c => c.charCodeAt(0));
  const enc = new TextEncoder(), chunks = [], offsets = [0]; let length = 0;
  const put = s => { const b = typeof s === 'string' ? enc.encode(s) : s; chunks.push(b); length += b.length; };
  const w = 842, h = 842 * canvas.height / canvas.width;
  put('%PDF-1.4\n');
  function obj(n, s) { offsets[n] = length; put(n + ' 0 obj\n' + s + '\nendobj\n'); }
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length; put(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); put(jpeg); put('\nendstream\nendobj\n');
  const stream = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}\nendstream`);
  const xref = length; put('xref\n0 6\n0000000000 65535 f \n');
  offsets.slice(1).forEach(o => put(String(o).padStart(10, '0') + ' 00000 n \n'));
  put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}
async function capturer(svg) {
  const rect = svg.getBoundingClientRect(), clone = svg.cloneNode(true);
  const orig = [svg, ...svg.querySelectorAll('*')], copies = [clone, ...clone.querySelectorAll('*')];
  orig.forEach((node, i) => {
    const cs = getComputedStyle(node);
    ['font-family', 'font-size', 'font-weight', 'font-style', 'fill', 'stroke', 'stroke-width', 'opacity', 'text-anchor', 'dominant-baseline', 'transform', 'filter']
      .forEach(k => copies[i].style.setProperty(k, cs.getPropertyValue(k)));
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', rect.width); clone.setAttribute('height', rect.height);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; });
    const c = document.createElement('canvas'); c.width = Math.ceil(rect.width * 2); c.height = Math.ceil(rect.height * 2);
    const ctx = c.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
/** export bar placed after `apres`, for `source` (an svg, or a table) */
export function barreExport(apri, apres, source) {
  const table = source.matches('table');
  const bar = document.createElement('div'); bar.className = 'bcl-export';
  const status = document.createElement('span'); status.setAttribute('role', 'status');
  for (const fmt of table ? ['csv'] : ['jpeg', 'pdf']) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bcl-exp'; b.textContent = fmt.toUpperCase() + ' ↓';
    b.onclick = async () => {
      b.disabled = true; status.textContent = apri.t('Préparation…', 'Preparing…');
      try {
        if (table) {
          const csv = [...source.querySelectorAll('tr')].map(row => [...row.querySelectorAll('th,td')]
            .map(c => '"' + c.innerText.replaceAll('"', '""') + '"').join(';')).join('\r\n');
          telecharger(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'csv');
        } else {
          const canvas = await capturer(source);
          const blob = fmt === 'pdf' ? pdfJpeg(canvas) : await new Promise(r => canvas.toBlob(r, 'image/jpeg', .94));
          if (!blob) throw Error('No image');
          telecharger(blob, fmt === 'jpeg' ? 'jpg' : 'pdf');
        }
        status.textContent = '';
      } catch (e) { status.textContent = apri.t('Téléchargement indisponible pour ce rendu.', 'Download unavailable for this rendering.'); }
      finally { b.disabled = false; }
    };
    bar.append(b);
  }
  bar.append(status);
  apres.after(bar);
  return bar;
}

/** the band recalling the system looked at (systeme_complexe._rappel) */
export function rappel(m, s, T) {
  return `<p class="sx-note sx-encadre"><b>${esc(m.noms[s.centre])}</b> · ${s.n} ${esc(T('sx_n_var'))}</p>`;
}

/** cancel the previous animation of a tab when it is drawn again */
const nettoyages = new Map();
export function nettoyer(cle, f) {
  const g = nettoyages.get(cle); if (g) { try { g(); } catch (e) {} }
  if (f) nettoyages.set(cle, f); else nettoyages.delete(cle);
}
export { E };
