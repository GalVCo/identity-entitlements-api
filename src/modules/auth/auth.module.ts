import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { EntitlementTokenService } from '../../common/tokens/entitlement-token.service';

@Module({
  imports: [PrismaModule, EntitlementsModule],
  controllers: [AuthController],
  providers: [AuthService, EntitlementTokenService],
})
export class AuthModule {}
