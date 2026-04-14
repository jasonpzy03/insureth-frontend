import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { FlightInsuranceContractService } from '../../insurance/flight-insurance/services/flight-insurance-contract.service';
import { WalletService } from '../../../core/services/wallet.service';

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, NzCardModule, NzTimelineModule, NzIconModule, NzTagModule, NzSkeletonModule],
  templateUrl: './policy-detail.html',
  styleUrl: './policy-detail.scss' // Create an empty scss if needed
})
export class PolicyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contractService = inject(FlightInsuranceContractService);
  private walletService = inject(WalletService);

  policyId: string | null = null;
  policyDetails: any = null;
  isLoading = true;
  error: string | null = null;

  async ngOnInit() {
    this.policyId = this.route.snapshot.paramMap.get('id');
    
    if (!this.policyId) {
      this.router.navigate(['/policies']);
      return;
    }

    try {
      this.policyDetails = await this.contractService.getPolicyTransactions(this.policyId);
    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'Failed to load policy tracking details.';
    } finally {
      this.isLoading = false;
    }
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
