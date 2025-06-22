import fs from 'fs';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const results = [];

  fs.createReadStream('products_export.csv')  // এখানে তোমার CSV ফাইলের নাম দিন
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        for (const product of results) {
          await prisma.product.create({
            data: {
              // CSV কলামের নামের সাথে Prisma মডেলের ফিল্ড নাম মিলে কিনা চেক করে নাও
              name: product.name,
              price: parseFloat(product.price),        // number ফিল্ড হলে parseFloat করো
              description: product.description,
              category: product.category,
            },
          });
        }
        console.log('Import completed successfully!');
      } catch (error) {
        console.error('Error importing data:', error);
      } finally {
        await prisma.$disconnect();
      }
    });
}

main();
