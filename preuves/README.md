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
