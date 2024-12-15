const nodemailer = require("nodemailer");
require("dotenv").config;
const sendmailSchool = async (email, schoolCode, password, subject) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASS,
        },
    });
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        html: ` <p style="font-size: 16px;">Hi there,</p>
        <p style="font-size: 16px;">Thank you for using our service. Here are your login credentials:</p>
        <p style="font-size: 25px; letter-spacing: 2px; color: lightgreen;"><strong>SchoolCode: ${schoolCode}</strong></p>
        <p style="font-size: 25px; letter-spacing: 2px; color: lightgreen;"><strong>Password: ${password}</strong></p>
        <p style="font-size: 16px;">Please do not share these login credentials with anyone.</p>
        <p style="font-size: 16px;">Best regards,</p>
        <p style="font-size: 16px;">Team SchoolSphere</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } 
        else {
            console.log(password);
            console.log("Email sent:" + info.response);
        }
    });
};

module.exports = sendmailSchool;