const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const productsCount = await prisma.product.count();
  const categoriesCount = await prisma.category.count();
  const usersCount = await prisma.user.count();
  console.log(`Products: ${productsCount}, Categories: ${categoriesCount}, Users: ${usersCount}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
