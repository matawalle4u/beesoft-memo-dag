import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memo } from './entities/memo.entity';
import { MemoNode, MemoActionType, MemoStatus } from './entities/memo-node.entity';
import { CreateMemoDto } from './dto/create-memo.dto';
import { UpdateMemoDto } from './dto/update-memo.dto';
import { AssignMemoDto } from './dto/assign-memo.dto';
import { MemoView, TimelineView, MemoComparison, MemoDifferences } from './models/memo-view.model';

@Injectable()
export class MemoService {
  constructor(
    @InjectRepository(MemoNode)
    private readonly nodeRepository: Repository<MemoNode>,

    @InjectRepository(Memo)
    private readonly memoRepository: Repository<Memo>,
  ) {}

  async createMemo(createMemoDto: CreateMemoDto): Promise<Memo> {
    // Create root node
    const rootNode = this.nodeRepository.create({
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
    });

    // Create memo
    const memo = this.memoRepository.create({
      nodes: [rootNode],
    });

    // Save memo (cascade will save the node)
    const savedMemo = await this.memoRepository.save(memo);

    // Update memoId in node and set currentNodeId and rootNodeId
    rootNode.memoId = savedMemo.id;
    await this.nodeRepository.save(rootNode);

    savedMemo.currentNodeId = rootNode.id;
    savedMemo.rootNodeId = rootNode.id;
    
    return await this.memoRepository.save(savedMemo);
  }

  async updateMemo(
    memoId: string,
    updateMemoDto: UpdateMemoDto,
    userId: string,
  ): Promise<Memo> {
    const memo = await this.memoRepository.findOne({
      where: { id: memoId },
    });

    if (!memo) {
      throw new NotFoundException('Memo not found');
    }

    // Get current node
    const currentNode = await this.nodeRepository.findOne({
      where: { id: memo.currentNodeId },
    });

    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }

    // Create new node
    const newNode = this.nodeRepository.create({
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
    });

    const savedNode = await this.nodeRepository.save(newNode);

    // Update memo's current node
    memo.currentNodeId = savedNode.id;
    return await this.memoRepository.save(memo);
  }

  async assignMemo(
    memoId: string,
    assignMemoDto: AssignMemoDto,
  ): Promise<Memo> {
    const memo = await this.memoRepository.findOne({
      where: { id: memoId },
    });

    if (!memo) {
      throw new NotFoundException('Memo not found');
    }

    const currentNode = await this.nodeRepository.findOne({
      where: { id: memo.currentNodeId },
    });

    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }

    const newNode = this.nodeRepository.create({
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
    });

    const savedNode = await this.nodeRepository.save(newNode);

    memo.currentNodeId = savedNode.id;
    return await this.memoRepository.save(memo);
  }

  async changeStatus(
    memoId: string,
    newStatus: MemoStatus,
    userId: string,
  ): Promise<Memo> {
    const memo = await this.memoRepository.findOne({
      where: { id: memoId },
    });

    if (!memo) {
      throw new NotFoundException('Memo not found');
    }

    const currentNode = await this.nodeRepository.findOne({
      where: { id: memo.currentNodeId },
    });

    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }

    const newNode = this.nodeRepository.create({
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
    });

    const savedNode = await this.nodeRepository.save(newNode);

    memo.currentNodeId = savedNode.id;
    return await this.memoRepository.save(memo);
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  async getMemoHistory(memoId: string): Promise<MemoNode[]> {
    return await this.nodeRepository.find({
      where: { memoId },
      order: { version: 'ASC' },
    });
  }

  async getMemoAtVersion(memoId: string, version: number): Promise<MemoNode> {
    const node = await this.nodeRepository.findOne({
      where: { memoId, version },
    });

    if (!node) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    return node;
  }

  async getCurrentMemo(memoId: string): Promise<MemoNode> {
    const memo = await this.memoRepository.findOne({
      where: { id: memoId },
    });

    if (!memo) {
      throw new NotFoundException('Memo not found');
    }

    const currentNode = await this.nodeRepository.findOne({
      where: { id: memo.currentNodeId },
    });

    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }

    return currentNode;
  }

  async getUserMemos(userId: string): Promise<Memo[]> {
    // Get all nodes where user is involved
    const nodes = await this.nodeRepository
      .createQueryBuilder('node')
      .select('DISTINCT node.memoId', 'memoId')
      .where('node.senderId = :userId', { userId })
      .orWhere('node.recipientId = :userId', { userId })
      .orWhere('node.assignedToId = :userId', { userId })
      .getRawMany();

    const memoIds = nodes.map(n => n.memoId);

    if (memoIds.length === 0) {
      return [];
    }

    return await this.memoRepository.findByIds(memoIds);
  }

  async getRevisionPath(memoId: string, fromVersion?: number): Promise<MemoNode[]> {
    const allNodes = await this.nodeRepository.find({
      where: { memoId },
      order: { version: 'ASC' },
    });

    if (allNodes.length === 0) {
      throw new NotFoundException('Memo not found');
    }

    const startNode = fromVersion
      ? allNodes.find(n => n.version === fromVersion)
      : allNodes[0];

    if (!startNode) {
      throw new NotFoundException('Start version not found');
    }

    // Build node map
    const nodeMap = new Map<string, MemoNode>();
    allNodes.forEach(node => nodeMap.set(node.id, node));

    const path: MemoNode[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;

      const node = nodeMap.get(nodeId);
      if (!node) return;

      visited.add(nodeId);
      path.push(node);

      // Find children
      const children = allNodes
        .filter(n => n.parentNodeIds.includes(nodeId))
        .sort((a, b) => a.version - b.version);

      children.forEach(child => traverse(child.id));
    };

    traverse(startNode.id);
    return path;
  }

  // ============================================
  // CHECKOUT OPERATIONS
  // ============================================

  async checkoutVersion(memoId: string, version: number): Promise<MemoView> {
    const node = await this.getMemoAtVersion(memoId, version);
    return await this.buildMemoView(memoId, node);
  }

  async checkoutNode(memoId: string, nodeId: string): Promise<MemoView> {
    const node = await this.nodeRepository.findOne({
      where: { id: nodeId, memoId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return await this.buildMemoView(memoId, node);
  }

  async checkoutLatest(memoId: string): Promise<MemoView> {
    const currentNode = await this.getCurrentMemo(memoId);
    return await this.buildMemoView(memoId, currentNode);
  }

  async checkoutRoot(memoId: string): Promise<MemoView> {
    const memo = await this.memoRepository.findOne({
      where: { id: memoId },
    });

    if (!memo) {
      throw new NotFoundException('Memo not found');
    }

    const rootNode = await this.nodeRepository.findOne({
      where: { id: memo.rootNodeId },
    });

    if (!rootNode) {
      throw new NotFoundException('Root node not found');
    }

    return await this.buildMemoView(memoId, rootNode);
  }

  async checkoutByTimestamp(memoId: string, timestamp: Date): Promise<MemoView> {
    const nodes = await this.nodeRepository.find({
      where: { memoId },
      order: { createdAt: 'DESC' },
    });

    const node = nodes.find(n => n.createdAt <= timestamp);

    if (!node) {
      throw new NotFoundException('No version exists at or before the specified timestamp');
    }

    return await this.buildMemoView(memoId, node);
  }

  async checkoutByAction(memoId: string, actionType: MemoActionType): Promise<MemoView> {
    const node = await this.nodeRepository.findOne({
      where: { memoId, actionType },
      order: { version: 'DESC' },
    });

    if (!node) {
      throw new NotFoundException(`No version with action type ${actionType} found`);
    }

    return await this.buildMemoView(memoId, node);
  }

  async navigateNext(memoId: string, currentNodeId: string): Promise<MemoView> {
    const currentNode = await this.nodeRepository.findOne({
      where: { id: currentNodeId },
    });

    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }

    // Custom query to find children
    const children = await this.nodeRepository
      .createQueryBuilder('node')
      .where('node.memoId = :memoId', { memoId })
      .andWhere(':parentId = ANY(node.parentNodeIds)', { parentId: currentNodeId })
      .orderBy('node.version', 'ASC')
      .getMany();

    if (children.length === 0) {
      throw new BadRequestException('No next version available');
    }

    return await this.buildMemoView(memoId, children[0]);
  }

  async navigatePrevious(memoId: string, currentNodeId: string): Promise<MemoView> {
    const currentNode = await this.nodeRepository.findOne({
      where: { id: currentNodeId },
    });

    if (!currentNode || currentNode.parentNodeIds.length === 0) {
      throw new BadRequestException('No previous version available');
    }

    const previousNode = await this.nodeRepository.findOne({
      where: { id: currentNode.parentNodeIds[0] },
    });

    if (!previousNode) {
      throw new NotFoundException('Previous node not found');
    }

    return await this.buildMemoView(memoId, previousNode);
  }

  async compareVersions(
    memoId: string,
    versionA: number,
    versionB: number,
  ): Promise<MemoComparison> {
    const nodeA = await this.getMemoAtVersion(memoId, versionA);
    const nodeB = await this.getMemoAtVersion(memoId, versionB);

    return {
      versionA: await this.buildMemoView(memoId, nodeA),
      versionB: await this.buildMemoView(memoId, nodeB),
      differences: this.computeDifferences(nodeA, nodeB),
      versionsBetween: Math.abs(versionB - versionA) - 1,
    };
  }

  async getTimelineView(memoId: string): Promise<TimelineView> {
    const memo = await this.memoRepository.findOne({
      where: { id: memoId },
    });

    if (!memo) {
      throw new NotFoundException('Memo not found');
    }

    const nodes = await this.nodeRepository.find({
      where: { memoId },
      order: { version: 'ASC' },
    });

    const currentNode = await this.nodeRepository.findOne({
      where: { id: memo.currentNodeId },
    });

    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }

    return {
      memoId: memo.id,
      totalVersions: nodes.length,
      currentVersion: currentNode.version,
      timeline: nodes.map(node => ({
        nodeId: node.id,
        version: node.version,
        actionType: node.actionType,
        actionById: node.actionById,
        actionComment: node.actionComment,
        timestamp: node.createdAt,
        isCurrentVersion: node.id === memo.currentNodeId,
        hasBranches: false, // Can be calculated if needed
      })),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async buildMemoView(memoId: string, node: MemoNode): Promise<MemoView> {
    const memo = await this.memoRepository.findOne({
      where: { id: memoId },
    });

    if (!memo) {
      throw new NotFoundException('Memo not found');
    }

    const totalVersions = await this.nodeRepository.count({
      where: { memoId },
    });

    // Find next node
    const children = await this.nodeRepository
      .createQueryBuilder('node')
      .where('node.memoId = :memoId', { memoId })
      .andWhere(':parentId = ANY(node.parentNodeIds)', { parentId: node.id })
      .orderBy('node.version', 'ASC')
      .getMany();

    const nextNode = children[0];

    // Find previous node
    const previousNode = node.parentNodeIds.length > 0
      ? await this.nodeRepository.findOne({
          where: { id: node.parentNodeIds[0] },
        })
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
      totalVersions,
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
          ? { from: nodeA.assignedToId ?? '', to: nodeB.assignedToId ?? '' }
          : null,
      },
    };
  }
}