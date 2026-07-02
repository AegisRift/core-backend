export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  phone?: string;
  country?: string;
  occupation?: string;
  city?: string;
  userType?: 'buyer' | 'seller' | 'agent' | 'investor';
  preferredContactMethod?: 'whatsapp' | 'phone' | 'email';
}
