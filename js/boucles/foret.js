// Tab "Forêt, charbon et cuisson / Forest, charcoal and cooking".
// A small stock-and-flow model (system dynamics) of Haiti's woody stock, charcoal
// harvest and clean cooking adoption. Unlike the linear causal model of the other
// tabs, it has stocks that remember, delays, and a regrowth that reverses below a
// critical stock: the one place in the site where "tipping" has a physical meaning.
// Pure model functions (parametres, simuler, ...) are exported so they can be
// checked outside the browser (node). No DOM access at module top level.

/* ===================================================================== MODEL */

/** Published figures (sources in SOURCES below) and assumptions (marked). */
export const BASE = {
  CHARBON0: 946500,     // t of charcoal per year, Haiti (Tarter et al. 2018, World Bank)       [published]
  RATIO: 6,             // t of wood per t of charcoal, traditional earth kilns                  [assumed]
  B0_T: 75e6,           // t of above-ground woody stock today = 300 kt/yr ÷ 0.4 %/yr (SEI 2018)  [derived]
  PERTE0: 0.004,        // net loss of the stock per year at start: −4 % over 2017-2027 (SEI)  [published]
  C0: 0.06,             // share of households cooking with clean fuels (APRI 2024, overwritten from modele.json) [measured]
  KACC: 0.10,           // accessibility half-saturation (share of K)                            [assumed]
  EMAX: 0.25,           // max share of harvest stopped by enforcement                          [assumed]
  TAU_E: 3,             // years for enforcement to reach full strength                          [assumed]
  CMAX: 0.85,           // ceiling of clean cooking adoption with a full programme               [assumed]
  BASS_P0: 0.004, BASS_P: 0.03, BASS_Q: 0.40,  // diffusion (Bass): innovation, imitation       [assumed]
  SURVIE: 0.5,          // survival of planted trees                                             [assumed]
  T_HA: 40,             // t of woody biomass per mature planted hectare                         [assumed]
  TAU_J: 7,             // years for a plantation to mature                                       [assumed]
  SOL_REF: 0.4,         // forest share (of K) below which soils start to degrade                [assumed]
  TAU_S: 15,            // years for soils to follow the forest                                   [assumed]
  T: 50, DT: 0.1, AN0: 2025,
};
/** Assumptions the reader may change (folded panel). */
export const HYP0 = { g: 0.012, a: 0.15, b0: 0.80, sig: 0.7 };

const f3 = (b, a) => b * (1 - b) * (b / a - 1);              // cubic regrowth shape, zero at 0, A and K
const soleq = (b, B) => Math.min(1, Math.max(0, b / B.SOL_REF));
const facteurSol = s => 0.5 + 0.5 * s;

/** Calibrated parameters: K from today's stock, harvest rate h0, regrowth rate r so that
    the stock loses PERTE0 per year at start (as SEI's trend projection). */
export function parametres(H = HYP0, B = BASE) {
  const K = B.B0_T / H.b0;                    // t of woody biomass the landscape can carry
  const h0 = B.CHARBON0 * B.RATIO / K;        // harvest today, share of K per year
  const r = (h0 - B.PERTE0 * H.b0) / (f3(H.b0, H.a) * facteurSol(soleq(H.b0, B)));
  let bpk = H.a, best = -1;                   // where regrowth peaks (largest sustainable harvest)
  for (let i = 0; i <= 2000; i++) { const b = H.a + (1 - H.a) * i / 2000; const v = f3(b, H.a); if (v > best) { best = v; bpk = b; } }
  const acc0 = H.b0 / (H.b0 + B.KACC);
  return { ...H, K, h0, r, bpk, acc0, B };
}
const acces = (b, P) => (b / (b + P.B.KACC)) / P.acc0;
const repousse = (b, s, P) => P.r * f3(b, P.a) * facteurSol(s);

/** Tipping point given the harvest pressure x (1 = today's) and soil s:
    the unstable equilibrium where regrowth = harvest. 1 when there is none (harvest beyond
    what the forest can ever regrow), A when nothing is cut. */
export function seuilBascule(x, s, P) {
  if (x <= 1e-9) return P.a;
  const phi = b => repousse(b, s, P) - P.h0 * x * acces(b, P);
  if (phi(P.bpk) < 0) return 1;
  let lo = P.a, hi = P.bpk;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (phi(m) < 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Run the model.
    L = levers {prog 0..1, plant ha/yr, enf 0..1, delay yr}
    o = {T, dt, stop (year cutting stops), dfac (fixed demand factor), b, s (start),
         replant {ha, from, dur}, seuil (compute moving threshold), H, B} */
export function simuler(L, o = {}) {
  const B = o.B || BASE, H = o.H || HYP0, P = parametres(H, B);
  const T = o.T ?? B.T, dt = o.dt ?? B.DT, n = Math.round(T / dt);
  const S = {}; for (const k of ['t', 'b', 'c', 's', 'j', 'e', 'G', 'h', 'mat', 'pin', 'adop', 'D', 'x', 'seuil']) S[k] = new Float64Array(n + 1);
  let b = o.b ?? H.b0, c = B.C0, j = 0, s = o.s ?? soleq(b, B), e = 0;
  for (let k = 0; k <= n; k++) {
    const t = k * dt, on = t >= (L.delay || 0) - 1e-9;
    const menages = Math.exp(H.g * t);
    const D = o.dfac ?? menages * (1 - H.sig * c) / (1 - H.sig * B.C0);   // demand, 1 = today
    const coupe = (o.stop != null && t >= o.stop - 1e-9) ? 0 : 1;
    const x = coupe * D * (1 - B.EMAX * e);                                // harvest pressure, 1 = today
    const h = P.h0 * x * acces(b, P);
    const G = repousse(b, s, P);
    const mat = j / B.TAU_J;
    let plant = on ? (L.plant || 0) : 0;
    if (o.replant && t >= o.replant.from - 1e-9 && t < o.replant.from + o.replant.dur - 1e-9) plant += o.replant.ha;
    const pin = plant * B.SURVIE * B.T_HA / P.K;
    let adop = 0;
    if (on && L.prog > 0) {
      const cmax = B.C0 + L.prog * (B.CMAX - B.C0);
      adop = (B.BASS_P0 + B.BASS_P * L.prog + B.BASS_Q * L.prog * c) * Math.max(0, cmax - c);
    }
    const eCible = on ? (L.enf || 0) : 0;
    S.t[k] = t; S.b[k] = b; S.c[k] = c; S.s[k] = s; S.j[k] = j; S.e[k] = e; S.G[k] = G; S.h[k] = h;
    S.mat[k] = mat; S.pin[k] = pin; S.adop[k] = adop; S.D[k] = D; S.x[k] = x;
    if (o.seuil) S.seuil[k] = seuilBascule(x, s, P);
    // explicit Euler step (convergence checked against dt/2, see verifications())
    b = Math.max(0, b + dt * (G - h + mat));
    j = j + dt * (pin - mat);
    s = s + dt * (soleq(b, B) - s) / B.TAU_S;
    c = Math.min(1, c + dt * adop);
    e = e + dt * (eCible - e) / B.TAU_E;
  }
  S.P = P; S.n = n; S.dt = dt;
  return S;
}

/** first time the stock falls below the no-return threshold A, or null */
export function passage(S) {
  for (let k = 0; k <= S.n; k++) if (S.b[k] < S.P.a) return S.t[k];
  return null;
}

export const PRESETS = [
  { id: 'rien', fr: 'Ne rien faire', en: 'Do nothing', L: { prog: 0, plant: 0, enf: 0, delay: 0 } },
  { id: 'planter', fr: 'Planter seulement', en: 'Plant only', L: { prog: 0, plant: 10000, enf: 0, delay: 0 } },
  { id: 'cuisson', fr: 'Agir sur la cuisson', en: 'Act on cooking', L: { prog: 0.8, plant: 0, enf: 0, delay: 0 } },
  { id: 'ensemble', fr: 'Agir ensemble', en: 'Act together', L: { prog: 0.8, plant: 10000, enf: 0.6, delay: 0 } },
];

/** Robustness: share of assumption sets (81) under which each preset keeps the forest
    out of the no-return zone over the horizon. */
export function robustesse(B = BASE) {
  const grille = [];
  for (const a of [0.10, 0.15, 0.20]) for (const g of [0.008, 0.012, 0.016]) for (const b0 of [0.75, 0.80, 0.85]) for (const sig of [0.5, 0.7, 0.9]) grille.push({ a, g, b0, sig });
  return PRESETS.map(p => ({ id: p.id, ok: grille.filter(H => passage(simuler(p.L, { H, B })) == null).length, n: grille.length }));
}

/** Numerical sanity checks, recomputed in the browser. */
export function verifications(H = HYP0, B = BASE) {
  const out = [];
  const P = parametres(H, B);
  // 1. no harvest, start above the threshold: back to carrying capacity
  const r1 = simuler({ prog: 0, plant: 0, enf: 0, delay: 0 }, { H, B, stop: 0, b: 0.3, T: 200 });
  out.push({ id: 'k', ok: Math.abs(r1.b[r1.n] - 1) < 1e-3, v: r1.b[r1.n] });
  // 2. no harvest, start just below the threshold: no return
  const r2 = simuler({ prog: 0, plant: 0, enf: 0, delay: 0 }, { H, B, stop: 0, b: H.a * 0.9, T: 200 });
  out.push({ id: 'a', ok: r2.b[r2.n] < 1e-3, v: r2.b[r2.n] });
  // 3. high harvest (demand held at 1.5 × today): collapse
  const r3 = simuler({ prog: 0, plant: 0, enf: 0, delay: 0 }, { H, B, dfac: 1.5, T: 50 });
  out.push({ id: 'h', ok: r3.b[r3.n] < 0.01, v: r3.b[r3.n] });
  // 4. time step: dt 0.1 against 0.05, and 0.05 against 0.025, every preset
  let d1 = 0, d2 = 0;
  for (const p of PRESETS) {
    const a = simuler(p.L, { H, B, dt: 0.1 }), b = simuler(p.L, { H, B, dt: 0.05 }), c = simuler(p.L, { H, B, dt: 0.025 });
    for (let k = 0; k <= a.n; k++) d1 = Math.max(d1, Math.abs(a.b[k] - b.b[2 * k]));
    for (let k = 0; k <= b.n; k++) d2 = Math.max(d2, Math.abs(b.b[k] - c.b[2 * k]));
  }
  out.push({ id: 'dt', ok: d1 < 0.02, v: d1, v2: d2 });
  // 5. calibration: net change at start
  const r5 = simuler(PRESETS[0].L, { H, B });
  out.push({ id: 'cal', ok: Math.abs((r5.G[0] - r5.h[0]) / H.b0 + B.PERTE0) < 1e-9, v: (r5.G[0] - r5.h[0]) / H.b0 });
  // 6. SEI: wood demand −44 % held constant reverses the decline
  const r6 = simuler(PRESETS[0].L, { H, B, dfac: 0.56 });
  out.push({ id: 'sei', ok: r6.b[r6.n] > H.b0, v: r6.b[r6.n] });
  // 7. largest sustainable harvest compared with today's
  out.push({ id: 'msy', ok: true, v: repousse(P.bpk, 1, P) / (P.h0 * acces(P.bpk, P)) });
  return out;
}

/* ===================================================================== SOURCES */
// links of the causal graph that this model turns into flows (ref texts read from modele.json)
const LIENS = [
  { de: 'foret', vers: 'abondance_bois', terme: { fr: 'Consommation de départ : 946 500 t de charbon par an', en: 'Starting consumption: 946,500 t of charcoal a year' } },
  { de: 'abondance_bois', vers: 'foret', terme: { fr: 'Tendance du stock (−0,4 %/an) qui cale la repousse r', en: 'Stock trend (−0.4 %/yr) that calibrates regrowth r' } },
  { de: 'pression_bois', vers: 'foret', terme: { fr: 'Le flux de coupe C retire du stock', en: 'The harvest flow C drains the stock' } },
  { de: 'abondance_bois', vers: 'pression_bois', terme: { fr: 'Accessibilité a(F) : on coupe ce qui est sur pied et atteignable', en: 'Accessibility a(F): what stands within reach is cut' } },
  { de: 'cuisson', vers: 'pression_bois', terme: { fr: 'Substitution σ : un ménage qui passe au propre réduit sa demande, sans l’annuler', en: 'Substitution σ: a household switching to clean fuel cuts its demand, without ending it' } },
  { de: 'controle', vers: 'pression_bois', terme: { fr: 'Contrôle E : jusqu’à −25 % de coupe (le Brésil, −75 %, est un plafond)', en: 'Enforcement E: up to −25 % of harvest (Brazil, −75 %, is a ceiling)' } },
  { de: 'ancrage', vers: 'pression_bois', terme: { fr: 'Croissance des ménages g : plus de ménages, plus de demande', en: 'Household growth g: more households, more demand' } },
  { de: 'foret', vers: 'erosion', terme: { fr: 'Sol S : sans couvert, le sol part et la repousse ralentit', en: 'Soil S: without cover, soil washes away and regrowth slows' } },
  { de: 'biodiv', vers: 'foret', terme: { fr: 'Seuil A : sans semenciers ni disséminateurs, la régénération s’effondre', en: 'Threshold A: without seed trees and dispersers, regeneration collapses' } },
];
const CLASSES = [[0.275, 'très faible', 'very weak'], [0.425, 'faible', 'weak'], [0.575, 'moyenne', 'moderate'], [0.725, 'forte', 'strong'], [9, 'très forte', 'very strong']];
const classe = (v, lang) => { const c = CLASSES.find(c => Math.abs(v) < c[0]); return lang === 'en' ? c[2] : c[1]; };

/* ===================================================================== VIEW */

const COUL = { foret: '#2f7a5b', foretPale: '#cfe6d9', bleu: '#397fa3', ambre: '#c98a1b', rouge: '#b5523b', gris: '#9aa6b2', texte: '#1f3a4a', doux: '#587082', filet: '#dbe6ee', sol: '#8a6d3b', cuisson: '#397fa3' };
const NS = 'http://www.w3.org/2000/svg';
const etat = { L: { ...PRESETS[0].L }, preset: 'rien', H: { ...HYP0 }, stop: 40, replant: false, vu: false };
let nettoyer = null;

function css() {
  if (!document.querySelector('link[href="css/boucles.css"]'))
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'css/boucles.css' }));
}

export default async function render(el, apri) {
  css();
  if (nettoyer) { nettoyer(); nettoyer = null; }
  const t = (fr, en) => apri.t(fr, en), esc = apri.esc, L = apri.lang;
  const nb = (v, d = 0) => apri.nombre(v, d);
  const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const B = { ...BASE };
  let modele = null;
  try {
    modele = await apri.donnees('data/boucles/modele.json');
    const v = Object.values(modele.indicateurs?.['6']?.valeurs || {});
    if (v.length) B.C0 = v.reduce((a, x) => a + x, 0) / v.length / 100;   // clean cooking, APRI survey, mean of sections
  } catch (e) { /* fallback to BASE.C0 */ }
  const pertesLoc = modele ? Object.values(modele.indicateurs?.['54']?.valeurs || {}) : [];
  const AN = a => B.AN0 + Math.round(a);

  el.innerHTML = '';
  const r = document.createElement('div'); r.className = 'bcl fo';
  el.append(r);

  r.innerHTML = `
  <div class="titre-bloc">${esc(t('Forêt, charbon et cuisson', 'Forest, charcoal and cooking'))}</div>
  <p class="fo-lead">${esc(t('Cette page montre comment la forêt, le charbon de bois et la façon de cuisiner évoluent ensemble sur 50 ans, et pourquoi une forêt peut passer un point de non-retour.',
    'This page shows how the forest, charcoal and the way people cook change together over 50 years, and why a forest can pass a point of no return.'))}
  ${esc(t('Choisissez un scénario ou bougez les curseurs, puis regardez la forêt évoluer.', 'Pick a scenario or move the sliders, then watch the forest change.'))}</p>
  <div class="fo-presets" role="group" aria-label="${esc(t('Scénarios', 'Scenarios'))}"></div>
  <div class="fo-grille">
    <div class="fo-regl"></div>
    <div class="fo-vue">
      <div class="fo-lecture">
        <button type="button" class="bouton primaire fo-play"></button>
        <label class="fo-annee"><span>${esc(t('Année', 'Year'))}</span> <b></b>
          <input type="range" min="0" max="${B.T}" step="1" aria-label="${esc(t('Année affichée', 'Year shown'))}"></label>
      </div>
      <div class="fo-courbe"></div>
      <div class="fo-legende"></div>
    </div>
  </div>
  <div class="fo-message" aria-live="polite"></div>
  <h3 class="fo-h">${esc(t('Ce qui se passe dans le système, année par année', 'What happens in the system, year by year'))}</h3>
  <p class="fo-sous">${esc(t('Les boîtes sont des stocks : elles se remplissent et se vident lentement. Les tuyaux sont des flux : plus ils sont larges, plus ils débitent. Suivez l’année avec le curseur au-dessus.',
    'Boxes are stocks: they fill and empty slowly. Pipes are flows: the wider, the more they carry. Follow the year with the slider above.'))}</p>
  <div class="fo-sf"></div>
  <h3 class="fo-h">${esc(t('L’expérience du retour impossible', 'The no-way-back experiment'))}</h3>
  <p class="fo-sous">${esc(t('On laisse faire, puis on arrête toute coupe une année donnée. Si l’on arrête tôt, la forêt revient. Si l’on arrête trop tard, elle ne revient pas : arrêter de couper ne suffit plus.',
    'We let things run, then stop all cutting in a given year. Stop early and the forest comes back. Stop too late and it does not: stopping the cutting is no longer enough.'))}</p>
  <div class="fo-hyst"></div>
  <h3 class="fo-h">${esc(t('Et si nos hypothèses sont fausses ?', 'What if our assumptions are wrong?'))}</h3>
  <p class="fo-sous">${esc(t('Nous avons refait le calcul avec 81 jeux d’hypothèses (seuil, croissance des ménages, état actuel de la forêt, effet du passage au propre). La barre dit dans combien de cas chaque scénario garde la forêt hors de la zone de non-retour pendant 50 ans.',
    'We redid the calculation with 81 sets of assumptions (threshold, household growth, current state of the forest, effect of switching to clean fuel). The bar says in how many cases each scenario keeps the forest out of the no-return zone for 50 years.'))}</p>
  <div class="fo-robu"></div>
  <div class="fo-plis"></div>`;

  /* ----------------------------------------------------------- controls */
  const curseurs = [
    { k: 'prog', fr: 'Programme de cuisson propre', en: 'Clean cooking programme', min: 0, max: 1, step: 0.05,
      v: x => x === 0 ? t('aucun', 'none') : x < 0.4 ? t('modeste', 'modest') : x < 0.75 ? t('important', 'large') : t('national, fort', 'national, strong'),
      aide: t('Gaz, foyers électriques ou améliorés, aides à l’achat. Les ménages s’y mettent peu à peu, en s’imitant.', 'Gas, electric or improved stoves, purchase support. Households take it up gradually, copying each other.') },
    { k: 'plant', fr: 'Plantation d’arbres', en: 'Tree planting', min: 0, max: 20000, step: 1000,
      v: x => x === 0 ? t('aucune', 'none') : `${nb(x)} ${t('ha par an', 'ha a year')}`,
      aide: t('Un arbre planté met environ 7 ans à compter ; la moitié survit.', 'A planted tree takes about 7 years to count; half survive.') },
    { k: 'enf', fr: 'Contrôle de la coupe', en: 'Control of cutting', min: 0, max: 1, step: 0.05,
      v: x => x === 0 ? t('aucun', 'none') : x < 0.4 ? t('léger', 'light') : x < 0.75 ? t('réel', 'real') : t('strict', 'strict'),
      aide: t('Patrouilles, permis, saisies. Il réduit la coupe locale, pas le besoin de cuisiner.', 'Patrols, permits, seizures. It cuts local harvest, not the need to cook.') },
    { k: 'delay', fr: 'Commencer dans', en: 'Start in', min: 0, max: 30, step: 1,
      v: x => x === 0 ? t('maintenant', 'now') : `${nb(x)} ${t(x > 1 ? 'ans' : 'an', x > 1 ? 'years' : 'year')} (${AN(x)})`,
      aide: t('Toutes les actions démarrent cette année-là.', 'All actions start that year.') },
  ];
  const regl = r.querySelector('.fo-regl');
  for (const c of curseurs) {
    const w = apri.h(`<label class="fo-curseur"><span class="fo-nom">${esc(t(c.fr, c.en))}</span> <output></output>
      <input type="range" min="${c.min}" max="${c.max}" step="${c.step}"><small>${esc(c.aide)}</small></label>`);
    c.inp = w.querySelector('input'); c.out = w.querySelector('output');
    c.inp.oninput = () => { etat.L[c.k] = Number(c.inp.value); etat.preset = null; majCurseurs(); calculer(false); };
    regl.append(w);
  }
  function majCurseurs() {
    for (const c of curseurs) { c.inp.value = etat.L[c.k]; c.out.textContent = c.v(etat.L[c.k]); }
    presetsEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === etat.preset)));
  }
  const presetsEl = r.querySelector('.fo-presets');
  for (const p of PRESETS) {
    const b = apri.h(`<button type="button" class="bouton" data-id="${p.id}">${esc(t(p.fr, p.en))}</button>`);
    b.onclick = () => { etat.L = { ...p.L }; etat.preset = p.id; majCurseurs(); calculer(true); };
    presetsEl.append(b);
  }

  /* ----------------------------------------------------------- run + chart */
  let run = null, ref = null, k = 0, anim = null, tc = null;
  const courbeEl = r.querySelector('.fo-courbe'), msgEl = r.querySelector('.fo-message');
  const play = r.querySelector('.fo-play'), anInp = r.querySelector('.fo-annee input'), anOut = r.querySelector('.fo-annee b');
  anInp.oninput = () => { stopAnim(); k = Math.round(Number(anInp.value) / run.dt); dessiner(); };
  play.onclick = () => { if (anim) stopAnim(); else { if (k >= run.n) k = 0; lancer(); } };

  function calculer(animer) {
    stopAnim();
    run = simuler(etat.L, { H: etat.H, B, seuil: true });
    ref = simuler(PRESETS[0].L, { H: etat.H, B });
    tc = passage(run);
    if (animer && !reduit) { k = 0; lancer(); }
    else { k = run.n; dessiner(); }
  }
  function lancer() {
    const t0 = performance.now(), k0 = k, duree = 6000 * (run.n - k0) / run.n;
    play.textContent = '❚❚ ' + t('Pause', 'Pause');
    const pas = now => {
      k = Math.min(run.n, Math.round(k0 + (run.n - k0) * (now - t0) / Math.max(1, duree)));
      dessiner();
      if (k < run.n) anim = requestAnimationFrame(pas); else stopAnim();
    };
    anim = requestAnimationFrame(pas);
  }
  function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; play.textContent = '▶ ' + t('Rejouer', 'Replay'); }

  function dessiner() {
    const an = run.t[k];
    anInp.value = Math.round(an); anOut.textContent = AN(an);
    dessinerCourbe();
    dessinerMessage();
    dessinerSF();
  }

  function axeX(g, x0, x1, y, T, larg) {
    const pasAn = larg < 420 ? 20 : 10;
    for (let a = 0; a <= T; a += pasAn) {
      const x = x0 + (x1 - x0) * a / T;
      g.push(`<line x1="${x}" x2="${x}" y1="${y}" y2="${y + 4}" stroke="${COUL.gris}"/><text x="${x}" y="${y + 16}" text-anchor="middle" class="fo-ax">${AN(a)}</text>`);
    }
  }
  const chemin = (arr, n, X, Y, step = 1) => { let d = ''; for (let i = 0; i <= n; i += step) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(arr[i]).toFixed(1); return d; };

  function dessinerCourbe() {
    const W = Math.max(300, courbeEl.clientWidth || 700), etroit = W < 520;
    const mg = { l: etroit ? 34 : 44, r: etroit ? 10 : 16 }, H1 = etroit ? 200 : 230, H2 = etroit ? 96 : 110, gap = 40;
    const x0 = mg.l, x1 = W - mg.r, n = run.n;
    const X = i => x0 + (x1 - x0) * i / n;
    // panel 1: forest
    const y0 = 14, y1 = y0 + H1, Y = v => y1 - (y1 - y0) * v;
    const a = run.P.a, g = [];
    g.push(`<rect x="${x0}" y="${Y(a)}" width="${x1 - x0}" height="${y1 - Y(a)}" fill="${COUL.rouge}" opacity=".13"/>`);
    g.push(`<text x="${x0 + 6}" y="${Y(a / 2) + 4}" class="fo-zone">${esc(t('Zone de non-retour', 'No-return zone'))}</text>`);
    for (const v of [0, 0.25, 0.5, 0.75, 1]) g.push(`<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" stroke="${COUL.filet}"/><text x="${x0 - 5}" y="${Y(v) + 4}" text-anchor="end" class="fo-ax">${nb(v * 100)}</text>`);
    g.push(`<text x="${x0}" y="${y0 - 3}" class="fo-axt">${esc(t('Forêt, % du maximum que le paysage peut porter', 'Forest, % of the most the landscape can carry'))}</text>`);
    if (etat.preset !== 'rien') g.push(`<path d="${chemin(ref.b, n, X, Y, 2)}" fill="none" stroke="${COUL.gris}" stroke-width="1.5" stroke-dasharray="2 3"/>`);
    // moving tipping point (with this year's harvest), drawn where it exists below 100 %
    let ds = '', dedans = false;
    for (let i = 0; i <= k; i += 2) { const v = run.seuil[i]; if (v < 0.999) { ds += (dedans ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); dedans = true; } else dedans = false; }
    g.push(`<path d="${ds}" fill="none" stroke="${COUL.ambre}" stroke-width="1.6" stroke-dasharray="5 4"/>`);
    for (let i = 0; i <= k; i++) {
      if (run.seuil[i] < 0.999) continue;
      let j = i; while (j < k && run.seuil[j + 1] >= 0.999) j++;
      g.push(`<rect x="${X(i)}" y="${y0 - 1}" width="${Math.max(1, X(j) - X(i))}" height="7" fill="${COUL.ambre}" opacity=".75"/>`);
      i = j;
    }
    // forest area and line, up to the current year
    let d = chemin(run.b, k, X, Y, 1);
    g.push(`<path d="${d}L${X(k)} ${y1}L${x0} ${y1}Z" fill="${COUL.foret}" opacity=".12"/>`);
    g.push(`<path d="${d}" fill="none" stroke="${COUL.foret}" stroke-width="2.6" stroke-linejoin="round"/>`);
    g.push(`<circle cx="${X(k)}" cy="${Y(run.b[k])}" r="4.5" fill="${run.b[k] < a ? COUL.rouge : COUL.foret}" stroke="#fff" stroke-width="1.5"/>`);
    if (tc != null && run.t[k] >= tc) {
      const i = Math.round(tc / run.dt);
      g.push(`<line x1="${X(i)}" x2="${X(i)}" y1="${y0}" y2="${y1}" stroke="${COUL.rouge}" stroke-dasharray="3 3"/>`);
    }
    g.push(`<line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" stroke="${COUL.gris}"/>`);
    // panel 2: charcoal demand and what local wood can supply (kt of charcoal / yr)
    const z0 = y1 + gap, z1 = z0 + H2;
    let vmax = 0; for (let i = 0; i <= n; i++) vmax = Math.max(vmax, run.D[i], ref.D[i]);
    vmax = Math.ceil(vmax * B.CHARBON0 / 1000 / 500) * 500;
    const Z = v => z1 - (z1 - z0) * (v * B.CHARBON0 / 1000) / vmax;
    for (let v = 0; v <= vmax; v += 500) g.push(`<line x1="${x0}" x2="${x1}" y1="${z1 - (z1 - z0) * v / vmax}" y2="${z1 - (z1 - z0) * v / vmax}" stroke="${COUL.filet}"/><text x="${x0 - 5}" y="${z1 - (z1 - z0) * v / vmax + 4}" text-anchor="end" class="fo-ax">${nb(v)}</text>`);
    g.push(`<text x="${x0}" y="${z0 - 6}" class="fo-axt">${esc(t('Charbon de bois, milliers de tonnes par an', 'Charcoal, thousand tonnes a year'))}</text>`);
    const hc = new Float64Array(n + 1); for (let i = 0; i <= n; i++) hc[i] = run.h[i] / run.P.h0;
    let dd = chemin(run.D, k, X, Z), dh = chemin(hc, k, X, Z);
    let ret = ''; for (let i = k; i >= 0; i--) ret += 'L' + X(i).toFixed(1) + ' ' + Z(hc[i]).toFixed(1);
    g.push(`<path d="${dd}${ret}Z" fill="${COUL.rouge}" opacity=".12"/>`);
    g.push(`<path d="${dd}" fill="none" stroke="${COUL.bleu}" stroke-width="2.2"/>`);
    g.push(`<path d="${dh}" fill="none" stroke="${COUL.sol}" stroke-width="2" stroke-dasharray="6 3"/>`);
    g.push(`<line x1="${x0}" x2="${x1}" y1="${z1}" y2="${z1}" stroke="${COUL.gris}"/>`);
    axeX(g, x0, x1, z1, B.T, W);
    // cursor
    g.push(`<line x1="${X(k)}" x2="${X(k)}" y1="${y0}" y2="${z1}" stroke="${COUL.texte}" opacity=".18"/>`);
    const Ht = z1 + 22;
    courbeEl.innerHTML = `<svg viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}" role="img" aria-label="${esc(t('Évolution de la forêt et du charbon', 'Forest and charcoal over time'))}">${g.join('')}</svg>`;
    r.querySelector('.fo-legende').innerHTML = [
      [COUL.foret, t('Forêt (ce scénario)', 'Forest (this scenario)'), ''],
      ...(etat.preset !== 'rien' ? [[COUL.gris, t('Forêt si l’on ne fait rien', 'Forest if nothing is done'), 'pt']] : []),
      [COUL.ambre, t('Point de bascule avec la coupe de l’année', 'Tipping point with that year’s cutting'), 'ti'],
      [COUL.ambre, t('Bande en haut : la coupe dépasse ce que la forêt peut repousser', 'Strip at the top: cutting exceeds what the forest can regrow'), 'bd'],
      [COUL.bleu, t('Charbon demandé', 'Charcoal demanded'), ''],
      [COUL.sol, t('Charbon tiré de la forêt locale', 'Charcoal from local forest'), 'ti'],
      [COUL.rouge, t('Écart : importé, plus cher, ou pris ailleurs', 'Gap: imported, dearer, or taken elsewhere'), 'zone'],
    ].map(([c, l, s]) => `<span><i class="${s}" style="--c:${c}"></i>${esc(l)}</span>`).join('');
  }

  function dessinerMessage() {
    const a = run.P.a, fin = run.n, bk = run.b[k], an = run.t[k];
    const lignes = [];
    lignes.push(`<div class="fo-chiffres">
      <div><small>${esc(t('Forêt en', 'Forest in'))} ${AN(an)}</small><b style="color:${bk < a ? COUL.rouge : COUL.foret}">${nb(bk * 100)} %</b><small>${esc(t('aujourd’hui', 'today'))} ${nb(etat.H.b0 * 100)} %</small></div>
      <div><small>${esc(t('Ménages cuisinant propre', 'Households cooking clean'))}</small><b style="color:${COUL.bleu}">${nb(run.c[k] * 100)} %</b><small>${esc(t('aujourd’hui', 'today'))} ${nb(B.C0 * 100)} %</small></div>
      <div><small>${esc(t('Charbon demandé', 'Charcoal demanded'))}</small><b>${nb(Math.round(run.D[k] * B.CHARBON0 / 10000) * 10)} kt</b><small>${esc(t('aujourd’hui', 'today'))} ${nb(Math.round(B.CHARBON0 / 10000) * 10)} kt</small></div>
    </div>`);
    if (tc != null && an >= tc) {
      lignes.push(`<div class="fo-alerte"><b>${esc(t(`Vers ${AN(tc)}, la forêt passe le point de non-retour.`, `Around ${AN(tc)}, the forest passes the point of no return.`))}</b>
        ${esc(t('La forêt ne repousse plus d’elle-même, même si l’on arrête de couper : il reste trop peu d’arbres semenciers et le sol part avec la pluie. Seule une replantation massive peut la faire remonter.',
        'The forest no longer grows back on its own, even if cutting stops: too few seed trees are left and the soil washes away with the rain. Only massive replanting can bring it back.'))}</div>`);
    } else if (k === fin) {
      const bf = run.b[fin], b0 = etat.H.b0;
      let txt;
      if (tc != null) txt = '';
      else if (bf < b0 - 0.05) txt = t('La forêt recule mais reste au-dessus du seuil en ' + AN(B.T) + ' : il est encore temps, mais la marge fond.', 'The forest shrinks but stays above the threshold in ' + AN(B.T) + ': there is still time, but the margin is melting.');
      else if (bf > b0 + 0.05) txt = t('La forêt se reconstitue : la coupe reste en dessous de ce qu’elle repousse.', 'The forest recovers: cutting stays below what grows back.');
      else txt = t('La forêt se maintient à peu près à son niveau actuel.', 'The forest holds roughly at its current level.');
      if (txt) lignes.push(`<div class="fo-ok ${bf < b0 - 0.05 ? 'moyen' : ''}">${esc(txt)}</div>`);
    }
    const ecart = 1 - (run.h[k] / run.P.h0) / run.D[k];
    if (ecart > 0.05 && an > 0) lignes.push(`<p class="fo-petit">${esc(t(`En ${AN(an)}, ${nb(ecart * 100)} % du charbon demandé ne vient plus de la forêt locale : il faut l’importer, le payer plus cher, ou couper ailleurs.`,
      `In ${AN(an)}, ${nb(ecart * 100)} % of the charcoal demanded no longer comes from the local forest: it must be imported, paid more for, or cut elsewhere.`))}</p>`);
    msgEl.innerHTML = lignes.join('');
  }

  /* ----------------------------------------------------------- stock and flow picture */
  const sfEl = r.querySelector('.fo-sf');
  function dessinerSF() {
    const W = Math.max(300, sfEl.clientWidth || 700), vert = W < 620;
    const i = k, P = run.P, Kt = P.K / 1e6;   // Mt
    const fl = { G: run.G[i] * Kt, h: run.h[i] * Kt, mat: run.mat[i] * Kt, pin: run.pin[i] * Kt, adop: run.adop[i] * 100 };
    const larg = v => Math.max(2, Math.min(26, 3 + 3.2 * v));       // pipe width for Mt/yr
    const vit = v => v < 0.02 ? 0 : Math.max(0.4, 6 / (0.6 + v));    // dash animation period (s)
    const mt = v => `≈ ${nb(v, v < 10 ? 1 : 0)} Mt/${t('an', 'yr')}`;
    // layout: boxes {x,y,w,h}
    const Lh = vert ? {
      w: W, h: 620,
      jeunes: { x: W * 0.04, y: 46, w: W * 0.42, h: 64 },
      foret: { x: W * 0.27, y: 180, w: W * 0.46, h: 130 },
      sol: { x: W * 0.04, y: 450, w: W * 0.42, h: 64 },
      cuis: { x: W * 0.54, y: 450, w: W * 0.42, h: 64 },
    } : {
      w: W, h: 330,
      jeunes: { x: W * 0.06, y: 30, w: 150, h: 64 },
      foret: { x: W * 0.39, y: 120, w: W * 0.2, h: 120 },
      sol: { x: W * 0.06, y: 236, w: 150, h: 64 },
      cuis: { x: W * 0.74, y: 236, w: Math.min(190, W * 0.22), h: 64 },
    };
    const F = Lh.foret, J = Lh.jeunes, So = Lh.sol, Cu = Lh.cuis;
    const g = [];
    const reservoir = (bx, niveau, coul, titre, valeur) => {
      const hh = bx.h * Math.max(0, Math.min(1, niveau));
      g.push(`<rect x="${bx.x}" y="${bx.y}" width="${bx.w}" height="${bx.h}" rx="8" fill="#fff" stroke="${COUL.gris}"/>`);
      g.push(`<rect x="${bx.x + 1}" y="${bx.y + bx.h - hh}" width="${bx.w - 2}" height="${hh}" rx="7" fill="${coul}" opacity=".28" class="fo-niv"/>`);
      g.push(`<text x="${bx.x + bx.w / 2}" y="${bx.y + 18}" text-anchor="middle" class="fo-bt">${esc(titre)}</text>`);
      g.push(`<text x="${bx.x + bx.w / 2}" y="${bx.y + bx.h / 2 + 14}" text-anchor="middle" class="fo-bv">${esc(valeur)}</text>`);
    };
    const tuyau = (d, v, coul, lab, lx, ly, ancre = 'middle', id = '') => {
      const w = larg(v), p = vit(v);
      g.push(`<path d="${d}" fill="none" stroke="${coul}" stroke-opacity=".25" stroke-width="${w + 4}" stroke-linecap="round"/>`);
      g.push(`<path d="${d}" fill="none" stroke="${coul}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="6 8" class="fo-flux" style="animation-duration:${p ? p + 's' : '0s'};${p ? '' : 'animation:none;'}"/>`);
      const ls = Array.isArray(lab) ? lab : [lab];
      g.push(`<text x="${lx}" y="${ly - 13 * (ls.length - 1)}" text-anchor="${ancre}" class="fo-ft">${ls.map((x, q) => `<tspan x="${lx}" dy="${q ? 13 : 0}">${esc(x)}</tspan>`).join('')}</text>`);
    };
    const nuage = (x, y) => g.push(`<path d="M${x - 16} ${y + 6}a8 8 0 0 1 4-14a10 10 0 0 1 18-3a8 8 0 0 1 10 9a6 6 0 0 1-2 11z" fill="#f2f5f8" stroke="${COUL.gris}"/>`);
    const vanne = (x, y) => g.push(`<path d="M${x - 8} ${y - 8}L${x + 8} ${y + 8}M${x - 8} ${y + 8}L${x + 8} ${y - 8}" stroke="${COUL.texte}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" fill="${COUL.texte}"/>`);
    const info = (d, signe, lx, ly) => { g.push(`<path d="${d}" fill="none" stroke="${COUL.doux}" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#fo-fl)"/>`); if (signe) g.push(`<text x="${lx}" y="${ly}" class="fo-sg">${signe}</text>`); };
    g.push(`<defs><marker id="fo-fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${COUL.doux}"/></marker></defs>`);

    const fy = F.y + F.h / 2;
    if (!vert) {
      // regrowth: cloud → forest (left), harvest: forest → cloud (right)
      const DL = Math.max(120, W * 0.17), vg = F.x - DL / 2, vd = F.x + F.w + DL / 2;
      nuage(F.x - DL - 14, fy); vanne(vg, fy);
      tuyau(`M${F.x - DL} ${fy}H${F.x}`, Math.max(0, fl.G), COUL.foret, [t('Repousse naturelle', 'Natural regrowth'), mt(Math.max(0, fl.G))], vg, fy - 20);
      nuage(F.x + F.w + DL + 20, fy); vanne(vd, fy);
      tuyau(`M${F.x + F.w} ${fy}H${F.x + F.w + DL}`, fl.h, COUL.sol, [t('Coupe pour le charbon', 'Cutting for charcoal'), mt(fl.h)], vd, fy - 20);
      // planting → young stand → maturation → forest
      tuyau(`M${J.x + J.w / 2} ${J.y - 22}V${J.y}`, fl.pin, COUL.foret, `${t('Plantation', 'Planting')} ${fl.pin > 0.005 ? mt(fl.pin) : ''}`, J.x + J.w / 2 + 10, J.y - 10, 'start');
      tuyau(`M${J.x + J.w} ${J.y + J.h / 2}H${F.x + F.w * 0.25}V${F.y}`, fl.mat, COUL.foret, `${t('Maturation, ~7 ans', 'Maturing, ~7 years')}`, J.x + J.w + 8, J.y + J.h / 2 - 8, 'start');
      // adoption cloud → clean cooking
      nuage(Cu.x + Cu.w / 2, Cu.y - 52);
      tuyau(`M${Cu.x + Cu.w / 2} ${Cu.y - 40}V${Cu.y}`, fl.adop * 1.5, COUL.bleu, `${t('Adoption', 'Uptake')} ${nb(fl.adop, 1)} ${t('pt/an', 'pt/yr')}`, Cu.x + Cu.w / 2 + 10, Cu.y - 18, 'start');
      // information links
      info(`M${Cu.x + Cu.w * 0.3} ${Cu.y}Q${vd} ${Cu.y - 30} ${vd} ${fy + 12}`, '−', vd + 6, fy + 34);
      info(`M${So.x + So.w / 2} ${So.y}Q${vg} ${So.y - 20} ${vg} ${fy + 12}`, '+', vg + 6, fy + 34);
      info(`M${F.x + 10} ${F.y + F.h}Q${F.x - 10} ${So.y + So.h / 2} ${So.x + So.w} ${So.y + So.h / 2}`, '+', F.x - 14, So.y + 6);
      g.push(`<text x="${vd}" y="${fy + 54}" text-anchor="middle" class="fo-ft">${esc(t('ménages, contrôle', 'households, control'))}</text>`);
    } else {
      // vertical (phone) layout
      const xr = W * 0.88, yc = F.y + F.h + 70;
      nuage(xr, 112); vanne(xr, F.y - 8);
      tuyau(`M${xr} ${124}V${F.y + 30}H${F.x + F.w}`, Math.max(0, fl.G), COUL.foret, [t('Repousse', 'Regrowth'), mt(Math.max(0, fl.G))], W * 0.98, 82, 'end');
      vanne(xr, F.y + F.h + 24); nuage(xr, yc + 12);
      tuyau(`M${F.x + F.w} ${F.y + F.h - 30}H${xr}V${yc}`, fl.h, COUL.sol, [t('Coupe', 'Cutting'), mt(fl.h)], xr - 22, F.y + F.h + 50, 'end');
      tuyau(`M${J.x + J.w / 2} ${J.y - 22}V${J.y}`, fl.pin, COUL.foret, t('Plantation', 'Planting'), J.x + J.w / 2 + 8, J.y - 8, 'start');
      tuyau(`M${J.x + J.w * 0.3} ${J.y + J.h}V${F.y + 30}H${F.x}`, fl.mat, COUL.foret, [t('Maturation', 'Maturing'), t('~7 ans', '~7 yrs')], J.x + J.w * 0.3 + 10, J.y + J.h + 30, 'start');
      nuage(Cu.x + Cu.w / 2, Cu.y + Cu.h + 46);
      tuyau(`M${Cu.x + Cu.w / 2} ${Cu.y + Cu.h + 36}V${Cu.y + Cu.h}`, fl.adop * 1.5, COUL.bleu, t('Adoption', 'Uptake'), Cu.x + Cu.w / 2 - 22, Cu.y + Cu.h + 26, 'end');
      info(`M${Cu.x + Cu.w * 0.25} ${Cu.y}Q${Cu.x + Cu.w * 0.25} ${F.y + F.h + 40} ${xr - 12} ${F.y + F.h + 28}`, '−', Cu.x + Cu.w * 0.25 - 14, Cu.y - 12);
      info(`M${So.x + So.w / 2} ${So.y}Q${So.x + So.w / 2} ${F.y + F.h + 10} ${F.x - 4} ${F.y + F.h * 0.75}`, '+', So.x + So.w / 2 + 6, So.y - 16);
    }
    reservoir(J, Math.min(1, run.j[i] / 0.03), COUL.foret, vert ? t('Plantations', 'Plantations') : t('Jeunes plantations', 'Young plantations'), `${nb(run.j[i] * Kt, 1)} Mt`);
    reservoir(F, run.b[i], run.b[i] < P.a ? COUL.rouge : COUL.foret, vert ? t('Forêt', 'Forest') : t('Forêt (bois sur pied)', 'Forest (standing wood)'), `${nb(run.b[i] * 100)} %`);
    // threshold mark inside the forest tank
    const ya = F.y + F.h * (1 - P.a);
    g.push(`<line x1="${F.x}" x2="${F.x + F.w}" y1="${ya}" y2="${ya}" stroke="${COUL.rouge}" stroke-dasharray="4 3"/><text x="${F.x + F.w - 4}" y="${ya - 4}" text-anchor="end" class="fo-st">${esc(t('seuil', 'threshold'))}</text>`);
    reservoir(So, run.s[i], COUL.sol, t('Sols fertiles', 'Fertile soils'), `${nb(run.s[i] * 100)} %`);
    reservoir(Cu, run.c[i], COUL.bleu, vert ? t('Cuisson propre', 'Clean cooking') : t('Ménages cuisinant propre', 'Households cooking clean'), `${nb(run.c[i] * 100)} %`);
    sfEl.innerHTML = `<svg viewBox="0 0 ${W} ${Lh.h}" width="${W}" height="${Lh.h}" role="img" aria-label="${esc(t('Schéma des stocks et des flux', 'Stock and flow diagram'))}" class="${reduit ? 'fo-fixe' : ''}">${g.join('')}</svg>
      <p class="fo-petit">${esc(t('Flèches pointillées : une information qui règle un flux (+ : l’augmente, − : le réduit). Le niveau des boîtes est l’état à l’année choisie.',
      'Dotted arrows: information that sets a flow (+: increases it, −: reduces it). The level of each box is the state in the chosen year.'))}</p>`;
  }

  /* ----------------------------------------------------------- hysteresis experiment */
  const hy = r.querySelector('.fo-hyst');
  hy.innerHTML = `<div class="fo-hctl">
      <label class="fo-curseur"><span class="fo-nom">${esc(t('On arrête toute coupe en', 'All cutting stops in'))}</span> <output></output>
        <input type="range" min="5" max="50" step="1"></label>
      <div class="fo-hbtn"><button type="button" class="bouton" data-s="20">${esc(t('Arrêter tôt', 'Stop early'))}</button>
        <button type="button" class="bouton" data-s="40">${esc(t('Arrêter tard', 'Stop late'))}</button>
        <label class="fo-case"><input type="checkbox"> ${esc(t('puis replanter 100 000 ha par an pendant 10 ans', 'then replant 100,000 ha a year for 10 years'))}</label></div>
    </div>
    <div class="fo-hvues"><div class="fo-hc"></div><div class="fo-he"></div></div>
    <div class="fo-hmsg" aria-live="polite"></div>`;
  const hInp = hy.querySelector('input[type=range]'), hOut = hy.querySelector('output'), hCase = hy.querySelector('input[type=checkbox]');
  hInp.oninput = () => { etat.stop = Number(hInp.value); hyst(); };
  hy.querySelectorAll('button[data-s]').forEach(b => b.onclick = () => { etat.stop = Number(b.dataset.s); hyst(); });
  hCase.onchange = () => { etat.replant = hCase.checked; hyst(); };
  const TH = 80;
  function hyst() {
    hInp.value = etat.stop; hOut.textContent = AN(etat.stop); hCase.checked = etat.replant;
    const o = { H: etat.H, B, T: TH, stop: etat.stop };
    if (etat.replant) o.replant = { ha: 100000, from: etat.stop, dur: 10 };
    const R = simuler(PRESETS[0].L, o), P = R.P;
    const tcR = passage(simuler(PRESETS[0].L, { H: etat.H, B, T: TH }));
    // time chart
    const ce = hy.querySelector('.fo-hc'), W = Math.max(280, ce.clientWidth || 500), Hh = 210;
    const x0 = 34, x1 = W - 10, y0 = 18, y1 = Hh - 26, n = R.n;
    const X = i => x0 + (x1 - x0) * i / n, Y = v => y1 - (y1 - y0) * v;
    const g = [];
    g.push(`<rect x="${x0}" y="${Y(P.a)}" width="${x1 - x0}" height="${y1 - Y(P.a)}" fill="${COUL.rouge}" opacity=".13"/><text x="${x0 + 6}" y="${Y(P.a / 2) + 4}" class="fo-zone">${esc(t('Zone de non-retour', 'No-return zone'))}</text>`);
    for (const v of [0, 0.5, 1]) g.push(`<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" stroke="${COUL.filet}"/><text x="${x0 - 5}" y="${Y(v) + 4}" text-anchor="end" class="fo-ax">${nb(v * 100)}</text>`);
    const is = Math.round(etat.stop / R.dt);
    g.push(`<line x1="${X(is)}" x2="${X(is)}" y1="${y0}" y2="${y1}" stroke="${COUL.texte}" stroke-dasharray="3 3"/><text x="${X(is) + 4}" y="${y0 + 8}" class="fo-ft">${esc(t('arrêt des coupes', 'cutting stops'))}</text>`);
    g.push(`<path d="${chemin(R.b, n, X, Y, 2)}" fill="none" stroke="${COUL.foret}" stroke-width="2.6"/>`);
    g.push(`<text x="${x0}" y="${y0 - 6}" class="fo-axt">${esc(t('Forêt, %', 'Forest, %'))}</text>`);
    for (let a = 0; a <= TH; a += (W < 420 ? 40 : 20)) g.push(`<text x="${X(a / R.dt)}" y="${y1 + 16}" text-anchor="${a === TH ? 'end' : a === 0 ? 'start' : 'middle'}" class="fo-ax">${AN(a)}</text>`);
    g.push(`<line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" stroke="${COUL.gris}"/>`);
    ce.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" role="img" aria-label="${esc(t('Forêt quand on arrête de couper', 'Forest when cutting stops'))}">${g.join('')}</svg>`;
    // equilibrium (hysteresis) diagram: harvest pressure x against forest b
    const ee = hy.querySelector('.fo-he'), We = Math.max(260, ee.clientWidth || 360), He = 210;
    const u0 = 34, u1 = We - 12, v0 = 18, v1 = He - 30, XM = 2;
    const U = x => u0 + (u1 - u0) * Math.min(x, XM) / XM, V = b => v1 - (v1 - v0) * b;
    const ge = [];
    let haut = '', bas = '';
    for (let q = 0; q <= 400; q++) {
      const b = P.a + (1 - P.a) * q / 400, s = soleq(b, B);
      const x = repousse(b, s, P) / (P.h0 * acces(b, P));
      const pt = `${U(x).toFixed(1)} ${V(b).toFixed(1)}`;
      if (b >= P.bpk) haut += (haut ? 'L' : 'M') + pt; else bas += (bas ? 'L' : 'M') + pt;
    }
    ge.push(`<rect x="${u0}" y="${V(P.a)}" width="${u1 - u0}" height="${v1 - V(P.a)}" fill="${COUL.rouge}" opacity=".08"/>`);
    ge.push(`<path d="${bas}" fill="none" stroke="${COUL.ambre}" stroke-width="1.8" stroke-dasharray="5 4"/>`);
    ge.push(`<path d="${haut}" fill="none" stroke="${COUL.foret}" stroke-width="2.4"/>`);
    ge.push(`<line x1="${u0}" x2="${u1}" y1="${V(0)}" y2="${V(0)}" stroke="${COUL.rouge}" stroke-width="2.4"/>`);
    ge.push(`<line x1="${U(1)}" x2="${U(1)}" y1="${v0}" y2="${v1}" stroke="${COUL.gris}" stroke-dasharray="2 3"/><text x="${U(1) + 3}" y="${v0 + 8}" class="fo-ft">${esc(t('aujourd’hui', 'today'))}</text>`);
    // trajectory
    let tr = ''; for (let i = 0; i <= n; i += 2) tr += (i ? 'L' : 'M') + U(R.x[i]).toFixed(1) + ' ' + V(R.b[i]).toFixed(1);
    ge.push(`<path d="${tr}" fill="none" stroke="${COUL.texte}" stroke-width="1.2" opacity=".55"/>`);
    ge.push(`<circle cx="${U(R.x[0])}" cy="${V(R.b[0])}" r="4" fill="#fff" stroke="${COUL.texte}"/><circle cx="${U(R.x[n])}" cy="${V(R.b[n])}" r="5" fill="${R.b[n] < P.a ? COUL.rouge : COUL.foret}" stroke="#fff"/>`);
    for (const x of [0, 1, 2]) ge.push(`<text x="${U(x)}" y="${v1 + 14}" text-anchor="middle" class="fo-ax">${x === 0 ? t('0 (arrêt)', '0 (stop)') : '×' + x}</text>`);
    ge.push(`<text x="${(u0 + u1) / 2}" y="${v1 + 27}" text-anchor="middle" class="fo-ax">${esc(t('Pression de coupe (×1 = aujourd’hui)', 'Cutting pressure (×1 = today)'))}</text>`);
    ge.push(`<text x="${u0}" y="${v0 - 6}" class="fo-axt">${esc(t('Où la forêt se pose', 'Where the forest settles'))}</text>`);
    ee.innerHTML = `<svg viewBox="0 0 ${We} ${He}" width="${We}" height="${He}" role="img" aria-label="${esc(t('Diagramme des équilibres', 'Equilibrium diagram'))}">${ge.join('')}</svg>
      <p class="fo-petit"><span class="fo-cle" style="--c:${COUL.foret}"></span>${esc(t('forêt stable', 'stable forest'))}
      <span class="fo-cle ti" style="--c:${COUL.ambre}"></span>${esc(t('point de bascule', 'tipping point'))}
      <span class="fo-cle" style="--c:${COUL.rouge}"></span>${esc(t('forêt effondrée, stable elle aussi', 'collapsed forest, also stable'))}
      <span class="fo-nw"><span class="fo-cle" style="--c:${COUL.texte}"></span>${esc(t('trajet de la forêt', 'path of the forest'))}</span></p>`;
    // message
    const bs = R.b[is], bf = R.b[n];
    let msg;
    if (bf > P.a && bs < P.a) msg = t(`Arrêter en ${AN(etat.stop)} ne suffisait pas : c’est la replantation qui fait repasser le seuil, et il faut pour cela planter un million d’hectares, plus du tiers du pays.`, `Stopping in ${AN(etat.stop)} was not enough: it is the replanting that brings it back over the threshold, and that takes a million hectares, over a third of the country.`);
    else if (bf > P.a) msg = t(`Arrêter en ${AN(etat.stop)} : la forêt était encore au-dessus du seuil (${nb(bs * 100)} %), elle repousse d’elle-même.`, `Stopping in ${AN(etat.stop)}: the forest was still above the threshold (${nb(bs * 100)} %), it grows back on its own.`);
    else msg = t(`Arrêter en ${AN(etat.stop)} : la forêt était déjà sous le seuil (${nb(bs * 100)} %). Plus personne ne coupe, et pourtant elle continue de disparaître.`, `Stopping in ${AN(etat.stop)}: the forest was already below the threshold (${nb(bs * 100)} %). Nobody cuts any more, yet it keeps disappearing.`);
    const pass = tcR != null ? t(` Sans rien faire, elle passe le seuil vers ${AN(tcR)}.`, ` Doing nothing, it passes the threshold around ${AN(tcR)}.`) : '';
    hy.querySelector('.fo-hmsg').innerHTML = `<div class="${bf > P.a ? 'fo-ok' : 'fo-alerte'}">${esc(msg + pass)}</div>
      <p class="fo-petit">${esc(t('À droite, la même histoire vue autrement. La forêt suit la courbe verte tant que la coupe augmente doucement, puis tombe du bord quand la coupe dépasse ce qu’elle peut repousser. Revenir à gauche (moins couper) ne la fait pas remonter : elle reste sur la ligne rouge. C’est l’hystérésis : le chemin du retour n’est pas celui de l’aller.',
      'On the right, the same story seen another way. The forest follows the green curve while cutting rises slowly, then falls off the edge when cutting exceeds what it can regrow. Going back left (cutting less) does not lift it: it stays on the red line. This is hysteresis: the way back is not the way there.'))}</p>`;
  }

  /* ----------------------------------------------------------- robustness */
  function robu() {
    const res = robustesse(B);
    r.querySelector('.fo-robu').innerHTML = `<div class="fo-barres">${res.map(x => {
      const p = PRESETS.find(p => p.id === x.id), q = x.ok / x.n;
      return `<div class="fo-bl"><span>${esc(t(p.fr, p.en))}</span><span class="fo-piste"><i style="width:${q * 100}%;background:${q > 0.8 ? COUL.foret : q > 0.4 ? COUL.ambre : COUL.rouge}"></i></span><b>${nb(x.ok)} / ${nb(x.n)}</b></div>`;
    }).join('')}</div>
    <p class="fo-petit">${esc(t('Ce qui tient quelles que soient les hypothèses : planter seul retarde la chute sans l’éviter ; réduire la demande de charbon est ce qui garde la forêt hors de danger. Les dates exactes, elles, changent beaucoup d’un jeu d’hypothèses à l’autre : ce ne sont pas des prévisions.',
      'What holds whatever the assumptions: planting alone delays the fall without avoiding it; cutting charcoal demand is what keeps the forest out of danger. The exact dates change a lot from one set of assumptions to another: they are not forecasts.'))}</p>`;
  }

  /* ----------------------------------------------------------- folded panels */
  function plis() {
    const P = parametres(etat.H, B);
    const ver = verifications(etat.H, B);
    const vt = {
      k: [t('Sans coupe, depuis 30 %, la forêt revient à son maximum', 'With no cutting, from 30 %, the forest returns to its maximum'), v => `${nb(v * 100, 2)} % ${t('après 200 ans', 'after 200 years')}`],
      a: [t('Sans coupe, juste sous le seuil, elle ne revient pas', 'With no cutting, just below the threshold, it does not return'), v => `${nb(v * 100, 2)} % ${t('après 200 ans', 'after 200 years')}`],
      h: [t('Coupe forte (×1,5 tenue 50 ans) : effondrement', 'Heavy cutting (×1.5 held 50 years): collapse'), v => `${nb(v * 100, 2)} % ${t('en', 'in')} ${AN(50)}`],
      dt: [t('Pas de temps : écart maximal entre dt = 0,1 et 0,05 an (4 scénarios)', 'Time step: largest gap between dt = 0.1 and 0.05 year (4 scenarios)'), (v, o) => `${nb(v * 100, 2)} ${t('point de %', '% point')} ; ${t('entre 0,05 et 0,025', 'between 0.05 and 0.025')} : ${nb(o.v2 * 100, 2)}`],
      cal: [t('Calage : variation nette du stock au départ (cible SEI −0,4 %/an)', 'Calibration: net change of the stock at start (SEI target −0.4 %/yr)'), v => `${nb(v * 100, 2)} %/${t('an', 'yr')}`],
      sei: [t('Cohérence SEI : demande de bois −44 % ⇒ la dégradation s’inverse', 'SEI consistency: wood demand −44 % ⇒ degradation reverses'), v => `${nb(H0p(v))} % ${t('en', 'in')} ${AN(50)}`],
      msy: [t('Coupe maximale que la forêt peut repousser, par rapport à aujourd’hui', 'Largest cut the forest can regrow, relative to today'), v => `×${nb(v, 2)}`],
    };
    function H0p(v) { return v * 100; }
    const mod = (id) => modele?.graphe?.aretes?.find(a => a.de === LIENS[id].de && a.vers === LIENS[id].vers);
    const noms = Object.fromEntries((modele?.graphe?.noeuds || []).map(n => [n.id, L === 'en' ? n.en : n.fr]));
    const src = a => a?.src?.url ? `<a href="${esc(a.src.url)}" target="_blank" rel="noopener">${esc(L === 'en' ? (a.cite_en || a.src.titre) : (a.cite_fr || a.src.titre))}</a>` : '';
    const lienPar = (de, vers) => modele?.graphe?.aretes?.find(a => a.de === de && a.vers === vers);
    const aTarter = lienPar('foret', 'abondance_bois'), aSei = lienPar('pression_bois', 'foret'), aCulot = lienPar('biodiv', 'foret'),
      aSun = lienPar('foret', 'erosion'), aIndia = lienPar('cuisson', 'pression_bois'), aBr = lienPar('controle', 'pression_bois'),
      aSch = lienPar('abondance_bois', 'rentabilite_charbon'), aKn = lienPar('ancrage', 'pression_bois'), aMal = lienPar('abondance_bois', 'cuisson');
    const moyPerte = pertesLoc.length ? pertesLoc.reduce((a, x) => a + x, 0) / pertesLoc.length : null;
    const etiq = s => `<span class="fo-tag ${s}">${esc({ pub: t('publié', 'published'), mes: t('mesuré', 'measured'), der: t('déduit', 'derived'), cal: t('calé', 'calibrated'), hyp: t('hypothèse', 'assumption') }[s])}</span>`;
    const params = [
      ['C₀', t('Charbon consommé en Haïti', 'Charcoal consumed in Haiti'), `${nb(B.CHARBON0)} t/${t('an', 'yr')}`, 'pub', src(aTarter)],
      [t('Tendance', 'Trend'), t('Recul net du stock ligneux, 2017-2027', 'Net decline of woody stock, 2017-2027'), t('−4 % en 10 ans, ≈ 300 kt/an', '−4 % in 10 years, ≈ 300 kt/yr'), 'pub', src(aSei)],
      ['B₀', t('Stock ligneux aujourd’hui (300 kt ÷ 0,4 %)', 'Woody stock today (300 kt ÷ 0.4 %)'), `≈ ${nb(B.B0_T / 1e6)} Mt`, 'der', src(aSei)],
      ['P₀', t('Ménages cuisinant propre aujourd’hui (moyenne des 10 sections APRI)', 'Households cooking clean today (mean of the 10 APRI sections)'), `${nb(B.C0 * 100, 1)} %`, 'mes', t('Enquête ménages APRI 2024 (de 0 à 17,5 % selon la section)', 'APRI household survey 2024 (0 to 17.5 % by section)')],
      [t('Contrôle', 'Check'), t('Perte nette de couvert arboré dans les sections APRI, 2000-2025', 'Net tree cover loss in the APRI sections, 2000-2025'), moyPerte != null ? `${nb(moyPerte, 2)} %/${t('an', 'yr')}` : '–', 'mes', t('Hansen, Global Forest Change v1.13 ; utilisé pour vérifier l’ordre de grandeur, pas pour caler', 'Hansen, Global Forest Change v1.13; used to check the order of magnitude, not to calibrate')],
      ['F₀/K', t('Forêt aujourd’hui, part du maximum', 'Forest today, share of maximum'), `${nb(etat.H.b0 * 100)} %`, 'hyp', t('Choisi pour que la coupe actuelle reste un peu sous la coupe maximale soutenable', 'Chosen so that today’s cut stays a little below the largest sustainable cut')],
      ['K', t('Maximum que le paysage peut porter (B₀ ÷ F₀/K)', 'Most the landscape can carry (B₀ ÷ F₀/K)'), `≈ ${nb(P.K / 1e6)} Mt`, 'der', ''],
      ['A', t('Seuil de non-retour', 'No-return threshold'), `${nb(etat.H.a * 100)} % ${t('de K', 'of K')}`, 'hyp', `${t('Mécanisme documenté, position supposée.', 'Documented mechanism, assumed position.')} ${src(aCulot)}`],
      ['r', t('Vitesse de repousse', 'Regrowth rate'), `${nb(P.r, 3)} /${t('an', 'yr')}`, 'cal', t('Calée pour retrouver la tendance SEI au départ', 'Calibrated to match the SEI trend at start')],
      [t('ratio', 'ratio'), t('Bois par tonne de charbon (meule traditionnelle)', 'Wood per tonne of charcoal (traditional kiln)'), `${nb(B.RATIO)} t`, 'hyp', t('Ordre de grandeur courant (rendement ≈ 15 %) ; ne joue que sur le poids relatif des plantations', 'Common order of magnitude (yield ≈ 15 %); only affects the relative weight of planting')],
      ['g', t('Croissance du nombre de ménages', 'Growth in the number of households'), `${nb(etat.H.g * 100, 1)} %/${t('an', 'yr')}`, 'hyp', `${t('Ordre de grandeur de la croissance démographique (Nations unies).', 'Order of magnitude of population growth (United Nations).')} ${src(aKn)}`],
      ['σ', t('Baisse de charbon quand un ménage passe au propre', 'Charcoal drop when a household switches to clean fuel'), `${nb(etat.H.sig * 100)} %`, 'hyp', `${t('Moins de 100 % : les ménages cumulent les combustibles.', 'Below 100 %: households stack fuels.')} ${src(aIndia)} ${src(aMal)}`],
      ['P_max, p, q', t('Plafond et vitesse de diffusion de la cuisson propre', 'Ceiling and speed of clean cooking diffusion'), `${nb(B.CMAX * 100)} % ; ${nb(B.BASS_P0 + B.BASS_P, 3)} ; ${nb(B.BASS_Q, 2)}`, 'hyp', t('Courbe de diffusion de Bass, valeurs illustratives', 'Bass diffusion curve, illustrative values')],
      ['e_max', t('Part de la coupe que le contrôle peut empêcher', 'Share of cutting enforcement can prevent'), `${nb(B.EMAX * 100)} %`, 'hyp', `${t('Le Brésil (−75 %, satellites et amendes) est un plafond dans un tout autre contexte.', 'Brazil (−75 %, satellites and fines) is a ceiling in a very different context.')} ${src(aBr)}`],
      ['k', t('Accessibilité : quand le bois se raréfie, il est plus loin et plus dur à couper', 'Accessibility: as wood gets scarce, it is further and harder to cut'), `${nb(B.KACC * 100)} % ${t('de K', 'of K')}`, 'hyp', src(aSch)],
      [t('Plantation', 'Planting'), t('Survie, biomasse à maturité, délai', 'Survival, mature biomass, delay'), `${nb(B.SURVIE * 100)} % ; ${nb(B.T_HA)} t/ha ; ${nb(B.TAU_J)} ${t('ans', 'yrs')}`, 'hyp', t('Valeurs illustratives', 'Illustrative values')],
      ['S', t('Sol : se dégrade sous 40 % de forêt, suit avec 15 ans de retard, ralentit la repousse jusqu’à moitié', 'Soil: degrades below 40 % forest, follows with a 15-year lag, slows regrowth by up to half'), '0,4 ; 15 ; 0,5', 'hyp', src(aSun)],
    ];
    r.querySelector('.fo-plis').innerHTML = `
    <details class="pli fo-pli"><summary>${esc(t('Changer les hypothèses', 'Change the assumptions'))}</summary>
      <p class="fo-petit">${esc(t('Ces quatre valeurs ne sont pas mesurées. Changez-les pour voir ce qui tient et ce qui bouge. Tout le reste de la page se recalcule.', 'These four values are not measured. Change them to see what holds and what moves. The whole page recalculates.'))}</p>
      <div class="fo-hyp"></div>
      <button type="button" class="bouton fo-hraz">${esc(t('Revenir aux valeurs de départ', 'Back to starting values'))}</button>
    </details>
    <details class="pli fo-pli"><summary>${esc(t('Les équations', 'The equations'))}</summary>
      <p class="fo-petit">${esc(t('F est la forêt en part du maximum K, le temps est en années, résolu pas à pas (0,1 an).', 'F is the forest as a share of the maximum K, time is in years, solved step by step (0.1 year).'))}</p>
      <pre class="fo-eq">dF/dt = R − C + M
R = r · F · (1 − F) · (F/A − 1) · (0,5 + 0,5·S)          ${t('repousse : négative sous A', 'regrowth: negative below A')}
C = h₀ · D(t) · (1 − e_max·E) · a(F)                       ${t('coupe pour le charbon', 'cutting for charcoal')}
D(t) = e^(g·t) · (1 − σ·P) / (1 − σ·P₀)                    ${t('demande, 1 = aujourd’hui', 'demand, 1 = today')}
a(F) = [F/(F+k)] / [F₀/(F₀+k)]                             ${t('accessibilité', 'accessibility')}
dP/dt = (p + q·P) · (P_max − P)                            ${t('adoption de la cuisson propre (Bass)', 'clean cooking uptake (Bass)')}
dJ/dt = plantation · survie · t/ha / K − J/τ_J ;  M = J/τ_J   ${t('jeunes plantations', 'young plantations')}
dS/dt = (min(1, F/0,4) − S) / τ_S                          ${t('sols', 'soils')}
dE/dt = (contrôle − E) / 3                                 ${t('montée du contrôle', 'enforcement ramp-up')}</pre>
      <p class="fo-petit">${esc(t('Le seuil vient du terme (F/A − 1) : sous A, la mortalité naturelle et l’érosion l’emportent sur la régénération, la repousse devient négative. Avec la coupe, le point de bascule est plus haut : c’est l’équilibre instable où repousse = coupe (ligne orange du graphique). Quand la coupe dépasse la repousse maximale, il n’y a plus d’équilibre forestier du tout.',
      'The threshold comes from the term (F/A − 1): below A, natural mortality and erosion outweigh regeneration, regrowth turns negative. With cutting, the tipping point is higher: the unstable equilibrium where regrowth = cutting (orange line on the chart). When cutting exceeds the largest possible regrowth, there is no forest equilibrium at all.'))}</p>
    </details>
    <details class="pli fo-pli"><summary>${esc(t('Paramètres, sources et ce qui est supposé', 'Parameters, sources and what is assumed'))}</summary>
      <div class="sx-defile"><table class="sx-tab fo-tab"><thead><tr><th></th><th>${esc(t('Quoi', 'What'))}</th><th>${esc(t('Valeur', 'Value'))}</th><th>${esc(t('Statut', 'Status'))}</th><th>${esc(t('Source ou raison', 'Source or reason'))}</th></tr></thead>
      <tbody>${params.map(p => `<tr><td><b>${esc(p[0])}</b></td><td>${esc(p[1])}</td><td class="fo-nw">${esc(p[2])}</td><td>${etiq(p[3])}</td><td>${p[4]}</td></tr>`).join('')}</tbody></table></div>
      <p class="fo-petit">${esc(t('Ce modèle agrège tout Haïti en un seul stock. Dans la réalité, la bascule se joue bassin versant par bassin versant : certains sont déjà passés (42 des 50 grands massifs n’ont plus de forêt primaire), d’autres non. Il ne tient pas compte du prix du charbon (stable en termes réels depuis 1978, selon la Banque mondiale), des cyclones, ni du bois de feu brûlé directement. Les dates qu’il donne ne sont pas des prévisions ; la forme des trajectoires, elle, est robuste.',
      'This model lumps all of Haiti into a single stock. In reality, tipping happens watershed by watershed: some have already passed (42 of the 50 large massifs have no primary forest left), others not. It ignores the charcoal price (stable in real terms since 1978, according to the World Bank), hurricanes, and fuelwood burnt directly. The dates it gives are not forecasts; the shape of the trajectories is robust.'))}</p>
    </details>
    <details class="pli fo-pli"><summary>${esc(t('Pourquoi le modèle linéaire ne peut pas basculer, et celui-ci si', 'Why the linear model cannot tip, and this one can'))}</summary>
      <p>${esc(t('Le modèle causal des autres onglets est linéaire : une poussée se propage le long des liens, atténuée à chaque passage (la stabilité du modèle est réglée à 0,6, sous 1). Deux conséquences. L’effet est toujours proportionnel à la poussée : deux fois plus de poussée, deux fois plus d’effet. Et il disparaît quand la poussée cesse : le modèle n’a pas de mémoire. Il ne peut donc ni basculer, ni rester bloqué.',
      'The causal model of the other tabs is linear: a push travels along the links, damped at each step (model stability is set at 0.6, below 1). Two consequences. The effect is always proportional to the push: twice the push, twice the effect. And it vanishes when the push stops: the model has no memory. So it can neither tip nor get stuck.'))}</p>
      <p>${esc(t('Ici, la forêt est un stock : elle garde la trace de tout ce qui lui est arrivé. Et sa repousse dépend de ce qui reste : beaucoup d’arbres semenciers, elle repart vite ; trop peu, elle s’inverse. La même action peut alors tout sauver ou ne rien changer selon le moment, et défaire ce qui a été fait ne ramène pas au point de départ. Les deux modèles se complètent : le linéaire montre par où une poussée voyage dans tout le système, celui-ci montre ce qui se passe dans une boucle quand elle dépasse sa limite.',
      'Here the forest is a stock: it keeps track of everything that happened to it. And its regrowth depends on what is left: many seed trees, it bounces back fast; too few, it reverses. The same action can then save everything or change nothing depending on timing, and undoing what was done does not bring you back to the start. The two models complement each other: the linear one shows where a push travels through the whole system, this one shows what happens inside one loop when it goes past its limit.'))}</p>
      <p class="fo-petit">${esc(t('Les liens du modèle causal qui deviennent ici des flux :', 'The links of the causal model that become flows here:'))}</p>
      <div class="sx-defile"><table class="sx-tab fo-tab"><thead><tr><th>${esc(t('Lien du modèle causal', 'Causal model link'))}</th><th>${esc(t('Force', 'Strength'))}</th><th>${esc(t('Devient ici', 'Becomes here'))}</th><th>${esc(t('Preuve', 'Evidence'))}</th></tr></thead><tbody>
      ${LIENS.map((l, i) => { const a = mod(i); if (!a) return ''; return `<tr><td>${esc(noms[l.de] || l.de)} → ${esc(noms[l.vers] || l.vers)} <span class="fo-sgn ${a.signe > 0 ? 'p' : 'm'}">${a.signe > 0 ? '+' : '−'}</span></td><td>${esc(classe(a.force, L))}</td><td>${esc(t(l.terme.fr, l.terme.en))}</td><td>${esc(L === 'en' ? a.ref_en : a.ref_fr)} ${src(a)}</td></tr>`; }).join('')}
      </tbody></table></div>
    </details>
    <details class="pli fo-pli"><summary>${esc(t('Contrôles numériques (recalculés dans votre navigateur)', 'Numerical checks (recomputed in your browser)'))}</summary>
      <ul class="fo-ver">${ver.map(v => `<li><span class="${v.ok ? 'ok' : 'ko'}">${v.ok ? '✓' : '✗'}</span> ${esc(vt[v.id][0])} : <b>${esc(vt[v.id][1](v.v, v))}</b></li>`).join('')}</ul>
      <p class="fo-petit">${esc(t('Méthode d’Euler explicite, pas de 0,1 an. Diviser le pas par deux change très peu les courbes : le calcul a convergé. Le plus grand écart apparaît pendant la chute, où quelques semaines de décalage suffisent à créer une différence.',
      'Explicit Euler method, 0.1-year step. Halving the step barely changes the curves: the calculation has converged. The largest gap appears during the fall, where a few weeks of shift are enough to make a difference.'))}</p>
    </details>`;
    // assumptions sliders
    const hypEl = r.querySelector('.fo-hyp');
    const hs = [
      { k: 'a', fr: 'Seuil de non-retour (% du maximum)', en: 'No-return threshold (% of maximum)', min: 0.05, max: 0.3, step: 0.01, v: x => `${nb(x * 100)} %` },
      { k: 'g', fr: 'Croissance des ménages par an', en: 'Household growth per year', min: 0, max: 0.025, step: 0.001, v: x => `${nb(x * 100, 1)} %` },
      { k: 'b0', fr: 'Forêt aujourd’hui (% du maximum)', en: 'Forest today (% of maximum)', min: 0.7, max: 0.95, step: 0.01, v: x => `${nb(x * 100)} %` },
      { k: 'sig', fr: 'Baisse de charbon par ménage passé au propre', en: 'Charcoal drop per household switching', min: 0.3, max: 1, step: 0.05, v: x => `${nb(x * 100)} %` },
    ];
    for (const h of hs) {
      const w = apri.h(`<label class="fo-curseur"><span class="fo-nom">${esc(t(h.fr, h.en))}</span> <output>${h.v(etat.H[h.k])}</output><input type="range" min="${h.min}" max="${h.max}" step="${h.step}" value="${etat.H[h.k]}"></label>`);
      const inp = w.querySelector('input'), out = w.querySelector('output');
      inp.oninput = () => { etat.H[h.k] = Number(inp.value); out.textContent = h.v(etat.H[h.k]); toutRecalculer(false); };
      inp.onchange = () => majVerifs();
      hypEl.append(w);
    }
    r.querySelector('.fo-hraz').onclick = () => { etat.H = { ...HYP0 }; toutRecalculer(true); };
  }
  function majVerifs() {
    // rebuild the folded panels with the new assumptions, keeping open ones open
    const ouverts = [...r.querySelectorAll('.fo-plis details')].map(d => d.open);
    plis(); robu();
    r.querySelectorAll('.fo-plis details').forEach((d, i) => { d.open = !!ouverts[i]; });
  }
  function toutRecalculer(plisAussi) {
    calculer(false); hyst();
    if (plisAussi) majVerifs();
  }

  /* ----------------------------------------------------------- start */
  majCurseurs();
  plis();
  robu();
  calculer(!etat.vu && !reduit); etat.vu = true;
  hyst();
  let largeur = r.clientWidth;
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    if (Math.abs(r.clientWidth - largeur) < 4) return;
    largeur = r.clientWidth; dessiner(); hyst();
  }) : null;
  ro?.observe(r);
  nettoyer = () => { stopAnim(); ro?.disconnect(); };
}
