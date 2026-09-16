# Build et publication d'ilimiChat (ICH-118)

Projet **React Native CLI** (bare) : les dossiers `android/` et `ios/` font
partie du dépôt, les builds se font avec les outils natifs. Le back-end (Ibou) se
déploie à part.

## Prérequis

- Node ≥ 22.11, JDK 17, Android Studio (SDK + build-tools).
- Pour iOS : macOS, Xcode, CocoaPods (`cd ios && pod install`).

## Avant toute chose

- [ ] Brancher les adaptateurs natifs nécessaires (`docs/DEPENDANCES-A-VALIDER.md`) :
      sans eux, pas d'image, pas de fichier, pas de push, et la file d'envoi ne
      survit pas à la fermeture de l'app.
- [ ] Dans `src/services/api/config.js` : `useMocks: false`, et `baseUrl` /
      `socketUrl` pointant sur le serveur d'Ibou.
- [ ] Remplacer les icônes du template par les exports Figma « E-CHAT »
      (`android/app/src/main/res/mipmap-*`, `ios/ilimiChat/Images.xcassets`).
- [ ] Choisir l'identifiant d'application définitif. Le template génère
      `com.ilimichat` ; si l'ADU veut `ne.adu.ilimichat`, le changer dans
      `android/app/build.gradle` (`applicationId`, `namespace`) et dans Xcode
      (`PRODUCT_BUNDLE_IDENTIFIER`) **avant** la première publication : un
      identifiant publié ne peut plus être modifié.
- [ ] `npm run lint && npm test` au vert.
- [ ] Lire `docs/ANOMALIES.md`.

## Versionnage

Deux numéros, qui ne servent pas à la même chose :

- **Version visible** — `versionName` dans `android/app/build.gradle` et
  `MARKETING_VERSION` dans Xcode. Format `MAJEUR.MINEUR.CORRECTIF`, incrémentée à
  la main : mineur pour une livraison fonctionnelle (`1.1.0`), correctif pour une
  correction d'anomalie (`1.0.1`).
- **Numéro de build** — `versionCode` (Android) et `CURRENT_PROJECT_VERSION`
  (iOS). Entier, **strictement croissant à chaque envoi au store**, même pour un
  simple correctif : les stores refusent un numéro déjà utilisé.

Les deux numéros doivent être mis à jour ensemble, sur les deux plateformes.

## Builds

### Android

Signature — à faire une fois :

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ilimichat-release.keystore \
  -alias ilimichat -keyalg RSA -keysize 2048 -validity 10000
```

Le fichier `.keystore` et son mot de passe **ne vont pas dans le dépôt** : ils se
placent dans `~/.gradle/gradle.properties`. Perdre cette clé rend toute mise à
jour de l'application impossible : en garder une copie hors du poste de travail.

```bash
cd android
./gradlew assembleRelease   # APK, pour faire tester l'équipe
./gradlew bundleRelease     # .aab, pour le Play Store
```

Sorties dans `android/app/build/outputs/`.

### iOS

```bash
cd ios && pod install && cd ..
```

Puis dans Xcode : schéma `ilimiChat`, destination « Any iOS Device »,
**Product → Archive**, et envoi via l'Organizer. Nécessite un compte Apple
Developer et les profils de provisionnement de l'ADU.

## Tests avant publication

À faire sur un appareil réel, pas seulement sur émulateur :

1. Connexion, ouverture d'une conversation, envoi d'un message.
2. **Mode avion en plein envoi** : le message doit rester « en cours », puis
   partir au retour du réseau — et survivre à une fermeture de l'app, une fois le
   stockage persistant branché.
3. Réception d'un message avec l'app en arrière-plan : notification, puis tap →
   la bonne conversation s'ouvre.
4. Envoi d'une image et d'un fichier sur connexion bridée (les options
   développeur Android permettent de simuler de la 2G).
5. Création d'un groupe, ajout de membres, envoi d'un message de groupe.
6. Badge de non-lus cohérent entre l'onglet, l'icône de l'app et la liste.
7. Coupure puis retour du réseau pendant 30 s : vérifier que le fil se
   resynchronise sans doublon ni message manquant.

## Publication

- **Android** : Google Play Console, créer la fiche, remplir la politique de
  confidentialité et le questionnaire de classification, puis déposer le `.aab`.
- **iOS** : App Store Connect. Les justifications d'accès à la caméra et aux
  photos devront être renseignées au moment où l'adaptateur média sera branché.

Il n'y a pas de mise à jour OTA sur ce socle : chaque correctif, même purement
JavaScript, passe par un nouveau build et par la revue des stores. En tenir
compte dans le planning.

## Après publication

- [ ] Poser un tag git : `git tag v1.0.0 && git push origin v1.0.0`.
- [ ] Noter le numéro de build livré en face de la version.
- [ ] Surveiller les premiers retours sur la messagerie hors-ligne : c'est la
      partie la plus sensible au terrain.
