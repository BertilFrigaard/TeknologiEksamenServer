const bcrypt = require("bcrypt");
const db = require("../utils/database.js");
const { gameHasPlayer } = require("../utils/gameUtils.js");

const createGame = async (req, res) => {
    const { budget, gameName, password, period } = req.body;
    if (!gameName || !budget) {
        return res.sendStatus(400); // Bad content
    } 

    if (!period) {
        period == 30* 24 * 60 // Defaults to expiration time of 30 days
    } else {
        if (period <= 0 || period > process.env.PERIOD_MAX) {
            return res.sendStatus(413);
        }
    }

    if (budget <= 0 || budget > process.env.BUDGET_MAX) {
        return res.sendStatus(413);
    }
    
    var passwordHash = null;
    if (password) {
        passwordHash = await bcrypt.hash(password, 10);
    }
    const userId = req.user; //From the authenticateAccessToken middleware

    const gameId = await db.createGame(gameName, period, budget, passwordHash); 
    if (!gameId) {
        return res.sendStatus(500); // Internal server error
    }

    const success = await db.addUserToGame(gameId, userId);
    if (!success) {
        //TODO: remove game if user cannot be added
        return res.sendStatus(500); // Internal server error
    }

    const success2 = await db.setGameAdmin(gameId, userId);
    if (!success2) {
        //TODO: remove game if user cannot be added as admin (Remember to remove game refrence from users aswell)
        return res.sendStatus(500); // Internal server error
    }

    return res.status(201).json({ gameId }); // Created
}

const getGameById = async (req, res) => {
    const { gameId } = req.params;
    if (!gameId) {
        return res.sendStatus(400); // Bad content
    }

    const game = await db.getGameById(gameId, { passwordHash: 0 });
    if (!game) {
        return res.sendStatus(404); // Not found
    }

    const userId = req.user;
    if (!gameHasPlayer(game, userId)) {
        return res.sendStatus(403);
    }

    return res.status(302).json(game); // Game found
}

const joinGame  = async (req, res) => {
    const { joinCode, password } = req.body;
    if (!joinCode) {
        return res.sendStatus(400); // Bad content
    }

    const game = await db.getGameByJoinCode(joinCode);
    if (!game) {
        return res.sendStatus(404); // Not found
    }

    if (game.passwordHash && password) {
        const result = bcrypt.compareSync(password, game.passwordHash);
        if (!result) {
            return res.sendStatus(403); // Forbidden, incorrect password
        }
    }
    else if (game.passwordHash) {
        return res.sendStatus(403); // Forbidden, password required
    }
    // No game password continue

    const userId = req.user; //From the authenticateAccessToken middleware

    const success = await db.addUserToGame(game._id, userId);
    if (!success) {
        return res.sendStatus(409); // Internal server error
    }

    return res.status(200).json({ gameId: game._id }); // Game found
}

const leaveGame = async (req, res) => {
    const { gameId } = req.params;
    if (!gameId) {
        return res.sendStatus(400); // Bad content
    }

    const userId = req.user; //From the authenticateAccessToken middleware

    const game = await db.getGameById(gameId, { passwordHash: 0 });
    if (!game) {
        return res.sendStatus(404); // Not found
    }

    if (!gameHasPlayer(game, userId)) {
        return res.sendStatus(403); // Forbidden, user not in game
    }

    if (game.admin == userId) {
        return res.sendStatus(403); // Forbidden, user is admin
    }

    const success = await db.removeUserFromGame(gameId, userId);
    if (!success) {
        return res.sendStatus(409); // Internal server error
    }

    return res.sendStatus(200)
}

const deleteGame = async (req, res) => {
    const { gameId } = req.params;
    if (!gameId) {
        return res.sendStatus(400);
    }

    const gameObj = await db.getGameById(gameId, { admin: 1, players: 1 });
    if (!gameObj) {
        return res.sendStatus(404); // Game not found
    }
    
    if (gameObj.admin != req.user) {
        return res.sendStatus(403); // Missing permission 
    }

    for (const p of gameObj.players) {
        await db.removeUserFromGame(gameId, p.id);
    }

    await db.deleteGame(gameId);
    return res.sendStatus(200);
}

const kickPlayer = async (req, res) =>  {
    const { targetId, gameId } = req.body;
    if (!targetId || !gameId) {
        return res.sendStatus(400);
    }

    const userId = req.user;

    if (targetId == userId) {
        return res.sendStatus(403);
    }

    const gameObj = await db.getGameById(gameId, { admin: 1, players: 1 });
    if (!gameObj) {
        return res.sendStatus(404);
    }

    if (gameObj.admin != userId) {
        return res.sendStatus(403)
    }

    const success = await db.removeUserFromGame(gameId, targetId);
    if (success) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(404);
    }

}

const addEntry = async (req, res) => {
    const { gameId, amount } = req.body;
    if (!gameId || !amount) {
        return res.sendStatus(400);
    }

    if (amount <= 0 || amount > process.env.BUDGET_MAX) {
        return res.sendStatus(413);
    }

    const userId = req.user;

    const success = await db.addEntryToGame(gameId, userId, amount);

    if (success) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(403);
    }
}

module.exports = {
    createGame,
    getGameById,
    joinGame,
    leaveGame,
    deleteGame,
    kickPlayer,
    addEntry
};