# Captures à fournir (Checkpoint du sujet)

Ouvre les DevTools du navigateur (F12), onglet **Network**, filtre **XHR/fetch**, avec le frontend (`ng serve`) et le backend (`npm start`) lancés.

Pour chaque capture, laisse bien apparaître : méthode, URL, corps JSON envoyé, statut de la réponse, réponse reçue, et présence (ou non) du header `Authorization`. **Ne capture jamais un mot de passe ou un JWT en clair** — tu peux flouter la valeur du token si elle est visible.

## 1. `mission1-login-success.png`
1. Va sur `/login`, connecte-toi avec `demo@example.com` / `Demo1234!`.
2. Dans Network, clique sur la requête `POST /api/auth/login`.
3. Capture les onglets **Headers** (statut `200`) et **Response** (`{ token, user }` — le token peut être flouté).

## 2. `mission1-login-401.png`
1. Toujours sur `/login`, entre un mauvais mot de passe et soumets.
2. Clique sur la requête `POST /api/auth/login` correspondante.
3. Capture le statut `401` et le corps de réponse (`{ "message": "Identifiants incorrects" }`).

## 3. `mission1-users-me.png`
1. Une fois connecté, va sur `/profile` (le profil se charge automatiquement).
2. Clique sur la requête `GET /api/users/me`.
3. Capture le statut `200`, la réponse, et le header `Authorization: Bearer ...` dans l'onglet **Headers** (tu peux flouter la valeur après `Bearer`).
4. Optionnel : modifie le nom et enregistre, puis fais la même capture pour la requête `PUT /api/users/me`.

Une fois les fichiers déposés ici, ils s'afficheront automatiquement dans `RAPPORT_IA_MODELE.md` (les liens y sont déjà en place).

---

# TP3 — Captures

## Captures des pages dans leurs différents états (déjà faites, `tp3-01` à `tp3-14`)

Prises sur l'application réelle (front + back lancés), en 800 px de large. Pour les états très courts (suppression en cours, upload en cours) la requête a été **retardée artificiellement de quelques secondes** pour pouvoir la photographier ; le comportement montré est le vrai.

| Fichier | Page / état |
|---|---|
| `tp3-01-connexion.jpg` | Connexion, état initial |
| `tp3-02-connexion-erreur-identifiants.jpg` | Connexion, 401 « Identifiants incorrects » |
| `tp3-03-inscription-erreurs-validation.jpg` | Inscription, messages de validation (nom, email, mot de passe) |
| `tp3-04-bibliotheque-liste.jpg` | Bibliothèque, liste de pistes |
| `tp3-05-bibliotheque-lecture-en-cours.jpg` | Lecture : carte « Pause » + barre « En lecture » |
| `tp3-06-suppression-en-cours.jpg` | **Mission 5** : carte atténuée, spinner, bouton bloqué |
| `tp3-07-suppression-reussie-snackbar.jpg` | **Mission 5** : SnackBar « a été supprimée » |
| `tp3-08-suppression-piste-deja-supprimee-404.jpg` | **Mission 5** : SnackBar « n'existe plus ou ne vous appartient pas » (404) |
| `tp3-09-upload-en-cours.jpg` | **Mission 6** : barre de progression, champs bloqués, bouton « Envoi… » |
| `tp3-10-upload-reussi-piste-ajoutee.jpg` | **Mission 6** : réussite, nouvelle piste en tête de liste |
| `tp3-11-upload-format-refuse.jpg` | **Mission 6** : fichier non audio refusé avant envoi |
| `tp3-12-bibliotheque-filtre-sans-resultat.jpg` | Filtre sans résultat |
| `tp3-13-bibliotheque-pagination-page-2.jpg` | Pagination, page 2 (« 6 – 9 sur 9 ») |
| `tp3-14-profil.jpg` | Profil |

## Captures Network à prendre toi-même (livrable TP3)

DevTools (F12) → onglet **Network** → filtre **Fetch/XHR**. Ne montre jamais un JWT en clair (floute la valeur après `Bearer`).

### `tp3-network-delete.png`
1. Va sur `/tracks`, clique sur le « × » d'une piste de test et confirme.
2. Clique sur la requête `DELETE /api/tracks/<id>`.
3. Capture l'onglet **Headers** : méthode `DELETE`, statut `204`, header `Authorization: Bearer …` présent. Dans la liste, on doit voir ensuite le `GET /api/tracks?page=1&limit=5` de rafraîchissement.

### `tp3-network-upload.png`
1. Dans Network, mets le débit sur **Slow 4G** (menu « No throttling »), pour voir la progression avancer.
2. Importe un fichier audio de quelques Mo (dossier `fichiers-audio-de-test/`) et regarde la barre de pourcentage monter.
3. Capture la requête `POST /api/tracks` (statut `201`, type `xhr`, colonne **Waterfall** / **Time**) et, si possible, la barre d'envoi à l'écran.
