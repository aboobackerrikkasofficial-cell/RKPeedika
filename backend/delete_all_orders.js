import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany({});
  console.log('Deleted payments');
  await prisma.orderItem.deleteMany({});
  console.log('Deleted order items');
  await prisma.orderTrackingEvent.deleteMany({});
  console.log('Deleted order tracking events');
  await prisma.returnRequest.deleteMany({});
  console.log('Deleted return requests');
  await prisma.exchangeRequest.deleteMany({});
  console.log('Deleted exchange requests');
  await prisma.order.deleteMany({});
  console.log('Deleted orders');
  console.log('All orders and related records deleted successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
