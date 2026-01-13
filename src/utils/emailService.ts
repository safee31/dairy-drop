import nodemailer from "nodemailer";
import config from "../config/env";
import { logger } from "./logger";

const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_SECURE,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD,
    },
  });
};

export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Dairy Drop" <${config.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ""),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info("Email sent:", { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error("Email sending failed:", { error });
    throw new Error("Failed to send email");
  }
};

export const sendVerificationEmail = async (
  email: string,
  otp: string,
  userName: string,
) => {
  const subject = "Verify Your Email - Dairy Drop";
  const otpExpiryMinutes = config.OTP_EXPIRY_MINUTES || 60;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Dairy Drop!</h2>
      <p>Hi ${userName},</p>
      <p>Thank you for registering with Dairy Drop. To complete your registration, please verify your email address.</p>

      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <h3 style="color: #007bff; margin: 0;">Your Verification Code</h3>
        <div style="font-size: 32px; font-weight: bold; color: #333; margin: 10px 0; letter-spacing: 5px;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in ${otpExpiryMinutes} minute${otpExpiryMinutes !== 1 ? 's' : ''}</p>
      </div>

      <p>If you didn't create an account, please ignore this email.</p>

      <p>Best regards,<br>The Dairy Drop Team</p>
    </div>
  `;
  return await sendEmail(email, subject, htmlContent);
};

export const sendPasswordResetEmail = async (
  email: string,
  otp: string,
  userName: string,
) => {
  const subject = "Password Reset Request - Dairy Drop";
  const resetTokenExpiryMinutes = config.RESET_TOKEN_EXPIRY_MINUTES || 5;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hi ${userName},</p>
      <p>We received a request to reset your password. If you didn't make this request, please ignore this email.</p>

      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <h3 style="color: #dc3545; margin: 0;">Your Reset Code</h3>
        <div style="font-size: 32px; font-weight: bold; color: #333; margin: 10px 0; letter-spacing: 5px;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in ${resetTokenExpiryMinutes} minute${resetTokenExpiryMinutes !== 1 ? 's' : ''}</p>
      </div>

      <p><strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for it.</p>

      <p>Best regards,<br>The Dairy Drop Team</p>
    </div>
  `;
  return await sendEmail(email, subject, htmlContent);
};

export const sendWelcomeEmail = async (email: string, userName: string) => {
  const subject = "Welcome to Dairy Drop!";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Dairy Drop!</h2>
      <p>Hi ${userName},</p>
      <p>Your account has been successfully created and verified. You can now start shopping with us!</p>

      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <p style="color: #155724; margin: 0;">✅ Your account is now active and ready to use!</p>
      </div>

      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

      <p>Best regards,<br>The Dairy Drop Team</p>
    </div>
  `;
  return await sendEmail(email, subject, htmlContent);
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
