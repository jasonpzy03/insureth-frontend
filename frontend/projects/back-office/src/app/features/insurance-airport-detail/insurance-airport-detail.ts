import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { InsuranceConfigService } from '../insurance-config/insurance-config.service';

@Component({
  selector: 'app-insurance-airport-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NzAlertModule, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzSwitchModule],
  templateUrl: './insurance-airport-detail.html',
  styleUrl: './insurance-airport-detail.scss'
})
export class InsuranceAirportDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InsuranceConfigService);
  private readonly message = inject(NzMessageService);
  private readonly airportId = Number(this.route.snapshot.paramMap.get('airportId'));

  readonly error = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    iataCode: ['', [Validators.required]],
    icaoCode: ['', [Validators.required]],
    timezone: [''],
    countryCode: [''],
    supportedForFlightInsurance: [false, [Validators.required]]
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const airport = await this.service.getAirport(this.airportId);
      this.form.patchValue(airport);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.error?.error || 'Unable to load airport.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.service.updateAirport(this.airportId, this.form.getRawValue());
      this.message.success('Airport updated.');
      void this.router.navigate(['/insurance-config/flight-insurance/airports']);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.error?.error || 'Unable to update airport.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
