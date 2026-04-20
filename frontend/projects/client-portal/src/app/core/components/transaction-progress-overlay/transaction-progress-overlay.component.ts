import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TransactionProgressModalComponent } from '../transaction-progress-modal/transaction-progress-modal.component';
import { TransactionFlowService } from '../../services/transaction-flow.service';

@Component({
  selector: 'app-transaction-progress-overlay',
  standalone: true,
  imports: [CommonModule, TransactionProgressModalComponent],
  template: `
    <div *ngIf="isVisible()" class="transaction-progress-overlay">
      <div class="transaction-progress-overlay__backdrop"></div>
      <div class="transaction-progress-overlay__panel">
        <app-transaction-progress-modal
          [mode]="displayMode()"
          [currentStep]="state().currentStep"
          [steps]="state().steps"
          [title]="state().title"
          [subtitle]="state().subtitle"
          [transactionHash]="state().transactionHash"
          [explorerUrl]="state().explorerUrl"
          (continueClicked)="transactionFlow.confirmContinue()"
          (cancelClicked)="transactionFlow.confirmCancel()"
          (closeClicked)="transactionFlow.closeOverlay()"
          (viewTransactionClicked)="transactionFlow.openExplorer()"
        ></app-transaction-progress-modal>
      </div>
    </div>
  `,
  styles: [`
    .transaction-progress-overlay {
      position: fixed;
      inset: 0;
      z-index: 1400;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .transaction-progress-overlay__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.28);
      backdrop-filter: blur(4px);
    }

    .transaction-progress-overlay__panel {
      position: relative;
      z-index: 1;
      width: min(640px, 100%);
      max-height: calc(100vh - 40px);
      overflow: auto;
      border: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
      padding: 22px 22px 18px;
    }

    @media (max-width: 720px) {
      .transaction-progress-overlay {
        padding: 12px;
      }

      .transaction-progress-overlay__panel {
        border-radius: 18px;
        padding: 16px 14px 14px;
      }
    }
  `]
})
export class TransactionProgressOverlayComponent {
  readonly transactionFlow = inject(TransactionFlowService);
  readonly state = this.transactionFlow.state;
  readonly isVisible = computed(() => this.transactionFlow.isVisible());

  displayMode() {
    const mode = this.state().mode;
    return mode === 'hidden' ? 'review' : mode;
  }
}
