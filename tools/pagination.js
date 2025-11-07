const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Define includes for each model
const modelIncludes = {
  order: {
    user: true,
    transaction: true,
    orderDetails: { include: { product: true } },
  },
  product: {
    size: true,
    category: true,
    subCategory: true,
    parentCategory: true,
  },
  // Add more models as needed
};

const paginateOverview = (model, userFilter = null) => {
  return async (req, res, next) => {
    try {
      const { page = 1, limit = 10, sort, filtering, userId, status } = req.query;

      // Convert page & limit to numbers
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Filtering logic
      let where = {};
      
      // Apply user filter if provided (for user-specific routes like /order/me)
      if (userFilter && req.user) {
        where[userFilter] = req.user.id;
      }
      
      // Apply query-based filtering for admin routes
      if (userId) where.userId = userId;
      if (status) where.status = status;
      
      if (filtering) {
        console.log("enter filtering");

        filtering.split(",").forEach((filter) => {
          console.log("filtering");
          const [key, value] = filter.split("_");
          if (key && value !== undefined) {
            console.log("filtering key value");

            where[key] = isNaN(value) ? value : parseFloat(value);
          }
        });
      }

      // Sorting logic
      let orderBy = { createdAt: "desc" };
      if (sort) {
        const [field, direction] = sort.split("_");
        orderBy = { [field]: direction === "desc" ? "desc" : "asc" };
      }

      // Get include config based on model
      const includeObj = modelIncludes[model] || undefined;

      // Fetch data from Prisma model
      const data = await prisma[model].findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: includeObj,
      });

      // Get total count for pagination metadata
      const totalRecords = await prisma[model].count({ where });
      const totalPages = Math.ceil(totalRecords / limitNum);

      // Store pagination data in req for middleware chain
      req.pagination = {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalRecords,
        skip,
        take: limitNum,
        data
      };

      // Continue to next middleware
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { paginateOverview };
