const tokenHandler = require("../utils/tokenHandler.js");

function authenticateAccessToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.sendStatus(400); // Bad content
    }

    const decodedToken = tokenHandler.verifyAccessToken(token, process.env.JWT_SECRET_KEY);
    
    if (decodedToken) {
        req.user = decodedToken.userId;
        next(); // Proceed to the next middleware or route handler
    } else {
        res.sendStatus(401); // Unauthorized
    }
}

module.exports = authenticateAccessToken;