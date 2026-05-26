const Notification = require('../models/Notification');

const sendOutlookNotification = require('./outlookService');

const createNotification = async ({
  title,
  message,
  type = 'info',
  recipient = null,
  relatedInquiry = null,
  relatedProject = null,
  sendEmail = false,
  emailTo = null,
}) => {
  // Save notification in DB
  const notification =
    await Notification.create({
      title,
      message,
      type,
      recipient,
      relatedInquiry,
      relatedProject,
    });

  // Send Outlook Email
  if (sendEmail && emailTo) {
    await sendOutlookNotification({
      to: emailTo,

      subject: title,

      html: `
        <h2>${title}</h2>
        <p>${message}</p>
      `,
    });
  }

  return notification;
};

module.exports =
  createNotification;