import { v4 as uuidv4 } from 'uuid';

interface PaymentGatewayConfig {
  id: string;
  tenantId: string;
  provider: 'stripe' | 'paystack';
  mode: 'test' | 'live';
  apiKey: string;
  secretKey: string;
  webhookUrl?: string;
  webhookSecret?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

interface Transaction {
  id: string;
  tenantId: string;
  gatewayId: string;
  provider: 'stripe' | 'paystack';
  referenceId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  studentId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface WebhookLog {
  id: string;
  tenantId: string;
  provider: 'stripe' | 'paystack';
  event: string;
  payload: Record<string, any>;
  processed: boolean;
  error?: string;
  createdAt: Date;
}

const paymentConfigs: PaymentGatewayConfig[] = [];
const transactions: Transaction[] = [];
const webhookLogs: WebhookLog[] = [];

export const paymentGatewayApi = {
  // Get payment gateway config
  getConfig: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const config = paymentConfigs.find(p => p.tenantId === tenantId && p.isActive);
    return config || null;
  },

  // Create or update payment gateway config
  upsertConfig: (tenantId: string, userId: string, payload: Partial<PaymentGatewayConfig>) => {
    if (!tenantId || !userId) throw new Error('Missing tenant or user ID');
    if (!payload.provider || !payload.apiKey || !payload.secretKey) {
      throw new Error('Missing required fields: provider, apiKey, secretKey');
    }

    // Deactivate existing config
    const existing = paymentConfigs.find(p => p.tenantId === tenantId && p.isActive);
    if (existing) {
      existing.isActive = false;
    }

    const config: PaymentGatewayConfig = {
      id: uuidv4(),
      tenantId,
      provider: payload.provider,
      mode: payload.mode || 'test',
      apiKey: payload.apiKey,
      secretKey: payload.secretKey,
      webhookUrl: payload.webhookUrl,
      webhookSecret: payload.webhookSecret,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    paymentConfigs.push(config);
    return config;
  },

  // Get all configs for tenant (including inactive)
  getAllConfigs: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return paymentConfigs
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Record transaction
  recordTransaction: (tenantId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const newTransaction: Transaction = {
      id: uuidv4(),
      tenantId,
      ...transaction,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    transactions.push(newTransaction);
    return newTransaction;
  },

  // Get transactions
  getTransactions: (tenantId: string, limit: number = 50, offset: number = 0, filters?: { status?: string; provider?: string }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    let filtered = transactions.filter(t => t.tenantId === tenantId);

    if (filters?.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters?.provider) {
      filtered = filtered.filter(t => t.provider === filters.provider);
    }

    const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const data = sorted.slice(offset, offset + limit);

    return {
      data,
      total: filtered.length,
      limit,
      offset,
    };
  },

  // Get transaction by reference
  getTransactionByReference: (tenantId: string, referenceId: string) => {
    if (!tenantId || !referenceId) throw new Error('Missing tenant or reference ID');

    return transactions.find(t => t.tenantId === tenantId && t.referenceId === referenceId) || null;
  },

  // Update transaction status
  updateTransactionStatus: (tenantId: string, transactionId: string, status: string, metadata?: Record<string, any>) => {
    if (!tenantId || !transactionId) throw new Error('Missing tenant or transaction ID');

    const transaction = transactions.find(t => t.tenantId === tenantId && t.id === transactionId);
    if (!transaction) throw new Error('Transaction not found');

    transaction.status = status as any;
    transaction.updatedAt = new Date();
    if (metadata) {
      transaction.metadata = { ...transaction.metadata, ...metadata };
    }

    return transaction;
  },

  // Log webhook
  logWebhook: (tenantId: string, provider: 'stripe' | 'paystack', event: string, payload: Record<string, any>) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const log: WebhookLog = {
      id: uuidv4(),
      tenantId,
      provider,
      event,
      payload,
      processed: false,
      createdAt: new Date(),
    };

    webhookLogs.push(log);
    return log;
  },

  // Get webhook logs
  getWebhookLogs: (tenantId: string, limit: number = 50, offset: number = 0) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const filtered = webhookLogs.filter(w => w.tenantId === tenantId);
    const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const data = sorted.slice(offset, offset + limit);

    return {
      data,
      total: filtered.length,
      limit,
      offset,
    };
  },

  // Mark webhook as processed
  markWebhookProcessed: (tenantId: string, webhookId: string, error?: string) => {
    if (!tenantId || !webhookId) throw new Error('Missing tenant or webhook ID');

    const log = webhookLogs.find(w => w.tenantId === tenantId && w.id === webhookId);
    if (!log) throw new Error('Webhook log not found');

    log.processed = true;
    if (error) log.error = error;

    return log;
  },

  // Get transaction statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantTransactions = transactions.filter(t => t.tenantId === tenantId);

    const totalAmount = tenantTransactions
      .filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);

    const successCount = tenantTransactions.filter(t => t.status === 'success').length;
    const failedCount = tenantTransactions.filter(t => t.status === 'failed').length;
    const pendingCount = tenantTransactions.filter(t => t.status === 'pending').length;

    return {
      totalAmount,
      successCount,
      failedCount,
      pendingCount,
      totalTransactions: tenantTransactions.length,
    };
  },
};

export default paymentGatewayApi;
