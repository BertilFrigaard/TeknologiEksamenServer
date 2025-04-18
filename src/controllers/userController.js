const db = require("../utils/database.js");

const getUserById = async (req, res) => {
    userId = req.user;
    const { targetId } = req.params;

    if (!targetId) {
        return res.sendStatus(400);
    }

    var userObj;
    if (targetId == userId) {
        userObj = await db.getUserById(targetId, { passwordHash: 0 });
    } else {
        userObj = await db.getUserById(targetId, { _id: 1, username: 1 });
    }

    if (userObj == null) {
        return res.sendStatus(404);
    }

    return res.status(200).json(userObj);
}

module.exports = {
    getUserById
}