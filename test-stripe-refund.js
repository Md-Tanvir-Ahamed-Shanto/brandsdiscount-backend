/**
 * Stripe Refund API Test Script
 * 
 * This script tests the enhanced Stripe refund functionality
 * Run with: node test-stripe-refund.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/stripe';

// Test data - replace with actual values from your system
const testData = {
    paymentIntentId: 'pi_test_payment_intent_id', // Replace with actual payment intent ID
    amount: 10.00, // $10.00 refund
    reason: 'requested_by_customer',
    orderId: 'test-order-123' // Optional
};

async function testRefundEndpoints() {
    console.log('🧪 Testing Stripe Refund API Endpoints...\n');

    try {
        // Test 1: Create a refund
        console.log('1️⃣ Testing Create Refund Endpoint...');
        console.log('POST', `${BASE_URL}/refund`);
        console.log('Request body:', JSON.stringify(testData, null, 2));

        const refundResponse = await axios.post(`${BASE_URL}/refund`, testData);
        console.log('✅ Refund created successfully:');
        console.log('Refund ID:', refundResponse.data.refund.id);
        console.log('Amount:', `$${refundResponse.data.refund.amount}`);
        console.log('Status:', refundResponse.data.refund.status);
        console.log('Message:', refundResponse.data.message);
        console.log();

        // Test 2: Get refund status
        console.log('2️⃣ Testing Get Refund Status Endpoint...');
        console.log('GET', `${BASE_URL}/refund-status/${refundResponse.data.refund.id}`);

        const statusResponse = await axios.get(`${BASE_URL}/refund-status/${refundResponse.data.refund.id}`);
        console.log('✅ Refund status retrieved:');
        console.log('Status:', statusResponse.data.refund.status);
        console.log('Description:', statusResponse.data.refund.description);
        console.log();

        // Test 3: List refunds for payment intent
        console.log('3️⃣ Testing List Refunds Endpoint...');
        console.log('GET', `${BASE_URL}/refunds/${testData.paymentIntentId}`);

        const listResponse = await axios.get(`${BASE_URL}/refunds/${testData.paymentIntentId}`);
        console.log('✅ Refunds listed successfully:');
        console.log('Total refunds:', listResponse.data.total_count);
        console.log('Refunds:', listResponse.data.refunds.map(r => ({
            id: r.id,
            amount: r.amount,
            status: r.status
        })));
        console.log();

        console.log('🎉 All refund tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data.error);
            console.error('Code:', error.response.data.code);
            
            if (error.response.data.details) {
                console.error('Details:', error.response.data.details);
            }
        } else {
            console.error('Network/Connection error:', error.message);
        }
        
        console.error('\n💡 Tips for common issues:');
        console.error('- Make sure your server is running on port 5000');
        console.error('- Check that STRIPE_SECRET_KEY is set in your .env file');
        console.error('- Use a valid payment intent ID from a successful payment');
        console.error('- For testing, use Stripe test payment intent IDs');
    }
}

// Test validation errors
async function testValidationErrors() {
    console.log('\n🔍 Testing Validation Errors...\n');

    const testCases = [
        {
            name: 'Missing payment identifier',
            data: { amount: 10.00 },
            expectedError: 'Either Payment Intent ID or Charge ID is required'
        },
        {
            name: 'Invalid refund reason',
            data: { paymentIntentId: 'pi_test', reason: 'invalid_reason' },
            expectedError: 'Invalid refund reason'
        },
        {
            name: 'Negative refund amount',
            data: { paymentIntentId: 'pi_test', amount: -10.00 },
            expectedError: 'Refund amount must be a positive number'
        },
        {
            name: 'Excessive refund amount',
            data: { paymentIntentId: 'pi_test', amount: 1000000 },
            expectedError: 'Refund amount exceeds maximum allowed'
        }
    ];

    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);
        try {
            await axios.post(`${BASE_URL}/refund`, testCase.data);
            console.log('❌ Expected validation error but request succeeded');
        } catch (error) {
            if (error.response && error.response.data.error.includes(testCase.expectedError)) {
                console.log('✅ Validation error caught correctly');
            } else {
                console.log('❌ Unexpected error:', error.response?.data?.error || error.message);
            }
        }
        console.log();
    }
}

// Run tests
async function runAllTests() {
    console.log('🚀 Starting Stripe Refund API Tests...\n');
    
    // First test validation errors
    await testValidationErrors();
    
    // Then test main functionality (requires valid payment intent)
    console.log('⚠️  Note: Main functionality test requires a valid payment intent ID.');
    console.log('Replace the testData.paymentIntentId with an actual payment intent ID to test.\n');
    
    // Uncomment the line below when you have a valid payment intent ID
    // await testRefundEndpoints();
}

// Check if axios is available
try {
    require('axios');
    runAllTests();
} catch (error) {
    console.error('❌ axios is required for testing. Install it with:');
    console.error('npm install axios');
}