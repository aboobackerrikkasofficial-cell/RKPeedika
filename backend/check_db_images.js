import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products in database:`);
  products.forEach(p => {
    console.log(`- ID: ${p.id}`);
    console.log(`  Name: ${p.name}`);
    console.log(`  Images: ${p.images}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
