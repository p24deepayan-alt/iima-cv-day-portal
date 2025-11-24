
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  
  // In-memory tracking for brute force (resets on page reload, but effective for session attacks)
  private loginAttempts = new Map<string, { count: number, lockoutUntil: number }>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  /**
   * Sanitize user input to prevent XSS and Injection
   */
  sanitize(input: string): string {
    if (!input) return '';
    // Remove HTML tags, script tags, and dangerous attributes
    return input
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
      .replace(/<[^>]+>/g, "") // Remove HTML tags
      .replace(/javascript:/gi, "") // Remove JS URI
      .replace(/on\w+=/gi, "") // Remove event handlers like onclick
      .trim();
  }

  sanitizeUserObject<T extends Record<string, any>>(obj: T): T {
    const cleanObj: any = { ...obj };
    for (const key in cleanObj) {
      if (typeof cleanObj[key] === 'string') {
        // Don't sanitize passwords or IDs strictly, but names/emails yes
        if (key !== 'password' && key !== 'uid' && key !== 'id') {
           cleanObj[key] = this.sanitize(cleanObj[key]);
        }
      }
    }
    return cleanObj;
  }

  /**
   * Check if an email is currently locked out due to brute force
   */
  checkLockout(email: string): { isLocked: boolean, remainingTime?: number } {
    const record = this.loginAttempts.get(email.toLowerCase());
    if (!record) return { isLocked: false };

    if (record.lockoutUntil > Date.now()) {
      return { 
        isLocked: true, 
        remainingTime: Math.ceil((record.lockoutUntil - Date.now()) / 1000) 
      };
    }
    
    // Lockout expired
    if (record.lockoutUntil > 0 && record.lockoutUntil <= Date.now()) {
       this.loginAttempts.delete(email.toLowerCase());
    }

    return { isLocked: false };
  }

  /**
   * Register a failed login attempt
   */
  recordFailedAttempt(email: string) {
    const key = email.toLowerCase();
    const record = this.loginAttempts.get(key) || { count: 0, lockoutUntil: 0 };
    
    record.count++;
    
    if (record.count >= this.MAX_ATTEMPTS) {
      record.lockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
    }

    this.loginAttempts.set(key, record);
    return record.count >= this.MAX_ATTEMPTS;
  }

  /**
   * Clear attempts on successful login
   */
  resetAttempts(email: string) {
    this.loginAttempts.delete(email.toLowerCase());
  }

  /**
   * Simple obfuscation for local storage (Not encryption, but prevents casual reading)
   */
  obfuscate(data: string): string {
     return btoa(encodeURIComponent(data));
  }

  deobfuscate(data: string): string {
    try {
      return decodeURIComponent(atob(data));
    } catch (e) {
      console.warn('Failed to deobfuscate data, returning raw');
      return data;
    }
  }
}
