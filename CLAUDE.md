# ilimiChat — contexte projet

Application de communication interne de l'Université ADU (Niamey, Niger), réservée aux
membres disposant d'une adresse e-mail officielle ADU. Pas d'inscription manuelle : le
compte est créé côté back à la première connexion validée.

## Stack
- **React Native CLI**, template blanc (RN 0.87), dossiers `android/` et `ios/` versionnés.
  Pas d'Expo.
- **JavaScript / JSX**, pas de TypeScript. Les formes de données sont documentées en
  JSDoc dans `src/types/models.js`.
- Navigation : **@react-navigation/native** (native-stack + bottom-tabs) — la seule
  dépendance ajoutée au template.
- État global : **store maison** (`src/store/createStore.js`, ~40 lignes sur
  `useSyncExternalStore`). API proche de Zustand, zéro dépendance.
- Temps réel : **WebSocket natif**, encapsulé dans `src/services/socket/`.
- API back : configuration dans `src/services/api/config.js`, back-end développé par Ibou.
- Maquettes : Figma « E-CHAT »

> Règle du socle : **rien d'autre que react-navigation** n'est installé.
> Tout ce qui demanderait une dépendance native (stockage persistant, galerie,
> caméra, fichiers, push) passe par un adaptateur dans `src/services/native/` et
> attend une validation — voir `docs/DEPENDANCES-A-VALIDER.md`.

## Qui fait quoi
Je suis Momo, développeur front. Adam est l'autre dev front. Ibou fait le back.

**Mon périmètre (le seul sur lequel tu interviens) :**
- Navigation de l'app, client API, wrapper socket, composant d'upload partagé
- Liste des conversations (ICH-013 à ICH-018)
- Messagerie privée (ICH-019 à ICH-028)
- Partage d'images et de fichiers (ICH-029 à ICH-033)
- Groupes (ICH-044 à ICH-051)
- Notifications côté app (ICH-052 à ICH-056)
- Tests de ces modules (ICH-109 à ICH-112), build et publication (ICH-118)

**Hors de mon périmètre — n'écris pas ce code, ne le refactorise pas :**
- Authentification, session, token, écran de démarrage (ICH-001 à ICH-007) → Adam
- Profil utilisateur (ICH-008 à ICH-012) → Adam
- Recherche et annuaire ADU (ICH-034 à ICH-043) → Adam
- ilimiMarket entier (ICH-057 à ICH-072) → Adam
- Paramètres (ICH-073 à ICH-079), blocage et signalement (ICH-084 à ICH-086) → Adam
- Toutes les API, la base de données, la sécurité serveur (ICH-080 à ICH-107) → Ibou

Si une tâche te fait toucher au code d'Adam, arrête-toi et dis-le moi au lieu de le modifier.

## Interfaces avec Adam
- Le store d'auth (token, refresh) est à Adam. Je le consomme via son hook, je ne le
  réécris pas. S'il n'existe pas encore, crée un mock isolé dans `src/mocks/`.
  → aujourd'hui : `src/mocks/authStore.js`, exposé par `useAuth()`.
- Mes écrans sont ouverts depuis les siens via `openConversation(userId)` — cette
  signature est figée, ne la change pas. → `src/navigation/openConversation.js`.
- Le composant d'upload d'images que j'écris est partagé avec lui : garde-le générique,
  sans logique propre à la messagerie. → `src/components/upload/`.
- L'annuaire ADU (ICH-040) est à Adam ; je le consomme via `src/mocks/directory.js`
  tant que son écran n'existe pas.
- Les préférences de notification sont exposées en service
  (`src/services/notifications/preferences.js`) pour que son écran Paramètres (ICH-075)
  les appelle sans que j'écrive son écran.

## Contraintes de contexte
- Utilisateurs au Niger : réseau souvent lent ou intermittent. Chaque écran doit gérer
  les états chargement / vide / erreur / hors-ligne, et les envois doivent être
  optimistes avec file de réessai.
- Budget data limité : compresse les images avant upload, pagine l'historique, ne
  recharge pas des listes entières sans raison.
- Téléphones Android d'entrée de gamme : attention aux re-rendus, listes virtualisées
  obligatoires.

## Règles de travail
- Une fonctionnalité à la fois, avec son ID de backlog dans le message de commit
  (ex. `feat(ICH-020): envoi de message texte`).
- N'invente pas d'endpoints. Si le contrat d'API est inconnu, demande-le-moi ou passe
  par la couche `src/services/api/` avec un mock explicite, jamais de données en dur
  dans un composant.
- Réutilise les composants du design system existant plutôt que d'en créer des variantes.
- Pas de dépendance nouvelle sans me demander d'abord.
- Ne lance pas de refactor large sans validation ; propose, attends ma réponse.
- Réponds-moi en français.

## Repères de code
- `src/services/api/` — client HTTP, erreurs typées, endpoints par domaine
- `src/services/socket/` — connexion, backoff, file d'émission, abonnements
- `src/services/native/` — adaptateurs vers ce qui demanderait une dépendance native
- `src/store/` — stores : conversations, messages, groupes
- `src/components/ui/` — design system (états vide/erreur/chargement, bandeau hors-ligne…)
- `src/mocks/` — tout ce qui appartient à Adam ou à Ibou et n'existe pas encore
- `docs/API-CONTRACT.md` — contrat supposé, à valider avec Ibou
- `docs/DEPENDANCES-A-VALIDER.md` — ce qui reste bloqué faute d'une dépendance
- `docs/ANOMALIES.md` — anomalies relevées sur mes modules
