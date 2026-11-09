/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Initial Production State for CTC System
 * Ready for clean production deployment without demo/mock data.
 */

import { Order, AuditLog, TelegramNotification } from '../types';

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_NOTIFICATIONS: TelegramNotification[] = [];
