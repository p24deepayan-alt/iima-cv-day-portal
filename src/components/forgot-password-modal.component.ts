
import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

type ForgotPasswordStep = 'email' | 'otp' | 'password';

@Component({
    selector: 'app-forgot-password-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <!-- Modal Backdrop -->
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="handleBackdropClick($event)">
      
      <!-- Modal Content -->
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 relative" (click)="$event.stopPropagation()">
        
        <!-- Close Button -->
        <button 
          (click)="close.emit()" 
          class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
          <i class="fas fa-times text-xl"></i>
        </button>

        <!-- Header -->
        <div class="mb-6">
          <div class="w-16 h-16 bg-iima-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-key text-2xl text-iima-blue"></i>
          </div>
          <h2 class="text-2xl font-serif font-bold text-center text-slate-800">Reset Password</h2>
          <p class="text-sm text-slate-500 text-center mt-2">
            {{ getStepDescription() }}
          </p>
        </div>

        <!-- Step Indicator -->
        <div class="flex items-center justify-center mb-8 gap-2">
          <div class="flex items-center">
            <div [class.bg-iima-blue]="currentStep() === 'email' || stepCompleted.email" 
                 [class.bg-slate-300]="currentStep() !== 'email' && !stepCompleted.email"
                 class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold">
              @if (stepCompleted.email) {
                <i class="fas fa-check"></i>
              } @else {
                1
              }
            </div>
          </div>
          <div class="w-12 h-0.5" [class.bg-iima-blue]="stepCompleted.otp" [class.bg-slate-300]="!stepCompleted.otp"></div>
          <div class="flex items-center">
            <div [class.bg-iima-blue]="currentStep() === 'otp' || stepCompleted.otp" 
                 [class.bg-slate-300]="currentStep() !== 'otp' && !stepCompleted.otp"
                 class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold">
              @if (stepCompleted.otp) {
                <i class="fas fa-check"></i>
              } @else {
                2
              }
            </div>
          </div>
          <div class="w-12 h-0.5" [class.bg-iima-blue]="stepCompleted.password" [class.bg-slate-300]="!stepCompleted.password"></div>
          <div class="flex items-center">
            <div [class.bg-iima-blue]="currentStep() === 'password'" 
                 [class.bg-slate-300]="currentStep() !== 'password'"
                 class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold">
              3
            </div>
          </div>
        </div>

        <!-- Step 1: Email Input -->
        @if (currentStep() === 'email') {
          <form [formGroup]="emailForm" (ngSubmit)="submitEmail()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Address</label>
              <input 
                type="email" 
                formControlName="email" 
                class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none"
                placeholder="user@iima.ac.in"
                autofocus>
            </div>

            @if (errorMsg()) {
              <div class="p-3 bg-red-50 text-iima-red text-sm border-l-4 border-iima-red">
                <i class="fas fa-exclamation-circle mr-2"></i>{{ errorMsg() }}
              </div>
            }

            <button 
              type="submit" 
              [disabled]="isLoading()"
              class="w-full bg-iima-blue hover:bg-iima-blueHover text-white font-bold py-3 px-4 rounded-sm shadow-md transition-colors uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isLoading()) {
                <i class="fas fa-spinner fa-spin mr-2"></i>Sending...
              } @else {
                Send OTP
              }
            </button>
          </form>
        }

        <!-- Step 2: OTP Input -->
        @if (currentStep() === 'otp') {
          <form [formGroup]="otpForm" (ngSubmit)="submitOTP()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Enter OTP</label>
              <input 
                type="text" 
                formControlName="otp" 
                maxlength="6"
                class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                autofocus>
              <p class="text-xs text-slate-500 mt-2">Check your email for the 6-digit code (or console in dev mode)</p>
            </div>

            @if (errorMsg()) {
              <div class="p-3 bg-red-50 text-iima-red text-sm border-l-4 border-iima-red">
                <i class="fas fa-exclamation-circle mr-2"></i>{{ errorMsg() }}
              </div>
            }

            <div class="flex gap-3">
              <button 
                type="button"
                (click)="resendOTP()"
                [disabled]="isLoading()"
                class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 px-4 rounded-sm transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Resend OTP
              </button>
              <button 
                type="submit" 
                [disabled]="isLoading()"
                class="flex-1 bg-iima-blue hover:bg-iima-blueHover text-white font-bold py-3 px-4 rounded-sm shadow-md transition-colors uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                @if (isLoading()) {
                  <i class="fas fa-spinner fa-spin mr-2"></i>Verifying...
                } @else {
                  Verify
                }
              </button>
            </div>
          </form>
        }

        <!-- Step 3: New Password -->
        @if (currentStep() === 'password') {
          <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">New Password</label>
              <input 
                type="password" 
                formControlName="newPassword" 
                class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none"
                placeholder="Enter new password"
                autofocus>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Confirm Password</label>
              <input 
                type="password" 
                formControlName="confirmPassword" 
                class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none"
                placeholder="Re-enter password">
            </div>

            @if (errorMsg()) {
              <div class="p-3 bg-red-50 text-iima-red text-sm border-l-4 border-iima-red">
                <i class="fas fa-exclamation-circle mr-2"></i>{{ errorMsg() }}
              </div>
            }

            <button 
              type="submit" 
              [disabled]="isLoading()"
              class="w-full bg-iima-red hover:bg-iima-redHover text-white font-bold py-3 px-4 rounded-sm shadow-md transition-colors uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isLoading()) {
                <i class="fas fa-spinner fa-spin mr-2"></i>Resetting...
              } @else {
                Reset Password
              }
            </button>
          </form>
        }

      </div>
    </div>
  `
})
export class ForgotPasswordModalComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);

    close = output<void>();

    currentStep = signal<ForgotPasswordStep>('email');
    errorMsg = signal<string>('');
    isLoading = signal<boolean>(false);
    userEmail = '';

    stepCompleted = {
        email: false,
        otp: false,
        password: false
    };

    emailForm: FormGroup;
    otpForm: FormGroup;
    passwordForm: FormGroup;

    constructor() {
        this.emailForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });

        this.otpForm = this.fb.group({
            otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
        });

        this.passwordForm = this.fb.group({
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required]
        });
    }

    getStepDescription(): string {
        switch (this.currentStep()) {
            case 'email':
                return 'Enter your email to receive a password reset code';
            case 'otp':
                return 'Enter the 6-digit code sent to your email';
            case 'password':
                return 'Create your new password';
            default:
                return '';
        }
    }

    handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            this.close.emit();
        }
    }

    submitEmail() {
        if (this.emailForm.invalid) {
            this.errorMsg.set('Please enter a valid email address.');
            return;
        }

        this.isLoading.set(true);
        this.errorMsg.set('');
        this.userEmail = this.emailForm.value.email;

        const result = this.authService.requestPasswordReset(this.userEmail);

        setTimeout(() => {
            this.isLoading.set(false);
            if (result.success) {
                this.stepCompleted.email = true;
                this.currentStep.set('otp');
                this.notificationService.showSuccess('OTP Sent', result.message);
            } else {
                this.errorMsg.set(result.message);
            }
        }, 500);
    }

    resendOTP() {
        this.isLoading.set(true);
        this.errorMsg.set('');

        const result = this.authService.requestPasswordReset(this.userEmail);

        setTimeout(() => {
            this.isLoading.set(false);
            if (result.success) {
                this.notificationService.showSuccess('OTP Resent', 'A new OTP has been sent to your email.');
            } else {
                this.errorMsg.set(result.message);
            }
        }, 500);
    }

    submitOTP() {
        if (this.otpForm.invalid) {
            this.errorMsg.set('Please enter a valid 6-digit OTP.');
            return;
        }

        this.isLoading.set(true);
        this.errorMsg.set('');

        const otp = this.otpForm.value.otp;
        const result = this.authService.verifyResetOTP(this.userEmail, otp);

        setTimeout(() => {
            this.isLoading.set(false);
            if (result.valid) {
                this.stepCompleted.otp = true;
                this.currentStep.set('password');
                this.notificationService.showSuccess('OTP Verified', 'Please enter your new password.');
            } else {
                this.errorMsg.set(result.message);
            }
        }, 500);
    }

    submitPassword() {
        if (this.passwordForm.invalid) {
            this.errorMsg.set('Please fill in all fields correctly.');
            return;
        }

        const newPass = this.passwordForm.value.newPassword;
        const confirmPass = this.passwordForm.value.confirmPassword;

        if (newPass !== confirmPass) {
            this.errorMsg.set('Passwords do not match.');
            return;
        }

        if (newPass.length < 6) {
            this.errorMsg.set('Password must be at least 6 characters long.');
            return;
        }

        this.isLoading.set(true);
        this.errorMsg.set('');

        const result = this.authService.resetPassword(this.userEmail, newPass);

        setTimeout(() => {
            this.isLoading.set(false);
            if (result.success) {
                this.stepCompleted.password = true;
                this.notificationService.showSuccess('Password Reset', result.message);
                this.close.emit();
            } else {
                this.errorMsg.set(result.message);
            }
        }, 500);
    }
}
