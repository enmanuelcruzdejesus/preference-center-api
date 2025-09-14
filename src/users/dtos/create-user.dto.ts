import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;
}
