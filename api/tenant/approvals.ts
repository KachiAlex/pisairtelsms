import { v4 as uuidv4 } from 'uuid';

interface ApprovalRecord {
  id: string;
  tenantId: string;
  type: string;
  referenceId: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApprovalHistory {
  id: string;
  approvalId: string;
  action: 'created' | 'approved' | 'rejected';
  performedBy: string;
  reason?: string;
  createdAt: Date;
}

const approvals: ApprovalRecord[] = [];
const approvalHistory: ApprovalHistory[] = [];

export const approvalsApi = {
  // List pending approvals
  list: (tenantId: string, filters?: { type?: string; status?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { type, status = 'pending', limit = 50, offset = 0 } = filters || {};

    let filtered = approvals.filter(a => a.tenantId === tenantId && a.status === status);
    if (type) filtered = filtered.filter(a => a.type === type);

    const data = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create approval request
  create: (tenantId: string, userId: string, payload: { type: string; referenceId: string; description: string }) => {
    if (!tenantId || !userId || !payload.type || !payload.referenceId) {
      throw new Error('Missing required fields');
    }

    const approval: ApprovalRecord = {
      id: uuidv4(),
      tenantId,
      type: payload.type,
      referenceId: payload.referenceId,
      description: payload.description,
      status: 'pending',
      requestedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    approvals.push(approval);

    // Record history
    approvalHistory.push({
      id: uuidv4(),
      approvalId: approval.id,
      action: 'created',
      performedBy: userId,
      createdAt: new Date(),
    });

    return approval;
  },

  // Get approval by ID
  getById: (tenantId: string, id: string) => {
    const approval = approvals.find(a => a.id === id && a.tenantId === tenantId);
    if (!approval) throw new Error('Approval not found');
    return approval;
  },

  // Approve request
  approve: (tenantId: string, userId: string, id: string) => {
    if (!tenantId || !userId) throw new Error('Missing tenant or user ID');

    const approval = approvals.find(a => a.id === id && a.tenantId === tenantId);
    if (!approval) throw new Error('Approval not found');

    approval.status = 'approved';
    approval.approvedBy = userId;
    approval.updatedAt = new Date();

    approvalHistory.push({
      id: uuidv4(),
      approvalId: approval.id,
      action: 'approved',
      performedBy: userId,
      createdAt: new Date(),
    });

    return approval;
  },

  // Reject request
  reject: (tenantId: string, userId: string, id: string, reason: string) => {
    if (!tenantId || !userId) throw new Error('Missing tenant or user ID');

    const approval = approvals.find(a => a.id === id && a.tenantId === tenantId);
    if (!approval) throw new Error('Approval not found');

    approval.status = 'rejected';
    approval.rejectedBy = userId;
    approval.rejectionReason = reason;
    approval.updatedAt = new Date();

    approvalHistory.push({
      id: uuidv4(),
      approvalId: approval.id,
      action: 'rejected',
      performedBy: userId,
      reason,
      createdAt: new Date(),
    });

    return approval;
  },

  // Bulk approve
  bulkApprove: (tenantId: string, userId: string, ids: string[]) => {
    if (!tenantId || !userId || !Array.isArray(ids)) {
      throw new Error('Missing required fields');
    }

    const updated = approvals
      .filter(a => ids.includes(a.id) && a.tenantId === tenantId)
      .map(a => {
        a.status = 'approved';
        a.approvedBy = userId;
        a.updatedAt = new Date();

        approvalHistory.push({
          id: uuidv4(),
          approvalId: a.id,
          action: 'approved',
          performedBy: userId,
          createdAt: new Date(),
        });

        return a;
      });

    return { data: updated, count: updated.length };
  },

  // Bulk reject
  bulkReject: (tenantId: string, userId: string, ids: string[], reason: string) => {
    if (!tenantId || !userId || !Array.isArray(ids)) {
      throw new Error('Missing required fields');
    }

    const updated = approvals
      .filter(a => ids.includes(a.id) && a.tenantId === tenantId)
      .map(a => {
        a.status = 'rejected';
        a.rejectedBy = userId;
        a.rejectionReason = reason;
        a.updatedAt = new Date();

        approvalHistory.push({
          id: uuidv4(),
          approvalId: a.id,
          action: 'rejected',
          performedBy: userId,
          reason,
          createdAt: new Date(),
        });

        return a;
      });

    return { data: updated, count: updated.length };
  },

  // Get approval history
  getHistory: (tenantId: string, approvalId: string) => {
    const approval = approvals.find(a => a.id === approvalId && a.tenantId === tenantId);
    if (!approval) throw new Error('Approval not found');

    return approvalHistory
      .filter(h => h.approvalId === approvalId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
};

export default approvalsApi;


// Get approval statistics
export const getStatistics = (tenantId: string) => {
  if (!tenantId) throw new Error('Missing tenant ID');

  const tenantApprovals = approvals.filter(a => a.tenantId === tenantId);
  return {
    total: tenantApprovals.length,
    pending: tenantApprovals.filter(a => a.status === 'pending').length,
    approved: tenantApprovals.filter(a => a.status === 'approved').length,
    rejected: tenantApprovals.filter(a => a.status === 'rejected').length,
  };
};
