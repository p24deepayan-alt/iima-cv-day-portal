
import { Injectable, signal, inject, ApplicationRef } from '@angular/core';
import { DataService } from './data.service';
import { SecurityService } from './security.service';
import { EmailService } from './email.service';
import { User } from './types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private dataService = inject(DataService);
  private securityService = inject(SecurityService);
  private emailService = inject(EmailService);

  currentUser = signal<User | null>(null);

  // Session Management
  private idleTimeout: any;
  private readonly IDLE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 Hours
  private readonly SESSION_KEY = 'iima_active_session';

  constructor() {
    this.restoreSession();
    this.setupIdleListener();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        const now = Date.now();

        // Check if session is valid and not expired
        if (session.uid && (now - session.timestamp < this.IDLE_LIMIT_MS)) {
          const user = this.dataService.users().find(u => u.uid === session.uid);
          if (user) {
            this.currentUser.set(user);
            this.startSessionTimer();
          }
        } else {
          // Expired
          this.clearSession();
        }
      }
    } catch (e) {
      this.clearSession();
    }
  }

  login(email: string, pass: string): { success: boolean, error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Check Brute Force Lockout
    const lockout = this.securityService.checkLockout(cleanEmail);
    if (lockout.isLocked) {
      return {
        success: false,
        error: `Account locked due to excessive failed attempts. Try again in ${lockout.remainingTime} seconds.`
      };
    }

    // 2. Verify Credentials (Case insensitive email)
    const user = this.dataService.users().find(u =>
      u.email.toLowerCase() === cleanEmail && u.password === cleanPass
    );

    if (user) {
      // Success
      this.securityService.resetAttempts(cleanEmail);
      this.currentUser.set(user);
      this.saveSession(user.uid);
      this.dataService.logAction(user.uid, 'Login', 'Successful Auth');
      this.startSessionTimer();
      return { success: true };
    } else {
      // Failure
      const isNowLocked = this.securityService.recordFailedAttempt(cleanEmail);
      if (isNowLocked) {
        return { success: false, error: 'Too many failed attempts. Account locked for 5 minutes.' };
      }
      return { success: false, error: 'Invalid email or password.' };
    }
  }

  register(user: User): boolean {
    // Sanitized in DataService
    if (this.dataService.users().some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      return false;
    }
    this.dataService.addUser(user);
    return true;
  }

  logout(reason?: string) {
    const u = this.currentUser();
    if (u) {
      this.dataService.logAction(u.uid, 'Logout', reason || 'User initiated');
    }
    this.currentUser.set(null);
    this.clearSession();
    this.stopSessionTimer();
    if (reason) {
      alert(reason);
    }
  }

  // --- Session Security ---

  private saveSession(uid: string) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      uid: uid,
      timestamp: Date.now()
    }));
  }

  private clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  private startSessionTimer() {
    this.stopSessionTimer();
    this.idleTimeout = setTimeout(() => {
      if (this.currentUser()) {
        this.logout('Session expired (24h limit). Please login again.');
      }
    }, this.IDLE_LIMIT_MS);
  }

  private stopSessionTimer() {
    if (this.idleTimeout) clearTimeout(this.idleTimeout);
  }

  private setupIdleListener() {
    // Listen to user activity to reset timer
    const reset = () => {
      if (this.currentUser()) {
        // We don't fully reset the 24h absolute limit on activity, 
        // but we update the timestamp in storage to keep session alive across tabs
        // Requirement says "24 hours after logging in once", implying absolute.
        // So we keep the timer running.
      }
    };

    window.addEventListener('mousemove', reset);
    window.addEventListener('click', reset);
    window.addEventListener('keydown', reset);
    window.addEventListener('scroll', reset);
  }

  // --- Password Reset ---

  /**
   * Initiates password reset by sending OTP to user's email
   */
  requestPasswordReset(email: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = this.dataService.users().find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message: 'If the email exists, an OTP has been sent.'
      };
    }

    // Send OTP via email service
    const result = this.emailService.sendPasswordResetOTP(cleanEmail);
    this.dataService.logAction(user.uid, 'Password Reset', 'OTP Requested');

    return result;
  }

  /**
   * Verifies the OTP for password reset
   */
  verifyResetOTP(email: string, otp: string): { valid: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    return this.emailService.verifyOTP(cleanEmail, otp);
  }

  /**
   * Resets the password after OTP verification
   */
  resetPassword(email: string, newPassword: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const user = this.dataService.users().find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return {
        success: false,
        message: 'User not found.'
      };
    }

    // Update password (in a real app, hash this!)
    user.password = newPassword.trim();
    this.dataService.updateUser(user);

    // Clear OTP
    this.emailService.clearOTP(cleanEmail);

    // Log action
    this.dataService.logAction(user.uid, 'Password Reset', 'Password Changed Successfully');

    return {
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    };
  }
}
