import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { WalletService } from '../../../core/services/wallet.service';
import { FlightInsuranceContractService } from '../../insurance/flight-insurance/services/flight-insurance-contract.service';

type InvestorTransaction = {
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'DONATION';
  hash: string;
  amount: string;
  sharesDelta?: string;
  timestamp: number;
  label: string;
};

@Component({
  selector: 'app-investor-transactions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    NzCardModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzSkeletonModule,
    NzIconModule
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class InvestorTransactionsComponent implements OnInit {
  private walletService = inject(WalletService);
  private contractService = inject(FlightInsuranceContractService);

  isLoading = true;
  transactions: InvestorTransaction[] = [];
  explorerBaseUrl: string | null = null;

  async ngOnInit() {
    await this.walletService.initialized;
    if (!this.walletService.isAuthenticated()) {
      return;
    }

    await this.resolveExplorerBaseUrl();
    await this.loadTransactions();
  }

  async resolveExplorerBaseUrl() {
    try {
      const provider = this.walletService.getProvider();
      if (!provider) {
        this.explorerBaseUrl = null;
        return;
      }

      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      this.explorerBaseUrl =
        chainId === 1 ? 'https://etherscan.io/tx/' :
        chainId === 11155111 ? 'https://sepolia.etherscan.io/tx/' :
        chainId === 8453 ? 'https://basescan.org/tx/' :
        chainId === 84532 ? 'https://sepolia.basescan.org/tx/' :
        null;
    } catch (error) {
      console.error('Failed to resolve explorer URL:', error);
      this.explorerBaseUrl = null;
    }
  }

  async loadTransactions() {
    this.isLoading = true;
    try {
      this.transactions = await this.contractService.getInvestorTransactions();
    } catch (err) {
      console.error('Error fetching investor transactions:', err);
      this.transactions = [];
    } finally {
      this.isLoading = false;
    }
  }

  getTagColor(type: InvestorTransaction['type']): string {
    if (type === 'DEPOSIT') return 'green';
    if (type === 'WITHDRAWAL') return 'blue';
    return 'gold';
  }

  getSignedAmount(type: InvestorTransaction['type'], amount: string): string {
    return type === 'WITHDRAWAL' ? `-${amount}` : `+${amount}`;
  }

  shortenHash(hash: string): string {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }

  getExplorerUrl(hash: string): string | null {
    return this.explorerBaseUrl ? `${this.explorerBaseUrl}${hash}` : null;
  }
}
