export class CreateMemoDto {
  title: string;
  content: string;
  senderId: string;
  recipientId: string;
  metadata?: Record<string, any>;
}

export class UpdateMemoDto {
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export class AssignMemoDto {
  assignedToId: string;
  assignedById: string;
  comment?: string;
}
