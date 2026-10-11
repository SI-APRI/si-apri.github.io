/* Présentation pédagogique du cadre APRI : un parcours libre, sans jeu ni score de quiz. */
import {css, donnees, teinte, encre, fmt} from './commun.js';

const ATTR = [
 {id:'a1', fr:'Anticiper', en:'Anticipate', c:'#397fa3'},
 {id:'a2', fr:'Absorber', en:'Absorb', c:'#c98a1b'},
 {id:'a3', fr:"S'adapter", en:'Adapt', c:'#2f7a5b'},
];
const SITUATIONS = [
 {a:['a1'], fr:"Le comité local diffuse l'alerte cyclone deux jours avant l'arrivée de la tempête.", en:'The local committee spreads the hurricane warning two days before the storm arrives.'},
 {a:['a1'], fr:"Chaque famille connaît son plan d'évacuation et sait où se trouve l'abri le plus proche.", en:'Every family knows its evacuation plan and where the nearest shelter is.'},
 {a:['a2'], fr:"Après une récolte perdue, la famille vit sur son stock de grains et sur l'argent envoyé par un proche.", en:'After a lost harvest, the family lives on its grain stock and on money sent by a relative.'},
 {a:['a2'], fr:'La maison, solidement construite, reste debout pendant l’ouragan.', en:'The well-built house stays standing during the hurricane.'},
 {a:['a3'], fr:'Après trois sécheresses, la coopérative remplace le maïs par des cultures qui supportent le manque d’eau.', en:'After three droughts, the cooperative replaces maize with crops that tolerate water shortage.'},
 {a:['a1','a3'], fr:'La commune replante la mangrove et interdit de reconstruire dans la zone inondable.', en:'The municipality replants mangroves and bans rebuilding in the flood zone.'},
];
const SOURCES = [
 {id:'menage', k:'cad_so1', ic:'01'},
 {id:'geo', k:'cad_so2', ic:'02'},
 {id:'bio', k:'cad_so3', ic:'03'},
 {id:'inst', k:'cad_so4', ic:'04'},
];
const DIMS = ['dim1','dim2','dim3','dim4','dim5','dim6','dim7'];
const BIO = /richesse sp|shannon|simpson|phylog|abondance relative|diversit[ée] fonctionnelle/i;
function sourceDe(x){
 if(x.source==='satellite' || x.source==='geospatial') return 'geo';
 if(x.source==='OCB') return 'inst';
 if(BIO.test(x.nom_fr||'')) return 'bio';
 if(x.source==='menage_regle' || (x.etat!=='absent' && x.calcule)) return 'menage';
 return null;
}
function nombre(s){return parseFloat(s.replace(/[   ]/g,'').replace(',','.'));}
function intervalles(bandes){const out=[];for(const [sc,txt] of bandes){const t=String(txt).replace(/[()]/g,'').trim(),ns=(t.match(/-?\d[\d   ]*(?:,\d+)?/g)||[]).map(nombre);let lo,hi;if(/[≤<]/.test(t)){lo=-Infinity;hi=ns[0];}else if(/[≥>]/.test(t)){lo=ns[0];hi=Infinity;}else if(ns.length===2){[lo,hi]=ns;}else return null;if(lo==null||hi==null||isNaN(lo)||isNaN(hi))return null;out.push({sc,txt:t,lo,hi});}return out;}
function scorePour(iv,v){return iv.find(b=>v>=b.lo&&v<=b.hi)?.sc??null;}
function preparations(d){
 const I=d.indicateurs||[], parSource={};
 for(const x of I){const s=sourceDe(x);if(s)(parSource[s] ||= []).push(x);}
 return {I, parSource, mesure:I.find(x=>x.valeur!=null&&x.score!=null&&x.ec?.unite==='pct'&&x.valeur>=0&&x.valeur<=100&&x.bandes?.length===11&&intervalles(x.bandes)?.some(b=>x.valeur>=b.lo&&x.valeur<=b.hi&&b.sc===x.score)), pondere:I.find(x=>x.poids!=null&&(x.nom_fr||x.nom))};
}

export default async function render(el, apri){
 css();
 const d=await donnees(apri), P=preparations(d), t=apri.t, e=apri.esc;
 const T=k=>(d.textes[apri.lang]||d.textes.fr)[k]??d.textes.fr[k]??k;
 const nomInd=x=>apri.lang==='en'?(x.nom||x.nom_fr):(x.nom_fr||x.nom);
 const tabs=[
  {id:'modele',fr:'Le modèle',en:'The model'},
  {id:'capacites',fr:'Trois capacités',en:'Three capacities'},
  {id:'dimensions',fr:'Sept dimensions',en:'Seven dimensions'},
  {id:'donnees',fr:'Sources de données',en:'Data sources'},
  {id:'normalisation',fr:'Mesure et score',en:'Measure and score'},
  {id:'indicateurs',fr:'Indicateurs',en:'Indicators'},
 ];
 el.innerHTML='';
 const root=apri.h('<div class="jeu jeu-cadre-guide"></div>');el.append(root);
 const nav=apri.h('<nav class="jeu-chemin guide-tabs" aria-label="'+t('Parcourir le cadre','Explore the framework')+'"></nav>');
 nav.innerHTML=tabs.map((x,i)=>'<button type="button" aria-controls="guide-'+x.id+'" data-cible="guide-'+x.id+'"><span>'+e(t(x.fr,x.en))+'</span></button>').join('');
 root.append(nav);
 const sections=apri.h('<div class="guide-sections"></div>');root.append(sections);
 const section=(id,title,lead)=>{const s=apri.h('<section class="guide-section" id="guide-'+id+'" aria-labelledby="guide-'+id+'-title"><div class="guide-heading"><h3 id="guide-'+id+'-title">'+title+'</h3><p>'+lead+'</p></div></section>');sections.append(s);return s;};

 const sm=section('modele',t('Le modèle','The model'),'');
 sm.querySelector('.guide-heading').remove();
 sm.setAttribute('aria-label',t('Le modèle','The model'));
 const modelTexts=[
 t('APRI est un modèle de résilience de type capital-based, c’est-à-dire fondé sur les capitaux du territoire : leur capacité à anticiper, à absorber les perturbations et à s’adapter durablement.','APRI is a capital-based resilience model: it examines territorial resources and their capacity to anticipate, absorb disturbances and adapt sustainably.'),
 t('Des indicateurs observables servent de proxys pour évaluer les attributs de cette résilience.','Observable indicators serve as proxies to assess the attributes of this resilience.'),
 t('Ces indicateurs sont normalisés sur des échelles de résilience de 0 à 10 pour être comparables entre eux.','These indicators are normalized on resilience scales from 0 to 10 so they can be compared.')
 ];
 const stage=apri.h('<div class="model-stage model-auto"><p class="model-statement"></p></div>');sm.append(stage);
 const modelStyle=document.createElement('style');modelStyle.textContent='#cadre #contenu-cadre .model-auto{display:flex;align-items:center;justify-content:center;min-height:260px;padding:36px 0;max-width:850px}#cadre #contenu-cadre .model-auto .model-statement{font-size:clamp(23px,2.6vw,34px);line-height:1.6;font-weight:400;margin:0;text-wrap:pretty}@media(max-width:700px){#cadre #contenu-cadre .model-auto{min-height:280px;padding:24px 0}}';sm.append(modelStyle);
 let modelIndex=0,modelElapsed=0,modelLast=performance.now();
 const showModel=()=>{stage.querySelector('p').textContent=modelTexts[modelIndex];stage.getAnimations().forEach(a=>a.cancel());if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)stage.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,easing:'ease-out'});};showModel();
 const modelTimer=setInterval(()=>{const now=performance.now(),delta=now-modelLast;modelLast=now;if(!sm.isConnected){clearInterval(modelTimer);return;}if(sm.hidden||document.hidden)return;modelElapsed+=delta;if(modelElapsed>=5000){modelElapsed=0;modelIndex=(modelIndex+1)%modelTexts.length;showModel();}},100);
 
 // Quiet synthesized woodland ambience; starts only after an explicit click.
 const soundButton=document.createElement('button');soundButton.type='button';soundButton.className='model-forest-sound';soundButton.setAttribute('aria-pressed','false');sm.append(soundButton);
 const soundStyle=document.createElement('style');soundStyle.textContent='#cadre #contenu-cadre .model-forest-sound{display:block;margin:0 auto 16px;padding:8px 0;border:0;border-bottom:1px solid #bac4c9;border-radius:0;background:transparent;color:#60717a;font:inherit;font-size:13px;cursor:pointer}';sm.append(soundStyle);
 let forestContext=null,forestBirdTimer=null;
 const soundLabel=()=>{soundButton.textContent=forestContext?t('Couper l’ambiance forêt','Turn forest ambience off'):t('Écouter la forêt','Listen to the forest');soundButton.setAttribute('aria-pressed',String(!!forestContext));};soundLabel();
 const stopForest=()=>{clearTimeout(forestBirdTimer);const old=forestContext;forestContext=null;if(old)old.close().catch(()=>{});soundLabel();};
 soundButton.onclick=async()=>{if(forestContext){stopForest();return;}try{
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');const ctx=new Audio();forestContext=ctx;await ctx.resume();if(forestContext!==ctx)return;
 const master=ctx.createGain();master.gain.setValueAtTime(0,ctx.currentTime);master.gain.linearRampToValueAtTime(.15,ctx.currentTime+2);master.connect(ctx.destination);
 const buffer=ctx.createBuffer(1,ctx.sampleRate*8,ctx.sampleRate),samples=buffer.getChannelData(0);let brown=0;for(let i=0;i<samples.length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;samples[i]=brown*3;}
 const wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=1100;const windGain=ctx.createGain();windGain.gain.value=.45;wind.connect(low);low.connect(windGain);windGain.connect(master);wind.start();
 const sway=ctx.createOscillator(),depth=ctx.createGain();sway.frequency.value=.13;depth.gain.value=.12;sway.connect(depth);depth.connect(windGain.gain);sway.start();
 const birds=()=>{if(forestContext!==ctx)return;const base=1800+Math.random()*1200;for(let j=0;j<2+Math.floor(Math.random()*3);j++){const start=ctx.currentTime+j*.19,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(base,start);osc.frequency.exponentialRampToValueAtTime(base*1.45,start+.075);osc.frequency.exponentialRampToValueAtTime(base*.9,start+.16);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.10,start+.025);gain.gain.exponentialRampToValueAtTime(.001,start+.17);osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+.18);osc.onended=()=>{osc.disconnect();gain.disconnect();};}forestBirdTimer=setTimeout(birds,2800+Math.random()*4200);};forestBirdTimer=setTimeout(birds,1000);soundLabel();
 }catch(error){stopForest();soundButton.textContent=t('Son indisponible — réessayer','Sound unavailable — retry');}};
 const forestCleanup=setInterval(()=>{if(!sm.isConnected){stopForest();clearInterval(forestCleanup);return;}if(sm.hidden||document.hidden)stopForest();},250);
 
 const sc=section('capacites',t('Trois capacités','Three capacities'),t('Les ressources d’un territoire lui permettent d’anticiper, d’absorber et de s’adapter.','A territory’s resources enable it to anticipate, absorb and adapt.'));
 const layout=apri.h('<div class="capacity-scene"></div>');sc.append(layout);
 const ex=apri.h('<div class="capacity-situation"><span class="guide-label">'+t('SITUATION','SITUATION')+'</span><p></p></div>');layout.append(ex);
 const caps=apri.h('<div class="guide-capacites"></div>');layout.append(caps);
 ATTR.forEach(a=>caps.append(apri.h('<article class="guide-capacite" data-capacite="'+a.id+'"><div class="capacity-card-title"><h4>'+t(a.fr,a.en)+'</h4><span class="capacity-badge" hidden>'+t('Exemple associé','Related example')+'</span></div><p>'+e(T('cad_'+a.id))+'</p></article>')));
 const controls=apri.h('<div class="capacity-controls"><button type="button" data-action="prev">'+t('Précédent','Previous')+'</button><span class="capacity-counter" aria-live="off"></span><div><button type="button" data-action="replay">'+t('Rejouer','Replay')+'</button><button type="button" data-action="pause">'+t('Pause','Pause')+'</button><button type="button" data-action="next">'+t('Suivant','Next')+'</button></div></div>');sc.append(controls);
 const sceneStyle=document.createElement('style');sceneStyle.textContent=`
 #cadre #guide-capacites .guide-heading h3{font-size:clamp(28px,3.5vw,44px);letter-spacing:-.035em;margin-bottom:12px}
 #cadre .capacity-scene{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:42px;align-items:center;margin:30px 0 24px}
 #cadre .capacity-scene .guide-capacites{grid-template-columns:1fr!important;gap:14px!important}
 #cadre .capacity-scene .guide-capacite{--capacity-color:#77818a;min-height:104px!important;padding:18px 20px!important;border-left-width:4px!important}
 #cadre .capacity-scene .guide-capacite.actif{background:#eef0f2!important;box-shadow:0 0 0 1px #66717b!important}
 #cadre .capacity-scene .guide-capacite.receiving{box-shadow:0 0 0 3px #66717b!important}
 #cadre .capacity-card-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
 #cadre .capacity-card-title h4{margin:0!important}
 #cadre .capacity-badge{font-size:11px;line-height:1.3;color:#56616b;border:1px solid #bbc2c8;border-radius:20px;padding:4px 8px;white-space:nowrap}
 #cadre .capacity-badge[hidden]{display:none!important}
 #cadre .capacity-situation{position:relative;background:#fff;border:1px solid #d7dce1;border-radius:15px;padding:24px;text-align:center;box-shadow:0 5px 20px #29374208}
 #cadre .capacity-situation p{font-size:18px;line-height:1.6;margin:14px 0 0;color:#293742}
 #cadre .capacity-situation:after{content:'';position:absolute;width:42px;border-top:1px dashed #a5adb4;left:100%;top:50%}
 #cadre .capacity-controls{border-top:1px solid #d7dce1;padding-top:18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
 #cadre .capacity-controls>div{display:flex;gap:10px;flex-wrap:wrap}
 #cadre .capacity-controls button{background:transparent!important;border:1px solid #b7c0c7!important;border-radius:6px!important;color:#35434e!important;padding:8px 12px!important;font-size:13px!important;cursor:pointer}
 #cadre .capacity-controls button:hover{background:#e4e8eb!important}
 #cadre .capacity-controls button:focus-visible{outline:2px solid #35434e;outline-offset:3px}
 #cadre .capacity-counter{font-size:12px;color:#66717b}
 @media(max-width:640px){#cadre .capacity-scene{grid-template-columns:1fr;gap:26px;margin-top:22px}#cadre .capacity-situation:after{width:0;height:26px;border-top:0;border-left:1px dashed #a5adb4;left:50%;top:100%}#cadre .capacity-controls{flex-wrap:wrap}#cadre .capacity-scene .guide-capacite{min-height:0!important}}
 `;sc.append(sceneStyle);
 let ix=0,playing=true,phase='reading',deadline=Date.now()+5000;const flying=[];const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const stopFlight=()=>{flying.splice(0).forEach(n=>{n.getAnimations().forEach(a=>a.cancel());n.remove();});ex.style.opacity='1';caps.querySelectorAll('.receiving').forEach(c=>c.classList.remove('receiving'));};
 const showSituation=()=>{stopFlight();const s=SITUATIONS[ix];ex.querySelector('p').textContent=t(s.fr,s.en);controls.querySelector('.capacity-counter').textContent=(ix+1)+' / '+SITUATIONS.length;caps.querySelectorAll('.guide-capacite').forEach(c=>{const active=s.a.includes(c.dataset.capacite);c.classList.toggle('actif',active);c.querySelector('.capacity-badge').hidden=!active;});phase='reading';deadline=Date.now()+5000;};
 const absorb=()=>{const from=ex.getBoundingClientRect();const targets=[...caps.querySelectorAll('.guide-capacite.actif')];targets.forEach(target=>{target.classList.add('receiving');if(reduced.matches)return;const to=target.getBoundingClientRect();const clone=document.createElement('div');clone.setAttribute('aria-hidden','true');clone.textContent=ex.querySelector('p').textContent;clone.style.cssText='position:fixed;z-index:9999;pointer-events:none;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;background:#fff;color:#293742;border:1px solid #9aa4ad;border-radius:15px;padding:24px;font:18px/1.6 Inter,Arial,sans-serif;left:'+from.left+'px;top:'+from.top+'px;width:'+from.width+'px;height:'+from.height+'px;';document.body.append(clone);flying.push(clone);clone.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+(to.left+to.width/2-from.left-from.width/2)+'px,'+(to.top+to.height/2-from.top-from.height/2)+'px) scale(.12)',opacity:0}],{duration:900,easing:'cubic-bezier(.55,.06,.68,.19)',fill:'forwards'});});if(!reduced.matches)ex.style.opacity='.12';phase='absorbing';deadline=Date.now()+1100;};
 controls.querySelector('[data-action="prev"]').onclick=()=>{ix=(ix+SITUATIONS.length-1)%SITUATIONS.length;showSituation();};
 controls.querySelector('[data-action="next"]').onclick=()=>{ix=(ix+1)%SITUATIONS.length;showSituation();};
 controls.querySelector('[data-action="replay"]').onclick=()=>{showSituation();playing=true;controls.querySelector('[data-action="pause"]').textContent=t('Pause','Pause');};
 controls.querySelector('[data-action="pause"]').onclick=()=>{playing=!playing;showSituation();controls.querySelector('[data-action="pause"]').textContent=playing?t('Pause','Pause'):t('Reprendre','Resume');};
 showSituation();const timer=window.setInterval(()=>{if(!root.isConnected){stopFlight();window.clearInterval(timer);return;}if(sc.hidden||document.hidden||!playing){stopFlight();phase='reading';deadline=Date.now()+5000;return;}if(Date.now()<deadline)return;if(phase==='reading')absorb();else{ix=(ix+1)%SITUATIONS.length;showSituation();}},100);root._guideTimer=timer;
 const sd=section('dimensions',t('Sept dimensions','Seven dimensions'),t('Les sept dimensions regroupent les attributs et indicateurs qui composent le diagnostic APRI.','The seven dimensions group the attributes and indicators that make up the APRI assessment.'));
 const dimgrid=apri.h('<div class="guide-dimensions"></div>');sd.append(dimgrid);
 DIMS.forEach((k,i)=>dimgrid.append(apri.h('<article class="guide-dimension"><span>'+String(i+1).padStart(2,'0')+'</span><h4>'+e(T(k))+'</h4></article>')));

 const ss=section('donnees',t('Des sources aux indicateurs','From data sources to indicators'),t('Les sources documentent des indicateurs différents. Chaque indicateur est ensuite rattaché à une dimension du cadre.','Different sources document different indicators. Each indicator is then assigned to a framework dimension.'));
 const srcgrid=apri.h('<div class="guide-sources"></div>');ss.append(srcgrid);
 SOURCES.forEach(so=>srcgrid.append(apri.h('<article class="guide-source" data-source="'+so.id+'"><span class="guide-source-index">'+so.ic+'</span><b>'+e(T(so.k+'_t'))+'</b></article>')));
 const flux=apri.h('<div class="guide-source-flux"><div class="guide-source-exemple"><span class="guide-label">'+t('EXEMPLE DE DONNÉE','DATA EXAMPLE')+'</span><b class="guide-source-nom"></b></div><span class="guide-flèche" aria-hidden="true">→</span><div class="guide-source-indicateur"><span class="guide-label">'+t('INDICATEUR','INDICATOR')+'</span><b class="guide-ind-nom"></b><small class="guide-dim-nom"></small></div></div>');ss.append(flux);
 let is=0;const srcNom=flux.querySelector('.guide-source-nom'),indNom=flux.querySelector('.guide-ind-nom'),dimNom=flux.querySelector('.guide-dim-nom');
 const sourcesDispo=SOURCES.map(s=>({source:s,indicateur:(P.parSource[s.id]||[]).find(x=>x.dim)})).filter(x=>x.indicateur);
 const showSource=()=>{if(!root.isConnected||!sourcesDispo.length)return;const z=sourcesDispo[is],x=z.indicateur;srcgrid.querySelectorAll('.guide-source').forEach(c=>c.classList.toggle('actif',c.dataset.source===z.source.id));flux.classList.add('guide-sortie');window.setTimeout(()=>{if(!root.isConnected)return;srcNom.textContent=T(z.source.k+'_t');indNom.textContent=nomInd(x);dimNom.textContent=T(x.dim);flux.classList.remove('guide-sortie');is=(is+1)%sourcesDispo.length;},180);};showSource();const timer2=window.setInterval(showSource,4500);root._guideTimer2=timer2;

 const sn=section('normalisation',t('De la mesure brute au score','From raw measure to score'),t('Une valeur observée est convertie en score ordinal de 0 à 10 selon la méthode de référence disponible pour l’indicateur.','An observed value is converted into an ordinal score from 0 to 10, using the reference method available for that indicator.'));
 const chain=apri.h('<div class="guide-mesure"><div class="guide-mesure-etape"><span>01</span><b>'+t('Donnée brute','Raw data')+'</b><small>'+t('Enquête ou donnée spatiale','Survey or spatial data')+'</small></div><i>→</i><div class="guide-mesure-etape"><span>02</span><b>'+t('Normalisation','Normalization')+'</b><small>'+t('Référence statistique ou seuils locaux','Statistical reference or local thresholds')+'</small></div><i>→</i><div class="guide-score-carte"><span class="guide-label">'+t('SCORE DE RÉSILIENCE','RESILIENCE SCORE')+'</span><b class="guide-score-valeur"></b><small class="guide-score-nom"></small></div></div>');sn.append(chain);
 const methodes=apri.h('<div class="guide-methodes"><article><span>01</span><h4>'+t('Discrétisation par quantiles','Quantile discretization')+'</h4><p>'+t('Quand une distribution empirique internationale ou régionale fiable existe, le score situe la valeur observée dans cette distribution cumulative.','When a reliable international or regional empirical distribution exists, the score places the observed value within that cumulative distribution.')+'</p></article><article><span>02</span><h4>'+t('Repère normatif local','Local normative reference')+'</h4><p>'+t('Quand il n’existe pas de référence comparative robuste, deux scénarios définis localement — optimal et critique — bornent onze scénarios ordinaux.','When no robust comparative reference exists, two locally defined scenarios—optimal and critical—bound eleven ordinal scenarios.')+'</p></article></div>');sn.append(methodes);
 const scoreX=P.mesure, scoreCard=chain.querySelector('.guide-score-carte');
 if(scoreX){const couleur=teinte((scoreX.score??0)/10);scoreCard.style.setProperty('--score-couleur',couleur);chain.querySelector('.guide-score-valeur').textContent=(scoreX.score??'—')+' / 10';chain.querySelector('.guide-score-nom').textContent=nomInd(scoreX);}else{chain.querySelector('.guide-score-valeur').textContent='0–10';chain.querySelector('.guide-score-nom').textContent=t('Échelle APRI','APRI scale');}

 if(scoreX){
  chain.hidden=true;
  const iv=intervalles(scoreX.bandes),pct=v=>fmt(v,1)+(apri.lang==='en'?'%':' %');
  const scale=apri.h('<div class="guide-scale-layout"><div class="guide-scale-detail"><span class="guide-label">'+e(T(scoreX.dim))+'</span><h4>'+e(nomInd(scoreX))+'</h4><div class="guide-scale-measured"><span>'+t('Valeur mesurée','Measured value')+'</span><b>'+e(pct(scoreX.valeur))+'</b></div><p>'+t('Déplacez le curseur pour voir comment la valeur se situe dans le barème.','Move the slider to see where the value falls on the scale.')+'</p><label class="guide-scale-control">'+t('Valeur explorée','Explored value')+' <output></output><input type="range" min="0" max="100" step="0.1" value="'+scoreX.valeur+'" aria-label="'+t('Valeur explorée','Explored value')+'"></label><div class="guide-score-carte"><span class="guide-label">'+t('SCORE DE RÉSILIENCE','RESILIENCE SCORE')+'</span><b class="guide-score-valeur"></b></div></div><div class="guide-scale-bands" role="group" aria-label="'+t('Barème de résilience','Resilience scale')+'"></div></div>');
  const bands=scale.querySelector('.guide-scale-bands');
  [...iv].reverse().forEach(b=>{const c=teinte(b.sc/10);bands.append(apri.h('<div class="guide-scale-row" data-score="'+b.sc+'" style="--palier:'+c+'"><b style="background:'+c+';color:'+encre(c)+'">'+b.sc+'</b><span>'+e(b.txt)+'</span></div>'));});
  const input=scale.querySelector('input'),card=scale.querySelector('.guide-score-carte');
  const update=()=>{const v=Number(input.value),score=scorePour(iv,v),c=teinte((score??0)/10);scale.querySelector('output').textContent=pct(v);card.style.setProperty('--score-couleur',c);card.querySelector('b').textContent=(score??'—')+' / 10';bands.querySelectorAll('.guide-scale-row').forEach(row=>{const active=Number(row.dataset.score)===score;row.classList.toggle('courant',active);if(active)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');});};
  input.oninput=update;update();sn.insertBefore(scale,methodes);
 }
 sn.append(apri.h('<p class="guide-renvoi">'+t('Les barèmes et les seuils de chaque indicateur sont détaillés dans l’onglet','Indicator-specific scales and thresholds are detailed in the tab')+' <b>'+t('Calcul des scores','Score calculations')+'</b>.</p>'));

 const si=section('indicateurs',t('Des indicateurs pondérés','Weighted indicators'),t('La pondération exprime l’importance relative des indicateurs dans le calcul d’une dimension. Elle s’appuie sur l’évaluation d’experts.','Weighting expresses the relative importance of indicators when calculating a dimension. It is based on expert assessment.'));
 if(P.pondere){const mot=nomInd(P.pondere);const poids=fmt(P.pondere.poids,1);si.append(apri.h('<div class="guide-poids"><div><span class="guide-label">'+t('EXEMPLE D’INDICATEUR','INDICATOR EXAMPLE')+'</span><h4>'+e(mot)+'</h4><small>'+e(T(P.pondere.dim))+'</small></div><div class="guide-poids-val"><b>'+e(poids)+'</b><span>'+t('poids expert','expert weight')+'</span></div></div>'));}
 si.append(apri.h('<p class="guide-fin">'+t('Le parcours se poursuit dans « Calcul des scores », puis dans « Boucles de rétroaction ». L’exemple interactif de test y permet de suivre pas à pas l’effet des seuils sur le passage d’une dynamique négative à une dynamique positive.','Continue with “Score calculations”, then “Feedback loops”. The interactive test example lets you follow step by step how thresholds affect the shift from a negative to a positive dynamic.')+'</p>'));

 const buttons=[...nav.querySelectorAll('button')],panels=[...sections.querySelectorAll('.guide-section')];
 const revealPanel=panel=>{
  panels.forEach(p=>p.getAnimations({subtree:true}).forEach(a=>{if(a.id==='apri-entrance')a.cancel();}));
  if(!panel||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const groups='.guide-heading,.guide-model-copy,.guide-capacites,.guide-dimensions,.guide-sources,.guide-source-flux';
  const items=[...panel.children].filter(child=>child.tagName!=='STYLE').flatMap(child=>child.matches(groups)?[...child.children].filter(x=>x.tagName!=='STYLE'):[child]);
  items.forEach((item,i)=>{const anim=item.animate([{opacity:0,translate:'0 22px'},{opacity:1,translate:'0 0'}],{duration:650,delay:i*170,easing:'cubic-bezier(.22,.61,.36,1)',fill:'backwards'});anim.id='apri-entrance';});
 };
 nav.setAttribute('role','tablist');
 const select=id=>{buttons.forEach(b=>{const active=b.dataset.cible===id;b.classList.toggle('ici',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});panels.forEach(panel=>panel.hidden=panel.id!==id);stopFlight();if(id==='guide-capacites')showSituation();revealPanel(panels.find(panel=>panel.id===id));};
 buttons.forEach((b,i)=>{b.id='tab-'+b.dataset.cible;b.setAttribute('role','tab');b.onclick=()=>select(b.dataset.cible);b.onkeydown=ev=>{let n;if(ev.key==='ArrowRight')n=(i+1)%buttons.length;else if(ev.key==='ArrowLeft')n=(i+buttons.length-1)%buttons.length;else if(ev.key==='Home')n=0;else if(ev.key==='End')n=buttons.length-1;else return;ev.preventDefault();select(buttons[n].dataset.cible);buttons[n].focus();};});
 panels.forEach(panel=>{panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+panel.id);});select('guide-modele');
}
