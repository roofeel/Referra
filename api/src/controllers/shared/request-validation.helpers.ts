import { z } from 'zod';
import { ServiceError } from '../../services/service-error.js';

function formatValidationError(error: z.ZodError) {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return 'Invalid request body';
  }

  const path = firstIssue.path.join('.');
  if (!path) {
    return firstIssue.message;
  }

  return `${path}: ${firstIssue.message}`;
}

export async function parseJsonBody<T>(req: Request, schema: z.ZodType<T>) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ServiceError(400, 'Invalid JSON body');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ServiceError(400, formatValidationError(result.error));
  }

  return result.data;
}
