type LoginAttemptState = {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const attempts = new Map<string, LoginAttemptState>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

function now() {
  return Date.now();
}

function getState(key: string): LoginAttemptState {
  const existing = attempts.get(key);
  if (existing) {
    return existing;
  }

  const initial: LoginAttemptState = {
    count: 0,
    windowStartedAt: now(),
    blockedUntil: 0,
  };

  attempts.set(key, initial);
  return initial;
}

export function getLoginThrottleKey(ip: string | undefined, identifier: string) {
  const safeIp = String(ip || "unknown").trim();
  const safeIdentifier = identifier.trim().toLowerCase();
  return `${safeIp}:${safeIdentifier}`;
}

export function getLoginBlockInfo(key: string) {
  const state = getState(key);
  const currentTime = now();

  if (state.blockedUntil > currentTime) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((state.blockedUntil - currentTime) / 1000),
    };
  }

  return {
    blocked: false,
    retryAfterSeconds: 0,
  };
}

export function recordLoginFailure(key: string) {
  const state = getState(key);
  const currentTime = now();

  if (currentTime - state.windowStartedAt > WINDOW_MS) {
    state.count = 0;
    state.windowStartedAt = currentTime;
    state.blockedUntil = 0;
  }

  state.count += 1;

  if (state.count >= MAX_ATTEMPTS) {
    state.blockedUntil = currentTime + BLOCK_MS;
    state.count = 0;
    state.windowStartedAt = currentTime;
  }

  attempts.set(key, state);
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
