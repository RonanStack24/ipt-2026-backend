import nodemailer from 'nodemailer';
import config from '../config';
import { Resend } from 'resend';

export default async function sendEmail({ to, subject, html, from = config.emailFrom }: any) {
    const hasResend = !!process.env.RESEND_API_KEY;

    // Override 'to' address for Resend onboarding restrictions
    if (hasResend && from === 'onboarding@resend.dev') {
        console.log(`Resend onboarding restriction: Overriding recipient from ${to} to bryllandomarecigan@gmail.com`);
        to = 'bryllandomarecigan@gmail.com';
    }

    if (hasResend) {
        return await sendWithResend({ to, subject, html, from });
    }

    const transporter = nodemailer.createTransport(config.smtpOptions);
    await transporter.sendMail({ from, to, subject, html });
}

async function sendWithResend({ to, subject, html, from }: any) {
    const resend = new Resend(process.env.RESEND_API_KEY);
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