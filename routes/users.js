const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools.js");
const { paginateOverview } = require("../tools/pagination.js");
const { uploadImages, deleteCloudflareImage } = require("../tools/images");
const crypto = require("crypto");
const util = require("util");
const { sendForgotPasswordEmail } = require("../tools/email.js");
const pbkdf2Async = util.promisify(crypto.pbkdf2);

const prisma = new PrismaClient();

// API route to get all users with pagination
router.get(
  "/users",
  verifyUser,
  ensureRoleAdmin,
  paginateOverview("user"),
  async (req, res) => {
    try {
      // Use pagination data from the middleware
      const { skip, take } = req.pagination;
      const users = await prisma.user.findMany({
        skip,
        take,
        orderBy: {
          createdAt: 'desc', // Example ordering
        },
      });
      res.send({ users, ...req.pagination }); // Send pagination data back
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching users" });
    }
  }
);

// API route to get a single user by ID
router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Error fetching user" });
  }
});

// API route to create a new user
router.post(
  "/new",
  verifyUser,
  ensureRoleAdmin,
  uploadImages,
  async (req, res) => {
    try {
      const salt = crypto.randomBytes(16);
      const hashedPassword = await pbkdf2Async(
        req.body.password,
        salt,
        310000,
        32,
        "sha256"
      );

      const newUser = await prisma.user.create({
        data: {
          username: req.body.username,
          hashedPassword,
          salt,
          email: req.body.email,
          role: req.body.role,
          // Set profilePicture to the first image object or null
          profilePicture: req.images[0] || null,
        },
      });

      res.status(201).json({
        success: true,
        user: { id: newUser.id, role: newUser.role, email: newUser.email },
      });
    } catch (error) {
      console.error("User create error:", error);
      // Handle unique constraint error (e.g., email already exists)
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return res.status(409).json({ error: "Email already in use" });
      }
      return res.status(500).json({ error: "Error creating user" });
    }
  }
);

// API route to delete a user
router.delete("/delete/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).send({ error: "User not found." });
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    // Safely attempt to delete the image, but don't fail the request if it fails
    if (user.profilePicture && user.profilePicture.id) {
      try {
        await deleteCloudflareImage(user.profilePicture.id);
        console.log(`Cloudflare image ${user.profilePicture.id} deleted successfully.`);
      } catch (imageError) {
        console.error(`Failed to delete Cloudflare image ${user.profilePicture.id}:`, imageError.message);
        // Log the error but continue, as the user record is already deleted
      }
    }
    res.send({ msg: `Deleted User ID ${req.params.id} successfully!` });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ error: "Internal server error." });
  }
});

// API route to update a user
router.put("/update/:id", verifyUser, uploadImages, async (req, res) => {
  try {
    const userId = req.params.id;
    const userDetails = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userDetails) {
      return res.status(404).send({ error: "User not found" });
    }

    // Authorization check
    if (req.user.role !== "Admin" && req.user.id !== userDetails.id) {
      return res.status(403).send({ error: "You are not authorized to update this user" });
    }

    let updateData = {};

    // Conditionally add fields to the update data object only if provided
    if (req.body.username) updateData.username = req.body.username;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.role && req.user.role === "Admin") updateData.role = req.body.role; // Only allow admins to change roles
    if (req.body.userDetails) updateData.userDetails = JSON.parse(req.body.userDetails);

    // If a new profile picture is uploaded, delete the old one first
    if (req.images.length > 0) {
      if (userDetails.profilePicture && userDetails.profilePicture.id) {
        try {
          await deleteCloudflareImage(userDetails.profilePicture.id);
        } catch (imageError) {
          console.warn(`Failed to delete old Cloudflare image for user ${userId}:`, imageError.message);
        }
      }
      updateData.profilePicture = req.images[0];
    } else if (req.body.profilePicture === 'null') { // Handle explicit deletion
      if (userDetails.profilePicture && userDetails.profilePicture.id) {
        try {
          await deleteCloudflareImage(userDetails.profilePicture.id);
        } catch (imageError) {
          console.warn(`Failed to delete old Cloudflare image for user ${userId}:`, imageError.message);
        }
      }
      updateData.profilePicture = null;
    }


    if (req.body.password) {
      // Validate old password if provided
      if (req.body.oldPassword) {
        try {
          const hashedOldPassword = await pbkdf2Async(
            req.body.oldPassword,
            userDetails.salt,
            310000,
            32,
            "sha256"
          );
          
          if (!crypto.timingSafeEqual(userDetails.hashedPassword, hashedOldPassword)) {
            return res.status(400).json({ error: "Current password is incorrect" });
          }
        } catch (err) {
          console.error("Error validating old password:", err);
          return res.status(500).json({ error: "Error validating old password" });
        }
      }
      
      // Hash and update with new password
      const salt = crypto.randomBytes(16);
      const hashedPassword = await pbkdf2Async(
        req.body.password,
        salt,
        310000,
        32,
        "sha256"
      );
      updateData.salt = salt;
      updateData.hashedPassword = hashedPassword;
    }

    if (req.user?.id) {
      updateData.updatedById = req.user.id;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    
    res.status(200).send({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Error updating user:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ error: "Email already in use" });
    }
    res.status(500).send({ error: "Internal server error" });
  }
});


router.post("/forgotPassword", async (req, res) => {
  const email = req.body.email;
  const users = await prisma.user.findUnique({ where: { email: email } });
  if (!users) {
    return res.status(404).json({ message: "User not found" });
  }
  sendForgotPasswordEmail(email);
  res.status(200).json({ message: "Email sent" });
});

module.exports = router;