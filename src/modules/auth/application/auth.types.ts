export type TwoFactorPurpose = 'update-profile' | 'confirm-email' | 'confirm-phone';
export type TwoFactorChannel = 'email' | 'phone';

export const SENSITIVE_TWO_FACTOR_PURPOSES: TwoFactorPurpose[] = ['update-profile'];
export const CONTACT_CONFIRMATION_PURPOSES: TwoFactorPurpose[] = ['confirm-email', 'confirm-phone'];
