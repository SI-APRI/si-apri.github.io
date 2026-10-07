/* À propos: a_propos_page.render(), followed (as on the Streamlit About page)
   by qualite_web.informations() and publication_web.footer(): data use and
   privacy, terms of use ("cgu"), site map and sharing. "#apropos/cgu" opens
   the terms, like ?page=cgu in Streamlit. */
export const onglets = [];

function css(){
 if(!document.querySelector('link[href="css/pages.css"]'))
  document.head.append(Object.assign(document.createElement('link'),{rel:'stylesheet',href:'css/pages.css'}));
}

// Streamlit page code -> static anchor
const CIBLE = {portail:'accueil', methodologie:'cadre', accueil:'territoire', dimensions:'resultats',
 boucles:'boucles', actions:'fiches', donnees:'ressources', apropos:'apropos', contact:'contact', cgu:'apropos/cgu'};

export default async function render(el, apri, onglet){
 css();
 const D = (await apri.donnees('data/ressources/textes.json'))[apri.lang];
 const A = D.apropos, e = apri.esc;
 // only the markdown links of the source texts, everything else escaped
 const md = s => e(s).replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
   (_,t,u)=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
 const bloc = (k, contenu) => `<div class="apx-bloc"><div class="apx-k">${e(k)}</div><div>${contenu}</div></div>`;
 const [b1,b2,b3,b4] = A.blocs;
 const pays = A.paysages.map(p=>`<div><div class="n">${e(p.nom)}</div><div class="s">${e(p.surface)}</div><div class="x">${e(p.detail)}</div></div>`).join('');
 const jalons = A.jalons.map(j=>`<div><div class="v">${e(j.v)}</div><div class="l">${e(j.l)}</div></div>`).join('');
 const liste = '<ul class="ap-l">'+A.realisations.liste.map((x,i)=>`<li><b>${String(i+1).padStart(2,'0')}</b><span>${e(x)}</span></li>`).join('')+'</ul>';
 const defs = '<div class="ap-def">'+A.definitions.mots.map(d=>`<div><div class="m">${e(d.mot)}</div><div class="x">${e(d.texte)}</div><div class="s">${e(d.source)}</div></div>`).join('')+'</div>';
 const pli = (id, titre, corps) => `<details class="pli" data-pli="${id}"><summary>${e(titre)}</summary><div class="corps">${corps}</div></details>`;
 const I = A.informations, C = A.cgu;
 const info = `<div class="info"><p>${e(I.org)}</p>${I.blocs.map(b=>`<p><strong>${e(b.t)}</strong>${e(b.x)}</p>`).join('')}
   <p><a href="mailto:${e(D.courriel)}">Contact APRI</a></p><p>${e(I.audience)}</p></div>`;
 const cgu = `<div class="info"><p class="maj">${e(C.maj)}</p>${C.blocs.map(b=>`<p><strong>${e(b.t)}</strong>${e(b.x)}</p>`).join('')}
   <p>${md(C.reference)}</p><p><a href="mailto:${e(D.courriel)}">Contact APRI</a></p></div>`;
 const plan = '<div class="plan">'+Object.entries(A.plan.pages).map(([k,t])=>`<a class="bouton" href="#${CIBLE[k]||k}">${e(t)}</a>`).join('')+'</div>';
 const url = location.href.split('#')[0];
 const img = 'data/ressources/'+A.partage.image;
 const partage = `<figure class="partage" style="margin:0"><img src="${img}" alt="APRI" width="600" loading="lazy"><figcaption>${e(A.partage.legende)}</figcaption>
   <div class="actions"><a class="bouton" href="${img}" download="${e(A.partage.image)}">PNG ↓</a><a href="${e(url)}">APRI</a></div></figure>`;

 el.innerHTML = `
  <div class="apx-lead">${e(A.lead)}</div>
  ${bloc(b1.k, `<div class="apx-x">${e(b1.x)}</div>`)}
  ${bloc(b2.k, `<div class="apx-x">${e(b2.x)}</div><div class="apx-pay">${pays}</div>`)}
  ${bloc(b3.k, `<div class="apx-x">${e(b3.x)}</div>`)}
  ${bloc(b4.k, `<div class="apx-j">${jalons}</div>`)}
  <div class="plis">
   ${pli('realisations', A.realisations.titre, liste)}
   ${pli('definitions', A.definitions.titre, defs)}
  </div>
  <div class="plis">
   ${pli('informations', I.titre, info)}
   ${pli('cgu', C.titre, cgu)}
   ${pli('plan', A.plan.titre, plan)}
   ${pli('partage', A.partage.titre, partage)}
  </div>`;

 if(onglet === 'cgu'){
  const d = el.querySelector('details[data-pli="cgu"]');
  d.open = true;
  requestAnimationFrame(()=>setTimeout(()=>d.scrollIntoView({behavior:'smooth', block:'start'}), 350));
 }
}
