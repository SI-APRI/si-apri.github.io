/* Ressources: telechargements_page.render() (Streamlit MODE_DONNEES).
   The six workbooks are built by outils/export_ressources.py with the
   Streamlit functions and served as static files from data/ressources/<lang>/.
   The individual household dataset is never published: its request goes by
   e-mail, prefilled with the fields the request asks for. */
export const onglets = [];

function css(){
 if(!document.querySelector('link[href="css/pages.css"]'))
  document.head.append(Object.assign(document.createElement('link'),{rel:'stylesheet',href:'css/pages.css'}));
}

export default async function render(el, apri){
 css();
 const T = (await apri.donnees('data/ressources/textes.json'))[apri.lang];
 const R = T.ressources, e = apri.esc;
 const jeux = R.jeux.map(j=>`
  <div class="dl">
   <div class="dl-g">
    <div class="dl-t">${e(j.titre)}</div>
    ${j.sous?`<div class="dl-s">${e(j.sous)}</div>`:''}
    <div class="dl-m">${e(j.volume)}  ·  <b>${e(j.format)}</b></div>
   </div>
   <a class="dl-b" href="data/ressources/${apri.lang}/${e(j.fichier)}" download="${e(j.fichier)}"
      title="${e(R.bouton+' — '+j.titre)}" aria-label="${e(R.bouton+' — '+j.titre+' ('+j.format+')')}">${e(j.format)} ↓</a>
  </div>`).join('');

 const corps = apri.t(
  'Organisme :\nObjectif de l’étude :\nDonnées nécessaires :\n',
  'Organisation:\nStudy purpose:\nData needed:\n');
 const mailto = 'mailto:'+T.courriel+'?subject='+encodeURIComponent('APRI - Data access request')
  +'&body='+encodeURIComponent(corps);

 el.innerHTML = `
  <div class="dl-grille">${jeux}</div>
  <div class="acces">
   <h3>${e(R.acces.titre)}</h3>
   <p>${e(R.acces.texte)}</p>
   <a class="bouton" href="${e(mailto)}">${e(R.acces.bouton)}</a>
   <p class="note">${e(apri.t('La demande s’ouvre dans votre messagerie, adressée à ','The request opens in your e-mail client, addressed to '))}<a href="mailto:${e(T.courriel)}">${e(T.courriel)}</a>.</p>
  </div>`;
}
