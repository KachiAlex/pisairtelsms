/**
 * Client-Side Security Service for CBT Exams
 * Implements copy/paste prevention, right-click prevention, and proctoring enforcement
 * Requirements: 5.3, 5.4, 5.2
 */

/**
 * Security event types
 */
export type SecurityEventType = 
  | 'copy_attempt'
  | 'paste_attempt'
  | 'right_click'
  | 'tab_switch'
  | 'camera_on'
  | 'camera_off'
  | 'suspicious_activity';

/**
 * Security event
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  details: Record<string, any>;
}

/**
 * Security event listener
 */
type SecurityEventListener = (event: SecurityEvent) => void;

/**
 * CBT Security Manager
 */
class CBTSecurityManager {
  private eventListeners: SecurityEventListener[] = [];
  private copyPasteDisabled = false;
  private rightClickDisabled = false;
  private proctoringEnabled = false;
  private cameraRequired = false;
  private tabSwitchMonitoring = false;
  private events: SecurityEvent[] = [];

  /**
   * Initialize security settings
   */
  public initialize(settings: {
    copyPasteDisabled?: boolean;
    rightClickDisabled?: boolean;
    proctoringEnabled?: boolean;
    cameraRequired?: boolean;
    tabSwitchMonitoring?: boolean;
  }): void {
    this.copyPasteDisabled = settings.copyPasteDisabled ?? false;
    this.rightClickDisabled = settings.rightClickDisabled ?? false;
    this.proctoringEnabled = settings.proctoringEnabled ?? false;
    this.cameraRequired = settings.cameraRequired ?? false;
    this.tabSwitchMonitoring = settings.tabSwitchMonitoring ?? false;

    // Only initialize DOM listeners if in browser environment
    if (typeof document === 'undefined') {
      return;
    }

    if (this.copyPasteDisabled) {
      this.disableCopyPaste();
    }

    if (this.rightClickDisabled) {
      this.disableRightClick();
    }

    if (this.tabSwitchMonitoring) {
      this.monitorTabSwitch();
    }

    if (this.proctoringEnabled) {
      this.initializeProctoring();
    }
  }

  /**
   * Disable copy functionality
   */
  private disableCopyPaste(): void {
    if (typeof document === 'undefined') {
      return;
    }

    // Disable copy
    document.addEventListener('copy', (e) => {
      e.preventDefault();
      this.recordEvent('copy_attempt', {
        timestamp: new Date().toISOString(),
        selectedText: window.getSelection()?.toString() || '',
      });
    });

    // Disable cut
    document.addEventListener('cut', (e) => {
      e.preventDefault();
      this.recordEvent('copy_attempt', {
        timestamp: new Date().toISOString(),
        action: 'cut',
      });
    });

    // Disable paste
    document.addEventListener('paste', (e) => {
      e.preventDefault();
      this.recordEvent('paste_attempt', {
        timestamp: new Date().toISOString(),
      });
    });

    // Disable keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+C, Ctrl+X, Ctrl+V
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x' || e.key === 'v')) {
        e.preventDefault();
        if (e.key === 'v') {
          this.recordEvent('paste_attempt', {
            timestamp: new Date().toISOString(),
            method: 'keyboard_shortcut',
          });
        } else {
          this.recordEvent('copy_attempt', {
            timestamp: new Date().toISOString(),
            method: 'keyboard_shortcut',
            action: e.key === 'c' ? 'copy' : 'cut',
          });
        }
      }
    });
  }

  /**
   * Disable right-click context menu
   */
  private disableRightClick(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.recordEvent('right_click', {
        timestamp: new Date().toISOString(),
        x: e.clientX,
        y: e.clientY,
      });
    });

    // Also disable right-click on specific elements
    document.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Right mouse button
        this.recordEvent('right_click', {
          timestamp: new Date().toISOString(),
          x: e.clientX,
          y: e.clientY,
          target: (e.target as HTMLElement).tagName,
        });
      }
    });
  }

  /**
   * Monitor tab switches
   */
  private monitorTabSwitch(): void {
    if (typeof document === 'undefined') {
      return;
    }

    // Monitor visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordEvent('tab_switch', {
          timestamp: new Date().toISOString(),
          action: 'tab_hidden',
        });
      } else {
        this.recordEvent('tab_switch', {
          timestamp: new Date().toISOString(),
          action: 'tab_visible',
        });
      }
    });

    // Monitor window blur/focus
    window.addEventListener('blur', () => {
      this.recordEvent('tab_switch', {
        timestamp: new Date().toISOString(),
        action: 'window_blur',
      });
    });

    window.addEventListener('focus', () => {
      this.recordEvent('tab_switch', {
        timestamp: new Date().toISOString(),
        action: 'window_focus',
      });
    });
  }

  /**
   * Initialize proctoring
   */
  private initializeProctoring(): void {
    if (this.cameraRequired) {
      this.checkCameraAvailability();
    }

    // Monitor for suspicious activity
    this.monitorSuspiciousActivity();
  }

  /**
   * Check camera availability
   */
  public async checkCameraAvailability(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((device) => device.kind === 'videoinput');

      if (hasCamera) {
        this.recordEvent('camera_on', {
          timestamp: new Date().toISOString(),
        });
      } else {
        this.recordEvent('camera_off', {
          timestamp: new Date().toISOString(),
        });
      }

      return hasCamera;
    } catch (error) {
      console.error('Failed to check camera availability:', error);
      this.recordEvent('camera_off', {
        timestamp: new Date().toISOString(),
        error: 'Failed to check camera',
      });
      return false;
    }
  }

  /**
   * Request camera access
   */
  public async requestCameraAccess(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.recordEvent('camera_on', {
        timestamp: new Date().toISOString(),
        action: 'camera_access_granted',
      });
      return stream;
    } catch (error) {
      console.error('Failed to access camera:', error);
      this.recordEvent('camera_off', {
        timestamp: new Date().toISOString(),
        error: 'Camera access denied',
      });
      return null;
    }
  }

  /**
   * Monitor for suspicious activity
   */
  private monitorSuspiciousActivity(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    // Monitor for developer tools
    let devToolsOpen = false;

    // Check for debugger
    const checkDevTools = () => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          this.recordEvent('suspicious_activity', {
            timestamp: new Date().toISOString(),
            type: 'developer_tools_detected',
          });
        }
      } else {
        devToolsOpen = false;
      }
    };

    setInterval(checkDevTools, 500);

    // Monitor for console access
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      this.recordEvent('suspicious_activity', {
        timestamp: new Date().toISOString(),
        type: 'console_access',
      });
      originalLog.apply(console, args);
    };
  }

  /**
   * Record a security event
   */
  private recordEvent(type: SecurityEventType, details: Record<string, any>): void {
    const event: SecurityEvent = {
      type,
      timestamp: new Date(),
      details,
    };

    this.events.push(event);

    // Notify listeners
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in security event listener:', error);
      }
    });
  }

  /**
   * Add event listener
   */
  public addEventListener(listener: SecurityEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: SecurityEventListener): void {
    this.eventListeners = this.eventListeners.filter((l) => l !== listener);
  }

  /**
   * Get recorded events
   */
  public getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Clear recorded events
   */
  public clearEvents(): void {
    this.events = [];
  }

  /**
   * Get events of a specific type
   */
  public getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  /**
   * Get events within a time range
   */
  public getEventsByTimeRange(startTime: Date, endTime: Date): SecurityEvent[] {
    return this.events.filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Export events as JSON
   */
  public exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Check if copy/paste is disabled
   */
  public isCopyPasteDisabled(): boolean {
    return this.copyPasteDisabled;
  }

  /**
   * Check if right-click is disabled
   */
  public isRightClickDisabled(): boolean {
    return this.rightClickDisabled;
  }

  /**
   * Check if proctoring is enabled
   */
  public isProctoringEnabled(): boolean {
    return this.proctoringEnabled;
  }

  /**
   * Check if camera is required
   */
  public isCameraRequired(): boolean {
    return this.cameraRequired;
  }
}

// Export singleton instance
export const cbtSecurityManager = new CBTSecurityManager();

/**
 * Initialize CBT security for an exam
 */
export function initializeCBTSecurity(settings: {
  copyPasteDisabled?: boolean;
  rightClickDisabled?: boolean;
  proctoringEnabled?: boolean;
  cameraRequired?: boolean;
  tabSwitchMonitoring?: boolean;
}): void {
  cbtSecurityManager.initialize(settings);
}

/**
 * Get security events
 */
export function getSecurityEvents(): SecurityEvent[] {
  return cbtSecurityManager.getEvents();
}

/**
 * Add security event listener
 */
export function addSecurityEventListener(listener: SecurityEventListener): void {
  cbtSecurityManager.addEventListener(listener);
}

/**
 * Remove security event listener
 */
export function removeSecurityEventListener(listener: SecurityEventListener): void {
  cbtSecurityManager.removeEventListener(listener);
}

/**
 * Check camera availability
 */
export async function checkCameraAvailability(): Promise<boolean> {
  return cbtSecurityManager.checkCameraAvailability();
}

/**
 * Request camera access
 */
export async function requestCameraAccess(): Promise<MediaStream | null> {
  return cbtSecurityManager.requestCameraAccess();
}
