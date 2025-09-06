import { EntitlementsService } from './entitlements.service';

class MockPrisma {
  entitlement: any;
  constructor() {
    const store = new Map<string, any>();
    this.entitlement = {
      findUnique: async ({ where: { userId } }: any) => {
        return store.get(userId) || null;
      },
      create: async ({ data }: any) => {
        const row = {
          userId: data.user.connect.id,
          lifetime: false,
          premiumActive: false,
          trialStartedAt: data.trialStartedAt,
          trialExpiresAt: data.trialExpiresAt,
          premiumExpiresAt: null,
          updatedAt: new Date(),
        };
        store.set(row.userId, row);
        return row;
      },
      update: async ({ where: { userId }, data }: any) => {
        const row = store.get(userId);
        const updated = { ...row, ...data, updatedAt: new Date() };
        store.set(userId, updated);
        return updated;
      },
    } as any;
  }
}

describe('EntitlementsService', () => {
  let svc: EntitlementsService;
  let prisma: any;

  beforeEach(() => {
    prisma = new MockPrisma() as any;
    svc = new EntitlementsService(prisma);
  });

  it('seeds a 30-day trial if missing', async () => {
    const userId = 'u1';
    const before = await svc.getForUser(userId);
    expect(before.tier).toBe('trial');
    expect(before.trial_started_at).toBe(0);

    const issued = await svc.issueIfMissing(userId);
    expect(issued.tier).toBe('trial');
    expect(issued.trial_started_at).toBeGreaterThan(0);
    expect(issued.trial_expires_at).toBeGreaterThan(issued.trial_started_at);

    const again = await svc.issueIfMissing(userId);
    expect(again.trial_started_at).toBe(issued.trial_started_at);
  });

  it('computes premium_active only when not expired', async () => {
    const userId = 'u2';
    // seed
    await svc.issueIfMissing(userId);
    // manually set premium active but expired
    await prisma.entitlement.update({ where: { userId }, data: { premiumActive: true, premiumExpiresAt: new Date(Date.now() - 1000) } });
    let ent = await svc.getForUser(userId);
    expect(ent.premium_active).toBe(false);

    await prisma.entitlement.update({ where: { userId }, data: { premiumActive: true, premiumExpiresAt: new Date(Date.now() + 1000 * 60) } });
    ent = await svc.getForUser(userId);
    expect(ent.premium_active).toBe(true);
    expect(ent.tier === 'premium' || ent.tier === 'lifetime').toBe(true);
  });
});
