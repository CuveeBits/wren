# Wren Privacy Policy

**Version:** 0.1 (Draft — pending legal review)  
**Effective date:** [TO BE CONFIRMED]  
**Last updated:** March 2026  
**Data Controller (SaaS):** CuveeBits s.r.o., [registered address], Czech Republic

---

> ⚠️ **This is a pre-release draft for internal review and early design partner use only. It has not been reviewed by a qualified legal professional. Do not publish publicly without legal sign-off.**

---

## 1. Who We Are

CuveeBits s.r.o. ("CuveeBits", "we", "us") operates the Wren AI platform ("Service"). 

**Deployment models and data controller status:**

| Deployment | Data Controller | Data Processor |
|-----------|----------------|----------------|
| **SaaS** (hosted by CuveeBits) | CuveeBits s.r.o. | — |
| **On-premises** (deployed at Customer site) | Customer organisation | CuveeBits s.r.o. |

For on-premises deployments, a separate Data Processing Agreement (DPA) governs CuveeBits's role as data processor.

---

## 2. What Data We Collect

### 2.1 Account and Identity Data
- Name, email address, organisation name
- Account credentials (passwords stored as hashed values only)
- Billing and payment information (processed via third-party payment provider)

### 2.2 Usage Data
- Log data: IP addresses, browser type, pages visited, timestamps
- Feature usage patterns and interaction data
- Error and crash reports

### 2.3 Customer Content Data
- Documents uploaded to Knowledge Bases
- Chat messages and conversation history
- Prompt templates created by users
- AI-generated responses

### 2.4 Technical Data
- API request/response metadata
- Performance metrics
- Security event logs

---

## 3. How We Use Your Data

| Purpose | Legal Basis |
|---------|------------|
| Providing and operating the Service | Contract performance |
| User authentication and account management | Contract performance |
| Processing LLM requests and returning responses | Contract performance |
| Billing and payment processing | Contract performance / Legal obligation |
| Improving the Service (aggregated, anonymised) | Legitimate interests |
| Security monitoring and fraud prevention | Legitimate interests / Legal obligation |
| Sending service-related communications | Contract performance |
| Sending marketing communications (opt-in only) | Consent |
| Complying with legal obligations | Legal obligation |

**We do not use Customer Content Data to train AI models without explicit opt-in consent.**

---

## 4. AI and LLM Processing

4.1 When you use Wren's AI features, your prompts and content are processed through large language model (LLM) providers. The specific provider depends on your configuration.

4.2 **Local/on-premises LLMs:** When configured with a local Ollama instance or self-hosted model, your content does not leave your infrastructure.

4.3 **Third-party LLM providers:** When using cloud-based LLM providers (e.g. OpenAI, Anthropic), content is transmitted to that provider under their applicable terms. CuveeBits selects providers with appropriate data processing agreements.

4.4 Auto-translation features use local Ollama models by default — content is not sent to external services unless you explicitly configure a cloud translation provider.

---

## 5. Data Sharing and Third Parties

We do not sell your personal data. We share data only in the following circumstances:

### 5.1 Service Providers (Data Processors)
We use trusted third-party services to operate Wren:
- **Cloud infrastructure:** [Provider — e.g. Hetzner, AWS]
- **Authentication:** Clerk Inc. (user authentication)
- **Payment processing:** [Provider — e.g. Stripe]
- **LLM providers:** As configured per deployment
- **Error monitoring:** [Provider — e.g. Sentry]

All processors are bound by data processing agreements and GDPR-compliant terms.

### 5.2 Legal Requirements
We may disclose data if required by law, court order, or regulatory authority.

### 5.3 Business Transfers
In the event of a merger, acquisition, or sale of assets, Customer data may be transferred. We will provide notice before any such transfer.

---

## 6. Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Account data | Duration of subscription + 30 days after termination |
| Customer Content (SaaS) | Duration of subscription + 30 days after termination |
| Usage logs | 90 days |
| Security logs | 12 months |
| Billing records | 10 years (legal obligation) |

Upon account termination, Customer Content is deleted within 30 days unless a longer retention period is required by law.

---

## 7. International Data Transfers

CuveeBits is based in the Czech Republic (EU). If we transfer personal data outside the European Economic Area (EEA), we ensure appropriate safeguards are in place, including:
- Standard Contractual Clauses (SCCs) approved by the European Commission
- Adequacy decisions where applicable

---

## 8. Your Rights (GDPR)

As a data subject under GDPR, you have the right to:

| Right | Description |
|-------|-------------|
| **Access** | Request a copy of your personal data |
| **Rectification** | Correct inaccurate or incomplete data |
| **Erasure** | Request deletion of your data ("right to be forgotten") |
| **Portability** | Receive your data in a machine-readable format |
| **Restriction** | Request that we limit processing of your data |
| **Objection** | Object to processing based on legitimate interests |
| **Withdraw consent** | Withdraw consent at any time where processing is consent-based |

To exercise any of these rights, contact us at [privacy@cuveebits.com]. We will respond within 30 days.

You also have the right to lodge a complaint with the Czech Office for Personal Data Protection (ÚOOÚ) or your local supervisory authority.

---

## 9. Security

9.1 We implement technical and organisational measures to protect your data, including:
- Encryption in transit (TLS) and at rest
- Row-level security (RLS) ensuring strict tenant data isolation
- Access controls and audit logging
- Regular security reviews

9.2 In the event of a data breach affecting your rights and freedoms, we will notify you and the relevant supervisory authority as required by GDPR (within 72 hours of becoming aware).

---

## 10. Cookies

The Wren web application uses the following cookies:

| Cookie | Purpose | Duration |
|--------|---------|----------|
| Session cookie | Authentication | Session |
| Preference cookie | UI preferences | 1 year |
| Analytics cookie (opt-in) | Usage analytics | 1 year |

You can manage cookie preferences in your browser settings or within the Wren application.

---

## 11. Children's Privacy

The Service is not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.

---

## 12. On-Premises Deployments

For on-premises deployments, CuveeBits acts as a **data processor** under your instruction. In this case:

- You (the Customer organisation) are the data controller
- You are responsible for providing a lawful basis for data processing
- You are responsible for informing your users about data processing
- A Data Processing Agreement (DPA) between CuveeBits and your organisation governs the processing

Please contact [legal@cuveebits.com] to obtain the standard DPA.

---

## 13. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-product notification at least 30 days before they take effect.

---

## 14. Contact

For privacy-related queries, requests, or complaints:

**CuveeBits s.r.o.**  
[Registered address]  
Czech Republic  
Email: [privacy@cuveebits.com]  

**Czech supervisory authority:**  
Úřad pro ochranu osobních údajů (ÚOOÚ)  
www.uoou.cz

---

*Document: wren-privacy-policy-v0.1.md | Status: DRAFT — not for public use*
