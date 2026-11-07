import { handleAnalytics, type AnalyticsEnv } from '../_lib/analytics.ts'

// /a/boot.js, /a/script.js and /a/api/send: see functions/_lib/analytics.ts.
export const onRequest = ({ request, env }: { request: Request; env: AnalyticsEnv }) => handleAnalytics(request, env)
