import { Controller, Get } from '@nestjs/common';
import { EntitlementTokenService } from '../../common/tokens/entitlement-token.service';

@Controller('.well-known')
export class JwksController {
  constructor(private readonly entToken: EntitlementTokenService) {}

  @Get('jwks.json')
  async jwks() {
    return this.entToken.getJwks();
  }
}

