import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartmentDto } from './create-department.dto';

/**
 * Payload for `PATCH /departments/:id`.
 *
 * Every field of {@link CreateDepartmentDto} becomes optional (and keeps its
 * validation rules when present), so an admin can update a department's name.
 */
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
