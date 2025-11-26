

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { SchedulerService } from '../services/scheduler.service';
import { User, ScheduleItem, SECTORS, Sector, AuditIssue, MasterStudent, StudentTrackingStatus } from '../services/types';
import { StudentDashboardComponent } from './student-dashboard.component';
import { ReviewerDashboardComponent } from './reviewer-dashboard.component';
import { RoomDashboardComponent } from './room-dashboard.component';
import { AuthService } from '../services/auth.service';

import * as XLSX from 'xlsx';

type AdminTab = 'config' | 'users' | 'schedule' | 'tracking' | 'logs' | 'day_ops';
type UserSubTab = 'pgp1' | 'pgp2';
type DayOpsSubTab = 'dashboard' | 'rooms' | 'attendance' | 'feedback';

interface UserViewModel extends User {
   assignedSector?: string;
   slotCount?: number;
   assignedRoomName?: string;
   p1?: string;
   p2?: string;
   p3?: string;
}

type ConfirmationType = 'info' | 'warning' | 'danger';

interface ConfirmationConfig {
   title: string;
   message: string;
   type: ConfirmationType;
   confirmText: string;
   cancelText?: string;
   singleButton?: boolean;
   inputRequired?: boolean;
   expectedInput?: string;
   inputPlaceholder?: string;
   onConfirm: () => void;
}

@Component({
   selector: 'app-admin-dashboard',
   standalone: true,
   imports: [CommonModule, FormsModule, StudentDashboardComponent, ReviewerDashboardComponent, RoomDashboardComponent],
   template: `
    <div class="flex h-full flex-col bg-slate-100 relative">
      
      <!-- Dry Run Banner (Visual indicator) -->
      @if (isDryRun()) {
        <div class="bg-amber-400 text-amber-900 text-xs font-bold text-center py-1 tracking-widest uppercase sticky top-0 z-[60] shadow-sm">
          <i class="fas fa-flask mr-2"></i> Sandbox Mode Active - Data is isolated from Production
        </div>
      }

      <!-- Sub-header for Admin Navigation -->
      <div class="bg-white border-b border-slate-200 shadow-sm px-6 py-0 shrink-0 relative z-50">
        <div class="flex justify-between items-center h-14">
           <div class="flex gap-8 h-full">
              <button 
                (click)="activeTab.set('schedule')" 
                [class.border-b-2]="activeTab() === 'schedule'" 
                [class.border-iima-blue]="activeTab() === 'schedule'"
                [class.text-iima-blue]="activeTab() === 'schedule'"
                class="text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue h-full flex items-center transition-all border-transparent">
                <i class="fas fa-calendar-alt mr-2"></i> Master Schedule
              </button>
              <button 
                (click)="activeTab.set('users')" 
                [class.border-b-2]="activeTab() === 'users'" 
                [class.border-iima-blue]="activeTab() === 'users'"
                [class.text-iima-blue]="activeTab() === 'users'"
                class="text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue h-full flex items-center transition-all border-transparent">
                <i class="fas fa-users mr-2"></i> User Database
              </button>
              <button 
                (click)="activeTab.set('tracking')" 
                [class.border-b-2]="activeTab() === 'tracking'" 
                [class.border-iima-blue]="activeTab() === 'tracking'"
                [class.text-iima-blue]="activeTab() === 'tracking'"
                class="text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue h-full flex items-center transition-all border-transparent">
                <i class="fas fa-tasks mr-2"></i> Registration Tracking
              </button>
              <button 
                (click)="activeTab.set('logs')" 
                [class.border-b-2]="activeTab() === 'logs'" 
                [class.border-iima-blue]="activeTab() === 'logs'"
                [class.text-iima-blue]="activeTab() === 'logs'"
                class="text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue h-full flex items-center transition-all border-transparent">
                <i class="fas fa-history mr-2"></i> System Logs
              </button>
               <button 
                 (click)="activeTab.set('config')" 
                 [class.border-b-2]="activeTab() === 'config'" 
                 [class.border-iima-blue]="activeTab() === 'config'"
                 [class.text-iima-blue]="activeTab() === 'config'"
                 class="text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue h-full flex items-center transition-all border-transparent">
                 <i class="fas fa-cog mr-2"></i> System Config
               </button>
               <button 
                 (click)="activeTab.set('day_ops')" 
                 [class.border-b-2]="activeTab() === 'day_ops'" 
                 [class.border-iima-blue]="activeTab() === 'day_ops'"
                 [class.text-iima-blue]="activeTab() === 'day_ops'"
                 class="text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue h-full flex items-center transition-all border-transparent">
                 <i class="fas fa-cogs mr-2"></i> Day Operations
               </button>
            </div>
           
           <div class="flex items-center gap-4">
             <!-- Dry Run Toggle -->
             <button 
                (click)="toggleDryRun()" 
                [class.bg-amber-100]="isDryRun()"
                [class.text-amber-800]="isDryRun()"
                [class.border-amber-300]="isDryRun()"
                [class.bg-slate-50]="!isDryRun()"
                [class.text-slate-600]="!isDryRun()"
                class="px-3 py-1.5 rounded-sm border text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all hover:shadow-sm">
                @if (isDryRun()) {
                  <i class="fas fa-toggle-on text-amber-600 text-lg"></i> Exit Sandbox
                } @else {
                  <i class="fas fa-toggle-off text-slate-400 text-lg"></i> Enter Dry Run
                }
             </button>
             
             <div class="text-xs text-slate-400 font-mono hidden md:block">ADMIN ACCESS LEVEL 1</div>
           </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-hidden relative bg-slate-100">
        
        <!-- Audit Modal -->
        @if (showAuditModal()) {
          <div class="absolute inset-0 z-[100] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-8">
            <div class="bg-white w-full max-w-2xl flex flex-col shadow-2xl rounded-sm border-t-8 border-iima-blue animate-[fadeIn_0.2s_ease-out]">
               <div class="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                 <div>
                    <h3 class="font-serif text-2xl font-bold text-slate-800">Schedule Audit Report</h3>
                    <p class="text-sm text-slate-500 mt-1">Constraint Validation & Sanity Check</p>
                 </div>
                 <button (click)="showAuditModal.set(false)" class="text-slate-400 hover:text-slate-800 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                   <i class="fas fa-times text-lg"></i>
                 </button>
               </div>
               
               <div class="p-6 max-h-[60vh] overflow-y-auto">
                 @if (auditIssues().length > 0) {
                    <div class="space-y-3">
                       @for (issue of auditIssues(); track $index) {
                         <div [ngClass]="{
                            'bg-red-50 border-red-200 text-red-800': issue.type === 'error',
                            'bg-amber-50 border-amber-200 text-amber-800': issue.type === 'warning',
                            'bg-green-50 border-green-200 text-green-800': issue.type === 'success'
                         }" class="p-4 rounded-sm border flex gap-4 items-start">
                            <div class="shrink-0 mt-0.5">
                               @if (issue.type === 'error') { <i class="fas fa-times-circle text-lg"></i> }
                               @if (issue.type === 'warning') { <i class="fas fa-exclamation-triangle text-lg"></i> }
                               @if (issue.type === 'success') { <i class="fas fa-check-circle text-lg"></i> }
                            </div>
                            <div>
                               <p class="font-bold text-sm mb-1">{{ issue.message }}</p>
                               @if (issue.entityName) {
                                  <div class="text-xs opacity-75 font-mono">Entity: {{ issue.entityName }} <span class="mx-1">|</span> ID: {{ issue.entityId }}</div>
                               }
                            </div>
                         </div>
                       }
                    </div>
                 }
               </div>
               
               <div class="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                  <button (click)="showAuditModal.set(false)" class="bg-slate-800 text-white px-6 py-2 rounded-sm text-sm font-bold uppercase tracking-wide hover:bg-slate-900">
                    Close Report
                  </button>
               </div>
            </div>
          </div>
        }

        <!-- Impersonation Modal -->
        @if (impersonatingUser()) {
          <div class="fixed inset-0 z-[200] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
            <div class="bg-white w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col shadow-2xl rounded-sm border-t-8 border-iima-gold animate-[fadeIn_0.2s_ease-out]">
               <div class="bg-iima-blue text-white p-4 flex justify-between items-center shrink-0">
                 <div>
                   <span class="bg-iima-gold text-iima-blue text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider mr-2">Impersonating</span>
                   <span class="font-serif text-lg">{{ impersonatingUser()?.name }}</span>
                 </div>
                 <button (click)="closeImpersonation()" class="text-white/70 hover:text-white hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-all">
                   <i class="fas fa-times"></i>
                 </button>
               </div>
               <div class="flex-1 overflow-auto bg-slate-50 p-6">
                 @if (impersonatingUser()?.role === 'student') {
                   <app-student-dashboard [targetUserId]="impersonatingUser()!.uid"></app-student-dashboard>
                 }
                 @if (impersonatingUser()?.role === 'reviewer') {
                   <app-reviewer-dashboard [targetUserId]="impersonatingUser()!.uid"></app-reviewer-dashboard>
                 }
               </div>
            </div>
          </div>
        }

        <!-- Dry Run Confirmation Modal -->
        @if (showDryRunModal()) {
          <div class="absolute inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white w-full max-w-md rounded-sm shadow-2xl border-t-8 border-amber-400 animate-[fadeIn_0.2s_ease-out]">
               <div class="p-6">
                  <div class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4 mx-auto">
                     <i class="fas fa-flask text-xl"></i>
                  </div>
                  <h3 class="text-xl font-serif font-bold text-center text-slate-800 mb-2">Enter Sandbox Mode?</h3>
                  <p class="text-sm text-slate-600 text-center leading-relaxed mb-6">
                     You are about to switch to a temporary data environment for testing. 
                     <br><br>
                     <span class="font-bold text-amber-700">No changes made here will affect the live database.</span>
                  </p>
                  
                  <div class="flex gap-3">
                     <button (click)="showDryRunModal.set(false)" class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-bold uppercase text-xs rounded-sm hover:bg-slate-50 transition-colors">
                        Cancel
                     </button>
                     <button (click)="proceedWithDryRun()" class="flex-1 px-4 py-2 bg-amber-500 text-white font-bold uppercase text-xs rounded-sm hover:bg-amber-600 transition-colors shadow-sm">
                        Enter Sandbox
                     </button>
                  </div>
               </div>
            </div>
          </div>
        }

        <!-- Generic Confirmation Modal -->
        @if (confirmationConfig()) {
          <div class="absolute inset-0 z-[110] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div class="bg-white w-full max-w-md rounded-sm shadow-2xl border-t-8 animate-[fadeIn_0.2s_ease-out]"
                  [ngClass]="{
                    'border-iima-blue': confirmationConfig()?.type === 'info',
                    'border-amber-400': confirmationConfig()?.type === 'warning',
                    'border-red-500': confirmationConfig()?.type === 'danger'
                  }">
                <div class="p-6">
                   <div class="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto"
                        [ngClass]="{
                          'bg-blue-50 text-iima-blue': confirmationConfig()?.type === 'info',
                          'bg-amber-100 text-amber-600': confirmationConfig()?.type === 'warning',
                          'bg-red-100 text-red-600': confirmationConfig()?.type === 'danger'
                        }">
                      @if (confirmationConfig()?.type === 'info') { <i class="fas fa-info-circle text-xl"></i> }
                      @if (confirmationConfig()?.type === 'warning') { <i class="fas fa-exclamation-triangle text-xl"></i> }
                      @if (confirmationConfig()?.type === 'danger') { <i class="fas fa-exclamation-circle text-xl"></i> }
                   </div>
                   
                   <h3 class="text-xl font-serif font-bold text-center text-slate-800 mb-2">{{ confirmationConfig()?.title }}</h3>
                   <p class="text-sm text-slate-600 text-center leading-relaxed mb-6 whitespace-pre-line">
                      {{ confirmationConfig()?.message }}
                   </p>

                   @if (confirmationConfig()?.inputRequired) {
                      <div class="mb-6">
                         <input type="text" 
                                [ngModel]="confirmationInput()" 
                                (ngModelChange)="confirmationInput.set($event)"
                                [placeholder]="confirmationConfig()?.inputPlaceholder || ''"
                                class="w-full p-3 border border-slate-300 rounded-sm text-sm focus:border-iima-blue outline-none text-center font-bold"
                                [class.border-red-300]="confirmationConfig()?.expectedInput && confirmationInput() !== confirmationConfig()?.expectedInput && confirmationInput().length > 0">
                      </div>
                   }
                   
                   <div class="flex gap-3">
                      @if (!confirmationConfig()?.singleButton) {
                         <button (click)="cancelConfirmation()" class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-bold uppercase text-xs rounded-sm hover:bg-slate-50 transition-colors">
                            {{ confirmationConfig()?.cancelText || 'Cancel' }}
                         </button>
                      }
                      <button (click)="confirmAction()" 
                              [disabled]="confirmationConfig()?.inputRequired && confirmationConfig()?.expectedInput && confirmationInput() !== confirmationConfig()?.expectedInput"
                              [class.w-full]="confirmationConfig()?.singleButton"
                              [class.flex-1]="!confirmationConfig()?.singleButton"
                              class="px-4 py-2 text-white font-bold uppercase text-xs rounded-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              [ngClass]="{
                                'bg-iima-blue hover:bg-slate-800': confirmationConfig()?.type === 'info',
                                'bg-amber-500 hover:bg-amber-600': confirmationConfig()?.type === 'warning',
                                'bg-red-600 hover:bg-red-700': confirmationConfig()?.type === 'danger'
                              }">
                         {{ confirmationConfig()?.confirmText }}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        }

         <!-- Scheduling Loading Modal -->
         @if (isScheduling()) {
           <div class="absolute inset-0 z-[120] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
              <div class="bg-white rounded-sm shadow-2xl border-t-8 border-iima-blue animate-[fadeIn_0.2s_ease-out] p-8 max-w-md">
                 <div class="flex flex-col items-center text-center">
                    <div class="w-16 h-16 border-4 border-iima-blue border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h3 class="text-xl font-serif font-bold text-slate-800 mb-2">Generating Schedule...</h3>
                    <p class="text-sm text-slate-600 leading-relaxed">
                       Running optimization algorithm with 20 iterations.<br>
                       This may take a few moments for large datasets.
                    </p>
                 </div>
              </div>
           </div>
         }

        <!-- DAY OPERATIONS TAB (Rooms, Attendance, Feedback) -->
        @if (activeTab() === 'day_ops') {
          <div class="h-full flex flex-col overflow-hidden">
             <!-- Sub-Tab Navigation -->
             <div class="bg-white border-b border-slate-200 shrink-0 flex px-6">
                <button (click)="dayOpsSubTab.set('dashboard')" 
                   [class.border-b-2]="dayOpsSubTab() === 'dashboard'" 
                   [class.border-iima-blue]="dayOpsSubTab() === 'dashboard'"
                   [class.text-iima-blue]="dayOpsSubTab() === 'dashboard'"
                   class="px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue transition-all border-transparent">
                   <i class="fas fa-chart-bar mr-2"></i> Dashboard
                </button>
                <button (click)="dayOpsSubTab.set('rooms')" 
                   [class.border-b-2]="dayOpsSubTab() === 'rooms'" 
                   [class.border-iima-blue]="dayOpsSubTab() === 'rooms'"
                   [class.text-iima-blue]="dayOpsSubTab() === 'rooms'"
                   class="px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue transition-all border-transparent">
                   <i class="fas fa-door-open mr-2"></i> Rooms
                </button>
                <button (click)="dayOpsSubTab.set('attendance')" 
                   [class.border-b-2]="dayOpsSubTab() === 'attendance'" 
                   [class.border-iima-blue]="dayOpsSubTab() === 'attendance'"
                   [class.text-iima-blue]="dayOpsSubTab() === 'attendance'"
                   class="px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue transition-all border-transparent">
                   <i class="fas fa-clipboard-list mr-2"></i> Attendance
                </button>
                <button (click)="dayOpsSubTab.set('feedback')" 
                   [class.border-b-2]="dayOpsSubTab() === 'feedback'" 
                   [class.border-iima-blue]="dayOpsSubTab() === 'feedback'"
                   [class.text-iima-blue]="dayOpsSubTab() === 'feedback'"
                   class="px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-500 hover:text-iima-blue transition-all border-transparent">
                   <i class="fas fa-star-half-alt mr-2"></i> Feedback
                </button>
             </div>

             <div class="flex-1 overflow-hidden relative bg-slate-100">
                <!-- DASHBOARD VIEW -->
                @if (dayOpsSubTab() === 'dashboard') {
                   <div class="h-full flex flex-col p-6 overflow-hidden">
                      <!-- Header -->
                      <div class="bg-white p-6 rounded-sm border border-slate-200 shadow-sm shrink-0 mb-6">
                         <div class="flex justify-between items-start">
                            <div>
                               <h2 class="text-2xl font-serif font-bold text-iima-blue">Room Load Dashboard</h2>
                               <p class="text-sm text-slate-500 mt-1">Real-time visualization of room occupancy across all time slots.</p>
                            </div>
                            @if (roomLoadData().rooms.length > 0) {
                               <div class="grid grid-cols-3 gap-4">
                                  <div class="text-center p-3 bg-slate-50 rounded-sm border border-slate-100">
                                     <div class="text-2xl font-bold text-slate-700">{{ roomLoadData().totalSessions }}</div>
                                     <div class="text-[9px] uppercase font-bold text-slate-400">Total Sessions</div>
                                  </div>
                                  <div class="text-center p-3 bg-blue-50 rounded-sm border border-blue-100">
                                     <div class="text-2xl font-bold text-blue-700">{{ roomLoadData().timeSlots.length }}</div>
                                     <div class="text-[9px] uppercase font-bold text-blue-600">Time Slots</div>
                                  </div>
                                  <div class="text-center p-3 bg-purple-50 rounded-sm border border-purple-100">
                                     <div class="text-2xl font-bold text-purple-700">{{ roomLoadData().globalMaxLoad }}</div>
                                     <div class="text-[9px] uppercase font-bold text-purple-600">Peak Load</div>
                                  </div>
                               </div>
                            }
                         </div>
                      </div>

                      @if (roomLoadData().rooms.length === 0) {
                         <div class="flex-1 flex items-center justify-center flex-col text-slate-400">
                            <i class="fas fa-chart-bar text-5xl mb-4 text-slate-300"></i>
                            <p class="text-lg font-serif text-slate-600 mb-2">No Schedule Data Available</p>
                            <p class="text-sm max-w-md text-center">Generate a schedule first to view the room load distribution.</p>
                         </div>
                      } @else {
                         <!-- Load Grid -->
                         <div class="bg-white border border-slate-200 shadow-sm rounded-sm flex-1 overflow-hidden flex flex-col">
                            <div class="p-4 border-b border-slate-200 bg-slate-50">
                               <h3 class="font-bold text-slate-700 uppercase text-xs tracking-wider">Load Distribution Matrix</h3>
                            </div>
                            <div class="overflow-auto flex-1 p-4">
                               <table class="w-full border-collapse text-sm">
                                  <thead>
                                     <tr>
                                        <th class="sticky left-0 z-20 bg-white p-3 text-left font-bold text-xs uppercase tracking-wider text-slate-500 border-b-2 border-r-2 border-slate-200">Time Slot</th>
                                        @for (room of roomLoadData().rooms; track room.name) {
                                           <th class="p-3 text-center font-bold text-xs uppercase tracking-wider text-slate-500 border-b-2 border-slate-200 bg-white">
                                              <div>{{ room.name }}</div>
                                              <div class="text-[9px] text-slate-400 font-normal mt-1">Total: {{ room.totalLoad }}</div>
                                           </th>
                                        }
                                     </tr>
                                  </thead>
                                  <tbody>
                                     @for (slot of roomLoadData().timeSlots; track slot; let idx = $index) {
                                        <tr class="hover:bg-slate-50 transition-colors">
                                           <td class="sticky left-0 z-10 bg-white p-3 font-mono font-bold text-slate-700 border-r-2 border-slate-200">{{ slot }}</td>
                                           @for (room of roomLoadData().rooms; track room.name) {
                                              <td class="p-3 text-center border border-slate-100" 
                                                  [ngClass]="{
                                                     'bg-green-50 text-green-800': room.loads[idx] === 0,
                                                     'bg-yellow-50 text-yellow-800': room.loads[idx] > 0 && room.loads[idx] <= roomLoadData().globalMaxLoad / 2,
                                                     'bg-orange-50 text-orange-800': room.loads[idx] > roomLoadData().globalMaxLoad / 2 && room.loads[idx] < roomLoadData().globalMaxLoad,
                                                     'bg-red-50 text-red-800 font-bold': room.loads[idx] === roomLoadData().globalMaxLoad && roomLoadData().globalMaxLoad > 0
                                                  }">
                                                 @if (room.loads[idx] === 0) {
                                                    <span class="text-slate-300 text-xs">—</span>
                                                 } @else {
                                                    <span class="font-bold text-lg">{{ room.loads[idx] }}</span>
                                                 }
                                              </td>
                                           }
                                        </tr>
                                     }
                                  </tbody>
                               </table>
                            </div>
                         </div>

                         <!-- Legend -->
                         <div class="mt-4 bg-white p-4 rounded-sm border border-slate-200 shadow-sm shrink-0">
                            <div class="flex items-center justify-center gap-6 text-xs">
                               <div class="flex items-center gap-2">
                                  <div class="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                                  <span class="text-slate-600 font-medium">No Load</span>
                               </div>
                               <div class="flex items-center gap-2">
                                  <div class="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                                  <span class="text-slate-600 font-medium">Low Load</span>
                               </div>
                               <div class="flex items-center gap-2">
                                  <div class="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
                                  <span class="text-slate-600 font-medium">Medium Load</span>
                               </div>
                               <div class="flex items-center gap-2">
                                  <div class="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                                  <span class="text-slate-600 font-medium">Peak Load</span>
                               </div>
                            </div>
                         </div>
                      }
                   </div>
                }

                <!-- ROOMS VIEW -->
                @if (dayOpsSubTab() === 'rooms') {
                   @if (!selectedRoomUserId()) {
                      <!-- Room List -->
                      <div class="p-6 overflow-auto h-full">
                         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            @for (room of roomStats(); track room.id) {
                               <div class="bg-white border border-slate-200 rounded-sm shadow-sm hover:shadow-md transition-all p-6 flex flex-col">
                                  <div class="flex justify-between items-start mb-4">
                                     <div>
                                        <h3 class="text-xl font-serif font-bold text-iima-blue">{{ room.name }}</h3>
                                        <div class="text-xs text-slate-500 font-mono mt-1">ID: {{ room.id }}</div>
                                     </div>
                                     <div class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                                        <i class="fas fa-door-closed text-lg"></i>
                                     </div>
                                  </div>
                                  
                                  <div class="grid grid-cols-3 gap-2 mb-6">
                                     <div class="text-center p-2 bg-slate-50 rounded-sm border border-slate-100">
                                        <div class="text-lg font-bold text-slate-700">{{ room.stats.total }}</div>
                                        <div class="text-[9px] uppercase font-bold text-slate-400">Total</div>
                                     </div>
                                     <div class="text-center p-2 bg-green-50 rounded-sm border border-green-100">
                                        <div class="text-lg font-bold text-green-700">{{ room.stats.completed }}</div>
                                        <div class="text-[9px] uppercase font-bold text-green-600">Done</div>
                                     </div>
                                     <div class="text-center p-2 bg-blue-50 rounded-sm border border-blue-100">
                                        <div class="text-lg font-bold text-blue-700">{{ room.stats.remaining }}</div>
                                        <div class="text-[9px] uppercase font-bold text-blue-600">Left</div>
                                     </div>
                                  </div>
                                  
                                  <button (click)="viewRoom(room.linkedUserId)" class="mt-auto w-full bg-white border border-iima-blue text-iima-blue hover:bg-iima-blue hover:text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                                     <i class="fas fa-eye"></i> View Schedule
                                  </button>
                               </div>
                            }
                            @if (roomStats().length === 0) {
                               <div class="col-span-full text-center py-20 text-slate-400">
                                  <i class="fas fa-door-open text-5xl mb-4 opacity-30"></i>
                                  <p>No rooms configured.</p>
                               </div>
                            }
                         </div>
                      </div>
                   } @else {
                      <!-- Room Detail View -->
                      <div class="flex-1 flex flex-col overflow-hidden h-full">
                         <div class="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 shrink-0">
                            <button (click)="closeRoomView()" class="text-slate-500 hover:text-iima-blue flex items-center gap-2 text-sm font-bold uppercase tracking-wide transition-colors">
                               <i class="fas fa-arrow-left"></i> Back to Rooms
                            </button>
                            <div class="h-6 w-px bg-slate-200"></div>
                            <span class="text-slate-400 text-xs uppercase tracking-widest font-bold">Viewing Room Schedule</span>
                         </div>
                         <div class="flex-1 overflow-hidden relative">
                            <app-room-dashboard [targetUserId]="selectedRoomUserId()"></app-room-dashboard>
                         </div>
                      </div>
                   }
                }

                <!-- ATTENDANCE VIEW -->
                @if (dayOpsSubTab() === 'attendance') {
                   <div class="h-full flex flex-col p-6 overflow-hidden">
                      <div class="bg-white p-6 rounded-sm border border-slate-200 shadow-sm shrink-0 mb-6 flex justify-between items-center">
                         <div>
                            <h2 class="text-2xl font-serif font-bold text-iima-blue">Attendance Report</h2>
                            <p class="text-sm text-slate-500 mt-1">Track candidate attendance across all rooms.</p>
                         </div>
                         <button (click)="exportAttendanceReport()" class="bg-white text-purple-700 border border-purple-200 px-4 py-2 rounded-sm hover:bg-purple-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider">
                            <i class="fas fa-file-download"></i> Export Report
                         </button>
                      </div>

                      <div class="bg-white border border-slate-200 shadow-sm rounded-sm flex-1 overflow-hidden flex flex-col">
                         <div class="overflow-auto flex-1">
                            <table class="w-full text-left text-sm">
                               <thead class="bg-white sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold z-10">
                                  <tr>
                                     <th class="p-4 w-24">Time</th>
                                     <th class="p-4">Room</th>
                                     <th class="p-4">Candidate</th>
                                     <th class="p-4">Reviewer</th>
                                     <th class="p-4">Status</th>
                                  </tr>
                               </thead>
                               <tbody class="divide-y divide-slate-100">
                                  @for (item of attendanceList(); track $index) {
                                     <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="p-4 font-mono text-slate-600">{{ item.time }}</td>
                                        <td class="p-4">
                                           <span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-sm border border-indigo-100 text-xs font-bold">{{ item.roomName || 'Unassigned' }}</span>
                                        </td>
                                        <td class="p-4">
                                           <div class="font-bold text-slate-800">{{ item.studentName }}</div>
                                           <div class="text-xs text-slate-500">{{ item.studentRoll }}</div>
                                        </td>
                                        <td class="p-4 text-slate-600">{{ item.reviewerName }}</td>
                                        <td class="p-4">
                                           @if (item.statusDisplay === 'Present') {
                                              <span class="bg-green-100 text-green-800 px-2 py-1 rounded-sm text-xs font-bold uppercase border border-green-200">Present</span>
                                           } @else if (item.statusDisplay === 'Absent') {
                                              <span class="bg-slate-100 text-slate-500 px-2 py-1 rounded-sm text-xs font-bold uppercase border border-slate-200">Pending</span>
                                           } @else {
                                              <span class="bg-red-100 text-red-800 px-2 py-1 rounded-sm text-xs font-bold uppercase border border-red-200">{{ item.statusDisplay }}</span>
                                           }
                                        </td>
                                     </tr>
                                  }
                                  @if (attendanceList().length === 0) {
                                     <tr>
                                        <td colspan="5" class="p-10 text-center text-slate-400 italic">No scheduled items found.</td>
                                     </tr>
                                  }
                               </tbody>
                            </table>
                         </div>
                      </div>
                   </div>
                }

                <!-- FEEDBACK VIEW -->
                @if (dayOpsSubTab() === 'feedback') {
                   <div class="h-full flex flex-col p-6 overflow-hidden">
                      <div class="bg-white p-6 rounded-sm border border-slate-200 shadow-sm shrink-0 mb-6 flex justify-between items-center">
                         <div>
                            <h2 class="text-2xl font-serif font-bold text-iima-blue">Feedback Data</h2>
                            <p class="text-sm text-slate-500 mt-1">Review feedback submitted by reviewers.</p>
                         </div>
                         <button (click)="exportFeedbackData()" class="bg-white text-teal-700 border border-teal-200 px-4 py-2 rounded-sm hover:bg-teal-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider">
                            <i class="fas fa-file-download"></i> Export Data
                         </button>
                      </div>

                      <div class="bg-white border border-slate-200 shadow-sm rounded-sm flex-1 overflow-hidden flex flex-col">
                         <div class="overflow-auto flex-1">
                            <table class="w-full text-left text-sm">
                               <thead class="bg-white sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold z-10">
                                  <tr>
                                     <th class="p-4">Candidate</th>
                                     <th class="p-4">Reviewer</th>
                                     <th class="p-4">Sector</th>
                                     <th class="p-4 text-center">Avg</th>
                                     <th class="p-4">Breakdown</th>
                                     <th class="p-4 w-1/3">Comments</th>
                                     <th class="p-4 text-right">Submitted</th>
                                  </tr>
                               </thead>
                               <tbody class="divide-y divide-slate-100">
                                  @for (item of feedbackList(); track $index) {
                                     <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="p-4">
                                           <div class="font-bold text-slate-800">{{ item.studentName }}</div>
                                           <div class="text-xs text-slate-500">{{ item.studentRoll }}</div>
                                        </td>
                                        <td class="p-4 text-slate-600">{{ item.reviewerName }}</td>
                                        <td class="p-4">
                                           <span class="px-2 py-1 bg-blue-50 text-iima-blue border border-blue-100 text-xs font-bold uppercase rounded-sm">{{ item.sector }}</span>
                                        </td>
                                        <td class="p-4 text-center">
                                           <span class="font-bold text-lg" [class.text-green-600]="+item.feedbackAvg >= 4" [class.text-amber-600]="+item.feedbackAvg >= 3 && +item.feedbackAvg < 4" [class.text-red-600]="+item.feedbackAvg < 3">{{ item.feedbackAvg }}</span>
                                        </td>
                                        <td class="p-4">
                                           <div class="flex gap-3 text-xs">
                                             <div class="flex flex-col items-center" title="Formatting"><span class="text-[9px] text-slate-400 uppercase font-bold">Fmt</span><span class="font-bold text-slate-700">{{ item.feedback?.formatting }}</span></div>
                                             <div class="flex flex-col items-center" title="Alignment"><span class="text-[9px] text-slate-400 uppercase font-bold">Aln</span><span class="font-bold text-slate-700">{{ item.feedback?.alignment }}</span></div>
                                             <div class="flex flex-col items-center" title="Balance"><span class="text-[9px] text-slate-400 uppercase font-bold">Bal</span><span class="font-bold text-slate-700">{{ item.feedback?.balance }}</span></div>
                                             <div class="flex flex-col items-center" title="Highlighting"><span class="text-[9px] text-slate-400 uppercase font-bold">Hlt</span><span class="font-bold text-slate-700">{{ item.feedback?.highlighting }}</span></div>
                                             <div class="flex flex-col items-center" title="Quality"><span class="text-[9px] text-slate-400 uppercase font-bold">Qual</span><span class="font-bold text-slate-700">{{ item.feedback?.qualityOfPoints }}</span></div>
                                           </div>
                                        </td>
                                        <td class="p-4 text-slate-600 italic text-xs">{{ item.feedback?.comments || 'No comments' }}</td>
                                        <td class="p-4 text-right text-xs text-slate-400">{{ item.feedbackSubmittedAt | date:'short' }}</td>
                                     </tr>
                                  }
                                  @if (feedbackList().length === 0) {
                                     <tr>
                                        <td colspan="7" class="p-10 text-center text-slate-400 italic">No feedback submitted yet.</td>
                                     </tr>
                                  }
                               </tbody>
                            </table>
                         </div>
                      </div>
                   </div>
                }
             </div>
          </div>
        }

        <!-- LOGS TAB -->
        @if (activeTab() === 'logs') {
          <div class="h-full flex flex-col p-6 overflow-hidden">
             <div class="bg-white p-6 rounded-sm border border-slate-200 shadow-sm shrink-0 mb-6 flex justify-between items-center">
                <div>
                   <h2 class="text-2xl font-serif font-bold text-iima-blue">System Logs</h2>
                   <p class="text-sm text-slate-500 mt-1">Complete audit trail of all user actions.</p>
                </div>
                <div>
                   <button (click)="exportLogs()" class="bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-sm hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider">
                     <i class="fas fa-file-download"></i> Export Logs
                   </button>
                </div>
             </div>

             <div class="bg-white border border-slate-200 shadow-sm rounded-sm flex-1 overflow-hidden flex flex-col">
                <div class="overflow-auto flex-1">
                   <table class="w-full text-left text-sm">
                      <thead class="bg-white sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold z-10">
                         <tr>
                            <th class="p-4 w-48">Timestamp</th>
                            <th class="p-4">Actor</th>
                            <th class="p-4">Role</th>
                            <th class="p-4">Action</th>
                            <th class="p-4 w-1/3">Details</th>
                         </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 font-mono text-xs">
                         @for (log of logs(); track log.id) {
                            <tr class="hover:bg-slate-50 transition-colors">
                               <td class="p-4 text-slate-500">{{ log.timestamp | date:'medium' }}</td>
                               <td class="p-4 font-bold text-slate-700">{{ log.actorName }}</td>
                               <td class="p-4 uppercase text-[10px] tracking-wide">{{ log.actorRole }}</td>
                               <td class="p-4">
                                 <span class="bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">{{ log.action }}</span>
                               </td>
                               <td class="p-4 text-slate-600 truncate max-w-xs" [title]="log.details">{{ log.details }}</td>
                            </tr>
                         }
                         @if (logs().length === 0) {
                            <tr>
                               <td colspan="5" class="p-10 text-center text-slate-400 font-sans italic">No logs recorded yet.</td>
                            </tr>
                         }
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        }

        <!-- TRACKING TAB -->
        @if (activeTab() === 'tracking') {
          <div class="h-full flex flex-col p-6 overflow-hidden">
            <!-- Header & Upload -->
             <div class="bg-white p-6 rounded-sm border border-slate-200 shadow-sm shrink-0 mb-6">
                <div class="flex justify-between items-start">
                   <div>
                      <h2 class="text-2xl font-serif font-bold text-iima-blue">Registration Tracking</h2>
                      <p class="text-sm text-slate-500 mt-1">Upload the Master PGP1 List to identify students who haven't registered or submitted preferences.</p>
                   </div>
                   <div class="flex items-center gap-3">
                      <button (click)="downloadTemplate()" class="bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-sm hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider">
                         <i class="fas fa-download"></i> Template
                      </button>
                      <div class="relative group">
                         <input type="file" (change)="onFileChange($event)" accept=".xlsx, .xls" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                         <button class="bg-slate-800 text-white px-5 py-2.5 rounded-sm hover:bg-slate-900 shadow-md flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider">
                           <i class="fas fa-file-excel"></i> Upload Master List (.xlsx)
                         </button>
                      </div>
                   </div>
                </div>
             </div>

             @if (trackingData().length > 0) {
               <!-- Stats Cards -->
               <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
                  <div class="bg-white p-4 border-l-4 border-green-500 shadow-sm rounded-sm">
                     <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Registration Complete</div>
                     <div class="text-3xl font-bold text-slate-800">{{ stats().complete }}</div>
                     <div class="text-xs text-green-600 font-medium mt-1">Students ready for scheduling</div>
                  </div>
                  <div class="bg-white p-4 border-l-4 border-amber-400 shadow-sm rounded-sm">
                     <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Preferences</div>
                     <div class="text-3xl font-bold text-slate-800">{{ stats().pending }}</div>
                     <div class="text-xs text-amber-600 font-medium mt-1">Registered but form incomplete</div>
                  </div>
                  <div class="bg-white p-4 border-l-4 border-red-500 shadow-sm rounded-sm">
                     <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Not Registered</div>
                     <div class="text-3xl font-bold text-slate-800">{{ stats().missing }}</div>
                     <div class="text-xs text-red-600 font-medium mt-1">Students missing from portal</div>
                  </div>
               </div>

               <!-- Table -->
               <div class="bg-white border border-slate-200 shadow-sm rounded-sm flex-1 overflow-hidden flex flex-col">
                  <div class="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                     <h3 class="font-bold text-slate-700 uppercase text-xs tracking-wider">Student Status List</h3>
                     <span class="text-xs text-slate-400">Total in Master List: {{ trackingData().length }}</span>
                  </div>
                  <div class="overflow-auto flex-1">
                     <table class="w-full text-left text-sm">
                        <thead class="bg-white sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold z-10">
                           <tr>
                              <th class="p-4 w-32">Roll No</th>
                              <th class="p-4">Name</th>
                              <th class="p-4">Email</th>
                              <th class="p-4">Status</th>
                              <th class="p-4 text-right">Action</th>
                           </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                           @for (item of trackingData(); track item.student.email) {
                              <tr class="hover:bg-slate-50 transition-colors">
                                 <td class="p-4 font-mono font-medium text-slate-600">{{ item.student.rollNo }}</td>
                                 <td class="p-4 font-bold text-slate-800">{{ item.student.name }}</td>
                                 <td class="p-4 text-slate-600">{{ item.student.email }}</td>
                                 <td class="p-4">
                                    @if (item.status === 'complete') {
                                       <span class="bg-green-100 text-green-800 px-2 py-1 rounded-sm text-xs font-bold uppercase border border-green-200">Complete</span>
                                    } @else if (item.status === 'registered_no_prefs') {
                                       <span class="bg-amber-100 text-amber-800 px-2 py-1 rounded-sm text-xs font-bold uppercase border border-amber-200">Pending Prefs</span>
                                    } @else {
                                       <span class="bg-red-100 text-red-800 px-2 py-1 rounded-sm text-xs font-bold uppercase border border-red-200">Not Registered</span>
                                    }
                                 </td>
                                 <td class="p-4 text-right">
                                    @if (item.registeredUser) {
                                       <button (click)="impersonate(item.registeredUser)" class="text-iima-blue hover:text-iima-red font-medium text-xs uppercase hover:underline">View</button>
                                    }
                                 </td>
                              </tr>
                           }
                        </tbody>
                     </table>
                  </div>
               </div>
             } @else {
               <div class="flex-1 flex items-center justify-center flex-col text-slate-400">
                  <i class="fas fa-file-excel text-5xl mb-4 text-slate-300"></i>
                  <p class="text-lg font-serif text-slate-600 mb-2">No Master List Uploaded</p>
                  <p class="text-sm max-w-md text-center">Upload an Excel file with columns <strong>Name, Email, Roll No</strong> to compare against registered users.</p>
                  <button (click)="downloadTemplate()" class="mt-6 text-iima-blue font-bold text-xs uppercase tracking-wider hover:underline flex items-center gap-2">
                     <i class="fas fa-download"></i> Download Excel Template
                  </button>
               </div>
             }
          </div>
        }

        <!-- Config Tab -->
        @if (activeTab() === 'config') {
          <div class="h-full overflow-auto p-6">
            <div class="max-w-6xl mx-auto flex flex-col gap-8">
              
              <!-- Simulation Card (Only visible in Dry Run) -->
              @if (isDryRun()) {
                <div class="bg-white border border-slate-200 shadow-sm rounded-sm p-8" [class.border-l-4]="true" [class.border-l-amber-400]="true" [class.ring-2]="isDryRun()" [class.ring-amber-400]="isDryRun()" [class.ring-offset-2]="isDryRun()">
                    <div class="flex items-center gap-3 mb-4">
                       <div class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                         <i class="fas fa-flask"></i>
                       </div>
                       <div>
                         <h2 class="text-xl font-serif font-bold text-slate-800">System Simulation & Dry Run</h2>
                         <p class="text-xs text-slate-500">Populate the database with synthetic data to test the scheduling algorithm.</p>
                       </div>
                       <span class="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-sm border border-amber-200 font-bold uppercase tracking-wider">Sandbox Active</span>
                    </div>
                    
                    <div class="bg-amber-50 p-4 rounded-sm border border-amber-100 mb-6">
                       <p class="text-sm text-amber-900 font-medium mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Warning: Destructive Action</p>
                       <p class="text-xs text-amber-800 leading-relaxed">
                         Running a simulation will <strong>permanently delete</strong> all existing Student and Reviewer accounts in the <strong>Sandbox</strong> environment. 
                         Only the Admin account and Rooms will be preserved.
                       </p>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div>
                          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Number of Students</label>
                          <input type="number" [(ngModel)]="simulationStudentCount" class="w-full p-2 border border-slate-300 rounded-sm text-sm focus:border-amber-400 outline-none bg-white text-slate-900" min="1" max="1000">
                      </div>
                      <div>
                          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Reviewers Per Sector</label>
                          <div class="grid grid-cols-2 gap-3">
                             @for (sector of sectors; track sector) {
                                <div>
                                   <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{{ sector }}</label>
                                   <input type="number" [(ngModel)]="simulationReviewerCounts[sector]" class="w-full p-2 border border-slate-300 rounded-sm text-sm focus:border-amber-400 outline-none bg-white text-slate-900" min="0" max="50">
                                </div>
                             }
                          </div>
                      </div>
                    </div>

                    <div class="flex justify-end">
                       <button (click)="seedData()" class="bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2">
                          <i class="fas fa-database"></i> Seed Dummy Data
                       </button>
                    </div>
                 </div>
              }

              <!-- Timelines Card -->
              <div class="bg-white border border-slate-200 shadow-sm rounded-sm p-8">
                 <h2 class="text-2xl font-serif font-bold text-iima-blue mb-6 pb-2 border-b border-slate-100">System Timelines</h2>
                 
                 <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                       <div class="flex items-center gap-3 mb-4">
                          <div class="w-8 h-8 rounded-sm bg-slate-100 flex items-center justify-center text-slate-600"><i class="fas fa-user-graduate"></i></div>
                          <h3 class="font-bold text-lg text-slate-800">PGP1 Registration</h3>
                       </div>
                       <div class="bg-slate-50 p-4 border border-slate-200 rounded-sm space-y-4">
                          <div class="relative group">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Start Time</label>
                            <div class="relative">
                              <input type="datetime-local" [(ngModel)]="studentStart" class="w-full p-2 pr-10 border border-slate-300 bg-white text-slate-900 rounded-sm text-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none cursor-text">
                              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i class="fas fa-calendar-alt text-lg"></i>
                              </div>
                              <input type="datetime-local" [(ngModel)]="studentStart" class="absolute right-0 top-0 w-10 h-full opacity-0 cursor-pointer" tabindex="-1">
                            </div>
                          </div>
                          <div class="relative group">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">End Time</label>
                            <div class="relative">
                              <input type="datetime-local" [(ngModel)]="studentEnd" class="w-full p-2 pr-10 border border-slate-300 bg-white text-slate-900 rounded-sm text-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none cursor-text">
                              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i class="fas fa-calendar-alt text-lg"></i>
                              </div>
                               <input type="datetime-local" [(ngModel)]="studentEnd" class="absolute right-0 top-0 w-10 h-full opacity-0 cursor-pointer" tabindex="-1">
                            </div>
                          </div>
                       </div>
                    </div>

                    <div>
                       <div class="flex items-center gap-3 mb-4">
                          <div class="w-8 h-8 rounded-sm bg-slate-100 flex items-center justify-center text-slate-600"><i class="fas fa-chalkboard-teacher"></i></div>
                          <h3 class="font-bold text-lg text-slate-800">PGP2 Availability</h3>
                       </div>
                       <div class="bg-slate-50 p-4 border border-slate-200 rounded-sm space-y-4">
                          <div class="relative group">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Start Time</label>
                            <div class="relative">
                              <input type="datetime-local" [(ngModel)]="reviewerStart" class="w-full p-2 pr-10 border border-slate-300 bg-white text-slate-900 rounded-sm text-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none cursor-text">
                              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i class="fas fa-calendar-alt text-lg"></i>
                              </div>
                              <input type="datetime-local" [(ngModel)]="reviewerStart" class="absolute right-0 top-0 w-10 h-full opacity-0 cursor-pointer" tabindex="-1">
                            </div>
                          </div>
                          <div class="relative group">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">End Time</label>
                            <div class="relative">
                              <input type="datetime-local" [(ngModel)]="reviewerEnd" class="w-full p-2 pr-10 border border-slate-300 bg-white text-slate-900 rounded-sm text-sm focus:border-iima-blue focus:ring-1 focus:ring-iima-blue outline-none cursor-text">
                               <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i class="fas fa-calendar-alt text-lg"></i>
                              </div>
                              <input type="datetime-local" [(ngModel)]="reviewerEnd" class="absolute right-0 top-0 w-10 h-full opacity-0 cursor-pointer" tabindex="-1">
                            </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <!-- Rooms & Capacity Card -->
              <div class="bg-white border border-slate-200 shadow-sm rounded-sm p-8">
                 <h2 class="text-2xl font-serif font-bold text-iima-blue mb-6 pb-2 border-b border-slate-100">Rooms & Capacity Planning</h2>
                 
                 <div class="flex flex-col md:flex-row gap-8">
                    <!-- Room List -->
                    <div class="flex-1">
                       <div class="flex justify-between items-center mb-4">
                          <div class="flex items-center gap-2">
                             <h3 class="font-bold text-lg text-slate-800">CV Review Rooms</h3>
                             @if(rooms().length > 0) {
                                 <button (click)="generateCredentials()" class="text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-200 px-2 py-1 rounded-sm hover:bg-blue-50 transition-colors ml-2">
                                    Generate Creds
                                 </button>
                                 <button (click)="deleteAllRooms()" class="text-[10px] font-bold uppercase tracking-wider text-red-500 border border-red-200 px-2 py-1 rounded-sm hover:bg-red-50 transition-colors">
                                    Delete All
                                 </button>
                             }
                          </div>
                          <div class="flex gap-2">
                             <input type="text" [(ngModel)]="newRoomName" placeholder="New Room Name" class="border border-slate-300 rounded-sm px-3 py-1 text-sm outline-none focus:border-iima-blue bg-white text-slate-900">
                             <button (click)="addRoom()" [disabled]="!newRoomName" class="bg-iima-blue text-white px-3 py-1 rounded-sm text-xs font-bold uppercase hover:bg-slate-800 disabled:opacity-50">Add</button>
                          </div>
                       </div>
                       <div class="bg-slate-50 border border-slate-200 rounded-sm overflow-hidden">
                          @for(room of rooms(); track room.id) {
                             <div class="p-3 border-b border-slate-200 last:border-0 hover:bg-white transition-colors group">
                                <div class="flex justify-between items-center">
                                   <div class="flex items-center gap-3">
                                      <span class="font-medium text-slate-700">{{ room.name }}</span>
                                      <span class="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">ID: {{ room.id.slice(0,4) }}</span>
                                   </div>
                                   <button (click)="removeRoom(room.id)" class="text-red-400 hover:text-red-600 px-2 opacity-50 group-hover:opacity-100 transition-opacity"><i class="fas fa-trash-alt"></i></button>
                                </div>
                                <!-- Credentials -->
                                <div class="mt-2 text-xs flex gap-4 text-slate-500 bg-slate-100 p-2 rounded-sm border border-slate-200 font-mono">
                                   <div><span class="font-bold text-slate-400 uppercase mr-1">Login:</span> {{ room.loginEmail || 'Not Generated' }}</div>
                                   <div><span class="font-bold text-slate-400 uppercase mr-1">Pass:</span> {{ room.loginPassword || 'N/A' }}</div>
                                </div>
                             </div>
                          }
                          @if(rooms().length === 0) {
                             <div class="p-4 text-center text-slate-400 italic text-sm">No rooms added yet.</div>
                          }
                       </div>
                    </div>

                    <!-- Config Side -->
                    <div class="w-full md:w-1/3">
                       <h3 class="font-bold text-lg text-slate-800 mb-4">Load Parameters</h3>
                       <div class="bg-blue-50 border border-blue-100 p-4 rounded-sm">
                          <label class="block text-xs font-bold text-iima-blue uppercase tracking-wide mb-2">Room Buffer Capacity</label>
                          <input type="number" [(ngModel)]="roomBuffer" class="w-full p-2 border border-blue-200 rounded-sm text-sm focus:border-iima-blue outline-none bg-white text-slate-900" min="0">
                          <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                             Extra capacity allowed per room above the theoretical average. 
                             <br>
                             <em>Max Load = (Peak Users / Rooms) + Buffer</em>
                          </p>
                       </div>
                    </div>
                 </div>
              </div>

               <!-- Admin Credentials Card (Only in Live Mode) -->
               @if (!isDryRun()) {
               <div class="bg-white border border-slate-200 shadow-sm rounded-sm p-8">
                  <div class="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
                     <h2 class="text-2xl font-serif font-bold text-iima-blue">Security & Access Control</h2>
                     <span class="bg-red-50 text-red-700 text-[10px] font-bold uppercase px-2 py-1 rounded-sm border border-red-100">Restricted</span>
                  </div>

                  <div class="flex flex-col md:flex-row gap-8 items-start">
                     <div class="flex-1 space-y-4">
                        <p class="text-sm text-slate-600 mb-4">
                           Use this section to transfer admin rights or update login credentials for the Placement Committee Admin account. 
                           <br><span class="text-red-500 font-medium text-xs">Note: Changes take effect immediately.</span>
                        </p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Admin Email</label>
                              <input type="email" [(ngModel)]="adminEmail" class="w-full p-2 border border-slate-300 rounded-sm text-sm focus:border-iima-blue outline-none bg-white text-slate-900">
                           </div>
                           <div>
                              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">New Password</label>
                              <input type="password" [(ngModel)]="adminPassword" class="w-full p-2 border border-slate-300 rounded-sm text-sm focus:border-iima-blue outline-none bg-white text-slate-900">
                           </div>
                        </div>
                        <div class="flex justify-end pt-2">
                           <button (click)="updateAdminCreds()" class="bg-slate-800 text-white px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-colors">
                              Update Credentials
                           </button>
                        </div>
                     </div>
                     
                     <div class="w-full md:w-1/3 bg-slate-50 p-4 rounded-sm border border-slate-200">
                        <h4 class="font-bold text-slate-700 text-sm mb-2">Handover Protocol</h4>
                        <ul class="list-disc list-inside text-xs text-slate-500 space-y-1">
                           <li>Ensure new email is an official IIMA ID.</li>
                           <li>Use a strong password for the Placecom account.</li>
                           <li>Inform the new Secretary immediately after change.</li>
                           <li>Clearing browser cache is recommended after handover.</li>
                        </ul>
                     </div>
                  </div>
               </div>
               }

               <!-- Danger Zone: Purge Data (New Cycle) -->
               <div class="bg-white border border-red-200 shadow-sm rounded-sm p-8 relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <h2 class="text-2xl font-serif font-bold text-red-700 mb-4">Danger Zone</h2>
                  <p class="text-sm text-slate-600 mb-6">
                      These actions are irreversible. Proceed with extreme caution.
                  </p>
                  
                  <div class="flex items-center justify-between bg-red-50 p-6 rounded-sm border border-red-100">
                      <div>
                          <h4 class="font-bold text-red-800 mb-1">Purge System Data</h4>
                          <p class="text-xs text-red-600 leading-relaxed">
                              Deletes ALL Students, Reviewers, Rooms, Schedules, <strong>System Logs</strong>, and <strong>Master Student List</strong>. <br>
                              Use this to reset the portal for a new academic year or placement cycle.
                          </p>
                      </div>
                      <button (click)="purgeSystem()" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm transition-colors">
                          Purge All Data
                      </button>
                  </div>
              </div>

              <!-- Save Action -->
               <div class="flex justify-end mt-4">
                 <button (click)="saveConfig()" class="bg-iima-red hover:bg-iima-redHover text-white px-8 py-4 rounded-sm shadow-md font-bold uppercase text-sm tracking-widest transition-all transform hover:-translate-y-0.5">
                   Save System Configuration
                 </button>
              </div>
            </div>
          </div>
        }

        <!-- Users Tab -->
        @if (activeTab() === 'users') {
          <div class="h-full flex flex-col p-6 overflow-hidden">
            <div class="bg-white border border-slate-200 shadow-sm rounded-sm flex flex-col h-full overflow-hidden">
              
              <!-- User Role Toggle -->
              <div class="flex border-b border-slate-200 shrink-0">
                 <button (click)="userSubTab.set('pgp1')" 
                    [class.bg-slate-50]="userSubTab() !== 'pgp1'"
                    [class.bg-white]="userSubTab() === 'pgp1'"
                    [class.border-b-2]="userSubTab() === 'pgp1'"
                    [class.border-iima-blue]="userSubTab() === 'pgp1'"
                    class="px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all flex-1 text-center"
                    [class.text-slate-400]="userSubTab() !== 'pgp1'"
                    [class.text-iima-blue]="userSubTab() === 'pgp1'">
                    PGP1 Students
                 </button>
                 <button (click)="userSubTab.set('pgp2')" 
                    [class.bg-slate-50]="userSubTab() !== 'pgp2'"
                    [class.bg-white]="userSubTab() === 'pgp2'"
                    [class.border-b-2]="userSubTab() === 'pgp2'"
                    [class.border-iima-blue]="userSubTab() === 'pgp2'"
                    class="px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all flex-1 text-center"
                    [class.text-slate-400]="userSubTab() !== 'pgp2'"
                    [class.text-iima-blue]="userSubTab() === 'pgp2'">
                    PGP2 Reviewers
                 </button>
              </div>

              <!-- Filters Toolbar -->
              <div class="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center bg-slate-50 shrink-0">
                 <!-- Search -->
                 <div class="relative flex-1 w-full">
                   <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                   <input type="text" 
                          [ngModel]="searchTerm()" 
                          (ngModelChange)="searchTerm.set($event)"
                          placeholder="Search Name, Email, Roll No..." 
                          class="pl-10 pr-4 py-2 border border-slate-300 rounded-sm text-sm focus:border-iima-blue outline-none w-full bg-white text-slate-900">
                 </div>

                 <!-- PGP2 Sector Filter -->
                 @if (userSubTab() === 'pgp2') {
                   <div class="w-full md:w-64 relative">
                      <div class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 uppercase tracking-wider pointer-events-none">
                        Filter:
                      </div>
                      <select [ngModel]="sectorFilter()" (ngModelChange)="sectorFilter.set($event)" class="w-full pl-16 pr-4 py-2 border border-slate-300 rounded-sm text-sm focus:border-iima-blue outline-none cursor-pointer bg-white text-slate-900">
                         <option value="All">All Sectors</option>
                         @for (sector of sectors; track sector) {
                           <option [value]="sector">{{ sector }}</option>
                         }
                      </select>
                   </div>
                 }

                 <!-- Export Button -->
                 <button (click)="exportUsers()" class="bg-white text-green-700 border border-green-200 px-4 py-2 rounded-sm hover:bg-green-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                     <i class="fas fa-file-excel"></i> Export Excel
                 </button>
              </div>

              <div class="flex-1 overflow-auto">
                <table class="w-full text-left border-collapse min-w-[800px]">
                  <thead class="bg-white sticky top-0 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 z-10 shadow-sm">
                    <tr>
                      <th class="p-4 w-1/3">Name & Identity</th>
                      <th class="p-4">Contact</th>
                      @if (userSubTab() === 'pgp1') {
                         <th class="p-4">Preferences</th>
                      }
                      @if (userSubTab() === 'pgp2') { 
                        <th class="p-4">Assigned Room</th>
                        <th class="p-4">Assigned Sector</th> 
                      }
                      <th class="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (user of displayedUsers(); track user.uid) {
                      <tr class="hover:bg-slate-50 transition-colors">
                        <td class="p-4">
                          <div class="font-bold text-slate-800">{{ user.name }}</div>
                          @if (user.role === 'student') {
                            <div class="text-xs font-mono text-slate-500 bg-slate-100 inline-block px-1 rounded border border-slate-200 mt-1">
                               {{ user.rollNo }}
                            </div>
                          } @else {
                             <div class="text-xs text-slate-400 mt-1">Volunteer</div>
                          }
                        </td>
                        <td class="p-4 text-sm text-slate-600">
                           <div class="flex items-center gap-2 mb-1"><i class="far fa-envelope text-slate-400 w-4"></i> {{ user.email }}</div>
                           <div class="flex items-center gap-2"><i class="fas fa-phone text-slate-400 w-4"></i> {{ user.phone || 'N/A' }}</div>
                        </td>
                        
                        @if (userSubTab() === 'pgp1') {
                            <td class="p-4">
                                @if (user.p1) {
                                    <div class="flex flex-col gap-1">
                                        <div class="text-xs flex items-center gap-2">
                                            <span class="font-bold text-slate-400 w-4">1.</span>
                                            <span class="font-medium text-slate-700">{{ user.p1 }}</span>
                                        </div>
                                        <div class="text-xs flex items-center gap-2">
                                            <span class="font-bold text-slate-400 w-4">2.</span>
                                            <span class="font-medium text-slate-600">{{ user.p2 || '-' }}</span>
                                        </div>
                                        <div class="text-xs flex items-center gap-2">
                                            <span class="font-bold text-slate-400 w-4">3.</span>
                                            <span class="font-medium text-slate-500">{{ user.p3 || '-' }}</span>
                                        </div>
                                    </div>
                                } @else {
                                    <span class="text-xs text-slate-400 italic">Not Submitted</span>
                                }
                            </td>
                        }

                        @if (userSubTab() === 'pgp2') {
                          <td class="p-4">
                             @if (user.assignedRoomName) {
                                <span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-sm border border-indigo-100 text-xs font-bold">{{ user.assignedRoomName }}</span>
                             } @else {
                                <span class="text-slate-400 text-xs italic">Unassigned</span>
                             }
                          </td>
                          <td class="p-4">
                              @if (user.assignedSector) {
                                 <div class="flex items-center gap-2">
                                    <span class="px-2 py-1 bg-blue-50 text-iima-blue border border-blue-100 text-xs font-bold uppercase rounded-sm">{{ user.assignedSector }}</span>
                                    <span class="text-xs text-slate-500">({{ user.slotCount }} slots)</span>
                                 </div>
                              } @else {
                                 <span class="text-xs text-slate-400 italic flex items-center gap-1">
                                   <i class="fas fa-exclamation-circle"></i> Not Selected
                                 </span>
                              }
                          </td>
                        }

                        <td class="p-4 text-right">
                            <button (click)="impersonate(user)" class="text-iima-blue hover:text-iima-red font-medium text-xs uppercase tracking-wide transition-colors border border-slate-200 px-3 py-1 hover:bg-white hover:border-iima-red rounded-sm">
                              Edit / View
                            </button>
                        </td>
                      </tr>
                    }
                    @if (displayedUsers().length === 0) {
                       <tr>
                         <td [attr.colspan]="userSubTab() === 'pgp2' ? 5 : 4" class="p-12 text-center">
                            <div class="text-slate-300 text-5xl mb-3"><i class="fas fa-users-slash"></i></div>
                            <p class="text-slate-500 font-medium">No {{ userSubTab() === 'pgp1' ? 'students' : 'reviewers' }} found.</p>
                            <p class="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
                         </td>
                       </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- Schedule Tab -->
        @if (activeTab() === 'schedule') {
          <div class="h-full flex flex-col p-6 gap-6 overflow-hidden">
            <div class="bg-white p-6 rounded-sm border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
              <div>
                 <div class="flex items-center gap-3">
                   <h2 class="text-2xl font-serif font-bold text-iima-blue">CV Review Schedule</h2>
                   @if (isPublished()) {
                      <span class="bg-green-100 text-green-800 px-2 py-1 rounded-sm text-[10px] font-bold uppercase border border-green-200">Published</span>
                   } @else {
                      <span class="bg-slate-100 text-slate-500 px-2 py-1 rounded-sm text-[10px] font-bold uppercase border border-slate-200">Draft</span>
                   }
                 </div>
                 <p class="text-sm text-slate-500 mt-1">Algorithm v1.2: Matches + Room Load Balancing</p>
              </div>
              <div class="flex gap-3 flex-wrap justify-end">
                <button (click)="togglePublish()" class="px-5 py-2.5 rounded-sm shadow-md flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider border"
                    [class.bg-white]="isPublished()"
                    [class.text-slate-600]="isPublished()"
                    [class.border-slate-300]="isPublished()"
                    [class.hover:bg-slate-50]="isPublished()"
                    [class.bg-green-600]="!isPublished()"
                    [class.text-white]="!isPublished()"
                    [class.border-green-600]="!isPublished()"
                    [class.hover:bg-green-700]="!isPublished()">
                    @if (isPublished()) {
                       <i class="fas fa-eye-slash"></i> Unpublish
                    } @else {
                       <i class="fas fa-bullhorn"></i> Publish
                    }
                </button>
                
                <button (click)="runScheduler()" 
                         [disabled]="isScheduling() || isPublished()"
                         class="bg-iima-blue text-white px-5 py-2.5 rounded-sm hover:bg-slate-800 shadow-md flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                    @if (isScheduling()) {
                       <i class="fas fa-spinner fa-spin"></i> Scheduling...
                    } @else {
                       <i class="fas fa-sync-alt"></i> Run Scheduler
                    }
                 </button>
                <button (click)="exportSchedule()" class="bg-white text-green-700 border border-green-200 px-5 py-2.5 rounded-sm hover:bg-green-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider">
                   <i class="fas fa-file-excel"></i> Export Schedule
                </button>
                <button (click)="runAudit()" 
                         [disabled]="isPublished()"
                         class="bg-white text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-sm hover:bg-indigo-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                   <i class="fas fa-clipboard-check"></i> Audit
                </button>
                <button (click)="clearSchedule()" 
                         [disabled]="isPublished()"
                         class="bg-white text-red-600 border border-red-200 px-5 py-2.5 rounded-sm hover:bg-red-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                  <i class="fas fa-trash-alt"></i> Clear Data
                </button>
                <button (click)="exportEmails()" class="bg-white text-slate-700 border border-slate-300 px-5 py-2.5 rounded-sm hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all text-sm font-bold uppercase tracking-wider">
                   <i class="far fa-paper-plane"></i> Send Emails
                </button>
              </div>
            </div>
            
            <!-- KPI Stats Dashboard -->
             <div class="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
               <!-- Preference Matches -->
               <div class="bg-white border border-slate-200 shadow-sm p-4 rounded-sm md:col-span-2">
                  <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preference Allocation</h3>
                  <div class="flex gap-2 h-16 items-end">
                    <div class="flex-1 bg-green-50 border border-green-100 rounded-sm p-2 text-center relative group">
                       <div class="text-xs font-bold text-green-800 mb-1">Pref 1</div>
                       <div class="text-xl font-bold text-green-700">{{ kpiStats().p1 }}</div>
                    </div>
                    <div class="flex-1 bg-blue-50 border border-blue-100 rounded-sm p-2 text-center">
                       <div class="text-xs font-bold text-blue-800 mb-1">Pref 2</div>
                       <div class="text-xl font-bold text-blue-700">{{ kpiStats().p2 }}</div>
                    </div>
                    <div class="flex-1 bg-indigo-50 border border-indigo-100 rounded-sm p-2 text-center">
                       <div class="text-xs font-bold text-indigo-800 mb-1">Pref 3</div>
                       <div class="text-xl font-bold text-indigo-700">{{ kpiStats().p3 }}</div>
                    </div>
                    <div class="flex-1 bg-slate-50 border border-slate-200 rounded-sm p-2 text-center">
                       <div class="text-xs font-bold text-slate-600 mb-1">Pref 4</div>
                       <div class="text-xl font-bold text-slate-700">{{ kpiStats().p4 }}</div>
                    </div>
                  </div>
               </div>

               <!-- Unassigned / Issues -->
               <div class="bg-white border border-slate-200 shadow-sm p-4 rounded-sm md:col-span-2">
                  <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gap Analysis</h3>
                  <div class="flex gap-4 items-center h-16">
                     <div class="flex-1 text-center border-r border-slate-100">
                        <div class="text-2xl font-bold" [class.text-red-600]="kpiStats().zeroSlots > 0" [class.text-slate-700]="kpiStats().zeroSlots === 0">{{ kpiStats().zeroSlots }}</div>
                        <div class="text-[10px] uppercase font-bold text-slate-400">No Schedule</div>
                     </div>
                     <div class="flex-1 text-center border-r border-slate-100">
                        <div class="text-2xl font-bold text-amber-600">{{ kpiStats().oneSlot }}</div>
                        <div class="text-[10px] uppercase font-bold text-slate-400">One Slot Only</div>
                     </div>
                     <div class="flex-1 text-center">
                        <div class="text-2xl font-bold text-slate-700">{{ kpiStats().totalStudents }}</div>
                        <div class="text-[10px] uppercase font-bold text-slate-400">Total Students</div>
                     </div>
                  </div>
               </div>
             </div>

            <div class="bg-white border border-slate-200 shadow-sm rounded-sm flex-1 overflow-hidden flex flex-col">
                <div class="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between px-6 shrink-0">
                   <span>Scheduled Slots: {{ schedule().length }}</span>
                   <div class="flex gap-4">
                      <span>Reviewers Active: {{ getUniqueReviewers() }}</span>
                   </div>
                </div>
               <div class="overflow-auto flex-1">
                 <table class="w-full text-sm text-left min-w-[800px]">
                   <thead class="bg-white sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold z-10">
                     <tr>
                       <th class="p-4 bg-white w-28">Time</th>
                       <th class="p-4 bg-white">Sector</th>
                       <th class="p-4 bg-white w-24 text-center">Pref</th>
                       <th class="p-4 bg-white">Room</th>
                       <th class="p-4 bg-white">PGP1 Candidate</th>
                       <th class="p-4 bg-white">PGP2 Reviewer</th>
                     </tr>
                   </thead>
                   <tbody class="divide-y divide-slate-100">
                     @for (item of schedule(); track $index) {
                       <tr class="hover:bg-slate-50 transition-colors">
                         <td class="p-4">
                            <span class="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-sm border border-slate-200">{{ item.time }}</span>
                         </td>
                         <td class="p-4">
                            <span class="text-iima-blue font-bold">{{ item.sector }}</span>
                         </td>
                         <td class="p-4 text-center">
                            @if (item.preferenceRank === 'P1') { <span class="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full">P1</span> }
                            @else if (item.preferenceRank === 'P2') { <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-full">P2</span> }
                            @else if (item.preferenceRank === 'P3') { <span class="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-1 rounded-full">P3</span> }
                            @else if (item.preferenceRank === 'P4') { <span class="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-1 rounded-full">P4</span> }
                            @else { <span class="text-slate-400 text-[10px]">-</span> }
                         </td>
                         <td class="p-4">
                            @if(item.roomName) {
                               <span class="text-xs font-bold bg-indigo-50 text-indigo-800 px-2 py-1 rounded-sm border border-indigo-100">{{ item.roomName }}</span>
                            } @else {
                               <span class="text-xs text-red-400">Not Assigned</span>
                            }
                         </td>
                         <td class="p-4">
                           <div class="font-medium text-slate-900">{{ item.studentName }}</div>
                           <div class="text-xs text-slate-500 font-mono">{{ item.studentRoll }}</div>
                         </td>
                         <td class="p-4 text-slate-600">
                           {{ item.reviewerName }}
                         </td>
                       </tr>
                     }
                     @if (schedule().length === 0) {
                       <tr>
                         <td colspan="6" class="p-16 text-center text-slate-400">
                           <div class="text-5xl mb-4 text-slate-200"><i class="far fa-calendar"></i></div>
                           <p>No schedule has been generated.</p>
                         </td>
                       </tr>
                     }
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminDashboardComponent {
   private dataService = inject(DataService);
   private authService = inject(AuthService);
   private scheduler = inject(SchedulerService);

   activeTab = signal<AdminTab>('schedule');
   userSubTab = signal<UserSubTab>('pgp1');
   dayOpsSubTab = signal<DayOpsSubTab>('dashboard');

   isDryRun = computed(() => this.dataService.isDryRun());
   isPublished = computed(() => this.dataService.config().isSchedulePublished);
   logs = this.dataService.logs;

   // Scheduling state
   isScheduling = signal(false);

   // Filters
   searchTerm = signal('');
   sectorFilter = signal<Sector | 'All'>('All');
   sectors = SECTORS;

   studentStart: string = '';
   studentEnd: string = '';
   reviewerStart: string = '';
   reviewerEnd: string = '';
   roomBuffer: number = 0;

   // Admin Creds
   adminEmail = '';
   adminPassword = '';

   // Simulation Params
   simulationStudentCount = 50;
   simulationReviewerCounts: Record<Sector, number> = {
      'Consulting': 3,
      'Finance': 3,
      'Marketing': 3,
      'General Management': 3,
      'Product Management': 3,
      'Operations': 3
   };

   newRoomName = '';
   rooms = this.dataService.rooms;

   impersonatingUser = signal<User | null>(null);

   schedule = computed(() => this.dataService.schedule().sort((a, b) => a.time.localeCompare(b.time)));

   // KPI Statistics
   kpiStats = computed(() => {
      const sched = this.dataService.schedule();
      const students = this.dataService.users().filter(u => u.role === 'student');

      const p1 = sched.filter(s => s.preferenceRank === 'P1').length;
      const p2 = sched.filter(s => s.preferenceRank === 'P2').length;
      const p3 = sched.filter(s => s.preferenceRank === 'P3').length;
      const p4 = sched.filter(s => s.preferenceRank === 'P4').length;

      const studentSlotCounts = new Map<string, number>();
      students.forEach(s => studentSlotCounts.set(s.uid, 0)); // Init all with 0

      sched.forEach(s => {
         const count = studentSlotCounts.get(s.studentId) || 0;
         studentSlotCounts.set(s.studentId, count + 1);
      });

      let zeroSlots = 0;
      let oneSlot = 0;
      let twoSlots = 0;

      studentSlotCounts.forEach(count => {
         if (count === 0) zeroSlots++;
         else if (count === 1) oneSlot++;
         else if (count >= 2) twoSlots++;
      });

      return {
         p1, p2, p3, p4,
         zeroSlots,
         oneSlot,
         twoSlots,
         totalStudents: students.length
      };
   });

   // Attendance List Computation
   attendanceList = computed(() => {
      const sched = this.dataService.schedule();
      // Sort by time
      return sched.slice().sort((a, b) => a.time.localeCompare(b.time)).map(item => {
         let status = 'Absent';
         if (item.attendance && item.attendance !== 'pending') {
            status = item.attendance.charAt(0).toUpperCase() + item.attendance.slice(1);
         }
         return { ...item, statusDisplay: status };
      });
   });

   // Feedback List Computation
   feedbackList = computed(() => {
      const sched = this.dataService.schedule();
      return sched.filter(s => !!s.feedback).map(item => {
         const fb = item.feedback!;
         const avg = (fb.formatting + fb.alignment + fb.balance + fb.highlighting + fb.qualityOfPoints) / 5;
         return {
            ...item,
            feedbackAvg: avg.toFixed(2),
            feedbackSubmittedAt: new Date(fb.submittedAt)
         };
      }).sort((a, b) => b.feedbackSubmittedAt.getTime() - a.feedbackSubmittedAt.getTime());
   });

   // Tracking Data Computation
   trackingData = computed(() => {
      const master = this.dataService.masterStudents();
      const users = this.dataService.users();
      const prefs = this.dataService.preferences();

      return master.map(m => {
         const user = users.find(u =>
            (u.email && u.email.toLowerCase() === m.email.toLowerCase()) ||
            (u.rollNo && u.rollNo.toUpperCase() === m.rollNo.toUpperCase())
         );

         let status: 'not_registered' | 'registered_no_prefs' | 'complete' = 'not_registered';

         if (user) {
            const p = prefs.find(x => x.uid === user.uid);
            if (p && p.p1 && p.p2 && p.p3) {
               status = 'complete';
            } else {
               status = 'registered_no_prefs';
            }
         }

         return { student: m, status, registeredUser: user } as StudentTrackingStatus;
      });
   });

   stats = computed(() => {
      const data = this.trackingData();
      return {
         complete: data.filter(d => d.status === 'complete').length,
         pending: data.filter(d => d.status === 'registered_no_prefs').length,
         missing: data.filter(d => d.status === 'not_registered').length
      };
   });

   // Audit State
   auditIssues = signal<AuditIssue[]>([]);
   showAuditModal = signal(false);
   showDryRunModal = signal(false);

   // Generic Confirmation State
   confirmationConfig = signal<ConfirmationConfig | null>(null);
   confirmationInput = signal('');

   // Room View State
   selectedRoomUserId = signal<string | null>(null);

   roomStats = computed(() => {
      const rooms = this.dataService.rooms();
      const sched = this.dataService.schedule();

      return rooms.map(room => {
         const roomItems = sched.filter(s => s.roomName === room.name);
         const total = roomItems.length;
         const completed = roomItems.filter(i => i.attendance === 'present' || i.attendance === 'late' || i.attendance === 'absent').length;

         return {
            ...room,
            stats: {
               total,
               completed,
               remaining: total - completed
            }
         };
      });
   });

   // Room Load Dashboard Data
   timeSlots = computed(() => {
      const sched = this.dataService.schedule();
      const uniqueTimes = new Set<string>();
      sched.forEach(item => uniqueTimes.add(item.time));
      return Array.from(uniqueTimes).sort();
   });

   roomLoadData = computed(() => {
      const rooms = this.dataService.rooms();
      const sched = this.dataService.schedule();
      const slots = this.timeSlots();

      // Build a map of room -> time slot -> load count
      const loadMap = new Map<string, Map<string, number>>();

      rooms.forEach(room => {
         const timeMap = new Map<string, number>();
         slots.forEach(slot => timeMap.set(slot, 0));
         loadMap.set(room.name, timeMap);
      });

      // Count sessions per room per time slot
      sched.forEach(item => {
         if (item.roomName && loadMap.has(item.roomName)) {
            const timeMap = loadMap.get(item.roomName)!;
            const current = timeMap.get(item.time) || 0;
            timeMap.set(item.time, current + 1);
         }
      });

      // Calculate statistics
      let maxLoad = 0;
      let totalLoad = 0;
      loadMap.forEach(timeMap => {
         timeMap.forEach(count => {
            if (count > maxLoad) maxLoad = count;
            totalLoad += count;
         });
      });

      return {
         rooms: rooms.map(room => ({
            name: room.name,
            loads: slots.map(slot => loadMap.get(room.name)?.get(slot) || 0),
            totalLoad: Array.from(loadMap.get(room.name)?.values() || []).reduce((a, b) => a + b, 0),
            maxLoad: Math.max(...Array.from(loadMap.get(room.name)?.values() || []))
         })),
         timeSlots: slots,
         globalMaxLoad: maxLoad,
         totalSessions: totalLoad
      };
   });

   displayedUsers = computed(() => {
      const tab = this.userSubTab();
      const term = this.searchTerm().toLowerCase();
      const secFilter = this.sectorFilter();
      const allUsers = this.dataService.users();
      const allAvail = this.dataService.availability();
      const allRooms = this.dataService.rooms();
      const allPrefs = this.dataService.preferences();

      return allUsers
         .filter(u => {
            if (u.role === 'admin' || u.role === 'room') return false;
            if (tab === 'pgp1' && u.role !== 'student') return false;
            if (tab === 'pgp2' && u.role !== 'reviewer') return false;
            return true;
         })
         .filter(u => {
            return u.name.toLowerCase().includes(term) ||
               u.email.toLowerCase().includes(term) ||
               (u.rollNo || '').toLowerCase().includes(term);
         })
         .filter(u => {
            if (tab === 'pgp2' && secFilter !== 'All') {
               const avail = allAvail.find(a => a.uid === u.uid);
               return avail?.sector === secFilter;
            }
            return true;
         })
         .map(u => {
            let assignedSector = '';
            let slotCount = 0;
            let assignedRoomName = '';
            let p1 = '';
            let p2 = '';
            let p3 = '';

            if (u.role === 'student') {
               const prefs = allPrefs.find(p => p.uid === u.uid);
               if (prefs) {
                  p1 = prefs.p1;
                  p2 = prefs.p2;
                  p3 = prefs.p3;
               }
            }

            if (u.role === 'reviewer') {
               const userAvail = allAvail.find(a => a.uid === u.uid);
               if (userAvail) {
                  assignedSector = userAvail.sector || '';
                  slotCount = userAvail.slots.length;
               }
               if (u.assignedRoomId) {
                  assignedRoomName = allRooms.find(r => r.id === u.assignedRoomId)?.name || 'Unknown';
               }
            }
            return {
               ...u,
               assignedSector,
               slotCount,
               assignedRoomName,
               p1, p2, p3
            } as UserViewModel;
         });
   });

   impersonate(user: User) {
      this.impersonatingUser.set(user);
   }

   closeImpersonation() {
      this.impersonatingUser.set(null);
   }

   viewRoom(userId: string) {
      this.selectedRoomUserId.set(userId);
   }

   closeRoomView() {
      this.selectedRoomUserId.set(null);
   }

   // --- Generic Confirmation Logic ---
   openConfirmation(config: ConfirmationConfig) {
      this.confirmationInput.set('');
      this.confirmationConfig.set(config);
   }

   confirmAction() {
      const config = this.confirmationConfig();
      if (!config) return;

      // Double check input requirement (though button should be disabled)
      if (config.inputRequired && config.expectedInput) {
         if (this.confirmationInput() !== config.expectedInput) return;
      }

      config.onConfirm();
      this.confirmationConfig.set(null);
   }

   cancelConfirmation() {
      this.confirmationConfig.set(null);
   }

   showInfo(title: string, message: string, type: ConfirmationType = 'info') {
      this.confirmationConfig.set({
         type,
         title,
         message,
         confirmText: 'OK',
         singleButton: true,
         onConfirm: () => {
            this.confirmationConfig.set(null);
         }
      });
   }

   addRoom() {
      if (this.newRoomName.trim()) {
         this.dataService.addRoom(this.newRoomName.trim());
         this.newRoomName = '';
      }
   }

   removeRoom(id: string) {
      this.openConfirmation({
         title: 'Remove Room',
         message: 'Are you sure you want to remove this room? Associated user credentials will also be deleted.',
         type: 'danger',
         confirmText: 'Remove Room',
         onConfirm: () => this.dataService.removeRoom(id)
      });
   }

   deleteAllRooms() {
      this.openConfirmation({
         title: 'Delete All Rooms',
         message: 'Are you sure you want to delete ALL rooms? This cannot be undone.',
         type: 'danger',
         confirmText: 'Delete All',
         onConfirm: () => this.dataService.deleteAllRooms()
      });
   }

   generateCredentials() {
      this.dataService.generateMissingRoomCredentials();
      this.showInfo('Success', 'Room credentials generated successfully.');
   }

   updateAdminCreds() {
      if (this.adminEmail && this.adminPassword) {
         this.openConfirmation({
            title: 'Update Admin Credentials',
            message: 'Are you sure you want to change the Admin Login credentials?',
            type: 'warning',
            confirmText: 'Update',
            onConfirm: () => {
               this.dataService.updateAdminCredentials(this.adminEmail, this.adminPassword);
               this.showInfo('Success', 'Admin credentials updated. Please remember your new password.');
            }
         });
      } else {
         this.showInfo('Error', 'Please enter both a new email and password.', 'danger');
      }
   }

   toggleDryRun() {
      const currentState = this.isDryRun();
      if (currentState) {
         // Exiting
         this.dataService.toggleDryRun(false);
         this.loadConfigValues(); // Reload UI inputs with live values
         this.showInfo('Info', 'Exited Sandbox Mode. You are now viewing LIVE data.');
      } else {
         // Entering - Show Custom Modal
         this.showDryRunModal.set(true);
      }
   }

   proceedWithDryRun() {
      this.showDryRunModal.set(false);
      this.dataService.toggleDryRun(true);
      this.loadConfigValues(); // Reload UI inputs with sandbox values
   }

   seedData() {
      const msg = this.isDryRun()
         ? 'WARNING: This will wipe all SANDBOX data and generate new dummy data. Are you sure?'
         : 'FATAL WARNING: You are in LIVE MODE. This will wipe REAL DATA. Are you absolutely sure?';

      this.openConfirmation({
         title: 'Seed Dummy Data',
         message: msg,
         type: this.isDryRun() ? 'warning' : 'danger',
         confirmText: 'Generate Data',
         onConfirm: () => {
            this.dataService.seedDummyData(this.simulationStudentCount, this.simulationReviewerCounts);
            this.showInfo('Success', 'Dummy data generated. You can now run the scheduler.');
            this.activeTab.set('users');
         }
      });
   }

   saveConfig() {
      const toISO = (localStr: string) => {
         if (!localStr) return new Date().toISOString();
         return new Date(localStr).toISOString();
      };

      this.dataService.updateConfig({
         ...this.dataService.config(), // Preserve Published state
         studentRegistrationStart: toISO(this.studentStart),
         studentRegistrationEnd: toISO(this.studentEnd),
         reviewerRegistrationStart: toISO(this.reviewerStart),
         reviewerRegistrationEnd: toISO(this.reviewerEnd),
         roomBuffer: this.roomBuffer
      });
      this.showInfo('Success', 'Configuration saved successfully.');
   }

   runScheduler() {
      this.isScheduling.set(true);

      // Use setTimeout to allow UI to update before heavy computation
      setTimeout(() => {
         try {
            const schedule = this.scheduler.generateSchedule();
            this.dataService.saveSchedule(schedule);
            this.showInfo('Success', `Schedule generated with ${schedule.length} slots.`);
         } catch (error) {
            console.error('Scheduling error:', error);
            this.showInfo('Error', 'Failed to generate schedule. Check console for details.', 'danger');
         } finally {
            this.isScheduling.set(false);
         }
      }, 100);
   }

   runAudit() {
      const issues = this.scheduler.auditSchedule(this.dataService.schedule());
      this.auditIssues.set(issues);
      this.showAuditModal.set(true);

      const admin = this.authService.currentUser();
      if (admin) this.dataService.logAction(admin.uid, 'Run Audit', `Issues found: ${issues.filter(i => i.type !== 'success').length}`);
   }

   clearSchedule() {
      this.openConfirmation({
         title: 'Clear Schedule',
         message: 'Are you sure you want to delete the current schedule? This action cannot be undone.',
         type: 'danger',
         confirmText: 'Delete Schedule',
         onConfirm: () => this.dataService.deleteSchedule()
      });
   }

   togglePublish() {
      const currentState = this.isPublished();
      const msg = currentState
         ? 'Are you sure you want to UNPUBLISH the schedule? Students will no longer be able to see their slots.'
         : 'Are you sure you want to PUBLISH the schedule? All Students will immediately be able to see their assigned slots.';

      this.openConfirmation({
         title: currentState ? 'Unpublish Schedule' : 'Publish Schedule',
         message: msg,
         type: currentState ? 'warning' : 'info',
         confirmText: currentState ? 'Unpublish' : 'Publish',
         onConfirm: () => {
            this.dataService.updateConfig({
               ...this.dataService.config(),
               isSchedulePublished: !currentState
            });
         }
      });
   }

   purgeSystem() {
      this.openConfirmation({
         title: 'CRITICAL: Purge System',
         message: 'You are about to wipe the ENTIRE database for a fresh cycle.\n\nThis includes ALL Students, Reviewers, Rooms, Schedules, and the MASTER STUDENT LIST.\n\nAre you sure you want to continue?',
         type: 'danger',
         confirmText: 'Purge All Data',
         inputRequired: true,
         expectedInput: 'DELETE EVERYTHING',
         inputPlaceholder: "Type 'DELETE EVERYTHING' to confirm",
         onConfirm: () => {
            this.dataService.purgeAllData();
            this.showInfo('Success', 'System purged. All data has been reset for a new cycle.');
            this.loadConfigValues(); // Refresh dates
         }
      });
   }

   getUniqueReviewers() {
      const s = this.dataService.schedule();
      const unique = new Set(s.map(x => x.reviewerId));
      return unique.size;
   }

   exportEmails() {
      this.openConfirmation({
         title: 'Send Emails',
         message: "Type 'PROCEED' to confirm sending emails to all scheduled participants.",
         type: 'info',
         confirmText: 'Send Emails',
         inputRequired: true,
         expectedInput: 'PROCEED',
         inputPlaceholder: "Type 'PROCEED'",
         onConfirm: () => {
            this.showInfo('Error', "Error: Admin permission check failed. (Hint: Maybe ask nicely?)", 'danger');
         }
      });
   }

   exportUsers() {
      const role = this.userSubTab() === 'pgp1' ? 'student' : 'reviewer';
      // Get all users of this role, not just the filtered view, for a full data dump
      const users = this.dataService.users().filter(u => u.role === role);
      const prefs = this.dataService.preferences();
      const avail = this.dataService.availability();
      const rooms = this.dataService.rooms();

      let data: any[] = [];
      let fileName = '';

      if (role === 'student') {
         fileName = 'IIMA_PGP1_Student_Preferences.xlsx';
         data = users.map(u => {
            const p = prefs.find(x => x.uid === u.uid);
            return {
               'Roll No': u.rollNo || '',
               'Name': u.name,
               'Email': u.email,
               'Phone': u.phone || '',
               'Preference 1': p?.p1 || '-',
               'Preference 2': p?.p2 || '-',
               'Preference 3': p?.p3 || '-',
               'Preference 4': p?.p4 || '-'
            };
         });
      } else {
         fileName = 'IIMA_PGP2_Reviewers.xlsx';
         data = users.map(u => {
            const a = avail.find(x => x.uid === u.uid);
            const room = rooms.find(r => r.id === u.assignedRoomId);
            return {
               'Name': u.name,
               'Email': u.email,
               'Phone': u.phone || '',
               'Sector': a?.sector || 'Not Selected',
               'Slots Count': a?.slots?.length || 0,
               'Slots': a?.slots?.join(', ') || '',
               'Assigned Room': room?.name || 'Unassigned'
            };
         });
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");

      const finalName = this.getTimestampedFilename(fileName.replace('.xlsx', ''));
      this.saveWorkbook(wb, finalName);
   }

   exportSchedule() {
      const sched = this.dataService.schedule();
      if (sched.length === 0) {
         this.showInfo('Warning', 'No schedule to export.', 'warning');
         return;
      }

      const data = sched.map(item => ({
         'Time': item.time,
         'Sector': item.sector,
         'Room': item.roomName || 'Unassigned',
         'Preference Rank': item.preferenceRank || '-',
         'Student Name': item.studentName,
         'Student Roll': item.studentRoll,
         'Reviewer Name': item.reviewerName,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Schedule");

      const fileName = this.getTimestampedFilename("IIMA_CV_Day_Master_Schedule");
      this.saveWorkbook(wb, fileName);
   }

   exportAttendanceReport() {
      const sched = this.dataService.schedule();
      const rooms = this.dataService.rooms();

      if (sched.length === 0) {
         this.showInfo('Warning', 'No schedule to export.', 'warning');
         return;
      }

      const wb = XLSX.utils.book_new();
      let hasData = false;

      rooms.forEach(room => {
         const roomItems = sched.filter(s => s.roomName === room.name);
         // Sort by time
         roomItems.sort((a, b) => a.time.localeCompare(b.time));

         if (roomItems.length > 0) {
            hasData = true;
            const data = roomItems.map(item => {
               // Capitalize status, default to 'Absent' if pending/null
               let status = 'Absent';
               if (item.attendance && item.attendance !== 'pending') {
                  status = item.attendance.charAt(0).toUpperCase() + item.attendance.slice(1);
               }

               return {
                  'Time': item.time,
                  'Candidate Name': item.studentName,
                  'Roll No': item.studentRoll,
                  'Reviewer': item.reviewerName,
                  'Sector': item.sector,
                  'Attendance Status': status
               };
            });

            const ws = XLSX.utils.json_to_sheet(data);
            // Sheet names max 31 chars, strict regex cleanup
            const safeName = room.name.substring(0, 30).replace(/[:\/?*\[\]\\]/g, "");
            XLSX.utils.book_append_sheet(wb, ws, safeName);
         }
      });

      if (!hasData) {
         this.showInfo('Warning', 'No scheduled items found for any rooms.', 'warning');
         return;
      }

      const fileName = this.getTimestampedFilename("IIMA_CV_Day_Attendance_Report");
      this.saveWorkbook(wb, fileName);
   }

   exportLogs() {
      const logs = this.dataService.logs();
      if (logs.length === 0) {
         this.showInfo('Warning', 'No logs to export.', 'warning');
         return;
      }

      const data = logs.map(log => ({
         'Timestamp': new Date(log.timestamp).toLocaleString(),
         'Actor Name': log.actorName,
         'Actor Role': log.actorRole,
         'Action': log.action,
         'Details': log.details
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "System Logs");

      const fileName = this.getTimestampedFilename("IIMA_CV_Day_System_Logs");
      this.saveWorkbook(wb, fileName);
   }

   exportFeedbackData() {
      const sched = this.dataService.schedule();
      const feedbacks = sched.filter(s => !!s.feedback);

      if (feedbacks.length === 0) {
         this.showInfo('Warning', 'No feedback submitted yet.', 'warning');
         return;
      }

      const data = feedbacks.map(item => {
         const fb = item.feedback!;
         const avg = (fb.formatting + fb.alignment + fb.balance + fb.highlighting + fb.qualityOfPoints) / 5;

         return {
            'Roll No': item.studentRoll,
            'Candidate Name': item.studentName,
            'Reviewer': item.reviewerName,
            'Sector': item.sector,
            'Formatting': fb.formatting,
            'Alignment': fb.alignment,
            'Balance': fb.balance,
            'Highlighting': fb.highlighting,
            'Quality of Points': fb.qualityOfPoints,
            'Average Score': avg.toFixed(2),
            'Comments': fb.comments || '',
            'Submitted At': new Date(fb.submittedAt).toLocaleString()
         };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CV Reviews");

      const fileName = this.getTimestampedFilename("IIMA_CV_Day_Feedback");
      this.saveWorkbook(wb, fileName);
   }

   // --- Excel Upload for Tracking ---
   downloadTemplate() {
      // Create a new workbook with headers
      const headers = [['Roll No', 'Name', 'Email']];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(headers);

      // Set column widths for better UX
      const wscols = [
         { wch: 15 }, // Roll No
         { wch: 30 }, // Name
         { wch: 35 }  // Email
      ];
      ws['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, "Template");

      // Template doesn't strictly need a timestamp, but keeping it consistent or just ensuring .xlsx
      this.saveWorkbook(wb, "IIMA_CV_Day_Master_Template.xlsx");
   }

   onFileChange(evt: any) {
      const target: DataTransfer = <DataTransfer>(evt.target);
      if (target.files.length !== 1) {
         this.showInfo('Error', 'Cannot use multiple files. Please upload a single .xlsx file.', 'danger');
         return;
      }

      const reader: FileReader = new FileReader();
      reader.onload = (e: any) => {
         try {
            const bstr: string = e.target.result;
            const wb: any = XLSX.read(bstr, { type: 'binary' });
            const wsname: string = wb.SheetNames[0];
            const ws: any = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            // Try to map data to MasterStudent, checking for various common header names
            const masterList: MasterStudent[] = data.map((row: any) => ({
               name: row['Name'] || row['name'] || row['Full Name'],
               email: row['Email'] || row['email'] || row['Email Address'],
               rollNo: row['Roll No'] || row['RollNo'] || row['rollno'] || row['Roll Number']
            })).filter((x: any) => x.email && x.rollNo);

            if (masterList.length === 0) {
               this.showInfo('Error', 'No valid student data found. Please ensure headers include Name, Email, and Roll No.', 'danger');
               return;
            }

            this.dataService.updateMasterList(masterList);
            this.showInfo('Success', `Successfully imported ${masterList.length} students from Excel.`);

         } catch (err) {
            console.error(err);
            this.showInfo('Error', 'Failed to parse Excel file. Please ensure it is a valid .xlsx file.', 'danger');
         }
      };
      reader.readAsBinaryString(target.files[0]);
   }

   constructor() {
      this.loadConfigValues();

      const admin = this.dataService.getAdminUser();
      if (admin) {
         this.adminEmail = admin.email;
         this.adminPassword = admin.password || '';
      }
   }

   loadConfigValues() {
      const c = this.dataService.config();
      this.studentStart = this.formatDateForInput(c.studentRegistrationStart);
      this.studentEnd = this.formatDateForInput(c.studentRegistrationEnd);
      this.reviewerStart = this.formatDateForInput(c.reviewerRegistrationStart);
      this.reviewerEnd = this.formatDateForInput(c.reviewerRegistrationEnd);
      this.roomBuffer = c.roomBuffer;
   }

   formatDateForInput(isoStr: string): string {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
   }

   // --- Helper Methods for Excel Export ---

   private getTimestampedFilename(baseName: string): string {
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      const timePart = now.toTimeString().slice(0, 5).replace(/:/g, ''); // HHmm
      return `${baseName}_${datePart}_${timePart}.xlsx`;
   }

   private saveWorkbook(wb: any, fileName: string) {
      console.log('Starting download for:', fileName);

      // Write to buffer directly
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // Create Blob
      const blob = new Blob([wbout], { type: 'application/octet-stream' });

      // Trigger Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
   }
}