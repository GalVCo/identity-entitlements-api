import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { HealthController } from './health.controller';
import { JwksController } from './jwks/jwks.controller';
import { EntitlementTokenService } from '../common/tokens/entitlement-token.service';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [HealthController, JwksController],
  providers: [EntitlementTokenService],
})
export class AppModule {}
