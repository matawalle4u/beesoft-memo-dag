# Memo Management System with DAG Architecture

A NestJS-based memo management system that implements version control using a Directed Acyclic Graph (DAG) architecture, similar to Git's commit history.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Concepts](#key-concepts)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Use Cases & Examples](#use-cases--examples)
- [Installation & Setup](#installation--setup)

---

## 🎯 Overview

This system allows users to:
- Create and manage memos with sender/recipient relationships
- Track complete revision history of every memo
- Assign memos to users for action
- Navigate through memo history like Git branches
- View memo state at any point in time
- Compare different versions

### Why DAG Architecture?

Unlike a simple linked list, a **Directed Acyclic Graph (DAG)** allows:
- ✅ Multiple branches of history (future extensibility)
- ✅ Immutable version history
- ✅ Efficient time-travel through versions
- ✅ Complete audit trail of all changes
- ✅ No data loss - every state is preserved

---

## 🏗️ Architecture

### DAG Structure Visualization

```
Version 1 (ROOT)                    Version 5
[CREATED]                           [ASSIGNED]
   │                                    │
   │                                    │
   ▼                                    ▼
Version 2                          Version 6
[UPDATED]                          [COMPLETED]
   │                                    │
   │                                    │
   ▼                                    │
Version 3                               │
[ASSIGNED] ◄────────────────────────────┘
   │
   │
   ▼
Version 4
[UPDATED]

Each node stores:
- Complete memo content
- Action metadata
- Parent references
- Timestamp
- Actor information
```

### Linear History Example

```
┌─────────────────────────────────────────────────────────────┐
│  MEMO LIFECYCLE                                             │
└─────────────────────────────────────────────────────────────┘

Version 1                    Version 2                   Version 3
┌──────────┐                ┌──────────┐               ┌──────────┐
│ CREATED  │───────────────►│ UPDATED  │──────────────►│ ASSIGNED │
│          │                │          │               │          │
│ Sender:  │                │ Changed  │               │ Assigned │
│  Alice   │                │ content  │               │ to: Bob  │
│          │                │          │               │          │
│ To: Bob  │                │ By:Alice │               │ By: Bob  │
└──────────┘                └──────────┘               └──────────┘
   parent: []               parent: [v1]              parent: [v2]
```

### Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMO WORKFLOW                            │
└─────────────────────────────────────────────────────────────┘

    USER ACTIONS                    SYSTEM CREATES
    
    Alice creates memo          ──►  Version 1 [CREATED]
    "Project Update"                 Status: SENT
                                     Sender: Alice
                                     Recipient: Bob
                                          │
                                          │
                                          ▼
    Alice updates content       ──►  Version 2 [UPDATED]
    (adds more details)              Parent: [Version 1]
                                     Status: SENT
                                          │
                                          │
                                          ▼
    Bob assigns to Carol        ──►  Version 3 [ASSIGNED]
    (for review)                     Parent: [Version 2]
                                     AssignedTo: Carol
                                     Status: IN_PROGRESS
                                          │
                                          │
                                          ▼
    Carol updates content       ──►  Version 4 [UPDATED]
    (adds findings)                  Parent: [Version 3]
                                     Status: IN_PROGRESS
                                          │
                                          │
                                          ▼
    Carol marks complete        ──►  Version 5 [STATUS_CHANGED]
                                     Parent: [Version 4]
                                     Status: COMPLETED


┌─────────────────────────────────────────────────────────────┐
│  AT ANY POINT: You can "checkout" any version to see        │
│  exactly what the memo looked like at that moment!          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Concepts

### 1. **Immutable History**

Every action creates a **new node** instead of modifying existing data:

```
❌ WRONG (Mutable):
┌──────────┐
│  Memo    │  ← Content gets overwritten
│ v1 → v2  │  ← Lost previous state
└──────────┘

✅ CORRECT (Immutable):
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Memo v1 │───►│  Memo v2 │───►│  Memo v3 │
│ (kept)   │    │ (kept)   │    │ (kept)   │
└──────────┘    └──────────┘    └──────────┘
```

### 2. **Parent-Child Relationships**

Each node knows its parent(s):

```
Node Structure:
{
  id: "node-uuid-3",
  version: 3,
  parentNodeIds: ["node-uuid-2"],  ← Link to previous version
  content: "Updated content",
  actionType: "UPDATED",
  createdAt: "2024-01-15T10:30:00Z"
}
```

### 3. **Time Travel (Checkout)**

Navigate history like Git:

```
TIMELINE VIEW:
════════════════════════════════════════════════════════════

v1 ────► v2 ────► v3 ────► v4 ────► v5 (current)
│        │        │        │        │
│        │        │        │        └─ You are here
│        │        │        │
│        │        │        └─────────── checkout(v4)
│        │        │
│        │        └────────────────────── checkout(v3)
│        │
│        └─────────────────────────────── checkout(v2)
│
└──────────────────────────────────────── checkout(v1)
```

### 4. **Action Types**

Every version records what happened:

| Action Type | Description | Example |
|-------------|-------------|---------|
| `CREATED` | Initial memo creation | Alice creates "Q1 Report" |
| `UPDATED` | Content/title changed | Bob edits the content |
| `ASSIGNED` | Assigned to someone | Carol assigns to David |
| `STATUS_CHANGED` | Workflow status changed | David marks as COMPLETED |
| `COMMENTED` | Comment added | Eve adds feedback |

### 5. **Status Flow**

```
┌────────┐     ┌────────┐     ┌──────────────┐     ┌───────────┐
│ DRAFT  │────►│  SENT  │────►│ IN_PROGRESS  │────►│ COMPLETED │
└────────┘     └────────┘     └──────────────┘     └───────────┘
                                                           │
                                                           ▼
                                                     ┌──────────┐
                                                     │ ARCHIVED │
                                                     └──────────┘
```

---

## 📊 Data Model

### Core Entities

#### **MemoNode** (Individual Version)
```typescript
{
  id: string;              // Unique node ID
  memoId: string;          // Group ID (all versions share this)
  version: number;         // 1, 2, 3, etc.
  
  // Content (snapshot at this version)
  title: string;
  content: string;
  status: MemoStatus;
  
  // Participants
  senderId: string;
  recipientId: string;
  assignedToId?: string;
  
  // Action info
  actionType: MemoActionType;
  actionById: string;
  actionComment?: string;
  
  // DAG structure
  parentNodeIds: string[];  // Links to previous version(s)
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

#### **Memo** (Container for all versions)
```typescript
{
  id: string;                      // memoId
  currentNodeId: string;           // Latest version
  rootNodeId: string;              // First version
  nodes: Map<string, MemoNode>;    // All versions
  createdAt: Date;
  updatedAt: Date;
}
```

### Visual Representation

```
┌─────────────────────────────────────────────────────────────┐
│                         MEMO                                │
│  id: "memo-abc123"                                          │
│  rootNodeId: "node-v1"                                      │
│  currentNodeId: "node-v4"                                   │
│                                                             │
│  nodes: {                                                   │
│    "node-v1": MemoNode { version: 1, parentIds: [] }       │
│    "node-v2": MemoNode { version: 2, parentIds: [v1] }     │
│    "node-v3": MemoNode { version: 3, parentIds: [v2] }     │
│    "node-v4": MemoNode { version: 4, parentIds: [v3] }     │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Reference

### Core Operations

#### 1. Create Memo
```http
POST /memos
Content-Type: application/json

{
  "title": "Q1 Budget Review",
  "content": "Initial draft of budget...",
  "senderId": "alice-123",
  "recipientId": "bob-456"
}
```

**Response:**
```json
{
  "id": "memo-abc",
  "currentNodeId": "node-v1",
  "rootNodeId": "node-v1",
  "nodes": {
    "node-v1": {
      "version": 1,
      "title": "Q1 Budget Review",
      "status": "SENT",
      "actionType": "CREATED"
    }
  }
}
```

#### 2. Update Memo
```http
PUT /memos/:id?userId=alice-123
Content-Type: application/json

{
  "title": "Q1 Budget Review - Updated",
  "content": "Revised budget details..."
}
```

**Creates Version 2** with parent reference to Version 1

#### 3. Assign Memo
```http
POST /memos/:id/assign
Content-Type: application/json

{
  "assignedToId": "carol-789",
  "assignedById": "bob-456",
  "comment": "Please review the financials"
}
```

**Creates new version** with assignment details

### Checkout Operations (Git-like)

#### 4. Checkout Latest (HEAD)
```http
GET /memos/:id/checkout/latest
```

**Response:**
```json
{
  "id": "node-v4",
  "version": 4,
  "title": "Q1 Budget Review - Final",
  "content": "...",
  "isCurrentVersion": true,
  "totalVersions": 4,
  "canGoForward": false,
  "canGoBackward": true,
  "previousVersionId": "node-v3"
}
```

#### 5. Checkout Specific Version
```http
GET /memos/:id/checkout/version/2
```

View memo as it was at version 2

#### 6. Checkout by Timestamp
```http
GET /memos/:id/checkout/timestamp?timestamp=2024-01-15T10:30:00Z
```

View memo as it existed at specific time

#### 7. Checkout by Action Type
```http
GET /memos/:id/checkout/action/ASSIGNED
```

Jump to last assignment event

### Navigation

#### 8. Navigate Forward
```http
GET /memos/:id/navigate/next/:currentNodeId
```

Move to next version (like `git log` → newer)

#### 9. Navigate Backward
```http
GET /memos/:id/navigate/previous/:currentNodeId
```

Move to previous version (like `git log` → older)

### Analysis

#### 10. Timeline View
```http
GET /memos/:id/timeline
```

**Response:**
```json
{
  "memoId": "memo-abc",
  "totalVersions": 4,
  "currentVersion": 4,
  "timeline": [
    {
      "nodeId": "node-v1",
      "version": 1,
      "actionType": "CREATED",
      "actionById": "alice-123",
      "timestamp": "2024-01-15T09:00:00Z",
      "isCurrentVersion": false
    },
    {
      "nodeId": "node-v2",
      "version": 2,
      "actionType": "UPDATED",
      "actionById": "alice-123",
      "timestamp": "2024-01-15T10:30:00Z",
      "isCurrentVersion": false
    }
  ]
}
```

#### 11. Compare Versions
```http
GET /memos/:id/compare?versionA=1&versionB=3
```

**Response:**
```json
{
  "versionA": { /* MemoView */ },
  "versionB": { /* MemoView */ },
  "differences": {
    "titleChanged": true,
    "contentChanged": true,
    "statusChanged": true,
    "fields": {
      "title": {
        "from": "Q1 Budget Review",
        "to": "Q1 Budget Review - Updated"
      },
      "status": {
        "from": "SENT",
        "to": "IN_PROGRESS"
      }
    }
  },
  "versionsBetween": 1
}
```

#### 12. Get Full History
```http
GET /memos/:id/history
```

Returns all versions sorted by version number

#### 13. Get Revision Path
```http
GET /memos/:id/path?fromVersion=2
```

Get path from version 2 to current

---

## 💡 Use Cases & Examples

### Use Case 1: Budget Review Workflow

```
Scenario: Alice creates a budget memo, Bob reviews and assigns to Carol

STEP 1: Alice creates memo
────────────────────────────
POST /memos
{
  "title": "Q1 Budget",
  "senderId": "alice",
  "recipientId": "bob"
}

Result: Version 1 [CREATED]


STEP 2: Bob reviews and updates
────────────────────────────────
PUT /memos/memo-123?userId=bob
{
  "content": "Added cost analysis section"
}

Result: Version 2 [UPDATED]
         Parent: [Version 1]


STEP 3: Bob assigns to Carol
─────────────────────────────
POST /memos/memo-123/assign
{
  "assignedToId": "carol",
  "assignedById": "bob"
}

Result: Version 3 [ASSIGNED]
         Parent: [Version 2]
         AssignedTo: Carol


STEP 4: Carol reviews at her own pace
──────────────────────────────────────
GET /memos/memo-123/checkout/latest
→ Sees Version 3 with Bob's updates

GET /memos/memo-123/checkout/version/1
→ Can see original version by Alice

GET /memos/memo-123/compare?versionA=1&versionB=3
→ Sees what changed between creation and now
```

### Use Case 2: Audit Trail

```
Scenario: Manager needs to review complete history

GET /memos/memo-123/timeline

Response shows:
┌────────────────────────────────────────────────────┐
│ Version 1 │ 2024-01-15 09:00 │ Alice  │ CREATED   │
│ Version 2 │ 2024-01-15 10:30 │ Bob    │ UPDATED   │
│ Version 3 │ 2024-01-15 14:20 │ Bob    │ ASSIGNED  │
│ Version 4 │ 2024-01-16 08:15 │ Carol  │ UPDATED   │
│ Version 5 │ 2024-01-16 16:45 │ Carol  │ COMPLETED │
└────────────────────────────────────────────────────┘
```

### Use Case 3: Time Travel Investigation

```
Scenario: "What did this memo look like yesterday at 3 PM?"

GET /memos/memo-123/checkout/timestamp?timestamp=2024-01-15T15:00:00Z

System finds: Version 3 (created at 14:20, before 15:00)
Returns: Complete snapshot of memo as it was at that time
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- NestJS CLI
- npm or yarn

### Installation

```bash
# Install dependencies
npm install @nestjs/common @nestjs/core uuid
npm install -D @types/uuid

# Create module structure
nest g module memo
nest g controller memo
nest g service memo
```

### Project Structure

```
src/
├── memo/
│   ├── controllers/
│   │   └── memo.controller.ts
│   ├── services/
│   │   └── memo.service.ts
│   ├── repositories/
│   │   └── memo.repository.ts
│   ├── entities/
│   │   └── memo-node.entity.ts
│   ├── dto/
│   │   ├── create-memo.dto.ts
│   │   ├── update-memo.dto.ts
│   │   └── assign-memo.dto.ts
│   └── memo.module.ts
└── app.module.ts
```

### Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Example Usage

```typescript
// Create a memo
const memo = await memoService.createMemo({
  title: "Project Proposal",
  content: "Initial draft...",
  senderId: "user-1",
  recipientId: "user-2"
});

// Update it
const updated = await memoService.updateMemo(
  memo.id,
  { content: "Revised draft..." },
  "user-1"
);

// Checkout version 1
const v1 = await memoService.checkoutVersion(memo.id, 1);

// Navigate through history
const v2 = await memoService.navigateNext(memo.id, v1.id);
const back = await memoService.navigatePrevious(memo.id, v2.id);
```

---

## 🎨 Visual Summary

```
┌─────────────────────────────────────────────────────────────┐
│              MEMO MANAGEMENT SYSTEM                         │
│                                                             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│  │ Version │──►│ Version │──►│ Version │──►│ Version │   │
│  │    1    │   │    2    │   │    3    │   │    4    │   │
│  │ CREATED │   │ UPDATED │   │ ASSIGNED│   │COMPLETED│   │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   │
│       ▲            ▲            ▲            ▲             │
│       │            │            │            │             │
│       └────────────┴────────────┴────────────┘             │
│              IMMUTABLE HISTORY                             │
│         (All versions preserved forever)                   │
│                                                             │
│  Features:                                                 │
│  ✓ Time travel to any version                             │
│  ✓ Compare any two versions                               │
│  ✓ Complete audit trail                                   │
│  ✓ Navigate forward/backward                              │
│  ✓ Search by timestamp or action                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Key Takeaways

1. **Every action creates a new version** - Nothing is ever deleted
2. **DAG structure enables time travel** - View any historical state
3. **Git-like navigation** - Checkout, compare, and navigate versions
4. **Complete audit trail** - Track who did what and when
5. **Flexible queries** - Find versions by time, action, or sequence

---

## 🔮 Future Enhancements

- [ ] Branching support (multiple paths from one version)
- [ ] Merge capabilities (combine branches)
- [ ] Tags/bookmarks for important versions
- [ ] Delta compression (store diffs instead of full content)
- [ ] Database persistence (PostgreSQL/MongoDB)
- [ ] WebSocket real-time updates
- [ ] Conflict resolution
- [ ] Access control per version

---

## 📚 Additional Resources

- NestJS Documentation: https://docs.nestjs.com
- DAG Theory: https://en.wikipedia.org/wiki/Directed_acyclic_graph
- Git Internals: https://git-scm.com/book/en/v2/Git-Internals

---

**Built by ADAM Mustapha with ❤️ using NestJS and DAG Architecture**