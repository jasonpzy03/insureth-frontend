import { Injectable, inject } from '@angular/core';
import { WalletService } from '../../../../core/services/wallet.service';
import { Contract, parseEther, formatEther } from 'ethers';
import { FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI } from '../constants/flight-insurance-contract.constants';

@Injectable({
  providedIn: 'root'
})
export class FlightInsuranceContractService {
  private walletService = inject(WalletService);

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

  async getPayoutConfiguration(): Promise<{
    minDelayThresholdMinutes: number;
    maxDelayThresholdMinutes: number;
    minDelayMultiplierPercent: number;
    maxDelayMultiplierPercent: number;
    cancellationMultiplierPercent: number;
  }> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet provider is not available');
    }

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, provider);
    const [
      minDelayThresholdMinutes,
      maxDelayThresholdMinutes,
      minDelayMultiplierBps,
      maxDelayMultiplierBps,
      cancellationMultiplierBps
    ] = await contract['getPayoutConfiguration']();

    return {
      minDelayThresholdMinutes: Number(minDelayThresholdMinutes),
      maxDelayThresholdMinutes: Number(maxDelayThresholdMinutes),
      minDelayMultiplierPercent: Number(minDelayMultiplierBps) / 100,
      maxDelayMultiplierPercent: Number(maxDelayMultiplierBps) / 100,
      cancellationMultiplierPercent: Number(cancellationMultiplierBps) / 100
    };
  }

  async getPayoutPreview(grossPremiumEth: string): Promise<{
    minDelayThresholdMinutes: number;
    exampleDelayMinutes: number;
    maxDelayThresholdMinutes: number;
    minDelayPayoutEth: number;
    exampleDelayPayoutEth: number;
    maxDelayPayoutEth: number;
    cancellationPayoutEth: number;
  }> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet provider is not available');
    }

      const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, provider);
      const breakdown = await this.getPremiumBreakdown(grossPremiumEth);
      const config = await this.getPayoutConfiguration();
      const netPremiumWei = parseEther(breakdown.netPremiumEth.toFixed(6));
      const exampleDelayMinutes = config.minDelayThresholdMinutes <= 120 && config.maxDelayThresholdMinutes >= 120
        ? 120
        : Math.round((config.minDelayThresholdMinutes + config.maxDelayThresholdMinutes) / 2);

      const [
        minDelayPayoutWei,
        exampleDelayPayoutWei,
        maxDelayPayoutWei,
        cancellationPayoutWei
      ] = await Promise.all([
        contract['calculatePayout'](netPremiumWei, 2, BigInt(config.minDelayThresholdMinutes)),
        contract['calculatePayout'](netPremiumWei, 2, BigInt(exampleDelayMinutes)),
        contract['calculatePayout'](netPremiumWei, 2, BigInt(config.maxDelayThresholdMinutes)),
        contract['calculatePayout'](netPremiumWei, 3, 0)
      ]);

      return {
        minDelayThresholdMinutes: config.minDelayThresholdMinutes,
        exampleDelayMinutes,
        maxDelayThresholdMinutes: config.maxDelayThresholdMinutes,
        minDelayPayoutEth: Number(formatEther(minDelayPayoutWei)),
        exampleDelayPayoutEth: Number(formatEther(exampleDelayPayoutWei)),
        maxDelayPayoutEth: Number(formatEther(maxDelayPayoutWei)),
        cancellationPayoutEth: Number(formatEther(cancellationPayoutWei))
      };
  }

  async getPremiumBreakdown(grossPremiumEth: string): Promise<{
    grossPremiumEth: number;
    feeAmountEth: number;
    netPremiumEth: number;
    feeMode: 'PERCENTAGE' | 'FLAT_AMOUNT';
    configuredFeeValue: number;
  }> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet provider is not available');
    }

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, provider);
    const grossPremiumWei = parseEther(grossPremiumEth);

    const [feeAmount, netPremium, feeMode, feeValue] = await contract['getPremiumBreakdown'](grossPremiumWei);

    return {
      grossPremiumEth: Number(grossPremiumEth),
      feeAmountEth: Number(formatEther(feeAmount)),
      netPremiumEth: Number(formatEther(netPremium)),
      feeMode: Number(feeMode) === 1 ? 'FLAT_AMOUNT' : 'PERCENTAGE',
      configuredFeeValue: Number(feeMode) === 1 ? Number(formatEther(feeValue)) : Number(feeValue)
    };
  }

  private async validateBuyPolicyPreconditions(
    contract: Contract,
    signer: any,
    flightNumber: string,
    origin: string,
    destination: string,
    departureTime: number,
    premiumInWei: bigint
  ): Promise<void> {
    if (!flightNumber?.trim()) {
      throw new Error('Flight number is required');
    }

    const [
      minPurchaseLeadTime,
      maxPurchaseLeadTime,
      grossBreakdown,
      freeLiquidity,
      walletAddress,
      walletBalance
    ] = await Promise.all([
      contract['minPurchaseLeadTime'](),
      contract['maxPurchaseLeadTime'](),
      contract['getPremiumBreakdown'](premiumInWei),
      contract['totalFreeLiquidity'](),
      signer.getAddress(),
      signer.provider.getBalance(await signer.getAddress())
    ]);

    const now = Math.floor(Date.now() / 1000);
    const minLeadSeconds = Number(minPurchaseLeadTime);
    const maxLeadSeconds = Number(maxPurchaseLeadTime);

    if (departureTime <= now + minLeadSeconds) {
      throw new Error('Too late to buy');
    }

    if (departureTime > now + maxLeadSeconds) {
      throw new Error('Flight too far in future');
    }

    const feeAmount = grossBreakdown[0] as bigint;
    const netPremium = grossBreakdown[1] as bigint;
    const maxPayout = await contract['calculateMaximumPayout'](netPremium);
    const additionalReserveNeeded = maxPayout > netPremium ? maxPayout - netPremium : 0n;

    if (freeLiquidity < additionalReserveNeeded) {
      throw new Error('Insufficient free liquidity');
    }

    if (walletBalance < premiumInWei) {
      throw new Error('Insufficient wallet balance for premium payment');
    }

    const estimatedGas = await signer.provider.estimateGas({
      from: walletAddress,
      to: await contract.getAddress(),
      data: (await contract.getFunction('buyPolicy').populateTransaction(
        flightNumber,
        origin,
        destination,
        departureTime,
        { value: premiumInWei }
      )).data,
      value: premiumInWei
    }).catch(() => null);

    if (estimatedGas) {
      const feeData = await signer.provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
      const gasLimit = typeof estimatedGas === 'bigint' ? estimatedGas : BigInt(estimatedGas);
      const totalNeeded = premiumInWei + (gasLimit * gasPrice);
      if (walletBalance < totalNeeded) {
        throw new Error('Insufficient wallet balance for premium payment and gas');
      }
    }
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

  /**
   * Triggers the smart contract buyPolicy function.
   */
  async buyPolicy(flightNumber: string, origin: string, destination: string, departureTime: number, premiumInEth: string): Promise<any> {
    const signer = await this.walletService.getSigner();

    if (!signer) {
      throw new Error('Wallet not connected or signer not available');
    }

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, signer);
    const premiumInWei = parseEther(premiumInEth);

    console.log(`Sending tx to contract: ${FLIGHT_INSURANCE_CONTRACT_ADDRESS}`);

    await this.validateBuyPolicyPreconditions(
      contract,
      signer,
      flightNumber,
      origin,
      destination,
      departureTime,
      premiumInWei
    );

    await this.preflightTransaction(contract, 'buyPolicy', [
      flightNumber,
      origin,
      destination,
      departureTime,
      { value: premiumInWei }
    ]);

    let tx;
    try {
      tx = await contract['buyPolicy'](flightNumber, origin, destination, departureTime, {
        value: premiumInWei
      });
    } catch (error: any) {
      console.error('buyPolicy failed:', error);
      throw this.normalizeError(error);
    }

    console.log('Transaction sent! Hash:', tx.hash);

    // Wait for the transaction to be confirmed
    const receipt = await tx.wait();
    console.log('Transaction confirmed! Receipt:', receipt);

    return receipt;
  }

  /**
   * Fetches all policies purchased by the currently connected wallet
   */
  async getUserPolicies(): Promise<any[]> {
    const signer = await this.walletService.getSigner();
    if (!signer) return [];

    const address = await signer.getAddress();
    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, signer);

    // Using ethers 6 querying
    const filter = contract.filters['PolicyPurchased'](null, address);

    // Fetch logs from genesis block or wherever the contract was deployed.
    // For local dev we can just use 0 to 'latest'
    const events = await contract.queryFilter(filter, 0, 'latest');

    const policies = [];

    for (const event of events) {
      const args = (event as any).args;
      if (!args) continue;

      const policyId = args[0] || args.policyId;
      const riskKey = args[2] || args.riskKey;
      const premiumPaid = args[7] || args.premiumPaid;

      // Query the struct data directly from the public storage mapping
      const policyData = await contract['policies'](policyId);
      const riskData = await contract['risks'](riskKey);

      policies.push({
        policyId: policyId.toString(),
        flightNumber: riskData.flightNumber,
        origin: riskData.origin,
        destination: riskData.destination,
        departureTime: Number(riskData.departureTime) * 1000, // convert back to ms for JS Date
        premium: formatEther(policyData.premium),
        premiumPaid: formatEther(premiumPaid ?? policyData.premium),
        status: Number(riskData.status),
        active: policyData.active,
        claimed: policyData.claimed,
        payoutAmount: formatEther(policyData.payoutAmount),
        type: 'Flight Insurance'
      });
    }

    // Sort descending by departure time
    return policies.sort((a, b) => b.departureTime - a.departureTime);
  }

  /**
   * Fetches specific policy data and its blockchain transaction history
   */
  async getPolicyTransactions(policyIdStr: string): Promise<any> {
    const signer = await this.walletService.getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const address = await signer.getAddress();
    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, signer);

    const policyId = BigInt(policyIdStr);
    const policyData = await contract['policies'](policyId);

    // Safety check: is it this user's policy?
    if (policyData.holder.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Not authorized to view this policy');
    }

    const riskData = await contract['risks'](policyData.riskKey);

    // Get Purchase Event
    const purchaseFilter = contract.filters['PolicyPurchased'](policyId);
    const purchaseEvents = await contract.queryFilter(purchaseFilter, 0, 'latest');

    // Get Claim Event
    const claimFilter = contract.filters['AutoPayoutTriggered'](policyId);
    const claimEvents = await contract.queryFilter(claimFilter, 0, 'latest');

    const transactions = [];

    if (purchaseEvents.length > 0) {
      const purchaseTx = purchaseEvents[0];
      const block = await purchaseTx.getBlock();
      const purchaseArgs = (purchaseTx as any).args ?? [];
      transactions.push({
        type: 'PURCHASE',
        hash: purchaseTx.transactionHash,
        amount: formatEther(purchaseArgs[7] ?? purchaseArgs.premiumPaid ?? policyData.premium),
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        label: 'Premium Paid'
      });
    }

    if (claimEvents.length > 0) {
      const claimTx = claimEvents[0];
      const block = await claimTx.getBlock();
      const payload = (claimTx as any).args ? (claimTx as any).args[2] || (claimTx as any).args.payoutAmount : 0;

      transactions.push({
        type: 'PAYOUT',
        hash: claimTx.transactionHash,
        amount: formatEther(payload),
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        label: 'Payout Distributed'
      });
    }

    return {
      policy: {
        policyId: policyId.toString(),
        flightNumber: riskData.flightNumber,
        origin: riskData.origin,
        destination: riskData.destination,
        departureTime: Number(riskData.departureTime) * 1000,
        premium: formatEther(policyData.premium),
        premiumPaid: purchaseEvents.length > 0
          ? formatEther(((purchaseEvents[0] as any).args ?? [])[7] ?? ((purchaseEvents[0] as any).args ?? []).premiumPaid ?? policyData.premium)
          : formatEther(policyData.premium),
        status: Number(riskData.status),
        active: policyData.active,
        claimed: policyData.claimed,
        payoutAmount: formatEther(policyData.payoutAmount)
      },
      transactions: transactions.sort((a, b) => a.timestamp - b.timestamp)
    };
  }

  // ==========================================
  // LIQUIDITY POOL OPERATIONS
  // ==========================================

  /**
   * Investor: Provide liquidity to the pool
   */
  async provideLiquidity(amountInEth: string): Promise<any> {
    const signer = await this.walletService.getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, signer);
    const value = parseEther(amountInEth);

    await this.preflightTransaction(contract, 'provideLiquidity', [{ value }]);

    let tx;
    try {
      tx = await contract['provideLiquidity']({ value });
    } catch (error: any) {
      console.error('provideLiquidity failed:', error);
      throw this.normalizeError(error);
    }
    console.log('Provide liquidity tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Liquidity provision confirmed:', receipt);
    return receipt;
  }

  /**
   * Investor: Withdraw base capital from free liquidity
   */
  async withdrawCapital(amountInEth: string): Promise<any> {
    const signer = await this.walletService.getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, signer);
    const value = parseEther(amountInEth);

    await this.preflightTransaction(contract, 'withdrawCapital', [value]);

    let tx;
    try {
      tx = await contract['withdrawCapital'](value);
    } catch (error: any) {
      console.error('withdrawCapital failed:', error);
      throw this.normalizeError(error);
    }
    console.log('Withdraw capital tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Withdrawal confirmed:', receipt);
    return receipt;
  }

  /**
   * Reads share-based investor stats from the latest contract.
   * Value already includes profit/loss via share price, so there is no separate claim flow.
   */
  async getInvestorData(): Promise<{ shares: number; totalValue: number; maxWithdrawable: number }> {
    const signer = await this.walletService.getSigner();
    if (!signer) return { shares: 0, totalValue: 0, maxWithdrawable: 0 };

    const address = await signer.getAddress();
    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, signer);

    try {
      const data = await contract['getInvestorInfo'](address);
      const shares = Number(formatEther(data.shares));
      const totalValue = Number(formatEther(data.totalValue));
      const maxWithdrawable = Number(formatEther(data.withdrawableNow));
      return { shares, totalValue, maxWithdrawable };
    } catch (err) {
      console.error('Failed to read investor data:', err);
      return { shares: 0, totalValue: 0, maxWithdrawable: 0 };
    }
  }

  /**
   * Fetches global pool statistics from on-chain state
   */
  async getPoolStats(): Promise<{
    freeLiquidity: number;
    reservedLiquidity: number;
    totalLiquidityShares: number;
    totalPoolAssets: number;
  }> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      return { freeLiquidity: 0, reservedLiquidity: 0, totalLiquidityShares: 0, totalPoolAssets: 0 };
    }

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, provider);

    try {
      const [freeLiqWei, reservedWei, totalSharesWei, totalPoolAssetsWei] = await Promise.all([
        contract['totalFreeLiquidity'](),
        contract['totalReservedLiquidity'](),
        contract['totalLiquidityShares'](),
        contract['totalPoolAssets']()
      ]);

      return {
        freeLiquidity: Number(formatEther(freeLiqWei)),
        reservedLiquidity: Number(formatEther(reservedWei)),
        totalLiquidityShares: Number(formatEther(totalSharesWei)),
        totalPoolAssets: Number(formatEther(totalPoolAssetsWei))
      };
    } catch (err) {
      console.error('Failed to fetch pool stats:', err);
      return { freeLiquidity: 0, reservedLiquidity: 0, totalLiquidityShares: 0, totalPoolAssets: 0 };
    }
  }

  /**
   * Checks if the contract has enough free liquidity to cover a max potential payout
   */
  async canCoverPayout(premiumInEth: string): Promise<boolean> {
    const provider = this.walletService.getProvider();
    if (!provider) return false;

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, provider);
    const premiumInWei = parseEther(premiumInEth);

    try {
      const maxPayoutWei = await contract['calculateMaximumPayout'](premiumInWei);
      const freeLiqWei = await contract['totalFreeLiquidity']();
      return freeLiqWei >= maxPayoutWei;
    } catch (err) {
      console.error("Failed to check pool liquidity:", err);
      return false;
    }
  }

  /**
   * Fetches the total available funds locked in the smart contract
   */
  async getPoolBalance(): Promise<string> {
    const provider = this.walletService.getProvider();
    if (!provider) return '0.0';

    try {
      const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, provider);
      const balanceWei = await contract['totalPoolAssets']();
      return formatEther(balanceWei);
    } catch (err) {
      console.error("Failed to fetch pool balance:", err);
      return '0.0';
    }
  }

  async getInvestorTransactions(): Promise<Array<{
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'DONATION';
    hash: string;
    amount: string;
    sharesDelta?: string;
    timestamp: number;
    label: string;
  }>> {
    const signer = await this.walletService.getSigner();
    if (!signer) return [];

    const address = await signer.getAddress();
    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, signer);

    const [depositEvents, withdrawalEvents, donationEvents] = await Promise.all([
      contract.queryFilter(contract.filters['LiquidityProvided'](address), 0, 'latest'),
      contract.queryFilter(contract.filters['LiquidityWithdrawn'](address), 0, 'latest'),
      contract.queryFilter(contract.filters['PoolDonation'](address), 0, 'latest')
    ]);

    const allEvents = await Promise.all(
      [...depositEvents, ...withdrawalEvents, ...donationEvents].map(async (event: any) => {
        const block = await event.getBlock();
        const args = event.args ?? [];

        if (event.fragment?.name === 'LiquidityProvided') {
          return {
            type: 'DEPOSIT' as const,
            hash: event.transactionHash,
            amount: formatEther(args[1] ?? args.assets ?? 0),
            sharesDelta: formatEther(args[2] ?? args.sharesMinted ?? 0),
            timestamp: block ? block.timestamp * 1000 : Date.now(),
            label: 'Liquidity deposit'
          };
        }

        if (event.fragment?.name === 'LiquidityWithdrawn') {
          return {
            type: 'WITHDRAWAL' as const,
            hash: event.transactionHash,
            amount: formatEther(args[1] ?? args.assets ?? 0),
            sharesDelta: formatEther(args[2] ?? args.sharesBurned ?? 0),
            timestamp: block ? block.timestamp * 1000 : Date.now(),
            label: 'Liquidity withdrawal'
          };
        }

        return {
          type: 'DONATION' as const,
          hash: event.transactionHash,
          amount: formatEther(args[1] ?? args.amount ?? 0),
          timestamp: block ? block.timestamp * 1000 : Date.now(),
          label: 'Pool donation'
        };
      })
    );

    return allEvents.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getInvestorCapitalSummary(): Promise<{
    totalDeposited: number;
    totalWithdrawn: number;
    netCapitalInvested: number;
  }> {
    const transactions = await this.getInvestorTransactions();

    const totalDeposited = transactions
      .filter((tx) => tx.type === 'DEPOSIT')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalWithdrawn = transactions
      .filter((tx) => tx.type === 'WITHDRAWAL')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      totalDeposited: +totalDeposited.toFixed(6),
      totalWithdrawn: +totalWithdrawn.toFixed(6),
      netCapitalInvested: +(totalDeposited - totalWithdrawn).toFixed(6)
    };
  }

  async getPoolTransactions(): Promise<Array<{
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'DONATION' | 'PREMIUM' | 'PAYOUT';
    hash: string;
    amount: string;
    sharesDelta?: string;
    timestamp: number;
    label: string;
  }>> {
    const provider = this.walletService.getProvider();
    if (!provider) return [];

    const contract = new Contract(FLIGHT_INSURANCE_CONTRACT_ADDRESS, FLIGHT_INSURANCE_ABI, provider);

    const [depositEvents, withdrawalEvents, donationEvents, premiumEvents, payoutEvents] = await Promise.all([
      contract.queryFilter(contract.filters['LiquidityProvided'](), 0, 'latest'),
      contract.queryFilter(contract.filters['LiquidityWithdrawn'](), 0, 'latest'),
      contract.queryFilter(contract.filters['PoolDonation'](), 0, 'latest'),
      contract.queryFilter(contract.filters['PolicyPurchased'](), 0, 'latest'),
      contract.queryFilter(contract.filters['AutoPayoutTriggered'](), 0, 'latest')
    ]);

    const allEvents = await Promise.all(
      [
        ...depositEvents,
        ...withdrawalEvents,
        ...donationEvents,
        ...premiumEvents,
        ...payoutEvents
      ].map(async (event: any) => {
        const block = await event.getBlock();
        const args = event.args ?? [];

        if (event.fragment?.name === 'LiquidityProvided') {
          return {
            type: 'DEPOSIT' as const,
            hash: event.transactionHash,
            amount: formatEther(args[1] ?? args.assets ?? 0),
            sharesDelta: formatEther(args[2] ?? args.sharesMinted ?? 0),
            timestamp: block ? block.timestamp * 1000 : Date.now(),
            label: 'Liquidity deposit'
          };
        }

        if (event.fragment?.name === 'LiquidityWithdrawn') {
          return {
            type: 'WITHDRAWAL' as const,
            hash: event.transactionHash,
            amount: formatEther(args[1] ?? args.assets ?? 0),
            sharesDelta: formatEther(args[2] ?? args.sharesBurned ?? 0),
            timestamp: block ? block.timestamp * 1000 : Date.now(),
            label: 'Liquidity withdrawal'
          };
        }

        if (event.fragment?.name === 'PoolDonation') {
          return {
            type: 'DONATION' as const,
            hash: event.transactionHash,
            amount: formatEther(args[1] ?? args.amount ?? 0),
            timestamp: block ? block.timestamp * 1000 : Date.now(),
            label: 'Pool donation'
          };
        }

        if (event.fragment?.name === 'PolicyPurchased') {
          const policyId = args[0] ?? args.policyId;
          const policyData = await contract['policies'](policyId);
          return {
            type: 'PREMIUM' as const,
            hash: event.transactionHash,
            amount: formatEther(policyData.premium ?? 0),
            timestamp: block ? block.timestamp * 1000 : Date.now(),
            label: 'Policy premium collected'
          };
        }

        return {
          type: 'PAYOUT' as const,
          hash: event.transactionHash,
          amount: formatEther(args[2] ?? args.payoutAmount ?? 0),
          timestamp: block ? block.timestamp * 1000 : Date.now(),
          label: 'Payout distributed'
        };
      })
    );

    return allEvents.sort((a, b) => b.timestamp - a.timestamp);
  }
}
