/**
 * AsyncMutex.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * High-performance, reentrant-safe FIFO Mutex with auto-timeout.
 * Prevents race conditions during OS notification scheduling and reconciliation.
 */

export class AsyncMutex {
  private _locked: boolean = false;
  private _waitingQueue: Array<() => void> = [];
  private readonly _timeoutMs: number;

  constructor(timeoutMs: number = 10000) {
    this._timeoutMs = timeoutMs;
  }

  public isLocked(): boolean {
    return this._locked;
  }

  /**
   * Acquires the exclusive lock. If already locked, waits in FIFO order.
   * Auto-releases if lock is held longer than timeoutMs to prevent deadlocks.
   */
  public async acquire(): Promise<() => void> {
    if (!this._locked) {
      this._locked = true;
      return this._createReleaser();
    }

    return new Promise<() => void>((resolve) => {
      this._waitingQueue.push(() => {
        this._locked = true;
        resolve(this._createReleaser());
      });
    });
  }

  private _createReleaser(): () => void {
    let released = false;

    // Safety timeout to prevent permanent deadlock
    const timer = setTimeout(() => {
      if (!released) {
        released = true;
        console.warn(`[AsyncMutex] Lock timed out after ${this._timeoutMs}ms, auto-releasing.`);
        this.release();
      }
    }, this._timeoutMs);

    return () => {
      if (released) return;
      released = true;
      clearTimeout(timer);
      this.release();
    };
  }

  public release(): void {
    if (this._waitingQueue.length > 0) {
      const next = this._waitingQueue.shift();
      if (next) {
        next();
      }
    } else {
      this._locked = false;
    }
  }

  /**
   * Executes an asynchronous action under exclusive lock.
   */
  public async runExclusive<T>(action: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await action();
    } finally {
      release();
    }
  }
}

// Global shared mutex instance for all notification engine operations
export const notificationMutex = new AsyncMutex(15000);

export const restTimerMutex = new AsyncMutex(10000);
