const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


const paginate = (model, options = {}) => async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const [totalRecords, data] = await prisma.$transaction([
            prisma[model].count(options.count),
            prisma[model].findMany({
                ...options.findMany,
                skip: skip,
                take: limit,
            }),
        ]);

        const totalPages = Math.ceil(totalRecords / limit);

        res.locals.paginatedResult = {
            page,
            limit,
            totalPages,
            totalRecords,
            data,
        };
        next();
    } catch (error) {
        console.error(`Error in pagination for ${model}:`, error);
        res.status(500).json({ error: 'Internal Server Error during pagination' });
    }
};


// --- Get All Categories ---
const getAllCategories = async (req, res) => {
  try {
    // res.locals.paginatedResult is set by the paginate middleware
    res.status(200).json(res.locals.paginatedResult);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Error fetching categories" });
  }
};

// --- Get Single Category by ID ---
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id: id },
      include: {
        subcategories: true, 
        parentCategory: true, 
        
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    res.status(500).json({ error: "Error fetching category" });
  }
};

// --- Create New Category ---
const createCategory = async (req, res) => {
  try {
    const { name, parentCategoryId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required." });
    }

    const category = await prisma.category.create({
      data: {
        name: name,
        parentCategoryId: parentCategoryId || null, // Ensure null if not provided
      },
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error("Error creating category:", error);
    if (error.code === 'P2002' && error.meta.target.includes('name')) {
        return res.status(409).json({ error: 'Category with this name already exists.' });
    }
    res.status(500).json({ error: "Error creating category" });
  }
};

// --- Update Category ---
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentCategoryId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required for update." });
    }

    const category = await prisma.category.update({
      where: { id: id },
      data: {
        name: name,
        parentCategoryId: parentCategoryId || null,
      },
    });
    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error("Error updating category:", error);
     if (error.code === 'P2002' && error.meta.target.includes('name')) {
        return res.status(409).json({ error: 'Category with this name already exists.' });
    } else if (error.code === 'P2025') { // Record to update not found
        return res.status(404).json({ error: 'Category not found.' });
    }
    res.status(500).json({ error: "Error updating category" });
  }
};

// --- Delete Category ---
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the category exists
    const categoryExists = await prisma.category.findUnique({ where: { id: id } });
    if (!categoryExists) {
        return res.status(404).json({ error: "Category not found." });
    }

    const productsAssociated = await prisma.product.count({
        where: {
            OR: [
                { categoryId: id },
                { subCategoryId: id },
                { parentCategoryId: id }
            ]
        }
    });

    if (productsAssociated > 0) {

        console.warn(`Category ${id} has ${productsAssociated} associated products. Their category references will be set to NULL.`);
    }

    await prisma.category.delete({ where: { id: id } });
    res.status(200).json({ success: true, message: "Category deleted successfully." });
  } catch (error) {
    console.error("Error deleting category:", error);
    if (error.code === 'P2003') { 
        return res.status(400).json({ error: "Cannot delete category due to existing relationships (e.g., subcategories still linked). Ensure all subcategories are reassigned or deleted first." });
    }
    res.status(500).json({ error: "Error deleting category" });
  }
};

const getCategoryIds = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching category IDs and names:", error);
    res.status(500).json({
      message: "Failed to fetch category IDs and names",
      error: error.message,
    });
  }
};


module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryIds,
  paginate 
};