/**
 * A simple rate limiter for AI service calls to avoid excessive usage
 * This is especially important for free tier API keys with strict rate limits
 */

// Store for API call counts by key and time window
type RateLimiterStore = {
  [key: string]: {
    count: number;
    lastReset: number;
  };
};

class RateLimiter {
  private store: RateLimiterStore = {};
  
  /**
   * Check if a particular operation is rate limited
   * @param key - Unique identifier for the operation type
   * @param limit - Maximum number of calls allowed in the time window
   * @param windowMs - Time window in milliseconds (default: 1 minute)
   * @returns Whether the operation is allowed or should be limited
   */
  canProceed(key: string, limit: number, windowMs: number = 60000): boolean {
    const now = Date.now();
    
    // Initialize the counter if it doesn't exist
    if (!this.store[key]) {
      this.store[key] = {
        count: 0,
        lastReset: now
      };
    }
    
    // Check if we need to reset the window
    if (now - this.store[key].lastReset > windowMs) {
      this.store[key] = {
        count: 0,
        lastReset: now
      };
    }
    
    // Check if we've exceeded the limit
    if (this.store[key].count >= limit) {
      return false;
    }
    
    // Increment the counter and allow the operation
    this.store[key].count++;
    return true;
  }
  
  /**
   * Get remaining quota for a key
   * @param key - Unique identifier for the operation type
   * @param limit - Maximum number of calls allowed in the time window
   * @returns Number of operations remaining in the current window
   */
  getRemainingQuota(key: string, limit: number): number {
    if (!this.store[key]) {
      return limit;
    }
    
    return Math.max(0, limit - this.store[key].count);
  }
  
  /**
   * Reset counter for a specific key
   * @param key - Unique identifier for the operation type to reset
   */
  reset(key: string): void {
    if (this.store[key]) {
      this.store[key].count = 0;
      this.store[key].lastReset = Date.now();
    }
  }
}

// Define rate limits for different operations
// These limits are based on the DeepSeek-R1-Distill-LLama-70B model
const RATE_LIMITS = {
  // PDF processing using DeepSeek model (30 req/min, 1,000 req/day)
  PDF_PROCESSING: 30,
  
  // General insights are less expensive, allow more
  GENERAL_INSIGHTS: 20,
  
  // Custom financial questions should be limited to avoid abuse
  CUSTOM_QUESTIONS: 15,
  
  // Goal advice is less frequent, can have higher limit
  GOAL_ADVICE: 25
};

// Export a singleton instance
export const rateLimiter = new RateLimiter();

// Export rate limits for use in other services
export { RATE_LIMITS };