function debugRoute(req, res, next) {
    const now = new Date();
    console.log("[" + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + "]");
    console.log("CONNECTION " + req.method + " " + req.originalUrl);
    console.log(req.body);
    next();
}

module.exports = debugRoute;