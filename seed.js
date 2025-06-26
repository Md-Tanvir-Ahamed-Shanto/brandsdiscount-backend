const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data to avoid unique constraint violations
  console.log('🧹 Cleaning existing data...');
  await prisma.orderDetail.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ebayOrder.deleteMany();
  await prisma.walmartOrder.deleteMany();
  await prisma.sheinOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.size.deleteMany();
  await prisma.user.deleteMany();
  await prisma.apiToken.deleteMany();

  // Create Sizes
  console.log('📏 Creating sizes...');
  const sizes = await Promise.all([
    prisma.size.create({ data: { name: 'XS' } }),
    prisma.size.create({ data: { name: 'S' } }),
    prisma.size.create({ data: { name: 'M' } }),
    prisma.size.create({ data: { name: 'L' } }),
    prisma.size.create({ data: { name: 'XL' } }),
    prisma.size.create({ data: { name: 'XXL' } }),
    prisma.size.create({ data: { name: 'One Size' } }),
  ]);

  // Create Categories (Parent Categories)
  console.log('📂 Creating categories...');
  const clothingCategory = await prisma.category.create({
    data: { name: 'Clothing' }
  });

  const electronicsCategory = await prisma.category.create({
    data: { name: 'Electronics' }
  });

  const homeCategory = await prisma.category.create({
    data: { name: 'Home & Garden' }
  });

  // Create Subcategories
  const menClothing = await prisma.category.create({
    data: { 
      name: 'Men\'s Clothing',
      parentCategoryId: clothingCategory.id
    }
  });

  const womenClothing = await prisma.category.create({
    data: { 
      name: 'Women\'s Clothing',
      parentCategoryId: clothingCategory.id
    }
  });

  const smartphones = await prisma.category.create({
    data: { 
      name: 'Smartphones',
      parentCategoryId: electronicsCategory.id
    }
  });

  const laptops = await prisma.category.create({
    data: { 
      name: 'Laptops',
      parentCategoryId: electronicsCategory.id
    }
  });

  // Create Users
  console.log('👥 Creating users...');
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      hashedPassword: Buffer.from(hashedPassword),
      salt: Buffer.from(salt),
      email: 'admin@example.com',
      role: 'SuperAdmin',
      profilePicture: {
        url: 'https://example.com/admin-avatar.jpg',
        fileName: 'admin-avatar.jpg'
      },
      userDetails: {
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890',
        address: '123 Admin St, Admin City, AC 12345'
      },
      loyaltyStatus: 'Loyal',
      orderPoint: 1000.0
    }
  });

  const customerUser = await prisma.user.create({
    data: {
      username: 'john_doe',
      hashedPassword: Buffer.from(hashedPassword),
      salt: Buffer.from(salt),
      email: 'john.doe@example.com',
      role: 'PlatformUser',
      profilePicture: {
        url: 'https://example.com/john-avatar.jpg',
        fileName: 'john-avatar.jpg'
      },
      userDetails: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1987654321',
        address: '456 Customer Ave, Customer City, CC 54321'
      },
      loyaltyStatus: 'Eligible',
      orderPoint: 250.5
    }
  });

  const warehouseUser = await prisma.user.create({
    data: {
      username: 'warehouse_manager',
      hashedPassword: Buffer.from(hashedPassword),
      salt: Buffer.from(salt),
      email: 'warehouse@example.com',
      role: 'WareHouse',
      profilePicture: {
        url: 'https://example.com/warehouse-avatar.jpg',
        fileName: 'warehouse-avatar.jpg'
      },
      userDetails: {
        firstName: 'Warehouse',
        lastName: 'Manager',
        phone: '+1555123456',
        address: '789 Warehouse Blvd, Industrial City, IC 98765'
      },
      loyaltyStatus: 'Not_Eligible',
      orderPoint: 0.0
    }
  });

  // Create Products
  console.log('📦 Creating products...');
  const products = await Promise.all([
    // Men's Clothing
    prisma.product.create({
      data: {
        title: 'Men\'s Classic Cotton T-Shirt',
        brandName: 'ComfortWear',
        color: 'Navy Blue',
        sku: 'MCT001-NB-L',
        images: [
          { url: 'https://example.com/tshirt1.jpg', alt: 'Navy Blue T-Shirt Front' },
          { url: 'https://example.com/tshirt1-back.jpg', alt: 'Navy Blue T-Shirt Back' }
        ],
        itemLocation: 'Warehouse A-1',
        sizes: 'S,M,L,XL',
        sizeType: 'Standard',
        categoryId: menClothing.id,
        parentCategoryId: clothingCategory.id,
        regularPrice: 29.99,
        salePrice: 24.99,
        discountPercent: 16.67,
        stockQuantity: 150,
        condition: 'New',
        description: 'Premium quality 100% cotton t-shirt with comfortable fit and durable construction.',
        status: 'Active',
        updatedById: adminUser.id
      }
    }),

    // Women's Clothing
    prisma.product.create({
      data: {
        title: 'Women\'s Summer Dress',
        brandName: 'FashionForward',
        color: 'Floral Print',
        sku: 'WSD002-FP-M',
        images: [
          { url: 'https://example.com/dress1.jpg', alt: 'Floral Summer Dress' },
          { url: 'https://example.com/dress1-detail.jpg', alt: 'Dress Detail' }
        ],
        itemLocation: 'Warehouse B-2',
        sizes: 'XS,S,M,L',
        sizeType: 'Standard',
        categoryId: womenClothing.id,
        parentCategoryId: clothingCategory.id,
        ebayId: 'EBY123456789',
        regularPrice: 79.99,
        salePrice: 59.99,
        discountPercent: 25.0,
        stockQuantity: 75,
        condition: 'New',
        description: 'Lightweight and breathable summer dress perfect for casual outings.',
        status: 'Active',
        updatedById: adminUser.id
      }
    }),

    // Electronics - Smartphone
    prisma.product.create({
      data: {
        title: 'Samsung Galaxy A54 5G',
        brandName: 'Samsung',
        color: 'Awesome Blue',
        sku: 'SGS-A54-AB-128',
        images: [
          { url: 'https://example.com/galaxy-a54.jpg', alt: 'Samsung Galaxy A54' },
          { url: 'https://example.com/galaxy-a54-back.jpg', alt: 'Galaxy A54 Back' }
        ],
        itemLocation: 'Electronics Vault E-1',
        sizes: '128GB',
        sizeType: 'Storage',
        categoryId: smartphones.id,
        parentCategoryId: electronicsCategory.id,
        wallmartId: 'WM987654321',
        regularPrice: 449.99,
        salePrice: 399.99,
        discountPercent: 11.11,
        stockQuantity: 25,
        condition: 'New',
        description: 'Latest Samsung Galaxy A54 with 5G connectivity, 50MP camera, and all-day battery.',
        status: 'Active',
        updatedById: adminUser.id
      }
    }),

    // Electronics - Laptop
    prisma.product.create({
      data: {
        title: 'Dell Inspiron 15 3000 Laptop',
        brandName: 'Dell',
        color: 'Black',
        sku: 'DELL-INS15-BLK-8GB',
        images: [
          { url: 'https://example.com/dell-inspiron.jpg', alt: 'Dell Inspiron Laptop' },
          { url: 'https://example.com/dell-inspiron-open.jpg', alt: 'Laptop Open View' }
        ],
        itemLocation: 'Electronics Vault E-2',
        sizes: '8GB RAM / 256GB SSD',
        sizeType: 'Configuration',
        categoryId: laptops.id,
        parentCategoryId: electronicsCategory.id,
        sheinId: 'SH445566778',
        regularPrice: 649.99,
        salePrice: 549.99,
        discountPercent: 15.38,
        stockQuantity: 12,
        condition: 'Refurbished',
        description: 'Reliable Dell Inspiron laptop perfect for work and entertainment.',
        status: 'Active',
        updatedById: adminUser.id
      }
    }),

    // Out of Stock Product
    prisma.product.create({
      data: {
        title: 'Vintage Leather Jacket',
        brandName: 'ClassicLeather',
        color: 'Brown',
        sku: 'VLJ005-BR-L',
        images: [
          { url: 'https://example.com/leather-jacket.jpg', alt: 'Vintage Leather Jacket' }
        ],
        itemLocation: 'Warehouse C-3',
        sizes: 'M,L,XL',
        sizeType: 'Standard',
        categoryId: menClothing.id,
        parentCategoryId: clothingCategory.id,
        regularPrice: 199.99,
        salePrice: 149.99,
        discountPercent: 25.0,
        stockQuantity: 0,
        condition: 'New',
        description: 'Premium genuine leather jacket with vintage styling.',
        status: 'Out of Stock',
        updatedById: adminUser.id
      }
    })
  ]);

  // Create Orders
  console.log('🛒 Creating orders...');
  const order1 = await prisma.order.create({
    data: {
      userId: customerUser.id,
      status: 'Completed',
      totalAmount: 84.98
    }
  });

  const order2 = await prisma.order.create({
    data: {
      userId: customerUser.id,
      status: 'Pending',
      totalAmount: 399.99
    }
  });

  // Create Order Details
  console.log('📋 Creating order details...');
  await Promise.all([
    prisma.orderDetail.create({
      data: {
        sku: products[0].sku,
        orderId: order1.id,
        productId: products[0].id,
        quantity: 2,
        price: 24.99,
        total: 49.98,
        productName: products[0].title,
        categoryName: 'Men\'s Clothing',
        sizeName: 'L'
      }
    }),
    prisma.orderDetail.create({
      data: {
        sku: products[1].sku,
        orderId: order1.id,
        productId: products[1].id,
        quantity: 1,
        price: 59.99,
        total: 59.99,
        productName: products[1].title,
        categoryName: 'Women\'s Clothing',
        sizeName: 'M'
      }
    }),
    prisma.orderDetail.create({
      data: {
        sku: products[2].sku,
        orderId: order2.id,
        productId: products[2].id,
        quantity: 1,
        price: 399.99,
        total: 399.99,
        productName: products[2].title,
        categoryName: 'Smartphones',
        sizeName: '128GB'
      }
    })
  ]);

  // Create Transactions
  console.log('💳 Creating transactions...');
  await Promise.all([
    prisma.transaction.create({
      data: {
        transactionId: 'TXN001234567890',
        orderId: order1.id,
        amount: 84.98,
        status: 'Successful'
      }
    }),
    prisma.transaction.create({
      data: {
        transactionId: 'TXN001234567891',
        orderId: order2.id,
        amount: 399.99,
        status: 'Pending'
      }
    })
  ]);

  // Create API Tokens (using upsert to handle unique constraint)
  console.log('🔑 Creating API tokens...');
  await Promise.all([
    prisma.apiToken.upsert({
      where: { platform: 'EBAY' },
      update: {
        accessToken: 'ebay_access_token_sample_123456789',
        refreshToken: 'ebay_refresh_token_sample_987654321',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      create: {
        platform: 'EBAY',
        accessToken: 'ebay_access_token_sample_123456789',
        refreshToken: 'ebay_refresh_token_sample_987654321',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    }),
    prisma.apiToken.upsert({
      where: { platform: 'WALMART' },
      update: {
        accessToken: 'walmart_access_token_sample_abcdef123',
        refreshToken: 'walmart_refresh_token_sample_fedcba321',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      create: {
        platform: 'WALMART',
        accessToken: 'walmart_access_token_sample_abcdef123',
        refreshToken: 'walmart_refresh_token_sample_fedcba321',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    }),
    prisma.apiToken.upsert({
      where: { platform: 'SHEIN' },
      update: {
        accessToken: 'shein_access_token_sample_xyz789',
        refreshToken: 'shein_refresh_token_sample_789xyz',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      },
      create: {
        platform: 'SHEIN',
        accessToken: 'shein_access_token_sample_xyz789',
        refreshToken: 'shein_refresh_token_sample_789xyz',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      }
    })
  ]);

  // Create External Platform Orders
  console.log('🏪 Creating external platform orders...');
  await Promise.all([
    prisma.ebayOrder.create({
      data: {
        orderId: 'EBAY_ORD_12345678901',
        status: 'Completed',
        orderCreationDate: new Date('2024-06-15T10:30:00Z')
      }
    }),
    prisma.walmartOrder.create({
      data: {
        orderId: 'WM_ORD_98765432101',
        orderCreationDate: new Date('2024-06-20T14:45:00Z')
      }
    }),
    prisma.sheinOrder.create({
      data: {
        orderId: 'SHEIN_ORD_555666777888',
        status: 'Pending',
        orderCreationDate: new Date('2024-06-25T09:15:00Z')
      }
    })
  ]);

  console.log('✅ Database seeding completed successfully!');
  console.log(`
📊 Seeded data summary:
- ${sizes.length} sizes
- 3 parent categories with subcategories
- 3 users (SuperAdmin, PlatformUser, WareHouse)
- ${products.length} products
- 2 orders with order details
- 2 transactions
- 3 API tokens
- 3 external platform orders
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Prisma client disconnected.');
  });