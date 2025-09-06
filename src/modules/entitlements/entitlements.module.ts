import { Module } from '@nestjs/common';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EntitlementTokenService } from '../../common/tokens/entitlement-token.service';

@Module({
  imports: [PrismaModule],
  controllers: [EntitlementsController],
  providers: [EntitlementsService, EntitlementTokenService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
