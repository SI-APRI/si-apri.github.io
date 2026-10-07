/* Port of recherche_questions.py (Streamlit): rank documents by closeness to a
   request written in the reader's own words. Same steps as the Python:
   accent-free words cut to their 5-letter stem, a small dictionary of related
   notions (fr, en, es, Creole) that expands the request, inverse document
   frequency weighting, and character trigrams for typos.
   score = Σ min(weight,1)·idf  +  1.5 · cosine(trigrams)   kept when > 0.35 */

const NOTIONS = [
 "eau water agua dlo potable boire puits source citerne riviere",
 "assainissement sanitation toilette latrine douche hygiene saneamiento",
 "energie energy electricite courant lampe solaire charbon bois cuisson combustible",
 "dechet waste ordure poubelle residuo",
 "logement maison habitat toit mur sol housing house casa kay",
 "argent money revenu income salaire gain dinero lajan epargne savings credit pret dette emprunt banque",
 "emploi travail job work employment trabajo travay",
 "terre foncier land titre propriete fermage metayage",
 "agriculture culture champ jardin recolte harvest crop farming semis plantation rendement yield",
 "mais maize corn haricot pois bean riz rice manioc igname banane plantain patate sorgho petitmil",
 "arbre fruitier mangue avocat cocotier fruit tree",
 "engrais fertilizer intrant pesticide herbicide insecticide fongicide",
 "irrigation arrosage canal",
 "perte loss degat secheresse drought inondation flood maladie ravageur",
 "elevage livestock betail animal vache boeuf chevre cabri cochon porc poule volaille mouton cheval ane",
 "peche fishing poisson fish pecheur fisher bateau barque canot filet nasse ligne mer",
 "nourriture food alimentation repas manger faim hunger comida manje securite",
 "sante health clinique hopital dispensaire malade maladie soin",
 "ecole school education enfant eleve scolarisation",
 "entraide solidarite groupe association cooperative participation confiance conflit voisin communaute",
 "cyclone ouragan hurricane tempete storm seisme tremblement earthquake catastrophe disaster alea hazard risque alerte",
 "migration depart partir emigrer diaspora transfert remittance destination ville etranger",
 "femme woman genre gender chef menage household",
 "enfant child jeune age personne membre",
 "distance marche marche route temps acces",
 "telephone portable phone mobile reseau",
 "foret forest arbre tree reboisement reforestation deforestation bois charbon pepiniere agroforesterie bosque",
 "erosion sol soil terrasse ravine glissement conservation",
 "biodiversite biodiversity espece species conservation aire protegee mangrove corail recif herbier faune flore",
 "climat climate changement adaptation resilience",
 "plastique dechet pollution macroplastique",
 "gouvernance governance institution autorite mairie casec comite",
];

export function norm(t){
 return String(t).toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^a-z0-9 ]+/g, ' ');
}
export function racines(t){
 return norm(t).split(' ').filter(m => m.length >= 3).map(m => m.slice(0, 5));
}
const GROUPES = NOTIONS.map(g => new Set(racines(g)));

function compter(liste){ const c = new Map(); for(const x of liste) c.set(x, (c.get(x) || 0) + 1); return c; }

function etendre(rac){
 const out = compter(rac);
 for(const r of new Set(rac)) for(const g of GROUPES) if(g.has(r)) for(const v of g) out.set(v, (out.get(v) || 0) + 0.45);
 return out;
}

function trigrammes(t){
 t = ' ' + norm(t) + ' ';
 const c = new Map();
 for(let i = 0; i < t.length - 2; i++){ const k = t.slice(i, i + 3); c.set(k, (c.get(k) || 0) + 1); }
 return c;
}

function cos(a, b){
 if(!a.size || !b.size) return 0;
 let num = 0, na = 0, nb = 0;
 for(const [k, v] of a){ num += v * (b.get(k) || 0); na += v * v; }
 for(const v of b.values()) nb += v * v;
 return num / (Math.sqrt(na) * Math.sqrt(nb));
}

/** documents: array of [id, text]. Returns [[id, score], ...] best first, at most n. */
export function classer(documents, requete, n = 10){
 if(!requete || !requete.trim()) return [];
 const qMots = etendre(racines(requete));
 const qTri = trigrammes(requete);
 const docs = documents.map(([k, v]) => [k, compter(racines(v)), v]);
 const nd = docs.length || 1;
 const df = new Map();
 for(const [, c] of docs) for(const w of c.keys()) df.set(w, (df.get(w) || 0) + 1);
 const resultats = [];
 for(const [k, c, texte] of docs){
  let mots = 0;
  for(const [w, poids] of qMots) if(c.has(w)) mots += Math.min(poids, 1) * Math.log(1 + nd / (1 + df.get(w)));
  const score = mots + 1.5 * cos(qTri, trigrammes(texte));
  if(score > 0.35) resultats.push([k, score]);
 }
 resultats.sort((a, b) => b[1] - a[1]);   // stable, as Python's sort
 return resultats.slice(0, n);
}
