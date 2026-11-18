// SPDX-License-Identifier: Apache-2.0
/** Source-loader adapter for a book checkout without its own Harness dependencies. */
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
export type { Context } from '@deepseek-ai/cordis'

const source = process.env.BOOK_DSH_SOURCE
if (source === undefined) throw new Error('Use the book runner with an explicit Harness source root.')
const cordis: typeof import('@deepseek-ai/cordis') = await import(pathToFileURL(resolve(source, 'vendor/cordis/src/index.ts')).href)
const schema: typeof import('@deepseek-ai/schemastery') = await import(pathToFileURL(resolve(source, 'vendor/schemastery/src/index.ts')).href)
export const Service = cordis.Service
export const fiberStateNames: Readonly<Record<number, string>> = {
  [cordis.FiberState.PENDING]: 'PENDING',
  [cordis.FiberState.LOADING]: 'LOADING',
  [cordis.FiberState.ACTIVE]: 'ACTIVE',
  [cordis.FiberState.UNLOADING]: 'UNLOADING',
  [cordis.FiberState.FAILED]: 'FAILED',
  [cordis.FiberState.DISPOSED]: 'DISPOSED',
}
export const z = schema.default
