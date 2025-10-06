const { createEbayProduct, createEbayProduct2, createEbayProduct3 } = require('./services/ebayCreateProduct');

// Demo product with the provided t-shirt image
const testProduct = {
  sku: `TSHIRT1-TEST-${Date.now()}`,
  title: "Demo T-Shirt for Testing",
  description: "This is a test t-shirt product for eBay listing",
  regularPrice: 19.99,
  stockQuantity: 10,
  images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGvejKIt5fqExjDjKhEIEQVuOWC49sS5J4DQ&s"],
  categoryId: "53159", // Men's T-Shirts category
  size: "L",
  sizeType: "Regular",
  type: "T-Shirt",
  department: "Men's Clothing",
  color: "Black"
};

// Function to test all three eBay platforms
async function testEbayProductCreation() {
  console.log(`Starting test with product SKU: ${testProduct.sku}`);
  
  try {
    // Test eBay1
    console.log("Testing eBay1 product creation...");
    const ebay1Result = await createEbayProduct(testProduct);
    console.log("eBay1 Result:", ebay1Result);
  } catch (error) {
    console.error("eBay1 Test Failed:", error.message);
  }
  
  try {
    // Test eBay2
    console.log("Testing eBay2 product creation...");
    const ebay2Result = await createEbayProduct2(testProduct);
    console.log("eBay2 Result:", ebay2Result);
  } catch (error) {
    console.error("eBay2 Test Failed:", error.message);
  }
  
  try {
    // Test eBay3
    console.log("Testing eBay3 product creation...");
    const ebay3Result = await createEbayProduct3(testProduct);
    console.log("eBay3 Result:", ebay3Result);
  } catch (error) {
    console.error("eBay3 Test Failed:", error.message);
  }
}

// Run the test
testEbayProductCreation()
  .then(() => {
    console.log("Test completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("Test failed:", error);
    process.exit(1);
  });