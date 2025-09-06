import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('entitlements')
@Controller('entitlement')
export class EntitlementsController {
  @Get()
  getCurrent() {
    return {
      tier: 'trial',
      lifetime: false,
      premium_active: false,
      trial_started_at: 0,
      trial_expires_at: 0,
      premium_expires_at: null,
    };
  }

  @Post('issue')
  issue() {
    return this.getCurrent();
  }

  @Post('refresh')
  refresh() {
    return this.getCurrent();
  }
}

