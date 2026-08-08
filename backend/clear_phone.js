import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.user.deleteMany({
    where: {
      phone: '9876543210'
    }
  });
  console.log(`Deleted ${deleted.count} users with phone 9876543210`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
