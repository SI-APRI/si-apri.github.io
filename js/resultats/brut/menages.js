/* Household survey, raw results (Streamlit: explorateur._render_brut and
   explorateur._navigateur_questions). Shares are computed on the households
   who answered the question, from counts precomputed per breakdown cell
   (outils/export_resultats_brut.py); cells under 5 respondents are hidden. */
import {classer} from './recherche.js';
import {barres, radar, carte, esc, f, n as nb, fmt, choix, VERT_APRI} from './graphes.js';

const ICONES = {foyer: 'family_restroom', logement: 'home', revenus: 'payments', agriculture: 'agriculture',
 elevage: 'pets', peche: 'phishing', alimentation: 'restaurant', social: 'groups', risques: 'warning',
 migration: 'flight_takeoff', calcul: 'calculate', autres: 'more_horiz'};
const BASE = 'data/resultats/brut/';
const docsCache = new Map();
const cubes = new Map();

export default async function render({gauche, droite, apri, etat, redessiner}){
 const D = await apri.donnees(BASE + 'menages.json');
 const L = apri.lang;
 const T = (cle, kw) => fmt((D.textes[cle] || {})[L] ?? (D.textes[cle] || {}).fr ?? cle, kw);
 const tx = (fr, en) => apri.t(fr, en);
 etat.theme ??= '__all__'; etat.q ??= {}; etat.rech ??= {}; etat.mod ??= {};
 etat.dims ??= [{axe: 'section', gardees: null}];
 etat.ext ??= 'tous'; etat.vue ??= 'barres';

 const themes = D.themes;
 const nomTheme = c => { const t = themes.find(x => x.code === c); return t ? apri.t(t.fr, t.en) : c; };
 const parTheme = new Map();
 for(const q of D.questions){ if(!parTheme.has(q.th)) parTheme.set(q.th, []); parTheme.get(q.th).push(q); }
 const parI = new Map(D.questions.map(q => [q.i, q]));
 const theme = etat.theme;
 const vues = theme === '__all__' ? D.questions : (parTheme.get(theme) || []);
 const lib = (q, th = theme) => (th === '__all__' ? q.a : q.t)[L];

 // ---------------- left column: theme and question
 gauche.append(choix(apri, {label: tx('Thème', 'Theme'), cle: 'theme',
  options: [['__all__', tx('Tous les thèmes', 'All themes')], ...themes.map(t => [t.code, apri.t(t.fr, t.en)])],
  valeur: theme, surChoix: v => { etat.theme = v || '__all__'; redessiner(); }}));
 let qi = etat.q[theme];
 if(qi != null && !vues.some(q => q.i === qi)) qi = null;
 gauche.append(combo(apri, {label: T('ex_question'), aide: T('ex_chercher'), placeholder: T('ex_b_choisir_q'),
  items: vues.map(q => [q.i, lib(q)]), valeur: qi,
  surChoix: i => { etat.q[theme] = i; redessiner(); }}));

 const choisir = (th, i) => { etat.q[th] = i; redessiner(); };
 const choisirTheme = c => { etat.theme = c; redessiner(); };

 if(qi == null){ navigateur(); return; }
 await resultat(parI.get(qi));

 /* ======================================================== navigator */
 function documents(th){
  const k = L + '|' + th;
  if(!docsCache.has(k)){
   const qs = th === '__all__' ? D.questions : (parTheme.get(th) || []);
   docsCache.set(k, new Map(qs.map(q => [q.i, [lib(q, th), q.q, q.c, q.m[L], nomTheme(q.th)].join(' ')])));
  }
  return docsCache.get(k);
 }
 function boutonQuestion(q, th, fleche){
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'brut-q';
  b.innerHTML = (fleche ? '<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>' : '') + `<span>${esc(lib(q, th))}</span>`;
  if(fleche) b.title = q.m[L];
  b.onclick = () => choisir(th, q.i);
  return b;
 }
 function navigateur(){
  const nav = document.createElement('div');
  nav.className = 'brut-nav';
  droite.append(nav);
  if(theme === '__all__'){
   nav.innerHTML = `<h2>${esc(tx("Qu'est-ce qui vous intéresse ?", 'What are you interested in?'))}</h2>
    <label class="libelle" for="brut-demande">${esc(tx('Décrivez-le en quelques mots', 'Describe it in a few words'))}</label>
    <input id="brut-demande" class="champ brut-demande" type="search" autocomplete="off"
     placeholder="${esc(tx("Par exemple : l'accès à l'eau potable, les bateaux de pêche, l'épargne des familles…", 'For example: access to drinking water, fishing boats, household savings…'))}">
    <div class="brut-trouves"></div><div class="brut-tuiles grille"></div>`;
   const champ = nav.querySelector('input'), zone = nav.querySelector('.brut-trouves');
   champ.value = etat.rech.__all__ || '';
   const maj = () => {
    const demande = champ.value;
    etat.rech.__all__ = demande;
    zone.innerHTML = '';
    if(!demande.trim()) return;
    const trouves = classer(documents('__all__'), demande, D.notions, 40);
    if(!trouves.length){
     zone.innerHTML = `<div class="brut-info">${esc(tx('Rien de proche. Essayez d\'autres mots, ou parcourez les thèmes ci-dessous.', 'Nothing close. Try other words, or browse the themes below.'))}</div>`;
    } else {
     const poids = new Map();
     for(const [i, sc] of trouves){ const th = parI.get(i).th; poids.set(th, (poids.get(th) || 0) + sc); }
     zone.insertAdjacentHTML('beforeend', `<div class="brut-cap">${esc(tx('THÈMES PROPOSÉS', 'SUGGESTED THEMES'))}</div>`);
     const pills = document.createElement('div'); pills.className = 'brut-sugg';
     [...poids.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([code]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'brut-pill';
      b.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${ICONES[code] || 'more_horiz'}</span><span>${esc(nomTheme(code))}</span>`;
      b.onclick = () => choisirTheme(code);
      pills.append(b);
     });
     zone.append(pills);
     zone.insertAdjacentHTML('beforeend', `<div class="brut-cap">${esc(tx('QUESTIONS PROPOSÉES', 'SUGGESTED QUESTIONS'))}</div>`);
     for(const [i] of trouves.slice(0, 8)) zone.append(boutonQuestion(parI.get(i), '__all__', true));
    }
    zone.insertAdjacentHTML('beforeend', `<h3>${esc(tx('Ou parcourez les thèmes', 'Or browse the themes'))}</h3>`);
   };
   let minuteur;
   champ.addEventListener('input', () => { clearTimeout(minuteur); minuteur = setTimeout(maj, 220); });
   champ.addEventListener('keydown', e => { if(e.key === 'Enter'){ clearTimeout(minuteur); maj(); } });
   maj();
   const tuiles = nav.querySelector('.brut-tuiles');
   for(const t of themes){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tuile brut-tuile';
    b.innerHTML = `<h4><span class="material-symbols-outlined" aria-hidden="true">${ICONES[t.code] || 'more_horiz'}</span>${esc(apri.t(t.fr, t.en))} · ${(parTheme.get(t.code) || []).length}</h4><p>${esc(apri.t(t.dfr, t.den))}</p>`;
    b.onclick = () => choisirTheme(t.code);
    tuiles.append(b);
   }
   return;
  }
  // one theme open
  nav.innerHTML = `<div class="brut-haut"><h2>${esc(nomTheme(theme))}</h2>
   <button type="button" class="bouton brut-retour"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>${esc(tx('Tous les thèmes', 'All themes'))}</button></div>
   <label class="libelle" for="brut-rech-th">${esc(tx('Que cherchez-vous dans ce thème ?', 'What are you looking for in this theme?'))}</label>
   <input id="brut-rech-th" class="champ" type="search" autocomplete="off" placeholder="${esc(tx('Quelques mots suffisent', 'A few words are enough'))}">
   <div class="brut-liste"></div>`;
  nav.querySelector('.brut-retour').onclick = () => choisirTheme('__all__');
  const champ = nav.querySelector('input'), liste = nav.querySelector('.brut-liste');
  champ.value = etat.rech[theme] || '';
  const maj = () => {
   const r = champ.value;
   etat.rech[theme] = r;
   liste.innerHTML = '';
   const qs = parTheme.get(theme) || [];
   if(r.trim()){
    const trouves = classer(documents(theme), r, D.notions, 40);
    liste.insertAdjacentHTML('beforeend', `<div class="brut-cap brut-cap-n">${esc(L === 'fr' ? `${trouves.length} question(s) proche(s)` : `${trouves.length} close question(s)`)}</div>`);
    for(const [i] of trouves) liste.append(boutonQuestion(parI.get(i), theme, true));
    return;
   }
   const groupes = new Map();
   for(const q of qs){ const m = q.m[L]; if(!groupes.has(m)) groupes.set(m, []); groupes.get(m).push(q); }
   const seul = groupes.size === 1;
   for(const [nom, g] of groupes){
    const d = document.createElement('details'); d.className = 'pli brut-module';
    d.open = seul || g.length <= 6;
    d.innerHTML = `<summary>${esc(nom)} · ${g.length}</summary>`;
    const corps = document.createElement('div'); corps.className = 'brut-module-q';
    for(const q of g) corps.append(boutonQuestion(q, theme, false));
    d.append(corps);
    liste.append(d);
   }
  };
  let minuteur;
  champ.addEventListener('input', () => { clearTimeout(minuteur); minuteur = setTimeout(maj, 220); });
  maj();
 }

 /* ============================================================ result */
 async function cube(i){
  if(!cubes.has(i)){
   const d = await apri.donnees(`${BASE}q/${i}.json`);
   const m = {};
   for(const [k, lignes] of Object.entries(d.c)) m[k] = new Map(lignes.map(r => [r[0], r]));
   cubes.set(i, m);
  }
  return cubes.get(i);
 }

 async function resultat(q){
  const C = await cube(q.i);
  const AX = D.axes, axIdx = Object.fromEntries(AX.map((a, k) => [a.code, k]));
  const axe = c => AX[axIdx[c]];
  const libAxe = c => axe(c).lib[L];
  const libVal = v => (D.libval[v] || {})[L] ?? v;
  const mods = q.r[L];
  let modalite = etat.mod[q.i] ?? null;
  if(modalite != null && !(modalite >= 0 && modalite < q.r.fr.length)) modalite = null;

  const box = document.createElement('div'); box.className = 'brut-res';
  droite.append(box);
  box.innerHTML = `<div class="brut-cap">${esc(tx('RÉPONSE À VOTRE QUESTION', 'ANSWER TO YOUR QUESTION'))}</div><h2>${esc(lib(q))}</h2>`;

  // ---- answer + breakdown criteria
  const dimsZone = document.createElement('div'); dimsZone.className = 'brut-dims';
  box.append(dimsZone);
  const dispo = AX.map(a => a.code);
  const dims = etat.dims.filter(d => dispo.includes(d.axe));
  const repCh = choix(apri, {label: T('ex_reponse'), cle: 'rep', vide: T('ex_b_toutes'),
   options: mods.map((m, j) => [j, m]), valeur: modalite,
   surChoix: v => { etat.mod[q.i] = v == null ? null : Number(v); redessiner(); }});
  repCh.classList.add('brut-rep');
  if(!dims.length){ const r = document.createElement('div'); r.className = 'brut-dim'; r.append(repCh); dimsZone.append(r); }
  dims.forEach((d, i) => {
   const ligne = document.createElement('div'); ligne.className = 'brut-dim';
   if(i === 0) ligne.append(repCh); else ligne.append(Object.assign(document.createElement('div'), {className: 'brut-rep brut-rep-vide'}));
   const libres = dispo.filter(a => a === d.axe || !dims.some(x => x.axe === a));
   ligne.append(choix(apri, {label: T('ex_dim_n', {n: i + 1}), cle: 'dim' + i,
    options: libres.map(a => [a, libAxe(a)]), valeur: d.axe,
    surChoix: v => { if(v && v !== d.axe){ d.axe = v; d.gardees = null; redessiner(); } }}));
   const vals = axe(d.axe).vals;
   const cats = document.createElement('div'); cats.className = 'brut-champ brut-cats';
   cats.innerHTML = `<span class="libelle">${esc(T('ex_dim_cat'))}</span>`;
   const pills = document.createElement('div'); pills.className = 'brut-chips';
   const gardees = d.gardees && d.gardees.length ? d.gardees : vals;
   for(const v of vals){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'brut-chip';
    b.setAttribute('aria-pressed', String(gardees.includes(v)));
    b.textContent = libVal(v);
    b.onclick = () => {
     let g = new Set(d.gardees && d.gardees.length ? d.gardees : vals);
     if(g.has(v)) g.delete(v); else g.add(v);
     d.gardees = vals.filter(x => g.has(x));
     if(d.gardees.length === vals.length || !d.gardees.length) d.gardees = null;
     redessiner();
    };
    pills.append(b);
   }
   cats.append(pills);
   ligne.append(cats);
   const x = document.createElement('button'); x.type = 'button'; x.className = 'brut-x'; x.textContent = '✕';
   x.title = T('ex_dim_oter'); x.setAttribute('aria-label', T('ex_dim_oter'));
   x.onclick = () => { etat.dims = etat.dims.filter(z => z !== d); redessiner(); };
   ligne.append(x);
   dimsZone.append(ligne);
  });
  if(!dims.length){
   dimsZone.insertAdjacentHTML('beforeend', `<p class="brut-x-note"><b>${esc(T('ex_tout_ech'))}</b> · ${esc(T('ex_tout_x'))}</p>`);
  }
  if(dims.length < dispo.length){
   const plus = document.createElement('button'); plus.type = 'button'; plus.className = 'brut-plus';
   plus.textContent = '＋ ' + T('ex_dim_plus');
   plus.onclick = () => { const manque = dispo.filter(a => !dims.some(x => x.axe === a)); etat.dims = [...dims, {axe: manque[0], gardees: null}]; redessiner(); };
   box.append(plus);
  }
  const croiser = document.createElement('details'); croiser.className = 'pli brut-croiser';
  croiser.innerHTML = `<summary>${esc(T('ex_croiser_q'))}</summary><p class="note">${esc(tx(
   "Croiser avec une seconde question demande les réponses ménage par ménage. Cette version publique du site ne publie que des effectifs agrégés, pour protéger les ménages enquêtés : le croisement entre deux questions n'y est donc pas proposé.",
   'Crossing with a second question needs the answers household by household. This public version of the site only publishes aggregated counts, to protect the surveyed households, so crossing two questions is not offered here.'))}</p>`;
  box.append(croiser);

  // ---- groups, counts
  const choisies = dims.map(d => ({axe: d.axe, vals: d.gardees && d.gardees.length ? d.gardees : axe(d.axe).vals}));
  const canon = [...choisies].sort((a, b) => axIdx[a.axe] - axIdx[b.axe]).map(c => c.axe);
  const table = C[canon.join('|')] || new Map();
  const tout = (C[''] || new Map()).get(0);
  let groupes = [];
  if(!choisies.length) groupes = [{nom: T('ex_tout_ech'), cle: 'tout', r: tout}];
  else {
   const prod = choisies.reduce((acc, c) => acc.flatMap(p => c.vals.map(v => [...p, [c.axe, v]])), [[]]);
   for(const combo of prod){
    const parAxe = Object.fromEntries(combo);
    let idx = 0;
    for(const a of canon){ const vs = axe(a).vals; idx = idx * vs.length + vs.indexOf(parAxe[a]); }
    const r = table.get(idx);
    if(!r) continue;                          // empty group, or nobody answered
    groupes.push({nom: combo.map(([, v]) => libVal(v)).join(' · '), cle: combo.map(([, v]) => v).join('|'), r});
   }
  }
  const lignes = [];
  if(modalite == null){
   for(const g of groupes){
    if(g.r[1] < 0){ lignes.push({nom: tx('Moins de 5 répondants', 'Fewer than 5 respondents'), axe: g.nom, n: 0, k: null, part: null, supp: true}); continue; }
    const base = g.r[1];
    mods.forEach((m, j) => lignes.push({nom: m, cle: g.cle + '|' + j, axe: g.nom, axe_code: 'groupe', n: base, k: g.r[2 + j], part: base ? 100 * g.r[2 + j] / base : null}));
   }
  } else {
   const libA = choisies.length === 1 ? libAxe(choisies[0].axe) : choisies.length ? T('ex_croise') : T('ex_tout_ech');
   const code = choisies.length === 1 ? choisies[0].axe : choisies.length ? 'croisement' : 'tout';
   for(const g of groupes){
    if(g.r[1] < 0){ lignes.push({nom: g.nom, cle: g.cle, axe: libA, axe_code: code, n: 0, k: null, part: null, supp: true}); continue; }
    lignes.push({nom: g.nom, cle: g.cle, axe: libA, axe_code: code, n: g.r[1], k: g.r[2 + modalite], part: g.r[1] ? 100 * g.r[2 + modalite] / g.r[1] : null});
   }
  }
  const ens = tout ? {n: tout[1], k: modalite == null ? null : tout[2 + modalite],
   part: modalite == null || !tout[1] ? null : 100 * tout[2 + modalite] / tout[1]} : {n: 0, k: null, part: null};
  if(!lignes.length){ box.insertAdjacentHTML('beforeend', `<div class="brut-info">${esc(T('ex_vide'))}</div>`); return; }

  // ---- display controls
  const formes = ['barres'];
  if(modalite != null && choisies.length === 1 && choisies[0].axe === 'section') formes.push('carte');
  if(modalite != null && lignes.length >= 3) formes.push('radar');
  formes.push('tableau');
  let forme = formes.includes(etat.vue) ? etat.vue : 'barres';
  const rang = document.createElement('div'); rang.className = 'brut-resbar';
  rang.innerHTML = `<div class="brut-sec">${esc(T('ex_res'))}</div>`;
  rang.append(choix(apri, {label: T('ex_extremes'), cle: 'ext',
   options: [['tous', T('ex_tous')], ['top', T('ex_top')], ['flop', T('ex_flop')], ['topflop', T('ex_topflop')], ['ecart', T('ex_ecart')]],
   valeur: etat.ext, surChoix: v => { etat.ext = v || 'tous'; redessiner(); }}));
  rang.append(choix(apri, {label: T('ex_voir'), cle: 'vue', options: formes.map(x => [x, T('ex_' + x)]),
   valeur: forme, surChoix: v => { etat.vue = v || 'barres'; redessiner(); }}));
  box.append(rang);
  const manque = ['carte', 'radar'].filter(x => !formes.includes(x)).map(x => T('ex_pourquoi_' + x));
  if(manque.length) box.insertAdjacentHTML('beforeend', `<p class="brut-gris">${esc(manque.join(' · '))}</p>`);

  const montrees = filtrer(lignes, etat.ext, ens);
  if(forme === 'radar' && montrees.filter(l => !l.supp).length < 3) forme = 'barres';
  const dessin = document.createElement('div'); dessin.className = 'brut-dessin';
  box.append(dessin);
  if(forme === 'carte'){
   const vals = {}, base = {};
   for(const l of montrees) if(l.axe_code === 'section' && l.part != null){ vals[l.cle] = l.part; base[l.cle] = l.n; }
   const html = await carte(apri, vals, {base});
   if(html == null){ dessin.insertAdjacentHTML('beforeend', `<div class="brut-info">${esc(T('ex_carte_sec'))}</div>`); forme = 'barres'; }
   else dessin.innerHTML = html;
  }
  if(forme === 'radar'){
   const ml = montrees.filter(l => !l.supp);
   dessin.innerHTML = `<div class="brut-radar">${radar(ml.map(l => l.nom), [[modalite != null ? mods[modalite] : T('ex_b_toutes'), ml.map(l => l.part != null ? l.part / 10 : null), VERT_APRI]], 430)}</div>`
    + `<p class="brut-gris">${esc(T('ex_radar_ech', {p: f(ens.part, 0, L), v: f((ens.part || 0) / 10, 1, L)}))}</p>`;
  } else if(forme === 'tableau'){
   dessin.innerHTML = tableau(montrees, ens);
  } else if(forme === 'barres'){
   dessin.innerHTML = barres(montrees, ens, {lang: L, ensLib: T('ex_ens'), fragile: D.fragile});
  }

  box.insertAdjacentHTML('beforeend', synthese(montrees));
  const notes = [];
  if(modalite != null && choisies.length > 1){
   const poss = choisies.reduce((p, c) => p * Math.max(1, axe(c.axe).vals.length), 1);
   notes.push(esc(T('ex_croise_x', {k: nb(lignes.length, L), n: nb(poss, L)})));
  }
  if(montrees.some(l => l.supp || l.n < D.fragile)) notes.push(esc(T('ex_fragile', {n: D.fragile})));
  if(montrees.some(l => l.supp)) notes.push(esc(tx(
   'Les groupes de moins de 5 répondants ne sont pas chiffrés, pour protéger la confidentialité des ménages.',
   'Groups of fewer than 5 respondents are not given figures, to protect the confidentiality of households.')));
  if(notes.length) box.insertAdjacentHTML('beforeend', `<p class="brut-gris">${notes.join('<br>')}</p>`);
 }

 function filtrer(lignes, choixE, ens){
  lignes = lignes.map(l => ({...l}));
  const mes = lignes.filter(x => x.part != null);
  if(choixE === 'tous' || mes.length <= 3) return lignes;
  if(choixE === 'ecart'){
   const ref = ens?.part;
   if(ref == null) return lignes;
   const tri = [...mes].sort((a, b) => Math.abs(b.part - ref) - Math.abs(a.part - ref)).slice(0, 3);
   for(const x of tri) x.rang = x.part >= ref ? 'haut' : 'bas';
   const g = new Set(tri);
   return lignes.filter(x => g.has(x));
  }
  const tri = [...mes].sort((a, b) => a.part - b.part);
  const g = new Set();
  if(choixE === 'top' || choixE === 'topflop') for(const x of tri.slice(-3)){ g.add(x); x.rang = 'haut'; }
  if(choixE === 'flop' || choixE === 'topflop') for(const x of tri.slice(0, 3)){ g.add(x); x.rang = 'bas'; }
  return lignes.filter(x => g.has(x));
 }

 function tableau(lignes, ens){
  const u = ' %';
  const r = [`<div class="brut-tabwrap"><table class="tableau brut-tab"><thead><tr><th>${esc(T('ex_axe'))}</th><th class="num">${esc(T('ex_part'))}</th><th class="num">${esc(T('ex_col_n'))}</th></tr></thead><tbody>`];
  let axeVu = null;
  for(const l of lignes){
   if(l.axe && lignes.some(x => x.axe !== l.axe) && l.axe !== axeVu){ axeVu = l.axe; r.push(`<tr class="brut-tab-axe"><td colspan="3">${esc(l.axe)}</td></tr>`); }
   let pt = '';
   if(l.rang === 'haut' || l.rang === 'bas') pt = `<span class="brut-pt" style="background:${l.rang === 'haut' ? '#1a6b52' : '#c2761a'}"></span>`;
   const pale = l.supp || l.n < D.fragile ? ' class="pale"' : '';
   r.push(`<tr${pale}><td>${pt}${esc(l.nom)}</td><td class="num v">${l.supp ? 'n &lt; 5' : f(l.part, 1, L) + u}</td><td class="num">${l.supp ? '&lt; 5' : `${l.k} / ${l.n}`}</td></tr>`);
  }
  r.push(`<tr class="brut-tab-ens"><td>${esc(T('ex_ens'))}</td><td class="num v">${f(ens.part, 1, L)}${ens.part != null ? u : ''}</td><td class="num">${ens.k != null ? ens.k : '—'} / ${ens.n}</td></tr></tbody></table></div>`);
  return r.join('');
 }

 function synthese(lignes){
  const vals = lignes.filter(l => l.part != null).map(l => [l.nom, l.part]);
  if(vals.length < 2) return '';
  const u = ' %';
  const moy = vals.reduce((s, [, v]) => s + v, 0) / vals.length;
  let haut = vals[0], bas = vals[0];
  for(const v of vals){ if(v[1] > haut[1]) haut = v; if(v[1] < bas[1]) bas = v; }
  return `<div class="brut-st"><span>${esc(T('ex_b_moy'))} <b>${f(moy, 1, L)}${u}</b></span>`
   + `<span>${esc(T('ex_b_haut'))} <b>${f(haut[1], 1, L)}${u}</b> ${esc(haut[0])}</span>`
   + `<span>${esc(T('ex_b_bas'))} <b>${f(bas[1], 1, L)}${u}</b> ${esc(bas[0])}</span>`
   + `<span>${esc(T('ex_b_ecart'))} <b>${f(haut[1] - bas[1], 1, L)}${u}</b></span></div>`;
 }
}

/* A searchable select, like Streamlit's selectbox: type to filter the list. */
function combo(apri, {label, aide, placeholder, items, valeur, surChoix}){
 const div = document.createElement('div');
 div.className = 'brut-champ brut-combo';
 const courant = items.find(([i]) => i === valeur);
 div.innerHTML = `<label class="libelle" for="brut-qcombo">${esc(label)}${aide ? ` <span class="brut-aide" title="${esc(aide)}" tabindex="0" aria-label="${esc(aide)}">?</span>` : ''}</label>
  <div class="brut-combo-boite"><input id="brut-qcombo" class="champ" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" autocomplete="off" placeholder="${esc(placeholder)}">
  ${courant ? `<button type="button" class="brut-combo-x" aria-label="${esc(apri.t('Effacer', 'Clear'))}">✕</button>` : ''}
  <ul class="brut-combo-liste" role="listbox" hidden></ul></div>`;
 const champ = div.querySelector('input'), liste = div.querySelector('ul');
 champ.value = courant ? courant[1] : '';
 let actif = -1, vus = [];
 const montrer = filtre => {
  const mots = apri.plier(filtre).split(/\s+/).filter(Boolean);
  vus = items.filter(([, t]) => { const p = apri.plier(t); return mots.every(m => p.includes(m)); }).slice(0, 300);
  liste.innerHTML = vus.length ? vus.map(([i, t], k) => `<li role="option" data-k="${k}"${i === valeur ? ' aria-selected="true"' : ''}>${esc(t)}</li>`).join('')
   : `<li class="brut-combo-rien">${esc(apri.t('Aucun résultat', 'No results'))}</li>`;
  liste.hidden = false; champ.setAttribute('aria-expanded', 'true'); actif = -1;
 };
 const fermer = () => { liste.hidden = true; champ.setAttribute('aria-expanded', 'false'); champ.value = courant ? courant[1] : ''; };
 champ.addEventListener('focus', () => { champ.select(); montrer(''); });
 champ.addEventListener('input', () => montrer(champ.value));
 champ.addEventListener('blur', () => setTimeout(fermer, 150));
 champ.addEventListener('keydown', e => {
  const lis = [...liste.querySelectorAll('li[role=option]')];
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
   e.preventDefault(); if(liste.hidden) montrer(champ.value);
   actif = Math.max(0, Math.min(lis.length - 1, actif + (e.key === 'ArrowDown' ? 1 : -1)));
   lis.forEach((l, k) => l.classList.toggle('actif', k === actif)); lis[actif]?.scrollIntoView({block: 'nearest'});
  } else if(e.key === 'Enter' && actif >= 0){ e.preventDefault(); surChoix(vus[actif][0]); }
  else if(e.key === 'Escape'){ champ.blur(); }
 });
 liste.addEventListener('mousedown', e => { const li = e.target.closest('li[role=option]'); if(li){ e.preventDefault(); surChoix(vus[+li.dataset.k][0]); } });
 div.querySelector('.brut-combo-x')?.addEventListener('click', () => surChoix(null));
 return div;
}
