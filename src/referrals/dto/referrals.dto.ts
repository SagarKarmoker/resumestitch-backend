import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemReferralDto {
  @ApiProperty({ 
    example: 'REFERRAL123', 
    description: 'Referral code to redeem (max 20 characters)',
    maxLength: 20
  })
  @IsString()
  @Length(1, 20)
  code: string;
}