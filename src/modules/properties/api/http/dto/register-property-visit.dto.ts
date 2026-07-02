import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterPropertyVisitDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
