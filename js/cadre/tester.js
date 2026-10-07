/* Cadre de résilience · Tester le concept (cadre_page._v_tester).
   One "Outil" selector, two tools:
     - "Reboiser : agir sur les causes structurelles" (default): the reforestation_demo
       feedback simulation, the same self-contained HTML/JS document Streamlit embeds
       with components.html (exported per language in data/cadre/cadre.json, langs.*.reboiser);
     - "Calculer un score": _v_indicateurs, the same view as the "Calcul des scores" tab
       (without its folded walkthrough), sharing its widget state as in Streamlit. */
import {css, donnees, cadreHtml} from './commun.js';
import {vueIndicateurs} from './indicateurs.js';

// st.selectbox key cad_test_tool_forest_first: options ("boucles", "scores")
let outil = 'boucles';

export default async function render(el, apri){
 css();
 const d = await donnees(apri);
 const esc = apri.esc;
 el.innerHTML = '';
 const lib = v => v==='scores'
  ? apri.t('Calculer un score','Calculate a score')
  : apri.t('Reboiser : agir sur les causes structurelles','Reforestation: act on structural causes');
 const ctl = apri.h(`<div class="cad-outil"><label class="libelle" for="cad-outil">${esc(apri.t('Outil','Tool'))}</label>
  <select class="champ" id="cad-outil">${['boucles','scores'].map(v=>`<option value="${v}">${esc(lib(v))}</option>`).join('')}</select></div>`);
 el.append(ctl);
 const zone = document.createElement('div'); el.append(zone);
 const sel = ctl.querySelector('select');
 sel.value = outil;
 const dessiner = ()=>{
  zone.innerHTML = '';
  if(outil==='scores'){ vueIndicateurs(zone, apri, d); return; }
  const html = (d.langs[apri.lang] || d.langs.fr).reboiser;
  const f = cadreHtml(html, 650, apri.t('Reboiser : agir sur tout le système','Reforestation: act on the whole system'));
  f.classList.add('cad-reboiser');
  zone.append(f);
 };
 sel.onchange = ()=>{ outil = sel.value; dessiner(); };
 dessiner();
}
