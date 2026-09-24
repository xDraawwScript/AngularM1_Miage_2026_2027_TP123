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

## Ajustements complémentaires (hors sujet strict du TP)

Demandés par l'étudiant en plus des missions, journalisés ici à sa demande explicite (« chaque chose qu'on fait on incrémente RAPPORT_IA_MODELE.md »).

### Thèmes visuels par page

**Objectif.** Donner à chaque page (login, register, profile, tracks) une identité visuelle distincte inspirée d'un groupe de rock (Rage Against the Machine, Queens of the Stone Age, Metallica, Fleetwood Mac), sans reproduire d'œuvre protégée.

**Prompt principal.** « tu vas faire un theme orienté rock [...] Une page par theme », puis, après une première version jugée trop générique : « déjà ils doivent prendre toute la page, ils doivent être plus originaux [...] on dirait directement que c'est fait par ia ».

**Plan proposé par l'agent.** Une clarification préalable (`AskUserQuestion`) a fixé la répartition (1 thème = 1 page) et le niveau d'exigence visuelle (couleurs/typo puis, sur demande, textures/bordures/effets poussés). Une itération intermédiaire a utilisé les pochettes d'albums envoyées par l'étudiant comme référence de palette — refusé de les reproduire telles quelles (droit d'auteur sur l'artwork, photo de personnes réelles pour la pochette Fleetwood Mac) et proposé à la place des couleurs dominantes adaptées. Sur retour « pas assez originales / trop plein écran manquant », réécriture complète : mise en page plein écran (technique CSS `width:100vw; left:50%; margin-left:-50vw`), compositions asymétriques et éditoriales bespoke par page (flyer photocopié avec scotch/tampon pour RATM, champ rouge tranché par un éclat noir pour QOTSA, fiche technique brutaliste à grille millimétrée pour Metallica, pochette vinyle avec tracklist numérotée pour Fleetwood Mac), avec des polices Google Fonts moins vues (Big Shoulders Stencil, Courier Prime, Rye, Archivo Narrow, Unica One, Cormorant Garamond, Pacifico) plutôt que les choix par défaut (Bebas Neue/Oswald/Metal Mania) de la première tentative.

**Vérifications réalisées.** Capture d'écran de chaque page dans le navigateur après chaque réécriture ; test responsive mobile (375×812) sur la page login pour confirmer le repli de la mise en page ; vérification que le rechargement à chaud (HMR) reflétait bien les nouveaux templates.

**Erreurs ou propositions rejetées.**
- Bug découvert en testant Tracks : le `<header class="sleeve-head">` héritait du style CSS global `header { background:#123d32 }` prévu pour la nav du site (sélecteur d'élément, pas de classe) — corrigé en renommant la balise en `<div>`.
- Deux tentatives de tester le profil et les pistes ont échoué car le backend s'était arrêté entre-temps (voir Mission 1, même souci Atlas/MongoDB) ; redémarré manuellement à chaque fois avant de reprendre les vérifications visuelles.

**Fichiers effectivement modifiés.** `index.html` (polices), `styles.css`, les 4 paires `*-page.html`/`*-page.css` — commits `e6a6d65`, `a3405a4`, `502a6b1`, `520bbe2`, `124124c` (première version) puis `818445b`, `678de3a`, `aa2cdfc`, `f167a76` (réécriture plein écran).

**Preuve de fonctionnement.** Captures d'écran prises pendant la session pour les 4 pages, en desktop et (pour login) en mobile ; à ajouter par le binôme dans `preuves/` si besoin pour la soutenance.

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- La technique de « full-bleed » en CSS (`width:100vw` + décalage négatif de la moitié de la largeur) pour faire déborder un composant du conteneur centré `<main>` sans toucher au routeur ni à la logique Angular.
- Pourquoi un sélecteur d'élément global (`header { ... }` dans `styles.css`) peut entrer en collision avec un élément du même nom utilisé ailleurs dans l'app, et pourquoi préférer une balise neutre (`div`) quand une classe suffit à cibler le style.
- Que l'habillage visuel (CSS) est strictement découplé de la logique métier : aucun fichier `.ts` de service, guard ou intercepteur n'a été modifié pour ces thèmes, seuls les composants de page et leurs templates/styles.

### Nom de l'utilisateur connecté dans la nav

**Objectif.** Afficher le nom de l'utilisateur connecté dans le header, à gauche du lien « Backing tracks », y compris juste après un rechargement de page.

**Prompt principal.** « j'aimerais quand on est connecté en haut a droite à gauche de backing track on ai juste le nom de l'utilisateur connecté ».

**Plan proposé par l'agent.** Ajout d'un `@if (auth.currentUser(); as user)` dans `app.html` juste avant le lien « Backing tracks ». Comme le signal `currentUser` n'est peuplé qu'après un appel réseau explicite (voir Mission 1), un rechargement de page avec un token déjà stocké l'aurait laissé vide : ajout dans le constructeur d'`AppComponent` d'un appel `auth.profile()` déclenché uniquement si un token existe mais qu'aucun `currentUser` n'est encore chargé.

**Vérifications réalisées.** Rechargement complet de la page sur `/tracks` avec une session déjà active (token en `localStorage`) → le nom « Demo » apparaît bien dans la nav sans navigation manuelle vers `/profile`.

**Erreurs ou propositions rejetées.** Aucune : première implémentation validée directement, car elle réutilise le pattern déjà en place dans `profile-page.ts` (appel de `load()`/`profile()` dans le constructeur).

**Fichiers effectivement modifiés.** `app.ts`, `app.html`, `app.css` — commit `925f431`.

**Preuve de fonctionnement.** Capture d'écran de la nav sur `/tracks` après rechargement, montrant « Demo » avant « Backing tracks ».

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- Pourquoi il fallait un appel `profile()` explicite au démarrage de l'app (et pas seulement lire `localStorage`) : `currentUser` est un Signal en mémoire, jamais désérialisé automatiquement depuis `localStorage` (seul le `token`, une simple chaîne, l'est).
- Pourquoi ce correctif se place dans `AppComponent` (le composant racine, toujours instancié une fois) plutôt que dans chaque page.

### Suppression d'une piste

**Objectif.** Ajouter un bouton pour supprimer une piste audio uploadée, en s'appuyant sur la route bonus `DELETE /api/tracks/:id` déjà présente côté backend (`app.js`) mais jamais appelée par le frontend.

**Prompt principal.** « rajoute un bouton pour supprimer les tracks qu'on a rajouté ».

**Plan proposé par l'agent.** Ajout d'une méthode `remove(id)` dans `TrackService` (nouvel appel `HttpClient.delete`), d'une méthode `remove(track)` dans `TracksPageComponent` (confirmation via `confirm()` puis rechargement de la liste après succès), et d'un bouton « ✕ » à côté du bouton lecture dans le template, stylé dans la continuité du thème Fleetwood Mac de la page.

**Vérifications réalisées.** Backend et frontend relancés (les deux s'étaient à nouveau arrêtés) ; clic sur « ✕ » d'une piste avec confirmation acceptée → la piste disparaît de la liste (passage de 3 à 2 pistes), sans rechargement manuel de page. Le `confirm()` natif du navigateur a été vérifié séparément (annuler = aucune requête réseau envoyée) avant de valider le scénario d'acceptation.

**Erreurs ou propositions rejetées.** Aucune : la route backend existait déjà et documentée dans `API_CONTRACT.md`, seule la partie frontend manquait.

**Fichiers effectivement modifiés.** `track.service.ts`, `tracks-page.ts`, `tracks-page.html`, `tracks-page.css` — commit `068f07f`.

**Preuve de fonctionnement.** Liste de pistes passant de 3 à 2 éléments après confirmation, sans erreur console ; requête `DELETE /api/tracks/:id` suivie d'un nouvel appel `GET /api/tracks` (rechargement automatique de la liste).

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- Pourquoi ce bouton n'existait pas avant : la route existait côté API (marquée « bonus » dans `API_CONTRACT.md`) mais aucun composant ne l'appelait — un exemple concret de fonctionnalité backend prête mais non exposée côté interface.
- Le rôle de `confirm()` comme garde-fou minimal avant une action destructive, et pourquoi on recharge la liste (`load()`) après succès plutôt que de retirer l'élément manuellement du tableau local.

## Captures à ajouter par le binôme

Le Checkpoint du sujet demande des captures Network (méthode, URL, corps JSON, statut, réponse, présence de `Authorization`) — **sans jamais capturer un mot de passe ou un JWT en clair**. À ajouter dans un dossier `preuves/` à la racine du projet, puis à lier ici :

```markdown
![Connexion réussie](preuves/mission1-login-success.png)
![Connexion refusée](preuves/mission1-login-401.png)
![Lecture/MAJ /api/users/me](preuves/mission1-users-me.png)
```

# Rapport d'usage de l'IA - TP2

Travail effectué sur la branche `tp-2` (créée depuis `main`), pour isoler le TP2 du TP1 déjà mergé/poussé.

## Mission 0 (TP2) — Vérification des prérequis

**Objectif.** Le sujet TP2 exige avant toute chose : « Le TP1 doit être fonctionnel. Le backend doit être lancé, le frontend doit utiliser la bonne cible dans `proxy.conf.json`, et le compte de test doit pouvoir se connecter. » Équivalent de la Mission 0 du TP1 : une vérification, pas une mission de code.

**Prompt principal.** « On va faire ça mission par mission on commence par le 0 ».

**Vérifications réalisées.**
- `GET /api/health` → `200 {"status":"ok"}`.
- `proxy.conf.json` : `/api` → `http://localhost:3000` (correct).
- Connexion réelle via l'UI (`demo@example.com` / `Demo1234!`) après avoir vidé `localStorage` → redirection sur `/tracks`, token présent, bibliothèque affichée.
- Fichiers de test présents (`song1.mp3`, `song2.mp3`).
- État des lieux du code existant pertinent pour la Mission 2 : `TrackService.list(page, limit)` transmettait déjà les paramètres au serveur (pas de pagination locale), les Signals `tracks`/`page`/`pages`/`loading` existaient déjà, `@for`/`@empty`/`@if` et les boutons Préc./Suiv. désactivés aux bornes étaient déjà en place.

**Erreurs ou propositions rejetées.** Aucune, étape de lecture seule.

**Fichiers effectivement modifiés.** Aucun (vérification uniquement).

**Preuve de fonctionnement.** `curl http://localhost:3000/api/health` → `200` ; connexion UI aboutissant sur `/tracks` avec token en `localStorage`.

**Ce que chaque membre sait maintenant expliquer sans l'agent.** Que la Mission 2 du sujet ne part pas de zéro : la pagination serveur et les Signals de base existaient déjà dans le starter, seul le signal d'erreur manquait (voir Mission 2 ci-dessous).

## Mission 2 — Bibliothèque paginée

**Objectif.** Représenter `tracks`, `page`, `pages`, `loading` **et l'erreur éventuelle** avec des Signals, avec une vraie requête HTTP serveur à chaque changement de page (aucune pagination locale). Parties avancées (Angular Material Paginator, plugin Mongoose `aggregate-paginate-v2`) explicitement écartées par l'étudiant car facultatives.

**Prompt principal.** « on passe à la deux, ne fais pas ce qui est optionnel, redige bien tout dans le fichier demandé et débats avec moi pour faire des choix d'architecture, tu mets les choix et les décisions dans le fichier, on fait ce tp2 dans une branche tp-2 ».

**Débat et décisions d'architecture (avant implémentation).**

1. **Comportement du signal `page` en cas d'échec de chargement.** Deux options proposées :
   - **A — Rollback** : `page` n'est mis à jour qu'après le succès de la requête HTTP ; en cas d'échec, l'étiquette de pagination affichée reste cohérente avec les pistes réellement montrées.
   - **B — Optimiste** : `page` est mis à jour immédiatement au clic, avant même la réponse du serveur ; plus simple mais peut afficher une étiquette de page incohérente avec le contenu si la requête échoue.

   → **Décision retenue : A (rollback).** Choix de l'étudiant, validé.

2. **Message d'erreur affiché.** Tenter `error.error?.message` (message renvoyé par le backend s'il existe), sinon un message générique fixe (« Impossible de charger la bibliothèque »), affiché avec la classe `.error` déjà utilisée sur les pages login/register — cohérence de style avec l'existant plutôt qu'un nouveau composant d'erreur.

   → **Décision retenue : validée telle quelle** par l'étudiant.

**Plan proposé par l'agent (implémentation).**
- `tracks-page.ts` : ajout du signal `readonly error = signal('')` ; `load()` prend désormais un paramètre optionnel `targetPage` (par défaut la page courante), le remet à zéro (`error.set('')`) à chaque tentative, et ne fait `this.page.set(targetPage)` que dans le callback `next` (succès) — jamais dans `error`. `go(page)` appelle directement `load(page)` au lieu de faire `page.set(page)` puis `load()`. `upload()` appelle `load(1)` après un envoi réussi, au lieu de faire `page.set(1)` puis `load()` séparément (même logique unifiée).
- `tracks-page.html` : ajout d'un `@if (error()) { <p class="error">{{ error() }}</p> }` juste après le `@if (loading())`.

**Vérifications réalisées.**
- Fonctionnement normal inchangé : la bibliothèque se charge, « Page 1 / 1 » correct.
- Simulation d'échec : arrêt volontaire du backend (`Stop-Process` sur le process Node du serveur), clic sur « Actualiser » → message « Impossible de charger la bibliothèque » affiché, la piste déjà présente reste visible (pas de vidage de liste trompeur), l'étiquette de page ne change pas.
- Redémarrage du backend, nouveau clic sur « Actualiser » → le message d'erreur disparaît, la liste se recharge normalement (confirme que `error` est bien remis à zéro à chaque tentative).

**Erreurs ou propositions rejetées.** Aucune : les deux options ont été présentées à l'étudiant avant tout code, l'option A a été choisie directement, pas d'implémentation à défaire.

**Fichiers effectivement modifiés.** `tracks-page.ts`, `tracks-page.html` — commit `333b553` (branche `tp-2`).

**Preuve de fonctionnement.** Voir « Vérifications réalisées » ci-dessus (test réel d'échec/succès en conditions réelles, pas seulement en théorie).

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- Pourquoi committer la valeur de `page` seulement en cas de succès évite une désynchronisation entre l'étiquette de pagination affichée et les données réellement montrées à l'écran.
- Pourquoi il faut remettre `error` à `''` au début de chaque tentative de chargement (`load()`), et pas seulement le définir en cas d'échec : sinon un message d'erreur resterait affiché indéfiniment après une tentative suivante réussie.
- Pourquoi `error.error?.message` peut être `undefined` pour certaines pannes (ex. erreur serveur générique sans corps JSON exploitable, comme le crash MongoDB rencontré en TP1) — d'où l'importance du message de repli fixe.

## Mission 2 (AVANCÉ) — Angular Material Paginator

**Objectif.** Remplacer les boutons Préc./Suiv. faits main par le composant `<mat-paginator>` d'Angular Material sur la page Tracks (partie explicitement marquée AVANCÉ dans le sujet).

**Prompt principal.** « AVANCÉ — Angular Material [...] On fait ça ».

**Débat et décisions d'architecture (avant implémentation).**
1. **Style visuel du paginator** : garder le look Material par défaut (bleu/indigo, Roboto) plutôt que de le retheme pour matcher l'habillage « pochette vinyle » (crème, Cormorant Garamond) déjà en place sur la page Tracks. → Décision de l'étudiant : **garder le défaut**, zéro travail de retheming CSS.
2. **Animations Material** (ripple au clic, transitions) : activées via `provideAnimationsAsync()` plutôt que désactivées (`provideNoopAnimations()`). → Décision de l'étudiant : **activées**.

**Plan proposé par l'agent (implémentation).**
- `npx ng generate @angular/material:ng-add --theme=azure-blue --defaults` pour installer `@angular/material`/`@angular/cdk` et générer le théming (le flag `--theme=indigo-pink`, nom de thème Material 2 « legacy », a d'abord fait planter le schematic — Angular Material 22 est passé au théming Material 3, qui utilise d'autres noms de thème comme `azure-blue`).
- Ajout manuel de `@angular/animations` (peer dependency non installée automatiquement) et alignement de tous les paquets `@angular/*` sur la même version exacte (`22.2.0`) pour éviter des conflits de peer dependencies avec npm.
- Édition du fichier généré `src/material-theme.scss` pour retirer le reset global `body { background-color / color / font: ... }` qu'impose le schematic par défaut : avec 4 pages ayant chacune leur typographie bespoke (Bebas Neue, Rye, Unica One, Cormorant Garamond...), un reset global aurait pu entrer en conflit — conservé uniquement le théming des composants Material eux-mêmes.
- `tracks-page.ts` : import de `MatPaginatorModule`, ajout du signal `total` (le paginator a besoin du nombre total d'éléments, pas du nombre de pages), méthode `onPageEvent(event: PageEvent)` convertissant l'index 0-based du paginator vers la page 1-based de l'appli.
- `tracks-page.html` : remplacement du `<div class="pager">` par `<mat-paginator [length] [pageSize]="5" [pageIndex] [hidePageSize]="true" [showFirstLastButtons]="true" (page)="onPageEvent($event)">`.
- Ajout de `src/index.html` : police d'icônes Material Symbols (sinon les flèches de navigation s'affichent en texte brut, ex. `chevron_left`).
- Ajout de `mat-paginator-intl-fr.ts` : `mat-paginator` n'a aucune traduction française par défaut (affichait « 1 – 1 of 1 »), un provider `MatPaginatorIntl` francisé a été ajouté sur le composant.

**Bug découvert et corrigé en testant.** `mat-paginator` gère un état interne (`pageIndex`) qui avance **visuellement dès le clic**, avant même la réponse du serveur — contrairement aux anciens boutons faits main qui lisaient directement le signal `page`. Comme la Mission 2 a fait le choix « rollback » (ne committer `page` qu'en cas de succès), si une requête échoue et que la valeur de `page()-1` ne change donc pas, Angular ne repousse pas cette valeur inchangée au paginator, qui reste alors visuellement décalé (constaté en test : affichait « 1 – 5 sur 6 » alors que les données réellement affichées étaient toujours celles de la page 2). Corrigé en ajoutant un `@ViewChild(MatPaginator)` et en forçant `this.paginator.pageIndex = this.page() - 1` dans le callback d'erreur, pour resynchroniser l'état interne du composant indépendamment de la détection de changement d'Angular.

**Vérifications réalisées.**
- Build (`npm start`) sans erreur après résolution des conflits de versions.
- Ajout temporaire de 5 pistes de test via `curl` (upload non scriptable facilement dans le navigateur automatisé) pour obtenir 2 pages ; navigation avant/arrière avec vraies requêtes `GET /api/tracks?page=2&limit=5` visibles en Network.
- Test du bug ci-dessus (backend coupé pendant la navigation) avant et après le correctif `@ViewChild`.
- Nettoyage : les 5 pistes de test supprimées via `DELETE /api/tracks/:id` après vérification, retour à l'état initial (1 piste).
- Non-régression vérifiée sur les pages login/register/profile (typographies bespoke intactes malgré l'ajout du théming Material global).

**Erreurs ou propositions rejetées.**
- `--theme=indigo-pink` (nom Material 2) : rejeté par le schematic lui-même (`Cannot read properties of undefined (reading 'primary')`), remplacé par `--theme=azure-blue` (nom Material 3 valide dans cette version).
- Laisser le reset de typographie global généré par le schematic : rejeté et retiré manuellement, pour ne pas risquer d'écraser les 4 thèmes de page déjà en place.

**Fichiers effectivement modifiés.** `package.json`, `angular.json`, `src/index.html`, `src/main.ts`, `src/material-theme.scss` (nouveau), `tracks-page.ts`, `tracks-page.html`, `mat-paginator-intl-fr.ts` (nouveau) — commit `03c9195` (branche `tp-2`).

**Preuve de fonctionnement.** Voir « Vérifications réalisées » : navigation réelle entre 2 pages avec requêtes serveur observées, bug de désynchronisation du paginator reproduit puis corrigé et re-testé.

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- Pourquoi `mat-paginator` a besoin de `length` (nombre total d'éléments) et non `pages` (nombre de pages) — c'est lui qui recalcule le nombre de pages en interne à partir de `length`/`pageSize`.
- Pourquoi un composant tiers avec état interne (comme `mat-paginator`) ne se comporte pas comme un `@if`/`@for` purement déclaratif lié à un Signal : il peut avancer optimistiquement de son propre chef, ce qui oblige parfois à le resynchroniser manuellement via `@ViewChild` plutôt que par un simple binding `[pageIndex]`.
- Pourquoi Angular ne réapplique pas un `@Input()` si sa valeur liée n'a pas changé d'un cycle de détection de changement à l'autre — la cause racine du bug de resynchronisation observé.

## Mission 3 (TP2) — Analyse upload et lecture audio

**Objectif.** Documenter (sans modifier de code) le mécanisme d'upload/lecture audio déjà en place : fichiers/méthodes précis de chaque étape, rôle de l'intercepteur JWT vis-à-vis d'une URL directe en `src`, contrôles backend déjà présents, et réponses aux 5 questions sur la mémoire/le buffering/le streaming.

**Prompt principal.** Le texte complet de la Mission 3 du sujet, avec la consigne « Les questions réponds y dans un fichier html td 2 reponses ».

**Plan proposé par l'agent.** Analyse du code déjà exploré en profondeur pendant les Missions 1 et 2 (pas de nouvelle exploration nécessaire), puis rédaction d'un document HTML autonome sur le même gabarit visuel que `schema-reponse-td1.html`, avec 4 sections : flux complet (tableau fichier/méthode par étape + schéma), intercepteur JWT vs attribut `src`, contrôles backend + conformité du `FormData` frontend, et les 5 questions mémoire/buffering/streaming.

**Vérifications réalisées.** Relecture croisée de `tracks-page.ts`/`.html`, `track.service.ts`, `auth.interceptor.ts` et `backend/src/app.js` (Multer, `res.sendFile`) pour garantir que chaque affirmation du document correspond au code réel. Ouverture du fichier généré dans le navigateur pour confirmer le rendu.

**Erreurs ou propositions rejetées.** Aucune : tâche de documentation pure, aucune divergence entre l'analyse et le code trouvé.

**Fichiers effectivement modifiés.** Création de `schema-reponse-td2.html` — commit `f78a0ca` (branche `tp-2`). Aucun fichier de l'application modifié (conforme à la consigne du sujet : « ne modifiez pas le contrat HTTP », « ne réimplémentez pas ce qui existe déjà »).

**Preuve de fonctionnement.** `schema-reponse-td2.html` s'ouvre en local et affiche les 4 sections complètes (voir capture du rendu pendant la session).

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- Le trajet complet Blob → ObjectURL → lecteur `<audio>`, et pourquoi ce détour est nécessaire (l'intercepteur JWT n'agit que sur les requêtes `HttpClient`, jamais sur un attribut `src` chargé nativement par le navigateur).
- Que le streaming existe déjà côté backend (`res.sendFile`) mais pas côté `HttpClient` (le `Blob` n'arrive qu'une fois le téléchargement terminé).
- Deux manques identifiés pour une prochaine étape : pas de révocation de l'`ObjectURL` à la destruction du composant, et aucune validation de fichier (format/taille) côté frontend avant l'appel HTTP — et pourquoi cette dernière ne dispenserait de toute façon jamais la validation backend déjà en place.

## Mission 3 (TP2) — Compléments manquants + améliorations facultatives

**Objectif.** Corriger les deux manques identifiés dans l'analyse précédente (révocation finale de l'`ObjectURL`, validations frontend avant l'upload) et implémenter une partie des améliorations facultatives du sujet : barre de progression, formatage lisible taille/date, filtre par titre (la confirmation de suppression et le rafraîchissement après suppression étaient déjà faits depuis la Mission 1 bonus).

**Prompt principal.** « on fait les compléments manquants (révocation + validations) et ça [améliorations facultatives : barre de progression, suppression+confirmation, rafraîchissement après suppression, formatage taille/date, filtre par titre] ».

**Plan proposé par l'agent (implémentation, sans débat d'architecture cette fois — corrections et ajouts factuels, pas de choix ouverts).**
- `tracks-page.ts` : `ngOnDestroy` révoque désormais `audioUrl()` s'il est encore défini.
- Constantes `ALLOWED_AUDIO_TYPES`/`MAX_FILE_SIZE` dupliquées côté frontend (miroir exact des contrôles déjà en place dans `backend/src/app.js`), vérifiées dans `choose()` dès la sélection du fichier (signal `uploadError`), avec réinitialisation de l'`<input type="file">` si le fichier est rejeté.
- `track.service.ts` : `upload()` passe désormais par `{ reportProgress: true, observe: 'events' }` pour exposer la progression ; `tracks-page.ts` traduit les événements `HttpEventType.UploadProgress`/`Response` en signal `uploadProgress` (pourcentage), affiché via un `<progress>` ; le bouton « Envoyer » est désactivé pendant l'envoi (empêche une double soumission, effet de bord nécessaire pour qu'une barre de progression ait un sens).
- `formatSize()`/`formatDate()` : corrige un bug déjà présent (la taille en octets bruts était étiquetée « Ko » sans conversion) et ajoute la date d'ajout, absente jusque-là de l'affichage.
- `filterTitle` (FormControl) + `toSignal(valueChanges)` + `computed()` : filtre client sur la page actuellement chargée (pas de nouvelle route serveur, conforme à « ne modifiez pas le backend »).
- Bug annexe corrigé en testant : après un envoi réussi, l'`<input type="file">` gardait visuellement l'ancien nom de fichier bien que l'état interne (`this.file`) soit remis à `undefined` — ajout d'un `@ViewChild('fileInput')` pour vider aussi la valeur native de l'input.

**Vérifications réalisées.**
- Filtre : tapé « punch » → une seule piste sur cinq affichée, effacé → retour à la liste complète.
- Validation de format : fichier `.txt` (`text/plain`) injecté via un faux `File`/`DataTransfer` (upload non scriptable dans le navigateur automatisé) → message « Format non accepté... » affiché, bouton Envoyer resté désactivé.
- Validation de taille : faux fichier de 26 Mo → message « Fichier trop volumineux (25 Mo maximum). ».
- Upload réel de bout en bout (deux faux fichiers audio valides, ~300–500 Ko) : succès, apparition en tête de liste, retour à la page 1, champ fichier et titre vidés (y compris l'affichage natif de l'input), pistes de test supprimées après vérification via `DELETE /api/tracks/:id`.
- Formatage : tailles réelles affichées correctement (ex. « 584.7 Ko » au lieu de « 598969 Ko »), dates lisibles (« 24 sept. 2026 »).

**Erreurs ou propositions rejetées.** Aucune proposition alternative débattue cette fois : ce tour corrigeait des manques déjà identifiés et implémentait des demandes optionnelles explicites, sans ambiguïté de choix.

**Fichiers effectivement modifiés.** `track.service.ts`, `tracks-page.ts`, `tracks-page.html`, `tracks-page.css` — commit `151efac` (branche `tp-2`).

**Preuve de fonctionnement.** Voir « Vérifications réalisées » — tests réels effectués dans le navigateur (validations, upload complet, filtre), pas seulement une relecture du code.

**Ce que chaque membre sait maintenant expliquer sans l'agent.**
- Pourquoi dupliquer les règles de validation (format, taille) côté frontend n'est pas une redondance inutile : c'est le seul moyen d'offrir un retour instantané, tout en sachant que le backend réappliquera exactement les mêmes règles de son côté, pour de vrai cette fois (sécurité).
- Pourquoi `HttpClient` a besoin de `{ reportProgress: true, observe: 'events' }` pour exposer une progression, alors que l'appel « simple » ne renvoie que la réponse finale.
- Pourquoi vider un `<input type="file">` demande de manipuler directement l'élément du DOM (`nativeElement.value = ''`) : contrairement à un `<input text>` piloté par un `FormControl`, l'attribut `value` d'un input file ne peut pas être réécrit par data-binding (restriction de sécurité des navigateurs), d'où le besoin d'un `@ViewChild`.
