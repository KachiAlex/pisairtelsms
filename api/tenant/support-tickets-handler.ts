import type { VercelRequest, VercelResponse } from '@vercel/node';
import supportTicketsApi from './_lib/support-tickets';
import { requireRole } from '../_lib/auth-middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant';
  const userId = decoded.sub || decoded.email || 'unknown';
  const userName = decoded.email || userId;

  try {
    if (req.method === 'GET') {
      const { type, status, priority, id, limit, offset } = req.query;

      if (type === 'tickets') {
        const result = await supportTicketsApi.listTickets(tenantId, {
          status: status as string,
          priority: priority as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'ticket' && id) {
        const result = await supportTicketsApi.getTicketById(tenantId, id as string);
        return res.status(200).json(result);
      }

      if (type === 'agents') {
        const result = await supportTicketsApi.listAgents(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'rules') {
        const result = await supportTicketsApi.listRules(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics') {
        const result = await supportTicketsApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload, ticketId } = req.body || {};

      if (action === 'create-ticket') {
        const ticket = await supportTicketsApi.createTicket(tenantId, {
          ...payload,
          requester: userId,
          createdByName: userName,
        });
        return res.status(201).json(ticket);
      }

      if (action === 'update-ticket') {
        const ticket = await supportTicketsApi.updateTicket(tenantId, ticketId, payload);
        return res.status(200).json(ticket);
      }

      if (action === 'add-comment') {
        const comment = await supportTicketsApi.addComment(tenantId, ticketId, userId, payload.text, userName, decoded.role || 'tenant_admin');
        return res.status(201).json(comment);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in support tickets handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
