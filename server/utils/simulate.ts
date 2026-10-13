import type { H3Event } from 'h3'

/**
 * Demo helper so reviewers can see loading/error states on the live site:
 * any API call with `?simulate=slow` waits 2s, `?simulate=error` fails with 503.
 */
export async function applySimulation(event: H3Event): Promise<void> {
  const { simulate } = getQuery(event)
  if (simulate === 'slow') {
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  if (simulate === 'error') {
    throw createError({ statusCode: 503, statusMessage: 'Simulated failure' })
  }
}
