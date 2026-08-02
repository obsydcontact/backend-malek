import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

// Local development seed data only — never run against production.
// See docs/09-database-and-migrations.md § Local seed data.
const prisma = new PrismaClient();

// Deterministic fake UUID-shaped eventId per seed lead, so re-running the
// seed script is idempotent (upsert matches the same eventId every time).
function seedEventId(seedKey: string): string {
  const hex = createHash('sha256').update(seedKey).digest('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

async function main() {
  const sampleLeads = [
    {
      firstName: 'Sophie',
      lastName: 'Rey',
      email: 'sophie.rey@example.com',
      phone: '+41791234567',
      goal: 'WEIGHT_LOSS' as const,
      message: "J'aimerais en savoir plus sur le coaching en ligne.",
      source: 'CONTACT_FORM' as const,
      status: 'BOOKED' as const,
      locale: 'fr',
    },
    {
      firstName: 'Thomas',
      lastName: 'Baumann',
      email: 'thomas.baumann@example.com',
      phone: '+41781234567',
      goal: 'MUSCLE_BUILDING' as const,
      message: 'Interested in personal training in Lausanne.',
      source: 'CONTACT_FORM' as const,
      status: 'NEW' as const,
      locale: 'en',
    },
    {
      firstName: 'Élodie',
      lastName: 'Morel',
      email: 'elodie.morel@example.com',
      phone: null,
      goal: 'BODY_RECOMPOSITION' as const,
      message: null,
      source: 'NEWSLETTER' as const,
      status: 'CONTACTED' as const,
      locale: 'fr',
    },
  ];

  for (const lead of sampleLeads) {
    const eventId = seedEventId(lead.email);
    await prisma.lead.upsert({
      where: { eventId },
      update: {},
      create: { ...lead, eventId },
    });
  }

  console.log(`Seeded ${sampleLeads.length} sample leads.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
