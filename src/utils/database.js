const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");

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
            passwordHash: passwordHash
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

module.exports = {
    openConnection, closeConnection,
    createUser, verifyAccount, getUnverfiedUserByEmail, getUserByEmail,
    storeRefreshToken, getRefreshToken, removeRefreshTokenByUserId
}