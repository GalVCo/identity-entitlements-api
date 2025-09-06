import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { EntitlementsService } from './entitlements.service';
import { Request } from 'express';
import { Response } from 'express';
import { EntitlementTokenService } from '../../common/tokens/entitlement-token.service';

@ApiTags('entitlements')
@ApiBearerAuth()
@Controller('entitlement')
export class EntitlementsController {
  constructor(
    private readonly svc: EntitlementsService,
    private readonly entToken: EntitlementTokenService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCurrent(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id as string;
    const ent = await this.svc.getForUser(userId);
    const token = await this.entToken.issueToken({
      sub: userId,
      tier: ent.tier,
      lifetime: ent.lifetime,
      premium_active: ent.premium_active,
      trial_started_at: ent.trial_started_at,
      trial_expires_at: ent.trial_expires_at,
      premium_expires_at: ent.premium_expires_at,
      caps: this.computeCaps(ent),
    });
    res.setHeader('x-entitlement-token', token);
    return res.json({ ...ent, entitlement_token: token });
  }

  @UseGuards(JwtAuthGuard)
  @Post('issue')
  async issue(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id as string;
    const ent = await this.svc.issueIfMissing(userId);
    const token = await this.entToken.issueToken({
      sub: userId,
      tier: ent.tier,
      lifetime: ent.lifetime,
      premium_active: ent.premium_active,
      trial_started_at: ent.trial_started_at,
      trial_expires_at: ent.trial_expires_at,
      premium_expires_at: ent.premium_expires_at,
      caps: this.computeCaps(ent),
    });
    res.setHeader('x-entitlement-token', token);
    return res.json({ ...ent, entitlement_token: token });
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id as string;
    const ent = await this.svc.refresh(userId);
    const token = await this.entToken.issueToken({
      sub: userId,
      tier: ent.tier,
      lifetime: ent.lifetime,
      premium_active: ent.premium_active,
      trial_started_at: ent.trial_started_at,
      trial_expires_at: ent.trial_expires_at,
      premium_expires_at: ent.premium_expires_at,
      caps: this.computeCaps(ent),
    });
    res.setHeader('x-entitlement-token', token);
    return res.json({ ...ent, entitlement_token: token });
  }

  private computeCaps(ent: { tier: 'trial' | 'lifetime' | 'premium'; lifetime: boolean; premium_active: boolean }): Array<'local:read' | 'local:write' | 'cloud:sync'> {
    const caps: Array<'local:read' | 'local:write' | 'cloud:sync'> = ['local:read'];
    if (ent.tier === 'lifetime' || ent.tier === 'premium' || ent.lifetime) caps.push('local:write');
    if (ent.tier === 'premium' || ent.premium_active) caps.push('cloud:sync');
    return caps;
  }
}
