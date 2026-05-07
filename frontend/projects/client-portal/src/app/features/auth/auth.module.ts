import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AuthService} from './services/auth.service';
import {LoginPage} from './pages/login/login';
import {SignupPage} from './pages/signup/signup';
import {VerifyEmailPage} from './pages/verify-email/verify-email';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzCardModule} from 'ng-zorro-antd/card';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzTypographyModule} from 'ng-zorro-antd/typography';
import {NzAlertModule} from 'ng-zorro-antd/alert';
import {NzFormModule} from 'ng-zorro-antd/form';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzCheckboxModule} from 'ng-zorro-antd/checkbox';
import {ReactiveFormsModule} from '@angular/forms';

@NgModule({
  declarations: [LoginPage, SignupPage, VerifyEmailPage],
  imports: [
    CommonModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzTypographyModule,
    NzAlertModule,
    NzFormModule,
    NzInputModule,
    NzCheckboxModule,
    ReactiveFormsModule
  ],
  providers: [],
  exports: [LoginPage, SignupPage, VerifyEmailPage],
})
export class AuthModule {}
