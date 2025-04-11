const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController.js");
const debugRoute = require("../middleware/debugRoute.js");
const authenticateAccessToken = require("../middleware/authenticateAccessToken.js");

router.post("/createGame", debugRoute, authenticateAccessToken, gameController.createGame);
router.get("/getGameById/:gameId", debugRoute, authenticateAccessToken, gameController.getGameById);
router.post("/joinGame", debugRoute, authenticateAccessToken, gameController.joinGame);

module.exports = router;