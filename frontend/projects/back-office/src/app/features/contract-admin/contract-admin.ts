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
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FlightInsuranceAdminService, FlightInsuranceAdminSnapshot } from './flight-insurance-admin.service';
import { FLIGHT_INSURANCE_CONTRACT_ADDRESS } from './flight-insurance-admin.constants';
import { TransactionFlowService } from '../../core/services/transaction-flow.service';

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
    NzModalModule,
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
  private readonly transactionFlow = inject(TransactionFlowService);

  readonly contractAddress = FLIGHT_INSURANCE_CONTRACT_ADDRESS;
  readonly snapshot = signal<FlightInsuranceAdminSnapshot | null>(null);
  readonly pageError = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly chainlinkSaving = signal(false);
  readonly controlsSaving = signal(false);

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
    postDeparturePurchaseGracePeriodSeconds: [0, [Validators.required, Validators.min(0)]],
    platformFeeMode: [0, [Validators.required]],
    platformFeePercentage: [5, [Validators.required, Validators.min(0), Validators.max(100)]],
    platformFeeFlatAmountEth: [0, [Validators.required, Validators.min(0)]],
    minDelayPayoutThresholdMinutes: [45, [Validators.required, Validators.min(1)]],
    maxDelayPayoutThresholdMinutes: [180, [Validators.required, Validators.min(1)]],
    minDelayPayoutMultiplierPercent: [150, [Validators.required, Validators.min(0)]],
    maxDelayPayoutMultiplierPercent: [300, [Validators.required, Validators.min(0)]],
    cancellationPayoutMultiplierPercent: [300, [Validators.required, Validators.min(0)]]
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
        postDeparturePurchaseGracePeriodSeconds: snapshot.postDeparturePurchaseGracePeriodSeconds,
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

    const confirmed = await this.transactionFlow.confirmAction({
      actionLabel: 'Chainlink Configuration Update',
      confirmDescription: 'Please confirm that you want to update the Chainlink configuration. You will be asked to approve the transaction in MetaMask next.'
    });

    if (!confirmed) {
      return;
    }

    this.chainlinkSaving.set(true);
    const transactionProgress = this.transactionFlow.openWalletConfirmation('update the Chainlink configuration');
    try {
      const { sourceCode, subscriptionId, gasLimit } = this.chainlinkForm.getRawValue();
      await this.adminService.setChainlinkConfig(
        sourceCode,
        subscriptionId,
        gasLimit,
        (hash) => transactionProgress.transactionSubmitted(hash)
      );
      this.message.success('Chainlink config updated.');
      await this.refreshSnapshot();
    } catch (error: any) {
      transactionProgress.close();
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

    const confirmed = await this.transactionFlow.confirmAction({
      actionLabel: 'Admin Controls Update',
      confirmDescription: 'Please confirm that you want to update the smart contract admin controls. You will be asked to approve the transaction in MetaMask next.'
    });

    if (!confirmed) {
      return;
    }

    this.controlsSaving.set(true);
    const transactionProgress = this.transactionFlow.openWalletConfirmation('update the admin controls');
    try {
      const {
        verificationBufferSeconds,
        minPurchaseLeadTimeSeconds,
        maxPurchaseLeadTimeSeconds,
        postDeparturePurchaseGracePeriodSeconds,
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
        postDeparturePurchaseGracePeriodSeconds,
        platformFeeMode,
        platformFeePercentage,
        platformFeeFlatAmountEth,
        minDelayPayoutThresholdMinutes,
        maxDelayPayoutThresholdMinutes,
        minDelayPayoutMultiplierBps: Math.round(minDelayPayoutMultiplierPercent * 100),
        maxDelayPayoutMultiplierBps: Math.round(maxDelayPayoutMultiplierPercent * 100),
        cancellationPayoutMultiplierBps: Math.round(cancellationPayoutMultiplierPercent * 100)
      }, (hash) => transactionProgress.transactionSubmitted(hash));

      this.message.success('Admin controls updated.');
      await this.refreshSnapshot();
    } catch (error: any) {
      transactionProgress.close();
      this.message.error(error?.message || 'Failed to update owner controls.');
    } finally {
      this.controlsSaving.set(false);
    }
  }

}
