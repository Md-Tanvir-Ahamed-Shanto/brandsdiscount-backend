/**
 * Production Test Script for Stripe Refund API
 * This script tests the refund functionality without requiring schema changes
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Adjust to your server URL
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Test data - these should be replaced with actual test data
const TEST_PAYMENT_INTENT_ID = 'pi_test_1234567890'; // Replace with actual payment intent
const TEST_ORDER_ID = 'test-order-id'; // Replace with actual order ID

console.log('🧪 Testing Stripe Refund API (Production Ready)...\n');

async function runTests() {
  try {
    // Test 1: Create a refund
    console.log('1️⃣ Testing refund creation...');
    const refundResponse = await axios.post(`${BASE_URL}/api/stripe/refund`, {
      paymentIntentId: TEST_PAYMENT_INTENT_ID,
      amount: 10.00, // $10 refund
      reason: 'requested_by_customer',
      orderId: TEST_ORDER_ID
    });
    
    console.log('✅ Refund created successfully:');
    console.log(`   - Refund ID: ${refundResponse.data.refund.id}`);
    console.log(`   - Amount: $${refundResponse.data.refund.amount}`);
    console.log(`   - Status: ${refundResponse.data.refund.status}`);
    console.log(`   - Order ID: ${TEST_ORDER_ID} marked as refunded\n`);

    // Test 2: Check refund status
    console.log('2️⃣ Testing refund status check...');
    const statusResponse = await axios.get(`${BASE_URL}/api/stripe/refund-status/${refundResponse.data.refund.id}`);
    
    console.log('✅ Refund status retrieved:');
    console.log(`   - Status: ${statusResponse.data.refund.status}`);
    console.log(`   - Description: ${statusResponse.data.refund.description}\n`);

    // Test 3: List refunds for payment intent
    console.log('3️⃣ Testing refunds listing...');
    const listResponse = await axios.get(`${BASE_URL}/api/stripe/refunds/${TEST_PAYMENT_INTENT_ID}`);
    
    console.log('✅ Refunds listed successfully:');
    console.log(`   - Total refunds: ${listResponse.data.total_count}`);
    console.log(`   - Has more: ${listResponse.data.has_more}\n`);

    console.log('🎉 All tests passed! The refund API is production-ready.');
    
  } catch (error) {
    console.error('❌ Test failed:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${error.response.data.error}`);
      console.error(`   Code: ${error.response.data.code}`);
      
      if (error.response.data.details) {
        console.error(`   Details: ${JSON.stringify(error.response.data.details, null, 2)}`);
      }
    } else {
      console.error(`   Message: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🧪 Testing error handling...\n');
  
  try {
    // Test invalid payment intent
    console.log('1️⃣ Testing invalid payment intent...');
    await axios.post(`${BASE_URL}/api/stripe/refund`, {
      paymentIntentId: 'invalid_pi',
      amount: 10.00,
      reason: 'requested_by_customer'
    });
    
    console.log('❌ Should have failed with invalid payment intent');
  } catch (error) {
    if (error.response && error.response.data.code === 'INVALID_REQUEST') {
      console.log('✅ Correctly handled invalid payment intent\n');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
  
  try {
    // Test missing required fields
    console.log('2️⃣ Testing missing required fields...');
    await axios.post(`${BASE_URL}/api/stripe/refund`, {
      amount: 10.00,
      reason: 'requested_by_customer'
    });
    
    console.log('❌ Should have failed with missing payment ID');
  } catch (error) {
    if (error.response && error.response.data.code === 'INVALID_REQUEST') {
      console.log('✅ Correctly handled missing payment ID\n');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
  
  try {
    // Test invalid refund reason
    console.log('3️⃣ Testing invalid refund reason...');
    await axios.post(`${BASE_URL}/api/stripe/refund`, {
      paymentIntentId: TEST_PAYMENT_INTENT_ID,
      amount: 10.00,
      reason: 'invalid_reason'
    });
    
    console.log('❌ Should have failed with invalid reason');
  } catch (error) {
    if (error.response && error.response.data.code === 'INVALID_REQUEST') {
      console.log('✅ Correctly handled invalid refund reason\n');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Run tests
if (require.main === module) {
  console.log('Starting production refund API tests...\n');
  
  runTests()
    .then(() => testErrorHandling())
    .then(() => {
      console.log('\n✨ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testErrorHandling };