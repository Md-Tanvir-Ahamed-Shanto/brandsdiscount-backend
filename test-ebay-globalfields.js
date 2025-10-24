const { createEbayProduct, createEbayProduct2, createEbayProduct3 } = require('./services/ebayCreateProduct');
const fs = require('fs');
const path = require('path');

// Load global required fields
let globalRequiredFields = [];
try {
  const fieldsPath = path.join(__dirname, 'ebay_required_fields_corrected.json');
  const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
  globalRequiredFields = fieldsData.globalRequiredFields || [];
  console.log('✅ Loaded globalRequiredFields:', globalRequiredFields);
} catch (error) {
  console.error('❌ Error loading globalRequiredFields:', error.message);
  // Fallback to basic required fields
  globalRequiredFields = ['Brand', 'Size', 'Size Type', 'Color', 'Department'];
  console.log('🔄 Using fallback globalRequiredFields:', globalRequiredFields);
}

// Test products for different categories
const testProducts = [
  {
    name: "Women's Dress",
    product: {
      sku: `WOMENS-DRESS-${Date.now()}`,
      title: "Women's Elegant Evening Dress Black Size M",
      description: "Beautiful women's evening dress in black, size M. Perfect for special occasions.",
      regularPrice: 229.99,
      stockQuantity: 5,
      images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGvejKIt5fqExjDjKhEIEQVuOWC49sS5J4DQ&s"],
      categoryId: "63861", // Women's Dresses
      size: "M",
      sizeType: "Regular",
      department: "Women",
      color: "Black",
      brandName: "Fashion Brand"
    }
  },
  {
    name: "Men's T-Shirt",
    product: {
      sku: `MENS-TSHIRT-${Date.now()}`,
      title: "Men's Casual Cotton T-Shirt Navy Size L",
      description: "Men's casual cotton t-shirt in navy blue, size L. Comfortable and stylish.",
      regularPrice: 224.99,
      stockQuantity: 10,
      images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGvejKIt5fqExjDjKhEIEQVuOWC49sS5J4DQ&s"],
      categoryId: "15687", // Men's T-Shirts
      size: "L",
      sizeType: "Regular",
      department: "Men",
      color: "Navy",
      brandName: "Casual Wear Co"
    }
  },
  {
    name: "Kids Top",
    product: {
      sku: `KIDS-TOP-${Date.now()}`,
      title: "Kids Colorful T-Shirt Red Size 8",
      description: "Fun and colorful kids t-shirt in red, size 8. Perfect for active children.",
      regularPrice: 119.99,
      stockQuantity: 8,
      images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGvejKIt5fqExjDjKhEIEQVuOWC49sS5J4DQ&s"],
      categoryId: "155199", // Kids Tops & T-Shirts
      size: "8",
      sizeType: "Kids",
      department: "Teens",
      color: "Red",
      brandName: "Kids Fashion"
    }
  }
];

// Function to test a single eBay platform
async function testEbayPlatform(platformName, createFunction, product, globalFields) {
  console.log(`\n🧪 Testing ${platformName} with ${product.name}...`);
  console.log(`   SKU: ${product.product.sku}`);
  console.log(`   Category: ${product.product.categoryId} (${product.product.department})`);
  
  // Create proper globalRequiredFields object from product data
  const globalRequiredFieldsObject = {
    "Brand": product.product.brandName || "Unbranded",
    "Color": product.product.color || "Multi-Color", 
    "Department": product.product.department || "Unisex",
    "Size": product.product.size || "One Size",
    "Size Type": product.product.sizeType || "Regular"
  };
  
  console.log(`   Global Fields:`, globalRequiredFieldsObject);
  
  try {
    const result = await createFunction(product.product, globalRequiredFieldsObject);
    
    if (result.success) {
      console.log(`✅ ${platformName} SUCCESS:`, {
        listingId: result.listingId || 'N/A',
        message: result.message || 'Product created successfully'
      });
    } else {
      console.log(`❌ ${platformName} FAILED:`, {
        error: result.error || 'Unknown error',
        details: result.details || 'No additional details'
      });
    }
    
    return result;
  } catch (error) {
    console.error(`💥 ${platformName} EXCEPTION:`, {
      message: error.message,
      stack: error.stack?.split('\n')[0] || 'No stack trace'
    });
    return { success: false, error: error.message };
  }
}

// Function to test all platforms with all products
async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive eBay Product Creation Test');
  console.log('=' .repeat(60));
  
  const platforms = [
    { name: 'eBay1', func: createEbayProduct },
    { name: 'eBay2', func: createEbayProduct2 },
    { name: 'eBay3', func: createEbayProduct3 }
  ];
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    details: []
  };
  
  for (const testProduct of testProducts) {
    console.log(`\n📦 Testing Product: ${testProduct.name}`);
    console.log('-'.repeat(40));
    
    for (const platform of platforms) {
      const result = await testEbayPlatform(
        platform.name, 
        platform.func, 
        testProduct, 
        globalRequiredFields
      );
      
      results.total++;
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
      
      results.details.push({
        product: testProduct.name,
        platform: platform.name,
        success: result.success,
        error: result.error || null
      });
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Print summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.successful / results.total) * 100).toFixed(1)}%`);
  
  console.log('\n📋 DETAILED RESULTS:');
  results.details.forEach((detail, index) => {
    const status = detail.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${detail.platform} - ${detail.product}`);
    if (!detail.success && detail.error) {
      console.log(`   Error: ${detail.error}`);
    }
  });
  
  return results;
}

// Function to test globalRequiredFields validation
async function testGlobalFieldsValidation() {
  console.log('\n🔍 Testing GlobalRequiredFields Validation');
  console.log('=' .repeat(60));
  
  // Test with missing required fields
  const incompleteProduct = {
    sku: `INCOMPLETE-${Date.now()}`,
    title: "Incomplete Product Test",
    description: "This product is missing some required fields",
    regularPrice: 229.99,
    stockQuantity: 1,
    images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGvejKIt5fqExjDjKhEIEQVuOWC49sS5J4DQ&s"],
    categoryId: "15687"
    // Missing: size, sizeType, department, color, brandName
  };
  
  console.log('🧪 Testing with incomplete product (missing required fields)...');
  try {
    const result = await createEbayProduct(incompleteProduct, globalRequiredFields);
    console.log('Result:', result);
  } catch (error) {
    console.log('Expected error caught:', error.message);
  }
}

// Main execution
async function main() {
  try {
    // Run comprehensive test
    const results = await runComprehensiveTest();
    
    // Test validation
    await testGlobalFieldsValidation();
    
    console.log('\n🎉 Test execution completed!');
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✨ All tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runComprehensiveTest,
  testGlobalFieldsValidation,
  testProducts,
  globalRequiredFields
};