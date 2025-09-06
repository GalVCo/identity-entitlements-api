import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { EntitlementTokenService } from '../../common/tokens/entitlement-token.service';

class GoogleAuthDto {
  @IsString()
  id_token!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly ent: EntitlementsService,
    private readonly entToken: EntitlementTokenService,
  ) {}

  @Post('google')
  async google(@Body() body: GoogleAuthDto) {
    const payload = await this.auth.verifyGoogleIdToken(body.id_token);
    const user = await this.auth.upsertUserFromGoogle(payload);
    const token = await this.auth.issueAppJwt({ id: user.id, email: user.email });
    // Also return a short-lived entitlement token for offline gating
    const ent = await this.ent.getForUser(user.id);
    const entitlement_token = await this.entToken.issueToken({
      sub: user.id,
      tier: ent.tier,
      lifetime: ent.lifetime,
      premium_active: ent.premium_active,
      trial_started_at: ent.trial_started_at,
      trial_expires_at: ent.trial_expires_at,
      premium_expires_at: ent.premium_expires_at,
      caps: (ent.tier === 'lifetime' || ent.tier === 'premium' || ent.lifetime)
        ? (ent.premium_active ? ['local:read','local:write','cloud:sync'] as const : ['local:read','local:write'] as const)
        : (ent.tier === 'trial' ? ['local:read','local:write'] as const : ['local:read'] as const),
    });
    return { token, user, entitlement_token };
  }
}
