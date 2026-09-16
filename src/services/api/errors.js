/** Erreurs typées : chaque écran décide quoi afficher à partir de `kind`. */
export class ApiError extends Error {
  constructor(kind, message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }

  /** Un réessai a du sens : la cause est passagère, pas une erreur métier. */
  get isRetryable() {
    return (
      this.kind === 'offline' ||
      this.kind === 'timeout' ||
      this.kind === 'network' ||
      this.kind === 'server'
    );
  }
}

function extractMessage(body) {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const candidate = body.message || body.error;
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return undefined;
}

export function errorFromStatus(status, body) {
  const message = extractMessage(body);
  if (status === 401) return new ApiError('unauthorized', message || 'Session expirée.', status, body);
  if (status === 403) return new ApiError('forbidden', message || 'Accès refusé.', status, body);
  if (status === 404) return new ApiError('notFound', message || 'Ressource introuvable.', status, body);
  if (status === 422 || status === 400) {
    return new ApiError('validation', message || 'Données invalides.', status, body);
  }
  if (status >= 500) {
    return new ApiError('server', message || 'Le serveur est indisponible.', status, body);
  }
  return new ApiError('unknown', message || 'Une erreur est survenue.', status, body);
}

/** Message affichable à l'utilisateur, en français, sans jargon technique. */
export function toUserMessage(error) {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'offline':
        return 'Pas de connexion. Vos actions seront envoyées au retour du réseau.';
      case 'timeout':
        return 'Le réseau est trop lent, la demande a expiré. Réessayez.';
      case 'network':
        return 'Connexion instable. Réessayez dans un instant.';
      case 'unauthorized':
        return 'Votre session a expiré, reconnectez-vous.';
      case 'forbidden':
        return "Vous n'avez pas accès à cet élément.";
      case 'notFound':
        return 'Élément introuvable.';
      case 'server':
        return 'Le serveur est momentanément indisponible.';
      default:
        return error.message || 'Une erreur est survenue.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Une erreur est survenue.';
}
