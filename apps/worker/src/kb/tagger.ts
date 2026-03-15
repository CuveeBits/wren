/**
 * Auto-tagger — Sprint 2 (F-03).
 *
 * Sends the first 2000 chars of document content to LiteLLM
 * (claude-haiku model, mapped to local qwen2.5:7b via LiteLLM proxy).
 * Returns an array of taxonomy tags.
 *
 * Taxonomy: Brand | Product | Competitor | Process | Legal | Customer Research | Other
 */
import OpenAI from 'openai'

const TAXONOMY = ['Brand', 'Product', 'Competitor', 'Process', 'Legal', 'Customer Research', 'Other'] as const
export type KbTag = (typeof TAXONOMY)[number]

const LITELLM_BASE_URL = process.env['LITELLM_BASE_URL'] ?? 'http://localhost:4000'
const LITELLM_API_KEY  = process.env['LITELLM_API_KEY']  ?? 'sk-dev-master-key'
// Use wren-fast (qwen2.5:7b locally); in production swap to claude-haiku-4-5-20251001
const TAGGER_MODEL = process.env['TAGGER_MODEL'] ?? 'wren-fast'

const client = new OpenAI({ baseURL: LITELLM_BASE_URL, apiKey: LITELLM_API_KEY })

export async function autoTag(text: string, retries = 2): Promise<KbTag[]> {
  const excerpt = text.slice(0, 2000)
  const prompt = `You are a document classifier. Classify the following document excerpt into one or more of these categories: ${TAXONOMY.join(', ')}.

Reply with ONLY a JSON array of matching tags, e.g. ["Brand", "Product"].
If unsure, use ["Other"].

Document excerpt:
${excerpt}`

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: TAGGER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0,
      })
      const content = response.choices[0]?.message.content ?? '["Other"]'
      // Strip markdown code fences if present
      const cleaned = content.replace(/```(?:json)?\n?/g, '').trim()
      const parsed = JSON.parse(cleaned) as unknown
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((t): t is KbTag => TAXONOMY.includes(t as KbTag))
        return valid.length > 0 ? valid : ['Other']
      }
      return ['Other']
    } catch (err) {
      if (attempt === retries) {
        console.warn('[tagger] Auto-tag failed after retries, defaulting to Other:', err)
        return ['Other']
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  return ['Other']
}
