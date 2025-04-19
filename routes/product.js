let express = require("express");
let router = express.Router();

let ensureLogIn = require("connect-ensure-login").ensureLoggedIn;

const jwt = require("jsonwebtoken");
const { verifyUser } = require("../tools/authenticate");

// //Middleware to check user role
let { ensureRoleAdmin } = require("../tools/tools.js");

//Middleware to paginate overview lists
let { paginateOverview } = require("../tools/pagination.js");

// Middleware to get bucket file
let { bucket } = require("../tools/cloudStorage.js");
const images = require("../tools/images");

const { PrismaClient } = require("@prisma/client");
const { uploadImages, deleteCloudflareImage } = require("../tools/images.js");
// const { uploadImages, deleteCloudflareImage } = require("../tools/images");
const prisma = new PrismaClient();

/* Get Products */
router.get(
  "/products",
  paginateOverview("product")
  // async function (req, res, next) {
  //   res.send("product route");
  // }
);

// API route to get a single product by ID
router.get("/product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: {
        id: id,
      },
      include: {
        size: true,
        category: true,
        subCategory: true,
        parentCategory: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

// API route to get a single product by SKU
router.get("/product/sku/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: {
        sku: id,
      },
      include: {
        size: true,
        category: true,
        subCategory: true,
        parentCategory: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

// Get Product by Title
router.get("/product/title/:title", async (req, res) => {
  try {
    const { title } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        title: {
          equals: title,
          mode: "insensitive",
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error fetching product" });
  }
});

/* Create product listing. */
router.post(
  "/new",
  verifyUser,
  ensureRoleAdmin,
  uploadImages,
  async function (req, res, next) {
    try {
      const {
        title,
        brandName,
        color,
        sku,
        itemLocation,
        sizeId,
        sizeType,
        categoryId,
        regularPrice,
        salePrice,
        discountPercent,
        stockQuantity,
        condition,
        description,
        status,
      } = req.body;

      const product = await prisma.product.create({
        data: {
          title,
          brandName: brandName || null, // Add if exists
          color: color || null, // Add if exists
          sku,
          images: req.images || [], // If no images provided, use an empty array
          itemLocation: itemLocation || null, // Add if exists
          sizeId: sizeId || null, // Add if exists
          sizeType: sizeType || null, // Add if exists
          categoryId: categoryId || null, // Add if exists
          regularPrice: parseFloat(regularPrice) || null, // Add if exists
          salePrice: parseFloat(salePrice) || null, // Add if exists
          discountPercent: parseFloat(discountPercent) || null, // Add if exists
          stockQuantity: parseInt(stockQuantity) || null, // Add if exists
          condition: condition || null, // Add if exists
          description: description || null, // Add if exists
          status: status || null, // Add if exists
        },
      });
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ error: "Error creating product" });
    }
  }
);

// API route to update a product by ID
router.patch(
  "/update/:id",
  verifyUser,
  ensureRoleAdmin,
  uploadImages, // Utility function for uploading to Google Cloud Storage
  async (req, res) => {
    try {
      // Get the product details before updating
      const productDetails = await prisma.product.findUnique({
        where: { id: req.params.id },
      });

      if (!productDetails) {
        return res.status(404).send({ error: "Product not found" });
      }

      // Initialize the update data object
      let updateData = {};

      // Conditionally add fields to the update data object only if provided
      if (req.body.title) {
        updateData.title = req.body.title;
      }

      if (req.body.brandName) {
        updateData.brandName = req.body.brandName;
      }

      if (req.body.color) {
        updateData.color = req.body.color;
      }

      if (req.body.sku) {
        updateData.sku = req.body.sku;
      }

      if (req.body.itemLocation) {
        updateData.itemLocation = req.body.itemLocation;
      }

      if (req.body.sizeType) {
        updateData.sizeType = req.body.sizeType;
      }

      if (req.body.regularPrice) {
        updateData.regularPrice = parseFloat(req.body.regularPrice);
      }

      if (req.body.salePrice) {
        updateData.salePrice = parseFloat(req.body.salePrice);
      }

      if (req.body.discountPercent) {
        updateData.discountPercent = parseFloat(req.body.discountPercent);
      }

      if (req.body.stockQuantity) {
        updateData.stockQuantity = parseInt(req.body.stockQuantity);
      }

      if (req.body.condition) {
        updateData.condition = req.body.condition;
      }

      if (req.body.description) {
        updateData.description = req.body.description;
      }

      if (req.body.status) {
        updateData.status = req.body.status;
      }

      // If the req provides picture, include it in the update

      if (req.body.images?.length > 0) {
        updateData.images = [...req.images, ...JSON.parse(req.body.images)];
      } else {
        if (req.images.length !== 0) {
          updateData.images = req.images; // Assuming `sendUploadToGCS` will upload the image and set this field
        }
      }

      // Set `updatedById` if the user is authenticated
      if (req.user?.id) {
        updateData.updatedById = req.user.id;
      }

      // Perform the update only with the fields provided in the request
      const updatedProduct = await prisma.product.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.status(201).json(updatedProduct);
    } catch (error) {
      console.error(error); // Log the error for debugging
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

// API route to bulk update product quantity by sku
router.patch(
  "/bulkupdate/sku",
  // verifyUser,
  // ensureRoleAdmin,
  async (req, res) => {
    try {
      // Initialize the update data object
      // let updateData = {};

      // const data = req.body.data;

      // const updateProducts = () => {
      //   return new Promise((resolve, reject) => {
      //     data.forEach(async (item, index) => {
      //       let updateData = {};
      //       const productDetails = await prisma.product.findUnique({
      //         where: { sku: item.sku },
      //       });

      //       if (!productDetails) {
      //         return res.status(404).send({ error: "Product not found" });
      //       }

      //       if (item.sku) {
      //         updateData.sku = item.sku;
      //       }

      //       if (item.quantity) {
      //         updateData.stockQuantity =
      //           productDetails.stockQuantity - parseInt(item.quantity);
      //       }

      //       console.log(updateData);

      //       try {
      //         const updatedProduct = await prisma.product.update({
      //           where: { sku: item.sku },
      //           data: updateData,
      //         });

      //         if (data.length === index + 1) {
      //           resolve(true);
      //         }
      //       } catch (error) {
      //         console.error(error); // Log the error for debugging
      //         reject(error);
      //         return res.status(500).send({ error: "Internal server error" });
      //       }
      //     });
      //   });
      // };

      // await updateProducts();

      const data = req.body.data;

      const updateProducts = async () => {
        await data.reduce(async (prevPromise, item) => {
          // Wait for previous promise to finish
          await prevPromise;

          // Fetch product details
          const productDetails = await prisma.product.findUnique({
            where: { sku: item.sku },
          });

          if (!productDetails) {
            throw new Error(`Product with SKU ${item.sku} not found`);
          }

          let updateData = {};

          if (item.sku) {
            updateData.sku = item.sku;
          }

          if (item.quantity) {
            updateData.stockQuantity =
              productDetails.stockQuantity - parseInt(item.quantity);
          }

          console.log(updateData);

          // Update product
          await prisma.product.update({
            where: { sku: item.sku },
            data: updateData,
          });
        }, Promise.resolve());
      };

      // Call and handle errors
      try {
        await updateProducts();
        res.status(200).send({ success: true });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ error: error.message || "Internal server error" });
      }

      // res.status(201).json({ message: "Product updated successfully" });
    } catch (error) {
      console.error(error); // Log the error for debugging
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

// API route to delete a product by ID
router.delete("/delete/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.delete({
      where: { id },
    });

    res.status(200).json({ message: "Product deleted successfully", product });
  } catch (error) {
    res.status(500).json({ error: "Error deleting product" });
  }
});

/*Search Product */
router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: "Search query too short" });
  }

  try {
    const results = await prisma.$queryRaw`
      SELECT "id", "title", "sku", "brandName", "images", "salePrice", "stockQuantity", "updatedAt"
      FROM "Product"
      WHERE "search_vector" @@ plainto_tsquery('simple', ${q})
      ORDER BY "updatedAt" DESC
      LIMIT 50;
    `;

    return res.json(results);
  } catch (err) {
    console.error("🔍 Search error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
