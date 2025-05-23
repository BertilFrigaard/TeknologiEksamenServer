const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
const { gameHasPlayer } = require("./gameUtils");

const client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
})

async function openConnection() {
    try {
        await client.connect();
        console.log("MongoDB client connected");
    } catch (e) {
        console.log("Error connecting MongoDB client", e);
        process.exit(1);
    }
}

async function closeConnection() {
    if (client) {
        await client.close();
        console.log("Closed MongoDB connection")
    }
}

// ######### AUTHENTICATION #########

async function createUser(username, email, passwordHash) { 
    // Returns acknowledged = bool, errorType? = int, token? = string
    // ErrorTypes
    // 0 = Email already in use
    // 1 = Database updateOne failed
    // 2 = Unspecified error
    try {

        const db = client.db("main");
        const mainUsers = db.collection("users");

        const selectedUser = await mainUsers.findOne({ email: email });

        if (selectedUser != null) {
            // user with given email already exists (ErrorType = 0)
            return {
                acknowledged: false,
                errorType: 0
            }
        }

        const nonVerifiedUsers = db.collection("awaitingAuth");

        const user = {
            username: username,
            email: email,
            passwordHash: passwordHash,
            games: []
        };

        const nonVerifiedUser = {
            email: email,
            userObj: user
        };

        const res = await nonVerifiedUsers.updateOne(
            { email: email },
            {
                $set: nonVerifiedUser
            },
            { upsert: true }
        );

        if (res.acknowledged) {
            if (res.upsertedId == null) {
                const userObj = await nonVerifiedUsers.findOne({email: email}, {_id: true})
                return {
                    acknowledged: true,
                    token: userObj._id
                };
            } else{
                return {
                    acknowledged: true,
                    token: res.upsertedId
                };
            }
        }
        return {
            // Database updateOne failed (ErrorType = 1)
            acknowledged: false,
            errorType: 1
        };
    } catch(e) {
        console.log("Error: " + e);
        return {
            // Unspecified error (ErrorType = 2)
            acknowledged: false,
            errorType: 2
        };
    }
}

async function getUnverfiedUserByEmail(email, projection = {}) {
    try {
        const db = client.db("main");
        const users = db.collection("awaitingAuth");
        const selectedUser = await users.findOne({email: email}, {projection: projection});

        return selectedUser;
    } catch (e) {
        console.log("Error: " + e);
        return null;
    }
}

async function getUserByEmail(email, projection = {}) {
    try {
        const db = client.db("main");
        const users = db.collection("users");

        const selectedUser = await users.findOne({email: email}, {projection: projection});

        return selectedUser;
    } catch (e) {
        console.log("Error: " + e);
        return null;
    }
}

async function verifyAccount(token) {
    try {
        const db = client.db("main");
        const nonVerifiedUsers = db.collection("awaitingAuth");
        const userId = new ObjectId(token);

        const findRes = await nonVerifiedUsers.findOneAndDelete({ _id: userId });

        if (findRes == null) {
            console.log("Could not find user awaiting verification with token: " + token);
            return false;
        }

        const userObj = findRes.userObj;

        const users = db.collection("users");
        const putRes = await users.updateOne(
            { email: userObj.email },
            {
                $set: userObj
            },
            { upsert: true });

        if (putRes.acknowledged) {
            return true;
        } else {
            console.log("Could not create new verified user");
            return false;
        }

    } catch (e) {
        console.log("Error: " + e)
        return false;
    }
}

async function storeRefreshToken(userId, tokenHash, expirationDate) {
    const db = client.db("main");
    const refreshTokens = db.collection("refreshTokens");
    const entryObj = {
        userId: userId,
        tokenHash: tokenHash,
        expirationDate: expirationDate
    }

    const res = await refreshTokens.updateOne(
        { userId: userId },
        { $set: entryObj },
        { upsert: true }
    )

    if (res.acknowledged) {
        return true;
    }
    return false;
}

async function getRefreshToken(userId) {
    try {
        const db = client.db("main");
        const refreshTokens = db.collection("refreshTokens");

        const entryObj = refreshTokens.findOne({userId: new ObjectId(userId)});

        return entryObj;

    } catch (e) {
        console.log(e);
        return null;
    }
}

async function removeRefreshTokenByUserId(userId) {
    try {
        const db = client.db("main");
        const refreshTokens = db.collection("refreshTokens");

        await refreshTokens.deleteOne({userId: new ObjectId(userId)});

        return true;

    } catch (e) {
        console.log(e);
        return false;
    }
}

// ######### USERS #########

async function getUserById(id, projection = {}) {
    try {
        const db = client.db("main");
        const users = db.collection("users");

        const userId = new ObjectId(id);

        const selectedUser = await users.findOne({_id: userId}, {projection: projection});

        return selectedUser;
    } catch (e) {
        console.log("Error: " + e);
        return null;
    }
}

// ######### GAMES #########

async function generateJoinCode() {
    try {
        const db = client.db("main");
        const games = db.collection("games");

        const options = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        while (code.length < 6) {
            code += options.charAt(Math.floor(Math.random() * options.length));
        }

        const selectedGame = await games.findOne({joinCode: code});
        if (selectedGame != null) {
            return generateJoinCode();
        }

        return code;
    } catch (e) {
        console.log("Error: " + e);
        return null;
    }
}

async function createGame(gameName, period, budget, passwordHash = null) {
    try {
        const db = client.db("main");
        const games = db.collection("games");

        const code = await generateJoinCode();
        if (code == null) {
            console.log("Could not generate join code");
            return null;
        }

        const gameObj = {
            name: gameName,
            players: [],
            admin: null,
            passwordHash: passwordHash,
            joinCode: code,
            createdAt: new Date(),
            period: period,
            budget: budget
        }

        const res = await games.insertOne(gameObj);
        if (res.acknowledged) {
            return res.insertedId;
        } else {
            console.log("Could not create new game");
            return null;
        }
    } catch (e) {
        console.log("Error in creating game: " + e);
        return null;
    }
}

async function deleteGame(gameId) {
    try {
        const db = client.db("main");
        const games = db.collection("games");

        const res = await games.deleteOne({_id: new ObjectId(gameId)});
        if (res.acknowledged) {
            return true;
        } else {
            console.log("Could not delete game: " + gameId);
            return false;
        }
    } catch (e) {
        console.log("Error: " + e);
        return false;
    }
}

async function getGameById(id, projection = {}) {
    try {
        const db = client.db("main");
        const games = db.collection("games");

        const gameId = new ObjectId(id);

        const selectedGame = await games.findOne({_id: gameId}, {projection: projection});

        return selectedGame;
    } catch (e) {
        console.log("Error: " + e);
        return null;
    }
}

async function getGameByJoinCode(code, projection = {}) {
    try {
        const db = client.db("main");
        const games = db.collection("games");

        const selectedGame = await games.findOne({joinCode: code}, {projection: projection});

        return selectedGame;
    } catch (e) {
        console.log("Error: " + e);
        return null;
    }
}

async function setGameAdmin(gameId, userId) {
    try {
        const db = client.db("main");
        const games = db.collection("games");

        const res = await games.updateOne(
            { _id: new ObjectId(gameId) },
            { $set: { admin: userId } }
        );
        if (res.acknowledged) {
            return true;
        } else {
            console.log("Could not set game admin: " + gameId);
            return false;
        }
    } catch (e) {
        console.log("Error: " + e);
        return false;
    }
}

async function addUserToGame(gameId, userId) {
    try {
        const db = client.db("main");
        const games = db.collection("games");
        const users = db.collection("users");

        // Get gameobject and playerlist
        const gameObj = await games.findOne({_id: new ObjectId(gameId)});
        if (gameObj == null) {
            console.log("Game not found: " + gameId);
            return false;
        }

        const gamePlayers = gameObj.players;
        const exists = gamePlayers.some(p => p.id == userId);
        if (exists) {
            console.log("User already in game: " + userId);
            return false;
        }

        //Get user object and gamelist
        const userObj = await users.findOne({_id: new ObjectId(userId)});
        if (userObj == null) {
            console.log("User not found: " + userId);
            return false;
        }

        const userGames = userObj.games;
        if (userGames.includes(gameId)) {
            console.log("Game already in user: " + gameId);
            return false;
        } 

        // Add user to game
        gamePlayers.push({
            id: userId,
            entries: []
        });
        const res = await games.updateOne(
            { _id: new ObjectId(gameId) },
            { $set: { players: gamePlayers } }
        );
        if (!res.acknowledged) {
            console.log("Could not add user to game: " + gameId);
            return false;
        }  

        // Add game to user
        userGames.push(gameId.toString());
        const res2 = await users.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { games: userGames } }
        );
        if (!res2.acknowledged) {
            console.log("Could not add game to user: " + userId);
            return false;
        }

        return true;

    } catch (e) {
        console.log("Error: " + e);
        return false;
    }
}

async function removeUserFromGame(gameId, userId) {
    const gameObj = await getGameById(gameId);
    if (gameObj == null) {
        console.log("Game not found: " + gameId);
        return false;
    }

    const userObj = await getUserById(userId);
    if (userObj == null) {
        console.log("User not found: " + userId);
        return false;
    }
    
    const db = client.db("main");
    const games = db.collection("games");
    const users = db.collection("users");

    const gamePlayers = gameObj.players;
    const userGames = userObj.games;

    var change = false;

    var index = gamePlayers.findIndex(p => p.id == userId);
    if (index != -1) {
        gamePlayers.splice(index, 1);
        await games.updateOne(
            { _id: new ObjectId(gameId) },
            { $set: { players: gamePlayers } }
        );
        change = true;
    }

    if (userGames.includes(gameId)) {
        userGames.splice(userGames.indexOf(gameId), 1);
        await users.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { games: userGames } }
        )
        change = true;
    }

    return change;
}

async function addEntryToGame(gameId, userId, amount) {
    const gameObj = await getGameById(gameId);
    if (gameObj == null) {
        console.log("Game not found!");
        return false;
    }

    if (!gameHasPlayer(gameObj, userId)) {
        console.log("Player is not in game");
        return false;
    }

    var players = gameObj.players;
    const index = players.findIndex(p => p.id == userId);
    players[index].entries.push({
        date: new Date(),
        amount: amount
    });

    try {
        const db = client.db("main");
        const games = db.collection("games");

        const res = await games.updateOne(
            { _id: new ObjectId(gameId) },
            { $set: { players: players } }
        );

        return res.acknowledged;
    } catch(e) {
        console.log("ERROR: " + e);
        return false;
    }
}

module.exports = {
    openConnection, closeConnection,
    createUser, verifyAccount, getUnverfiedUserByEmail, getUserByEmail,
    storeRefreshToken, getRefreshToken, removeRefreshTokenByUserId,
    getUserById,
    createGame, deleteGame,
    getGameById, getGameByJoinCode, setGameAdmin, addUserToGame, removeUserFromGame,
    addEntryToGame
}