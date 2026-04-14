import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FlightInsuranceContractService } from '../../insurance/flight-insurance/services/flight-insurance-contract.service';
import { WalletService } from '../../../core/services/wallet.service';

type PoolTransaction = {
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'DONATION' | 'PREMIUM' | 'PAYOUT';
  hash: string;
  amount: string;
  sharesDelta?: string;
  timestamp: number;
  label: string;
};

@Component({
  selector: 'app-pool-transactions',
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
    NzTagModule
  ],
  templateUrl: './pool-transactions.component.html',
  styleUrl: './pool-transactions.component.scss'
})
export class PoolTransactionsComponent implements OnInit {
  private walletService = inject(WalletService);
  private contractService = inject(FlightInsuranceContractService);
  private route = inject(ActivatedRoute);

  isLoading = true;
  poolId = '';
  poolName = 'Pool';
  transactions: PoolTransaction[] = [];

  async ngOnInit() {
    await this.walletService.initialized;
    if (!this.walletService.isAuthenticated()) {
      return;
    }

    this.poolId = this.route.snapshot.paramMap.get('poolId') ?? 'unknown-pool';
    this.poolName = this.getPoolName(this.poolId);
    await this.loadTransactions();
  }

  async loadTransactions() {
    this.isLoading = true;
    try {
      this.transactions = await this.contractService.getPoolTransactions();
    } catch (err) {
      console.error('Error fetching pool transactions:', err);
      this.transactions = [];
    } finally {
      this.isLoading = false;
    }
  }

  getPoolName(poolId: string): string {
    if (poolId === 'flight-delay-v1') {
      return 'Global Flight Delay Pool';
    }
    return 'Pool';
  }

  getTagColor(type: PoolTransaction['type']): string {
    if (type === 'DEPOSIT') return 'green';
    if (type === 'WITHDRAWAL') return 'blue';
    if (type === 'PREMIUM') return 'purple';
    if (type === 'PAYOUT') return 'red';
    return 'gold';
  }

  getAmountTone(type: PoolTransaction['type']): string {
    if (type === 'WITHDRAWAL' || type === 'PAYOUT') return 'text-red-600';
    if (type === 'DEPOSIT' || type === 'PREMIUM' || type === 'DONATION') return 'text-emerald-600';
    return 'text-gray-700';
  }

  getSignedAmount(type: PoolTransaction['type'], amount: string): string {
    return type === 'WITHDRAWAL' || type === 'PAYOUT' ? `-${amount}` : `+${amount}`;
  }

  shortenHash(hash: string): string {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }
}
