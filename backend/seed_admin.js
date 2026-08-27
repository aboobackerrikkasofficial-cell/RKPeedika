import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      '❌ ADMIN_EMAIL and ADMIN_PASSWORD are required.'
    );
    process.exit(1);
  }

  console.log(`🔐 Preparing admin account: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: {
      email: email.toLowerCase().trim()
    },

    update: {
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    },

    create: {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: 'Super Admin',
      phone: '9876543210',
      role: 'admin',
      status: 'active'
    }
  });

  const updateDelivery = await prisma.product.updateMany({
    data: { estimatedDeliveryDays: 7 }
  });

  console.log('======================================');
  console.log('✅ ADMIN ACCOUNT READY');
  console.log(`📧 Email: ${admin.email}`);
  console.log(`👤 Role: ${admin.role}`);
  console.log(`📦 Delivery time set to 7 days for ${updateDelivery.count} products`);
  console.log('🔑 Password: configured from ADMIN_PASSWORD');
  console.log('======================================');
}

main()
  .catch((error) => {
    console.error('❌ Admin seed failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });