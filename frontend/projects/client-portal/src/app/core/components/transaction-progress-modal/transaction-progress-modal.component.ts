import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

type TransactionProgressMode = 'review' | 'wallet' | 'submitted';

@Component({
  selector: 'app-transaction-progress-modal',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  template: `
    <div class="transaction-progress-modal">
      <div class="transaction-progress-modal__steps">
        <div class="transaction-progress-modal__rail"></div>
        <div
          *ngFor="let step of steps; let index = index"
          class="transaction-progress-modal__step"
          [class.transaction-progress-modal__step--active]="index === currentStep"
          [class.transaction-progress-modal__step--complete]="index < currentStep"
        >
          <div class="transaction-progress-modal__step-number">{{ index + 1 }}</div>
          <div class="transaction-progress-modal__step-label">{{ step }}</div>
        </div>
      </div>

      <div class="transaction-progress-modal__body">
        <h2 class="transaction-progress-modal__title">{{ title }}</h2>
        <p class="transaction-progress-modal__subtitle">{{ subtitle }}</p>

        <div *ngIf="transactionHash" class="transaction-progress-modal__hash">
          <div class="transaction-progress-modal__hash-label">Transaction hash</div>
          <button
            *ngIf="explorerUrl; else plainHash"
            type="button"
            class="transaction-progress-modal__hash-link"
            (click)="viewTransactionClicked.emit()"
          >
            {{ transactionHash }}
          </button>
          <ng-template #plainHash>
            <div class="transaction-progress-modal__hash-value">{{ transactionHash }}</div>
          </ng-template>
        </div>

        <div class="transaction-progress-modal__actions">
          <button
            *ngIf="mode === 'review'"
            nz-button
            nzType="default"
            class="transaction-progress-modal__button transaction-progress-modal__button--secondary"
            (click)="cancelClicked.emit()"
          >
            Cancel
          </button>

          <button
            *ngIf="mode === 'review'"
            nz-button
            nzType="primary"
            class="transaction-progress-modal__button"
            (click)="continueClicked.emit()"
          >
            Continue
          </button>

          <button
            *ngIf="mode === 'wallet'"
            nz-button
            nzType="primary"
            class="transaction-progress-modal__button"
            (click)="closeClicked.emit()"
          >
            Close
          </button>

          <button
            *ngIf="mode === 'submitted' && explorerUrl"
            nz-button
            nzType="default"
            class="transaction-progress-modal__button transaction-progress-modal__button--secondary"
            (click)="viewTransactionClicked.emit()"
          >
            View Transaction
          </button>

          <button
            *ngIf="mode === 'submitted'"
            nz-button
            nzType="primary"
            class="transaction-progress-modal__button"
            (click)="closeClicked.emit()"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .transaction-progress-modal {
      padding: 0;
    }

    .transaction-progress-modal__steps {
      position: relative;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 24px;
    }

    .transaction-progress-modal__rail {
      position: absolute;
      top: 14px;
      left: 12%;
      right: 12%;
      height: 3px;
      border-radius: 999px;
      background: linear-gradient(90deg, #eadcff 0%, #f5efff 100%);
    }

    .transaction-progress-modal__step {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }

    .transaction-progress-modal__step-number {
      width: 30px;
      height: 30px;
      border-radius: 999px;
      border: 1.5px solid #dcc8ff;
      background: #fbf8ff;
      color: #6b7280;
      font-size: 14px;
      line-height: 27px;
      font-weight: 600;
      box-shadow: 0 6px 18px rgba(135, 50, 251, 0.08);
    }

    .transaction-progress-modal__step--active .transaction-progress-modal__step-number,
    .transaction-progress-modal__step--complete .transaction-progress-modal__step-number {
      border-color: #8732fb;
      color: #8732fb;
      background: #ffffff;
    }

    .transaction-progress-modal__step-label {
      max-width: 160px;
      color: #6b7280;
      font-size: 13px;
      line-height: 1.4;
      font-weight: 500;
    }

    .transaction-progress-modal__step--active .transaction-progress-modal__step-label,
    .transaction-progress-modal__step--complete .transaction-progress-modal__step-label {
      color: #8732fb;
    }

    .transaction-progress-modal__body {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 0 8px 4px;
    }

    .transaction-progress-modal__title {
      margin: 0;
      color: #0f172a;
      font-size: clamp(1.5rem, 2vw, 2.1rem);
      line-height: 1.15;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .transaction-progress-modal__subtitle {
      max-width: 520px;
      margin: 14px 0 0;
      color: #6b7280;
      font-size: 15px;
      line-height: 1.6;
    }

    .transaction-progress-modal__hash {
      width: min(100%, 520px);
      margin-top: 18px;
      padding: 14px 16px;
      border: 1px solid #eadcff;
      border-radius: 16px;
      background: linear-gradient(180deg, #fbf8ff 0%, #f5efff 100%);
      text-align: left;
    }

    .transaction-progress-modal__hash-label {
      color: #7c6f94;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .transaction-progress-modal__hash-value,
    .transaction-progress-modal__hash-link {
      margin-top: 10px;
      color: #7a2fe0;
      font-size: 13px;
      line-height: 1.65;
      word-break: break-all;
      font-family: Consolas, Monaco, 'Courier New', monospace;
    }

    .transaction-progress-modal__hash-link {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      text-align: left;
      text-decoration: underline;
      cursor: pointer;
    }

    .transaction-progress-modal__actions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 22px;
    }

    .transaction-progress-modal__button {
      min-width: 132px;
      height: 42px;
      padding-inline: 20px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      box-shadow: none;
    }

    .transaction-progress-modal__button.ant-btn-primary {
      border-color: #8732fb;
      background: linear-gradient(135deg, #8732fb 0%, #6f5ef9 100%);
    }

    .transaction-progress-modal__button.ant-btn-primary:hover,
    .transaction-progress-modal__button.ant-btn-primary:focus {
      border-color: #7220e3;
      background: linear-gradient(135deg, #7b29ec 0%, #624ef2 100%);
    }

    .transaction-progress-modal__button--secondary {
      border-color: #e4d5ff;
      color: #8732fb;
      background: #ffffff;
    }

    .transaction-progress-modal__button--secondary:hover,
    .transaction-progress-modal__button--secondary:focus {
      border-color: #cfaeff;
      color: #7220e3;
      background: #fbf8ff;
    }

    @media (max-width: 720px) {
      .transaction-progress-modal__steps {
        gap: 6px;
        margin-bottom: 18px;
      }

      .transaction-progress-modal__step-label {
        max-width: 92px;
        font-size: 11px;
      }

      .transaction-progress-modal__body {
        padding-inline: 0;
      }

      .transaction-progress-modal__subtitle {
        font-size: 14px;
      }

      .transaction-progress-modal__button {
        width: 100%;
      }
    }
  `]
})
export class TransactionProgressModalComponent {
  @Input() mode: TransactionProgressMode = 'review';
  @Input() currentStep = 0;
  @Input() steps: string[] = ['Review action', 'Confirm in wallet', 'Track transaction'];
  @Input() title = '';
  @Input() subtitle = '';
  @Input() transactionHash: string | null = null;
  @Input() explorerUrl: string | null = null;

  @Output() continueClicked = new EventEmitter<void>();
  @Output() cancelClicked = new EventEmitter<void>();
  @Output() closeClicked = new EventEmitter<void>();
  @Output() viewTransactionClicked = new EventEmitter<void>();
}
