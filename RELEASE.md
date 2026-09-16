# Build et publication d'ilimiChat (ICH-118)

Procédure pour l'application mobile. Le back-end (Ibou) se déploie à part.

## Avant toute chose

- [ ] Remplacer les icônes de remplacement par les exports Figma « E-CHAT »
      (voir `assets/README.md`).
- [ ] Renseigner `extra.eas.projectId` dans `app.json` (donné par `eas init`).
- [ ] Passer `EXPO_PUBLIC_USE_MOCKS=0` et vérifier `EXPO_PUBLIC_API_URL` /
      `EXPO_PUBLIC_SOCKET_URL` — ils sont déjà forcés dans les profils `preview`
      et `production` de `eas.json`.
- [ ] `npm run typecheck && npm test` au vert.
- [ ] Lire `docs/ANOMALIES.md` : certains points en attente touchent le contrat
      d'API et se voient en production avant de se voir en local.

## Versionnage

Deux numéros, qui ne servent pas à la même chose :

- `expo.version` (`app.json`) — version visible par l'utilisateur, `MAJEUR.MINEUR.CORRECTIF`.
  On l'incrémente à la main à chaque livraison.
- `android.versionCode` et `ios.buildNumber` — numéros de build, gérés
  automatiquement par EAS (`autoIncrement` sur le profil `production`). Ne pas y
  toucher à la main : les stores refusent un numéro déjà utilisé.

Convention : une livraison fonctionnelle incrémente le mineur (`1.1.0`), une
correction d'anomalie le correctif (`1.0.1`).

## Préparation

```bash
npm install
npm install -g eas-cli      # une seule fois
eas login
eas init                    # crée le projet EAS, renseigne projectId
```

## Builds

```bash
# APK interne, pour faire tester à l'équipe sans passer par le store
eas build --platform android --profile preview

# Livraison
eas build --platform android --profile production   # .aab pour le Play Store
eas build --platform ios --profile production       # nécessite un compte Apple Developer
```

Android d'abord : c'est la plateforme majoritaire à l'ADU, et c'est aussi celle
sur laquelle les contraintes de performance se voient.

## Tests avant publication

À faire sur un appareil réel, pas seulement sur émulateur :

1. Connexion, ouverture d'une conversation, envoi d'un message.
2. **Mode avion en plein envoi** : le message doit rester « en cours », puis
   partir au retour du réseau, y compris après avoir tué l'application.
3. Réception d'un message avec l'app en arrière-plan : notification, puis tap →
   la bonne conversation s'ouvre.
4. Envoi d'une image et d'un fichier, sur une connexion bridée (les outils
   développeur Android permettent de simuler de la 2G).
5. Création d'un groupe, ajout de membres, envoi d'un message de groupe.
6. Badge de non-lus cohérent entre l'onglet, l'icône de l'app et la liste.

## Publication

### Android (Play Store)

```bash
eas submit --platform android --profile production
```

Nécessite une clé de service Google Play (fichier JSON, à conserver hors du
dépôt). Première publication : créer la fiche, remplir la politique de
confidentialité et le questionnaire de classification.

### iOS (App Store)

```bash
eas submit --platform ios --profile production
```

Nécessite un compte Apple Developer. Prévoir les justifications d'accès à la
caméra et aux photos : elles sont déjà dans `app.json`, il faut les reprendre
telles quelles dans App Store Connect.

## Correctif urgent

Pour un correctif qui ne touche que du JavaScript, une mise à jour OTA évite de
repasser par la revue des stores :

```bash
eas update --branch production --message "correctif : <ce qui est corrigé>"
```

Une modification de `app.json`, des permissions ou d'une dépendance native exige
un nouveau build, pas une mise à jour OTA.

## Après publication

- [ ] Poser un tag git : `git tag v1.0.0 && git push origin v1.0.0`.
- [ ] Noter le numéro de build livré en face de la version.
- [ ] Surveiller les premiers retours sur la messagerie hors-ligne : c'est la
      partie la plus sensible au terrain.
