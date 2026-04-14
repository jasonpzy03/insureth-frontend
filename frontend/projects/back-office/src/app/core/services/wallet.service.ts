import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private platformId = inject(PLATFORM_ID);
  private provider: BrowserProvider | null = null;
  private switchingNetwork = false;

  readonly address = signal<string | null>(null);
  readonly isConnected = signal<boolean>(false);
  readonly isConnecting = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly isInitialized = signal<boolean>(false);

  private initializedResolve: (() => void) | null = null;
  readonly initialized = new Promise<void>((resolve) => {
    this.initializedResolve = resolve;
  });

  private readonly targetChainId = '0x7a69';

  constructor() {
    this.init();
  }

  private async init() {
    if (isPlatformBrowser(this.platformId)) {
      await this.checkConnection();
      this.setupEventListeners();
    }
    this.isInitialized.set(true);
    this.initializedResolve?.();
  }

  private async checkConnection() {
    if (!this.isMetaMaskInstalled()) {
      return;
    }

    const eth = (window as any).ethereum;
    this.provider = new BrowserProvider(eth);
    try {
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        this.address.set(accounts[0]);
        this.isConnected.set(true);
      }
    } catch (err) {
      console.error('Failed to check wallet connection', err);
    }
  }

  private setupEventListeners() {
    if (!this.isMetaMaskInstalled()) {
      return;
    }

    const eth = (window as any).ethereum;
    eth.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length > 0) {
        this.address.set(accounts[0]);
        this.isConnected.set(true);
      } else {
        this.disconnect();
      }
    });

    eth.on('chainChanged', () => {
      if (!this.switchingNetwork) {
        window.location.reload();
      }
    });
  }

  isMetaMaskInstalled(): boolean {
    const eth = (window as any).ethereum;
    return !!(eth && eth.isMetaMask);
  }

  async switchToTargetNetwork(eth: any): Promise<void> {
    this.switchingNetwork = true;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.targetChainId }]
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: this.targetChainId,
            chainName: 'Hardhat Localhost',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['http://127.0.0.1:8545'],
            blockExplorerUrls: []
          }]
        });
      } else {
        this.switchingNetwork = false;
        throw switchError;
      }
    }
    this.switchingNetwork = false;
  }

  async connect(): Promise<string | null> {
    if (!this.isMetaMaskInstalled()) {
      this.error.set('MetaMask is not installed');
      return null;
    }

    this.isConnecting.set(true);
    this.error.set(null);

    try {
      const eth = (window as any).ethereum;
      const chainId = await eth.request({ method: 'eth_chainId' });
      if (chainId !== this.targetChainId) {
        await this.switchToTargetNetwork(eth);
        return null;
      }

      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      this.provider = new BrowserProvider(eth);
      this.address.set(address);
      this.isConnected.set(true);
      return address;
    } catch (err: any) {
      if (err.code === 4001 || err.code === 'ACTION_REJECTED' || err.info?.error?.code === 4001) {
        this.error.set('Wallet connection rejected.');
      } else {
        this.error.set(err.message || 'Failed to connect wallet');
      }
      this.disconnect();
      return null;
    } finally {
      this.isConnecting.set(false);
    }
  }

  async disconnect(): Promise<void> {
    this.address.set(null);
    this.isConnected.set(false);
    try {
      if (this.isMetaMaskInstalled()) {
        const eth = (window as any).ethereum;
        await eth.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }]
        });
      }
    } catch (err) {
      console.error('Failed to revoke wallet permissions', err);
    }
  }

  async getSigner(): Promise<JsonRpcSigner | null> {
    if (!this.provider || !this.isConnected()) {
      return null;
    }
    return this.provider.getSigner();
  }

  getProvider(): BrowserProvider | null {
    return this.provider;
  }
}
