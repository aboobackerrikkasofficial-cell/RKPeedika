import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  const email = 'admin@kritimarketplace.com';
  const password = 'adminpassword';
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, role: 'admin', phone: '9876543210' },
    create: {
      email,
      password: hashedPassword,
      name: 'Super Admin',
      phone: '9876543210',
      role: 'admin'
    }
  });
  console.log('Admin user seeded/updated with phone: 9876543210');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
