import nodemailer from 'nodemailer';
import dotenv from "dotenv";

dotenv.config();
/**
 * Sends an email using NodeMailer
 * @param {Object} options - Email sending options
 * @param {string} options.to - Recipient email address(es)
 * @param {string} options.subject - Subject of the email
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.html] - HTML content
 * @returns {Promise<Object>} - Info about the sent email
 */
export async function sendEmail({ to, subject, text = '', html = '' }) {
  // Configure transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER ,
      pass: process.env.EMAIL_PASS ,
    },
  });

  const fromEmail = process.env.EMAIL_USER 

  const mailOptions = {
    from: `"HC BROTHERS CONTACT FROM" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}
