export interface EntitlementFeature {
  enabled: boolean;
  limit?: number;
}

export interface EntitlementSet {
  features: Record<string, EntitlementFeature>;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  businessId?: string;
  branchId?: string;
  iat?: number;
  exp?: number;
}

export interface QueuePosition {
  tokenId: string;
  tokenNumber: number;
  position: number;
  estimatedWaitMin: number;
}

export interface CartItem {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  addons: { addonId: string; name: string; price: number }[];
  specialNote?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
