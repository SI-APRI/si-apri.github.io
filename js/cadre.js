export const onglets = [
 {id:'modele',fr:'Le modèle',en:'The model'},
 {id:'donnees',fr:'Sources de données',en:'Data sources'},
 {id:'normalisation',fr:'Mesure et score',en:'Measure and score'},
 {id:'ponderation',fr:'Indicateurs',en:'Indicators'},
 {id:'indicateurs',fr:'Calcul des scores',en:'Score calculation'},
 {id:'boucles',fr:'Boucles de rétroaction',en:'Feedback loops'},
 {id:'tester',fr:'Tester le concept',en:'Test the concept'},
 {id:'document',fr:'Document complet',en:'Full document'}
];
const guide={modele:'modele',donnees:'donnees',normalisation:'normalisation',ponderation:'indicateurs'};
export default async function render(el,apri,actif){
 actif=actif==='jeu'?'modele':actif;
 if(!onglets.some(o=>o.id===actif))actif='modele';
 el.innerHTML='';
 const bar=apri.barreOnglets(onglets,actif,id=>apri.aller('cadre',id));
 bar.classList.add('cadre-primary-tabs');el.append(bar);
 const style=document.createElement('style');style.textContent='#cadre #contenu-cadre .cadre-primary-tabs{display:flex!important;flex-wrap:wrap!important;gap:6px!important;grid-template-columns:none!important;margin-bottom:18px!important}#cadre #contenu-cadre .cadre-primary-tabs [role=tab]{flex:1 1 150px!important;min-width:0!important;white-space:normal!important}';el.append(style);
 const zone=document.createElement('div');zone.className='zone-onglet';zone.dataset.onglet=actif;el.append(zone);
 zone.textContent=apri.t('Chargement…','Loading…');
 try{
  if(guide[actif]){
   const m=await import('./cadre/jeu.js?v=690dd0a');if(!zone.isConnected)return;zone.textContent='';await m.default(zone,apri);
   const inner=zone.querySelector('.guide-tabs');const button=inner?.querySelector('[data-cible="guide-'+guide[actif]+'"]');button?.click();inner?.remove();
   zone.querySelectorAll('.guide-section').forEach(p=>{p.removeAttribute('role');p.setAttribute('aria-labelledby',p.id+'-title');});
  }else{
   const m=await import('./cadre/'+actif+'.js');if(!zone.isConnected)return;zone.textContent='';await m.default(zone,apri);
  }
 }catch(error){console.error('cadre',actif,error);zone.textContent=apri.t('Impossible de charger cet onglet. Réessayez.','Unable to load this tab. Please try again.');}
}
