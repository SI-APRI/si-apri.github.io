/* Teaching examples, not new official APRI indicators or measured survey values.
   The seven destination ids follow data/cadre/cadre.json. */
export const CARTES_DIMENSIONS = [
 ['abris','dim1','Part des habitants pouvant rejoindre un abri anticyclonique opérationnel','Share of residents who can reach an operational hurricane shelter','Protection physique','Physical protection','Un abri accessible et opérationnel offre une protection pendant le choc. On mesure ici une capacité de protection, pas le nombre de cyclones.','An accessible, operational shelter provides protection during a shock. This measures protective capacity, not hurricane frequency.'],
 ['alerte','dim2','Part des localités disposant d’un dispositif d’alerte testé et d’un plan d’évacuation actualisé','Share of localities with a tested warning system and an up-to-date evacuation plan','Préparation et coordination','Preparedness and coordination','Le dispositif permet aux institutions d’anticiper le choc et d’organiser la réponse. Un plan simplement rédigé, mais jamais testé, ne garantit pas cette capacité.','This system enables institutions to anticipate a shock and coordinate the response. An untested plan alone does not guarantee this capacity.'],
 ['ecologie','dim3','Diversité des réponses à la sécheresse parmi les espèces assurant une même fonction écologique','Diversity of drought responses among species providing the same ecological function','Diversité de réponse','Response diversity','Si certaines espèces déclinent, d’autres peuvent maintenir la fonction écologique. Cette diversité de réponse renseigne une capacité de maintien des fonctions face à la sécheresse.','If some species decline, others may sustain the ecological function. Response diversity indicates a capacity to maintain functions during drought.'],
 ['reserve','dim4','Nombre de semaines de dépenses essentielles couvertes par une épargne immédiatement mobilisable','Number of weeks of essential expenses covered by immediately available savings','Réserve économique','Economic buffer','Cette réserve peut absorber une interruption de revenu. Elle renseigne une capacité économique de faire face au choc, sans suffire à résumer toute la résilience du ménage.','This reserve can buffer an income interruption. It indicates an economic coping capacity without capturing all aspects of household resilience.'],
 ['entraide','dim5','Part des ménages pouvant effectivement mobiliser une aide de proches en cas de crise','Share of households able to obtain help from relatives or friends during a crisis','Entraide mobilisable','Available mutual support','On mesure l’accès effectif à un réseau de soutien en cas de difficulté. C’est une ressource sociale mobilisable, au-delà du simple nombre de personnes connues.','This measures effective access to support during a crisis: an available social resource, beyond simply knowing many people.'],
 ['competences','dim6','Part des adultes capables de réaliser les gestes de premiers secours lors d’un exercice pratique','Share of adults able to perform first aid in a practical exercise','Compétences utiles face au choc','Skills for responding to shocks','L’exercice vérifie une compétence réellement mobilisable pour protéger des vies. Le classement porte sur la capacité des personnes, et non sur l’équipement d’un centre de santé.','The exercise checks a usable skill for protecting lives. The focus is people’s capabilities, rather than the equipment of a health facility.'],
 ['savoirs','dim7','Part des ménages maîtrisant et transmettant des savoirs locaux d’adaptation aux sécheresses','Share of households mastering and passing on local knowledge for adapting to drought','Transmission de savoirs adaptatifs','Transfer of adaptive knowledge','La maîtrise et la transmission de savoirs utilisables face à la sécheresse renseignent une ressource culturelle d’adaptation. L’ancienneté d’une tradition ne suffit pas à prouver son efficacité.','Mastering and transferring usable drought-related knowledge indicates a cultural resource for adaptation. The age of a tradition alone does not demonstrate its effectiveness.'],
 ['exposition','hors','Part des habitations situées dans une zone inondable','Share of homes located in a flood-prone area','Exposition','Exposure','Cet indicateur décrit la présence d’habitations dans une zone exposée. Il ne dit pas si les habitants peuvent anticiper l’inondation, y faire face ou s’adapter.','This describes homes located in an exposed area. It does not tell us whether residents can anticipate a flood, cope with it or adapt.'],
 ['alea','hors','Nombre de cyclones ayant traversé le territoire en dix ans','Number of hurricanes crossing the area in ten years','Aléa','Hazard','C’est une mesure de la fréquence passée de l’aléa. À aléa égal, deux territoires peuvent avoir des capacités de réponse très différentes.','This measures past hazard frequency. Two areas facing the same hazard may have very different response capacities.'],
 ['vulnerabilite','hors','Part des bâtiments susceptibles de s’effondrer pour une même intensité de séisme','Share of buildings likely to collapse at the same earthquake intensity','Vulnérabilité physique','Physical vulnerability','La mesure décrit une susceptibilité aux dommages. Elle peut éclairer le diagnostic de résilience, mais ne mesure pas à elle seule les capacités d’anticipation, de réponse et d’adaptation.','This describes susceptibility to damage. It can inform a resilience assessment, but does not by itself measure capacities to anticipate, respond and adapt.'],
 ['revenu','hors','Revenu moyen des ménages au moment de l’enquête','Average household income at the time of the survey','Situation économique','Economic status','Le revenu décrit une situation et peut contribuer aux capacités d’action. Cette moyenne seule ne renseigne ni les réserves disponibles, ni la diversification, ni la capacité à faire face à une perte de revenu.','Income describes a situation and may contribute to the ability to act. This average alone says nothing about buffers, diversification or the capacity to cope with income loss.'],
 ['pertes','hors','Valeur des récoltes détruites par le dernier cyclone','Value of crops destroyed by the last hurricane','Impact observé','Observed impact','La perte dépend de l’intensité de l’aléa, de l’exposition et de la vulnérabilité, entre autres facteurs. Sans ces informations, elle ne permet pas d’isoler une capacité de résilience.','Losses depend on hazard intensity, exposure and vulnerability, among other factors. Without that context, they do not isolate a resilience capacity.'],
 ['population','hors','Nombre total d’habitants de la commune','Total population of the municipality','Description du territoire','Territorial description','La taille de la population est une information de contexte. Elle ne mesure pas, à elle seule, la capacité collective à faire face aux perturbations.','Population size is contextual information. On its own, it does not measure collective capacity to cope with disruption.'],
 ['pluie','hors','Cumul des précipitations pendant la dernière saison agricole','Total rainfall during the last growing season','Condition climatique','Climate condition','Cette mesure décrit les conditions climatiques. Il faudrait observer comment les cultures, les pratiques et les ressources permettent de faire face à ces conditions pour renseigner une capacité de résilience.','This describes climate conditions. Assessing resilience capacity requires examining how crops, practices and resources enable people to cope with those conditions.']
].map(([id,dim,fr,en,attribut_fr,attribut_en,pourquoi_fr,pourquoi_en])=>({id,dim,fr,en,attribut_fr,attribut_en,pourquoi_fr,pourquoi_en}));

export function nouvelleMancheDimensions(){
 const cartes=CARTES_DIMENSIONS.slice();
 for(let i=cartes.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cartes[i],cartes[j]]=[cartes[j],cartes[i]];}
 return {cartes,places:{},essais:{},selection:null,retour:null,termine:false};
}

export const STYLE_TRI = `
.tri-jeu{--vert:#2f7057;color:#20382d;font:inherit}.tri-jeu *{box-sizing:border-box}
.tri-entete{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:20px 0 14px}.tri-entete p{margin:0}.tri-compteur{font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums}
.tri-banque{display:flex;flex-wrap:wrap;gap:9px;padding:20px;background:#f3f6f2;border:1px solid #dce5db;border-radius:16px;min-height:88px}
.tri-carte{appearance:none;font:inherit;font-size:13px;line-height:1.5;text-align:left;color:#263e32;background:white;border:1px solid #cbd8ce;border-radius:9px;padding:11px 14px;max-width:calc(50% - 5px);flex:1 1 260px;cursor:grab;box-shadow:0 2px 3px #16322006;touch-action:manipulation}
.tri-carte[aria-pressed="true"]{border-color:#2f7057;background:#e5efe8;box-shadow:0 0 0 2px #2f7057}.tri-jeu button:focus-visible{outline:3px solid #225d94;outline-offset:4px}.tri-carte:active{cursor:grabbing}
.tri-zones{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.tri-zone{border:1px solid #dbe4dc;border-top:3px solid var(--c);border-radius:12px;padding:12px;background:white;min-width:0;transition:background .15s}
.tri-zone.survol{background:#e6f0e8;outline:2px solid #2f7057}.tri-zone.hors{background:#f8f4ee;border-color:#dfd4c4}.tri-zone h4{margin:0;font-size:13px;line-height:1.5}.tri-cible{font:inherit;color:inherit;text-align:left;background:none;border:0;padding:0;cursor:pointer;width:100%;min-height:70px}.tri-cible small{display:block;font-size:11px;font-weight:400;color:#69766d;margin-top:9px}.tri-cible:disabled{cursor:default}
.tri-place{border-top:1px solid #dfe7de;padding-top:10px;margin-top:10px;font-size:12px;line-height:1.55}.tri-place small{display:block;color:#69766d;margin-top:5px}
.tri-retour{padding:17px 20px;border-radius:12px;background:#f4f7f3;border-left:3px solid #668b6e;margin:16px 0;line-height:1.6;font-size:14px}.tri-retour.erreur{background:#fcf5eb;border-color:#b87a32}.tri-retour p{margin:6px 0 0}.tri-retour:focus{outline:none}.tri-note{color:#65746a;font-size:12px;line-height:1.65}.tri-action{background:#2f7057;color:white;border:0;border-radius:9px;padding:12px 18px;font:inherit;cursor:pointer}.tri-vide{color:#45624e;font-size:14px}
@media(max-width:950px){.tri-zones{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:540px){.tri-carte{max-width:100%;flex-basis:100%}.tri-banque{padding:12px}.tri-entete{align-items:flex-start;flex-direction:column;gap:6px}.tri-zones{gap:8px}.tri-zone{padding:9px}.tri-cible{min-height:92px}.tri-compteur{white-space:normal}}
`;

export function afficherTriDimensions(el,apri,N,nomDim,{onPoint=()=>{},onTerminer=()=>{}}={}){
 const t=(fr,en)=>apri.t(fr,en),e=apri.esc;
 const ids=['dim1','dim2','dim3','dim4','dim5','dim6','dim7','hors'];
 const couleurs=['#4f7ea8','#7a5ea8','#2f7a5b','#c98a1b','#c0603f','#3f9a9a','#9a5a7a','#aa8c64'];
 const nom=k=>k==='hors'?t('Ne mesure pas directement la résilience','Does not directly measure resilience'):nomDim(k);
 let glissee=null;
 function placer(id,cible){
  const x=N.cartes.find(c=>c.id===id);
  if(!x||N.places[id]||!ids.includes(cible))return;
  N.essais[id]=(N.essais[id]||0)+1;
  const ok=x.dim===cible;
  N.retour={id,ok,cible};
  if(ok){N.places[id]=cible;N.selection=null;if(N.essais[id]===1)onPoint();}
  else N.selection=id;
  dessiner();
  el.querySelector('.tri-retour')?.focus();
 }
 function dessiner(){
  const fait=Object.keys(N.places).length,restantes=N.cartes.filter(c=>!N.places[c.id]);
  el.innerHTML=`<style>${STYLE_TRI}</style><div class="tri-jeu">
   <div class="tri-entete"><p><b>${e(t('Que mesure cet indicateur ?','What does this indicator measure?'))}</b></p><span class="tri-compteur">${fait} / ${N.cartes.length} ${e(t('cartes classées','cards sorted'))}</span></div>
   <p class="tri-note">${e(t('Glissez une carte vers une catégorie. Sur mobile ou au clavier, sélectionnez la carte, puis activez la catégorie. Échap annule la sélection.','Drag a card to a category. On mobile or with a keyboard, select the card, then activate a category. Escape clears the selection.'))}</p>
   <div class="tri-banque" role="group" aria-label="${e(t('Cartes à classer','Cards to sort'))}">${restantes.map(x=>`<button type="button" draggable="true" class="tri-carte" data-carte="${x.id}" aria-pressed="${N.selection===x.id}">${e(t(x.fr,x.en))}</button>`).join('')||`<p class="tri-vide">${e(t('Toutes les cartes sont classées.','All cards have been sorted.'))}</p>`}</div>
   <div class="tri-annonce" role="status" aria-live="polite"></div>
   <div class="tri-zones">${ids.map((id,i)=>`<section class="tri-zone ${id==='hors'?'hors':''}" style="--c:${couleurs[i]}" data-zone="${id}"><h4><button type="button" class="tri-cible" data-cible="${id}" ${restantes.length?'':'disabled'}>${e(nom(id))}<small>${e(t('Déposer ici','Drop here'))}</small></button></h4>${N.cartes.filter(x=>N.places[x.id]===id).map(x=>`<div class="tri-place">${e(t(x.fr,x.en))}<small>${e(t(x.attribut_fr,x.attribut_en))}</small></div>`).join('')}</section>`).join('')}</div>
   <div class="tri-commentaire"></div>
   <p class="tri-note">${e(t('Exemples pédagogiques : ces cartes ne sont pas des résultats d’enquête ni une révision des indicateurs officiels APRI. Le classement porte sur ce que chaque formulation mesure directement. Une mesure de vulnérabilité ou d’exposition peut être utile au diagnostic sans mesurer à elle seule une capacité de résilience.','Teaching examples: these cards are neither survey results nor a revision of official APRI indicators. Sort according to what each wording directly measures. Vulnerability and exposure measures can inform an assessment without independently measuring resilience capacity.'))}</p>
   ${fait===N.cartes.length?`<button type="button" class="tri-action">${e(t('Voir mon bilan','See my results'))}</button>`:''}
  </div>`;
  const retour=el.querySelector('.tri-commentaire');
  if(N.retour){const r=N.retour,x=N.cartes.find(c=>c.id===r.id);
   retour.innerHTML=`<div class="tri-retour ${r.ok?'':'erreur'}" role="status" tabindex="-1"><strong>${e(r.ok?t('Bien vu.','Well spotted.'):t('Pas tout à fait.','Not quite.'))} ${e(nom(x.dim))}</strong><p><b>${e(t(x.attribut_fr,x.attribut_en))}.</b> ${e(t(x.pourquoi_fr,x.pourquoi_en))}</p>${!r.ok?`<p>${e(t('La carte reste sélectionnée : placez-la dans la catégorie indiquée pour continuer.','The card remains selected: place it in the indicated category to continue.'))}</p>`:''}</div>`;
  }
  function selectionner(id){
   N.selection=N.selection===id?null:id;
   el.querySelectorAll('[data-carte]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.carte===N.selection)));
   el.querySelector('.tri-annonce').textContent=N.selection?t('Carte sélectionnée. Choisissez maintenant sa catégorie.','Card selected. Now choose its category.'):t('Sélection annulée.','Selection cleared.');
  }
  el.querySelectorAll('[data-carte]').forEach(b=>{
   b.onclick=()=>selectionner(b.dataset.carte);
   b.ondragstart=ev=>{glissee=b.dataset.carte;ev.dataTransfer.setData('text/plain',glissee);ev.dataTransfer.effectAllowed='move';};
   b.ondragend=()=>{glissee=null;el.querySelectorAll('.survol').forEach(z=>z.classList.remove('survol'));};
  });
  el.querySelectorAll('[data-zone]').forEach(z=>{
   z.ondragover=ev=>{if(!glissee)return;ev.preventDefault();ev.dataTransfer.dropEffect='move';z.classList.add('survol');};
   z.ondragleave=ev=>{if(!z.contains(ev.relatedTarget))z.classList.remove('survol');};
   z.ondrop=ev=>{ev.preventDefault();const id=glissee;glissee=null;if(id)placer(id,z.dataset.zone);};
   z.querySelector('button').onclick=()=>{
    if(N.selection)placer(N.selection,z.dataset.zone);
    else {el.querySelector('.tri-annonce').textContent=t('Sélectionnez d’abord une carte.','Select a card first.');el.querySelector('[data-carte]')?.focus();}
   };
  });
  el.querySelector('.tri-action')?.addEventListener('click',()=>{N.termine=true;onTerminer();});
 }
 el.onkeydown=ev=>{if(ev.key==='Escape'){N.selection=null;el.querySelectorAll('[data-carte]').forEach(b=>b.setAttribute('aria-pressed','false'));el.querySelector('.tri-annonce').textContent=t('Sélection annulée.','Selection cleared.');}};
 dessiner();
}
