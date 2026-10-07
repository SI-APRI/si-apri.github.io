/* Cadre de résilience · Boucles de rétroaction (cadre_page._v_boucles:
   modele_parcours.render_feedback, the four-step causal loop walkthrough). */
import {css, donnees, cadreHtml} from './commun.js';
export default async function render(el, apri){
 css();
 const d = await donnees(apri);
 el.innerHTML = '';
 const html = (d.langs[apri.lang] || d.langs.fr).boucles;
 el.append(cadreHtml(html, 380, apri.t('Diagrammes de boucles causales','Causal loop diagrams')));
}
