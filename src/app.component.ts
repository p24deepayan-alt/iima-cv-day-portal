
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { LoginComponent } from './components/login.component';
import { RegisterComponent } from './components/register.component';
import { StudentDashboardComponent } from './components/student-dashboard.component';
import { ReviewerDashboardComponent } from './components/reviewer-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard.component';
import { RoomDashboardComponent } from './components/room-dashboard.component';

type AuthPage = 'login' | 'register';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, RegisterComponent, StudentDashboardComponent, ReviewerDashboardComponent, AdminDashboardComponent, RoomDashboardComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  user = computed(() => this.authService.currentUser());

  authPage = signal<AuthPage>('login');

  logout() {
    this.authService.logout();
    this.authPage.set('login'); // Reset to login page on logout
  }
}
