import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FlightInsuranceContractService } from '../insurance/flight-insurance/services/flight-insurance-contract.service';
import { FlightInsuranceService } from '../insurance/flight-insurance/services/flight-insurance.service';
import { WalletService } from '../../core/services/wallet.service';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NzCardModule, NzSkeletonModule, NzTagModule, NzIconModule, NzInputModule, NzSelectModule],
  templateUrl: './policies.html',
  styleUrl: './policies.scss'
})
export class PoliciesComponent implements OnInit {
  private static readonly ORACLE_MANUAL_REVIEW_GRACE_MS = 10 * 60 * 1000;

  private contractService = inject(FlightInsuranceContractService);
  private flightInsuranceService = inject(FlightInsuranceService);
  private walletService = inject(WalletService);
  private router = inject(Router);

  policies: any[] = [];
  filteredPolicies: any[] = [];
  isLoading = true;
  private airportTimezoneMap = new Map<string, string>();
  private payoutPreviewMap = new Map<string, any>();
  payoutConfig: {
    minDelayThresholdMinutes: number;
    maxDelayThresholdMinutes: number;
  } | null = null;

  searchQuery = '';
  selectedType = 'All';
  selectedStatus = 'All';

  async ngOnInit() {
    await this.walletService.initialized;
    if (!this.walletService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    try {
      const [policies, payoutConfig] = await Promise.all([
        this.contractService.getUserPolicies(),
        this.contractService.getPayoutConfiguration()
      ]);
      const airports = await firstValueFrom(this.flightInsuranceService.getAirports());
      this.policies = policies;
      this.payoutConfig = payoutConfig;
      this.airportTimezoneMap = new Map(
        airports
          .filter(airport => airport.iataCode && airport.timezone)
          .map(airport => [airport.iataCode.toUpperCase(), airport.timezone])
      );
      await this.loadPayoutPreviews(policies);
      this.applyFilters();
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    this.filteredPolicies = this.policies.filter(policy => {
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = q === ''
        || String(policy.policyId).includes(q)
        || (policy.flightNumber && policy.flightNumber.toLowerCase().includes(q))
        || (policy.origin && policy.origin.toLowerCase().includes(q))
        || (policy.destination && policy.destination.toLowerCase().includes(q));

      const matchType = this.selectedType === 'All' || policy.type === this.selectedType;

      let matchStatus = true;
      if (this.selectedStatus !== 'All') {
        const policyStatusText = this.getStatusText(policy.status);
        if (this.selectedStatus === 'Concluded') {
          matchStatus = policy.claimed && policy.payoutAmount === '0.0';
        } else if (this.selectedStatus === 'Payout Distributed') {
          matchStatus = Number(policy.payoutAmount) > 0;
        } else {
          matchStatus = policyStatusText === this.selectedStatus;
        }
      }

      return matchSearch && matchType && matchStatus;
    });
  }

  getStatusText(status: number): string {
    switch (status) {
      case 0: return 'Awaiting Verification';
      case 1: return 'On Time';
      case 2: return 'Delayed';
      case 3: return 'Cancelled';
      default: return 'Unknown';
    }
  }

  getStatusColor(status: number): string {
    switch (status) {
      case 0: return 'default';
      case 1: return 'success';
      case 2: return 'warning';
      case 3: return 'error';
      default: return 'default';
    }
  }

  getDelayDisplay(policy: any): string | null {
    if (policy.status !== 2 || policy.delayMinutes <= 0) {
      return null;
    }

    return `${policy.delayMinutes} min recorded delay`;
  }

  getPayoutExplanation(policy: any): string {
    const payoutAmount = Number(policy.payoutAmount);

    if (payoutAmount > 0) {
      return 'Payout already distributed to your wallet.';
    }

    if (this.isOracleVerificationStuck(policy)) {
      return 'Oracle verification appears delayed or failed to return flight data. Please contact us so our backoffice team can manually verify the flight and resolve the policy.';
    }

    if (policy.status === 0 && !policy.resolved) {
      return `Chainlink verification becomes eligible after ${this.formatOracleExpectedTime(policy)}.`;
    }

    if (policy.status === 2 && this.payoutConfig) {
      if (policy.delayMinutes < this.payoutConfig.minDelayThresholdMinutes) {
        return `No payout because the verified delay stayed below the ${this.payoutConfig.minDelayThresholdMinutes}-minute trigger.`;
      }

      return 'Delay qualified, but payout is still waiting for resolution or distribution.';
    }

    if (policy.status === 1) {
      return 'No payout because the flight was verified on time.';
    }

    if (policy.status === 3 && payoutAmount === 0) {
      return policy.claimed
        ? 'Policy concluded without a payout distribution.'
        : 'Cancellation recorded. Resolution is being finalized.';
    }

    if (policy.claimed && payoutAmount === 0) {
      return 'Policy concluded without a payout.';
    }

    return 'Outcome recorded on-chain.';
  }

  formatDepartureTime(policy: any): string {
    const timezone = this.airportTimezoneMap.get((policy.origin || '').toUpperCase());
    const timestamp = Number(policy.departureTime);

    if (!timezone || !timestamp) {
      return new Date(timestamp).toLocaleString();
    }

    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    }).format(new Date(timestamp));
  }

  getDepartureTimezone(policy: any): string {
    return this.airportTimezoneMap.get((policy.origin || '').toUpperCase()) || 'Airport time';
  }

  formatOracleExpectedTime(policy: any): string {
    const value = policy?.verificationEligibleAt;
    const timezone = this.airportTimezoneMap.get((policy?.origin || '').toUpperCase());

    if (!value) {
      return 'Unavailable';
    }

    if (!timezone) {
      return `${new Date(value).toLocaleString()} (airport time)`;
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

  getDisplayStatusText(policy: any): string {
    if (this.isOracleVerificationStuck(policy)) {
      return 'Needs Review';
    }

    return this.getStatusText(policy.status);
  }

  getDisplayStatusColor(policy: any): string {
    if (this.isOracleVerificationStuck(policy)) {
      return 'warning';
    }

    return this.getStatusColor(policy.status);
  }

  getResolutionCardClasses(policy: any): string {
    if (this.isOracleVerificationStuck(policy)) {
      return 'bg-amber-50 border border-amber-200';
    }

    return 'bg-blue-50 border border-blue-100';
  }

  getResolutionLabel(policy: any): string {
    if (this.isOracleVerificationStuck(policy)) {
      return 'Verification Follow-Up';
    }

    return 'Resolution Detail';
  }

  isOracleVerificationStuck(policy: any): boolean {
    if (!policy || policy.resolved || policy.status !== 0 || !policy.oracleRequested) {
      return false;
    }

    const verificationEligibleAt = Number(policy.verificationEligibleAt ?? 0);
    if (!verificationEligibleAt) {
      return false;
    }

    const graceMs = Math.max(
      Number(policy.verificationBufferSeconds ?? 0) * 1000,
      PoliciesComponent.ORACLE_MANUAL_REVIEW_GRACE_MS
    );

    return Date.now() >= verificationEligibleAt + graceMs;
  }

  getPayoutTierRows(policy: any): Array<{ label: string; value: string }> {
    const preview = this.payoutPreviewMap.get(String(policy.policyId));

    if (!preview) {
      return [{ label: 'Coverage', value: 'Tier unavailable' }];
    }

    return [
      {
        label: `${preview.minDelayThresholdMinutes} min delay`,
        value: `${preview.minDelayPayoutEth} ETH`
      },
      {
        label: `${preview.maxDelayThresholdMinutes}+ min delay`,
        value: `${preview.maxDelayPayoutEth} ETH`
      },
      {
        label: 'Cancellation',
        value: `${preview.cancellationPayoutEth} ETH`
      }
    ];
  }

  getPayoutTierNote(policy: any): string {
    const preview = this.payoutPreviewMap.get(String(policy.policyId));

    if (!preview) {
      return 'Tier calculation is unavailable right now.';
    }

    return `Delays between ${preview.minDelayThresholdMinutes} and ${preview.maxDelayThresholdMinutes} minutes are calculated progressively between those two payout amounts.`;
  }

  private async loadPayoutPreviews(policies: any[]): Promise<void> {
    const previews = await Promise.all(
      policies.map(async policy => {
        try {
          const preview = await this.contractService.getPayoutPreview(
            Number(policy.premium).toFixed(6)
          );
          return [String(policy.policyId), preview] as const;
        } catch (error) {
          console.error(`Failed to load payout preview for policy ${policy.policyId}`, error);
          return [String(policy.policyId), null] as const;
        }
      })
    );

    this.payoutPreviewMap = new Map(previews);
  }
}
