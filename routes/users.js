const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools.js");
const { paginateOverview } = require("../tools/pagination.js");
const images = require("../tools/images");
const crypto = require("crypto");

// Promisify pbkdf2 so it returns a promise
const util = require("util");
const pbkdf2Async = util.promisify(crypto.pbkdf2);

const prisma = new PrismaClient();

router.get(
  "/users",
  verifyUser,
  paginateOverview(prisma.user),
  async (req, res) => {
    const users = await prisma.user.findMany();
    res.send({ users });
  }
);

router.post("/new", verifyUser, async (req, res, next) => {
  try {
    const salt = crypto.randomBytes(16);
    crypto.pbkdf2(
      req.body.password,
      salt,
      310000,
      32,
      "sha256",
      async (err, hashedPassword) => {
        if (err) return next(err);

        const newUser = await prisma.user.create({
          data: {
            username: req.body.username,
            hashedPassword,
            salt,
            email: req.body.email,
            role: req.body.role,
            profilePicture: req.body.profilePicture || null,
          },
        });

        res.status(200).json({
          success: true,
          user: { id: newUser.id, role: newUser.role },
        });
      }
    );
  } catch (error) {
    next(error);
  }
});

router.delete("/delete/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.send({ msg: `Deleted User ID ${req.params.id} successfully!` });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.patch(
  "/update/:id",
  verifyUser,
  ensureRoleAdmin,
  images.multer.single("profilePicture"),
  images.sendUploadToGCS,
  async (req, res) => {
    try {
      // Get user details before updating
      const userDetails = await prisma.user.findUnique({
        where: { id: req.params.id },
      });

      if (!userDetails) {
        return res.status(404).send({ error: "User not found" });
      }

      // Initialize the update data object
      let updateData = {};

      // Conditionally add fields to the update data object only if provided
      if (req.body.username) {
        updateData.username = req.body.username;
      }

      if (req.body.email) {
        updateData.email = req.body.email;
      }

      if (req.body.role) {
        updateData.role = req.body.role;
      }

      // If the user provides a profile picture, include it in the update
      if (req.file) {
        updateData.profilePicture = req.file.cloudStorageObject;
      }

      // If the user provides a password, hash and include it in the update
      if (req.body.password) {
        const salt = crypto.randomBytes(16); // Generate salt

        // Hash the new password with the provided salt
        const hashedPassword = await pbkdf2Async(
          req.body.password,
          salt,
          310000,
          32,
          "sha256"
        );

        updateData.salt = salt; // Save the salt
        updateData.hashedPassword = hashedPassword.toString("hex"); // Save the hashed password
      }

      // Set `updatedById` if the user is authenticated
      if (req.user?.id) {
        updateData.updatedById = req.user.id;
      }

      // Perform the update only with the fields provided in the request
      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.send({ success: true, user: updatedUser });
    } catch (error) {
      console.error(error); // Log the error for debugging
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

module.exports = router;
