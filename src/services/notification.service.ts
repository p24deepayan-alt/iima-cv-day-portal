import { Injectable, signal } from '@angular/core';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationConfig {
    type: NotificationType;
    title: string;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    notification = signal<NotificationConfig | null>(null);

    showSuccess(title: string, message: string) {
        this.notification.set({ type: 'success', title, message });
    }

    showError(title: string, message: string) {
        this.notification.set({ type: 'error', title, message });
    }

    showWarning(title: string, message: string) {
        this.notification.set({ type: 'warning', title, message });
    }

    showInfo(title: string, message: string) {
        this.notification.set({ type: 'info', title, message });
    }

    dismiss() {
        this.notification.set(null);
    }
}
