# Stripe Refund API Documentation

This document describes the enhanced Stripe refund functionality for returning money to clients.

## API Endpoints

### 1. Create Refund
**POST** `/api/stripe/refund`

Creates a new refund for a payment intent or charge.

#### Request Body
```json
{
  "paymentIntentId": "pi_1234567890",  // Required if no chargeId
  "chargeId": "ch_1234567890",        // Required if no paymentIntentId
  "amount": 10.00,                      // Optional: partial refund amount (defaults to full refund)
  "reason": "requested_by_customer",   // Optional: refund reason
  "orderId": "order_123",              // Optional: updates order status if provided
  "refundApplicationFee": false,       // Optional: refund application fees (for connected accounts)
  "reverseTransfer": false             // Optional: reverse transfer (for connected accounts)
}
```

#### Valid Refund Reasons
- `duplicate` - Duplicate charge
- `fraudulent` - Fraudulent charge
- `requested_by_customer` - Customer requested refund (default)

#### Response
```json
{
  "success": true,
  "refund": {
    "id": "re_1234567890",
    "amount": 10.00,
    "currency": "usd",
    "status": "succeeded",
    "reason": "requested_by_customer",
    "created": 1640995200,
    "payment_intent": "pi_1234567890",
    "charge": "ch_1234567890",
    "metadata": {
      "requested_at": "2024-01-01T00:00:00.000Z",
      "requested_by": "admin_system"
    },
    "failure_reason": null,
    "failure_balance_transaction": null
  },
  "message": "Refund processed successfully",
  "next_steps": "Refund has been completed"
}
```

#### Status Values
- `pending` - Refund is being processed (5-10 business days)
- `succeeded` - Refund completed successfully
- `failed` - Refund failed to process
- `canceled` - Refund was canceled

### 2. Get Refund Status
**GET** `/api/stripe/refund-status/:refundId`

Retrieves the current status of a specific refund.

#### Response
```json
{
  "success": true,
  "refund": {
    "id": "re_1234567890",
    "amount": 10.00,
    "currency": "usd",
    "status": "succeeded",
    "reason": "requested_by_customer",
    "created": 1640995200,
    "description": "Refund has been completed successfully"
  }
}
```

### 3. List Refunds for Payment Intent
**GET** `/api/stripe/refunds/:paymentIntentId?limit=10&starting_after=re_123`

Lists all refunds for a specific payment intent.

#### Query Parameters
- `limit` (optional): Number of refunds to return (1-100, default: 10)
- `starting_after` (optional): Refund ID for pagination

#### Response
```json
{
  "success": true,
  "refunds": [
    {
      "id": "re_1234567890",
      "amount": 10.00,
      "currency": "usd",
      "status": "succeeded",
      "reason": "requested_by_customer",
      "created": 1640995200,
      "metadata": {},
      "failure_reason": null
    }
  ],
  "has_more": false,
  "total_count": 1
}
```

## Error Handling

The API provides detailed error messages for different scenarios:

### Common Error Codes
- `INVALID_REQUEST` - Invalid request parameters
- `ALREADY_REFUNDED` - Charge has already been fully refunded
- `AMOUNT_TOO_LARGE` - Refund amount exceeds original charge
- `CHARGE_EXPIRED` - Charge is too old to refund
- `CARD_ERROR` - Card error during refund
- `RATE_LIMIT` - Too many refund requests

### Error Response Format
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "message": "Detailed error message",
    "type": "StripeErrorType",
    "code": "stripe_error_code"
  }
}
```

## Usage Examples

### Full Refund
```bash
curl -X POST http://localhost:5000/api/stripe/refund \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_1234567890",
    "reason": "requested_by_customer"
  }'
```

### Partial Refund
```bash
curl -X POST http://localhost:5000/api/stripe/refund \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_1234567890",
    "amount": 25.50,
    "reason": "duplicate"
  }'
```

### Refund with Order Update
```bash
curl -X POST http://localhost:5000/api/stripe/refund \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_1234567890",
    "orderId": "order_123",
    "reason": "fraudulent"
  }'
```

### Check Refund Status
```bash
curl -X GET http://localhost:5000/api/stripe/refund-status/re_1234567890
```

### List All Refunds for Payment
```bash
curl -X GET "http://localhost:5000/api/stripe/refunds/pi_1234567890?limit=5"
```

## Integration with Order Management

When an `orderId` is provided with the refund request, the system automatically:

1. Updates the order status to `refunded`
2. Stores the refund ID and amount in the order record
3. Records the refund timestamp

This integration helps maintain consistency between payment processing and order management.

## Testing

Use the provided test script to verify the refund functionality:

```bash
# Install axios if not already installed
npm install axios

# Run the test script
node test-stripe-refund.js
```

The test script will:
- Test validation errors
- Verify API responses
- Check error handling

**Note**: Replace the test payment intent ID with an actual ID from your system for full testing.

## Security Considerations

1. **Environment Variables**: Ensure `STRIPE_SECRET_KEY` is properly set in your `.env` file
2. **Validation**: All inputs are validated before processing
3. **Error Messages**: Detailed error messages are only shown in development mode
4. **Rate Limiting**: Implement rate limiting for refund endpoints in production
5. **Authentication**: Consider adding authentication middleware for refund endpoints

## Troubleshooting

### Common Issues

1. **"Stripe is not properly configured"**
   - Check that `STRIPE_SECRET_KEY` is set in `.env`
   - Verify the key format (should start with `sk_test_` or `sk_live_`)

2. **"Invalid refund request"**
   - Verify payment intent ID is valid and exists
   - Check refund amount doesn't exceed original charge
   - Ensure charge hasn't already been refunded

3. **"Refund failed to process"**
   - Check Stripe dashboard for detailed error logs
   - Verify the original payment was successful
   - Contact Stripe support if issue persists

### Getting Help

- Check Stripe documentation: https://stripe.com/docs/api/refunds
- Review Stripe dashboard for transaction details
- Contact Stripe support for account-specific issues