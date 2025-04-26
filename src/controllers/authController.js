const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const db = require("../utils/database.js");
const tokenHandler = require("../utils/tokenHandler.js");
const { sendVerificationLink } = require("../utils/email.js");


const registerUser = async (req, res) => {

    const { email, username, password } = req.body;
    if (!email || !username || !password) {
        return res.status(400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userCreationInfo = await db.createUser(username, email.toLowerCase(), hashedPassword);

    if (userCreationInfo.acknowledged) {
        const data = {
            token: userCreationInfo.token
        };

        const options = {
            expiresIn: "24h"
        };

        const token = jwt.sign(data, process.env.JWT_SECRET_KEY, options);

        sendVerificationLink(username, "bertilfrigaard@gmail.com", token); //temporary fixed email.. only for testing
        return res.sendStatus(201); //Everything went good
    } else if (userCreationInfo.errorType === 0) {
        return res.sendStatus(409); // User already exists
    } else {
        return res.sendStatus(500); // Other error in user creation
    } 
    
}

const verifyUser = async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.sendStatus(400); // Bad content
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded) {
        return res.sendStatus(403); // Forbidden
    }

    const userVerificationInfo = await db.verifyAccount(decoded.token);
    if (userVerificationInfo) {
        return res.send("Your account has been verified");
    } else {
        return res.send("Your account could not be verified. Please try again later.");
    }
}

const loginUser = async (req, res) => {

    const { email, password } = req.body;
    if (!email || !password) {
       return res.sendStatus(400);
    }

   const userObj = await db.getUserByEmail(email);
   const userId = userObj?._id.toString();

   if (userObj == null || userId == null) {
       const unverifiedUserObj = await db.getUnverfiedUserByEmail(email, { userObj: 0 });

       if (unverifiedUserObj != null) {
           return res.sendStatus(403); // User exists but is not verified
       }

       return res.sendStatus(401); // User does not exist
   }  else {
       const result = await bcrypt.compare(password, userObj.passwordHash);
       if (result) {

           const refreshToken = tokenHandler.generateRefreshToken();
           const hashedRefreshToken = await tokenHandler.hashRefreshToken(refreshToken);
           if (!hashedRefreshToken) {
               return res.sendStatus(500); // Error: hashed refresh_token was null
           }

           const saveRefreshTokenResult = await db.storeRefreshToken(userObj._id, hashedRefreshToken, tokenHandler.getExpirationDate());
           if (!saveRefreshTokenResult) {
               return res.sendStatus(500); // Could not save refresh_token hash in db
           }

           const accessToken = tokenHandler.generateAccessToken(userId, process.env.JWT_SECRET_KEY);
           if (!accessToken) {
               return res.sendStatus(500); // Could not create access_token
           }

           return res.status(200).json({ userId: userId, accessToken: accessToken, refreshToken: refreshToken });
       } else {
           return res.sendStatus(401); // Password is incorrect
       }
   }
}

const refreshSession = async (req, res) => {
    const { refreshToken, userId } = req.body;
    if (!refreshToken || !userId) {
        return res.sendStatus(400); // Bad content
    }

    const tokenEntry = await db.getRefreshToken(userId);
    if (!tokenEntry) {
        return res.sendStatus(404); // Unauthorized
    }

    if (!new ObjectId(userId).equals(tokenEntry.userId)) {
        return res.sendStatus(403); // Forbidden
    }

    const result = await tokenHandler.checkRefreshToken(refreshToken, tokenEntry.tokenHash);
    if (result) {
        const newAccessToken = tokenHandler.generateAccessToken(userId, process.env.JWT_SECRET_KEY);
        return res.status(200).json({ accessToken: newAccessToken });
    } else {
        return res.sendStatus(403); // Forbidden
    }
}

const logoutUser = async (req, res) => {
    const userId = req.user; // From middleware
    if (!userId) {
        return res.sendStatus(400); // Bad content
    }

    const result = await db.removeRefreshTokenByUserId(userId);
    if (result) {
        return res.sendStatus(200); // Logout successful
    } else {
        return res.sendStatus(500); // Logout failed
    }
}


module.exports = {
    registerUser, verifyUser, loginUser, refreshSession, logoutUser
}