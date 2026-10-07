// Tab 6 · Test interventions (systeme_complexe.render_simuler, with the relay
// decomposition _bloc_vagues that follows it on the same screen)
import { charger, etat, esc, barreExport, rappel, COUL, E } from './commun.js';
import * as Q from './incertitude.js';

export default async function render(el, apri) {
  const { m, s, T, f } = await charger(apri);
  const C = m.C;
  el.innerHTML = '';
  const r = document.createElement('div'); r.className = 'bcl';
  el.append(r);
  r.innerHTML = `<div class="titre-bloc">${esc(T('sx_t4'))}</div>${rappel(m, s, T)}
    <p class="mc-lead">${esc(apri.t('Cette page teste une intervention : vous poussez une ou plusieurs variables et vous voyez ce qui bouge ailleurs.', 'This page tests an intervention: you push one or more variables and see what moves elsewhere.'))}
    ${esc(apri.t('Choisissez les variables, réglez la poussée avec les curseurs, puis lisez les flèches : leur sens, leur taille, et à quel point le résultat est sûr.', 'Pick the variables, set the push with the sliders, then read the arrows: their direction, their size, and how sure the result is.'))}</p>
    <details class="pli"><summary>${esc(apri.t('En savoir plus', 'Read more'))}</summary><p>${esc(T('sx_x4'))}</p></details>`;

  const { rang } = E.voisinage(m, s.centre, s.n);
  const dispo = E.trier([...rang.keys()], i => [m.noms[i]]);
  // a variable that left the perimeter cannot stay selected; first visit: the centre
  if (etat.pousse == null) etat.pousse = dispo.includes(s.centre) ? [s.centre] : [];
  else etat.pousse = etat.pousse.filter(x => dispo.includes(x));

  // ---- the scenario: multiselect + one slider per pushed variable
  const scen = document.createElement('div'); scen.className = 'sx-scen';
  r.append(scen);
  const resultats = document.createElement('div');
  function dessinerScenario() {
    scen.innerHTML = `<span class="libelle">${esc(T('sx_pousser'))}</span>
      <div class="sx-multi">${etat.pousse.map(id => `<span class="sx-puce">${esc(m.noms[id])}<button type="button" data-x="${id}" aria-label="×">×</button></span>`).join('')}
      <select class="sx-ajout" aria-label="${esc(T('sx_pousser'))}"><option value="">${apri.t('Ajouter une variable…', 'Add a variable…')}</option>
      ${dispo.filter(i => !etat.pousse.includes(i)).map(i => `<option value="${i}">${esc(m.noms[i])}</option>`).join('')}</select></div>
      <div class="sx-curseurs"></div>
      <button type="button" class="bouton sx-raz">${esc(T('sx_remise'))}</button>`;
    scen.querySelectorAll('.sx-puce button').forEach(b => b.onclick = () => { etat.pousse = etat.pousse.filter(x => x !== b.dataset.x); dessinerScenario(); calculer(); });
    scen.querySelector('.sx-ajout').onchange = e => { if (e.target.value) { etat.pousse = [...etat.pousse, e.target.value]; dessinerScenario(); calculer(); } };
    scen.querySelector('.sx-raz').onclick = () => { etat.pousse = []; etat.d = {}; dessinerScenario(); calculer(); };
    const cur = scen.querySelector('.sx-curseurs');
    cur.style.gridTemplateColumns = `repeat(${Math.min(etat.pousse.length, 3) || 1}, minmax(0,1fr))`;
    for (const id of etat.pousse) {
      const v = etat.d[id] ?? 1.0;
      const w = apri.h(`<label class="sx-curseur"><span class="libelle">${esc(m.noms[id])}</span>
        <output>${f(v, 1, true)}</output><input type="range" min="-3" max="3" step="0.5" value="${v}"></label>`);
      const inp = w.querySelector('input'), out = w.querySelector('output');
      const placer = () => { const p = (Number(inp.value) + 3) / 6; out.style.left = `calc(${p * 100}% + ${8 - 16 * p}px)`; inp.style.setProperty('--p', p * 100 + '%'); };
      inp.oninput = () => { etat.d[id] = Number(inp.value); out.textContent = f(Number(inp.value), 1, true); placer(); calculer(); };
      placer();
      cur.append(w);
    }
  }
  r.append(resultats);

  function calculer() {
    resultats.innerHTML = '';
    const variations = {};
    for (const id of etat.pousse) { const v = etat.d[id] ?? 1.0; if (Math.abs(v) > 1e-9) variations[id] = v; }
    if (!Object.keys(variations).length) { resultats.append(apri.h(`<div class="bcl-info">${esc(T('sx_pousser_0'))}</div>`)); return; }
    const etatD = E.etatCourant(m, s.pop);
    const effets = E.propager(m, variations);
    const arrivee = E.apres(etatD, effets, variations);
    const ind = E.effetIndice(m, effets, variations);
    const resume = Object.entries(variations).map(([k, v]) => `${m.noms[k]} ${f(v, 1, true)}`).join(' · ');
    const couvert = T('sx_couvert', { p: Math.round(100 * ind.part_couverte) });
    const L = m.lang, qi = E.qualifier(ind.delta, L);
    const kpi = apri.h(`<div class="sx-kpi">
      <div class="sx-k"><div class="sx-k-l">${esc(T('sx_indice'))}</div>
        <div class="qual-kpi" style="color:${qi.coul}"><b aria-hidden="true">${qi.fleche}</b> ${esc(qi.texte)}</div>
        <div class="mc-sur" data-id="sur-ind">${esc(apri.t('incertitude en calcul…', 'computing uncertainty…'))}</div>
        <div class="sx-k-s">${esc(couvert)}</div></div>
      <div class="sx-k"><div class="sx-k-l">${esc(T('sx_pousse'))}</div>
        <div class="sx-k-v">${Object.keys(variations).length}</div><div class="sx-k-s">${esc([...resume].slice(0, 80).join(''))}</div></div></div>`);
    resultats.append(kpi);
    resultats.append(apri.h(Q.legende(apri)));

    const bouge = E.trier(Object.entries(effets).filter(([k, v]) => !(k in variations) && Math.abs(v) >= C.SEUIL_NUL), kv => [-Math.abs(kv[1])]);
    const vide = !bouge.length;
    if (vide) resultats.append(apri.h(`<div class="bcl-info">${esc(T('sx_rien_bouge', { s: f(C.SEUIL_NUL, 2) }))}</div>`));
    const ordre = [...Object.entries(variations), ...bouge].map(([k]) => k);
    const lignes = ordre.map(k => {
      const d0 = etatD[k], pousse = variations[k], indv = effets[k] || 0, fin = arrivee[k];
      return `<tr><td>${esc(m.noms[k] ?? k)}</td><td class="n">${f(d0, 1)}</td><td class="n">${pousse ? f(pousse, 1, true) : '—'}</td>
        <td class="qual-ind">${Q.badge(indv, L)}<div class="mc-sur" data-sur="${esc(k)}"></div></td><td class="n v">${f(fin, 1)}</td></tr>`;
    }).join('');
    const env = apri.h(`<div class="sx-defile"><table class="sx-tab"><thead><tr><th>${esc(T('sx_col_var'))}</th>
      <th class="n">${esc(T('sx_dep'))}</th><th class="n">${esc(T('sx_pousse'))}</th><th>${esc(T('sx_indirect'))}</th>
      <th class="n">${esc(T('sx_arrivee'))}</th></tr></thead><tbody>${lignes}</tbody></table></div>`);
    if (!vide) {
      resultats.append(env);
      resultats.append(apri.h(`<p class="sx-note sx-encadre">${esc(T('sx_borne'))}</p>`));
    }

    // the figures, folded, and the CSV export of the model values
    const corpsF = ordre.map(k => `<tr><td>${esc(m.noms[k] ?? k)}</td><td class="n">${f(etatD[k], 2)}</td><td class="n">${variations[k] ? f(variations[k], 1, true) : '—'}</td>
      <td class="n">${f(effets[k] || 0, 3, true)}</td><td class="n" data-ic="${esc(k)}">…</td><td class="n" data-pp="${esc(k)}">…</td><td class="n">${f(arrivee[k], 2)}</td></tr>`).join('');
    const tabF = apri.h(`<div class="sx-defile"><table class="sx-tab"><thead><tr><th>${esc(T('sx_col_var'))}</th>
      <th class="n">${esc(apri.t('Départ (mesuré)', 'Baseline (measured)'))}</th><th class="n">${esc(T('sx_pousse'))}</th>
      <th class="n">${esc(apri.t('Effet indirect, valeur du modèle', 'Indirect effect, model value'))}</th>
      <th class="n">${esc(apri.t('Effet indirect, 90 % des tirages', 'Indirect effect, 90 % of draws'))}</th>
      <th class="n">${esc(apri.t('Tirages où l’effet va dans ce sens', 'Draws where the effect goes this way'))}</th>
      <th class="n">${esc(apri.t('Nouvel équilibre, valeur du modèle', 'New balance, model value'))}</th></tr></thead><tbody>${corpsF}
      <tr><td>${esc(T('sx_indice'))}</td><td></td><td></td><td class="n">${f(ind.delta, 4, true)}</td><td class="n" data-ic="__indice">…</td><td class="n" data-pp="__indice">…</td><td></td></tr></tbody></table></div>`);
    const det = Q.detailChiffre(apri, tabF);
    resultats.append(det);
    barreExport(apri, tabF, tabF.querySelector('table'));
    resultats.append(Q.noteStabilite(apri, m, f));

    // uncertainty: the same push in each of the 1,000 draws
    const prog = Q.progression(apri, m);
    kpi.after(prog);
    const jeton = (calculer.jeton = (calculer.jeton || 0) + 1);
    Q.incertitude(m).then(mc => {
      if (jeton !== calculer.jeton || !resultats.isConnected) return;
      const parVar = Object.fromEntries(ordre.map(k => [k, new Float64Array(mc.n)])), indices = new Float64Array(mc.n);
      for (let d = 0; d < mc.n; d++) {
        const eff = E.propagerTirage(mc, d, variations);
        for (const k of ordre) parVar[k][d] = eff[k] || 0;
        indices[d] = E.effetIndice(m, eff, variations).delta;
      }
      const phrase = (val, x) => {
        const q = E.qualifier(val, L);
        if (q.sens === 'nul') {
          const p = Math.abs(x.lo) < 0.05 && Math.abs(x.hi) < 0.05 ? 1 : (1 - x.pHausse - x.pBaisse);
          const sp = x.pPos >= x.pNeg ? [x.pPos, apri.t('vers le haut', 'upwards')] : [x.pNeg, apri.t('vers le bas', 'downwards')];
          return apri.t(`négligeable dans ${apri.pct(p)} des tirages${p < 0.95 ? ' · ' + Q.plageSignee(x.lo, x.hi, L) : ''} · ${sp[1]} dans ${apri.pct(sp[0])}`, `negligible in ${apri.pct(p)} of draws${p < 0.95 ? ' · ' + Q.plageSignee(x.lo, x.hi, L) : ''} · ${sp[1]} in ${apri.pct(sp[0])}`);
        }
        const p = val > 0 ? x.pPos : x.pNeg;
        const sens = val > 0 ? apri.t('positif', 'positive') : apri.t('négatif', 'negative');
        return apri.t(`effet ${sens} dans ${apri.pct(p)} des tirages · ${Q.plageSignee(x.lo, x.hi, L)}`, `${sens} effect in ${apri.pct(p)} of draws · ${Q.plageSignee(x.lo, x.hi, L)}`);
      };
      const remplir = (cle, val, vals) => {
        const x = E.resumer(vals);
        const p = val > 0 ? x.pPos : val < 0 ? x.pNeg : 1;
        const ic = tabF.querySelector(`[data-ic="${cle}"]`), pp = tabF.querySelector(`[data-pp="${cle}"]`);
        if (ic) ic.textContent = f(x.lo, 3, true) + ' ; ' + f(x.hi, 3, true);
        if (pp) pp.textContent = apri.pct(p);
        return { x, p };
      };
      const ri = remplir('__indice', ind.delta, indices);
      kpi.querySelector('[data-id="sur-ind"]').innerHTML = `${barreSure(ri.p)} ${esc(phrase(ind.delta, ri.x))}`;
      for (const k of ordre) {
        const v = effets[k] || 0, rk = remplir(k, v, parVar[k]);
        const c = resultats.querySelector(`[data-sur="${CSS.escape(k)}"]`);
        if (c) c.innerHTML = `${barreSure(rk.p)} ${esc(phrase(v, rk.x))}`;
      }
    });
    if (!vide) blocVagues(variations, etatD);
  }
  /** a tiny gauge of how sure the direction is */
  const barreSure = p => `<span class="mc-jauge" aria-hidden="true"><i style="width:${(100 * p).toFixed(0)}%"></i></span>`;

  // THE SAME PUSH, RELAY BY RELAY (systeme_complexe._bloc_vagues)
  function blocVagues(variations, etatD) {
    resultats.append(apri.h(`<div><div class="titre-bloc" style="margin-top:26px">${esc(T('sx_t5'))}</div>
      <p class="mc-lead">${esc(apri.t('Ce tableau découpe la même poussée en relais : ce qui bouge tout de suite, puis au tour suivant, puis par les boucles.', 'This table cuts the same push into relays: what moves at once, then at the next round, then through the loops.'))}</p>
      <details class="pli"><summary>${esc(apri.t('En savoir plus', 'Read more'))}</summary><p>${esc(T('sx_x5'))}</p></details></div>`));
    const L = m.lang;
    const { vagues, total, converge, k } = E.vagues(m, variations);
    let lignes = [];
    for (const n of m.ids) {
      const j = m.idx[n];
      const v1 = vagues.length > 0 ? vagues[0][j] : 0, v2 = vagues.length > 1 ? vagues[1][j] : 0;
      const v3 = vagues.slice(2).reduce((acc, v) => acc + v[j], 0);
      const tot = total[n] || 0;
      if (!(n in variations) && Math.abs(tot) < C.SEUIL_NUL) continue;
      lignes.push({ id: n, nom: m.noms[n] ?? n, dep: etatD[n], pousse: variations[n], v1, v2, v3, tot });
    }
    lignes = E.trier(lignes, x => [!(x.id in variations), -Math.abs(x.tot)]);
    const vus = lignes.slice(0, 24);
    const pq = x => (x.id in variations ? '' : E.parQui(m, x.id, variations, total).map(d => m.noms[d] ?? d).join(', '));
    const corps = vus.map(x => `<tr><td>${esc(x.nom)}</td><td class="n">${f(x.dep, 1)}</td><td class="n">${x.pousse ? f(x.pousse, 1, true) : '—'}</td>
        <td>${Q.badge(x.v1, L, { court: true })}</td><td>${Q.badge(x.v2, L, { court: true })}</td><td>${Q.badge(x.v3, L, { court: true })}</td>
        <td>${Q.badge(x.tot, L)}</td><td style="color:${COUL.GRIS};font-size:11.5px">${esc(pq(x))}</td></tr>`).join('');
    const env = apri.h(`<div class="sx-defile"><table class="sx-tab qual-vagues"><thead><tr><th>${esc(T('sx_col_var'))}</th>
      <th class="n">${esc(T('sx_v_dep'))}</th><th class="n">${esc(T('sx_v_pousse'))}</th><th>${esc(T('sx_v1'))}</th>
      <th>${esc(T('sx_v2'))}</th><th>${esc(T('sx_v3'))}</th><th>${esc(T('sx_v_tot'))}</th>
      <th>${esc(T('sx_v_par'))}</th></tr></thead><tbody>${corps}</tbody></table></div>`);
    resultats.append(env);
    const corpsF = vus.map(x => `<tr><td>${esc(x.nom)}</td><td class="n">${f(x.dep, 2)}</td><td class="n">${x.pousse ? f(x.pousse, 1, true) : '—'}</td>
        <td class="n">${f(x.v1, 3, true)}</td><td class="n">${f(x.v2, 3, true)}</td><td class="n">${f(x.v3, 3, true)}</td>
        <td class="n">${f(x.tot, 3, true)}</td><td>${esc(T('sx_' + E.direction(x.tot, C)))}</td><td>${esc(pq(x))}</td></tr>`).join('');
    const tabF = apri.h(`<div class="sx-defile"><table class="sx-tab"><thead><tr><th>${esc(T('sx_col_var'))}</th>
      <th class="n">${esc(apri.t('Départ (mesuré)', 'Start (measured)'))}</th><th class="n">${esc(T('sx_v_pousse'))}</th>
      <th class="n">${esc(T('sx_v1'))} ${esc(apri.t('(modèle)', '(model)'))}</th><th class="n">${esc(T('sx_v2'))} ${esc(apri.t('(modèle)', '(model)'))}</th>
      <th class="n">${esc(T('sx_v3'))} ${esc(apri.t('(modèle)', '(model)'))}</th><th class="n">${esc(T('sx_v_tot'))} ${esc(apri.t('(modèle)', '(model)'))}</th>
      <th>${esc(T('sx_v_sens'))}</th><th>${esc(T('sx_v_par'))}</th></tr></thead><tbody>${corpsF}</tbody></table></div>`);
    resultats.append(Q.detailChiffre(apri, tabF));
    barreExport(apri, tabF, tabF.querySelector('table'));
    const fin = converge ? T('sx_conv_fait', { k, s: f(C.SEUIL_VAGUE, 2) }) : T('sx_conv_non', { k: C.VAGUES_MAX });
    resultats.append(apri.h(`<details class="pli"><summary>${esc(apri.t('Quand le calcul s’arrête', 'When the calculation stops'))}</summary>
      <p>${esc(fin)}</p><p>${esc(T('sx_conv', { s: f(C.SEUIL_VAGUE, 2), k: C.VAGUES_MAX }))}</p></details>`));
    resultats.append(Q.noteSeuils(apri));
  }

  dessinerScenario();
  calculer();
}
