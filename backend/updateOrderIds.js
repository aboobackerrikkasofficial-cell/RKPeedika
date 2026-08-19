import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });

  console.log(`Found ${orders.length} orders to process.`);

  let updatedCount = 0;
  for (const order of orders) {
    let orderPrefix = "ODR";
    if (order.orderItems && order.orderItems.length > 0 && order.orderItems[0].productName) {
      const firstChar = order.orderItems[0].productName.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) {
        orderPrefix = firstChar;
      }
    }
    
    const newOrderId = `${orderPrefix}${Math.floor(100000 + Math.random() * 900000)}`;
    
    await prisma.order.update({
      where: { id: order.id },
      data: { orderId: newOrderId },
    });
    console.log(`Updated Order ID: ${order.id} -> ${newOrderId}`);
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
