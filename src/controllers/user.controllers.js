import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import dotenv from "dotenv";
import { sendEmail } from "../utils/SendEmail.js";
import { google } from "googleapis";


dotenv.config();

// 📊 Google Sheets Setup

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = "Sheet1";
const BASE_NUMBER = 42371; // starting base number

// 🔑 Auth Helper (reusable)
const getSheetsClient = () => {
  const credentials = JSON.parse(process.env.credentials);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
};

// 📨 SendEmail Controller
const SendEmail = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, requirements } = req.body;

  if (!name || !subject || !phone || !email || !requirements) {
    throw new ApiError(400, "All fields are required.");
  }

  // ---------------- EMAIL OPTIONS ----------------
  const emailOptions = {
    to: process.env.EMAIL_TO_SEND,
    subject: `📩 New message from ${name}`,
    text: `
📨 New Contact Form Submission:

👤 Name:  ${name}
📱 Phone: ${phone}
📧 Email: ${email}

📝 Message:
${requirements}
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">📨 New Contact Form Submission</h2>
        <p><strong>👤 Name:</strong> ${name}</p>
        <p><strong>📱 Phone:</strong> ${phone}</p>
        <p><strong>📧 Email:</strong> ${email}</p>
        <p><strong>📝 Message:</strong><br/>${requirements}</p>
      </div>
    `.trim(),
  };

  const sendResult = await sendEmail(emailOptions);
  if (!sendResult) throw new ApiError(500, "Failed to send email.");

  // ---------------- FORMAT DATETIME ----------------
  const formattedDateTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // ---------------- SAVE TO GOOGLE SHEET ----------------
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID, // use only SPREADSHEET_ID
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[name, phone, email, subject, requirements, formattedDateTime]],
      },
    });
  } catch (err) {
    console.error("❌ Failed to save data to Google Sheets:", err.message);
  }

  return res.status(200).json(new ApiResponse(200, "Email sent and data saved ✅"));
});


export { SendEmail };