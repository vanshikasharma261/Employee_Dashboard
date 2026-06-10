/**
 * Company asset seed data.
 *
 * Contains asset records only. No allocations are created in this feature:
 * `allocated_to_id` is always left null and no `ALLOCATED` status is used
 * (an asset is ALLOCATED only when assigned to an employee — a future feature).
 * Statuses are therefore limited to realistic, unassigned inventory states:
 * AVAILABLE (ready to allocate) and MAINTENANCE (temporarily out of service).
 *
 * `asset_serial_number` is unique (schema constraint) and is used by the seed
 * orchestrator as the idempotency key.
 */

import { AssetCategory, AssetStatus } from '../../src/generated/prisma/enums';

export interface AssetSeed {
  asset_serial_number: string;
  asset_category: AssetCategory;
  status: AssetStatus;
}

export const assetsSeedData: AssetSeed[] = [
  // Laptops
  { asset_serial_number: 'LAP-2023-0001', asset_category: AssetCategory.LAPTOP, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'LAP-2023-0002', asset_category: AssetCategory.LAPTOP, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'LAP-2023-0003', asset_category: AssetCategory.LAPTOP, status: AssetStatus.MAINTENANCE },
  { asset_serial_number: 'LAP-2024-0004', asset_category: AssetCategory.LAPTOP, status: AssetStatus.AVAILABLE },

  // Mice
  { asset_serial_number: 'MOU-2023-0001', asset_category: AssetCategory.MOUSE, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'MOU-2023-0002', asset_category: AssetCategory.MOUSE, status: AssetStatus.AVAILABLE },

  // Keyboards
  { asset_serial_number: 'KEY-2023-0001', asset_category: AssetCategory.KEYBOARD, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'KEY-2023-0002', asset_category: AssetCategory.KEYBOARD, status: AssetStatus.MAINTENANCE },

  // Headsets
  { asset_serial_number: 'HED-2023-0001', asset_category: AssetCategory.HEADSET, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'HED-2024-0002', asset_category: AssetCategory.HEADSET, status: AssetStatus.AVAILABLE },

  // Earphones
  { asset_serial_number: 'EAR-2023-0001', asset_category: AssetCategory.EARPHONE, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'EAR-2024-0002', asset_category: AssetCategory.EARPHONE, status: AssetStatus.AVAILABLE },

  // Mobile phones
  { asset_serial_number: 'MOB-2023-0001', asset_category: AssetCategory.MOBILE_PHONE, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'MOB-2024-0002', asset_category: AssetCategory.MOBILE_PHONE, status: AssetStatus.MAINTENANCE },

  // Screens
  { asset_serial_number: 'SCR-2023-0001', asset_category: AssetCategory.SCREEN, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'SCR-2023-0002', asset_category: AssetCategory.SCREEN, status: AssetStatus.AVAILABLE },

  // Cooling pads
  { asset_serial_number: 'COO-2023-0001', asset_category: AssetCategory.COOLING_PAD, status: AssetStatus.AVAILABLE },

  // iPads
  { asset_serial_number: 'IPD-2024-0001', asset_category: AssetCategory.IPAD, status: AssetStatus.AVAILABLE },
  { asset_serial_number: 'IPD-2024-0002', asset_category: AssetCategory.IPAD, status: AssetStatus.MAINTENANCE },
];
