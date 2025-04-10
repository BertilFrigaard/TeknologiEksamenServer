//Require first to ensure dotenv is loaded before any other code
require("dotenv").config();

const app = require('./app');
const PORT = process.env.PORT || 3000;
const WEBSITE = process.env.WEBSITE || "http://localhost";

app.listen(PORT, () => {
    console.log(`Server now running on ${WEBSITE}:${PORT}`);
});

process.on('SIGINT', async () => {
    await db.closeConnection();
    process.exit(0); // Exit the server gracefully
});