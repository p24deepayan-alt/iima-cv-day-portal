

import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { ScheduleItem, User, StudentPreferences, ReviewerAvailability, Room, AuditIssue } from './types';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  constructor(private dataService: DataService) { }

  generateSchedule(): ScheduleItem[] {
    const students = this.dataService.users().filter(u => u.role === 'student');
    const prefs = this.dataService.preferences();
    const reviewers = this.dataService.users().filter(u => u.role === 'reviewer');
    const availability = this.dataService.availability();

    let bestSchedule: ScheduleItem[] = [];
    let maxMatches = -1;

    // Run 20 iterations to optimize
    for (let i = 0; i < 20; i++) {
      const shuffledStudents = this.shuffleArray([...students]);
      const result = this.runSingleIteration(shuffledStudents, prefs, reviewers, availability);

      // Simple fitness function: count total assignments
      if (result.length > maxMatches) {
        maxMatches = result.length;
        bestSchedule = result;
      }
    }

    // After finding best interview schedule, assign rooms to reviewers
    const scheduleWithRooms = this.assignRooms(bestSchedule, reviewers);

    return scheduleWithRooms;
  }

  auditSchedule(schedule: ScheduleItem[]): AuditIssue[] {
    const issues: AuditIssue[] = [];

    if (schedule.length === 0) {
      return [{ type: 'warning', message: 'Schedule is empty. Nothing to audit.' }];
    }

    // Group by Student
    const studentsMap = new Map<string, ScheduleItem[]>();
    // Group by Reviewer
    const reviewersMap = new Map<string, ScheduleItem[]>();

    schedule.forEach(item => {
      if (!studentsMap.has(item.studentId)) studentsMap.set(item.studentId, []);
      studentsMap.get(item.studentId)!.push(item);

      if (!reviewersMap.has(item.reviewerId)) reviewersMap.set(item.reviewerId, []);
      reviewersMap.get(item.reviewerId)!.push(item);
    });

    // Rule 1: Student Slots != 2 (Strictly 2)
    const allStudents = this.dataService.users().filter(u => u.role === 'student');
    allStudents.forEach(s => {
      const items = studentsMap.get(s.uid) || [];
      if (items.length !== 2) {
        issues.push({
          type: 'error',
          entityId: s.uid,
          entityName: s.name,
          message: `Student has ${items.length} slot(s) assigned instead of 2.`
        });
      }

      // Rule 3: 60 min gap
      if (items.length > 1) {
        const times = items.map(i => this.timeToMinutes(i.time)).sort((a, b) => a - b);
        for (let i = 0; i < times.length - 1; i++) {
          const diff = times[i + 1] - times[i];
          if (diff < 60) {
            issues.push({
              type: 'error',
              entityId: s.uid,
              entityName: s.name,
              message: `Gap between slots is less than 60 mins (${diff} mins).`
            });
          }
        }
      }
    });

    // Rule 2: Reviewer Room Count > 1
    reviewersMap.forEach((items, rId) => {
      const rooms = new Set(items.map(i => i.roomName).filter(r => !!r && r !== 'Unassigned'));
      if (rooms.size > 1) {
        issues.push({
          type: 'error',
          entityId: rId,
          entityName: items[0].reviewerName,
          message: `Reviewer is assigned to multiple rooms: ${Array.from(rooms).join(', ')}`
        });
      }
    });

    if (issues.length === 0) {
      issues.push({ type: 'success', message: 'Audit Passed: All constraints satisfied.' });
    }

    return issues;
  }

  private assignRooms(schedule: ScheduleItem[], reviewers: User[]): ScheduleItem[] {
    const rooms = this.dataService.rooms();
    const buffer = this.dataService.config().roomBuffer;

    if (rooms.length === 0) return schedule;

    // 1. Calculate Global Peak Load
    const timeLoad = new Map<string, number>();
    schedule.forEach(item => {
      const count = timeLoad.get(item.time) || 0;
      timeLoad.set(item.time, count + 1);
    });

    let maxGlobalLoad = 0;
    timeLoad.forEach(count => {
      if (count > maxGlobalLoad) maxGlobalLoad = count;
    });

    // 2. Calculate Max Capacity Per Room
    const maxCapacityPerRoom = Math.ceil(maxGlobalLoad / rooms.length) + buffer;

    // 3. Identify Active Times per Reviewer based on generated schedule
    const reviewerActiveTimes = new Map<string, string[]>();

    schedule.forEach(item => {
      const times = reviewerActiveTimes.get(item.reviewerId) || [];
      times.push(item.time);
      reviewerActiveTimes.set(item.reviewerId, times);
    });

    // 4. Assign Rooms
    const roomOccupancy = new Map<string, Map<string, number>>();
    rooms.forEach(r => roomOccupancy.set(r.id, new Map()));

    const assignments = new Map<string, string>(); // reviewerId -> roomId

    const activeReviewerIds = Array.from(reviewerActiveTimes.keys());

    // Sort reviewers by number of slots (descending) to assign busier reviewers first
    activeReviewerIds.sort((a, b) => {
      const aSlots = reviewerActiveTimes.get(a)?.length || 0;
      const bSlots = reviewerActiveTimes.get(b)?.length || 0;
      return bSlots - aSlots; // Descending order
    });

    // Helper function to calculate the max load for a room
    const calculateRoomMaxLoad = (roomId: string, occupancyMap: Map<string, number>): number => {
      let maxLoad = 0;
      occupancyMap.forEach(count => {
        if (count > maxLoad) maxLoad = count;
      });
      return maxLoad;
    };

    for (const rId of activeReviewerIds) {
      const myTimes = reviewerActiveTimes.get(rId) || [];
      let bestRoom: Room | null = null;
      let bestLoadScore = Infinity;

      // Try each room and calculate what the max load would be if we assigned this reviewer
      for (const room of rooms) {
        const occupancyMap = roomOccupancy.get(room.id)!;
        let fits = true;

        // Check if reviewer fits in this room
        for (const t of myTimes) {
          const currentLoad = occupancyMap.get(t) || 0;
          if (currentLoad >= maxCapacityPerRoom) {
            fits = false;
            break;
          }
        }

        if (fits) {
          // Calculate what the max load would be if we assign this reviewer
          const tempMaxLoad = Math.max(
            calculateRoomMaxLoad(room.id, occupancyMap),
            ...myTimes.map(t => (occupancyMap.get(t) || 0) + 1)
          );

          // Choose the room with the lowest resulting max load (min-max strategy)
          if (tempMaxLoad < bestLoadScore) {
            bestLoadScore = tempMaxLoad;
            bestRoom = room;
          }
        }
      }

      // Assign to the best room found, or fall back to first room
      const assignedRoom = bestRoom || rooms[0];

      assignments.set(rId, assignedRoom.id);
      this.dataService.updateUserRoomAssignment(rId, assignedRoom.id);

      // Update occupancy map
      const occupancyMap = roomOccupancy.get(assignedRoom.id)!;
      for (const t of myTimes) {
        const currentLoad = occupancyMap.get(t) || 0;
        occupancyMap.set(t, currentLoad + 1);
      }
    }

    // 5. Update Schedule Items with Room Names
    return schedule.map(item => {
      const rId = assignments.get(item.reviewerId);
      const room = rooms.find(r => r.id === rId);
      return {
        ...item,
        roomName: room ? room.name : 'Unassigned'
      };
    });
  }

  private runSingleIteration(
    students: User[],
    prefs: StudentPreferences[],
    reviewers: User[],
    availability: ReviewerAvailability[]
  ): ScheduleItem[] {
    const schedule: ScheduleItem[] = [];

    // Map to track assigned slots per student to enforce gap
    const studentAssignments: Map<string, number[]> = new Map();

    // Map to track reviewer usage
    const reviewerOccupied: Set<string> = new Set();

    // Helper to check gap
    const isGapValid = (studentId: string, timeStr: string): boolean => {
      const assignedTimes = studentAssignments.get(studentId) || [];
      const newTimeVal = this.timeToMinutes(timeStr);

      for (const t of assignedTimes) {
        if (Math.abs(t - newTimeVal) < 60) return false;
      }
      return true;
    };

    // Helper to find a slot
    const assignSlot = (student: User, sector: string, rank: 'P1' | 'P2' | 'P3' | 'P4') => {
      // If student already has 2 slots, skip
      if ((studentAssignments.get(student.uid)?.length || 0) >= 2) return;

      // Find available reviewers for this sector
      const allPossibleSlots: { rId: string, time: string }[] = [];

      availability.forEach(avail => {
        if (avail.sector === sector) {
          avail.slots.forEach(time => {
            allPossibleSlots.push({ rId: avail.uid, time: time });
          });
        }
      });

      // Sort by time to fill morning first
      allPossibleSlots.sort((a, b) => this.timeToMinutes(a.time) - this.timeToMinutes(b.time));

      for (const potential of allPossibleSlots) {
        const key = `${potential.rId}-${potential.time}`;

        // Check if reviewer is free
        if (reviewerOccupied.has(key)) continue;

        // Check student gap constraint
        if (!isGapValid(student.uid, potential.time)) continue;

        // Assign
        reviewerOccupied.add(key);
        const currentList = studentAssignments.get(student.uid) || [];
        currentList.push(this.timeToMinutes(potential.time));
        studentAssignments.set(student.uid, currentList);

        const rName = reviewers.find(r => r.uid === potential.rId)?.name || 'Unknown';

        schedule.push({
          studentId: student.uid,
          studentName: student.name,
          studentRoll: student.rollNo || '',
          reviewerId: potential.rId,
          reviewerName: rName,
          time: potential.time,
          sector: sector as any,
          preferenceRank: rank
        });

        return; // Successfully assigned this preference
      }
    };

    // Round 1: Preference 1
    students.forEach(student => {
      const p = prefs.find(x => x.uid === student.uid);
      if (p && p.p1) assignSlot(student, p.p1, 'P1');
    });

    // Round 2: Preference 2
    students.forEach(student => {
      const p = prefs.find(x => x.uid === student.uid);
      if (p && p.p2) assignSlot(student, p.p2, 'P2');
    });

    // Round 3: Preference 3
    students.forEach(student => {
      const p = prefs.find(x => x.uid === student.uid);
      if (p && p.p3) assignSlot(student, p.p3, 'P3');
    });

    // Round 4: Preference 4 (Optional)
    students.forEach(student => {
      const p = prefs.find(x => x.uid === student.uid);
      if (p && p.p4) assignSlot(student, p.p4, 'P4');
    });

    return schedule;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}