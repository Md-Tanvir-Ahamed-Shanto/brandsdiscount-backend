const { PrismaClient } = require("@prisma/client");
const { deleteCloudflareImage } = require("../utils/imageUpload");
const {
  createEbayProduct,
  createEbayProduct2,
  createEbayProduct3,
} = require("../services/ebayCreateProduct");

const { updateStockBySku } = require("../services/wooComService");
const {
  ebayUpdateStock,
  ebayUpdateStock2,
  ebayUpdateStock3,
} = require("../services/ebayUpdateStock");

const prisma = new PrismaClient();

// Helper function to build category relations for Prisma includes
const getCategoryInclude = (type) => ({
  select: {
    id: true,
    name: true, // Assuming your Category model has a 'name' field
  },
});


const getProducts = async (req, res) => {
  try {
    const {
      searchTerm,
      category,
      brand,
      status,
      itemLocationFilter,
      page = 1,
      pageSize = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    let where = {};

    // Search term filter
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { sku: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { brandName: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Category filter (assuming category format: "Parent > Sub > Type")
    if (category) {
      const categoryParts = category.split(" > ").map((part) => part.trim());
      if (categoryParts.length === 3) {
        where.AND = [
          { parentCategory: { name: categoryParts[0] } },
          { subCategory: { name: categoryParts[1] } },
          { category: { name: categoryParts[2] } },
        ];
      } else if (categoryParts.length === 2) {
        where.AND = [
          { parentCategory: { name: categoryParts[0] } },
          { subCategory: { name: categoryParts[1] } },
        ];
      } else if (categoryParts.length === 1) {
        where.OR = [
          { parentCategory: { name: categoryParts[0] } },
          { subCategory: { name: categoryParts[0] } },
          { category: { name: categoryParts[0] } },
        ];
      }
    }

    // Brand filter
    if (brand) {
      where.brandName = brand;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Item Location filter
    if (itemLocationFilter) {
      where.itemLocation = {
        contains: itemLocationFilter,
        mode: "insensitive",
      };
    }

    const products = await prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        category: getCategoryInclude("category"),
        subCategory: getCategoryInclude("subCategory"),
        parentCategory: getCategoryInclude("parentCategory"),
        // variants: true, // Include variants
      },
    });

    const totalProducts = await prisma.product.count({ where });

    // Manually add `imageUrl`, `name`, `hasTenDollarOffer`, `offerPrice`, `quantity`, `listedOn` based on client-side logic
    const productsWithClientSideProps = products.map((product) => {
      // Assuming images[0] is the primary image URL.
      // Images field is `Json[]`, so each element might be `{ url: '...', id: '...' }` or just a string.
      const imageUrl =
        product.images && product.images.length > 0
          ? typeof product.images[0] === "object"
            ? product.images[0].url // If it's an object with a 'url' property
            : product.images[0] // If it's directly a string URL
          : null;

      // Assuming 'name' is derived from 'title' for display
      const name = product.title;
      // Assuming `hasTenDollarOffer` corresponds to `toggleFirstDeal`
      const hasTenDollarOffer = product.toggleFirstDeal;
      // Assuming `offerPrice` is calculated from `regularPrice` and discount if applicable
      const offerPrice = product.salePrice || product.regularPrice; // Use salePrice if available, otherwise regularPrice

      // Quantity can be either the main product's stockQuantity or calculated from variants
      const quantity =
        product.variants && product.variants.length > 0
          ? product.variants.reduce((sum, variant) => sum + variant.quantity, 0)
          : product.stockQuantity;


      return {
        ...product,
        imageUrl,
        name,
        hasTenDollarOffer,
        offerPrice,
        quantity,
      };
    });

    res.status(200).json({
      products: productsWithClientSideProps,
      totalPages: Math.ceil(totalProducts / pageSize),
      currentPage: parseInt(page),
      totalItems: totalProducts,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        // size: true, // Your schema doesn't have a 'size' model, sizeId is a string
        category: true,
        subCategory: true,
        parentCategory: true,
        variants: true, // Include variants here as well for detailed view
      },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch product", error: error.message });
  }
};





const createProduct = async (req, res) => {
  try {
    // 1. Parse data from FormData (productData and variants come as JSON strings)
    const productData = JSON.parse(req.body.productData);
    const variants = JSON.parse(req.body.variants || "[]"); // Ensure variants is an array, default to empty

    // req.uploadedImageUrls is populated by your image upload middleware
    const uploadedImageUrls = req.uploadedImageUrls || [];

    // 2. Destructure fields from parsed productData
    const {
      title,
      brandName,
      color,
      sku,
      itemLocation,
      sizeId, // Note: your schema has sizeId, sizeType, sizes, but not a separate 'size' model
      sizeType,
      sizes,
      categoryId,
      subCategoryId,
      parentCategoryId,
      regularPrice,
      salePrice,
      toggleFirstDeal,
      stockQuantity,
      condition,
      description,
      status,
      // New eBay flags from frontend
      ebayOne,
      ebayTwo,
      ebayThree,
    } = productData;

    // Basic validation
    if (!title || !sku) {
      return res.status(400).json({
        success: false,
        message: "Title and SKU are required fields.",
      });
    }

    // 3. Prepare data for main Product creation
    const createProductInput = {
      title,
      sku: sku.toUpperCase(), // Ensure SKU is uppercase as per your previous logic
      images: uploadedImageUrls, // Array of { url: "...", id: "..." } objects
      brandName: brandName || null,
      color: color || null,
      itemLocation: itemLocation || null,
      sizeId: sizeId || null,
      sizeType: sizeType || null,
      sizes: sizes || null,
      // Categories will be connected via `connect` in the Prisma create call
      regularPrice: parseFloat(regularPrice) || null, // Allow null if empty string
      salePrice: parseFloat(salePrice) || null, // Allow null if empty string
      toggleFirstDeal: toggleFirstDeal ?? true, // Use nullish coalescing for booleans
      stockQuantity: parseInt(stockQuantity) || null, // Allow null if empty string
      condition: condition || "New",
      status: status || "Draft",
      description: description || null,
      // New eBay flags
      ebayOne: ebayOne ?? false,
      ebayTwo: ebayTwo ?? false,
      ebayThree: ebayThree ?? false,
      // updatedById: req.user.id || null, // Uncomment if you have user context
    };

    // 4. Create product and its variants in a transaction
    const newProduct = await prisma.$transaction(async (prisma) => {
      const product = await prisma.product.create({
        data: {
          ...createProductInput,
          // Handle category relations using connect
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          ...(subCategoryId && {
            subCategory: { connect: { id: subCategoryId } },
          }),
          ...(parentCategoryId && {
            parentCategory: { connect: { id: parentCategoryId } },
          }),
        },
      });

      // Create variants associated with the new product
      if (variants && variants.length > 0) {
        const productVariantsData = variants.map((v) => ({
          productId: product.id,
          color: v.color,
          sizeType: v.sizeType,
          customSize: v.customSize || null,
          quantity: parseInt(v.quantity),
          skuSuffix: v.skuSuffix || null,
          regularPrice: parseFloat(v.regularPrice),
          salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
        }));
        await prisma.productVariant.createMany({
          data: productVariantsData,
        });
      }

      // 5. Conditionally call eBay creation services ONLY if status is 'Active'
      const eBayResponses = {};
      if (status === "Active") {
        const eBayProductForService = {
          title: product.title,
          brandName: product.brandName,
          images: product.images, // Use the URLs from the created product
          sku: product.sku,
          regularPrice: product.regularPrice,
          stockQuantity: product.stockQuantity,
          description: product.description,
          categoryId: categoryId, // Pass the ID, not the object
          size: product.sizeId || "N/A", // Use product's sizeId if you want
          sizeType: product.sizeType || "Regular",
          color: product.color || "N/A",
         
        };

        // Use Promise.allSettled to allow some eBay calls to fail without stopping others
        const ebayPromises = [];
        if (ebayOne) {
          ebayPromises.push(
            createEbayProduct(eBayProductForService)
              .then((res) => ({
                platform: "eBayOne",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayOne",
                status: "rejected",
                reason: err,
              }))
          );
        }
        if (ebayTwo) {
          ebayPromises.push(
            createEbayProduct2(eBayProductForService)
              .then((res) => ({
                platform: "eBayTwo",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayTwo",
                status: "rejected",
                reason: err,
              }))
          );
        }
        if (ebayThree) {
          ebayPromises.push(
            createEbayProduct3(eBayProductForService)
              .then((res) => ({
                platform: "eBayThree",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayThree",
                status: "rejected",
                reason: err,
              }))
          );
        }

        const results = await Promise.allSettled(ebayPromises);

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            eBayResponses[result.value.platform] = result.value.value;
          } else {
            console.error(
              `Error listing on ${result.reason.platform}:`,
              result.reason.reason
            );
            eBayResponses[result.reason.platform] = {
              error: result.reason.reason.message || "Failed to list",
            };
          }
        });
      }

      return { product, eBayResponses };
    });

    return res.status(201).json({
      success: true,
      message:
        "Product created and listing attempts initiated on eBay platforms.",
      product: newProduct.product,
      ebayListingResults: newProduct.eBayResponses,
    });
  } catch (error) {
    console.error("❌ Error during product creation or eBay listing:", error);
    // Handle Prisma unique constraint error specifically for SKU
    if (error.code === "P2002" && error.meta?.target?.includes("sku")) {
      return res.status(400).json({
        success: false,
        message:
          "A product with this SKU already exists. Please use a unique SKU.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create product or list on eBay",
      error: error?.message || "Unknown error",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // 1. Parse data from FormData (all relevant parts are JSON strings)
    const productData = JSON.parse(req.body.productData);
    const variants = JSON.parse(req.body.variants || "[]");
    const existingImages = JSON.parse(req.body.existingImages || "[]"); // Images kept by frontend
    const newImageFiles = req.files || []; // New image files uploaded via Multer

    // `req.uploadedImageUrls` will contain the URLs for the `newImageFiles` after your upload middleware runs.
    const uploadedImageUrls = req.uploadedImageUrls || [];

    // Combine existing images (that frontend wanted to keep) with newly uploaded images
    const allImagesForProduct = [...existingImages, ...uploadedImageUrls];

    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true }, // Also fetch existing variants for comparison
    });

    if (!currentProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    // Identify images to delete from Cloudflare
    const oldCloudflareImageIds = currentProduct.images
      .filter((img) => img.id) // Filter for objects with an 'id' (Cloudflare IDs)
      .map((img) => img.id);

    const newCloudflareImageIds = allImagesForProduct
      .filter((img) => img.id)
      .map((img) => img.id);

    const imageIdsToDelete = oldCloudflareImageIds.filter(
      (id) => !newCloudflareImageIds.includes(id)
    );

    // Execute deletions (consider doing this asynchronously or in a background job)
    for (const imageId of imageIdsToDelete) {
      console.log(`Deleting image from Cloudflare: ${imageId}`);
      await deleteCloudflareImage(imageId).catch((deleteError) => {
        console.error(
          `Failed to delete Cloudflare image ${imageId}:`,
          deleteError.message
        );
      });
    }

    // 2. Destructure updated fields from parsed productData
    const {
      title,
      brandName,
      color,
      sku,
      itemLocation,
      sizeId,
      sizeType,
      sizes,
      categoryId,
      subCategoryId,
      parentCategoryId,
      regularPrice,
      salePrice,
      toggleFirstDeal,
      stockQuantity,
      condition,
      description,
      status, // Get the new status
      // New eBay flags from frontend
      ebayOne,
      ebayTwo,
      ebayThree,
    } = productData;

    // Basic validation
    if (!title || !sku) {
      return res.status(400).json({
        success: false,
        message: "Title and SKU are required fields.",
      });
    }

    // 3. Prepare data for main Product update
    const updateProductInput = {
      title,
      sku: sku.toUpperCase(), // Ensure SKU is uppercase
      images: allImagesForProduct, // Updated array of image objects
      brandName: brandName || null,
      color: color || null,
      itemLocation: itemLocation || null,
      sizeId: sizeId || null,
      sizeType: sizeType || null,
      sizes: sizes || null,
      regularPrice: parseFloat(regularPrice) || null,
      salePrice: parseFloat(salePrice) || null,
      toggleFirstDeal: toggleFirstDeal ?? true,
      stockQuantity: parseInt(stockQuantity) || null,
      condition: condition || "New",
      status: status || "Draft",
      description: description || null,
      // New eBay flags
      ebayOne: ebayOne ?? false,
      ebayTwo: ebayTwo ?? false,
      ebayThree: ebayThree ?? false,
      // updatedById: req.user.id || null, // Uncomment if you have user context
    };

    // Store the old status to compare later
    const oldStatus = currentProduct.status;
    const newStatus = status;

    // 4. Update product and its variants in a transaction
    const updatedProduct = await prisma.$transaction(async (prisma) => {
      // --- Handle Variants ---
      const existingVariantIds = new Set(
        currentProduct.variants.map((v) => v.id)
      );
      const variantsToCreate = [];
      const variantsToUpdate = [];
      const variantIdsToKeep = new Set();

      variants.forEach((v) => {
        if (v.id && existingVariantIds.has(v.id)) {
          // Existing variant, mark for update
          variantsToUpdate.push({
            id: v.id,
            data: {
              color: v.color,
              sizeType: v.sizeType,
              customSize: v.customSize || null,
              quantity: parseInt(v.quantity),
              skuSuffix: v.skuSuffix || null,
              regularPrice: parseFloat(v.regularPrice),
              salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
            },
          });
          variantIdsToKeep.add(v.id);
        } else {
          // New variant, mark for creation
          variantsToCreate.push({
            productId: productId, // Associate with current product
            color: v.color,
            sizeType: v.sizeType,
            customSize: v.customSize || null,
            quantity: parseInt(v.quantity),
            skuSuffix: v.skuSuffix || null,
            regularPrice: parseFloat(v.regularPrice),
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
          });
        }
      });

      // Determine variants to delete (those in DB but not in the incoming 'variants' array)
      const variantsToDeleteIds = currentProduct.variants
        .filter((existingV) => !variantIdsToKeep.has(existingV.id))
        .map((existingV) => existingV.id);

      // Perform variant operations
      if (variantsToCreate.length > 0) {
        await prisma.productVariant.createMany({
          data: variantsToCreate,
        });
      }

      for (const variantUpdate of variantsToUpdate) {
        await prisma.productVariant.update({
          where: { id: variantUpdate.id },
          data: variantUpdate.data,
        });
      }

      if (variantsToDeleteIds.length > 0) {
        await prisma.productVariant.deleteMany({
          where: { id: { in: variantsToDeleteIds } },
        });
      }

      // --- Update Main Product ---
      const product = await prisma.product.update({
        where: { id: productId },
        data: {
          ...updateProductInput,
          // Handle category relations (connect if ID exists, disconnect if ID is null)
          ...(categoryId
            ? { category: { connect: { id: categoryId } } }
            : { category: { disconnect: true } }),
          ...(subCategoryId
            ? { subCategory: { connect: { id: subCategoryId } } }
            : { subCategory: { disconnect: true } }),
          ...(parentCategoryId
            ? { parentCategory: { connect: { id: parentCategoryId } } }
            : { parentCategory: { disconnect: true } }),
        },
      });

      // 5. Conditionally call eBay services
      const eBayResponses = {};
      const eBayProductForService = {
        title: product.title,
        brandName: product.brandName,
        images: product.images, // Use the URLs from the updated product
        sku: product.sku,
        regularPrice: product.regularPrice,
        stockQuantity: product.stockQuantity,
        description: product.description,
        categoryId: product.categoryId,
        size: product.sizeId || "N/A",
        sizeType: product.sizeType || "Regular",
        color: product.color || "N/A",
      };

      const ebayPromises = [];

      // Logic for creating on eBay if status changes from Draft to Active
      if (oldStatus === "Draft" && newStatus === "Active") {
        if (ebayOne) {
          ebayPromises.push(
            createEbayProduct(eBayProductForService)
              .then((res) => ({
                platform: "eBayOne",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayOne",
                status: "rejected",
                reason: err,
              }))
          );
        }
        if (ebayTwo) {
          ebayPromises.push(
            createEbayProduct2(eBayProductForService)
              .then((res) => ({
                platform: "eBayTwo",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayTwo",
                status: "rejected",
                reason: err,
              }))
          );
        }
        if (ebayThree) {
          ebayPromises.push(
            createEbayProduct3(eBayProductForService)
              .then((res) => ({
                platform: "eBayThree",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayThree",
                status: "rejected",
                reason: err,
              }))
          );
        }
      } else if (newStatus === "Active") {
        // If already active or changing from active to active, use update functions
        if (ebayOne) {
          ebayPromises.push(
            ebayUpdateStock(
              eBayProductForService.sku,
              eBayProductForService.stockQuantity,
              eBayProductForService
            )
              .then((res) => ({
                platform: "eBayOne",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayOne",
                status: "rejected",
                reason: err,
              }))
          );
        }
        if (ebayTwo) {
          ebayPromises.push(
            ebayUpdateStock2(
              eBayProductForService.sku,
              eBayProductForService.stockQuantity,
              eBayProductForService
            )
              .then((res) => ({
                platform: "eBayTwo",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayTwo",
                status: "rejected",
                reason: err,
              }))
          );
        }
        if (ebayThree) {
          ebayPromises.push(
            ebayUpdateStock3(
              eBayProductForService.sku,
              eBayProductForService.stockQuantity,
              eBayProductForService
            )
              .then((res) => ({
                platform: "eBayThree",
                status: "fulfilled",
                value: res,
              }))
              .catch((err) => ({
                platform: "eBayThree",
                status: "rejected",
                reason: err,
              }))
          );
        }
      }
      // If status is 'Draft', no eBay operations are performed.

      const results = await Promise.allSettled(ebayPromises);

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          eBayResponses[result.value.platform] = result.value.value;
        } else {
          console.error(
            `Error processing ${result.reason.platform}:`,
            result.reason.reason
          );
          eBayResponses[result.reason.platform] = {
            error: result.reason.reason.message || "Failed to process on eBay",
          };
        }
      });

      return { product, eBayResponses };
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully and external platforms processed.",
      product: updatedProduct.product,
      ebayUpdateResults: updatedProduct.eBayResponses,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    if (error.code === "P2002" && error.meta?.target?.includes("sku")) {
      return res.status(400).json({
        success: false,
        message:
          "A product with this SKU already exists. Please use a unique SKU.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};





const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Before deleting product, you might want to consider:
    // 1. Deleting associated images from Cloudflare/storage
    // 2. Unlisting from eBay/WooCommerce etc.
    // 3. Deleting variants first (Prisma's onDelete cascade might handle this if configured)

    await prisma.product.delete({
      where: { id },
    });
    res.status(204).send(); // No content for successful deletion
  } catch (error) {
    console.error("Error deleting product:", error);
    res
      .status(500)
      .json({ message: "Failed to delete product", error: error.message });
  }
};

const updateProductStockQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { stockQuantity } = req.body; // This 'stockQuantity' might apply to the main product only

    if (typeof stockQuantity !== "number" || stockQuantity < 0) {
      return res
        .status(400)
        .json({ message: "Invalid stock quantity provided." });
    }

    // This function typically updates the main product's stockQuantity.
    // If you need to update a specific variant's quantity,
    // you'll need to modify this endpoint to accept `variantId` or `skuSuffix` and update `ProductVariant`.
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { stockQuantity },
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product stock quantity:", error);
    res.status(500).json({
      message: "Failed to update stock quantity",
      error: error.message,
    });
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { status },
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product status:", error);
    res.status(500).json({
      message: "Failed to update product status",
      error: error.message,
    });
  }
};

const toggleProductOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      select: { toggleFirstDeal: true },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { toggleFirstDeal: !product.toggleFirstDeal },
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error toggling product offer:", error);
    res.status(500).json({
      message: "Failed to toggle product offer",
      error: error.message,
    });
  }
};

const bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, action, value } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res
        .status(400)
        .json({ message: "No product IDs provided for bulk action." });
    }
    console.log("bulkUpdateProducts called with action:", action);
    let updateData = {};
    switch (action) {
      case "updateInventoryBulk":
        // This case would typically require an array of objects like [{ id: '...', stockQuantity: N }]
        // For simplicity, this assumes 'value' is an object mapping product ID to new quantity.
        // You'll need to adapt this based on how your frontend sends bulk quantity updates.
        // For a more robust solution, consider a transaction with multiple update operations.
        const updateOperations = productIds
          .map((id) => {
            if (value && typeof value[id] === "number") {
              return prisma.product.update({
                where: { id },
                data: { stockQuantity: value[id] },
              });
            }
            return null;
          })
          .filter(Boolean); // Remove nulls if some IDs don't have quantity in 'value'

        if (updateOperations.length > 0) {
          await prisma.$transaction(updateOperations);
        } else {
          return res
            .status(400)
            .json({ message: "Invalid data for bulk inventory update." });
        }
        break;
      case "setActive":
        updateData.status = "Active";
        break;
      case "setHidden":
        updateData.status = "Hidden";
        break;
      case "setDraft":
        updateData.status = "Draft";
        break;
      case "toggleOfferBulk":
        // This requires fetching current toggleFirstDeal for each product and then flipping it.
        // A direct `updateMany` can't do this conditionally for each record in one go.
        // So, we'll fetch and then update in a transaction.
        const productsToToggle = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, toggleFirstDeal: true },
        });

        const toggleUpdates = productsToToggle.map((product) =>
          prisma.product.update({
            where: { id: product.id },
            data: { toggleFirstDeal: !product.toggleFirstDeal },
          })
        );
        await prisma.$transaction(toggleUpdates);
        break;
      default:
        return res.status(400).json({ message: "Invalid bulk action." });
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: updateData,
      });
    }

    res.status(200).json({ message: "Bulk update successful." });
  } catch (error) {
    console.error("Error during bulk update:", error);
    res
      .status(500)
      .json({ message: "Failed to perform bulk update", error: error.message });
  }
};

const updateProductQuantities = async (req, res) => {
  const { data, sku, quantity } = req.body; // 'data' for bulk update, 'sku'/'quantity' for single

  if (!data && (!sku || typeof quantity === "undefined")) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid request body. Expected "data" array for bulk update or "sku" and "quantity" for single update.',
    });
  }

  if (data && (!Array.isArray(data) || data.length === 0)) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid "data" format for bulk update. Expected a non-empty array.',
    });
  }

  if (sku && typeof quantity === "undefined") {
    return res.status(400).json({
      success: false,
      message: 'For single update, "quantity" is required along with "sku".',
    });
  }

  const updatesToPerform = [];

  if (data) {
    for (const item of data) {
      if (
        !item.sku ||
        typeof item.quantity === "undefined" ||
        item.quantity < 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid item in bulk update: { sku: "${item.sku}", quantity: ${item.quantity} }. SKU and non-negative quantity are required.`,
        });
      }
      updatesToPerform.push(item);
    }
  } else {
    if (typeof quantity !== "number" || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid quantity for single update: ${quantity}. Must be a non-negative number.`,
      });
    }
    updatesToPerform.push({ sku, quantity });
  }

  const results = [];
  let allSuccessful = true;

  for (const update of updatesToPerform) {
    const { sku: currentSku, quantity: newQuantity } = update;
    try {
      const product = await prisma.product.findUnique({
        where: { sku: currentSku },
        select: {
          id: true,
          sku: true,
          stockQuantity: true,
          variants: { select: { id: true, quantity: true, skuSuffix: true } },
        },
      });

      if (!product) {
        allSuccessful = false;
        results.push({
          sku: currentSku,
          status: "failed",
          message: "Product not found.",
        });
        continue;
      }

      // Determine if the update applies to a main product quantity or a variant quantity
      // If the product has variants, assume quantity updates should apply to variants
      // You'll need more logic here if you want to specify WHICH variant is updated
      // For now, if variants exist, this logic updates the main product's stockQuantity only if no variants exist.
      // If variants exist, you'd need `item.variantId` or `item.variantSkuSuffix` to find the specific variant.

      let updatedRecord;
      if (product.variants && product.variants.length > 0) {
        // If the product has variants, you should typically update a specific variant's quantity.
        // This current `updateProductQuantities` function doesn't receive `variantId` or `variantSkuSuffix`.
        // For a robust solution, you'd modify the request body for this endpoint to specify the variant.
        // For now, I'll log a warning and skip if a specific variant isn't identified.
        console.warn(
          `Product ${currentSku} has variants. Skipping main product stock update as no specific variant was provided.`
        );
        allSuccessful = false;
        results.push({
          sku: currentSku,
          status: "failed",
          message:
            "Product has variants; specific variant ID or SKU suffix required for quantity update.",
        });
        continue;

        // Example if you *were* to receive variantSkuSuffix in `item`:
        // const targetVariant = product.variants.find(v => v.skuSuffix === item.variantSkuSuffix);
        // if (targetVariant) {
        //    await prisma.productVariant.update({
        //       where: { id: targetVariant.id },
        //       data: { quantity: parseInt(targetVariant.quantity - newQuantity) },
        //    });
        //    updatedRecord = targetVariant; // Or fetch updated variant
        // } else {
        //    // Handle variant not found
        // }
      } else {
        // No variants, update main product stock quantity
        const oldQuantity = product.stockQuantity;
        await prisma.product.update({
          where: { sku: currentSku },
          data: { stockQuantity: parseInt(oldQuantity - newQuantity) },
        });
        updatedRecord = {
          sku: currentSku,
          oldQuantity: oldQuantity,
          newQuantity: oldQuantity - newQuantity,
        };
      }

      if (updatedRecord) {
        // Only proceed if an update happened (either product or variant)
        const stock_quantity_for_external = updatedRecord.newQuantity; // Or sum of all variant quantities

        // Consider which eBay and WooCommerce stock updates to call based on the product's flags
        const currentProductDetails = await prisma.product.findUnique({
          where: { id: product.id },
          select: { ebayOne: true, ebayTwo: true, ebayThree: true },
        });

        const syncPromises = [];
        if (currentProductDetails.ebayOne) {
          syncPromises.push(
            ebayUpdateStock(currentSku, stock_quantity_for_external)
          );
        }
        if (currentProductDetails.ebayTwo) {
          syncPromises.push(
            ebayUpdateStock2(currentSku, stock_quantity_for_external)
          );
        }
        if (currentProductDetails.ebayThree) {
          syncPromises.push(
            ebayUpdateStock3(currentSku, stock_quantity_for_external)
          );
        }
        // Always try to update WooCommerce if applicable
        syncPromises.push(
          updateStockBySku(currentSku, stock_quantity_for_external)
        );

        try {
          await Promise.allSettled(syncPromises);
          console.log(
            "All order syncs initiated after product quantity updates."
          );
        } catch (syncError) {
          console.error("Error during external order syncs:", syncError);
          // Do not fail the entire response, but mark this item as failed in results
          allSuccessful = false;
          results.push({
            sku: currentSku,
            status: "failed",
            message:
              "Failed to sync with external platforms after quantity update.",
          });
          continue; // Skip to next item if sync failed
        }

        results.push({
          sku: currentSku,
          status: "success",
          oldQuantity: updatedRecord.oldQuantity,
          newQuantity: updatedRecord.newQuantity,
        });
      }
    } catch (error) {
      allSuccessful = false;
      console.error(`Error updating product ${currentSku}:`, error);
      results.push({
        sku: currentSku,
        status: "failed",
        message: error.message || "Internal server error.",
      });
    }
  }

  if (allSuccessful && results.length > 0) {
    return res.status(200).json({
      success: true,
      message: `${updatesToPerform.length} product(s) updated successfully.`,
      results,
    });
  } else if (results.length === 0) {
    return res
      .status(200)
      .json({ success: true, message: "No products provided for update." });
  } else {
    return res.status(207).json({
      success: false,
      message: "Some products failed to update. Check results for details.",
      results,
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStockQuantity,
  updateProductStatus,
  toggleProductOffer,
  bulkUpdateProducts,
  updateProductQuantities,
};
