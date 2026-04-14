import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FlightInsuranceContractService } from '../insurance/flight-insurance/services/flight-insurance-contract.service';
import { WalletService } from '../../core/services/wallet.service';

type DashboardPolicy = {
  policyId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: number;
  premium: string;
  premiumPaid: string;
  status: number;
  active: boolean;
  claimed: boolean;
  payoutAmount: string;
  type: string;
};

type DashboardActivity = {
  type: 'PURCHASE' | 'PAYOUT';
  policyId: string;
  title: string;
  subtitle: string;
  amount: string;
  timestamp: number;
  tone: 'blue' | 'emerald';
};

@Component({
  selector: 'app-dashboard',
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
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private contractService = inject(FlightInsuranceContractService);
  private walletService = inject(WalletService);
  private router = inject(Router);

  isLoading = true;
  policies: DashboardPolicy[] = [];
  recentPolicies: DashboardPolicy[] = [];
  recentActivities: DashboardActivity[] = [];

  activePolicies = 0;
  claimedPolicies = 0;
  totalPremiumPaid = 0;
  totalDisbursed = 0;
  pendingVerification = 0;

  async ngOnInit() {
    await this.walletService.initialized;
    if (!this.walletService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    await this.loadDashboard();
  }

  async loadDashboard() {
    this.isLoading = true;
    try {
      const policies = await this.contractService.getUserPolicies();
      this.policies = policies;
      this.recentPolicies = [...policies]
        .sort((a, b) => b.departureTime - a.departureTime)
        .slice(0, 5);

      this.activePolicies = policies.filter((policy) => policy.active).length;
      this.claimedPolicies = policies.filter((policy) => Number(policy.payoutAmount) > 0).length;
      this.totalPremiumPaid = policies.reduce((sum, policy) => sum + Number(policy.premiumPaid ?? policy.premium), 0);
      this.totalDisbursed = policies.reduce((sum, policy) => sum + Number(policy.payoutAmount), 0);
      this.pendingVerification = policies.filter((policy) => !policy.claimed && !policy.active && policy.status === 0).length;

      const activitySource = await Promise.all(
        this.recentPolicies.slice(0, 4).map(async (policy) => {
          try {
            return await this.contractService.getPolicyTransactions(policy.policyId);
          } catch (error) {
            console.error(`Failed to load transactions for policy ${policy.policyId}`, error);
            return null;
          }
        })
      );

      this.recentActivities = activitySource
        .filter((entry): entry is NonNullable<typeof entry> => !!entry)
        .flatMap((entry) =>
          entry.transactions.map((tx: any) => ({
            type: tx.type,
            policyId: entry.policy.policyId,
            title: tx.type === 'PURCHASE' ? 'Policy purchased' : 'Payout distributed',
            subtitle: `${entry.policy.flightNumber} ${entry.policy.origin} -> ${entry.policy.destination}`,
            amount: tx.amount,
            timestamp: tx.timestamp,
            tone: tx.type === 'PURCHASE' ? 'blue' : 'emerald'
          }))
        )
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      this.isLoading = false;
    }
  }

  getStatusText(policy: DashboardPolicy): string {
    if (Number(policy.payoutAmount) > 0) {
      return 'Payout Distributed';
    }

    if (policy.claimed) {
      return 'Resolved';
    }

    if (policy.active) {
      return 'Active';
    }

    switch (policy.status) {
      case 0:
        return 'Awaiting Verification';
      case 1:
        return 'On Time';
      case 2:
        return 'Delayed';
      case 3:
        return 'Cancelled';
      case 4:
        return 'Diverted';
      default:
        return 'Unknown';
    }
  }

  getStatusColor(policy: DashboardPolicy): string {
    if (Number(policy.payoutAmount) > 0) return 'success';
    if (policy.claimed) return 'processing';
    if (policy.active) return 'geekblue';

    switch (policy.status) {
      case 0:
        return 'default';
      case 1:
        return 'success';
      case 2:
        return 'warning';
      case 3:
      case 4:
        return 'error';
      default:
        return 'default';
    }
  }
}
