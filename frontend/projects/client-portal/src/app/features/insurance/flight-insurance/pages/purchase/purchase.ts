import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AirportModel } from '../../models/airportModel';
import { AirlineModel } from '../../models/airlineModel';
import { FlightInsuranceService } from '../../services/flight-insurance.service';
import { FlightInsuranceContractService } from '../../services/flight-insurance-contract.service';
import { FlightScheduleResponseModel } from '../../models/flightScheduleModel';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import { FlightInsuranceExperienceConfigResponse } from '../../models/flightInsuranceConfig.model';
import { FlightInsuranceQuoteResponse } from '../../models/flightInsuranceQuote.model';
import { EthPriceService } from '../../../../../core/services/eth-price.service';
import { EthAmountPipe } from '../../../../../core/pipes/eth-amount.pipe';
import { NotificationService } from '../../../../../core/services/notification.service';
import { TransactionFlowService } from '../../../../../core/services/transaction-flow.service';

type PremiumBreakdown = {
  grossPremiumEth: number;
  feeAmountEth: number;
  netPremiumEth: number;
  feeMode: 'PERCENTAGE' | 'FLAT_AMOUNT';
  configuredFeeValue: number;
};

type DelayCoverageRow = {
  label: string;
  amount: string;
  meta: string;
};

@Component({
  selector: 'purchase',
  standalone: false,
  templateUrl: './purchase.html',
  styleUrl: './purchase.scss',
})
export class PurchasePage implements OnInit {
  private readonly ethAmountPipe = new EthAmountPipe();
  purchaseForm!: FormGroup;
  isLoading = true;
  isSearching = false;
  isContractDataLoading = false;
  flightSchedule: FlightScheduleResponseModel | null = null;
  config: FlightInsuranceExperienceConfigResponse | null = null;
  quote: FlightInsuranceQuoteResponse | null = null;
  premiumBreakdown: PremiumBreakdown | null = null;

  airlines: AirlineModel[] = [];
  airports: AirportModel[] = [];
  delayCoverageRows: DelayCoverageRow[] = [];

  constructor(
    private fb: FormBuilder,
    private flightInsuranceService: FlightInsuranceService,
    private contractService: FlightInsuranceContractService,
    private message: NzMessageService,
    private router: Router,
    private ethPriceService: EthPriceService,
    private notificationService: NotificationService,
    private transactionFlow: TransactionFlowService
  ) { }

  private toUtcUnixTimestamp(scheduleTime: string): number {
    if (!scheduleTime?.trim()) {
      throw new Error('Flight schedule time is missing.');
    }

    const normalized = scheduleTime.trim();
    const hasUtcIndicator = normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized);
    if (!hasUtcIndicator) {
      throw new Error('Flight schedule time is not timezone-aware.');
    }

    const timestamp = Date.parse(normalized);
    if (Number.isNaN(timestamp)) {
      throw new Error('Flight schedule time could not be parsed.');
    }

    return Math.floor(timestamp / 1000);
  }

  ngOnInit(): void {
    this.purchaseForm = this.fb.group({
      airline: [null, [Validators.required]],
      flightNumber: [null, [Validators.required]],
      departureAirport: [null, [Validators.required]],
      departureDate: [null, [Validators.required]],
    });

    this.loadDropdownData();
    void this.ethPriceService.ensureLoaded();
  }

  private loadDropdownData(): void {
    this.isLoading = true;
    forkJoin({
      config: this.flightInsuranceService.getConfig(),
      airlines: this.flightInsuranceService.getAirlines(),
      airports: this.flightInsuranceService.getAirports()
    }).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (results) => {
        this.config = results.config;
        this.airlines = results.airlines;
        this.airports = results.airports;
      },
      error: (err) => console.error('Failed to fetch flight data:', err)
    });
  }

  disabledDate = (selectedDate: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstFutureBookableDate = new Date(today);
    firstFutureBookableDate.setDate(firstFutureBookableDate.getDate() + 7);

    const current = new Date(selectedDate);
    current.setHours(0, 0, 0, 0);

    return current.getTime() > today.getTime() && current.getTime() < firstFutureBookableDate.getTime();
  };

  async submitForm(): Promise<void> {
    if (this.purchaseForm.valid) {
      this.isSearching = true;
      // 1. Check if contract has sufficient funds to payout this policy
      // We check against the fixed premium config
      // const canCover = await this.contractService.canCoverPayout('0.02');
      // if (!canCover) {
      //   this.message.error("The smart contract's liquidity pool currently holds insufficient funds to cover this policy. Please try again later.", { nzDuration: 6000 });
      //   this.isSearching = false;
      //   return;
      // }

      const formValue = this.purchaseForm.value;

      const dateObj = formValue.departureDate as Date;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // ==========================================
      // Testing Mode: Mock response to bypass API
      // ==========================================
      // setTimeout(() => {
      //   this.flightSchedule = {
      //     flightIATA: `${formValue.airline.toUpperCase()}${formValue.flightNumber}`,
      //     departureAirportIATA: formValue.departureAirport.toUpperCase(),
      //     arrivalAirportIATA: 'JHB',
      //     departureAirportName: 'Kuala Lumpur Internation Airport',
      //     arrivalAirportName: 'Senai Internation Airport',
      //     departureTime: new Date(dateObj.getTime() + 1000 * 3600 * 6).toISOString(),
      //     arrivalTime: new Date(dateObj.getTime() + 1000 * 3600 * 12).toISOString(),
      //   };
      // }, 800);

      this.flightInsuranceService.getFlightSchedule(
        formValue.airline,
        formValue.flightNumber,
        formValue.departureAirport,
        formattedDate
      ).pipe(
        finalize(() => this.isSearching = false)
      ).subscribe({
        next: (res) => {
          console.log('Flight Schedule retrieved:', res);
          this.flightSchedule = res;
        },
        error: (err) => {
          console.error('Failed to fetch flight schedule:', err);
          this.message.error('Could not find flight schedule. Please check the airline and flight number.');
        }
      });

      this.flightInsuranceService.getQuote(
        formValue.airline,
        formValue.flightNumber,
        formattedDate
      ).subscribe({
        next: async (quote) => {
          this.quote = quote;
          await this.refreshContractData();
          this.isSearching = false;
        },
        error: () => {
          this.flightSchedule = null;
          this.quote = null;
          this.premiumBreakdown = null;
          this.delayCoverageRows = [];
          this.isContractDataLoading = false;
          this.isSearching = false;
        }
      });
    } else {
      Object.values(this.purchaseForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  isBuying = false;

  get displayCurrency(): string {
    return this.config?.product.currency || 'ETH';
  }

  get premiumDisplay(): string {
    if (this.isContractDataLoading && this.quote) {
      return `Loading ${this.displayCurrency}...`;
    }

    return this.quote
      ? `${this.ethAmountPipe.transform(this.quote.quotedPremiumEth)} ${this.displayCurrency}`
      : `-- ${this.displayCurrency}`;
  }

  get premiumFeeDisplay(): string {
    if (this.isContractDataLoading) {
      return `Loading ${this.displayCurrency}...`;
    }

    if (!this.premiumBreakdown) {
      return `-- ${this.displayCurrency}`;
    }

    return `${this.ethAmountPipe.transform(this.premiumBreakdown.feeAmountEth)} ${this.displayCurrency}`;
  }

  get netPremiumDisplay(): string {
    if (this.isContractDataLoading) {
      return `Loading ${this.displayCurrency}...`;
    }

    if (!this.premiumBreakdown) {
      return `-- ${this.displayCurrency}`;
    }

    return `${this.ethAmountPipe.transform(this.premiumBreakdown.netPremiumEth)} ${this.displayCurrency}`;
  }

  get feeLabel(): string {
    if (!this.premiumBreakdown) {
      return 'Platform Fee';
    }

    if (this.premiumBreakdown.feeMode === 'FLAT_AMOUNT') {
      return `Platform Fee (Flat ${this.ethAmountPipe.transform(this.premiumBreakdown.configuredFeeValue)} ${this.displayCurrency})`;
    }

    return `Platform Fee (${this.premiumBreakdown.configuredFeeValue}% of total paid)`;
  }

  get premiumUsdApprox(): string {
    return this.quote
      ? this.ethPriceService.formatApproxUsd(this.quote.quotedPremiumEth)
      : '';
  }

  get premiumFeeUsdApprox(): string {
    return this.premiumBreakdown
      ? this.ethPriceService.formatApproxUsd(this.premiumBreakdown.feeAmountEth)
      : '';
  }

  get netPremiumUsdApprox(): string {
    return this.premiumBreakdown
      ? this.ethPriceService.formatApproxUsd(this.premiumBreakdown.netPremiumEth)
      : '';
  }

  get basePremiumDisplay(): string {
    if (!this.quote) {
      return `-- ${this.displayCurrency}`;
    }

    return `${this.ethAmountPipe.transform(this.quote.basePremiumEth)} ${this.displayCurrency}`;
  }

  get daysMultiplierDisplay(): string {
    if (!this.quote) {
      return '--';
    }

    return `x${Number(this.quote.daysMultiplier).toFixed(2)}`;
  }

  get performanceMultiplierDisplay(): string {
    if (!this.quote) {
      return '--';
    }

    return `x${Number(this.quote.performanceMultiplier).toFixed(2)}`;
  }

  get totalMultiplierDisplay(): string {
    if (!this.quote) {
      return '--';
    }

    return `x${Number(this.quote.totalMultiplier).toFixed(2)}`;
  }

  async refreshDelayCoverageRows(): Promise<void> {
    if (!this.quote) {
      this.delayCoverageRows = [];
      return;
    }

    try {
      const preview = await this.contractService.getPayoutPreview(
        Number(this.quote.quotedPremiumEth).toFixed(6)
      );

      this.delayCoverageRows = [
        {
          label: `Delay at ${preview.minDelayThresholdMinutes} minutes`,
          amount: `${this.ethAmountPipe.transform(preview.minDelayPayoutEth)} ${this.displayCurrency}`,
          meta: 'First payout trigger'
        },
        {
          label: `Delay at ${preview.exampleDelayMinutes} minutes`,
          amount: `${this.ethAmountPipe.transform(preview.exampleDelayPayoutEth)} ${this.displayCurrency}`,
          meta: 'Interpolated payout based on actual delay'
        },
        {
          label: `Delay at ${preview.maxDelayThresholdMinutes}+ minutes`,
          amount: `${this.ethAmountPipe.transform(preview.maxDelayPayoutEth)} ${this.displayCurrency}`,
          meta: 'Maximum delay-based payout'
        },
        {
          label: 'Flight Cancellation',
          amount: `${this.ethAmountPipe.transform(preview.cancellationPayoutEth)} ${this.displayCurrency}`,
          meta: 'Automatic disruption payout'
        }
      ];
    } catch (error) {
      console.error('Failed to read payout preview from contract:', error);
      this.delayCoverageRows = [];
    }
  }

  async refreshPremiumBreakdown(): Promise<void> {
    try {
      if (!this.quote) {
        this.premiumBreakdown = null;
        return;
      }

      this.premiumBreakdown = await this.contractService.getPremiumBreakdown(
        Number(this.quote.quotedPremiumEth).toFixed(6)
      );
    } catch (error) {
      console.error('Failed to read premium breakdown from contract:', error);
      this.premiumBreakdown = null;
    }
  }

  private async refreshContractData(): Promise<void> {
    if (!this.quote) {
      this.premiumBreakdown = null;
      this.delayCoverageRows = [];
      return;
    }

    this.isContractDataLoading = true;

    try {
      await Promise.all([
        this.refreshPremiumBreakdown(),
        this.refreshDelayCoverageRows()
      ]);
    } finally {
      this.isContractDataLoading = false;
    }
  }

  async buyPolicy(): Promise<void> {
    if (!this.flightSchedule) return;
    const confirmed = await this.transactionFlow.confirmAction({
      actionLabel: 'Policy Purchase',
      confirmDescription: 'Please confirm that you want to purchase this flight insurance policy. You will be asked to approve the transaction in MetaMask next.'
    });

    if (!confirmed) {
      return;
    }

    this.isBuying = true;
    const transactionProgress = this.transactionFlow.openWalletConfirmation('purchase this policy');

    try {
      const flightNumber = this.flightSchedule.flightIATA;
      const origin = this.flightSchedule.departureAirportIATA;
      const destination = this.flightSchedule.arrivalAirportIATA;
      const departureTimeUnix = this.toUtcUnixTimestamp(this.flightSchedule.departureTime);
      console.log('Departure time (unix):', departureTimeUnix, '| Date:', new Date(departureTimeUnix * 1000).toISOString());
      if (!this.quote) {
        throw new Error('Quote is not available. Please retrieve a quote again.');
      }

      const premiumInEth = Number(this.quote.quotedPremiumEth).toFixed(6);

      const { receipt, policyId } = await this.contractService.buyPolicy(
        flightNumber,
        origin,
        destination,
        departureTimeUnix,
        premiumInEth,
        (hash) => transactionProgress.transactionSubmitted(hash)
      );
      this.message.success('Policy successfully purchased on-chain. You can view it in your dashboard shortly.', { nzDuration: 5000 });
      await this.notificationService.refresh();
      console.log('Purchase successful, receipt:', receipt);

      await this.router.navigate(policyId ? ['/policies', policyId] : ['/policies']);
    } catch (error: any) {
      transactionProgress.close();
      console.error('Purchase failed:', error);
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        this.message.error('Transaction was rejected by the wallet.', { nzDuration: 5000 });
      } else {
        this.message.error(`Failed to purchase policy: ${error.message}`, { nzDuration: 8000 });
      }
    } finally {
      this.isBuying = false;
    }
  }

  resetForm(): void {
    this.flightSchedule = null;
    this.quote = null;
    this.premiumBreakdown = null;
    this.delayCoverageRows = [];
    this.isContractDataLoading = false;
  }
}
