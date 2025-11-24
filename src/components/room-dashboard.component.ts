
import { Component, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { ScheduleItem, AttendanceStatus } from '../services/types';

@Component({
  selector: 'app-room-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-slate-100 font-sans">
      
      <!-- Room Header -->
      <div class="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-sm shrink-0 gap-4">
         <div>
            <div class="text-[10px] uppercase tracking-widest font-bold text-slate-400">Room Administration</div>
            <h1 class="text-3xl font-serif font-bold text-iima-blue">{{ roomName() }}</h1>
            <p class="text-xs text-slate-500 mt-1">Attendance & Flow Management</p>
         </div>
         
         <!-- Stats -->
         <div class="flex gap-4">
            <div class="bg-slate-50 border border-slate-200 rounded-sm px-4 py-2 text-center">
               <div class="text-xl font-bold text-slate-800">{{ stats().total }}</div>
               <div class="text-[9px] uppercase font-bold text-slate-400">Total</div>
            </div>
            <div class="bg-green-50 border border-green-200 rounded-sm px-4 py-2 text-center">
               <div class="text-xl font-bold text-green-700">{{ stats().completed }}</div>
               <div class="text-[9px] uppercase font-bold text-green-600">Completed</div>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-sm px-4 py-2 text-center">
               <div class="text-xl font-bold text-blue-700">{{ stats().remaining }}</div>
               <div class="text-[9px] uppercase font-bold text-blue-600">Remaining</div>
            </div>
         </div>
      </div>

      <!-- Main List -->
      <div class="flex-1 overflow-auto p-4 md:p-6">
         @if (roomSchedule().length > 0) {
            <div class="bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden">
               <table class="w-full text-left border-collapse">
                  <thead class="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                     <tr>
                        <th class="p-4 w-24">Time</th>
                        <th class="p-4">Candidate</th>
                        <th class="p-4 hidden md:table-cell">Reviewer & Sector</th>
                        <th class="p-4 text-center">Attendance</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                     @for (item of roomSchedule(); track $index) {
                        <tr class="hover:bg-slate-50 transition-colors" [class.bg-green-50]="item.attendance === 'present'">
                           <td class="p-4">
                              <span class="font-mono font-bold text-slate-700">{{ item.time }}</span>
                           </td>
                           <td class="p-4">
                              <div class="font-bold text-slate-800">{{ item.studentName }}</div>
                              <div class="text-xs font-mono text-slate-500">{{ item.studentRoll }}</div>
                           </td>
                           <td class="p-4 hidden md:table-cell">
                              <div class="text-sm font-medium text-slate-700">{{ item.reviewerName }}</div>
                              <span class="text-[10px] uppercase font-bold text-iima-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{{ item.sector }}</span>
                           </td>
                           <td class="p-4 text-center">
                              <div class="flex justify-center gap-2">
                                 <button (click)="setStatus(item, 'present')" 
                                    [class.bg-green-600]="item.attendance === 'present'"
                                    [class.text-white]="item.attendance === 'present'"
                                    [class.bg-white]="item.attendance !== 'present'"
                                    [class.text-green-600]="item.attendance !== 'present'"
                                    class="border border-green-200 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all hover:bg-green-600 hover:text-white shadow-sm">
                                    <i class="fas fa-check mr-1"></i> Present
                                 </button>
                                 <button (click)="setStatus(item, 'late')" 
                                    [class.bg-amber-500]="item.attendance === 'late'"
                                    [class.text-white]="item.attendance === 'late'"
                                    [class.bg-white]="item.attendance !== 'late'"
                                    [class.text-amber-500]="item.attendance !== 'late'"
                                    class="border border-amber-200 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all hover:bg-amber-500 hover:text-white shadow-sm">
                                    <i class="fas fa-clock mr-1"></i> Late
                                 </button>
                                 <button (click)="setStatus(item, 'absent')" 
                                    [class.bg-red-500]="item.attendance === 'absent'"
                                    [class.text-white]="item.attendance === 'absent'"
                                    [class.bg-white]="item.attendance !== 'absent'"
                                    [class.text-red-500]="item.attendance !== 'absent'"
                                    class="border border-red-200 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all hover:bg-red-500 hover:text-white shadow-sm">
                                    <i class="fas fa-times mr-1"></i> Absent
                                 </button>
                              </div>
                              @if(item.attendance) {
                                 <div class="text-[10px] text-slate-400 mt-1 uppercase font-medium">
                                    Marked {{ item.attendance }}
                                 </div>
                              }
                           </td>
                        </tr>
                     }
                  </tbody>
               </table>
            </div>
         } @else {
            <div class="h-full flex flex-col items-center justify-center text-slate-400">
               <i class="fas fa-calendar-times text-6xl mb-4 text-slate-200"></i>
               <h3 class="text-xl font-serif font-bold text-slate-600">No Schedule Found</h3>
               <p class="text-sm">There are no reviews scheduled for this room.</p>
            </div>
         }
      </div>
    </div>
  `
})
export class RoomDashboardComponent {
  @Input() targetUserId: string | null = null;
  private dataService = inject(DataService);

  myRoom = computed(() => {
     if (!this.targetUserId) return null;
     return this.dataService.rooms().find(r => r.linkedUserId === this.targetUserId);
  });

  roomName = computed(() => this.myRoom()?.name || 'Unknown Room');

  roomSchedule = computed(() => {
    const room = this.myRoom();
    if (!room) return [];
    
    // Sort chronological
    return this.dataService.schedule()
      .filter(s => s.roomName === room.name)
      .sort((a, b) => a.time.localeCompare(b.time));
  });

  stats = computed(() => {
    const s = this.roomSchedule();
    const total = s.length;
    const completed = s.filter(i => i.attendance === 'present' || i.attendance === 'late' || i.attendance === 'absent').length;
    return {
       total,
       completed,
       remaining: total - completed
    };
  });

  setStatus(item: ScheduleItem, status: AttendanceStatus) {
    this.dataService.markAttendance(item, status);
  }
}
