import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class UserRefDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4') id!: string;
}

class ConsentChangeDto {
  @ApiProperty({ example: 'email_notifications' })
  @IsString()
  @IsNotEmpty()
  id!: string; // consent type slug (e.g., "email_notifications")
  
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}

export class CreateEventDto {
  @ApiProperty({ type: UserRefDto })
  @IsObject()
  @ValidateNested()
  @Type(() => UserRefDto)
  user!: UserRefDto;

  @ApiProperty({ type: [ConsentChangeDto], example: [
    { id: 'email_notifications', enabled: true },
    { id: 'sms_notifications', enabled: false },
  ]})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentChangeDto)
  consents!: ConsentChangeDto[];
}
