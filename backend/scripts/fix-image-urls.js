/**
 * Migration script: Find and report products with broken local-filesystem image URLs.
 *
 * These are images stored as "/uploads/..." which point to Render's ephemeral disk
 * and are no longer accessible. Since the original files were never uploaded to
 * Cloudinary, they cannot be recovered programmatically.
 *
 * Usage:
 *   node scripts/fix-image-urls.js            # Report only (dry run)
 *   node scripts/fix-image-urls.js --fix      # Clear broken URLs
 *
 * After running with --fix, you must re-upload images for affected products
 * through the admin dashboard.
 */

import '../src/config/env.js';
import prisma from '../src/config/db.js';

const DRY_RUN = !process.argv.includes('--fix');

async function main() {
  console.log(DRY_RUN
    ? '🔍 DRY RUN — Scanning for broken image URLs (no changes will be made)'
    : '🔧 FIX MODE — Will clear broken image URLs'
  );
  console.log('');

  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true }
  });

  let affectedCount = 0;

  for (const product of products) {
    let images;
    try {
      images = typeof product.images === 'string'
        ? JSON.parse(product.images)
        : product.images;
    } catch {
      images = [];
    }

    if (!Array.isArray(images)) images = [];

    // Find images that are relative paths (not absolute URLs)
    const brokenImages = images.filter(img =>
      typeof img === 'string' &&
      !img.startsWith('http://') &&
      !img.startsWith('https://') &&
      !img.startsWith('data:')
    );

    if (brokenImages.length > 0) {
      affectedCount++;
      console.log(`❌ Product: "${product.name}" (${product.id})`);
      console.log(`   Broken images (${brokenImages.length}):`);
      brokenImages.forEach(img => console.log(`     - ${img}`));

      // Keep any valid absolute URLs
      const validImages = images.filter(img =>
        typeof img === 'string' && (
          img.startsWith('http://') ||
          img.startsWith('https://') ||
          img.startsWith('data:')
        )
      );

      if (!DRY_RUN) {
        await prisma.product.update({
          where: { id: product.id },
          data: { images: JSON.stringify(validImages) }
        });
        console.log(`   ✅ Updated: kept ${validImages.length} valid image(s), removed ${brokenImages.length} broken one(s)`);
      } else {
        console.log(`   Would keep ${validImages.length} valid image(s), remove ${brokenImages.length} broken one(s)`);
      }
      console.log('');
    }
  }

  console.log('─'.repeat(60));
  console.log(`Total products scanned: ${products.length}`);
  console.log(`Products with broken images: ${affectedCount}`);

  if (affectedCount > 0 && DRY_RUN) {
    console.log('');
    console.log('Run with --fix to clear broken URLs:');
    console.log('  node scripts/fix-image-urls.js --fix');
    console.log('');
    console.log('After fixing, re-upload images for affected products via the admin dashboard.');
  }

  if (affectedCount === 0) {
    console.log('✅ No broken image URLs found!');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
