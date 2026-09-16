/**
 * Accès à la galerie, à la caméra et aux fichiers.
 *
 * ⚠️ Rien de tout cela n'existe dans React Native nu : il faut
 * `react-native-image-picker` et `react-native-document-picker` (ou
 * `@react-native-documents/picker`), plus la configuration native
 * correspondante. Dépendances non ajoutées sans ton accord — voir
 * docs/DEPENDANCES-A-VALIDER.md.
 *
 * Ce module définit le contrat attendu par le reste de l'app. Tant qu'aucun
 * adaptateur n'est branché, la sélection échoue proprement avec un message
 * affichable, au lieu de faire planter l'écran.
 */
export class MediaUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MediaUnavailableError';
  }
}

const notConfigured = () => {
  throw new MediaUnavailableError(
    "La sélection de fichiers n'est pas encore branchée sur cette version de l'app."
  );
};

/**
 * Un adaptateur doit renvoyer soit `null` (annulation), soit
 * { uri, name, mimeType, sizeBytes, width, height }.
 */
const defaultAdapter = {
  pickImageFromLibrary: notConfigured,
  pickImageFromCamera: notConfigured,
  pickDocument: notConfigured,
  /** Compression : la lib d'image picker sait le faire, sinon on renvoie tel quel. */
  compressImage: async (source) => source,
};

let adapter = defaultAdapter;

export function setMediaAdapter(next) {
  adapter = { ...defaultAdapter, ...next };
}

export function isMediaAvailable() {
  return adapter !== defaultAdapter;
}

/** Largeur max et qualité : le forfait data est cher, on ne monte pas plus haut. */
export const IMAGE_COMPRESSION = { maxWidth: 1280, quality: 0.6 };

export async function pickImage(source, options = IMAGE_COMPRESSION) {
  const picked =
    source === 'camera'
      ? await adapter.pickImageFromCamera(options)
      : await adapter.pickImageFromLibrary(options);
  if (!picked) return null;
  return adapter.compressImage(picked, options);
}

export async function pickDocument() {
  return adapter.pickDocument();
}

export function __resetMediaForTests() {
  adapter = defaultAdapter;
}
