/**
 * Authentication and Authorization Middleware Tests
 * Requirements: 5.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractAuthContext,
  verifyAuthentication,
  verifyInvigilatorRole,
  verifyAdminRole,
  verifyExamAccess,
  requireTenantAccess,
} from './auth-middleware';
import { NextApiRequest, NextApiResponse } from 'next';

describe('Authentication and Authorization Middleware', () => {
  describe('extractAuthContext', () => {
    it('should extract valid auth context from headers', () => {
      const req = {
        headers: {
          authorization: 'Bearer test-token-123',
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
          'x-user-role': 'invigilator',
        },
      } as unknown as NextApiRequest;

      const context = extractAuthContext(req);

      expect(context).not.toBeNull();
      expect(context?.userId).toBe('user-456');
      expect(context?.tenantId).toBe('tenant-123');
      expect(context?.role).toBe('invigilator');
      expect(context?.token).toBe('test-token-123');
    });

    it('should return null if authorization header is missing', () => {
      const req = {
        headers: {
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
          'x-user-role': 'invigilator',
        },
      } as unknown as NextApiRequest;

      const context = extractAuthContext(req);

      expect(context).toBeNull();
    });

    it('should return null if authorization header does not start with Bearer', () => {
      const req = {
        headers: {
          authorization: 'Basic test-token-123',
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
          'x-user-role': 'invigilator',
        },
      } as unknown as NextApiRequest;

      const context = extractAuthContext(req);

      expect(context).toBeNull();
    });

    it('should return null if tenant ID is missing', () => {
      const req = {
        headers: {
          authorization: 'Bearer test-token-123',
          'x-user-id': 'user-456',
          'x-user-role': 'invigilator',
        },
      } as unknown as NextApiRequest;

      const context = extractAuthContext(req);

      expect(context).toBeNull();
    });

    it('should return null if user ID is missing', () => {
      const req = {
        headers: {
          authorization: 'Bearer test-token-123',
          'x-tenant-id': 'tenant-123',
          'x-user-role': 'invigilator',
        },
      } as unknown as NextApiRequest;

      const context = extractAuthContext(req);

      expect(context).toBeNull();
    });

    it('should return null if user role is missing', () => {
      const req = {
        headers: {
          authorization: 'Bearer test-token-123',
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
        },
      } as unknown as NextApiRequest;

      const context = extractAuthContext(req);

      expect(context).toBeNull();
    });
  });

  describe('verifyAuthentication', () => {
    it('should return true for valid auth context', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'invigilator' as const,
        token: 'token-123',
      };

      const result = verifyAuthentication(authContext);

      expect(result).toBe(true);
    });

    it('should return false for null auth context', () => {
      const result = verifyAuthentication(null);

      expect(result).toBe(false);
    });

    it('should return false if user ID is empty', () => {
      const authContext = {
        userId: '',
        tenantId: 'tenant-123',
        role: 'invigilator' as const,
        token: 'token-123',
      };

      const result = verifyAuthentication(authContext);

      expect(result).toBe(false);
    });

    it('should return false if tenant ID is empty', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: '',
        role: 'invigilator' as const,
        token: 'token-123',
      };

      const result = verifyAuthentication(authContext);

      expect(result).toBe(false);
    });

    it('should return false if token is empty', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'invigilator' as const,
        token: '',
      };

      const result = verifyAuthentication(authContext);

      expect(result).toBe(false);
    });
  });

  describe('verifyInvigilatorRole', () => {
    it('should return true for invigilator role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'invigilator' as const,
        token: 'token-123',
      };

      const result = verifyInvigilatorRole(authContext);

      expect(result).toBe(true);
    });

    it('should return true for tenant_admin role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'tenant_admin' as const,
        token: 'token-123',
      };

      const result = verifyInvigilatorRole(authContext);

      expect(result).toBe(true);
    });

    it('should return true for super_admin role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'super_admin' as const,
        token: 'token-123',
      };

      const result = verifyInvigilatorRole(authContext);

      expect(result).toBe(true);
    });

    it('should return false for student role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'student' as const,
        token: 'token-123',
      };

      const result = verifyInvigilatorRole(authContext);

      expect(result).toBe(false);
    });

    it('should return false for staff role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'staff' as const,
        token: 'token-123',
      };

      const result = verifyInvigilatorRole(authContext);

      expect(result).toBe(false);
    });

    it('should return false for parent role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'parent' as const,
        token: 'token-123',
      };

      const result = verifyInvigilatorRole(authContext);

      expect(result).toBe(false);
    });
  });

  describe('verifyAdminRole', () => {
    it('should return true for tenant_admin role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'tenant_admin' as const,
        token: 'token-123',
      };

      const result = verifyAdminRole(authContext);

      expect(result).toBe(true);
    });

    it('should return true for super_admin role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'super_admin' as const,
        token: 'token-123',
      };

      const result = verifyAdminRole(authContext);

      expect(result).toBe(true);
    });

    it('should return false for invigilator role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'invigilator' as const,
        token: 'token-123',
      };

      const result = verifyAdminRole(authContext);

      expect(result).toBe(false);
    });

    it('should return false for student role', () => {
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'student' as const,
        token: 'token-123',
      };

      const result = verifyAdminRole(authContext);

      expect(result).toBe(false);
    });
  });

  describe('requireTenantAccess', () => {
    it('should return true if tenant IDs match', () => {
      const req = {} as NextApiRequest;
      const res = {} as NextApiResponse;
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'invigilator' as const,
        token: 'token-123',
      };

      const result = requireTenantAccess(req, res, authContext, 'tenant-123');

      expect(result).toBe(true);
    });

    it('should return false if tenant IDs do not match', () => {
      const req = {} as NextApiRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as NextApiResponse;
      const authContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'invigilator' as const,
        token: 'token-123',
      };

      const result = requireTenantAccess(req, res, authContext, 'tenant-456');

      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
