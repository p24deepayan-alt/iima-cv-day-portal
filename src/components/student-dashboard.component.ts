
import { Component, input, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { NotificationService } from '../services/notification.service';
import { SECTORS } from '../services/types';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-5xl mx-auto py-8 px-4">
      
      <!-- Page Title -->
      <div class="mb-8 border-b border-slate-200 pb-4">
        <h1 class="text-3xl font-serif font-bold text-iima-blue">Sector Preferences</h1>
        <p class="text-slate-600 mt-1">PGP1 CV Day 2024 • Selection Form</p>
      </div>

      <!-- Info Panel -->
      <div class="bg-white border border-slate-200 shadow-sm p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-sm">
        <div>
           <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Student Profile</div>
           <div class="text-xl font-serif font-bold text-slate-800">{{ userRoll() }}</div>
           @if (!schedulePublished()) {
              <div class="text-sm text-slate-500">Please select your top 3 sectors. 4th sector is optional.</div>
           }
        </div>
        
        <div class="flex flex-col md:flex-row gap-6 items-end md:items-center">
            <!-- Deadline Counter -->
            <div class="text-right border-r border-slate-100 pr-6 mr-2 hidden md:block" *ngIf="registrationOpen() && !schedulePublished()">
               <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Deadline</div>
               <div class="text-sm font-bold text-slate-700">{{ deadline() | date:'mediumDate' }} <span class="text-xs text-slate-400">{{ deadline() | date:'shortTime' }}</span></div>
               <div class="text-xs font-mono font-bold text-iima-red mt-0.5 bg-red-50 px-2 py-0.5 rounded-sm inline-block">
                 <i class="far fa-clock mr-1"></i> {{ timeLeft() }}
               </div>
            </div>

            @if (schedulePublished()) {
              <div class="bg-blue-600 text-white px-4 py-2 border border-blue-700 text-sm font-bold flex items-center gap-2 shadow-sm rounded-sm">
                 <i class="fas fa-check-circle"></i> Schedule Released
              </div>
            } @else if (!registrationOpen() && !isAdminView) {
            <div class="bg-amber-50 text-amber-800 px-4 py-2 border border-amber-200 text-sm font-medium flex items-center gap-2">
                <i class="fas fa-lock"></i> Submission Closed
            </div>
            } @else {
            <div class="bg-green-50 text-green-800 px-4 py-2 border border-green-200 text-sm font-medium flex items-center gap-2">
                <i class="fas fa-clock"></i> Submission Open
            </div>
            }
        </div>
      </div>

      <!-- PUBLISHED SCHEDULE VIEW -->
      @if (schedulePublished()) {
         <div class="bg-white border-t-4 border-iima-blue shadow-md rounded-sm mb-10 animate-[fadeIn_0.5s_ease-out]">
            <div class="p-6 border-b border-slate-100 bg-slate-50">
               <h2 class="text-xl font-serif font-bold text-iima-blue flex items-center gap-2">
                  <i class="far fa-calendar-check text-iima-gold"></i> Your CV Review Schedule
               </h2>
               <p class="text-sm text-slate-500 mt-1">Please follow the official guidelines below regarding reporting time and dress code.</p>
            </div>
            <div class="p-0 overflow-hidden">
               @if (mySchedule().length > 0) {
                  <div class="grid grid-cols-1 divide-y divide-slate-100">
                     @for (slot of mySchedule(); track $index) {
                        <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                           <div class="flex items-center gap-6">
                              <div class="text-center min-w-[80px]">
                                 <div class="text-2xl font-bold text-slate-800 font-mono">{{ slot.time }}</div>
                                 <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time</div>
                              </div>
                              <div class="h-10 w-px bg-slate-200 hidden md:block"></div>
                              <div>
                                 <div class="text-lg font-bold text-iima-blue">{{ slot.sector }}</div>
                                 <div class="flex gap-2 mt-1">
                                    @if (slot.roomName) {
                                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                         <i class="fas fa-map-marker-alt"></i> {{ slot.roomName }}
                                      </span>
                                    } @else {
                                      <span class="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Room TBA</span>
                                    }
                                 </div>
                              </div>
                           </div>
                           <!-- Note: Reviewer Name is intentionally hidden as per requirements -->
                        </div>
                     }
                  </div>
               } @else {
                  <div class="p-10 text-center text-slate-400">
                     <i class="far fa-calendar-times text-4xl mb-3 text-slate-300"></i>
                     <p class="font-medium text-slate-600">No slots assigned.</p>
                     <p class="text-xs mt-1">Please contact the Placement Committee for assistance.</p>
                  </div>
               }
            </div>

            <!-- Official Guidelines -->
            <div class="p-8 bg-slate-50 border-t border-slate-200">
               <h3 class="font-serif font-bold text-slate-800 mb-4 text-lg border-b border-slate-200 pb-2 flex items-center gap-2">
                 <i class="fas fa-info-circle text-iima-blue"></i> General Guidelines
               </h3>
               <ul class="list-disc list-outside ml-5 space-y-2 text-sm text-slate-700 leading-relaxed">
                  <li>
                    Arrive at the designated CR <strong>10 minutes</strong> before the start of your slot and report to the Placement Committee member stationed at the venue (For example, if your slot time is 10:00 AM, entry after 09:50 AM will be considered late).
                  </li>
                  <li>
                    The PGP1 in the next slot will be sent in as per the schedule and you are required to leave the room to ensure the smooth flow of the process.
                  </li>
                  <li>
                    Note that the dress code for the event is <strong>Smart Casuals</strong>.
                  </li>
                  <li>
                    It is <strong>mandatory</strong> to bring your institute ID card for the event.
                  </li>
                  <li class="text-iima-red font-medium bg-red-50 inline-block px-1 rounded-sm">
                    Any procedural transgression will invite monetary penalties in accordance with the guidelines shared earlier.
                  </li>
               </ul>
            </div>
         </div>
      }

      <form [formGroup]="prefForm" (ngSubmit)="save()" class="bg-white p-8 border border-slate-200 shadow-sm rounded-sm" [class.opacity-60]="schedulePublished()" [class.pointer-events-none]="schedulePublished()">
        <!-- Overlay if published -->
        @if (schedulePublished()) {
           <div class="mb-6 bg-slate-100 text-slate-600 p-4 text-sm font-medium border-l-4 border-slate-400">
             <i class="fas fa-lock mr-2"></i> Preferences are locked because the schedule has been published.
           </div>
        }

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <!-- Preference 1 -->
          <div class="group">
             <label class="block text-sm font-bold text-iima-blue mb-2 uppercase tracking-wide">
               First Preference <span class="text-iima-red ml-1">*</span>
             </label>
             <div class="relative">
               <select formControlName="p1" class="w-full p-4 bg-slate-50 border border-slate-300 focus:border-iima-blue focus:ring-1 focus:ring-iima-blue appearance-none rounded-sm outline-none font-medium text-slate-800 cursor-pointer">
                 <option value="" disabled selected>Select Sector</option>
                 @for (sector of sectors; track sector) {
                   <option [value]="sector">{{ sector }}</option>
                 }
               </select>
               <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                 <i class="fas fa-chevron-down text-xs"></i>
               </div>
             </div>
             <p class="text-xs text-slate-400 mt-2">Highest priority allocation.</p>
          </div>

          <!-- Preference 2 -->
          <div class="group">
             <label class="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
               Second Preference <span class="text-iima-red ml-1">*</span>
             </label>
             <div class="relative">
               <select formControlName="p2" class="w-full p-4 bg-slate-50 border border-slate-300 focus:border-iima-blue focus:ring-1 focus:ring-iima-blue appearance-none rounded-sm outline-none font-medium text-slate-800 cursor-pointer">
                 <option value="" disabled selected>Select Sector</option>
                 @for (sector of sectors; track sector) {
                   <option [value]="sector">{{ sector }}</option>
                 }
               </select>
               <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                 <i class="fas fa-chevron-down text-xs"></i>
               </div>
             </div>
          </div>

          <!-- Preference 3 -->
          <div class="group">
             <label class="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
               Third Preference <span class="text-iima-red ml-1">*</span>
             </label>
             <div class="relative">
               <select formControlName="p3" class="w-full p-4 bg-slate-50 border border-slate-300 focus:border-iima-blue focus:ring-1 focus:ring-iima-blue appearance-none rounded-sm outline-none font-medium text-slate-800 cursor-pointer">
                 <option value="" selected disabled>Select Sector</option>
                 @for (sector of sectors; track sector) {
                   <option [value]="sector">{{ sector }}</option>
                 }
               </select>
               <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                 <i class="fas fa-chevron-down text-xs"></i>
               </div>
             </div>
          </div>

          <!-- Preference 4 -->
          <div class="group">
             <label class="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
               Fourth Preference <span class="text-xs text-slate-400 ml-1">(Optional)</span>
             </label>
             <div class="relative">
               <select formControlName="p4" class="w-full p-4 bg-slate-50 border border-slate-300 focus:border-iima-blue focus:ring-1 focus:ring-iima-blue appearance-none rounded-sm outline-none font-medium text-slate-800 cursor-pointer">
                 <option value="" selected>Select Sector (Optional)</option>
                 @for (sector of sectors; track sector) {
                   <option [value]="sector">{{ sector }}</option>
                 }
               </select>
               <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                 <i class="fas fa-chevron-down text-xs"></i>
               </div>
             </div>
          </div>

        </div>

        @if (hasDuplicates()) {
          <div class="mt-8 bg-red-50 border border-red-200 text-iima-red px-4 py-3 flex items-center gap-3 rounded-sm">
             <i class="fas fa-exclamation-circle"></i>
             <span class="font-medium">Duplicate sectors selected. Please choose distinct sectors for each preference.</span>
          </div>
        }

        <div class="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center">
          <p class="text-xs text-slate-400">
            * Preferences 1, 2 & 3 are mandatory.<br>
            * Allocation is subject to PGP2 availability.
          </p>
          <button 
            type="submit" 
            [disabled]="prefForm.invalid || hasDuplicates() || (!registrationOpen() && !isAdminView) || schedulePublished()"
            class="bg-iima-red hover:bg-iima-redHover text-white px-8 py-3 shadow-sm uppercase tracking-wider font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm">
            Submit Preferences
          </button>
        </div>
      </form>
    </div>
  `
})
export class StudentDashboardComponent implements OnDestroy {
  targetUserId = input<string | null>(null);

  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private fb: FormBuilder = inject(FormBuilder);

  sectors = SECTORS;
  prefForm: FormGroup;

  // Timer State
  now = signal(new Date());
  timerId: any;

  get isAdminView() {
    return !!this.targetUserId();
  }

  userRoll = computed(() => {
    const uid = this.targetUserId();
    if (uid) {
      return this.dataService.users().find(u => u.uid === uid)?.rollNo || 'N/A';
    }
    return 'N/A';
  });

  registrationOpen = computed(() => this.dataService.isStudentRegistrationOpen());
  schedulePublished = computed(() => this.dataService.config().isSchedulePublished);

  deadline = computed(() => new Date(this.dataService.config().studentRegistrationEnd));

  timeLeft = computed(() => {
    const end = this.deadline().getTime();
    const now = this.now().getTime();
    const diff = end - now;

    if (diff <= 0) return 'Closed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h ${minutes}m left`;
  });

  mySchedule = computed(() => {
    const uid = this.targetUserId();
    if (!uid || !this.schedulePublished()) return [];

    const all = this.dataService.schedule();
    // Filter for this student
    const mine = all.filter(s => s.studentId === uid);
    // Sort chronologically
    return mine.sort((a, b) => a.time.localeCompare(b.time));
  });

  constructor() {
    this.prefForm = this.fb.group({
      p1: ['', Validators.required],
      p2: ['', Validators.required],
      p3: ['', Validators.required],
      p4: ['']
    });

    effect(() => {
      const uid = this.targetUserId();
      if (uid) {
        const prefs = this.dataService.getStudentPreferences(uid)();
        if (prefs) {
          this.prefForm.patchValue({
            p1: prefs.p1,
            p2: prefs.p2,
            p3: prefs.p3,
            p4: prefs.p4
          }, { emitEvent: false });
        }
      }
    });

    // Update timer every minute
    this.timerId = setInterval(() => {
      this.now.set(new Date());
    }, 60000);
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
  }

  hasDuplicates() {
    const { p1, p2, p3, p4 } = this.prefForm.value;
    const selected = [p1, p2, p3, p4].filter(s => !!s);
    return new Set(selected).size !== selected.length;
  }

  save() {
    if (this.schedulePublished()) {
      this.notificationService.showWarning('Cannot Edit', 'The schedule is already published. Preferences cannot be edited.');
      return;
    }

    const uid = this.targetUserId();
    if (this.prefForm.valid && !this.hasDuplicates() && uid) {
      this.dataService.updatePreferences(uid, this.prefForm.value);
      this.notificationService.showSuccess('Success', 'Preferences saved successfully!');
    }
  }
}
