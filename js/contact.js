/* Contact: a_propos_page.render_contact(). */
export const onglets = [];

function css(){
 if(!document.querySelector('link[href="css/pages.css"]'))
  document.head.append(Object.assign(document.createElement('link'),{rel:'stylesheet',href:'css/pages.css'}));
}

export default async function render(el, apri){
 css();
 const D = (await apri.donnees('data/ressources/textes.json'))[apri.lang];
 const C = D.contact, e = apri.esc, m = e(D.courriel);
 el.innerHTML = `
  <p class="ap-p">${e(C.ap_c_x)}</p>
  <div class="ap-b">
   <div class="ap-c"><div class="ap-c-t">${e(C.ap_c_mail)}</div><div class="ap-c-x"><a href="mailto:${m}">${m}</a></div></div>
   <div class="ap-c"><div class="ap-c-t">${e(C.ap_c_qui)}</div><div class="ap-c-x">${e(C.ap_c_qui_x)}</div></div>
   <div class="ap-c"><div class="ap-c-t">${e(C.ap_c_donnees)}</div><div class="ap-c-x">${e(C.ap_c_donnees_x)}</div></div>
  </div>`;
}
