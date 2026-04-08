import nodemailer from "nodemailer";
import { loadEnvironment } from "./config/env";

loadEnvironment();

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
  };
};

const testEmailConnection = async () => {
  try {
    console.log("🔄 Testing email configuration...\n");

    // Create transporter
    const smtpConfig = getSmtpConfig();
    const transporter = nodemailer.createTransport(smtpConfig);

    console.log("SMTP Config:");
    console.log(`   - Host: ${smtpConfig.host}`);
    console.log(`   - Port: ${smtpConfig.port}`);
    console.log(`   - Secure: ${smtpConfig.secure}`);
    console.log(`   - User: ${smtpConfig.auth.user}`);

    // Verify connection
    console.log("📧 Verifying email connection...");
    await transporter.verify();
    console.log("✅ Email connection verified successfully!\n");

    // Send test email
    console.log("📨 Sending test email...");
    const testEmail = process.env.SMTP_USER || process.env.EMAIL_USER; // Send to the configured email
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER,
      to: testEmail,
      subject: "🎉 EduSync Teacher Portal - Email Test",
      html: `
        <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
            <h2 style="color: #007bff;">Email Configuration Test - SUCCESS ✅</h2>
            
            <p>Your email configuration is working correctly!</p>
            
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li><strong>SMTP Host:</strong> ${smtpConfig.host}</li>
              <li><strong>SMTP Port:</strong> ${smtpConfig.port}</li>
              <li><strong>Email Account:</strong> ${testEmail}</li>
              <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            
            <p>Teachers will now automatically receive login credentials when they are created in the system.</p>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
              This is a test email from the EduSync portal setup.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("✅ Test email sent successfully!\n");
    console.log("📬 Email Details:");
    console.log(`   - Message ID: ${info.messageId}`);
    console.log(`   - Sent to: ${testEmail}`);
    console.log(`   - Status: SUCCESS\n`);

    console.log("🎉 Email system is ready! Teachers will receive credentials when created.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Email Test Failed!\n");
    console.error("Error Details:");
    if (error instanceof Error) {
      console.error(`   - Type: ${error.name}`);
      console.error(`   - Message: ${error.message}`);
    } else {
      console.error(`   - ${error}`);
    }
    console.error("\n⚠️  Troubleshooting Tips:");
    console.error("   1. Verify EMAIL_USER and EMAIL_PASSWORD in .env are correct");
    console.error("   2. For Gmail: Use an App Password (not your regular password)");
    console.error("   3. Enable 2FA on your Gmail account if using App Passwords");
    console.error("   4. Check if your email provider blocks less secure apps");
    console.error("   5. Verify internet connection");
    process.exit(1);
  }
};

testEmailConnection();
