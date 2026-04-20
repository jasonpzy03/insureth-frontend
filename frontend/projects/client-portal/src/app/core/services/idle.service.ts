import { Injectable, NgZone, inject, signal } from '@angular/core';
import { fromEvent, merge, timer, Subscription, BehaviorSubject, Subject } from 'rxjs';
import { switchMap, tap, filter, startWith } from 'rxjs/operators';
import { WalletService } from './wallet.service';

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  private walletService = inject(WalletService);
  private ngZone = inject(NgZone);

  // 2 Minute total
  private readonly IDLE_TIMEOUT_MS = 120 * 1000;
  // 10 Seconds warning
  private readonly WARNING_PERIOD_MS = 10 * 1000;

  private idleSubscription?: Subscription;
  private manualReset$ = new Subject<void>();

  // Signals for UI to bind to
  readonly isIdleWarningActive = signal<boolean>(false);
  readonly countdownSeconds = signal<number>(0);

  constructor() { }

  startMonitoring() {
    if (this.idleSubscription) return;

    // Run outside Angular zone to prevent excessive change detection on mousemove
    this.ngZone.runOutsideAngular(() => {
      const activityEvents$ = merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'mousedown'),
        fromEvent(window, 'keydown'),
        fromEvent(window, 'scroll'),
        fromEvent(window, 'touchstart'),
        this.manualReset$
      );

      this.idleSubscription = activityEvents$
        .pipe(
          // For the manualReset$, we want it to work even if the warning is active 
          // (because the click itself is an activity, but we filter it out if we use physical events).
          // Actually, we'll exclude manualReset$ from the filter.
          filter((event) => {
            // If it's the warning is active, ignore physical events.
            // But we ALWAYS allow the manualReset signal to pass.
            return !this.isIdleWarningActive() || !event;
          }),
          startWith(null), // Start timer immediately on monitoring
          switchMap(() => {
            // Wait until inactivity threshold reached
            return timer(this.IDLE_TIMEOUT_MS - this.WARNING_PERIOD_MS);
          })
        )
        .subscribe(() => {
          // Trigger Warning phase
          this.ngZone.run(() => this.enterWarningPhase());
        });
    });
  }

  stopMonitoring() {
    this.idleSubscription?.unsubscribe();
    this.idleSubscription = undefined;
    this.isIdleWarningActive.set(false);
  }

  private enterWarningPhase() {
    this.isIdleWarningActive.set(true);
    let secondsLeft = this.WARNING_PERIOD_MS / 1000;
    this.countdownSeconds.set(secondsLeft);

    const countdownInterval = setInterval(() => {
      if (!this.isIdleWarningActive()) {
        clearInterval(countdownInterval);
        return;
      }

      secondsLeft--;
      this.countdownSeconds.set(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(countdownInterval);
        this.logout();
      }
    }, 1000);
  }

  resetTimer() {
    this.isIdleWarningActive.set(false);
    this.manualReset$.next();
  }

  private logout() {
    this.walletService.disconnect();
    window.location.href = '/login';
  }
}
