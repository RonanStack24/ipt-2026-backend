"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config"));
const resend_1 = require("resend");
async function sendEmail({ to, subject, html, from = config_1.default.emailFrom }) {
    const hasResend = !!process.env.RESEND_API_KEY;
    // Override 'to' address for Resend onboarding restrictions
    if (hasResend && from === 'onboarding@resend.dev') {
        console.log(`Resend onboarding restriction: Overriding recipient from ${to} to bryllandomarecigan@gmail.com`);
        to = 'bryllandomarecigan@gmail.com';
    }
    if (hasResend) {
        return await sendWithResend({ to, subject, html, from });
    }
    const transporter = nodemailer_1.default.createTransport(config_1.default.smtpOptions);
    await transporter.sendMail({ from, to, subject, html });
}
async function sendWithResend({ to, subject, html, from }) {
    const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html
    });
    if (error) {
        console.error('Resend API Error:', error);
        throw new Error(`Resend Error: ${error.message}`);
    }
    return data;
}
