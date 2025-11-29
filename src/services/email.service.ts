
import { Injectable } from '@angular/core';

interface OTPRecord {
    otp: string;
    email: string;
    createdAt: number;
    expiresAt: number;
}

@Injectable({
    providedIn: 'root'
})
export class EmailService {
    private otpStore = new Map<string, OTPRecord>();
    private readonly OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

    constructor() { }

    /**
     * Generates a 6-digit OTP
     */
    private generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Sends an OTP to the specified email address
     * In production, integrate with SendGrid, AWS SES, or similar service
     */
    sendPasswordResetOTP(email: string): { success: boolean; message: string } {
        const cleanEmail = email.trim().toLowerCase();

        // Generate OTP
        const otp = this.generateOTP();
        const now = Date.now();

        // Store OTP
        this.otpStore.set(cleanEmail, {
            otp,
            email: cleanEmail,
            createdAt: now,
            expiresAt: now + this.OTP_EXPIRY_MS
        });

        // Simulate email sending (log to console in dev mode)
        console.log('═══════════════════════════════════════════════');
        console.log('📧 PASSWORD RESET EMAIL');
        console.log('═══════════════════════════════════════════════');
        console.log(`To: ${cleanEmail}`);
        console.log(`Subject: Password Reset OTP for IIMA CV Day Portal`);
        console.log('');
        console.log(`Your OTP code is: ${otp}`);
        console.log('');
        console.log('This code will expire in 10 minutes.');
        console.log('If you did not request this, please ignore this email.');
        console.log('═══════════════════════════════════════════════');

        return {
            success: true,
            message: 'OTP sent successfully. Check your email.'
        };
    }

    /**
     * Verifies an OTP for a given email
     */
    verifyOTP(email: string, otp: string): { valid: boolean; message: string } {
        const cleanEmail = email.trim().toLowerCase();
        const cleanOTP = otp.trim();

        const record = this.otpStore.get(cleanEmail);

        if (!record) {
            return {
                valid: false,
                message: 'No OTP found for this email. Please request a new one.'
            };
        }

        const now = Date.now();

        if (now > record.expiresAt) {
            this.otpStore.delete(cleanEmail);
            return {
                valid: false,
                message: 'OTP has expired. Please request a new one.'
            };
        }

        if (record.otp !== cleanOTP) {
            return {
                valid: false,
                message: 'Invalid OTP. Please try again.'
            };
        }

        // Valid OTP
        return {
            valid: true,
            message: 'OTP verified successfully.'
        };
    }

    /**
     * Clears the OTP for an email (called after successful password reset)
     */
    clearOTP(email: string): void {
        const cleanEmail = email.trim().toLowerCase();
        this.otpStore.delete(cleanEmail);
    }

    /**
     * Check if OTP exists and is not expired
     */
    hasValidOTP(email: string): boolean {
        const cleanEmail = email.trim().toLowerCase();
        const record = this.otpStore.get(cleanEmail);

        if (!record) return false;

        const now = Date.now();
        return now <= record.expiresAt;
    }
}
