import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';

/**
 * Payload for `PATCH /assets/:id`.
 *
 * Every field of {@link CreateAssetDto} becomes optional (and keeps its
 * validation/transform rules when present), so an admin can update an asset's
 * serial number and/or category. Status is updated via a separate endpoint.
 */
export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
