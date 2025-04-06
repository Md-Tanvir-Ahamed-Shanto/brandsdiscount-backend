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

const paginateOverview = (model) => {
  return async (req, res, next) => {
    try {
      const { page = 1, limit = 10, sort, filtering } = req.query;

      // Convert page & limit to numbers
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Filtering logic
      let where = {};
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

      // Send response
      res.json({
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalRecords,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { paginateOverview };
