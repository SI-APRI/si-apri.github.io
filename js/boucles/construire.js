// Tab 1 · Build a causal system (systeme_complexe.render_construire)
import { charger, etat, choix, esc, barreExport, E } from './commun.js';
import { dessinerSchema } from './schema.js';

export default async function render(el, apri) {
  const { m, s, T } = await charger(apri);
  el.innerHTML = '';
  const racine = document.createElement('div'); racine.className = 'bcl';
  el.append(racine);
  const redessiner = () => render(el, apri);

  const ligne = document.createElement('div'); ligne.className = 'bcl-ligne';
  ligne.append(
    choix(T('sx_centre'), s.ids.map(i => [i, m.noms[i]]), s.centre, v => { etat.centre = v; etat.iso = null; redessiner(); }, 'large'),
    choix(T('sx_prof'), m.C.TAILLES.map(n => [n, String(n)]), s.n, v => { etat.n = Number(v); etat.iso = null; redessiner(); }, 'etroit'));
  racine.append(ligne);

  const v = E.etatCourant(m, s.pop)[s.centre];
  const { rang, aretes } = E.voisinage(m, s.centre, s.n);
  const bcls = E.bouclesDe(m, s.centre, new Set(rang.keys()));

  if (v == null) racine.append(apri.h(`<div class="bcl-info">${esc(T('sx_non_mesure_x'))}</div>`));

  let isoler = null;
  if (bcls.length) {
    const lib = b => {
      const tete = b.type === 'renforcante' ? T('sx_r') : T('sx_b');
      const chemin = b.noeuds.slice(0, 4).map(x => m.noms[x] ?? x).join(' → ');
      return `${tete} · ${b.n} · ${chemin}` + (b.n > 4 ? ' …' : '');
    };
    if (etat.iso != null && !(etat.iso < bcls.length)) etat.iso = null;
    racine.append(choix(T('sx_boucles_c'), [['', '—'], ...bcls.map((b, i) => [String(i), lib(b)])],
      etat.iso == null ? '' : String(etat.iso), val => { etat.iso = val === '' ? null : Number(val); redessiner(); }));
    isoler = etat.iso != null ? bcls[etat.iso] : null;
  }
  if (rang.size > m.C.NOEUDS_LISIBLES) racine.append(apri.h(`<div class="bcl-alerte">${esc(T('sx_trop', { n: rang.size }))}</div>`));

  const { pos } = E.positions(rang, s.centre);
  const { racine: sc, svg } = dessinerSchema(racine, { m, rang, aretes, centre: s.centre, posInit: pos, boucle: isoler, T });
  barreExport(apri, sc, svg);
}
