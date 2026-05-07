import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { FlightInsuranceContractService } from '../../insurance/flight-insurance/services/flight-insurance-contract.service';
import { FlightInsuranceService } from '../../insurance/flight-insurance/services/flight-insurance.service';
import { WalletService } from '../../../core/services/wallet.service';
import { EthPriceService } from '../../../core/services/eth-price.service';
import { EthAmountPipe } from '../../../core/pipes/eth-amount.pipe';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, NzCardModule, NzTimelineModule, NzIconModule, NzTagModule, NzSkeletonModule, EthAmountPipe],
  templateUrl: './policy-detail.html',
  styleUrl: './policy-detail.scss' // Create an empty scss if needed
})
export class PolicyDetailComponent implements OnInit, OnDestroy {
  private static readonly ORACLE_MANUAL_REVIEW_GRACE_MS = 10 * 60 * 1000;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contractService = inject(FlightInsuranceContractService);
  private flightInsuranceService = inject(FlightInsuranceService);
  private walletService = inject(WalletService);
  private ethPriceService = inject(EthPriceService);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  policyId: string | null = null;
  policyDetails: any = null;
  isLoading = true;
  error: string | null = null;
  payoutConfig: {
    minDelayThresholdMinutes: number;
    maxDelayThresholdMinutes: number;
  } | null = null;
  payoutPreview: any = null;
  now = Date.now();
  private airportTimezoneMap = new Map<string, string>();

  async ngOnInit() {
    void this.ethPriceService.ensureLoaded();
    this.policyId = this.route.snapshot.paramMap.get('id');
    
    if (!this.policyId) {
      this.router.navigate(['/policies']);
      return;
    }

    try {
      const [policyDetails, payoutConfig, airports] = await Promise.all([
        this.contractService.getPolicyTransactions(this.policyId),
        this.contractService.getPayoutConfiguration(),
        firstValueFrom(this.flightInsuranceService.getAirports())
      ]);
      this.policyDetails = policyDetails;
      this.payoutConfig = payoutConfig;
      this.airportTimezoneMap = new Map(
        airports
          .filter(airport => airport.iataCode && airport.timezone)
          .map(airport => [airport.iataCode.toUpperCase(), airport.timezone])
      );
      this.payoutPreview = await this.contractService.getPayoutPreview(
        Number(policyDetails.policy.premium).toFixed(6)
      );
      this.refreshTimer = setInterval(() => {
        this.now = Date.now();
      }, 30000);
    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'Failed to load policy tracking details.';
    } finally {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
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
      case 0: return 'default'; // Unknown/Scheduled
      case 1: return 'success'; // OnTime
      case 2: return 'warning'; // Delayed
      case 3: return 'error'; // Cancelled
      default: return 'default';
    }
  }

  formatApproxUsd(amount: number | string | null | undefined): string {
    return this.ethPriceService.formatApproxUsd(amount);
  }

  nftTraitEntries(): Array<{ label: string; value: string }> {
    const traits = this.policyDetails?.policy?.nft?.metadataAttributes;
    if (!Array.isArray(traits)) {
      return [];
    }

    return traits
      .map((trait: any) => ({
        label: typeof trait?.trait_type === 'string' ? trait.trait_type : 'Attribute',
        value: trait?.value == null ? 'N/A' : String(trait.value)
      }))
      .filter((trait: { label: string; value: string }) => !!trait.value);
  }

  nftPropertyEntries(): Array<{ label: string; value: string }> {
    return [];
  }

  getNftDisplayName(): string {
    return this.policyDetails?.policy?.nft?.metadataName
      || `${this.policyDetails?.policy?.nft?.collectionName || 'Insureth Flight Policy'} #${this.policyDetails?.policy?.nft?.tokenId || this.policyDetails?.policy?.policyId}`;
  }

  getNftDescription(): string {
    if (this.policyDetails?.policy?.nft?.metadataPending) {
      return 'Your policy NFT has been minted on-chain, and metadata is still being pinned to IPFS. The artwork and full collectible details will appear automatically once the minting pipeline completes.';
    }

    return this.policyDetails?.policy?.nft?.metadataDescription
      || 'This soulbound NFT represents your flight insurance policy and stays permanently tied to the wallet that purchased coverage.';
  }

  getVerificationProgress(policy: any): number {
    if (!policy) {
      return 0;
    }

    if (policy.resolved) {
      return 100;
    }

    if (this.isOracleVerificationStuck(policy)) {
      return 100;
    }

    if (!policy.purchaseTimestamp || !policy.verificationEligibleAt) {
      return 20;
    }

    const totalWindow = policy.verificationEligibleAt - policy.purchaseTimestamp;
    if (totalWindow <= 0) {
      return policy.oracleRequested ? 85 : 60;
    }

    const elapsed = this.now - policy.purchaseTimestamp;
    const ratio = Math.min(Math.max(elapsed / totalWindow, 0), 1);
    const progress = Math.round(ratio * 100);
    return policy.oracleRequested ? Math.max(progress, 85) : progress;
  }

  getVerificationProgressBarBackground(policy: any): string {
    return this.isOracleVerificationStuck(policy)
      ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #f97316 100%)'
      : 'linear-gradient(90deg, #8732fb 0%, #6f5ef9 50%, #40c4ff 100%)';
  }

  getVerificationHeadline(policy: any): string {
    if (policy.resolved) {
      return 'Outcome Verified On-Chain';
    }

    if (this.isOracleVerificationStuck(policy)) {
      return 'Manual Review Required';
    }

    if (policy.oracleRequested) {
      return 'Chainlink Oracle Request In Progress';
    }

    if (this.now < policy.departureTime) {
      return 'Waiting For Flight Departure';
    }

    if (this.now < policy.verificationEligibleAt) {
      return 'Waiting For Verification Buffer';
    }

    return 'Eligible For Oracle Verification';
  }

  getVerificationBody(policy: any): string {
    if (policy.resolved) {
      return 'The oracle verification flow completed and your final policy outcome is now stored on-chain.';
    }

    if (this.isOracleVerificationStuck(policy)) {
      return 'Chainlink was expected to return verified flight delay data by now, but this policy still has no final outcome. Please contact us so our backoffice team can verify the real flight result and manually resolve the policy.';
    }

    if (policy.oracleRequested) {
      return 'Chainlink Functions has already been asked to fetch the verified flight outcome. We are waiting for the response to settle this policy.';
    }

    if (this.now < policy.departureTime) {
      return `Your policy is active. Oracle verification can only begin after departure and the ${Math.round(policy.verificationBufferSeconds / 60)} minute verification buffer.`;
    }

    if (this.now < policy.verificationEligibleAt) {
      return `Your flight has departed. The smart contract will allow oracle verification after the configured ${Math.round(policy.verificationBufferSeconds / 60)} minute verification buffer.`;
    }

    return 'Your policy is now eligible for oracle verification. The system should request flight outcome data on the next healthy automation cycle.';
  }

  getCountdownLabel(policy: any): string {
    if (policy.resolved) {
      return 'Resolved';
    }

    if (this.isOracleVerificationStuck(policy)) {
      return 'Manual review needed';
    }

    if (policy.oracleRequested) {
      return 'Oracle request submitted';
    }

    const target = policy.verificationEligibleAt;
    if (!target) {
      return 'Verification time unavailable';
    }

    const remainingMs = target - this.now;
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

  getDelayDisplay(policy: any): string | null {
    if (policy.status !== 2 || policy.delayMinutes <= 0) {
      return null;
    }

    return `${policy.delayMinutes} minutes verified delay`;
  }

  getPayoutExplanation(policy: any): string {
    const payoutAmount = Number(policy.payoutAmount);

    if (payoutAmount > 0) {
      return 'This policy qualified for payout and the smart contract already distributed the funds to your wallet.';
    }

    if (this.isOracleVerificationStuck(policy)) {
      return 'The oracle did not return a usable delay result in time, so this policy now needs manual follow-up. Please contact us and our backoffice team can verify the flight outcome and resolve the policy.';
    }

    if (policy.status === 0 && !policy.resolved) {
      return `Oracle verification is expected after ${this.formatOracleExpectedTime(policy)}.`;
    }

    if (policy.status === 2 && this.payoutConfig) {
      if (policy.delayMinutes < this.payoutConfig.minDelayThresholdMinutes) {
        return `No payout was triggered because the verified delay of ${policy.delayMinutes} minutes stayed below the ${this.payoutConfig.minDelayThresholdMinutes}-minute payout threshold.`;
      }

      return 'This delay reached the payout threshold. Funds should appear once claim distribution completes.';
    }

    if (policy.status === 1) {
      return 'No payout was triggered because the flight was verified as on time.';
    }

    if (policy.status === 3) {
      return payoutAmount > 0
        ? 'Cancellation was verified and the payout has been distributed.'
        : 'Cancellation was verified, but no payout distribution is recorded yet.';
    }

    if (policy.claimed && payoutAmount === 0) {
      return 'This policy concluded without a payout.';
    }

    return 'The latest policy outcome has been recorded on-chain.';
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

  formatUtcDateTime(value: number | string | null | undefined): string {
    if (!value) {
      return 'Unavailable';
    }

    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    }).format(new Date(value));
  }

  getPayoutTierSummary(): string {
    if (!this.payoutPreview) {
      return 'Coverage tier unavailable';
    }

    return `${this.payoutPreview.minDelayThresholdMinutes} min delay: ${this.payoutPreview.minDelayPayoutEth} ETH · ${this.payoutPreview.maxDelayThresholdMinutes}+ min delay: ${this.payoutPreview.maxDelayPayoutEth} ETH · Cancellation: ${this.payoutPreview.cancellationPayoutEth} ETH`;
  }

  getPayoutTierMeta(): string {
    if (!this.payoutPreview) {
      return 'We could not read the tier preview from the contract right now.';
    }

    return `Delays between ${this.payoutPreview.minDelayThresholdMinutes} and ${this.payoutPreview.maxDelayThresholdMinutes} minutes are calculated progressively between those two payout amounts.`;
  }

  getPayoutTierRows(): Array<{ label: string; value: string }> {
    if (!this.payoutPreview) {
      return [{ label: 'Coverage', value: 'Tier unavailable' }];
    }

    return [
      {
        label: `${this.payoutPreview.minDelayThresholdMinutes} min delay`,
        value: `${this.payoutPreview.minDelayPayoutEth} ETH`
      },
      {
        label: `${this.payoutPreview.maxDelayThresholdMinutes}+ min delay`,
        value: `${this.payoutPreview.maxDelayPayoutEth} ETH`
      },
      {
        label: 'Cancellation',
        value: `${this.payoutPreview.cancellationPayoutEth} ETH`
      }
    ];
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
      PolicyDetailComponent.ORACLE_MANUAL_REVIEW_GRACE_MS
    );

    return this.now >= verificationEligibleAt + graceMs;
  }
}
