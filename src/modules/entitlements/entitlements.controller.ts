import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { EntitlementsService } from './entitlements.service';
import { Request } from 'express';

@ApiTags('entitlements')
@ApiBearerAuth()
@Controller('entitlement')
export class EntitlementsController {
  constructor(private readonly svc: EntitlementsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCurrent(@Req() req: Request) {
    const userId = (req as any).user?.id as string;
    return this.svc.getForUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('issue')
  async issue(@Req() req: Request) {
    const userId = (req as any).user?.id as string;
    return this.svc.issueIfMissing(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const userId = (req as any).user?.id as string;
    return this.svc.refresh(userId);
  }
}
