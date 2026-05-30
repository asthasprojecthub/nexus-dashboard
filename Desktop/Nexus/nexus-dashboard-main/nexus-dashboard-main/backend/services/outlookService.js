// ─────────────────────────────────────────────────────────────────────────────
// backend/services/outlookService.js  — FIXED (full replacement)
//
// Bug fix applied:
//   [L2] Removed console.log(process.env.OUTLOOK_EMAIL) and
//        console.log(process.env.OUTLOOK_PASS) that were printing credentials
//        to stdout on every server start.
// ─────────────────────────────────────────────────────────────────────────────

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   'smtp.office365.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.OUTLOOK_EMAIL,
    pass: process.env.OUTLOOK_PASS,
  },
});

const sendOutlookNotification = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from:    process.env.OUTLOOK_EMAIL,
      to,
      subject,
      html,
    });
    console.log('Outlook email sent to:', to);
  } catch (error) {
    console.error('[outlookService] Failed to send email:', error.message);
  }
};

module.exports = sendOutlookNotification;
