import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MemoService {

  constructor(private readonly memoRepository: MemoRepository) {}
  
  async createMemo(createMemoDto: CreateMemoDto): Promise<Memo> {
    const memoId = uuidv4();
    const nodeId = uuidv4();
    
    const rootNode = new MemoNode({
      id: nodeId,
      memoId,
      version: 1,
      title: createMemoDto.title,
      content: createMemoDto.content,
      status: MemoStatus.SENT,
      senderId: createMemoDto.senderId,
      recipientId: createMemoDto.recipientId,
      actionType: MemoActionType.CREATED,
      actionById: createMemoDto.senderId,
      parentNodeIds: [],
      metadata: createMemoDto.metadata,
      createdAt: new Date(),
    });
    
    const memo = new Memo({
      id: memoId,
      currentNodeId: nodeId,
      rootNodeId: nodeId,
      nodes: new Map([[nodeId, rootNode]]),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return await this.memoRepository.saveMemo(memo);
  }
  
  async updateMemo(
    memoId: string,
    updateMemoDto: UpdateMemoDto,
    userId: string,
  ): Promise<Memo> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const currentNode = memo.nodes.get(memo.currentNodeId);
    const newNodeId = uuidv4();
    
    const newNode = new MemoNode({
      id: newNodeId,
      memoId,
      version: currentNode.version + 1,
      title: updateMemoDto.title ?? currentNode.title,
      content: updateMemoDto.content ?? currentNode.content,
      status: currentNode.status,
      senderId: currentNode.senderId,
      recipientId: currentNode.recipientId,
      assignedToId: currentNode.assignedToId,
      actionType: MemoActionType.UPDATED,
      actionById: userId,
      parentNodeIds: [memo.currentNodeId],
      metadata: { ...currentNode.metadata, ...updateMemoDto.metadata },
      createdAt: new Date(),
    });
    
    memo.nodes.set(newNodeId, newNode);
    memo.currentNodeId = newNodeId;
    memo.updatedAt = new Date();
    
    return await this.memoRepository.saveMemo(memo);
  }
  
  async assignMemo(
    memoId: string,
    assignMemoDto: AssignMemoDto,
  ): Promise<Memo> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const currentNode = memo.nodes.get(memo.currentNodeId);
    const newNodeId = uuidv4();
    
    const newNode = new MemoNode({
      id: newNodeId,
      memoId,
      version: currentNode.version + 1,
      title: currentNode.title,
      content: currentNode.content,
      status: MemoStatus.IN_PROGRESS,
      senderId: currentNode.senderId,
      recipientId: currentNode.recipientId,
      assignedToId: assignMemoDto.assignedToId,
      actionType: MemoActionType.ASSIGNED,
      actionById: assignMemoDto.assignedById,
      actionComment: assignMemoDto.comment,
      parentNodeIds: [memo.currentNodeId],
      metadata: currentNode.metadata,
      createdAt: new Date(),
    });
    
    memo.nodes.set(newNodeId, newNode);
    memo.currentNodeId = newNodeId;
    memo.updatedAt = new Date();
    
    return await this.memoRepository.saveMemo(memo);
  }
  
  async changeStatus(
    memoId: string,
    newStatus: MemoStatus,
    userId: string,
  ): Promise<Memo> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const currentNode = memo.nodes.get(memo.currentNodeId);
    const newNodeId = uuidv4();
    
    const newNode = new MemoNode({
      id: newNodeId,
      memoId,
      version: currentNode.version + 1,
      title: currentNode.title,
      content: currentNode.content,
      status: newStatus,
      senderId: currentNode.senderId,
      recipientId: currentNode.recipientId,
      assignedToId: currentNode.assignedToId,
      actionType: MemoActionType.STATUS_CHANGED,
      actionById: userId,
      parentNodeIds: [memo.currentNodeId],
      metadata: currentNode.metadata,
      createdAt: new Date(),
    });
    
    memo.nodes.set(newNodeId, newNode);
    memo.currentNodeId = newNodeId;
    memo.updatedAt = new Date();
    
    return await this.memoRepository.saveMemo(memo);
  }
  
  async getMemoHistory(memoId: string): Promise<MemoNode[]> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    return Array.from(memo.nodes.values()).sort((a, b) => a.version - b.version);
  }
  
  async getMemoAtVersion(memoId: string, version: number): Promise<MemoNode> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const node = Array.from(memo.nodes.values()).find(n => n.version === version);
    if (!node) {
      throw new NotFoundException(`Version ${version} not found`);
    }
    
    return node;
  }
  
  async getRevisionPath(memoId: string, fromVersion?: number): Promise<MemoNode[]> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const startNodeId = fromVersion
      ? Array.from(memo.nodes.values()).find(n => n.version === fromVersion)?.id
      : memo.rootNodeId;
    
    if (!startNodeId) {
      throw new NotFoundException('Start version not found');
    }
    
    const path: MemoNode[] = [];
    const visited = new Set<string>();
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      
      const node = memo.nodes.get(nodeId);
      if (!node) return;
      
      visited.add(nodeId);
      path.push(node);
      
      // Find children (nodes that have this node as parent)
      const children = Array.from(memo.nodes.values())
        .filter(n => n.parentNodeIds.includes(nodeId))
        .sort((a, b) => a.version - b.version);
      
      children.forEach(child => traverse(child.id));
    };
    
    traverse(startNodeId);
    return path;
  }
  
  async getCurrentMemo(memoId: string): Promise<MemoNode> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    return memo.nodes.get(memo.currentNodeId);
  }
  
  async getUserMemos(userId: string): Promise<Memo[]> {
    return await this.memoRepository.findMemosByUser(userId);
  }
  
  // ============================================
  // Git-like Checkout Operations
  // ============================================
  
  async checkoutVersion(memoId: string, version: number): Promise<MemoView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const targetNode = Array.from(memo.nodes.values()).find(n => n.version === version);
    if (!targetNode) {
      throw new NotFoundException(`Version ${version} not found`);
    }
    
    return this.buildMemoView(memo, targetNode);
  }
  
  async checkoutNode(memoId: string, nodeId: string): Promise<MemoView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const targetNode = memo.nodes.get(nodeId);
    if (!targetNode) {
      throw new NotFoundException('Node not found');
    }
    
    return this.buildMemoView(memo, targetNode);
  }
  
  async checkoutLatest(memoId: string): Promise<MemoView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const currentNode = memo.nodes.get(memo.currentNodeId);
    return this.buildMemoView(memo, currentNode);
  }
  
  async checkoutRoot(memoId: string): Promise<MemoView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const rootNode = memo.nodes.get(memo.rootNodeId);
    return this.buildMemoView(memo, rootNode);
  }
  
  async checkoutByTimestamp(memoId: string, timestamp: Date): Promise<MemoView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    // Find the latest node at or before the timestamp
    const nodes = Array.from(memo.nodes.values())
      .filter(n => n.createdAt <= timestamp)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (nodes.length === 0) {
      throw new NotFoundException('No version exists at or before the specified timestamp');
    }
    
    return this.buildMemoView(memo, nodes[0]);
  }
  
  async checkoutByAction(memoId: string, actionType: MemoActionType): Promise<MemoView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    // Find the latest node with the specified action type
    const nodes = Array.from(memo.nodes.values())
      .filter(n => n.actionType === actionType)
      .sort((a, b) => b.version - a.version);
    
    if (nodes.length === 0) {
      throw new NotFoundException(`No version with action type ${actionType} found`);
    }
    
    return this.buildMemoView(memo, nodes[0]);
  }
  
  async compareVersions(
    memoId: string,
    versionA: number,
    versionB: number,
  ): Promise<MemoComparison> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const nodeA = Array.from(memo.nodes.values()).find(n => n.version === versionA);
    const nodeB = Array.from(memo.nodes.values()).find(n => n.version === versionB);
    
    if (!nodeA || !nodeB) {
      throw new NotFoundException('One or both versions not found');
    }
    
    return {
      versionA: this.buildMemoView(memo, nodeA),
      versionB: this.buildMemoView(memo, nodeB),
      differences: this.computeDifferences(nodeA, nodeB),
      versionsBetween: Math.abs(versionB - versionA) - 1,
    };
  }
  
  async navigateNext(memoId: string, currentNodeId: string): Promise<MemoView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const currentNode = memo.nodes.get(currentNodeId);
    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }
    
    // Find next node (child in DAG)
    const nextNode = Array.from(memo.nodes.values())
      .filter(n => n.parentNodeIds.includes(currentNodeId))
      .sort((a, b) => a.version - b.version)[0];
    
    if (!nextNode) {
      throw new BadRequestException('No next version available');
    }
    
    return this.buildMemoView(memo, nextNode);
  }
  
  async navigatePrevious(memoId: string, currentNodeId: string): Promise<MemoView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const currentNode = memo.nodes.get(currentNodeId);
    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }
    
    if (currentNode.parentNodeIds.length === 0) {
      throw new BadRequestException('No previous version available');
    }
    
    // Get first parent (main history line)
    const previousNode = memo.nodes.get(currentNode.parentNodeIds[0]);
    if (!previousNode) {
      throw new NotFoundException('Previous node not found');
    }
    
    return this.buildMemoView(memo, previousNode);
  }
  
  async getTimelineView(memoId: string): Promise<TimelineView> {
    const memo = await this.memoRepository.findMemoById(memoId);
    if (!memo) {
      throw new NotFoundException('Memo not found');
    }
    
    const nodes = Array.from(memo.nodes.values()).sort((a, b) => a.version - b.version);
    
    return {
      memoId: memo.id,
      totalVersions: nodes.length,
      currentVersion: memo.nodes.get(memo.currentNodeId)?.version,
      timeline: nodes.map(node => ({
        nodeId: node.id,
        version: node.version,
        actionType: node.actionType,
        actionById: node.actionById,
        actionComment: node.actionComment,
        timestamp: node.createdAt,
        isCurrentVersion: node.id === memo.currentNodeId,
        hasBranches: this.getChildCount(memo, node.id) > 1,
      })),
    };
  }


  private buildMemoView(memo: Memo, node: MemoNode): MemoView {
    const allNodes = Array.from(memo.nodes.values()).sort((a, b) => a.version - b.version);
    const nextNode = allNodes.find(n => n.parentNodeIds.includes(node.id));
    const previousNode = node.parentNodeIds.length > 0 
      ? memo.nodes.get(node.parentNodeIds[0]) 
      : null;
    
    return {
      id: node.id,
      memoId: node.memoId,
      version: node.version,
      title: node.title,
      content: node.content,
      status: node.status,
      senderId: node.senderId,
      recipientId: node.recipientId,
      assignedToId: node.assignedToId,
      metadata: node.metadata,
      isCurrentVersion: node.id === memo.currentNodeId,
      totalVersions: memo.nodes.size,
      createdAt: memo.createdAt,
      lastModifiedAt: memo.updatedAt,
      nextVersionId: nextNode?.id,
      previousVersionId: previousNode?.id,
      canGoForward: !!nextNode,
      canGoBackward: !!previousNode,
      actionType: node.actionType,
      actionById: node.actionById,
      actionComment: node.actionComment,
      actionTimestamp: node.createdAt,
    };
  }
  
  private computeDifferences(nodeA: MemoNode, nodeB: MemoNode): MemoDifferences {
    return {
      titleChanged: nodeA.title !== nodeB.title,
      contentChanged: nodeA.content !== nodeB.content,
      statusChanged: nodeA.status !== nodeB.status,
      assignmentChanged: nodeA.assignedToId !== nodeB.assignedToId,
      metadataChanged: JSON.stringify(nodeA.metadata) !== JSON.stringify(nodeB.metadata),
      fields: {
        title: nodeA.title !== nodeB.title ? { from: nodeA.title, to: nodeB.title } : null,
        content: nodeA.content !== nodeB.content ? { from: nodeA.content, to: nodeB.content } : null,
        status: nodeA.status !== nodeB.status ? { from: nodeA.status, to: nodeB.status } : null,
        assignedTo: nodeA.assignedToId !== nodeB.assignedToId 
          ? { from: nodeA.assignedToId, to: nodeB.assignedToId } 
          : null,
      },
    };
  }
  
  private getChildCount(memo: Memo, nodeId: string): number {
    return Array.from(memo.nodes.values())
      .filter(n => n.parentNodeIds.includes(nodeId))
      .length;
  }

}
