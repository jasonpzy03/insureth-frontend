import { Injectable, signal, inject } from '@angular/core';
import { BrowserProvider, formatEther, JsonRpcSigner } from 'ethers';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private authService = inject(AuthService);
  private provider: BrowserProvider | null = null;
  private _switchingNetwork = false;
  private readonly tokenStorageKey = 'insureth_auth_token';

  // Using Angular Signals for reactive state
  readonly address = signal<string | null>(null);
  readonly isConnected = signal<boolean>(false);
  readonly isAuthenticated = signal<boolean>(false);
  readonly isConnecting = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly authToken = signal<string | null>(null);
  readonly networkLabel = signal<string | null>(null);
  readonly nativeTokenSymbol = signal<string>('ETH');
  readonly nativeBalance = signal<string | null>(null);
  readonly isWalletSnapshotLoading = signal<boolean>(false);
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
    await this.checkConnection();
    this.setupEventListeners();
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

          const storedToken = localStorage.getItem(this.tokenStorageKey);
          if (storedToken && this.getTokenSubject(storedToken)?.toLowerCase() === address.toLowerCase()) {
            this.isAuthenticated.set(true);
            this.authToken.set(storedToken);
            this.updateState(address);
            await this.refreshWalletSnapshot();
            await this.refreshProfileState();
          } else if (storedToken) {
            this.clearSession();
          } else {
            await this.refreshWalletSnapshot();
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

          const storedToken = localStorage.getItem(this.tokenStorageKey);
          if (storedToken && this.getTokenSubject(storedToken)?.toLowerCase() === address.toLowerCase()) {
            this.isAuthenticated.set(true);
            this.authToken.set(storedToken);
            this.updateState(address);
            void this.refreshWalletSnapshot();
            void this.refreshProfileState();
          } else {
            // New account, not authenticated yet
            this.clearSession();
          }
        } else {
          this.disconnect();
        }
      });

      eth.on('chainChanged', () => {
        // Skip reload if we triggered the network switch ourselves (e.g. during login)
        if (!this._switchingNetwork) {
          window.location.reload();
        }
      });
    }
  }

  isMetaMaskInstalled(): boolean {
    const eth = (window as any).ethereum;
    return !!(eth && eth.isMetaMask);
  }

  // === NETWORK CONFIG ===
  // Hardhat Localhost
  // private readonly TARGET_CHAIN_ID = '0x7a69'; // 31337

  // --- Sepolia (uncomment to switch back) ---
  private readonly TARGET_CHAIN_ID = '0xaa36a7'; // 11155111

  async switchToTargetNetwork(eth: any): Promise<void> {
    this._switchingNetwork = true;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.TARGET_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Hardhat Localhost
        // await eth.request({
        //   method: 'wallet_addEthereumChain',
        //   params: [
        //     {
        //       chainId: this.TARGET_CHAIN_ID,
        //       chainName: 'Hardhat Localhost',
        //       nativeCurrency: {
        //         name: 'ETH',
        //         symbol: 'ETH',
        //         decimals: 18,
        //       },
        //       rpcUrls: ['http://127.0.0.1:8545'],
        //       blockExplorerUrls: []
        //     },
        //   ],
        // });

        // --- Sepolia (uncomment to switch back) ---
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: this.TARGET_CHAIN_ID,
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/d61c67d521c94cbb9fc3da4b765072f3'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            },
          ],
        });
      } else {
        this._switchingNetwork = false;
        throw switchError;
      }
    }
    this._switchingNetwork = false;
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
      const chainId = await eth.request({ method: 'eth_chainId' });

      if (chainId !== this.TARGET_CHAIN_ID) {
        await this.switchToTargetNetwork(eth);
        return; // stop flow here
      }

      // 🔥 Connect wallet first
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Now initialize provider AFTER switching
      this.provider = new BrowserProvider(eth);

      this.address.set(address);
      this.isConnected.set(true);

      // 🔥 Now safe to sign (network will show as Sepolia)
      const signer = await this.provider.getSigner();

      const noncePayload = await firstValueFrom(this.authService.issueClientNonce(address));
      const message = noncePayload.message;

      const signature = await signer.signMessage(message);

      const response = await firstValueFrom(
        this.authService.loginClientWallet(address, signature, noncePayload.nonce, message)
      );

      localStorage.setItem(this.tokenStorageKey, response.token);

      this.authToken.set(response.token);
      this.isAuthenticated.set(true);
      this.isProfileComplete.set(response.profileComplete);

      this.updateState(address);
      await this.refreshWalletSnapshot();

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
    this.clearSession();

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

  async refreshWalletSnapshot(): Promise<void> {
    if (!this.provider || !this.address()) {
      this.networkLabel.set(null);
      this.nativeTokenSymbol.set('ETH');
      this.nativeBalance.set(null);
      return;
    }

    this.isWalletSnapshotLoading.set(true);

    try {
      const [network, balance] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBalance(this.address()!)
      ]);

      this.networkLabel.set(this.resolveNetworkLabel(network.chainId, network.name));
      this.nativeTokenSymbol.set(this.resolveNativeSymbol(network.chainId));
      this.nativeBalance.set(formatEther(balance));
    } catch (err) {
      console.error('Failed to refresh wallet snapshot:', err);
    } finally {
      this.isWalletSnapshotLoading.set(false);
    }
  }

  private async refreshProfileState() {
    try {
      await firstValueFrom(this.authService.getCurrentClientUser());
      this.isProfileComplete.set(true);
    } catch (err: any) {
      if (err?.status === 404) {
        this.isProfileComplete.set(false);
        return;
      }
      this.clearSession();
    }
  }

  private getTokenSubject(token: string): string | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded?.sub ?? null;
    } catch {
      return null;
    }
  }

  private clearSession() {
    localStorage.removeItem(this.tokenStorageKey);
    this.address.set(null);
    this.isConnected.set(false);
    this.isAuthenticated.set(false);
    this.isProfileComplete.set(false);
    this.authToken.set(null);
    this.networkLabel.set(null);
    this.nativeTokenSymbol.set('ETH');
    this.nativeBalance.set(null);
    this.isWalletSnapshotLoading.set(false);
  }

  async getSigner(): Promise<JsonRpcSigner | null> {
    if (!this.provider || !this.isConnected()) return null;
    return this.provider.getSigner();
  }

  getProvider(): BrowserProvider | null {
    return this.provider;
  }

  private resolveNetworkLabel(chainId: bigint, providerName: string): string {
    const knownLabels: Record<string, string> = {
      '1': 'Ethereum',
      '11155111': 'Sepolia',
      '8453': 'Base',
      '84532': 'Base Sepolia',
      '137': 'Polygon',
      '80002': 'Polygon Amoy',
      '43114': 'Avalanche',
      '43113': 'Fuji',
      '56': 'BNB Smart Chain',
      '97': 'BNB Testnet',
      '31337': 'Hardhat Localhost'
    };

    return knownLabels[chainId.toString()] ?? this.humanizeNetworkName(providerName);
  }

  private resolveNativeSymbol(chainId: bigint): string {
    const knownSymbols: Record<string, string> = {
      '137': 'POL',
      '80002': 'POL',
      '43114': 'AVAX',
      '43113': 'AVAX',
      '56': 'BNB',
      '97': 'BNB'
    };

    return knownSymbols[chainId.toString()] ?? 'ETH';
  }

  private humanizeNetworkName(providerName: string): string {
    if (!providerName || providerName === 'unknown') {
      return 'Connected Network';
    }

    return providerName
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }
}
