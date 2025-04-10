const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendVerificationLink(recieverUsername, recieverEmail, token) {
    try {
        await transporter.sendMail({
            from: `"Comp Social" <${process.env.EMAIL_USER}>`,
            to: recieverEmail,
            subject: "Verify your CompSocial account",
            html: `
            <h>Welcome to CompSocial</h>
            <p>Username: ${recieverUsername}</p>
            <p>Click <a href="${process.env.WEBSITE}:${process.env.PORT}/auth/verifyUser?token=${token}">here</a> to verify your account</p>
            `
        });

        return true;
    } catch (e) {
        console.log("Error sending verification link: " + e);
        return false;
    }
}

module.exports = {sendVerificationLink};