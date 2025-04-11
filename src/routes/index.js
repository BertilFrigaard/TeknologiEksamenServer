const { Router } = require('express');
const authRoutes = require("./authRoutes.js");
const gameRoutes = require("./gameRoutes.js");

const router = Router();

router.use("/auth", authRoutes);
router.use("/games", gameRoutes);

module.exports = router;