import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FlightInsurancePage } from './pages/flight-insurance/flight-insurance';
import {NzCardComponent} from 'ng-zorro-antd/card';

@NgModule({
    declarations: [FlightInsurancePage],
  imports: [
    CommonModule,
    RouterLink,
    NzIconModule,
    NzCardComponent
  ],
    providers: [],
    exports: [FlightInsurancePage],
})
export class InsuranceModule { }
