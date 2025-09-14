import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UserRefDto { @IsUUID('4') id!: string; }

class ConsentChangeDto {
  @IsString() @IsNotEmpty()
  id!: string;         // consent type slug (e.g., "email_notifications")
  @IsBoolean()
  enabled!: boolean;
}

export class CreateEventDto {
  @IsObject() @ValidateNested() @Type(() => UserRefDto)
  user!: UserRefDto;

  @IsArray() @ValidateNested({ each: true }) @Type(() => ConsentChangeDto)
  consents!: ConsentChangeDto[];
}
