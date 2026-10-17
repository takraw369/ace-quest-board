# ACE AI Cost Guard v1

Status: BUILD / review before deploy
Base branch: `dev`

## Purpose

Add AI monetization without creating a parallel membership system or exposing an API key. Reuse the existing `person_entitlements` layer, route every AI request through one trusted gateway, and record usage/cost before ACE AI is offered as a standalone subscription.

## What this branch adds

1. `ai_feature_policies`
   - model tier
   - request limits
   - monthly cost ceiling
   - max input/output tokens
   - action when a limit is reached
2. `ai_usage`
   - request, model, tokens, estimated cost, latency, status
3. `ai_feedback`
   - rating, usefulness, Quest completion
4. `winning_os_90.ai_beta_7d`
   - 7-day AI beta entitlement attached to the existing Winning OS offer
5. `ace-ai-gateway`
   - authenticated request only
   - entitlement check
   - daily/monthly/deep/cost limits
   - model routing
   - OpenAI call
   - usage/cost logging

## Model tiers

Defaults are intentionally configurable through environment variables.

- LIGHT: `gpt-5.6-luna`
- STANDARD: `gpt-5.6-terra`
- DEEP: `gpt-5.6-sol`

Required secrets / configuration:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional overrides:

- `OPENAI_ACE_LIGHT_MODEL`
- `OPENAI_ACE_STANDARD_MODEL`
- `OPENAI_ACE_DEEP_MODEL`
- `AI_USD_JPY` (default: 150; use a conservative operational rate and update periodically)
- `AI_PRICE_LIGHT_INPUT_USD_M`
- `AI_PRICE_LIGHT_OUTPUT_USD_M`
- `AI_PRICE_STANDARD_INPUT_USD_M`
- `AI_PRICE_STANDARD_OUTPUT_USD_M`
- `AI_PRICE_DEEP_INPUT_USD_M`
- `AI_PRICE_DEEP_OUTPUT_USD_M`

## Beta policy

The first policy is deliberately conservative:

- Daily Quest: LIGHT
- AI Coach: STANDARD with LIGHT fallback
- Deep Coaching: DEEP with STANDARD fallback
- total monthly AI cost ceiling for beta entitlement: 300 JPY target ceiling per feature policy
- 7-day entitlement bundled with Winning OS

This is not a final subscription design. The goal is to obtain actual cost/value data from the first 1-5 paying customers.

## Gateway request

```json
{
  "feature_key": "ai_coach",
  "input": "今日の状態と目標。次に何をすべき？"
}
```

Supported v1 features:

- `daily_quest`
- `ai_coach`
- `deep_coaching`

The client must send the user's Supabase access token as `Authorization: Bearer <token>`.

## Gateway response

The success response includes:

- `request_id`
- `feature_key`
- plan
- chosen model tier/model
- answer
- token usage
- estimated JPY cost
- monthly cost ceiling

The API key is never returned to the client.

## Important deployment order

1. Review migration and RLS.
2. Apply migration to a non-production/test Supabase environment first.
3. Set function secrets.
4. Deploy `ace-ai-gateway`.
5. Test with one internal authenticated account.
6. Confirm entitlement denial works.
7. Confirm 7-day Winning OS AI beta entitlement works.
8. Confirm limits return `429` and no provider request is made after the limit.
9. Confirm `ai_usage` logs model, tokens, cost, latency and status.
10. Only then expose the AI button in the user UI.

## Explicit non-goals for v1

- unlimited use
- user-supplied API keys
- multi-agent orchestration
- large RAG ingestion
- automatic production deployment
- standalone ACE AI subscription before beta unit economics are measured

## Next integration

After beta data exists, add an admin Unit Economics panel showing:

- AI MRR
- active AI users
- AI cost/user
- AI cost ratio
- AI contribution profit
- cost by feature/model
- 7-day retention
- Quest completion
- upgrade / human coaching conversion
