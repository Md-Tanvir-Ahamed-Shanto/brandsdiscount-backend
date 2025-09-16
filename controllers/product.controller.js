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

    // Item Location filter - UPDATED FOR EXACT MATCHING
    if (itemLocationFilter) {
      where.itemLocation = {
        equals: itemLocationFilter,
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
        variants: true, // Include variants
        changeHistory: {
          orderBy: { changedAt: "asc" }, // ✅ sort oldest → newest
        },
      },
    });

    const totalProducts = await prisma.product.count({ where });

    const productsWithClientSideProps = products.map((product) => {
     
      const imageUrl =
        product.images && product.images.length > 0
          ? typeof product.images[0] === "object"
            ? product.images[0].url // If it's an object with a 'url' property
            : product.images[0] // If it's directly a string URL
          : null;

      const name = product.title;
      const hasTenDollarOffer = product.toggleFirstDeal;
      const offerPrice = product.salePrice || product.regularPrice; // Use salePrice if available, otherwise regularPrice

      const quantity =
        product.variants && product.variants.length > 0
          ? product.variants.reduce(
              (sum, variant) => sum + variant.stockQuantity,
              0
            )
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
        variants: true,
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



const getAvailableProducts = async (req, res) => {
  try {
    const {
      searchTerm,
      category,
      brand,
      priceMin,
      priceMax,
      sizeType,
      sortPrice,
      page = 1,
      pageSize = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    let where = {
      isPublished: true,
      salePrice: { not: null },
      status: { not: "draft" },
      OR: [
        { stockQuantity: { gt: 0 } },
        {
          variants: {
            some: {
              stockQuantity: { gt: 0 },
            },
          },
        },
      ],
    };

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      
      // Determine search type - be very specific
      const isWomenSearch = lowerSearchTerm === "women" || lowerSearchTerm === "woman";
      const isMenSearch = (lowerSearchTerm === "men" || lowerSearchTerm === "man") && !isWomenSearch;
      const isKidsSearch = lowerSearchTerm === "kids" || lowerSearchTerm === "kid";

      if (isWomenSearch) {
        console.log('Searching for WOMEN products only');
        
        // Find womens parent category by exact name match
        const womensCategory = await prisma.category.findFirst({
          where: {
            AND: [
              { parentCategoryId: null },
              { 
                OR: [
                  { name: { equals: "womens" } },
                  { name: { equals: "Womens" } },
                  { name: { equals: "WOMENS" } },
                  { name: { equals: "women" } },
                  { name: { equals: "Women" } },
                  { name: { equals: "WOMEN" } }
                ]
              }
            ]
          }
        });

        if (womensCategory) {
          console.log('Found womens category:', womensCategory);
          where.AND = where.AND ? [...where.AND, {
            parentCategory: { id: womensCategory.id }
          }] : [{
            parentCategory: { id: womensCategory.id }
          }];
        } else {
          console.log('No womens category found');
          // If no category found, return empty results for women search
          where.AND = where.AND ? [...where.AND, { id: "non-existent-id" }] : [{ id: "non-existent-id" }];
        }

      } else if (isMenSearch) {
        console.log('Searching for MEN products only');
        
        // Find mens parent category by exact name match
        const mensCategory = await prisma.category.findFirst({
          where: {
            AND: [
              { parentCategoryId: null },
              { 
                OR: [
                  { name: { equals: "mens" } },
                  { name: { equals: "Mens" } },
                  { name: { equals: "MENS" } },
                  { name: { equals: "men" } },
                  { name: { equals: "Men" } },
                  { name: { equals: "MEN" } }
                ]
              }
            ]
          }
        });

        if (mensCategory) {
          console.log('Found mens category:', mensCategory);
          where.AND = where.AND ? [...where.AND, {
            parentCategory: { id: mensCategory.id }
          }] : [{
            parentCategory: { id: mensCategory.id }
          }];
        } else {
          console.log('No mens category found');
          // If no category found, return empty results for men search
          where.AND = where.AND ? [...where.AND, { id: "non-existent-id" }] : [{ id: "non-existent-id" }];
        }

      } else if (isKidsSearch) {
        console.log('Searching for KIDS products only');
        
        // Find kids parent category by exact name match
        const kidsCategory = await prisma.category.findFirst({
          where: {
            AND: [
              { parentCategoryId: null },
              { 
                OR: [
                  { name: { equals: "kids" } },
                  { name: { equals: "Kids" } },
                  { name: { equals: "KIDS" } },
                  { name: { equals: "children" } },
                  { name: { equals: "Children" } },
                  { name: { equals: "CHILDREN" } }
                ]
              }
            ]
          }
        });

        if (kidsCategory) {
          console.log('Found kids category:', kidsCategory);
          where.AND = where.AND ? [...where.AND, {
            parentCategory: { id: kidsCategory.id }
          }] : [{
            parentCategory: { id: kidsCategory.id }
          }];
        } else {
          console.log('No kids category found');
          // If no category found, return empty results for kids search
          where.AND = where.AND ? [...where.AND, { id: "non-existent-id" }] : [{ id: "non-existent-id" }];
        }

      } else {
        console.log('General search for term:', searchTerm);
        // General search in product fields for other terms
        const searchVariations = [
          searchTerm,
          searchTerm.toLowerCase(),
          searchTerm.toUpperCase(),
          searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase()
        ];

        let searchConditions = {
          OR: searchVariations.flatMap(term => [
            { title: { contains: term } },
            { sku: { contains: term } },
            { description: { contains: term } },
            { brandName: { contains: term } },
          ]),
        };

        where.AND = where.AND ? [...where.AND, searchConditions] : [searchConditions];
      }
    }

    // Category filter (existing logic)
    if (category) {
      const categoryParts = category.split(" > ").map((part) => part.trim());
      if (categoryParts.length === 3) {
        where.AND = where.AND
          ? [
              ...where.AND,
              { parentCategory: { name: categoryParts[0] } },
              { subCategory: { name: categoryParts[1] } },
              { category: { name: categoryParts[2] } },
            ]
          : [
              { parentCategory: { name: categoryParts[0] } },
              { subCategory: { name: categoryParts[1] } },
              { category: { name: categoryParts[2] } },
            ];
      } else if (categoryParts.length === 2) {
        where.AND = where.AND
          ? [
              ...where.AND,
              { parentCategory: { name: categoryParts[0] } },
              { subCategory: { name: categoryParts[1] } },
            ]
          : [
              { parentCategory: { name: categoryParts[0] } },
              { subCategory: { name: categoryParts[1] } },
            ];
      } else if (categoryParts.length === 1) {
        const categoryOr = {
          OR: [
            { parentCategory: { name: categoryParts[0] } },
            { subCategory: { name: categoryParts[0] } },
            { category: { name: categoryParts[0] } },
          ],
        };
        where.AND = where.AND ? [...where.AND, categoryOr] : [categoryOr];
      }
    }

    // Brand filter
    if (brand) {
      where.AND = where.AND
        ? [...where.AND, { brandName: brand }]
        : [{ brandName: brand }];
    }

    // SizeType filter
    if (sizeType) {
      const sizeArray = sizeType.split(",").map((s) => s.trim());
      where.AND = where.AND
        ? [...where.AND, { sizeType: { in: sizeArray } }]
        : [{ sizeType: { in: sizeArray } }];
    }

    // Price range filter
    if (priceMin || priceMax) {
      const priceFilter = {};
      if (priceMin) priceFilter.gte = parseFloat(priceMin);
      if (priceMax) priceFilter.lte = parseFloat(priceMax);
      where.AND = where.AND
        ? [...where.AND, { salePrice: priceFilter }]
        : [{ salePrice: priceFilter }];
    }

    // Sorting
    let orderBy = { [sortBy]: sortOrder };
    if (sortPrice) {
      if (sortPrice === "lowToHigh") {
        orderBy = { salePrice: "asc" };
      } else if (sortPrice === "highToLow") {
        orderBy = { salePrice: "desc" };
      }
    }

    console.log('Final where condition:', JSON.stringify(where, null, 2));

    const products = await prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        category: true,
        subCategory: true,
        parentCategory: true,
        variants: true,
      },
    });

    const totalProducts = await prisma.product.count({ where });

    // Add client-side props
    const productsWithClientSideProps = products.map((product) => {
      const imageUrl =
        product.images && product.images.length > 0
          ? typeof product.images[0] === "object"
            ? product.images[0].url
            : product.images[0]
          : null;
      const name = product.title;
      const hasTenDollarOffer = product.toggleFirstDeal;
      const offerPrice = product.salePrice || product.regularPrice;
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
    console.error("Error fetching available products:", error);
    res.status(500).json({
      message: "Failed to fetch available products",
      error: error.message,
    });
  }
};




const createProduct = async (req, res) => {
  try {
    const productData = JSON.parse(req.body.productData);
    const variants = JSON.parse(req.body.variants || "[]");
    const uploadedImageUrls = req.uploadedImageUrls || [];
    const uploadedVariantUrls = req.uploadedVariantUrls || [];

    const {
      title,
      brandName,
      color,
      sku,
      itemLocation,
      notes,
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
      status,
      isPublished,
      ebayOne,
      ebayTwo,
      ebayThree,
    } = productData;

    if (!title || !sku) {
      return res.status(400).json({
        success: false,
        message: "Title and SKU are required fields.",
      });
    }

    const createProductInput = {
      title,
      sku: sku.toUpperCase(),
      images: uploadedImageUrls,
      brandName: brandName || null,
      color: color || null,
      itemLocation: itemLocation || null,
      notes: notes || null,
      sizeId: sizeId || null,
      sizeType: sizeType || null,
      sizes: sizes || null,
      regularPrice: parseFloat(regularPrice) || null,
      salePrice: parseFloat(salePrice) || null,
      toggleFirstDeal: toggleFirstDeal ?? true,
      stockQuantity: stockQuantity,
      condition: condition || "New",
      status: status || "Draft",
      isPublished: isPublished ?? true,
      description: description || null,
      ebayOne: ebayOne ?? false,
      ebayTwo: ebayTwo ?? false,
      ebayThree: ebayThree ?? false,
    };

    let newProduct;
    try {
      // ✅ Transaction only for DB operations
      newProduct = await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            ...createProductInput,
            ...(categoryId && { category: { connect: { id: categoryId } } }),
            ...(subCategoryId && {
              subCategory: { connect: { id: subCategoryId } },
            }),
            ...(parentCategoryId && {
              parentCategory: { connect: { id: parentCategoryId } },
            }),
          },
        });

        // ✅ Create initial history record
        await tx.productChangeHistory.create({
          data: {
            productId: product.id,
            newItemLocation: product.itemLocation,
            newNotes: product.notes, // or separate notes field
          },
        });

        if (variants?.length > 0) {
          const productVariantsData = variants.map((v, index) => ({
            productId: product.id,
            color: v.color,
            sizeType: v.sizeType,
            sizes: v.sizes || null,
            stockQuantity: v.stockQuantity ?? 0,
            skuSuffix: v.skuSuffix || null,
            regularPrice: parseFloat(v.regularPrice),
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
            images: uploadedVariantUrls[index]
              ? [uploadedVariantUrls[index]]
              : [],
          }));

          await tx.productVariant.createMany({
            data: productVariantsData,
          });
        }

        return product;
      });
    } catch (dbError) {
      if (dbError.code === "P2002" && dbError.meta?.target?.includes("sku")) {
        return res.status(400).json({
          success: false,
          message:
            "A product with this SKU already exists. Please use a unique SKU.",
        });
      }
      throw dbError;
    }

    // ✅ eBay API calls AFTER DB transaction is committed
    const eBayResponses = {};
    if (status === "Active") {
      // Get eBay category ID from mapping file
      let ebayCategoryId = "53159"; // Default category ID if mapping not found
      
      try {
        const categoryMapping = require('../categoryMaping.json');
        
        // Find the category in the mapping
        const findCategoryInMapping = () => {
          // Check in women's categories
          for (const [section, categories] of Object.entries(categoryMapping.womens_categories || {})) {
            for (const category of categories) {
              if (category.website_category_id === categoryId || 
                  category.website_category_id === subCategoryId || 
                  category.website_category_id === parentCategoryId) {
                return category.ebay_category.id || "53159";
              }
            }
          }
          
          // Check in men's categories
          for (const [section, categories] of Object.entries(categoryMapping.mens_categories || {})) {
            for (const category of categories) {
              if (category.website_category_id === categoryId || 
                  category.website_category_id === subCategoryId || 
                  category.website_category_id === parentCategoryId) {
                return category.ebay_category.id || "53159";
              }
            }
          }
          
          // Check in kids' categories
          for (const [section, categories] of Object.entries(categoryMapping.kids_categories || {})) {
            for (const category of categories) {
              if (category.website_category_id === categoryId || 
                  category.website_category_id === subCategoryId || 
                  category.website_category_id === parentCategoryId) {
                return category.ebay_category.id || "53159";
              }
            }
          }
          
          // Check in general categories
          for (const category of categoryMapping.general_categories || []) {
            if (category.website_category_id === categoryId || 
                category.website_category_id === subCategoryId || 
                category.website_category_id === parentCategoryId) {
              return category.ebay_category.id || "53159";
            }
          }
          
          return "53159"; // Default if not found
        };
        
        ebayCategoryId = findCategoryInMapping();
      } catch (error) {
        console.error("Error finding eBay category ID:", error);
      }
      
      const eBayProductForService = {
        title: newProduct.title,
        brandName: newProduct.brandName,
        images: newProduct.images,
        sku: newProduct.sku,
        regularPrice: newProduct.regularPrice,
        stockQuantity: newProduct.stockQuantity,
        description: newProduct.description,
        categoryId: ebayCategoryId, // Use the mapped eBay category ID
        size: newProduct.sizeId || "N/A",
        sizeType: newProduct.sizeType || "Regular",
        color: newProduct.color || "N/A",
      };

      const ebayPromises = [];

      if (ebayOne) {
        ebayPromises.push(
          createEbayProduct(eBayProductForService)
            .then((res) => ({ platform: "eBayOne", value: res }))
            .catch((err) => ({ platform: "eBayOne", error: err.message }))
        );
      }
      if (ebayTwo) {
        ebayPromises.push(
          createEbayProduct2(eBayProductForService)
            .then((res) => ({ platform: "eBayTwo", value: res }))
            .catch((err) => ({ platform: "eBayTwo", error: err.message }))
        );
      }
      if (ebayThree) {
        ebayPromises.push(
          createEbayProduct3(eBayProductForService)
            .then((res) => ({ platform: "eBayThree", value: res }))
            .catch((err) => ({ platform: "eBayThree", error: err.message }))
        );
      }

      const results = await Promise.all(ebayPromises);

      results.forEach((r) => {
        eBayResponses[r.platform] = r.error ? { error: r.error } : r.value;
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully and eBay listing attempts completed.",
      product: newProduct,
      ebayListingResults: eBayResponses,
    });
  } catch (error) {
    console.error("❌ product creation error:", error);
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

    const productData = JSON.parse(req.body.productData);
    const variants = JSON.parse(req.body.variants || "[]");
    const existingImages = JSON.parse(req.body.existingImages || "[]");
    const uploadedImageUrls = req.uploadedImageUrls || [];
    const uploadedVariantUrls = req.uploadedVariantUrls || [];
    const allImagesForProduct = [...existingImages, ...uploadedImageUrls];

    // Fetch current product
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const {
      title,
      brandName,
      color,
      sku,
      itemLocation,
      notes, // ✅ make sure we accept notes from productData
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
      status,
      isPublished,
      ebayOne,
      ebayTwo,
      ebayThree,
    } = productData;

    if (!title || !sku) {
      return res.status(400).json({
        success: false,
        message: "Title and SKU are required fields.",
      });
    }

    const updateProductInput = {
      title,
      sku: sku.toUpperCase(),
      images: allImagesForProduct,
      brandName: brandName || null,
      color: color || null,
      itemLocation: itemLocation || null,
      notes: notes || null, // ✅ store notes
      sizeId: sizeId || null,
      sizeType: sizeType || null,
      sizes: sizes || null,
      regularPrice: parseFloat(regularPrice) || null,
      salePrice: parseFloat(salePrice) || null,
      toggleFirstDeal: toggleFirstDeal ?? true,
      stockQuantity: parseInt(stockQuantity) || 0,
      condition: condition || "New",
      status: status || "Draft",
      isPublished: isPublished ?? true,
      description: description || null,
      ebayOne: ebayOne ?? false,
      ebayTwo: ebayTwo ?? false,
      ebayThree: ebayThree ?? false,
    };

    const oldStatus = currentProduct.status;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // ✅ 1. Track itemLocation & notes changes in history
      if (
        (itemLocation && itemLocation !== currentProduct.itemLocation) ||
        (notes && notes !== currentProduct.notes)
      ) {
        await tx.productChangeHistory.create({
          data: {
            productId,
            oldItemLocation: currentProduct.itemLocation,
            newItemLocation: itemLocation || currentProduct.itemLocation,
            oldNotes: currentProduct.notes,
            newNotes: notes || currentProduct.notes,
          },
        });
      }

      // ✅ 2. Handle variants create/update/delete logic (unchanged from your code)
      const existingVariantIds = new Set(
        currentProduct.variants.map((v) => v.id)
      );
      const variantIdsToKeep = new Set();
      const variantsToCreate = [];
      const variantsToUpdate = [];

      variants.forEach((v, idx) => {
        const variantImages = v.images?.length
          ? v.images
          : uploadedVariantUrls[idx] || [];

        if (v.id && existingVariantIds.has(v.id)) {
          variantsToUpdate.push({
            id: v.id,
            data: {
              color: v.color,
              sizeType: v.sizeType,
              sizes: v.sizes || null,
              stockQuantity: parseInt(v.stockQuantity) || 0,
              skuSuffix: v.skuSuffix || null,
              regularPrice: parseFloat(v.regularPrice) || 0,
              salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
              images: variantImages,
            },
          });
          variantIdsToKeep.add(v.id);
        } else {
          variantsToCreate.push({
            productId,
            color: v.color,
            sizeType: v.sizeType,
            sizes: v.customSize || null,
            stockQuantity: parseInt(v.quantity) || 0,
            skuSuffix: v.skuSuffix || null,
            regularPrice: parseFloat(v.regularPrice) || 0,
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
            images: variantImages,
          });
        }
      });

      const variantsToDeleteIds = currentProduct.variants
        .filter((v) => !variantIdsToKeep.has(v.id))
        .map((v) => v.id);

      if (variantsToCreate.length > 0) {
        await tx.productVariant.createMany({ data: variantsToCreate });
      }
      for (const v of variantsToUpdate) {
        await tx.productVariant.update({ where: { id: v.id }, data: v.data });
      }
      if (variantsToDeleteIds.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: variantsToDeleteIds } },
        });
      }

      // ✅ 3. Update main product
      // Ensure ebay flags can be toggled back to false
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          ...updateProductInput,
          // Explicitly set ebay flags to ensure they can be toggled off
          ebayOne: ebayOne === false ? false : (ebayOne || currentProduct.ebayOne),
          ebayTwo: ebayTwo === false ? false : (ebayTwo || currentProduct.ebayTwo),
          ebayThree: ebayThree === false ? false : (ebayThree || currentProduct.ebayThree),
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

      return product;
    });

    // ✅ eBay API calls AFTER DB transaction is committed
    const eBayResponses = {};
    if (status === "Active" && (ebayOne || ebayTwo || ebayThree)) {
      // Get eBay category ID from mapping file
      let ebayCategoryId = "53159"; // Default category ID if mapping not found
      
      try {
        const categoryMapping = require('../categoryMaping.json');
        
        // Find the category in the mapping
        const findCategoryInMapping = () => {
          // Check in women's categories
          for (const [section, categories] of Object.entries(categoryMapping.womens_categories || {})) {
            for (const category of categories) {
              if (category.website_category_id === categoryId || 
                  category.website_category_id === subCategoryId || 
                  category.website_category_id === parentCategoryId) {
                return category.ebay_category.id || "53159";
              }
            }
          }
          
          // Check in men's categories
          for (const [section, categories] of Object.entries(categoryMapping.mens_categories || {})) {
            for (const category of categories) {
              if (category.website_category_id === categoryId || 
                  category.website_category_id === subCategoryId || 
                  category.website_category_id === parentCategoryId) {
                return category.ebay_category.id || "53159";
              }
            }
          }
          
          // Check in kids' categories
          for (const [section, categories] of Object.entries(categoryMapping.kids_categories || {})) {
            for (const category of categories) {
              if (category.website_category_id === categoryId || 
                  category.website_category_id === subCategoryId || 
                  category.website_category_id === parentCategoryId) {
                return category.ebay_category.id || "53159";
              }
            }
          }
          
          // Check in general categories
          for (const category of categoryMapping.general_categories || []) {
            if (category.website_category_id === categoryId || 
                category.website_category_id === subCategoryId || 
                category.website_category_id === parentCategoryId) {
              return category.ebay_category.id || "53159";
            }
          }
          
          return "53159"; // Default if not found
        };
        
        ebayCategoryId = findCategoryInMapping();
      } catch (error) {
        console.error("Error finding eBay category ID:", error);
      }
      
      const eBayProductForService = {
        title: updatedProduct.title,
        brandName: updatedProduct.brandName,
        images: updatedProduct.images,
        sku: updatedProduct.sku,
        regularPrice: updatedProduct.regularPrice,
        stockQuantity: updatedProduct.stockQuantity,
        description: updatedProduct.description,
        categoryId: ebayCategoryId, // Use the mapped eBay category ID
        size: updatedProduct.sizeId || "N/A",
        sizeType: updatedProduct.sizeType || "Regular",
        color: updatedProduct.color || "N/A",
      };

      const ebayPromises = [];

      if (ebayOne) {
        ebayPromises.push(
          createEbayProduct(eBayProductForService)
            .then((res) => ({ platform: "eBayOne", value: res }))
            .catch((err) => ({ platform: "eBayOne", error: err.message }))
        );
      }
      if (ebayTwo) {
        ebayPromises.push(
          createEbayProduct2(eBayProductForService)
            .then((res) => ({ platform: "eBayTwo", value: res }))
            .catch((err) => ({ platform: "eBayTwo", error: err.message }))
        );
      }
      if (ebayThree) {
        ebayPromises.push(
          createEbayProduct3(eBayProductForService)
            .then((res) => ({ platform: "eBayThree", value: res }))
            .catch((err) => ({ platform: "eBayThree", error: err.message }))
        );
      }

      const results = await Promise.all(ebayPromises);

      results.forEach((r) => {
        eBayResponses[r.platform] = r.error ? { error: r.error } : r.value;
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully and eBay listing attempts completed.",
      product: updatedProduct,
      ebayListingResults: Object.keys(eBayResponses).length > 0 ? eBayResponses : undefined,
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
    res.status(200).json({
      success: true,
      message: "Product deleted successfully with history tracking.",
    }); // No content for successful deletion
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

const toggleProductIsPublished = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      select: { isPublished: true },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isPublished: !product.isPublished },
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error toggling product hide:", error);
    res.status(500).json({
      message: "Failed to toggle product hide",
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
          variants: { select: { id: true, stockQuantity: true, skuSuffix: true } },
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
  getAvailableProducts,
  toggleProductIsPublished,
};
