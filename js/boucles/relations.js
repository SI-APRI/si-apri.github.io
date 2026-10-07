// Tab 4 · Explore relationships (systeme_complexe.render_relations)
import { charger, etat, choix, esc, barreExport, E } from './commun.js';
import * as Q from './incertitude.js';

export default async function render(el, apri) {
  const { m, s, T, f } = await charger(apri);
  el.innerHTML = '';
  const r = document.createElement('div'); r.className = 'bcl';
  el.append(r);
  const t = T.prov;
  r.innerHTML = `<div class="titre-bloc">${esc(T('sx_t2'))}</div>
    <p class="sx-note sx-encadre">${esc(t.intro)}</p>`;

  // ONE VARIABLE AND ALL ITS RELATIONS; the menu opens on the central variable
  const ids = E.trier(m.ids, i => [m.noms[i] ?? i]);
  if (!ids.includes(etat.varRel)) etat.varRel = s.centre;
  const x = etat.varRel;
  r.append(choix(T('sx_rel_var'), ids.map(i => [i, m.noms[i] ?? i]), x, v => { etat.varRel = v; render(el, apri); }));
  const aretes = [...m.aretes.values()].filter(a => a.de === x || a.vers === x);
  const nSort = aretes.filter(a => a.de === x).length;
  r.append(apri.h(`<p class="sx-note sx-encadre">${esc(T('sx_rel_n', { n: aretes.length, s: nSort, e: aretes.length - nSort }))}</p>`));
  if (!aretes.length) { r.append(apri.h(`<div class="bcl-info">${esc(T('sx_rel_0'))}</div>`)); return; }

  const lang = m.lang;
  const intervalle = v => { const c = E.classeDe(v); return `${lang === 'en' ? c.en : c.fr} (${f(c.lo, 3)} – ${f(c.hi, 3)})`; };
  const parForce = l => E.trier(l, a => [-(a.force || 0)]);
  const lots = [['sx_rel_sortantes', parForce(aretes.filter(a => a.de === x))],
                ['sx_rel_entrantes', parForce(aretes.filter(a => a.de !== x))]];
  for (const [cle, lot] of lots) {
    if (!lot.length) continue;
    r.append(apri.h(`<div class="sx-leg-h sx-inter">${esc(T(cle).toUpperCase())}</div>`));
    const lignes = lot.map(a => {
      const d = E.decrire(a, lang, E.correlation(m, a.de, a.vers), t);
      const co = d.association;
      const association = co ? `ρ = ${co.rho.toFixed(2)} · n = ${co.n}` : d.association_label;
      const titre = (m.noms[a.de] ?? a.de) + ' → ' + (m.noms[a.vers] ?? a.vers);
      const citation = d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.citation)}</a>` : esc(d.citation);
      return `<tr><td>${esc(titre)}<br><small>${esc(d.origin)}</small></td>
        <td>${esc(association)}</td><td>${Q.points(d.strength, lang)}<br><small>${esc(t.strength)}</small></td>
        <td><details><summary>${esc(t.source)}</summary>${citation}
        <p>${esc(d.geography || '')}</p><p>${esc(t.detail)}: ${esc(d.finding || '')}</p>
        <p>${esc(t.limits)}: ${esc(d.limits || t.chosen)}</p><p>${esc(t.chosen)}</p>
        <p class="qual-avert">${esc(apri.t('Valeur du modèle', 'Model value'))} : ${f(d.strength, 2)} · ${esc(apri.t('classe', 'class'))} ${esc(intervalle(d.strength))}</p></details></td></tr>`;
    }).join('');
    const enveloppe = apri.h(`<div class="sx-defile"><table class="sx-tab sx-rel"><thead><tr>
      <th>${esc(T('sx_c_rel'))}</th><th>${esc(t.calculated)}</th><th>${esc(t.strength)}</th><th>${esc(t.source)}</th>
      </tr></thead><tbody>${lignes}</tbody></table></div>`);
    r.append(enveloppe);
    barreExport(apri, enveloppe, enveloppe.querySelector('table'));
  }
  r.append(apri.h(`<div class="qual-leg">${E.CLASSES.map(c => Q.points(c.c, lang)).join('')}<span>${esc(apri.t('la force d’un lien est une classe choisie par des experts, de très faible à très forte', 'a link’s strength is a class chosen by experts, from very weak to very strong'))}</span></div>`));
  r.append(apri.h(`<p class="sx-caption">${esc(t.caution)}</p>`));
}
