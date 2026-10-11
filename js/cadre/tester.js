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
  const t=apri.t;
  const guide=apri.h('<section class="cad-boucle-guide"><h3>'+esc(t('Lire la boucle pas à pas','Read the feedback loop step by step'))+'</h3><p class="cad-boucle-intro">'+esc(t('Une boucle relie plusieurs facteurs : le dernier effet revient influencer le point de départ. Dans cette simulation, suivez ce qui empêche la forêt de se régénérer, puis ce qui peut enclencher une dynamique de restauration.','A feedback loop connects several factors: the final effect feeds back into the starting point. In this simulation, follow what prevents forest recovery, then what can trigger restoration.'))+'</p><ol class="cad-boucle-etapes"><li><b>'+esc(t('Observer le point de départ','Observe the starting point'))+'</b><span>'+esc(t('Choisissez « Planter seul », puis avancez d’une vague. La plantation fait pousser de jeunes arbres, mais le bois-énergie et les animaux peuvent annuler ce gain.','Choose “Plant alone”, then advance one wave. Planting grows young trees, but fuelwood use and livestock can cancel that gain.'))+'</span></li><li><b>'+esc(t('Agir sur les pressions','Address the pressures'))+'</b><span>'+esc(t('Activez les revenus alternatifs, les solutions au bois-énergie et la gestion des animaux. Ces leviers réduisent les causes qui entretiennent les prélèvements et les dégâts.','Activate alternative income, alternatives to fuelwood and livestock management. These measures reduce the causes that sustain harvesting and damage.'))+'</span></li><li><b>'+esc(t('Avancer par vagues','Advance in waves'))+'</b><span>'+esc(t('Cliquez plusieurs fois sur « Une vague ». Les effets s’accumulent avec retard : les arbres protègent les sols, et un couvert forestier plus stable soutient les moyens d’existence.','Click “One wave” several times. Effects build with a delay: trees protect soils, and a more stable forest cover supports livelihoods.'))+'</span></li><li><b>'+esc(t('Repérer le seuil de restauration','Spot the recovery threshold'))+'</b><span>'+esc(t('Au début, les pressions peuvent dépasser la repousse : la boucle reste négative. Quand la régénération et ses effets dépassent durablement ces pressions, la boucle revenus → moins de prélèvements → arbres → sols → revenus peut s’auto-renforcer.','At first, pressures can exceed regrowth: the loop remains negative. When regeneration and its effects sustainably outweigh those pressures, the income → less harvesting → trees → soils → income loop can reinforce itself.'))+'</span></li></ol><p class="cad-boucle-note">'+esc(t('Le seuil désigne ici un point de bascule dans la dynamique écologique et sociale, pas une note de résilience APRI ni un seuil numérique universel.','Here, the threshold is a tipping point in the ecological and social dynamics, not an APRI resilience score or a universal numeric cut-off.'))+' '+esc(t('Dans le schéma, « + » indique une évolution dans le même sens, « − » une évolution en sens inverse et les pointillés un effet retardé.','In the diagram, “+” means change in the same direction, “−” means change in the opposite direction, and dotted lines indicate a delayed effect.'))+'</p></section>');
  zone.append(guide);
  const html = (d.langs[apri.lang] || d.langs.fr).reboiser;
  const f = cadreHtml(html, 650, apri.t('Reboiser : agir sur tout le système','Reforestation: act on the whole system'));
  f.classList.add('cad-reboiser');
  zone.append(f);
 };
 sel.onchange = ()=>{ outil = sel.value; dessiner(); };
 dessiner();
}
