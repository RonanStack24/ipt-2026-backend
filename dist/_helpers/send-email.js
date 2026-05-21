"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config"));
const resend_1 = require("resend");
async function sendEmail({ to, subject, html, from = config_1.default.emailFrom, }) {
    const hasResend = !!process.env.RESEND_API_KEY;
    // Use Resend if API key is present
    if (hasResend) {
        // Resend free tier requires sending from onboarding@resend.dev unless a domain is verified
        // We force it here if it's not explicitly provided or matches the default
        const resendFrom = from === "ronanreaper@gmail.com" ? "onboarding@resend.dev" : from;
        console.log(`Sending email via Resend to ${to} from ${resendFrom}`);
        return await sendWithResend({ to, subject, html, from: resendFrom });
    }
    console.log(`Sending email via Nodemailer to ${to}`);
    const transporter = nodemailer_1.default.createTransport(config_1.default.smtpOptions);
    await transporter.sendMail({ from, to, subject, html });
}
async function sendWithResend({ to, subject, html, from }) {
    const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
    // Resend onboarding restriction: can only send to yourself if using onboarding@resend.dev
    let recipient = to;
    if (from === "onboarding@resend.dev") {
        console.log(`Resend onboarding restriction: Recipient is ${to}. Ensure this is your verified Resend email.`);
    }
    const { data, error } = await resend.emails.send({
        from,
        to: recipient,
        subject,
        html,
    });
    if (error) {
        console.error("Resend API Error:", error);
        throw new Error(`Resend Error: ${error.message}`);
    }
    console.log("Resend email sent successfully:", data === null || data === void 0 ? void 0 : data.id);
    return data;
}
