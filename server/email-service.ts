import * as nodemailer from 'nodemailer';

// Create Gmail transporter with explicit SMTP configuration
const createGmailTransporter = async () => {
  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Gmail credentials not configured. Email functionality will not work.");
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    console.log('Gmail SMTP configuration verified successfully');
    return transporter;
  } catch (error) {
    console.error('Gmail SMTP configuration failed:', error);
    return null;
  }
};

let mailTransporter: nodemailer.Transporter | null = null;

// Initialize transporter asynchronously
createGmailTransporter().then((transporter) => {
  mailTransporter = transporter;
});

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private readonly fromEmail: string;

  constructor() {
    // Always use the configured Gmail address with a display name
    this.fromEmail = process.env.GMAIL_EMAIL ? `Library Management System <${process.env.GMAIL_EMAIL}>` : '';
  }

  async sendOtpEmail(
    toEmail: string,
    otp: string,
    userName?: string
  ): Promise<boolean> {
    try {
      // Check if Gmail is properly configured
      if (!mailTransporter) {
        console.error('Gmail credentials not configured. Cannot send email.');
        return false;
      }

      const htmlTemplate = this.generateOtpEmailTemplate(otp, userName);
      const textTemplate = this.generateOtpEmailText(otp, userName);

      const mailOptions = {
        from: this.fromEmail,
        to: toEmail,
        subject: 'Password Reset OTP - Library Management System',
        text: textTemplate,
        html: htmlTemplate,
      };

      await mailTransporter.sendMail(mailOptions);

      console.log(`OTP email sent successfully to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Gmail email error:', error);
      return false;
    }
  }

  private generateOtpEmailTemplate(otp: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin: 20px 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .otp-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #666;
          }
          .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">📚 Library Management System</div>
            <h1>Password Reset Request</h1>
          </div>
          
          <p>Hello ${userName ? userName : 'there'},</p>
          
          <p>You've requested to reset your password for your library account. To proceed, please use the One-Time Password (OTP) below:</p>
          
          <div class="otp-box">
            <div>Your OTP Code:</div>
            <div class="otp-code">${otp}</div>
            <div style="font-size: 14px; margin-top: 10px;">Valid for 10 minutes</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This OTP is valid for only 10 minutes</li>
              <li>It can only be used once</li>
              <li>Never share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <p>After entering this OTP, you'll be able to create a new password for your account.</p>
          
          <div class="footer">
            <p>This email was sent from the Library Management System.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOtpEmailText(otp: string, userName?: string): string {
    return `
Library Management System - Password Reset

Hello ${userName ? userName : 'there'},

You've requested to reset your password for your library account.

Your OTP Code: ${otp}

This code is valid for 10 minutes and can only be used once.

Security Notice:
- Never share this code with anyone
- If you didn't request this, please ignore this email
- After entering this OTP, you'll be able to create a new password

If you have any issues, please contact the library administration.

Library Management System
    `;
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      if (!mailTransporter) {
        console.error('Gmail credentials not configured. Cannot send email.');
        return false;
      }

      const mailOptions = {
        from: this.fromEmail, // Always use authenticated Gmail address
        to: params.to,
        subject: params.subject,
        text: params.text || '',
        html: params.html || '',
      };

      await mailTransporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Gmail email error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();