import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { AuditTrailItem } from '../audit-trail/audit-trail.models';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

@Component({
  selector: 'app-audit-insurance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzCardModule, NzInputModule, NzTableModule],
  templateUrl: './audit-insurance.html',
  styleUrl: './audit-insurance.scss'
})
export class AuditInsurancePage {
  private readonly service = inject(AuditTrailService);

  readonly isLoading = signal(false);
  readonly items = signal<AuditTrailItem[]>([]);
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
      const response = await this.service.listInsuranceAuditTrail(this.pageIndex - 1, this.pageSize, this.search);
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
}
