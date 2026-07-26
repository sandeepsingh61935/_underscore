/**
 * Extension billing port — talks to background over the MessageBus.
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type {
  BillingEntitlement,
  BillingUrlResult,
  CheckoutOptions,
  IBillingPort,
} from '@/shared/billing';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import {
  IPC_BILLING_GET_ENTITLEMENT,
  IPC_BILLING_OPEN_PORTAL,
  IPC_BILLING_START_CHECKOUT,
  IPC_BILLING_SYNC_FROM_POLAR,
} from '@/shared/schemas/message-schemas';

export class IpcBillingPort implements IBillingPort {
  constructor(private readonly messageBus: IMessageBus) {}

  async getEntitlement(): Promise<BillingEntitlement> {
    const res = await this.messageBus.send<MessageResponse<BillingEntitlement>>(
      'background',
      {
        type: IPC_BILLING_GET_ENTITLEMENT,
        payload: {},
        timestamp: Date.now(),
      }
    );
    if (!res || !res.success) {
      throw new Error(
        res && !res.success ? res.error : 'Failed to load billing entitlement'
      );
    }
    return res.data;
  }

  async createCheckout(options: CheckoutOptions): Promise<BillingUrlResult> {
    const res = await this.messageBus.send<MessageResponse<BillingUrlResult>>(
      'background',
      {
        type: IPC_BILLING_START_CHECKOUT,
        payload: {
          successUrl: options.successUrl,
          cancelUrl: options.cancelUrl,
        },
        timestamp: Date.now(),
      }
    );
    if (!res || !res.success || !res.data.url) {
      throw new Error(res && !res.success ? res.error : 'Checkout failed');
    }
    return res.data;
  }

  async createPortal(): Promise<BillingUrlResult> {
    const res = await this.messageBus.send<MessageResponse<BillingUrlResult>>(
      'background',
      {
        type: IPC_BILLING_OPEN_PORTAL,
        payload: {},
        timestamp: Date.now(),
      }
    );
    if (!res || !res.success || !res.data.url) {
      throw new Error(res && !res.success ? res.error : 'Portal failed');
    }
    return res.data;
  }

  async syncFromPolar(): Promise<{ plan: string; status?: string }> {
    const res = await this.messageBus.send<
      MessageResponse<{ plan: string; status?: string }>
    >('background', {
      type: IPC_BILLING_SYNC_FROM_POLAR,
      payload: {},
      timestamp: Date.now(),
    });
    if (!res || !res.success) {
      throw new Error(
        res && !res.success ? res.error : 'Billing sync failed'
      );
    }
    return res.data;
  }
}
