import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { FlightInsuranceLandingPage } from './flight-insurance/pages/flight-insurance-landing/flight-insurance-landing';
import { PurchasePage } from './flight-insurance/pages/purchase/purchase';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { EthAmountPipe } from '../../core/pipes/eth-amount.pipe';

@NgModule({
  declarations: [
    FlightInsuranceLandingPage,
    PurchasePage,
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzIconModule,
    NzCardModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzSkeletonModule,
    NzTagModule,
    NzSpinModule,
    NzModalModule,
    EthAmountPipe,
  ],
  exports: [
    FlightInsuranceLandingPage,
    PurchasePage,
  ],
})
export class InsuranceModule { }
