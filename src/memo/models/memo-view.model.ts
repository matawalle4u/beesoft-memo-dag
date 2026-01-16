// src/memo/models/memo-view.model.ts

import { MemoActionType, MemoStatus } from '../entities/memo-node.entity';

/**
 * MemoView - Enriched view of a MemoNode with navigation metadata
 * Used for checkout operations and user-facing responses
 */
export class MemoView {
  // Core node data
  id: string;
  memoId: string;
  version: number;
  title: string;
  content: string;
  status: MemoStatus;
  senderId: string;
  recipientId: string;
  assignedToId?: string;
  metadata?: Record<string, any>;
  
  // Context information
  isCurrentVersion: boolean;
  totalVersions: number;
  createdAt: Date;
  lastModifiedAt: Date;
  
  // Navigation helpers
  nextVersionId?: string;
  previousVersionId?: string;
  canGoForward: boolean;
  canGoBackward: boolean;
  
  // Action history
  actionType: MemoActionType;
  actionById: string;
  actionComment?: string;
  actionTimestamp: Date;
}

/**
 * TimelineView - Complete timeline of all memo versions
 */
export interface TimelineView {
  memoId: string;
  totalVersions: number;
  currentVersion: number;
  timeline: TimelineEntry[];
}

/**
 * TimelineEntry - Single entry in the timeline
 */
export interface TimelineEntry {
  nodeId: string;
  version: number;
  actionType: MemoActionType;
  actionById: string;
  actionComment?: string;
  timestamp: Date;
  isCurrentVersion: boolean;
  hasBranches: boolean;
}

/**
 * MemoComparison - Result of comparing two versions
 */
export interface MemoComparison {
  versionA: MemoView;
  versionB: MemoView;
  differences: MemoDifferences;
  versionsBetween: number;
}

/**
 * MemoDifferences - Detailed differences between two versions
 */
export interface MemoDifferences {
  titleChanged: boolean;
  contentChanged: boolean;
  statusChanged: boolean;
  assignmentChanged: boolean;
  metadataChanged: boolean;
  fields: {
    title: { from: string; to: string } | null;
    content: { from: string; to: string } | null;
    status: { from: MemoStatus; to: MemoStatus } | null;
    assignedTo: { from: string; to: string } | null;
  };
}

/**
 * MemoListItem - Simplified view for listing memos
 */
export interface MemoListItem {
  id: string;
  currentVersion: number;
  totalVersions: number;
  title: string;
  status: MemoStatus;
  senderId: string;
  recipientId: string;
  assignedToId?: string;
  createdAt: Date;
  lastModifiedAt: Date;
}

/**
 * RevisionPathNode - Node in a revision path with parent/child info
 */
export interface RevisionPathNode {
  nodeId: string;
  version: number;
  title: string;
  actionType: MemoActionType;
  actionById: string;
  timestamp: Date;
  hasMultipleParents: boolean;
  hasMultipleChildren: boolean;
  depth: number;
}

/**
 * RevisionPath - Complete path through the DAG
 */
export interface RevisionPath {
  memoId: string;
  startVersion: number;
  endVersion: number;
  path: RevisionPathNode[];
  totalNodes: number;
}