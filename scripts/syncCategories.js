const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

/**
 * Script to sync all categories from categoryMaping.json to the database
 * This ensures all website categories and their eBay mappings are properly stored
 */
async function syncCategories() {
  try {
    console.log('Starting category synchronization...');
    
    // Read the category mapping file
    const categoryMappingPath = path.join(__dirname, '..', 'categoryMaping.json');
    const categoryMapping = JSON.parse(fs.readFileSync(categoryMappingPath, 'utf8'));
    
    // Track all created categories for reporting
    const createdCategories = [];
    const updatedCategories = [];
    const errors = [];
    
    // Process women's categories
    await processMainCategory('Women\'s', categoryMapping.womens_categories);
    
    // Process men's categories
    await processMainCategory('Men\'s', categoryMapping.mens_categories);
    
    // Process kids' categories
    await processMainCategory('Kids', categoryMapping.kids_categories);
    
    // Process general categories
    await processGeneralCategories(categoryMapping.general_categories);
    
    console.log('\n===== SYNC SUMMARY =====');
    console.log(`Created categories: ${createdCategories.length}`);
    console.log(`Updated categories: ${updatedCategories.length}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n===== ERRORS =====');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err}`);
      });
    }
    
    console.log('\nCategory synchronization completed!');
    
    /**
     * Process a main category section (Women's, Men's, Kids)
     */
    async function processMainCategory(mainCategoryName, categorySections) {
      // Create or find the main parent category
      let mainParentCategory;
      try {
        // First check if the category exists
        mainParentCategory = await prisma.category.findFirst({
          where: { 
            name: mainCategoryName,
            parentCategoryId: null
          }
        });
        
        if (mainParentCategory) {
          // If it exists, update it
          mainParentCategory = await prisma.category.update({
            where: { id: mainParentCategory.id },
            data: { name: mainCategoryName }
          });
        } else {
          // If it doesn't exist, create it
          mainParentCategory = await prisma.category.create({
            data: {
              name: mainCategoryName,
              parentCategoryId: null
            }
          });
          createdCategories.push(`Main category "${mainCategoryName}"`);
        }
        console.log(`Main category "${mainCategoryName}" processed`);
      } catch (error) {
        errors.push(`Failed to create/update main category "${mainCategoryName}": ${error.message}`);
        return;
      }
      
      // Process each section within the main category
      for (const [sectionName, categories] of Object.entries(categorySections)) {
        // Convert section name to title case (e.g., "womens_tops" -> "Tops")
        const formattedSectionName = sectionName
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Create or find the section category
        let sectionCategory;
        try {
          // First check if the section category exists
          sectionCategory = await prisma.category.findFirst({
            where: { 
              name: formattedSectionName,
              parentCategoryId: mainParentCategory.id
            }
          });
          
          if (sectionCategory) {
            // If it exists, update it
            sectionCategory = await prisma.category.update({
              where: { id: sectionCategory.id },
              data: { name: formattedSectionName }
            });
            updatedCategories.push(`Section "${formattedSectionName}" under "${mainCategoryName}"`);
          } else {
            // If it doesn't exist, create it
            sectionCategory = await prisma.category.create({
              data: {
                name: formattedSectionName,
                parentCategoryId: mainParentCategory.id
              }
            });
            createdCategories.push(`Section "${formattedSectionName}" under "${mainCategoryName}"`);
          }
          console.log(`Section "${formattedSectionName}" under "${mainCategoryName}" processed`);
        } catch (error) {
          errors.push(`Failed to create/update section "${formattedSectionName}": ${error.message}`);
          continue;
        }
        
        // Process each category within the section
        for (const category of categories) {
          try {
            // Check if the category already exists by name and parent
            const existingCategory = await prisma.category.findFirst({
              where: { 
                name: category.website_category_name,
                parentCategoryId: sectionCategory.id
              }
            });
            
            if (existingCategory) {
              // Update the existing category
              await prisma.category.update({
                where: { id: existingCategory.id },
                data: {
                  name: category.website_category_name
                }
              });
              updatedCategories.push(category.website_category_name);
              console.log(`Updated category "${category.website_category_name}"`);
            } else {
              // Create a new category with the specified ID
              await prisma.category.create({
                data: {
                  id: category.website_category_id,
                  name: category.website_category_name,
                  parentCategoryId: sectionCategory.id
                }
              });
              createdCategories.push(category.website_category_name);
              console.log(`Created category "${category.website_category_name}"`);
            }
          } catch (error) {
            errors.push(`Failed to process category "${category.website_category_name}": ${error.message}`);
          }
        }
      }
    }
    
    /**
     * Process general categories that don't fit into the main hierarchy
     */
    async function processGeneralCategories(generalCategories) {
      for (const category of generalCategories) {
        try {
          // Check if the category already exists by name
          const existingCategory = await prisma.category.findFirst({
            where: { 
              name: category.website_category_name,
              parentCategoryId: null
            }
          });
          
          if (existingCategory) {
            // Update the existing category
            await prisma.category.update({
              where: { id: existingCategory.id },
              data: {
                name: category.website_category_name
              }
            });
            updatedCategories.push(category.website_category_name);
            console.log(`Updated general category "${category.website_category_name}"`);
          } else {
            // Create a new category with the specified ID
            await prisma.category.create({
              data: {
                id: category.website_category_id,
                name: category.website_category_name,
                parentCategoryId: null
              }
            });
            createdCategories.push(category.website_category_name);
            console.log(`Created general category "${category.website_category_name}"`);
          }
        } catch (error) {
          errors.push(`Failed to process general category "${category.website_category_name}": ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to sync categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync function
syncCategories()
  .catch(error => {
    console.error('Unhandled error during category sync:', error);
    process.exit(1);
  });