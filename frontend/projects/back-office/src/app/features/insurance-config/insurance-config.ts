import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FlightInsurancePricingConfigRequest, FlightInsurancePricingConfigResponse } from './insurance-config.models';
import { InsuranceConfigService } from './insurance-config.service';

@Component({
  selector: 'app-insurance-config-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzDividerModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule
  ],
  templateUrl: './insurance-config.html',
  styleUrl: './insurance-config.scss'
})
export class InsuranceConfigPage {
  private readonly fb = inject(FormBuilder);
  private readonly configService = inject(InsuranceConfigService);
  private readonly message = inject(NzMessageService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly config = signal<FlightInsurancePricingConfigResponse | null>(null);

  readonly configForm = this.fb.nonNullable.group({
    productCode: ['', [Validators.required]],
    basePremiumEth: [10, [Validators.required, Validators.min(0)]],
    delayPayoutTier1Eth: [15, [Validators.required, Validators.min(0)]],
    delayPayoutTier2Eth: [20, [Validators.required, Validators.min(0)]],
    delayPayoutTier3Eth: [30, [Validators.required, Validators.min(0)]],
    cancellationPayoutEth: [30, [Validators.required, Validators.min(0)]],
    delayThresholdTier1Minutes: [45, [Validators.required, Validators.min(1)]],
    delayThresholdTier2Minutes: [120, [Validators.required, Validators.min(1)]],
    delayThresholdTier3Minutes: [180, [Validators.required, Validators.min(1)]],
    premiumBaseRate: [1, [Validators.required, Validators.min(0)]],
    premiumPerDayMultiplier: [0.015, [Validators.required, Validators.min(0)]],
    premiumDemandMultiplier: [1, [Validators.required, Validators.min(0)]],
    premiumMaxMultiplier: [3, [Validators.required, Validators.min(0)]],
    currency: ['ETH', [Validators.required]]
  });

  constructor() {
    void this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await this.configService.getPricingConfig();
      this.config.set(response);
      this.configForm.patchValue({
        productCode: response.product.productCode,
        basePremiumEth: response.product.basePremiumEth,
        delayPayoutTier1Eth: response.product.delayPayoutTier1Eth,
        delayPayoutTier2Eth: response.product.delayPayoutTier2Eth,
        delayPayoutTier3Eth: response.product.delayPayoutTier3Eth,
        cancellationPayoutEth: response.product.cancellationPayoutEth,
        delayThresholdTier1Minutes: response.product.delayThresholdTier1Minutes,
        delayThresholdTier2Minutes: response.product.delayThresholdTier2Minutes,
        delayThresholdTier3Minutes: response.product.delayThresholdTier3Minutes,
        premiumBaseRate: response.product.premiumBaseRate,
        premiumPerDayMultiplier: response.product.premiumPerDayMultiplier,
        premiumDemandMultiplier: response.product.premiumDemandMultiplier,
        premiumMaxMultiplier: response.product.premiumMaxMultiplier,
        currency: response.product.currency
      });
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.error?.error || 'Unable to load flight insurance pricing.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const value = this.configForm.getRawValue();
      const payload: FlightInsurancePricingConfigRequest = {
        product: {
          productCode: value.productCode.trim(),
          basePremiumEth: Number(value.basePremiumEth),
          delayPayoutTier1Eth: Number(value.delayPayoutTier1Eth),
          delayPayoutTier2Eth: Number(value.delayPayoutTier2Eth),
          delayPayoutTier3Eth: Number(value.delayPayoutTier3Eth),
          cancellationPayoutEth: Number(value.cancellationPayoutEth),
          delayThresholdTier1Minutes: Number(value.delayThresholdTier1Minutes),
          delayThresholdTier2Minutes: Number(value.delayThresholdTier2Minutes),
          delayThresholdTier3Minutes: Number(value.delayThresholdTier3Minutes),
          premiumBaseRate: Number(value.premiumBaseRate),
          premiumPerDayMultiplier: Number(value.premiumPerDayMultiplier),
          premiumDemandMultiplier: Number(value.premiumDemandMultiplier),
          premiumMaxMultiplier: Number(value.premiumMaxMultiplier),
          currency: value.currency.trim()
        }
      };

      const updated = await this.configService.updatePricingConfig(payload);
      this.config.set(updated);
      this.message.success('Flight insurance pricing updated.');
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.error?.error || 'Unable to save flight insurance pricing.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
