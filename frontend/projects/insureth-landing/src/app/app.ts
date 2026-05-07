import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { getRuntimeConfig } from './runtime-config';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    NzButtonModule,
    NzCardModule,
    NzCollapseModule,
    NzIconModule,
    NzLayoutModule,
    NzTagModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly liveProducts = [
    {
      title: 'Flight Delay Insurance',
      badge: 'Live now',
      description: 'Buy protection before departure and let smart contracts, Chainlink automation, and external flight data determine the final outcome.',
      bullets: [
        'Coverage based on flight-specific performance and payout tiers',
        'Automated verification window after scheduled departure',
        'Transparent policy lifecycle recorded on-chain'
      ]
    }
  ];

  readonly upcomingProducts = [
    {
      title: 'Weather Parametric Insurance',
      badge: 'Coming next',
      description: 'A future expansion for rainfall, storm, and weather-threshold protection, designed around objective trigger conditions rather than manual claims.'
    }
  ];

  readonly travelerSteps = [
    {
      title: 'Search a flight',
      body: 'Choose your airline, departure airport, and flight number to retrieve schedule and performance inputs.'
    },
    {
      title: 'Lock coverage before departure',
      body: 'Your premium and payout tier are priced transparently before you buy, with smart-contract terms visible upfront.'
    },
    {
      title: 'Wait for automated verification',
      body: 'After departure, Chainlink automation and oracle logic move the policy into verification without requiring manual follow-up.'
    },
    {
      title: 'Receive payout if conditions are met',
      body: 'If the verified delay or disruption crosses the policy threshold, the payout is triggered according to the purchased tier.'
    }
  ];

  readonly investorSteps = [
    {
      title: 'Provide liquidity',
      body: 'Investors deposit capital into the pool that underwrites policy payouts.'
    },
    {
      title: 'Earn from premiums',
      body: 'Policy premiums contribute to pool economics while risks are spread across insured flights.'
    },
    {
      title: 'Absorb verified payouts',
      body: 'When valid disruptions occur, payouts are drawn from the pool, making investor performance transparent and measurable.'
    }
  ];

  readonly trustPoints = [
    {
      title: 'Smart-contract settlement',
      body: 'Policy ownership, premium transfer, and payout execution are anchored on-chain for auditability.'
    },
    {
      title: 'External data providers',
      body: 'Flight schedule and performance inputs are sourced from external aviation APIs instead of being invented internally.'
    },
    {
      title: 'Investor-backed pool',
      body: 'Liquidity providers are part of the protection model, making the underwriting side visible to both customers and operators.'
    }
  ];

  readonly faqs = [
    {
      title: 'What makes Insureth different from traditional claims-based insurance?',
      body: 'Insureth is built around parametric logic. Instead of waiting for a long manual claim investigation, the system checks objective flight outcomes against predefined thresholds.'
    },
    {
      title: 'What insurance products are available today?',
      body: 'Flight delay insurance is the live product today. Weather parametric insurance is planned as a future product line using the same transparency-first approach.'
    },
    {
      title: 'How do investors participate?',
      body: 'Investors provide capital into the liquidity pool. That pool supports policy payouts and can benefit from premium inflows, while still being exposed to verified payout events.'
    },
    {
      title: 'Is this only a demo or can it scale into a broader platform?',
      body: 'The platform is structured to expand into more objective insurance products. Flight coverage is the first product, but the same architecture can support additional parametric lines over time.'
    }
  ];

  readonly statCards = [
    { value: 'Oracle-driven', label: 'verification flow', tone: 'violet' },
    { value: 'Investor-backed', label: 'liquidity pool model', tone: 'blue' },
    { value: 'Transparent', label: 'policy lifecycle visibility', tone: 'mint' }
  ];

  readonly portalUrl = getRuntimeConfig().clientPortalUrl;
  constructor() {
    this.title.setTitle('Insureth | Parametric Insurance for Travelers and Investors');
    this.meta.updateTag({
      name: 'description',
      content:
        'Insureth is a parametric insurance platform introducing flight delay coverage today, with investor-backed liquidity pools and future weather insurance expansion.'
    });
  }
}
