const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools.js");
const { paginateOverview } = require("../tools/pagination.js");

const prisma = new PrismaClient();

// Size Routes
router.get(
  "/sizes",
  verifyUser,
  ensureRoleAdmin,
  paginateOverview(prisma.size),
  async (req, res) => {
    const sizes = await prisma.size.findMany();
    res.send({ sizes });
  }
);

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
