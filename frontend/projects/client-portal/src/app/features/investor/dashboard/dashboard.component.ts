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

type InvestorPosition = {
  poolId: string;
  poolName: string;
  shares: number;
  boughtShareValue: number;
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
    NzTagModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class InvestorDashboardComponent implements OnInit {
  private walletService = inject(WalletService);
  private contractService = inject(FlightInsuranceContractService);
  private message = inject(NzMessageService);

  isLoading = true;

  positions: InvestorPosition[] = [];
  netCapitalInvested = 0;
  investorValue = 0;
  maxWithdrawable = 0;
  openPnl = 0;
  openPnlPct = 0;

  isWithdrawModalVisible = false;
  isWithdrawing = false;
  withdrawAmount: number | null = null;

  async ngOnInit() {
    await this.walletService.initialized;
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

      this.investorValue = investorData.totalValue;
      this.maxWithdrawable = investorData.maxWithdrawable;
      this.netCapitalInvested = capitalSummary.netCapitalInvested;
      this.openPnl = +(this.investorValue - this.netCapitalInvested).toFixed(6);
      this.openPnlPct = this.netCapitalInvested > 0
        ? +((this.openPnl / this.netCapitalInvested) * 100).toFixed(2)
        : 0;

      const ownershipPercentage = poolStats.totalLiquidityShares > 0
        ? +((investorData.shares / poolStats.totalLiquidityShares) * 100).toFixed(2)
        : 0;
      const boughtShareValue = investorData.shares > 0
        ? +(this.netCapitalInvested / investorData.shares).toFixed(6)
        : 0;
      const currentShareValue = poolStats.totalLiquidityShares > 0
        ? +(poolStats.totalPoolAssets / poolStats.totalLiquidityShares).toFixed(6)
        : 0;

      this.positions =
        investorData.shares > 0 || this.netCapitalInvested > 0 || this.investorValue > 0
          ? [
              {
                poolId: 'flight-delay-v1',
                poolName: 'Global Flight Delay Pool',
                shares: investorData.shares,
                boughtShareValue,
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
    this.isWithdrawModalVisible = true;
  }

  handleWithdrawCancel() {
    this.isWithdrawModalVisible = false;
  }

  async submitWithdraw() {
    if (!this.withdrawAmount || this.withdrawAmount <= 0) return;

    this.isWithdrawing = true;
    const loadingMsg = this.message.loading('Awaiting withdrawal confirmation...', { nzDuration: 0 });

    try {
      await this.contractService.withdrawCapital(this.withdrawAmount.toString());
      this.message.remove(loadingMsg.messageId);
      this.message.success(`Successfully withdrew ${this.withdrawAmount} ETH!`, { nzDuration: 5000 });
      this.isWithdrawModalVisible = false;
      await this.loadData();
    } catch (err: any) {
      this.message.remove(loadingMsg.messageId);
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
}
