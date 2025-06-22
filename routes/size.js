const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools.js");
const { paginateOverview } = require("../tools/pagination.js");

const prisma = new PrismaClient();

// Size Routes
router.get("/sizes", paginateOverview("size"), async (req, res) => {
  const sizes = await prisma.size.findMany();
  res.send({ sizes });
});

// get all sizes
router.get("/all-sizes", async (req, res) => {
  try {
    const sizes = await prisma.size.findMany();
    res.status(200).json(sizes);
  } catch (error) {
    res.status(500).json({ error: "Error fetching sizes" });
  }
});

// API route to get a single size by ID
router.get("/size/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const size = await prisma.size.findUnique({
      where: {
        id: id,
      },
    });

    if (!size) {
      return res.status(404).json({ error: "Size not found" });
    }

    res.status(200).json(size);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

router.post("/new", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const size = await prisma.size.create({ data: { name: req.body.name } });
    res.send({ success: true, size });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.put("/update/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const size = await prisma.size.update({
      where: { id: req.params.id },
      data: { name: req.body.name },
    });
    res.send({ success: true, size });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete("/delete/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    await prisma.size.delete({ where: { id: req.params.id } });
    res.send({ success: true });
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
