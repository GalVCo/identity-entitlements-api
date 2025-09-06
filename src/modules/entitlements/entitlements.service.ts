import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type EntitlementResponse = {
  tier: 'trial' | 'lifetime' | 'premium';
  lifetime: boolean;
  premium_active: boolean;
  trial_started_at: number;
  trial_expires_at: number;
  premium_expires_at: number | null;
};

function toMillis(d: Date | null | undefined): number {
  return d ? d.getTime() : 0;
}

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  private computeTier(args: {
    lifetime: boolean;
    premiumActive: boolean;
    premiumExpiresAt?: Date | null;
    trialExpiresAt?: Date | null;
  }): 'trial' | 'lifetime' | 'premium' {
    const now = Date.now();
    if (args.lifetime) return 'lifetime';
    const premiumActiveNow = !!(args.premiumActive && args.premiumExpiresAt && args.premiumExpiresAt.getTime() > now);
    if (premiumActiveNow) return 'premium';
    const trialActive = !!(args.trialExpiresAt && args.trialExpiresAt.getTime() > now);
    return 'trial';
  }

  private toResponse(ent?: {
    lifetime?: boolean | null;
    premiumActive?: boolean | null;
    trialStartedAt?: Date | null;
    trialExpiresAt?: Date | null;
    premiumExpiresAt?: Date | null;
  }): EntitlementResponse {
    const lifetime = !!(ent?.lifetime ?? false);
    const now = Date.now();
    const premiumActiveNow = !!(ent?.premiumActive && ent?.premiumExpiresAt && ent.premiumExpiresAt.getTime() > now);
    const tier = this.computeTier({
      lifetime,
      premiumActive: !!ent?.premiumActive,
      premiumExpiresAt: ent?.premiumExpiresAt ?? null,
      trialExpiresAt: ent?.trialExpiresAt ?? null,
    });
    return {
      tier,
      lifetime,
      premium_active: premiumActiveNow,
      trial_started_at: toMillis(ent?.trialStartedAt ?? null),
      trial_expires_at: toMillis(ent?.trialExpiresAt ?? null),
      premium_expires_at: ent?.premiumExpiresAt ? ent.premiumExpiresAt.getTime() : null,
    };
  }

  async getForUser(userId: string): Promise<EntitlementResponse> {
    const ent = await this.prisma.entitlement.findUnique({ where: { userId } });
    return this.toResponse(ent ?? undefined);
  }

  async issueIfMissing(userId: string): Promise<EntitlementResponse> {
    const existing = await this.prisma.entitlement.findUnique({ where: { userId } });
    if (existing) return this.toResponse(existing);
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const created = await this.prisma.entitlement.create({
      data: {
        user: { connect: { id: userId } },
        trialStartedAt: now,
        trialExpiresAt: expires,
      },
    });
    return this.toResponse(created);
  }

  async refresh(userId: string): Promise<EntitlementResponse> {
    const ent = await this.prisma.entitlement.findUnique({ where: { userId } });
    if (!ent) return this.toResponse(undefined);
    const updated = await this.prisma.entitlement.update({
      where: { userId },
      data: { premiumActive: ent.premiumActive },
    });
    return this.toResponse(updated);
  }
}

