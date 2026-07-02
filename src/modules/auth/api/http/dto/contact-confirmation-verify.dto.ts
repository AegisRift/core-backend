export class ContactConfirmationVerifyDto {
  challengeId!: string;
  code!: string;
  method!: 'email' | 'phone';
}
