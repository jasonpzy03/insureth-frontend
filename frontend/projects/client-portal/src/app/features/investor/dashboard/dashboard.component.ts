import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FlightInsuranceContractService } from '../../insurance/flight-insurance/services/flight-insurance-contract.service';
import { WalletService } from '../../../core/services/wallet.service';
import { EthPriceService } from '../../../core/services/eth-price.service';
import { EthAmountPipe } from '../../../core/pipes/eth-amount.pipe';
import { TransactionFlowService } from '../../../core/services/transaction-flow.service';

type InvestorPosition = {
  poolId: string;
  poolName: string;
  shares: number;
  averageEntryPrice: number | null;
  currentShareValue: number;
  capitalInvested: number;
  positionValue: number;
  openPnl: number;
  openPnlPct: number;
  withdrawableNow: number;
  ownershipPercentage: number;
};

@Component({
  selector: 'app-investor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzInputNumberModule,
    NzModalModule,
    NzSkeletonModule,
    NzTableModule,
    NzTagModule,
    EthAmountPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class InvestorDashboardComponent implements OnInit {
  private readonly VALUE_EPSILON = 0.000001;
  private walletService = inject(WalletService);
  private contractService = inject(FlightInsuranceContractService);
  private message = inject(NzMessageService);
  private ethPriceService = inject(EthPriceService);
  private transactionFlow = inject(TransactionFlowService);

  isLoading = true;

  positions: InvestorPosition[] = [];
  netCapitalInvested = 0;
  investorValue = 0;
  maxWithdrawable = 0;
  maxWithdrawableExact = '0';
  openPnl = 0;
  openPnlPct = 0;

  isWithdrawModalVisible = false;
  isWithdrawing = false;
  withdrawAmount: number | null = null;
  useMaxWithdraw = false;

  async ngOnInit() {
    await this.walletService.initialized;
    void this.ethPriceService.ensureLoaded();
    if (!this.walletService.isAuthenticated()) {
      return;
    }
    await this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    try {
      const [investorData, poolStats, capitalSummary] = await Promise.all([
        this.contractService.getInvestorData(),
        this.contractService.getPoolStats(),
        this.contractService.getInvestorCapitalSummary()
      ]);

      const hasMeaningfulShares = investorData.shares > this.VALUE_EPSILON;
      const hasMeaningfulValue = investorData.totalValue > this.VALUE_EPSILON;
      const hasMeaningfulWithdrawable = investorData.maxWithdrawable > this.VALUE_EPSILON;
      const hasActivePosition = hasMeaningfulShares || hasMeaningfulValue || hasMeaningfulWithdrawable;

      this.investorValue = investorData.totalValue;
      this.maxWithdrawable = investorData.maxWithdrawable;
      this.maxWithdrawableExact = investorData.maxWithdrawableExact;
      this.netCapitalInvested = hasActivePosition ? capitalSummary.netCapitalInvested : 0;
      this.openPnl = hasActivePosition
        ? +(this.investorValue - this.netCapitalInvested).toFixed(6)
        : 0;
      this.openPnlPct = hasActivePosition && this.netCapitalInvested > 0
        ? +((this.openPnl / this.netCapitalInvested) * 100).toFixed(2)
        : 0;

      const ownershipPercentage = poolStats.totalLiquidityShares > 0
        ? +((investorData.shares / poolStats.totalLiquidityShares) * 100).toFixed(2)
        : 0;
      const hasMeaningfulPoolShares = poolStats.totalLiquidityShares > this.VALUE_EPSILON;
      const hasMeaningfulPoolAssets = poolStats.totalPoolAssets > this.VALUE_EPSILON;
      const averageEntryPrice = hasActivePosition && hasMeaningfulShares && this.netCapitalInvested > this.VALUE_EPSILON
        ? +(this.netCapitalInvested / investorData.shares).toFixed(6)
        : null;
      const currentShareValue = hasMeaningfulPoolAssets && hasMeaningfulPoolShares
        ? +(poolStats.totalPoolAssets / poolStats.totalLiquidityShares).toFixed(6)
        : 1;

      this.positions =
        hasActivePosition
          ? [
              {
                poolId: 'flight-delay-v1',
                poolName: 'Global Flight Delay Pool',
                shares: investorData.shares,
                averageEntryPrice,
                currentShareValue,
                capitalInvested: this.netCapitalInvested,
                positionValue: this.investorValue,
                openPnl: this.openPnl,
                openPnlPct: this.openPnlPct,
                withdrawableNow: this.maxWithdrawable,
                ownershipPercentage
              }
            ]
          : [];
    } catch (err) {
      console.error('Error fetching investor data:', err);
      this.positions = [];
    } finally {
      this.isLoading = false;
    }
  }

  showWithdrawModal() {
    this.withdrawAmount = null;
    this.useMaxWithdraw = false;
    this.isWithdrawModalVisible = true;
  }

  handleWithdrawCancel() {
    this.isWithdrawModalVisible = false;
    this.useMaxWithdraw = false;
    this.withdrawAmount = null;
  }

  setWithdrawAmount(value: number | null): void {
    this.withdrawAmount = value;
    this.useMaxWithdraw = false;
  }

  useMaximumWithdraw(): void {
    this.withdrawAmount = this.maxWithdrawable;
    this.useMaxWithdraw = true;
  }

  async submitWithdraw() {
    if (!this.withdrawAmount || this.withdrawAmount <= 0) return;

    const confirmed = await this.transactionFlow.confirmAction({
      actionLabel: 'Capital Withdrawal',
      confirmDescription: `Please confirm that you want to withdraw ${this.withdrawAmount} ETH from the pool. You will be asked to approve the transaction in MetaMask next.`
    });

    if (!confirmed) {
      return;
    }

    this.isWithdrawing = true;
    const transactionProgress = this.transactionFlow.openWalletConfirmation('withdraw capital from the pool');
    const displayAmount = this.withdrawAmount;
    const withdrawAmountForTransaction = this.useMaxWithdraw
      ? this.maxWithdrawableExact
      : this.withdrawAmount.toString();

    try {
      await this.contractService.withdrawCapital(
        withdrawAmountForTransaction,
        (hash) => transactionProgress.transactionSubmitted(hash)
      );
      this.message.success(`Successfully withdrew ${displayAmount} ETH!`, { nzDuration: 5000 });
      this.isWithdrawModalVisible = false;
      this.useMaxWithdraw = false;
      await this.loadData();
    } catch (err: any) {
      transactionProgress.close();
      console.error(err);
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        this.message.error('Transaction was rejected by wallet.');
      } else if (err.reason) {
        this.message.error(err.reason);
      } else {
        this.message.error('Withdrawal failed. See console for details.');
      }
    } finally {
      this.isWithdrawing = false;
    }
  }

  get hasPositions(): boolean {
    return this.positions.length > 0;
  }

  getPnlTone(value: number): string {
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-500';
  }

  formatApproxUsd(amount: number | string): string {
    return this.ethPriceService.formatApproxUsd(amount);
  }

  hasMeaningfulAverageEntryPrice(value: number | null): boolean {
    return value !== null && Number.isFinite(value) && value > this.VALUE_EPSILON;
  }
}
