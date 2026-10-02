# Rapport de tests — TP3

Date des exécutions : 2 octobre 2026. Branche `tp-3`. Aucun test ne dépend d'un backend ni d'une base MongoDB en fonctionnement.

## 1. Synthèse

| Suite | Commande | Résultat attendu | Résultat observé |
|---|---|---|---|
| Frontend (vitest + jsdom) | `cd frontend-starter && npm test` | tous les tests passent | **7 fichiers, 41 tests, 41 passés**, 0 échec, environ 7 s |
| Backend (node:test) | `cd backend && npm test` | tests existants + nouveaux passent | **14 tests, 14 passés**, 0 échec (2 existants + 12 nouveaux) |
| Build de production | `cd frontend-starter && npm run build` | build sans erreur | **OK** : `main.js` 480,65 kB (96,38 kB transférés), total initial 660,22 kB |

## 2. Tests frontend (41)

Méthode : `provideHttpClient()` + `provideHttpClientTesting()` ; `HttpTestingController` intercepte les requêtes en mémoire, vérifie URL, méthode, paramètres, en-têtes et corps, puis répond avec `flush()` ; `http.verify()` en fin de test fait échouer toute requête non prévue.

### `auth.service.spec.ts` (6)

| Test | Résultat attendu | Observé |
|---|---|---|
| `login()` envoie `POST /api/auth/login` | méthode POST, corps `{email, password}` | ✓ |
| `login()` mémorise le token | `token()` et `localStorage['gpc_token']` valent le token reçu ; utilisateur courant renseigné | ✓ |
| `login()` sur 401 | erreur propagée (401), aucun token mémorisé | ✓ |
| `register()` | `POST /api/auth/register` avec nom, email, mot de passe | ✓ |
| `profile()` | `GET /api/users/me` ; `currentUser()` mis à jour | ✓ |
| `logout()` | token, `localStorage` et utilisateur effacés | ✓ |

### `track.service.spec.ts` (5)

| Test | Résultat attendu | Observé |
|---|---|---|
| `list(2, 5)` | `GET /api/tracks`, paramètres `page=2`, `limit=5` | ✓ |
| `list()` par défaut | `page=1`, `limit=6` (constante `TRACKS_PER_PAGE`) | ✓ |
| `remove('abc123')` | `DELETE /api/tracks/abc123` | ✓ |
| `upload()` | `POST /api/tracks`, `reportUploadProgress`, `FormData` avec `audio` (le fichier) et `title` ; événements `UploadProgress` puis `Response` émis | ✓ |
| `audio('abc123')` | `GET /api/tracks/abc123/audio`, `responseType: 'blob'` | ✓ |

### `auth.interceptor.spec.ts` (4)

| Test | Résultat attendu | Observé |
|---|---|---|
| Token présent | en-tête `Authorization: Bearer jwt-test` | ✓ |
| Pas de token | aucun en-tête `Authorization` | ✓ |
| Réponse 401 | erreur propagée, token et `localStorage` effacés, redirection `/login` | ✓ |
| Réponse 404 | pas de déconnexion, pas de redirection | ✓ |

### `auth.guard.spec.ts` (3)

| Test | Résultat attendu | Observé |
|---|---|---|
| Avec token | retourne `true` | ✓ |
| Sans token | retourne un `UrlTree` qui se sérialise en `/login` | ✓ |
| Après `logout()` | retourne un `UrlTree` | ✓ |

### `audio-file.spec.ts` (6)

| Test | Résultat attendu | Observé |
|---|---|---|
| mp3 valide | `null` (pas d'erreur) | ✓ |
| `text/plain` | message contenant « Format non accepté » | ✓ |
| 26 Mo | message contenant « 25 Mo » | ✓ |
| exactement 25 Mo | `null` (limite incluse) | ✓ |
| `audioFormatLabel('audio/mpeg')`, `'audio/x-m4a'` | `MP3`, `M4A` | ✓ |
| type inconnu | affiché tel quel | ✓ |

### `tracks-page.spec.ts` (9)

| Test | Résultat attendu | Observé |
|---|---|---|
| Chargement initial | `GET /api/tracks?page=1&limit=6`, deux cartes affichées | ✓ |
| Échec HTTP 500 au chargement | `error()` = message du serveur, affiché dans le DOM (`.error`) | ✓ |
| Suppression confirmée | `DELETE /api/tracks/a`, `deletingId` = `a` pendant l'appel, puis `GET` de rechargement, SnackBar contenant le titre, `deletingId` remis à `null` | ✓ |
| Confirmation refusée | aucune requête `DELETE`, aucune notification | ✓ |
| Double clic | un seul `DELETE` envoyé | ✓ |
| Réponse 404 | SnackBar « n'existe plus », liste rechargée | ✓ |
| Erreur réseau (statut 0) | SnackBar « Suppression impossible », pas de rechargement, `deletingId` à `null` | ✓ |
| Dernière piste de la page 2 | rechargement de la page 1 | ✓ |
| Piste jouée supprimée | `URL.revokeObjectURL` appelée, `audioUrl` vide, piste courante `null` | ✓ |

### `track-upload.spec.ts` (8)

| Test | Résultat attendu | Observé |
|---|---|---|
| État initial | `idle`, bouton « Envoyer » désactivé | ✓ |
| Fichier non audio | état `error`, message « Format non accepté », aucun fichier retenu | ✓ |
| Pourcentage | 50/200 → 25 ; 199/200 → 100 ; état toujours `uploading` | ✓ |
| `total` inconnu | `progress()` = `null` (barre indéterminée) | ✓ |
| Pendant l'envoi | titre et champ fichier désactivés, bouton désactivé, second `upload()` n'envoie aucune requête | ✓ |
| Réussite | `success`, 100 %, titre vidé et réactivé, `uploaded` émis une fois, `FormData` contenant le titre saisi | ✓ |
| Après 4 s (horloge simulée) | retour à `idle`, message effacé | ✓ |
| Échec HTTP 400 | `error`, message du serveur, progression 0, titre réactivé, fichier conservé, `uploaded` non émis | ✓ |

## 3. Tests backend (14, dont 12 nouveaux)

Fichier `backend/test/security.test.js` ; `api.test.js` est inchangé. Aucune route n'est modifiée.

| Test | Résultat attendu | Observé |
|---|---|---|
| Sans JWT, 4 routes de pistes | 401 « Authentification requise » | ✓ |
| En-tête sans `Bearer` | 401 | ✓ |
| JWT invalide | 401 « Jeton invalide ou expiré » | ✓ |
| JWT signé avec un autre secret | 401 | ✓ |
| JWT expiré | 401 | ✓ |
| Upload sans fichier | 400 « Fichier audio requis » | ✓ |
| Upload `text/plain` | 400 « Format audio non accepté » | ✓ |
| Pagination `page=2&limit=5` | `skip 5`, `limit 5`, réponse `page 2`, `total 12`, `pages 3` | ✓ |
| Pagination `page=-3&limit=500` | page 1, limit 20, skip 0 | ✓ |
| `?ownerId=<autre>` dans la liste | filtre Mongo = propriétaire du JWT, paramètre ignoré | ✓ |
| `DELETE` de la piste d'un autre | 404 « Piste inconnue », requête Mongo avec l'`ownerId` de l'appelant | ✓ |
| Audio de la piste d'un autre | 404, filtré par `ownerId` | ✓ |

## 4. Les tests savent-ils échouer ? (contrôle par mutation manuelle)

Code cassé volontairement, test lancé, code restauré :

| Faute introduite | Résultat attendu | Observé |
|---|---|---|
| Intercepteur sans en-tête | au moins un test rouge | 1 test échoue |
| Garde anti double clic supprimée | test « double clic » rouge | échoue |
| Pourcentage mal calculé | test du pourcentage rouge | échoue |
| Guard qui retourne toujours `true` | tests de redirection rouges | 2 tests échouent |
| Backend : `ownerId` retiré du filtre de `DELETE` | test « piste d'un autre » rouge | échoue |

## 5. Vérifications manuelles dans le navigateur (serveurs réels)

| Scénario | Résultat attendu | Observé |
|---|---|---|
| Suppression avec double clic (requête ralentie) | un seul `DELETE`, carte atténuée, spinner, bouton bloqué | ✓ (capture `tp3-06`) |
| Suppression réussie | SnackBar « a été supprimée », liste rafraîchie | ✓ (`tp3-07`) |
| Suppression d'une piste déjà supprimée par ailleurs | SnackBar « n'existe plus », carte retirée | ✓ (`tp3-08`) |
| Upload (fichier de 60 Ko à 24 Mo) | champs bloqués, barre, puis succès et piste en tête de liste | ✓ (`tp3-09`, `tp3-10`) |
| Upload d'un fichier non audio | refus avant envoi avec message | ✓ (`tp3-11`) |
| XHR d'upload | événements `loadstart`, `progress` (loaded = total), réponse | ✓ |
| Console | aucune erreur inattendue, aucun JWT ni mot de passe journalisé | ✓ (seuls les codes HTTP sont journalisés) |
| Largeur 375 px | pas de défilement horizontal (`scrollWidth` = 375) | ✓ |

Les pistes de test ont été supprimées ensuite ; la bibliothèque est revenue à ses 7 pistes d'origine.

## 6. Ce qui n'est pas couvert (honnêteté)

- Pas de test de composant pour les pages de connexion, d'inscription et de profil (hors périmètre du sujet).
- Pas de test d'intégration avec une vraie base MongoDB : la pagination et la propriété des pistes sont vérifiées par des mocks du modèle, pas par une vraie requête Mongo.
- La progression intermédiaire d'un upload n'est visible dans le vrai navigateur qu'avec un débit limité ; en local elle saute presque à 100 %. Elle est vérifiée par les tests (`req.event(UploadProgress)`) et par l'observation de l'événement XHR réel.
- Les captures Network des DevTools (`DELETE`, upload) restent à prendre à la main : voir `preuves/README.md`.
