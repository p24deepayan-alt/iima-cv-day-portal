
import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { UserRole } from '../services/types';

type RegisterMode = 'student' | 'reviewer';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    host: { 'class': 'block h-full' },
    template: `
    <div class="h-full flex flex-col md:flex-row font-sans bg-white">
      
      <!-- Left Panel: Branding / Image -->
      <div class="hidden md:flex md:w-1/2 bg-iima-blue relative overflow-hidden items-center justify-center p-12 text-white">
         <div class="absolute inset-0 bg-[url('https://www.iima.ac.in/themes/custom/iima/images/banner-bg.jpg')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
         <div class="absolute inset-0 bg-gradient-to-br from-iima-blue via-iima-blue to-black opacity-80"></div>
         
         <div class="relative z-10 max-w-md text-center">
            <div class="w-32 h-32 bg-white rounded-sm mx-auto mb-8 flex items-center justify-center shadow-lg p-4">
               <img src="assets/iima-logo.png" alt="IIMA Logo" class="w-full h-full object-contain">
            </div>
            <h1 class="font-serif text-4xl font-bold mb-4 leading-tight">Placement Committee</h1>
            <div class="h-1 w-20 bg-iima-gold mx-auto mb-6"></div>
            <p class="text-white/80 text-lg font-light leading-relaxed">
              Welcome to the official CV Day scheduling portal. Facilitating seamless interactions between PGP1s and PGP2s.
            </p>
         </div>

         <div class="absolute bottom-8 left-0 w-full text-center text-xs text-white/30 uppercase tracking-widest">
            Vidhya Viniyogadvikas
         </div>
      </div>

      <!-- Right Panel: Form -->
      <div class="flex-1 overflow-auto bg-iima-warm relative">
        <div class="min-h-full flex items-center justify-center p-8">
          <div class="w-full max-w-md bg-white p-8 md:p-10 shadow-xl border-t-4 border-iima-red">
            
            <!-- Mobile Logo -->
            <div class="md:hidden text-center mb-8">
               <img src="assets/iima-logo.png" alt="IIMA Logo" class="h-20 mx-auto mb-4">
               <h2 class="font-serif text-2xl font-bold text-iima-blue">IIM Ahmedabad</h2>
            </div>

            <!-- Sandbox Banner -->
            @if (isDryRun()) {
              <div class="mb-6 bg-amber-100 border-l-4 border-amber-400 p-4 rounded-sm shadow-sm flex items-start gap-3">
                  <div class="text-amber-600 mt-0.5"><i class="fas fa-flask text-xl"></i></div>
                  <div>
                    <p class="text-sm text-amber-800 font-bold uppercase tracking-wide">Sandbox Mode Active</p>
                    <p class="text-xs text-amber-700 mt-1 leading-relaxed">You are accessing the simulation environment. Live data is not available here.</p>
                  </div>
              </div>
            }

            <div class="mb-8">
              <h2 class="text-2xl font-serif font-bold text-slate-800 mb-1">Account Registration</h2>
              <p class="text-sm text-slate-500">Create your account to access the portal.</p>
            </div>

            <!-- Toggle Between Student and Reviewer -->
            <div class="flex mb-8 border-b border-slate-200">
              <button 
                (click)="setMode('student')" 
                [class.text-iima-blue]="mode() === 'student'" 
                [class.border-iima-blue]="mode() === 'student'" 
                [class.font-bold]="mode() === 'student'"
                class="px-4 pb-3 text-sm text-slate-500 border-b-2 border-transparent transition-all hover:text-iima-blue">
                PGP1
              </button>
              <button 
                (click)="setMode('reviewer')" 
                [class.text-iima-blue]="mode() === 'reviewer'" 
                [class.border-iima-blue]="mode() === 'reviewer'" 
                [class.font-bold]="mode() === 'reviewer'"
                class="px-4 pb-3 text-sm text-slate-500 border-b-2 border-transparent transition-all hover:text-iima-blue">
                PGP2
              </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
              
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Full Name</label>
                <input type="text" formControlName="name" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Address</label>
                <input type="email" formControlName="email" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none" placeholder="user@iima.ac.in">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Phone Number</label>
                <input type="tel" formControlName="phone" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none">
              </div>

              @if (mode() === 'student') {
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Roll No (14 char)</label>
                  <input type="text" formControlName="rollNo" maxlength="14" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none font-mono uppercase" placeholder="PXXXXXXXXXXXXX">
                </div>
              }

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Set Password</label>
                <input type="password" formControlName="password" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none">
              </div>

              @if (errorMsg()) {
                <div class="p-4 bg-red-50 text-iima-red text-sm border-l-4 border-iima-red flex flex-col gap-1">
                  <div class="flex items-center gap-2 font-bold">
                     <i class="fas fa-exclamation-triangle"></i>
                     <span>Registration Failed</span>
                  </div>
                  <span>{{ errorMsg() }}</span>
                </div>
              }

              <div class="pt-4">
                <button type="submit" class="w-full bg-iima-red hover:bg-iima-redHover text-white font-bold py-3 px-4 rounded-sm shadow-md transition-colors uppercase tracking-wider text-sm flex justify-center items-center gap-2">
                  <span>Create Account</span>
                  <i class="fas fa-chevron-right text-xs"></i>
                </button>
              </div>
            </form>
            
            <!-- Login Link -->
            <div class="mt-6 text-center pt-3 border-t border-slate-100">
              <p class="text-sm text-slate-600">
                Already have an account? 
                <button (click)="navigateToLogin.emit()" class="text-iima-blue hover:text-iima-blueHover font-bold ml-1 transition-colors">
                  Login
                </button>
              </p>
            </div>
            
            <div class="mt-8 pt-6 border-t border-slate-100 text-center">
               <p class="text-xs text-slate-400">For technical assistance, contact Placecom support.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
    private fb: FormBuilder = inject(FormBuilder);
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);
    private dataService = inject(DataService);

    mode = signal<RegisterMode>('student');
    errorMsg = signal<string>('');
    isDryRun = signal<boolean>(this.dataService.isDryRun());

    navigateToLogin = output<void>();

    form: FormGroup;

    constructor() {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
            name: ['', Validators.required],
            phone: ['', Validators.required],
            rollNo: ['']
        });

        // Set initial validators
        this.setMode('student');
    }

    setMode(m: RegisterMode) {
        this.mode.set(m);
        this.errorMsg.set('');
        this.form.reset();

        // Adjust validators based on mode
        if (m === 'student') {
            this.form.get('rollNo')?.setValidators([Validators.required, Validators.minLength(14), Validators.maxLength(14)]);
        } else {
            this.form.get('rollNo')?.clearValidators();
        }

        this.form.get('rollNo')?.updateValueAndValidity();
    }

    submit() {
        if (this.form.invalid) {
            this.errorMsg.set('Please check all fields and correct errors.');
            return;
        }

        const val = this.form.value;
        const role = this.mode() === 'student' ? 'student' : 'reviewer';

        const success = this.authService.register({
            email: val.email,
            password: val.password,
            name: val.name,
            phone: val.phone,
            role: role as UserRole,
            uid: crypto.randomUUID(),
            rollNo: val.rollNo
        });

        if (success) {
            this.notificationService.showSuccess('Account Created', 'Account created successfully. Please login.');
            this.navigateToLogin.emit();
        } else {
            this.errorMsg.set('Email already registered.');
        }
    }
}
