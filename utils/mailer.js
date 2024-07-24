const nodemailer = require("nodemailer");
require("dotenv").config;
const sendmail = async (email, otp, subject) => {
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
        html: ` <p style="font-size: 16px;"> Hi there ,</p>
        <p style="font-size: 16px;>Thank you for using our service. To verify your identity, we have sent you a 
        one-time password (OTP).Please find your OTP below:
        </p>
        <p style="font-size: 25px; letter-spacing: 2px; color: lightgreen;" ><strong> OTP : ${otp}
        </strong><p>
        <p style="font-size: 16px;>Please do not share this OTP with anyone, as it is used to verify your identity.
        </p>
        <p style="font-size: 16px;>If you did not request this OTP, please ignore this email.Thank you for 
        choosing our service.
        </p>
        <p style="font-size: 16px;>Best regards,</p>
        <p style="font-size: 16px;>Team SchoolSphere</p>  `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } 
        else {
            console.log("Email sent:" + info.response);
        }
    });
};

module.exports = sendmail;