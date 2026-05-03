import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { RedeemReferralDto } from './dto/referrals.dto';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a referral code for the logged-in user' })
  generate(@Request() req: any) {
    return this.referralsService.generateCode(req.user.id);
  }

  @Post('redeem')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Redeem a referral code' })
  redeem(@Request() req: any, @Body() dto: RedeemReferralDto) {
    return this.referralsService.redeemCode(req.user.id, dto.code);
  }

  @Get('me')
  @ApiOperation({ summary: 'List referral codes sent by the logged-in user' })
  listMyCodes(@Request() req: any) {
    return this.referralsService.listMyCodes(req.user.id);
  }
}
