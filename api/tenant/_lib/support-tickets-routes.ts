import type { VercelRequest, VercelResponse } from '@vercel/node';
import supportTicketsApi from './support-tickets';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Missing tenant ID' });
  }

  try {
    if (req.method === 'GET') {
      const { type, status, priority, ticketId, limit, offset } = req.query;

      if (type === 'tickets') {
        const result = supportTicketsApi.listTickets(tenantId, {
          status: status as string,
          priority: priority as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'ticket' && ticketId) {
        const result = supportTicketsApi.getTicketById(tenantId, ticketId as string);
        return res.status(200).json(result);
      }

      if (type === 'agents') {
        const result = supportTicketsApi.listAgents(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'rules') {
        const result = supportTicketsApi.listRules(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics') {
        const result = supportTicketsApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload, ticketId, userId } = req.body;

      if (action === 'create-ticket') {
        const ticket = supportTicketsApi.createTicket(tenantId, payload);
        return res.status(201).json(ticket);
      }

      if (action === 'update-ticket') {
        const ticket = supportTicketsApi.updateTicket(tenantId, ticketId, payload);
        return res.status(200).json(ticket);
      }

      if (action === 'add-comment') {
        const comment = supportTicketsApi.addComment(tenantId, ticketId, userId, payload.text);
        return res.status(201).json(comment);
      }

      if (action === 'create-agent') {
        const agent = supportTicketsApi.createAgent(tenantId, payload);
        return res.status(201).json(agent);
      }

      if (action === 'create-rule') {
        const rule = supportTicketsApi.createRule(tenantId, payload);
        return res.status(201).json(rule);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in support tickets routes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
