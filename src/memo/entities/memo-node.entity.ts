export enum MemoActionType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ASSIGNED = 'ASSIGNED',
  COMMENTED = 'COMMENTED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

export enum MemoStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export class MemoNode {
  id: string;
  memoId: string; // Group ID for all versions
  version: number;

  title: string;
  content: string;
  status: MemoStatus;
  
  senderId: string;
  recipientId: string;
  assignedToId?: string;
  
 
  actionType: MemoActionType;
  actionById: string;
  actionComment?: string;

  parentNodeIds: string[]; // References to previous versions
  
  metadata?: Record<string, any>;
  createdAt: Date;
  
  constructor(partial: Partial<MemoNode>) {
    Object.assign(this, partial);
  }
}

export class Memo {
  id: string; // memoId
  currentNodeId: string; // Latest version
  rootNodeId: string; // First version
  nodes: Map<string, MemoNode>; // All versions
  createdAt: Date;
  updatedAt: Date;
  
  constructor(partial: Partial<Memo>) {
    Object.assign(this, partial);
    this.nodes = this.nodes || new Map();
  }
}
