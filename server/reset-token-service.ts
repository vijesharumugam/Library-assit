import crypto from 'crypto';

interface ResetTokenData {
  token: string;
  email: string;
  expiresAt: Date;
}

class ResetTokenService {
  private tokenStore = new Map<string, ResetTokenData>();
  private readonly TOKEN_EXPIRY_MINUTES = 10; // Short-lived tokens

  generateToken(): string {
    // Generate a cryptographically secure random token
    return crypto.randomBytes(32).toString('hex');
  }

  storeToken(email: string): string {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000);

    this.tokenStore.set(token, {
      token,
      email: email.toLowerCase(),
      expiresAt
    });

    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();

    return token;
  }

  verifyAndConsumeToken(token: string): string | null {
    const tokenData = this.tokenStore.get(token);

    if (!tokenData) {
      return null;
    }

    // Check if token has expired
    if (new Date() > tokenData.expiresAt) {
      this.tokenStore.delete(token);
      return null;
    }

    // Token is valid - consume it (single-use)
    this.tokenStore.delete(token);
    return tokenData.email;
  }

  isTokenValid(token: string): boolean {
    const tokenData = this.tokenStore.get(token);
    return tokenData !== undefined && new Date() <= tokenData.expiresAt;
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    const entries = Array.from(this.tokenStore.entries());
    for (const [token, tokenData] of entries) {
      if (now > tokenData.expiresAt) {
        this.tokenStore.delete(token);
      }
    }
  }

  // For testing/debugging purposes
  getTokenInfo(token: string): ResetTokenData | undefined {
    return this.tokenStore.get(token);
  }
}

export const resetTokenService = new ResetTokenService();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  resetTokenService['cleanupExpiredTokens']();
}, 5 * 60 * 1000);