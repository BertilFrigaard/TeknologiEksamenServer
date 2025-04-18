const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");
const debugRoute = require("../middleware/debugRoute.js");
const authenticateAccessToken = require("../middleware/authenticateAccessToken.js");

router.get("/getUserById/:targetId", debugRoute, authenticateAccessToken, userController.getUserById);

module.exports = router;