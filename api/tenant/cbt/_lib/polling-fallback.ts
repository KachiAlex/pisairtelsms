/**
 * Polling Fallback Service for Real-Time Monitoring
 * 
 * Provides polling-based real-time updates for environments that don't support WebSocket.
 * Implements exponential backoff on errors and reduces polling frequency when no changes detected.
 */

export interface PollingConfig {
  initialInterval: number; // milliseconds
  maxInterval: number; // milliseconds
  backoffMultiplier: number;
  noChangeThreshold: number; // number of polls with no changes before reducing frequency
}

export interface PollingState {
  examId: string;
  lastPollTime: number;
  currentInterval: number;
  noChangeCount: number;
  isActive: boolean;
  lastDataHash: string | null;
}

/**
 * Default polling configuration
 */
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  initialInterval: 3000, // 3 seconds
  maxInterval: 30000, // 30 seconds
  backoffMultiplier: 1.5,
  noChangeThreshold: 5, // After 5 polls with no changes, increase interval
};

/**
 * Polling Fallback Manager
 */
export class PollingFallbackManager {
  private pollingStates: Map<string, PollingState> = new Map();
  private config: PollingConfig;
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<PollingConfig> = {}) {
    this.config = { ...DEFAULT_POLLING_CONFIG, ...config };
  }

  /**
   * Start polling for an exam
   */
  startPolling(
    examId: string,
    onPoll: (examId: string) => Promise<void>
  ): void {
    if (this.pollingStates.has(examId)) {
      return; // Already polling
    }

    const state: PollingState = {
      examId,
      lastPollTime: Date.now(),
      currentInterval: this.config.initialInterval,
      noChangeCount: 0,
      isActive: true,
      lastDataHash: null,
    };

    this.pollingStates.set(examId, state);
    this.schedulePoll(examId, onPoll);
  }

  /**
   * Stop polling for an exam
   */
  stopPolling(examId: string): void {
    const state = this.pollingStates.get(examId);
    if (state) {
      state.isActive = false;
      this.pollingStates.delete(examId);
    }

    const timer = this.pollingTimers.get(examId);
    if (timer) {
      clearTimeout(timer);
      this.pollingTimers.delete(examId);
    }
  }

  /**
   * Schedule next poll
   */
  private schedulePoll(
    examId: string,
    onPoll: (examId: string) => Promise<void>
  ): void {
    const state = this.pollingStates.get(examId);
    if (!state || !state.isActive) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await onPoll(examId);
        state.lastPollTime = Date.now();

        // Schedule next poll
        this.schedulePoll(examId, onPoll);
      } catch (error) {
        // On error, apply exponential backoff
        this.applyBackoff(examId);

        // Retry with backoff
        this.schedulePoll(examId, onPoll);
      }
    }, state.currentInterval);

    this.pollingTimers.set(examId, timer);
  }

  /**
   * Apply exponential backoff on error
   */
  private applyBackoff(examId: string): void {
    const state = this.pollingStates.get(examId);
    if (!state) {
      return;
    }

    state.currentInterval = Math.min(
      state.currentInterval * this.config.backoffMultiplier,
      this.config.maxInterval
    );

    state.noChangeCount = 0; // Reset no-change counter on error
  }

  /**
   * Record data change (or lack thereof)
   */
  recordDataChange(examId: string, dataHash: string): void {
    const state = this.pollingStates.get(examId);
    if (!state) {
      return;
    }

    if (dataHash === state.lastDataHash) {
      // No change detected
      state.noChangeCount++;

      // If no changes for threshold polls, increase interval
      if (state.noChangeCount >= this.config.noChangeThreshold) {
        state.currentInterval = Math.min(
          state.currentInterval * this.config.backoffMultiplier,
          this.config.maxInterval
        );
        state.noChangeCount = 0;
      }
    } else {
      // Change detected, reset to initial interval
      state.currentInterval = this.config.initialInterval;
      state.noChangeCount = 0;
      state.lastDataHash = dataHash;
    }
  }

  /**
   * Get polling state for an exam
   */
  getPollingState(examId: string): PollingState | null {
    return this.pollingStates.get(examId) || null;
  }

  /**
   * Get all active polling states
   */
  getActivePolling(): PollingState[] {
    return Array.from(this.pollingStates.values()).filter((s) => s.isActive);
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.pollingTimers.forEach((timer) => clearTimeout(timer));
    this.pollingTimers.clear();
    this.pollingStates.clear();
  }
}

/**
 * Simple hash function for data comparison
 */
export function hashData(data: any): string {
  try {
    const json = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  } catch {
    return '';
  }
}

// Export singleton instance
export const pollingManager = new PollingFallbackManager();
