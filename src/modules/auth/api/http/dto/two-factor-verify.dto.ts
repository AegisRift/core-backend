export class TwoFactorVerifyDto {
  challengeId!: string;
  code!: string;
  purpose!: 'update-profile';
}
