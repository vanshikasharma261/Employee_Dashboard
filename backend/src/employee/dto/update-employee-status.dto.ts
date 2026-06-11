import { IsEnum } from 'class-validator';
import { EmployeeStatus } from '../../generated/prisma/client';

/**
 * Payload for `PATCH /employees/:id/status`.
 *
 * Restricts the status transition to the business-defined enum values
 * (`WORKING | ON_NOTICE | RESIGNED | TERMINATED`). Per business rules the
 * employee record itself is never deleted on a status change.
 */
export class UpdateEmployeeStatusDto {
  @IsEnum(EmployeeStatus)
  status!: EmployeeStatus;
}
