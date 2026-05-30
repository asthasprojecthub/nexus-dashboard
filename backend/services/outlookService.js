const nodemailer = require('nodemailer');
console.log(process.env.OUTLOOK_EMAIL);
console.log(process.env.OUTLOOK_PASS);
const transporter =
  nodemailer.createTransport({
    host: 'smtp.office365.com',

    port: 587,

    secure: false,

    auth: {
      user:
        process.env.OUTLOOK_EMAIL,

      pass:
        process.env.OUTLOOK_PASS,
    },
  });

const sendOutlookNotification =
  async ({
    to,
    subject,
    html,
  }) => {
    try {
      await transporter.sendMail({
        from:
          process.env.OUTLOOK_EMAIL,

        to,

        subject,

        html,
      });

      console.log(
        'Outlook email sent'
      );
    } catch (error) {
      console.error(error);
    }
  };

module.exports =
  sendOutlookNotification;