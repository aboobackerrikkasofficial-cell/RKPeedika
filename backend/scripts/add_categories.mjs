import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Home', slug: 'home', image: '/images/category_home.jpg' },
    { name: 'Kids & Toys', slug: 'kids-toys', image: '/images/category_toys.jpg' },
    { name: 'Smart Gadgets', slug: 'smart-gadgets', image: '/images/category_smart_gadgets.jpg' }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { image: cat.image },
      create: { name: cat.name, slug: cat.slug, image: cat.image }
    });
    console.log('Added/Updated category:', cat.name);
  }

  // Update all products in the database to ensure COD and prepaid are available
  const updateResult = await prisma.product.updateMany({
    data: {
      codAvailable: true,
      prepaidAvailable: true
    }
  });
  console.log(`Updated ${updateResult.count} products to enable COD and Prepaid.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });