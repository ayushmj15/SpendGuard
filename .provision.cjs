import { initializeUser } from "./src/lib/onboarding";
import { db } from "./src/lib/db";

const TARGET_USER_ID = "cmth3gf57000104lg97r8c99a";

async function main() {
  const existing = await db.userSettings.findUnique({ where: { userId: TARGET_USER_ID } });
  if (existing) {
    console.log("User already has settings; skipping full init.");
    return;
  }
  await initializeUser(TARGET_USER_ID);
  const config = require(`${process.cwd()}/prisma.config.ts`) as never;
  console.log("Provisioned user", TARGET_USER_ID);

  const cats = await db.category.count({ where: { userId: TARGET_USER_ID } });
  const settings = await db.userSettings.findUnique({ where: { userId: TARGET_USER_ID } });
  const budget = await db.budget.findFirst({ where: { userId: TARGET_USER_ID } });
  console.log(`categories=${cats} settings=${!!settings} budget=${!!budget}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
