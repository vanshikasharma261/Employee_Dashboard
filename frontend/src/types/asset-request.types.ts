/** Mirrors the backend `RequestType` enum. */
export const RequestType = {
  NEW_ASSET: "NEW_ASSET",
  REMOVE_ASSET: "REMOVE_ASSET",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type RequestType = (typeof RequestType)[keyof typeof RequestType];

/** Mirrors the backend `RequestStatus` enum. */
export const RequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
} as const;

export type RequestStatus =
  (typeof RequestStatus)[keyof typeof RequestStatus];

/**
 * Safe asset-request shape returned by the asset-request endpoints
 * (mirrors the backend `REQUEST_SAFE_SELECT`). Scaffold for Feature 014
 * (Asset Request UI).
 */
export interface AssetRequest {
  id: string;
  request_type: RequestType;
  status: RequestStatus;
  description: string | null;
  admin_response: string | null;
  employee_id: string;
  asset_id: string;
}
