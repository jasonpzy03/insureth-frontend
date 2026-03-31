import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { HeaderComponent } from './core/components/header/header';
import { FooterComponent } from './core/components/footer/footer';
import { AuthModule } from './features/auth/auth.module';
import { InsuranceModule } from './features/insurance/insurance.module';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NzLayoutModule,
    HeaderComponent,
    FooterComponent,
    AuthModule,
    InsuranceModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App { }
