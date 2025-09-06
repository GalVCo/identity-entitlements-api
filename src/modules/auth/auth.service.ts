import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createRemoteJWKSet, jwtVerify, JWTPayload, SignJWT } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

type GoogleIdTokenPayload = JWTPayload & {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  nonce?: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private getAllowedClientIds(): string[] {
    const raw = process.env.ALLOWED_GOOGLE_CLIENT_IDS || '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenPayload> {
    if (!idToken || typeof idToken !== 'string') {
      throw new BadRequestException('id_token is required');
    }

    const allowedAud = this.getAllowedClientIds();
    if (!allowedAud.length) {
      throw new InternalServerErrorException('ALLOWED_GOOGLE_CLIENT_IDS not configured');
    }

    let verified;
    try {
      verified = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: 'https://accounts.google.com',
        audience: allowedAud,
      });
    } catch (err: any) {
      throw new BadRequestException(`Invalid Google id_token: ${err?.message || 'verification failed'}`);
    }

    const payload = verified.payload as GoogleIdTokenPayload;
    if (payload.iss !== 'https://accounts.google.com') {
      throw new BadRequestException('Invalid issuer');
    }
    if (!allowedAud.includes(payload.aud)) {
      throw new BadRequestException('Invalid audience');
    }
    if (!payload.sub) {
      throw new BadRequestException('Missing sub');
    }

    return payload;
  }

  async upsertUserFromGoogle(payload: GoogleIdTokenPayload) {
    const { sub, email, name, picture } = payload;
    return this.prisma.user.upsert({
      where: { sub },
      create: {
        sub,
        email: email || `${sub}@unknown.local`,
        name,
        picture,
      },
      update: {
        email: email || undefined,
        name,
        picture,
      },
      select: { id: true, sub: true, email: true, name: true, picture: true },
    });
  }

  async issueAppJwt(user: { id: string; email: string | null }) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new InternalServerErrorException('JWT_SECRET not configured');

    const issuer = process.env.JWT_ISSUER || 'identity-entitlements-api';
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60; // 60 minutes

    const scope = ['entitlement:read', 'entitlement:write'];
    const token = await new SignJWT({
      scope,
      email: user.email || undefined,
      iss: issuer,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(new TextEncoder().encode(secret));

    return token;
  }
}

