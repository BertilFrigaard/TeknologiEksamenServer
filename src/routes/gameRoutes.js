const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController.js");
const debugRoute = require("../middleware/debugRoute.js");
const authenticateAccessToken = require("../middleware/authenticateAccessToken.js");

router.post("/createGame", debugRoute, authenticateAccessToken, gameController.createGame);
router.get("/getGameById/:gameId", debugRoute, authenticateAccessToken, gameController.getGameById);
router.post("/joinGame", debugRoute, authenticateAccessToken, gameController.joinGame);
router.delete("/leaveGame", debugRoute, authenticateAccessToken, gameController.leaveGame);
router.delete("/deleteGame", debugRoute, authenticateAccessToken, gameController.deleteGame);
router.post("/kick", debugRoute, authenticateAccessToken, gameController.kickPlayer);
router.post("/addEntry", debugRoute, authenticateAccessToken, gameController.addEntry);

module.exports = router;