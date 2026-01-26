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

export const sendOrderStatusNotification = async (
  email: string,
  orderNumber: number,
  customerName: string,
  status: string,
  totalAmount: number,
  cancellationReason?: string,
  validatorMessage?: string,
) => {
  const statusMessages: Record<string, string> = {
    pending: "Your order has been placed and is awaiting confirmation.",
    confirmed:
      "Great! Your order has been confirmed and we're preparing it for you.",
    processing: "Your order is being processed and packed.",
    completed:
      "Your order has been successfully delivered. Thank you for your purchase!",
    cancelled: "Your order has been cancelled.",
  };

  const statusMessage = statusMessages[status] || "";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Status Update</h2>
      <p>Dear ${customerName},</p>
      
      <p>${statusMessage}</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Order Number:</strong> #${orderNumber.toString().padStart(6, "0")}</p>
        <p><strong>Status:</strong> ${status.toUpperCase()}</p>
        <p><strong>Amount:</strong> Rs ${totalAmount.toLocaleString()}</p>
      </div>

      ${
        status === "cancelled"
          ? `
        <div style="background-color: #ffe6e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Cancellation Details:</strong></p>
          <p>${cancellationReason || "No reason provided"}</p>
          ${validatorMessage ? `<p><em>Note: ${validatorMessage}</em></p>` : ""}
        </div>
      `
          : ""
      }

      <p>Thank you for choosing Dairy Drop!</p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">This is an automated email. Please do not reply directly to this message.</p>
    </div>
  `;

  return await sendEmail(email, `Order ${orderNumber} - Status Update`, htmlContent);
};

export const sendDeliveryStatusNotification = async (
  email: string,
  orderNumber: number,
  customerName: string,
  deliveryStatus: string,
  totalAmount: number,
  deliveryPersonName?: string,
  deliveryPersonPhone?: string,
) => {
  const deliveryMessages: Record<string, string> = {
    awaiting_processing: "Your order is awaiting processing.",
    processing: "Your order is being prepared.",
    packing: "Your order is being packed.",
    packed: "Your order is packed and ready for pickup.",
    handed_to_courier: "Your order has been handed to our courier partner.",
    out_for_delivery: `Your order is out for delivery today! ${deliveryPersonName ? `Your delivery partner is ${deliveryPersonName}.` : ""}`,
    delivered: "Your order has been delivered successfully!",
    delivery_failed: "Delivery attempt failed. We will retry or contact you soon.",
  };

  const deliveryMessage = deliveryMessages[deliveryStatus] || "Delivery status updated.";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Delivery Status Update</h2>
      <p>Dear ${customerName},</p>
      
      <p>${deliveryMessage}</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Order Number:</strong> #${orderNumber.toString().padStart(6, "0")}</p>
        <p><strong>Delivery Status:</strong> ${deliveryStatus.replace(/_/g, " ").toUpperCase()}</p>
        <p><strong>Amount:</strong> Rs ${totalAmount.toLocaleString()}</p>
      </div>

      ${
        deliveryStatus === "out_for_delivery" && (deliveryPersonName || deliveryPersonPhone)
          ? `
        <div style="background-color: #e6f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Courier Information:</strong></p>
          ${deliveryPersonName ? `<p><strong>Name:</strong> ${deliveryPersonName}</p>` : ""}
          ${deliveryPersonPhone ? `<p><strong>Contact:</strong> ${deliveryPersonPhone}</p>` : ""}
        </div>
      `
          : ""
      }

      <p>Thank you for choosing Dairy Drop!</p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">This is an automated email. Please do not reply directly to this message.</p>
    </div>
  `;

  return await sendEmail(email, `Order ${orderNumber} - Delivery Update`, htmlContent);
};

export const sendNewCustomerCredentialsEmail = async (
  email: string,
  password: string,
  userName: string,
) => {
  const subject = "Your Dairy Drop Account Created - Login Credentials";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin: 0;">Welcome to Dairy Drop! 🎉</h2>
      </div>

      <p>Hi ${userName},</p>
      <p>Your account has been created by our administrator. Here are your login credentials:</p>

      <div style="background-color: #f4f4f4; padding: 20px; border-left: 4px solid #007bff; margin: 25px 0; border-radius: 4px;">
        <p style="margin: 10px 0;"><strong>Email:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 3px; font-family: monospace;">${email}</code></p>
        <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 3px; font-family: monospace;">${password}</code></p>
      </div>

      <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #856404; margin: 0;"><strong>⚠️ Important:</strong> For security reasons, please change your password after your first login. You can do this in your account settings.</p>
      </div>

      <p><strong>Next Steps:</strong></p>
      <ol style="color: #555;">
        <li>Go to Dairy Drop and log in with the credentials above</li>
        <li>Verify your email address to activate all features</li>
        <li>Update your password to something secure</li>
        <li>Start shopping!</li>
      </ol>

      <p>If you have any questions or need assistance, please contact our support team.</p>

      <p>Best regards,<br><strong>The Dairy Drop Team</strong></p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">This is an automated email. Please do not reply directly to this message.</p>
    </div>
  `;
  return await sendEmail(email, subject, htmlContent);
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendNewCustomerCredentialsEmail,
  sendOrderStatusNotification,
  sendDeliveryStatusNotification,
};
