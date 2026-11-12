const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.business.findMany({
    select: { slug: true, type: true, name: true },
    take: 8,
  });
  console.log(JSON.stringify(rows));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
