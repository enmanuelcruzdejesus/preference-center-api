export interface UserConsentDTO {
  id: string; // consent type slug (e.g., "email_notifications")
  enabled: boolean;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  consents: UserConsentDTO[]; // latest state per consent type
}
