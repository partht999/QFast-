import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @IsIn(['hour', 'day', 'week', 'month'])
  groupBy?: 'hour' | 'day' | 'week' | 'month';

  @IsOptional()
  @IsIn(['true', 'false', '1', '0'])
  compare?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceType?: string;

  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format?: 'csv' | 'pdf';
}
