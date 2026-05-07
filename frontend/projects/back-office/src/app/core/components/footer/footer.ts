import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [NzLayoutModule, NzIconModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
