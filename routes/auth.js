const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const ExtractJwt = require("passport-jwt").ExtractJwt;
const LocalStrategy = require("passport-local");
const { PrismaClient } = require("@prisma/client");
const { getToken, verifyUser, COOKIE_OPTIONS, getRefreshToken } = require("../tools/authenticate");
const prisma = new PrismaClient();
const util = require("util");
const pbkdf2Async = util.promisify(crypto.pbkdf2);

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

passport.use(new (require("passport-jwt").Strategy)(opts, async (jwt_payload, done) => {
  try {
    console.log(jwt_payload.id);
    const user = await prisma.user.findUnique({
      where: { id: jwt_payload.id },
    });
    // console.log(user);
    return done(null, user || false);
  } catch (error) {
    return done(error, false);
  }
})
);

router.post("/signup", async (req, res, next) => {
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
            profilePicture: null,
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
      console.log("decoded");
      console.log(decoded);

      // Find the user associated with the refresh token
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      console.log(user);

      // Generate a new access token
      const token = getToken({ id: user.id });
      const refreshToken = getRefreshToken({ id: user.id });

      // res.cookie(
      //   "token",
      //   JSON.stringify({ token, refreshToken }),
      //   COOKIE_OPTIONS
      // );

      return res.json({
        success: true,
        access_token: token,
        refresh_token: refreshToken,
      });
    }
  );
});

router.post("/login", passport.authenticate("local", { session: false }), (req, res) => {
  const token = getToken({ id: req.user.id });
  const refreshToken = getRefreshToken({ id: req.user.id });

  // res.cookie(
  //   "token",
  //   JSON.stringify({ token, refreshToken }),
  //   COOKIE_OPTIONS
  // );

  res.json({
    success: true,
    access_token: token,
    refresh_token: refreshToken,
    user: {
      id: req.user.id,
      role: req.user.role,
      userName: req.user.username,
    },
  });
}
);

router.get("/logout", verifyUser, (req, res) => {
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.json({ success: true });
});

module.exports = router;
