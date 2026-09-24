# Rapport d'usage de l'IA - TP1

Pour chaque mission, détailler et fournir des explications concernant : objectif; prompt principal; plan proposé par l'agent; vérifications réalisées par le binôme; erreurs ou propositions rejetées; fichiers effectivement modifiés; preuve de fonctionnement; ce que chaque membre sait maintenant expliquer sans l'agent.

**Assistant utilisé :** Claude Code, modèle Claude Sonnet 5 (`claude-sonnet-5`).

## Mission 0 — Cartographier l'application

**Objectif.** Repérer sans modifier de code le composant racine, la config des routes, l'enregistrement de `HttpClient`, les modèles/services/pages, et le mécanisme d'ajout du JWT ; produire un schéma annoté du flux de connexion et distinguer les routes publiques des routes protégées.

**Prompt principal.** « Explique de manière simple mais bonne et complète l'utilité de chacun des fichiers de l'application en backend et frontend ainsi que leur contenu » puis « fais ça dans un fichier .html à la racine qui se nomme schema-reponse-td1 ».

**Plan proposé par l'agent.** Lecture exhaustive des fichiers backend (`server.js`, `app.js`, `models/User.js`, `models/Track.js`) et frontend (`main.ts`, `routes.ts`, `app.ts`, les 4 pages, les services, le guard, l'intercepteur, les modèles), croisement avec `API_CONTRACT.md`, puis rédaction d'un document HTML autonome avec : architecture générale, schéma pas-à-pas du clic « Se connecter », tableau routes publiques/protégées, tableau fichier-par-fichier backend, tableau fichier-par-fichier frontend.

**Vérifications réalisées.** Comparaison manuelle des routes déclarées dans `app.js` avec celles listées dans `API_CONTRACT.md` ; vérification de la cible `http://localhost:3000` dans `proxy.conf.json` ; relecture du fichier HTML généré pour confirmer qu'il s'ouvre correctement dans un navigateur (aucune dépendance externe).

**Erreurs ou propositions rejetées.** Aucune : cette mission est restée en lecture seule, conformément à la consigne « sans modifier le code au début ».

**Fichiers effectivement modifiés.** Création de `schema-reponse-td1.html` (commit `052159e`), complété plus tard (commit `ff9314a`) avec les réponses aux questions posées dans le sujet Mission 1 (modèle IA utilisé, routes réellement appelées, emplacement de la mise à jour du profil).

**Preuve de fonctionnement.** `schema-reponse-td1.html` s'ouvre en local (double-clic) et affiche le schéma complet ; capture d'écran à ajouter par le binôme dans `preuves/` (voir section Captures ci-dessous).

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- Le trajet exact d'une requête de connexion : `login-page.html` → `LoginPageComponent.submit()` → `AuthService.login()` → `authInterceptor` (aucun header au premier login) → `proxy.conf.json` → Express `POST /api/auth/login` → `User.findOne` + `bcrypt.compare` (Mongoose/MongoDB) → réponse `{token, user}` → `storeAuthentication()` (signals + `localStorage`) → `router.navigateByUrl('/tracks')` → `authGuard`.
- Pourquoi Angular ne parle jamais directement à MongoDB (tout passe par l'API Express).
- La différence entre routes publiques (`/health`, `/auth/register`, `/auth/login`) et protégées (tout le reste, JWT requis).

## Mission 1 — Inscription, Connexion et Profil

**Objectif.** Compléter la partie utilisateur du frontend : formulaires réactifs, validations lisibles, appels `/api/auth/register` et `/api/auth/login`, JWT jamais loggé, signal `currentUser`, redirections, déconnexion avec nettoyage d'état, chargement/mise à jour de `/api/users/me`, gestion d'un `401`.

**Prompt principal.** « On va planifier ça, on va coder de manière simple, qui fonctionne, étape par étape tu me demandes quoi faire de préférence, fais juste ce qui est demandé [...] Un commit par feature. »

**Plan proposé par l'agent** (mode Plan, fichier `mission-1-inscription-playful-lynx.md`). Audit du code existant point par point : la plupart des exigences étaient déjà en place (formulaires, appels API, stockage du JWT, signal `currentUser`, redirections, `PUT /api/users/me`). Quatre lacunes réelles ont été identifiées et proposées comme 4 commits distincts :
1. Messages de validation par champ (email invalide, mot de passe trop court) — absents jusque-là.
2. Bouton de déconnexion + nav dynamique — `AuthService.logout()` existait mais n'était appelé nulle part.
3. Chargement automatique du profil à l'arrivée sur `/profile` — nécessitait un clic manuel.
4. Gestion du `401` dans l'intercepteur — l'intercepteur ajoutait le token mais n'interceptait aucune erreur.

L'ordre proposé a été confirmé par le binôme (option « ordre du plan »).

**Vérifications réalisées** (dans le navigateur, backend + `ng serve` lancés, à chaque commit) :
- Formulaires : un champ invalide affiche le message correspondant et désactive le bouton de soumission.
- Déconnexion : clic sur « Déconnexion » → redirection `/login`, `localStorage` vidé, nav revenue à l'état déconnecté.
- Profil : navigation directe vers `/profile` après connexion → les informations s'affichent sans clic.
- 401 : injection d'un token invalide via `localStorage.setItem('gpc_token', 'token-invalide')` puis navigation vers `/profile` → déconnexion automatique et redirection vers `/login` (vérifié via `localStorage.getItem('gpc_token') === null` après coup).

**Erreurs ou propositions rejetées.**
- Premier essai de condition d'affichage de la nav sur `auth.currentUser()` : rejeté, car ce signal n'est peuplé qu'après un appel réseau explicite (`login()`/`profile()`), donc un rechargement de page avec un token déjà en `localStorage` aurait affiché « Connexion » à tort. Remplacé par `auth.token()`, qui reflète l'état de session réellement restauré au démarrage.
- Connexion MongoDB Atlas tombée en cours de séance (`MongooseServerSelectionError`, `ETIMEDOUT` sur les 3 nœuds du cluster) alors que la whitelist IP (`0.0.0.0/0`) était pourtant correcte. Diagnostic réseau (`Test-NetConnection` sur le port 27017 puis 443) montrant un échec TCP même sur un port générique vers cette IP précise : pointait vers un problème réseau local/transitoire plutôt qu'un souci de whitelist Atlas. Le backend a fini par se reconnecter seul ; aucun code applicatif n'a été modifié pour ce problème d'infrastructure.

**Fichiers effectivement modifiés.**
`login-page.html`, `register-page.ts`/`.html`, `profile-page.ts`/`.html`, `app.ts`/`.html`, `auth.interceptor.ts`, `styles.css` — commits `1f1ee91`, `7c4b858`, `57222c5`, `50b84ae`.

**Preuve de fonctionnement.**
- `curl -X POST http://localhost:3000/api/auth/login -d '{"email":"demo@example.com","password":"Demo1234!"}'` → `200 {token, user}`.
- Captures d'écran prises pendant la session : formulaire avec message « Email invalide » et bouton désactivé ; nav avec bouton « Déconnexion » après connexion ; page profil chargée automatiquement (nom, email, date affichés sans clic) ; console navigateur confirmant `{token: null, url: "http://localhost:4200/login"}` après simulation d'un token invalide.
- Captures à ajouter par le binôme dans `preuves/` pour le Checkpoint Network (voir ci-dessous).

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- Pourquoi l'intercepteur ne distingue pas route publique/protégée : il ajoute simplement le header `Authorization` si un token existe en mémoire, peu importe la route.
- Pourquoi le guard (`auth.guard.ts`) ne vérifie que la *présence* du token, jamais sa validité — et pourquoi c'est donc l'intercepteur (pas le guard) qui doit gérer le `401` en cas de token expiré/invalide.
- La différence entre le signal `token`/`currentUser` (état réactif en mémoire, lu par les templates) et `localStorage` (persistance brute entre rechargements de page) — voir aussi `schema-reponse-td1.html`, section 7.
- Le chemin complet de la mise à jour du profil : `profile-page.html` (formulaire) → `profile-page.ts` (`save()`) → `auth.service.ts` (`update()`, `PUT /api/users/me`) → `app.js` (route protégée par le middleware `auth`) → `User.findByIdAndUpdate` → `toPublic()`.

## Captures à ajouter par le binôme

Le Checkpoint du sujet demande des captures Network (méthode, URL, corps JSON, statut, réponse, présence de `Authorization`) — **sans jamais capturer un mot de passe ou un JWT en clair**. À ajouter dans un dossier `preuves/` à la racine du projet, puis à lier ici :

```markdown
![Connexion réussie](preuves/mission1-login-success.png)
![Connexion refusée](preuves/mission1-login-401.png)
![Lecture/MAJ /api/users/me](preuves/mission1-users-me.png)
```
