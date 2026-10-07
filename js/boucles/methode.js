/* Tab "Comment lire ce modèle / How to read this model".
   Three short cards: what the model is and is not; the rule that turns a
   published effect into a strength class (with the rule applied to every
   quantified link, for review); what comes next with the household panel.
   The model's strengths are NOT changed here: the rule is shown for review. */
import * as E from './moteur.js';

// ------------------------------------------------------------------ classes
/** the five classes of BRIEF_BOUCLES.md (moteur.js exports them; local copy if absent) */
export const CLASSES = E.CLASSES || [
  { k: 1, fr: 'très faible', en: 'very weak', c: 0.20, lo: 0.125, hi: 0.275 },
  { k: 2, fr: 'faible', en: 'weak', c: 0.35, lo: 0.275, hi: 0.425 },
  { k: 3, fr: 'moyenne', en: 'moderate', c: 0.50, lo: 0.425, hi: 0.575 },
  { k: 4, fr: 'forte', en: 'strong', c: 0.65, lo: 0.575, hi: 0.725 },
  { k: 5, fr: 'très forte', en: 'very strong', c: 0.80, lo: 0.725, hi: 0.875 },
];
/** class number (1..5) of a stored strength; 0.6 → 4 */
export function classeNum(force) {
  if (E.classeDe) return E.classeDe(force).k;
  const f = Math.abs(Number(force) || 0);
  for (const c of CLASSES) if (f < c.hi) return c.k;
  return 5;
}
/** central strength of a class, also for a half class (median of an even number of answers) */
export const forceDeClasse = k => 0.2 + (Number(k) - 1) * 0.15;
export const nomClasse = (k, lang) => { const c = CLASSES[Math.round(k) - 1]; return c ? (lang === 'en' ? c.en : c.fr) : ''; };

// ------------------------------------------------------------------ the rule
/** thresholds on |d| (Cohen 1988: 0.2 small, 0.5 medium, 0.8 large; Sawilowsky 2009: 1.2 very large) */
export const SEUILS_D = [0.2, 0.5, 0.8, 1.2];
/** thresholds on an elasticity (APRI convention, no published standard) */
export const SEUILS_EL = [0.1, 0.3, 0.6, 1.0];
const K = Math.sqrt(3) / Math.PI;           // Chinn 2000: d = ln(OR) × √3 / π
export const dDeOR = or => Math.abs(Math.log(or)) * K;
export const dDeR = r => { const a = Math.min(Math.abs(r), 0.999); return 2 * a / Math.sqrt(1 - a * a); };
export const rDeD = d => d / Math.sqrt(d * d + 4);
export const orDeD = d => Math.exp(d / K);
export const hDeP = (p1, p2) => Math.abs(2 * Math.asin(Math.sqrt(p2)) - 2 * Math.asin(Math.sqrt(p1)));
export const classeDeD = d => 1 + SEUILS_D.filter(s => d >= s).length;
export const classeDeEl = e => 1 + SEUILS_EL.filter(s => Math.abs(e) >= s).length;

/* THE CODING OF EVERY LINK WITH A PUBLISHED QUANTITATIVE EFFECT.
   t: OR odds ratio (also hazard ratio, "x times more likely")
      RR ratio of two levels or a relative change (−49 % → 0.51), read like an OR
      R  correlation, partial r or standardised coefficient
      R2 share of variance explained (r = √R²)
      D  standardised mean difference
      H  two shares p1 → p2 (Cohen's h)
      PP a difference in percentage points with no baseline: centred on 50 %
      EL elasticity (% change of the effect for 1 % change of the cause)
      NS no significant effect (the interval includes "no effect") → class 1
   v: the value used; when the source gives several, the one closest to Haiti,
      else the median; for a range, its middle (c says which).
   f: downgrades, one class each: P other country (not Haiti), O other outcome,
      X proxy measure of the cause, U single study. */
export const CODAGE = [
  { k: 'eau|sante', t: 'OR', v: 0.62, f: 'PO', c: ['mortalité infantile', 'child mortality'] },
  { k: 'sante|travail', t: 'R', v: 0.09, f: 'P', c: ['r partiel, pays en développement', 'partial r, developing countries'] },
  { k: 'travail|emploi', t: 'PP', v: 26.2, f: 'PXU', c: ['écart de taux d\'activité', 'participation gap'] },
  { k: 'revenu|alimentaire', t: 'OR', v: 8.19, f: 'XU', c: ['faim, Haïti ; équipement pour revenu', 'hunger, Haiti; assets for income'] },
  { k: 'alimentaire|sante', t: 'OR', v: 4.61, f: 'PO', c: ['retard de croissance', 'stunting'] },
  { k: 'temps_eau|travail', t: 'PP', v: 7.9, f: 'POXU', c: ['emploi agricole', 'farm employment'] },
  { k: 'temps_eau|education', t: 'PP', v: 2.4, f: 'POU', c: ['fréquentation des filles', 'girls\' attendance'] },
  { k: 'services|eau', t: 'PP', v: 2, f: 'PXU', c: ['milieu de 1 à 3 points', 'middle of 1 to 3 points'] },
  { k: 'compte|revenu', t: 'NS', v: null, f: 'PU' },
  { k: 'revenu|compte', t: 'H', v: [0.61, 0.74], f: 'PU' },
  { k: 'aridite|prod_agri', t: 'EL', v: 39.3 / 40, f: 'P', c: ['maïs : −39,3 % pour −40 % d\'eau', 'maize: −39.3% for −40% water'] },
  { k: 'vegetation|prod_agri', t: 'R', v: 0.61, f: 'PU', c: ['médiane de R = 0,70 et 0,52', 'median of R = 0.70 and 0.52'] },
  { k: 'prod_agri|revenu', t: 'EL', v: 0.10, f: 'PU', c: ['Amérique latine', 'Latin America'] },
  { k: 'prod_agri|alimentaire', t: 'PP', v: 16.33, f: 'PX', c: ['agriculture biologique', 'organic farming'] },
  { k: 'foncier|prod_agri', t: 'H', v: [0.703, 0.901], f: 'POU', c: ['pratiques de gestion des terres', 'land management practices'] },
  { k: 'alerte|prepa', t: 'OR', v: 2.238, f: 'POU', c: ['préparation perçue', 'perceived preparedness'] },
  { k: 'ocb|comites', t: 'PP', v: 5.2, f: 'PU' },
  { k: 'identite|services', t: 'OR', v: 1.4, f: 'PO', c: ['transfert public reçu', 'public transfer received'] },
  { k: 'ocb|passerelle', t: 'D', v: 0.48, f: 'PU', c: ['médiane de d = 0,42 et 0,54', 'median of d = 0.42 and 0.54'] },
  { k: 'passerelle|transferts', t: 'H', v: [0.25, 0.667], f: 'XU', c: ['Haïti ; migrant pour passerelle', 'Haiti; migrant for bridging'] },
  { k: 'entraide|alimentaire', t: 'OR', v: 1.36, f: 'PU', c: ['par contact fiable', 'per reliable contact'] },
  { k: 'transferts|reserve', t: 'PP', v: 18.75, f: 'PU', c: ['milieu de 16,8 à 20,7 points', 'middle of 16.8 to 20.7 points'] },
  { k: 'reserve|alimentaire', t: 'OR', v: 2.62, f: 'PXU' },
  { k: 'securite|passerelle', t: 'NS', v: null, f: 'P' },
  { k: 'entraide|securite', t: 'R', v: 0.436, f: 'PU', c: ['bêta standardisé', 'standardised beta'] },
  { k: 'ecole|education', t: 'PP', v: 16, f: 'POU', c: ['inscription, par mille', 'enrolment, per mile'] },
  { k: 'logement|sante', t: 'RR', v: 0.22, f: 'POU', c: ['médiane : parasitoses −78 %', 'median: parasites −78%'] },
  { k: 'cuisson|pression_bois', t: 'PP', v: 2.2, f: 'PU' },
  { k: 'agro_durable|fertilite', t: 'RR', v: 1.78, f: 'P', c: ['carbone du sol +78 %', 'soil carbon +78%'] },
  { k: 'fertilite|prod_agri', t: 'RR', v: 1.2, f: 'P' },
  { k: 'erosion|prod_agri', t: 'RR', v: Math.exp(-0.5), f: 'P', c: ['médiane : ln RR −0,50', 'median: ln RR −0.50'] },
  { k: 'foret|erosion', t: 'RR', v: 1 - 0.9238, f: 'PU', c: ['sédiments −92 % (milieu)', 'sediment −92% (middle)'] },
  { k: 'foret|infiltration', t: 'RR', v: 0.248 / 0.051, f: 'PU' },
  { k: 'infiltration|aridite', t: 'H', v: [0.12, 0.27], f: 'POU' },
  { k: 'aridite|vegetation', t: 'R', v: 0.62, f: 'PU', c: ['médiane de 4 r', 'median of 4 r'] },
  { k: 'vegetation|foret', t: 'R2', v: 0.37, f: 'POU', c: ['mortalité des arbres', 'tree mortality'] },
  { k: 'revenu|pression_bois', t: 'R', v: 0.84, f: 'PXU', c: ['dépense pour revenu', 'spending for income'] },
  { k: 'foret|biodiv', t: 'RR', v: 0.12, f: 'U', c: ['Haïti : endémiques −88 %', 'Haiti: endemics −88%'] },
  { k: 'biodiv|foret', t: 'RR', v: 1 - 0.828, f: 'POU', c: ['recrutement −83 % (milieu)', 'recruitment −83% (middle)'] },
  { k: 'prod_agri|ancrage', t: 'PP', v: 9.6, f: 'POXU' },
  { k: 'foret|sensib', t: 'OR', v: Math.exp(1.05), f: 'PXU', c: ['coefficient logit 1,05', 'logit coefficient 1.05'] },
  { k: 'sensib|agro_durable', t: 'RR', v: 0.77, f: 'P', c: ['pesticides −23 %', 'pesticides −23%'] },
  { k: 'abondance_bois|cuisson', t: 'H', v: [0.828, 0.858], f: 'PU' },
  { k: 'controle|pression_bois', t: 'RR', v: 0.25, f: 'POU', c: ['déforestation −75 %', 'deforestation −75%'] },
  { k: 'services|controle', t: 'OR', v: 0.49, f: 'PXU' },
  { k: 'elec|alerte', t: 'PP', v: 2.4, f: 'PXU', c: ['Bangladesh rural', 'rural Bangladesh'] },
  { k: 'elec|securite', t: 'NS', v: null, f: 'PU' },
  { k: 'elec|revenu', t: 'RR', v: 1.18, f: 'P', c: ['médiane +18 %', 'median +18%'] },
  { k: 'elec|education', t: 'PP', v: 15.4, f: 'P' },
  { k: 'services|elec', t: 'RR', v: 1.52, f: 'POXU' },
  { k: 'assain|eau', t: 'R', v: 0.96, f: 'POU', c: ['coliformes dans la nappe', 'groundwater coliforms'] },
  { k: 'mobile|compte', t: 'PP', v: 2, f: 'PU' },
  { k: 'mobile|revenu', t: 'NS', v: null, f: 'PU' },
  { k: 'mobile|passerelle', t: 'RR', v: 0.93, f: 'PXU', c: ['baisse de consommation 7 %', 'consumption drop 7%'] },
  { k: 'foncier|agro_durable', t: 'D', v: 0.42, f: 'P', c: ['effet agrégé, lu comme d', 'pooled effect, read as d'] },
  { k: 'foncier|ancrage', t: 'RR', v: 1.28, f: 'POU' },
  { k: 'pluie|prod_agri', t: 'R2', v: 0.355, f: 'PU', c: ['milieu de 32 à 39 %', 'middle of 32 to 39%'] },
  { k: 'pluie|infiltration', t: 'R', v: 0.885, f: 'PU', c: ['milieu de 0,80 à 0,97', 'middle of 0.80 to 0.97'] },
  { k: 'logement|securite', t: 'PP', v: 0, f: 'PU', c: ['médiane de 3 pays : 18, 0, 0', 'median of 3 countries: 18, 0, 0'] },
  { k: 'etat_civil|education', t: 'PP', v: 30, f: 'PU', c: ['milieu de 20 à 40 points', 'middle of 20 to 40 points'] },
  { k: 'alerte|sante', t: 'RR', v: 1 / 6, f: 'POU', c: ['mortalité des catastrophes', 'disaster mortality'] },
  { k: 'alerte|reserve', t: 'RR', v: 0.671, f: 'PXU', c: ['dépenses médicales', 'medical spending'] },
  { k: 'sante_acces|alimentaire', t: 'NS', v: null, f: 'PU' },
  { k: 'ecole|sante', t: 'RR', v: 0.39, f: 'POXU', c: ['vers intestinaux', 'intestinal worms'] },
  { k: 'feux|fertilite', t: 'RR', v: 102 / 199, f: 'PU', c: ['carbone du sol −49 %', 'soil carbon −49%'] },
  { k: 'pression_demo|foret', t: 'H', v: [0.06, 0.55], f: 'PXU', c: ['couvert 6 % → 55 %', 'cover 6% → 55%'] },
];

export const DECLASSEMENTS = {
  P: { fr: 'autre pays', en: 'other country' },
  O: { fr: 'autre résultat', en: 'other outcome' },
  X: { fr: 'mesure indirecte', en: 'proxy measure' },
  U: { fr: 'étude unique', en: 'single study' },
};

/** apply the rule to one coded link: {d, brute, finale, declasse} */
export function appliquerRegle(x) {
  let d = null, brute;
  switch (x.t) {
    case 'OR': case 'RR': d = dDeOR(x.v); break;
    case 'R': d = dDeR(x.v); break;
    case 'R2': d = dDeR(Math.sqrt(x.v)); break;
    case 'D': d = Math.abs(x.v); break;
    case 'H': d = hDeP(x.v[0], x.v[1]); break;
    case 'PP': { const p = x.v / 200; d = hDeP(0.5 - p, 0.5 + p); break; }
    case 'EL': brute = classeDeEl(x.v); break;
    case 'NS': brute = 1; break;
  }
  if (brute == null) brute = classeDeD(d);
  const declasse = [...(x.f || '')];
  const finale = x.t === 'NS' ? 1 : Math.max(1, brute - declasse.length);
  return { d, brute, finale, declasse };
}

// ------------------------------------------------------------------ helpers
function css() {
  if (!document.querySelector('link[href="css/boucles.css"]'))
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'css/boucles.css' }));
}
const SATELLITE = new Set(['foret', 'pluie', 'aridite', 'vegetation']);   // measured from space, by landscape, not by household
/** the links both of whose ends are measured household by household */
export function liensTestables(g) {
  const parId = Object.fromEntries(g.noeuds.map(n => [n.id, n]));
  const ok = id => parId[id] && parId[id].ligne != null && !SATELLITE.has(id);
  return g.aretes.filter(a => ok(a.de) && ok(a.vers));
}
/** the published effect, written briefly */
function effetTexte(x, apri) {
  const n = (v, dec = 2) => apri.nombre(v, dec);
  const pc = v => apri.lang === 'en' ? n(v * 100, 0) + '%' : n(v * 100, 0) + ' %';
  switch (x.t) {
    case 'OR': return apri.t('rapport de cotes ', 'odds ratio ') + n(x.v);
    case 'RR': return apri.t('rapport ', 'ratio ') + n(x.v);
    case 'R': return 'r = ' + n(x.v);
    case 'R2': return 'R² = ' + n(x.v);
    case 'D': return 'd = ' + n(x.v);
    case 'H': return pc(x.v[0]) + ' → ' + pc(x.v[1]);
    case 'PP': return n(x.v, x.v % 1 ? 1 : 0) + apri.t(' points', ' points');
    case 'EL': return apri.t('élasticité ', 'elasticity ') + n(x.v);
    case 'NS': return apri.t('non significatif', 'not significant');
  }
  return '';
}
function pastille(k, apri, petit = false) {
  const pts = [1, 2, 3, 4, 5].map(i => `<i class="${i <= k ? 'on' : ''}"></i>`).join('');
  return `<span class="me-cl me-cl${k}${petit ? ' petit' : ''}" title="${apri.esc(nomClasse(k, apri.lang))}"><span class="me-pts">${pts}</span>${petit ? '' : `<span>${apri.esc(nomClasse(k, apri.lang))}</span>`}</span>`;
}
function telecharger(texte, nom, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([texte], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ------------------------------------------------------------------ render
export default async function render(el, apri) {
  css();
  const donnees = await apri.donnees('data/boucles/modele.json');
  const t = apri.t.bind(apri), esc = apri.esc, L = apri.lang;
  const g = donnees.graphe;
  const nom = id => { const n = g.noeuds.find(x => x.id === id); return n ? (n[L] || n.fr) : id; };
  const parCle = new Map(g.aretes.map(a => [a.de + '|' + a.vers, a]));
  const nNoeuds = g.noeuds.length, nLiens = g.aretes.length;
  const nNeg = g.aretes.filter(a => a.signe < 0).length;
  const nNonMes = g.noeuds.filter(n => n.ligne == null).length;
  const testables = liensTestables(g);

  el.innerHTML = '';
  const r = document.createElement('div'); r.className = 'me';
  el.append(r);

  r.append(apri.h(`<div class="me-tete">
    <p class="lead">${esc(t('Ce qu\'il faut savoir pour lire les boucles sans leur faire dire plus qu\'elles ne disent.', 'What you need to know to read the loops without making them say more than they do.'))}</p>
    <p class="note">${esc(t('Trois cartes courtes : ce qu\'est le modèle, comment on fixe la force d\'un lien, et ce qui viendra avec la deuxième enquête. Les détails sont repliés.', 'Three short cards: what the model is, how the strength of a link is set, and what will come with the second survey. Details are folded away.'))}</p>
    <nav class="me-sommaire">
      <a href="#me-1"><b>1</b>${esc(t('Ce qu\'il est, et n\'est pas', 'What it is, and is not'))}</a>
      <a href="#me-2"><b>2</b>${esc(t('De l\'étude publiée à la force du lien', 'From the published study to the link strength'))}</a>
      <a href="#me-3"><b>3</b>${esc(t('La suite : mesurer sur les ménages', 'Next: measuring on households'))}</a>
    </nav></div>`));
  r.querySelectorAll('.me-sommaire a').forEach(a => a.onclick = e => {
    e.preventDefault(); r.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ============================================================ card 1
  const c1 = apri.h(`<div class="me-carte" id="me-1">
    <div class="me-num">1</div>
    <h3>${esc(t('Ce que le modèle est, et ce qu\'il n\'est pas', 'What the model is, and what it is not'))}</h3>
    <div class="me-deux">
      <div class="me-oui"><h4>✓ ${esc(t('Il est', 'It is'))}</h4><ul>
        <li>${esc(t(`Une carte de ${nLiens} liens de cause à effet entre ${nNoeuds} aspects de la résilience, chacun appuyé par une source publiée.`, `A map of ${nLiens} cause-and-effect links between ${nNoeuds} aspects of resilience, each backed by a published source.`))}</li>
        <li>${esc(t('Un outil pour explorer : « si ceci bouge, qu\'est-ce qui bouge ensuite ? »', 'A tool to explore: "if this moves, what moves next?"'))}</li>
        <li>${esc(t('Linéaire : une poussée deux fois plus forte produit un effet deux fois plus grand.', 'Linear: a push twice as strong gives an effect twice as large.'))}</li>
      </ul></div>
      <div class="me-non"><h4>✗ ${esc(t('Il n\'est pas', 'It is not'))}</h4><ul>
        <li>${esc(t('Une prévision : il ne dit ni ce qui va arriver, ni quand.', 'A forecast: it says neither what will happen nor when.'))}</li>
        <li>${esc(t('Une mesure : la force de chaque lien est une classe choisie par des experts (de très faible à très forte), pas une valeur estimée sur des données.', 'A measurement: the strength of each link is a class chosen by experts (from very weak to very strong), not a value estimated from data.'))}</li>
        <li>${esc(t('Capable de basculer : un modèle linéaire ne montre ni seuil, ni effondrement, ni point de non-retour.', 'Able to tip: a linear model shows no threshold, no collapse, no point of no return.'))}
          <a href="#boucles/foret" class="me-lien" data-aller="foret">${esc(t('Pour les seuils, voir l\'onglet Forêt →', 'For thresholds, see the Forest tab →'))}</a></li>
      </ul></div>
    </div>
    <h4 class="me-sous">${esc(t('Ce qui est fiable, et ce qui l\'est moins', 'What is reliable, and what is less so'))}</h4>
    <div class="me-fiab">
      ${[[3, t('Le sens d\'un effet', 'The direction of an effect'), t('« monte » ou « baisse » : le plus solide', '"goes up" or "goes down": the most solid')],
        [2, t('Le classement des leviers', 'The ranking of levers'), t('quels leviers passent devant : à prendre avec prudence', 'which levers come first: read with care')],
        [1, t('La taille exacte d\'un effet', 'The exact size of an effect'), t('« +0,012 » : un ordre d\'idée, pas une mesure', '"+0.012": a rough idea, not a measurement')]]
        .map(([n, a, b]) => `<div class="me-f"><span class="me-jauge j${n}"><i></i><i></i><i></i></span><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}
    </div>
    <details class="pli"><summary>${esc(t('Pourquoi ces limites ?', 'Why these limits?'))}</summary>
      <ul class="me-liste">
        <li>${esc(t('Les forces des liens sont des classes (0,20 ; 0,35 ; 0,50 ; 0,65 ; 0,80), puis toutes multipliées par un même facteur pour que le système reste stable (« stabilité du modèle » fixée à 0,6). Ce facteur est une convention : avec un autre, les chemins longs pèsent plus ou moins, et le classement des leviers peut changer.', 'Link strengths are classes (0.20, 0.35, 0.50, 0.65, 0.80), then all multiplied by one factor so the system stays stable ("model stability" set at 0.6). That factor is a convention: with another one, long paths weigh more or less, and the ranking of levers can change.'))}</li>
        <li>${esc(t(`Seuls ${nNeg} liens sur ${nLiens} sont négatifs : le modèle voit surtout des effets qui s'entraînent les uns les autres, et sous-estime sans doute les freins.`, `Only ${nNeg} of ${nLiens} links are negative: the model mostly sees effects that pull each other along, and probably underestimates the brakes.`))}</li>
        <li>${esc(t(`${nNonMes} des ${nNoeuds} variables ne sont pas mesurées par l'enquête (par exemple l'état de santé ou la fertilité des sols) : elles relaient les effets sans qu'on puisse les vérifier.`, `${nNonMes} of the ${nNoeuds} variables are not measured by the survey (for example health status or soil fertility): they pass effects on without any way to check them.`))}</li>
        <li>${esc(t('Les comparaisons avec les données ne portent que sur 10 sections communales : c\'est trop peu pour valider un lien.', 'Comparisons with the data rest on only 10 communal sections: too few to validate a link.'))}</li>
      </ul>
      <p class="note">${esc(t('L\'onglet « Calibrer ensemble » permet de revoir les forces avec les acteurs ; la carte 3 ci-dessous dit comment les données de panel les remplaceront.', 'The "Calibrate together" tab lets stakeholders review the strengths; card 3 below says how panel data will replace them.'))}</p>
    </details>
  </div>`);
  r.append(c1);
  c1.querySelector('[data-aller]').onclick = e => { e.preventDefault(); apri.aller('boucles', 'foret'); };

  // ============================================================ card 2
  const lignes = CODAGE.map(x => {
    const a = parCle.get(x.k); if (!a) return null;
    const res = appliquerRegle(x);
    return { ...x, a, ...res, modele: classeNum(a.force) };
  }).filter(Boolean);
  const nMeme = lignes.filter(l => l.finale === l.modele).length;
  const nBas = lignes.filter(l => l.finale < l.modele).length;
  const nHaut = lignes.filter(l => l.finale > l.modele).length;
  const nMemeBrute = lignes.filter(l => l.brute === l.modele).length;
  const nDescr = nLiens - lignes.length;

  const ex1 = lignes.find(l => l.k === 'eau|sante'), ex2 = lignes.find(l => l.k === 'revenu|alimentaire');
  const f2 = v => apri.nombre(v, 2);
  const etape = (n, txt) => `<div class="me-etape"><b>${n}</b><span>${txt}</span></div>`;
  const decl = l => l.declasse.length ? l.declasse.map(c => `<span class="me-dec">−1 ${esc(t(DECLASSEMENTS[c].fr, DECLASSEMENTS[c].en))}</span>`).join(' ') : `<span class="me-dec nul">${esc(t('aucun', 'none'))}</span>`;

  const seuilsTab = CLASSES.map((c, i) => {
    const lo = SEUILS_D[i - 1], hi = SEUILS_D[i];
    const rg = (f, dec = 2) => lo == null ? '< ' + apri.nombre(f(hi), dec) : hi == null ? '≥ ' + apri.nombre(f(lo), dec) : apri.nombre(f(lo), dec) + ' – ' + apri.nombre(f(hi), dec);
    const elo = SEUILS_EL[i - 1], ehi = SEUILS_EL[i];
    const el = elo == null ? '< ' + apri.nombre(ehi, 1) : ehi == null ? '≥ ' + apri.nombre(elo, 1) : apri.nombre(elo, 1) + ' – ' + apri.nombre(ehi, 1);
    return `<tr><td>${pastille(c.k, apri)}</td><td class="num">${rg(x => x)}</td><td class="num">${rg(rDeD)}</td><td class="num">${rg(orDeD)}</td><td class="num">${el}</td></tr>`;
  }).join('');

  const c2 = apri.h(`<div class="me-carte" id="me-2">
    <div class="me-num">2</div>
    <h3>${esc(t('De l\'étude publiée à la force du lien', 'From the published study to the link strength'))}</h3>
    <p>${esc(t('Une règle écrite, pour que deux personnes qui lisent la même étude donnent la même classe. Elle tient en trois étapes.', 'A written rule, so that two people reading the same study give the same class. It takes three steps.'))}</p>

    <div class="me-trois">
      <div class="me-pas"><span class="me-pas-n">1</span><h4>${esc(t('Ramener l\'effet à une même mesure', 'Bring the effect to one common measure'))}</h4>
        <p>${esc(t('On convertit le chiffre publié en « d » : la différence exprimée en écarts-types (Cohen 1988).', 'The published figure is converted into "d": the difference expressed in standard deviations (Cohen 1988).'))}</p></div>
      <div class="me-pas"><span class="me-pas-n">2</span><h4>${esc(t('Lire la classe dans le tableau', 'Read the class from the table'))}</h4>
        <p>${esc(t('Chaque classe correspond à un intervalle de d, de r, de rapport de cotes ou d\'élasticité.', 'Each class matches an interval of d, r, odds ratio or elasticity.'))}</p></div>
      <div class="me-pas"><span class="me-pas-n">3</span><h4>${esc(t('Descendre si la preuve est indirecte', 'Step down if the evidence is indirect'))}</h4>
        <p>${esc(t('Une classe de moins pour chaque raison de douter, sans descendre sous « très faible ».', 'One class down for each reason to doubt, never below "very weak".'))}</p></div>
    </div>

    <h4 class="me-sous">${esc(t('Étape 1 : les conversions', 'Step 1: the conversions'))}</h4>
    <div class="me-defile"><table class="tableau me-conv">
      <thead><tr><th>${esc(t('Ce que dit l\'étude', 'What the study reports'))}</th><th>${esc(t('Comment on obtient d', 'How to get d'))}</th></tr></thead>
      <tbody>
        <tr><td>${esc(t('Rapport de cotes (odds ratio), rapport de risques, « x fois plus probable »', 'Odds ratio, risk or hazard ratio, "x times more likely"'))}</td><td><code>d = |ln(OR)| × √3 / π</code> <span class="note">(Chinn 2000)</span><br><span class="note">${esc(t('un rapport de risques se lit comme un rapport de cotes si l\'événement est rare (moins de 10 %)', 'a risk ratio is read as an odds ratio when the event is rare (under 10%)'))}</span></td></tr>
        <tr><td>${esc(t('Changement relatif : « −49 % de diarrhées », « 5 fois plus »', 'Relative change: "−49% diarrhoea", "5 times more"'))}</td><td>${esc(t('rapport = 1 − 0,49 = 0,51, puis comme un rapport de cotes', 'ratio = 1 − 0.49 = 0.51, then as an odds ratio'))}</td></tr>
        <tr><td>${esc(t('Corrélation r, r partiel, coefficient standardisé (bêta)', 'Correlation r, partial r, standardised coefficient (beta)'))}</td><td><code>d = 2r / √(1 − r²)</code>${esc(t(' ; si l\'étude donne R², r = √R²', '; if the study gives R², r = √R²'))}</td></tr>
        <tr><td>${esc(t('Deux pourcentages : 61 % contre 74 %', 'Two shares: 61% versus 74%'))}</td><td><code>h = |2 asin√p₂ − 2 asin√p₁|</code>${esc(t(', lu comme d (Cohen 1988)', ', read as d (Cohen 1988)'))}<br><span class="note">${esc(t('si seul l\'écart en points est donné, on centre les deux parts sur 50 % (le choix le plus prudent)', 'if only the gap in points is given, centre both shares on 50% (the most cautious choice)'))}</span></td></tr>
        <tr><td>${esc(t('Élasticité : % de changement de l\'effet pour 1 % de changement de la cause', 'Elasticity: % change of the effect for a 1% change of the cause'))}</td><td>${esc(t('lue directement dans sa colonne du tableau', 'read directly in its own column of the table'))}</td></tr>
        <tr><td>${esc(t('Effet non significatif (l\'intervalle contient « aucun effet »)', 'Effect not significant (the interval contains "no effect")'))}</td><td>${esc(t('classe 1, très faible, quelle que soit sa taille', 'class 1, very weak, whatever its size'))}</td></tr>
        <tr><td>${esc(t('Seulement des chiffres descriptifs ou un mécanisme (décès attribués, couverture, récit)', 'Only descriptive figures or a mechanism (attributed deaths, coverage, account)'))}</td><td>${esc(t('pas de conversion : classe 2 si une source décrit le mécanisme, classe 1 si c\'est une hypothèse, classe 5 seulement si l\'un est une composante de l\'autre par construction', 'no conversion: class 2 if a source describes the mechanism, class 1 if it is a hypothesis, class 5 only if one is a component of the other by construction'))}</td></tr>
      </tbody></table></div>
    <p class="note">${esc(t('Plusieurs chiffres dans la même étude : on prend celui qui est le plus proche du contexte haïtien, sinon la médiane. Une fourchette : son milieu.', 'Several figures in one study: take the one closest to the Haitian context, otherwise the median. A range: its middle.'))}</p>

    <h4 class="me-sous">${esc(t('Étape 2 : le tableau des classes', 'Step 2: the class table'))}</h4>
    <div class="me-defile"><table class="tableau me-seuils">
      <thead><tr><th>${esc(t('Classe', 'Class'))}</th><th class="num">|d|</th><th class="num">|r|</th><th class="num">${esc(t('rapport de cotes', 'odds ratio'))}</th><th class="num">${esc(t('élasticité', 'elasticity'))}</th></tr></thead>
      <tbody>${seuilsTab}</tbody></table></div>
    <p class="note">${esc(t('Seuils de d : 0,2 petit, 0,5 moyen, 0,8 grand (Cohen 1988), 1,2 très grand (Sawilowsky 2009). Les colonnes r et rapport de cotes sont les mêmes seuils convertis (Chinn 2000). Pour un rapport inférieur à 1, prendre son inverse (0,62 se lit comme 1,61). Les seuils d\'élasticité sont une convention APRI.', 'd thresholds: 0.2 small, 0.5 medium, 0.8 large (Cohen 1988), 1.2 very large (Sawilowsky 2009). The r and odds ratio columns are the same thresholds converted (Chinn 2000). For a ratio below 1, take its inverse (0.62 reads as 1.61). The elasticity thresholds are an APRI convention.'))}</p>

    <h4 class="me-sous">${esc(t('Étape 3 : descendre d\'une classe pour chaque doute', 'Step 3: one class down for each doubt'))}</h4>
    <div class="me-doutes">
      <div><b>${esc(t('Autre pays', 'Other country'))}</b><span>${esc(t('l\'étude ne porte pas sur Haïti (une étude multi-pays compte, sauf si Haïti y figure)', 'the study is not about Haiti (a multi-country study counts, unless Haiti is in it)'))}</span></div>
      <div><b>${esc(t('Autre résultat', 'Other outcome'))}</b><span>${esc(t('l\'étude mesure autre chose que la variable du modèle (mortalité infantile au lieu de l\'état de santé)', 'the study measures something other than the model variable (child mortality instead of health status)'))}</span></div>
      <div><b>${esc(t('Mesure indirecte', 'Proxy measure'))}</b><span>${esc(t('la cause est mesurée par un substitut (les biens du ménage au lieu de son revenu)', 'the cause is measured through a stand-in (household assets instead of income)'))}</span></div>
      <div><b>${esc(t('Étude unique', 'Single study'))}</b><span>${esc(t('une seule étude, et non une méta-analyse ou plusieurs études concordantes', 'one study only, not a meta-analysis or several concurring studies'))}</span></div>
    </div>

    <h4 class="me-sous">${esc(t('Deux exemples pas à pas', 'Two worked examples'))}</h4>
    <div class="me-exemples">
      <div class="me-ex"><div class="me-ex-t">${esc(nom('eau'))} → ${esc(nom('sante'))}</div>
        ${etape(1, esc(t('Méta-analyse de 26 études : rapport de cotes 0,62 sur la mortalité infantile.', 'Meta-analysis of 26 studies: odds ratio 0.62 on child mortality.')))}
        ${etape(2, `d = |ln ${apri.nombre(0.62, 2)}| × √3 / π = ${f2(Math.abs(Math.log(0.62)))} × ${apri.nombre(K, 3)} = <b>${f2(ex1.d)}</b> → ` + pastille(ex1.brute, apri))}
        ${etape(3, esc(t('Autre pays (pays à faible revenu, pas Haïti) −1 ; autre résultat (mortalité, pas état de santé) −1. Méta-analyse : pas de baisse pour étude unique.', 'Other country (low-income countries, not Haiti) −1; other outcome (mortality, not health status) −1. Meta-analysis: no step down for a single study.')))}
        <div class="me-ex-r">${esc(t('Règle', 'Rule'))} ${pastille(ex1.finale, apri)} <span class="me-vs">${esc(t('Modèle', 'Model'))} ${pastille(ex1.modele, apri)}</span></div>
      </div>
      <div class="me-ex"><div class="me-ex-t">${esc(nom('revenu'))} → ${esc(nom('alimentaire'))}</div>
        ${etape(1, esc(t('Haïti après le séisme : les ménages les plus pauvres ont un rapport de cotes de 8,19 pour la faim.', 'Haiti after the earthquake: the poorest households have an odds ratio of 8.19 for hunger.')))}
        ${etape(2, `d = ln ${apri.nombre(8.19, 2)} × √3 / π = ${f2(Math.log(8.19))} × ${apri.nombre(K, 3)} = <b>${f2(ex2.d)}</b> → ` + pastille(ex2.brute, apri))}
        ${etape(3, esc(t('Haïti : pas de baisse pour le pays. Mesure indirecte (équipement du ménage au lieu du revenu) −1 ; étude unique −1.', 'Haiti: no step down for country. Proxy measure (household assets instead of income) −1; single study −1.')))}
        <div class="me-ex-r">${esc(t('Règle', 'Rule'))} ${pastille(ex2.finale, apri)} <span class="me-vs">${esc(t('Modèle', 'Model'))} ${pastille(ex2.modele, apri)}</span></div>
      </div>
    </div>

    <h4 class="me-sous">${esc(t('La règle appliquée à tous les liens chiffrés', 'The rule applied to every quantified link'))}</h4>
    <div class="me-bilan">
      <div><b>${lignes.length}</b><span>${esc(t('liens ont un effet chiffré publié', 'links have a published quantified effect'))}</span></div>
      <div class="ok"><b>${nMeme}</b><span>${esc(t('même classe que le modèle', 'same class as the model'))}</span></div>
      <div class="bas"><b>${nBas}</b><span>${esc(t('classe plus basse selon la règle', 'lower class under the rule'))}</span></div>
      <div class="haut"><b>${nHaut}</b><span>${esc(t('classe plus haute selon la règle', 'higher class under the rule'))}</span></div>
    </div>
    <p>${esc(t(`La règle est plus sévère que les experts : la plupart des études viennent d'autres pays et beaucoup sont uniques. Avant les baisses de l'étape 3, ${nMemeBrute} liens sur ${lignes.length} tombent dans la classe du modèle. Les forces du modèle ne sont pas changées : ce tableau sert à la relecture, et à l'atelier de calibrage.`, `The rule is stricter than the experts: most studies come from other countries and many are single studies. Before the step-3 downgrades, ${nMemeBrute} of ${lignes.length} links fall in the model's class. The model's strengths are not changed: this table is for review, and for the calibration workshop.`))}</p>
    <details class="pli me-pli-tab"><summary>${esc(t(`Voir le tableau des ${lignes.length} liens`, `See the table of the ${lignes.length} links`))}</summary>
      <div class="me-filtre pastilles">
        <button type="button" class="bouton" aria-pressed="true" data-f="tous">${esc(t('Tous', 'All'))}</button>
        <button type="button" class="bouton" aria-pressed="false" data-f="diff">${esc(t('Seulement les désaccords', 'Only disagreements'))}</button>
        <button type="button" class="bouton me-csv" style="margin-left:auto">CSV ↓</button>
      </div>
      <div class="me-defile"><table class="tableau me-regle">
        <thead><tr><th>${esc(t('Lien', 'Link'))}</th><th>${esc(t('Effet publié', 'Published effect'))}</th><th class="num">d</th><th>${esc(t('Taille', 'Size'))}</th><th>${esc(t('Baisses', 'Downgrades'))}</th><th>${esc(t('Règle', 'Rule'))}</th><th>${esc(t('Modèle', 'Model'))}</th><th></th></tr></thead>
        <tbody></tbody></table></div>
      <p class="note">${esc(t(`${nDescr} autres liens n'ont que des chiffres descriptifs ou un mécanisme (par exemple des décès attribués au niveau mondial) : la règle leur donne la classe 2 (1 pour une hypothèse, 5 pour un lien structurel). Le codage complet est dans js/boucles/methode.js (tableau CODAGE), pour être relu et corrigé.`, `${nDescr} other links have only descriptive figures or a mechanism (for example deaths attributed worldwide): the rule gives them class 2 (1 for a hypothesis, 5 for a structural link). The full coding sits in js/boucles/methode.js (CODAGE table), to be reviewed and corrected.`))}</p>
    </details>
  </div>`);
  r.append(c2);

  const corps = c2.querySelector('.me-regle tbody');
  const signe = l => l.finale === l.modele ? `<span class="me-flag ok" title="${esc(t('accord', 'agreement'))}">=</span>`
    : l.finale < l.modele ? `<span class="me-flag bas" title="${esc(t('la règle donne moins', 'the rule gives less'))}">↓ ${l.modele - l.finale}</span>`
      : `<span class="me-flag haut" title="${esc(t('la règle donne plus', 'the rule gives more'))}">↑ ${l.finale - l.modele}</span>`;
  const dessinerTable = filtre => {
    corps.innerHTML = lignes.filter(l => filtre !== 'diff' || l.finale !== l.modele).map(l => `<tr>
      <td><b>${esc(nom(l.a.de))}</b> → ${esc(nom(l.a.vers))}</td>
      <td>${esc(effetTexte(l, apri))}${l.c ? `<br><span class="note">${esc(t(l.c[0], l.c[1]))}</span>` : ''}</td>
      <td class="num">${l.d == null ? '–' : apri.nombre(l.d, 2)}</td>
      <td>${pastille(l.brute, apri, true)}</td>
      <td>${decl(l)}</td>
      <td>${pastille(l.finale, apri)}</td>
      <td>${pastille(l.modele, apri)}</td>
      <td>${signe(l)}</td></tr>`).join('');
  };
  dessinerTable('tous');
  c2.querySelectorAll('.me-filtre [data-f]').forEach(b => b.onclick = () => {
    c2.querySelectorAll('.me-filtre [data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    dessinerTable(b.dataset.f);
  });
  c2.querySelector('.me-csv').onclick = () => {
    const q = s => '"' + String(s ?? '').replaceAll('"', '""') + '"';
    const tete = ['de', 'vers', t('de_nom', 'from_name'), t('vers_nom', 'to_name'), 'type', 'valeur', 'd', 'classe_taille', 'baisses', 'classe_regle', 'classe_modele', 'force_modele'];
    const rows = lignes.map(l => [l.a.de, l.a.vers, nom(l.a.de), nom(l.a.vers), l.t, Array.isArray(l.v) ? l.v.join('/') : (l.v ?? ''),
      l.d == null ? '' : l.d.toFixed(3), l.brute, l.declasse.join(''), l.finale, l.modele, l.a.force]);
    telecharger('﻿' + [tete, ...rows].map(r => r.map(q).join(';')).join('\r\n'), 'APRI-regle-classes.csv');
  };

  // ============================================================ card 3
  const nTest = testables.length;
  const exTest = testables.slice(0, 6).map(a => `<li>${esc(nom(a.de))} → ${esc(nom(a.vers))}</li>`).join('');
  const c3 = apri.h(`<div class="me-carte" id="me-3">
    <div class="me-num">3</div>
    <h3>${esc(t('La suite : mesurer les liens sur les ménages', 'Next: measuring the links on households'))}</h3>
    <p>${esc(t('Quand la deuxième enquête aura revisité les mêmes ménages, on pourra voir, ménage par ménage, si ce qui a changé d\'abord a entraîné ce qui a changé ensuite. Les classes d\'experts laisseront alors la place à des valeurs mesurées.', 'Once the second survey has revisited the same households, we can see, household by household, whether what changed first drove what changed next. Expert classes will then give way to measured values.'))}</p>
    <ol class="me-frise">
      <li class="fait"><b>${esc(t('Enquête 1', 'Survey 1'))}</b><span>${esc(t('1 211 ménages, 10 sections communales', '1,211 households, 10 communal sections'))}</span></li>
      <li><b>${esc(t('Enquête 2', 'Survey 2'))}</b><span>${esc(t('les mêmes ménages, retrouvés par leur code', 'the same households, found again by their code'))}</span></li>
      <li><b>${esc(t('Estimation', 'Estimation'))}</b><span>${esc(t('sur l\'ordinateur de l\'équipe, données privées', 'on the team\'s computer, private data'))}</span></li>
      <li><b>${esc(t('Mise à jour', 'Update'))}</b><span>${esc(t('seuls les coefficients sont publiés ici', 'only the coefficients are published here'))}</span></li>
    </ol>
    <div class="me-deux">
      <div class="me-bloc"><h4>${esc(t('Quels liens peut-on tester ?', 'Which links can be tested?'))}</h4>
        <p><span class="me-gros">${nTest}</span> ${esc(t(`liens sur ${nLiens}, ceux dont les deux bouts sont mesurés ménage par ménage. Par exemple :`, `links out of ${nLiens}, those whose two ends are measured household by household. For example:`))}</p>
        <ul class="me-liste">${exTest}</ul>
        <p class="note">${esc(t('Les autres restent à l\'avis d\'experts et de l\'atelier : les variables non mesurées (santé, fertilité des sols…) et celles vues par satellite, qui ne changent pas d\'un ménage à l\'autre dans une même section (forêt, pluie, végétation).', 'The others stay with expert and workshop judgement: unmeasured variables (health, soil fertility…) and those seen from satellites, which do not differ between households in one section (forest, rain, vegetation).'))}</p></div>
      <div class="me-bloc"><h4>${esc(t('Avec quelle méthode ?', 'With which method?'))}</h4>
        <ul class="me-liste">
          <li>${esc(t('Un modèle de pistes « croisé et décalé » (modèle d\'équations structurelles) : la valeur d\'une variable à l\'enquête 2 est expliquée par sa propre valeur à l\'enquête 1 et par ses causes à l\'enquête 1. Ce qui reste, c\'est l\'effet de la cause.', 'A cross-lagged path model (structural equation model): a variable at survey 2 is explained by its own value at survey 1 and by its causes at survey 1. What remains is the effect of the cause.'))}</li>
          <li>${esc(t('Les différences entre sections sont retirées (effets fixes), pour ne comparer que des voisins.', 'Differences between sections are removed (fixed effects), so that only neighbours are compared.'))}</li>
          <li>${esc(t('Variante possible : un réseau bayésien, qui part des classes actuelles comme a priori et les corrige avec les données.', 'Possible variant: a Bayesian network, which starts from the current classes as priors and corrects them with the data.'))}</li>
        </ul></div>
    </div>
    <details class="pli"><summary>${esc(t('Combien de ménages faut-il ?', 'How many households are needed?'))}</summary>
      <p>${esc(t('Si environ 1 000 des 1 211 ménages sont retrouvés, on détecte un lien dès qu\'il atteint à peu près r = 0,1, la limite entre « très faible » et « faible ». En tenant compte des ressemblances entre voisins d\'une même section, la limite monte plutôt vers r = 0,15 à 0,2. Conséquence : les liens de classe 2 et plus pourront être confirmés ou corrigés ; ceux de classe 1 resteront incertains.', 'If about 1,000 of the 1,211 households are found again, a link can be detected once it reaches roughly r = 0.1, the boundary between "very weak" and "weak". Allowing for neighbours in the same section being alike, the limit rises towards r = 0.15 to 0.2. Consequence: links of class 2 and above can be confirmed or corrected; class 1 links will stay uncertain.'))}</p>
      <p class="note">${esc(t('Calcul : avec n ménages, la plus petite corrélation détectable (5 %, puissance 80 %) vaut environ 2,8 / √n. Il faut aussi que les mêmes questions soient posées de la même façon aux deux enquêtes, et un code ménage stable.', 'Calculation: with n households, the smallest detectable correlation (5%, 80% power) is about 2.8 / √n. The same questions must also be asked the same way in both surveys, with a stable household code.'))}</p>
    </details>
    <details class="pli"><summary>${esc(t('Comment les résultats remplaceront les classes', 'How results will replace the classes'))}</summary>
      <ul class="me-liste">
        <li>${esc(t('Chaque coefficient estimé est lu dans le même tableau des classes (colonne r) : la règle reste la même pour tous.', 'Each estimated coefficient is read in the same class table (r column): the rule stays the same for everyone.'))}</li>
        <li>${esc(t('Si l\'intervalle de confiance est étroit (il tient dans une ou deux classes voisines), la classe mesurée remplace la classe d\'experts.', 'If the confidence interval is narrow (it fits within one or two neighbouring classes), the measured class replaces the expert class.'))}</li>
        <li>${esc(t('S\'il est large, on garde la classe d\'experts ou d\'atelier, et on l\'indique.', 'If it is wide, the expert or workshop class is kept, and this is said.'))}</li>
        <li>${esc(t('Si l\'intervalle exclut l\'effet attendu, ou change de signe, le lien est signalé pour être discuté, pas effacé en silence.', 'If the interval excludes the expected effect, or flips sign, the link is flagged for discussion, not silently deleted.'))}</li>
      </ul>
    </details>
    <details class="pli"><summary>${esc(t('Pour l\'équipe technique : le script', 'For the technical team: the script'))}</summary>
      <p>${t('Le script <code>outils/estimer_panel.py</code> s\'exécute <b>en local</b>, sur les fichiers privés des deux enquêtes. Il n\'écrit jamais de donnée de ménage dans le site : il produit seulement <code>data/boucles/estimations.json</code>, avec pour chaque lien testé le coefficient, son intervalle de confiance à 95 %, le nombre de ménages et la classe correspondante.', 'The script <code>outils/estimer_panel.py</code> runs <b>locally</b>, on the private files of the two surveys. It never writes household data into the site: it only produces <code>data/boucles/estimations.json</code>, with, for each tested link, the coefficient, its 95% confidence interval, the number of households and the matching class.')}</p>
      <pre class="me-code">python3 outils/estimer_panel.py --demo            # ${esc(t('essai sur des données inventées', 'trial on made-up data'))}
python3 outils/estimer_panel.py --vague1 v1.csv --vague2 v2.csv</pre>
      <p class="note">${esc(t('La correspondance entre variables du modèle et colonnes de l\'enquête est un bloc de configuration clairement marqué en tête du script.', 'The mapping between model variables and survey columns is a clearly marked configuration block at the top of the script.'))}</p>
    </details>
  </div>`);
  r.append(c3);
}
