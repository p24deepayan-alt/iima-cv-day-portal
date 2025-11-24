
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { AuthComponent } from './components/auth.component';
import { StudentDashboardComponent } from './components/student-dashboard.component';
import { ReviewerDashboardComponent } from './components/reviewer-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard.component';
import { RoomDashboardComponent } from './components/room-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AuthComponent, StudentDashboardComponent, ReviewerDashboardComponent, AdminDashboardComponent, RoomDashboardComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  user = computed(() => this.authService.currentUser());

  logout() {
    this.authService.logout();
  }
}
