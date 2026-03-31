# Wren — Product Vision Pivot & Sprint 5 Direction
*Decided: 31 March / 1 April 2026 — Leo Stehlik + Francis*
*Status: DECISION MADE — brief to follow*

---

## What changed tonight

We had the conversation that should have happened before Sprint 5 was scoped.

Started with: Meiller looked at the 50 seed prompts and said "half of them are irrelevant rubbish." Not the execution. Not the translation. The content itself.

Ended with: a completely different product thesis.

---

## The old Wren thesis (Sprints 1–4c)

> AI platform for SMBs. Prompt Library as front door. KB for context. Chat for interaction. Translation for localisation.

The Prompt Library was the hero feature — 50 templates, form-based execution, translated per tenant.

**Why it's wrong:** Nobody selling enterprise software to a Mittelstand CIO leads with "here are 50 prompt templates." That's not a product. That's a demo fixture.

When Meiller said the prompts were rubbish, they weren't complaining about the UI. They were saying the product premise doesn't match why they bought in.

---

## The trap we almost fell into

Two escape routes were considered and rejected:

**Rejected: Fix the seed prompts** → Still assumes we know their business better than they do. We don't. Meiller's SAP workflows, OEM codes, proposal structures — that's their IP, not ours.

**Rejected: Simplify to click-to-copy prompt library** → Leo identified the problem immediately: Open WebUI with a project setup does exactly this, today, free, with Ollama. If that's Wren's value proposition, there's no product.

---

## The new Wren thesis

> Given a data source, a template, and a context — Wren produces a real business deliverable.

**In Leo's words, verbatim:**

*"Here's this export from SAP, here's what's in CRM via API, here's a template of a proposal... grab the data for this customer and create the proposal. Wren goes, finds the data, asks clarifying questions (customer details, order number) and generates the proposal on a Meiller letterhead, nice and clean."*

That's the product. One end-to-end agentic flow. Real data in, real document out.

---

## What Wren is now

```
WrenLore (knowledge layer)
  — enterprise docs, templates, indexed KB
  — SAP exports, product catalogues, pricing tables
  — versioned, governed, citable

     ↓

Wren Core (agentic orchestration layer)
  — connects to data sources (SAP, CRM, internal APIs)
  — asks clarifying questions via Chat interface
  — runs multi-step agent workflows
  — GDPR-native: local Ollama inference, data never leaves

     ↓

Output (real business deliverables)
  — proposal on Meiller letterhead
  — translated to German
  — generated via Chat, not a form
  — downloadable / shareable
```

---

## What survives from the existing build

Nothing is thrown away. Everything built so far is the right foundation:

- **Sprint 3 Chat** → the interface the agent works through. Exactly right.
- **Sprint 4 multilingual** → German output, German documents, German proposals. Already solved.
- **KB/RAG (Sprint 2)** → the template library, product catalogue, pricing tables. The agent's knowledge store.
- **WrenLore** → structured enterprise knowledge layer the agent pulls from. Now becomes foundational, not a nice-to-have.
- **Custom agent runtime** → no LangChain/CrewAI, multi-tenant from line one. This matters when Meiller's SAP data cannot mix with the next client's CRM data.
- **LiteLLM gateway** → model agnosticism. Local Ollama for sensitive data, cloud for where it makes sense.

**What's now secondary:**
- Prompt Library (form-based execution model) → kept as module, no longer front door
- formSchemaTranslated, TenantPromptLocale → kept, not deleted, but not the product story
- The 50 seed prompts → replaced with domain-specific starter content per vertical/client type

---

## What Wren does that Open WebUI doesn't

This is the competitive moat. Must be true, demonstrable, and defensible:

1. **Multi-tenant SaaS with proper RBAC** — one platform, many organisations, proper isolation
2. **WrenLore** — structured, governed, versioned enterprise KB with citations and access control. Not "attach a file to a chat."
3. **Agentic data integration** — agent connects to SAP, CRM, internal APIs. Not manual file upload.
4. **White-label** — Meiller gets Meiller branding, not "Powered by OpenClaw"
5. **GDPR-native on-prem** — local Ollama inference, data never leaves the org. Procurement requirement in Germany.
6. **Output quality** — structured deliverable (PDF, DOCX, formatted proposal) not a chat reply

---

## Sprint 5 — new scope

**Sprint 5 is no longer "Agent Builder UI + tool dispatch + n8n scaffolding."**

**Sprint 5 is: "Data in, document out — one end-to-end agentic flow."**

### The demo we want to be able to run after Sprint 5:

1. Meiller user opens Wren Chat
2. Types: "Create a proposal for customer Müller GmbH, order reference 2026-0442"
3. Agent asks: "I need a few things — which product line? Standard or custom configuration?"
4. User answers
5. Agent: pulls relevant data from KB (pricing, specs, template), assembles proposal, asks "anything to add before I generate?"
6. User: "Add the Q1 2026 pricing update"
7. Agent generates — proposal on Meiller letterhead, in German, formatted, ready to send

That's Sprint 5. That's the demo that changes the sales conversation.

### What Sprint 5 is NOT:
- Not building the full n8n integration (that's Sprint 6)
- Not a generic agent builder UI (deferred)
- Not a pretty admin panel for managing prompts

### Sprint 5 prerequisites (must be done first):
- [ ] Rex regression Sprint 1–4c passes (in progress — running now on kobe)
- [ ] Leo signs off on Sprint 4c
- [ ] WrenLore Sprint 0 complete (SAML fork, Docker, CI/CD, SSO) — Forge

---

## What this means for the roadmap

| Sprint | Old scope | New scope |
|--------|-----------|-----------|
| Sprint 5 | Agent builder UI + tool dispatch + n8n scaffolding | **Data in, document out — first agentic end-to-end flow** |
| Sprint 6 | n8n workflow integration (full) | n8n integration + workflow automation |
| Sprint 7 | Multi-model + analytics | Multi-model + analytics |
| Sprint 8 | Slack/WhatsApp/white-label | Slack/WhatsApp/white-label |

Prompt Library: remains as secondary module. Not deleted, not the story.

---

## The pitch after Sprint 5

Before: "Wren is an AI platform with a prompt library, knowledge base, and multi-channel chat."

After: "Tell Wren what you need. Give it your data. Get the document."

---

## Open questions (to resolve before Sprint 5 brief is frozen)

1. **Data source for Sprint 5 demo** — SAP export (file upload) or live API? File upload is simpler to demo; API is more impressive. Start with file, build API path in Sprint 6?
2. **Output format** — PDF generation or structured Markdown → download? PDF requires a renderer (puppeteer or similar). Markdown → PDF is a Sprint 5 scope decision.
3. **WrenLore dependency** — does Sprint 5 require WrenLore to be live, or can Wren's existing KB (Sprint 2) serve as the template store for now?
4. **Meiller-specific vs generic** — build this as a generic agentic flow that any tenant can use, or build the Meiller proposal flow specifically and generalise in Sprint 6?

---

*Captured by Francis — 01 April 2026 00:04 CET*
*Do not brief Forge until Leo has reviewed and confirmed the open questions above.*
