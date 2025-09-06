import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, JWTPayload } from 'jose';

export type AppJwtPayload = JWTPayload & {
  scope?: string[];
  email?: string;
  iss?: string;
  sub: string; // user.id
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = auth.slice('Bearer '.length).trim();

    const secret = process.env.JWT_SECRET;
    const issuer = process.env.JWT_ISSUER || 'identity-entitlements-api';
    if (!secret) throw new UnauthorizedException('JWT not configured');

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { issuer });
      const p = payload as AppJwtPayload;
      if (!p.sub) throw new Error('Missing sub');
      req.user = { id: p.sub, email: p.email, scope: p.scope || [] };
      return true;
    } catch (e: any) {
      throw new UnauthorizedException(`Invalid token: ${e?.message || 'verification failed'}`);
    }
  }
}

