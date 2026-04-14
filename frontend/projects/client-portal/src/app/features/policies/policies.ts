import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FlightInsuranceContractService } from '../insurance/flight-insurance/services/flight-insurance-contract.service';
import { WalletService } from '../../core/services/wallet.service';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Router } from '@angular/router';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NzCardModule, NzSkeletonModule, NzTagModule, NzIconModule, NzInputModule, NzSelectModule],
  templateUrl: './policies.html',
  styleUrl: './policies.scss'
})
export class PoliciesComponent implements OnInit {
  private contractService = inject(FlightInsuranceContractService);
  private walletService = inject(WalletService);
  private router = inject(Router);

  policies: any[] = [];
  filteredPolicies: any[] = [];
  isLoading = true;

  // Filter State
  searchQuery: string = '';
  selectedType: string = 'All';
  selectedStatus: string = 'All';

  async ngOnInit() {
    await this.walletService.initialized;
    if (!this.walletService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    try {
      this.policies = await this.contractService.getUserPolicies();
      this.applyFilters();
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    this.filteredPolicies = this.policies.filter(policy => {
      // 1. Text Search (Check ID, Flight Number, Origin/Destination)
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = q === '' || 
        String(policy.policyId).includes(q) ||
        (policy.flightNumber && policy.flightNumber.toLowerCase().includes(q)) ||
        (policy.origin && policy.origin.toLowerCase().includes(q)) ||
        (policy.destination && policy.destination.toLowerCase().includes(q));

      // 2. Type Filter
      const matchType = this.selectedType === 'All' || policy.type === this.selectedType;

      // 3. Status Filter (Map string labels back to domain logic)
      let matchStatus = true;
      if (this.selectedStatus !== 'All') {
        const policyStatusText = this.getStatusText(policy.status);
        if (this.selectedStatus === 'Concluded') {
           // Policy is explicitly concluded
           matchStatus = (policy.claimed && policy.payoutAmount === "0.0");
        } else if (this.selectedStatus === 'Payout Distributed') {
           matchStatus = Number(policy.payoutAmount) > 0;
        } else {
           matchStatus = policyStatusText === this.selectedStatus;
        }
      }

      return matchSearch && matchType && matchStatus;
    });
  }

  getStatusText(status: number): string {
    switch (status) {
      case 0: return 'Scheduled';
      case 1: return 'On Time';
      case 2: return 'Delayed';
      case 3: return 'Cancelled';
      case 4: return 'Diverted';
      default: return 'Unknown';
    }
  }

  getStatusColor(status: number): string {
    switch (status) {
      case 0: return 'default'; // Unknown/Scheduled
      case 1: return 'success'; // OnTime
      case 2: return 'warning'; // Delayed
      case 3: return 'error'; // Cancelled
      case 4: return 'error'; // Diverted
      default: return 'default';
    }
  }
}
