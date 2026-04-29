import * as Sentry from "@sentry/bun";

const sentryDsn = process.env.SENTRY_DSN;
const sentryEnabled = Boolean(sentryDsn);

export function initSentry() {
  if (!sentryEnabled) return;

  Sentry.init({
    dsn: sentryDsn
  });
}

export function captureApiException(error: unknown, req?: Request) {
  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    if (req) {
      const url = new URL(req.url);
      scope.setTag("http.method", req.method);
      scope.setTag("http.route", url.pathname);
      scope.setExtra("request_url", req.url);
    }
    Sentry.captureException(error);
  });
}
