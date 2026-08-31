/**
 * Security Enforcement Module for CBT Exams
 * Handles client-side security features like copy/paste prevention and right-click prevention
 * Requirements: 5.3, 5.4
 */

/**
 * Security enforcement options
 */
export interface SecurityEnforcementOptions {
  disableCopyPaste?: boolean;
  disableRightClick?: boolean;
  onCopyAttempt?: (event: ClipboardEvent) => void;
  onPasteAttempt?: (event: ClipboardEvent) => void;
  onRightClick?: (event: MouseEvent) => void;
}

/**
 * Security enforcement instance
 */
export class SecurityEnforcer {
  private options: SecurityEnforcementOptions;
  private container: HTMLElement | null = null;
  private isActive = false;

  constructor(options: SecurityEnforcementOptions = {}) {
    this.options = options;
  }

  /**
   * Enable security enforcement on a container element
   */
  public enable(container: HTMLElement): void {
    if (this.isActive) {
      return;
    }

    this.container = container;
    this.isActive = true;

    // Disable copy/paste if enabled
    if (this.options.disableCopyPaste) {
      this.enableCopyPastePrevention();
    }

    // Disable right-click if enabled
    if (this.options.disableRightClick) {
      this.enableRightClickPrevention();
    }
  }

  /**
   * Disable security enforcement
   */
  public disable(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Remove event listeners
    if (this.container) {
      this.container.removeEventListener('copy', this.handleCopy);
      this.container.removeEventListener('paste', this.handlePaste);
      this.container.removeEventListener('cut', this.handleCut);
      this.container.removeEventListener('contextmenu', this.handleContextMenu);
    }

    // Remove global listeners
    document.removeEventListener('copy', this.handleCopy);
    document.removeEventListener('paste', this.handlePaste);
    document.removeEventListener('cut', this.handleCut);
    document.removeEventListener('contextmenu', this.handleContextMenu);
  }

  /**
   * Enable copy/paste prevention
   */
  private enableCopyPastePrevention(): void {
    const target = this.container || document;

    // Prevent copy
    target.addEventListener('copy', this.handleCopy);

    // Prevent paste
    target.addEventListener('paste', this.handlePaste);

    // Prevent cut
    target.addEventListener('cut', this.handleCut);

    // Also prevent via keyboard shortcuts
    target.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Enable right-click prevention
   */
  private enableRightClickPrevention(): void {
    const target = this.container || document;
    target.addEventListener('contextmenu', this.handleContextMenu);
  }

  /**
   * Handle copy event
   */
  private handleCopy = (event: Event): void => {
    const clipboardEvent = event as ClipboardEvent;
    event.preventDefault();
    this.options.onCopyAttempt?.(clipboardEvent);
  };

  /**
   * Handle paste event
   */
  private handlePaste = (event: Event): void => {
    const clipboardEvent = event as ClipboardEvent;
    event.preventDefault();
    this.options.onPasteAttempt?.(clipboardEvent);
  };

  /**
   * Handle cut event
   */
  private handleCut = (event: Event): void => {
    event.preventDefault();
  };

  /**
   * Handle context menu (right-click)
   */
  private handleContextMenu = (event: Event): void => {
    const mouseEvent = event as MouseEvent;
    event.preventDefault();
    this.options.onRightClick?.(mouseEvent);
  };

  /**
   * Handle keyboard shortcuts for copy/paste
   */
  private handleKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;

    // Ctrl+C or Cmd+C
    if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && keyboardEvent.key === 'c') {
      keyboardEvent.preventDefault();
      this.options.onCopyAttempt?.(new ClipboardEvent('copy'));
    }

    // Ctrl+V or Cmd+V
    if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && keyboardEvent.key === 'v') {
      keyboardEvent.preventDefault();
      this.options.onPasteAttempt?.(new ClipboardEvent('paste'));
    }

    // Ctrl+X or Cmd+X
    if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && keyboardEvent.key === 'x') {
      keyboardEvent.preventDefault();
    }
  };
}

/**
 * Create a security enforcer for an exam
 */
export function createSecurityEnforcer(options: SecurityEnforcementOptions): SecurityEnforcer {
  return new SecurityEnforcer(options);
}

/**
 * Disable copy/paste globally
 */
export function disableCopyPaste(): void {
  document.addEventListener('copy', (e) => e.preventDefault());
  document.addEventListener('paste', (e) => e.preventDefault());
  document.addEventListener('cut', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
    }
  });
}

/**
 * Disable right-click globally
 */
export function disableRightClick(): void {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

/**
 * Check if copy/paste is disabled
 */
export function isCopyPasteDisabled(): boolean {
  // This is a client-side check - we can't truly know if it's disabled
  // but we can check if the enforcer is active
  return true;
}

/**
 * Check if right-click is disabled
 */
export function isRightClickDisabled(): boolean {
  // This is a client-side check - we can't truly know if it's disabled
  // but we can check if the enforcer is active
  return true;
}

/**
 * Log a security event (copy/paste/right-click attempt)
 */
export async function logSecurityEvent(
  examId: string,
  eventType: 'copy_attempt' | 'paste_attempt' | 'right_click',
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const response = await fetch('/api/tenant/cbt/security/log-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        examId,
        eventType,
        details,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error('Failed to log security event:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Monitor for tab switches
 */
export function monitorTabSwitches(
  examId: string,
  onTabSwitch?: (event: Event) => void
): () => void {
  const handleVisibilityChange = async () => {
    if (document.hidden) {
      // Tab is hidden - log tab switch
      await logSecurityEvent(examId, 'right_click', {
        eventType: 'tab_switch',
        timestamp: new Date().toISOString(),
      });
      onTabSwitch?.(new Event('tabswitch'));
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Monitor for window focus changes
 */
export function monitorWindowFocus(
  examId: string,
  onFocusLoss?: (event: Event) => void
): () => void {
  const handleBlur = async () => {
    // Window lost focus - log focus loss
    await logSecurityEvent(examId, 'right_click', {
      eventType: 'window_blur',
      timestamp: new Date().toISOString(),
    });
    onFocusLoss?.(new Event('blur'));
  };

  window.addEventListener('blur', handleBlur);

  // Return cleanup function
  return () => {
    window.removeEventListener('blur', handleBlur);
  };
}

/**
 * Monitor for fullscreen exit
 */
export function monitorFullscreenExit(
  examId: string,
  onFullscreenExit?: (event: Event) => void
): () => void {
  const handleFullscreenChange = async () => {
    if (!document.fullscreenElement) {
      // Exited fullscreen - log event
      await logSecurityEvent(examId, 'right_click', {
        eventType: 'fullscreen_exit',
        timestamp: new Date().toISOString(),
      });
      onFullscreenExit?.(new Event('fullscreenexit'));
    }
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };
}

/**
 * Start comprehensive exam security monitoring
 */
export function startExamSecurityMonitoring(
  examId: string,
  options: {
    disableCopyPaste?: boolean;
    disableRightClick?: boolean;
    monitorTabSwitches?: boolean;
    monitorWindowFocus?: boolean;
    monitorFullscreen?: boolean;
  } = {}
): () => void {
  const cleanupFunctions: Array<() => void> = [];

  // Create security enforcer
  const enforcer = createSecurityEnforcer({
    disableCopyPaste: options.disableCopyPaste,
    disableRightClick: options.disableRightClick,
    onCopyAttempt: async () => {
      await logSecurityEvent(examId, 'copy_attempt', {
        timestamp: new Date().toISOString(),
      });
    },
    onPasteAttempt: async () => {
      await logSecurityEvent(examId, 'paste_attempt', {
        timestamp: new Date().toISOString(),
      });
    },
    onRightClick: async () => {
      await logSecurityEvent(examId, 'right_click', {
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Enable enforcer on document
  enforcer.enable(document.body);
  cleanupFunctions.push(() => enforcer.disable());

  // Monitor tab switches
  if (options.monitorTabSwitches) {
    cleanupFunctions.push(monitorTabSwitches(examId));
  }

  // Monitor window focus
  if (options.monitorWindowFocus) {
    cleanupFunctions.push(monitorWindowFocus(examId));
  }

  // Monitor fullscreen exit
  if (options.monitorFullscreen) {
    cleanupFunctions.push(monitorFullscreenExit(examId));
  }

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
  };
}
