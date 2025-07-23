/**
 * Provides a safe, serialized way to fetch access/organization tokens from Logto,
 * preventing concurrent refresh attempts that would lead to `invalid_grant` errors ("refresh token already used").
 *
 * Why we need a semaphore:
 * Logto rotates refresh tokens on use (single-use by default). If two parts of your app
 * call getAccessToken (or getOrganizationToken) at the same time, they both attempt
 * to redeem the *same* refresh token and one will inevitably fail:
 * - Caller A redeems RT1 -> provider consumes RT1 -> returns AT2 + RT2
 * - Caller B redeems RT1 -> RT1 is already consumed -> throws InvalidGrant
 *
 * By serializing all token requests through a semaphore (mutex), we ensure only one
 * network request is in flight at any time, preventing the race and guaranteeing
 * every consumer receives the same fresh token.
 */
class Mutex {
  private _locking: Promise<void> = Promise.resolve();
  private _locks = 0;

  /**
   * Acquires the lock, runs the given function, and releases the lock.
   * @param fn The function to run inside the lock.
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    this._locks++;
    let resolveLock: (() => void) | undefined;
    const willLock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    // Wait for previous locks to release
    const previousLock = this._locking;
    this._locking = previousLock.then(() => willLock);

    try {
      // Wait for our turn
      await previousLock;
      return await fn();
    } finally {
      // Release our lock
      if (resolveLock) {
        resolveLock();
      }
      this._locks--;
    }
  }
}

// Export a single semaphore instance for all token requests
export const tokenMutex = new Mutex();
