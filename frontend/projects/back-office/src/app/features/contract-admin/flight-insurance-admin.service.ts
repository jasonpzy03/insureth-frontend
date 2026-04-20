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
  postDeparturePurchaseGracePeriodSeconds: number;
  platformFeePercentage: number;
  platformFeeFlatAmountEth: number;
  platformFeeMode: number;
  minDelayPayoutThresholdMinutes: number;
  maxDelayPayoutThresholdMinutes: number;
  minDelayPayoutMultiplierBps: number;
  maxDelayPayoutMultiplierBps: number;
  cancellationPayoutMultiplierBps: number;
};

export type BackofficePolicyRecord = {
  policyId: number;
  holder: string;
  riskKey: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: number;
  purchaseTimestamp: number | null;
  premiumWei: bigint;
  payoutAmountWei: bigint;
  active: boolean;
  claimed: boolean;
  resolved: boolean;
  exists: boolean;
  oracleRequested: boolean;
  statusInt: number;
  statusLabel: string;
  delayMinutes: number;
  policiesSharingRisk: number;
};

@Injectable({
  providedIn: 'root'
})
export class FlightInsuranceAdminService {
  private readonly walletService = inject(WalletService);

  private getStatusLabel(statusInt: number): string {
    switch (statusInt) {
      case 1:
        return 'On Time';
      case 2:
        return 'Delayed';
      case 3:
        return 'Cancelled';
      default:
        return 'Awaiting Verification';
    }
  }

  private getReadContract(): Contract {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet provider is not available');
    }

    return new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ADMIN_ABI, provider);
  }

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
    const contract = this.getReadContract();
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
      postDeparturePurchaseGracePeriod,
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
      contract['postDeparturePurchaseGracePeriod'](),
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
      postDeparturePurchaseGracePeriodSeconds: Number(postDeparturePurchaseGracePeriod),
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

  async listPolicies(): Promise<BackofficePolicyRecord[]> {
    const contract = this.getReadContract();
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet provider is not available');
    }

    const events = await contract.queryFilter(contract.filters['PolicyPurchased'](), 0, 'latest');
    if (!events.length) {
      return [];
    }

    const blockTimestampCache = new Map<number, Promise<number | null>>();
    const riskCache = new Map<string, Promise<any>>();

    const readBlockTimestamp = (blockNumber: number): Promise<number | null> => {
      const existing = blockTimestampCache.get(blockNumber);
      if (existing) {
        return existing;
      }

      const pending = provider.getBlock(blockNumber)
        .then(block => block ? Number(block.timestamp) : null);
      blockTimestampCache.set(blockNumber, pending);
      return pending;
    };

    const readRisk = (riskKey: string): Promise<any> => {
      const existing = riskCache.get(riskKey);
      if (existing) {
        return existing;
      }

      const pending = contract['risks'](riskKey);
      riskCache.set(riskKey, pending);
      return pending;
    };

    const records = await Promise.all(events.map(async (event: any) => {
      const args = event.args;
      if (!args) {
        return null;
      }

      const policyId = Number(args.policyId);
      const riskKey = String(args.riskKey);

      const [policy, risk, purchaseTimestamp] = await Promise.all([
        contract['policies'](BigInt(policyId)),
        readRisk(riskKey),
        readBlockTimestamp(event.blockNumber)
      ]);

      const [
        holder,
        policyRiskKey,
        premiumWei,
        payoutAmountWei,
        active,
        claimed
      ] = policy;

      const [
        flightNumber,
        origin,
        destination,
        departureTime,
        status,
        delayMinutes,
        oracleRequested,
        resolved,
        exists
      ] = risk;

      return {
        policyId,
        holder: String(holder),
        riskKey: String(policyRiskKey || riskKey),
        flightNumber: String(flightNumber),
        origin: String(origin),
        destination: String(destination),
        departureTime: Number(departureTime),
        purchaseTimestamp,
        premiumWei: BigInt(premiumWei),
        payoutAmountWei: BigInt(payoutAmountWei),
        active: Boolean(active),
        claimed: Boolean(claimed),
        resolved: Boolean(resolved),
        exists: Boolean(exists),
        oracleRequested: Boolean(oracleRequested),
        statusInt: Number(status),
        statusLabel: this.getStatusLabel(Number(status)),
        delayMinutes: Number(delayMinutes),
        policiesSharingRisk: 0
      } satisfies BackofficePolicyRecord;
    }));

    const filteredRecords = records
      .filter((record): record is BackofficePolicyRecord => record !== null)
      .sort((left, right) => right.policyId - left.policyId);

    const riskCounts = filteredRecords.reduce((accumulator, record) => {
      accumulator.set(record.riskKey, (accumulator.get(record.riskKey) ?? 0) + 1);
      return accumulator;
    }, new Map<string, number>());

    return filteredRecords.map(record => ({
      ...record,
      policiesSharingRisk: riskCounts.get(record.riskKey) ?? 1
    }));
  }

  async setChainlinkConfig(
    sourceCode: string,
    subscriptionId: number,
    gasLimit: number,
    onTransactionSubmitted?: (hash: string) => void | Promise<void>
  ) {
    return this.sendTransaction(
      'setChainlinkConfig',
      [sourceCode, BigInt(subscriptionId), gasLimit],
      onTransactionSubmitted
    );
  }

  async setVerificationBuffer(seconds: number) {
    return this.sendTransaction('setVerificationBuffer', [BigInt(seconds)]);
  }

  async setAdminControls(payload: {
    verificationBufferSeconds: number;
    minPurchaseLeadTimeSeconds: number;
    maxPurchaseLeadTimeSeconds: number;
    postDeparturePurchaseGracePeriodSeconds: number;
    platformFeeMode: number;
    platformFeePercentage: number;
    platformFeeFlatAmountEth: number;
    minDelayPayoutThresholdMinutes: number;
    maxDelayPayoutThresholdMinutes: number;
    minDelayPayoutMultiplierBps: number;
    maxDelayPayoutMultiplierBps: number;
    cancellationPayoutMultiplierBps: number;
  }, onTransactionSubmitted?: (hash: string) => void | Promise<void>) {
    return this.sendTransaction('setAdminControls', [
      BigInt(payload.verificationBufferSeconds),
      BigInt(payload.minPurchaseLeadTimeSeconds),
      BigInt(payload.maxPurchaseLeadTimeSeconds),
      BigInt(payload.postDeparturePurchaseGracePeriodSeconds),
      payload.platformFeeMode,
      BigInt(payload.platformFeePercentage),
      parseEther(payload.platformFeeFlatAmountEth.toFixed(6)),
      BigInt(payload.minDelayPayoutThresholdMinutes),
      BigInt(payload.maxDelayPayoutThresholdMinutes),
      BigInt(payload.minDelayPayoutMultiplierBps),
      BigInt(payload.maxDelayPayoutMultiplierBps),
      BigInt(payload.cancellationPayoutMultiplierBps)
    ], onTransactionSubmitted);
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

  async requestOracleVerification(
    riskKey: string,
    onTransactionSubmitted?: (hash: string) => void | Promise<void>
  ) {
    return this.sendTransaction(
      'requestOracleVerification',
      [riskKey],
      onTransactionSubmitted
    );
  }

  async resetOracleRequest(
    riskKey: string,
    onTransactionSubmitted?: (hash: string) => void | Promise<void>
  ) {
    return this.sendTransaction(
      'resetOracleRequest',
      [riskKey],
      onTransactionSubmitted
    );
  }

  async simulateFlightResult(
    riskKey: string,
    statusInt: number,
    delayMinutes: number,
    onTransactionSubmitted?: (hash: string) => void | Promise<void>
  ) {
    return this.sendTransaction(
      'simulateFlightResult',
      [riskKey, BigInt(statusInt), BigInt(delayMinutes)],
      onTransactionSubmitted
    );
  }

  private async sendTransaction(
    method: string,
    args: unknown[],
    onTransactionSubmitted?: (hash: string) => void | Promise<void>
  ) {
    const signer = await this.walletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected or signer not available');
    }

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ADMIN_ABI, signer);

    try {
      await this.preflightTransaction(contract, method, args);
      const tx = await contract[method](...args);
      await onTransactionSubmitted?.(tx.hash);
      return tx.wait();
    } catch (error: any) {
      console.error(`${method} failed:`, error);
      throw this.normalizeError(error);
    }
  }
}
