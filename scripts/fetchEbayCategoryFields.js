const axios = require("axios");
const fs = require("fs");
const path = require("path");

// eBay API Configuration
const EBAY_TAXONOMY_BASE_URL = "https://api.ebay.com/commerce/taxonomy/v1";
const EBAY_ACCESS_TOKEN = "v^1.1#i^1#r^0#p^3#f^0#I^3#t^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";

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const MAX_RETRIES = 3;

/**
 * Sleep function for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make API request with retry logic
 */
async function makeApiRequest(url, retryCount = 0) {
  try {
    console.log(`🔄 Fetching: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${EBAY_ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching ${url}:`, error.response?.data || error.message);
    
    if (retryCount < MAX_RETRIES && error.response?.status >= 500) {
      console.log(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(RATE_LIMIT_DELAY * (retryCount + 1)); // Exponential backoff
      return makeApiRequest(url, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Extract all unique eBay category IDs from categoryMapping.json
 */
function extractCategoryIds() {
  const categoryMappingPath = path.join(__dirname, '..', 'categoryMaping.json');
  
  if (!fs.existsSync(categoryMappingPath)) {
    throw new Error(`Category mapping file not found: ${categoryMappingPath}`);
  }

  const categoryMapping = JSON.parse(fs.readFileSync(categoryMappingPath, 'utf8'));
  const categoryIds = new Set();

  function extractIds(obj) {
    if (typeof obj === 'object' && obj !== null) {
      if (obj.ebay_category) {
        if (Array.isArray(obj.ebay_category)) {
          obj.ebay_category.forEach(cat => {
            if (cat.id) categoryIds.add(cat.id);
          });
        } else if (obj.ebay_category.id) {
          categoryIds.add(obj.ebay_category.id);
        }
      }
      
      // Recursively search through all properties
      Object.values(obj).forEach(value => extractIds(value));
    }
  }

  extractIds(categoryMapping);
  
  console.log(`📊 Found ${categoryIds.size} unique eBay category IDs`);
  return Array.from(categoryIds).sort();
}

/**
 * Fetch item aspects for a specific category
 */
async function fetchCategoryAspects(categoryId) {
  const url = `${EBAY_TAXONOMY_BASE_URL}/category_tree/0/get_item_aspects_for_category?category_id=${categoryId}`;
  
  try {
    const data = await makeApiRequest(url);
    
    return {
      categoryId,
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      categoryId,
      success: false,
      error: error.response?.data || error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Process all categories and fetch their aspects with batch processing
 */
async function fetchAllCategoryAspects() {
  console.log('🚀 Starting eBay Category Aspects Fetcher');
  
  // Extract category IDs
  const categoryIds = extractCategoryIds();
  console.log(`📋 Categories to process: ${categoryIds.join(', ')}`);
  
  const results = {
    summary: {
      totalCategories: categoryIds.length,
      successful: 0,
      failed: 0,
      startTime: new Date().toISOString(),
      endTime: null
    },
    categories: {}
  };

  // Process categories in batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < categoryIds.length; i += BATCH_SIZE) {
    batches.push(categoryIds.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Processing ${categoryIds.length} categories in ${batches.length} batches of ${BATCH_SIZE}`);
  console.log('');

  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} categories)`);
    
    // Process each category in the batch
    for (let i = 0; i < batch.length; i++) {
      const categoryId = batch[i];
      const overallIndex = batchIndex * BATCH_SIZE + i + 1;
      
      console.log(`\n📦 Processing category ${overallIndex}/${categoryIds.length}: ${categoryId}`);
      
      try {
        const result = await fetchCategoryAspects(categoryId);
        results.categories[categoryId] = result;
        
        if (result.success) {
          results.summary.successful++;
          console.log(`✅ Successfully fetched aspects for category ${categoryId}`);
          
          // Log some basic info about the aspects
          if (result.data.aspects && result.data.aspects.length > 0) {
            const requiredAspects = result.data.aspects.filter(aspect => aspect.aspectConstraint === 'REQUIRED');
            console.log(`   📋 Total aspects: ${result.data.aspects.length}, Required: ${requiredAspects.length}`);
          }
        } else {
          results.summary.failed++;
          console.log(`❌ Failed to fetch aspects for category ${categoryId}: ${result.error}`);
        }
      } catch (error) {
        results.summary.failed++;
        results.categories[categoryId] = {
          categoryId,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        console.log(`💥 Exception while processing category ${categoryId}: ${error.message}`);
      }
      
      // Rate limiting - wait between requests
      if (i < batch.length - 1 || batchIndex < batches.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
    }
    
    // Save intermediate results after each batch
    const intermediateOutputPath = path.join(__dirname, '..', 'ebay_category_aspects_partial.json');
    try {
      fs.writeFileSync(intermediateOutputPath, JSON.stringify(results, null, 2));
      console.log(`💾 Intermediate results saved after batch ${batchIndex + 1}`);
    } catch (saveError) {
      console.log(`⚠️  Failed to save intermediate results: ${saveError.message}`);
    }
    
    // Longer pause between batches
    if (batchIndex < batches.length - 1) {
      console.log(`⏸️  Pausing 3 seconds between batches...`);
      await sleep(3000);
    }
  }

  results.summary.endTime = new Date().toISOString();
  
  // Save final results to file
  try {
    const outputPath = path.join(__dirname, '..', 'ebay_category_aspects.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total categories: ${results.summary.totalCategories}`);
    console.log(`   Successful: ${results.summary.successful}`);
    console.log(`   Failed: ${results.summary.failed}`);
    console.log(`   Results saved to: ${outputPath}`);
    
    // Generate a simplified required fields summary
    generateRequiredFieldsSummary(results);
    
    // Clean up intermediate file
    const intermediateOutputPath = path.join(__dirname, '..', 'ebay_category_aspects_partial.json');
    if (fs.existsSync(intermediateOutputPath)) {
      fs.unlinkSync(intermediateOutputPath);
      console.log(`🗑️  Cleaned up intermediate file`);
    }
    
  } catch (saveError) {
    console.error(`💥 Failed to save final results: ${saveError.message}`);
    throw saveError;
  }
  
  return results;
}

/**
 * Generate a simplified summary of required fields for each category
 */
function generateRequiredFieldsSummary(results) {
  try {
    const summary = {
      generatedAt: new Date().toISOString(),
      categories: {}
    };

    Object.entries(results.categories).forEach(([categoryId, result]) => {
      try {
        if (result.success && result.data && result.data.aspects) {
          const requiredAspects = result.data.aspects
            .filter(aspect => aspect.aspectConstraint === 'REQUIRED')
            .map(aspect => ({
              name: aspect.localizedAspectName || 'Unknown',
              dataType: aspect.aspectDataType || 'STRING',
              values: aspect.aspectValues ? aspect.aspectValues.map(v => v.localizedValue || v.value || 'Unknown') : [],
              maxLength: aspect.aspectMaxLength || null,
              aspectUsage: aspect.aspectUsage || 'UNKNOWN'
            }));

          summary.categories[categoryId] = {
            categoryName: result.data.categoryTreeNode?.category?.categoryName || 'Unknown',
            totalAspects: result.data.aspects.length,
            requiredAspects: requiredAspects
          };
        }
      } catch (categoryError) {
        console.log(`⚠️  Error processing category ${categoryId} for summary: ${categoryError.message}`);
        summary.categories[categoryId] = {
          categoryName: 'Error',
          totalAspects: 0,
          requiredAspects: [],
          error: categoryError.message
        };
      }
    });

    const summaryPath = path.join(__dirname, '..', 'ebay_required_fields_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📋 Required fields summary saved to: ${summaryPath}`);
  } catch (error) {
    console.error(`💥 Failed to generate required fields summary: ${error.message}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    await fetchAllCategoryAspects();
    console.log('\n🎉 Script completed successfully!');
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Export functions for potential reuse
module.exports = {
  extractCategoryIds,
  fetchCategoryAspects,
  fetchAllCategoryAspects,
  generateRequiredFieldsSummary
};

// Run the script if called directly
if (require.main === module) {
  main();
}