import { Component } from '@angular/core';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzIconModule } from 'ng-zorro-antd/icon';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    NzLayoutModule,
    NzIconModule,
    RouterLink
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
