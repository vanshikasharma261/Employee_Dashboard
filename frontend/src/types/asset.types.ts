/** Mirrors the backend `AssetCategory` enum. */
export const AssetCategory = {
  LAPTOP: "LAPTOP",
  MOUSE: "MOUSE",
  KEYBOARD: "KEYBOARD",
  HEADSET: "HEADSET",
  EARPHONE: "EARPHONE",
  MOBILE_PHONE: "MOBILE_PHONE",
  SCREEN: "SCREEN",
  COOLING_PAD: "COOLING_PAD",
  IPAD: "IPAD",
} as const;

export type AssetCategory = (typeof AssetCategory)[keyof typeof AssetCategory];

/** Mirrors the backend `AssetStatus` enum. */
export const AssetStatus = {
  AVAILABLE: "AVAILABLE",
  ALLOCATED: "ALLOCATED",
  MAINTENANCE: "MAINTENANCE",
  TRASHED: "TRASHED",
} as const;

export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

/** Employee summary embedded in an allocated asset. */
export interface AssetHolderSummary {
  id: string;
  first_name: string;
  last_name: string;
  official_email: string;
}

/**
 * Safe asset shape returned by `GET /assets` (mirrors the backend
 * `ASSET_SAFE_SELECT`). Scaffold for Feature 013 (Asset Management UI).
 */
export interface Asset {
  id: string;
  asset_serial_number: string;
  asset_category: AssetCategory;
  status: AssetStatus;
  allocated_to: AssetHolderSummary | null;
}
