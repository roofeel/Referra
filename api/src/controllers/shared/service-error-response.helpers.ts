import { asServiceError } from '../../services/service-error.js';

export function toServiceErrorResponse(error: unknown, fallbackMessage: string) {
  const serviceError = asServiceError(error);
  if (serviceError) {
    return Response.json({ error: serviceError.message }, { status: serviceError.status });
  }
  const message = error instanceof Error ? error.message : String(error);
  return Response.json({ error: `${fallbackMessage}: ${message}` }, { status: 500 });
}
