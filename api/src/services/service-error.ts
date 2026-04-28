export class ServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ServiceError';
  }
}

export function asServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return error;
  }
  return null;
}
