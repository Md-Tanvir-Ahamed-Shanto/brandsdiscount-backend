// package.json
// Place this in your project root

/*
To install dependencies:
npm install

To run the application:
npm start
*/

{
  "name": "ecommerce-sync-app",
  "version": "1.0.0",
  "description": "Centralized E-commerce Sync System",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "prisma:migrate": "prisma migrate dev --name init",
    "prisma:generate": "prisma generate",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "axios": "^1.0.0",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "node-cron": "^3.0.3",
    "nodemon": "^3.1.4",
    "oauth-1.0a": "^1.0.1",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.0.0"
  }
}
```text
// Project Directory Structure

ecommerce-sync-app/
├── .env                  (Environment variables for DB and API keys)
├── package.json
├── prisma/
│   ├── schema.prisma     (Database schema definition)
│   └── seed.ts           (Seed script for demo data)
├── src/
│   ├── app.js            (Express app setup)
│   ├── server.js         (Server entry point)
│   ├── config/
│   │   └── index.js      (Configuration for environment variables)
│   ├── controllers/
│   │   ├── productController.js (Handles product API requests)
│   │   └── syncController.js    (Handles manual sync triggers)
│   ├── routes/
│   │   ├── productRoutes.js     (API routes for products)
│   │   ├── syncRoutes.js        (API routes for sync operations)
│   │   └── authRoutes.js        (API routes for authentication/user management - Placeholder for future use)
│   ├── services/
│   │   ├── prismaService.js     (Prisma client wrapper)
│   │   ├── ebayService.js       (eBay API interactions)
│   │   ├── walmartService.js    (Walmart API interactions)
│   │   ├── woocommerceService.js (WooCommerce API interactions)
│   │   ├── sheinService.js      (Shein API interactions - New, needs implementation)
│   │   └── syncService.js       (Main synchronization logic)
│   └── utils/
│       ├── errorHandler.js      (Centralized error handling)
│       └── cronScheduler.js     (Node-cron setup for background tasks)
│       └── authUtils.js         (Authentication utilities like password hashing - Placeholder)
```prisma
// prisma/schema.prisma
// Define your database schema here

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// User Model for Admin Dashboard and internal users
model User {
  id              String       @id @default(uuid())
  username        String
  hashedPassword  Bytes
  salt            Bytes
  email           String       @unique
  role            UserRole
  profilePicture  Json?
  userDetails     Json?
  loyaltyStatus   Loyalty?     @default(Not_Eligible)
  orderPoint      Float?       @default(0.00)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  updatedById     String? // Foreign key reference to another User
  updatedBy       User?        @relation("UserUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
  updatedUsers    User[]       @relation("UserUpdatedBy") // Inverse relation: Tracks users this user has updated
  orders          Order[]      @relation("UserOrders") // Unique relation name for the relation with orders

  @@index([email]) // Index on email for faster queries
}

// Size Model for Product Variants
model Size {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  products  Product[] // Products associated with this size

  @@index([name]) // Index on size name for better query performance
}

// Category Model for Product Organization
model Category {
  id                String     @id @default(uuid())
  name              String     @unique
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  parentCategoryId  String?
  parentCategory    Category?  @relation("CategoryHierarchy", fields: [parentCategoryId], references: [id], onDelete: SetNull)
  subcategories     Category[] @relation("CategoryHierarchy") // Self-relation for subcategories

  products          Product[]  @relation("ProductCategoryRelation") // Products linked to this category
  parentProducts    Product[]  @relation("ProductParentCategoryRelation") // Products linked to this category as a parent
  subcategoryProducts Product[] @relation("ProductSubCategoryRelation") // Products linked to this category as a subcategory

  @@index([name]) // Index on category name for better query performance
}

// Represents an e-commerce shop (eBay, Walmart, WooCommerce, Shein)
model Shop {
  id               String            @id @default(uuid())
  name             String            @unique // e.g., "My eBay Store 1", "Walmart Marketplace"
  platform         Platform          // Using an Enum for supported platforms
  credentials      Json              // Stores API keys, tokens, secrets for this specific shop
  baseUrl          String?           // For WooCommerce base URL or Shein API endpoint specific to seller
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  productShopLinks ProductShopLink[]
  // orders           Order[] // This relation is removed as per the latest schema
}

// Product in the central database
model Product {
  id                String            @id @default(uuid())
  title             String            // Primary product title
  brandName         String?
  color             String?
  sku               String            @unique
  images            Json[]            // Assuming images are stored as URLs
  itemLocation      String?           // Warehouse/store location
  sizeId            String?
  size              Size?             @relation(fields: [sizeId], references: [id])
  sizeType          String?
  sizes             String?           // Potentially a string/JSON for custom size details

  postName          String?

  categoryId        String?           // Child category ID
  category          Category?         @relation(fields: [categoryId], references: [id], name: "ProductCategoryRelation")

  subCategoryId     String?           // Subcategory ID
  subCategory       Category?         @relation(fields: [subCategoryId], references: [id], name: "ProductSubCategoryRelation")

  parentCategoryId  String?           // Parent category ID
  parentCategory    Category?         @relation(fields: [parentCategoryId], references: [id], name: "ProductParentCategoryRelation")

  ebayId            String?
  wallmartId        String?
  sheinId           String?
  woocommerceId     String?

  regularPrice      Float?
  salePrice         Float?
  platFormPrice     Float?
  toggleFirstDeal   Boolean?          @default(true) // toggle 10% discount for first deal
  discountPercent   Float?
  stockQuantity     Int?
  condition         String?           // New, Used, Refurbished, etc.
  description       String?
  status            String?           // e.g., "Active", "Draft", "Archived"
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  updatedById       String?           // Foreign key reference to another User

  search_vector     Unsupported("tsvector")?

  orderDetails      OrderDetail[]     @relation("ProductOrderDetails")
  // orderItems field is missing here. If Product is related to OrderItem, it should be here.

  @@index([sku])
  @@index([brandName])
  @@index([title])
  @@index([categoryId])
  @@index([subCategoryId])
  @@index([parentCategoryId]) // Index for fast lookup by parent category
}

// Links a central Product to its representation on a specific Shop
model ProductShopLink {
  id                String    @id @default(uuid())
  productId         String
  shopId            String
  platformProductId String    // The ID of the product on the specific e-commerce platform
  platformVariantId String?   // Optional: If product has variants on the platform
  lastSyncedAt      DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  product Product @relation(fields: [productId], references: [id])
  shop    Shop    @relation(fields: [shopId], references: [id])

  @@unique([productId, shopId], name: "ProductShopUnique")
}

// Represents an Order (now seems to be for internal/unified orders only)
// Note: This model structure has changed significantly from the previous version
// and will require substantial changes to the syncService.js to adapt.
model Order {
  id            String          @id @default(uuid())
  userId        String
  user          User            @relation("UserOrders", fields: [userId], references: [id])
  status        String          // Pending, Completed, Cancelled, etc.
  totalAmount   Float           // Total amount for the order
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  transactionId String?
  transaction   Transaction?    @relation("OrderTransaction", fields: [transactionId], references: [id], onDelete: SetNull)
  orderDetails  OrderDetail[]   @relation("OrderOrderDetails")

  // The following fields from the previous unified Order model are missing:
  // shopId String
  // platformOrderId String
  // orderDate DateTime
  // items Json // JSON representation of order line items (raw data from platform)
  // syncedAt DateTime @default(now())

  @@index([userId]) // Index on userId for faster filtering by user
  @@index([status]) // Index on status for faster filtering by order status
  @@index([createdAt]) // Index on createdAt for faster date-based queries
  @@index([transactionId]) // Index on transactionId for faster lookup
}

// Re-introduced platform-specific order models.
// These will require new logic in syncService.js to fetch into these tables
// and then potentially map them to the main Order model.
model WalmartOrder {
  id                String   @id @default(uuid())
  orderId           String   @unique
  orderCreationDate DateTime // Date when the order was created
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([orderId])
}

model EbayOrder {
  id                String   @id @default(uuid())
  orderId           String   @unique
  status            String   // Pending, Completed, Cancelled, etc.
  orderCreationDate DateTime // Date when the order was created
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status])
  @@index([createdAt])
}

model SheinOrder {
  id                String   @id @default(uuid())
  orderId           String   @unique
  status            String   // Pending, Completed, Cancelled, etc.
  orderCreationDate DateTime // Date when the order was created
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status])
  @@index([createdAt])
}

// Detailed breakdown of an order item, potentially denormalized for reporting
model OrderDetail {
  id           String    @id @default(uuid())
  sku          String
  orderId      String
  order        Order     @relation("OrderOrderDetails", fields: [orderId], references: [id])
  productId    String
  product      Product   @relation("ProductOrderDetails", fields: [productId], references: [id])
  quantity     Int
  price        Float     // Price of the product per unit
  total        Float     // Total price for the quantity
  productName  String    // Denormalized product name (for avoiding join with Product table)
  categoryName String    // Denormalized category name (for avoiding join with Category table)
  sizeName     String    // Denormalized size name (for avoiding join with Size table)
  createdAt    DateTime  @default(now())

  @@index([productId])
  @@index([orderId])
}

// Transaction details related to an Order
model Transaction {
  id            String    @id @default(uuid())
  transactionId String    @unique
  orderId       String    @unique
  amount        Float     // Amount for the transaction
  status        String    // Transaction status: Pending, Successful, Failed
  createdAt     DateTime  @default(now())
  order         Order     @relation("OrderTransaction", fields: [orderId], references: [id])

  @@index([orderId])
  @@index([status])
}

// Re-introduced ApiToken model. This means credentials might be duplicated or need careful management.
model ApiToken {
  id           String   @id @default(uuid()) // Unique Token ID
  platform     Platform @unique // Enum (eBay, Walmart, Shein)

  accessToken  String   // Short-lived access token
  refreshToken String   // Long-lived refresh token
  expiresAt    DateTime // Access token expiry

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}


enum Platform {
  EBAY
  EBAY2
  EBAY3
  WALMART
  SHEIN
  WOOCOMMERCE // Added WOOCOMMERCE to the Platform enum
}

enum Loyalty {
  Not_Eligible
  Eligible
  Loyal
}

enum UserRole {
  Admin
  OfficeEmployee
  WareHouse
  PlatformUser
  Cashier
  SuperAdmin
}
```javascript
// .env
// Create this file in your project root and fill in your credentials
// IMPORTANT: Do not commit this file to version control.
// Use strong passwords and API keys.

DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce_sync_db?schema=public"

# Example eBay API Credentials (replace with your actual ones)
EBAY_CLIENT_ID="YOUR_EBAY_CLIENT_ID"
EBAY_CLIENT_SECRET="YOUR_EBAY_CLIENT_SECRET"
EBAY_RU_NAME="YOUR_EBAY_RUNAME" # Redirect URI Name for OAuth
EBAY_REFRESH_TOKEN="YOUR_EBAY_REFRESH_TOKEN" # Obtain this via OAuth flow

# Example Walmart API Credentials (replace with your actual ones)
WALMART_CONSUMER_ID="YOUR_WALMART_CONSUMER_ID"
WALMART_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_MULTI_LINE_PRIVATE_KEY\n-----END PRIVATE KEY-----" # RSA Private Key in PEM format, ensure newlines are escaped

# Example WooCommerce API Credentials (replace with your actual ones)
WOOCOMMERCE_CONSUMER_KEY="YOUR_WOOCOMMERCE_CONSUMER_KEY"
WOOCOMMERCE_CONSUMER_SECRET="YOUR_WOOCOMMERCE_CONSUMER_SECRET"
# WOOCOMMERCE_STORE_URL="[https://yourstore.com](https://yourstore.com)" // This will be stored in Shop.baseUrl

# Example Shein API Credentials (replace with your actual ones)
SHEIN_API_KEY="YOUR_SHEIN_API_KEY"
SHEIN_SECRET="YOUR_SHEIN_SECRET" # If Shein uses a secret for signature/auth

# Cron Job Settings
ORDER_SYNC_CRON_SCHEDULE="0 */1 * * *" // Runs every 1 hour (adjust as needed)
```javascript
// src/config/index.js
// Centralized configuration for environment variables

require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  ebay: {
    clientId: process.env.EBAY_CLIENT_ID,
    clientSecret: process.env.EBAY_CLIENT_SECRET,
    ruName: process.env.EBAY_RU_NAME,
    refreshToken: process.env.EBAY_REFRESH_TOKEN, // Store securely
    apiUrl: 'https://api.ebay.com/sell/inventory/v1' // Example API endpoint
  },
  walmart: {
    apiUrl: process.env.WALMART_API_URL || 'https://marketplace.walmartapis.com/v3',
    consumerId: process.env.WALMART_CONSUMER_ID,
    privateKey: process.env.WALMART_PRIVATE_KEY, // RSA Private Key in PEM format
  },
  woocommerce: {
    // Consumer Key and Secret are typically per-store and will be stored in Shop.credentials
    // apiUrl: 'https://yourstore.com/wp-json/wc/v3' // Base URL derived from Shop.baseUrl
  },
  shein: {
    apiUrl: process.env.SHEIN_API_URL || 'https://open.sheincorp.com/api', // Example Shein API URL
    apiKey: process.env.SHEIN_API_KEY,
    secret: process.env.SHEIN_SECRET, // If Shein uses a secret for signing
  },
  cron: {
    orderSyncSchedule: process.env.ORDER_SYNC_CRON_SCHEDULE || '0 */1 * * *' // Default to every hour
  }
};

// Basic validation (add more robust checks as needed)
if (!config.databaseUrl) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

module.exports = config;
```javascript
// src/services/prismaService.js
// Wrapper for the Prisma Client for easy access

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
```javascript
// src/utils/errorHandler.js
// Centralized error handling utility

const handleError = (err, res, next) => {
  console.error('Error:', err);

  if (res.headersSent) {
    return next(err); // Delegate to default Express error handler if headers already sent
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    status: 'error',
    message: message,
    // In production, avoid sending detailed error info to client
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = handleError;

```javascript
// src/services/ebayService.js
// Service for interacting with the eBay Sell API
// This is a simplified stub. Real implementation requires proper OAuth flow and API calls.

const axios = require('axios');
const config = require('../config');

// In a real application, you'd manage access tokens dynamically
// For demonstration, we assume a valid refresh token exists and can be used to get an access token.
let ebayAccessToken = null;
let accessTokenExpiry = 0;

const getEbayAccessToken = async (refreshToken) => {
  if (ebayAccessToken && accessTokenExpiry > Date.now() + 60000) { // Refresh if less than 1 minute left
    return ebayAccessToken;
  }

  try {
    const authString = Buffer.from(`${config.ebay.clientId}:${config.ebay.clientSecret}`).toString('base64');
    const response = await axios.post(
      '[https://api.ebay.com/identity/v1/oauth2/token](https://api.ebay.com/identity/v1/oauth2/token)',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: '[https://api.ebay.com/oauth/api_scope/sell.inventory](https://api.ebay.com/oauth/api_scope/sell.inventory) [https://api.ebay.com/oauth/api_scope/sell.fulfillment](https://api.ebay.com/oauth/api_scope/sell.fulfillment) [https://api.ebay.com/oauth/api_scope/sell.marketing](https://api.ebay.com/oauth/api_scope/sell.marketing) [https://api.ebay.com/oauth/api_scope/sell.account](https://api.ebay.com/oauth/api_scope/sell.account)', // Added more scopes
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`,
        },
      }
    );

    ebayAccessToken = response.data.access_token;
    accessTokenExpiry = Date.now() + (response.data.expires_in * 1000); // expires_in is in seconds
    console.log('eBay access token refreshed.');
    return ebayAccessToken;
  } catch (error) {
    console.error(`Error getting eBay access token with refresh token ${refreshToken}:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    throw new Error(`Failed to obtain eBay access token: ${error.message}`);
  }
};

const ebayService = {
  async createProduct(product, shopCredentials) {
    // shopCredentials should contain refreshToken for this specific eBay shop
    const { refreshToken } = shopCredentials;
    try {
      const accessToken = await getEbayAccessToken(refreshToken);
      const response = await axios.put(
        `${config.ebay.apiUrl}/inventory_item/${product.sku}`, // Using SKU as inventory_item_key
        {
          product: {
            title: product.title, // Use product.title from new schema
            description: product.description,
            brand: product.brandName, // Use brandName
            // Add image URLs from product.images
            imageUrls: product.images.map(img => img.url), // Assuming images is an array of { url: string }
          },
          // This is simplified. eBay requires offer creation, pricing, etc.
          // For a real product, you'd create an "offer" for the inventory item.
          // Example:
          // pricingSummary: { price: { value: product.price, currency: 'USD' } },
          // quantityLimit: product.stock,
          // format: 'FIXED_PRICE',
          // marketplaceId: 'EBAY_US',
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', // Example marketplace
          },
        }
      );
      console.log(`eBay: Created product SKU ${product.sku}`);
      // In a real scenario, the response would contain offer details/IDs.
      // For now, we'll return the SKU as the platform product ID for simplicity.
      return { platformProductId: product.sku };
    } catch (error) {
      console.error(`Error creating product on eBay (SKU: ${product.sku}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to create product on eBay: ${error.message}`);
    }
  },

  async updateProduct(product, platformProductId, shopCredentials) {
    const { refreshToken } = shopCredentials;
    try {
      const accessToken = await getEbayAccessToken(refreshToken);
      // Example: Only updating inventory item. Actual update might involve specific offer/listing APIs.
      const response = await axios.post(
        `${config.ebay.apiUrl}/inventory_item/${platformProductId}/set_inventory_item_price`, // Example: only updating price
        {
          items: [
            {
              sku: platformProductId, // Assuming platformProductId is the SKU
              price: {
                value: product.platFormPrice || product.regularPrice, // Use new price fields
                currency: 'USD'
              }
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          },
        }
      );
      console.log(`eBay: Updated product SKU ${platformProductId}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating product on eBay (ID: ${platformProductId}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to update product on eBay: ${error.message}`);
    }
  },

  async updateInventory(platformProductId, quantity, shopCredentials) {
    const { refreshToken } = shopCredentials;
    try {
      const accessToken = await getEbayAccessToken(refreshToken);
      // This is a simplified example. You would update the "offer" quantity.
      const response = await axios.post(
        `${config.ebay.apiUrl}/inventory_item/${platformProductId}/bulk_update_quantity`,
        {
          requests: [
            {
              sku: platformProductId, // Assuming platformProductId is the SKU
              shipToLocationDistribution: [{ quantity: quantity }],
              marketplaceId: 'EBAY_US'
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          },
        }
      );
      console.log(`eBay: Updated inventory for SKU ${platformProductId} to ${quantity}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating inventory on eBay (ID: ${platformProductId}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to update inventory on eBay: ${error.message}`);
    }
  },

  async getOrders(lastSyncDate, shopCredentials) {
    const { refreshToken } = shopCredentials;
    try {
      const accessToken = await getEbayAccessToken(refreshToken);
      const response = await axios.get(
        `https://api.ebay.com/sell/fulfillment/v1/order?creationDateRange=${lastSyncDate.toISOString()}..`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          },
        }
      );
      console.log(`eBay: Fetched ${response.data.orders ? response.data.orders.length : 0} orders.`);
      // Transform eBay orders to a common format
      return (response.data.orders || []).map(ebayOrder => ({
        platformOrderId: ebayOrder.orderId,
        orderDate: new Date(ebayOrder.creationDate),
        status: ebayOrder.orderFulfillmentStatus, // Map to your internal status if needed
        totalAmount: parseFloat(ebayOrder.pricingSummary.total.value),
        items: ebayOrder.lineItems.map(item => ({
          productId: item.sku, // Assuming SKU maps to central product
          quantity: item.quantity,
          price: parseFloat(item.lineItemCost.value),
          platformItemId: item.lineItemId,
        })),
      }));
    } catch (error) {
      console.error(`Error fetching orders from eBay:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to fetch orders from eBay: ${error.message}`);
    }
  },
};

module.exports = ebayService;
```javascript
// src/services/walmartService.js
// Service for interacting with the Walmart Marketplace Seller API

const axios = require('axios');
const crypto = require('crypto'); // Use Node.js built-in crypto for RSA-SHA256
const config = require('../config');

// This function now correctly generates the RSA-SHA256 signature
const generateWalmartSignature = (fullUrl, method, timestamp, consumerId, privateKeyPEM) => {
  // 1. Validate Private Key
  if (!privateKeyPEM || typeof privateKeyPEM !== 'string' || !privateKeyPEM.includes('PRIVATE KEY')) {
    throw new Error('Invalid or missing RSA private key in PEM format for Walmart signature.');
  }

  // 2. Extract the URL path (without scheme, host, or port) for signing
  // Example: For "https://marketplace.walmartapis.com/v3/orders?createdStartDate=...",
  // the path should be "/v3/orders?createdStartDate=..."
  const parsedUrl = new URL(fullUrl);
  const pathWithQuery = parsedUrl.pathname + parsedUrl.search;

  // 3. Construct the string to sign
  // Format: consumerId + "\n" + pathWithQuery + "\n" + method (uppercase) + "\n" + timestamp + "\n"
  const stringToSign = `${consumerId}\n${pathWithQuery}\n${method.toUpperCase()}\n${timestamp}\n`;

  // 4. Create an RSA-SHA256 signer
  const signer = crypto.createSign('RSA-SHA256');

  // 5. Update the signer with the string to sign
  signer.update(stringToSign);

  // 6. Sign the string using the private key and get the Base64 encoded signature
  const signature = signer.sign(privateKeyPEM, 'base64');

  return signature;
};

const walmartService = {
  // Helper to get credentials from shop or config
  getCredentials: (shopCredentials) => {
    // Prioritize shop-specific credentials, then fallback to global config
    return {
      consumerId: shopCredentials.consumerId || config.walmart.consumerId,
      privateKey: shopCredentials.privateKey || config.walmart.privateKey, // This MUST be the RSA Private Key
    };
  },

  async createProduct(product, shopCredentials) {
    const { consumerId, privateKey } = this.getCredentials(shopCredentials);
    try {
      const timestamp = Date.now().toString();
      const urlPath = `/v3/items`; // Use proper API versioning
      const method = 'POST';
      const fullApiUrl = `${config.walmart.apiUrl}${urlPath}`; // Full URL for signature calculation
      const signature = generateWalmartSignature(fullApiUrl, method, timestamp, consumerId, privateKey);

      const response = await axios.post(
        fullApiUrl,
        {
          sku: product.sku,
          productName: product.title, // Use product.title from new schema
          longDescription: product.description,
          price: {
            currency: 'USD',
            amount: product.platFormPrice || product.regularPrice // Use appropriate price
          },
          // ... map more product details based on Walmart's Item Spec XML
          // Walmart often requires XML feeds for product creation/updates.
          // This simplified JSON is a placeholder. Real implementation needs to
          // construct a valid XML payload and set 'Content-Type': 'application/xml'
        },
        {
          headers: {
            'WM_CONSUMER.ID': consumerId,
            'WM_SECURITY.SIGNATURE': signature,
            'WM_QOS.CORRELATION_ID': Date.now(), // Ensure this is unique per request
            'WM_SVC.NAME': 'Walmart Marketplace',
            'WM_SEC.TIMESTAMP': timestamp,
            'Content-Type': 'application/json', // Change to 'application/xml' if using XML feeds
            'Accept': 'application/json',
          },
        }
      );
      console.log(`Walmart: Created product SKU ${product.sku}`);
      // The response for item creation is often an acknowledgement, not the item itself.
      // You might need to check the feed status to get the final itemId.
      return { platformProductId: response.data.itemId || response.data.feedId }; // Adjust based on actual API response
    } catch (error) {
      console.error(`Error creating product on Walmart (SKU: ${product.sku}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to create product on Walmart: ${error.message}`);
    }
  },

  async updateProduct(product, platformProductId, shopCredentials) {
    const { consumerId, privateKey } = this.getCredentials(shopCredentials);
    try {
      const timestamp = Date.now().toString();
      const urlPath = `/v3/items/${platformProductId}`; // Use proper API versioning
      const method = 'PUT';
      const fullApiUrl = `${config.walmart.apiUrl}${urlPath}`;
      const signature = generateWalmartSignature(fullApiUrl, method, timestamp, consumerId, privateKey);

      const response = await axios.put(
        fullApiUrl,
        {
          sku: product.sku, // Often SKU is used for updates too
          price: {
            currency: 'USD',
            amount: product.platFormPrice || product.regularPrice
          },
          // ... other updatable fields as per Walmart's Item Update schema
        },
        {
          headers: {
            'WM_CONSUMER.ID': consumerId,
            'WM_SECURITY.SIGNATURE': signature,
            'WM_QOS.CORRELATION_ID': Date.now(),
            'WM_SVC.NAME': 'Walmart Marketplace',
            'WM_SEC.TIMESTAMP': timestamp,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      console.log(`Walmart: Updated product ID ${platformProductId}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating product on Walmart (ID: ${platformProductId}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to update product on Walmart: ${error.message}`);
    }
  },

  async updateInventory(platformProductId, quantity, shopCredentials) {
    const { consumerId, privateKey } = this.getCredentials(shopCredentials);
    try {
      const timestamp = Date.now().toString();
      const urlPath = `/v3/inventory?sku=${platformProductId}`; // Use proper API versioning and ensure SKU is correctly used as query param
      const method = 'PUT';
      const fullApiUrl = `${config.walmart.apiUrl}${urlPath}`;
      const signature = generateWalmartSignature(fullApiUrl, method, timestamp, consumerId, privateKey);

      const response = await axios.put(
        fullApiUrl,
        {
          sku: platformProductId,
          quantity: {
            unit: 'EACH',
            amount: quantity
          }
        },
        {
          headers: {
            'WM_CONSUMER.ID': consumerId,
            'WM_SECURITY.SIGNATURE': signature,
            'WM_QOS.CORRELATION_ID': Date.now(),
            'WM_SVC.NAME': 'Walmart Marketplace',
            'WM_SEC.TIMESTAMP': timestamp,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      console.log(`Walmart: Updated inventory for SKU ${platformProductId} to ${quantity}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating inventory on Walmart (SKU: ${platformProductId}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to update inventory on Walmart: ${error.message}`);
    }
  },

  async getOrders(lastSyncDate, shopCredentials) {
    const { consumerId, privateKey } = this.getCredentials(shopCredentials);
    try {
      const timestamp = Date.now().toString();
      const startDate = lastSyncDate.toISOString().split('.')[0] + 'Z'; // Format to ISO8601
      const urlPath = `/v3/orders?createdStartDate=${startDate}`; // Use proper API versioning and filter
      const method = 'GET';
      const fullApiUrl = `${config.walmart.apiUrl}${urlPath}`;
      const signature = generateWalmartSignature(fullApiUrl, method, timestamp, consumerId, privateKey);

      const response = await axios.get(
        fullApiUrl,
        {
          headers: {
            'WM_CONSUMER.ID': consumerId,
            'WM_SECURITY.SIGNATURE': signature,
            'WM_QOS.CORRELATION_ID': Date.now(),
            'WM_SVC.NAME': 'Walmart Marketplace',
            'WM_SEC.TIMESTAMP': timestamp,
            'Accept': 'application/json',
          },
        }
      );
      console.log(`Walmart: Fetched ${response.data.list ? response.data.list.length : 0} orders.`);

      // Transform Walmart orders to a common format
      // NOTE: This will now need to save into WalmartOrder model first, then potentially
      // translate to the central Order and OrderDetail models.
      return (response.data.list || []).map(walmartOrder => ({
        platformOrderId: walmartOrder.purchaseOrderId,
        orderDate: new Date(walmartOrder.purchaseOrderDate),
        status: walmartOrder.orderStatus, // Map to your internal status if needed
        totalAmount: parseFloat(walmartOrder.orderTotal.amount),
        items: walmartOrder.orderLineItems.orderLineItem.map(item => ({
          productId: item.item.productSku, // Assuming SKU maps to central product
          quantity: item.orderLineQuantity.amount,
          price: parseFloat(item.charges.charge[0].chargeAmount.amount),
          platformItemId: item.lineNumber,
        })),
      }));
    } catch (error) {
      console.error(`Error fetching orders from Walmart:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to fetch orders from Walmart: ${error.message}`);
    }
  },
};

module.exports = walmartService;
```javascript
// src/services/woocommerceService.js
// Service for interacting with the WooCommerce REST API

const axios = require('axios');
const config = require('../config');

const woocommerceService = {
  async createProduct(product, shopCredentials) {
    const { consumerKey, consumerSecret, baseUrl } = shopCredentials;
    try {
      const response = await axios.post(
        `${baseUrl}/wp-json/wc/v3/products`,
        {
          name: product.title, // Use product.title from new schema
          type: 'simple',
          regular_price: (product.platFormPrice || product.regularPrice).toString(), // Use appropriate price
          description: product.description,
          sku: product.sku,
          manage_stock: true,
          stock_quantity: product.stockQuantity, // Use stockQuantity
          status: 'publish',
          images: product.images.map(img => ({ src: img.url })), // Map images correctly
        },
        {
          auth: {
            username: consumerKey,
            password: consumerSecret,
          },
        }
      );
      console.log(`WooCommerce: Created product ID ${response.data.id}`);
      return { platformProductId: response.data.id.toString() };
    } catch (error) {
      console.error(`Error creating product on WooCommerce (SKU: ${product.sku}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to create product on WooCommerce: ${error.message}`);
    }
  },

  async updateProduct(product, platformProductId, shopCredentials) {
    const { consumerKey, consumerSecret, baseUrl } = shopCredentials;
    try {
      const response = await axios.put(
        `${baseUrl}/wp-json/wc/v3/products/${platformProductId}`,
        {
          name: product.title,
          regular_price: (product.platFormPrice || product.regularPrice).toString(),
          description: product.description,
          sku: product.sku,
          manage_stock: true,
          stock_quantity: product.stockQuantity,
          images: product.images.map(img => ({ src: img.url })),
        },
        {
          auth: {
            username: consumerKey,
            password: consumerSecret,
          },
        }
      );
      console.log(`WooCommerce: Updated product ID ${platformProductId}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating product on WooCommerce (ID: ${platformProductId}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to update product on WooCommerce: ${error.message}`);
    }
  },

  async updateInventory(platformProductId, quantity, shopCredentials) {
    const { consumerKey, consumerSecret, baseUrl } = shopCredentials;
    try {
      const response = await axios.put(
        `${baseUrl}/wp-json/wc/v3/products/${platformProductId}`,
        {
          stock_quantity: quantity,
          manage_stock: true,
        },
        {
          auth: {
            username: consumerKey,
            password: consumerSecret,
          },
        }
      );
      console.log(`WooCommerce: Updated inventory for product ID ${platformProductId} to ${quantity}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating inventory on WooCommerce (ID: ${platformProductId}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to update inventory on WooCommerce: ${error.message}`);
    }
  },

  async getOrders(lastSyncDate, shopCredentials) {
    const { consumerKey, consumerSecret, baseUrl } = shopCredentials;
    try {
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/orders`,
        {
          auth: {
            username: consumerKey,
            password: consumerSecret,
          },
          params: {
            after: lastSyncDate.toISOString(), // Filter orders created after this date
            status: 'processing,completed' // Only fetch relevant statuses
          }
        }
      );
      console.log(`WooCommerce: Fetched ${response.data.length} orders.`);

      // Transform WooCommerce orders to a common format
      // NOTE: This will now need to be saved into a different Order model or handled separately.
      return (response.data || []).map(wcOrder => ({
        platformOrderId: wcOrder.id.toString(),
        orderDate: new Date(wcOrder.date_created_gmt),
        status: wcOrder.status, // Map to your internal status if needed
        totalAmount: parseFloat(wcOrder.total),
        items: wcOrder.line_items.map(item => ({
          productId: item.sku, // Assuming SKU maps to central product
          quantity: item.quantity,
          price: parseFloat(item.price),
          platformItemId: item.id.toString(),
        })),
      }));
    } catch (error) {
      console.error(`Error fetching orders from WooCommerce:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to fetch orders from WooCommerce: ${error.message}`);
    }
  },
};

module.exports = woocommerceService;
```javascript
// src/services/sheinService.js
// Service for interacting with the SHEIN Open Platform API
// This is a simplified stub. You'll need to fill in the exact API calls and authentication details.

const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

// SHEIN typically uses a signed request method.
// This is a generic example, refer to SHEIN's documentation for exact signing algorithm (e.g., HMAC-SHA256).
const generateSheinSignature = (params, apiKey, secret) => {
  // 1. Sort all request parameters alphabetically by key.
  const sortedKeys = Object.keys(params).sort();
  let signString = '';
  for (const key of sortedKeys) {
    signString += `${key}${params[key]}`;
  }

  // 2. Append the secret to the end of the sorted parameter string.
  signString += secret;

  // 3. Perform MD5 or HMAC-SHA256 hash (SHEIN docs specify which one).
  // For demonstration, let's assume HMAC-SHA256 for now.
  const signature = crypto.createHmac('sha256', secret)
                          .update(signString)
                          .digest('hex')
                          .toUpperCase(); // SHEIN often requires uppercase hex
  return signature;
};


const sheinService = {
  // Helper to get credentials from shop or config
  getCredentials: (shopCredentials) => {
    return {
      apiKey: shopCredentials.apiKey || config.shein.apiKey,
      secret: shopCredentials.secret || config.shein.secret,
    };
  },

  async createProduct(product, shopCredentials) {
    const { apiKey, secret } = this.getCredentials(shopCredentials);
    try {
      const timestamp = Date.now();
      const commonParams = {
        app_key: apiKey,
        timestamp: timestamp,
        // method: 'product.add', // Example method name
        // ... other common API parameters as per SHEIN docs
      };

      const requestBody = {
        product_code: product.sku,
        product_name: product.title,
        price: product.platFormPrice || product.regularPrice,
        stock: product.stockQuantity,
        description: product.description,
        images: product.images.map(img => img.url).join(','), // SHEIN might expect comma-separated URLs
        // ... more SHEIN-specific product fields
      };

      const allParams = { ...commonParams, ...requestBody };
      const signature = generateSheinSignature(allParams, apiKey, secret);

      const response = await axios.post(
        `${config.shein.apiUrl}/product/add`, // Example API endpoint
        {
          ...requestBody,
          sign: signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          params: commonParams // Common params might also go in query string for signing
        }
      );
      console.log(`SHEIN: Created product SKU ${product.sku}`);
      return { platformProductId: response.data.data.product_id }; // Adjust based on actual SHEIN response
    } catch (error) {
      console.error(`Error creating product on SHEIN (SKU: ${product.sku}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to create product on SHEIN: ${error.message}`);
    }
  },

  async updateProduct(product, platformProductId, shopCredentials) {
    const { apiKey, secret } = this.getCredentials(shopCredentials);
    try {
      const timestamp = Date.now();
      const commonParams = {
        app_key: apiKey,
        timestamp: timestamp,
      };
      const requestBody = {
        product_code: product.sku, // SHEIN might use product_code for updates
        product_id: platformProductId, // Or the SHEIN product ID
        price: product.platFormPrice || product.regularPrice,
        description: product.description,
        // ... other updatable fields
      };

      const allParams = { ...commonParams, ...requestBody };
      const signature = generateSheinSignature(allParams, apiKey, secret);

      const response = await axios.post(
        `${config.shein.apiUrl}/product/update`, // Example update endpoint
        {
          ...requestBody,
          sign: signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          params: commonParams
        }
      );
      console.log(`SHEIN: Updated product ID ${platformProductId}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating product on SHEIN (ID: ${platformProductId}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to update product on SHEIN: ${error.message}`);
    }
  },

  async updateInventory(platformProductId, quantity, shopCredentials) {
    const { apiKey, secret } = this.getCredentials(shopCredentials);
    try {
      const timestamp = Date.now();
      const commonParams = {
        app_key: apiKey,
        timestamp: timestamp,
      };
      const requestBody = {
        product_id: platformProductId,
        stock_quantity: quantity,
      };

      const allParams = { ...commonParams, ...requestBody };
      const signature = generateSheinSignature(allParams, apiKey, secret);

      const response = await axios.post(
        `${config.shein.apiUrl}/product/updateStock`, // Example update stock endpoint
        {
          ...requestBody,
          sign: signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          params: commonParams
        }
      );
      console.log(`SHEIN: Updated inventory for product ID ${platformProductId} to ${quantity}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating inventory on SHEIN (ID: ${platformProductId}):`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to update inventory on SHEIN: ${error.message}`);
    }
  },

  async getOrders(lastSyncDate, shopCredentials) {
    const { apiKey, secret } = this.getCredentials(shopCredentials);
    try {
      const timestamp = Date.now();
      const commonParams = {
        app_key: apiKey,
        timestamp: timestamp,
        start_time: lastSyncDate.toISOString(), // SHEIN might use different date format
        // end_time: new Date().toISOString(),
        // ... pagination or status filters
      };

      const signature = generateSheinSignature(commonParams, apiKey, secret);

      const response = await axios.get(
        `${config.shein.apiUrl}/order/list`, // Example list orders endpoint
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          params: {
            ...commonParams,
            sign: signature,
          }
        }
      );
      console.log(`SHEIN: Fetched ${response.data.data.orders ? response.data.data.orders.length : 0} orders.`);

      // Transform SHEIN orders to a common format
      // NOTE: This will now need to be saved into SheinOrder model first, then potentially
      // translate to the central Order and OrderDetail models.
      return (response.data.data.orders || []).map(sheinOrder => ({
        platformOrderId: sheinOrder.order_id,
        orderDate: new Date(sheinOrder.order_time), // Adjust field name
        status: sheinOrder.order_status, // Adjust field name, map to your internal status
        totalAmount: parseFloat(sheinOrder.total_amount), // Adjust field name
        items: sheinOrder.products.map(item => ({ // Adjust structure for items
          productId: item.sku, // Assuming SHEIN provides SKU
          quantity: item.quantity,
          price: parseFloat(item.price),
          platformItemId: item.product_id, // SHEIN's item ID
        })),
      }));
    } catch (error) {
      console.error(`Error fetching orders from SHEIN:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      throw new Error(`Failed to fetch orders from SHEIN: ${error.message}`);
    }
  },
};

module.exports = sheinService;
```javascript
// src/services/syncService.js
// Main synchronization logic - This will require significant updates due to schema changes

const prisma = require('./prismaService');
const ebayService = require('./ebayService');
const walmartService = require('./walmartService');
const woocommerceService = require('./woocommerceService');
const sheinService = require('./sheinService'); // New Shein service

// Map platform names to their respective service objects
const platformServices = {
  EBAY: ebayService,
  WALMART: walmartService,
  WOOCOMMERCE: woocommerceService,
  SHEIN: sheinService, // Add Shein service
};

const syncService = {
  /**
   * Syncs a product creation from the central dashboard to all linked shops.
   * This logic needs to be updated to use the platform-specific IDs from the Product model
   * instead of relying on ProductShopLink for the initial creation.
   */
  async syncProductCreate(productId) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        console.warn(`Product with ID ${productId} not found for creation sync.`);
        return;
      }

      const shops = await prisma.shop.findMany(); // Get all shops

      for (const shop of shops) {
        try {
          const service = platformServices[shop.platform];
          if (!service || !service.createProduct) {
            console.warn(`No createProduct service found for platform ${shop.platform}`);
            continue;
          }

          let platformProductIdField;
          let currentPlatformProductId;

          // Determine which platform ID field to use from the Product model
          // This approach is less scalable than ProductShopLink for multiple shops per platform
          switch (shop.platform) {
            case 'EBAY':
              platformProductIdField = 'ebayId';
              currentPlatformProductId = product.ebayId;
              break;
            case 'WALMART':
              platformProductIdField = 'wallmartId'; // Typo: should be 'walmartId' in schema
              currentPlatformProductId = product.wallmartId;
              break;
            case 'WOOCOMMERCE':
              platformProductIdField = 'woocommerceId';
              currentPlatformProductId = product.woocommerceId;
              break;
            case 'SHEIN':
              platformProductIdField = 'sheinId';
              currentPlatformProductId = product.sheinId;
              break;
            default:
              console.warn(`Unsupported platform ${shop.platform} for product creation sync.`);
              continue;
          }

          if (currentPlatformProductId) {
            console.log(`Product ${product.sku} already has a ${shop.platform} ID (${currentPlatformProductId}). Skipping creation.`);
            continue; // Product already exists on this platform, skip creation
          }

          console.log(`Attempting to create product ${product.sku} on ${shop.name} (${shop.platform})...`);
          const { platformProductId } = await service.createProduct(product, shop.credentials);

          // Update the central product with the new platform-specific ID
          await prisma.product.update({
            where: { id: product.id },
            data: {
              [platformProductIdField]: platformProductId,
              // Also consider updating ProductShopLink if you still want to use it
            },
          });

          // This part still uses ProductShopLink for tracking, which is good.
          // You might create it here even if platformProductId is directly on Product.
          // This provides a many-to-many relationship tracking.
          await prisma.productShopLink.upsert({
            where: {
              ProductShopUnique: {
                productId: product.id,
                shopId: shop.id
              }
            },
            update: {
              platformProductId: platformProductId,
              lastSyncedAt: new Date(),
            },
            create: {
              productId: product.id,
              shopId: shop.id,
              platformProductId: platformProductId,
              lastSyncedAt: new Date(),
            },
          });

          console.log(`Successfully created product ${product.sku} on ${shop.name}. Platform ID: ${platformProductId}`);
        } catch (error) {
          console.error(`Failed to create product ${product.sku} on ${shop.name}:`, error.message);
        }
      }
      console.log(`Product creation sync completed for central product ID: ${productId}`);
    } catch (error) {
      console.error(`Error in overall product creation sync for ${productId}:`, error.message);
      throw error;
    }
  },

  /**
   * Syncs a product update from the central dashboard to all linked shops.
   * Now relies on the platform-specific IDs stored directly on the Product model.
   */
  async syncProductUpdate(productId) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        console.warn(`Product with ID ${productId} not found for update sync.`);
        return;
      }

      // Fetch all shop links to know which shops this product is on
      const productLinks = await prisma.productShopLink.findMany({
        where: { productId: product.id },
        include: { shop: true },
      });

      if (productLinks.length === 0) {
        console.warn(`No shop links found for product ID ${productId}. Skipping update sync.`);
        return;
      }

      for (const link of productLinks) {
        try {
          const service = platformServices[link.shop.platform];
          if (!service || !service.updateProduct) {
            console.warn(`No updateProduct service found for platform ${link.shop.platform}`);
            continue;
          }

          // Use the platformProductId from ProductShopLink
          const platformProductId = link.platformProductId;

          if (!platformProductId) {
            console.warn(`Product ${product.sku} has no platform ID for shop ${link.shop.name}. Skipping update.`);
            continue;
          }

          console.log(`Attempting to update product ${product.sku} on ${link.shop.name} (Platform ID: ${platformProductId})...`);
          await service.updateProduct(product, platformProductId, link.shop.credentials);

          await prisma.productShopLink.update({
            where: { id: link.id },
            data: { lastSyncedAt: new Date() },
          });
          console.log(`Successfully updated product ${product.sku} on ${link.shop.name}.`);
        } catch (error) {
          console.error(`Failed to update product ${product.sku} on ${link.shop.name}:`, error.message);
        }
      }
      console.log(`Product update sync completed for central product ID: ${productId}`);
    } catch (error) {
      console.error(`Error in overall product update sync for ${productId}:`, error.message);
      throw error;
    }
  },

  /**
   * Decreases stock in the central database and propagates to other shops
   * when a product is sold on any shop.
   * This still relies on central product ID and propagates to linked shops.
   */
  async syncInventoryDecrease(centralProductId, sourceShopId, quantitySold) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Decrease stock in central database
        const updatedProduct = await tx.product.update({
          where: { id: centralProductId },
          data: {
            stockQuantity: { // Changed to stockQuantity
              decrement: quantitySold,
            },
          },
        });
        console.log(`Central DB: Decreased stock for product ${updatedProduct.sku} to ${updatedProduct.stockQuantity}.`);

        if (updatedProduct.stockQuantity < 0) {
          console.warn(`Warning: Stock for product ${updatedProduct.sku} went negative. Current stock: ${updatedProduct.stockQuantity}`);
          // You might want to trigger an alert here or handle overselling
        }

        // 2. Propagate inventory update to other shops
        const productLinks = await tx.productShopLink.findMany({
          where: { productId: centralProductId },
          include: { shop: true },
        });

        for (const link of productLinks) {
          // Only update other shops, not the source shop that triggered the sale
          // Note: The sourceShopId here refers to the ID of our internal Shop model,
          // not the platform's order source.
          if (link.shop.id === sourceShopId) { // Check against internal shop ID
            console.log(`Skipping inventory update for source shop ${link.shop.name}.`);
            continue;
          }

          try {
            const service = platformServices[link.shop.platform];
            if (!service || !service.updateInventory) {
              console.warn(`No updateInventory service found for platform ${link.shop.platform}`);
              continue;
            }

            console.log(`Attempting to update inventory for product ${updatedProduct.sku} on ${link.shop.name} (Platform ID: ${link.platformProductId})...`);
            await service.updateInventory(link.platformProductId, updatedProduct.stockQuantity, link.shop.credentials);

            await tx.productShopLink.update({
              where: { id: link.id },
              data: { lastSyncedAt: new Date() },
            });
            console.log(`Successfully updated inventory for product ${updatedProduct.sku} on ${link.shop.name}. New stock: ${updatedProduct.stockQuantity}`);
          } catch (error) {
            console.error(`Failed to update inventory for product ${updatedProduct.sku} on ${link.shop.name}:`, error.message);
          }
        }
      });
      console.log(`Inventory decrease sync completed for product ID: ${centralProductId}, quantity: ${quantitySold}`);
    } catch (error) {
      console.error(`Error in overall inventory decrease sync for product ${centralProductId}:`, error.message);
      throw error;
    }
  },

  /**
   * Fetches new orders from all shops and syncs them.
   * This now performs a two-step process: fetch into platform-specific tables,
   * then map to the central Order/OrderDetail models.
   */
  async syncNewOrders() {
    console.log('Starting new order sync across all shops...');
    const shops = await prisma.shop.findMany();

    for (const shop of shops) {
      try {
        const service = platformServices[shop.platform];
        if (!service || !service.getOrders) {
          console.warn(`No getOrders service found for platform ${shop.platform}`);
          continue;
        }

        let lastSyncDate;
        let platformOrderModel; // To determine which model to use for platform orders
        let platformOrderIdField; // The field to store the platform's order ID in the central Order or OrderDetail

        switch (shop.platform) {
          case 'EBAY':
            platformOrderModel = prisma.ebayOrder;
            platformOrderIdField = 'ebayOrderId';
            break;
          case 'WALMART':
            platformOrderModel = prisma.walmartOrder;
            platformOrderIdField = 'walmartOrderId';
            break;
          case 'SHEIN':
            platformOrderModel = prisma.sheinOrder;
            platformOrderIdField = 'sheinOrderId';
            break;
          case 'WOOCOMMERCE':
            // WooCommerce does not have a dedicated platform order table in your schema.
            // We'll treat it as directly creating a central order.
            // For a truly consistent schema, you might consider adding a `WooCommerceOrder` model.
            platformOrderModel = null; // No dedicated table
            platformOrderIdField = 'woocommerceOrderId'; // Placeholder for consistency in `OrderDetail`
            break;
          default:
            console.warn(`Unsupported platform ${shop.platform} for order sync.`);
            continue;
        }

        // Determine last sync date. For dedicated platform order tables, query that table.
        // For WooCommerce (or others without dedicated tables), this logic might need refinement
        // to prevent duplicate processing without a 'syncedAt' on the Shop or a more robust check.
        if (platformOrderModel) {
          const latestPlatformOrder = await platformOrderModel.findFirst({
            orderBy: { orderCreationDate: 'desc' },
            select: { orderCreationDate: true },
          });
          lastSyncDate = latestPlatformOrder ? latestPlatformOrder.orderCreationDate : new Date(0);
        } else {
          // Fallback for platforms without a dedicated order table.
          // This is a simplification; a better approach might be a `lastOrderSync` timestamp on the `Shop` model itself.
          lastSyncDate = new Date(0);
          console.warn(`No dedicated platform order table for ${shop.platform}. Using epoch as sync start.`);
        }


        console.log(`Fetching orders from ${shop.name} (${shop.platform}) since ${lastSyncDate.toISOString()}...`);
        const ordersFromShop = await service.getOrders(lastSyncDate, shop.credentials);

        if (ordersFromShop.length === 0) {
          console.log(`No new orders from ${shop.name}.`);
          continue;
        }

        console.log(`Processing ${ordersFromShop.length} new orders from ${shop.name}...`);

        for (const orderData of ordersFromShop) {
          await prisma.$transaction(async (tx) => {
            let platformDbOrder = null;

            // 1. Save the raw platform order to its dedicated table (if applicable)
            if (platformOrderModel) {
              const existingPlatformOrder = await platformOrderModel.findUnique({
                where: { orderId: orderData.platformOrderId },
              });

              if (existingPlatformOrder) {
                console.log(`Platform order ${orderData.platformOrderId} from ${shop.name} already exists in ${shop.platform}Order table. Skipping.`);
                return; // Skip this order entirely
              }
              platformDbOrder = await platformOrderModel.create({
                data: {
                  orderId: orderData.platformOrderId,
                  orderCreationDate: orderData.orderDate,
                  status: orderData.status, // If platform orders have a status field
                  // Add other raw fields if desired
                },
              });
              console.log(`Created new platform order ${platformDbOrder.orderId} in ${shop.platform}Order table.`);
            } else {
                // For WooCommerce or other direct-to-central-Order platforms
                // Need a way to check for duplicates here before creating central Order
                // This might require a unique constraint on OrderDetail if platformOrderId is moved there,
                // or adding a new field to Order to track the source shop/platform order ID.
                console.warn(`No dedicated platform order model for ${shop.platform}. Directing to central Order.`);
            }

            // 2. Map the platform order to the central `Order` model
            // This assumes a user exists. In a real app, you'd match by email or create a new user.
            const defaultUser = await tx.user.findFirst({ where: { role: 'PlatformUser' } }) || await tx.user.findFirst();
            if (!defaultUser) {
              console.error('No default PlatformUser or any user found to associate orders with. Skipping order creation.');
              return;
            }

            const centralOrder = await tx.order.create({
              data: {
                userId: defaultUser.id,
                status: orderData.status,
                totalAmount: orderData.totalAmount,
                // Note: shopId, platformOrderId, orderDate are no longer directly on `Order`.
                // If needed, they must be stored on `OrderDetail` or a new mapping table.
              },
            });
            console.log(`Created new central order ${centralOrder.id} (derived from platform order ${orderData.platformOrderId}).`);

            // 3. Create OrderDetails for the central order and link to products
            for (const item of orderData.items) {
              const centralProduct = await tx.product.findUnique({
                where: { sku: item.productId }, // Assuming item.productId from platform is SKU
              });

              if (centralProduct) {
                const category = centralProduct.categoryId ? await tx.category.findUnique({ where: { id: centralProduct.categoryId } }) : null;
                const size = centralProduct.sizeId ? await tx.size.findUnique({ where: { id: centralProduct.sizeId } }) : null;

                await tx.orderDetail.create({
                  data: {
                    orderId: centralOrder.id,
                    productId: centralProduct.id,
                    sku: centralProduct.sku,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.quantity * item.price,
                    productName: centralProduct.title,
                    categoryName: category ? category.name : 'N/A',
                    sizeName: size ? size.name : 'N/A',
                    // Optionally, store platformOrderId here if needed for traceability
                    // [platformOrderIdField]: orderData.platformOrderId,
                  },
                });
                console.log(`  - Added item ${item.productId} (Qty: ${item.quantity}) to central order ${centralOrder.id}.`);

                // Trigger inventory decrease for the sold item on other shops
                await syncService.syncInventoryDecrease(centralProduct.id, shop.id, item.quantity);
              } else {
                console.warn(`Product with SKU ${item.productId} from order ${orderData.platformOrderId} not found in central DB. Skipping inventory sync for this item.`);
              }
            }

            // 4. Create a Transaction entry if the order is completed/processing
            if (orderData.status === 'COMPLETED' || orderData.status === 'processing') {
              const transaction = await tx.transaction.upsert({
                where: { orderId: centralOrder.id }, // Assuming one transaction per central order
                update: {
                  status: orderData.status === 'COMPLETED' ? 'Successful' : 'Pending',
                  amount: orderData.totalAmount,
                },
                create: {
                  transactionId: `TXN-${shop.platform}-${orderData.platformOrderId}-${Date.now()}`, // Unique ID
                  orderId: centralOrder.id,
                  amount: orderData.totalAmount,
                  status: orderData.status === 'COMPLETED' ? 'Successful' : 'Pending',
                },
              });
              console.log(`Created/updated transaction ${transaction.transactionId} for central order ${centralOrder.id}.`);
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching or processing orders from ${shop.name}:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      }
    }
    console.log('New order sync completed for all shops.');
  },
};

module.exports = syncService;
```javascript
// src/controllers/productController.js
// Handles product-related API requests

const prisma = require('../services/prismaService');
const syncService = require('../services/syncService');
const handleError = require('../utils/errorHandler');
const { Platform } = require('@prisma/client'); // Import Platform enum

const productController = {
  // Create a new product in the central database and sync to all shops
  async createProduct(req, res, next) {
    try {
      // Updated fields to match new Product schema
      const { title, brandName, color, sku, images, itemLocation, sizeId, sizeType, sizes,
              postName, categoryId, subCategoryId, parentCategoryId,
              ebayId, wallmartId, sheinId, woocommerceId, // Direct platform IDs
              regularPrice, salePrice, platFormPrice, toggleFirstDeal, discountPercent,
              stockQuantity, condition, description, status } = req.body;

      if (!title || !sku || !stockQuantity) {
        return res.status(400).json({ message: 'Missing required product fields (title, sku, stockQuantity).' });
      }

      const newProduct = await prisma.product.create({
        data: {
          title,
          brandName,
          color,
          sku,
          images: images || [], // Ensure images is an array
          itemLocation,
          sizeId,
          sizeType,
          sizes,
          postName,
          categoryId,
          subCategoryId,
          parentCategoryId,
          ebayId,
          wallmartId, // Use 'wallmartId' as per your schema
          sheinId,
          woocommerceId,
          regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
          salePrice: salePrice ? parseFloat(salePrice) : undefined,
          platFormPrice: platFormPrice ? parseFloat(platFormPrice) : undefined,
          toggleFirstDeal,
          discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
          stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
          condition,
          description,
          status,
          // updatedById should be handled by auth, leaving it undefined for now
        },
      });

      // Trigger asynchronous sync to all shops
      syncService.syncProductCreate(newProduct.id)
        .catch(error => console.error(`Background sync for new product ${newProduct.id} failed:`, error));

      res.status(201).json({
        message: 'Product created and background sync initiated.',
        product: newProduct,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Get all products from the central database
  async getAllProducts(req, res, next) {
    try {
      const products = await prisma.product.findMany();
      res.status(200).json(products);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Get a single product by ID
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }
      res.status(200).json(product);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Update a product in the central database and sync to all shops
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      // Extract all updatable fields from body
      const { title, brandName, color, sku, images, itemLocation, sizeId, sizeType, sizes,
              postName, categoryId, subCategoryId, parentCategoryId,
              ebayId, wallmartId, sheinId, woocommerceId, // Direct platform IDs
              regularPrice, salePrice, platFormPrice, toggleFirstDeal, discountPercent,
              stockQuantity, condition, description, status } = req.body;

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          title,
          brandName,
          color,
          sku,
          images: images || undefined, // Only update if provided
          itemLocation,
          sizeId,
          sizeType,
          sizes,
          postName,
          categoryId,
          subCategoryId,
          parentCategoryId,
          ebayId,
          wallmartId,
          sheinId,
          woocommerceId,
          regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
          salePrice: salePrice ? parseFloat(salePrice) : undefined,
          platFormPrice: platFormPrice ? parseFloat(platFormPrice) : undefined,
          toggleFirstDeal,
          discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
          stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
          condition,
          description,
          status,
          // updatedById should be handled by auth, leaving it undefined for now
        },
      });

      // Trigger asynchronous sync to all shops
      syncService.syncProductUpdate(updatedProduct.id)
        .catch(error => console.error(`Background sync for product update ${updatedProduct.id} failed:`, error));

      res.status(200).json({
        message: 'Product updated and background sync initiated.',
        product: updatedProduct,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Delete a product from the central database (consider if you need to delete from shops too)
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;

      // In a real scenario, you might want to de-list from shops first
      // This will require calls to each platform's API to de-list the product.
      // This will also need to handle the new platform-specific IDs on the Product model.

      await prisma.productShopLink.deleteMany({
        where: { productId: id },
      });
      await prisma.orderDetail.deleteMany({
        where: { productId: id }
      });
      // If Product has direct relation to OrderItem, need to delete those too
      // Based on the latest schema, Product no longer has an explicit `orderItems` field,
      // but OrderItem still references Product. So, OrderItems associated with this product
      // must be deleted first, or the relation should be set to `onDelete: Cascade`.
      // For now, assuming OrderItem does not have a direct array on Product.
      const deletedProduct = await prisma.product.delete({
        where: { id },
      });

      res.status(200).json({
        message: 'Product deleted successfully from central database.',
        product: deletedProduct,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Endpoint to manually add a shop (for initial setup)
  async addShop(req, res, next) {
    try {
      const { name, platform, credentials, baseUrl } = req.body;
      if (!name || !platform || !credentials) {
        return res.status(400).json({ message: 'Missing required shop fields (name, platform, credentials).' });
      }

      // Validate platform against enum
      // Assuming 'Platform' enum is imported from Prisma Client if you're using TS
      if (!Object.values(Platform).includes(platform)) { // Corrected Platform to Platform (enum)
        return res.status(400).json({ message: `Invalid platform. Must be one of: ${Object.values(Platform).join(', ')}` });
      }

      const newShop = await prisma.shop.create({
        data: {
          name,
          platform,
          credentials: credentials, // Ensure this is a valid JSON object
          baseUrl,
        },
      });

      res.status(201).json({
        message: 'Shop added successfully.',
        shop: newShop,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Get all shops
  async getAllShops(req, res, next) {
    try {
      const shops = await prisma.shop.findMany();
      res.status(200).json(shops);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Add ApiToken
  async addApiToken(req, res, next) {
    try {
      const { platform, accessToken, refreshToken, expiresAt } = req.body;
      if (!platform || !accessToken || !refreshToken || !expiresAt) {
        return res.status(400).json({ message: 'Missing required ApiToken fields.' });
      }

      if (!Object.values(Platform).includes(platform)) {
        return res.status(400).json({ message: `Invalid platform. Must be one of: ${Object.values(Platform).join(', ')}` });
      }

      const newApiToken = await prisma.apiToken.upsert({
        where: { platform: platform },
        update: {
          accessToken,
          refreshToken,
          expiresAt: new Date(expiresAt),
        },
        create: {
          platform,
          accessToken,
          refreshToken,
          expiresAt: new Date(expiresAt),
        },
      });

      res.status(201).json({
        message: 'ApiToken added/updated successfully.',
        apiToken: newApiToken,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Get all ApiTokens
  async getAllApiTokens(req, res, next) {
    try {
      const apiTokens = await prisma.apiToken.findMany();
      res.status(200).json(apiTokens);
    } catch (error) {
      handleError(error, res, next);
    }
  }
};

module.exports = productController;
```javascript
// src/controllers/syncController.js
// Handles manual triggers for synchronization operations

const syncService = require('../services/syncService');
const handleError = require('../utils/errorHandler');

const syncController = {
  // Manually trigger a full order sync
  async triggerOrderSync(req, res, next) {
    try {
      syncService.syncNewOrders()
        .then(() => console.log('Manual order sync initiated successfully.'))
        .catch(error => console.error('Error during manual order sync initiation:', error));

      res.status(202).json({
        message: 'Order synchronization initiated in the background.',
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Manually trigger a specific product creation sync (useful for testing)
  async triggerProductCreateSync(req, res, next) {
    try {
      const { productId } = req.params;
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required.' });
      }

      syncService.syncProductCreate(productId)
        .then(() => console.log(`Manual product create sync for ${productId} initiated successfully.`))
        .catch(error => console.error(`Error during manual product create sync for ${productId}:`, error));

      res.status(202).json({
        message: `Product creation sync for ID ${productId} initiated in the background.`,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Manually trigger a specific product update sync (useful for testing)
  async triggerProductUpdateSync(req, res, next) {
    try {
      const { productId } = req.params;
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required.' });
      }

      syncService.syncProductUpdate(productId)
        .then(() => console.log(`Manual product update sync for ${productId} initiated successfully.`))
        .catch(error => console.error(`Error during manual product update sync for ${productId}:`, error));

      res.status(202).json({
        message: `Product update sync for ID ${productId} initiated in the background.`,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  // Manually trigger an inventory decrease sync (for testing scenarios or manual adjustments)
  async triggerInventoryDecreaseSync(req, res, next) {
    try {
      const { productId } = req.params;
      const { shopId, quantitySold } = req.body; // shopId is the source of sale, quantitySold is the amount sold

      if (!productId || !shopId || !quantitySold) {
        return res.status(400).json({ message: 'Product ID, Shop ID, and quantitySold are required.' });
      }

      syncService.syncInventoryDecrease(productId, shopId, parseInt(quantitySold))
        .then(() => console.log(`Manual inventory decrease sync for product ${productId} initiated successfully.`))
        .catch(error => console.error(`Error during manual inventory decrease sync for ${productId}:`, error));

      res.status(202).json({
        message: `Inventory decrease sync for product ID ${productId} initiated in the background.`,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },
};

module.exports = syncController;
```javascript
// src/routes/productRoutes.js
// Defines API routes for product management

const express = require('express');
const productController = require('../controllers/productController');

const router = express.Router();

// Products
router.post('/', productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Shops
router.post('/shops', productController.addShop);
router.get('/shops', productController.getAllShops);

// API Tokens (new routes due to schema change)
router.post('/api-tokens', productController.addApiToken);
router.get('/api-tokens', productController.getAllApiTokens);


module.exports = router;
```javascript
// src/routes/syncRoutes.js
// Defines API routes for manually triggering sync operations

const express = require('express');
const syncController = require('../controllers/syncController');

const router = express.Router();

router.post('/orders', syncController.triggerOrderSync);
router.post('/products/create/:productId', syncController.triggerProductCreateSync);
router.post('/products/update/:productId', syncController.triggerProductUpdateSync);
router.post('/inventory/decrease/:productId', syncController.triggerInventoryDecreaseSync);


module.exports = router;
```javascript
// src/utils/cronScheduler.js
// Sets up cron jobs for background tasks

const cron = require('node-cron');
const syncService = require('../services/syncService');
const config = require('../config');

const startCronJobs = () => {
  // Schedule the order synchronization
  cron.schedule(config.cron.orderSyncSchedule, async () => {
    console.log(`Running scheduled order sync at ${new Date().toISOString()}`);
    try {
      await syncService.syncNewOrders();
      console.log('Scheduled order sync completed successfully.');
    } catch (error) {
      console.error('Error during scheduled order sync:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC' // Important: set a specific timezone or use UTC
  });

  console.log(`Cron job for order sync scheduled to run every ${config.cron.orderSyncSchedule} (UTC).`);

  // You can add more cron jobs here for other periodic tasks, e.g.,
  // - Full inventory reconciliation
  // - Health checks
  // cron.schedule('0 0 * * *', async () => { // Every day at midnight UTC
  //   console.log('Running daily inventory reconciliation...');
  //   // Call a syncService function for full inventory reconciliation
  // });
};

module.exports = startCronJobs;
```javascript
// src/app.js
// Express application setup

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const syncRoutes = require('./routes/syncRoutes');
const handleError = require('./utils/errorHandler');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(bodyParser.json()); // Parse JSON request bodies

// Routes
app.use('/api/products', productRoutes);
app.use('/api/sync', syncRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('E-commerce Sync System API is running!');
});

// Centralized error handling middleware
app.use(handleError);

module.exports = app;
```javascript
// src/server.js
// Entry point for the Express server

const app = require('./app');
const config = require('./config');
const prisma = require('./services/prismaService'); // Import prisma to ensure connection
const startCronJobs = require('./utils/cronScheduler');

const PORT = config.port;

const startServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to PostgreSQL database.');

    // Start cron jobs
    startCronJobs();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Access API at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Exit with failure code
  }
};

startServer();

// Graceful shutdown
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
    console.log('Disconnected from PostgreSQL database.');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
});
