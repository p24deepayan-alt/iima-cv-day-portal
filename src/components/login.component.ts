
import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { ForgotPasswordModalComponent } from './forgot-password-modal.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ForgotPasswordModalComponent],
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
              <h2 class="text-2xl font-serif font-bold text-slate-800 mb-1">Portal Login</h2>
              <p class="text-sm text-slate-500">Please enter your credentials to access the dashboard.</p>
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
              
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Address</label>
                <input type="email" formControlName="email" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none" placeholder="user@iima.ac.in">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Password</label>
                <input type="password" formControlName="password" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none" placeholder="••••••••">
              </div>

              @if (errorMsg()) {
                <div class="p-4 bg-red-50 text-iima-red text-sm border-l-4 border-iima-red flex flex-col gap-1">
                  <div class="flex items-center gap-2 font-bold">
                     <i class="fas fa-exclamation-triangle"></i>
                     <span>Login Failed</span>
                  </div>
                  <span>{{ errorMsg() }}</span>
                  @if(isDryRun()) {
                     <span class="text-xs mt-1 text-slate-600 italic">Tip: Default password for sandbox users is <strong>'dummyaccount'</strong>. If this fails, try re-seeding data from Admin.</span>
                  }
                </div>
              }

              <div class="pt-4">
                <button type="submit" class="w-full bg-iima-red hover:bg-iima-redHover text-white font-bold py-3 px-4 rounded-sm shadow-md transition-colors uppercase tracking-wider text-sm flex justify-center items-center gap-2">
                  <span>Secure Login</span>
                  <i class="fas fa-chevron-right text-xs"></i>
                </button>
              </div>
            </form>
            
            <!-- Additional Links -->
            <div class="mt-6 space-y-3">
              <div class="text-center">
                <button 
                  (click)="showForgotPassword = true" 
                  class="text-sm text-iima-blue hover:text-iima-blueHover font-medium transition-colors">
                  Forgot Password?
                </button>
              </div>
              <div class="text-center pt-3 border-t border-slate-100">
                <p class="text-sm text-slate-600">
                  New User? 
                  <button (click)="navigateToRegister.emit()" class="text-iima-red hover:text-iima-redHover font-bold ml-1 transition-colors">
                    Register Here
                  </button>
                </p>
              </div>
            </div>
            
            <div class="mt-8 pt-6 border-t border-slate-100 text-center">
               <p class="text-xs text-slate-400">For technical assistance, contact Placecom support.</p>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Forgot Password Modal -->
    @if (showForgotPassword) {
      <app-forgot-password-modal 
        (close)="showForgotPassword = false">
      </app-forgot-password-modal>
    }
  `
})
export class LoginComponent {
    private fb: FormBuilder = inject(FormBuilder);
    private authService = inject(AuthService);
    private dataService = inject(DataService);

    errorMsg = signal<string>('');
    isDryRun = signal<boolean>(this.dataService.isDryRun());
    showForgotPassword = false;

    navigateToRegister = output<void>();

    form: FormGroup;

    constructor() {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
    }

    submit() {
        if (this.form.invalid) {
            this.errorMsg.set('Please check all fields and correct errors.');
            return;
        }

        const val = this.form.value;
        const result = this.authService.login(val.email, val.password);
        if (!result.success) {
            this.errorMsg.set(result.error || 'Login failed.');
        }
    }
}
