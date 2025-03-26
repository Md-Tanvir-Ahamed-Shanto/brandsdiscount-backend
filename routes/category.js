const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools.js");
const { paginateOverview } = require("../tools/pagination.js");

const prisma = new PrismaClient();

// Category Routes
router.get(
  "/categories",
  verifyUser,
  paginateOverview("category"),
  async (req, res) => {
    // const categories = await prisma.category.findMany({
    //   include: { subcategories: true },
    // });
    // res.send({ categories });
  }
);

// API route to get a single category by ID
router.get("/category/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await prisma.category.findUnique({
      where: {
        id: id,
      },
    });

    if (!cat) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json(cat);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

router.post("/new", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const category = await prisma.category.create({
      data: {
        name: req.body.name,
        parentCategoryId: req.body.parentCategoryId || null,
        subCategoryId: req.body.subCategoryId || null,
      },
    });
    res.send({ success: true, category });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.put("/update/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        parentCategoryId: req.body.parentCategoryId || null,
        subCategoryId: req.body.subCategoryId || null,
      },
    });
    res.send({ success: true, category });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete("/delete/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.send({ success: true });
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
