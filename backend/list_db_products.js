const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  products.forEach(p => {
    console.log(`ID: ${p.id} | Name: ${p.name} | Price: ${p.price} | OriginalPrice: ${p.originalPrice}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
