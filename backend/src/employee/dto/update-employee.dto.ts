import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto';

/**
 * Payload for `PATCH /employees/:id`.
 *
 * Every field of {@link CreateEmployeeDto} becomes optional (and keeps its
 * validation rules when present), so an admin can update any subset of an
 * employee's fields. Status is updated through its own dedicated endpoint.
 */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
