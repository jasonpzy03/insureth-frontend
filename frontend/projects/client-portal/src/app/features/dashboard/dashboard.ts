import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FlightInsuranceContractService } from '../insurance/flight-insurance/services/flight-insurance-contract.service';
import { FlightInsuranceService } from '../insurance/flight-insurance/services/flight-insurance.service';
import { WalletService } from '../../core/services/wallet.service';
import { EthPriceService } from '../../core/services/eth-price.service';
import { EthAmountPipe } from '../../core/pipes/eth-amount.pipe';
import { firstValueFrom } from 'rxjs';

type DashboardPolicy = {
  policyId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: number;
  purchaseTimestamp: number | null;
  verificationBufferSeconds: number;
  verificationEligibleAt: number;
  premium: string;
  premiumPaid: string;
  status: number;
  delayMinutes: number;
  oracleRequested: boolean;
  resolved: boolean;
  active: boolean;
  claimed: boolean;
  payoutAmount: string;
  type: string;
};

type DashboardActivity = {
  type: 'PURCHASE' | 'PAYOUT';
  policyId: string;
  title: string;
  subtitle: string;
  amount: string;
  timestamp: number;
  tone: 'blue' | 'emerald';
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzSkeletonModule,
    NzTableModule,
    NzTagModule,
    EthAmountPipe
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private contractService = inject(FlightInsuranceContractService);
  private flightInsuranceService = inject(FlightInsuranceService);
  private walletService = inject(WalletService);
  private router = inject(Router);
  private ethPriceService = inject(EthPriceService);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private airportTimezoneMap = new Map<string, string>();

  isLoading = true;
  policies: DashboardPolicy[] = [];
  recentPolicies: DashboardPolicy[] = [];
  recentActivities: DashboardActivity[] = [];
  ongoingPolicy: DashboardPolicy | null = null;
  now = Date.now();

  activePolicies = 0;
  claimedPolicies = 0;
  totalPremiumPaid = 0;
  totalDisbursed = 0;
  pendingVerification = 0;

  async ngOnInit() {
    await this.walletService.initialized;
    void this.ethPriceService.ensureLoaded();
    if (!this.walletService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      const airports = await firstValueFrom(this.flightInsuranceService.getAirports());
      this.airportTimezoneMap = new Map(
        airports
          .filter(a => a.iataCode && a.timezone)
          .map(a => [a.iataCode.toUpperCase(), a.timezone])
      );
    } catch (e) {
      console.warn('Failed to load airport timezones for dashboard', e);
    }

    await this.loadDashboard();
    this.refreshTimer = setInterval(() => {
      this.now = Date.now();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  formatApproxUsd(amount: number | string): string {
    return this.ethPriceService.formatApproxUsd(amount);
  }

  async loadDashboard() {
    this.isLoading = true;
    try {
      const policies = await this.contractService.getUserPolicies();
      this.policies = policies;
      this.recentPolicies = [...policies]
        .sort((a, b) => b.departureTime - a.departureTime)
        .slice(0, 5);
      this.ongoingPolicy = [...policies]
        .filter((policy) => !policy.resolved && !policy.claimed)
        .sort((a, b) => a.verificationEligibleAt - b.verificationEligibleAt)[0] ?? null;

      this.activePolicies = policies.filter((policy) => policy.active).length;
      this.claimedPolicies = policies.filter((policy) => Number(policy.payoutAmount) > 0).length;
      this.totalPremiumPaid = policies.reduce((sum, policy) => sum + Number(policy.premium), 0);
      this.totalDisbursed = policies.reduce((sum, policy) => sum + Number(policy.payoutAmount), 0);
      this.pendingVerification = policies.filter((policy) => !policy.claimed && !policy.active && policy.status === 0).length;

      const activitySource = await Promise.all(
        this.recentPolicies.slice(0, 4).map(async (policy) => {
          try {
            return await this.contractService.getPolicyTransactions(policy.policyId);
          } catch (error) {
            console.error(`Failed to load transactions for policy ${policy.policyId}`, error);
            return null;
          }
        })
      );

      this.recentActivities = activitySource
        .filter((entry): entry is NonNullable<typeof entry> => !!entry)
        .flatMap((entry) =>
          entry.transactions.map((tx: any) => ({
            type: tx.type,
            policyId: entry.policy.policyId,
            title: tx.type === 'PURCHASE' ? 'Policy purchased' : 'Payout distributed',
            subtitle: `${entry.policy.flightNumber} ${entry.policy.origin} -> ${entry.policy.destination}`,
            amount: tx.type === 'PURCHASE' ? entry.policy.premium : tx.amount,
            timestamp: tx.timestamp,
            tone: tx.type === 'PURCHASE' ? 'blue' : 'emerald'
          }))
        )
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      this.isLoading = false;
    }
  }

  getStatusText(policy: DashboardPolicy): string {
    if (this.isOracleVerificationStuck(policy)) {
      return 'Needs Review';
    }

    if (Number(policy.payoutAmount) > 0) {
      return 'Payout Distributed';
    }

    if (policy.claimed) {
      return 'Resolved';
    }

    if (policy.active) {
      return 'Active';
    }

    switch (policy.status) {
      case 0:
        return 'Awaiting Verification';
      case 1:
        return 'On Time';
      case 2:
        return 'Delayed';
      case 3:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getStatusColor(policy: DashboardPolicy): string {
    if (this.isOracleVerificationStuck(policy)) return 'warning';
    if (Number(policy.payoutAmount) > 0) return 'success';
    if (policy.claimed) return 'processing';
    if (policy.active) return 'geekblue';

    switch (policy.status) {
      case 0:
        return 'default';
      case 1:
        return 'success';
      case 2:
        return 'warning';
      case 3:
        return 'error';
      default:
        return 'default';
    }
  }

  getOngoingPolicyHeadline(): string {
    if (!this.ongoingPolicy) {
      return '';
    }

    if (this.isOracleVerificationStuck(this.ongoingPolicy)) {
      return 'Oracle follow-up is needed';
    }

    if (this.ongoingPolicy.oracleRequested) {
      return 'Chainlink oracle request is in progress';
    }

    if (this.now < this.ongoingPolicy.departureTime) {
      return 'Coverage is active and waiting for departure';
    }

    if (this.now < this.ongoingPolicy.verificationEligibleAt) {
      return 'Verification buffer is counting down';
    }

    return 'Policy is eligible for oracle verification';
  }

  getOngoingPolicyBody(): string {
    if (!this.ongoingPolicy) {
      return '';
    }

    if (this.isOracleVerificationStuck(this.ongoingPolicy)) {
      return 'Chainlink was expected to return the flight outcome already, but this policy is still unresolved. Please contact us so our backoffice team can verify the real flight data and manually resolve the policy.';
    }

    if (this.ongoingPolicy.oracleRequested) {
      return 'We have already asked Chainlink Functions to fetch the verified flight outcome. Once the response returns, your policy status and payout decision will update automatically.';
    }

    if (this.now < this.ongoingPolicy.departureTime) {
      return `Oracle verification starts only after departure plus the configured ${Math.round(this.ongoingPolicy.verificationBufferSeconds / 60)} minute buffer.`;
    }

    if (this.now < this.ongoingPolicy.verificationEligibleAt) {
      return `Your flight has departed. The smart contract will allow Chainlink verification once the ${Math.round(this.ongoingPolicy.verificationBufferSeconds / 60)} minute verification buffer finishes.`;
    }

    return 'This policy is ready for verification. The next healthy automation cycle should trigger the oracle fetch.';
  }

  getOngoingPolicyCountdown(): string {
    if (!this.ongoingPolicy) {
      return '';
    }

    if (this.isOracleVerificationStuck(this.ongoingPolicy)) {
      return 'Manual review needed';
    }

    if (this.ongoingPolicy.oracleRequested) {
      return 'Oracle request submitted';
    }

    const remainingMs = this.ongoingPolicy.verificationEligibleAt - this.now;
    if (remainingMs <= 0) {
      return 'Eligible now';
    }

    const totalMinutes = Math.ceil(remainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `Expected in ${hours}h ${minutes}m`;
    }

    return `Expected in ${minutes}m`;
  }

  getOngoingPolicyProgress(): number {
    if (!this.ongoingPolicy) {
      return 0;
    }

    if (this.isOracleVerificationStuck(this.ongoingPolicy)) {
      return 100;
    }

    if (this.ongoingPolicy.oracleRequested) {
      return 90;
    }

    if (!this.ongoingPolicy.purchaseTimestamp) {
      return 20;
    }

    const totalWindow = this.ongoingPolicy.verificationEligibleAt - this.ongoingPolicy.purchaseTimestamp;
    if (totalWindow <= 0) {
      return 100;
    }

    const elapsed = this.now - this.ongoingPolicy.purchaseTimestamp;
    return Math.min(Math.max(Math.round((elapsed / totalWindow) * 100), 0), 100);
  }

  formatOracleExpectedTime(): string {
    if (!this.ongoingPolicy) {
      return 'Unavailable';
    }

    const value = this.ongoingPolicy.verificationEligibleAt;
    if (!value) {
      return 'Unavailable';
    }

    const timezone = this.airportTimezoneMap.get((this.ongoingPolicy.origin || '').toUpperCase());
    if (!timezone) {
      return new Date(value).toLocaleString();
    }

    return `${new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    }).format(new Date(value))} ${timezone}`;
  }

  isOracleVerificationStuck(policy: DashboardPolicy | null): boolean {
    return !!policy && !policy.resolved && policy.status === 0 && !!policy.oracleRequested;
  }
}
