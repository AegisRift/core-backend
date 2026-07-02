export class RegisterDto {
  email!: string;
  password!: string;
  firstName!: string;
  lastName!: string;
  birthday!: string;
  phone!: string;
  country!: string;
  occupation!: string;
  city?: string;
  userType?: 'buyer' | 'seller' | 'agent' | 'investor';
  preferredContactMethod?: 'whatsapp' | 'phone' | 'email';
}
