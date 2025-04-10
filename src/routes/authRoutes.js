const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController.js");
const debugRoute = require("../middleware/debugRoute.js");
const authenticateAccessToken = require("../middleware/authenticateAccessToken.js");

router.post("/register", debugRoute, authController.registerUser);
router.get("/verifyUser", debugRoute, authController.verifyUser);
router.post("/login", debugRoute, authController.loginUser);
router.post("/refreshSession", debugRoute, authController.refreshSession);
router.post("/logout", debugRoute, authenticateAccessToken, authController.logoutUser);

module.exports = router;