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
const { uploadImages, deleteCloudflareImage } = require("../tools/images");
const pbkdf2Async = util.promisify(crypto.pbkdf2);

const prisma = new PrismaClient();

router.get(
  "/users",
  verifyUser,
  ensureRoleAdmin,
  paginateOverview("user"),
  async (req, res) => {
    const users = await prisma.user.findMany();
    res.send({ users });
  }
);

// API route to get a single user by ID
router.get("/user/:id", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

router.post(
  "/new",
  verifyUser,
  ensureRoleAdmin,
  uploadImages,
  async (req, res, next) => {
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
              profilePicture: req.images[0] || {},
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
  }
);

router.delete("/delete/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    await prisma.user.delete({ where: { id: req.params.id } });
    try {
      deleteCloudflareImage(user.profilePicture.id);
    } catch (error) {}
    res.send({ msg: `Deleted User ID ${req.params.id} successfully!` });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.put("/update/:id", verifyUser, uploadImages, async (req, res) => {
  try {
    // Get user details before updating
    console.log("user update");
    console.log(req.body);
    const userDetails = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (req.user.role !== "Admin" && req.user.id !== userDetails.id) {
      return res
        .status(403)
        .send({ error: "You are not authorized to update this user" });
    }

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

    if (req.body.userDetails) {
      updateData.userDetails = JSON.parse(req.body.userDetails);
    }

    // If the user provides a profile picture, include it in the update
    if (req.images.length !== 0) {
      updateData.profilePicture = req.images[0];
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
      updateData.hashedPassword = hashedPassword; // Save the hashed password
    }

    // Set `updatedById` if the user is authenticated
    if (req.user?.id) {
      updateData.updatedById = req.user.id;
    }

    // Perform the update only with the fields provided in the request
    try {
      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: updateData,
      });
      res.status(200).send({ success: true, user: updatedUser });
    } catch (error) {
      console.log(error);
      res.status(500).send({ error: "Internal server error" });
    }
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).send({ error: "Internal server error" });
  }
});

module.exports = router;
