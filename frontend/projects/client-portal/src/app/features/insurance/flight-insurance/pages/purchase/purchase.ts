import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
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
  purchaseForm!: FormGroup;
  isLoading = true;
  isSearching = false;
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
    private router: Router
  ) { }

  ngOnInit(): void {
    this.purchaseForm = this.fb.group({
      airline: [null, [Validators.required]],
      flightNumber: [null, [Validators.required]],
      departureAirport: [null, [Validators.required]],
      departureDate: [null, [Validators.required]],
    });

    this.loadDropdownData();
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
    // Can only select days that are at least 7 days from today
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    minDate.setHours(0, 0, 0, 0);
    return selectedDate.getTime() < minDate.getTime();
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
      setTimeout(() => {
        this.flightSchedule = {
          flightIATA: `${formValue.airline.toUpperCase()}${formValue.flightNumber}`,
          departureAirportIATA: formValue.departureAirport.toUpperCase(),
          arrivalAirportIATA: 'JHB',
          departureAirportName: 'Kuala Lumpur Internation Airport',
          arrivalAirportName: 'Senai Internation Airport',
          departureTime: new Date(dateObj.getTime() + 1000 * 3600 * 6).toISOString(),
          arrivalTime: new Date(dateObj.getTime() + 1000 * 3600 * 12).toISOString(),
        };

        this.flightInsuranceService.getQuote(
          formValue.airline,
          formValue.flightNumber,
          formattedDate
        ).subscribe({
          next: async (quote) => {
            this.quote = quote;
            await this.refreshPremiumBreakdown();
            await this.refreshDelayCoverageRows();
            this.isSearching = false;
          },
          error: () => {
            this.flightSchedule = null;
            this.quote = null;
            this.delayCoverageRows = [];
            this.isSearching = false;
          }
        });
      }, 800);

      /* --- ORIGINAL BACKEND CALL ---
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

          // Helper to combine the selected date with the "HH:mm" time from the API
          const parseTime = (timeStr: string, baseDate: Date) => {
            if (!timeStr || !timeStr.includes(':')) return new Date(baseDate);
            const [hours, minutes] = timeStr.split(':').map(Number);
            const d = new Date(baseDate);
            d.setHours(hours || 0, minutes || 0, 0, 0);
            return d;
          };

          const depDate = parseTime(res.departureTime, dateObj);
          const arrDate = parseTime(res.arrivalTime || res.departureTime, dateObj);

          // Standardize arrival if it's "before" departure (next day flight)
          if (arrDate < depDate) {
            arrDate.setDate(arrDate.getDate() + 1);
          }

          this.flightSchedule = {
            ...res,
            departureTime: depDate.toISOString(),
            arrivalTime: arrDate.toISOString()
          };

          // Stable calculations to prevent infinite change detection loops
          this.calculateStablePremium();
          this.generateDelayCoverageRows();

          void this.refreshPremiumBreakdown();
          console.log("DONE REFRESH");
        },
        error: (err) => {
          console.error('Failed to fetch flight schedule:', err);
          this.message.error('Could not find flight schedule. Please check the airline and flight number.');
        }
      });
      --------------------------------- */

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
    return this.quote
      ? `${Number(this.quote.quotedPremiumEth).toFixed(4)} ${this.displayCurrency}`
      : `-- ${this.displayCurrency}`;
  }

  get premiumFeeDisplay(): string {
    if (!this.premiumBreakdown) {
      return `-- ${this.displayCurrency}`;
    }

    return `${this.premiumBreakdown.feeAmountEth.toFixed(4)} ${this.displayCurrency}`;
  }

  get netPremiumDisplay(): string {
    if (!this.premiumBreakdown) {
      return `-- ${this.displayCurrency}`;
    }

    return `${this.premiumBreakdown.netPremiumEth.toFixed(4)} ${this.displayCurrency}`;
  }

  get feeLabel(): string {
    if (!this.premiumBreakdown) {
      return 'Platform Fee';
    }

    if (this.premiumBreakdown.feeMode === 'FLAT_AMOUNT') {
      return `Platform Fee (Flat ${this.premiumBreakdown.configuredFeeValue.toFixed(4)} ${this.displayCurrency})`;
    }

    return `Platform Fee (${this.premiumBreakdown.configuredFeeValue}% of total paid)`;
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
          amount: `${preview.minDelayPayoutEth.toFixed(4)} ${this.displayCurrency}`,
          meta: 'First payout trigger'
        },
        {
          label: `Delay at ${preview.exampleDelayMinutes} minutes`,
          amount: `${preview.exampleDelayPayoutEth.toFixed(4)} ${this.displayCurrency}`,
          meta: 'Interpolated payout based on actual delay'
        },
        {
          label: `Delay at ${preview.maxDelayThresholdMinutes}+ minutes`,
          amount: `${preview.maxDelayPayoutEth.toFixed(4)} ${this.displayCurrency}`,
          meta: 'Maximum delay-based payout'
        },
        {
          label: 'Flight Cancellation',
          amount: `${preview.cancellationPayoutEth.toFixed(4)} ${this.displayCurrency}`,
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

  async buyPolicy(): Promise<void> {
    if (!this.flightSchedule) return;
    this.isBuying = true;

    try {
      const flightNumber = this.flightSchedule.flightIATA;
      const origin = this.flightSchedule.departureAirportIATA;
      const destination = this.flightSchedule.arrivalAirportIATA;
      const departureTimeUnix = Math.floor(new Date(this.flightSchedule.departureTime).getTime() / 1000);
      console.log('Departure time (unix):', departureTimeUnix, '| Date:', new Date(departureTimeUnix * 1000).toISOString());
      if (!this.quote) {
        throw new Error('Quote is not available. Please retrieve a quote again.');
      }

      const premiumInEth = Number(this.quote.quotedPremiumEth).toFixed(6);

      const loadingMsg = this.message.loading('Awaiting wallet confirmation...', { nzDuration: 0 });

      const receipt = await this.contractService.buyPolicy(flightNumber, origin, destination, departureTimeUnix, premiumInEth);

      this.message.remove(loadingMsg.messageId);
      this.message.success('Policy successfully purchased on-chain!', { nzDuration: 5000 });
      console.log('Purchase successful, receipt:', receipt);

      this.router.navigate(['/policies']);
    } catch (error: any) {
      this.message.remove(); // clears all or we could save loadingMsg.messageId. Let's just remove all to be safe or specific:
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
  }
}
