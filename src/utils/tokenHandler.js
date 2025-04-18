const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Refresh token

function generateRefreshToken() {
    return crypto.randomBytes(64).toString("hex");
}

async function hashRefreshToken(token) {
    try {
        const hash = await bcrypt.hash(token, 10);
        return hash;
    } catch (e) {
        console.log(e);
        return null;
    }
}

async function checkRefreshToken(unhashedToken, hashedToken, expirationDate) {
    try {
        if (isRefreshTokenExpired(expirationDate)) {
            return false;
        }
        const result = await bcrypt.compare(unhashedToken, hashedToken);
        return result;
    } catch (e) {
        console.log(e);
        return false;
    }
}

function getExpirationDate() {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    return expirationDate;
}

function isRefreshTokenExpired(expirationDate) {
    const currentDate = new Date();
    return currentDate > expirationDate;
}


// Access token
function verifyAccessToken(token, secret) {
    try {
        return jwt.verify(token, secret);
    } catch (e) {
        return null;
    }
}

function generateAccessToken(userId, secret) {
    return jwt.sign(
        { userId },
        secret,
        { expiresIn: "1m" }
    )
}


module.exports = {
    generateRefreshToken,
    hashRefreshToken,
    checkRefreshToken,
    getExpirationDate,
    generateAccessToken,
    verifyAccessToken
}

