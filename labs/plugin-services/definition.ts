// SPDX-License-Identifier: Apache-2.0
/** Business service definition used by the book's interchangeable providers. */
import { Service, type Context } from './runtime.ts'

/** The same fictional ticket fields introduced in chapter three. */
export interface Ticket {
  id: string
  status: string
  title: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    bookTickets: TicketSource
  }
}

/** A read-only ticket source; implementations return a copy or null and honor cancellation. */
export abstract class TicketSource extends Service {
  constructor(ctx: Context) {
    super(ctx, 'bookTickets')
  }

  /** @param id Exact ticket identity. @param signal Caller cancellation. @returns A copy, or null when absent. */
  abstract lookup(id: string, signal: AbortSignal): Promise<Ticket | null>
}
