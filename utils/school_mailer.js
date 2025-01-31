const nodemailer = require("nodemailer");
require("dotenv").config;
const EventEmitter = require('events');

class EmailQueue extends EventEmitter {
    constructor(rateLimit = 50, ratePeriod = 60000) {
        super();
        this.queue = [];
        this.processing = false;
        this.rateLimit = rateLimit;
        this.ratePeriod = ratePeriod;
        this.tokens = rateLimit;
        this.lastRefill = Date.now();
    }

    async addToQueue(emailData) {
        this.queue.push({
            ...emailData,
            retries: 0,
            maxRetries: 3
        });
        if (!this.processing) {
            this.processQueue();
        }
    }

    refillTokens() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const tokensToAdd = Math.floor(timePassed / this.ratePeriod) * this.rateLimit;
        this.tokens = Math.min(this.rateLimit, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        this.refillTokens();

        if (this.tokens > 0) {
            const emailData = this.queue.shift();
            this.tokens--;

            try {
                await this.sendEmail(emailData);
                this.emit('emailSent', { success: true, emailData });
            } catch (error) {
                if (emailData.retries < emailData.maxRetries) {
                    emailData.retries++;
                    this.queue.push(emailData);
                    this.emit('emailRetry', { error, emailData });
                } else {
                    this.emit('emailError', { error, emailData });
                }
            }
        }

        setTimeout(() => this.processQueue(), 1000);
    }

    async sendEmail(emailData) {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            service: "gmail",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASS,
            },
        });

        return await transporter.sendMail({
            from: process.env.EMAIL,
            to: emailData.email,
            subject: emailData.subject,
            html: emailData.html
        });
    }
}

const emailQueue = new EmailQueue();

emailQueue.on('emailSent', ({ emailData }) => {
    console.log(`Email sent successfully to ${emailData.email}`);
});

emailQueue.on('emailRetry', ({ error, emailData }) => {
    console.log(`Retrying email to ${emailData.email}. Attempt ${emailData.retries}. Error: ${error.message}`);
});

emailQueue.on('emailError', ({ error, emailData }) => {
    console.error(`Failed to send email to ${emailData.email} after ${emailData.maxRetries} attempts. Error: ${error.message}`);
});
const sendmailSchool = async (email, schoolCode, password, subject) => {
    const html = ` <p style="font-size: 16px;">Hi there,</p>
        <p style="font-size: 16px;">Thank you for using our service. Here are your login credentials:</p>
        <p style="font-size: 25px; letter-spacing: 2px; color: lightgreen;"><strong>SchoolCode: ${schoolCode}</strong></p>
        <p style="font-size: 25px; letter-spacing: 2px; color: lightgreen;"><strong>Password: ${password}</strong></p>
        <p style="font-size: 16px;">Please do not share these login credentials with anyone.</p>
        <p style="font-size: 16px;">Best regards,</p>
        <p style="font-size: 16px;">Team SchoolSphere</p>`;

    await emailQueue.addToQueue({
        email,
        subject,
        html
    });
};

module.exports = sendmailSchool;