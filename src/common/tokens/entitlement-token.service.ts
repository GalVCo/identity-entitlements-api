import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SignJWT, importPKCS8, generateKeyPair, exportJWK, KeyLike, JWK } from 'jose';

type Caps = Array<'local:read' | 'local:write' | 'cloud:sync'>;

export type EntitlementClaims = {
  sub: string;
  tier: 'trial' | 'lifetime' | 'premium';
  lifetime: boolean;
  premium_active: boolean;
  trial_started_at?: number;
  trial_expires_at?: number;
  premium_expires_at?: number | null;
  caps: Caps;
};

@Injectable()
export class EntitlementTokenService {
  private key: KeyLike | null = null;
  private kid: string | null = null;
  private jwk: JWK | null = null;

  private async ensureKey() {
    if (this.key) return;
    const pem = process.env.ENT_JWT_PRIVATE_KEY_PEM;
    const configuredKid = process.env.ENT_JWT_KID || undefined;
    if (pem && pem.trim()) {
      this.key = await importPKCS8(pem, 'RS256');
      this.jwk = await exportJWK(this.key);
      this.jwk.kty = this.jwk.kty || 'RSA';
      this.kid = configuredKid || this.jwk.kid || 'ent-rs256';
      (this.jwk as any).kid = this.kid;
      (this.jwk as any).use = 'sig';
      (this.jwk as any).alg = 'RS256';
      return;
    }
    // Dev fallback: generate ephemeral key (invalidates on restart)
    const { privateKey } = await generateKeyPair('RS256');
    this.key = privateKey;
    const jwk = await exportJWK(privateKey);
    jwk.kty = jwk.kty || 'RSA';
    this.kid = configuredKid || 'ent-ephemeral';
    (jwk as any).kid = this.kid;
    (jwk as any).use = 'sig';
    (jwk as any).alg = 'RS256';
    this.jwk = jwk as any;
  }

  async getJwks() {
    await this.ensureKey();
    if (!this.jwk) throw new InternalServerErrorException('JWKS unavailable');
    // Publish only the public parts
    const { n, e, kty, kid, alg } = this.jwk as any;
    return { keys: [{ kty, n, e, kid, use: 'sig', alg }] };
  }

  async issueToken(claims: EntitlementClaims): Promise<string> {
    await this.ensureKey();
    if (!this.key) throw new InternalServerErrorException('Signing key unavailable');
    const issuer = process.env.JWT_ISSUER || 'identity-entitlements-api';
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24; // 24h
    const token = await new SignJWT({
      tier: claims.tier,
      lifetime: claims.lifetime,
      premium_active: claims.premium_active,
      trial_started_at: claims.trial_started_at,
      trial_expires_at: claims.trial_expires_at,
      premium_expires_at: claims.premium_expires_at ?? null,
      caps: claims.caps,
    } as any)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: this.kid || undefined })
      .setSubject(claims.sub)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setIssuer(issuer)
      .sign(this.key);
    return token;
  }
}

