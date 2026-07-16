const nodemailer = require('nodemailer');
require('dotenv').config();

module.exports.sendRegisterAdminMail = async (email, password) => {
    // Debugging: Check if variables are loading
    console.log("MAILER_USER:", process.env.USER_MAIL);

    const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
            user: process.env.USER_MAIL,
            pass: process.env.USER_PASS
        }
    });
    const mailOptions = {
        from: `"NihonZing" <${process.env.USER_MAIL}>`,
        to: email,
        subject: "Admin Access",
        html: `<h2>Admin Panel Access</h2><p><b>Email :</b> ${email}</p><p><b>Password :</b> ${password}</p>`,
    };

    await transport.sendMail(mailOptions);
}

module.exports.sendOTPMail = async (to, OTP) => {
    // ADD THESE TWO LINES FOR DEBUGGING
    console.log("DEBUG: Email being used:", process.env.USER_MAIL);
    console.log("DEBUG: Password Length:", process.env.USER_PASS ? process.env.USER_PASS.length : "0");

    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.USER_MAIL,
            pass: process.env.USER_PASS
        }
    });

    const mailOptions = {
        from: `"NihonZing" <${process.env.USER_MAIL}>`,
        to: to,
        subject: "Forgot Password",
        html: `<p>OTP : <b>${OTP}</b></p>`,
    };

    try {
        await transport.sendMail(mailOptions);
        console.log("OTP Sent Successfully");
    } catch (error) {
        console.error("Nodemailer Error: ", error);
        throw error;
    }
}