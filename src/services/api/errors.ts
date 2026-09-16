/** Erreurs typées : chaque écran décide quoi afficher à partir de `kind`. */
export type ApiErrorKind =
  | 'offline'
  | 'timeout'
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly details?: unknown;

  constructor(kind: ApiErrorKind, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }

  /** Un réessai a du sens : la cause est passagère, pas une erreur métier. */
  get isRetryable(): boolean {
    return this.kind === 'offline' || this.kind === 'timeout' || this.kind === 'network' || this.kind === 'server';
  }
}

export function errorFromStatus(status: number, body: unknown): ApiError {
  const message = extractMessage(body);
  if (status === 401) return new ApiError('unauthorized', message ?? 'Session expirée.', status, body);
  if (status === 403) return new ApiError('forbidden', message ?? 'Accès refusé.', status, body);
  if (status === 404) return new ApiError('notFound', message ?? 'Ressource introuvable.', status, body);
  if (status === 422 || status === 400) {
    return new ApiError('validation', message ?? 'Données invalides.', status, body);
  }
  if (status >= 500) return new ApiError('server', message ?? 'Le serveur est indisponible.', status, body);
  return new ApiError('unknown', message ?? 'Une erreur est survenue.', status, body);
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const candidate = (body as Record<string, unknown>).message ?? (body as Record<string, unknown>).error;
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return undefined;
}

/** Message affichable à l'utilisateur, en français, sans jargon technique. */
export function toUserMessage(error: unknown): string {
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
