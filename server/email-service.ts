import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('Gmail credentials not provided. Email service will not be available.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendOTPEmail(email: string, otp: string, fullName: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Library Assist - Password Reset</h2>
        <p>Hello ${fullName},</p>
        <p>You have requested to reset your password. Use the following OTP code to verify your identity:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="font-size: 32px; color: #1f2937; letter-spacing: 4px; margin: 0;">${otp}</h1>
        </div>
        <p>This OTP is valid for 10 minutes. If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>Library Assist Team</p>
      </div>
    `;

    const mailOptions: EmailOptions = {
      to: email,
      subject: 'Password Reset OTP - Library Assist',
      html: htmlContent,
      text: `Hello ${fullName}, your password reset OTP is: ${otp}. This OTP is valid for 10 minutes.`
    };

    try {
      await this.transporter.sendMail({
        from: process.env.GMAIL_EMAIL,
        ...mailOptions
      });
      return true;
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.transporter !== null;
  }
}

export const emailService = new EmailService();