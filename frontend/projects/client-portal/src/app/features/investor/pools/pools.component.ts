import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FlightInsuranceContractService } from '../../insurance/flight-insurance/services/flight-insurance-contract.service';
import { EthPriceService } from '../../../core/services/eth-price.service';
import { EthAmountPipe } from '../../../core/pipes/eth-amount.pipe';
import { FLIGHT_INSURANCE_CONTRACT_ADDRESS } from '../../insurance/flight-insurance/constants/flight-insurance-contract.constants';
import { TransactionFlowService } from '../../../core/services/transaction-flow.service';

@Component({
  selector: 'app-investor-pools',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzCardModule, NzButtonModule, NzModalModule, NzInputNumberModule, NzIconModule, EthAmountPipe],
  templateUrl: './pools.component.html',
  styleUrl: './pools.component.scss'
})
export class InvestorPoolsComponent implements OnInit {
  private readonly VALUE_EPSILON = 0.000001;
  private contractService = inject(FlightInsuranceContractService);
  private message = inject(NzMessageService);
  private router = inject(Router);
  private ethPriceService = inject(EthPriceService);
  private transactionFlow = inject(TransactionFlowService);

  isFundingModalVisible = false;
  isFunding = false;
  fundAmount: number | null = 1.0;

  pools = [
    {
      id: 'flight-delay-v1',
      name: 'Global Flight Delay Pool',
      description: 'Provides liquidity for automated payouts when commercial flights are delayed globally.',
      freeLiquidity: '0.0',
      reservedLiquidity: '0.0',
      totalPoolAssets: '0.0',
      totalLiquidityShares: '0.0',
      sharePrice: '0.0',
      riskLevel: 'Low',
      currency: 'ETH'
    }
  ];

  selectedPool: any = null;
  readonly contractAddress = FLIGHT_INSURANCE_CONTRACT_ADDRESS;

  get explorerUrl(): string {
    return `https://sepolia.etherscan.io/address/${this.contractAddress}`;
  }

  async ngOnInit() {
    void this.ethPriceService.ensureLoaded();
    try {
      const stats = await this.contractService.getPoolStats();
      this.pools[0].freeLiquidity = stats.freeLiquidity.toFixed(4);
      this.pools[0].reservedLiquidity = stats.reservedLiquidity.toFixed(4);
      this.pools[0].totalPoolAssets = stats.totalPoolAssets.toFixed(4);
      this.pools[0].totalLiquidityShares = stats.totalLiquidityShares.toFixed(6);
      const isEffectivelyEmptyPool =
        stats.totalPoolAssets <= this.VALUE_EPSILON ||
        stats.totalLiquidityShares <= this.VALUE_EPSILON;
      this.pools[0].sharePrice = isEffectivelyEmptyPool
        ? '1.000000'
        : (stats.totalPoolAssets / stats.totalLiquidityShares).toFixed(6);
    } catch (err) {
      console.error("Failed to load pool stats", err);
    }
  }

  formatApproxUsd(amount: number | string): string {
    return this.ethPriceService.formatApproxUsd(amount);
  }

  showFundModal(pool: any) {
    this.selectedPool = pool;
    this.fundAmount = 1.0;
    this.isFundingModalVisible = true;
  }

  handleCancel() {
    this.isFundingModalVisible = false;
    this.selectedPool = null;
  }

  async submitFunding() {
    if (!this.fundAmount || this.fundAmount <= 0) return;

    const confirmed = await this.transactionFlow.confirmAction({
      actionLabel: 'Liquidity Deposit',
      confirmDescription: `Please confirm that you want to deposit ${this.fundAmount} ETH into the pool. You will be asked to approve the transaction in MetaMask next.`
    });

    if (!confirmed) {
      return;
    }

    this.isFunding = true;
    const transactionProgress = this.transactionFlow.openWalletConfirmation('deposit liquidity into the pool');

    try {
      await this.contractService.provideLiquidity(
        this.fundAmount.toString(),
        (hash) => transactionProgress.transactionSubmitted(hash)
      );
      this.message.success(`Successfully deposited ${this.fundAmount} ETH into ${this.selectedPool.name}!`, { nzDuration: 5000 });
      
      this.isFundingModalVisible = false;
      this.selectedPool = null;
      
      this.router.navigate(['/investor/dashboard']);

    } catch (err: any) {
      transactionProgress.close();
      console.error(err);
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        this.message.error('Transaction was rejected by wallet.');
      } else {
        this.message.error('Funding failed. See console for details.');
      }
    } finally {
      this.isFunding = false;
    }
  }
}
