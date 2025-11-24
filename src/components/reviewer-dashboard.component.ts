
import { Component, Input, inject, signal, effect, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { NotificationService } from '../services/notification.service';
import { SECTORS, Sector, ScheduleItem, ReviewFeedback } from '../services/types';

@Component({
   selector: 'app-reviewer-dashboard',
   standalone: true,
   imports: [CommonModule, FormsModule],
   template: `
    <div class="max-w-4xl mx-auto py-8 px-4 relative">
      
      <!-- Feedback Modal -->
      @if (feedbackModalItem()) {
        <div class="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
           <div class="bg-white w-full max-w-xl rounded-sm shadow-2xl flex flex-col max-h-[90vh]">
              <div class="bg-iima-blue text-white p-4 flex justify-between items-center shrink-0">
                 <div>
                    <h3 class="font-serif text-xl font-bold">CV Review Feedback</h3>
                    <p class="text-xs opacity-80 mt-1">Candidate Roll No: {{ feedbackModalItem()?.studentRoll }}</p>
                 </div>
                 <button (click)="closeFeedbackModal()" class="text-white/70 hover:text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    <i class="fas fa-times"></i>
                 </button>
              </div>
              
              <div class="p-6 overflow-y-auto flex-1 bg-slate-50">
                 <p class="text-sm text-slate-600 mb-6">Please rate the candidate's CV on the following parameters (1 = Poor, 10 = Excellent).</p>
                 
                 <div class="space-y-6">
                    <div>
                       <div class="flex justify-between mb-2">
                          <label class="text-xs font-bold uppercase tracking-wider text-slate-700">Formatting</label>
                          <span class="font-bold text-iima-blue">{{ feedbackForm.formatting }} / 10</span>
                       </div>
                       <input type="range" min="1" max="10" [(ngModel)]="feedbackForm.formatting" class="w-full accent-iima-blue h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                    </div>

                    <div>
                       <div class="flex justify-between mb-2">
                          <label class="text-xs font-bold uppercase tracking-wider text-slate-700">Alignment</label>
                          <span class="font-bold text-iima-blue">{{ feedbackForm.alignment }} / 10</span>
                       </div>
                       <input type="range" min="1" max="10" [(ngModel)]="feedbackForm.alignment" class="w-full accent-iima-blue h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                    </div>

                    <div>
                       <div class="flex justify-between mb-2">
                          <label class="text-xs font-bold uppercase tracking-wider text-slate-700">Balance Between Sections</label>
                          <span class="font-bold text-iima-blue">{{ feedbackForm.balance }} / 10</span>
                       </div>
                       <input type="range" min="1" max="10" [(ngModel)]="feedbackForm.balance" class="w-full accent-iima-blue h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                    </div>

                    <div>
                       <div class="flex justify-between mb-2">
                          <label class="text-xs font-bold uppercase tracking-wider text-slate-700">Highlighting of Achievements</label>
                          <span class="font-bold text-iima-blue">{{ feedbackForm.highlighting }} / 10</span>
                       </div>
                       <input type="range" min="1" max="10" [(ngModel)]="feedbackForm.highlighting" class="w-full accent-iima-blue h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                    </div>

                    <div>
                       <div class="flex justify-between mb-2">
                          <label class="text-xs font-bold uppercase tracking-wider text-slate-700">Quality of Points</label>
                          <span class="font-bold text-iima-blue">{{ feedbackForm.qualityOfPoints }} / 10</span>
                       </div>
                       <input type="range" min="1" max="10" [(ngModel)]="feedbackForm.qualityOfPoints" class="w-full accent-iima-blue h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                    </div>

                    <div>
                       <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Comments & Suggestions</label>
                       <textarea [(ngModel)]="feedbackForm.comments" rows="4" class="w-full p-3 border border-slate-300 rounded-sm text-sm focus:border-iima-blue outline-none bg-white text-slate-900" placeholder="Any specific advice for the candidate..."></textarea>
                    </div>
                 </div>
              </div>

              <div class="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                 <button (click)="closeFeedbackModal()" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-50">Cancel</button>
                 <button (click)="submitFeedback()" class="px-6 py-2 bg-iima-blue text-white rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-800 shadow-sm">Submit Feedback</button>
              </div>
           </div>
        </div>
      }

      <!-- Header -->
      <div class="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
        <div>
           <h1 class="text-3xl font-serif font-bold text-iima-blue">Availability Matrix</h1>
           <p class="text-slate-600 mt-1">PGP2 Volunteers • CV Day 2024</p>
        </div>
        
        <div class="flex items-center gap-6">
            <!-- Deadline Info -->
            @if (registrationOpen() && !schedulePublished()) {
                <div class="text-right hidden sm:block">
                    <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Deadline</div>
                    <div class="text-xs font-bold text-slate-700">{{ deadline() | date:'shortDate' }} <span class="text-slate-400">{{ deadline() | date:'shortTime' }}</span></div>
                    <div class="text-[10px] font-mono font-bold text-iima-red mt-0.5">
                        <i class="far fa-clock mr-1"></i> {{ timeLeft() }}
                    </div>
                </div>
            }

            <button (click)="save()" 
            [disabled]="(!registrationOpen() && !isAdminView) || !selectedSector() || schedulePublished()" 
            class="bg-iima-red hover:bg-iima-redHover text-white px-8 py-3 shadow-sm font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm">
            Save Profile
            </button>
        </div>
      </div>

      <!-- Helper Banners -->
      @if (schedulePublished()) {
        <div class="mb-6 bg-blue-600 text-white p-4 text-sm font-bold flex gap-3 items-center rounded-sm shadow-sm">
           <i class="fas fa-check-circle text-xl"></i> 
           <div>
             <div class="uppercase tracking-wide text-xs opacity-80">Status Update</div>
             <div>The Schedule has been published. Your availability is now locked.</div>
           </div>
        </div>
      } @else if (!registrationOpen() && !isAdminView) {
        <div class="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 text-sm font-medium flex gap-2 items-center rounded-sm">
           <i class="fas fa-lock"></i> Modification window is currently closed.
        </div>
      }
      
      @if (selectedSector() === '' && !schedulePublished()) {
        <div class="mb-6 bg-blue-50 border border-blue-200 text-iima-blue p-4 text-sm font-medium flex gap-2 items-center rounded-sm">
           <i class="fas fa-info-circle"></i> Please select your preferred sector to begin selecting time slots.
        </div>
      }

      <!-- PUBLISHED SCHEDULE VIEW (CONFIRMED SLOTS) -->
      @if (schedulePublished()) {
         <div class="bg-white border-t-4 border-iima-blue shadow-md rounded-sm mb-10 animate-[fadeIn_0.5s_ease-out]">
            <div class="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <div>
                  <h2 class="text-xl font-serif font-bold text-iima-blue flex items-center gap-2">
                     <i class="fas fa-clipboard-list text-iima-gold"></i> Confirmed CV Review Schedule
                  </h2>
                  <p class="text-sm text-slate-500 mt-1">Sector: <span class="font-bold text-slate-700">{{ selectedSector() }}</span></p>
                  <p class="text-xs text-slate-500 mt-1">Please arrive at the venue 20 minutes before your first scheduled slot.</p>
               </div>
               @if (myConfirmedSchedule().length > 0 && myConfirmedSchedule()[0].roomName) {
                  <div class="text-right">
                     <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reporting Venue</div>
                     <div class="text-xl font-bold text-iima-red">{{ myConfirmedSchedule()[0].roomName }}</div>
                  </div>
               }
            </div>
            <div class="p-0 overflow-hidden">
               @if (myConfirmedSchedule().length > 0) {
                  <div class="grid grid-cols-1 divide-y divide-slate-100">
                     @for (slot of myConfirmedSchedule(); track $index) {
                        <div class="p-6 flex flex-col gap-4 hover:bg-slate-50 transition-colors">
                           <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                               <div class="flex items-center gap-6">
                                  <div class="text-center min-w-[80px]">
                                     <div class="text-2xl font-bold text-slate-800 font-mono">{{ slot.time }}</div>
                                     <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time</div>
                                  </div>
                                  <div class="h-10 w-px bg-slate-200 hidden md:block"></div>
                                  <div>
                                     <!-- CONDITIONAL NAME VISIBILITY -->
                                     @if (canViewName(slot)) {
                                       <div class="text-lg font-bold text-iima-blue">{{ slot.studentName }}</div>
                                     } @else {
                                       <div class="text-lg font-bold text-slate-800">Candidate</div>
                                     }
                                     
                                     <div class="flex gap-3 mt-1 items-center">
                                        <span class="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{{ slot.studentRoll }}</span>
                                        <span class="text-xs text-slate-400">|</span>
                                        <span class="text-xs font-medium text-iima-blue uppercase tracking-wide">{{ slot.preferenceRank || 'General' }} Preference</span>
                                     </div>
                                  </div>
                               </div>
                               
                               <div class="flex gap-2 items-center">
                                 <!-- Status Badge -->
                                 @if (slot.attendance === 'present') {
                                   <span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">Present</span>
                                 } @else if (slot.attendance === 'late') {
                                   <span class="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">Late</span>
                                 } @else if (slot.attendance === 'absent') {
                                   <span class="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">Absent</span>
                                 } @else {
                                   <span class="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">Scheduled</span>
                                 }

                                 <!-- Feedback Button -->
                                 @if (canViewName(slot)) {
                                    @if (slot.feedback) {
                                       <button (click)="openFeedbackModal(slot)" class="ml-2 text-green-600 hover:text-green-700 text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors">
                                          <i class="fas fa-check-double"></i> Feedback Submitted
                                       </button>
                                    } @else {
                                       <button (click)="openFeedbackModal(slot)" class="ml-2 bg-white border border-iima-blue text-iima-blue hover:bg-iima-blue hover:text-white px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide transition-all shadow-sm">
                                          <i class="fas fa-star mr-1"></i> Rate CV
                                       </button>
                                    }
                                 }
                               </div>
                           </div>
                        </div>
                     }
                  </div>
               } @else {
                  <div class="p-12 text-center text-slate-400">
                     <i class="far fa-calendar-minus text-4xl mb-3 text-slate-300"></i>
                     <p class="font-medium text-slate-600">No reviews assigned.</p>
                     <p class="text-xs mt-1">You have not been matched with any students based on your selected slots.</p>
                  </div>
               }
            </div>

            <!-- Official Guidelines for Reviewers -->
            <div class="p-8 bg-slate-50 border-t border-slate-200">
               <h3 class="font-serif font-bold text-slate-800 mb-4 text-lg border-b border-slate-200 pb-2 flex items-center gap-2">
                 <i class="fas fa-chalkboard-teacher text-iima-blue"></i> Reviewer Guidelines
               </h3>
               <ul class="list-disc list-outside ml-5 space-y-2 text-sm text-slate-700 leading-relaxed">
                  <li>
                    Please visit the designated CR at least <strong>15 minutes</strong> before the start of your slot to prevent any last-minute hiccups.
                  </li>
                  <li>
                    Kindly help us stick to the <strong>20-minute slot</strong> for each PGP1. The next PGP1 will be sent to you as per his/her respective slot, and in case the previous PGP1 is still in the room, they will have to oblige and leave. So, we request you to try and cover the entire CV in the given 20-minute slot.
                  </li>
                  <li>
                    While you are reviewing the CV, kindly check for issues in <strong>formatting, alignment, balance</strong> between different sections, highlighting of achievements, and the quality of points framed.
                  </li>
                  <li>
                    Please note that the dress code for all volunteers is <strong>Smart Casuals</strong>.
                  </li>
               </ul>
            </div>
         </div>
      }

      <!-- Main Form Area -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8" [class.opacity-60]="schedulePublished()" [class.pointer-events-none]="schedulePublished()">
         
         <!-- Left Column: Sector Selection -->
         <div class="md:col-span-1 space-y-6">
            <div class="bg-white border border-slate-200 shadow-sm p-6 rounded-sm">
               <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Target Sector</label>
               <div class="relative">
                  <select [ngModel]="selectedSector()" (ngModelChange)="selectedSector.set($event)" 
                          [disabled]="(!registrationOpen() && !isAdminView) || schedulePublished()"
                          class="w-full p-3 bg-slate-50 border border-slate-300 rounded-sm focus:border-iima-blue outline-none text-slate-800 font-medium appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-500">
                     <option value="" disabled selected>Select Sector</option>
                     @for (sector of sectors; track sector) {
                        <option [value]="sector">{{ sector }}</option>
                     }
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <i class="fas fa-chevron-down text-xs"></i>
                  </div>
               </div>
               <p class="text-xs text-slate-400 mt-3 leading-relaxed">
                  You will be assigned to review CVs exclusively for this sector for the entire day.
               </p>
            </div>
            
            <div class="bg-white border border-slate-200 shadow-sm p-6 rounded-sm">
               <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Summary</div>
               <div class="flex justify-between items-center mb-2">
                  <span class="text-slate-600 text-sm">Sector</span>
                  <span class="font-bold text-iima-blue">{{ selectedSector() || 'None' }}</span>
               </div>
               <div class="flex justify-between items-center">
                  <span class="text-slate-600 text-sm">Slots Selected</span>
                  <span class="font-bold text-iima-blue">{{ selectedSlots().length }}</span>
               </div>
            </div>
         </div>

         <!-- Right Column: Time Slots -->
         <div class="md:col-span-2">
            <div class="bg-white border border-slate-200 shadow-sm rounded-sm p-6">
               <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Select Availability Slots (20 min)</label>
               
               <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  @for (time of timeSlots; track time) {
                     <button 
                        (click)="toggleSlot(time)"
                        [disabled]="(!registrationOpen() && !isAdminView) || !selectedSector() || schedulePublished()"
                        [class.bg-iima-blue]="isSelected(time)"
                        [class.text-white]="isSelected(time)"
                        [class.border-iima-blue]="isSelected(time)"
                        [class.bg-slate-50]="!isSelected(time)"
                        [class.text-slate-600]="!isSelected(time)"
                        [class.opacity-50]="!selectedSector() || schedulePublished()"
                        class="px-2 py-3 border border-slate-200 rounded-sm text-sm font-mono font-medium hover:border-iima-blue transition-all relative group disabled:cursor-not-allowed">
                        {{ time }}
                        @if (isSelected(time)) {
                           <div class="absolute top-1 right-1 text-[8px] text-iima-gold">
                              <i class="fas fa-check"></i>
                           </div>
                        }
                     </button>
                  }
               </div>
            </div>
         </div>
      </div>
    </div>
  `
})
export class ReviewerDashboardComponent implements OnDestroy {
   @Input() targetUserId: string | null = null;

   private dataService = inject(DataService);
   private notificationService = inject(NotificationService);
   sectors = SECTORS;
   timeSlots: string[] = [];

   // New state model
   selectedSector = signal<Sector | ''>('');
   selectedSlots = signal<string[]>([]);

   // Timer State
   now = signal(new Date());
   timerId: any;

   // Feedback Logic
   feedbackModalItem = signal<ScheduleItem | null>(null);
   feedbackForm = {
      formatting: 5,
      alignment: 5,
      balance: 5,
      highlighting: 5,
      qualityOfPoints: 5,
      comments: ''
   };

   get isAdminView() {
      return !!this.targetUserId;
   }

   registrationOpen = computed(() => this.dataService.isReviewerRegistrationOpen());
   schedulePublished = computed(() => this.dataService.config().isSchedulePublished);

   deadline = computed(() => new Date(this.dataService.config().reviewerRegistrationEnd));

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

   myConfirmedSchedule = computed(() => {
      const uid = this.targetUserId;
      if (!uid || !this.schedulePublished()) return [];

      const all = this.dataService.schedule();
      // Filter for this reviewer
      const mine = all.filter(s => s.reviewerId === uid);
      // Sort chronologically
      return mine.sort((a, b) => a.time.localeCompare(b.time));
   });

   constructor() {
      this.generateTimeSlots();
      effect(() => {
         if (this.targetUserId) {
            const avail = this.dataService.getReviewerAvailability(this.targetUserId)();
            if (avail) {
               this.selectedSector.set(avail.sector);
               this.selectedSlots.set([...avail.slots]);
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

   generateTimeSlots() {
      let start = 9 * 60; // 9:00 in mins
      const end = 18 * 60; // 18:00 in mins
      while (start < end) {
         const h = Math.floor(start / 60).toString().padStart(2, '0');
         const m = (start % 60).toString().padStart(2, '0');
         this.timeSlots.push(`${h}:${m}`);
         start += 20;
      }
   }

   isSelected(time: string): boolean {
      return this.selectedSlots().includes(time);
   }

   toggleSlot(time: string) {
      if (this.schedulePublished()) return; // Strict Lock
      if (!this.registrationOpen() && !this.isAdminView) return;
      if (!this.selectedSector()) return;

      this.selectedSlots.update(slots => {
         if (slots.includes(time)) {
            return slots.filter(t => t !== time);
         } else {
            return [...slots, time];
         }
      });
   }

   save() {
      if (this.targetUserId) {
         if (this.schedulePublished()) {
            this.notificationService.showWarning('Cannot Edit', 'The schedule is already published. Profile cannot be edited.');
            return;
         }

         const sector = this.selectedSector();
         if (sector) {
            this.dataService.updateAvailability(this.targetUserId, sector, this.selectedSlots());
            this.notificationService.showSuccess('Success', 'Availability updated successfully.');
         } else {
            this.notificationService.showError('Error', 'Please select a sector.');
         }
      }
   }

   // --- Logic for Name Visibility & Feedback ---

   canViewName(slot: ScheduleItem): boolean {
      // Only show name if present or late
      return slot.attendance === 'present' || slot.attendance === 'late';
   }

   openFeedbackModal(slot: ScheduleItem) {
      this.feedbackModalItem.set(slot);

      // Pre-fill if exists
      if (slot.feedback) {
         this.feedbackForm = {
            formatting: slot.feedback.formatting,
            alignment: slot.feedback.alignment,
            balance: slot.feedback.balance,
            highlighting: slot.feedback.highlighting,
            qualityOfPoints: slot.feedback.qualityOfPoints,
            comments: slot.feedback.comments || ''
         };
      } else {
         // Reset default
         this.feedbackForm = {
            formatting: 5,
            alignment: 5,
            balance: 5,
            highlighting: 5,
            qualityOfPoints: 5,
            comments: ''
         };
      }
   }

   closeFeedbackModal() {
      this.feedbackModalItem.set(null);
   }

   submitFeedback() {
      const item = this.feedbackModalItem();
      if (item && this.targetUserId) {
         const feedback: ReviewFeedback = {
            ...this.feedbackForm,
            submittedAt: new Date().toISOString()
         };

         this.dataService.saveFeedback(item, feedback);
         this.closeFeedbackModal();
         this.notificationService.showSuccess('Success', 'Feedback submitted successfully!');
      }
   }
}
