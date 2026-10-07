// Tab 6 · Test interventions (systeme_complexe.render_simuler, with the relay
// decomposition _bloc_vagues that follows it on the same screen)
import { charger, etat, esc, barreExport, rappel, COUL, E } from './commun.js';

export default async function render(el, apri) {
  const { m, s, T, f } = await charger(apri);
  const C = m.C;
  el.innerHTML = '';
  const r = document.createElement('div'); r.className = 'bcl';
  el.append(r);
  r.innerHTML = `<div class="titre-bloc">${esc(T('sx_t4'))}</div>${rappel(m, s, T)}
    <p class="sx-note sx-encadre">${esc(T('sx_x4'))}</p>`;

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
        <output>${v.toFixed(2)}</output><input type="range" min="-3" max="3" step="0.5" value="${v}"></label>`);
      const inp = w.querySelector('input'), out = w.querySelector('output');
      const placer = () => { const p = (Number(inp.value) + 3) / 6; out.style.left = `calc(${p * 100}% + ${8 - 16 * p}px)`; inp.style.setProperty('--p', p * 100 + '%'); };
      inp.oninput = () => { etat.d[id] = Number(inp.value); out.textContent = Number(inp.value).toFixed(2); placer(); calculer(); };
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
    resultats.append(apri.h(`<div class="sx-kpi">
      <div class="sx-k"><div class="sx-k-l">${esc(T('sx_indice'))}</div>
        <div class="sx-k-v" style="color:${ind.delta >= 0 ? COUL.VERT : COUL.ROUGE}">${f(ind.delta, 3, true)}</div>
        <div class="sx-k-s">${esc(couvert)}</div></div>
      <div class="sx-k"><div class="sx-k-l">${esc(T('sx_pousse'))}</div>
        <div class="sx-k-v">${Object.keys(variations).length}</div><div class="sx-k-s">${esc([...resume].slice(0, 80).join(''))}</div></div></div>`));

    const bouge = E.trier(Object.entries(effets).filter(([k, v]) => !(k in variations) && Math.abs(v) >= C.SEUIL_NUL), kv => [-Math.abs(kv[1])]);
    if (!bouge.length) { resultats.append(apri.h(`<div class="bcl-info">${esc(T('sx_rien_bouge', { s: f(C.SEUIL_NUL, 2) }))}</div>`)); return; }
    const lignes = [...Object.entries(variations), ...bouge].map(([k]) => {
      const d0 = etatD[k], pousse = variations[k], indv = effets[k] || 0, fin = arrivee[k];
      const coul = (pousse || 0) + indv >= 0 ? COUL.VERT : COUL.ROUGE;
      return `<tr><td>${esc(m.noms[k] ?? k)}</td><td class="n">${f(d0, 1)}</td><td class="n">${pousse ? f(pousse, 1, true) : '—'}</td>
        <td class="n" style="color:${coul}">${f(indv, 2, true)}</td><td class="n v">${f(fin, 1)}</td></tr>`;
    }).join('');
    const env = apri.h(`<div class="sx-defile"><table class="sx-tab"><thead><tr><th>${esc(T('sx_col_var'))}</th>
      <th class="n">${esc(T('sx_dep'))}</th><th class="n">${esc(T('sx_pousse'))}</th><th class="n">${esc(T('sx_indirect'))}</th>
      <th class="n">${esc(T('sx_arrivee'))}</th></tr></thead><tbody>${lignes}</tbody></table></div>`);
    resultats.append(env);
    barreExport(apri, env, env.querySelector('table'));
    resultats.append(apri.h(`<p class="sx-note sx-encadre">${esc(T('sx_borne'))}</p>`));
    noteEchelle();
    blocVagues(variations, etatD);
  }

  function noteEchelle() {
    const d = m.diag;
    if (d.facteur && Math.abs(d.facteur - 1) > 1e-6)
      resultats.append(apri.h(`<p class="sx-note sx-encadre">${esc(T('sx_echelle', { f: f(d.facteur, 3), r: f(d.rayon, 3) }))}</p>`));
  }

  // THE SAME PUSH, RELAY BY RELAY (systeme_complexe._bloc_vagues)
  function blocVagues(variations, etatD) {
    resultats.append(apri.h(`<div><div class="titre-bloc" style="margin-top:26px">${esc(T('sx_t5'))}</div>
      <p class="sx-note sx-encadre">${esc(T('sx_x5'))}</p></div>`));
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
    const corps = lignes.slice(0, 24).map(x => {
      const sens = E.direction(x.tot, C);
      const coul = { hausse: COUL.VERT, baisse: COUL.ROUGE }[sens] || COUL.GRIS;
      const par = x.id in variations ? '' : E.parQui(m, x.id, variations, total).map(d => m.noms[d] ?? d).join(', ');
      return `<tr><td>${esc(x.nom)}</td><td class="n">${f(x.dep, 1)}</td><td class="n">${x.pousse ? f(x.pousse, 1, true) : '—'}</td>
        <td class="n">${f(x.v1, 2, true)}</td><td class="n">${f(x.v2, 2, true)}</td><td class="n">${f(x.v3, 2, true)}</td>
        <td class="n v" style="color:${coul}">${f(x.tot, 2, true)}</td><td style="color:${coul};font-size:11.5px">${esc(T('sx_' + sens))}</td>
        <td style="color:${COUL.GRIS};font-size:11.5px">${esc(par)}</td></tr>`;
    }).join('');
    const env = apri.h(`<div class="sx-defile"><table class="sx-tab"><thead><tr><th>${esc(T('sx_col_var'))}</th>
      <th class="n">${esc(T('sx_v_dep'))}</th><th class="n">${esc(T('sx_v_pousse'))}</th><th class="n">${esc(T('sx_v1'))}</th>
      <th class="n">${esc(T('sx_v2'))}</th><th class="n">${esc(T('sx_v3'))}</th><th class="n">${esc(T('sx_v_tot'))}</th>
      <th>${esc(T('sx_v_sens'))}</th><th>${esc(T('sx_v_par'))}</th></tr></thead><tbody>${corps}</tbody></table></div>`);
    resultats.append(env);
    barreExport(apri, env, env.querySelector('table'));
    const fin = converge ? T('sx_conv_fait', { k, s: f(C.SEUIL_VAGUE, 2) }) : T('sx_conv_non', { k: C.VAGUES_MAX });
    resultats.append(apri.h(`<div><p class="sx-note sx-encadre">${esc(fin)}</p>
      <p class="sx-note sx-encadre">${esc(T('sx_conv', { s: f(C.SEUIL_VAGUE, 2), k: C.VAGUES_MAX }))}</p></div>`));
    noteEchelle();
  }

  dessinerScenario();
  calculer();
}
