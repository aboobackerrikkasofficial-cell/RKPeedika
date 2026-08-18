const { PrismaClient } = require('@prisma/client');
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
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });