import nodemailer from "nodemailer";

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

/**
 * Send email to school admin with login credentials
 */
export const sendSchoolAdminCredentialsEmail = async (
  adminName: string,
  adminEmail: string,
  schoolName: string,
  generatedPassword: string,
  subscriptionPlan: string
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport(getSmtpConfig());

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .credentials { background-color: #dbeafe; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
          .plan-badge { display: inline-block; background-color: #3b82f6; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ERP Portal!</h1>
            <p>Your School Account is Ready</p>
          </div>
          <div class="content">
            <p>Dear ${adminName},</p>
            
            <p>Congratulations! Your school <strong>${schoolName}</strong> has been successfully registered on ERP Portal.</p>
            
            <h3>Your Admin Credentials:</h3>
            <div class="credentials">
              <p><strong>School Name:</strong> ${schoolName}</p>
              <p><strong>Admin Email:</strong> ${adminEmail}</p>
              <p><strong>Generated Password:</strong> <code>${generatedPassword}</code></p>
              <p><strong>Subscription Plan:</strong> <span class="plan-badge">${subscriptionPlan}</span></p>
              <p><strong>Access URL:</strong> <a href="http://localhost:5173/school-admin-login">http://localhost:5173/school-admin-login</a></p>
            </div>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Visit the admin login page using the URL above</li>
              <li>Enter your email: <strong>${adminEmail}</strong></li>
              <li>Enter the generated password</li>
              <li>Update your password after first login</li>
              <li>Start configuring your school dashboard</li>
            </ol>
            
            <h3>What You Can Do:</h3>
            <ul>
              <li>Manage students and staff</li>
              <li>Create classes and subjects</li>
              <li>Track attendance and marks</li>
              <li>Manage finances and fees</li>
              <li>And much more...</li>
            </ul>
            
            <p>If you have any questions or need support, please contact our team.</p>
            
            <p>Best regards,<br><strong>ERP Portal Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email. For support, contact support@erp-portal.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || "noreply@erp-portal.com",
      to: adminEmail,
      subject: `Welcome to ERP Portal - ${schoolName} Admin Credentials`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Admin credentials email sent to ${adminEmail}`);
  } catch (error) {
    console.error("📧 Error sending admin credentials email:", error);
    throw new Error(`Failed to send admin credentials email to ${adminEmail}`);
  }
};

/**
 * Send email to teacher with login credentials
 */
export const sendTeacherCredentialsEmail = async (
  teacherName: string,
  teacherEmail: string,
  schoolName: string,
  generatedPassword: string,
): Promise<void> => {
  try {
    // Create transporter for email
    const transporter = nodemailer.createTransport(getSmtpConfig());

    // Email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .credentials { background-color: #e7f3ff; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${schoolName}!</h1>
          </div>
          <div class="content">
            <p>Dear ${teacherName},</p>
            
            <p>We are delighted to inform you that you have been added as a teacher in our school management system.</p>
            
            <h3>Your Login Credentials:</h3>
            <div class="credentials">
              <p><strong>Email:</strong> ${teacherEmail}</p>
              <p><strong>Password:</strong> <code>${generatedPassword}</code></p>
              <p><strong>Access URL:</strong> <a href="http://localhost:8081">http://localhost:8081</a></p>
            </div>
            
            <h3>How to Login:</h3>
            <ol>
              <li>Visit the login page</li>
              <li>Select "Teacher" as the role</li>
              <li>Enter your email: <strong>${teacherEmail}</strong></li>
              <li>Enter your generated password</li>
              <li>Click "Login"</li>
            </ol>
            
            <p>If you face any issues or have questions, please contact your school administrator.</p>
            
            <p>Best regards,<br><strong>${schoolName}</strong> Administration</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email. For support, contact your school administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || "noreply@edusync.com",
      to: teacherEmail,
      subject: `Welcome to ${schoolName} - Teacher Login Credentials`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Credentials email sent to ${teacherEmail}`);
  } catch (error) {
    console.error("📧 Error sending email:", error);
    // Don't throw error - email sending failure shouldn't block teacher creation
    throw new Error(`Failed to send email to ${teacherEmail}`);
  }
};

type TeacherRoleCredentialsPayload = {
  teacherName: string;
  teacherEmail: string;
  schoolName: string;
  generatedPassword: string;
  roleName: string;
  modules: string[];
};

export const sendTeacherRoleCredentialsEmail = async ({
  teacherName,
  teacherEmail,
  schoolName,
  generatedPassword,
  roleName,
  modules,
}: TeacherRoleCredentialsPayload): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport(getSmtpConfig());

    const moduleList = modules.length
      ? `<ul>${modules.map((moduleName) => `<li>${moduleName}</li>`).join("")}</ul>`
      : "<p>No module assigned.</p>";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 620px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0f766e; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
          .credentials { background-color: #e0f2fe; padding: 14px; margin: 14px 0; border-left: 4px solid #0284c7; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0;">${schoolName} Teacher Role Assignment</h2>
          </div>
          <div class="content">
            <p>Dear ${teacherName},</p>
            <p>Your new role assignment has been created by School Admin.</p>

            <div class="credentials">
              <p><strong>Role:</strong> ${roleName}</p>
              <p><strong>Email:</strong> ${teacherEmail}</p>
              <p><strong>Generated Password:</strong> ${generatedPassword}</p>
            </div>

            <h4>Assigned Modules</h4>
            ${moduleList}

            <p>Use these credentials in the teacher portal provided by your school administrator.</p>

            <div class="footer">
              <p>This is an automated email from EduSync.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || "noreply@edusync.com",
      to: teacherEmail,
      subject: `${schoolName} - Role Credentials for ${roleName}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("📧 Error sending role credentials email:", error);
    throw new Error(`Failed to send role credentials email to ${teacherEmail}`);
  }
};

type StudentFeeReceiptEmailPayload = {
  studentName: string;
  studentEmail: string;
  className: string;
  schoolName: string;
  paymentDate: string;
  paymentType?: string;
  transactionId: string;
  amountPaid: number;
  receiptNumber: string;
  totalFee: number;
  paidAmount: number;
  pendingBalance: number;
  dueDate?: string | null;
  paymentStatus: string;
  feeComponents: Array<{ label: string; amount: number }>;
};

export const sendStudentFeeReceiptEmail = async ({
  studentName,
  studentEmail,
  className,
  schoolName,
  paymentDate,
  paymentType,
  transactionId,
  amountPaid,
  receiptNumber,
  totalFee,
  paidAmount,
  pendingBalance,
  dueDate,
  paymentStatus,
  feeComponents,
}: StudentFeeReceiptEmailPayload): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport(getSmtpConfig());

    const componentRows = feeComponents.length
      ? feeComponents
          .map(
            (component) =>
              `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${component.label}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">₹${component.amount.toFixed(2)}</td></tr>`
          )
          .join("")
      : `<tr><td style="padding:8px;border:1px solid #e5e7eb;">Tuition Fee</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">₹${totalFee.toFixed(2)}</td></tr>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; }
          .container { max-width: 680px; margin: 0 auto; padding: 24px; }
          .header { background: #0f172a; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0; }
          .content { border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px; }
          .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
          .meta-item { background: #f8fafc; padding: 12px; border-radius: 10px; }
          .section-title { margin: 24px 0 10px; font-size: 15px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0;">Fee Receipt</h2>
            <p style="margin:6px 0 0;opacity:0.85;">${schoolName}</p>
          </div>
          <div class="content">
            <p>Dear Parent/Guardian,</p>
            <p>Please find below the official fee receipt and payment summary for <strong>${studentName}</strong>.</p>

            <div class="meta">
              <div class="meta-item"><strong>Student Name:</strong><br />${studentName}</div>
              <div class="meta-item"><strong>Class:</strong><br />${className}</div>
              <div class="meta-item"><strong>Receipt Number:</strong><br />${receiptNumber}</div>
              <div class="meta-item"><strong>Transaction ID:</strong><br />${transactionId}</div>
              <div class="meta-item"><strong>Payment Date:</strong><br />${paymentDate}</div>
              <div class="meta-item"><strong>Payment Type:</strong><br />${paymentType || "cash"}</div>
              <div class="meta-item"><strong>Payment Status:</strong><br />${paymentStatus.toUpperCase()}</div>
            </div>

            <div class="section-title">Fee Components</div>
            <table>
              <thead>
                <tr>
                  <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;background:#f8fafc;">Component</th>
                  <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;background:#f8fafc;">Amount</th>
                </tr>
              </thead>
              <tbody>${componentRows}</tbody>
            </table>

            <div class="section-title">Current Fee Summary</div>
            <table>
              <tbody>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Total Fee</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">₹${totalFee.toFixed(2)}</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Amount Paid (Cumulative)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">₹${paidAmount.toFixed(2)}</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Pending Balance</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">₹${pendingBalance.toFixed(2)}</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Receipt Payment Amount</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">₹${amountPaid.toFixed(2)}</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Due Date</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${dueDate || "-"}</td></tr>
              </tbody>
            </table>

            <p class="footer">This is a system-generated fee receipt from EduSync. Please retain it for your financial records.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || "noreply@edusync.com",
      to: studentEmail,
      subject: `${schoolName} Fee Receipt - ${receiptNumber}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("📧 Error sending fee receipt email:", error);
    throw new Error(`Failed to send fee receipt email to ${studentEmail}`);
  }
};
