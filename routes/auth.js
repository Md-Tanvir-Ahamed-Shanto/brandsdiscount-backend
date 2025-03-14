const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const passport = require("passport");
const ExtractJwt = require("passport-jwt").ExtractJwt;
const LocalStrategy = require("passport-local");

const { PrismaClient } = require("@prisma/client");
const {
  getToken,
  verifyUser,
  COOKIE_OPTIONS,
  getRefreshToken,
} = require("../tools/authenticate");

const prisma = new PrismaClient();

passport.use(
  new LocalStrategy(async function verify(username, password, done) {
    console.log(username, password);
    try {
      const user = await prisma.user.findUnique({ where: { email: username } });
      if (!user) {
        return done(null, false, {
          message: "Incorrect username or password.",
        });
      }

      crypto.pbkdf2(
        password,
        user.salt,
        310000,
        32,
        "sha256",
        (err, hashedPassword) => {
          if (err) return done(err);
          if (!crypto.timingSafeEqual(user.hashedPassword, hashedPassword)) {
            return done(null, false, {
              message: "Incorrect username or password.",
            });
          }
          return done(null, user);
        }
      );
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, cb) => {
  process.nextTick(() => {
    cb(null, {
      id: user.id,
      username: user.username,
      role: user.role,
      profilePicture: user.profilePicture,
    });
  });
});

passport.deserializeUser((user, cb) => {
  process.nextTick(() => {
    cb(null, user);
  });
});

const opts = {
  jwtFromRequest:
    require("passport-jwt").ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new (require("passport-jwt").Strategy)(opts, async (jwt_payload, done) => {
    try {
      console.log(jwt_payload.id);
      const user = await prisma.user.findUnique({
        where: { id: jwt_payload.id },
      });
      console.log(user);
      return done(null, user || false);
    } catch (error) {
      return done(error, false);
    }
  })
);

router.post("/signup", async (req, res, next) => {
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

        const token = getToken({ id: newUser.id });
        res.json({
          success: true,
          access_token: token,
          user: { id: newUser.id, role: newUser.role },
        });
      }
    );
  } catch (error) {
    next(error);
  }
});

router.get("/refreshtoken", async (req, res) => {
  // const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  let refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken();
  refreshToken = refreshToken(req);
  // console.log(refreshToken);

  if (!refreshToken) {
    return res.status(400).json({ message: "No refresh token provided" });
  }

  // Verify the refresh token
  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) {
        // console.log(err);
        return res
          .status(401)
          .json({ message: "Invalid or expired refresh token" });
      }

      // Find the user associated with the refresh token
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      // Generate a new access token
      const token = getToken({ _id: user._id });
      const refreshToken = getRefreshToken({ _id: user._id });

      return res.json({
        success: true,
        access_token: token,
        refresh_token: refreshToken,
      });
    }
  );
});

router.post(
  "/login",
  passport.authenticate("local", { session: false }),
  (req, res) => {
    const token = getToken({ id: req.user.id });
    const refreshtoken = getRefreshToken({ id: req.user.id });
    res.json({
      success: true,
      access_token: token,
      refresh_token: refreshtoken,
      user: { id: req.user.id, role: req.user.role },
    });
  }
);

router.get("/logout", verifyUser, (req, res) => {
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.json({ success: true });
});

module.exports = router;
