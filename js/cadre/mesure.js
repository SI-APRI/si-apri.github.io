/* Cadre de résilience · Modèle et sources (cadre_page.render, default view:
   modele_parcours.render, the three-step animated presentation). */
import {css, donnees, cadreHtml} from './commun.js';
export default async function render(el, apri){
 css();
 const d = await donnees(apri);
 el.innerHTML = '';
 const html = (d.langs[apri.lang] || d.langs.fr).mesure;
 el.append(cadreHtml(html, 420, apri.t('Modèle de résilience','Resilience model')));
}
