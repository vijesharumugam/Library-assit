interface OtpData {
  otp: string;
  email: string;
  fullName: string;
  expiresAt: Date;
  attempts: number;
}

class OtpService {
  private otpStore = new Map<string, OtpData>();
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  storeOtp(email: string, fullName: string): string {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    this.otpStore.set(email.toLowerCase(), {
      otp,
      email: email.toLowerCase(),
      fullName,
      expiresAt,
      attempts: 0
    });

    // Clean up expired OTPs periodically
    this.cleanupExpiredOtps();

    return otp;
  }

  verifyOtp(email: string, providedOtp: string): boolean {
    const otpData = this.otpStore.get(email.toLowerCase());

    if (!otpData) {
      return false;
    }

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(email.toLowerCase());
      return false;
    }

    // Check if max attempts exceeded
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(email.toLowerCase());
      return false;
    }

    // Increment attempts
    otpData.attempts++;

    // Verify OTP
    if (otpData.otp === providedOtp) {
      // Keep OTP for password reset (don't delete yet)
      return true;
    }

    // Update attempts in store
    this.otpStore.set(email.toLowerCase(), otpData);
    return false;
  }

  consumeOtp(email: string, providedOtp: string): boolean {
    const otpData = this.otpStore.get(email.toLowerCase());

    if (!otpData) {
      return false;
    }

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(email.toLowerCase());
      return false;
    }

    // Verify OTP and consume it
    if (otpData.otp === providedOtp) {
      this.otpStore.delete(email.toLowerCase());
      return true;
    }

    return false;
  }

  isOtpValid(email: string): boolean {
    const otpData = this.otpStore.get(email.toLowerCase());
    return otpData !== undefined && new Date() <= otpData.expiresAt;
  }

  private cleanupExpiredOtps(): void {
    const now = new Date();
    const entries = Array.from(this.otpStore.entries());
    for (const [email, otpData] of entries) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(email);
      }
    }
  }

  // For testing/debugging purposes
  getOtpInfo(email: string): OtpData | undefined {
    return this.otpStore.get(email.toLowerCase());
  }
}

export const otpService = new OtpService();