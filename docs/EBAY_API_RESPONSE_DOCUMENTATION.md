# eBay API Response Documentation

## Overview

This documentation provides a comprehensive guide for handling eBay API responses in the frontend application. The backend has been optimized with standardized response structures, improved error handling, and timeout optimizations.

## Table of Contents

1. [Response Structure](#response-structure)
2. [Success Responses](#success-responses)
3. [Error Responses](#error-responses)
4. [Error Categories](#error-categories)
5. [Frontend Implementation Examples](#frontend-implementation-examples)
6. [Best Practices](#best-practices)

---

## Response Structure

All eBay API operations return standardized responses with the following base structure:

```typescript
interface EbayResponse {
  success: boolean;
  platform: string;
  timestamp: string;
  data?: any;      // Present only on success
  error?: any;     // Present only on failure
}
```

---

## Success Responses

### Individual Platform Success

When an eBay platform operation succeeds, you'll receive:

```json
{
  "success": true,
  "platform": "eBay1", // or "eBay2", "eBay3"
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "sku": "PRODUCT-SKU-123",
    "offerId": "12345678901234567890",
    "message": "Successfully created and published product on eBay1"
  }
}
```

### Product Creation API Response

The main product creation endpoint returns a comprehensive response:

```json
{
  "success": true,
  "message": "Product \"Sample Product\" (SKU: PROD-123) created successfully in local database. Successfully listed on all 2 eBay platform(s). Platforms: eBayOne (Offer ID: 12345), eBayTwo (Offer ID: 67890).",
  "data": {
    "product": {
      "id": 123,
      "title": "Sample Product",
      "sku": "PROD-123",
      "status": "Active",
      // ... other product fields
    },
    "summary": {
      "productId": 123,
      "sku": "PROD-123",
      "title": "Sample Product",
      "status": "Active",
      "variantsCount": 2,
      "imagesCount": 3,
      "ebayListings": {
        "attempted": 2,
        "successful": 2,
        "failed": 0
      }
    },
    "ebayListingResults": {
      "eBayOne": {
        "success": true,
        "platform": "eBay1",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "data": {
          "sku": "PROD-123",
          "offerId": "12345",
          "message": "Successfully created and published product on eBay1"
        }
      },
      "eBayTwo": {
        "success": true,
        "platform": "eBay2",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "data": {
          "sku": "PROD-123",
          "offerId": "67890",
          "message": "Successfully created and published product on eBay2"
        }
      }
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Error Responses

### Individual Platform Error

When an eBay platform operation fails:

```json
{
  "success": false,
  "platform": "eBay1",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": {
    "category": "VALIDATION_ERROR",
    "code": "EBAY_VALIDATION",
    "message": "eBay validation error: An identical item already exists",
    "details": {
      "originalError": "An identical item already exists",
      "statusCode": 400,
      "errorCode": "25005"
    },
    "step": "offer_creation",
    "sku": "PROD-123"
  }
}
```

### Product Creation API Error Response

When the main API encounters errors:

```json
{
  "success": true,
  "message": "Product \"Sample Product\" (SKU: PROD-123) created successfully in local database. Listed on 1 of 2 eBay platform(s). Successful: eBayOne.",
  "data": {
    "product": { /* product data */ },
    "summary": { /* summary data */ },
    "ebayListingResults": {
      "eBayOne": { /* success response */ },
      "eBayTwo": { /* error response */ }
    }
  },
  "warnings": [
    "eBay listing failures: eBayTwo: An identical item already exists"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Complete Failure Response

When all eBay operations fail:

```json
{
  "success": true,
  "message": "Product \"Sample Product\" (SKU: PROD-123) created successfully in local database. However, all eBay listings failed.",
  "data": {
    "product": { /* product data */ },
    "summary": { /* summary data */ },
    "ebayListingResults": { /* all failed responses */ }
  },
  "errors": [
    "eBay listing errors: eBayOne: Authentication failed; eBayTwo: Rate limit exceeded"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Error Categories

### 1. Timeout Errors
```json
{
  "category": "TIMEOUT_ERROR",
  "code": "EBAY_TIMEOUT",
  "message": "eBay API request timed out. Please try again.",
  "details": {
    "originalError": "timeout of 90000ms exceeded",
    "timeout": true
  }
}
```

### 2. Network Errors
```json
{
  "category": "NETWORK_ERROR",
  "code": "EBAY_NETWORK",
  "message": "Unable to connect to eBay API. Please check your internet connection.",
  "details": {
    "originalError": "connect ECONNREFUSED",
    "network": true
  }
}
```

### 3. Authentication Errors
```json
{
  "category": "AUTH_ERROR",
  "code": "EBAY_AUTH",
  "message": "eBay authentication failed. Please check your API credentials.",
  "details": {
    "originalError": "Invalid access token",
    "statusCode": 401
  }
}
```

### 4. Rate Limit Errors
```json
{
  "category": "RATE_LIMIT_ERROR",
  "code": "EBAY_RATE_LIMIT",
  "message": "eBay API rate limit exceeded. Please wait before trying again.",
  "details": {
    "originalError": "Rate limit exceeded",
    "statusCode": 429,
    "errorCode": "21919"
  }
}
```

### 5. Validation Errors
```json
{
  "category": "VALIDATION_ERROR",
  "code": "EBAY_VALIDATION",
  "message": "eBay validation error: Invalid category ID",
  "details": {
    "originalError": "Invalid category ID",
    "statusCode": 400,
    "errorCode": "25002"
  }
}
```

### 6. Server Errors
```json
{
  "category": "SERVER_ERROR",
  "code": "EBAY_SERVER",
  "message": "eBay server error. Please try again later.",
  "details": {
    "originalError": "Internal server error",
    "statusCode": 503
  }
}
```

### 7. Specific eBay Errors
```json
{
  "category": "EBAY_SPECIFIC_ERROR",
  "code": "EBAY_25005",
  "message": "Duplicate SKU",
  "details": {
    "originalError": "An item with this SKU already exists",
    "statusCode": 400,
    "errorCode": "25005"
  }
}
```

---

## Frontend Implementation Examples

### React/JavaScript Example

```javascript
// API call function
async function createProduct(productData) {
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
}

// Response handler
function handleProductCreationResponse(response) {
  if (!response.success) {
    // Handle complete failure
    showError(response.message || 'Product creation failed');
    return;
  }
  
  // Product was created successfully in database
  showSuccess(response.message);
  
  // Handle eBay listing results
  if (response.data.ebayListingResults) {
    handleEbayListingResults(response.data.ebayListingResults);
  }
  
  // Show warnings if any
  if (response.warnings && response.warnings.length > 0) {
    response.warnings.forEach(warning => showWarning(warning));
  }
  
  // Show errors if any
  if (response.errors && response.errors.length > 0) {
    response.errors.forEach(error => showError(error));
  }
}

// eBay listing results handler
function handleEbayListingResults(ebayResults) {
  Object.entries(ebayResults).forEach(([platform, result]) => {
    if (result.success) {
      showEbaySuccess(platform, result.data);
    } else {
      showEbayError(platform, result.error);
    }
  });
}

// Success message display
function showEbaySuccess(platform, data) {
  const message = `${platform}: Successfully listed (Offer ID: ${data.offerId})`;
  showNotification(message, 'success');
}

// Error message display with categorization
function showEbayError(platform, error) {
  let userMessage = `${platform}: ${error.message}`;
  let actionRequired = '';
  
  switch (error.category) {
    case 'TIMEOUT_ERROR':
      actionRequired = 'Please try again.';
      break;
    case 'NETWORK_ERROR':
      actionRequired = 'Check your internet connection.';
      break;
    case 'AUTH_ERROR':
      actionRequired = 'Contact administrator to check API credentials.';
      break;
    case 'RATE_LIMIT_ERROR':
      actionRequired = 'Wait a few minutes before trying again.';
      break;
    case 'VALIDATION_ERROR':
      actionRequired = 'Check product data and try again.';
      break;
    case 'SERVER_ERROR':
      actionRequired = 'eBay servers are experiencing issues. Try again later.';
      break;
    default:
      actionRequired = 'Contact support if the issue persists.';
  }
  
  showNotification(`${userMessage} ${actionRequired}`, 'error');
}

// Usage example
async function onCreateProduct(productData) {
  try {
    showLoading('Creating product...');
    const response = await createProduct(productData);
    handleProductCreationResponse(response);
  } catch (error) {
    showError(`Failed to create product: ${error.message}`);
  } finally {
    hideLoading();
  }
}
```

### Vue.js Example

```vue
<template>
  <div>
    <!-- Product creation form -->
    <form @submit.prevent="createProduct">
      <!-- form fields -->
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Creating...' : 'Create Product' }}
      </button>
    </form>
    
    <!-- Notifications -->
    <div v-for="notification in notifications" :key="notification.id" 
         :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isLoading: false,
      notifications: []
    };
  },
  
  methods: {
    async createProduct() {
      this.isLoading = true;
      this.clearNotifications();
      
      try {
        const response = await this.$api.post('/products', this.productData);
        this.handleResponse(response.data);
      } catch (error) {
        this.addNotification('Failed to create product', 'error');
      } finally {
        this.isLoading = false;
      }
    },
    
    handleResponse(response) {
      // Main success message
      this.addNotification(response.message, 'success');
      
      // Handle eBay results
      if (response.data.ebayListingResults) {
        this.handleEbayResults(response.data.ebayListingResults);
      }
      
      // Handle warnings and errors
      response.warnings?.forEach(warning => 
        this.addNotification(warning, 'warning')
      );
      response.errors?.forEach(error => 
        this.addNotification(error, 'error')
      );
    },
    
    handleEbayResults(results) {
      Object.entries(results).forEach(([platform, result]) => {
        if (result.success) {
          this.addNotification(
            `${platform}: Listed successfully (ID: ${result.data.offerId})`,
            'success'
          );
        } else {
          this.addNotification(
            `${platform}: ${result.error.message}`,
            'error'
          );
        }
      });
    },
    
    addNotification(message, type) {
      const notification = {
        id: Date.now(),
        message,
        type
      };
      this.notifications.push(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, 5000);
    },
    
    removeNotification(id) {
      this.notifications = this.notifications.filter(n => n.id !== id);
    },
    
    clearNotifications() {
      this.notifications = [];
    }
  }
};
</script>
```

---

## Best Practices

### 1. Always Check the Success Flag
```javascript
if (response.success) {
  // Handle success case
} else {
  // Handle failure case
}
```

### 2. Handle Partial Success Scenarios
```javascript
// Product created but some eBay listings failed
if (response.success && response.warnings) {
  showSuccess(response.message);
  response.warnings.forEach(warning => showWarning(warning));
}
```

### 3. Provide User-Friendly Error Messages
```javascript
function getUserFriendlyMessage(error) {
  const friendlyMessages = {
    'EBAY_TIMEOUT': 'The request took too long. Please try again.',
    'EBAY_NETWORK': 'Connection issue. Check your internet.',
    'EBAY_AUTH': 'Authentication problem. Contact support.',
    'EBAY_RATE_LIMIT': 'Too many requests. Please wait a moment.',
    'EBAY_VALIDATION': 'Invalid product data. Please check your input.',
    'EBAY_25005': 'This product already exists on eBay.'
  };
  
  return friendlyMessages[error.code] || error.message;
}
```

### 4. Implement Retry Logic for Specific Errors
```javascript
function shouldRetry(error) {
  const retryableErrors = [
    'EBAY_TIMEOUT',
    'EBAY_NETWORK',
    'EBAY_SERVER'
  ];
  return retryableErrors.includes(error.code);
}

async function createProductWithRetry(productData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await createProduct(productData);
      return response;
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

### 5. Log Errors for Debugging
```javascript
function logError(error, context) {
  console.error('eBay API Error:', {
    context,
    category: error.category,
    code: error.code,
    message: error.message,
    details: error.details,
    timestamp: new Date().toISOString()
  });
  
  // Send to error tracking service
  if (window.errorTracker) {
    window.errorTracker.captureException(error, { context });
  }
}
```

### 6. Show Loading States
```javascript
function showLoadingState(platform) {
  const element = document.getElementById(`${platform}-status`);
  element.innerHTML = '<span class="loading">Creating listing...</span>';
}

function showResult(platform, result) {
  const element = document.getElementById(`${platform}-status`);
  if (result.success) {
    element.innerHTML = `<span class="success">✓ Listed (ID: ${result.data.offerId})</span>`;
  } else {
    element.innerHTML = `<span class="error">✗ ${result.error.message}</span>`;
  }
}
```

---

## Summary

This documentation provides a complete guide for handling eBay API responses in your frontend application. The backend now provides:

- **Standardized response structure** across all eBay operations
- **Detailed error categorization** for better error handling
- **Comprehensive success/failure information** for user feedback
- **Timeout optimizations** to prevent hanging requests
- **No retry logic** to avoid cascading failures

Use this documentation to implement robust error handling and provide clear feedback to your users about the status of their eBay listings.