import { SetMetadata } from '@nestjs/common';
import { TwoFactorPurpose } from '@modules/auth/application/auth.types';

export const TWO_FACTOR_PURPOSE_KEY = 'two_factor_purpose';

export const TwoFactorPurposeRequired = (purpose: TwoFactorPurpose) =>
  SetMetadata(TWO_FACTOR_PURPOSE_KEY, purpose);
