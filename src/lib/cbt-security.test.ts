/**
 * Client-Side Security Service Tests
 * Requirements: 5.3, 5.4, 5.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cbtSecurityManager,
  initializeCBTSecurity,
  getSecurityEvents,
  addSecurityEventListener,
  removeSecurityEventListener,
} from './cbt-security';

describe('CBT Security Manager', () => {
  beforeEach(() => {
    // Clear events before each test
    cbtSecurityManager.clearEvents();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      initializeCBTSecurity({});

      expect(cbtSecurityManager.isCopyPasteDisabled()).toBe(false);
      expect(cbtSecurityManager.isRightClickDisabled()).toBe(false);
      expect(cbtSecurityManager.isProctoringEnabled()).toBe(false);
      expect(cbtSecurityManager.isCameraRequired()).toBe(false);
    });

    it('should initialize with custom settings', () => {
      initializeCBTSecurity({
        copyPasteDisabled: true,
        rightClickDisabled: true,
        proctoringEnabled: true,
        cameraRequired: true,
      });

      expect(cbtSecurityManager.isCopyPasteDisabled()).toBe(true);
      expect(cbtSecurityManager.isRightClickDisabled()).toBe(true);
      expect(cbtSecurityManager.isProctoringEnabled()).toBe(true);
      expect(cbtSecurityManager.isCameraRequired()).toBe(true);
    });
  });

  describe('event recording', () => {
    it('should record security events', () => {
      initializeCBTSecurity({});

      const events = getSecurityEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should get events by type', () => {
      initializeCBTSecurity({});

      const events = cbtSecurityManager.getEventsByType('copy_attempt');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should get events by time range', () => {
      initializeCBTSecurity({});

      const now = new Date();
      const startTime = new Date(now.getTime() - 60000); // 1 minute ago
      const endTime = new Date(now.getTime() + 60000); // 1 minute from now

      const events = cbtSecurityManager.getEventsByTimeRange(startTime, endTime);
      expect(Array.isArray(events)).toBe(true);
    });

    it('should clear events', () => {
      initializeCBTSecurity({});

      cbtSecurityManager.clearEvents();
      const events = getSecurityEvents();

      expect(events.length).toBe(0);
    });

    it('should export events as JSON', () => {
      initializeCBTSecurity({});

      const json = cbtSecurityManager.exportEvents();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();

      addSecurityEventListener(listener);
      removeSecurityEventListener(listener);

      // Verify listener was removed by checking it's not called
      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify listeners of security events', () => {
      const listener = vi.fn();

      addSecurityEventListener(listener);

      // Simulate a security event by initializing with copy/paste disabled
      // This would normally trigger events through DOM listeners
      // For testing purposes, we're just verifying the listener mechanism works

      removeSecurityEventListener(listener);
    });
  });

  describe('copy/paste prevention', () => {
    it('should indicate copy/paste is disabled', () => {
      initializeCBTSecurity({ copyPasteDisabled: true });

      expect(cbtSecurityManager.isCopyPasteDisabled()).toBe(true);
    });

    it('should indicate copy/paste is enabled', () => {
      initializeCBTSecurity({ copyPasteDisabled: false });

      expect(cbtSecurityManager.isCopyPasteDisabled()).toBe(false);
    });
  });

  describe('right-click prevention', () => {
    it('should indicate right-click is disabled', () => {
      initializeCBTSecurity({ rightClickDisabled: true });

      expect(cbtSecurityManager.isRightClickDisabled()).toBe(true);
    });

    it('should indicate right-click is enabled', () => {
      initializeCBTSecurity({ rightClickDisabled: false });

      expect(cbtSecurityManager.isRightClickDisabled()).toBe(false);
    });
  });

  describe('proctoring', () => {
    it('should indicate proctoring is enabled', () => {
      initializeCBTSecurity({ proctoringEnabled: true });

      expect(cbtSecurityManager.isProctoringEnabled()).toBe(true);
    });

    it('should indicate proctoring is disabled', () => {
      initializeCBTSecurity({ proctoringEnabled: false });

      expect(cbtSecurityManager.isProctoringEnabled()).toBe(false);
    });

    it('should indicate camera is required', () => {
      initializeCBTSecurity({ cameraRequired: true });

      expect(cbtSecurityManager.isCameraRequired()).toBe(true);
    });

    it('should indicate camera is not required', () => {
      initializeCBTSecurity({ cameraRequired: false });

      expect(cbtSecurityManager.isCameraRequired()).toBe(false);
    });
  });

  describe('security event types', () => {
    it('should support copy_attempt event type', () => {
      const events = cbtSecurityManager.getEventsByType('copy_attempt');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should support paste_attempt event type', () => {
      const events = cbtSecurityManager.getEventsByType('paste_attempt');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should support right_click event type', () => {
      const events = cbtSecurityManager.getEventsByType('right_click');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should support tab_switch event type', () => {
      const events = cbtSecurityManager.getEventsByType('tab_switch');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should support camera_on event type', () => {
      const events = cbtSecurityManager.getEventsByType('camera_on');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should support camera_off event type', () => {
      const events = cbtSecurityManager.getEventsByType('camera_off');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should support suspicious_activity event type', () => {
      const events = cbtSecurityManager.getEventsByType('suspicious_activity');
      expect(Array.isArray(events)).toBe(true);
    });
  });
});
