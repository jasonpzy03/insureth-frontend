export interface AdminPagedResponse<T> {
  items: T[];
  totalElements: number;
  page: number;
  size: number;
}

export interface AuditTrailItem {
  auditId: number;
  eventType: string;
  actorWalletAddress: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetIdentifier: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
