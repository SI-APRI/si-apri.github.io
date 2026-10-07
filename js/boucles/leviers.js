// Tab 5 · Identify key levers (systeme_complexe.render_leviers), with the
// ranking tested against the uncertainty of the link strengths (Monte Carlo
// of moteur.js): rank interval, chance of staying in the top three, and the
// overall effect in words. Exact model figures only in the folded panel / CSV.
import { charger, esc, barreExport, rappel, COUL, E } from './commun.js';
import * as Q from './incertitude.js';

export default async function render(el, apri) {
  const { m, s, T, f } = await charger(apri);
  const L = m.lang;
  el.innerHTML = '';
  const r = document.createElement('div'); r.className = 'bcl';
  el.append(r);
  r.innerHTML = `<div class="titre-bloc">${esc(T('sx_t3'))}</div>${rappel(m, s, T)}
    <p class="mc-lead">${esc(apri.t('Cette page montre où une poussée voyage le plus loin dans le système.', 'This page shows where a push travels furthest through the system.'))}
    ${esc(apri.t('Lisez chaque ligne de gauche à droite : le rang du levier, la place qu’il occupe quand on refait le calcul, et sa chance de rester parmi les trois premiers.', 'Read each line from left to right: the lever’s rank, where it lands when the calculation is redone, and its chance of staying among the first three.'))}</p>`;

  const { rang } = E.voisinage(m, s.centre, s.n);
  // THE REACH IS A PROPAGATION, NOT A DEGREE
  let lignes = [];
  for (const lv of m.leviers) {
    if (!rang.has(lv.id)) continue;
    const eff = E.propager(m, { [lv.id]: 1.0 });
    let portee = 0; for (const [k, v] of Object.entries(eff)) if (k !== lv.id) portee += Math.abs(v);
    lignes.push({ ...lv, portee, nom: m.noms[lv.id] ?? lv.id });
  }
  if (!lignes.length) { r.append(apri.h(`<div class="bcl-info">${esc(T('sx_boucles_0'))}</div>`)); return; }
  lignes = E.trier(lignes, x => [-x.portee]);
  lignes.forEach((x, i) => { x.rangC = i + 1; });
  const K = lignes.length, vus = lignes.slice(0, 14);

  // the plain sentence, and the method folded underneath
  r.append(apri.h(`<div class="mc-pourquoi">${Q.DE}<p>${esc(apri.t(
    'La force de chaque lien n’est connue qu’à peu près. Nous refaisons donc le calcul 1 000 fois en faisant varier ces forces dans leur classe : un levier qui reste en tête presque à chaque fois est un choix solide, un levier dont le rang saute est à confirmer avec le terrain.',
    'The strength of each link is only roughly known. So the calculation is redone 1,000 times, letting these strengths vary within their class: a lever that stays on top almost every time is a solid choice, one whose rank jumps around needs checking in the field.'))}</p></div>`));
  r.append(apri.h(`<details class="pli mc-methode"><summary>${esc(apri.t('Comment ce calcul est fait', 'How this is calculated'))}</summary>
    <p>${esc(apri.t('Pour chacun des 1 000 tirages, la force de chaque lien est tirée au hasard dans l’intervalle de sa classe (par exemple, une force « forte » entre 0,575 et 0,725), et la stabilité du modèle est tirée entre 0,5 et 0,8. Les forces sont remises à l’échelle, puis l’effet total de chaque variable est calculé exactement, boucles comprises.',
      'In each of the 1,000 draws, the strength of every link is drawn at random within its class interval (for example, a “strong” link between 0.575 and 0.725), and the model stability is drawn between 0.5 and 0.8. The strengths are rescaled, then the total effect of each variable is computed exactly, loops included.'))}</p>
    <p>${esc(apri.t('Le rang « généralement » est la médiane des tirages ; l’intervalle « entre … et … » contient 90 % des tirages. La graine du tirage est fixe : la page donne toujours le même résultat.',
      'The “usually” rank is the median over the draws; the “between … and …” interval holds 90 % of the draws. The random seed is fixed: the page always gives the same result.'))}</p>
    <p>${esc(apri.t('Ce que le calcul ne couvre pas : un lien qui manque ou dont le sens est faux, et les seuils (le modèle est linéaire).', 'What it does not cover: a missing link or one pointing the wrong way, and thresholds (the model is linear).'))}</p></details>`));

  const liste = apri.h(`<div class="mc-leviers"></div>`);
  r.append(liste);
  const prog = Q.progression(apri, m);
  liste.before(prog);

  function dessinerLignes(mc) {
    const st = mc ? E.rangsLeviers(mc, lignes.map(x => x.id)) : null;
    const S = st ? Object.fromEntries(st.map(x => [x.id, x])) : {};
    liste.innerHTML = vus.map(x => {
      const u = S[x.id];
      const bas = x.bascule ? ` <span class="sx-badge mc-relie">${esc(T('sx_bascule'))}</span>` : '';
      const info = `${x.degre} ${esc(apri.t('connexions', 'connections'))} · ${x.boucles} ${esc(apri.t('boucles', 'loops'))}`;
      let droite;
      if (!u) droite = `<div class="mc-lev-txt"><span class="mc-attente">${esc(apri.t('incertitude en calcul…', 'computing uncertainty…'))}</span><br>${esc(apri.t('effet d’ensemble', 'overall effect'))} ${esc(E.qualifier(x.portee, L).mot)}</div>`;
      else {
        const pc = Math.round(100 * u.pTop3);
        const ton = u.pTop3 >= 0.9 ? 'certain' : u.pTop3 >= 0.6 ? 'souvent' : u.pTop3 >= 0.3 ? 'parfois' : 'rare';
        const inter = u.rangLo === u.rangHi
          ? apri.t(`toujours ${Q.ordinal(u.rangMed, L)}`, `always ${Q.ordinal(u.rangMed, L)}`)
          : apri.t(`généralement ${Q.ordinal(u.rangMed, L)}, entre ${Q.ordinal(u.rangLo, L)} et ${Q.ordinal(u.rangHi, L)}`,
            `usually ${Q.ordinal(u.rangMed, L)}, between ${Q.ordinal(u.rangLo, L)} and ${Q.ordinal(u.rangHi, L)}`);
        droite = `<div class="mc-lev-txt"><span class="mc-pct mc-${ton}" title="${esc(apri.t('part des tirages où ce levier est dans les trois premiers', 'share of draws in which this lever is among the first three'))}">${pc} %</span>
          <b>${esc(Q.phraseTop3(u.pTop3, L))}</b><br><span>${esc(inter)} · ${esc(apri.t('effet d’ensemble', 'overall effect'))} ${esc(Q.plageMots(u.porteeLo, u.porteeHi, L))}</span></div>`;
      }
      return `<div class="mc-lev"><div class="mc-lev-nom"><span class="mc-num">${x.rangC}</span><span><span class="mc-nm">${esc(x.nom)}</span>${bas}<small>${info}</small></span></div>
        ${u ? graphe(u, K) : '<div class="mc-plot mc-plot-vide"></div>'}${droite}</div>`;
    }).join('') + `<div class="mc-leg"><span><i class="mc-l-dot"></i>${esc(apri.t('rang le plus fréquent', 'most frequent rank'))}</span>
      <span><i class="mc-l-bar"></i>${esc(apri.t('9 tirages sur 10 tombent ici', '9 draws in 10 land here'))}</span>
      <span><i class="mc-l-top"></i>${esc(apri.t('trio de tête', 'top three'))}</span>
      ${K > 14 ? `<span>${esc(apri.t(`${K} variables classées, les 14 premières montrées`, `${K} variables ranked, the first 14 shown`))}</span>` : ''}</div>`;
    figures(st);
  }
  // the dot plot: one dot per possible rank, darker where the draws land more often
  function graphe(u, K) {
    const W = 220, H = 30, x = k => 8 + (W - 16) * (K > 1 ? (k - 1) / (K - 1) : 0.5);
    const top = Math.min(3, K);
    const mx = Math.max(...u.hist);
    const pts = u.hist.map((c, i) => c ? `<circle cx="${x(i + 1).toFixed(1)}" cy="15" r="${(2.2 + 3.6 * c / mx).toFixed(1)}" fill="#2f7a5b" fill-opacity="${(0.18 + 0.82 * c / mx).toFixed(2)}"/>` : '').join('');
    return `<div class="mc-plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(apri.t('rangs obtenus sur 1 000 tirages', 'ranks obtained over 1,000 draws'))}">
      <rect x="${x(1) - 7}" y="3" width="${x(top) - x(1) + 14}" height="24" rx="6" fill="#e3f1e9"/>
      <line x1="${x(1)}" x2="${x(K)}" y1="15" y2="15" stroke="#dce4ea" stroke-width="2"/>
      <line x1="${x(u.rangLo)}" x2="${x(u.rangHi)}" y1="15" y2="15" stroke="#397fa3" stroke-width="5" stroke-linecap="round" opacity=".45"/>
      ${pts}<circle cx="${x(u.rangMed)}" cy="15" r="6.5" fill="#fff" stroke="#1f3a4a" stroke-width="2.2"/>
      <text x="${x(1)}" y="29" font-size="7.5" text-anchor="middle" fill="#6b7590">1</text><text x="${x(K)}" y="29" font-size="7.5" text-anchor="middle" fill="#6b7590">${K}</text></svg></div>`;
  }

  // figures: folded, labelled as model values, exported as CSV
  const zoneFig = document.createElement('div');
  r.append(zoneFig);
  function figures(st) {
    const S = st ? Object.fromEntries(st.map(x => [x.id, x])) : {};
    const corps = lignes.map(x => {
      const u = S[x.id];
      return `<tr><td>${esc(x.nom)}</td><td class="n">${x.rangC}</td><td class="n">${f(x.portee, 3)}</td>
        <td class="n">${u ? f(u.porteeLo, 2) + ' – ' + f(u.porteeHi, 2) : '…'}</td><td class="n">${u ? u.rangMed : '…'}</td>
        <td class="n">${u ? u.rangLo + ' – ' + u.rangHi : '…'}</td><td class="n">${u ? apri.pct(u.pTop3) : '…'}</td>
        <td class="n">${x.degre}</td><td class="n">${x.boucles} (${x.renforcantes}R / ${x.equilibrantes}B)</td><td>${x.bascule ? esc(T('sx_bascule')) : ''}</td></tr>`;
    }).join('');
    const tab = apri.h(`<div class="sx-defile"><table class="sx-tab"><thead><tr><th>${esc(T('sx_col_var'))}</th>
      <th class="n">${esc(apri.t('Rang (valeurs centrales)', 'Rank (central values)'))}</th>
      <th class="n">${esc(apri.t('Effet d’ensemble, valeur du modèle', 'Overall effect, model value'))}</th>
      <th class="n">${esc(apri.t('Effet d’ensemble, 90 % des tirages', 'Overall effect, 90 % of draws'))}</th>
      <th class="n">${esc(apri.t('Rang médian', 'Median rank'))}</th><th class="n">${esc(apri.t('Rang, 90 % des tirages', 'Rank, 90 % of draws'))}</th>
      <th class="n">${esc(apri.t('Dans le trio de tête', 'In the top three'))}</th>
      <th class="n">${esc(T('sx_col_deg'))}</th><th class="n">${esc(T('sx_col_bcl'))}</th><th>${esc(apri.t('Très reliée', 'Highly linked'))}</th></tr></thead><tbody>${corps}</tbody></table></div>`);
    const d = Q.detailChiffre(apri, tab);
    const ouvert = zoneFig.querySelector('details')?.open;
    if (ouvert) d.open = true;
    zoneFig.replaceChildren(d);
    barreExport(apri, tab, tab.querySelector('table'));
  }

  dessinerLignes(null);
  r.append(apri.h(`<div><p class="sx-note sx-encadre">${esc(T('sx_col_porte_x'))}</p><p class="sx-note sx-encadre">${esc(T('sx_bascule_x'))}</p></div>`));
  r.append(Q.noteSeuils(apri));
  r.append(Q.noteStabilite(apri, m, f));

  const dom = E.bouclesDominantes(m.boucles, 8).filter(d => rang.has(d.de) && rang.has(d.vers));
  if (dom.length) {
    r.append(apri.h(`<div><div class="titre-bloc" style="margin-top:22px">${esc(T('sx_dom'))}</div>
      <p class="sx-note sx-encadre">${esc(T('sx_dom_x'))}</p></div>`));
    for (const d of dom) {
      const a = m.aretes.get(d.de + '|' + d.vers) || {};
      const p = (a.signe ?? 1) > 0;
      r.append(apri.h(`<div class="sx-carte sx-dom"><span class="sx-dom-a">${esc(m.noms[d.de] ?? d.de)}
        <b style="color:${p ? COUL.VERT : COUL.ROUGE}">${p ? '→' : '⊣'}</b> ${esc(m.noms[d.vers] ?? d.vers)}</span>
        <span class="sx-dom-n">${esc(T('sx_dom_n', { n: d.n, r: d.renf, b: d.equi }))}</span></div>`));
    }
  }

  Q.incertitude(m).then(mc => { if (liste.isConnected) dessinerLignes(mc); });
}
