interface ObservabilityClient {
  track(event: string, properties?: Record<string, unknown>): void;
  error(error: Error, context?: Record<string, unknown>): void;
}

/**
 * Invoke track() on the client. O11y is best-effort: any exception thrown by
 * the client is swallowed so it cannot affect command success or exit code.
 */
const safeTrack = (
  client: ObservabilityClient,
  event: string,
  properties?: Record<string, unknown>,
): void => {
  try {
    client.track(event, properties);
  } catch {
    // O11y is best-effort; failures are intentionally swallowed
  }
};

/**
 * Invoke error() on the client. O11y is best-effort: any exception thrown by
 * the client is swallowed so it cannot affect command success or exit code.
 */
const safeError = (
  client: ObservabilityClient,
  error: Error,
  context?: Record<string, unknown>,
): void => {
  try {
    client.error(error, context);
  } catch {
    // O11y is best-effort; failures are intentionally swallowed
  }
};

export { safeError, safeTrack };
export type { ObservabilityClient };
