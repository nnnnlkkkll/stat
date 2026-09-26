import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FAKE = [
  "june",
  "mica",
  "roach",
  "nori",
  "vex",
  "paloma",
  "hex",
  "bean",
  "ivy",
  "kilo",
  "dax",
  "ick",
  "newt",
  "ken",
  "tester",
  "demo",
];

async function main() {
  console.log("Removing seeded demo / house accounts…");
  const result = await prisma.user.deleteMany({
    where: {
      OR: [
        { username: { in: FAKE } },
        { kind: { in: ["demo", "system"] } },
        { email: { endsWith: "@ick.local" } },
        { email: { endsWith: "@stat.test" } },
      ],
    },
  });

  console.log(`Done. Removed ${result.count} fake profiles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
