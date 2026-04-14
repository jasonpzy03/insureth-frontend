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

@Component({
  selector: 'app-investor-pools',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzCardModule, NzButtonModule, NzModalModule, NzInputNumberModule, NzIconModule],
  templateUrl: './pools.component.html',
  styleUrl: './pools.component.scss'
})
export class InvestorPoolsComponent implements OnInit {
  private contractService = inject(FlightInsuranceContractService);
  private message = inject(NzMessageService);
  private router = inject(Router);

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

  async ngOnInit() {
    try {
      const stats = await this.contractService.getPoolStats();
      this.pools[0].freeLiquidity = stats.freeLiquidity.toFixed(4);
      this.pools[0].reservedLiquidity = stats.reservedLiquidity.toFixed(4);
      this.pools[0].totalPoolAssets = stats.totalPoolAssets.toFixed(4);
      this.pools[0].totalLiquidityShares = stats.totalLiquidityShares.toFixed(6);
      this.pools[0].sharePrice = stats.totalLiquidityShares > 0
        ? (stats.totalPoolAssets / stats.totalLiquidityShares).toFixed(6)
        : '1.000000';
    } catch (err) {
      console.error("Failed to load pool stats", err);
    }
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

    this.isFunding = true;
    const loadingMsg = this.message.loading('Awaiting funding confirmation...', { nzDuration: 0 });

    try {
      await this.contractService.provideLiquidity(this.fundAmount.toString());
      this.message.remove(loadingMsg.messageId);
      this.message.success(`Successfully deposited ${this.fundAmount} ETH into ${this.selectedPool.name}!`, { nzDuration: 5000 });
      
      this.isFundingModalVisible = false;
      this.selectedPool = null;
      
      this.router.navigate(['/investor/dashboard']);

    } catch (err: any) {
      this.message.remove(loadingMsg.messageId);
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
