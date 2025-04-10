const { Router } = require('express');
const authRoutes = require("./authRoutes.js");

const router = Router();

router.use("/auth", authRoutes);

module.exports = router;