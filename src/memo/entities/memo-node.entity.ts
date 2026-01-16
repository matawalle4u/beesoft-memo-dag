import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Memo } from './memo.entity';

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

@Entity('memo_nodes')
@Index(['memoId', 'version'], { unique: true })
export class MemoNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  memoId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MemoStatus,
    default: MemoStatus.DRAFT,
  })
  status: MemoStatus;

  @Column({ type: 'uuid' })
  @Index()
  senderId: string;

  @Column({ type: 'uuid' })
  @Index()
  recipientId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  assignedToId?: string;

  @Column({
    type: 'enum',
    enum: MemoActionType,
  })
  actionType: MemoActionType;

  @Column({ type: 'uuid' })
  actionById: string;

  @Column({ type: 'text', nullable: true })
  actionComment?: string;

  // Store parent IDs as JSON array
  @Column({ type: 'simple-array' })
  parentNodeIds: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  // Optional: Add relation to Memo entity
  @ManyToOne(() => Memo, (memo) => memo.nodes)
  @JoinColumn({ name: 'memoId', referencedColumnName: 'id' })
  memo: Memo;
}
