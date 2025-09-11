interface RateLimitData {
  count: number;
  windowStart: Date;
  lastAttempt: Date;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  cooldownMs?: number; // Additional cooldown period
}

class RateLimiter {
  private store = new Map<string, RateLimitData>();

  // Rate limit configs
  private readonly configs = {
    forgotPasswordByIP: { windowMs: 60000, maxRequests: 5 }, // 5 per minute per IP
    forgotPasswordByEmail: { windowMs: 60000, maxRequests: 3, cooldownMs: 60000 }, // 3 per minute per email, 1 min cooldown
    verifyOtpByIP: { windowMs: 60000, maxRequests: 10 }, // 10 per minute per IP  
    verifyOtpByEmail: { windowMs: 60000, maxRequests: 5 }, // 5 per minute per email
  };

  private getKey(type: keyof typeof this.configs, identifier: string): string {
    return `${type}:${identifier}`;
  }

  isRateLimited(type: keyof typeof this.configs, identifier: string): { limited: boolean; retryAfter?: number } {
    const config = this.configs[type];
    const key = this.getKey(type, identifier);
    const now = new Date();
    
    let data = this.store.get(key);
    
    if (!data || now.getTime() - data.windowStart.getTime() >= config.windowMs) {
      // New window or no data
      data = {
        count: 1,
        windowStart: now,
        lastAttempt: now
      };
      this.store.set(key, data);
      return { limited: false };
    }

    // Check cooldown period if configured
    if ('cooldownMs' in config && config.cooldownMs) {
      const cooldownEnd = data.lastAttempt.getTime() + config.cooldownMs;
      if (now.getTime() < cooldownEnd) {
        return { 
          limited: true, 
          retryAfter: Math.ceil((cooldownEnd - now.getTime()) / 1000) 
        };
      }
    }

    // Check rate limit
    if (data.count >= config.maxRequests) {
      const windowEnd = data.windowStart.getTime() + config.windowMs;
      return { 
        limited: true, 
        retryAfter: Math.ceil((windowEnd - now.getTime()) / 1000) 
      };
    }

    // Increment count
    data.count++;
    data.lastAttempt = now;
    this.store.set(key, data);
    
    return { limited: false };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = new Date();
    const maxAge = Math.max(
      ...Object.values(this.configs).map(c => c.windowMs + (('cooldownMs' in c) ? c.cooldownMs || 0 : 0))
    );

    const entries = Array.from(this.store.entries());
    for (const [key, data] of entries) {
      if (now.getTime() - data.windowStart.getTime() > maxAge) {
        this.store.delete(key);
      }
    }
  }

  // Get retry after seconds for a specific rate limit
  getRetryAfter(type: keyof typeof this.configs, identifier: string): number | null {
    const result = this.isRateLimited(type, identifier);
    return result.limited ? result.retryAfter || null : null;
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);