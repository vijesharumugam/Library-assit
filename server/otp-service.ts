import crypto from 'crypto';

interface OtpData {
  otp: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

interface ResetTokenData {
  email: string;
  expiresAt: number;
  used: boolean;
}

class OtpService {
  private otps = new Map<string, OtpData>();
  private resetTokens = new Map<string, ResetTokenData>();
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly RESET_TOKEN_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor() {
    // Clean up expired OTPs and tokens every 5 minutes
    setInterval(() => {
      this.cleanupExpiredData();
    }, 5 * 60 * 1000);
  }

  /**
   * Generate a 6-digit numeric OTP using cryptographically secure random
   */
  generateOtp(): string {
    // Use crypto.randomInt for cryptographically secure random number generation
    const otp = crypto.randomInt(0, 1_000_000);
    // Zero-pad to ensure 6 digits
    return otp.toString().padStart(6, '0');
  }

  /**
   * Generate a secure reset token
   */
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store OTP for email with expiration
   */
  storeOtp(email: string, otp: string): void {
    const key = email.toLowerCase();
    const expiresAt = Date.now() + (this.OTP_EXPIRY_MINUTES * 60 * 1000);
    
    this.otps.set(key, {
      otp,
      email: key,
      expiresAt,
      attempts: 0
    });

    console.log(`OTP stored for ${email}, expires at ${new Date(expiresAt).toISOString()}`);
  }

  /**
   * Verify OTP for email
   * Returns true if valid, false otherwise
   */
  verifyOtp(email: string, otp: string): boolean {
    const key = email.toLowerCase();
    const otpData = this.otps.get(key);

    if (!otpData) {
      console.log(`No OTP found for email: ${email}`);
      return false;
    }

    // Check if OTP has expired
    if (Date.now() > otpData.expiresAt) {
      console.log(`OTP expired for email: ${email}`);
      this.otps.delete(key);
      return false;
    }

    // Check for too many attempts
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      console.log(`Too many OTP attempts for email: ${email}`);
      this.otps.delete(key);
      return false;
    }

    // Increment attempts
    otpData.attempts++;

    // Check if OTP matches
    if (otpData.otp !== otp) {
      console.log(`Invalid OTP for email: ${email} (attempt ${otpData.attempts})`);
      return false;
    }

    // OTP is valid - consume it (delete it)
    this.otps.delete(key);
    console.log(`OTP successfully verified and consumed for email: ${email}`);
    return true;
  }

  /**
   * Create a reset token after successful OTP verification
   */
  createResetToken(email: string): string {
    const token = this.generateResetToken();
    const expiresAt = Date.now() + (this.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    this.resetTokens.set(token, {
      email: email.toLowerCase(),
      expiresAt,
      used: false
    });

    console.log(`Reset token created for ${email}, expires at ${new Date(expiresAt).toISOString()}`);
    return token;
  }

  /**
   * Verify and consume reset token
   * Returns email if valid, null otherwise
   */
  verifyResetToken(token: string): string | null {
    const tokenData = this.resetTokens.get(token);

    if (!tokenData) {
      console.log(`Invalid reset token: ${token}`);
      return null;
    }

    // Check if token has expired
    if (Date.now() > tokenData.expiresAt) {
      console.log(`Reset token expired: ${token}`);
      this.resetTokens.delete(token);
      return null;
    }

    // Check if token has already been used
    if (tokenData.used) {
      console.log(`Reset token already used: ${token}`);
      return null;
    }

    // Mark token as used
    tokenData.used = true;
    console.log(`Reset token successfully verified and consumed for email: ${tokenData.email}`);

    // Clean up used token after a delay to prevent replay attacks
    setTimeout(() => {
      this.resetTokens.delete(token);
    }, 60000); // Delete after 1 minute

    return tokenData.email;
  }

  /**
   * Check if an OTP exists for email (for rate limiting)
   */
  hasActiveOtp(email: string): boolean {
    const key = email.toLowerCase();
    const otpData = this.otps.get(key);
    
    if (!otpData) {
      return false;
    }

    // Check if OTP is still valid
    if (Date.now() > otpData.expiresAt) {
      this.otps.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get remaining time for OTP in seconds
   */
  getOtpRemainingTime(email: string): number {
    const key = email.toLowerCase();
    const otpData = this.otps.get(key);
    
    if (!otpData) {
      return 0;
    }

    const remaining = Math.max(0, otpData.expiresAt - Date.now());
    return Math.ceil(remaining / 1000);
  }

  /**
   * Clean up expired OTPs and reset tokens
   */
  private cleanupExpiredData(): void {
    const now = Date.now();
    let expiredOtps = 0;
    let expiredTokens = 0;

    // Clean expired OTPs
    for (const [key, otpData] of Array.from(this.otps.entries())) {
      if (now > otpData.expiresAt) {
        this.otps.delete(key);
        expiredOtps++;
      }
    }

    // Clean expired reset tokens
    for (const [token, tokenData] of Array.from(this.resetTokens.entries())) {
      if (now > tokenData.expiresAt) {
        this.resetTokens.delete(token);
        expiredTokens++;
      }
    }

    if (expiredOtps > 0 || expiredTokens > 0) {
      console.log(`Cleaned up ${expiredOtps} expired OTPs and ${expiredTokens} expired reset tokens`);
    }
  }

  /**
   * Get stats for debugging
   */
  getStats(): { activeOtps: number; activeTokens: number } {
    this.cleanupExpiredData(); // Clean first
    return {
      activeOtps: this.otps.size,
      activeTokens: this.resetTokens.size
    };
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.otps.clear();
    this.resetTokens.clear();
    console.log('All OTP and reset token data cleared');
  }
}

export const otpService = new OtpService();