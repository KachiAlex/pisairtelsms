import { v4 as uuidv4 } from 'uuid';

interface SupportTicket {
  id: string;
  tenantId: string;
  ticketId: string;
  requester: string;
  topic: string;
  priority: 'high' | 'medium' | 'low';
  sla: string;
  channel: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AgentStatus {
  id: string;
  tenantId: string;
  name: string;
  queue: string;
  load: number;
  status: 'online' | 'assist' | 'offline';
  createdAt: Date;
  updatedAt: Date;
}

interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  coverage: string;
  state: 'active' | 'training' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TicketAssignment {
  id: string;
  ticketId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: Date;
  createdAt: Date;
}

const tickets: SupportTicket[] = [];
const agents: AgentStatus[] = [];
const rules: AutomationRule[] = [];
const comments: TicketComment[] = [];
const assignments: TicketAssignment[] = [];

export const supportTicketsApi = {
  // List support tickets
  listTickets: (tenantId: string, filters?: { status?: string; priority?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { status, priority, limit = 50, offset = 0 } = filters || {};

    let filtered = tickets.filter(t => t.tenantId === tenantId);
    if (status) filtered = filtered.filter(t => t.status === status);
    if (priority) filtered = filtered.filter(t => t.priority === priority);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create support ticket
  createTicket: (tenantId: string, payload: { requester: string; topic: string; priority: string; channel: string }) => {
    if (!tenantId || !payload.requester || !payload.topic) {
      throw new Error('Missing required fields');
    }

    const ticketId = `SUP-${uuidv4().substring(0, 4).toUpperCase()}`;

    const ticket: SupportTicket = {
      id: uuidv4(),
      tenantId,
      ticketId,
      requester: payload.requester,
      topic: payload.topic,
      priority: payload.priority as any,
      sla: '24h remaining',
      channel: payload.channel,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tickets.push(ticket);
    return ticket;
  },

  // Get ticket by ID
  getTicketById: (tenantId: string, ticketId: string) => {
    if (!tenantId || !ticketId) throw new Error('Missing required fields');

    const ticket = tickets.find(t => t.id === ticketId && t.tenantId === tenantId);
    if (!ticket) throw new Error('Ticket not found');

    const ticketComments = comments
      .filter(c => c.ticketId === ticketId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { ...ticket, comments: ticketComments };
  },

  // Update ticket
  updateTicket: (tenantId: string, ticketId: string, payload: { status?: string; priority?: string; sla?: string }) => {
    if (!tenantId || !ticketId) throw new Error('Missing required fields');

    const ticket = tickets.find(t => t.id === ticketId && t.tenantId === tenantId);
    if (!ticket) throw new Error('Ticket not found');

    if (payload.status) ticket.status = payload.status as any;
    if (payload.priority) ticket.priority = payload.priority as any;
    if (payload.sla) ticket.sla = payload.sla;
    ticket.updatedAt = new Date();

    return ticket;
  },

  // Add comment to ticket
  addComment: (tenantId: string, ticketId: string, userId: string, text: string) => {
    if (!tenantId || !ticketId || !userId || !text) {
      throw new Error('Missing required fields');
    }

    const ticket = tickets.find(t => t.id === ticketId && t.tenantId === tenantId);
    if (!ticket) throw new Error('Ticket not found');

    const comment: TicketComment = {
      id: uuidv4(),
      ticketId,
      userId,
      text,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    comments.push(comment);
    return comment;
  },

  // List agent status
  listAgents: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return agents
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create agent status
  createAgent: (tenantId: string, payload: { name: string; queue: string; load: number; status: string }) => {
    if (!tenantId || !payload.name) {
      throw new Error('Missing required fields');
    }

    const agent: AgentStatus = {
      id: uuidv4(),
      tenantId,
      name: payload.name,
      queue: payload.queue,
      load: payload.load,
      status: payload.status as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    agents.push(agent);
    return agent;
  },

  // List automation rules
  listRules: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return rules
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create automation rule
  createRule: (tenantId: string, payload: { name: string; coverage: string; state: string }) => {
    if (!tenantId || !payload.name) {
      throw new Error('Missing required fields');
    }

    const rule: AutomationRule = {
      id: uuidv4(),
      tenantId,
      name: payload.name,
      coverage: payload.coverage,
      state: payload.state as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    rules.push(rule);
    return rule;
  },

  // Get ticket statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantTickets = tickets.filter(t => t.tenantId === tenantId);
    const openTickets = tenantTickets.filter(t => t.status === 'open').length;
    const withinSLA = tenantTickets.filter(t => t.sla.includes('remaining')).length;

    return {
      openTickets,
      withinSLA: tenantTickets.length > 0 ? ((withinSLA / tenantTickets.length) * 100).toFixed(0) : '0',
      breachesToday: tenantTickets.filter(t => t.sla.includes('breached')).length,
      avgHandleTime: '28m',
    };
  },

  // Assign ticket to agent
  assignTicket: (tenantId: string, ticketId: string, assignedTo: string, assignedBy: string) => {
    if (!tenantId || !ticketId || !assignedTo) throw new Error('Missing required fields');

    const ticket = tickets.find(t => t.id === ticketId && t.tenantId === tenantId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.assignedTo = assignedTo;
    ticket.updatedAt = new Date();

    const assignment: TicketAssignment = {
      id: uuidv4(),
      ticketId,
      assignedTo,
      assignedBy,
      assignedAt: new Date(),
      createdAt: new Date(),
    };

    assignments.push(assignment);
    return { ticket, assignment };
  },

  // Get ticket assignment history
  getAssignmentHistory: (tenantId: string, ticketId: string) => {
    if (!tenantId || !ticketId) throw new Error('Missing required fields');

    const ticket = tickets.find(t => t.id === ticketId && t.tenantId === tenantId);
    if (!ticket) throw new Error('Ticket not found');

    return assignments
      .filter(a => a.ticketId === ticketId)
      .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
  },

  // Get tickets by status
  getTicketsByStatus: (tenantId: string, status: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId || !status) throw new Error('Missing required fields');

    const { limit = 50, offset = 0 } = filters || {};

    const filtered = tickets.filter(t => t.tenantId === tenantId && t.status === status);
    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Get tickets by priority
  getTicketsByPriority: (tenantId: string, priority: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId || !priority) throw new Error('Missing required fields');

    const { limit = 50, offset = 0 } = filters || {};

    const filtered = tickets.filter(t => t.tenantId === tenantId && t.priority === priority);
    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Get tickets assigned to agent
  getTicketsByAssignee: (tenantId: string, assignedTo: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId || !assignedTo) throw new Error('Missing required fields');

    const { limit = 50, offset = 0 } = filters || {};

    const filtered = tickets.filter(t => t.tenantId === tenantId && t.assignedTo === assignedTo);
    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Close ticket
  closeTicket: (tenantId: string, ticketId: string) => {
    if (!tenantId || !ticketId) throw new Error('Missing required fields');

    const ticket = tickets.find(t => t.id === ticketId && t.tenantId === tenantId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.status = 'closed';
    ticket.updatedAt = new Date();

    return ticket;
  },

  // Reopen ticket
  reopenTicket: (tenantId: string, ticketId: string) => {
    if (!tenantId || !ticketId) throw new Error('Missing required fields');

    const ticket = tickets.find(t => t.id === ticketId && t.tenantId === tenantId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.status = 'open';
    ticket.updatedAt = new Date();

    return ticket;
  },
};

export default supportTicketsApi;
