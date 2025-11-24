
import { Injectable, signal, computed, inject } from '@angular/core';
import { User, StudentPreferences, ReviewerAvailability, Config, ScheduleItem, SECTORS, Room, Sector, AttendanceStatus, MasterStudent, SystemLog, ReviewFeedback } from './types';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private security = inject(SecurityService);

  // Mode Flag - Initialize from LocalStorage to persist state across refreshes
  isDryRun = signal<boolean>(localStorage.getItem('app_mode') === 'sandbox');

  // Signals acting as database tables
  users = signal<User[]>([]);
  preferences = signal<StudentPreferences[]>([]);
  availability = signal<ReviewerAvailability[]>([]);
  rooms = signal<Room[]>([]);
  masterStudents = signal<MasterStudent[]>([]);
  logs = signal<SystemLog[]>([]);
  
  config = signal<Config>({
    studentRegistrationStart: new Date().toISOString(),
    studentRegistrationEnd: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerRegistrationStart: new Date().toISOString(),
    reviewerRegistrationEnd: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    roomBuffer: 2,
    isSchedulePublished: false
  });

  schedule = signal<ScheduleItem[]>([]);

  constructor() {
    this.loadFromStorage();
    this.setupRealTimeSync();
  }

  // --- Persistence Logic ---

  private get prefix() {
    return this.isDryRun() ? 'sandbox_' : 'cv_';
  }

  // Helper to load Obfuscated Data
  private getItem(key: string): string | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    // Attempt to de-obfuscate. If it fails (legacy data), return raw.
    try {
      // Check if it looks like base64 (simple heuristic)
      if (!raw.trim().startsWith('{') && !raw.trim().startsWith('[')) {
         return this.security.deobfuscate(raw);
      }
      return raw;
    } catch {
      return raw;
    }
  }

  private setItem(key: string, value: any) {
    const str = JSON.stringify(value);
    // Obfuscate to prevent casual editing in DevTools
    const secured = this.security.obfuscate(str);
    localStorage.setItem(key, secured);
  }

  private loadFromStorage() {
    try {
      const p = this.prefix;
      const storedUsers = this.getItem(`${p}users`);
      const storedPrefs = this.getItem(`${p}prefs`);
      const storedAvail = this.getItem(`${p}avail`);
      const storedConfig = this.getItem(`${p}config`);
      const storedSched = this.getItem(`${p}schedule`);
      const storedRooms = this.getItem(`${p}rooms`);
      const storedMaster = this.getItem(`${p}master`);
      const storedLogs = this.getItem(`${p}logs`);

      if (storedUsers) {
        this.users.set(JSON.parse(storedUsers));
      } else {
        // Default Admin if empty (only for Live mode usually, Dry Run handled in toggle)
        if (!this.isDryRun()) {
          this.users.set([{
            uid: 'admin-1',
            email: 'admin@iima.ac.in',
            password: 'admin',
            name: 'Placecom Admin',
            role: 'admin'
          }]);
        } else {
          this.users.set([]);
        }
      }

      if (storedPrefs) this.preferences.set(JSON.parse(storedPrefs));
      else this.preferences.set([]);

      if (storedAvail) this.availability.set(JSON.parse(storedAvail));
      else this.availability.set([]);

      if (storedConfig) this.config.set(JSON.parse(storedConfig));
      // Keep default config if not found

      if (storedSched) this.schedule.set(JSON.parse(storedSched));
      else this.schedule.set([]);
      
      if (storedRooms) {
        this.rooms.set(JSON.parse(storedRooms));
      }

      if (storedMaster) {
         this.masterStudents.set(JSON.parse(storedMaster));
      }

      if (storedLogs) {
        this.logs.set(JSON.parse(storedLogs));
      }

    } catch (e) {
      console.error('Failed to load data', e);
      // If data is corrupted (e.g. bad obfuscation), nuke it to prevent crash loops
      // localStorage.clear(); // Risky in prod, but ok for dev
    }
  }

  private saveToStorage() {
    const p = this.prefix;
    this.setItem(`${p}users`, this.users());
    this.setItem(`${p}prefs`, this.preferences());
    this.setItem(`${p}avail`, this.availability());
    this.setItem(`${p}config`, this.config());
    this.setItem(`${p}schedule`, this.schedule());
    this.setItem(`${p}rooms`, this.rooms());
    this.setItem(`${p}master`, this.masterStudents());
    this.setItem(`${p}logs`, this.logs());
  }

  /**
   * Real-time Sync Listener
   * Listens for 'storage' events triggered by other tabs/windows on the same domain.
   */
  private setupRealTimeSync() {
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith(this.prefix)) {
         // Identify which key changed and reload ONLY that signal
         // This provides "Real Time" updates across tabs without full reload
         const raw = event.newValue;
         if (!raw) return;

         const val = this.security.deobfuscate(raw); // Data comes in obfuscated
         const data = JSON.parse(val);

         const suffix = event.key.replace(this.prefix, '');

         switch(suffix) {
            case 'users': this.users.set(data); break;
            case 'prefs': this.preferences.set(data); break;
            case 'avail': this.availability.set(data); break;
            case 'config': this.config.set(data); break;
            case 'schedule': this.schedule.set(data); break; // Syncs attendance & feedback
            case 'rooms': this.rooms.set(data); break;
            case 'master': this.masterStudents.set(data); break;
            case 'logs': this.logs.set(data); break;
         }
      }
    });
  }

  // --- Logging System ---
  logAction(actorUid: string, action: string, details: string = '') {
    const user = this.users().find(u => u.uid === actorUid);
    const logEntry: SystemLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actorUid: actorUid,
      actorName: user ? user.name : 'Unknown/System',
      actorRole: user ? user.role : 'system',
      action: action,
      details: details
    };
    
    this.logs.update(l => [logEntry, ...l]); // Newest first
    this.saveToStorage();
  }

  toggleDryRun(enable: boolean) {
    const currentAdmin = this.getAdminUser();
    // 1. Save current state of whatever mode we are in
    this.saveToStorage();

    // 2. Switch Mode & Persist
    this.isDryRun.set(enable);
    localStorage.setItem('app_mode', enable ? 'sandbox' : 'live');

    // 3. Load data for new mode
    this.loadFromStorage();

    // 4. Special Handling: If entering Dry Run and it's empty/no-admin, 
    // copy the current Live Admin to Sandbox so they don't get locked out.
    if (enable) {
      const adminToRestore = currentAdmin;
      if (adminToRestore) {
         // Check if admin exists in sandbox
         const exists = this.users().find(u => u.email === adminToRestore.email);
         if (!exists) {
            this.users.update(u => [...u, adminToRestore]);
            this.saveToStorage();
         }
      }
    }
  }

  // --- User Management ---
  addUser(user: User) {
    // Security: Sanitize Input
    const cleanUser = this.security.sanitizeUserObject(user);

    this.users.update(u => [...u, cleanUser]);
    if (cleanUser.role === 'student') {
      this.preferences.update(p => [...p, { uid: cleanUser.uid, p1: '', p2: '', p3: '', p4: '' }]);
    } else if (cleanUser.role === 'reviewer') {
      this.availability.update(a => [...a, { uid: cleanUser.uid, sector: '', slots: [] }]);
    }
    
    this.logAction(cleanUser.uid, 'User Registration', `Role: ${cleanUser.role}, Email: ${cleanUser.email}`);
    this.saveToStorage();
  }

  updateUser(user: User) {
    const cleanUser = this.security.sanitizeUserObject(user);
    this.users.update(users => users.map(u => u.uid === cleanUser.uid ? cleanUser : u));
    this.saveToStorage();
  }

  updateUserRoomAssignment(uid: string, roomId: string) {
    this.users.update(users => users.map(u => u.uid === uid ? { ...u, assignedRoomId: roomId } : u));
    this.saveToStorage();
  }

  getAdminUser() {
    return this.users().find(u => u.role === 'admin');
  }

  updateAdminCredentials(email: string, pass: string) {
    // Sanitization
    const cleanEmail = this.security.sanitize(email);
    const admin = this.getAdminUser();
    this.users.update(users => users.map(u => 
      u.role === 'admin' ? { ...u, email: cleanEmail, password: pass } : u
    ));
    if (admin) this.logAction(admin.uid, 'Update Admin Credentials', `New Email: ${cleanEmail}`);
    this.saveToStorage();
  }

  // --- Preferences ---
  updatePreferences(uid: string, prefs: Partial<StudentPreferences>) {
    this.preferences.update(current => {
      const exists = current.find(p => p.uid === uid);
      if (exists) {
        return current.map(p => p.uid === uid ? { ...p, ...prefs } : p);
      }
      return [...current, { uid, p1: '', p2: '', p3: '', p4: '', ...prefs } as StudentPreferences];
    });
    this.logAction(uid, 'Update Preferences', `P1: ${prefs.p1}, P2: ${prefs.p2}`);
    this.saveToStorage();
  }

  getStudentPreferences(uid: string) {
    return computed(() => this.preferences().find(p => p.uid === uid));
  }

  // --- Availability ---
  updateAvailability(uid: string, sector: Sector, slots: string[]) {
    this.availability.update(current => {
        const exists = current.find(a => a.uid === uid);
        if (exists) {
            return current.map(a => a.uid === uid ? { ...a, sector, slots } : a);
        }
        return [...current, { uid, sector, slots }];
    });
    this.logAction(uid, 'Update Availability', `Sector: ${sector}, Slots: ${slots.length}`);
    this.saveToStorage();
  }

  getReviewerAvailability(uid: string) {
    return computed(() => this.availability().find(a => a.uid === uid));
  }

  // --- Config ---
  updateConfig(newConfig: Config) {
    const admin = this.getAdminUser();
    this.config.set(newConfig);
    if (admin) this.logAction(admin.uid, 'Update Config', `Published: ${newConfig.isSchedulePublished}`);
    this.saveToStorage();
  }

  // --- Rooms ---
  addRoom(name: string) {
    const cleanName = this.security.sanitize(name);
    // 1. Generate Creds
    const sanitized = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suffix = this.isDryRun() ? 'sandbox' : 'room';
    const email = `${sanitized}_${suffix}@iima.ac.in`;
    
    // If Dry Run, use 'dummyaccount', else random secure string
    const password = this.isDryRun() ? 'dummyaccount' : Math.random().toString(36).slice(-8); 
    
    const uid = `room-user-${crypto.randomUUID()}`;

    // 2. Create User Account
    const roomUser: User = {
       uid,
       name: `Room Admin (${cleanName})`,
       email,
       password,
       role: 'room'
    };
    this.users.update(u => [...u, roomUser]);

    // 3. Create Room linked to User
    const newRoom: Room = { 
      id: crypto.randomUUID(), 
      name: cleanName,
      loginEmail: email,
      loginPassword: password,
      linkedUserId: uid
    };

    this.rooms.update(r => [...r, newRoom]);
    
    const admin = this.getAdminUser();
    if (admin) this.logAction(admin.uid, 'Add Room', `Name: ${cleanName}`);
    
    this.saveToStorage();
  }

  removeRoom(id: string) {
    const room = this.rooms().find(r => r.id === id);
    if (room && room.linkedUserId) {
       // Delete the user account
       this.users.update(u => u.filter(user => user.uid !== room.linkedUserId));
    }
    this.rooms.update(r => r.filter(x => x.id !== id));
    
    const admin = this.getAdminUser();
    if (admin) this.logAction(admin.uid, 'Remove Room', `ID: ${id}`);

    this.saveToStorage();
  }

  deleteAllRooms() {
    // Delete all associated users first
    const linkedUserIds = this.rooms().map(r => r.linkedUserId).filter(Boolean) as string[];
    this.users.update(u => u.filter(user => !linkedUserIds.includes(user.uid)));

    this.rooms.set([]);
    const admin = this.getAdminUser();
    if (admin) this.logAction(admin.uid, 'Delete All Rooms');
    this.saveToStorage();
  }
  
  generateMissingRoomCredentials() {
    let hasChanges = false;
    const currentRooms = this.rooms();
    
    const updatedRooms = currentRooms.map(room => {
       if (room.loginEmail && room.loginPassword && room.linkedUserId) {
          return room;
       }

       hasChanges = true;
       const sanitized = room.name.toLowerCase().replace(/[^a-z0-9]/g, '');
       const suffix = this.isDryRun() ? 'sandbox' : 'room';
       const email = `${sanitized}_${suffix}@iima.ac.in`;
       
       // Use dummyaccount in sandbox
       const password = this.isDryRun() ? 'dummyaccount' : Math.random().toString(36).slice(-8);
       
       const uid = `room-user-${crypto.randomUUID()}`;

       const roomUser: User = {
          uid,
          name: `Room Admin (${room.name})`,
          email,
          password,
          role: 'room'
       };
       
       this.users.update(u => {
          const exists = u.find(x => x.email === email);
          if (exists) return u;
          return [...u, roomUser];
       });

       return {
          ...room,
          loginEmail: email,
          loginPassword: password,
          linkedUserId: uid
       };
    });

    if (hasChanges) {
       this.rooms.set(updatedRooms);
       const admin = this.getAdminUser();
       if (admin) this.logAction(admin.uid, 'Generate Room Credentials', 'Bulk generation');
       this.saveToStorage();
    }
  }

  // --- Master List ---
  updateMasterList(list: MasterStudent[]) {
    // Simple deduplication based on email
    const unique = Array.from(new Map(list.map(item => [item.email.toLowerCase(), item])).values());
    this.masterStudents.set(unique);
    const admin = this.getAdminUser();
    if (admin) this.logAction(admin.uid, 'Update Master List', `Count: ${unique.length}`);
    this.saveToStorage();
  }

  // --- Schedule ---
  saveSchedule(sched: ScheduleItem[]) {
    this.schedule.set(sched);
    const admin = this.getAdminUser();
    if (admin) this.logAction(admin.uid, 'Save Schedule', `Items: ${sched.length}`);
    this.saveToStorage();
  }

  deleteSchedule() {
    this.schedule.set([]);
    const admin = this.getAdminUser();
    if (admin) this.logAction(admin.uid, 'Clear Schedule');
    this.saveToStorage();
  }

  markAttendance(item: ScheduleItem, status: AttendanceStatus) {
    this.schedule.update(current => 
      current.map(s => {
        if (s.studentId === item.studentId && s.time === item.time && s.reviewerId === item.reviewerId) {
          return { ...s, attendance: status };
        }
        return s;
      })
    );
    this.saveToStorage();
  }
  
  // Overloaded method to support logging
  markAttendanceWithLog(actorUid: string, item: ScheduleItem, status: AttendanceStatus) {
     this.markAttendance(item, status);
     this.logAction(actorUid, 'Mark Attendance', `${item.studentName}: ${status}`);
  }

  saveFeedback(scheduleItem: ScheduleItem, feedback: ReviewFeedback) {
    this.schedule.update(current => 
      current.map(s => {
        if (s.studentId === scheduleItem.studentId && s.time === scheduleItem.time && s.reviewerId === scheduleItem.reviewerId) {
           return { ...s, feedback: feedback };
        }
        return s;
      })
    );
    
    // Log it
    if (scheduleItem.reviewerId) {
       this.logAction(scheduleItem.reviewerId, 'Submit Feedback', `For ${scheduleItem.studentRoll}`);
    }
    this.saveToStorage();
  }

  // --- Helpers ---
  isStudentRegistrationOpen() {
    const now = new Date();
    const start = new Date(this.config().studentRegistrationStart);
    const end = new Date(this.config().studentRegistrationEnd);
    return now >= start && now <= end;
  }

  isReviewerRegistrationOpen() {
    const now = new Date();
    const start = new Date(this.config().reviewerRegistrationStart);
    const end = new Date(this.config().reviewerRegistrationEnd);
    return now >= start && now <= end;
  }

  // --- Simulation ---
  seedDummyData(studentCount: number, reviewersPerSector: Record<Sector, number>) {
    const admin = this.users().filter(u => u.role === 'admin' || u.role === 'room');
    
    const newUsers: User[] = [...admin];
    const newPrefs: StudentPreferences[] = [];
    const newAvail: ReviewerAvailability[] = [];
    
    const getWeightedSector = (exclude: Sector[] = []): Sector => {
        const weights: Record<string, number> = {
            'Consulting': 10,
            'Finance': 10,
            'Marketing': 6,
            'General Management': 6,
            'Product Management': 3,
            'Operations': 1
        };
        const available = SECTORS.filter(s => !exclude.includes(s));
        const totalWeight = available.reduce((sum, s) => sum + weights[s], 0);
        let random = Math.random() * totalWeight;
        for (const s of available) {
            random -= weights[s];
            if (random <= 0) return s;
        }
        return available[0];
    };

    const studentNames = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Ananya', 'Diya', 'Saanvi', 'Amaya', 'Aditi', 'Kiara', 'Priya', 'Riya', 'Sneha', 'Tanvi'];
    const lastNames = ['Sharma', 'Verma', 'Gupta', 'Malhotra', 'Bhatia', 'Mehta', 'Joshi', 'Patel', 'Kumar', 'Singh', 'Das', 'Roy', 'Chopra', 'Kapoor', 'Reddy'];
    
    const randomName = () => `${studentNames[Math.floor(Math.random() * studentNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    
    for (let i = 1; i <= studentCount; i++) {
       const uid = `student-${i}`;
       const name = randomName();
       newUsers.push({
         uid,
         name,
         email: `p24_${name.split(' ')[0].toLowerCase()}${i}@iima.ac.in`,
         role: 'student',
         rollNo: `P24${1000 + i}`,
         password: 'dummyaccount' // Standardized password for dry run
       });
       
       const p1 = getWeightedSector();
       const p2 = getWeightedSector([p1]);
       const p3 = getWeightedSector([p1, p2]);
       const p4 = Math.random() > 0.3 ? getWeightedSector([p1, p2, p3]) : ''; 

       newPrefs.push({
         uid,
         p1, p2, p3, p4: p4 as Sector | ''
       });
    }

    let revCount = 1;
    SECTORS.forEach(sector => {
       const count = reviewersPerSector[sector] || 0;
       for(let k=0; k < count; k++) {
         const uid = `reviewer-${revCount}`;
         const name = randomName();
         newUsers.push({
           uid,
           name,
           email: `p23_${name.split(' ')[0].toLowerCase()}${revCount}@iima.ac.in`,
           role: 'reviewer',
           phone: '9876543210',
           password: 'dummyaccount' // Standardized password for dry run
         });

         const slots: string[] = [];
         let startMin = 9 * 60;
         while(startMin < 18 * 60) {
            if (Math.random() > 0.4) { 
               const h = Math.floor(startMin / 60).toString().padStart(2, '0');
               const m = (startMin % 60).toString().padStart(2, '0');
               slots.push(`${h}:${m}`);
            }
            startMin += 20;
         }
         
         newAvail.push({
           uid,
           sector,
           slots
         });
         revCount++;
       }
    });

    this.users.set(newUsers);
    this.preferences.set(newPrefs);
    this.availability.set(newAvail);
    this.schedule.set([]);
    this.masterStudents.set([]); // Clear master list on seed
    
    const adminUser = this.getAdminUser();
    if (adminUser) this.logAction(adminUser.uid, 'Seed Dummy Data', `Students: ${studentCount}`);
    
    this.saveToStorage();
  }

  purgeAllData() {
    const admin = this.users().find(u => u.role === 'admin');
    const newUsers = admin ? [admin] : [];
    
    this.users.set(newUsers);
    this.preferences.set([]);
    this.availability.set([]);
    this.rooms.set([]);
    this.schedule.set([]);
    this.masterStudents.set([]);
    
    // Purge logs as well
    this.logs.set([]);

    this.config.set({
      studentRegistrationStart: new Date().toISOString(),
      studentRegistrationEnd: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      reviewerRegistrationStart: new Date().toISOString(),
      reviewerRegistrationEnd: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      roomBuffer: 2,
      isSchedulePublished: false
    });

    if (admin) {
       // We log this AFTER clearing, as the first log of the new cycle
       this.logAction(admin.uid, 'System Purge', 'All data reset.');
    }

    this.saveToStorage();
  }
}
