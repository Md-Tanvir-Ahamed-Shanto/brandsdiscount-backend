const express = require('express');
const categoryRoutes = express.Router();
const { getCategoryById, getAllCategories, paginate, createCategory, updateCategory, deleteCategory } = require('../controllers/category.controller');
const { verifyUser } = require('../tools/authenticate');
const { ensureRoleAdmin } = require('../tools/tools');



// GET all categories with pagination
categoryRoutes.get(
  '/',
  verifyUser, // Apply authentication
  paginate('category', { 
    findMany: {
      include: {
        subcategories: {
          include: {
            subcategories: true 
          }
        }
      },
      where: {
        parentCategoryId: null 
      }
    },
    count: {
        where: {
            parentCategoryId: null 
        }
    }
  }),
  getAllCategories
);

// GET a single category by ID
categoryRoutes.get(
  '/:id',
  verifyUser,
  ensureRoleAdmin, 
  getCategoryById
);

// POST new category
categoryRoutes.post(
  '/', 
  verifyUser,
  ensureRoleAdmin,
  createCategory
);

// PUT update category by ID
categoryRoutes.put(
  '/:id', 
  verifyUser,
  ensureRoleAdmin,
  updateCategory
);

// DELETE category by ID
categoryRoutes.delete(
  '/:id', 
  verifyUser,
  ensureRoleAdmin,
  deleteCategory
);

module.exports = categoryRoutes;