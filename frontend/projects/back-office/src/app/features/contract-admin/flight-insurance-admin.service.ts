import { Injectable, inject } from '@angular/core';
import { Contract, formatEther, parseEther } from 'ethers';
import { WalletService } from '../../core/services/wallet.service';
import { FLIGHT_INSURANCE_ADMIN_ABI, FLIGHT_INSURANCE_CONTRACT_ADDRESS } from './flight-insurance-admin.constants';

export type FlightInsuranceAdminSnapshot = {
  owner: string;
  connectedWallet: string | null;
  isOwner: boolean;
  donId: string;
  sourceCode: string;
  subscriptionId: number;
  gasLimit: number;
  verificationBufferSeconds: number;
  minPurchaseLeadTimeSeconds: number;
  maxPurchaseLeadTimeSeconds: number;
  platformFeePercentage: number;
  platformFeeFlatAmountEth: number;
  platformFeeMode: number;
  minDelayPayoutThresholdMinutes: number;
  maxDelayPayoutThresholdMinutes: number;
  minDelayPayoutMultiplierBps: number;
  maxDelayPayoutMultiplierBps: number;
  cancellationPayoutMultiplierBps: number;
};

@Injectable({
  providedIn: 'root'
})
export class FlightInsuranceAdminService {
  private readonly walletService = inject(WalletService);

  private extractErrorMessage(error: any): string | null {
    if (!error) {
      return null;
    }

    const candidates = [
      error?.reason,
      error?.revert?.args?.[0],
      error?.shortMessage,
      error?.info?.error?.message,
      error?.info?.payload?.params?.[0]?.data?.message,
      error?.error?.message,
      error?.error?.data?.message,
      error?.data?.message,
      error?.message
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate
          .replace(/^execution reverted:\s*/i, '')
          .replace(/^VM Exception while processing transaction: reverted with reason string\s*/i, '')
          .replace(/^VM Exception while processing transaction:\s*/i, '')
          .trim();
      }
    }

    return null;
  }

  private normalizeError(error: any): Error {
    const reason = this.extractErrorMessage(error);
    return new Error(reason || 'Transaction failed');
  }

  private async preflightTransaction(
    contract: Contract,
    method: string,
    args: unknown[]
  ): Promise<void> {
    try {
      const fn = contract.getFunction(method);
      const transaction = await fn.populateTransaction(...args);
      const runner: any = contract.runner;

      if (runner?.getAddress && !transaction.from) {
        transaction.from = await runner.getAddress();
      }

      if (runner?.call) {
        await runner.call(transaction);
      } else if (runner?.provider?.call) {
        await runner.provider.call(transaction);
      } else {
        await fn.staticCall(...args);
      }
    } catch (error: any) {
      console.error(`${method} preflight failed:`, error);
      throw this.normalizeError(error);
    }
  }

  async getSnapshot(): Promise<FlightInsuranceAdminSnapshot> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet provider is not available');
    }

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ADMIN_ABI, provider);
    const connectedWallet = this.walletService.address();

    const [
      owner,
      donId,
      sourceCode,
      subscriptionId,
      gasLimit,
      verificationBuffer,
      minPurchaseLeadTime,
      maxPurchaseLeadTime,
      platformFeePercentage,
      platformFeeFlatAmount,
      platformFeeMode,
      payoutConfiguration
    ] = await Promise.all([
      contract['owner'](),
      contract['donId'](),
      contract['sourceCode'](),
      contract['subscriptionId'](),
      contract['gasLimit'](),
      contract['verificationBuffer'](),
      contract['minPurchaseLeadTime'](),
      contract['maxPurchaseLeadTime'](),
      contract['platformFeePercentage'](),
      contract['platformFeeFlatAmount'](),
      contract['platformFeeMode'](),
      contract['getPayoutConfiguration']()
    ]);

    const [
      minDelayPayoutThresholdMinutes,
      maxDelayPayoutThresholdMinutes,
      minDelayPayoutMultiplierBps,
      maxDelayPayoutMultiplierBps,
      cancellationPayoutMultiplierBps
    ] = payoutConfiguration;

    return {
      owner,
      connectedWallet,
      isOwner: !!connectedWallet && owner.toLowerCase() === connectedWallet.toLowerCase(),
      donId,
      sourceCode,
      subscriptionId: Number(subscriptionId),
      gasLimit: Number(gasLimit),
      verificationBufferSeconds: Number(verificationBuffer),
      minPurchaseLeadTimeSeconds: Number(minPurchaseLeadTime),
      maxPurchaseLeadTimeSeconds: Number(maxPurchaseLeadTime),
      platformFeePercentage: Number(platformFeePercentage),
      platformFeeFlatAmountEth: Number(formatEther(platformFeeFlatAmount)),
      platformFeeMode: Number(platformFeeMode),
      minDelayPayoutThresholdMinutes: Number(minDelayPayoutThresholdMinutes),
      maxDelayPayoutThresholdMinutes: Number(maxDelayPayoutThresholdMinutes),
      minDelayPayoutMultiplierBps: Number(minDelayPayoutMultiplierBps),
      maxDelayPayoutMultiplierBps: Number(maxDelayPayoutMultiplierBps),
      cancellationPayoutMultiplierBps: Number(cancellationPayoutMultiplierBps)
    };
  }

  async setChainlinkConfig(sourceCode: string, subscriptionId: number, gasLimit: number) {
    return this.sendTransaction('setChainlinkConfig', [sourceCode, BigInt(subscriptionId), gasLimit]);
  }

  async setVerificationBuffer(seconds: number) {
    return this.sendTransaction('setVerificationBuffer', [BigInt(seconds)]);
  }

  async setAdminControls(payload: {
    verificationBufferSeconds: number;
    minPurchaseLeadTimeSeconds: number;
    maxPurchaseLeadTimeSeconds: number;
    platformFeeMode: number;
    platformFeePercentage: number;
    platformFeeFlatAmountEth: number;
    minDelayPayoutThresholdMinutes: number;
    maxDelayPayoutThresholdMinutes: number;
    minDelayPayoutMultiplierBps: number;
    maxDelayPayoutMultiplierBps: number;
    cancellationPayoutMultiplierBps: number;
  }) {
    return this.sendTransaction('setAdminControls', [
      BigInt(payload.verificationBufferSeconds),
      BigInt(payload.minPurchaseLeadTimeSeconds),
      BigInt(payload.maxPurchaseLeadTimeSeconds),
      payload.platformFeeMode,
      BigInt(payload.platformFeePercentage),
      parseEther(payload.platformFeeFlatAmountEth.toFixed(6)),
      BigInt(payload.minDelayPayoutThresholdMinutes),
      BigInt(payload.maxDelayPayoutThresholdMinutes),
      BigInt(payload.minDelayPayoutMultiplierBps),
      BigInt(payload.maxDelayPayoutMultiplierBps),
      BigInt(payload.cancellationPayoutMultiplierBps)
    ]);
  }

  async setPurchaseWindow(minLeadTimeSeconds: number, maxLeadTimeSeconds: number) {
    return this.sendTransaction('setPurchaseWindow', [BigInt(minLeadTimeSeconds), BigInt(maxLeadTimeSeconds)]);
  }

  async setPlatformFeePercentage(feePercentage: number) {
    return this.sendTransaction('setPlatformFeePercentage', [feePercentage]);
  }

  async setPlatformFeeFlatAmount(flatFeeEth: number) {
    return this.sendTransaction('setPlatformFeeFlatAmount', [parseEther(flatFeeEth.toFixed(6))]);
  }

  async setPlatformFeeMode(feeMode: number) {
    return this.sendTransaction('setPlatformFeeMode', [feeMode]);
  }

  async setDelayPayoutCurve(
    minDelayThresholdMinutes: number,
    maxDelayThresholdMinutes: number,
    minDelayMultiplierBps: number,
    maxDelayMultiplierBps: number
  ) {
    return this.sendTransaction('setDelayPayoutCurve', [
      BigInt(minDelayThresholdMinutes),
      BigInt(maxDelayThresholdMinutes),
      BigInt(minDelayMultiplierBps),
      BigInt(maxDelayMultiplierBps)
    ]);
  }

  async setCancellationPayoutMultiplier(cancellationMultiplierBps: number) {
    return this.sendTransaction('setCancellationPayoutMultiplier', [
      BigInt(cancellationMultiplierBps)
    ]);
  }

  async simulateFlightResult(riskKey: string, statusInt: number, delayMinutes: number) {
    return this.sendTransaction('simulateFlightResult', [riskKey, statusInt, delayMinutes]);
  }

  async computeRiskKey(
    flightNumber: string,
    origin: string,
    destination: string,
    departureTime: number
  ): Promise<string> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet provider is not available');
    }

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ADMIN_ABI, provider);
    return contract['getRiskKey'](flightNumber, origin, destination, BigInt(departureTime));
  }

  private async sendTransaction(method: string, args: unknown[]) {
    const signer = await this.walletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected or signer not available');
    }

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ADMIN_ABI, signer);

    try {
      await this.preflightTransaction(contract, method, args);
      const tx = await contract[method](...args);
      return tx.wait();
    } catch (error: any) {
      console.error(`${method} failed:`, error);
      throw this.normalizeError(error);
    }
  }
}
