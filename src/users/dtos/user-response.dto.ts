import { ApiProperty } from "@nestjs/swagger";

export class UserConsentDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty()
  enabled: boolean;
}

export class UserResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty({ example: 'valid@email.com' })
  email: string;
  @ApiProperty({ type: UserConsentDTO, isArray: true })
  consents: UserConsentDTO[]; // latest state per consent type
}

