import { IsString, Length } from 'class-validator';

export class RedeemReferralDto {
  @IsString()
  @Length(1, 20)
  code: string;
}
