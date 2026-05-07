import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.html',
  standalone: false
})
export class VerifyEmailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  verifying = true;
  success = false;
  error = false;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (!token) {
        this.verifying = false;
        this.error = true;
        return;
      }

      this.authService.verifySignupClientUser(token).subscribe({
        next: () => {
          this.verifying = false;
          this.success = true;
          setTimeout(() => {
            this.router.navigate(['/login'], { replaceUrl: true });
          }, 3000);
        },
        error: () => {
          this.verifying = false;
          this.error = true;
        }
      });
    });
  }
}
