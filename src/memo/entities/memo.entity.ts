import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { MemoNode } from './memo-node.entity';

@Entity('memos')
export class Memo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  currentNodeId: string;

  @Column({ type: 'uuid' })
  rootNodeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relation to all nodes
  @OneToMany(() => MemoNode, (node) => node.memo, {
    cascade: true,
    eager: false,
  })
  nodes: MemoNode[];
}
