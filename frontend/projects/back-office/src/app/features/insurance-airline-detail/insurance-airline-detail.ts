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
  selector: 'app-insurance-airline-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NzAlertModule, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzSwitchModule],
  templateUrl: './insurance-airline-detail.html',
  styleUrl: './insurance-airline-detail.scss'
})
export class InsuranceAirlineDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InsuranceConfigService);
  private readonly message = inject(NzMessageService);
  private readonly airlineId = Number(this.route.snapshot.paramMap.get('airlineId'));

  readonly error = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    iataCode: ['', [Validators.required]],
    icaoCode: ['', [Validators.required]],
    supportedForFlightInsurance: [false, [Validators.required]]
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const airline = await this.service.getAirline(this.airlineId);
      this.form.patchValue(airline);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.error?.error || 'Unable to load airline.');
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
      await this.service.updateAirline(this.airlineId, this.form.getRawValue());
      this.message.success('Airline updated.');
      void this.router.navigate(['/insurance-config/flight-insurance/airlines']);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.error?.error || 'Unable to update airline.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
