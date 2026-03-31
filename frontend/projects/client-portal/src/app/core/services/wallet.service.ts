import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private platformId = inject(PLATFORM_ID);
  private provider: BrowserProvider | null = null;

  // Using Angular Signals for reactive state
  readonly address = signal<string | null>(null);
  readonly isConnected = signal<boolean>(false);
  readonly isAuthenticated = signal<boolean>(false);
  readonly isConnecting = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  // Track if initial check is complete
  readonly isInitialized = signal<boolean>(false);
  readonly isProfileComplete = signal<boolean>(false);
  private initializedResolve: (() => void) | null = null;
  readonly initialized = new Promise<void>((resolve) => {
    this.initializedResolve = resolve;
  });

  constructor() {
    this.init();
  }

  private async init() {
    // Only access browser APIs when running in the browser.
    // WalletService is root-scoped so it is also instantiated during SSR
    // for server-rendered routes (dashboard, profile, etc.).
    if (isPlatformBrowser(this.platformId)) {
      await this.checkConnection();
      this.setupEventListeners();
    }
    this.isInitialized.set(true);
    if (this.initializedResolve) this.initializedResolve();
  }

  private async checkConnection() {
    if (this.isMetaMaskInstalled()) {
      const eth = (window as any).ethereum;
      this.provider = new BrowserProvider(eth);
      try {
        const accounts = await eth.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const address = accounts[0];
          this.address.set(address);
          this.isConnected.set(true);

          const storedSession = localStorage.getItem('insureth_auth_session');
          if (storedSession?.toLowerCase() === address.toLowerCase()) {
            this.isAuthenticated.set(true);
            const profileCompleted = localStorage.getItem('insureth_profile_completed') === 'true';
            this.isProfileComplete.set(profileCompleted);
            this.updateState(address);
          }
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
      }
    }
  }

  private setupEventListeners() {
    if (this.isMetaMaskInstalled()) {
      const eth = (window as any).ethereum;
      eth.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          const address = accounts[0];
          this.address.set(address);
          this.isConnected.set(true);

          const storedSession = localStorage.getItem('insureth_auth_session');
          if (storedSession?.toLowerCase() === address.toLowerCase()) {
            this.isAuthenticated.set(true);
            const profileCompleted = localStorage.getItem('insureth_profile_completed') === 'true';
            this.isProfileComplete.set(profileCompleted);
            this.updateState(address);
          } else {
            // New account, not authenticated yet
            this.isAuthenticated.set(false);
            this.isProfileComplete.set(false);
            localStorage.removeItem('insureth_auth_session');
          }
        } else {
          this.disconnect();
        }
      });

      eth.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }

  isMetaMaskInstalled(): boolean {
    const eth = (window as any).ethereum;
    return !!(eth && eth.isMetaMask);
  }

  async switchToSepolia(eth: any): Promise<void> {
    const sepoliaChainId = '0xaa36a7';

    try {
      // Try switching network
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: sepoliaChainId }],
      });
    } catch (switchError: any) {
      // If network not added, add it
      if (switchError.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: sepoliaChainId,
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/YOUR_PROJECT_ID'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  async connect(): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      this.error.set('MetaMask is not installed');
      return;
    }

    this.isConnecting.set(true);
    this.error.set(null);

    try {
      const eth = (window as any).ethereum;

      // 🔥 Connect wallet first
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // 🔥 Force Sepolia BEFORE anything else
      await this.switchToSepolia(eth);

      // Now initialize provider AFTER switching
      this.provider = new BrowserProvider(eth);

      this.address.set(address);
      this.isConnected.set(true);

      // 🔥 Now safe to sign (network will show as Sepolia)
      const signer = await this.provider.getSigner();

      const message = `Welcome to Insureth!\n\nPlease sign this message to verify your wallet ownership and log in.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;

      const signature = await signer.signMessage(message);

      console.log('User successfully signed the login message:', signature);

      localStorage.setItem('insureth_auth_session', address);

      this.isAuthenticated.set(true);
      const profileCompleted = localStorage.getItem('insureth_profile_completed') === 'true';
      this.isProfileComplete.set(profileCompleted);

      this.updateState(address);

    } catch (err: any) {
      console.error('Failed to connect or sign:', err);

      if (
        err.code === 4001 ||
        err.code === 'ACTION_REJECTED' ||
        err.info?.error?.code === 4001
      ) {
        this.error.set('Signature or connection rejected. You must authorize both to log in.');
        this.disconnect();
      } else {
        this.error.set(err.message || 'Failed to connect wallet');
        this.disconnect();
      }
    } finally {
      this.isConnecting.set(false);
    }
  }

  async disconnect(): Promise<void> {
    // Clear state synchronously immediately to prevent race conditions during navigation
    localStorage.removeItem('insureth_auth_session');
    this.address.set(null);
    this.isConnected.set(false);
    this.isAuthenticated.set(false);
    this.isProfileComplete.set(false);

    try {
      if (this.isMetaMaskInstalled()) {
        const eth = (window as any).ethereum;
        // Request MetaMask to explicitly revoke the site connection permission
        await eth.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }]
        });
      }
    } catch (err) {
      console.error('Failed to revoke MetaMask permissions:', err);
    }
  }

  private updateState(address: string) {
    this.address.set(address);
    this.isConnected.set(true);
  }

  async getSigner(): Promise<JsonRpcSigner | null> {
    if (!this.provider || !this.isConnected()) return null;
    return this.provider.getSigner();
  }
}
