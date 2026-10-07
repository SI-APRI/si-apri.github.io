/* Uncertainty and qualitative wording shared by the tabs of "Boucles de
   rétroaction": runs the Monte Carlo of moteur.js in the browser without ever
   freezing the page (small slices of draws, one slice per animation frame,
   with a progress bar), keeps the result for the whole visit, and builds the
   small visual pieces (effect badges, strength dots, folded figures panel,
   pointer to the forest tab). */
import * as E from './moteur.js';
import { esc } from './commun.js';

export const N_TIRAGES = 1000, GRAINE = 2026;
/** a die, the icon of the uncertainty blocks */
export const DE = `<svg class="mc-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4.5" fill="#e3f1e9" stroke="#2f7a5b" stroke-width="1.6"/>
  <circle cx="8.2" cy="8.2" r="1.6" fill="#2f7a5b"/><circle cx="12" cy="12" r="1.6" fill="#2f7a5b"/><circle cx="15.8" cy="15.8" r="1.6" fill="#2f7a5b"/></svg>`;

// --------------------------------------------------------------- the draws
let tache = null;              // { promesse, fait, n, res, abonnes:Set }
/** the Monte Carlo result (computed once per visit, language-independent) */
export function incertitude(m) {
  if (tache) return tache.promesse;
  tache = { fait: 0, n: N_TIRAGES, res: null, abonnes: new Set() };
  tache.promesse = new Promise(resolve => {
    const it = E.monteCarloIter(m, { n: N_TIRAGES, graine: GRAINE });
    const tranche = () => {
      const t0 = performance.now();
      let r;
      do { r = it.next(); } while (!r.done && performance.now() - t0 < 12);
      if (r.done) { tache.res = r.value; tache.fait = tache.n; tache.abonnes.forEach(f => f(1)); resolve(r.value); return; }
      tache.fait = r.value;
      tache.abonnes.forEach(f => f(tache.fait / tache.n));
      suivant(tranche);
    };
    suivant(tranche);
  });
  return tache.promesse;
}
const suivant = f => (document.hidden ? setTimeout(f, 0) : requestAnimationFrame(f));

/** a small progress line that disappears once the draws are done */
export function progression(apri, m) {
  const el = apri.h(`<div class="mc-prog" role="status"><span class="mc-prog-t">${esc(apri.t('Calcul de l’incertitude…', 'Computing the uncertainty…'))}</span>
    <span class="mc-prog-p"><i></i></span><span class="mc-prog-n">0 %</span></div>`);
  const maj = p => {
    el.querySelector('i').style.width = (100 * p).toFixed(0) + '%';
    el.querySelector('.mc-prog-n').textContent = apri.pct(p);
    if (p >= 1) { el.style.display = 'none'; el.remove(); }
  };
  incertitude(m);
  tache.abonnes.add(maj);
  maj(tache.fait / tache.n);
  return el;
}

// --------------------------------------------------------------- words
export const ordinal = (n, lang) => {
  if (lang === 'en') { const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'); return n + s; }
  return n === 1 ? '1er' : n + 'e';
};
/** "Presque toujours dans le trio de tête" etc. */
export function phraseTop3(p, lang) {
  const fr = lang !== 'en';
  if (p >= 0.9) return fr ? 'Presque toujours dans le trio de tête' : 'Almost always in the top three';
  if (p >= 0.6) return fr ? 'Souvent dans le trio de tête' : 'Often in the top three';
  if (p >= 0.3) return fr ? 'Parfois dans le trio de tête' : 'Sometimes in the top three';
  if (p >= 0.05) return fr ? 'Rarement dans le trio de tête' : 'Rarely in the top three';
  return fr ? 'Presque jamais dans le trio de tête' : 'Almost never in the top three';
}
/** a range of sizes in words: "modéré" or "de faible à fort" */
export function plageMots(lo, hi, lang) {
  const a = E.tailleEffet(lo), b = E.tailleEffet(hi);
  const w = t => (lang === 'en' ? t.en : t.fr);
  if (a.k === b.k) return w(a);
  return lang === 'en' ? `from ${w(a)} to ${w(b)}` : `de ${w(a)} à ${w(b)}`;
}
/** sizes of an effect that can change sign: compare absolute values */
export function plageSignee(lo, hi, lang) {
  if (lo < 0 && hi > 0) return lang === 'en' ? 'direction uncertain' : 'sens incertain';
  const a = Math.min(Math.abs(lo), Math.abs(hi)), b = Math.max(Math.abs(lo), Math.abs(hi));
  return plageMots(a, b, lang);
}

// --------------------------------------------------------------- visual pieces
/** arrow + words, coloured: ↑↑ modéré */
export function badge(delta, lang, { court = false } = {}) {
  const q = E.qualifier(delta, lang);
  const txt = court ? q.mot : q.texte;
  return `<span class="qual-b qual-${q.sens}" title="${esc(q.texte)}"><b aria-hidden="true">${q.fleche}</b> ${esc(txt)}</span>`;
}
/** the class of a link strength, as five dots and its name */
export function points(force, lang) {
  const c = E.classeDe(force);
  const d = [1, 2, 3, 4, 5].map(k => `<i class="${k <= c.k ? 'on' : ''}"></i>`).join('');
  const nom = lang === 'en' ? c.en : c.fr;
  return `<span class="qual-force" title="${esc(nom)}"><span class="qual-pts" aria-hidden="true">${d}</span> ${esc(nom)}</span>`;
}
/** folded "Détail chiffré" panel; returns the <details> element */
export function detailChiffre(apri, contenu, titre) {
  const el = apri.h(`<details class="pli qual-detail"><summary>${esc(titre || apri.t('Détail chiffré (valeurs du modèle)', 'Figures (model values)'))}</summary>
    <p class="qual-avert">${esc(apri.t('Ces nombres sont des valeurs calculées par le modèle à partir de forces choisies par des experts, pas des mesures. Lisez-les comme des ordres de grandeur.',
      'These numbers are values computed by the model from strengths chosen by experts, not measurements. Read them as orders of magnitude.'))}</p></details>`);
  if (typeof contenu === 'string') el.insertAdjacentHTML('beforeend', contenu); else if (contenu) el.append(contenu);
  return el;
}
/** folded pointer to the forest tab, where real thresholds live */
export function noteSeuils(apri) {
  const el = apri.h(`<details class="pli qual-seuil"><summary>${esc(apri.t('Et les vrais points de bascule ?', 'What about real tipping points?'))}</summary>
    <p>${esc(apri.t('Ce modèle est linéaire : il additionne des effets, il ne connaît ni seuil ni basculement. Les mots « amplifie » ou « très reliée » parlent du calcul, pas d’un risque écologique.',
      'This model is linear: it adds effects up, it knows no threshold and cannot tip. Words such as “amplifies” or “highly linked” describe the calculation, not an ecological risk.'))}</p>
    <p>${esc(apri.t('Les seuils réels (forêt qui ne repousse plus, bois qui manque) sont traités avec un modèle de stocks et de délais dans l’onglet', 'Real thresholds (forest that no longer grows back, wood running out) are handled with a model of stocks and delays in the tab'))}
    <a href="#boucles/foret" class="qual-lien">${esc(apri.t('Forêt, charbon et cuisson', 'Forest, charcoal and cooking'))}</a>.</p></details>`);
  el.querySelector('a').onclick = e => { e.preventDefault(); apri.aller('boucles', 'foret'); window.scrollTo({ top: 0 }); };
  return el;
}
/** the folded note on the model stability (the old "spectral radius" sentence) */
export function noteStabilite(apri, m, f) {
  const d = m.diag;
  const fort = d.tendu ? apri.t(' Le modèle amplifie fortement : sans cette réduction, un choc ne s’éteindrait pas.', ' The model amplifies strongly: without this reduction, a shock would not die out.') : '';
  return apri.h(`<details class="pli qual-detail"><summary>${esc(apri.t('Stabilité du modèle', 'Model stability'))}</summary>
    <p>${esc(apri.t(`Telles qu’elles sont écrites, les forces font tourner les boucles un peu trop fort.${fort} Toutes les forces sont donc réduites du même facteur (${f(d.facteur, 2)}) pour que le calcul se pose. Ce choix (stabilité du modèle fixée à ${f(d.cible, 1)}) est une convention : l’incertitude le fait varier de 0,5 à 0,8.`,
      `As written, the strengths make the loops turn a little too hard.${fort} All strengths are therefore reduced by the same factor (${f(d.facteur, 2)}) so the calculation settles. That choice (model stability set at ${f(d.cible, 1)}) is a convention: the uncertainty analysis varies it from 0.5 to 0.8.`))}</p>
    <p class="qual-avert">${esc(apri.t(`Valeur technique : rayon spectral de la matrice brute ${f(d.rayon, 3)}, ramené à ${f(d.cible, 2)}.`, `Technical value: spectral radius of the raw matrix ${f(d.rayon, 3)}, brought down to ${f(d.cible, 2)}.`))}</p></details>`);
}
/** the legend of the arrows */
export function legende(apri) {
  const L = apri.lang;
  return `<div class="qual-leg">${[0.01, 0.1, 0.3, 0.8, -0.3].map(v => badge(v, L, { court: true })).join('')}
    <span>${esc(apri.t('sur une échelle de 0 à 10 : négligeable sous 0,05 point, faible jusqu’à 0,2, modéré jusqu’à 0,5, fort au-delà', 'on a 0 to 10 scale: negligible below 0.05 point, weak up to 0.2, moderate up to 0.5, strong beyond'))}</span></div>`;
}
