/**
 * Prompt Library seed data — Sprint 1.
 * ≥50 production-quality templates across ≥8 departments.
 */
import type { Prisma } from '@prisma/client'

type SeedPrompt = Omit<
  Prisma.PromptCreateInput,
  'id' | 'tenant' | 'createdAt' | 'updatedAt' | 'usageCount'
>

export const seedPrompts: SeedPrompt[] = [
  // ── HR & People (8) ──────────────────────────────────────────────────────

  {
    title: 'Write a Job Description',
    description: 'Generate a compelling, inclusive job description that attracts top candidates.',
    category: 'recruitment',
    department: 'hr',
    difficulty: 'beginner',
    estimatedMinutesSaved: 45,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['jobTitle', 'department', 'keyResponsibilities', 'requiredSkills'],
      properties: {
        jobTitle: { type: 'string', title: 'Job Title', 'x-placeholder': 'e.g. Senior Product Manager' },
        department: { type: 'string', title: 'Department', 'x-placeholder': 'e.g. Engineering' },
        keyResponsibilities: { type: 'string', title: 'Key Responsibilities', 'x-field-type': 'textarea', 'x-placeholder': 'List 4–6 main responsibilities', minLength: 50 },
        requiredSkills: { type: 'string', title: 'Required Skills', 'x-field-type': 'textarea', 'x-placeholder': 'List must-have skills and experience' },
        niceToHave: { type: 'string', title: 'Nice-to-Have Skills', 'x-field-type': 'textarea', 'x-placeholder': 'Optional: bonus qualifications' },
        employmentType: { type: 'string', title: 'Employment Type', 'x-field-type': 'select', enum: ['Full-time', 'Part-time', 'Contract', 'Freelance'], 'x-enum-labels': ['Full-time', 'Part-time', 'Contract', 'Freelance'] },
      },
    },
    promptTemplate: `Write a professional job description for the following role:

Job Title: {{jobTitle}}
Department: {{department}}
Employment Type: {{employmentType}}

Key Responsibilities:
{{keyResponsibilities}}

Required Skills & Experience:
{{requiredSkills}}

{{#if niceToHave}}
Nice-to-Have Skills:
{{niceToHave}}
{{/if}}

Format the job description with these sections:
1. About the Role (2–3 sentences describing the opportunity and impact)
2. What You'll Do (bulleted list of responsibilities)
3. What We're Looking For (bulleted list of requirements)
{{#if niceToHave}}4. Bonus Points (nice-to-have skills){{/if}}
5. Why Join Us (3 compelling reasons — keep these inspiring and authentic)

Use inclusive language. Avoid gendered pronouns. Keep the tone professional yet warm. Aim for 400–500 words total.`,
  },

  {
    title: 'Employee Performance Review',
    description: 'Draft a balanced, evidence-based performance review that motivates growth.',
    category: 'performance',
    department: 'hr',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 60,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['employeeName', 'role', 'reviewPeriod', 'achievements', 'areasForGrowth'],
      properties: {
        employeeName: { type: 'string', title: 'Employee Name', 'x-placeholder': 'First name or full name' },
        role: { type: 'string', title: 'Job Role', 'x-placeholder': 'e.g. Software Engineer' },
        reviewPeriod: { type: 'string', title: 'Review Period', 'x-placeholder': 'e.g. Q1 2026' },
        achievements: { type: 'string', title: 'Key Achievements', 'x-field-type': 'textarea', 'x-placeholder': 'List 3–5 specific accomplishments with context', minLength: 50 },
        areasForGrowth: { type: 'string', title: 'Areas for Development', 'x-field-type': 'textarea', 'x-placeholder': 'Skills or behaviours to develop' },
        overallRating: { type: 'string', title: 'Overall Rating', 'x-field-type': 'select', enum: ['Exceptional', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement'], 'x-enum-labels': ['Exceptional', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement'] },
      },
    },
    promptTemplate: `Write a professional performance review for {{reviewPeriod}}.

Employee: {{employeeName}}
Role: {{role}}
Overall Rating: {{overallRating}}

Key Achievements:
{{achievements}}

Areas for Development:
{{areasForGrowth}}

Structure the review as follows:
1. Opening Summary (2–3 sentences summarising overall performance)
2. Key Accomplishments (detailed, specific, impact-focused)
3. Core Competencies Assessment (communication, collaboration, delivery, initiative)
4. Development Areas (constructive, forward-looking, specific suggestions)
5. Goals for Next Period (3 SMART goals based on development areas)
6. Closing Statement (motivating, recognition of potential)

Tone: professional, balanced, constructive. Use specific evidence from the achievements. Avoid vague praise. Be honest about development areas while remaining encouraging.`,
  },

  {
    title: 'New Employee Onboarding Welcome Message',
    description: 'Create a warm, informative welcome message for new team members on their first day.',
    category: 'onboarding',
    department: 'hr',
    difficulty: 'beginner',
    estimatedMinutesSaved: 20,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['employeeName', 'role', 'startDate', 'managerName', 'teamName'],
      properties: {
        employeeName: { type: 'string', title: 'Employee Name', 'x-placeholder': 'First name' },
        role: { type: 'string', title: 'Job Role', 'x-placeholder': 'e.g. Marketing Manager' },
        startDate: { type: 'string', title: 'Start Date', 'x-field-type': 'date' },
        managerName: { type: 'string', title: 'Manager Name', 'x-placeholder': 'Direct manager first name' },
        teamName: { type: 'string', title: 'Team Name', 'x-placeholder': 'e.g. Growth Marketing' },
        firstWeekHighlight: { type: 'string', title: 'First Week Highlight', 'x-placeholder': 'e.g. team lunch on Wednesday, product demo on Thursday' },
      },
    },
    promptTemplate: `Write a warm and professional welcome message for a new employee joining the team.

Employee Name: {{employeeName}}
Role: {{role}}
Start Date: {{startDate}}
Manager: {{managerName}}
Team: {{teamName}}
{{#if firstWeekHighlight}}First Week Highlights: {{firstWeekHighlight}}{{/if}}

The message should:
- Be addressed directly to {{employeeName}}
- Express genuine excitement about them joining
- Briefly describe what makes the team special
- Mention what to expect in the first week
- Include practical first-day logistics (who to contact, where to start)
- End with an encouraging, energising close

Keep it warm, human, and concise (250–300 words). Avoid corporate jargon.`,
  },

  {
    title: 'HR Policy Summary',
    description: 'Transform a dense policy document into a clear, employee-friendly summary.',
    category: 'policy',
    department: 'hr',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 40,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['policyName', 'policyContent', 'audience'],
      properties: {
        policyName: { type: 'string', title: 'Policy Name', 'x-placeholder': 'e.g. Remote Work Policy' },
        policyContent: { type: 'string', title: 'Policy Content / Key Points', 'x-field-type': 'textarea', 'x-placeholder': 'Paste the policy text or key rules', minLength: 100 },
        audience: { type: 'string', title: 'Target Audience', 'x-placeholder': 'e.g. All employees, Managers only' },
        effectiveDate: { type: 'string', title: 'Effective Date', 'x-field-type': 'date' },
      },
    },
    promptTemplate: `Rewrite the following HR policy as a clear, friendly employee-facing summary.

Policy Name: {{policyName}}
Effective Date: {{effectiveDate}}
Audience: {{audience}}

Policy Content:
{{policyContent}}

Output format:
1. **What This Policy Covers** (1–2 sentences)
2. **Key Rules at a Glance** (5–8 bullet points, plain English)
3. **What This Means for You** (practical day-to-day impact)
4. **Common Questions** (3 FAQ-style Q&As anticipating employee questions)
5. **Who to Contact** (prompt for where to direct questions)

Style: friendly, plain English, no legalese. Use "you" and "your". Keep total length under 400 words.`,
  },

  {
    title: 'Exit Interview Summary',
    description: 'Synthesise exit interview notes into an actionable HR report.',
    category: 'offboarding',
    department: 'hr',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 35,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['employeeRole', 'tenureMonths', 'reasonsForLeaving', 'feedbackNotes'],
      properties: {
        employeeRole: { type: 'string', title: 'Employee Role', 'x-placeholder': 'e.g. Sales Executive' },
        tenureMonths: { type: 'number', title: 'Tenure (months)', minimum: 1 },
        reasonsForLeaving: { type: 'string', title: 'Primary Reason for Leaving', 'x-field-type': 'select', enum: ['Better opportunity', 'Compensation', 'Management', 'Culture', 'Work-life balance', 'Career growth', 'Relocation', 'Other'], 'x-enum-labels': ['Better opportunity', 'Compensation', 'Management', 'Culture', 'Work-life balance', 'Career growth', 'Relocation', 'Other'] },
        feedbackNotes: { type: 'string', title: 'Interview Notes', 'x-field-type': 'textarea', 'x-placeholder': 'Key points from the exit interview', minLength: 50 },
        positives: { type: 'string', title: 'What They Valued', 'x-field-type': 'textarea', 'x-placeholder': 'What the employee said they appreciated' },
      },
    },
    promptTemplate: `Write a concise HR exit interview summary report based on the following information.

Employee Role: {{employeeRole}}
Tenure: {{tenureMonths}} months
Primary Reason for Leaving: {{reasonsForLeaving}}

Interview Notes:
{{feedbackNotes}}

{{#if positives}}
What the Employee Valued:
{{positives}}
{{/if}}

Format the report as:
1. **Overview** (role, tenure, departure reason in 2 sentences)
2. **Key Themes** (3–5 themes with brief explanations)
3. **Positive Feedback** (what worked well)
4. **Areas of Concern** (issues raised — worded constructively for internal use)
5. **Recommended Actions** (3–5 specific, actionable HR recommendations)
6. **Retention Risk Score** (Low/Medium/High with brief justification)

Keep it factual, confidential in tone, and actionable.`,
  },

  {
    title: 'Training Needs Analysis',
    description: 'Create a structured training needs assessment for a team or department.',
    category: 'learning',
    department: 'hr',
    difficulty: 'advanced',
    estimatedMinutesSaved: 90,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['teamName', 'teamSize', 'businessGoals', 'currentSkillGaps'],
      properties: {
        teamName: { type: 'string', title: 'Team / Department', 'x-placeholder': 'e.g. Customer Success' },
        teamSize: { type: 'number', title: 'Team Size', minimum: 1 },
        businessGoals: { type: 'string', title: 'Business Goals (Next 12 months)', 'x-field-type': 'textarea', 'x-placeholder': 'Key objectives the team must achieve' },
        currentSkillGaps: { type: 'string', title: 'Current Skill Gaps', 'x-field-type': 'textarea', 'x-placeholder': 'Known gaps or areas of underperformance' },
        budget: { type: 'string', title: 'Training Budget (approx.)', 'x-placeholder': 'e.g. €5,000 per person' },
      },
    },
    promptTemplate: `Create a Training Needs Analysis (TNA) report for the following team.

Team: {{teamName}} ({{teamSize}} people)
Business Goals for Next 12 Months:
{{businessGoals}}

Current Skill Gaps:
{{currentSkillGaps}}

{{#if budget}}Training Budget: {{budget}}{{/if}}

Structure the TNA as:
1. **Executive Summary** (purpose and scope)
2. **Business Context** (why this training matters to company goals)
3. **Skills Gap Analysis** (current state vs required state, by skill area)
4. **Priority Training Areas** (ranked by business impact, 5–8 areas)
5. **Recommended Learning Interventions** (format, provider type, duration for each)
6. **Implementation Timeline** (phased 12-month roadmap)
7. **Success Metrics** (how to measure ROI)

Be specific and practical. Tie every recommendation back to a business goal.`,
  },

  {
    title: 'Recruitment Interview Question Set',
    description: 'Generate a structured interview guide with behavioural and technical questions.',
    category: 'recruitment',
    department: 'hr',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 30,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['jobTitle', 'coreCompetencies', 'technicalSkills'],
      properties: {
        jobTitle: { type: 'string', title: 'Job Title', 'x-placeholder': 'e.g. Data Analyst' },
        coreCompetencies: { type: 'string', title: 'Core Competencies to Assess', 'x-field-type': 'textarea', 'x-placeholder': 'e.g. communication, problem-solving, collaboration' },
        technicalSkills: { type: 'string', title: 'Technical Skills to Test', 'x-field-type': 'textarea', 'x-placeholder': 'e.g. SQL, Python, data visualisation' },
        seniorityLevel: { type: 'string', title: 'Seniority Level', 'x-field-type': 'select', enum: ['Junior', 'Mid-level', 'Senior', 'Lead', 'Director'], 'x-enum-labels': ['Junior', 'Mid-level', 'Senior', 'Lead', 'Director'] },
      },
    },
    promptTemplate: `Create a structured interview question guide for the following role.

Role: {{jobTitle}} ({{seniorityLevel}})
Core Competencies: {{coreCompetencies}}
Technical Skills: {{technicalSkills}}

Produce:
1. **Opening Questions** (2 warm-up questions to put the candidate at ease)
2. **Behavioural Questions** (6 STAR-format questions, one per competency listed)
   - Include follow-up probing questions for each
3. **Technical Questions** (4–5 questions testing the listed technical skills)
   - Include expected answer criteria
4. **Situational Questions** (2 scenario-based questions relevant to the role)
5. **Culture & Values Questions** (2 questions)
6. **Candidate Questions** (3 suggested questions the candidate might ask — and ideal answer indicators)

For each question, note the competency or skill being assessed.`,
  },

  {
    title: 'Employee Engagement Survey Analysis',
    description: 'Transform raw survey data into executive-ready insights and action recommendations.',
    category: 'engagement',
    department: 'hr',
    difficulty: 'advanced',
    estimatedMinutesSaved: 120,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['surveyName', 'responseCount', 'topScores', 'lowScores', 'openFeedbackThemes'],
      properties: {
        surveyName: { type: 'string', title: 'Survey Name', 'x-placeholder': 'e.g. Q1 2026 Engagement Pulse' },
        responseCount: { type: 'number', title: 'Number of Responses', minimum: 1 },
        topScores: { type: 'string', title: 'Highest-Scoring Areas', 'x-field-type': 'textarea', 'x-placeholder': 'Categories/questions with highest scores and scores' },
        lowScores: { type: 'string', title: 'Lowest-Scoring Areas', 'x-field-type': 'textarea', 'x-placeholder': 'Categories/questions with lowest scores and scores' },
        openFeedbackThemes: { type: 'string', title: 'Open Feedback Themes', 'x-field-type': 'textarea', 'x-placeholder': 'Key themes from free-text responses' },
      },
    },
    promptTemplate: `Analyse the following employee engagement survey results and produce an executive summary with action plan.

Survey: {{surveyName}}
Responses: {{responseCount}}

Highest-Scoring Areas:
{{topScores}}

Lowest-Scoring Areas:
{{lowScores}}

Open Feedback Themes:
{{openFeedbackThemes}}

Produce:
1. **Executive Summary** (3–4 sentences — overall engagement health, key headline)
2. **Strengths to Celebrate** (what's working well and why it matters)
3. **Priority Concerns** (ranked by severity and frequency)
4. **Root Cause Analysis** (likely drivers behind the low scores)
5. **30-60-90 Day Action Plan** (specific, owner-assignable actions for each concern)
6. **Communication Recommendation** (how to share results with the team transparently)

Use plain language suitable for a CEO and department heads.`,
  },

  // ── Sales & Business Dev (8) ──────────────────────────────────────────────

  {
    title: 'Cold Outreach Email',
    description: 'Write a personalised, high-converting cold email that gets replies.',
    category: 'outreach',
    department: 'sales',
    difficulty: 'beginner',
    estimatedMinutesSaved: 25,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['prospectName', 'prospectCompany', 'prospectRole', 'painPoint', 'yourSolution'],
      properties: {
        prospectName: { type: 'string', title: 'Prospect First Name', 'x-placeholder': 'e.g. Sarah' },
        prospectCompany: { type: 'string', title: 'Prospect Company', 'x-placeholder': 'e.g. Acme GmbH' },
        prospectRole: { type: 'string', title: 'Prospect Role', 'x-placeholder': 'e.g. Head of Operations' },
        painPoint: { type: 'string', title: 'Pain Point / Trigger', 'x-field-type': 'textarea', 'x-placeholder': 'What problem does this person likely have? Any trigger event?' },
        yourSolution: { type: 'string', title: 'Your Solution / Value Prop', 'x-placeholder': 'One sentence: what you do and the outcome you deliver' },
        socialProof: { type: 'string', title: 'Social Proof (optional)', 'x-placeholder': 'e.g. We helped Siemens reduce ops costs by 30%' },
      },
    },
    promptTemplate: `Write a cold outreach email that is personalised, concise, and focused on the prospect's problem — not your product.

Prospect: {{prospectName}}, {{prospectRole}} at {{prospectCompany}}
Their likely pain point: {{painPoint}}
Your solution: {{yourSolution}}
{{#if socialProof}}Social proof: {{socialProof}}{{/if}}

Requirements:
- Subject line: 6–8 words, curiosity-driven, no spam words
- Body: 4–6 sentences max
- Open with their world, not yours
- One specific insight or observation about their company/role
- Single, low-friction CTA (e.g. "Worth a 15-min call?")
- No attachments, no brochure language, no "I hope this email finds you well"
- Sign off naturally

Output:
Subject: [subject line]
Body: [email body]`,
  },

  {
    title: 'Sales Proposal Executive Summary',
    description: 'Write a compelling executive summary that gets your proposal to the top of the pile.',
    category: 'proposals',
    department: 'sales',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 60,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['clientName', 'clientChallenge', 'proposedSolution', 'expectedOutcomes', 'investmentRange'],
      properties: {
        clientName: { type: 'string', title: 'Client / Company Name', 'x-placeholder': 'e.g. Müller Logistics AG' },
        clientChallenge: { type: 'string', title: 'Client Challenge', 'x-field-type': 'textarea', 'x-placeholder': 'What problem are they trying to solve?' },
        proposedSolution: { type: 'string', title: 'Proposed Solution', 'x-field-type': 'textarea', 'x-placeholder': 'What you are proposing and how it works' },
        expectedOutcomes: { type: 'string', title: 'Expected Outcomes / ROI', 'x-field-type': 'textarea', 'x-placeholder': 'Quantified results they can expect (%, time, €)' },
        investmentRange: { type: 'string', title: 'Investment Range', 'x-placeholder': 'e.g. €25,000–€35,000' },
        timeline: { type: 'string', title: 'Delivery Timeline', 'x-placeholder': 'e.g. 3 months from contract signing' },
      },
    },
    promptTemplate: `Write a compelling executive summary for a sales proposal.

Client: {{clientName}}
Their Challenge: {{clientChallenge}}
Our Proposed Solution: {{proposedSolution}}
Expected Outcomes: {{expectedOutcomes}}
Investment: {{investmentRange}}
Timeline: {{timeline}}

Format:
1. **The Situation** (client's current challenge and its cost/impact — empathetic, factual)
2. **Our Recommendation** (clear, confident solution description)
3. **What You'll Achieve** (specific, quantified outcomes)
4. **Why Us** (2–3 differentiators — avoid generic claims)
5. **Investment & Timeline** (clear summary)
6. **Next Step** (single clear call to action)

Tone: consultative, confident, client-focused. Write in second person ("you", "your team"). Max 500 words.`,
  },

  {
    title: 'Follow-Up Email After Meeting',
    description: 'Send a professional follow-up that summarises the meeting and keeps momentum.',
    category: 'follow-up',
    department: 'sales',
    difficulty: 'beginner',
    estimatedMinutesSaved: 15,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['prospectName', 'meetingDate', 'keyDiscussionPoints', 'agreedNextSteps'],
      properties: {
        prospectName: { type: 'string', title: 'Prospect Name', 'x-placeholder': 'First name' },
        meetingDate: { type: 'string', title: 'Meeting Date', 'x-field-type': 'date' },
        keyDiscussionPoints: { type: 'string', title: 'Key Discussion Points', 'x-field-type': 'textarea', 'x-placeholder': 'Main topics covered and insights shared' },
        agreedNextSteps: { type: 'string', title: 'Agreed Next Steps', 'x-field-type': 'textarea', 'x-placeholder': 'What was agreed — who does what by when' },
        yourName: { type: 'string', title: 'Your Name', 'x-placeholder': 'Your first name' },
      },
    },
    promptTemplate: `Write a post-meeting follow-up email that is professional, concise, and action-oriented.

Prospect: {{prospectName}}
Meeting Date: {{meetingDate}}
Key Discussion Points: {{keyDiscussionPoints}}
Agreed Next Steps: {{agreedNextSteps}}
Sender: {{yourName}}

Requirements:
- Subject: references the meeting specifically (not "Following up")
- Thank briefly but not excessively
- Summarise 3–4 key takeaways (bullets)
- Clearly list next steps with owners and dates
- Reiterate one key value point naturally
- End with an open, warm close
- Max 200 words in the body

Output subject line and body separately.`,
  },

  {
    title: 'Objection Handling Script',
    description: 'Build a confident, empathetic response to common sales objections.',
    category: 'objection-handling',
    department: 'sales',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 30,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['objection', 'productService', 'keyDifferentiators'],
      properties: {
        objection: { type: 'string', title: 'The Objection', 'x-field-type': 'textarea', 'x-placeholder': 'e.g. "Your price is too high compared to competitors"' },
        productService: { type: 'string', title: 'Your Product / Service', 'x-placeholder': 'Brief description of what you sell' },
        keyDifferentiators: { type: 'string', title: 'Key Differentiators', 'x-field-type': 'textarea', 'x-placeholder': 'What makes you meaningfully different?' },
        proofPoints: { type: 'string', title: 'Proof Points / Evidence', 'x-placeholder': 'Customer wins, data, case studies' },
      },
    },
    promptTemplate: `Write an effective objection handling script for the following scenario.

Objection received: {{objection}}
Product/Service: {{productService}}
Our Key Differentiators: {{keyDifferentiators}}
{{#if proofPoints}}Supporting Evidence: {{proofPoints}}{{/if}}

Provide:
1. **Acknowledge** (1–2 sentences validating the concern without conceding the point)
2. **Clarify** (1 question to understand the root concern beneath the objection)
3. **Reframe** (shift perspective without dismissing their view)
4. **Respond** (direct, confident answer using differentiators and proof)
5. **Confirm Resolution** (closing question to check if the objection is resolved)
6. **Alternative Approach** (a second way to handle this if the first doesn't land)

Keep language natural and conversational — this should sound like a real sales conversation, not a script.`,
  },

  {
    title: 'Account Expansion Email',
    description: 'Craft a compelling upsell/cross-sell email to an existing customer.',
    category: 'account-management',
    department: 'sales',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 25,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['customerName', 'currentProduct', 'expansionOpportunity', 'businessCase'],
      properties: {
        customerName: { type: 'string', title: 'Customer Name / Contact', 'x-placeholder': 'e.g. Klaus at Bosch' },
        currentProduct: { type: 'string', title: 'Current Product / Plan', 'x-placeholder': 'What they already use' },
        expansionOpportunity: { type: 'string', title: 'Expansion Opportunity', 'x-placeholder': 'What you want to introduce them to' },
        businessCase: { type: 'string', title: 'Business Case for Them', 'x-field-type': 'textarea', 'x-placeholder': 'Why this is valuable for them specifically' },
        successHighlight: { type: 'string', title: 'Their Recent Success (optional)', 'x-placeholder': 'Something positive you can reference about their usage' },
      },
    },
    promptTemplate: `Write an expansion email to an existing customer.

Customer: {{customerName}}
Currently using: {{currentProduct}}
Expansion opportunity: {{expansionOpportunity}}
Business case: {{businessCase}}
{{#if successHighlight}}Recent success to reference: {{successHighlight}}{{/if}}

Requirements:
- Lead with their success/value they're already getting
- Introduce the expansion opportunity as a logical next step
- Make the business case specific to them
- Include a soft, consultative CTA
- Keep it under 180 words
- Tone: warm, trusted advisor — not a sales pitch

Output subject line and body.`,
  },

  {
    title: 'Sales Call Preparation Brief',
    description: 'Build a concise pre-call brief to walk in prepared and confident.',
    category: 'outreach',
    department: 'sales',
    difficulty: 'beginner',
    estimatedMinutesSaved: 20,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['prospectCompany', 'prospectRole', 'callObjective', 'knownContext'],
      properties: {
        prospectCompany: { type: 'string', title: 'Prospect Company', 'x-placeholder': 'Company name' },
        prospectRole: { type: 'string', title: 'Prospect Role', 'x-placeholder': 'e.g. CFO' },
        callObjective: { type: 'string', title: 'Call Objective', 'x-placeholder': 'What you want to achieve in this call' },
        knownContext: { type: 'string', title: 'What You Know About Them', 'x-field-type': 'textarea', 'x-placeholder': 'Company news, LinkedIn insights, past interactions' },
        productFocus: { type: 'string', title: 'Product / Solution Focus', 'x-placeholder': 'What product angle is most relevant' },
      },
    },
    promptTemplate: `Create a concise sales call preparation brief.

Company: {{prospectCompany}}
Contact Role: {{prospectRole}}
Call Objective: {{callObjective}}
Known Context: {{knownContext}}
Product Focus: {{productFocus}}

Brief format:
1. **Quick Company Snapshot** (3 key facts relevant to the call)
2. **Likely Priorities for This Role** (what a {{prospectRole}} typically cares about)
3. **Our Angle** (how {{productFocus}} maps to their probable needs)
4. **Opening Question** (1 powerful question to open the discovery)
5. **3 Discovery Questions** (to uncover pain and qualify)
6. **Potential Objections & Responses** (top 2 objections to anticipate)
7. **Success Criteria** (what does a successful call look like?)
8. **Next Step to Propose** (clear, low-friction)

Keep it scannable — this is a pre-call cheat sheet, not an essay.`,
  },

  {
    title: 'Win/Loss Analysis Report',
    description: 'Produce a structured win/loss analysis to sharpen your sales strategy.',
    category: 'analysis',
    department: 'sales',
    difficulty: 'advanced',
    estimatedMinutesSaved: 75,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['dealOutcome', 'dealSize', 'competitorsInvolved', 'decisionFactors', 'salesNotes'],
      properties: {
        dealOutcome: { type: 'string', title: 'Deal Outcome', 'x-field-type': 'select', enum: ['Won', 'Lost', 'No decision'], 'x-enum-labels': ['Won', 'Lost', 'No decision'] },
        dealSize: { type: 'string', title: 'Deal Size', 'x-placeholder': 'e.g. €120,000 ARR' },
        competitorsInvolved: { type: 'string', title: 'Competitors in Deal', 'x-placeholder': 'Competitors considered (if known)' },
        decisionFactors: { type: 'string', title: 'Stated Decision Factors', 'x-field-type': 'textarea', 'x-placeholder': 'What the buyer said influenced their decision' },
        salesNotes: { type: 'string', title: 'Sales Rep Notes', 'x-field-type': 'textarea', 'x-placeholder': 'Your observations on what happened and why' },
      },
    },
    promptTemplate: `Write a win/loss analysis report for the following deal.

Outcome: {{dealOutcome}}
Deal Size: {{dealSize}}
Competitors: {{competitorsInvolved}}
Buyer's Stated Decision Factors: {{decisionFactors}}
Sales Rep Notes: {{salesNotes}}

Report structure:
1. **Deal Summary** (outcome, size, key players in 3 sentences)
2. **What Drove the Outcome** (top 3–5 factors, distinguished between what we controlled vs didn't)
3. **Competitive Analysis** (how we compared to alternatives on key dimensions)
4. **Process Assessment** (where in the sales process did we perform well or poorly)
5. **Lessons Learned** (specific, actionable insights for future deals)
6. **Recommended Actions** (changes to messaging, process, or qualification criteria)

Be honest and specific. Good win/loss analyses are only useful if they're candid.`,
  },

  {
    title: 'LinkedIn Connection Request + Message',
    description: 'Write a personalised LinkedIn outreach message that gets accepted and replied to.',
    category: 'outreach',
    department: 'sales',
    difficulty: 'beginner',
    estimatedMinutesSaved: 15,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['prospectName', 'prospectRole', 'commonGround', 'reasonForConnecting'],
      properties: {
        prospectName: { type: 'string', title: 'Prospect First Name', 'x-placeholder': 'e.g. Maria' },
        prospectRole: { type: 'string', title: 'Their Role', 'x-placeholder': 'e.g. VP of Engineering' },
        commonGround: { type: 'string', title: 'Common Ground / Icebreaker', 'x-placeholder': 'Shared connection, group, article, or event' },
        reasonForConnecting: { type: 'string', title: 'Genuine Reason for Connecting', 'x-placeholder': 'Why you want to connect — keep it real' },
      },
    },
    promptTemplate: `Write a LinkedIn connection request message for the following prospect.

Prospect: {{prospectName}}, {{prospectRole}}
Common ground / icebreaker: {{commonGround}}
Reason for connecting: {{reasonForConnecting}}

Requirements:
- Max 300 characters (LinkedIn limit)
- Natural, not salesy
- Reference the common ground immediately
- Zero pitch in the connection request itself
- End with a genuine, open invitation to connect

Output the message only — no explanation.`,
  },

  // ── Finance (6) ───────────────────────────────────────────────────────────

  {
    title: 'Monthly Financial Variance Report',
    description: 'Draft a clear variance report narrative explaining budget deviations to stakeholders.',
    category: 'reporting',
    department: 'finance',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 60,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['reportMonth', 'revenueActual', 'revenueBudget', 'costActual', 'costBudget', 'keyVariances'],
      properties: {
        reportMonth: { type: 'string', title: 'Report Month/Period', 'x-placeholder': 'e.g. February 2026' },
        revenueActual: { type: 'string', title: 'Revenue Actual', 'x-placeholder': 'e.g. €2.4M' },
        revenueBudget: { type: 'string', title: 'Revenue Budget', 'x-placeholder': 'e.g. €2.6M' },
        costActual: { type: 'string', title: 'Total Costs Actual', 'x-placeholder': 'e.g. €1.8M' },
        costBudget: { type: 'string', title: 'Total Costs Budget', 'x-placeholder': 'e.g. €1.7M' },
        keyVariances: { type: 'string', title: 'Key Variances to Explain', 'x-field-type': 'textarea', 'x-placeholder': 'List the largest line-item variances and context' },
      },
    },
    promptTemplate: `Write a professional financial variance report narrative for the following period.

Period: {{reportMonth}}
Revenue: Actual {{revenueActual}} vs Budget {{revenueBudget}}
Costs: Actual {{costActual}} vs Budget {{costBudget}}

Key Variances:
{{keyVariances}}

Structure:
1. **Period Summary** (overall financial performance in 3 sentences — clear on whether it was good or bad news)
2. **Revenue Analysis** (performance vs budget, key drivers, trend context)
3. **Cost Analysis** (performance vs budget, significant variances explained)
4. **Key Variance Explanations** (each major variance with root cause and one-off vs recurring classification)
5. **Forecast Implications** (impact on full-year outlook)
6. **Management Actions** (steps being taken to address unfavourable variances)

Tone: factual, professional, clear. Use specific numbers. Avoid jargon. Suitable for CFO and board review.`,
  },

  {
    title: 'Budget Justification Memo',
    description: 'Write a persuasive budget request that secures approval from finance leadership.',
    category: 'budgeting',
    department: 'finance',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 45,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['requestorDept', 'budgetItem', 'requestedAmount', 'businessJustification', 'expectedReturn'],
      properties: {
        requestorDept: { type: 'string', title: 'Requesting Department', 'x-placeholder': 'e.g. Marketing' },
        budgetItem: { type: 'string', title: 'Budget Item', 'x-placeholder': 'e.g. CRM software upgrade' },
        requestedAmount: { type: 'string', title: 'Requested Amount', 'x-placeholder': 'e.g. €45,000' },
        businessJustification: { type: 'string', title: 'Business Justification', 'x-field-type': 'textarea', 'x-placeholder': 'Why this is needed and what problem it solves' },
        expectedReturn: { type: 'string', title: 'Expected Return / Benefit', 'x-field-type': 'textarea', 'x-placeholder': 'ROI, cost savings, revenue uplift, risk reduction' },
        alternatives: { type: 'string', title: 'Alternatives Considered', 'x-placeholder': 'Other options evaluated and why rejected' },
      },
    },
    promptTemplate: `Write a formal budget justification memo.

Requesting Department: {{requestorDept}}
Budget Item: {{budgetItem}}
Requested Amount: {{requestedAmount}}

Business Justification:
{{businessJustification}}

Expected Return / Benefits:
{{expectedReturn}}

Alternatives Considered: {{alternatives}}

Format as a formal memo with:
1. **Purpose** (what is being requested and for how much)
2. **Current Situation** (the problem or opportunity this addresses)
3. **Proposed Solution** (what the budget will fund and how)
4. **Financial Analysis** (cost breakdown, expected ROI, payback period)
5. **Risk of Inaction** (what happens if this isn't approved)
6. **Alternatives Considered** (and why this option is best)
7. **Recommendation** (clear ask for approval)

Tone: professional, fact-based, business-case-driven.`,
  },

  {
    title: 'Cash Flow Forecast Commentary',
    description: 'Write an executive narrative for the monthly cash flow forecast.',
    category: 'reporting',
    department: 'finance',
    difficulty: 'advanced',
    estimatedMinutesSaved: 50,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['period', 'openingBalance', 'closingBalance', 'cashInflows', 'cashOutflows', 'keyItems'],
      properties: {
        period: { type: 'string', title: 'Forecast Period', 'x-placeholder': 'e.g. Q2 2026' },
        openingBalance: { type: 'string', title: 'Opening Cash Balance', 'x-placeholder': 'e.g. €3.2M' },
        closingBalance: { type: 'string', title: 'Projected Closing Balance', 'x-placeholder': 'e.g. €2.8M' },
        cashInflows: { type: 'string', title: 'Major Cash Inflows', 'x-field-type': 'textarea', 'x-placeholder': 'Key sources and amounts' },
        cashOutflows: { type: 'string', title: 'Major Cash Outflows', 'x-field-type': 'textarea', 'x-placeholder': 'Key uses and amounts' },
        keyItems: { type: 'string', title: 'Key Items to Highlight', 'x-field-type': 'textarea', 'x-placeholder': 'Significant movements, risks, or one-off items' },
      },
    },
    promptTemplate: `Write an executive cash flow forecast commentary.

Period: {{period}}
Opening Balance: {{openingBalance}}
Projected Closing Balance: {{closingBalance}}

Major Inflows:
{{cashInflows}}

Major Outflows:
{{cashOutflows}}

Key Items:
{{keyItems}}

Commentary sections:
1. **Summary** (net cash movement and what it means for the business)
2. **Inflows Analysis** (key revenue sources, collection performance, timing)
3. **Outflows Analysis** (major expenditure items and drivers)
4. **Liquidity Position** (adequacy of cash reserves, headroom vs covenants if applicable)
5. **Key Risks** (items that could cause cash to deviate from forecast)
6. **Management Actions** (steps to optimise cash position)

Be specific, numerical, and direct. Suitable for CFO, board, and banking relationships.`,
  },

  {
    title: 'Cost Reduction Proposal',
    description: 'Build a structured cost reduction proposal with implementation roadmap.',
    category: 'cost-management',
    department: 'finance',
    difficulty: 'advanced',
    estimatedMinutesSaved: 90,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['targetDept', 'currentCostBase', 'reductionTarget', 'identifiedOpportunities'],
      properties: {
        targetDept: { type: 'string', title: 'Target Department / Area', 'x-placeholder': 'e.g. IT Infrastructure' },
        currentCostBase: { type: 'string', title: 'Current Annual Cost', 'x-placeholder': 'e.g. €2.1M per year' },
        reductionTarget: { type: 'string', title: 'Reduction Target', 'x-placeholder': 'e.g. 20% (€420,000)' },
        identifiedOpportunities: { type: 'string', title: 'Identified Opportunities', 'x-field-type': 'textarea', 'x-placeholder': 'Potential areas to cut or optimise' },
        constraints: { type: 'string', title: 'Constraints / Non-Negotiables', 'x-placeholder': 'What cannot be cut (service levels, compliance, etc.)' },
      },
    },
    promptTemplate: `Write a cost reduction proposal document.

Area: {{targetDept}}
Current Annual Cost Base: {{currentCostBase}}
Reduction Target: {{reductionTarget}}

Identified Opportunities:
{{identifiedOpportunities}}

Constraints: {{constraints}}

Document structure:
1. **Executive Summary** (objective, target saving, approach)
2. **Current State Analysis** (cost breakdown and key drivers)
3. **Reduction Opportunities** (each opportunity with: description, estimated saving, implementation effort, risk)
4. **Prioritisation Matrix** (rank by savings potential vs implementation risk)
5. **Implementation Roadmap** (phased 12-month plan with milestones)
6. **Risk & Mitigation** (top risks and how to manage them)
7. **Expected Outcomes** (financial and operational benefits)

Be realistic about savings — avoid optimistic assumptions without evidence.`,
  },

  {
    title: 'Finance Business Partner Update',
    description: 'Write a monthly business partner update for operational departments.',
    category: 'reporting',
    department: 'finance',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 35,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['department', 'period', 'budgetStatus', 'keyHighlights', 'actionsRequired'],
      properties: {
        department: { type: 'string', title: 'Department', 'x-placeholder': 'e.g. Customer Success' },
        period: { type: 'string', title: 'Period', 'x-placeholder': 'e.g. March 2026' },
        budgetStatus: { type: 'string', title: 'Budget Status', 'x-field-type': 'select', enum: ['On track', 'Slightly over', 'Significantly over', 'Underspend'], 'x-enum-labels': ['On track', 'Slightly over', 'Significantly over', 'Underspend'] },
        keyHighlights: { type: 'string', title: 'Key Financial Highlights', 'x-field-type': 'textarea', 'x-placeholder': 'Main financial movements and context' },
        actionsRequired: { type: 'string', title: 'Actions Required from Department', 'x-field-type': 'textarea', 'x-placeholder': 'What you need from the department head' },
      },
    },
    promptTemplate: `Write a monthly finance business partner update for the following department.

Department: {{department}}
Period: {{period}}
Budget Status: {{budgetStatus}}

Key Highlights:
{{keyHighlights}}

Actions Required from Department:
{{actionsRequired}}

Format:
1. **At a Glance** (budget status, key number, RAG rating)
2. **Month Highlights** (3–5 bullets on what happened financially)
3. **Areas of Focus** (what to watch in the coming month)
4. **Actions Required** (clear asks from the department, with deadlines)
5. **Support Available** (what finance can help with)

Tone: collaborative, plain English, not intimidating. The goal is to partner with the department, not audit them.`,
  },

  {
    title: 'Investment Case Summary',
    description: 'Summarise an investment opportunity for executive decision-making.',
    category: 'investment',
    department: 'finance',
    difficulty: 'advanced',
    estimatedMinutesSaved: 80,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['investmentName', 'investmentAmount', 'strategicRationale', 'financialCase', 'risks'],
      properties: {
        investmentName: { type: 'string', title: 'Investment Name', 'x-placeholder': 'e.g. Acquisition of TechCo GmbH' },
        investmentAmount: { type: 'string', title: 'Investment Amount', 'x-placeholder': 'e.g. €5M total investment' },
        strategicRationale: { type: 'string', title: 'Strategic Rationale', 'x-field-type': 'textarea', 'x-placeholder': 'Why this investment, why now, how it fits strategy' },
        financialCase: { type: 'string', title: 'Financial Case', 'x-field-type': 'textarea', 'x-placeholder': 'IRR, payback period, NPV, revenue impact' },
        risks: { type: 'string', title: 'Key Risks', 'x-field-type': 'textarea', 'x-placeholder': 'Top risks and mitigations' },
      },
    },
    promptTemplate: `Write an investment case summary for executive review.

Investment: {{investmentName}}
Total Investment: {{investmentAmount}}

Strategic Rationale:
{{strategicRationale}}

Financial Case:
{{financialCase}}

Key Risks:
{{risks}}

Structure:
1. **Recommendation** (clear: approve / approve with conditions / decline)
2. **Investment Overview** (what, how much, timeline)
3. **Strategic Fit** (how this advances company strategy)
4. **Financial Analysis** (returns, payback, sensitivity)
5. **Key Assumptions** (critical assumptions the case depends on)
6. **Risk Assessment** (top 5 risks, likelihood, impact, mitigation)
7. **Alternatives Considered** (do nothing, alternatives, why this option wins)
8. **Decision Required** (specific approval being sought)

Suitable for board/ExCo presentation. Be direct and objective.`,
  },

  // ── Legal & Compliance (6) ────────────────────────────────────────────────

  {
    title: 'Contract Review Summary',
    description: 'Summarise a contract into key terms, obligations, and risks for non-legal stakeholders.',
    category: 'contract-review',
    department: 'legal',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 75,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['contractType', 'parties', 'contractTerms', 'keyObligations'],
      properties: {
        contractType: { type: 'string', title: 'Contract Type', 'x-placeholder': 'e.g. SaaS Subscription Agreement, NDA, Employment Contract' },
        parties: { type: 'string', title: 'Parties Involved', 'x-placeholder': 'e.g. Wren GmbH (vendor) and Acme AG (customer)' },
        contractTerms: { type: 'string', title: 'Key Contract Terms', 'x-field-type': 'textarea', 'x-placeholder': 'Paste or summarise the main terms, duration, fees, etc.', minLength: 100 },
        keyObligations: { type: 'string', title: 'Key Obligations', 'x-field-type': 'textarea', 'x-placeholder': 'Main obligations of each party' },
      },
    },
    promptTemplate: `Summarise the following contract for a non-legal business audience.

Contract Type: {{contractType}}
Parties: {{parties}}

Contract Terms:
{{contractTerms}}

Key Obligations:
{{keyObligations}}

Produce a plain-English summary with:
1. **Contract Overview** (what it is, who it's between, duration, value)
2. **Key Terms at a Glance** (10 bullet points — most important commercial terms)
3. **Our Obligations** (what we must do — clear, actionable)
4. **Counterparty Obligations** (what the other party must do)
5. **Risk Flags** (unusual clauses, unfavourable terms, areas for negotiation — highlight in plain language)
6. **Expiry & Renewal** (when it expires, auto-renewal terms, notice periods)
7. **Recommended Actions** (any terms that should be negotiated or escalated)

Note: This is a summary for business purposes only, not legal advice.`,
  },

  {
    title: 'GDPR Data Processing Register Entry',
    description: 'Document a new data processing activity for your GDPR Article 30 register.',
    category: 'data-protection',
    department: 'legal',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 40,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['processingActivity', 'dataController', 'purposeOfProcessing', 'dataCategories', 'dataSubjects', 'retentionPeriod'],
      properties: {
        processingActivity: { type: 'string', title: 'Processing Activity Name', 'x-placeholder': 'e.g. Employee Performance Management' },
        dataController: { type: 'string', title: 'Data Controller', 'x-placeholder': 'Your company name and registered address' },
        purposeOfProcessing: { type: 'string', title: 'Purpose of Processing', 'x-field-type': 'textarea', 'x-placeholder': 'Why you process this data' },
        dataCategories: { type: 'string', title: 'Categories of Personal Data', 'x-field-type': 'textarea', 'x-placeholder': 'Types of data processed (e.g. name, email, performance scores)' },
        dataSubjects: { type: 'string', title: 'Categories of Data Subjects', 'x-placeholder': 'e.g. Employees, Customers, Website visitors' },
        retentionPeriod: { type: 'string', title: 'Retention Period', 'x-placeholder': 'How long data is kept and why' },
      },
    },
    promptTemplate: `Create a GDPR Article 30 Record of Processing Activity (RoPA) entry.

Processing Activity: {{processingActivity}}
Data Controller: {{dataController}}
Purpose: {{purposeOfProcessing}}
Data Categories: {{dataCategories}}
Data Subjects: {{dataSubjects}}
Retention Period: {{retentionPeriod}}

Format as a structured RoPA entry covering:
1. **Activity Name & Description**
2. **Controller Details** (name, contact, DPO if applicable)
3. **Purposes & Legal Basis** (identify the appropriate GDPR Article 6 / Article 9 legal basis)
4. **Categories of Data Subjects**
5. **Categories of Personal Data**
6. **Recipients / Third-Party Processors** (prompt to identify)
7. **International Transfers** (if applicable)
8. **Retention Schedule**
9. **Security Measures** (technical and organisational)
10. **Risk Level** (Low/Medium/High with brief rationale)

Flag any processing that may require a DPIA.`,
  },

  {
    title: 'Supplier Risk Assessment',
    description: 'Conduct a structured risk assessment of a new supplier for compliance approval.',
    category: 'risk-assessment',
    department: 'legal',
    difficulty: 'advanced',
    estimatedMinutesSaved: 90,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['supplierName', 'supplierCountry', 'servicesProvided', 'dataAccess', 'contractValue'],
      properties: {
        supplierName: { type: 'string', title: 'Supplier Name', 'x-placeholder': 'e.g. CloudTech Solutions' },
        supplierCountry: { type: 'string', title: 'Supplier Country', 'x-placeholder': 'e.g. Germany, USA, India' },
        servicesProvided: { type: 'string', title: 'Services Provided', 'x-field-type': 'textarea', 'x-placeholder': 'What the supplier will do for you' },
        dataAccess: { type: 'string', title: 'Data Access Level', 'x-field-type': 'select', enum: ['No personal data', 'Limited anonymised data', 'Personal data', 'Sensitive personal data', 'Critical business data'], 'x-enum-labels': ['No personal data', 'Limited anonymised data', 'Personal data', 'Sensitive personal data', 'Critical business data'] },
        contractValue: { type: 'string', title: 'Annual Contract Value', 'x-placeholder': 'e.g. €50,000' },
      },
    },
    promptTemplate: `Conduct a supplier risk assessment for procurement and legal approval.

Supplier: {{supplierName}}
Country: {{supplierCountry}}
Services: {{servicesProvided}}
Data Access: {{dataAccess}}
Contract Value: {{contractValue}}

Assessment structure:
1. **Supplier Overview** (who they are and what they provide)
2. **Risk Category** (Critical/High/Medium/Low — based on data access, contract value, services)
3. **Financial Risk** (considerations for supplier financial stability)
4. **Data & Privacy Risk** (GDPR implications of data access level, transfer mechanisms needed for non-EU)
5. **Information Security Risk** (what security assurances are needed)
6. **Operational Risk** (dependency, single points of failure, business continuity)
7. **Reputational & Compliance Risk** (sanctions screening, ESG considerations)
8. **Required Due Diligence** (specific documents and certifications to request)
9. **Contract Requirements** (key clauses to include based on risk level)
10. **Approval Recommendation** (approve, approve with conditions, or escalate)`,
  },

  {
    title: 'Privacy Policy Section Drafter',
    description: 'Draft a clear, GDPR-compliant section for your company privacy policy.',
    category: 'data-protection',
    department: 'legal',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 50,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['sectionTopic', 'dataProcessed', 'purposeAndLegalBasis', 'companyName'],
      properties: {
        sectionTopic: { type: 'string', title: 'Section Topic', 'x-placeholder': 'e.g. How we use cookies, How long we keep your data' },
        dataProcessed: { type: 'string', title: 'Data Processed', 'x-field-type': 'textarea', 'x-placeholder': 'What personal data this section covers' },
        purposeAndLegalBasis: { type: 'string', title: 'Purpose & Legal Basis', 'x-field-type': 'textarea', 'x-placeholder': 'Why you process it and under which GDPR legal basis' },
        companyName: { type: 'string', title: 'Company Name', 'x-placeholder': 'Your company name' },
        jurisdiction: { type: 'string', title: 'Primary Jurisdiction', 'x-placeholder': 'e.g. EU/EEA, UK, Switzerland' },
      },
    },
    promptTemplate: `Draft a privacy policy section that is GDPR-compliant, readable, and legally sound.

Company: {{companyName}}
Jurisdiction: {{jurisdiction}}
Section Topic: {{sectionTopic}}
Data Processed: {{dataProcessed}}
Purpose & Legal Basis: {{purposeAndLegalBasis}}

Requirements:
- Plain English — readable by a non-expert
- GDPR-compliant structure (who, what, why, legal basis, how long, rights)
- Include required transparency information
- Avoid legalese while remaining legally accurate
- Reference data subject rights appropriately
- Include contact details placeholder for DPO/privacy team

Draft the section in full, suitable for inclusion in a published privacy policy.
Add a note at the end flagging anything that needs legal review before publication.`,
  },

  {
    title: 'Compliance Incident Report',
    description: 'Document a compliance or data breach incident with root cause and corrective actions.',
    category: 'incident-management',
    department: 'legal',
    difficulty: 'advanced',
    estimatedMinutesSaved: 60,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['incidentType', 'discoveryDate', 'incidentDescription', 'affectedData', 'immediateActions'],
      properties: {
        incidentType: { type: 'string', title: 'Incident Type', 'x-field-type': 'select', enum: ['Data breach', 'Policy violation', 'Regulatory non-compliance', 'Third-party incident', 'Other'], 'x-enum-labels': ['Data breach', 'Policy violation', 'Regulatory non-compliance', 'Third-party incident', 'Other'] },
        discoveryDate: { type: 'string', title: 'Discovery Date', 'x-field-type': 'date' },
        incidentDescription: { type: 'string', title: 'Incident Description', 'x-field-type': 'textarea', 'x-placeholder': 'What happened, when, and how it was discovered', minLength: 50 },
        affectedData: { type: 'string', title: 'Affected Data / Systems', 'x-field-type': 'textarea', 'x-placeholder': 'What data or systems were affected and how many people' },
        immediateActions: { type: 'string', title: 'Immediate Actions Taken', 'x-field-type': 'textarea', 'x-placeholder': 'Steps already taken to contain the incident' },
      },
    },
    promptTemplate: `Write a formal compliance incident report.

Incident Type: {{incidentType}}
Discovery Date: {{discoveryDate}}

Incident Description:
{{incidentDescription}}

Affected Data / Systems:
{{affectedData}}

Immediate Actions Taken:
{{immediateActions}}

Report structure:
1. **Incident Summary** (type, date, brief description — suitable for executive briefing)
2. **Timeline of Events** (chronological sequence from occurrence to discovery to response)
3. **Scope & Impact** (data affected, number of individuals, systems compromised)
4. **Root Cause Analysis** (why it happened — direct and contributing causes)
5. **Immediate Response Actions** (what was done and when)
6. **Regulatory Notification Assessment** (GDPR 72-hour rule, supervisory authority notification requirements)
7. **Corrective Action Plan** (short-term fixes and long-term preventive measures)
8. **Lessons Learned** (systemic changes to prevent recurrence)

Note: for data breaches, flag whether regulatory notification is required within 72 hours.`,
  },

  {
    title: 'Vendor NDA Review Checklist',
    description: 'Generate a review checklist for evaluating a vendor-proposed NDA.',
    category: 'contract-review',
    department: 'legal',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 30,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['vendorName', 'ndaType', 'ourRole', 'informationToShare'],
      properties: {
        vendorName: { type: 'string', title: 'Vendor / Counterparty', 'x-placeholder': 'e.g. TechCorp GmbH' },
        ndaType: { type: 'string', title: 'NDA Type', 'x-field-type': 'select', enum: ['Mutual', 'One-way (we disclose)', 'One-way (they disclose)'], 'x-enum-labels': ['Mutual', 'One-way (we disclose)', 'One-way (they disclose)'] },
        ourRole: { type: 'string', title: 'Our Role', 'x-placeholder': 'e.g. Potential customer evaluating vendor software' },
        informationToShare: { type: 'string', title: 'Information to Be Shared', 'x-placeholder': 'What confidential information will be exchanged' },
      },
    },
    promptTemplate: `Create a review checklist for evaluating a vendor-proposed NDA.

Vendor: {{vendorName}}
NDA Type: {{ndaType}}
Our Role: {{ourRole}}
Information to be exchanged: {{informationToShare}}

Provide a structured review checklist covering:
1. **Parties & Scope** (correct legal entities, scope of confidential information defined clearly)
2. **Obligations** (appropriate obligations on each party, carve-outs for known information)
3. **Standard Exclusions** (publicly available, independently developed, already known, required by law)
4. **Duration** (NDA term and survival of obligations after expiry)
5. **Use Restrictions** (information can only be used for the specified purpose)
6. **Return / Destruction** (what happens to confidential info if deal doesn't proceed)
7. **Governing Law & Jurisdiction** (appropriate for our location)
8. **Red Flags to Watch** (unusual or unfavourable clauses)
9. **Missing Standard Clauses** (what a well-drafted NDA should include)
10. **Negotiation Points** (suggested changes with business rationale)

Format as a checklist with Yes/No/Review fields for each item.`,
  },

  // ── Operations (6) ────────────────────────────────────────────────────────

  {
    title: 'Standard Operating Procedure (SOP)',
    description: 'Document a business process as a clear, step-by-step SOP.',
    category: 'process-documentation',
    department: 'operations',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 75,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['processName', 'processOwner', 'processSteps', 'tools'],
      properties: {
        processName: { type: 'string', title: 'Process Name', 'x-placeholder': 'e.g. Customer Onboarding Process' },
        processOwner: { type: 'string', title: 'Process Owner / Department', 'x-placeholder': 'e.g. Customer Success team' },
        processSteps: { type: 'string', title: 'Process Steps', 'x-field-type': 'textarea', 'x-placeholder': 'Describe the steps in order, including who does what', minLength: 100 },
        tools: { type: 'string', title: 'Tools / Systems Used', 'x-placeholder': 'e.g. Salesforce, Slack, email' },
        exceptions: { type: 'string', title: 'Common Exceptions / Edge Cases', 'x-placeholder': 'How to handle non-standard situations' },
      },
    },
    promptTemplate: `Write a Standard Operating Procedure (SOP) document for the following process.

Process Name: {{processName}}
Process Owner: {{processOwner}}
Tools Used: {{tools}}

Process Steps:
{{processSteps}}

{{#if exceptions}}Common Exceptions: {{exceptions}}{{/if}}

SOP format:
1. **Purpose** (why this process exists)
2. **Scope** (who this applies to, when it applies)
3. **Roles & Responsibilities** (RACI — who is Responsible, Accountable, Consulted, Informed)
4. **Prerequisites** (what must be in place before starting)
5. **Step-by-Step Procedure** (numbered steps with sub-steps, decision points, and tool references)
6. **Exception Handling** (how to handle edge cases or failures)
7. **Quality Checks** (how to verify the process was completed correctly)
8. **Related Documents** (placeholder for linked SOPs or policies)
9. **Revision History** (table for version tracking)

Write at reading level suitable for a new employee on their first week.`,
  },

  {
    title: 'SLA Report Narrative',
    description: 'Write the narrative commentary for a Service Level Agreement performance report.',
    category: 'reporting',
    department: 'operations',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 40,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['reportPeriod', 'slaMetrics', 'breaches', 'rootCauses'],
      properties: {
        reportPeriod: { type: 'string', title: 'Report Period', 'x-placeholder': 'e.g. March 2026' },
        slaMetrics: { type: 'string', title: 'SLA Metrics Performance', 'x-field-type': 'textarea', 'x-placeholder': 'Each metric: target, actual, RAG status' },
        breaches: { type: 'string', title: 'SLA Breaches', 'x-field-type': 'textarea', 'x-placeholder': 'Any breaches: what, when, impact' },
        rootCauses: { type: 'string', title: 'Root Causes', 'x-field-type': 'textarea', 'x-placeholder': 'What caused any underperformance' },
        improvementActions: { type: 'string', title: 'Improvement Actions', 'x-placeholder': 'Steps being taken to improve performance' },
      },
    },
    promptTemplate: `Write the narrative commentary for an SLA performance report.

Period: {{reportPeriod}}

SLA Metrics Performance:
{{slaMetrics}}

Breaches This Period:
{{breaches}}

Root Causes:
{{rootCauses}}

Improvement Actions: {{improvementActions}}

Narrative structure:
1. **Period Summary** (overall SLA health, headline performance)
2. **Metrics Performance** (each metric with context, trend, and explanation)
3. **Breach Analysis** (detailed account of any breaches — factual, not defensive)
4. **Root Cause Summary** (underlying drivers)
5. **Remediation Actions** (what's being done and expected resolution dates)
6. **Trend & Outlook** (month-over-month trend, forecast for next period)
7. **Client Communication Recommendation** (if client-facing: suggested message to send)

Tone: professional, accountable, solution-focused. Don't hide problems — address them directly.`,
  },

  {
    title: 'Incident Post-Mortem Report',
    description: 'Document an operational incident with timeline, root cause, and corrective actions.',
    category: 'incident-management',
    department: 'operations',
    difficulty: 'advanced',
    estimatedMinutesSaved: 80,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['incidentName', 'incidentDate', 'duration', 'impact', 'timeline', 'rootCause'],
      properties: {
        incidentName: { type: 'string', title: 'Incident Name', 'x-placeholder': 'e.g. Database Outage — 14 March 2026' },
        incidentDate: { type: 'string', title: 'Incident Date', 'x-field-type': 'date' },
        duration: { type: 'string', title: 'Duration', 'x-placeholder': 'e.g. 2 hours 14 minutes' },
        impact: { type: 'string', title: 'Business Impact', 'x-field-type': 'textarea', 'x-placeholder': 'Who was affected, how severely, estimated cost' },
        timeline: { type: 'string', title: 'Incident Timeline', 'x-field-type': 'textarea', 'x-placeholder': 'Chronological events from first detection to resolution' },
        rootCause: { type: 'string', title: 'Root Cause', 'x-field-type': 'textarea', 'x-placeholder': 'What caused the incident' },
      },
    },
    promptTemplate: `Write a blameless post-mortem report for the following operational incident.

Incident: {{incidentName}}
Date: {{incidentDate}}
Duration: {{duration}}

Business Impact:
{{impact}}

Timeline of Events:
{{timeline}}

Root Cause:
{{rootCause}}

Post-mortem structure:
1. **Incident Summary** (one paragraph suitable for executive briefing)
2. **Impact Assessment** (who was affected, for how long, business cost)
3. **Timeline** (detailed chronological sequence — detection, escalation, diagnosis, resolution)
4. **Root Cause Analysis** (5 Whys or similar structured analysis)
5. **Contributing Factors** (conditions that made the incident more likely or severe)
6. **What Went Well** (response actions that worked)
7. **What Could Be Improved** (without blame — focus on systems and processes)
8. **Action Items** (specific, time-bound improvements with owners)
9. **Prevention Strategy** (how to prevent recurrence)

Blameless tone: focus on systems, not individuals. This should be safe to share with the whole team.`,
  },

  {
    title: 'Vendor Performance Review',
    description: 'Evaluate a vendor\'s performance against agreed KPIs and contract terms.',
    category: 'vendor-management',
    department: 'operations',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 50,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['vendorName', 'serviceProvided', 'reviewPeriod', 'kpiPerformance', 'issues'],
      properties: {
        vendorName: { type: 'string', title: 'Vendor Name', 'x-placeholder': 'e.g. FastShip Logistics' },
        serviceProvided: { type: 'string', title: 'Service Provided', 'x-placeholder': 'e.g. Last-mile delivery' },
        reviewPeriod: { type: 'string', title: 'Review Period', 'x-placeholder': 'e.g. Q1 2026' },
        kpiPerformance: { type: 'string', title: 'KPI Performance', 'x-field-type': 'textarea', 'x-placeholder': 'Each KPI: target, actual, and RAG' },
        issues: { type: 'string', title: 'Issues / Incidents', 'x-field-type': 'textarea', 'x-placeholder': 'Any service failures, escalations, or concerns' },
      },
    },
    promptTemplate: `Write a vendor performance review report.

Vendor: {{vendorName}}
Service: {{serviceProvided}}
Period: {{reviewPeriod}}

KPI Performance:
{{kpiPerformance}}

Issues / Incidents:
{{issues}}

Report structure:
1. **Executive Summary** (overall performance rating: Excellent/Good/Acceptable/Unacceptable)
2. **KPI Scorecard** (each KPI with target, actual, status, and trend)
3. **Strengths** (what the vendor has done well)
4. **Areas for Improvement** (specific, evidence-based concerns)
5. **Incident Review** (any service failures or escalations with impact)
6. **Contractual Compliance** (compliance with SLAs, pricing, and obligations)
7. **Relationship Health** (communication, responsiveness, proactivity)
8. **Recommendations** (continue/improve/put on notice/exit)
9. **Action Plan** (agreed actions with vendor for next period)`,
  },

  {
    title: 'Business Continuity Plan Section',
    description: 'Draft a business continuity plan section for a critical business process.',
    category: 'risk-management',
    department: 'operations',
    difficulty: 'advanced',
    estimatedMinutesSaved: 100,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['processName', 'criticalityLevel', 'recoveryTimeObjective', 'disruptionScenarios', 'recoverySteps'],
      properties: {
        processName: { type: 'string', title: 'Business Process Name', 'x-placeholder': 'e.g. Order Processing' },
        criticalityLevel: { type: 'string', title: 'Criticality', 'x-field-type': 'select', enum: ['Mission Critical', 'High', 'Medium', 'Low'], 'x-enum-labels': ['Mission Critical', 'High', 'Medium', 'Low'] },
        recoveryTimeObjective: { type: 'string', title: 'Recovery Time Objective (RTO)', 'x-placeholder': 'e.g. 4 hours' },
        disruptionScenarios: { type: 'string', title: 'Disruption Scenarios', 'x-field-type': 'textarea', 'x-placeholder': 'What could disrupt this process (power, system, people, etc.)' },
        recoverySteps: { type: 'string', title: 'Recovery Steps', 'x-field-type': 'textarea', 'x-placeholder': 'How to recover and who does what' },
      },
    },
    promptTemplate: `Write a Business Continuity Plan (BCP) section for the following process.

Process: {{processName}}
Criticality: {{criticalityLevel}}
Recovery Time Objective (RTO): {{recoveryTimeObjective}}

Disruption Scenarios:
{{disruptionScenarios}}

Recovery Steps:
{{recoverySteps}}

BCP section structure:
1. **Process Overview** (what it does, who depends on it, business impact if unavailable)
2. **Criticality & Recovery Objectives** (RTO, RPO — Recovery Point Objective)
3. **Threat Assessment** (likely disruption scenarios and probability/impact)
4. **Dependencies** (people, systems, suppliers, facilities required)
5. **Recovery Procedures** (step-by-step for each disruption scenario)
6. **Roles & Responsibilities** (who leads recovery, backup contacts)
7. **Communication Plan** (who to notify, when, and how)
8. **Testing Schedule** (how and when to test this plan)
9. **Plan Owner & Review Date**

Write in a clear, actionable format that works under pressure.`,
  },

  {
    title: 'Operational Efficiency Improvement Proposal',
    description: 'Propose specific efficiency improvements to a business process with ROI analysis.',
    category: 'process-improvement',
    department: 'operations',
    difficulty: 'advanced',
    estimatedMinutesSaved: 90,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['processName', 'currentState', 'painPoints', 'proposedChanges'],
      properties: {
        processName: { type: 'string', title: 'Process Name', 'x-placeholder': 'e.g. Invoice Approval Process' },
        currentState: { type: 'string', title: 'Current State', 'x-field-type': 'textarea', 'x-placeholder': 'How it works today, volume, people involved, time taken' },
        painPoints: { type: 'string', title: 'Pain Points', 'x-field-type': 'textarea', 'x-placeholder': 'What is slow, costly, error-prone, or frustrating' },
        proposedChanges: { type: 'string', title: 'Proposed Changes', 'x-field-type': 'textarea', 'x-placeholder': 'What you want to change or automate' },
        estimatedBenefit: { type: 'string', title: 'Estimated Benefit', 'x-placeholder': 'Time saved, cost reduced, errors eliminated' },
      },
    },
    promptTemplate: `Write an operational efficiency improvement proposal.

Process: {{processName}}

Current State:
{{currentState}}

Pain Points:
{{painPoints}}

Proposed Changes:
{{proposedChanges}}

Expected Benefits: {{estimatedBenefit}}

Proposal structure:
1. **Executive Summary** (problem, solution, expected benefit)
2. **Current State Analysis** (process map narrative, metrics, pain points)
3. **Proposed Improvements** (each change described clearly with rationale)
4. **Expected Benefits** (quantified where possible: time, cost, quality)
5. **Implementation Plan** (phases, milestones, resources needed)
6. **Cost to Implement** (estimate of effort, tools, or change management)
7. **ROI Analysis** (simple payback calculation)
8. **Risks & Mitigations**
9. **Recommendation & Next Steps**`,
  },

  // ── Marketing & Comms (6) ─────────────────────────────────────────────────

  {
    title: 'Press Release',
    description: 'Write a professional press release for a company announcement.',
    category: 'public-relations',
    department: 'marketing',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 45,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['companyName', 'announcement', 'keyFacts', 'quote', 'contactDetails'],
      properties: {
        companyName: { type: 'string', title: 'Company Name', 'x-placeholder': 'e.g. Wren GmbH' },
        announcement: { type: 'string', title: 'The Announcement', 'x-field-type': 'textarea', 'x-placeholder': 'What are you announcing? Why does it matter?' },
        keyFacts: { type: 'string', title: 'Key Facts & Details', 'x-field-type': 'textarea', 'x-placeholder': 'Supporting numbers, dates, specifics' },
        quote: { type: 'string', title: 'Executive Quote', 'x-placeholder': 'Quote from CEO or relevant executive (or leave blank to draft one)' },
        contactDetails: { type: 'string', title: 'PR Contact Details', 'x-placeholder': 'Name, email, phone for media enquiries' },
      },
    },
    promptTemplate: `Write a professional press release for the following announcement.

Company: {{companyName}}
Announcement: {{announcement}}
Key Facts: {{keyFacts}}
{{#if quote}}Executive Quote: {{quote}}{{/if}}
PR Contact: {{contactDetails}}

Press release format:
FOR IMMEDIATE RELEASE

[Headline — compelling, newsy, 10 words max]
[Subheadline — adds context, one sentence]

[City, Date] — [Opening paragraph: who, what, when, where, why — the inverted pyramid]

[Second paragraph: context, significance, market relevance]

[Third paragraph: {{#if quote}}Include the quote{{else}}Draft a quote from the CEO{{/if}}]

[Fourth paragraph: additional details, background]

[Boilerplate: 3-sentence company description]

###

Media Contact:
{{contactDetails}}

Write in standard press release style. Avoid superlatives and marketing fluff. Make every sentence newsworthy.`,
  },

  {
    title: 'LinkedIn Company Post',
    description: 'Write an engaging LinkedIn post that drives comments and shares.',
    category: 'social-media',
    department: 'marketing',
    difficulty: 'beginner',
    estimatedMinutesSaved: 20,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['topic', 'keyMessage', 'audience'],
      properties: {
        topic: { type: 'string', title: 'Post Topic', 'x-placeholder': 'e.g. Product launch, industry insight, team achievement' },
        keyMessage: { type: 'string', title: 'Key Message', 'x-field-type': 'textarea', 'x-placeholder': 'What is the one thing you want people to take away?' },
        audience: { type: 'string', title: 'Target Audience', 'x-placeholder': 'e.g. HR leaders, CFOs, SMB owners' },
        cta: { type: 'string', title: 'Call to Action', 'x-placeholder': 'e.g. comment below, share with your team, follow for more' },
        tone: { type: 'string', title: 'Tone', 'x-field-type': 'select', enum: ['Professional', 'Conversational', 'Inspiring', 'Educational', 'Bold'], 'x-enum-labels': ['Professional', 'Conversational', 'Inspiring', 'Educational', 'Bold'] },
      },
    },
    promptTemplate: `Write a LinkedIn company post on the following topic.

Topic: {{topic}}
Key Message: {{keyMessage}}
Target Audience: {{audience}}
Tone: {{tone}}
CTA: {{cta}}

Post requirements:
- Hook in the first 2 lines (people only see this before "see more")
- 150–250 words total
- Use white space liberally (short paragraphs, line breaks)
- Include 3–5 relevant hashtags at the end
- End with a genuine question or CTA to drive engagement
- Avoid buzzwords like "excited to share", "thrilled to announce"
- Write as a company voice, not an individual

Output the post text, ready to copy-paste.`,
  },

  {
    title: 'Marketing Campaign Brief',
    description: 'Create a comprehensive campaign brief to align teams before launch.',
    category: 'campaign-planning',
    department: 'marketing',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 60,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['campaignName', 'campaignObjective', 'targetAudience', 'keyMessage', 'budget'],
      properties: {
        campaignName: { type: 'string', title: 'Campaign Name', 'x-placeholder': 'e.g. Q2 Growth Push' },
        campaignObjective: { type: 'string', title: 'Campaign Objective', 'x-placeholder': 'e.g. Generate 200 qualified leads in 6 weeks' },
        targetAudience: { type: 'string', title: 'Target Audience', 'x-field-type': 'textarea', 'x-placeholder': 'Who you are targeting — segments, roles, pain points' },
        keyMessage: { type: 'string', title: 'Key Message', 'x-field-type': 'textarea', 'x-placeholder': 'Core message and value proposition' },
        budget: { type: 'string', title: 'Campaign Budget', 'x-placeholder': 'e.g. €30,000' },
        timeline: { type: 'string', title: 'Campaign Timeline', 'x-placeholder': 'e.g. 1 April – 31 May 2026' },
      },
    },
    promptTemplate: `Write a comprehensive marketing campaign brief.

Campaign: {{campaignName}}
Objective: {{campaignObjective}}
Budget: {{budget}}
Timeline: {{timeline}}

Target Audience:
{{targetAudience}}

Key Message:
{{keyMessage}}

Brief structure:
1. **Campaign Overview** (name, objective, timeline, budget)
2. **Background & Context** (why this campaign, what's happening in market)
3. **Target Audience** (primary and secondary segments with persona descriptions)
4. **Campaign Goal & Success Metrics** (SMART objectives with KPIs)
5. **Key Message Architecture** (headline message, supporting messages, proof points)
6. **Channel Strategy** (recommended channels and rationale)
7. **Creative Direction** (tone, visual style, messaging themes)
8. **Content Requirements** (assets needed: ads, landing pages, emails, etc.)
9. **Timeline & Milestones** (phased plan with key dates)
10. **Budget Allocation** (channel-by-channel breakdown)
11. **Team & Responsibilities** (RACI)
12. **Risks & Contingencies**`,
  },

  {
    title: 'Customer Case Study',
    description: 'Write a compelling customer success story that converts prospects.',
    category: 'content-marketing',
    department: 'marketing',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 90,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['customerName', 'customerIndustry', 'challenge', 'solution', 'results'],
      properties: {
        customerName: { type: 'string', title: 'Customer Company Name', 'x-placeholder': 'e.g. Müller Logistics' },
        customerIndustry: { type: 'string', title: 'Customer Industry', 'x-placeholder': 'e.g. Logistics & Supply Chain' },
        challenge: { type: 'string', title: 'The Challenge', 'x-field-type': 'textarea', 'x-placeholder': "What problem was the customer facing before they used your product?" },
        solution: { type: 'string', title: 'The Solution', 'x-field-type': 'textarea', 'x-placeholder': 'How did your product/service solve the problem?' },
        results: { type: 'string', title: 'The Results', 'x-field-type': 'textarea', 'x-placeholder': 'Quantified outcomes: %, €, time saved, etc.' },
        customerQuote: { type: 'string', title: 'Customer Quote (optional)', 'x-placeholder': 'Direct quote from the customer' },
      },
    },
    promptTemplate: `Write a customer case study for sales and marketing use.

Customer: {{customerName}} ({{customerIndustry}})

The Challenge:
{{challenge}}

The Solution:
{{solution}}

The Results:
{{results}}

{{#if customerQuote}}Customer Quote: {{customerQuote}}{{/if}}

Case study structure:
1. **Headline** (result-focused, specific number if possible)
2. **At a Glance** (sidebar stats: industry, challenge category, 2–3 key results)
3. **The Challenge** (customer's situation before — make it relatable)
4. **Why They Chose Us** (decision factors, what differentiated us)
5. **The Solution** (how it works for them specifically)
6. **The Results** (specific, quantified outcomes — the hero of the story)
{{#if customerQuote}}7. **In Their Words** (the customer quote in full){{/if}}
8. **What's Next** (future plans — shows ongoing success)

Write in narrative form — tell a story. Lead with results. Keep jargon-free.`,
  },

  {
    title: 'Email Newsletter Section',
    description: 'Write a section for your company newsletter that informs and engages.',
    category: 'email-marketing',
    department: 'marketing',
    difficulty: 'beginner',
    estimatedMinutesSaved: 20,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['sectionType', 'topic', 'keyPoints', 'audience'],
      properties: {
        sectionType: { type: 'string', title: 'Section Type', 'x-field-type': 'select', enum: ['Company update', 'Product news', 'Industry insight', 'Customer spotlight', 'Team highlight', 'Upcoming event'], 'x-enum-labels': ['Company update', 'Product news', 'Industry insight', 'Customer spotlight', 'Team highlight', 'Upcoming event'] },
        topic: { type: 'string', title: 'Topic', 'x-placeholder': 'What is this section about?' },
        keyPoints: { type: 'string', title: 'Key Points to Cover', 'x-field-type': 'textarea', 'x-placeholder': 'Main facts or messages to include' },
        audience: { type: 'string', title: 'Audience', 'x-placeholder': 'e.g. customers, prospects, employees' },
      },
    },
    promptTemplate: `Write a newsletter section for our company newsletter.

Section Type: {{sectionType}}
Topic: {{topic}}
Audience: {{audience}}

Key Points:
{{keyPoints}}

Requirements:
- Engaging headline for the section
- 100–150 words body copy
- Conversational, warm tone
- One clear link/CTA if appropriate
- No jargon, no filler
- Write to be skimmed — short sentences, active voice

Output the section headline and body text.`,
  },

  {
    title: 'Product Launch Announcement Email',
    description: 'Write a product launch email that generates excitement and drives action.',
    category: 'product-marketing',
    department: 'marketing',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 35,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['productName', 'targetAudience', 'keyBenefit', 'launchDate', 'cta'],
      properties: {
        productName: { type: 'string', title: 'Product / Feature Name', 'x-placeholder': 'e.g. Wren Prompt Library' },
        targetAudience: { type: 'string', title: 'Target Audience', 'x-placeholder': 'e.g. HR teams at mid-sized companies' },
        keyBenefit: { type: 'string', title: 'Key Benefit', 'x-field-type': 'textarea', 'x-placeholder': "What problem does it solve? What's the headline value?" },
        launchDate: { type: 'string', title: 'Launch Date', 'x-field-type': 'date' },
        cta: { type: 'string', title: 'Call to Action', 'x-placeholder': 'e.g. Try it free, Book a demo, See it in action' },
        featureHighlights: { type: 'string', title: 'Feature Highlights (optional)', 'x-placeholder': '3 standout features to mention' },
      },
    },
    promptTemplate: `Write a product launch announcement email.

Product: {{productName}}
Audience: {{targetAudience}}
Launch Date: {{launchDate}}
Key Benefit: {{keyBenefit}}
{{#if featureHighlights}}Feature Highlights: {{featureHighlights}}{{/if}}
CTA: {{cta}}

Email requirements:
- Subject line: creates curiosity/urgency, < 50 characters
- Preview text: complements the subject line
- Opening: lead with the customer problem, not the product
- Body: 200–250 words
- 3 feature bullets (specific benefits, not features)
- Social proof line if available
- Strong, single CTA button text
- Warm, confident sign-off

Output: Subject | Preview Text | Body (formatted)`,
  },

  // ── IT & Technical (6) ────────────────────────────────────────────────────

  {
    title: 'IT Incident Report',
    description: 'Document an IT incident with full technical detail for the incident log.',
    category: 'incident-management',
    department: 'it',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 45,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['incidentTitle', 'severity', 'startTime', 'systemsAffected', 'timeline', 'resolution'],
      properties: {
        incidentTitle: { type: 'string', title: 'Incident Title', 'x-placeholder': 'e.g. Production Database Unavailable' },
        severity: { type: 'string', title: 'Severity', 'x-field-type': 'select', enum: ['P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'], 'x-enum-labels': ['P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'] },
        startTime: { type: 'string', title: 'Start Time (UTC)', 'x-placeholder': 'e.g. 2026-03-14 09:42 UTC' },
        systemsAffected: { type: 'string', title: 'Systems Affected', 'x-field-type': 'textarea', 'x-placeholder': 'Which systems, services, or users were impacted' },
        timeline: { type: 'string', title: 'Incident Timeline', 'x-field-type': 'textarea', 'x-placeholder': 'Chronological events: detection, actions, resolution' },
        resolution: { type: 'string', title: 'Resolution', 'x-field-type': 'textarea', 'x-placeholder': 'What fixed the issue and when it was resolved' },
      },
    },
    promptTemplate: `Write a formal IT incident report.

Incident: {{incidentTitle}}
Severity: {{severity}}
Start Time: {{startTime}}
Systems Affected: {{systemsAffected}}

Timeline:
{{timeline}}

Resolution:
{{resolution}}

Report structure:
1. **Incident Summary** (title, severity, duration, impact in 3 sentences)
2. **Affected Systems & Users** (specific systems, number of users impacted)
3. **Detailed Timeline** (formatted chronological log with timestamps)
4. **Root Cause** (technical root cause in plain language)
5. **Resolution Steps** (how the issue was resolved, technically specific)
6. **Business Impact** (downtime, data affected, service degradation)
7. **Contributing Factors** (what conditions made this incident happen or worse)
8. **Preventive Actions** (technical and process changes to prevent recurrence)
9. **Open Action Items** (remaining tasks with owners and due dates)

Include technical detail appropriate for engineering review, but summary sections accessible to non-technical management.`,
  },

  {
    title: 'Change Request Document',
    description: 'Write a formal IT change request for CAB review and approval.',
    category: 'change-management',
    department: 'it',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 40,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['changeTitle', 'changeType', 'system', 'changeDescription', 'businessJustification', 'rollbackPlan'],
      properties: {
        changeTitle: { type: 'string', title: 'Change Title', 'x-placeholder': 'e.g. Upgrade PostgreSQL from 15 to 16' },
        changeType: { type: 'string', title: 'Change Type', 'x-field-type': 'select', enum: ['Standard', 'Normal', 'Emergency'], 'x-enum-labels': ['Standard (pre-approved)', 'Normal (CAB review)', 'Emergency (expedited)'] },
        system: { type: 'string', title: 'System / Service', 'x-placeholder': 'e.g. Production API, Database cluster' },
        changeDescription: { type: 'string', title: 'Change Description', 'x-field-type': 'textarea', 'x-placeholder': 'Technical details of what will be changed and how' },
        businessJustification: { type: 'string', title: 'Business Justification', 'x-placeholder': 'Why this change is needed' },
        rollbackPlan: { type: 'string', title: 'Rollback Plan', 'x-field-type': 'textarea', 'x-placeholder': 'How to reverse the change if something goes wrong' },
      },
    },
    promptTemplate: `Write a formal IT Change Request (CR) document for CAB review.

Change: {{changeTitle}}
Type: {{changeType}}
System: {{system}}
Business Justification: {{businessJustification}}

Change Description:
{{changeDescription}}

Rollback Plan:
{{rollbackPlan}}

CR Document sections:
1. **Change Summary** (title, type, system, requestor, requested date)
2. **Change Description** (technical detail of what is changing)
3. **Business Justification** (why this change is needed, risk of not doing it)
4. **Impact Assessment** (systems affected, user impact, dependencies)
5. **Risk Assessment** (risk of change, risk of failure, risk rating: Low/Medium/High)
6. **Implementation Plan** (step-by-step technical implementation with estimated durations)
7. **Testing Plan** (how to verify success before and after change)
8. **Rollback Plan** (specific steps to reverse if needed, go/no-go decision point)
9. **Communication Plan** (who to notify and when)
10. **Approval Required** (change type and approver level)`,
  },

  {
    title: 'Technical Runbook',
    description: 'Write an operational runbook for a recurring technical procedure.',
    category: 'documentation',
    department: 'it',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 60,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['procedureName', 'trigger', 'prerequisites', 'steps', 'successCriteria'],
      properties: {
        procedureName: { type: 'string', title: 'Procedure Name', 'x-placeholder': 'e.g. Database Failover Procedure' },
        trigger: { type: 'string', title: 'When to Use This Runbook', 'x-placeholder': 'e.g. When primary database is unreachable for > 2 minutes' },
        prerequisites: { type: 'string', title: 'Prerequisites', 'x-field-type': 'textarea', 'x-placeholder': 'Access required, tools needed, checks to make first' },
        steps: { type: 'string', title: 'Procedure Steps', 'x-field-type': 'textarea', 'x-placeholder': 'Ordered steps to execute the procedure', minLength: 50 },
        successCriteria: { type: 'string', title: 'Success Criteria', 'x-placeholder': 'How do you know it worked?' },
      },
    },
    promptTemplate: `Write a technical runbook for the following operational procedure.

Procedure: {{procedureName}}
When to Use: {{trigger}}

Prerequisites:
{{prerequisites}}

Procedure Steps:
{{steps}}

Success Criteria: {{successCriteria}}

Runbook format:
# {{procedureName}} Runbook

## Overview
[Brief description and when to use this runbook]

## Pre-conditions
- Required access and permissions
- Tools and credentials needed
- Initial checks to confirm you're in the right situation

## Procedure

[Numbered steps with:
- Exact commands in code blocks where applicable
- Expected output after each critical step
- Decision points clearly marked
- Warning callouts for risky actions]

## Verification
[How to confirm the procedure succeeded]

## Troubleshooting
[Common failure points and how to handle them]

## Rollback
[How to undo if something goes wrong]

## Escalation
[When and who to escalate to if procedure fails]

Write with precision. Use code blocks for commands. Assume the reader is on-call and under pressure.`,
  },

  {
    title: 'Technology Evaluation Report',
    description: 'Compare technology options and recommend the best solution for your needs.',
    category: 'architecture',
    department: 'it',
    difficulty: 'advanced',
    estimatedMinutesSaved: 120,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['evaluationSubject', 'businessRequirements', 'options', 'evaluationCriteria'],
      properties: {
        evaluationSubject: { type: 'string', title: 'What Are You Evaluating?', 'x-placeholder': 'e.g. Message Queue: Kafka vs RabbitMQ vs SQS' },
        businessRequirements: { type: 'string', title: 'Business Requirements', 'x-field-type': 'textarea', 'x-placeholder': 'What does the solution need to do? Volume, latency, scale, budget?' },
        options: { type: 'string', title: 'Options Being Evaluated', 'x-field-type': 'textarea', 'x-placeholder': 'List the products, services, or approaches being compared' },
        evaluationCriteria: { type: 'string', title: 'Evaluation Criteria', 'x-field-type': 'textarea', 'x-placeholder': 'What dimensions matter most (cost, performance, ease of use, support, etc.)' },
      },
    },
    promptTemplate: `Write a technology evaluation report.

Subject: {{evaluationSubject}}

Business Requirements:
{{businessRequirements}}

Options Evaluated:
{{options}}

Evaluation Criteria:
{{evaluationCriteria}}

Report structure:
1. **Executive Summary** (recommendation in 3 sentences with primary rationale)
2. **Requirements Analysis** (detailed breakdown of must-have vs nice-to-have)
3. **Options Overview** (brief description of each option)
4. **Evaluation Matrix** (scored comparison table: each option × each criterion)
5. **Detailed Analysis** (deep dive on each option's strengths, weaknesses, fit)
6. **Recommendation** (clear recommendation with full rationale)
7. **Implementation Considerations** (migration path, learning curve, integration effort)
8. **Total Cost of Ownership** (licensing, infrastructure, support, training)
9. **Risk Assessment** (vendor risk, technical risk, adoption risk)
10. **Decision** (what you recommend and why you didn't choose the alternatives)

Be opinionated. A good technology evaluation report gives a clear recommendation.`,
  },

  {
    title: 'API Documentation (Endpoint)',
    description: 'Generate clear, developer-friendly API endpoint documentation.',
    category: 'documentation',
    department: 'it',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 30,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['endpointMethod', 'endpointPath', 'description', 'requestParams', 'responseFormat'],
      properties: {
        endpointMethod: { type: 'string', title: 'HTTP Method', 'x-field-type': 'select', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 'x-enum-labels': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        endpointPath: { type: 'string', title: 'Endpoint Path', 'x-placeholder': 'e.g. /api/v1/prompts/:id/execute' },
        description: { type: 'string', title: 'What This Endpoint Does', 'x-field-type': 'textarea', 'x-placeholder': 'Describe the purpose and behaviour' },
        requestParams: { type: 'string', title: 'Request Parameters / Body', 'x-field-type': 'textarea', 'x-placeholder': 'Path params, query params, request body fields with types' },
        responseFormat: { type: 'string', title: 'Response Format', 'x-field-type': 'textarea', 'x-placeholder': 'Response body structure and fields' },
      },
    },
    promptTemplate: `Write API endpoint documentation for the following endpoint.

Method: {{endpointMethod}}
Path: {{endpointPath}}
Description: {{description}}

Request:
{{requestParams}}

Response:
{{responseFormat}}

Documentation format:

## {{endpointMethod}} {{endpointPath}}

### Overview
[Clear one-sentence description]

### Authentication
[Auth requirements]

### Request

**Path Parameters** (if any)
| Parameter | Type | Required | Description |

**Query Parameters** (if any)
| Parameter | Type | Required | Default | Description |

**Request Body** (if any)
\`\`\`json
[Example request body]
\`\`\`

| Field | Type | Required | Description |

### Response

**Success Response (200)**
\`\`\`json
[Example response]
\`\`\`

| Field | Type | Description |

**Error Responses**
| Status | Code | Description |

### Example

\`\`\`curl
[Complete curl example]
\`\`\`

### Notes
[Any important caveats, rate limits, or behaviour notes]`,
  },

  {
    title: 'Security Vulnerability Report',
    description: 'Document a security vulnerability with risk assessment and remediation plan.',
    category: 'security',
    department: 'it',
    difficulty: 'advanced',
    estimatedMinutesSaved: 60,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['vulnerabilityTitle', 'severity', 'systemAffected', 'description', 'impact', 'remediation'],
      properties: {
        vulnerabilityTitle: { type: 'string', title: 'Vulnerability Title', 'x-placeholder': 'e.g. SQL Injection in User Search Endpoint' },
        severity: { type: 'string', title: 'CVSS Severity', 'x-field-type': 'select', enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'], 'x-enum-labels': ['Critical (9.0-10.0)', 'High (7.0-8.9)', 'Medium (4.0-6.9)', 'Low (0.1-3.9)', 'Informational'] },
        systemAffected: { type: 'string', title: 'System / Component Affected', 'x-placeholder': 'e.g. API v1 /users/search endpoint' },
        description: { type: 'string', title: 'Vulnerability Description', 'x-field-type': 'textarea', 'x-placeholder': 'Technical description of the vulnerability' },
        impact: { type: 'string', title: 'Potential Impact', 'x-field-type': 'textarea', 'x-placeholder': 'What could an attacker do if they exploited this?' },
        remediation: { type: 'string', title: 'Proposed Remediation', 'x-field-type': 'textarea', 'x-placeholder': 'How to fix it' },
      },
    },
    promptTemplate: `Write a security vulnerability report.

Vulnerability: {{vulnerabilityTitle}}
Severity: {{severity}}
Affected System: {{systemAffected}}

Description:
{{description}}

Potential Impact:
{{impact}}

Proposed Remediation:
{{remediation}}

Report structure:
1. **Vulnerability Summary** (title, severity rating, affected system, discovery date)
2. **Technical Description** (detailed explanation of the vulnerability, how it can be exploited)
3. **Proof of Concept** (prompt section — describe what evidence exists without including actual exploit code)
4. **Risk Assessment** (CVSS score rationale: Attack Vector, Complexity, Privileges, Impact)
5. **Business Impact** (what could happen if exploited — data, reputation, compliance)
6. **Affected Versions / Scope** (what is and isn't affected)
7. **Remediation Plan** (specific fix with implementation steps)
8. **Temporary Mitigations** (what to do immediately before a fix is deployed)
9. **Verification** (how to confirm the fix worked)
10. **Timeline & Priority** (recommended fix timeline based on severity)`,
  },

  // ── Executive (4) ─────────────────────────────────────────────────────────

  {
    title: 'Board Meeting Update',
    description: 'Write a concise, balanced board update that covers performance and priorities.',
    category: 'board-reporting',
    department: 'executive',
    difficulty: 'advanced',
    estimatedMinutesSaved: 120,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['period', 'revenueUpdate', 'keyAchievements', 'keyRisks', 'strategicPriorities'],
      properties: {
        period: { type: 'string', title: 'Reporting Period', 'x-placeholder': 'e.g. Q1 2026' },
        revenueUpdate: { type: 'string', title: 'Revenue / Financial Update', 'x-field-type': 'textarea', 'x-placeholder': 'Key financial metrics vs targets' },
        keyAchievements: { type: 'string', title: 'Key Achievements', 'x-field-type': 'textarea', 'x-placeholder': '3–5 significant accomplishments this period' },
        keyRisks: { type: 'string', title: 'Key Risks & Issues', 'x-field-type': 'textarea', 'x-placeholder': 'Top risks the board should be aware of' },
        strategicPriorities: { type: 'string', title: 'Next Period Priorities', 'x-field-type': 'textarea', 'x-placeholder': 'Top 3–5 priorities for the next period' },
      },
    },
    promptTemplate: `Write a board meeting update document for the following period.

Period: {{period}}

Financial Update:
{{revenueUpdate}}

Key Achievements:
{{keyAchievements}}

Key Risks & Issues:
{{keyRisks}}

Next Period Priorities:
{{strategicPriorities}}

Document structure:
1. **Executive Summary** (1 paragraph — the essential narrative for board members who skim)
2. **Financial Performance** (vs plan, vs prior period, key drivers, forecast)
3. **Operational Highlights** (major achievements with metrics)
4. **Strategic Progress** (progress against annual plan/OKRs)
5. **People & Organisation** (headcount, key hires, talent risk)
6. **Risks & Issues** (RAG-rated risk register — top 5)
7. **Decisions Required** (explicit asks of the board — what do you need approved?)
8. **Next Period Focus** (priorities for the coming quarter)

Tone: direct, factual, confident. Boards appreciate conciseness. Lead with insights, not data dumps. Max 1,000 words.`,
  },

  {
    title: 'OKR Review Document',
    description: 'Write a structured OKR progress review for executive team alignment.',
    category: 'strategy',
    department: 'executive',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 60,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['quarter', 'objectives', 'keyResults', 'progressSummary'],
      properties: {
        quarter: { type: 'string', title: 'Quarter', 'x-placeholder': 'e.g. Q1 2026' },
        objectives: { type: 'string', title: 'Objectives', 'x-field-type': 'textarea', 'x-placeholder': 'List your company or team objectives' },
        keyResults: { type: 'string', title: 'Key Results & Current Status', 'x-field-type': 'textarea', 'x-placeholder': 'Each KR with target, current score, and % complete' },
        progressSummary: { type: 'string', title: 'Progress Context', 'x-field-type': 'textarea', 'x-placeholder': 'What happened this quarter — wins, blockers, pivots' },
      },
    },
    promptTemplate: `Write an OKR progress review document.

Quarter: {{quarter}}

Objectives:
{{objectives}}

Key Results & Status:
{{keyResults}}

Progress Context:
{{progressSummary}}

Review document structure:
1. **Quarter Overview** (overall OKR health — are we on track to hit our objectives?)
2. **Objective-by-Objective Review** (for each objective):
   - Overall confidence score (0–100%)
   - Each key result with: target, current, status (On Track / At Risk / Off Track)
   - What's driving progress or blocking it
   - Actions to accelerate or recover
3. **Patterns & Insights** (what's the story across all OKRs — what does the data tell us?)
4. **Learnings** (what have we learned this quarter — update our approach if needed)
5. **Q+1 Implications** (what should we carry forward or change in next quarter's OKRs?)

Be honest about at-risk and off-track KRs. A good OKR review is a candid conversation, not a celebration.`,
  },

  {
    title: 'Strategy Memo',
    description: 'Write a strategic memo to align the leadership team on direction and decisions.',
    category: 'strategy',
    department: 'executive',
    difficulty: 'advanced',
    estimatedMinutesSaved: 90,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['topic', 'context', 'recommendation', 'keyArguments', 'risksAndTradeoffs'],
      properties: {
        topic: { type: 'string', title: 'Memo Topic', 'x-placeholder': 'e.g. Market expansion into the DACH region' },
        context: { type: 'string', title: 'Context & Background', 'x-field-type': 'textarea', 'x-placeholder': 'What situation or opportunity is this memo addressing?' },
        recommendation: { type: 'string', title: 'Recommendation', 'x-field-type': 'textarea', 'x-placeholder': 'What are you recommending and why?' },
        keyArguments: { type: 'string', title: 'Supporting Arguments', 'x-field-type': 'textarea', 'x-placeholder': 'Data, rationale, and evidence for the recommendation' },
        risksAndTradeoffs: { type: 'string', title: 'Risks & Trade-offs', 'x-field-type': 'textarea', 'x-placeholder': 'What are the downsides and what are you trading off?' },
      },
    },
    promptTemplate: `Write a strategic memo for leadership alignment.

Topic: {{topic}}

Context:
{{context}}

Recommendation:
{{recommendation}}

Supporting Arguments:
{{keyArguments}}

Risks & Trade-offs:
{{risksAndTradeoffs}}

Memo structure (Amazon-style narrative):
1. **Recommendation** (state it upfront — 2 sentences max)
2. **Context** (what situation requires a decision, what has changed)
3. **The Opportunity / Problem** (quantify it — why does this matter now)
4. **Options Considered** (at least 3 alternatives evaluated)
5. **Recommended Approach** (detailed rationale for your choice)
6. **Key Assumptions** (what must be true for this to work)
7. **Risks & Mitigations** (honest assessment of what could go wrong)
8. **Resource Requirements** (what it will cost in money, time, and people)
9. **Success Metrics** (how will you know if it worked)
10. **Decision & Next Steps** (what you're asking leaders to decide and commit to)

Write in clear prose, not bullet points. Memos should be readable in 5 minutes.`,
  },

  {
    title: 'All-Hands Meeting Presentation Script',
    description: 'Write a compelling all-hands script that informs, motivates, and connects the team.',
    category: 'internal-communications',
    department: 'executive',
    difficulty: 'intermediate',
    estimatedMinutesSaved: 75,
    isPublic: true,
    tenantId: null,
    formSchema: {
      type: 'object',
      required: ['period', 'companyHighlights', 'challengesToAddress', 'lookAhead', 'closingMessage'],
      properties: {
        period: { type: 'string', title: 'Period Covered', 'x-placeholder': 'e.g. Q1 2026' },
        companyHighlights: { type: 'string', title: 'Company Highlights', 'x-field-type': 'textarea', 'x-placeholder': 'Key wins, milestones, and achievements to celebrate' },
        challengesToAddress: { type: 'string', title: 'Challenges to Address Honestly', 'x-field-type': 'textarea', 'x-placeholder': 'Things that are hard, slow, or not going to plan' },
        lookAhead: { type: 'string', title: 'Look Ahead', 'x-field-type': 'textarea', 'x-placeholder': "What's coming up — priorities, initiatives, decisions" },
        closingMessage: { type: 'string', title: 'Closing Theme / Message', 'x-placeholder': 'The one thing you want people to leave feeling' },
      },
    },
    promptTemplate: `Write an all-hands meeting presentation script.

Period: {{period}}

Highlights to Cover:
{{companyHighlights}}

Challenges to Address:
{{challengesToAddress}}

Look Ahead:
{{lookAhead}}

Closing Message: {{closingMessage}}

Script structure (with timing guidance):
1. **Opening** (2 min — warm, human opener that doesn't start with a slide)
2. **The Headline** (1 min — what is the essential story of this period in one sentence)
3. **Wins to Celebrate** (5 min — specific, named, team-level achievements)
4. **Honest Update on Challenges** (3 min — transparency builds trust; here's what's hard and what we're doing about it)
5. **Strategic Context** (3 min — why what we're doing matters; connect team work to company mission)
6. **Looking Ahead** (3 min — priorities, what to focus on, decisions that have been made)
7. **Recognition** (2 min — call out specific people or teams)
8. **Closing** (1 min — energising, human close aligned to {{closingMessage}})

Write as spoken word — natural, not stiff. The CEO should sound like a person, not a press release. Include [PAUSE] and [EMPHASIS] cues.`,
  },
]
