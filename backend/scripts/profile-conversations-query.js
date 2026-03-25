const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const projectId = process.env.PROJECT_ID;
const status = process.env.STATUS || 'OPEN';
const limit = Number(process.env.LIMIT || 50);

if (!projectId) {
  console.error('Missing PROJECT_ID env variable');
  process.exit(1);
}

async function main() {
  const plan = await prisma.$queryRawUnsafe(
    `EXPLAIN SELECT id, projectId, status, operatorId, updatedAt
     FROM Conversation
     WHERE projectId = ? AND status = ?
     ORDER BY updatedAt DESC, id DESC
     LIMIT ?`,
    projectId,
    status,
    limit
  );

  console.log('EXPLAIN plan for conversations listing:');
  console.table(plan);
}

main()
  .catch((error) => {
    console.error('Profiling failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
