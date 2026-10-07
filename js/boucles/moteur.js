/* The causal-graph engine of the "Feedback loops" section, ported from
   boucles_moteur.py, systeme_complexe.py, schema_exploration.py,
   provenance_relations.py and systeme_direct.py (_donnees).

   No DOM here: the same file runs in the browser and under node for the
   numerical check against the Python functions (outils/verif_boucles.*).
   Every function keeps the Python name and the Python iteration order, so that
   ties are broken exactly as in Streamlit. */

// ------------------------------------------------------------------ helpers
/** Python string comparison (code points), not localeCompare. */
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
/** stable sort with a key returning an array (tuple comparison, like Python) */
export function trier(arr, cle) {
  const k = arr.map((x, i) => [cle(x), i, x]);
  k.sort((A, B) => {
    const a = A[0], b = B[0];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue;
      if (typeof a[i] === 'boolean' || typeof b[i] === 'boolean') return (a[i] ? 1 : 0) - (b[i] ? 1 : 0);
      return a[i] < b[i] ? -1 : 1;
    }
    return A[1] - B[1];
  });
  return k.map(x => x[2]);
}

// ------------------------------------------------------------------ model
/** boucles_moteur.matrice — A[v][u] = signe × force of u → v (scaled unless brute) */
export function matrice(g, C, brute = false) {
  const ids = g.noeuds.map(n => n.id);
  const idx = {}; ids.forEach((v, i) => { idx[v] = i; });
  const N = ids.length;
  let A = Array.from({ length: N }, () => new Float64Array(N));
  for (const e of g.aretes) A[idx[e.vers]][idx[e.de]] = e.signe * e.force;
  const rayon = N ? rayonSpectral(A) : 0;
  if (!brute && N && rayon > C.RAYON_CIBLE) {
    const f = C.RAYON_CIBLE / rayon;
    A = A.map(r => r.map(x => x * f));
  }
  return { A, ids, idx, rayon };
}

/** max |eigenvalue|, by Gelfand's formula ρ = lim ‖A^k‖^(1/k), k = 2^m.
    Repeated squaring with renormalisation; the error is O(log‖·‖ / 2^m),
    i.e. machine precision at m = 60. Checked against numpy.linalg.eigvals. */
export function rayonSpectral(A0) {
  const N = A0.length;
  let B = A0.map(r => Float64Array.from(r));
  let logS = 0;
  const M = 60;
  for (let m = 0; m < M; m++) {
    let nrm = 0;
    for (const r of B) for (const x of r) nrm = Math.max(nrm, Math.abs(x));
    if (nrm === 0) return 0;
    for (const r of B) for (let j = 0; j < N; j++) r[j] /= nrm;
    logS += Math.log(nrm) / Math.pow(2, m);     // log‖A^(2^m)‖ / 2^m accumulated
    const C = Array.from({ length: N }, () => new Float64Array(N));
    for (let i = 0; i < N; i++) {
      const bi = B[i], ci = C[i];
      for (let k = 0; k < N; k++) {
        const v = bi[k]; if (v === 0) continue;
        const bk = B[k];
        for (let j = 0; j < N; j++) ci[j] += v * bk[j];
      }
    }
    B = C;
  }
  let nrm = 0;
  for (const r of B) for (const x of r) nrm = Math.max(nrm, Math.abs(x));
  if (nrm === 0) return Math.exp(logS);
  return Math.exp(logS + Math.log(nrm) / Math.pow(2, M));
}

/** boucles_moteur._relations_valides + charger (the file is always present here) */
export function relationsValides(g) {
  return { ...g, aretes: g.aretes.filter(e => !(e.de === 'eau' && e.vers === 'abris')) };
}

/** systeme_complexe._modele — everything the six tabs share, computed once */
export function creerModele(donnees, lang) {
  const C = donnees.constantes;
  const g = relationsValides(donnees.graphe);
  const { A, ids, idx, rayon } = matrice(g, C);
  const noms = {}, par_id = {};
  for (const n of g.noeuds) { noms[n.id] = n[lang] || n.fr || n.en || n.id; par_id[n.id] = n; }
  const aretes = new Map();
  for (const a of g.aretes) aretes.set(a.de + '|' + a.vers, a);   // dict: later duplicates overwrite, keep first position
  const par_ligne = donnees.indicateurs;
  const lst = boucles(g, C);
  const m = {
    g, C, A, ids, idx, noms, par_id, aretes, par_ligne, lang,
    sections: donnees.sections, poids_total: donnees.poids_total,
    boucles: lst, diag: diagnostic(g, C, rayon), leviers: leviers(g, lst),
  };
  return m;
}

export function diagnostic(g, C, rayonBrut) {
  // rayonBrut is the radius of the unscaled matrix (matrice() measures it first)
  const rayon = rayonBrut;
  return { rayon, converge: rayon < 1, tendu: rayon >= C.TENDU,
    facteur: rayon > C.RAYON_CIBLE ? C.RAYON_CIBLE / rayon : 1.0, cible: C.RAYON_CIBLE,
    noeuds: g.noeuds.length, aretes: g.aretes.length };
}

// ------------------------------------------------------------------ linear algebra
/** solve (I − A) x = b, Gaussian elimination with partial pivoting */
function resoudre(A, b) {
  const N = b.length;
  const M = Array.from({ length: N }, (_, i) => {
    const r = new Float64Array(N + 1);
    for (let j = 0; j < N; j++) r[j] = (i === j ? 1 : 0) - A[i][j];
    r[N] = b[i]; return r;
  });
  for (let c = 0; c < N; c++) {
    let p = c, mx = Math.abs(M[c][c]);
    for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > mx) { mx = Math.abs(M[r][c]); p = r; }
    if (mx < 1e-300) return null;   // singular
    if (p !== c) { const t = M[p]; M[p] = M[c]; M[c] = t; }
    const pv = M[c][c];
    for (let r = c + 1; r < N; r++) {
      const f = M[r][c] / pv; if (f === 0) continue;
      const Mr = M[r], Mc = M[c];
      for (let j = c; j <= N; j++) Mr[j] -= f * Mc[j];
    }
  }
  const x = new Float64Array(N);
  for (let i = N - 1; i >= 0; i--) {
    let s = M[i][N];
    for (let j = i + 1; j < N; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

/** boucles_moteur.propager — total propagated effect (the push itself excluded) */
export function propager(m, variations) {
  const { A, ids, idx } = m;
  const N = ids.length;
  const e0 = new Float64Array(N);
  for (const [k, v] of Object.entries(variations || {})) if (k in idx) e0[idx[k]] = v;
  let total = resoudre(A, e0);
  if (total) total = total.map((x, i) => x - e0[i]);
  else {
    let vague = Float64Array.from(e0); total = new Float64Array(N);
    for (let t = 0; t < 200; t++) { vague = mul(A, vague); for (let i = 0; i < N; i++) total[i] += vague[i]; }
  }
  const out = {}; ids.forEach((id, i) => { out[id] = total[i]; });
  return out;
}
export function mul(A, v) {
  const N = v.length, o = new Float64Array(N);
  for (let i = 0; i < N; i++) { let s = 0; const r = A[i]; for (let j = 0; j < N; j++) s += r[j] * v[j]; o[i] = s; }
  return o;
}

/** boucles_moteur.etat_courant */
export function etatCourant(m, cible = 'Total') {
  const etat = {};
  for (const n of m.g.noeuds) {
    const lg = n.ligne;
    const r = lg ? m.par_ligne[String(lg)] : null;
    const sc = r ? (r.scores_corriges || {})[cible] : null;
    etat[n.id] = sc != null ? Number(sc) : null;
  }
  return etat;
}

/** boucles_moteur.apres */
export function apres(etat, effets, variations) {
  const out = {};
  for (const [k, v] of Object.entries(etat)) {
    if (v == null) { out[k] = null; continue; }
    out[k] = Math.max(0, Math.min(10, v + (effets[k] || 0) + ((variations || {})[k] || 0)));
  }
  return out;
}

/** boucles_moteur.direction */
export function direction(d, C) {
  if (d > C.SEUIL_NUL) return 'hausse';
  if (d < -C.SEUIL_NUL) return 'baisse';
  return 'nul';
}

/** boucles_moteur.effet_indice */
export function effetIndice(m, effets, variations) {
  const poids_total = m.poids_total;
  let num = 0, couvert = 0;
  for (const n of m.g.noeuds) {
    const lg = n.ligne;
    const r = lg ? m.par_ligne[String(lg)] : null;
    if (!r || (r.scores_corriges || {}).Total == null) continue;
    const p = r.ponderation || 1;
    const avant = Number(r.scores_corriges.Total);
    const d = (effets[n.id] || 0) + ((variations || {})[n.id] || 0);
    num += p * (Math.max(0, Math.min(10, avant + d)) - avant);
    couvert += p;
  }
  return { delta: poids_total ? num / poids_total : 0, part_couverte: poids_total ? couvert / poids_total : 0 };
}

// ------------------------------------------------------------------ loops
/** boucles_moteur._cycles — depth-first, LIFO stack, only indices ≥ start */
function cycles(succ, ids, C) {
  const rang = {}; ids.forEach((v, i) => { rang[v] = i; });
  const trouves = []; let coupe = false;
  for (const depart of ids) {
    const r0 = rang[depart];
    const pile = [[depart, [depart], new Set([depart])]];
    while (pile.length) {
      const [noeud, chemin, vus] = pile.pop();
      if (trouves.length >= C.BOUCLES_MAX) { coupe = true; break; }
      for (const suiv of succ[noeud] || []) {
        if (suiv === depart) trouves.push(chemin.slice());
        else if (rang[suiv] > r0 && !vus.has(suiv) && chemin.length < C.BOUCLE_MAX) {
          const v2 = new Set(vus); v2.add(suiv);
          pile.push([suiv, [...chemin, suiv], v2]);
        }
      }
    }
    if (coupe) break;
  }
  return [trouves, coupe];
}

/** boucles_moteur.boucles */
export function boucles(g, C) {
  const succ = {}, arc = {};
  for (const e of g.aretes) {
    (succ[e.de] = succ[e.de] || []).push(e.vers);
    arc[e.de + '|' + e.vers] = [e.signe, e.force];
  }
  const ids = g.noeuds.map(n => n.id);
  const [cyc, coupe] = cycles(succ, ids, C);
  const out = cyc.map(cycle => {
    let signe = 1, force = 1.0;
    cycle.forEach((u, i) => {
      const v = cycle[(i + 1) % cycle.length];
      const [sg, fo] = arc[u + '|' + v];
      signe *= sg; force *= fo;
    });
    return { noeuds: cycle, type: signe > 0 ? 'renforcante' : 'equilibrante', force, n: cycle.length, tronque: coupe };
  });
  return trier(out, b => [b.n, -b.force]);
}

export function aretesDeBoucle(b) {
  const c = b.noeuds;
  return c.map((x, i) => [x, c[(i + 1) % c.length]]);
}

/** boucles_moteur.leviers */
export function leviers(g, lst) {
  const entrant = {}, sortant = {};
  for (const e of g.aretes) { sortant[e.de] = (sortant[e.de] || 0) + 1; entrant[e.vers] = (entrant[e.vers] || 0) + 1; }
  const out = g.noeuds.map(n => {
    const cle = n.id;
    const dedans = lst.filter(b => b.noeuds.includes(cle));
    const renf = dedans.filter(b => b.type === 'renforcante').length;
    const equi = dedans.length - renf;
    const ent = entrant[cle] || 0, sor = sortant[cle] || 0;
    return { id: cle, entrant: ent, sortant: sor, degre: ent + sor, boucles: dedans.length,
      renforcantes: renf, equilibrantes: equi, bascule: renf > 0 && equi > 0,
      poids_boucles: dedans.reduce((s, b) => s + b.force, 0) };
  });
  return trier(out, x => [!x.bascule, -x.boucles, -x.degre]);
}

/** boucles_moteur.boucles_dominantes. Python walks each loop's arcs through a
    set, whose order changes with the process hash seed; ties among the top
    arcs are therefore not stable in Streamlit either. Here the arcs are walked
    in loop order, which is deterministic. */
export function bouclesDominantes(lst, top = 6) {
  const compte = new Map();
  for (const b of lst) {
    for (const [de, vers] of aretesDeBoucle(b)) {
      const k = de + '|' + vers;
      if (!compte.has(k)) compte.set(k, { de, vers, n: 0, renf: 0, equi: 0 });
      const e = compte.get(k);
      e.n += 1; e[b.type === 'renforcante' ? 'renf' : 'equi'] += 1;
    }
  }
  return trier([...compte.values()], x => [-x.n]).slice(0, top);
}

// ------------------------------------------------------------------ the system
/** systeme_complexe._voisinage — the n_max variables closest to the centre */
export function voisinage(m, centre, n_max) {
  const voisins = new Map();
  const get = x => { if (!voisins.has(x)) voisins.set(x, new Map()); return voisins.get(x); };
  for (const a of m.aretes.values()) {
    const f = Math.abs(Number(a.force || 0.5));
    for (const [x, y] of [[a.de, a.vers], [a.vers, a.de]]) {
      const vx = get(x); vx.set(y, (vx.get(y) || 0) + f);
    }
  }
  const rang = new Map([[centre, 0]]);
  let front = [centre], r = 0;
  while (rang.size < n_max && front.length) {
    r += 1;
    const cand = new Map();
    for (const x of front) for (const [y, f] of (voisins.get(x) || new Map())) {
      if (!rang.has(y)) cand.set(y, (cand.get(y) || 0) + f);
    }
    if (!cand.size) break;
    const suiv = [];
    const ordre = trier([...cand.keys()], z => [-cand.get(z), m.noms[z] ?? z]);
    for (const y of ordre) {
      if (rang.size >= n_max) break;
      rang.set(y, r); suiv.push(y);
    }
    front = suiv;
  }
  const aretes = [...m.aretes.values()].filter(a => rang.has(a.de) && rang.has(a.vers));
  return { rang, aretes };
}

/** systeme_complexe._boucles_de */
export function bouclesDe(m, centre, dedans) {
  return m.boucles.filter(b => b.noeuds.includes(centre) && (!dedans || b.noeuds.every(x => dedans.has(x))));
}

/** systeme_complexe._positions — one ring per rank */
export function positions(rang, centre) {
  const LARG = 1120, HAUT = 700, cx = LARG / 2, cy = HAUT / 2;
  const rayons = { 0: 0, 1: 150, 2: 268, 3: 340 };
  const pos = new Map([[centre, [cx, cy]]]);
  let prec = 0;
  const rs = [...new Set([...rang.values()].filter(v => v > 0))].sort((a, b) => a - b);
  for (const r of rs) {
    const cases = [...rang.entries()].filter(([, v]) => v === r).map(([n]) => n).sort(cmp);
    const R = Math.max(r in rayons ? rayons[r] : 340 + 40 * (r - 3), 26 * cases.length, prec + 88);
    prec = R;
    const d = r % 2 === 0 ? Math.PI / Math.max(cases.length, 1) : 0;
    cases.forEach((n, i) => {
      const a = 2 * Math.PI * i / Math.max(cases.length, 1) - Math.PI / 2 + d;
      pos.set(n, [cx + R * Math.cos(a) * 1.42, cy + R * Math.sin(a)]);
    });
  }
  return { pos, LARG, HAUT };
}

/** schema_exploration.causal_layout — causes below, effects above, feedback right, other left */
export function causalLayout(ids, edges, centre) {
  const reach = reverse => {
    const dist = new Map([[centre, 0]]);
    const todo = [centre];
    for (let k = 0; k < todo.length; k++) {
      const n = todo[k];
      for (const e of edges) {
        const [a, b] = reverse ? [e.vers, e.de] : [e.de, e.vers];
        if (a === n && !dist.has(b)) { dist.set(b, dist.get(n) + 1); todo.push(b); }
      }
    }
    return dist;
  };
  const up = reach(true), down = reach(false);
  const groups = { causes: [], effects: [], feedback: [], other: [] };
  for (const n of ids) {
    if (n === centre) continue;
    const kind = up.has(n) && down.has(n) ? 'feedback' : up.has(n) ? 'causes' : down.has(n) ? 'effects' : 'other';
    groups[kind].push(n);
  }
  const pos = new Map([[centre, [0, 0]]]);
  for (const kind of ['causes', 'effects']) {
    const ds = kind === 'causes' ? up : down;
    const levels = new Map();
    for (const n of groups[kind]) { const d = ds.get(n); if (!levels.has(d)) levels.set(d, []); levels.get(d).push(n); }
    for (const [depth, ns] of levels) ns.forEach((n, i) => {
      pos.set(n, [(i - (ns.length - 1) / 2) * 190, (kind === 'causes' ? 1 : -1) * (140 * depth + Math.floor(i / 5) * 90)]);
    });
  }
  const extent = Math.max(...[...pos.values()].map(([x]) => Math.abs(x)), 190) + 230;
  for (const [kind, dir] of [['feedback', 1], ['other', -1]]) {
    const ns = groups[kind];
    ns.forEach((n, i) => pos.set(n, [dir * extent, (i - (ns.length - 1) / 2) * 85]));
  }
  return { pos, groups };
}

// ------------------------------------------------------------------ evidence
/** systeme_complexe._spearman — average ranks on ties, Pearson on the ranks */
export function spearman(xs, ys) {
  const rangs = v => {
    const ordre = [...v.keys()].sort((i, j) => (v[i] - v[j]) || (i - j));
    const r = new Array(v.length).fill(0);
    let i = 0;
    while (i < ordre.length) {
      let j = i;
      while (j + 1 < ordre.length && v[ordre[j + 1]] === v[ordre[i]]) j++;
      const moy = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[ordre[k]] = moy;
      i = j + 1;
    }
    return r;
  };
  const a = rangs(xs), b = rangs(ys), n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  if (saa === 0 || sbb === 0) return null;
  return sab / Math.sqrt(saa * sbb);
}

/** systeme_complexe._correlation — across the ten communal sections, oriented towards resilience */
export function correlation(m, n1, n2) {
  const l1 = (m.par_id[n1] || {}).ligne, l2 = (m.par_id[n2] || {}).ligne;
  const r1 = l1 != null ? m.par_ligne[String(l1)] : null, r2 = l2 != null ? m.par_ligne[String(l2)] : null;
  if (!r1 || !r2) return null;
  const v1 = r1.valeurs || {}, v2 = r2.valeurs || {};
  const xs = [], ys = [];
  for (const s of m.sections) {
    const a = v1[s], b = v2[s];
    if (a == null || b == null) continue;
    xs.push(Number(a)); ys.push(Number(b));
  }
  if (xs.length < 8) return null;
  let rho = spearman(xs, ys);
  if (rho == null) return null;
  for (const r of [r1, r2]) {
    const s = String(r.sens || '').toLowerCase().split('=');
    if (s[s.length - 1].includes('bas')) rho = -rho;
  }
  return { rho, n: xs.length };
}

/** provenance_relations.describe */
export function decrire(edge, lang, association, t) {
  const src = edge.src || {};
  let url = src.url || '';
  if (!/^https?:\/\//i.test(url)) url = '';
  const published = !!url;
  const local = k => edge[k + '_' + lang] || edge[k + '_en'] || edge[k + '_fr'] || '';
  return {
    origin: published ? t.documented : t.theory, code: published ? 'D' : 'H',
    strength_label: t.strength, strength: edge.force,
    association, association_label: association ? t.calculated : t.absent,
    citation: local('cite') || src.titre || t.no_source, url,
    finding: lang === 'fr' ? src.effet : local('ref'),
    limits: local('reserve'),
    geography: lang === 'fr' ? src.geo : (src.geo_en || src.geo),
    caution: t.caution, chosen: t.chosen,
  };
}

// ------------------------------------------------------------------ waves
/** systeme_complexe._vagues — relay by relay, with the written stopping rule */
export function vagues(m, variations) {
  const { A, ids, idx, C } = m;
  const e0 = new Float64Array(ids.length);
  for (const [k, v] of Object.entries(variations)) if (k in idx) e0[idx[k]] = v;
  const out = []; let cour = e0, converge = false, k_arret = C.VAGUES_MAX;
  for (let k = 0; k < C.VAGUES_MAX; k++) {
    cour = mul(A, cour); out.push(Float64Array.from(cour));
    if (cour.reduce((s, x) => s + Math.abs(x), 0) < C.SEUIL_VAGUE) { converge = true; k_arret = k + 1; break; }
  }
  return { vagues: out, total: propager(m, variations), converge, k: k_arret };
}

/** systeme_complexe._par_qui — the two incoming relations carrying most of the effect */
export function parQui(m, cible, variations, eff) {
  const { A, idx } = m;
  eff = eff || propager(m, variations);
  const j = idx[cible];
  if (j == null) return [];
  const contribs = [];
  for (const a of m.aretes.values()) {
    const de = a.de;
    if (a.vers !== cible || !(de in idx)) continue;
    const amont = (eff[de] || 0) + (variations[de] || 0);
    contribs.push([Math.abs(A[j][idx[de]] * amont), de]);
  }
  // Python: sort(reverse=True) on (value, id) tuples
  contribs.sort((x, y) => (y[0] - x[0]) || cmp(y[1], x[1]));
  return contribs.slice(0, 2).map(([, d]) => d);
}

/** systeme_direct._lignes */
export function lignes(nom, larg = 17, maxi = 2) {
  const out = []; let ligne = '';
  for (const w of nom.split(/\s+/).filter(Boolean)) {
    if ((ligne + ' ' + w).length > larg && ligne) { out.push(ligne); ligne = w; }
    else ligne = (ligne + ' ' + w).trim();
  }
  out.push(ligne);
  if (out.length > maxi) { out.length = maxi; out[maxi - 1] = out[maxi - 1].slice(0, larg - 1) + '…'; }
  return out;
}

const r1 = x => Math.round(x * 10) / 10;   // Python round(x, 1) on display coordinates
/** systeme_direct._donnees — the drawn sub-graph, ready for the animation */
export function donneesDirect(m, centre, n) {
  const { rang, aretes } = voisinage(m, centre, n);
  const { pos, LARG, HAUT } = positions(rang, centre);
  const etat = etatCourant(m, 'Total');
  const { A, idx } = m;
  const dedans = new Set(pos.keys());
  const bcl = {}; for (const i of pos.keys()) bcl[i] = [0, 0];
  for (const b of m.boucles) {
    if (!b.noeuds.every(x => dedans.has(x))) continue;
    for (const i of b.noeuds) bcl[i][b.type === 'renforcante' ? 0 : 1] += 1;
  }
  const noeuds = trier([...pos.keys()], i => [m.noms[i] ?? i]).map(id => {
    const [x, y] = pos.get(id); const v = etat[id];
    return { id, nom: m.noms[id] ?? id, lig: lignes(m.noms[id] ?? id), x: r1(x), y: r1(y),
      s: v == null ? null : Math.round(v * 100) / 100, r: rang.has(id) ? rang.get(id) : 9, c: id === centre,
      br: bcl[id][0], bb: bcl[id][1] };
  });
  const liens = [];
  for (const a of aretes) {
    if (!pos.has(a.de) || !pos.has(a.vers) || !(a.de in idx) || !(a.vers in idx)) continue;
    liens.push({ de: a.de, vers: a.vers, w: Math.round(A[idx[a.vers]][idx[a.de]] * 1e6) / 1e6, sg: a.signe || 1 });
  }
  const xs = noeuds.map(n => n.x), ys = noeuds.map(n => n.y);
  const vb = [Math.min(...xs) - 100, Math.min(...ys) - 48,
    Math.max(Math.max(...xs) - Math.min(...xs) + 200, 320), Math.max(Math.max(...ys) - Math.min(...ys) + 96, 220)];
  return { noeuds, liens, vb, centre, larg: LARG, haut: HAUT };
}

/** systeme_page._systeme — every variable, its level and the scaled arrows */
export function donneesRegler(m) {
  const etat = etatCourant(m, 'Total');
  const noeuds = m.g.noeuds.map(n => {
    const v = etat[n.id];
    return { id: n.id, nom: n[m.lang] || n.fr || n.id, dim: n.dim || '',
      v: v != null ? Math.round(v * 100) / 100 : 5.0, mesure: v != null };
  });
  const aretes = m.g.aretes.filter(a => a.de in m.idx && a.vers in m.idx).map(a => ({
    de: a.de, vers: a.vers, w: Math.round(m.A[m.idx[a.vers]][m.idx[a.de]] * 1e6) / 1e6, f: a.force, j: a.just || '' }));
  return { noeuds, aretes };
}

// ------------------------------------------------------------------ qualitative wording
/* Shared definitions of BRIEF_BOUCLES.md: the five strength classes (the same
   in every tab, in the workshop and in the Monte Carlo) and the wording of an
   effect on the 0 to 10 score scale. Other tabs import these read-only. */
export const CLASSES = [
  { k: 1, fr: 'très faible', en: 'very weak',   c: 0.20, lo: 0.125, hi: 0.275 },
  { k: 2, fr: 'faible',      en: 'weak',        c: 0.35, lo: 0.275, hi: 0.425 },
  { k: 3, fr: 'moyenne',     en: 'moderate',    c: 0.50, lo: 0.425, hi: 0.575 },
  { k: 4, fr: 'forte',       en: 'strong',      c: 0.65, lo: 0.575, hi: 0.725 },
  { k: 5, fr: 'très forte',  en: 'very strong', c: 0.80, lo: 0.725, hi: 0.875 },
];
/** the class of a stored strength (its absolute value; 0.6 → class 4) */
export function classeDe(force) {
  const f = Math.abs(Number(force) || 0);
  for (const c of CLASSES) if (f < c.hi) return c;
  return CLASSES[CLASSES.length - 1];
}
/** stability target of the model (spectral radius after rescaling) */
export const STABILITE = { centre: 0.6, lo: 0.5, hi: 0.8 };

/* Size of an effect: |Δ| < 0.05 negligible, < 0.2 weak, < 0.5 moderate, else strong. */
export const TAILLES_EFFET = [
  { k: 'negligeable', fr: 'négligeable', en: 'negligible', max: 0.05 },
  { k: 'faible',      fr: 'faible',      en: 'weak',       max: 0.2 },
  { k: 'modere',      fr: 'modéré',      en: 'moderate',   max: 0.5 },
  { k: 'fort',        fr: 'fort',        en: 'strong',     max: Infinity },
];
export function tailleEffet(delta) {
  const a = Math.abs(Number(delta) || 0);
  return TAILLES_EFFET.find(t => a < t.max);
}
/** qualifier(delta, lang) → { sens: 'hausse'|'baisse'|'nul', taille, mot, sensMot, texte, fleche, coul }
    texte: "effet faible, positif" / "weak effect, positive"; a negligible effect has no direction. */
export function qualifier(delta, lang = 'fr') {
  const t = tailleEffet(delta);
  const sens = t.k === 'negligeable' ? 'nul' : delta > 0 ? 'hausse' : 'baisse';
  const fr = lang !== 'en';
  const sensMot = { hausse: fr ? 'positif' : 'positive', baisse: fr ? 'négatif' : 'negative', nul: '' }[sens];
  const mot = fr ? t.fr : t.en;
  const texte = fr ? `effet ${mot}${sensMot ? ', ' + sensMot : ''}` : `${mot} effect${sensMot ? ', ' + sensMot : ''}`;
  const n = { negligeable: 0, faible: 1, modere: 2, fort: 3 }[t.k];
  const fleche = sens === 'nul' ? '→' : (sens === 'hausse' ? '↑' : '↓').repeat(n);
  const coul = { hausse: '#1a8a4f', baisse: '#c33a24', nul: '#8a93a5' }[sens];
  return { sens, taille: t.k, mot, sensMot, texte, fleche, coul };
}

// ------------------------------------------------------------------ Monte Carlo
/** seeded random generator (mulberry32): the same seed gives the same draws */
export function aleatoire(graine = 2026) {
  let a = (graine >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** the nodes lying on at least one cycle (the non-trivial strongly connected
    components, Tarjan): the spectral radius is the largest radius among those
    blocks, so the draws only need the 36 cyclic variables, not all 48. */
const cacheCycliques = new WeakMap();
function blocsCycliques(m) {
  if (cacheCycliques.has(m.g)) return cacheCycliques.get(m.g);
  const N = m.ids.length, succ = Array.from({ length: N }, () => []);
  for (const e of m.g.aretes) succ[m.idx[e.de]].push(m.idx[e.vers]);
  let index = 0; const pile = [], dans = new Array(N).fill(false), num = new Array(N).fill(-1), bas = new Array(N).fill(0), blocs = [];
  const visiter = v => {
    num[v] = bas[v] = index++; pile.push(v); dans[v] = true;
    for (const w of succ[v]) {
      if (num[w] < 0) { visiter(w); bas[v] = Math.min(bas[v], bas[w]); }
      else if (dans[w]) bas[v] = Math.min(bas[v], num[w]);
    }
    if (bas[v] === num[v]) { const c = []; let w; do { w = pile.pop(); dans[w] = false; c.push(w); } while (w !== v); blocs.push(c); }
  };
  for (let v = 0; v < N; v++) if (num[v] < 0) visiter(v);
  const out = blocs.filter(c => c.length > 1 || succ[c[0]].includes(c[0])).map(c => c.sort((a, b) => a - b));
  cacheCycliques.set(m.g, out);
  return out;
}

/** fast spectral radius for the draws: the same Gelfand formula as
    rayonSpectral, on each cyclic block, flat arrays, stopped at 2^18
    (relative error about 1e-5, far below the spread of the stability target
    drawn in [0.5, 0.8]). */
function rayonBloc(A, bloc, M = 18) {
  const N = bloc.length;
  let B = new Float64Array(N * N), C = new Float64Array(N * N), logS = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) B[i * N + j] = A[bloc[i]][bloc[j]];
  for (let m = 0; m < M; m++) {
    let nrm = 0;
    for (let k = 0; k < N * N; k++) { const x = B[k] < 0 ? -B[k] : B[k]; if (x > nrm) nrm = x; }
    if (nrm === 0) return 0;
    for (let k = 0; k < N * N; k++) B[k] /= nrm;
    logS += Math.log(nrm) / Math.pow(2, m);
    C.fill(0);
    for (let i = 0; i < N; i++) {
      const ri = i * N;
      for (let k = 0; k < N; k++) {
        const v = B[ri + k]; if (v === 0) continue;
        const rk = k * N;
        for (let j = 0; j < N; j++) C[ri + j] += v * B[rk + j];
      }
    }
    const t = B; B = C; C = t;
  }
  let nrm = 0;
  for (let k = 0; k < N * N; k++) nrm = Math.max(nrm, Math.abs(B[k]));
  return nrm === 0 ? Math.exp(logS) : Math.exp(logS + Math.log(nrm) / Math.pow(2, M));
}
/** power iteration on one block: converges geometrically when one real
    eigenvalue dominates (the usual case here, 93 of the 100 links being
    positive); returns null when the ratio does not settle, and the caller
    falls back on the Gelfand formula. */
function rayonPuissance(A, bloc, iter = 400) {
  const N = bloc.length, lignes = [];
  for (let i = 0; i < N; i++) { const l = []; for (let j = 0; j < N; j++) { const a = A[bloc[i]][bloc[j]]; if (a !== 0) l.push(j, a); } lignes.push(l); }
  let x = new Float64Array(N).fill(1), y = new Float64Array(N), prec = -1, stable = 0;
  for (let t = 0; t < iter; t++) {
    let nrm = 0;
    for (let i = 0; i < N; i++) { const l = lignes[i]; let s = 0; for (let k = 0; k < l.length; k += 2) s += l[k + 1] * x[l[k]]; y[i] = s; const a = s < 0 ? -s : s; if (a > nrm) nrm = a; }
    if (nrm === 0) return 0;
    for (let i = 0; i < N; i++) y[i] /= nrm;
    const tmp = x; x = y; y = tmp;
    if (prec > 0 && Math.abs(nrm - prec) < 1e-13 * nrm) { if (++stable >= 5) return nrm; } else stable = 0;
    prec = nrm;
  }
  return null;
}
function rayonRapide(m, A) {
  let r = 0;
  for (const b of blocsCycliques(m)) { const p = rayonPuissance(A, b); r = Math.max(r, p != null ? p : rayonBloc(A, b)); }
  return r;
}

/** tirerModele(m, rng, opts) — one Monte Carlo draw of the model.
    Every link strength is drawn uniformly within its class interval and the
    stability target uniformly in [0.5, 0.8]; the matrix is then rescaled
    exactly as matrice() does. Returns a model usable by propager(),
    effetIndice() and vagues() (same ids, idx, graph and scores, new A).
    opts.forces: 'tirees' (default), 'centrales' (class centres) or
    'nominales' (the stored strengths); opts.cible fixes the target.
    With forces 'nominales' and cible 0.6 the result is m itself, bit for bit. */
export function tirerModele(m, rng, opts = {}) {
  const forces = opts.forces || 'tirees';
  const cible = opts.cible != null ? opts.cible : STABILITE.lo + (STABILITE.hi - STABILITE.lo) * rng();
  if (forces === 'nominales') {
    const { A, rayon } = matrice(m.g, { ...m.C, RAYON_CIBLE: cible });
    return { ...m, A, cible, rayon, facteur: rayon > cible ? cible / rayon : 1 };
  }
  const g = { ...m.g, aretes: m.g.aretes.map(e => {
    const c = classeDe(e.force);
    return { ...e, force: forces === 'centrales' ? c.c : c.lo + (c.hi - c.lo) * rng() };
  }) };
  const N = m.ids.length, idx = m.idx;
  let A = Array.from({ length: N }, () => new Float64Array(N));
  for (const e of g.aretes) A[idx[e.vers]][idx[e.de]] = e.signe * e.force;
  const rayon = N ? (opts.exact ? rayonSpectral(A) : rayonRapide(m, A)) : 0;
  if (N && rayon > cible) { const f = cible / rayon; A = A.map(r => r.map(x => x * f)); }
  return { ...m, g, A, cible, rayon, facteur: rayon > cible ? cible / rayon : 1 };
}

/** (I − A)⁻¹ by Gauss-Jordan with partial pivoting, row-major in a Float64Array */
export function inverseIA(A) {
  const N = A.length, W = 2 * N;
  const M = Array.from({ length: N }, (_, i) => {
    const r = new Float64Array(W);
    for (let j = 0; j < N; j++) r[j] = (i === j ? 1 : 0) - A[i][j];
    r[N + i] = 1; return r;
  });
  for (let c = 0; c < N; c++) {
    let p = c, mx = Math.abs(M[c][c]);
    for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > mx) { mx = Math.abs(M[r][c]); p = r; }
    if (mx < 1e-300) return null;
    if (p !== c) { const t = M[p]; M[p] = M[c]; M[c] = t; }
    const Mc = M[c], pv = Mc[c];
    for (let j = c; j < W; j++) Mc[j] /= pv;
    for (let r = 0; r < N; r++) {
      if (r === c) continue;
      const Mr = M[r], f = Mr[c]; if (f === 0) continue;
      for (let j = c; j < W; j++) Mr[j] -= f * Mc[j];
    }
  }
  const out = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) out[i * N + j] = M[i][N + j];
  return out;
}

/** monteCarloIter(m, {n, graine}) — a generator doing the draws one by one
    (so a page can spread them over several frames); its return value is the
    same object as monteCarlo(). */
export function* monteCarloIter(m, { n = 1000, graine = 2026 } = {}) {
  const N = m.ids.length, rng = aleatoire(graine);
  const inv = new Float32Array(n * N * N), portee = new Float64Array(n * N), cibles = new Float64Array(n);
  for (let d = 0; d < n; d++) {
    const t = tirerModele(m, rng);
    const I = inverseIA(t.A);
    cibles[d] = t.cible;
    const base = d * N * N;
    for (let k = 0; k < N * N; k++) inv[base + k] = I[k];
    for (let u = 0; u < N; u++) {
      let s = 0;
      for (let k = 0; k < N; k++) if (k !== u) s += Math.abs(I[k * N + u]);
      portee[d * N + u] = s;
    }
    yield d + 1;
  }
  return { n, graine, N, ids: m.ids, idx: m.idx, inv, portee, cibles };
}
/** monteCarlo(m, {n, graine}) — n draws at once (node, tests) */
export function monteCarlo(m, opts = {}) {
  const it = monteCarloIter(m, opts);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}

/** effects of a push in draw d (same meaning as propager: the push itself excluded) */
export function propagerTirage(mc, d, variations) {
  const { N, idx, inv } = mc, base = d * N * N, out = {};
  const v = Object.entries(variations || {}).filter(([k]) => k in idx).map(([k, x]) => [idx[k], x]);
  mc.ids.forEach((id, i) => {
    let s = 0;
    for (const [j, x] of v) s += inv[base + i * N + j] * x - (i === j ? x : 0);
    out[id] = s;
  });
  return out;
}

/** reach of a +1 push on each lever of `ids`, and rank among them, in every draw */
export function rangsLeviers(mc, ids) {
  const { n, N, idx, portee } = mc, K = ids.length;
  const rangs = ids.map(() => new Int16Array(n)), vals = ids.map(() => new Float64Array(n));
  const ordre = ids.map((_, i) => i);
  for (let d = 0; d < n; d++) {
    const p = ids.map(id => portee[d * N + idx[id]]);
    ordre.sort((a, b) => p[b] - p[a] || a - b);
    ordre.forEach((i, r) => { rangs[i][d] = r + 1; vals[i][d] = p[i]; });
  }
  return ids.map((id, i) => {
    const r = Array.from(rangs[i]).sort((a, b) => a - b), v = Array.from(vals[i]).sort((a, b) => a - b);
    const q = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1))))];
    let top3 = 0; for (const x of rangs[i]) if (x <= 3) top3++;
    const hist = new Array(K).fill(0); for (const x of rangs[i]) hist[x - 1]++;
    return { id, rangMed: q(r, 0.5), rangLo: q(r, 0.05), rangHi: q(r, 0.95), pTop3: top3 / n, hist,
      porteeLo: q(v, 0.05), porteeMed: q(v, 0.5), porteeHi: q(v, 0.95), rangs: rangs[i] };
  });
}

/** quantiles and sign shares of a list of values */
export function resumer(vals) {
  const v = Array.from(vals).sort((a, b) => a - b), n = v.length;
  const q = p => v[Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))))];
  let pos = 0, neg = 0;
  for (const x of v) { if (x >= 0.05) pos++; else if (x <= -0.05) neg++; }
  let sp = 0, sn = 0;
  for (const x of v) { if (x > 0) sp++; else if (x < 0) sn++; }
  return { lo: q(0.05), med: q(0.5), hi: q(0.95), pPos: sp / n, pNeg: sn / n, pHausse: pos / n, pBaisse: neg / n, n };
}
