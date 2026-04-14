import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { FlightInsuranceAdminAirlineModel } from '../insurance-config/insurance-config.models';
import { InsuranceConfigService } from '../insurance-config/insurance-config.service';

@Component({
  selector: 'app-insurance-airlines-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzButtonModule, NzCardModule, NzInputModule, NzTableModule],
  templateUrl: './insurance-airlines.html',
  styleUrl: './insurance-airlines.scss'
})
export class InsuranceAirlinesPage {
  private readonly service = inject(InsuranceConfigService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly items = signal<FlightInsuranceAdminAirlineModel[]>([]);
  readonly total = signal(0);
  readonly pageSizeOptions = [10, 20, 50, 100];
  pageIndex = 1;
  pageSize = 10;
  search = '';

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await this.service.listAirlines(this.pageIndex - 1, this.pageSize, this.search);
      this.items.set(response.items);
      this.total.set(response.totalElements);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onQueryParamsChange(params: { pageIndex: number; pageSize: number }): Promise<void> {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    await this.load();
  }

  async applySearch(): Promise<void> {
    this.pageIndex = 1;
    await this.load();
  }

  openAirline(airlineId: number): void {
    void this.router.navigate(['/insurance-config/flight-insurance/airlines', airlineId]);
  }
}
