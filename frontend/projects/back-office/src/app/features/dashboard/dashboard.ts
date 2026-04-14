import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { BackofficeAuthService } from '../../core/services/backoffice-auth.service';

@Component({
  selector: 'app-backoffice-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NzCardModule, NzTagModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class BackofficeDashboardPage {
  readonly authService = inject(BackofficeAuthService);
}
