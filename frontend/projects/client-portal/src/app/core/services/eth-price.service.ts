import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

type CoinGeckoSimplePriceResponse = {
  ethereum?: {
    usd?: number;
  };
};

@Injectable({
  providedIn: 'root'
})
export class EthPriceService {
  private http = inject(HttpClient);

  private cachedUsdPerEth: number | null | undefined;

  private readonly usdPerEth$ = this.http
    .get<CoinGeckoSimplePriceResponse>('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    .pipe(
      map((response) => response.ethereum?.usd ?? null),
      catchError((error) => {
        console.error('Failed to load ETH/USD price from CoinGecko', error);
        return of(null);
      }),
      shareReplay(1)
    );

  async ensureLoaded(): Promise<number | null> {
    if (this.cachedUsdPerEth !== undefined) {
      return this.cachedUsdPerEth;
    }

    this.cachedUsdPerEth = await firstValueFrom(this.usdPerEth$);
    return this.cachedUsdPerEth;
  }

  formatApproxUsd(amountEth: number | string | null | undefined): string {
    if (this.cachedUsdPerEth == null) {
      return '';
    }

    const parsedAmount =
      typeof amountEth === 'number'
        ? amountEth
        : Number(amountEth);

    if (!Number.isFinite(parsedAmount)) {
      return '';
    }

    const usdValue = parsedAmount * this.cachedUsdPerEth;
    const formattedUsd = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: usdValue >= 100 ? 0 : 2
    }).format(usdValue);

    return `(${formattedUsd} approx.)`;
  }
}
