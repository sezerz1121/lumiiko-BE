import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";

import {ApiResponse} from "../utils/ApiResponse.js";

import dotenv from "dotenv";
import { sendEmail } from "../utils/SendEmail.js";

dotenv.config();






const SendEmail = asyncHandler(async (req, res) => {
  const { FirstName, LastName, PhoneNumber, Email, Comment } = req.body;

  // Basic input validation
  if (!FirstName || !LastName || !PhoneNumber || !Email || !Comment) {
    throw new ApiError(400, "All fields are required.");
  }



  const emailOptions = {
  to: process.env.EMAIL_TO_SEND, // 📬 Your receiving email from env
  subject: `📩 New message from ${FirstName} ${LastName}`,

  text: `
📨 New Contact Form Submission:

👤 Name:  ${FirstName} ${LastName}
📱 Phone: ${PhoneNumber}
📧 Email: ${Email}

📝 Message:
${Comment}
  `.trim(),

  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #007BFF;">📨 New Contact Form Submission</h2>
      <p><strong>👤 Name:</strong> ${FirstName} ${LastName}</p>
      <p><strong>📱 Phone:</strong> ${PhoneNumber}</p>
      <p><strong>📧 Email:</strong> ${Email}</p>
      <p><strong>📝 Message:</strong><br/>${Comment}</p>
    </div>
  `.trim(),
};


  const sendResult = await sendEmail(emailOptions);

  if (!sendResult) {
    throw new ApiError(500, "Failed to send email.");
  }

  return res.status(200).json(
    new ApiResponse(200, "Email sent successfully ✅")
  );
});

export 
{
   SendEmail,
}