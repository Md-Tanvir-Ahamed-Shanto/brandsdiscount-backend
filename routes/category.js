const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools.js");
const { paginateOverview } = require("../tools/pagination.js");

const prisma = new PrismaClient();

// Category Routes
router.get("/categories", verifyUser, ensureRoleAdmin, async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
  });
  res.send({ categories });
});

router.post("/new", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const category = await prisma.category.create({
      data: {
        name: req.body.name,
        parentCategoryId: req.body.parentCategoryId || null,
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
