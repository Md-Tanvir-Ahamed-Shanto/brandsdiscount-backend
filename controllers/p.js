
// Cache for category lookups to avoid repeated DB queries
const categoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedCategory = async (searchType) => {
  const cacheKey = `category_${searchType}`;
  const cached = categoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  let category = null;
  
  if (searchType === 'womens') {
    category = await prisma.category.findFirst({
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
  } else if (searchType === 'mens') {
    category = await prisma.category.findFirst({
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
  } else if (searchType === 'kids') {
    category = await prisma.category.findFirst({
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
  }
  
  categoryCache.set(cacheKey, { data: category, timestamp: Date.now() });
  return category;
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
        
        // Use cached category lookup
        const womensCategory = await getCachedCategory('womens');

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
        
        // Use cached category lookup
        const mensCategory = await getCachedCategory('mens');

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
        
        // Use cached category lookup
        const kidsCategory = await getCachedCategory('kids');

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
        // General search in product fields for other terms - keep original logic
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

    // Category filter (existing logic - unchanged)
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

    // Brand filter (unchanged)
    if (brand) {
      where.AND = where.AND
        ? [...where.AND, { brandName: brand }]
        : [{ brandName: brand }];
    }

    // SizeType filter (unchanged)
    if (sizeType) {
      const sizeArray = sizeType.split(",").map((s) => s.trim());
      where.AND = where.AND
        ? [...where.AND, { sizeType: { in: sizeArray } }]
        : [{ sizeType: { in: sizeArray } }];
    }

    // Price range filter (unchanged)
    if (priceMin || priceMax) {
      const priceFilter = {};
      if (priceMin) priceFilter.gte = parseFloat(priceMin);
      if (priceMax) priceFilter.lte = parseFloat(priceMax);
      where.AND = where.AND
        ? [...where.AND, { salePrice: priceFilter }]
        : [{ salePrice: priceFilter }];
    }

    // Sorting (unchanged)
    let orderBy = { [sortBy]: sortOrder };
    if (sortPrice) {
      if (sortPrice === "lowToHigh") {
        orderBy = { salePrice: "asc" };
      } else if (sortPrice === "highToLow") {
        orderBy = { salePrice: "desc" };
      }
    }

    console.log('Final where condition:', JSON.stringify(where, null, 2));

    // Run queries in parallel for better performance
    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
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
      }),
      prisma.product.count({ where })
    ]);

    // Add client-side props (keep original logic exactly)
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
      totalPages: Math.ceil(totalProducts / parseInt(pageSize)),
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

// Optional: Add cleanup function for cache
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of categoryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      categoryCache.delete(key);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);
