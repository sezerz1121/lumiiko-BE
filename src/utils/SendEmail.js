import nodemailer from 'nodemailer';
import dotenv from "dotenv";

dotenv.config();

/**
 * Sends an email using NodeMailer
 * @param {Object} options
 * @param {string} options.to - Recipient email address(es)
 * @param {string} options.subject - Subject
 * @param {string} [options.text] - Plain text
 * @param {string} [options.html] - HTML content
 * @returns {Promise<Object>}
 */
export async function sendEmail({ to, subject, text = '', html = '' }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const fromEmail = process.env.EMAIL_USER;

  const mailOptions = {
    from: `"Lumiiko CONTACT FORM" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId, 'to', to);
    return info;
  } catch (error) {
    console.error('❌ Error sending email to', to, error);
    throw error;
  }
}

/**
 * Send 2 emails in parallel
 */
export async function sendTwoEmails(email1, email2) {
  try {
    await Promise.all([
      sendEmail(email1),
      sendEmail(email2),
    ]);
    console.log('✅ Both emails sent successfully!');
  } catch (error) {
    console.error('❌ Error sending one or both emails:', error);
    throw error;
  }
}
