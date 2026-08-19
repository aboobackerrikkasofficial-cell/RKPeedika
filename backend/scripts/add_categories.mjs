import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up demo data from database...');

  // 1. Delete all reviews linked to demo products
  await prisma.review.deleteMany({
    where: {
      productId: {
        startsWith: 'prod-'
      }
    }
  });

  // 2. Delete all cart items linked to demo products
  await prisma.cartItem.deleteMany({
    where: {
      productId: {
        startsWith: 'prod-'
      }
    }
  });

  // 3. Delete all wishlist items linked to demo products
  await prisma.wishlistItem.deleteMany({
    where: {
      productId: {
        startsWith: 'prod-'
      }
    }
  });

  // 4. Delete all order items linked to demo products
  await prisma.orderItem.deleteMany({
    where: {
      productId: {
        startsWith: 'prod-'
      }
    }
  });

  // 5. Delete all demo products
  const deletedProducts = await prisma.product.deleteMany({
    where: {
      id: {
        startsWith: 'prod-'
      }
    }
  });
  console.log(`Deleted ${deletedProducts.count} demo products.`);

  // 6. Delete demo categories
  const demoSlugs = [
    'kitchen-dining',
    'cleaning-essentials',
    'garden-outdoor',
    'automotive-accessories',
    'health-personal-care',
    'home',
    'kids-toys',
    'smart-gadgets'
  ];

  const deletedCategories = await prisma.category.deleteMany({
    where: {
      slug: {
        in: demoSlugs
      }
    }
  });
  console.log(`Deleted ${deletedCategories.count} demo categories.`);

  // 7. Make sure all remaining (original) products have COD and prepaid enabled
  const updateResult = await prisma.product.updateMany({
    data: {
      codAvailable: true,
      prepaidAvailable: true
    }
  });
  console.log(`Updated ${updateResult.count} original products to enable COD and Prepaid.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });