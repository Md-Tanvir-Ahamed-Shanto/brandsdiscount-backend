const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Path to the CSV file
const csvFilePath = path.join(__dirname, '..', 'products.csv');

async function updateProductCategories() {
  try {
    console.log('Starting product category update process...');
    
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      escape: false
    });
    
    console.log(`Loaded ${records.length} records from CSV file`);
    
    // Counter for tracking updates
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each record
    for (const record of records) {
      const sku = record.sku;
      const categoryId = record.category_ids;
      
      if (!sku || !categoryId) {
        console.log(`Skipping record with missing sku or category_ids: ${JSON.stringify(record)}`);
        continue;
      }
      
      try {
        // First check if the product exists
        const product = await prisma.product.findUnique({
          where: { sku: sku }
        });
        
        if (product) {
          // Update the product in the database
          await prisma.product.update({
            where: { sku: sku },
            data: { categoryId: categoryId }
          });
          
          updatedCount++;
          
          // Log progress every 100 records
          if (updatedCount % 100 === 0) {
            console.log(`Updated ${updatedCount} products so far...`);
          }
        } else {
          console.log(`Skipping update: Product with SKU ${sku} not found in database`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error updating product with SKU ${sku}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nUpdate complete!`);
    console.log(`Successfully updated ${updatedCount} products`);
    console.log(`Failed to update ${errorCount} products`);
    
  } catch (error) {
    console.error('Error in update process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updateProductCategories()
  .then(() => console.log('Process finished'))
  .catch(error => console.error('Process failed:', error));