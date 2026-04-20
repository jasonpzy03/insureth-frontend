import { Injectable, computed, inject, signal } from '@angular/core';
import { WalletService } from './wallet.service';

type TransactionFlowOptions = {
  actionLabel: string;
  confirmDescription: string;
};

type TransactionProgressHandle = {
  transactionSubmitted: (hash: string) => Promise<void>;
  close: () => void;
};

type TransactionOverlayMode = 'hidden' | 'review' | 'wallet' | 'submitted';

export type TransactionOverlayState = {
  mode: TransactionOverlayMode;
  currentStep: number;
  steps: string[];
  title: string;
  subtitle: string;
  transactionHash: string | null;
  explorerUrl: string | null;
};

const DEFAULT_STEPS = ['Review action', 'Confirm in wallet', 'Track transaction'];

@Injectable({
  providedIn: 'root'
})
export class TransactionFlowService {
  private readonly walletService = inject(WalletService);
  private readonly stateSignal = signal<TransactionOverlayState>({
    mode: 'hidden',
    currentStep: 0,
    steps: DEFAULT_STEPS,
    title: '',
    subtitle: '',
    transactionHash: null,
    explorerUrl: null
  });

  private confirmResolver: ((confirmed: boolean) => void) | null = null;

  readonly state = computed(() => this.stateSignal());
  readonly isVisible = computed(() => this.stateSignal().mode !== 'hidden');

  async confirmAction(options: TransactionFlowOptions): Promise<boolean> {
    this.stateSignal.set({
      mode: 'review',
      currentStep: 0,
      steps: DEFAULT_STEPS,
      title: `Confirm ${options.actionLabel}`,
      subtitle: options.confirmDescription,
      transactionHash: null,
      explorerUrl: null
    });

    return new Promise<boolean>((resolve) => {
      this.confirmResolver = resolve;
    });
  }

  confirmContinue(): void {
    const resolver = this.confirmResolver;
    this.confirmResolver = null;
    resolver?.(true);
    this.stateSignal.update((current) => ({
      ...current,
      mode: 'wallet',
      currentStep: 1,
      title: this.toHeadline(current.title.replace(/^Confirm\s+/i, 'Approve ')),
      subtitle: this.toWalletSubtitle(current.title)
    }));
  }

  confirmCancel(): void {
    const resolver = this.confirmResolver;
    this.confirmResolver = null;
    resolver?.(false);
    this.reset();
  }

  openWalletConfirmation(actionLabel: string): TransactionProgressHandle {
    this.stateSignal.set({
      mode: 'wallet',
      currentStep: 1,
      steps: DEFAULT_STEPS,
      title: this.toHeadline(`Approve ${actionLabel}`),
      subtitle: `Please confirm that you want to ${actionLabel.toLowerCase()} in MetaMask.`,
      transactionHash: null,
      explorerUrl: null
    });

    return {
      transactionSubmitted: async (hash: string) => {
        const explorerUrl = await this.getExplorerTransactionUrl(hash);
        this.stateSignal.update((current) => ({
          ...current,
          mode: 'submitted',
          currentStep: 2,
          title: 'Transaction Submitted',
          subtitle: explorerUrl
            ? 'Your transaction has been submitted successfully. You can open the explorer link below while it confirms on-chain.'
            : 'Your transaction has been submitted successfully. You can keep this transaction hash for reference while it confirms on-chain.',
          transactionHash: hash,
          explorerUrl
        }));
      },
      close: () => this.reset()
    };
  }

  closeOverlay(): void {
    this.reset();
  }

  openExplorer(): void {
    const explorerUrl = this.stateSignal().explorerUrl;
    if (explorerUrl) {
      window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    }
  }

  private reset(): void {
    this.stateSignal.set({
      mode: 'hidden',
      currentStep: 0,
      steps: DEFAULT_STEPS,
      title: '',
      subtitle: '',
      transactionHash: null,
      explorerUrl: null
    });
  }

  private async getExplorerTransactionUrl(hash: string): Promise<string | null> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      return null;
    }

    try {
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const baseUrl = this.getExplorerBaseUrl(chainId);
      return baseUrl ? `${baseUrl}/tx/${hash}` : null;
    } catch {
      return null;
    }
  }

  private getExplorerBaseUrl(chainId: number): string | null {
    switch (chainId) {
      case 1:
        return 'https://etherscan.io';
      case 11155111:
        return 'https://sepolia.etherscan.io';
      case 8453:
        return 'https://basescan.org';
      case 84532:
        return 'https://sepolia.basescan.org';
      default:
        return null;
    }
  }

  private toHeadline(value: string): string {
    return value
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private toWalletSubtitle(reviewTitle: string): string {
    const actionLabel = reviewTitle.replace(/^Confirm\s+/i, '');
    return `Please confirm that you want to ${actionLabel.toLowerCase()} in MetaMask.`;
  }
}
