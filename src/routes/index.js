const { Router } = require('express');
const authRoutes = require("./authRoutes.js");
const gameRoutes = require("./gameRoutes.js");
const userRoutes = require("./userRoutes.js");

const router = Router();

router.use("/auth", authRoutes);
router.use("/games", gameRoutes);
router.use("/users", userRoutes);

module.exports = router;