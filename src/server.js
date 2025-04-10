//Require first to ensure dotenv is loaded before any other code
require("dotenv").config();

const db = require("./utils/database.js");
const app = require("./app");
const PORT = process.env.PORT || 3000;
const WEBSITE = process.env.WEBSITE || "http://localhost";

app.listen(PORT, () => {
    db.openConnection(); // Open the database connection when the server starts
    console.log(`Server now running on ${WEBSITE}:${PORT}`);
});

process.on('SIGINT', async () => {
    await db.closeConnection();
    process.exit(0); // Exit the server gracefully
});