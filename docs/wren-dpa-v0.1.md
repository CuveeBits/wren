# Wren Data Processing Agreement (DPA)

**Version:** 0.1 (Draft — pending legal review)  
**Last updated:** March 2026

---

> ⚠️ **This is a pre-release draft for internal review and early design partner use only. It has not been reviewed by a qualified legal professional. Do not execute without legal sign-off.**

---

This Data Processing Agreement ("DPA") is entered into between:

**Data Controller:** [Customer Organisation Name], [Address] ("Controller")  
**Data Processor:** CuveeBits s.r.o., [Address], Czech Republic ("Processor")

This DPA supplements and forms part of the Wren Terms of Service between the parties and applies where CuveeBits processes personal data on behalf of the Controller in connection with an on-premises deployment of the Wren platform.

---

## 1. Definitions

- **"GDPR"** means Regulation (EU) 2016/679 (General Data Protection Regulation)
- **"Personal Data"**, **"Processing"**, **"Data Subject"**, **"Supervisory Authority"** have the meanings given in GDPR
- **"Sub-processor"** means any third party engaged by CuveeBits to process personal data under this DPA
- **"Security Incident"** means any accidental or unlawful destruction, loss, alteration, or unauthorised disclosure of personal data

---

## 2. Subject Matter and Nature of Processing

2.1 CuveeBits processes personal data solely to:
- Provide software updates, patches, and technical support for the on-premises Wren deployment
- Provide remote diagnostics when explicitly authorised by the Controller
- Comply with legal obligations

2.2 **CuveeBits does not have access to, and does not process, end-user data or Customer Content in a standard on-premises deployment.** Processing under this DPA is limited to any personal data shared by the Controller in the context of support and maintenance activities.

---

## 3. Categories of Data Subjects and Personal Data

| Category | Data Subjects | Personal Data |
|----------|--------------|---------------|
| Administrator contacts | Controller's IT/admin staff | Name, email, phone |
| Support contacts | Controller's designated contacts | Name, email, role |
| Diagnostic data (if shared) | As determined by Controller | As shared by Controller |

---

## 4. Processor Obligations

CuveeBits shall:

4.1 Process personal data only on documented instructions from the Controller, except where required to do so by EU or Member State law.

4.2 Ensure that persons authorised to process personal data are bound by confidentiality obligations.

4.3 Implement appropriate technical and organisational security measures as described in Annex A.

4.4 Not engage sub-processors without prior written authorisation from the Controller, except as set out in Annex B.

4.5 Assist the Controller in fulfilling obligations to respond to data subject requests.

4.6 Assist the Controller with security obligations, breach notifications, data protection impact assessments, and prior consultations.

4.7 Delete or return all personal data to the Controller upon termination of the agreement, at the Controller's choice, unless retention is required by law.

4.8 Make available all information necessary to demonstrate compliance with this DPA and allow for audits by the Controller or an auditor mandated by the Controller (with reasonable notice).

---

## 5. Controller Obligations

The Controller shall:

5.1 Ensure there is a lawful basis for processing personal data under GDPR before sharing any data with CuveeBits.

5.2 Inform data subjects about the processing as required by GDPR Articles 13 and 14.

5.3 Not instruct CuveeBits to process personal data in a manner that would violate GDPR or other applicable law.

---

## 6. Sub-processors

6.1 The Controller grants general authorisation to CuveeBits to engage the sub-processors listed in Annex B.

6.2 CuveeBits shall inform the Controller of any intended changes to sub-processors (additions or replacements) with at least 30 days' notice.

6.3 The Controller may object to a new sub-processor within 14 days. If the parties cannot resolve the objection, the Controller may terminate the agreement on written notice.

6.4 CuveeBits shall impose equivalent data protection obligations on all sub-processors.

---

## 7. Security Incidents

7.1 CuveeBits shall notify the Controller without undue delay, and in any case within 48 hours, after becoming aware of a Security Incident affecting personal data processed under this DPA.

7.2 The notification shall include, to the extent available: nature of the incident, categories and approximate number of data subjects and records affected, likely consequences, and measures taken or proposed.

---

## 8. International Transfers

8.1 CuveeBits shall not transfer personal data outside the EEA without the Controller's prior written consent, except where such transfer is based on an adequacy decision or appropriate safeguards (e.g., Standard Contractual Clauses).

---

## 9. Term and Termination

9.1 This DPA is effective for the duration of the Wren Terms of Service between the parties.

9.2 Upon termination, CuveeBits shall, at the Controller's election, delete or return all personal data within 30 days, unless retention is required by applicable law.

---

## 10. Governing Law

This DPA is governed by the laws of the Czech Republic. Disputes shall be resolved in accordance with the dispute resolution provisions of the Wren Terms of Service.

---

## Annex A — Technical and Organisational Security Measures

CuveeBits implements the following measures:

- **Access control:** Role-based access; principle of least privilege; MFA for administrative access
- **Encryption:** Data encrypted in transit (TLS 1.2+); encryption at rest for stored data
- **Logging and monitoring:** Access logs retained for security review
- **Vulnerability management:** Regular security updates and patch management
- **Incident response:** Documented incident response procedure
- **Employee training:** Regular data protection and security training
- **Physical security:** [As applicable to CuveeBits's offices and infrastructure]

---

## Annex B — Approved Sub-processors

| Sub-processor | Purpose | Location |
|--------------|---------|----------|
| [Cloud provider] | Infrastructure hosting (for SaaS support tooling) | EU |
| [Email provider] | Support communications | EU / SCCs |

*Sub-processors are only relevant where CuveeBits uses tooling to deliver support services. For pure on-premises deployments with no remote access, sub-processor involvement may be minimal or nil.*

---

## Signatures

**Controller:**

Organisation: _______________________________  
Name: _______________________________  
Title: _______________________________  
Date: _______________________________  
Signature: _______________________________

**Processor (CuveeBits s.r.o.):**

Name: _______________________________  
Title: _______________________________  
Date: _______________________________  
Signature: _______________________________

---

*Document: wren-dpa-v0.1.md | Status: DRAFT — not for public use without legal review*
