function gameHasPlayer(gameObj, userId) {
    return gameObj.players.some(p => p.id == userId);
}


module.exports = {
    gameHasPlayer
}