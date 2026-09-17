const nodemailer = require("nodemailer");
require("dotenv").config();

const emailUser = process.env.EMAIL_USER;
const emailPass = (
  process.env.EMAIL_PASS ||
  process.env.EMAIL_PASSWORD ||
  ""
).replace(/\s+/g, "");

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

/**
 * Send Signup Verification OTP Email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit verification code
 */
async function sendSignupOtpEmail(toEmail, otp) {
  if (!emailUser || !emailPass) {
    console.warn(
      "[Mailer Warning] EMAIL_USER or EMAIL_PASS not set in .env. Email was not sent."
    );
    return null;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #2e7d32; text-align: center; margin-bottom: 8px;">🌱 Local Farm</h2>
      <h3 style="color: #333333; text-align: center; margin-top: 0;">Welcome to Local Farm!</h3>
      <p style="color: #555555; font-size: 15px; line-height: 1.5; text-align: center;">
        Thank you for joining Local Farm! Use the 6-digit verification code below to verify your email and complete your registration:
      </p>
      
      <div style="text-align: center; margin: 28px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2e7d32; background-color: #e8f5e9; padding: 14px 28px; border-radius: 8px; border: 1px dashed #2e7d32;">
          ${otp}
        </span>
      </div>

      <p style="color: #888888; font-size: 13px; text-align: center; line-height: 1.4;">
        ⏱️ This code will expire in <strong>15 minutes</strong>.<br />
        If you did not sign up for Local Farm, please ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0 16px 0;" />

      <p style="color: #666666; font-size: 13px; text-align: center; margin: 0; line-height: 1.5;">
        Best regards,<br />
        <strong style="color: #2e7d32;">The Local Farm Development Team</strong>
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Local Farm App" <${emailUser}>`,
    to: toEmail,
    subject: "🌱 Local Farm - Verify Your Email",
    html: html,
  });

  console.log(`[Signup OTP Sent] To: ${toEmail} | Message ID: ${info.messageId}`);
  return info;
}

module.exports = {
  sendSignupOtpEmail,
  sendOtpEmail: sendSignupOtpEmail,
};
