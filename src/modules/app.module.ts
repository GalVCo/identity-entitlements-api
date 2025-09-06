import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [HealthController],
})
export class AppModule {}
