import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ethAmount',
  standalone: true
})
export class EthAmountPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    const parsedValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsedValue)) {
      return '--';
    }

    const absoluteValue = Math.abs(parsedValue);

    let minimumFractionDigits = 2;
    let maximumFractionDigits = 4;

    if (absoluteValue >= 1) {
      minimumFractionDigits = 2;
      maximumFractionDigits = 4;
    } else if (absoluteValue >= 0.01) {
      minimumFractionDigits = 4;
      maximumFractionDigits = 6;
    } else {
      minimumFractionDigits = 6;
      maximumFractionDigits = 8;
    }

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(parsedValue);
  }
}
