import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatEther } from 'ethers';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FlightInsuranceAdminService, FlightInsuranceAdminSnapshot } from '../contract-admin/flight-insurance-admin.service';
import { TransactionFlowService } from '../../core/services/transaction-flow.service';
import { BackofficePolicyOperationsService, BackofficePolicyRecord } from '../../core/services/backoffice-policy-operations.service';

@Component({
  selector: 'app-policy-operations-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzDropDownModule,
    NzInputModule,
    NzInputNumberModule,
    NzModalModule,
    NzPaginationModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    DatePipe
  ],
  templateUrl: './policy-operations.html',
  styleUrl: './policy-operations.scss'
})
export class PolicyOperationsPage {
  private readonly adminService = inject(FlightInsuranceAdminService);
  private readonly policyOperationsService = inject(BackofficePolicyOperationsService);
  private readonly message = inject(NzMessageService);
  private readonly transactionFlow = inject(TransactionFlowService);

  readonly snapshot = signal<FlightInsuranceAdminSnapshot | null>(null);
  readonly policies = signal<BackofficePolicyRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isSyncing = signal(false);
  readonly pageError = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal('ALL');
  readonly oracleFilter = signal('ALL');
  readonly activityFilter = signal('ALL');
  readonly pageIndex = signal(1);
  readonly pageSize = signal(10);
  readonly actionKey = signal<string | null>(null);
  readonly isManualResolveModalOpen = signal(false);
  readonly selectedPolicyForManualResolve = signal<BackofficePolicyRecord | null>(null);
  readonly manualResolveStatus = signal<number>(2);
  readonly manualResolveDelayMinutes = signal<number>(60);

  readonly statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Awaiting Verification', value: 'UNKNOWN' },
    { label: 'On Time', value: 'ONTIME' },
    { label: 'Delayed', value: 'DELAYED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  readonly oracleOptions = [
    { label: 'All Oracle States', value: 'ALL' },
    { label: 'Pending Request', value: 'PENDING' },
    { label: 'Ready To Retry', value: 'READY' },
    { label: 'Resolved', value: 'RESOLVED' }
  ];

  readonly activityOptions = [
    { label: 'All Policy States', value: 'ALL' },
    { label: 'Active Policies', value: 'ACTIVE' },
    { label: 'Claimed Policies', value: 'CLAIMED' },
    { label: 'Closed Policies', value: 'CLOSED' }
  ];

  readonly filteredPolicies = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const statusFilter = this.statusFilter();
    const oracleFilter = this.oracleFilter();
    const activityFilter = this.activityFilter();

    return this.policies().filter((policy) => {
      const matchesQuery = !query || [
        policy.policyId.toString(),
        policy.flightNumber,
        policy.origin,
        policy.destination,
        policy.holder,
        policy.riskKey
      ].some(value => value.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'ALL' || (
        (statusFilter === 'UNKNOWN' && policy.statusInt === 0) ||
        (statusFilter === 'ONTIME' && policy.statusInt === 1) ||
        (statusFilter === 'DELAYED' && policy.statusInt === 2) ||
        (statusFilter === 'CANCELLED' && policy.statusInt === 3)
      );

      const matchesOracle = oracleFilter === 'ALL' || (
        (oracleFilter === 'PENDING' && policy.oracleRequested && !policy.resolved) ||
        (oracleFilter === 'READY' && !policy.oracleRequested && !policy.resolved) ||
        (oracleFilter === 'RESOLVED' && policy.resolved)
      );

      const matchesActivity = activityFilter === 'ALL' || (
        (activityFilter === 'ACTIVE' && policy.active && !policy.claimed) ||
        (activityFilter === 'CLAIMED' && policy.claimed) ||
        (activityFilter === 'CLOSED' && !policy.active)
      );

      return matchesQuery && matchesStatus && matchesOracle && matchesActivity;
    });
  });

  readonly pagedPolicies = computed(() => {
    const startIndex = (this.pageIndex() - 1) * this.pageSize();
    return this.filteredPolicies().slice(startIndex, startIndex + this.pageSize());
  });

  readonly totalPolicies = computed(() => this.policies().length);
  readonly pendingOracleCount = computed(() =>
    this.policies().filter(policy => policy.oracleRequested && !policy.resolved).length
  );
  readonly unresolvedCount = computed(() =>
    this.policies().filter(policy => !policy.resolved).length
  );
  readonly claimedCount = computed(() =>
    this.policies().filter(policy => policy.claimed).length
  );
  readonly isOwner = computed(() => this.snapshot()?.isOwner ?? false);

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.isLoading.set(true);
    this.pageError.set(null);

    try {
      const [snapshot, policies] = await Promise.all([
        this.adminService.getSnapshot(),
        this.policyOperationsService.listPolicies()
      ]);
      this.snapshot.set(snapshot);
      this.policies.set(policies);
    } catch (error: any) {
      this.pageError.set(error?.message || 'Unable to load policy operations.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onFiltersChanged(): void {
    this.pageIndex.set(1);
  }

  onPageIndexChange(page: number): void {
    this.pageIndex.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
  }

  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatEth(value: bigint | string): string {
    return `${Number(formatEther(BigInt(value))).toFixed(6)} ETH`;
  }

  formatDelay(policy: BackofficePolicyRecord): string {
    if (policy.statusInt !== 2) {
      return policy.statusLabel;
    }

    return `${policy.delayMinutes} min delay`;
  }

  hasPayout(policy: BackofficePolicyRecord): boolean {
    return BigInt(policy.payoutAmountWei) > 0n;
  }

  activityLabel(policy: BackofficePolicyRecord): string {
    if (policy.claimed) {
      return 'Claimed';
    }

    return policy.active ? 'Active' : 'Closed';
  }

  async copyRiskKey(riskKey: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(riskKey);
      this.message.success('Risk key copied.');
    } catch {
      this.message.error('Unable to copy risk key.');
    }
  }

  canRetryOracle(policy: BackofficePolicyRecord): boolean {
    return !policy.resolved && !policy.oracleRequested;
  }

  canResetOracle(policy: BackofficePolicyRecord): boolean {
    return this.isOwner() && !policy.resolved && policy.oracleRequested;
  }

  canManualResolve(policy: BackofficePolicyRecord): boolean {
    return this.isOwner() && !policy.resolved;
  }

  openManualResolveModal(policy: BackofficePolicyRecord): void {
    if (!this.canManualResolve(policy)) {
      return;
    }

    this.selectedPolicyForManualResolve.set(policy);
    this.manualResolveStatus.set(2);
    this.manualResolveDelayMinutes.set(Math.max(policy.delayMinutes || 60, 1));
    this.isManualResolveModalOpen.set(true);
  }

  closeManualResolveModal(): void {
    this.isManualResolveModalOpen.set(false);
    this.selectedPolicyForManualResolve.set(null);
  }

  async confirmManualResolve(): Promise<void> {
    const policy = this.selectedPolicyForManualResolve();
    if (!policy) {
      return;
    }

    const statusInt = this.manualResolveStatus();
    const delayMinutes = statusInt === 2 ? Math.max(1, Math.round(this.manualResolveDelayMinutes())) : 0;
    const statusLabel = statusInt === 1 ? 'On Time' : statusInt === 2 ? 'Delayed' : 'Cancelled';

    const confirmed = await this.transactionFlow.confirmAction({
      actionLabel: 'Manual Risk Resolve',
      confirmDescription: `Please confirm that you want to manually resolve risk ${policy.riskKey} as ${statusLabel}${statusInt === 2 ? ` with ${delayMinutes} minutes of delay` : ''}. This will affect ${policy.policiesSharingRisk} linked policy${policy.policiesSharingRisk > 1 ? 'ies' : ''}.`
    });

    if (!confirmed) {
      return;
    }

    this.actionKey.set(`manual-${policy.policyId}`);
    this.isManualResolveModalOpen.set(false);
    const transactionProgress = this.transactionFlow.openWalletConfirmation('manually resolve this risk');

    try {
      await this.adminService.simulateFlightResult(
        policy.riskKey,
        statusInt,
        delayMinutes,
        (hash) => transactionProgress.transactionSubmitted(hash)
      );
      this.message.success('Risk manually resolved.');
      await this.refresh();
    } catch (error: any) {
      transactionProgress.close();
      this.message.error(error?.message || 'Unable to manually resolve risk.');
      this.isManualResolveModalOpen.set(true);
    } finally {
      this.actionKey.set(null);
    }
  }

  async retryOracleRequest(policy: BackofficePolicyRecord): Promise<void> {
    if (!this.canRetryOracle(policy)) {
      return;
    }

    const confirmed = await this.transactionFlow.confirmAction({
      actionLabel: 'Oracle Verification Retry',
      confirmDescription: `Please confirm that you want to request oracle verification again for risk ${policy.riskKey}. This will affect ${policy.policiesSharingRisk} linked policy${policy.policiesSharingRisk > 1 ? 'ies' : ''}.`
    });

    if (!confirmed) {
      return;
    }

    this.actionKey.set(`retry-${policy.policyId}`);
    const transactionProgress = this.transactionFlow.openWalletConfirmation('request oracle verification again');

    try {
      await this.adminService.requestOracleVerification(
        policy.riskKey,
        (hash) => transactionProgress.transactionSubmitted(hash)
      );
      this.message.success('Oracle verification requested again.');
      await this.refresh();
    } catch (error: any) {
      transactionProgress.close();
      this.message.error(error?.message || 'Unable to request oracle verification.');
    } finally {
      this.actionKey.set(null);
    }
  }

  async resetOracleRequest(policy: BackofficePolicyRecord): Promise<void> {
    if (!this.canResetOracle(policy)) {
      return;
    }

    const confirmed = await this.transactionFlow.confirmAction({
      actionLabel: 'Reset Oracle Request',
      confirmDescription: `Please confirm that you want to reset the oracle request flag for risk ${policy.riskKey}. This enables another oracle retry for ${policy.policiesSharingRisk} linked policy${policy.policiesSharingRisk > 1 ? 'ies' : ''}.`
    });

    if (!confirmed) {
      return;
    }

    this.actionKey.set(`reset-${policy.policyId}`);
    const transactionProgress = this.transactionFlow.openWalletConfirmation('reset the oracle request flag');

    try {
      await this.adminService.resetOracleRequest(
        policy.riskKey,
        (hash) => transactionProgress.transactionSubmitted(hash)
      );
      this.message.success('Oracle request flag reset.');
      await this.refresh();
    } catch (error: any) {
      transactionProgress.close();
      this.message.error(error?.message || 'Unable to reset oracle request.');
    } finally {
      this.actionKey.set(null);
    }
  }

  async syncLatest(): Promise<void> {
    this.isSyncing.set(true);
    this.pageError.set(null);

    try {
      const chainPolicies = await this.adminService.listPolicies();
      const payload: BackofficePolicyRecord[] = chainPolicies.map(policy => ({
        ...policy,
        premiumWei: policy.premiumWei.toString(),
        payoutAmountWei: policy.payoutAmountWei.toString()
      }));

      const result = await this.policyOperationsService.syncPolicies(payload);
      this.message.success(`Synced ${result.syncedPolicies} policies into the database.`);
      await this.refresh();
    } catch (error: any) {
      this.pageError.set(error?.message || 'Unable to sync policies from chain.');
    } finally {
      this.isSyncing.set(false);
    }
  }
}
