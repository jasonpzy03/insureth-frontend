import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FlightInsuranceAdminService, FlightInsuranceAdminSnapshot } from './flight-insurance-admin.service';
import { FLIGHT_INSURANCE_CONTRACT_ADDRESS } from './flight-insurance-admin.constants';

@Component({
  selector: 'app-contract-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzTagModule
  ],
  templateUrl: './contract-admin.html',
  styleUrl: './contract-admin.scss'
})
export class ContractAdminPage {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(FlightInsuranceAdminService);
  private readonly message = inject(NzMessageService);

  readonly contractAddress = FLIGHT_INSURANCE_CONTRACT_ADDRESS;
  readonly snapshot = signal<FlightInsuranceAdminSnapshot | null>(null);
  readonly pageError = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly chainlinkSaving = signal(false);
  readonly controlsSaving = signal(false);
  readonly simulationSaving = signal(false);
  readonly computedRiskKey = signal<string | null>(null);

  readonly isOwner = computed(() => this.snapshot()?.isOwner ?? false);
  readonly feeModeOptions = [
    { label: 'Percentage', value: 0 },
    { label: 'Flat Amount', value: 1 }
  ];

  readonly chainlinkForm = this.fb.nonNullable.group({
    sourceCode: ['', [Validators.required]],
    subscriptionId: [0, [Validators.required, Validators.min(0)]],
    gasLimit: [300000, [Validators.required, Validators.min(1)]]
  });

  readonly controlsForm = this.fb.nonNullable.group({
    verificationBufferSeconds: [7200, [Validators.required, Validators.min(0)]],
    minPurchaseLeadTimeSeconds: [3600, [Validators.required, Validators.min(0)]],
    maxPurchaseLeadTimeSeconds: [2592000, [Validators.required, Validators.min(1)]],
    platformFeeMode: [0, [Validators.required]],
    platformFeePercentage: [5, [Validators.required, Validators.min(0), Validators.max(100)]],
    platformFeeFlatAmountEth: [0, [Validators.required, Validators.min(0)]],
    minDelayPayoutThresholdMinutes: [45, [Validators.required, Validators.min(1)]],
    maxDelayPayoutThresholdMinutes: [180, [Validators.required, Validators.min(1)]],
    minDelayPayoutMultiplierPercent: [150, [Validators.required, Validators.min(0)]],
    maxDelayPayoutMultiplierPercent: [300, [Validators.required, Validators.min(0)]],
    cancellationPayoutMultiplierPercent: [300, [Validators.required, Validators.min(0)]]
  });

  readonly simulationForm = this.fb.nonNullable.group({
    flightNumber: ['', [Validators.required]],
    origin: ['', [Validators.required]],
    destination: ['', [Validators.required]],
    departureTimeUnix: [0, [Validators.required, Validators.min(1)]],
    riskKey: [''],
    statusInt: [2, [Validators.required, Validators.min(0), Validators.max(3)]],
    delayMinutes: [120, [Validators.required]]
  });

  constructor() {
    void this.refreshSnapshot();
  }

  async refreshSnapshot(): Promise<void> {
    this.isLoading.set(true);
    this.pageError.set(null);

    try {
      const snapshot = await this.adminService.getSnapshot();
      this.snapshot.set(snapshot);
      this.chainlinkForm.patchValue({
        sourceCode: snapshot.sourceCode,
        subscriptionId: snapshot.subscriptionId,
        gasLimit: snapshot.gasLimit
      });
      this.controlsForm.patchValue({
        verificationBufferSeconds: snapshot.verificationBufferSeconds,
        minPurchaseLeadTimeSeconds: snapshot.minPurchaseLeadTimeSeconds,
        maxPurchaseLeadTimeSeconds: snapshot.maxPurchaseLeadTimeSeconds,
        platformFeeMode: snapshot.platformFeeMode,
        platformFeePercentage: snapshot.platformFeePercentage,
        platformFeeFlatAmountEth: snapshot.platformFeeFlatAmountEth,
        minDelayPayoutThresholdMinutes: snapshot.minDelayPayoutThresholdMinutes,
        maxDelayPayoutThresholdMinutes: snapshot.maxDelayPayoutThresholdMinutes,
        minDelayPayoutMultiplierPercent: snapshot.minDelayPayoutMultiplierBps / 100,
        maxDelayPayoutMultiplierPercent: snapshot.maxDelayPayoutMultiplierBps / 100,
        cancellationPayoutMultiplierPercent: snapshot.cancellationPayoutMultiplierBps / 100
      });
    } catch (error: any) {
      this.pageError.set(error?.message || 'Unable to load contract admin state.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveChainlinkConfig(): Promise<void> {
    if (this.chainlinkForm.invalid) {
      this.chainlinkForm.markAllAsTouched();
      return;
    }

    this.chainlinkSaving.set(true);
    try {
      const { sourceCode, subscriptionId, gasLimit } = this.chainlinkForm.getRawValue();
      await this.adminService.setChainlinkConfig(sourceCode, subscriptionId, gasLimit);
      this.message.success('Chainlink config updated.');
      await this.refreshSnapshot();
    } catch (error: any) {
      this.message.error(error?.message || 'Failed to update Chainlink config.');
    } finally {
      this.chainlinkSaving.set(false);
    }
  }

  async saveControls(): Promise<void> {
    if (this.controlsForm.invalid) {
      this.controlsForm.markAllAsTouched();
      return;
    }

    this.controlsSaving.set(true);
    try {
      const {
        verificationBufferSeconds,
        minPurchaseLeadTimeSeconds,
        maxPurchaseLeadTimeSeconds,
        platformFeeMode,
        platformFeePercentage,
        platformFeeFlatAmountEth,
        minDelayPayoutThresholdMinutes,
        maxDelayPayoutThresholdMinutes,
        minDelayPayoutMultiplierPercent,
        maxDelayPayoutMultiplierPercent,
        cancellationPayoutMultiplierPercent
      } =
        this.controlsForm.getRawValue();

      await this.adminService.setAdminControls({
        verificationBufferSeconds,
        minPurchaseLeadTimeSeconds,
        maxPurchaseLeadTimeSeconds,
        platformFeeMode,
        platformFeePercentage,
        platformFeeFlatAmountEth,
        minDelayPayoutThresholdMinutes,
        maxDelayPayoutThresholdMinutes,
        minDelayPayoutMultiplierBps: Math.round(minDelayPayoutMultiplierPercent * 100),
        maxDelayPayoutMultiplierBps: Math.round(maxDelayPayoutMultiplierPercent * 100),
        cancellationPayoutMultiplierBps: Math.round(cancellationPayoutMultiplierPercent * 100)
      });

      this.message.success('Admin controls updated.');
      await this.refreshSnapshot();
    } catch (error: any) {
      this.message.error(error?.message || 'Failed to update owner controls.');
    } finally {
      this.controlsSaving.set(false);
    }
  }

  async computeRiskKey(): Promise<void> {
    const { flightNumber, origin, destination, departureTimeUnix } = this.simulationForm.getRawValue();
    if (!flightNumber || !origin || !destination || !departureTimeUnix) {
      this.simulationForm.markAllAsTouched();
      return;
    }

    try {
      const riskKey = await this.adminService.computeRiskKey(
        flightNumber,
        origin,
        destination,
        departureTimeUnix
      );
      this.computedRiskKey.set(riskKey);
      this.simulationForm.patchValue({ riskKey });
      this.message.success('Risk key computed.');
    } catch (error: any) {
      this.message.error(error?.message || 'Unable to compute risk key.');
    }
  }

  async simulateFlightResult(): Promise<void> {
    if (this.simulationForm.invalid || !this.simulationForm.controls.riskKey.value) {
      this.simulationForm.markAllAsTouched();
      return;
    }

    this.simulationSaving.set(true);
    try {
      const { riskKey, statusInt, delayMinutes } = this.simulationForm.getRawValue();
      await this.adminService.simulateFlightResult(riskKey, statusInt, delayMinutes);
      this.message.success('Flight result simulated successfully.');
    } catch (error: any) {
      this.message.error(error?.message || 'Failed to simulate flight result.');
    } finally {
      this.simulationSaving.set(false);
    }
  }
}
