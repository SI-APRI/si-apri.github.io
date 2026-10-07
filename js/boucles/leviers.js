// Tab 5 · Identify key levers (systeme_complexe.render_leviers)
import { charger, esc, barreExport, rappel, COUL, E } from './commun.js';

export default async function render(el, apri) {
  const { m, s, T, f } = await charger(apri);
  el.innerHTML = '';
  const r = document.createElement('div'); r.className = 'bcl';
  el.append(r);
  r.innerHTML = `<div class="titre-bloc">${esc(T('sx_t3'))}</div>${rappel(m, s, T)}
    <p class="sx-note sx-encadre">${esc(T('sx_x3'))}</p>`;

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

  const corps = lignes.slice(0, 14).map(x => {
    const bas = x.bascule ? ` <span class="sx-badge" style="color:${COUL.AMBRE};border:1px solid ${COUL.AMBRE}55">${esc(T('sx_bascule'))}</span>` : '';
    return `<tr><td>${esc(x.nom)}${bas}</td><td class="n v">${f(x.portee, 2)}</td><td class="n">${x.degre}</td>
      <td class="n">${x.boucles} <span style="color:${COUL.GRIS}">(${x.renforcantes}R / ${x.equilibrantes}B)</span></td></tr>`;
  }).join('');
  const env = apri.h(`<div class="sx-defile"><table class="sx-tab"><thead><tr><th>${esc(T('sx_col_var'))}</th>
    <th class="n">${esc(T('sx_col_porte'))}</th><th class="n">${esc(T('sx_col_deg'))}</th><th class="n">${esc(T('sx_col_bcl'))}</th>
    </tr></thead><tbody>${corps}</tbody></table></div>`);
  r.append(env);
  barreExport(apri, env, env.querySelector('table'));
  r.append(apri.h(`<div><p class="sx-note sx-encadre">${esc(T('sx_col_porte_x'))}</p><p class="sx-note sx-encadre">${esc(T('sx_bascule_x'))}</p></div>`));

  const dom = E.bouclesDominantes(m.boucles, 8).filter(d => rang.has(d.de) && rang.has(d.vers));
  if (dom.length) {
    r.append(apri.h(`<div><div class="titre-bloc" style="margin-top:22px">${esc(T('sx_dom'))}</div>
      <p class="sx-note sx-encadre">${esc(T('sx_dom_x'))}</p></div>`));
    for (const d of dom) {
      const a = m.aretes.get(d.de + '|' + d.vers) || {};
      const pos = (a.signe ?? 1) > 0;
      r.append(apri.h(`<div class="sx-carte sx-dom"><span class="sx-dom-a">${esc(m.noms[d.de] ?? d.de)}
        <b style="color:${pos ? COUL.VERT : COUL.ROUGE}">${pos ? '→' : '⊣'}</b> ${esc(m.noms[d.vers] ?? d.vers)}</span>
        <span class="sx-dom-n">${esc(T('sx_dom_n', { n: d.n, r: d.renf, b: d.equi }))}</span></div>`));
    }
  }
}
