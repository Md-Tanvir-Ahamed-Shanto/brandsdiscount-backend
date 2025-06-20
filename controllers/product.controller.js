const { PrismaClient } = require("@prisma/client");
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
        size: {
          select: {
            id: true,
            name: true,
            // type: true,
          },
        },
        category: getCategoryInclude("category"),
        subCategory: getCategoryInclude("subCategory"),
        parentCategory: getCategoryInclude("parentCategory"),
      },
    });

    const totalProducts = await prisma.product.count({ where });

    // Manually add `imageUrl`, `name`, `hasTenDollarOffer`, `offerPrice`, `quantity`, `listedOn` based on client-side logic
    const productsWithClientSideProps = products.map((product) => {
      // Assuming images[0] is the primary image URL
      const imageUrl =
        product.images && product.images.length > 0 ? product.images[0] : null;
      // Assuming 'name' is derived from 'title' for display
      const name = product.title;
      // Assuming `hasTenDollarOffer` corresponds to `toggleFirstDeal`
      const hasTenDollarOffer = product.toggleFirstDeal;
      // Assuming `offerPrice` is calculated from `platFormPrice` or `regularPrice` and discount
      const offerPrice = product.platFormPrice || product.regularPrice; // You'll need to refine this based on your actual offer logic

      // Assuming `quantity` maps to `stockQuantity`
      const quantity = product.stockQuantity;

      // Determine listed platforms based on available IDs
      const listedOn = [];
      if (product.ebayId) listedOn.push("eBay");
      if (product.wallmartId) listedOn.push("Walmart");
      if (product.sheinId) listedOn.push("Shein");
      if (product.woocommerceId) listedOn.push("WooCommerce");

      return {
        ...product,
        imageUrl,
        name,
        hasTenDollarOffer,
        offerPrice,
        quantity,
        listedOn,
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
        size: true,
        category: true,
        subCategory: true,
        parentCategory: true,
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
    const {
      title,
      brandName,
      color,
      sku,
      images,
      itemLocation,
      size,
      sizeId,
      sizeType,
      postName,
      categoryId,
      subCategoryId,
      parentCategoryId,
      ebayId,
      wallmartId,
      sheinId,
      woocommerceId,
      regularPrice,
      salePrice,
      platFormPrice,
      toggleFirstDeal,
      discountPercent,
      stockQuantity,
      condition,
      description,
      status,
      updatedById,
    } = req.body;

    const newProduct = await prisma.product.create({
      data: {
        title,
        brandName: brandName || null,
        color: color || null,
        sku,
        images: req.images || [],
        itemLocation: itemLocation || null,
        size: size || null,
        sizeId: sizeId || null,
        sizeType: sizeType || null,
        postName: postName || null,
        categoryId: categoryId || null,
        subCategoryId: subCategoryId || null,
        parentCategoryId: parentCategoryId || null,
        ebayId: ebayId || null,
        wallmartId: wallmartId || null,
        sheinId: sheinId || null,
        woocommerceId: woocommerceId || null,
        regularPrice: parseFloat(regularPrice) || null,
        salePrice: parseFloat(salePrice) || null,
        platFormPrice: parseFloat(platFormPrice) || null,
        toggleFirstDeal: toggleFirstDeal || true,
        discountPercent: parseFloat(discountPercent) || null,
        stockQuantity: parseInt(stockQuantity) || null,
        condition: condition || null,
        description: description || null,
        status: status || null,
        updatedById: updatedById || null,
      },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res
      .status(500)
      .json({ message: "Failed to create product", error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      brandName,
      color,
      sku,
      images,
      itemLocation,
      sizeId,
      sizeType,
      postName,
      categoryId,
      subCategoryId,
      parentCategoryId,
      ebayId,
      wallmartId,
      sheinId,
      woocommerceId,
      regularPrice,
      salePrice,
      platFormPrice,
      toggleFirstDeal,
      discountPercent,
      stockQuantity,
      condition,
      description,
      status,
      updatedById,
    } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        title,
        brandName: brandName || null,
        color: color || null,
        sku,
        images: req.images || [],
        itemLocation: itemLocation || null,
        sizeId: sizeId || null,
        sizeType: sizeType || null,
        postName: postName || null,
        categoryId: categoryId || null,
        subCategoryId: subCategoryId || null,
        parentCategoryId: parentCategoryId || null,
        ebayId: ebayId || null,
        wallmartId: wallmartId || null,
        sheinId: sheinId || null,
        woocommerceId: woocommerceId || null,
        regularPrice: parseFloat(regularPrice) || null,
        salePrice: parseFloat(salePrice) || null,
        platFormPrice: parseFloat(platFormPrice) || null,
        toggleFirstDeal: toggleFirstDeal || true,
        discountPercent: parseFloat(discountPercent) || null,
        stockQuantity: parseInt(stockQuantity) || null,
        condition: condition || null,
        description: description || null,
        status: status || null,
        updatedById: updatedById || null,
      },
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(500)
      .json({ message: "Failed to update product", error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
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
    const { stockQuantity } = req.body;

    if (typeof stockQuantity !== "number" || stockQuantity < 0) {
      return res
        .status(400)
        .json({ message: "Invalid stock quantity provided." });
    }

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
};
