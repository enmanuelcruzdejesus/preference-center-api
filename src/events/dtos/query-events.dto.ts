import { PaginationDto } from '../../common/dtos/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryEventsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by user ID (UUID v4)' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by consent type slug (e.g. email_notifications)',
  })
  @IsOptional()
  @IsString()
  type?: string;
}
