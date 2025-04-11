const bcrypt = require("bcrypt");

const db = require("../utils/database.js");

const createGame = async (req, res) => {
    const { gameName, password } = req.body;
    if (!gameName) {
        return res.sendStatus(400); // Bad content
    } 
    
    var passwordHash = null;
    if (password) {
        passwordHash = await bcrypt.hash(password, 10);
    }
    const userId = req.user; //From the authenticateAccessToken middleware

    const gameId = await db.createGame(gameName, 30 * 24 * 60, passwordHash); // temporary hardcoded expiration time of 30 days
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

    return res.status(201).json({ gameId }); // Created TODO: remove gameName and passwordLocked!!
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
    const { gameId } = req.body;
    if (!gameId) {
        return res.sendStatus(400); // Bad content
    }

    const userId = req.user; //From the authenticateAccessToken middleware

    const game = await db.getGameById(gameId, { passwordHash: 0 });
    if (!game) {
        return res.sendStatus(404); // Not found
    }

    if (!game.players.includes(userId)) {
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
    const { gameId } = req.body;
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

    await gameObj.players.forEach(async (userId) => {
        await db.removeUserFromGame(gameId, userId);
    });

    await db.deleteGame(gameId);
    return res.sendStatus(200);
}

module.exports = {
    createGame,
    getGameById,
    joinGame,
    leaveGame,
    deleteGame
};