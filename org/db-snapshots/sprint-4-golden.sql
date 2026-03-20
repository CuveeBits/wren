--
-- PostgreSQL database dump
--

\restrict c4sjh1QOlWbpCFGrISD6FeBFP9D5AwpUXbvbBnPcLoUvXC9Q0miy41WMTMcmgqI

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg12+1)
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: MessageRole; Type: TYPE; Schema: public; Owner: wren
--

CREATE TYPE public."MessageRole" AS ENUM (
    'USER',
    'ASSISTANT',
    'SYSTEM',
    'TOOL'
);


ALTER TYPE public."MessageRole" OWNER TO wren;

--
-- Name: Plan; Type: TYPE; Schema: public; Owner: wren
--

CREATE TYPE public."Plan" AS ENUM (
    'TRIAL',
    'BUSINESS',
    'ENTERPRISE'
);


ALTER TYPE public."Plan" OWNER TO wren;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: wren
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'TENANT_ADMIN',
    'DEPT_ADMIN',
    'USER'
);


ALTER TYPE public."UserRole" OWNER TO wren;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Agent; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."Agent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    description text,
    "systemPrompt" text NOT NULL,
    "modelId" text DEFAULT 'gpt-4o'::text NOT NULL,
    "memorySize" integer DEFAULT 20 NOT NULL,
    "maxTokens" integer DEFAULT 4000 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    tools text[],
    "kbInstanceIds" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Agent" OWNER TO wren;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text,
    action text NOT NULL,
    resource text NOT NULL,
    "resourceId" text,
    metadata jsonb,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO wren;

--
-- Name: ChannelConfig; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."ChannelConfig" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    channel text NOT NULL,
    config jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "agentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ChannelConfig" OWNER TO wren;

--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    "tenantId" text NOT NULL,
    role public."MessageRole" NOT NULL,
    content text NOT NULL,
    "toolCalls" jsonb,
    "tokenCount" integer,
    "modelId" text,
    "costUsd" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ChatMessage" OWNER TO wren;

--
-- Name: ChatSession; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."ChatSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    "agentId" text NOT NULL,
    "channelType" text NOT NULL,
    "channelId" text NOT NULL,
    title text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ChatSession" OWNER TO wren;

--
-- Name: Conversation; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."Conversation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    channel text DEFAULT 'app'::text NOT NULL,
    title text,
    status text DEFAULT 'active'::text NOT NULL,
    "systemPromptSnapshot" text,
    "lastMessageAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Conversation" OWNER TO wren;

--
-- Name: ConversationDocument; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."ConversationDocument" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "documentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ConversationDocument" OWNER TO wren;

--
-- Name: KbChunk; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."KbChunk" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    content text NOT NULL,
    "tokenCount" integer NOT NULL,
    "chunkIndex" integer NOT NULL,
    "pageNumber" integer,
    embedding public.vector(768),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."KbChunk" OWNER TO wren;

--
-- Name: KbCollection; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."KbCollection" (
    id text NOT NULL,
    "knowledgeBaseId" text NOT NULL,
    "parentId" text,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."KbCollection" OWNER TO wren;

--
-- Name: KbDocument; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."KbDocument" (
    id text NOT NULL,
    "knowledgeBaseId" text NOT NULL,
    "collectionId" text,
    title text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "storageKey" text NOT NULL,
    source text DEFAULT 'upload'::text NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    "errorMessage" text,
    tags text[],
    summary text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."KbDocument" OWNER TO wren;

--
-- Name: KnowledgeBase; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."KnowledgeBase" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text DEFAULT 'Knowledge Base'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."KnowledgeBase" OWNER TO wren;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "contentText" text,
    status text DEFAULT 'complete'::text NOT NULL,
    model text,
    "tokenInput" integer,
    "tokenOutput" integer,
    "errorMessage" text,
    citations jsonb,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Message" OWNER TO wren;

--
-- Name: Prompt; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."Prompt" (
    id text NOT NULL,
    "tenantId" text,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    department text NOT NULL,
    difficulty text DEFAULT 'beginner'::text NOT NULL,
    "formSchema" jsonb NOT NULL,
    "promptTemplate" text NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "estimatedMinutesSaved" integer,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Prompt" OWNER TO wren;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    "clerkOrgId" text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    plan public."Plan" DEFAULT 'TRIAL'::public."Plan" NOT NULL,
    "whiteLabelConfig" jsonb,
    settings jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Tenant" OWNER TO wren;

--
-- Name: TenantChatSettings; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."TenantChatSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "systemPrompt" text,
    "welcomeMessage" text,
    "launcherLabel" text DEFAULT 'Chat with us'::text,
    "logoUrl" text,
    "brandColor" text DEFAULT '#0F172A'::text,
    "accentColor" text DEFAULT '#22C55E'::text,
    "widgetTitle" text DEFAULT 'Wren Assistant'::text,
    "allowedOrigins" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "translationEnabled" boolean DEFAULT false NOT NULL,
    "supportedLanguages" text[] DEFAULT '{}'::text[] NOT NULL,
    "defaultLanguage" text DEFAULT 'en'::text NOT NULL
);


ALTER TABLE public."TenantChatSettings" OWNER TO wren;

--
-- Name: TenantUser; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."TenantUser" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "clerkUserId" text NOT NULL,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    department text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TenantUser" OWNER TO wren;

--
-- Name: Workflow; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public."Workflow" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "n8nId" text NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    "isActive" boolean DEFAULT false NOT NULL,
    "runCount" integer DEFAULT 0 NOT NULL,
    "lastRunAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Workflow" OWNER TO wren;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: wren
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO wren;

--
-- Data for Name: Agent; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."Agent" (id, "tenantId", name, description, "systemPrompt", "modelId", "memorySize", "maxTokens", "isDefault", "isActive", tools, "kbInstanceIds", "createdAt", "updatedAt") FROM stdin;
demo-agent-cmmy2g6oc0000ilvjeq4tqvxt	cmmy2g6oc0000ilvjeq4tqvxt	Assistant	The default AI assistant for Demo Company	You are a helpful AI assistant for Demo Company. You help employees with their daily tasks, answer questions, and provide information. Always be professional, concise, and helpful.	gpt-4o	20	4000	t	t	{}	{}	2026-03-19 22:53:05.877	2026-03-19 22:53:05.877
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."AuditLog" (id, "tenantId", "userId", action, resource, "resourceId", metadata, "ipAddress", "createdAt") FROM stdin;
\.


--
-- Data for Name: ChannelConfig; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."ChannelConfig" (id, "tenantId", channel, config, "isActive", "agentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."ChatMessage" (id, "sessionId", "tenantId", role, content, "toolCalls", "tokenCount", "modelId", "costUsd", "createdAt") FROM stdin;
\.


--
-- Data for Name: ChatSession; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."ChatSession" (id, "tenantId", "userId", "agentId", "channelType", "channelId", title, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Conversation; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."Conversation" (id, "tenantId", "userId", channel, title, status, "systemPromptSnapshot", "lastMessageAt", "createdAt", "updatedAt") FROM stdin;
m7w67xq5le5kbudy6ut6e64r	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:04:12.285	2026-03-20 02:04:12.285
x1wqdhi42db8924ara6g4sw6	cmmy2g6oc0000ilvjeq4tqvxt	user_3Awvr6hLWsFimqHOoKoCVNskyCH	app	Need assistance?	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	2026-03-19 22:58:46.661	2026-03-19 22:58:24.268	2026-03-19 22:58:46.661
qchcbgyodwu8c4kdikff2x9k	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:04:12.305	2026-03-20 02:04:12.305
r9zkf6k8f4l3aw7ag0uxbv33	cmmy2g6oc0000ilvjeq4tqvxt	user_3Awvr6hLWsFimqHOoKoCVNskyCH	app	Platform Overview	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	2026-03-19 23:00:07.664	2026-03-19 22:59:38.783	2026-03-19 23:00:07.664
sea6enmbgeeucexct7qhmi52	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	Rex Title 1773972252336	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:04:12.335	2026-03-20 02:04:12.34
ivneb59c85raildh4cc0iojr	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:04:12.356	2026-03-20 02:04:12.356
kuq2i39ajrlf4980quvq8mrg	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:04:13.463	2026-03-20 02:04:13.463
vxxdz500db8gqlxb2m1th6fr	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	archived	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:03:02.537	2026-03-20 02:04:23.123
v39vyds1jljbckjtbbzqck61	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	archived	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:04:33.974	2026-03-20 02:04:37.778
uvn64ao6ygpbquokw46xcrzw	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:05:18.651	2026-03-20 02:05:18.651
gz2z3695fwtlqf0u3tunc3uh	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:05:18.674	2026-03-20 02:05:18.674
pg2sf64rnslxyvqx3wf085e6	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	Rex Title 1773972318703	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:05:18.701	2026-03-20 02:05:18.706
le2jc1gyj8zb13xjybsfcg5g	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	archived	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:05:18.722	2026-03-20 02:05:18.728
dy753s70iamhpv8r1cpzq615	cmmy2g6oc0000ilvjeq4tqvxt	demo-user	app	\N	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	2026-03-20 02:05:18.745	2026-03-20 02:05:18.745
lu9k1xt48mx2ie3gjgpdbbhe	cmmy2g6oc0000ilvjeq4tqvxt	user_3Awvr6hLWsFimqHOoKoCVNskyCH	app	Hello, can you translate?	active	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	2026-03-20 02:35:51.158	2026-03-20 02:26:32.504	2026-03-20 02:35:51.158
\.


--
-- Data for Name: ConversationDocument; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."ConversationDocument" (id, "conversationId", "documentId", "createdAt") FROM stdin;
\.


--
-- Data for Name: KbChunk; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."KbChunk" (id, "documentId", content, "tokenCount", "chunkIndex", "pageNumber", embedding, "createdAt") FROM stdin;
0c4add10-ee16-4333-b845-2bb0ee5b13d1	tkwe692jw3pdqarkzduztb93	I T - V E T T E D  A I   T OOL S \nHere is an overview of IT-vetted AI tools available for improving your workplace \nproductivity. All tools listed offer a free tier and are approved for use within specified \nguidelines. \nPlease adhere to the safe use cases outlined for each tool.\nImportant: Always review and comply with the company's AI usage policy. If in doubt, \ncheck with the Meiller IT. \nMeiller IT-Vetted AI Tools\nChatGPT\nBest Uses:\nDrafting emails\nSummarizing text\nBrainstorming ideas\nPerplexity\nBest Uses:\nResearch\nAnswering complex \nquestions\nExploring topics\nClaude\nBest Uses:\nCreative writing\nLong-form content review\nDetailed analysis\nVibe Coding\nChatGPT\nReasons to Use:\nEfficient, versatile, and widely accessible.\nSafe Use Cases:\nDrafting internal communications, summarizing \npublic reports, brainstorming meeting agendas.\nPerplexity\nReasons to Use:\nProvides sources for its answers, improving \nverifiability.\nSafe Use Cases:\nGathering information on industry trends, \nunderstanding competitor activities, researching \nbest practices.\nClaude\nReasons to Use:\nExcellent at understanding context and nuance in \ncomplex tasks.\nSafe Use Cases:\nReviewing internal documents, generating \ncreative content for marketing (with approval),	312	0	\N	[0.26038814,0.9414492,-3.3328261,-0.15955396,1.5624149,-1.14514,0.87684244,-0.74352056,0.1202774,-0.55008775,0.7577311,0.28707328,1.535891,-0.12925443,0.6422487,-0.5430793,0.10470518,-1.4421127,-0.6216808,0.62947303,0.7198253,-0.8578585,-0.118709944,-0.8729903,0.4365931,0.9456829,-0.14679652,-0.07408028,-0.047332328,0.22351542,0.17447497,-0.37781948,-0.7026112,-0.3067978,-1.0035158,-0.49414343,1.0358254,0.514797,-0.92052,0.26882088,0.8791381,0.44352144,0.86175317,-0.75615686,0.7777266,0.14403513,0.7706147,-0.08160936,0.79117566,-0.9408422,0.034883965,-1.5016744,0.80336756,0.33132142,1.6887728,-0.38401976,0.39213052,-0.15446596,0.2652414,-0.63359815,1.8051546,1.5974431,-0.99888426,1.5687147,0.7250234,-0.7870803,0.13075349,0.03201246,0.26835364,-0.3895721,0.37220293,-0.42436525,0.5323069,0.47320223,-1.0278193,0.221338,-0.930415,-0.40127158,0.07861335,0.07162654,1.0365001,-0.5713568,1.1966534,0.18950763,0.9589626,-0.94796455,0.084290154,-0.5228671,-0.28473398,1.051717,-0.0211459,0.53047585,-0.04224614,0.44129658,-1.6301792,0.648102,0.6681215,-0.5038085,0.08845923,-0.27956155,-0.40786555,-0.4918317,0.6201892,-0.06325239,0.0069825975,0.9228564,-0.52328473,0.19093643,-0.39875525,0.5919912,-0.19898589,0.6449439,-0.8936212,-0.25635293,0.44605398,0.30066243,1.0743219,-0.30987948,0.039447,0.81340766,0.34597147,-0.7893852,-0.07508033,-0.3718276,0.5070481,0.40151286,-0.89069784,-0.7032684,-1.0407689,-0.75130504,0.06520958,-0.03949493,-0.38397217,-0.018279916,-0.05841638,1.3843759,-0.5046809,-0.6461901,0.49415728,-0.27590513,0.61746484,0.022201492,-0.037604593,-0.4463736,0.009457499,-0.43506625,0.25854146,-0.4018353,-0.4282512,0.9266325,-0.23818341,0.30563855,-0.6443151,-0.23269758,0.45317695,-1.0017971,-0.2575811,0.36488378,0.39057684,0.9661687,0.44698742,0.6499489,-0.5258183,1.0355527,0.10253741,-0.42307997,0.0215154,0.5542242,0.164831,0.8084825,-1.0731312,-0.482467,0.3580429,-0.32839164,0.3518277,-0.14271845,1.5992278,-0.69638646,0.29376158,-1.1161382,0.57843393,-0.8518102,0.7494698,0.30530706,-1.4757746,-0.49270603,1.4424682,-0.4762059,0.069542445,-0.5046558,0.5704695,-0.33726117,-0.9097605,-0.4531346,-1.1007987,-1.033137,0.57545185,-0.4758395,0.9079831,-1.5632211,-0.67406726,0.050636027,-0.28201067,0.26304808,-1.096511,0.77079976,0.5243446,0.32519048,-0.22949828,0.38797036,1.1773164,-0.4261455,1.0183643,0.5152409,0.19320065,0.035699066,0.04396721,-0.46990398,-0.9251961,0.80683756,0.18073976,-0.40168062,-0.1381761,-0.08866034,0.24420798,-0.44549534,-0.9627656,-0.019521728,0.36415872,-0.33506033,-0.56069195,-1.253176,0.9342797,0.1788392,0.12940219,-0.15038203,0.06381574,0.65440786,0.1309327,0.90498346,0.2277169,0.88065517,-0.28577477,-0.6432399,-0.70212775,-0.22483468,-0.09726019,-0.23854223,0.45405224,0.61495477,0.8002877,0.5627171,0.6030274,0.47420007,0.36259878,-0.32978773,-0.6747674,0.35755855,0.10692186,0.4457403,0.359321,-0.684493,0.9013441,-0.42839092,0.18722269,-0.61289614,-1.4242561,0.21576038,0.47806945,-0.029096486,0.32161397,0.86688673,0.05297261,0.845426,-0.4438606,0.22928625,0.14461516,-0.124841,0.13436313,0.3639955,-0.09427008,-0.6034077,-0.36147195,0.6213187,-0.5626462,0.8823036,-0.304436,0.045040905,-0.19204675,-0.08509535,0.4561178,0.1959593,-0.94951624,0.20099382,-0.8371153,0.15018652,1.4799002,-0.60567766,0.15009576,-0.9087867,0.4825775,1.5350455,0.63229024,1.2149988,-0.3394503,-0.5069355,0.36601493,-0.1048821,0.8253473,0.022301573,-1.5264078,0.031504467,-1.2617606,0.292702,-0.8274317,0.7998968,1.11217,0.4067109,1.0455798,0.47829023,-0.020418512,-0.8406126,-0.007586482,-0.5996728,-0.9932288,0.69168496,0.3038247,-0.31091022,-0.13295823,-0.09444374,0.42161074,1.3573521,0.8317184,-1.7006603,0.2763178,0.58428705,0.68125844,-0.23913187,0.33907482,0.67145747,0.6045122,0.34749842,0.17247045,-0.6249577,-0.7695083,0.010185636,-0.7549304,-0.2766949,0.57905596,0.80270517,-0.023027228,0.09048314,-0.4098841,-0.94667906,0.8472691,-0.020023372,0.14874837,1.182944,0.21098351,-0.30474356,0.49277315,0.9654498,0.07083123,-0.62407297,-0.46555978,0.6295421,1.578595,-0.09506019,0.4112691,0.04262462,0.1215442,-0.30287135,-0.197724,0.4674519,-0.43778118,1.1350987,-1.4495825,0.044718977,-0.47616303,0.038179815,0.4104343,-0.7173918,-0.7715214,0.2328011,0.21752122,-0.07809855,-0.08631946,-0.7189531,0.117281884,0.3557386,-0.99044806,-0.4319204,-0.82967347,0.5562535,0.005050444,-0.6262084,0.0046646963,-0.29165894,1.0653827,1.0654377,-0.127641,-1.0184654,0.03924192,0.46274698,0.044908587,0.3566337,-0.367741,-0.33974284,0.9485737,-0.50765866,0.82071483,0.021603001,-0.5653258,-0.09117901,0.53379536,0.3414587,0.5453616,-0.15546678,-0.3364104,-0.22873823,0.60283405,0.59814847,0.25122374,-0.383291,0.17169176,0.84279853,0.44907537,0.5267997,-0.09625774,-1.3421572,0.22406173,-0.24470682,0.12965281,-0.38241735,-0.33774087,-0.10995046,0.589401,0.44979167,-0.22554016,0.8778268,0.43125486,-0.8686633,-0.5967879,-1.4374131,-0.25539657,1.3924838,0.5853466,-0.034244806,-1.4558114,0.4511707,-0.25849053,0.33990356,0.2152764,-0.06831853,1.7502408,0.1184783,0.41803136,-0.3255881,-0.09570261,0.26200977,0.6627637,-0.46752343,-0.4685017,0.13586064,0.32329935,-0.6669849,0.21117343,0.109726705,0.66826797,1.3034368,-1.0986664,-0.3277961,0.4691116,-0.9129253,-0.22828025,0.24663775,-0.5322689,0.47675785,-0.452884,1.4386072,0.99298114,-0.6716354,-0.85034,-0.5610125,-0.15597153,-0.007255981,0.40654492,-0.49049032,0.058118887,-0.32707262,0.6032057,0.49300623,-0.58470637,-1.0819697,-0.15788926,-0.18678798,-0.31525463,0.9980391,0.4712864,-0.47014767,0.4895684,0.14231688,-0.72955555,0.21789755,0.384256,-0.8555712,0.5345297,-1.5016692,-0.75741965,-0.037711207,0.2597092,0.030776942,0.11033286,1.0464818,0.61706984,-0.47805458,1.0939751,0.14657195,-0.95354366,0.5017651,0.018953117,-0.15563506,-0.03608648,-0.15937313,-1.518313,0.5762361,-0.1723751,-0.7029707,1.0102767,-0.021147061,-0.11018503,0.66638064,-0.9592749,0.109486386,0.44779548,-0.4151325,-0.4589959,-0.00034145964,0.122165516,0.50295216,0.50199497,0.3325162,0.26591614,-0.3238891,0.08550261,-0.3384234,-0.5626195,1.3283727,-0.049652647,-0.68077505,0.91859674,-1.018047,0.08518267,-0.49562672,0.37117612,-1.1643847,0.93093944,-0.41466457,-0.3158661,-0.65417606,0.19740155,0.040838245,1.2756248,0.8857842,0.30140895,-0.9099823,-0.48168647,-0.20820668,-0.65618545,0.7646798,0.02802181,-0.058481865,-0.9022772,0.015434376,0.30700415,-0.32288995,0.5459266,0.051434357,-1.5745693,-0.98266184,1.2307727,0.26384646,0.62181085,0.8407365,-0.2224542,-0.013833323,-1.807214,-0.33151022,-0.15215693,-1.1984982,-0.87702143,0.3188383,0.55129683,0.10909816,-0.079591066,0.5134644,-0.080159605,-0.34050885,-0.24156813,-0.5126471,-1.0453227,0.47242433,0.023478007,-0.35367706,0.16188939,0.6496892,-0.010519046,-0.3498904,-0.08805974,-0.8876753,0.3734083,0.0128478985,0.33083066,0.16022503,0.32066217,0.16957365,1.1009693,-0.79586506,-0.15569124,-0.90191555,-0.78531677,-0.18413144,1.6886508,-0.35636383,0.70660543,-0.28716925,-0.70433843,-0.39713672,-0.42547467,0.9599571,-0.92671806,0.6044422,-1.0756141,-0.50606024,-2.268691,0.4043352,0.1043736,-0.074548595,-0.25104582,0.9180177,0.6342239,-0.71692526,-0.41647634,1.181744,1.0880692,-0.44438282,0.65504104,0.5424303,1.3606322,0.0009749217,0.39406738,1.2896789,0.18885078,-0.029508729,0.39822268,-0.61435586,0.8322747,0.004133555,-1.1069828,-0.8350842,0.28450784,0.33980063,0.510335,0.39069018,-0.055006165,0.6916322,-0.8119021,0.54737985,-0.9472508,-0.8584014,0.85780823,1.0056858,0.10596657,-0.75458336,0.5186186,0.27412868,0.56641257,-0.1881262,-0.20095426,-0.6771099,-0.46630484,-0.4226067,0.5013752,-0.9415559,0.0636522,-0.98949695,0.880191,-0.30970958,-0.16523269,-0.2769189,-0.5435631,-0.90829074,0.0070394394,-0.836682,0.56054497,0.482223,-0.07325854,-0.089372925,-1.1865246,1.4155725,-0.19120038,0.77540123,0.16673085,0.9217915,-0.06356258,0.34639677,0.4386626,-0.7771646,-0.39495096,-0.30012614,-0.56306463,0.34092706,0.5529756,0.24945277,0.1591185,0.7507473,0.31890357,-0.67797357,0.1450149,-0.10110883,0.75214213,-0.09429047,-1.5078092,-0.84983844,-0.025749115,0.014690482,0.5926375,-0.4678371,0.379845,-0.29838598,-0.22414522,-0.43889776,-1.037938,1.8410997,-0.062078994,-0.028962072,-0.57022196,0.16208313,-1.3306816,-0.509482,0.06952254,-0.109009445,-1.0170765,0.38581505,-0.49552584,-0.52756214,-0.24973363,0.33919138,-0.7079388,-0.9217501,0.68789124,0.4299845,-0.68759894,0.09547739,-0.26625344,0.007239684,0.19492021,0.42677477,1.0403196,0.7697277,0.42793766,-0.6554915,0.039938647,-0.2669678,-0.62574875,-1.2057614,-0.6708622,-0.41484463]	2026-03-19 22:57:01.766
e7cf953d-d59b-44d4-b894-b1087187d2f9	tkwe692jw3pdqarkzduztb93	Gemini\nBest Uses:\nImage analysis\nMultimodal tasks\nGeneral Q&A\nassisting with complex problem-solving.\nGemini\nReasons to Use:\nStrong integration with Google services, good for \nvisual information.\nSafe Use Cases:\nAnalyzing market research data, generating \nsummaries of online content, answering general \nknowledge questions.\nDeepL\nBest Uses:\nLanguage translation\nEnsuring accuracy in \nmultilingual communications\nGitHub Copilot\nBest Uses:\nCode completion\nCode generation\nLearning new programming \nlanguages\nMistral Le Chat\nBest Uses:\nGeneral Q&A\nGenerating code\nDrafting text\nDeepL\nReasons to Use:\nSuperior translation quality compared to other free \ntools.\nSafe Use Cases:\nTranslating internal documents, communicating \nwith international colleagues, reviewing translated \nmarketing materials.\nGitHub Copilot\nReasons to Use:\nEnhances coding speed and efficiency\nSafe Use Cases:\nWriting unit tests, generating boilerplate code, \nexploring alternative solutions.\nMistral Le Chat\nReasons to Use:\nEasy-to-use interface, capable and efficient for \ndifferent tasks.\nSafe Use Cases:\nBrainstorming project ideas, assisting in initial \ncode draft, summarising documentation.\n\nImportant Considerations\nData Privacy: Never input sensitive or confidential company information into \nthese tools.\nAccuracy: Always verify the output of AI tools. They are not infallible.\nBias: Be aware that AI models can exhibit biases. Critically evaluate the results.\nCopyright: Respect copyright laws when using AI-generated content.\nCompliance: Adhere to all company policies regarding AI tool usage.\nBy following these guidelines, you can use the power of AI to enhance your \nproductivity while ensuring data security and ethical practices.\nNext Steps\nFamiliarize yourself with each tool's features and limitations.\nExperiment with different use cases to discover how these tools can best \nsupport your work.\nStay updated on the company's AI usage policies and guidelines.\nShare your experiences and best practices with your colleagues.	503	1	\N	[0.05600838,0.77322555,-2.5437047,-0.2266093,1.392787,-0.93188494,0.20702183,-0.4597215,-0.4002021,-0.22584142,0.009109483,-0.2232526,1.5648874,0.17517926,0.11452741,-0.5423775,0.33332,-1.4284557,-1.2012218,1.383891,0.5435752,-0.37279606,0.36015353,-1.2654427,0.62998843,0.26050848,-0.39951012,0.41694397,-0.8237939,0.28804883,0.010530786,-0.031516265,-0.9361568,-0.29655004,-1.0850132,-0.64826417,0.8875365,0.65873533,-0.41381416,0.25338033,0.3879404,0.515163,0.13400364,-0.58407474,1.3627658,-0.57357836,0.828385,-0.49779102,1.0439,-1.3029964,0.13103682,-0.40508994,0.9964038,0.17783636,1.6480912,0.5005874,-0.56022733,0.35769436,0.20976092,-0.5977409,1.4855245,1.8979169,-1.0192652,0.78550595,0.7019521,-1.0506945,0.5406602,0.14024712,-0.38175225,-0.40195093,0.5478242,-0.05700347,0.40873605,0.90997857,-1.187744,-0.9127369,-0.33938578,0.20512845,0.019188246,0.81986564,0.22244938,-0.089573264,0.56346256,0.5115304,1.495606,-0.98927546,-0.18475446,-0.5818771,-0.69804573,0.98358965,-0.19771738,0.09738955,-0.103360794,0.2692262,-0.74855965,-0.057633687,0.073152855,-0.032691047,-0.33372223,-0.18624827,-0.5313578,-0.40927947,0.29476473,-0.3056762,0.045730606,0.7403178,0.8553025,0.29494458,-0.88755363,0.30518183,-0.24864183,0.34992197,-1.2696933,-0.3801764,-0.20043233,-0.74424684,0.87837636,-0.3278747,-0.10627962,0.42415884,-0.15736212,-0.3461977,-0.24928802,-0.14058252,0.33235362,0.5857661,-0.4598849,-0.04022467,-0.9840184,-1.017779,0.08629759,0.060625706,-0.02762324,0.6286067,-0.4105788,0.92859584,-0.8555996,0.09854788,0.77367586,0.3138462,0.50304586,0.30907544,-0.5278616,-0.07272167,0.14454903,-0.19318207,-0.47854224,-0.24473926,-0.6107068,0.55867517,0.01894121,0.49220732,-0.037935417,0.89453083,0.74366426,-0.19100039,-0.6000771,0.17956491,0.05673503,0.46192652,0.95391357,-0.14313693,-0.1327035,1.4893236,-0.19296345,-0.48958078,-0.20192546,1.015318,0.46345073,0.091763295,-1.4892526,0.08587683,0.05460999,-0.14927979,0.36331123,-0.0048090257,0.47800395,-0.29044774,1.0467635,0.11590958,-0.30255908,-0.771941,1.1103323,-0.010250648,-1.420064,-1.1925931,0.87770367,-0.7605289,0.016666558,-0.20848647,0.5715036,0.15022123,-0.8410834,0.41461724,-1.0031463,-1.1891251,0.35638523,-0.3173114,0.8253949,-1.0503871,-0.882239,0.35822448,-1.0837876,-0.23583634,-0.5771905,0.81835186,0.29923773,0.504302,-0.27478015,0.2814415,1.0756809,-0.589428,0.5513368,0.75418967,0.2924783,-0.15047161,-0.39423785,-0.56965876,-0.8274237,0.57031006,-0.08040673,-0.08248509,-0.045573957,-0.1959259,0.049523152,-0.07003977,-1.1344265,0.09443662,-0.110887334,0.26190132,0.0040234,-1.4085728,1.1654527,0.03655722,0.26619032,0.7593528,0.032481674,1.1547139,0.0039116833,0.8438294,0.47849905,0.459717,-0.6533514,-0.01563299,-0.11780398,0.06217511,0.4297666,0.21762809,0.0123009505,0.89543605,0.31003278,0.3729393,0.41575527,1.0023537,0.48851752,-0.58282757,-0.32553452,0.17153826,0.34672242,0.43554232,0.60697794,0.062209044,0.4927637,-0.62088907,0.06400299,-0.19912907,-1.2710967,0.55505985,0.04391685,0.32767266,-0.22206195,0.64348936,-0.03427469,0.8148043,-0.25642955,-0.34198856,0.3435547,-0.66478336,-0.008619723,0.070759445,-0.6640762,-0.7138607,-0.016086606,0.6550518,-0.36941847,0.5559893,-1.1207181,0.15426478,-0.19630557,-0.70721954,0.45782498,0.27721435,-0.12229137,0.37230086,-0.39947227,0.95495886,0.5115788,-0.56930006,0.1821266,-0.68211234,0.382518,0.9663539,0.92058843,1.4502541,0.33521533,-0.101178296,0.4068359,0.0446158,0.06941693,-0.562067,-1.0132802,-0.71596533,-1.2968054,-0.006957711,-0.82409483,0.95249724,0.7380564,-0.15258272,0.3422826,0.4205746,0.077501535,-1.1172937,0.6488466,-1.0648605,-0.28471372,1.609797,-0.43183807,-0.00088798767,-0.16063994,0.09524042,0.06040987,0.6788518,1.3324325,-0.9726419,-0.45742807,0.5689015,0.41587284,-0.13809519,0.17207403,0.44774976,0.46958828,0.03621997,-0.10098545,-0.6310057,-0.58637553,-0.26050332,-0.34890634,-0.06985819,0.8673365,0.64407957,-0.17702731,-0.017294608,-0.10489149,-0.5460951,0.56270206,0.17304406,-0.034731153,1.145282,-0.3182513,-0.691992,0.904675,0.58701503,-0.21884693,0.2728192,-0.39028484,0.27776128,1.4478076,-0.21730445,0.2985118,0.037404705,-0.27798697,-0.20518142,-0.37657073,0.30544034,-0.1414741,0.23516724,-1.6850175,-0.20436123,-0.13054761,0.5270737,0.74988294,-0.088477954,-0.68303615,0.027310887,0.66008335,-0.48197487,0.5012591,-0.22131559,-0.015281781,0.13218388,-0.52147895,-1.0094421,-0.3120443,0.24214284,0.7421849,-0.9926457,-0.017474197,0.0012164367,0.3869041,0.6916216,-1.0754403,-1.1534185,0.36099294,-0.0080557065,-0.21631056,-0.10557914,-0.0507746,-0.43506494,0.63263166,-0.05490701,0.5236554,0.086284794,-0.14370619,-0.2496389,0.2527556,0.2331146,0.39351976,-0.3056674,-0.30603653,-0.41259438,0.48677242,-0.08083615,0.35412663,0.069607034,0.50241274,0.3450827,1.0686791,0.7153584,0.3762194,-0.622128,-0.042628266,0.21166937,0.51459193,-0.7444785,-0.0840755,-0.18963093,0.8814024,1.0960346,-0.3812139,0.14800683,0.2529709,-0.442933,-1.225567,-1.449119,-0.24367517,1.6075559,0.8762769,-0.24299617,-1.0794187,0.80796766,0.022988763,0.551554,0.19375484,0.15333308,1.6868156,0.20528346,0.7229564,-0.36597356,-0.09816173,0.1418007,0.8378199,-0.09686857,-1.1519252,-0.19923939,0.26370278,-0.6340069,0.24240942,0.1583048,0.66516435,0.6503086,-1.1253824,0.33823845,0.6769517,-0.73185235,-0.08583737,0.3763422,-0.76967883,0.7504076,-0.14375912,1.5455052,0.35094243,-1.0562432,-0.49010774,-0.45881984,-0.29316336,0.42566076,0.29504594,-0.5675142,-0.21168242,-0.29411313,0.5039652,0.43467358,0.14279197,-0.9858608,-1.2463417,0.34508187,-0.25219938,1.0235722,0.74576306,0.45269766,1.0517476,0.038227826,-0.9931455,0.35568565,0.33492106,-0.58678323,1.4796325,-1.2454219,-0.72681284,0.6122982,0.46642345,0.032145582,0.4461231,0.5740307,0.61376333,-0.5100525,0.58154976,0.39834437,-1.2834723,0.37693653,0.10915852,-0.39511314,-0.39547357,-0.18740535,-0.7726414,0.07850043,0.38567638,-0.36182433,0.90007895,0.024331339,-0.25635874,1.0672467,-0.77624136,-0.57445514,0.6542025,-0.43462807,-0.7950632,-0.80232227,0.47548762,0.36199662,0.70935124,0.36172807,0.5953067,-0.19524574,0.5374239,-0.06604075,0.32728645,0.5305047,0.13996135,-0.8949133,0.7403892,-1.043828,-0.14876275,-0.2251953,0.6574001,-0.32180634,0.48717585,-0.12785889,-0.6109398,-0.94142854,-0.028747546,-0.01829686,0.97303915,0.7727329,0.055737115,-0.44829807,-0.52077395,-0.07780795,-0.40257272,0.66577846,-0.6187904,-0.47955695,-0.7924784,-0.4219178,0.09853048,0.13370165,0.800047,-0.11014379,-1.1201288,-0.5950343,0.8872491,-0.40016568,0.1622784,0.8957538,-0.8158478,0.21829084,-1.363577,-0.11315981,-0.24489272,-1.6030068,-0.85723275,0.5454134,0.96466625,0.5410539,0.12466356,-0.006661614,0.22907,-0.3677498,-0.3081091,-1.0497922,-0.79850703,0.8953727,0.7921857,-0.25630313,0.22131474,0.72219324,-0.4358984,0.23243868,-0.7246833,-0.9599095,0.08123067,0.09547571,-0.34570855,0.5085884,0.37091178,-0.30278963,1.1377933,-0.653969,0.286494,-1.1328287,-0.48426324,-0.65522194,0.67282176,-0.97886705,-0.09842551,0.722118,-1.0974356,-0.8152756,-0.15936169,0.5757073,-0.7523489,0.75177485,-1.1878043,-0.14684954,-1.8324013,0.5427776,0.41754985,0.23910537,0.050211243,1.0382186,0.35828528,-0.39026532,-0.5310915,0.25426406,0.9449894,-0.67664564,0.8145307,0.47769284,0.7604215,-0.17261174,0.57366043,1.4194515,0.547487,-0.44836923,0.18996617,-0.32919735,0.7426895,-0.20369641,-1.2852486,-1.0868245,0.17040493,0.30522767,0.5630603,0.062413152,0.65643704,0.7703783,-0.46843395,0.6277354,-1.1988564,-1.0075226,0.17869094,0.8426549,0.1102213,-0.6695175,0.40867108,0.17296392,0.582505,0.07541592,-0.47409958,-0.04882597,-0.2173015,-0.19282663,-0.1413661,-0.74576354,0.21937668,-0.6431242,0.29183406,-0.10136947,-0.6234299,-0.37617606,-1.128974,-0.23931488,-0.27364367,-0.51392674,0.33332008,0.53562737,-0.2871996,0.17552558,-0.37943077,1.1703796,-0.3883304,0.3731772,0.36534935,0.44698068,-0.28953847,0.06600912,0.75378174,-0.9772187,0.17280483,-0.7637984,-0.9774649,0.100168124,0.28377497,0.48572078,-0.11579146,1.0862057,-0.2701275,-0.55401206,-0.33132696,0.32861897,1.1607335,-0.40923756,-1.2589663,-0.36134776,0.2840164,-0.21312928,0.33575603,0.012944984,0.056524474,-0.0514792,0.01729131,-0.17427619,-1.2975351,1.3432477,-0.56845003,0.41370994,-0.53433096,-0.6866299,-0.9389588,0.0745563,-0.28304386,0.8211513,-0.7004123,0.7228855,-0.29364026,-1.2946414,-0.2521031,0.9267884,0.32719627,-0.65432584,0.72262484,-0.20905182,-0.3037626,-0.09009547,-0.48415995,-0.34585178,0.0073636724,0.7277748,1.7704765,0.44555858,0.42451403,-0.75908494,-0.11235847,-0.55034333,-0.37270376,-0.7611283,-0.91338193,-0.21038061]	2026-03-19 22:57:02.005
2ec62279-d41c-41e1-9f66-bd155014dc28	l5vfzpeoxplgxugoipmwack5	IT-FREIGEGEBENE KI-TOOLS\nHier finden Sie eine Übersicht über von der IT freigegebene KI-Tools, die zur \nVerbesserung Ihrer Produktivität am Arbeitsplatz eingesetzt werden können. Alle \naufgeführten Tools bieten eine kostenlose Nutzungsstufe und sind für die Nutzung im \nRahmen der festgelegten Richtlinien bei Meiller freigegeben.\nBitte beachten Sie die jeweils definierten sicheren Anwendungsfälle für jedes Tool.\nWichtig: Prüfen und befolgen Sie stets die unternehmensweite KI-Nutzungsrichtlinie. \nWenn Sie unsicher sind, wenden Sie sich bitte an die Meiller IT.\nMeiller IT-freigegebene KI-Tools\nChatGPT\nBeste Einsatzbereiche:\n• E-Mails entwerfen\n• Texte zusammenfassen\n• Ideen entwickeln (Brainstorming)\nPerplexity\nBeste Einsatzbereiche:\n• Recherche\n• Beantwortung komplexer \nFragen\n• Themenexploration\nClaude\nBeste Einsatzbereiche:\n• Kreatives Schreiben\n• Überprüfung längerer Texte\n• Detaillierte Analysen\n• Vibe Coding\nChatGPT\nGründe für die Nutzung:\nEffizient, vielseitig und weit verbreitet verfügbar.\nSichere Anwendungsfälle:\nErstellung interner Kommunikation, \nZusammenfassung öffentlicher Berichte, \nBrainstorming für Meeting-Agenden.\nPerplexity\nGründe für die Nutzung:\nLiefert Quellen zu den Antworten und verbessert \ndadurch die Nachvollziehbarkeit.\nSichere Anwendungsfälle:\nRecherche zu Branchentrends, Verständnis von \nWettbewerbsaktivitäten, Recherche zu Best \nPractices.\nClaude\nGründe für die Nutzung:\nSehr gut im Verständnis von Kontext und \nNuancen bei komplexen Aufgaben.\nSichere Anwendungsfälle:\nÜberprüfung interner Dokumente, Erstellung \nkreativer Marketinginhalte (nach Freigabe),	402	0	\N	[0.11635377,-0.31226212,-2.5463421,-0.17596242,0.18487322,-1.007867,-0.119891144,-0.10062342,-0.3688752,-0.2892729,-1.0499463,1.0720981,-0.0009128524,0.7120005,0.82710046,-0.91468394,0.26007804,-0.3936847,-1.3187687,0.3824844,0.3758962,0.065253116,-0.25695485,-0.60253835,1.1522664,2.1791258,0.46025103,0.22072536,-1.014082,-1.0454763,0.3762165,0.15224618,-0.85063785,-0.011874459,-0.879571,-0.8758332,0.35277534,0.98684907,0.49384126,0.3006657,0.7202558,-0.38155138,0.23050319,-0.5603609,0.7363499,-0.119401895,0.44310513,0.20066133,1.6083599,-1.4610559,-0.7452338,0.7366395,0.71436507,-0.6397679,1.0974044,-0.24049489,-1.2624848,-0.5042334,0.70299333,-0.14880508,0.07983507,1.009727,-0.549128,0.6484661,0.29827458,-0.88751364,-0.6826621,1.7817435,1.250278,-0.2698402,0.630837,-0.28359392,0.32201076,0.8734028,-0.20141213,-0.6978549,-0.5030549,-0.54443115,0.19772166,-0.5859115,0.3079948,0.019878771,1.6181334,-0.46693724,0.49845037,-0.40405458,-0.62145716,-0.7518929,-1.6447618,-0.3499889,0.9615632,-0.034754317,-0.9487246,-0.1756575,-1.4602926,-0.06639219,0.19640605,1.9611734,-0.25454545,-1.1490723,-0.20337051,-0.3734699,0.28828943,0.01583402,0.1087831,0.034455713,0.8225953,-0.33719876,-0.009522157,-0.97503614,-0.17940465,0.18745764,-0.8713711,-0.59762186,0.3740691,0.6048082,0.5393561,0.2297556,1.5281125,0.56584525,-0.6225513,-0.32405105,0.22156635,0.4747016,0.7820344,0.23154524,-0.49774867,-0.27331576,0.7464283,-0.5125205,-0.17130968,0.17702505,0.8329957,-0.7253904,0.56062454,0.41709986,-0.59706,-0.84714156,1.0342261,-0.7412192,0.056026477,-0.12943512,0.1473824,-0.5157407,-1.121397,-0.54437345,0.83729166,-0.5157748,-2.1157932,0.66582155,0.079711996,-0.18319887,0.05869125,0.56764394,-0.5342001,-1.1137848,-0.56155133,0.37623888,-0.043255266,0.45296562,0.71689487,0.21650258,-0.90572387,1.0962577,0.030203963,-0.1809856,-0.76892996,0.44192272,-0.7295618,-0.37835014,-1.2048393,-0.14713532,-0.13684255,-0.21646833,0.69184655,-0.24132265,0.08767014,-0.6695283,-0.038325544,-0.05632528,-1.1127237,-0.22521965,0.7225533,0.4781602,-0.26768503,-0.41213784,1.0342569,-0.4887325,-0.01207906,-0.5455214,0.23998907,0.74950254,-0.6763844,0.43597776,-0.9299865,0.014095087,-0.3394841,0.5350328,0.4751835,-0.66805977,-0.24857031,0.085756056,-0.60777754,-0.27382538,0.008449888,0.14937706,-0.24867977,0.5490518,0.27203965,-0.02479151,0.1866572,-0.5162471,0.61861956,0.16978425,0.34777826,-0.094861746,0.37979946,-0.00343956,0.21500964,0.5244633,1.2367069,0.12424544,0.40969962,-0.4888492,0.5976554,-0.30199704,0.17407714,1.0153534,-0.050028306,0.45803234,-0.25757912,-1.5528337,-0.24343489,-0.05592943,0.3404739,1.2935624,-0.19168632,1.2958674,0.71749526,1.7482228,-0.45488968,0.14228228,0.345524,-0.5460635,-0.77630013,0.45843354,-0.5151613,-1.054512,-0.050350532,1.6847863,0.112639114,-0.17213726,0.7821243,0.65738434,-0.050333302,-0.27914125,-1.2920306,-0.69007087,0.02768725,0.22896437,0.70152044,-0.9707269,-0.6031448,-0.56128806,-0.4594066,-0.45003346,-0.5520982,0.3299138,0.43464908,-0.5468259,-0.61675996,0.39753646,-0.37607133,0.92003185,-0.51690847,0.17540473,0.6640279,0.14750583,-0.010459594,0.03912255,-0.37247714,-0.42413345,0.5428963,1.1613655,0.11039017,0.14272365,0.26288664,1.2323484,1.0004066,-0.19987367,0.8856407,-0.028655682,-0.048909217,0.12000552,0.27979857,0.83466643,-0.33974075,-0.57600576,-0.330615,-0.24727136,0.92428035,0.04847935,1.5816011,-0.4502708,-0.5923827,-0.13744177,0.32097167,0.11412803,-0.3538033,0.06375861,-1.2071785,-1.4647719,-0.46443647,0.20666987,-0.51703066,0.28745085,0.9296955,0.13260408,1.4016657,-0.19489034,-0.18097298,0.28609347,1.0103163,-1.7671281,0.12183273,1.1545256,-0.64699876,0.4930667,0.11217426,-1.0024189,-0.23066159,-0.047869764,0.584153,-0.9612629,-0.12237696,0.27951556,0.6005212,0.4247597,0.4898652,-0.108446606,0.3225574,-0.2870216,0.4837492,-0.18285798,-0.49315253,-0.08869278,-0.4856834,-0.036480762,0.23553997,0.891716,-0.24405223,0.47669634,-0.19031468,-0.4071452,-0.27306,-0.20381588,0.08986261,0.961386,0.8100036,-0.8139748,0.12451079,0.63398045,-0.42397967,0.41518548,-0.5992268,0.26940688,1.1730474,-0.13092469,0.26860946,0.31730762,-0.19161665,-0.42696968,0.6553868,-0.538732,0.023110699,-0.15018758,-0.61089796,0.07245507,-1.5201447,-0.67499393,0.17418821,-0.6616662,0.46627238,0.9273462,1.1144134,-0.04710538,0.9771155,0.12636389,-0.3693417,1.2697686,0.4270213,-0.65496546,-0.31426486,-0.609881,0.39778414,0.18620025,0.33489218,0.9179657,-0.56999636,0.77568674,-0.3089166,-0.8840653,0.592347,0.24576251,0.036587503,-0.42124924,-0.7829238,-0.6443256,0.41766164,-0.4909412,0.46354446,0.47538114,-0.64338034,-0.9443457,0.43811527,-0.37101677,0.7014318,-1.2097418,1.220212,0.27973843,0.30901387,-0.06946369,0.3651503,0.19529259,-0.20313808,0.86221045,-0.14795901,-0.20764561,0.11503831,-0.076385215,0.16186245,0.8121202,0.77659255,-0.80821365,-0.14446402,0.20244484,0.07812621,-0.124724925,-1.221654,1.7100902,0.6826065,-0.590378,-0.34379488,-0.39083266,0.9606918,0.40335146,1.2233045,-1.4587744,0.17914815,-0.04399621,0.36318487,0.38450283,-0.16340469,0.030226044,2.116713,-0.41483238,-0.9186034,-0.4673912,0.108947195,0.63709205,0.6206628,0.083699964,-0.5896521,-0.0809601,0.41201416,0.020849884,-0.44195056,0.39557287,-0.03131843,0.859022,-0.534166,0.56861883,0.60600674,0.39864817,0.22313704,1.2094625,-1.6935607,0.25946274,-1.1028401,1.458363,-0.4304416,-1.2765341,-1.0645125,-1.688229,0.012115258,0.56684047,0.53718936,0.2622796,0.37519214,-0.738857,0.900896,0.047565795,0.36508924,0.07658331,-0.3393409,-0.007820358,-0.75147355,0.36678848,1.5570376,0.42082793,0.94784725,-0.1578037,0.20399083,-0.6802342,0.696513,0.14771545,0.6347506,-1.164332,-1.4749554,0.11366201,-0.3109658,-0.82411116,-0.036617678,0.23056954,0.06852712,-0.19792117,-0.30059424,-1.0180887,-0.942595,-0.48786804,0.88715726,-0.052626703,0.1268274,-0.80939215,-1.8904984,0.23627026,0.27333954,-2.057561,0.11831005,0.37639746,-0.09297493,-0.54717433,-0.8285338,-0.28857526,0.79581654,-0.8602088,-0.0063873883,-0.39396614,0.9192687,1.6352375,-0.2255741,0.9554565,-0.36360052,-0.307021,-0.22545883,0.4353321,-0.9605054,0.68754256,-0.0863132,-0.91498893,0.76565284,-1.4318163,0.19416024,-2.345822,0.70372534,0.87858087,0.31406036,-0.4617705,-0.1707904,-0.2512304,0.122127004,-0.75876516,0.26512036,0.56532645,-0.66889423,-0.7976527,-0.22194667,-0.38711768,0.6398796,1.5663037,-0.23552725,-0.9709821,-1.3225121,-0.13882565,0.11333722,-0.7484559,0.556192,0.02455577,-0.80976766,0.037757933,1.1503632,-0.28186506,-0.091925204,0.65303355,-0.8472386,1.0997694,-0.45769334,-0.9577806,0.7589814,-1.0072912,0.2575126,0.785558,0.032374233,0.5031919,0.19762689,-0.3638483,0.9261828,-0.20579626,-0.6462392,-1.1772513,-0.6033145,0.59489673,1.6265991,-0.63629717,0.30646083,0.051603474,-0.53155905,0.28628412,-0.55581236,-0.048015703,0.21483898,1.0397395,-0.8487563,0.055317212,0.3150605,-0.5884831,1.2187585,-0.083003104,-0.7404903,-0.9619264,1.2753779,-0.36291513,-0.2793885,-0.2994646,0.3582168,-0.58655024,-1.3349072,-0.63752204,-0.8649494,-0.29879683,-0.37884185,-0.15470706,-1.6060581,-0.41857168,-0.6069874,0.58688754,0.08637542,1.0322669,0.6321276,0.855855,0.5003356,0.17973958,-0.5090672,1.2183126,0.9304949,-0.5800754,-0.10017237,-0.35125908,0.53776383,-0.34973836,0.777912,1.1795378,0.9906628,0.20015211,0.7678935,-0.6375342,1.1926761,0.16555983,-0.8264119,-0.70176184,-0.72790897,-0.25154802,-0.22637577,0.035031784,0.37940642,-0.35708368,0.4145344,0.090148985,-0.17912625,0.4462139,-0.15242854,0.21999787,-0.04476127,-0.3653935,-1.0061989,0.9691958,1.1678708,1.303536,-0.19977303,0.039704733,0.4504534,0.98389345,-0.5593298,-0.24974757,-0.33643433,-0.7891482,0.47437853,0.008306465,-0.3514761,-0.39346758,-0.96263754,1.2414447,0.82955235,-1.1774337,-0.5215193,0.3757582,-0.18155427,-0.9674454,0.07816255,0.67215055,0.78025717,-0.056072537,0.15905397,-0.12821053,0.083694085,-0.6192654,0.32363907,0.167472,-0.0320243,0.13728291,-0.09038544,0.4689032,-1.1033442,0.7374158,0.20473905,0.74869114,-0.22630258,-0.12268026,-0.16072932,0.8378663,0.12287612,0.041425385,-0.2662762,-0.71060604,0.13586655,1.3163301,0.939312,-1.1832201,1.7719195,-0.4281234,-0.614487,0.28053105,-0.8847811,0.6359272,0.3226905,-0.6012573,0.1107582,-0.2749712,-0.5151223,-0.20847654,0.010740255,0.7566068,0.81040853,1.6862533,-0.37334445,0.21227589,-0.44535527,-0.117157176,-0.09890216,-1.1807212,0.25895452,0.09442632,0.29207003,0.34052765,-0.11037651,-0.35192508,-0.084888555,0.94988674,1.7044295,0.27815816,-0.0011125595,0.3830792,-0.94062185,0.6862986,-1.5726211,0.1874929,0.61526966,-0.92744416]	2026-03-19 22:57:16.969
2ccf6de9-caf2-47b0-97e9-5a91d6d52959	l5vfzpeoxplgxugoipmwack5	Gemini\nBeste Einsatzbereiche:\n• Bildanalyse\n• Multimodale Aufgaben\n• Allgemeine Fragen & Antworten \n(Q&A)\nUnterstützung bei komplexer Problemlösung.\nGemini\nGründe für die Nutzung:\nStarke Integration mit Google-Diensten und gute \nFähigkeiten bei visuellen Informationen.\nSichere Anwendungsfälle:\nAnalyse von Marktforschungsdaten, Erstellung \nvon Zusammenfassungen von Online-Inhalten, \nBeantwortung allgemeiner Wissensfragen.\nDeepL\nBeste Einsatzbereiche:\n• Sprachübersetzung\n• Sicherstellung der Genauigkeit \nin mehrsprachiger \nKommunikation\nGitHub Copilot\nBeste Einsatzbereiche:\n• Code-Vervollständigung\n• Code-Generierung\n• Lernen neuer \nProgrammiersprachen\nMistral Le Chat\nBeste Einsatzbereiche:\n• Allgemeine Fragen & Antworten \n(Q&A)\n• Generierung von Code\n• Erstellung von Textentwürfen\nDeepL\nGründe für die Nutzung:\nÜberlegene Übersetzungsqualität im Vergleich zu \nanderen kostenlosen Tools.\nSichere Anwendungsfälle:\nÜbersetzung interner Dokumente, Kommunikation \nmit internationalen Kollegen, Überprüfung \nübersetzter Marketingmaterialien.\nGitHub Copilot\nGründe für die Nutzung:\nErhöht Geschwindigkeit und Effizienz beim \nProgrammieren.\nSichere Anwendungsfälle:\nErstellen von Unit-Tests, Generierung von \nBoilerplate-Code, Erkundung alternativer \nLösungsansätze.\nMistral Le Chat\nGründe für die Nutzung:\nEinfach zu bedienende Oberfläche, leistungsfähig \nund effizient für verschiedene Aufgaben.\nSichere Anwendungsfälle:\nBrainstorming von Projektideen, Unterstützung bei \nersten Codeentwürfen, Zusammenfassung von	380	1	\N	[-0.14884324,-0.68759227,-2.6344109,-0.43865195,0.077936895,-1.1137152,-0.5631966,0.0759542,-0.29159567,0.466961,-0.9438376,1.5736074,0.44844112,1.1081386,1.0155917,-0.65977573,-0.19650503,-0.74880797,-1.4627377,1.5805361,0.1285506,0.13781773,-0.087487936,-1.4569231,1.6056153,1.7965771,0.028608087,-0.27483848,-1.2976459,-1.0076278,0.69068545,-0.4223324,0.060418066,-0.14535087,-1.2794507,-0.6728994,1.4734786,1.192245,-0.025588226,0.19236745,0.84686565,-0.3120068,0.4695746,-1.0715967,1.4856831,0.18448743,0.061894584,-0.08231336,1.4185959,-1.0370889,-1.0692356,0.5130862,0.64936066,-0.91247946,1.9379193,0.04026781,-1.162869,0.23427269,1.4049963,-0.2799235,0.24660227,0.4760391,-0.4137023,0.506802,0.37651533,-1.0004293,-0.5472121,1.926967,0.70942324,-0.352826,0.27837557,-0.12716976,0.70563257,0.84396803,0.13158178,-0.8475192,-0.33613974,-0.045800187,0.24674329,0.20048341,-0.060898732,0.0682875,2.032963,-0.49042487,0.40769413,-0.6689963,-0.14046222,-0.41641194,-1.5608795,0.0009778456,-0.049073357,-0.09031831,-0.5082613,0.015024182,-1.2112035,-0.58104384,0.07676698,1.438652,0.47932458,-1.2570053,0.5309136,0.027706672,0.36551836,-0.48888215,-0.06565178,0.1068837,0.70206445,-0.43825132,-0.072752625,-0.99776906,-0.68585134,1.0615195,-1.2539177,-0.43081453,0.5694949,-0.15875156,0.44561863,-0.21253602,0.8023222,0.75447357,-0.6350503,-0.09159009,0.41411662,0.24538422,1.4052839,-0.25004515,-0.3766491,-0.30230802,0.7670048,-0.9733464,0.27666584,0.3028859,0.23997147,-0.26034483,0.56650925,0.9168378,-0.010732392,-0.9051759,1.2737066,-0.67671514,-0.010001072,-0.5260873,-0.57515913,-0.70026326,-1.0123395,-1.0458848,0.68354493,-0.7399806,-1.5809731,0.2011979,0.11204343,0.19756724,-0.28717774,0.60069495,-0.3852724,-1.1528662,0.038091905,0.4612942,0.12146611,0.4396743,0.50161874,-0.7074072,-0.9317106,1.2635866,0.2122326,-0.6946461,-1.026099,0.5491279,-0.615885,-0.65286195,-1.5350829,-0.2574493,0.07069945,-0.114982784,0.23989654,-0.25725123,0.5102436,-1.0703015,-0.4671325,-0.22791302,-1.5905755,-0.060811233,0.8033225,-0.21826515,-0.27206156,-0.3217504,0.38873798,-0.3848632,-0.6945157,-0.011624218,0.87896997,1.0402027,-0.33860317,0.18316588,-0.8297837,-0.096274875,-0.27911645,0.83850515,0.49074623,-0.96056,-0.30331337,0.20123212,0.02690561,-0.74136364,-0.50585246,-0.414943,-0.6688644,0.9920539,0.46863866,0.3778488,0.62737334,-0.3532388,0.5377165,0.47974643,0.19491069,-0.4429729,0.3004434,-0.8095271,0.07949287,0.09239386,1.17458,-0.5607145,0.5657086,-0.6674686,0.49764454,-0.10145118,0.07675637,0.3759692,-0.20103809,0.15231538,-0.70393306,-2.1639512,0.12083125,0.099931784,0.3929484,1.1601708,0.051071666,2.2065709,0.7540264,1.8487788,1.0774107,0.059052903,0.29085052,-0.40989462,-0.89223284,-0.18633889,-0.47559094,-0.5060779,0.42143232,1.4678376,-0.58065075,-0.8263747,0.6229294,0.9717267,0.15835512,-0.68085605,-1.4260142,-0.6470404,0.35060936,1.1785535,0.49384505,-0.23719987,-0.4167291,-0.21691981,-0.40100628,-0.031263433,-0.49479052,0.448674,0.72734535,-0.35836324,-0.35225147,0.51834905,-1.2277591,1.2367238,-0.8141375,-0.110936396,0.6372424,-0.64978486,-0.2608637,0.22623517,-0.09046739,-0.22075436,0.3836147,0.5485376,0.34286886,0.74168766,0.8273879,0.7973178,0.43785506,0.4002722,0.8307398,0.81364524,-0.47790524,0.11248918,0.26653457,0.76965046,-0.31088614,-0.4875541,-0.7014723,-0.24688995,0.9165501,-0.100910746,2.0072718,0.00042058618,0.019255053,-0.5538651,-0.011800801,0.015890269,0.5059967,-0.14859183,-0.62154645,-1.2360848,-0.8210157,0.15821093,-1.0676254,0.42198756,0.44939107,0.15407117,1.3517386,-0.19389307,-0.794176,-0.7780138,0.73975265,-1.5103388,0.08093085,1.2645706,-0.42544773,-0.11246117,0.5651719,-0.91451645,0.049990397,0.6401185,0.6309772,-1.4370015,0.046621382,0.2526917,-0.01257416,-0.12022236,0.5385807,0.08767126,0.527685,0.32391933,0.43817568,0.56285584,-0.6581825,-0.37115228,-0.37070498,-0.6108688,0.3771435,0.21581754,-0.36102498,1.2801296,0.3005077,0.07634397,-0.18510896,-0.08597725,0.28543288,1.2198774,0.27695948,-1.0305942,0.5722333,0.22535364,-0.095700204,0.63883734,-0.7500724,0.23051731,1.0022931,-0.36445564,0.1285094,0.08841895,-0.41216275,-0.47573167,0.5223617,-0.84306145,0.36078072,-0.26164252,-0.12135599,0.14459743,-1.8869373,-0.2256758,0.7400645,-0.5381118,0.16388935,1.0050339,1.0397848,-0.12949172,0.38416153,0.33993745,-0.6915006,1.6256707,0.12865461,-0.10322322,-0.35070884,-0.45510098,0.06998543,0.02891437,0.63712704,0.056065798,-1.2376977,0.8889311,-0.6820329,-1.5344385,0.6534597,-0.021464245,0.21236552,-1.0165825,-0.9750862,-0.6081542,1.5484884,-0.54615724,-0.18590689,-0.10820368,0.0007884002,-0.25906858,0.8162748,-0.0807368,0.60941625,-1.3074859,0.4750758,0.7266221,-0.01125494,0.07867441,0.046173777,-0.13340828,0.5647809,0.3469969,0.09667153,0.7106885,0.103406,-0.6027858,0.86798376,0.66923,1.0573348,-1.0204977,0.5669907,0.3976199,0.21215697,0.37769273,-0.7702066,1.3594021,0.5990096,-0.051559497,-0.65802944,-0.89456415,0.8486607,1.3555408,1.053,-1.4198195,-0.72431237,-0.26336375,0.41268474,1.4610921,0.2603585,0.84840345,2.0714467,-0.9074158,-0.52522683,-0.62324375,0.39671943,0.6217507,0.60886806,0.6883533,-0.5666066,0.1588515,0.6142121,0.24536392,-0.7605796,1.0693591,0.012551958,0.8041067,-0.18783353,0.4330541,0.24627377,-0.09315219,0.640398,0.49929455,-1.3210422,0.3201812,-0.96710956,1.4474521,-0.37993747,-1.0924481,-0.6985634,-0.7410791,0.46137372,0.77961123,0.10933588,0.3946859,0.14323825,-0.3761338,1.206239,-0.22471271,0.45522702,0.20907106,-0.7029743,0.9183263,-0.5293128,0.27568275,1.8780434,0.31776047,1.0505364,-0.3058743,-0.3487568,-0.3509844,0.8986302,-0.46324816,1.2057668,-1.1920964,-1.7026124,0.11610428,0.41705638,-0.8523183,0.4342384,0.8656767,0.039255064,-0.4301707,-0.24191968,-0.9353782,-1.151614,-1.5687257,0.6168616,-0.8525997,-0.231454,-0.46105543,-1.2567774,-0.009213404,0.4613335,-1.9862233,0.13099815,0.08474732,-0.37521473,-0.13261524,-0.6076558,-0.3630014,0.5322711,-1.1750281,-0.614935,-0.3652313,0.59207237,1.0476923,-0.20781124,-0.07040302,0.41719905,-0.19595653,-0.3817951,0.9424508,-0.395825,0.9846024,-0.0871551,-0.77956057,0.44265765,-1.3001328,0.3393288,-1.7693268,0.94500643,0.6052835,0.93342423,-0.793414,-0.73358697,-0.63004607,0.34828284,-0.54311246,0.63760495,0.804115,-0.6653922,-0.9528506,-0.384889,-0.15420151,-0.077235386,1.4544663,-0.29504764,-1.0465752,-1.0262052,-0.28093755,-0.49074736,-0.22294681,0.18172418,-0.4816783,-1.1730281,-0.3328675,0.84489244,-1.0445966,-0.69475,0.7612916,-0.84651124,0.8616729,-0.37896562,-0.91582227,0.7613031,-1.0034829,-0.53557223,0.30072376,-0.13382345,0.24116293,0.6221011,-0.13844714,0.6432044,0.22803488,-0.7626289,-1.0246607,-0.10825267,1.2602689,2.200195,-0.8973338,0.5469767,0.015372841,-0.86732316,0.2257092,-0.2531267,-0.027355531,0.1949983,1.1079534,-0.61170775,0.5954597,0.40998462,-0.67304224,1.2669821,-0.10365483,-0.7263903,-0.77655417,0.40309846,-0.6091499,0.34692165,-0.75844884,0.2229751,-1.0482353,-0.9627114,-0.67269117,0.07279788,0.06468681,-0.594576,0.35786197,-1.5956862,-0.032902107,-0.7998451,0.6952454,0.17921624,0.30220434,1.2775205,0.9738829,0.8562396,0.18596235,-0.48287135,0.39073822,0.752415,-0.8901166,-0.1526368,-0.22928958,0.40942737,0.031907115,1.2538716,1.036937,0.24013108,0.19093764,0.3555969,-0.23701583,1.3817095,0.23605339,-1.0949885,-0.18972705,0.28291854,0.041602362,0.103402674,-0.46497285,0.18698907,-0.63494927,0.5400886,0.22985153,-0.13388239,0.06861593,-0.11819665,-0.052293167,0.18398008,-0.5005241,-1.0171025,0.77725095,0.49512133,1.2307768,-0.56750816,0.6145967,0.46306106,0.50771564,-0.17156863,0.1002702,-0.08302006,-1.3867362,0.31113714,-0.3627391,-0.36385825,-0.16461086,-0.4034856,0.26650077,0.8196653,-0.6827121,-0.85702837,1.0676507,-0.21824288,-0.8544884,-0.10913989,0.97866344,0.64576626,-0.30969688,0.28106847,0.022102574,-0.093556456,0.39678892,1.0916783,-0.14057688,0.21719787,-0.097160555,0.31420314,0.41823134,-0.16733573,1.056118,0.14699318,0.89275515,0.0024725504,-0.732777,-0.17566894,0.87787735,0.294886,-0.5860939,-0.96726596,-1.0172782,0.43399554,1.2128985,1.14593,-1.2348945,1.0451158,-0.12430469,-0.5757987,0.2609877,-0.8443236,0.5369393,-0.16674271,0.0037472402,-0.70115983,-0.31842026,-0.7288499,-0.43865776,-0.7025747,-0.45987087,0.6596704,2.3679278,-0.7434731,-0.11838566,-0.15344742,-0.35802823,0.16255973,-1.342102,0.14952226,0.5554568,0.041704055,-0.266998,-0.27814594,-0.5315643,0.23252802,0.9545359,1.1578877,0.46754852,-0.24172597,0.08504674,-1.1595674,-0.37765333,-1.0378155,0.18433975,-0.43827164,-1.0447973]	2026-03-19 22:57:17.128
b94b6187-7367-453e-abab-104b04b8dfc0	l5vfzpeoxplgxugoipmwack5	Dokumentationen.\nWichtige Hinweise zur Nutzung\nDatenschutz: Geben Sie niemals sensible oder vertrauliche \nUnternehmensinformationen in diese Tools ein.\nGenauigkeit: Überprüfen Sie die Ergebnisse von KI-Tools stets. KI-Systeme \nsind nicht fehlerfrei.\nBias / Verzerrungen: Beachten Sie, dass KI-Modelle Verzerrungen enthalten \nkönnen. Bewerten Sie die Ergebnisse daher kritisch.\nUrheberrecht: Beachten Sie die geltenden Urheberrechtsbestimmungen bei \nder Nutzung von KI-generierten Inhalten.\nCompliance: Halten Sie alle unternehmensinternen Richtlinien zur Nutzung von \nKI-Tools ein.\nDurch die Einhaltung dieser Richtlinien können Sie die Möglichkeiten von KI nutzen, \num Ihre Produktivität zu steigern und gleichzeitig Datensicherheit sowie \nverantwortungsvolle Nutzung sicherzustellen.\nNächste Schritte\nMachen Sie sich mit den Funktionen und Grenzen der einzelnen Tools vertraut.\nProbieren Sie verschiedene Anwendungsfälle aus, um herauszufinden, wie \ndiese Tools Ihre Arbeit am besten unterstützen können.\nBleiben Sie über die unternehmensinternen Richtlinien und Vorgaben zur \nNutzung von KI auf dem Laufenden.\nTeilen Sie Ihre Erfahrungen und Best Practices mit Ihren Kolleginnen und \nKollegen.	299	2	\N	[0.55351967,-0.012387859,-2.4485402,-0.2531847,0.763407,-0.73586035,-0.78795743,-0.66303164,-0.8354106,0.55221903,-0.9392801,1.0705541,0.73387665,1.0049813,0.10403668,-0.75994873,-0.063770704,-0.7806422,-1.1174115,1.1719254,-0.23465364,0.44526386,-0.23002921,-1.1611477,1.3293132,0.87421286,-0.25807178,0.71779656,-0.58818233,-0.7781963,0.36293307,-0.8473132,-0.5361746,0.7099059,-1.278851,-0.9963487,0.57238925,1.4198308,0.46602243,-0.5005002,0.7947987,-0.8544588,-0.19850749,-1.0838904,1.0838389,0.42607024,0.06925218,0.13141945,1.7823037,-0.91549885,-0.65157145,0.40291366,0.73322743,-0.72411674,0.9789901,0.010769005,-0.04060932,0.012332084,0.44307718,-0.52772427,-0.09549858,0.57223266,-0.8571634,-0.07139411,0.3452759,-1.2618062,-0.24937205,1.3707898,1.3472917,-0.4185051,0.52982163,-0.52998644,-0.05252598,0.65542996,0.04720638,-0.63277125,-0.13314839,-0.43295848,0.82002455,-0.028442923,-0.49072114,-0.92753565,1.5272439,0.114093594,1.0154332,-0.2960913,0.44584292,-0.8826077,-1.1377892,0.26953933,0.5374972,-0.39786044,-0.1403897,0.4291479,-1.2091682,0.27099264,-0.100606255,0.80649686,0.5254514,-0.99362844,-0.3162538,-0.27576318,0.16937406,-0.32074043,-0.47359732,-0.6287305,0.94610614,0.5921906,0.2382292,-0.84882164,-0.82328403,0.011792975,-0.94366574,-0.5817339,0.5557378,0.16623214,0.30787832,-0.48252973,0.9200805,0.8088757,-0.7826629,-0.27046576,0.5163784,0.42062706,-0.108370624,-0.002656715,-0.6013774,-0.24079697,1.116626,-0.7068075,0.20788608,0.5531625,0.47423548,-0.51013124,0.7536669,0.36510745,-0.7896558,-0.25524497,1.1365966,-1.0229746,0.33212492,-0.46148637,0.47713995,-1.110347,-1.2473193,-0.46417725,0.94018936,-0.6284635,-1.2267874,-0.16676655,0.012433931,-0.5040877,-0.8658661,0.46685767,-0.35156846,-0.7947936,-0.24234045,0.3278049,0.0736325,0.28072235,0.41930148,0.0948419,-1.1882188,1.0217246,0.5564607,0.34563074,-1.2541428,0.41555464,-0.07858101,0.07512995,-1.553326,0.37897766,-0.03202896,-0.4640322,0.7998253,-0.94383436,0.83339584,-0.49993607,-0.89130366,-0.07498383,-0.6993911,-0.12825038,0.7978439,0.5075648,-0.28619415,-0.006857975,0.48534194,-0.73804706,-0.48939168,-0.15455186,0.047127396,0.4487607,-0.8671402,0.7188784,-0.77117825,-0.044473354,0.04905919,0.84152883,0.64522904,-0.31466454,-0.38291812,0.13382317,-0.3096376,-0.77419376,-0.39601183,0.20256081,-0.4828445,0.64803183,0.8125226,0.67545027,0.4966519,0.31310496,0.20911504,-0.28913617,0.05131959,-0.45107824,0.59440213,-0.5100391,-0.7383952,0.08257385,0.7688143,-0.27228165,0.15958515,-0.30490714,-0.020214181,0.14073062,0.06368131,0.57767695,0.63793325,-0.17100267,-0.18176745,-1.5965186,0.6588124,0.0007899299,-0.93318284,1.3425673,0.7069541,1.1576444,0.07365701,1.1788069,0.3830707,0.6972254,0.94582343,0.16267702,-0.33711618,0.202454,0.41183823,-1.1672376,-0.101362705,1.5033224,-0.5046069,-0.3606873,0.94068927,0.76366186,0.41688356,-0.5899499,-1.6992066,-0.7296207,0.41226983,1.029359,0.36403376,-1.0217423,-0.13974194,-0.6752767,-0.15397319,0.08369229,-0.57523,-0.5093999,0.4859904,-0.4607591,-0.43641043,0.62437373,-0.002527882,1.1978444,-0.7838791,0.07375134,-0.35321566,-0.4205804,0.012513581,-0.12037876,-0.053764585,0.3927713,0.26169747,0.55537224,-0.08555543,0.37617168,0.7831853,1.201475,0.7792354,0.12547186,0.47686648,0.14525466,-0.24132961,0.39848682,-0.09234816,0.40622076,0.13877493,-0.5103221,-0.49685848,-0.34525692,0.58887076,0.06010953,1.3751736,0.20483239,-0.4957667,-0.529955,0.00789758,-0.37942705,0.4774759,-0.38273203,-1.008296,-0.60334194,-0.20154485,0.28963116,-1.1707733,0.015691962,0.3575279,0.30073977,1.6613543,0.17196393,0.042153794,-0.7869628,1.0567226,-0.87072086,-0.38141102,0.85669965,-0.14490965,0.49435914,0.2487319,-1.6953965,-0.039402787,0.8328037,0.71963996,-0.43769073,-1.0360932,0.81530535,-0.5194637,-0.7054598,-0.5042463,0.8762948,0.77824885,0.18181263,0.53018785,0.15491232,0.12164398,0.4943693,-1.1015567,-0.017678456,1.0455836,0.24341401,0.10041858,0.7412509,0.3737451,0.298805,0.24592735,-0.27168754,0.3344181,0.52971715,0.927446,-0.94323766,0.622797,0.32415405,-0.2821889,0.9578552,-0.5722519,0.1463153,0.9762883,-0.086734615,-0.65364385,0.93965715,-0.35744354,-0.21000072,-0.034862418,-0.14023305,0.4820456,-0.105075896,-0.27566433,0.23357856,-1.7777991,0.018403925,-0.030109193,-0.33777472,0.2985778,0.12378383,1.0644585,-0.009751854,0.57023644,-0.19690096,-0.72604185,1.5688401,0.16107444,-0.2764454,-0.4919554,-0.76602435,0.35492927,0.12274552,0.69385016,0.57294965,-0.9114705,0.5835531,-0.73297465,-1.0011008,0.42690986,-0.040953953,0.30969492,0.11035104,-1.1317642,0.11599478,0.9452475,-0.7497577,0.4593493,0.3556855,-0.35428745,-0.3275686,0.82615405,-0.0706785,0.5248701,-1.1864794,0.5614957,1.0940498,0.96999127,-0.4016284,0.16022758,-0.03439569,0.653189,0.66331697,-0.029659955,0.62558883,-0.34002227,-0.41405913,0.7388156,0.1478739,0.37087432,-1.1994005,0.778164,0.14337613,-0.026822083,0.10765011,-1.158669,1.31521,-0.18383805,-0.47249666,0.12220242,-0.5665813,-0.06334084,0.47806042,1.2084334,-1.2710204,-0.14677076,0.34664366,0.36460158,0.7032326,0.081803,-0.13259245,1.7342409,-0.25026923,-0.9227491,0.09793401,-0.0005898945,0.5965167,0.10369354,0.7597513,-0.5844241,0.58606374,0.76067686,0.046011746,-0.29157525,0.53638667,1.2420819,0.4786079,-0.45698094,0.19872284,0.6475903,-0.25624698,-0.44314697,0.58086413,-1.0821939,-0.12710452,-1.034945,1.6931338,-0.14073165,-1.1035883,-0.3489903,-1.038309,0.18269303,0.36037174,0.58488375,0.4248621,0.54946417,-0.8468457,0.8989687,0.3252897,0.09701389,0.0144347735,-1.1236745,-0.5287529,-0.6420668,-0.39408958,1.4534932,0.8805075,0.6696741,-0.3376479,-0.8384871,-0.76849097,1.001938,-0.23879881,0.6392809,-1.1555071,-1.7578512,0.3667404,-0.8086624,-0.17952946,0.67285883,1.0147763,-0.17081213,-0.22771795,-0.24538876,-0.5563505,-0.8544542,-0.33562532,1.1747909,-0.5368839,-0.05058553,-0.9141452,-0.8440877,0.350546,-0.113074526,-1.8133361,-0.040641338,0.46364987,-0.10325304,-0.28222677,-0.08648537,-0.71457744,1.1815182,-1.1148264,0.7313578,-0.8203815,0.52365065,1.7445145,-0.3131267,0.79522324,-0.23925483,-0.11932678,-0.6279395,-0.068432815,-0.78334486,0.36669093,-0.29698563,-0.3256582,0.60571766,-0.8301229,-0.27495745,-2.0204265,0.44408202,0.9513084,0.84701353,-1.2223532,-0.29135376,-0.6219609,-0.12041025,-0.6384549,0.35784507,-0.18420804,-0.09110578,-0.6848291,-0.47263962,-0.6473176,-0.067923404,1.3383967,0.5146675,-0.6178175,-1.2794999,-0.1694875,0.5227094,-0.32913274,-0.4624178,-0.16571164,-1.047399,-0.608819,0.8681218,-0.60810596,-0.16052464,0.6722901,-0.7728528,0.6651241,-0.8486955,-0.9053686,0.39108983,-0.7037751,0.3407001,0.4460759,-0.3223206,-0.2859519,0.54961306,0.18862484,0.8114433,0.5444493,-0.42247295,-0.95986503,0.13488904,0.21940216,1.4346097,-0.561132,0.34640166,0.22494353,-0.078333475,0.73334557,-0.37476268,0.2365061,0.37250462,1.1079932,-1.0091512,0.39688936,0.37236804,-0.6734091,0.68121046,-0.10127646,-0.33792588,-0.8275208,0.25465474,-0.1517672,0.32578957,-1.2731048,0.2173765,-0.73559654,-0.70650035,-0.10404124,-0.7677604,0.39793283,-0.20015503,0.17612742,-1.256707,-0.18861836,-1.0015526,0.62848425,0.20510961,1.2178035,0.690949,1.089867,-0.0026796984,-0.032693233,-0.2469322,1.3467921,0.29573774,-0.10142777,-0.89061254,-0.10722341,0.23430593,-0.17465141,1.0071154,0.8586544,0.8892613,-0.107836,0.6618848,0.39244732,-0.20738514,0.09792818,-0.6924026,-1.2867659,-0.047678277,-0.26615962,0.13137111,0.10142398,0.58113587,-0.2103959,0.9846728,-0.26003152,-0.5669005,0.09310288,0.27208588,-0.3057457,-0.08816569,-1.1070497,-1.1711887,0.82734793,0.60645926,0.8057303,0.26771274,0.23106946,0.52171123,0.44512224,-0.02928453,-0.33747947,-0.10947581,-1.4007567,1.1132083,-0.10104633,-0.94188285,-0.42178282,-0.68635905,-0.088511385,-0.030533023,-0.7630333,-0.49779132,0.067887925,-0.50851685,-0.87261224,0.30344874,0.34092072,0.19849464,0.64999455,0.29896235,0.38299358,1.2146661,0.037573356,1.217949,0.5509583,-0.060665436,0.28333035,0.14636844,0.088960655,-0.5054236,1.5569327,0.39499223,0.5311624,0.19028933,-0.54739076,0.3583303,1.2332163,0.22116035,0.21451299,-0.80915016,-0.7136687,0.23810513,1.2209725,0.25139874,-1.2785109,1.4979285,-0.33258754,-0.4847828,0.36819232,-0.6473473,1.115691,-0.09235777,0.13040283,-0.8325626,-0.072125226,-1.2922593,-0.6266359,-0.060736433,0.29633757,0.9744706,1.8385633,-0.5846866,-0.49439648,-0.5160736,0.6794733,0.09066989,-0.87524396,0.21894656,0.04825053,-0.15066017,0.13804826,-0.5538521,-0.57394296,-0.3333848,0.9579673,1.1561459,0.43886757,-0.031159867,-0.34225377,-0.031102598,-0.21947663,-1.3914914,0.5847731,-0.33438414,-1.216465]	2026-03-19 22:57:17.287
\.


--
-- Data for Name: KbCollection; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."KbCollection" (id, "knowledgeBaseId", "parentId", name, "createdAt", "updatedAt") FROM stdin;
froc9pcl0jho1hegswi229d2	demo-kb-cmmy2g6oc0000ilvjeq4tqvxt	\N	Rex Collection 1773972252375 Renamed	2026-03-20 02:04:12.38	2026-03-20 02:04:12.388
b9cpxupckz1htwimf7ye7zhg	demo-kb-cmmy2g6oc0000ilvjeq4tqvxt	\N	TestCollection	2026-03-20 02:04:22.706	2026-03-20 02:04:22.706
\.


--
-- Data for Name: KbDocument; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."KbDocument" (id, "knowledgeBaseId", "collectionId", title, "fileName", "mimeType", "sizeBytes", "storageKey", source, status, "errorMessage", tags, summary, metadata, "createdAt", "updatedAt") FROM stdin;
tkwe692jw3pdqarkzduztb93	demo-kb-cmmy2g6oc0000ilvjeq4tqvxt	\N	AI-Tools-for-Workplace-Productivity-14	AI-Tools-for-Workplace-Productivity-14.pdf	application/pdf	107256	cmmy2g6oc0000ilvjeq4tqvxt/9fc5eb4b1efc-AI-Tools-for-Workplace-Productivity-14.pdf	upload	ready	\N	{Product}	I T - V E T T E D A I T OOL S Here is an overview of IT-vetted AI tools available for improving your workplace productivity. All tools listed offer a free tier and are approved for use within specified guidelines. Please adhere to the safe use cases outlined for each tool. Important: Always review and comply with the company's AI usage policy. If in doubt, check with the Meiller IT. Meiller IT-Vetted AI Tools ChatGPT Best Uses: Drafting emails Summarizing text Brainstorming ideas Perp	{"pdfInfo": {"Title": "AI Tools for Workplace Productivity", "Author": "Leos Stehlik", "Creator": "Canva", "ModDate": "D:20260306143007+00'00'", "Keywords": "DAHARATMqDg,BACBU78MmMA,0", "Producer": "Canva", "CreationDate": "D:20260306143007+00'00'", "IsXFAPresent": false, "PDFFormatVersion": "1.4", "IsAcroFormPresent": false}, "pageCount": 3, "chunkCount": 2}	2026-03-19 22:57:00.751	2026-03-19 22:57:06.978
l5vfzpeoxplgxugoipmwack5	demo-kb-cmmy2g6oc0000ilvjeq4tqvxt	\N	German-Version-AI-Tools-for-Workplace-Productivity-2	German-Version-AI-Tools-for-Workplace-Productivity-2.pdf	application/pdf	116763	cmmy2g6oc0000ilvjeq4tqvxt/180a163a68cd-German-Version-AI-Tools-for-Workplace-Productivity-2.pdf	upload	ready	\N	{Product}	IT-FREIGEGEBENE KI-TOOLS Hier finden Sie eine Übersicht über von der IT freigegebene KI-Tools, die zur Verbesserung Ihrer Produktivität am Arbeitsplatz eingesetzt werden können. Alle aufgeführten Tools bieten eine kostenlose Nutzungsstufe und sind für die Nutzung im Rahmen der festgelegten Richtlinien bei Meiller freigegeben. Bitte beachten Sie die jeweils definierten sicheren Anwendungsfälle für jedes Tool. Wichtig: Prüfen und befolgen Sie stets die unternehmensweite KI-Nutzungsrichtlinie.	{"pdfInfo": {"Title": "German Version AI Tools for Workplace Productivity", "Author": "Leos Stehlik", "Creator": "Canva", "ModDate": "D:20260306143001+00'00'", "Keywords": "DAHDLjZKRpY,BACBU78MmMA,0", "Producer": "Canva", "CreationDate": "D:20260306143002+00'00'", "IsXFAPresent": false, "PDFFormatVersion": "1.4", "IsAcroFormPresent": false}, "pageCount": 3, "chunkCount": 3}	2026-03-19 22:57:16.653	2026-03-20 02:05:18.731
\.


--
-- Data for Name: KnowledgeBase; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."KnowledgeBase" (id, "tenantId", name, "createdAt", "updatedAt") FROM stdin;
demo-kb-cmmy2g6oc0000ilvjeq4tqvxt	cmmy2g6oc0000ilvjeq4tqvxt	Company Knowledge	2026-03-19 22:53:05.884	2026-03-19 22:53:05.884
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."Message" (id, "conversationId", role, content, "contentText", status, model, "tokenInput", "tokenOutput", "errorMessage", citations, metadata, "createdAt") FROM stdin;
y56si7x30ng6n3u2nhge0gyv	x1wqdhi42db8924ara6g4sw6	user	What can you help me with?	What can you help me with?	complete	\N	\N	\N	\N	\N	\N	2026-03-19 22:58:26.403
f0janjwjwypa22kuebkd2l3z	x1wqdhi42db8924ara6g4sw6	assistant	Hello! I'm Wren from the Wren platform. I can assist you in various ways:\n\n- **Emails & Reports**: Generate professional templates using our 200+ ready-made AI prompts.\n- **Document Management**: Upload and search through company documents for information using our Knowledge Base.\n- **Automated Workflows**: Set up tasks and automate processes with AI-powered workflows.\n- **Multi-turn Conversations**: Engage in detailed discussions and get answers from your company knowledge base.\n\nIf you need help with any specific task, feel free to let me know! To get started, you can explore our Prompt Library or Knowledge Base.	Hello! I'm Wren from the Wren platform. I can assist you in various ways:\n\n- **Emails & Reports**: Generate professional templates using our 200+ ready-made AI prompts.\n- **Document Management**: Upload and search through company documents for information using our Knowledge Base.\n- **Automated Workflows**: Set up tasks and automate processes with AI-powered workflows.\n- **Multi-turn Conversations**: Engage in detailed discussions and get answers from your company knowledge base.\n\nIf you need help with any specific task, feel free to let me know! To get started, you can explore our Prompt Library or Knowledge Base.	complete	\N	172	129	\N	\N	\N	2026-03-19 22:58:26.407
uqidiakt9unpcz37cn61unp2	r9zkf6k8f4l3aw7ag0uxbv33	user	hello Wren, what is this platform about?	hello Wren, what is this platform about?	complete	\N	\N	\N	\N	\N	\N	2026-03-19 22:59:49.879
p059kmjomtj0hsmexp6k44ev	r9zkf6k8f4l3aw7ag0uxbv33	assistant	Hello! I'm Wren from the Wren platform. We help users at Demo Company streamline their work with a range of capabilities:\n\n- **Prompt Library**: Over 200 pre-made AI templates for emails, reports, analyses, and more.\n- **Knowledge Base**: Upload your company documents and get insights using our AI.\n- **Chat**: Engage in multi-turn conversations with AI assistance on any topic related to your company knowledge base.\n- **Workflows**: Automate tasks using AI-powered workflows.\n\nIf you're looking to get started, I recommend exploring the Prompt Library or Knowledge Base. How can I assist you today?	Hello! I'm Wren from the Wren platform. We help users at Demo Company streamline their work with a range of capabilities:\n\n- **Prompt Library**: Over 200 pre-made AI templates for emails, reports, analyses, and more.\n- **Knowledge Base**: Upload your company documents and get insights using our AI.\n- **Chat**: Engage in multi-turn conversations with AI assistance on any topic related to your company knowledge base.\n- **Workflows**: Automate tasks using AI-powered workflows.\n\nIf you're looking to get started, I recommend exploring the Prompt Library or Knowledge Base. How can I assist you today?	complete	\N	175	128	\N	\N	\N	2026-03-19 22:59:49.888
qusfvt36xkx1ils8ut3ykpji	lu9k1xt48mx2ie3gjgpdbbhe	user	ahoj, ty umis prekladat?	ahoj, ty umis prekladat?	complete	\N	\N	\N	\N	\N	\N	2026-03-20 02:26:42.248
xm0p5n6waut9h5o9lo9sh95f	lu9k1xt48mx2ie3gjgpdbbhe	assistant	Of course! I can help with translations using a variety of languages. To get started, could you please specify the text you'd like translated and the target language? Additionally, if you need any formatting or specific style preferences, feel free to let me know.\n\nWould you like to try it out now?	Of course! I can help with translations using a variety of languages. To get started, could you please specify the text you'd like translated and the target language? Additionally, if you need any formatting or specific style preferences, feel free to let me know.\n\nWould you like to try it out now?	complete	\N	172	61	\N	\N	\N	2026-03-20 02:26:42.255
zpmhnrpmox2qimimhaxl2ny6	lu9k1xt48mx2ie3gjgpdbbhe	user	ahoj, ty umis prekladat?	ahoj, ty umis prekladat?	complete	\N	\N	\N	\N	\N	\N	2026-03-20 02:31:21.147
mfh4mavopa3txe2oz2coe12i	lu9k1xt48mx2ie3gjgpdbbhe	assistant	Certainly! I can help with translations. Please provide the text you would like to translate and the language you want to translate it into. For example:\n\n- Original text: "Hello, can you translate?"\n- Target language: English (it's already in English, so we might need another language here)\n\nIf you have specific requirements or additional text, just let me know!\n\nWould you like to proceed with a translation now?	Certainly! I can help with translations. Please provide the text you would like to translate and the language you want to translate it into. For example:\n\n- Original text: "Hello, can you translate?"\n- Target language: English (it's already in English, so we might need another language here)\n\nIf you have specific requirements or additional text, just let me know!\n\nWould you like to proceed with a translation now?	complete	\N	253	85	\N	\N	\N	2026-03-20 02:31:21.153
cxfqj7b5nc21giz5m60dg75z	lu9k1xt48mx2ie3gjgpdbbhe	user	yes	yes	complete	\N	\N	\N	\N	\N	\N	2026-03-20 02:31:45.938
hjmsx1p6yaz8m2sr8jld4b50	lu9k1xt48mx2ie3gjgpdbbhe	assistant	Sure! Please provide the text you would like translated and the target language. For example:\n\n- Original text: "ahoj, ty umis prekladat?"\n- Target language: English\n\nLet me know so I can assist further!	Sure! Please provide the text you would like translated and the target language. For example:\n\n- Original text: "ahoj, ty umis prekladat?"\n- Target language: English\n\nLet me know so I can assist further!	complete	\N	357	49	\N	\N	\N	2026-03-20 02:31:45.943
uzv2ibrgg9ic1v3s9xml2taj	lu9k1xt48mx2ie3gjgpdbbhe	user	hmm but you should be doing this automatically as it is hard-coded in the settings here in the Wren platform ...	hmm but you should be doing this automatically as it is hard-coded in the settings here in the Wren platform ...	complete	\N	\N	\N	\N	\N	\N	2026-03-20 02:32:25.751
iowdwn9uyg258fm0expjg74u	lu9k1xt48mx2ie3gjgpdbbhe	assistant	I understand your expectation. While the Wren platform has been set up with certain capabilities, including translation, let's ensure we're using the tools available within the platform.\n\nTo proceed with a translation:\n1. **Using Translation Tools**: The Wren platform might have built-in or integrated translation features through its Knowledge Base or external APIs.\n2. **Manual Input**: Provide the text you want translated and specify the target language.\n\nFor now, let's manually translate "ahoj, ty umis prekladat?" to English:\n\n- Original text: "ahoj, ty umis prekladat?"\n- Translated text: "hello, can you translate?"\n\nIf the platform supports automatic translations through its settings or APIs, we can explore that further.\n\nWould you like to try this translation now? Or do you need guidance on how to set up automatic translations within Wren?	I understand your expectation. While the Wren platform has been set up with certain capabilities, including translation, let's ensure we're using the tools available within the platform.\n\nTo proceed with a translation:\n1. **Using Translation Tools**: The Wren platform might have built-in or integrated translation features through its Knowledge Base or external APIs.\n2. **Manual Input**: Provide the text you want translated and specify the target language.\n\nFor now, let's manually translate "ahoj, ty umis prekladat?" to English:\n\n- Original text: "ahoj, ty umis prekladat?"\n- Translated text: "hello, can you translate?"\n\nIf the platform supports automatic translations through its settings or APIs, we can explore that further.\n\nWould you like to try this translation now? Or do you need guidance on how to set up automatic translations within Wren?	complete	\N	436	178	\N	\N	\N	2026-03-20 02:32:25.755
zwanuirx4x82xf8608h4twyp	lu9k1xt48mx2ie3gjgpdbbhe	user	ne, to neni to co ocekavam, ja ocekavam to, ze ti budu psat cesky a ty mi budes odpovidat hned tez cesky, takto je to v nastaveni platfromy Wren ...	ne, to neni to co ocekavam, ja ocekavam to, ze ti budu psat cesky a ty mi budes odpovidat hned tez cesky, takto je to v nastaveni platfromy Wren ...	complete	\N	\N	\N	\N	\N	\N	2026-03-20 02:33:33.13
odcnohnb00detagju88vplxe	lu9k1xt48mx2ie3gjgpdbbhe	assistant	"Ano, umím převádět. Jak vás mohu pomoci?"	"Ano, umím převádět. Jak vás mohu pomoci?"	complete	\N	690	149	\N	\N	\N	2026-03-20 02:33:33.135
vd6280ny27eefjgfq7v63011	lu9k1xt48mx2ie3gjgpdbbhe	user	ja nevim, jenom to zkousim, ze na me budes hned mluvit cesky	ja nevim, jenom to zkousim, ze na me budes hned mluvit cesky	complete	\N	\N	\N	\N	\N	\N	2026-03-20 02:34:20.187
dc31bw16elk7q13yy911xg64	lu9k1xt48mx2ie3gjgpdbbhe	assistant	Rozumíme se! Pokračujeme ve češtině. Můžete mi nyní říct, jak vám mohu pomoci? Nebo máte konkrétní otázku nebo úkol, který bych pro vas vyřídil?	Rozumíme se! Pokračujeme ve češtině. Můžete mi nyní říct, jak vám mohu pomoci? Nebo máte konkrétní otázku nebo úkol, který bych pro vas vyřídil?	complete	\N	712	67	\N	\N	\N	2026-03-20 02:34:20.192
nfglsc3pjgyeo2tqawlnob42	lu9k1xt48mx2ie3gjgpdbbhe	user	ano, potrebuji zjistit, jestli jsi se ted prepnul do cestiny protoze to umis coby LLM model, nebo jestli beres v potaz nastaveni platformy Wren	ano, potrebuji zjistit, jestli jsi se ted prepnul do cestiny protoze to umis coby LLM model, nebo jestli beres v potaz nastaveni platformy Wren	complete	\N	\N	\N	\N	\N	\N	2026-03-20 02:35:15.977
gdx9gfrib04mua8o5z2cl3dd	lu9k1xt48mx2ie3gjgpdbbhe	assistant	Rozumím. Chcete zjistit, jestli jsem připraven pro cestu nebo pokud je to něco jako LLM model a máte otázky k použití moje funkce?	Rozumím. Chcete zjistit, jestli jsem připraven pro cestu nebo pokud je to něco jako LLM model a máte otázky k použití moje funkce?	complete	\N	700	150	\N	\N	\N	2026-03-20 02:35:15.982
\.


--
-- Data for Name: Prompt; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."Prompt" (id, "tenantId", title, description, category, department, difficulty, "formSchema", "promptTemplate", "isPublic", "estimatedMinutesSaved", "usageCount", "createdAt", "updatedAt") FROM stdin;
cmmy2g6ov0005ilvja3zkl5qe	\N	Write a Job Description	Generate a compelling, inclusive job description that attracts top candidates.	recruitment	hr	beginner	{"type": "object", "required": ["jobTitle", "department", "keyResponsibilities", "requiredSkills"], "properties": {"jobTitle": {"type": "string", "title": "Job Title", "x-placeholder": "e.g. Senior Product Manager"}, "department": {"type": "string", "title": "Department", "x-placeholder": "e.g. Engineering"}, "niceToHave": {"type": "string", "title": "Nice-to-Have Skills", "x-field-type": "textarea", "x-placeholder": "Optional: bonus qualifications"}, "employmentType": {"enum": ["Full-time", "Part-time", "Contract", "Freelance"], "type": "string", "title": "Employment Type", "x-field-type": "select", "x-enum-labels": ["Full-time", "Part-time", "Contract", "Freelance"]}, "requiredSkills": {"type": "string", "title": "Required Skills", "x-field-type": "textarea", "x-placeholder": "List must-have skills and experience"}, "keyResponsibilities": {"type": "string", "title": "Key Responsibilities", "minLength": 50, "x-field-type": "textarea", "x-placeholder": "List 4–6 main responsibilities"}}}	Write a professional job description for the following role:\n\nJob Title: {{jobTitle}}\nDepartment: {{department}}\nEmployment Type: {{employmentType}}\n\nKey Responsibilities:\n{{keyResponsibilities}}\n\nRequired Skills & Experience:\n{{requiredSkills}}\n\n{{#if niceToHave}}\nNice-to-Have Skills:\n{{niceToHave}}\n{{/if}}\n\nFormat the job description with these sections:\n1. About the Role (2–3 sentences describing the opportunity and impact)\n2. What You'll Do (bulleted list of responsibilities)\n3. What We're Looking For (bulleted list of requirements)\n{{#if niceToHave}}4. Bonus Points (nice-to-have skills){{/if}}\n5. Why Join Us (3 compelling reasons — keep these inspiring and authentic)\n\nUse inclusive language. Avoid gendered pronouns. Keep the tone professional yet warm. Aim for 400–500 words total.	t	45	0	2026-03-19 22:53:05.887	2026-03-19 22:53:05.887
cmmy2g6ox0007ilvjnzdyfvth	\N	Employee Performance Review	Draft a balanced, evidence-based performance review that motivates growth.	performance	hr	intermediate	{"type": "object", "required": ["employeeName", "role", "reviewPeriod", "achievements", "areasForGrowth"], "properties": {"role": {"type": "string", "title": "Job Role", "x-placeholder": "e.g. Software Engineer"}, "achievements": {"type": "string", "title": "Key Achievements", "minLength": 50, "x-field-type": "textarea", "x-placeholder": "List 3–5 specific accomplishments with context"}, "employeeName": {"type": "string", "title": "Employee Name", "x-placeholder": "First name or full name"}, "reviewPeriod": {"type": "string", "title": "Review Period", "x-placeholder": "e.g. Q1 2026"}, "overallRating": {"enum": ["Exceptional", "Exceeds Expectations", "Meets Expectations", "Needs Improvement"], "type": "string", "title": "Overall Rating", "x-field-type": "select", "x-enum-labels": ["Exceptional", "Exceeds Expectations", "Meets Expectations", "Needs Improvement"]}, "areasForGrowth": {"type": "string", "title": "Areas for Development", "x-field-type": "textarea", "x-placeholder": "Skills or behaviours to develop"}}}	Write a professional performance review for {{reviewPeriod}}.\n\nEmployee: {{employeeName}}\nRole: {{role}}\nOverall Rating: {{overallRating}}\n\nKey Achievements:\n{{achievements}}\n\nAreas for Development:\n{{areasForGrowth}}\n\nStructure the review as follows:\n1. Opening Summary (2–3 sentences summarising overall performance)\n2. Key Accomplishments (detailed, specific, impact-focused)\n3. Core Competencies Assessment (communication, collaboration, delivery, initiative)\n4. Development Areas (constructive, forward-looking, specific suggestions)\n5. Goals for Next Period (3 SMART goals based on development areas)\n6. Closing Statement (motivating, recognition of potential)\n\nTone: professional, balanced, constructive. Use specific evidence from the achievements. Avoid vague praise. Be honest about development areas while remaining encouraging.	t	60	0	2026-03-19 22:53:05.89	2026-03-19 22:53:05.89
cmmy2g6p00009ilvjbhle7ssj	\N	New Employee Onboarding Welcome Message	Create a warm, informative welcome message for new team members on their first day.	onboarding	hr	beginner	{"type": "object", "required": ["employeeName", "role", "startDate", "managerName", "teamName"], "properties": {"role": {"type": "string", "title": "Job Role", "x-placeholder": "e.g. Marketing Manager"}, "teamName": {"type": "string", "title": "Team Name", "x-placeholder": "e.g. Growth Marketing"}, "startDate": {"type": "string", "title": "Start Date", "x-field-type": "date"}, "managerName": {"type": "string", "title": "Manager Name", "x-placeholder": "Direct manager first name"}, "employeeName": {"type": "string", "title": "Employee Name", "x-placeholder": "First name"}, "firstWeekHighlight": {"type": "string", "title": "First Week Highlight", "x-placeholder": "e.g. team lunch on Wednesday, product demo on Thursday"}}}	Write a warm and professional welcome message for a new employee joining the team.\n\nEmployee Name: {{employeeName}}\nRole: {{role}}\nStart Date: {{startDate}}\nManager: {{managerName}}\nTeam: {{teamName}}\n{{#if firstWeekHighlight}}First Week Highlights: {{firstWeekHighlight}}{{/if}}\n\nThe message should:\n- Be addressed directly to {{employeeName}}\n- Express genuine excitement about them joining\n- Briefly describe what makes the team special\n- Mention what to expect in the first week\n- Include practical first-day logistics (who to contact, where to start)\n- End with an encouraging, energising close\n\nKeep it warm, human, and concise (250–300 words). Avoid corporate jargon.	t	20	0	2026-03-19 22:53:05.892	2026-03-19 22:53:05.892
cmmy2g6p2000bilvj7g7obheb	\N	HR Policy Summary	Transform a dense policy document into a clear, employee-friendly summary.	policy	hr	intermediate	{"type": "object", "required": ["policyName", "policyContent", "audience"], "properties": {"audience": {"type": "string", "title": "Target Audience", "x-placeholder": "e.g. All employees, Managers only"}, "policyName": {"type": "string", "title": "Policy Name", "x-placeholder": "e.g. Remote Work Policy"}, "effectiveDate": {"type": "string", "title": "Effective Date", "x-field-type": "date"}, "policyContent": {"type": "string", "title": "Policy Content / Key Points", "minLength": 100, "x-field-type": "textarea", "x-placeholder": "Paste the policy text or key rules"}}}	Rewrite the following HR policy as a clear, friendly employee-facing summary.\n\nPolicy Name: {{policyName}}\nEffective Date: {{effectiveDate}}\nAudience: {{audience}}\n\nPolicy Content:\n{{policyContent}}\n\nOutput format:\n1. **What This Policy Covers** (1–2 sentences)\n2. **Key Rules at a Glance** (5–8 bullet points, plain English)\n3. **What This Means for You** (practical day-to-day impact)\n4. **Common Questions** (3 FAQ-style Q&As anticipating employee questions)\n5. **Who to Contact** (prompt for where to direct questions)\n\nStyle: friendly, plain English, no legalese. Use "you" and "your". Keep total length under 400 words.	t	40	0	2026-03-19 22:53:05.894	2026-03-19 22:53:05.894
cmmy2g6p4000dilvjb8eq2pa4	\N	Exit Interview Summary	Synthesise exit interview notes into an actionable HR report.	offboarding	hr	intermediate	{"type": "object", "required": ["employeeRole", "tenureMonths", "reasonsForLeaving", "feedbackNotes"], "properties": {"positives": {"type": "string", "title": "What They Valued", "x-field-type": "textarea", "x-placeholder": "What the employee said they appreciated"}, "employeeRole": {"type": "string", "title": "Employee Role", "x-placeholder": "e.g. Sales Executive"}, "tenureMonths": {"type": "number", "title": "Tenure (months)", "minimum": 1}, "feedbackNotes": {"type": "string", "title": "Interview Notes", "minLength": 50, "x-field-type": "textarea", "x-placeholder": "Key points from the exit interview"}, "reasonsForLeaving": {"enum": ["Better opportunity", "Compensation", "Management", "Culture", "Work-life balance", "Career growth", "Relocation", "Other"], "type": "string", "title": "Primary Reason for Leaving", "x-field-type": "select", "x-enum-labels": ["Better opportunity", "Compensation", "Management", "Culture", "Work-life balance", "Career growth", "Relocation", "Other"]}}}	Write a concise HR exit interview summary report based on the following information.\n\nEmployee Role: {{employeeRole}}\nTenure: {{tenureMonths}} months\nPrimary Reason for Leaving: {{reasonsForLeaving}}\n\nInterview Notes:\n{{feedbackNotes}}\n\n{{#if positives}}\nWhat the Employee Valued:\n{{positives}}\n{{/if}}\n\nFormat the report as:\n1. **Overview** (role, tenure, departure reason in 2 sentences)\n2. **Key Themes** (3–5 themes with brief explanations)\n3. **Positive Feedback** (what worked well)\n4. **Areas of Concern** (issues raised — worded constructively for internal use)\n5. **Recommended Actions** (3–5 specific, actionable HR recommendations)\n6. **Retention Risk Score** (Low/Medium/High with brief justification)\n\nKeep it factual, confidential in tone, and actionable.	t	35	0	2026-03-19 22:53:05.896	2026-03-19 22:53:05.896
cmmy2g6p6000filvjx0jhjr8c	\N	Training Needs Analysis	Create a structured training needs assessment for a team or department.	learning	hr	advanced	{"type": "object", "required": ["teamName", "teamSize", "businessGoals", "currentSkillGaps"], "properties": {"budget": {"type": "string", "title": "Training Budget (approx.)", "x-placeholder": "e.g. €5,000 per person"}, "teamName": {"type": "string", "title": "Team / Department", "x-placeholder": "e.g. Customer Success"}, "teamSize": {"type": "number", "title": "Team Size", "minimum": 1}, "businessGoals": {"type": "string", "title": "Business Goals (Next 12 months)", "x-field-type": "textarea", "x-placeholder": "Key objectives the team must achieve"}, "currentSkillGaps": {"type": "string", "title": "Current Skill Gaps", "x-field-type": "textarea", "x-placeholder": "Known gaps or areas of underperformance"}}}	Create a Training Needs Analysis (TNA) report for the following team.\n\nTeam: {{teamName}} ({{teamSize}} people)\nBusiness Goals for Next 12 Months:\n{{businessGoals}}\n\nCurrent Skill Gaps:\n{{currentSkillGaps}}\n\n{{#if budget}}Training Budget: {{budget}}{{/if}}\n\nStructure the TNA as:\n1. **Executive Summary** (purpose and scope)\n2. **Business Context** (why this training matters to company goals)\n3. **Skills Gap Analysis** (current state vs required state, by skill area)\n4. **Priority Training Areas** (ranked by business impact, 5–8 areas)\n5. **Recommended Learning Interventions** (format, provider type, duration for each)\n6. **Implementation Timeline** (phased 12-month roadmap)\n7. **Success Metrics** (how to measure ROI)\n\nBe specific and practical. Tie every recommendation back to a business goal.	t	90	0	2026-03-19 22:53:05.899	2026-03-19 22:53:05.899
cmmy2g6p8000hilvjanp3dtei	\N	Recruitment Interview Question Set	Generate a structured interview guide with behavioural and technical questions.	recruitment	hr	intermediate	{"type": "object", "required": ["jobTitle", "coreCompetencies", "technicalSkills"], "properties": {"jobTitle": {"type": "string", "title": "Job Title", "x-placeholder": "e.g. Data Analyst"}, "seniorityLevel": {"enum": ["Junior", "Mid-level", "Senior", "Lead", "Director"], "type": "string", "title": "Seniority Level", "x-field-type": "select", "x-enum-labels": ["Junior", "Mid-level", "Senior", "Lead", "Director"]}, "technicalSkills": {"type": "string", "title": "Technical Skills to Test", "x-field-type": "textarea", "x-placeholder": "e.g. SQL, Python, data visualisation"}, "coreCompetencies": {"type": "string", "title": "Core Competencies to Assess", "x-field-type": "textarea", "x-placeholder": "e.g. communication, problem-solving, collaboration"}}}	Create a structured interview question guide for the following role.\n\nRole: {{jobTitle}} ({{seniorityLevel}})\nCore Competencies: {{coreCompetencies}}\nTechnical Skills: {{technicalSkills}}\n\nProduce:\n1. **Opening Questions** (2 warm-up questions to put the candidate at ease)\n2. **Behavioural Questions** (6 STAR-format questions, one per competency listed)\n   - Include follow-up probing questions for each\n3. **Technical Questions** (4–5 questions testing the listed technical skills)\n   - Include expected answer criteria\n4. **Situational Questions** (2 scenario-based questions relevant to the role)\n5. **Culture & Values Questions** (2 questions)\n6. **Candidate Questions** (3 suggested questions the candidate might ask — and ideal answer indicators)\n\nFor each question, note the competency or skill being assessed.	t	30	0	2026-03-19 22:53:05.901	2026-03-19 22:53:05.901
cmmy2g6pa000jilvjwondxc95	\N	Employee Engagement Survey Analysis	Transform raw survey data into executive-ready insights and action recommendations.	engagement	hr	advanced	{"type": "object", "required": ["surveyName", "responseCount", "topScores", "lowScores", "openFeedbackThemes"], "properties": {"lowScores": {"type": "string", "title": "Lowest-Scoring Areas", "x-field-type": "textarea", "x-placeholder": "Categories/questions with lowest scores and scores"}, "topScores": {"type": "string", "title": "Highest-Scoring Areas", "x-field-type": "textarea", "x-placeholder": "Categories/questions with highest scores and scores"}, "surveyName": {"type": "string", "title": "Survey Name", "x-placeholder": "e.g. Q1 2026 Engagement Pulse"}, "responseCount": {"type": "number", "title": "Number of Responses", "minimum": 1}, "openFeedbackThemes": {"type": "string", "title": "Open Feedback Themes", "x-field-type": "textarea", "x-placeholder": "Key themes from free-text responses"}}}	Analyse the following employee engagement survey results and produce an executive summary with action plan.\n\nSurvey: {{surveyName}}\nResponses: {{responseCount}}\n\nHighest-Scoring Areas:\n{{topScores}}\n\nLowest-Scoring Areas:\n{{lowScores}}\n\nOpen Feedback Themes:\n{{openFeedbackThemes}}\n\nProduce:\n1. **Executive Summary** (3–4 sentences — overall engagement health, key headline)\n2. **Strengths to Celebrate** (what's working well and why it matters)\n3. **Priority Concerns** (ranked by severity and frequency)\n4. **Root Cause Analysis** (likely drivers behind the low scores)\n5. **30-60-90 Day Action Plan** (specific, owner-assignable actions for each concern)\n6. **Communication Recommendation** (how to share results with the team transparently)\n\nUse plain language suitable for a CEO and department heads.	t	120	0	2026-03-19 22:53:05.903	2026-03-19 22:53:05.903
cmmy2g6pc000lilvj1qmbron0	\N	Cold Outreach Email	Write a personalised, high-converting cold email that gets replies.	outreach	sales	beginner	{"type": "object", "required": ["prospectName", "prospectCompany", "prospectRole", "painPoint", "yourSolution"], "properties": {"painPoint": {"type": "string", "title": "Pain Point / Trigger", "x-field-type": "textarea", "x-placeholder": "What problem does this person likely have? Any trigger event?"}, "socialProof": {"type": "string", "title": "Social Proof (optional)", "x-placeholder": "e.g. We helped Siemens reduce ops costs by 30%"}, "prospectName": {"type": "string", "title": "Prospect First Name", "x-placeholder": "e.g. Sarah"}, "prospectRole": {"type": "string", "title": "Prospect Role", "x-placeholder": "e.g. Head of Operations"}, "yourSolution": {"type": "string", "title": "Your Solution / Value Prop", "x-placeholder": "One sentence: what you do and the outcome you deliver"}, "prospectCompany": {"type": "string", "title": "Prospect Company", "x-placeholder": "e.g. Acme GmbH"}}}	Write a cold outreach email that is personalised, concise, and focused on the prospect's problem — not your product.\n\nProspect: {{prospectName}}, {{prospectRole}} at {{prospectCompany}}\nTheir likely pain point: {{painPoint}}\nYour solution: {{yourSolution}}\n{{#if socialProof}}Social proof: {{socialProof}}{{/if}}\n\nRequirements:\n- Subject line: 6–8 words, curiosity-driven, no spam words\n- Body: 4–6 sentences max\n- Open with their world, not yours\n- One specific insight or observation about their company/role\n- Single, low-friction CTA (e.g. "Worth a 15-min call?")\n- No attachments, no brochure language, no "I hope this email finds you well"\n- Sign off naturally\n\nOutput:\nSubject: [subject line]\nBody: [email body]	t	25	0	2026-03-19 22:53:05.904	2026-03-19 22:53:05.904
cmmy2g6pe000nilvjgbwnmo38	\N	Sales Proposal Executive Summary	Write a compelling executive summary that gets your proposal to the top of the pile.	proposals	sales	intermediate	{"type": "object", "required": ["clientName", "clientChallenge", "proposedSolution", "expectedOutcomes", "investmentRange"], "properties": {"timeline": {"type": "string", "title": "Delivery Timeline", "x-placeholder": "e.g. 3 months from contract signing"}, "clientName": {"type": "string", "title": "Client / Company Name", "x-placeholder": "e.g. Müller Logistics AG"}, "clientChallenge": {"type": "string", "title": "Client Challenge", "x-field-type": "textarea", "x-placeholder": "What problem are they trying to solve?"}, "investmentRange": {"type": "string", "title": "Investment Range", "x-placeholder": "e.g. €25,000–€35,000"}, "expectedOutcomes": {"type": "string", "title": "Expected Outcomes / ROI", "x-field-type": "textarea", "x-placeholder": "Quantified results they can expect (%, time, €)"}, "proposedSolution": {"type": "string", "title": "Proposed Solution", "x-field-type": "textarea", "x-placeholder": "What you are proposing and how it works"}}}	Write a compelling executive summary for a sales proposal.\n\nClient: {{clientName}}\nTheir Challenge: {{clientChallenge}}\nOur Proposed Solution: {{proposedSolution}}\nExpected Outcomes: {{expectedOutcomes}}\nInvestment: {{investmentRange}}\nTimeline: {{timeline}}\n\nFormat:\n1. **The Situation** (client's current challenge and its cost/impact — empathetic, factual)\n2. **Our Recommendation** (clear, confident solution description)\n3. **What You'll Achieve** (specific, quantified outcomes)\n4. **Why Us** (2–3 differentiators — avoid generic claims)\n5. **Investment & Timeline** (clear summary)\n6. **Next Step** (single clear call to action)\n\nTone: consultative, confident, client-focused. Write in second person ("you", "your team"). Max 500 words.	t	60	0	2026-03-19 22:53:05.906	2026-03-19 22:53:05.906
cmmy2g6pg000pilvjw2xhjirz	\N	Follow-Up Email After Meeting	Send a professional follow-up that summarises the meeting and keeps momentum.	follow-up	sales	beginner	{"type": "object", "required": ["prospectName", "meetingDate", "keyDiscussionPoints", "agreedNextSteps"], "properties": {"yourName": {"type": "string", "title": "Your Name", "x-placeholder": "Your first name"}, "meetingDate": {"type": "string", "title": "Meeting Date", "x-field-type": "date"}, "prospectName": {"type": "string", "title": "Prospect Name", "x-placeholder": "First name"}, "agreedNextSteps": {"type": "string", "title": "Agreed Next Steps", "x-field-type": "textarea", "x-placeholder": "What was agreed — who does what by when"}, "keyDiscussionPoints": {"type": "string", "title": "Key Discussion Points", "x-field-type": "textarea", "x-placeholder": "Main topics covered and insights shared"}}}	Write a post-meeting follow-up email that is professional, concise, and action-oriented.\n\nProspect: {{prospectName}}\nMeeting Date: {{meetingDate}}\nKey Discussion Points: {{keyDiscussionPoints}}\nAgreed Next Steps: {{agreedNextSteps}}\nSender: {{yourName}}\n\nRequirements:\n- Subject: references the meeting specifically (not "Following up")\n- Thank briefly but not excessively\n- Summarise 3–4 key takeaways (bullets)\n- Clearly list next steps with owners and dates\n- Reiterate one key value point naturally\n- End with an open, warm close\n- Max 200 words in the body\n\nOutput subject line and body separately.	t	15	0	2026-03-19 22:53:05.908	2026-03-19 22:53:05.908
cmmy2g6ph000rilvjbnw5stu1	\N	Objection Handling Script	Build a confident, empathetic response to common sales objections.	objection-handling	sales	intermediate	{"type": "object", "required": ["objection", "productService", "keyDifferentiators"], "properties": {"objection": {"type": "string", "title": "The Objection", "x-field-type": "textarea", "x-placeholder": "e.g. \\"Your price is too high compared to competitors\\""}, "proofPoints": {"type": "string", "title": "Proof Points / Evidence", "x-placeholder": "Customer wins, data, case studies"}, "productService": {"type": "string", "title": "Your Product / Service", "x-placeholder": "Brief description of what you sell"}, "keyDifferentiators": {"type": "string", "title": "Key Differentiators", "x-field-type": "textarea", "x-placeholder": "What makes you meaningfully different?"}}}	Write an effective objection handling script for the following scenario.\n\nObjection received: {{objection}}\nProduct/Service: {{productService}}\nOur Key Differentiators: {{keyDifferentiators}}\n{{#if proofPoints}}Supporting Evidence: {{proofPoints}}{{/if}}\n\nProvide:\n1. **Acknowledge** (1–2 sentences validating the concern without conceding the point)\n2. **Clarify** (1 question to understand the root concern beneath the objection)\n3. **Reframe** (shift perspective without dismissing their view)\n4. **Respond** (direct, confident answer using differentiators and proof)\n5. **Confirm Resolution** (closing question to check if the objection is resolved)\n6. **Alternative Approach** (a second way to handle this if the first doesn't land)\n\nKeep language natural and conversational — this should sound like a real sales conversation, not a script.	t	30	0	2026-03-19 22:53:05.91	2026-03-19 22:53:05.91
cmmy2g6pl000vilvjq0mmaogz	\N	Sales Call Preparation Brief	Build a concise pre-call brief to walk in prepared and confident.	outreach	sales	beginner	{"type": "object", "required": ["prospectCompany", "prospectRole", "callObjective", "knownContext"], "properties": {"knownContext": {"type": "string", "title": "What You Know About Them", "x-field-type": "textarea", "x-placeholder": "Company news, LinkedIn insights, past interactions"}, "productFocus": {"type": "string", "title": "Product / Solution Focus", "x-placeholder": "What product angle is most relevant"}, "prospectRole": {"type": "string", "title": "Prospect Role", "x-placeholder": "e.g. CFO"}, "callObjective": {"type": "string", "title": "Call Objective", "x-placeholder": "What you want to achieve in this call"}, "prospectCompany": {"type": "string", "title": "Prospect Company", "x-placeholder": "Company name"}}}	Create a concise sales call preparation brief.\n\nCompany: {{prospectCompany}}\nContact Role: {{prospectRole}}\nCall Objective: {{callObjective}}\nKnown Context: {{knownContext}}\nProduct Focus: {{productFocus}}\n\nBrief format:\n1. **Quick Company Snapshot** (3 key facts relevant to the call)\n2. **Likely Priorities for This Role** (what a {{prospectRole}} typically cares about)\n3. **Our Angle** (how {{productFocus}} maps to their probable needs)\n4. **Opening Question** (1 powerful question to open the discovery)\n5. **3 Discovery Questions** (to uncover pain and qualify)\n6. **Potential Objections & Responses** (top 2 objections to anticipate)\n7. **Success Criteria** (what does a successful call look like?)\n8. **Next Step to Propose** (clear, low-friction)\n\nKeep it scannable — this is a pre-call cheat sheet, not an essay.	t	20	0	2026-03-19 22:53:05.913	2026-03-19 22:53:05.913
cmmy2g6pn000xilvjly2u1v1i	\N	Win/Loss Analysis Report	Produce a structured win/loss analysis to sharpen your sales strategy.	analysis	sales	advanced	{"type": "object", "required": ["dealOutcome", "dealSize", "competitorsInvolved", "decisionFactors", "salesNotes"], "properties": {"dealSize": {"type": "string", "title": "Deal Size", "x-placeholder": "e.g. €120,000 ARR"}, "salesNotes": {"type": "string", "title": "Sales Rep Notes", "x-field-type": "textarea", "x-placeholder": "Your observations on what happened and why"}, "dealOutcome": {"enum": ["Won", "Lost", "No decision"], "type": "string", "title": "Deal Outcome", "x-field-type": "select", "x-enum-labels": ["Won", "Lost", "No decision"]}, "decisionFactors": {"type": "string", "title": "Stated Decision Factors", "x-field-type": "textarea", "x-placeholder": "What the buyer said influenced their decision"}, "competitorsInvolved": {"type": "string", "title": "Competitors in Deal", "x-placeholder": "Competitors considered (if known)"}}}	Write a win/loss analysis report for the following deal.\n\nOutcome: {{dealOutcome}}\nDeal Size: {{dealSize}}\nCompetitors: {{competitorsInvolved}}\nBuyer's Stated Decision Factors: {{decisionFactors}}\nSales Rep Notes: {{salesNotes}}\n\nReport structure:\n1. **Deal Summary** (outcome, size, key players in 3 sentences)\n2. **What Drove the Outcome** (top 3–5 factors, distinguished between what we controlled vs didn't)\n3. **Competitive Analysis** (how we compared to alternatives on key dimensions)\n4. **Process Assessment** (where in the sales process did we perform well or poorly)\n5. **Lessons Learned** (specific, actionable insights for future deals)\n6. **Recommended Actions** (changes to messaging, process, or qualification criteria)\n\nBe honest and specific. Good win/loss analyses are only useful if they're candid.	t	75	0	2026-03-19 22:53:05.915	2026-03-19 22:53:05.915
cmmy2g6po000zilvj69q6phwh	\N	LinkedIn Connection Request + Message	Write a personalised LinkedIn outreach message that gets accepted and replied to.	outreach	sales	beginner	{"type": "object", "required": ["prospectName", "prospectRole", "commonGround", "reasonForConnecting"], "properties": {"commonGround": {"type": "string", "title": "Common Ground / Icebreaker", "x-placeholder": "Shared connection, group, article, or event"}, "prospectName": {"type": "string", "title": "Prospect First Name", "x-placeholder": "e.g. Maria"}, "prospectRole": {"type": "string", "title": "Their Role", "x-placeholder": "e.g. VP of Engineering"}, "reasonForConnecting": {"type": "string", "title": "Genuine Reason for Connecting", "x-placeholder": "Why you want to connect — keep it real"}}}	Write a LinkedIn connection request message for the following prospect.\n\nProspect: {{prospectName}}, {{prospectRole}}\nCommon ground / icebreaker: {{commonGround}}\nReason for connecting: {{reasonForConnecting}}\n\nRequirements:\n- Max 300 characters (LinkedIn limit)\n- Natural, not salesy\n- Reference the common ground immediately\n- Zero pitch in the connection request itself\n- End with a genuine, open invitation to connect\n\nOutput the message only — no explanation.	t	15	0	2026-03-19 22:53:05.917	2026-03-19 22:53:05.917
cmmy2g6pq0011ilvjyvitxyhc	\N	Monthly Financial Variance Report	Draft a clear variance report narrative explaining budget deviations to stakeholders.	reporting	finance	intermediate	{"type": "object", "required": ["reportMonth", "revenueActual", "revenueBudget", "costActual", "costBudget", "keyVariances"], "properties": {"costActual": {"type": "string", "title": "Total Costs Actual", "x-placeholder": "e.g. €1.8M"}, "costBudget": {"type": "string", "title": "Total Costs Budget", "x-placeholder": "e.g. €1.7M"}, "reportMonth": {"type": "string", "title": "Report Month/Period", "x-placeholder": "e.g. February 2026"}, "keyVariances": {"type": "string", "title": "Key Variances to Explain", "x-field-type": "textarea", "x-placeholder": "List the largest line-item variances and context"}, "revenueActual": {"type": "string", "title": "Revenue Actual", "x-placeholder": "e.g. €2.4M"}, "revenueBudget": {"type": "string", "title": "Revenue Budget", "x-placeholder": "e.g. €2.6M"}}}	Write a professional financial variance report narrative for the following period.\n\nPeriod: {{reportMonth}}\nRevenue: Actual {{revenueActual}} vs Budget {{revenueBudget}}\nCosts: Actual {{costActual}} vs Budget {{costBudget}}\n\nKey Variances:\n{{keyVariances}}\n\nStructure:\n1. **Period Summary** (overall financial performance in 3 sentences — clear on whether it was good or bad news)\n2. **Revenue Analysis** (performance vs budget, key drivers, trend context)\n3. **Cost Analysis** (performance vs budget, significant variances explained)\n4. **Key Variance Explanations** (each major variance with root cause and one-off vs recurring classification)\n5. **Forecast Implications** (impact on full-year outlook)\n6. **Management Actions** (steps being taken to address unfavourable variances)\n\nTone: factual, professional, clear. Use specific numbers. Avoid jargon. Suitable for CFO and board review.	t	60	0	2026-03-19 22:53:05.918	2026-03-19 22:53:05.918
cmmy2g6ps0013ilvjqbzcokxy	\N	Budget Justification Memo	Write a persuasive budget request that secures approval from finance leadership.	budgeting	finance	intermediate	{"type": "object", "required": ["requestorDept", "budgetItem", "requestedAmount", "businessJustification", "expectedReturn"], "properties": {"budgetItem": {"type": "string", "title": "Budget Item", "x-placeholder": "e.g. CRM software upgrade"}, "alternatives": {"type": "string", "title": "Alternatives Considered", "x-placeholder": "Other options evaluated and why rejected"}, "requestorDept": {"type": "string", "title": "Requesting Department", "x-placeholder": "e.g. Marketing"}, "expectedReturn": {"type": "string", "title": "Expected Return / Benefit", "x-field-type": "textarea", "x-placeholder": "ROI, cost savings, revenue uplift, risk reduction"}, "requestedAmount": {"type": "string", "title": "Requested Amount", "x-placeholder": "e.g. €45,000"}, "businessJustification": {"type": "string", "title": "Business Justification", "x-field-type": "textarea", "x-placeholder": "Why this is needed and what problem it solves"}}}	Write a formal budget justification memo.\n\nRequesting Department: {{requestorDept}}\nBudget Item: {{budgetItem}}\nRequested Amount: {{requestedAmount}}\n\nBusiness Justification:\n{{businessJustification}}\n\nExpected Return / Benefits:\n{{expectedReturn}}\n\nAlternatives Considered: {{alternatives}}\n\nFormat as a formal memo with:\n1. **Purpose** (what is being requested and for how much)\n2. **Current Situation** (the problem or opportunity this addresses)\n3. **Proposed Solution** (what the budget will fund and how)\n4. **Financial Analysis** (cost breakdown, expected ROI, payback period)\n5. **Risk of Inaction** (what happens if this isn't approved)\n6. **Alternatives Considered** (and why this option is best)\n7. **Recommendation** (clear ask for approval)\n\nTone: professional, fact-based, business-case-driven.	t	45	0	2026-03-19 22:53:05.92	2026-03-19 22:53:05.92
cmmy2g6pu0015ilvjnm1sa24r	\N	Cash Flow Forecast Commentary	Write an executive narrative for the monthly cash flow forecast.	reporting	finance	advanced	{"type": "object", "required": ["period", "openingBalance", "closingBalance", "cashInflows", "cashOutflows", "keyItems"], "properties": {"period": {"type": "string", "title": "Forecast Period", "x-placeholder": "e.g. Q2 2026"}, "keyItems": {"type": "string", "title": "Key Items to Highlight", "x-field-type": "textarea", "x-placeholder": "Significant movements, risks, or one-off items"}, "cashInflows": {"type": "string", "title": "Major Cash Inflows", "x-field-type": "textarea", "x-placeholder": "Key sources and amounts"}, "cashOutflows": {"type": "string", "title": "Major Cash Outflows", "x-field-type": "textarea", "x-placeholder": "Key uses and amounts"}, "closingBalance": {"type": "string", "title": "Projected Closing Balance", "x-placeholder": "e.g. €2.8M"}, "openingBalance": {"type": "string", "title": "Opening Cash Balance", "x-placeholder": "e.g. €3.2M"}}}	Write an executive cash flow forecast commentary.\n\nPeriod: {{period}}\nOpening Balance: {{openingBalance}}\nProjected Closing Balance: {{closingBalance}}\n\nMajor Inflows:\n{{cashInflows}}\n\nMajor Outflows:\n{{cashOutflows}}\n\nKey Items:\n{{keyItems}}\n\nCommentary sections:\n1. **Summary** (net cash movement and what it means for the business)\n2. **Inflows Analysis** (key revenue sources, collection performance, timing)\n3. **Outflows Analysis** (major expenditure items and drivers)\n4. **Liquidity Position** (adequacy of cash reserves, headroom vs covenants if applicable)\n5. **Key Risks** (items that could cause cash to deviate from forecast)\n6. **Management Actions** (steps to optimise cash position)\n\nBe specific, numerical, and direct. Suitable for CFO, board, and banking relationships.	t	50	0	2026-03-19 22:53:05.922	2026-03-19 22:53:05.922
cmmy2g6pv0017ilvjp13vs0ne	\N	Cost Reduction Proposal	Build a structured cost reduction proposal with implementation roadmap.	cost-management	finance	advanced	{"type": "object", "required": ["targetDept", "currentCostBase", "reductionTarget", "identifiedOpportunities"], "properties": {"targetDept": {"type": "string", "title": "Target Department / Area", "x-placeholder": "e.g. IT Infrastructure"}, "constraints": {"type": "string", "title": "Constraints / Non-Negotiables", "x-placeholder": "What cannot be cut (service levels, compliance, etc.)"}, "currentCostBase": {"type": "string", "title": "Current Annual Cost", "x-placeholder": "e.g. €2.1M per year"}, "reductionTarget": {"type": "string", "title": "Reduction Target", "x-placeholder": "e.g. 20% (€420,000)"}, "identifiedOpportunities": {"type": "string", "title": "Identified Opportunities", "x-field-type": "textarea", "x-placeholder": "Potential areas to cut or optimise"}}}	Write a cost reduction proposal document.\n\nArea: {{targetDept}}\nCurrent Annual Cost Base: {{currentCostBase}}\nReduction Target: {{reductionTarget}}\n\nIdentified Opportunities:\n{{identifiedOpportunities}}\n\nConstraints: {{constraints}}\n\nDocument structure:\n1. **Executive Summary** (objective, target saving, approach)\n2. **Current State Analysis** (cost breakdown and key drivers)\n3. **Reduction Opportunities** (each opportunity with: description, estimated saving, implementation effort, risk)\n4. **Prioritisation Matrix** (rank by savings potential vs implementation risk)\n5. **Implementation Roadmap** (phased 12-month plan with milestones)\n6. **Risk & Mitigation** (top risks and how to manage them)\n7. **Expected Outcomes** (financial and operational benefits)\n\nBe realistic about savings — avoid optimistic assumptions without evidence.	t	90	0	2026-03-19 22:53:05.924	2026-03-19 22:53:05.924
cmmy2g6px0019ilvj51cwbsbk	\N	Finance Business Partner Update	Write a monthly business partner update for operational departments.	reporting	finance	intermediate	{"type": "object", "required": ["department", "period", "budgetStatus", "keyHighlights", "actionsRequired"], "properties": {"period": {"type": "string", "title": "Period", "x-placeholder": "e.g. March 2026"}, "department": {"type": "string", "title": "Department", "x-placeholder": "e.g. Customer Success"}, "budgetStatus": {"enum": ["On track", "Slightly over", "Significantly over", "Underspend"], "type": "string", "title": "Budget Status", "x-field-type": "select", "x-enum-labels": ["On track", "Slightly over", "Significantly over", "Underspend"]}, "keyHighlights": {"type": "string", "title": "Key Financial Highlights", "x-field-type": "textarea", "x-placeholder": "Main financial movements and context"}, "actionsRequired": {"type": "string", "title": "Actions Required from Department", "x-field-type": "textarea", "x-placeholder": "What you need from the department head"}}}	Write a monthly finance business partner update for the following department.\n\nDepartment: {{department}}\nPeriod: {{period}}\nBudget Status: {{budgetStatus}}\n\nKey Highlights:\n{{keyHighlights}}\n\nActions Required from Department:\n{{actionsRequired}}\n\nFormat:\n1. **At a Glance** (budget status, key number, RAG rating)\n2. **Month Highlights** (3–5 bullets on what happened financially)\n3. **Areas of Focus** (what to watch in the coming month)\n4. **Actions Required** (clear asks from the department, with deadlines)\n5. **Support Available** (what finance can help with)\n\nTone: collaborative, plain English, not intimidating. The goal is to partner with the department, not audit them.	t	35	0	2026-03-19 22:53:05.926	2026-03-19 22:53:05.926
cmmy2g6pz001bilvjagtjo0df	\N	Investment Case Summary	Summarise an investment opportunity for executive decision-making.	investment	finance	advanced	{"type": "object", "required": ["investmentName", "investmentAmount", "strategicRationale", "financialCase", "risks"], "properties": {"risks": {"type": "string", "title": "Key Risks", "x-field-type": "textarea", "x-placeholder": "Top risks and mitigations"}, "financialCase": {"type": "string", "title": "Financial Case", "x-field-type": "textarea", "x-placeholder": "IRR, payback period, NPV, revenue impact"}, "investmentName": {"type": "string", "title": "Investment Name", "x-placeholder": "e.g. Acquisition of TechCo GmbH"}, "investmentAmount": {"type": "string", "title": "Investment Amount", "x-placeholder": "e.g. €5M total investment"}, "strategicRationale": {"type": "string", "title": "Strategic Rationale", "x-field-type": "textarea", "x-placeholder": "Why this investment, why now, how it fits strategy"}}}	Write an investment case summary for executive review.\n\nInvestment: {{investmentName}}\nTotal Investment: {{investmentAmount}}\n\nStrategic Rationale:\n{{strategicRationale}}\n\nFinancial Case:\n{{financialCase}}\n\nKey Risks:\n{{risks}}\n\nStructure:\n1. **Recommendation** (clear: approve / approve with conditions / decline)\n2. **Investment Overview** (what, how much, timeline)\n3. **Strategic Fit** (how this advances company strategy)\n4. **Financial Analysis** (returns, payback, sensitivity)\n5. **Key Assumptions** (critical assumptions the case depends on)\n6. **Risk Assessment** (top 5 risks, likelihood, impact, mitigation)\n7. **Alternatives Considered** (do nothing, alternatives, why this option wins)\n8. **Decision Required** (specific approval being sought)\n\nSuitable for board/ExCo presentation. Be direct and objective.	t	80	0	2026-03-19 22:53:05.928	2026-03-19 22:53:05.928
cmmy2g6q1001dilvjlpp0gcrw	\N	Contract Review Summary	Summarise a contract into key terms, obligations, and risks for non-legal stakeholders.	contract-review	legal	intermediate	{"type": "object", "required": ["contractType", "parties", "contractTerms", "keyObligations"], "properties": {"parties": {"type": "string", "title": "Parties Involved", "x-placeholder": "e.g. Wren GmbH (vendor) and Acme AG (customer)"}, "contractType": {"type": "string", "title": "Contract Type", "x-placeholder": "e.g. SaaS Subscription Agreement, NDA, Employment Contract"}, "contractTerms": {"type": "string", "title": "Key Contract Terms", "minLength": 100, "x-field-type": "textarea", "x-placeholder": "Paste or summarise the main terms, duration, fees, etc."}, "keyObligations": {"type": "string", "title": "Key Obligations", "x-field-type": "textarea", "x-placeholder": "Main obligations of each party"}}}	Summarise the following contract for a non-legal business audience.\n\nContract Type: {{contractType}}\nParties: {{parties}}\n\nContract Terms:\n{{contractTerms}}\n\nKey Obligations:\n{{keyObligations}}\n\nProduce a plain-English summary with:\n1. **Contract Overview** (what it is, who it's between, duration, value)\n2. **Key Terms at a Glance** (10 bullet points — most important commercial terms)\n3. **Our Obligations** (what we must do — clear, actionable)\n4. **Counterparty Obligations** (what the other party must do)\n5. **Risk Flags** (unusual clauses, unfavourable terms, areas for negotiation — highlight in plain language)\n6. **Expiry & Renewal** (when it expires, auto-renewal terms, notice periods)\n7. **Recommended Actions** (any terms that should be negotiated or escalated)\n\nNote: This is a summary for business purposes only, not legal advice.	t	75	0	2026-03-19 22:53:05.929	2026-03-19 22:53:05.929
cmmy2g6q3001filvjuotdtme3	\N	GDPR Data Processing Register Entry	Document a new data processing activity for your GDPR Article 30 register.	data-protection	legal	intermediate	{"type": "object", "required": ["processingActivity", "dataController", "purposeOfProcessing", "dataCategories", "dataSubjects", "retentionPeriod"], "properties": {"dataSubjects": {"type": "string", "title": "Categories of Data Subjects", "x-placeholder": "e.g. Employees, Customers, Website visitors"}, "dataCategories": {"type": "string", "title": "Categories of Personal Data", "x-field-type": "textarea", "x-placeholder": "Types of data processed (e.g. name, email, performance scores)"}, "dataController": {"type": "string", "title": "Data Controller", "x-placeholder": "Your company name and registered address"}, "retentionPeriod": {"type": "string", "title": "Retention Period", "x-placeholder": "How long data is kept and why"}, "processingActivity": {"type": "string", "title": "Processing Activity Name", "x-placeholder": "e.g. Employee Performance Management"}, "purposeOfProcessing": {"type": "string", "title": "Purpose of Processing", "x-field-type": "textarea", "x-placeholder": "Why you process this data"}}}	Create a GDPR Article 30 Record of Processing Activity (RoPA) entry.\n\nProcessing Activity: {{processingActivity}}\nData Controller: {{dataController}}\nPurpose: {{purposeOfProcessing}}\nData Categories: {{dataCategories}}\nData Subjects: {{dataSubjects}}\nRetention Period: {{retentionPeriod}}\n\nFormat as a structured RoPA entry covering:\n1. **Activity Name & Description**\n2. **Controller Details** (name, contact, DPO if applicable)\n3. **Purposes & Legal Basis** (identify the appropriate GDPR Article 6 / Article 9 legal basis)\n4. **Categories of Data Subjects**\n5. **Categories of Personal Data**\n6. **Recipients / Third-Party Processors** (prompt to identify)\n7. **International Transfers** (if applicable)\n8. **Retention Schedule**\n9. **Security Measures** (technical and organisational)\n10. **Risk Level** (Low/Medium/High with brief rationale)\n\nFlag any processing that may require a DPIA.	t	40	0	2026-03-19 22:53:05.931	2026-03-19 22:53:05.931
cmmy2g6q5001hilvjdeglfpav	\N	Supplier Risk Assessment	Conduct a structured risk assessment of a new supplier for compliance approval.	risk-assessment	legal	advanced	{"type": "object", "required": ["supplierName", "supplierCountry", "servicesProvided", "dataAccess", "contractValue"], "properties": {"dataAccess": {"enum": ["No personal data", "Limited anonymised data", "Personal data", "Sensitive personal data", "Critical business data"], "type": "string", "title": "Data Access Level", "x-field-type": "select", "x-enum-labels": ["No personal data", "Limited anonymised data", "Personal data", "Sensitive personal data", "Critical business data"]}, "supplierName": {"type": "string", "title": "Supplier Name", "x-placeholder": "e.g. CloudTech Solutions"}, "contractValue": {"type": "string", "title": "Annual Contract Value", "x-placeholder": "e.g. €50,000"}, "supplierCountry": {"type": "string", "title": "Supplier Country", "x-placeholder": "e.g. Germany, USA, India"}, "servicesProvided": {"type": "string", "title": "Services Provided", "x-field-type": "textarea", "x-placeholder": "What the supplier will do for you"}}}	Conduct a supplier risk assessment for procurement and legal approval.\n\nSupplier: {{supplierName}}\nCountry: {{supplierCountry}}\nServices: {{servicesProvided}}\nData Access: {{dataAccess}}\nContract Value: {{contractValue}}\n\nAssessment structure:\n1. **Supplier Overview** (who they are and what they provide)\n2. **Risk Category** (Critical/High/Medium/Low — based on data access, contract value, services)\n3. **Financial Risk** (considerations for supplier financial stability)\n4. **Data & Privacy Risk** (GDPR implications of data access level, transfer mechanisms needed for non-EU)\n5. **Information Security Risk** (what security assurances are needed)\n6. **Operational Risk** (dependency, single points of failure, business continuity)\n7. **Reputational & Compliance Risk** (sanctions screening, ESG considerations)\n8. **Required Due Diligence** (specific documents and certifications to request)\n9. **Contract Requirements** (key clauses to include based on risk level)\n10. **Approval Recommendation** (approve, approve with conditions, or escalate)	t	90	0	2026-03-19 22:53:05.933	2026-03-19 22:53:05.933
cmmy2g6q7001jilvjvzt6hv68	\N	Privacy Policy Section Drafter	Draft a clear, GDPR-compliant section for your company privacy policy.	data-protection	legal	intermediate	{"type": "object", "required": ["sectionTopic", "dataProcessed", "purposeAndLegalBasis", "companyName"], "properties": {"companyName": {"type": "string", "title": "Company Name", "x-placeholder": "Your company name"}, "jurisdiction": {"type": "string", "title": "Primary Jurisdiction", "x-placeholder": "e.g. EU/EEA, UK, Switzerland"}, "sectionTopic": {"type": "string", "title": "Section Topic", "x-placeholder": "e.g. How we use cookies, How long we keep your data"}, "dataProcessed": {"type": "string", "title": "Data Processed", "x-field-type": "textarea", "x-placeholder": "What personal data this section covers"}, "purposeAndLegalBasis": {"type": "string", "title": "Purpose & Legal Basis", "x-field-type": "textarea", "x-placeholder": "Why you process it and under which GDPR legal basis"}}}	Draft a privacy policy section that is GDPR-compliant, readable, and legally sound.\n\nCompany: {{companyName}}\nJurisdiction: {{jurisdiction}}\nSection Topic: {{sectionTopic}}\nData Processed: {{dataProcessed}}\nPurpose & Legal Basis: {{purposeAndLegalBasis}}\n\nRequirements:\n- Plain English — readable by a non-expert\n- GDPR-compliant structure (who, what, why, legal basis, how long, rights)\n- Include required transparency information\n- Avoid legalese while remaining legally accurate\n- Reference data subject rights appropriately\n- Include contact details placeholder for DPO/privacy team\n\nDraft the section in full, suitable for inclusion in a published privacy policy.\nAdd a note at the end flagging anything that needs legal review before publication.	t	50	0	2026-03-19 22:53:05.936	2026-03-19 22:53:05.936
cmmy2g6q9001lilvjawhgkzbu	\N	Compliance Incident Report	Document a compliance or data breach incident with root cause and corrective actions.	incident-management	legal	advanced	{"type": "object", "required": ["incidentType", "discoveryDate", "incidentDescription", "affectedData", "immediateActions"], "properties": {"affectedData": {"type": "string", "title": "Affected Data / Systems", "x-field-type": "textarea", "x-placeholder": "What data or systems were affected and how many people"}, "incidentType": {"enum": ["Data breach", "Policy violation", "Regulatory non-compliance", "Third-party incident", "Other"], "type": "string", "title": "Incident Type", "x-field-type": "select", "x-enum-labels": ["Data breach", "Policy violation", "Regulatory non-compliance", "Third-party incident", "Other"]}, "discoveryDate": {"type": "string", "title": "Discovery Date", "x-field-type": "date"}, "immediateActions": {"type": "string", "title": "Immediate Actions Taken", "x-field-type": "textarea", "x-placeholder": "Steps already taken to contain the incident"}, "incidentDescription": {"type": "string", "title": "Incident Description", "minLength": 50, "x-field-type": "textarea", "x-placeholder": "What happened, when, and how it was discovered"}}}	Write a formal compliance incident report.\n\nIncident Type: {{incidentType}}\nDiscovery Date: {{discoveryDate}}\n\nIncident Description:\n{{incidentDescription}}\n\nAffected Data / Systems:\n{{affectedData}}\n\nImmediate Actions Taken:\n{{immediateActions}}\n\nReport structure:\n1. **Incident Summary** (type, date, brief description — suitable for executive briefing)\n2. **Timeline of Events** (chronological sequence from occurrence to discovery to response)\n3. **Scope & Impact** (data affected, number of individuals, systems compromised)\n4. **Root Cause Analysis** (why it happened — direct and contributing causes)\n5. **Immediate Response Actions** (what was done and when)\n6. **Regulatory Notification Assessment** (GDPR 72-hour rule, supervisory authority notification requirements)\n7. **Corrective Action Plan** (short-term fixes and long-term preventive measures)\n8. **Lessons Learned** (systemic changes to prevent recurrence)\n\nNote: for data breaches, flag whether regulatory notification is required within 72 hours.	t	60	0	2026-03-19 22:53:05.937	2026-03-19 22:53:05.937
cmmy2g6qb001nilvjhcpv8awk	\N	Vendor NDA Review Checklist	Generate a review checklist for evaluating a vendor-proposed NDA.	contract-review	legal	intermediate	{"type": "object", "required": ["vendorName", "ndaType", "ourRole", "informationToShare"], "properties": {"ndaType": {"enum": ["Mutual", "One-way (we disclose)", "One-way (they disclose)"], "type": "string", "title": "NDA Type", "x-field-type": "select", "x-enum-labels": ["Mutual", "One-way (we disclose)", "One-way (they disclose)"]}, "ourRole": {"type": "string", "title": "Our Role", "x-placeholder": "e.g. Potential customer evaluating vendor software"}, "vendorName": {"type": "string", "title": "Vendor / Counterparty", "x-placeholder": "e.g. TechCorp GmbH"}, "informationToShare": {"type": "string", "title": "Information to Be Shared", "x-placeholder": "What confidential information will be exchanged"}}}	Create a review checklist for evaluating a vendor-proposed NDA.\n\nVendor: {{vendorName}}\nNDA Type: {{ndaType}}\nOur Role: {{ourRole}}\nInformation to be exchanged: {{informationToShare}}\n\nProvide a structured review checklist covering:\n1. **Parties & Scope** (correct legal entities, scope of confidential information defined clearly)\n2. **Obligations** (appropriate obligations on each party, carve-outs for known information)\n3. **Standard Exclusions** (publicly available, independently developed, already known, required by law)\n4. **Duration** (NDA term and survival of obligations after expiry)\n5. **Use Restrictions** (information can only be used for the specified purpose)\n6. **Return / Destruction** (what happens to confidential info if deal doesn't proceed)\n7. **Governing Law & Jurisdiction** (appropriate for our location)\n8. **Red Flags to Watch** (unusual or unfavourable clauses)\n9. **Missing Standard Clauses** (what a well-drafted NDA should include)\n10. **Negotiation Points** (suggested changes with business rationale)\n\nFormat as a checklist with Yes/No/Review fields for each item.	t	30	0	2026-03-19 22:53:05.939	2026-03-19 22:53:05.939
cmmy2g6qc001pilvjb88x3yxf	\N	Standard Operating Procedure (SOP)	Document a business process as a clear, step-by-step SOP.	process-documentation	operations	intermediate	{"type": "object", "required": ["processName", "processOwner", "processSteps", "tools"], "properties": {"tools": {"type": "string", "title": "Tools / Systems Used", "x-placeholder": "e.g. Salesforce, Slack, email"}, "exceptions": {"type": "string", "title": "Common Exceptions / Edge Cases", "x-placeholder": "How to handle non-standard situations"}, "processName": {"type": "string", "title": "Process Name", "x-placeholder": "e.g. Customer Onboarding Process"}, "processOwner": {"type": "string", "title": "Process Owner / Department", "x-placeholder": "e.g. Customer Success team"}, "processSteps": {"type": "string", "title": "Process Steps", "minLength": 100, "x-field-type": "textarea", "x-placeholder": "Describe the steps in order, including who does what"}}}	Write a Standard Operating Procedure (SOP) document for the following process.\n\nProcess Name: {{processName}}\nProcess Owner: {{processOwner}}\nTools Used: {{tools}}\n\nProcess Steps:\n{{processSteps}}\n\n{{#if exceptions}}Common Exceptions: {{exceptions}}{{/if}}\n\nSOP format:\n1. **Purpose** (why this process exists)\n2. **Scope** (who this applies to, when it applies)\n3. **Roles & Responsibilities** (RACI — who is Responsible, Accountable, Consulted, Informed)\n4. **Prerequisites** (what must be in place before starting)\n5. **Step-by-Step Procedure** (numbered steps with sub-steps, decision points, and tool references)\n6. **Exception Handling** (how to handle edge cases or failures)\n7. **Quality Checks** (how to verify the process was completed correctly)\n8. **Related Documents** (placeholder for linked SOPs or policies)\n9. **Revision History** (table for version tracking)\n\nWrite at reading level suitable for a new employee on their first week.	t	75	0	2026-03-19 22:53:05.941	2026-03-19 22:53:05.941
cmmy2g6qe001rilvjuskaba5w	\N	SLA Report Narrative	Write the narrative commentary for a Service Level Agreement performance report.	reporting	operations	intermediate	{"type": "object", "required": ["reportPeriod", "slaMetrics", "breaches", "rootCauses"], "properties": {"breaches": {"type": "string", "title": "SLA Breaches", "x-field-type": "textarea", "x-placeholder": "Any breaches: what, when, impact"}, "rootCauses": {"type": "string", "title": "Root Causes", "x-field-type": "textarea", "x-placeholder": "What caused any underperformance"}, "slaMetrics": {"type": "string", "title": "SLA Metrics Performance", "x-field-type": "textarea", "x-placeholder": "Each metric: target, actual, RAG status"}, "reportPeriod": {"type": "string", "title": "Report Period", "x-placeholder": "e.g. March 2026"}, "improvementActions": {"type": "string", "title": "Improvement Actions", "x-placeholder": "Steps being taken to improve performance"}}}	Write the narrative commentary for an SLA performance report.\n\nPeriod: {{reportPeriod}}\n\nSLA Metrics Performance:\n{{slaMetrics}}\n\nBreaches This Period:\n{{breaches}}\n\nRoot Causes:\n{{rootCauses}}\n\nImprovement Actions: {{improvementActions}}\n\nNarrative structure:\n1. **Period Summary** (overall SLA health, headline performance)\n2. **Metrics Performance** (each metric with context, trend, and explanation)\n3. **Breach Analysis** (detailed account of any breaches — factual, not defensive)\n4. **Root Cause Summary** (underlying drivers)\n5. **Remediation Actions** (what's being done and expected resolution dates)\n6. **Trend & Outlook** (month-over-month trend, forecast for next period)\n7. **Client Communication Recommendation** (if client-facing: suggested message to send)\n\nTone: professional, accountable, solution-focused. Don't hide problems — address them directly.	t	40	0	2026-03-19 22:53:05.943	2026-03-19 22:53:05.943
cmmy2g6qg001tilvj63ky6k46	\N	Incident Post-Mortem Report	Document an operational incident with timeline, root cause, and corrective actions.	incident-management	operations	advanced	{"type": "object", "required": ["incidentName", "incidentDate", "duration", "impact", "timeline", "rootCause"], "properties": {"impact": {"type": "string", "title": "Business Impact", "x-field-type": "textarea", "x-placeholder": "Who was affected, how severely, estimated cost"}, "duration": {"type": "string", "title": "Duration", "x-placeholder": "e.g. 2 hours 14 minutes"}, "timeline": {"type": "string", "title": "Incident Timeline", "x-field-type": "textarea", "x-placeholder": "Chronological events from first detection to resolution"}, "rootCause": {"type": "string", "title": "Root Cause", "x-field-type": "textarea", "x-placeholder": "What caused the incident"}, "incidentDate": {"type": "string", "title": "Incident Date", "x-field-type": "date"}, "incidentName": {"type": "string", "title": "Incident Name", "x-placeholder": "e.g. Database Outage — 14 March 2026"}}}	Write a blameless post-mortem report for the following operational incident.\n\nIncident: {{incidentName}}\nDate: {{incidentDate}}\nDuration: {{duration}}\n\nBusiness Impact:\n{{impact}}\n\nTimeline of Events:\n{{timeline}}\n\nRoot Cause:\n{{rootCause}}\n\nPost-mortem structure:\n1. **Incident Summary** (one paragraph suitable for executive briefing)\n2. **Impact Assessment** (who was affected, for how long, business cost)\n3. **Timeline** (detailed chronological sequence — detection, escalation, diagnosis, resolution)\n4. **Root Cause Analysis** (5 Whys or similar structured analysis)\n5. **Contributing Factors** (conditions that made the incident more likely or severe)\n6. **What Went Well** (response actions that worked)\n7. **What Could Be Improved** (without blame — focus on systems and processes)\n8. **Action Items** (specific, time-bound improvements with owners)\n9. **Prevention Strategy** (how to prevent recurrence)\n\nBlameless tone: focus on systems, not individuals. This should be safe to share with the whole team.	t	80	0	2026-03-19 22:53:05.945	2026-03-19 22:53:05.945
cmmy2g6qi001vilvj8dr8kict	\N	Vendor Performance Review	Evaluate a vendor's performance against agreed KPIs and contract terms.	vendor-management	operations	intermediate	{"type": "object", "required": ["vendorName", "serviceProvided", "reviewPeriod", "kpiPerformance", "issues"], "properties": {"issues": {"type": "string", "title": "Issues / Incidents", "x-field-type": "textarea", "x-placeholder": "Any service failures, escalations, or concerns"}, "vendorName": {"type": "string", "title": "Vendor Name", "x-placeholder": "e.g. FastShip Logistics"}, "reviewPeriod": {"type": "string", "title": "Review Period", "x-placeholder": "e.g. Q1 2026"}, "kpiPerformance": {"type": "string", "title": "KPI Performance", "x-field-type": "textarea", "x-placeholder": "Each KPI: target, actual, and RAG"}, "serviceProvided": {"type": "string", "title": "Service Provided", "x-placeholder": "e.g. Last-mile delivery"}}}	Write a vendor performance review report.\n\nVendor: {{vendorName}}\nService: {{serviceProvided}}\nPeriod: {{reviewPeriod}}\n\nKPI Performance:\n{{kpiPerformance}}\n\nIssues / Incidents:\n{{issues}}\n\nReport structure:\n1. **Executive Summary** (overall performance rating: Excellent/Good/Acceptable/Unacceptable)\n2. **KPI Scorecard** (each KPI with target, actual, status, and trend)\n3. **Strengths** (what the vendor has done well)\n4. **Areas for Improvement** (specific, evidence-based concerns)\n5. **Incident Review** (any service failures or escalations with impact)\n6. **Contractual Compliance** (compliance with SLAs, pricing, and obligations)\n7. **Relationship Health** (communication, responsiveness, proactivity)\n8. **Recommendations** (continue/improve/put on notice/exit)\n9. **Action Plan** (agreed actions with vendor for next period)	t	50	0	2026-03-19 22:53:05.946	2026-03-19 22:53:05.946
cmmy2g6qj001xilvjeiqceeny	\N	Business Continuity Plan Section	Draft a business continuity plan section for a critical business process.	risk-management	operations	advanced	{"type": "object", "required": ["processName", "criticalityLevel", "recoveryTimeObjective", "disruptionScenarios", "recoverySteps"], "properties": {"processName": {"type": "string", "title": "Business Process Name", "x-placeholder": "e.g. Order Processing"}, "recoverySteps": {"type": "string", "title": "Recovery Steps", "x-field-type": "textarea", "x-placeholder": "How to recover and who does what"}, "criticalityLevel": {"enum": ["Mission Critical", "High", "Medium", "Low"], "type": "string", "title": "Criticality", "x-field-type": "select", "x-enum-labels": ["Mission Critical", "High", "Medium", "Low"]}, "disruptionScenarios": {"type": "string", "title": "Disruption Scenarios", "x-field-type": "textarea", "x-placeholder": "What could disrupt this process (power, system, people, etc.)"}, "recoveryTimeObjective": {"type": "string", "title": "Recovery Time Objective (RTO)", "x-placeholder": "e.g. 4 hours"}}}	Write a Business Continuity Plan (BCP) section for the following process.\n\nProcess: {{processName}}\nCriticality: {{criticalityLevel}}\nRecovery Time Objective (RTO): {{recoveryTimeObjective}}\n\nDisruption Scenarios:\n{{disruptionScenarios}}\n\nRecovery Steps:\n{{recoverySteps}}\n\nBCP section structure:\n1. **Process Overview** (what it does, who depends on it, business impact if unavailable)\n2. **Criticality & Recovery Objectives** (RTO, RPO — Recovery Point Objective)\n3. **Threat Assessment** (likely disruption scenarios and probability/impact)\n4. **Dependencies** (people, systems, suppliers, facilities required)\n5. **Recovery Procedures** (step-by-step for each disruption scenario)\n6. **Roles & Responsibilities** (who leads recovery, backup contacts)\n7. **Communication Plan** (who to notify, when, and how)\n8. **Testing Schedule** (how and when to test this plan)\n9. **Plan Owner & Review Date**\n\nWrite in a clear, actionable format that works under pressure.	t	100	0	2026-03-19 22:53:05.948	2026-03-19 22:53:05.948
cmmy2g6ql001zilvjqzdx7kea	\N	Operational Efficiency Improvement Proposal	Propose specific efficiency improvements to a business process with ROI analysis.	process-improvement	operations	advanced	{"type": "object", "required": ["processName", "currentState", "painPoints", "proposedChanges"], "properties": {"painPoints": {"type": "string", "title": "Pain Points", "x-field-type": "textarea", "x-placeholder": "What is slow, costly, error-prone, or frustrating"}, "processName": {"type": "string", "title": "Process Name", "x-placeholder": "e.g. Invoice Approval Process"}, "currentState": {"type": "string", "title": "Current State", "x-field-type": "textarea", "x-placeholder": "How it works today, volume, people involved, time taken"}, "proposedChanges": {"type": "string", "title": "Proposed Changes", "x-field-type": "textarea", "x-placeholder": "What you want to change or automate"}, "estimatedBenefit": {"type": "string", "title": "Estimated Benefit", "x-placeholder": "Time saved, cost reduced, errors eliminated"}}}	Write an operational efficiency improvement proposal.\n\nProcess: {{processName}}\n\nCurrent State:\n{{currentState}}\n\nPain Points:\n{{painPoints}}\n\nProposed Changes:\n{{proposedChanges}}\n\nExpected Benefits: {{estimatedBenefit}}\n\nProposal structure:\n1. **Executive Summary** (problem, solution, expected benefit)\n2. **Current State Analysis** (process map narrative, metrics, pain points)\n3. **Proposed Improvements** (each change described clearly with rationale)\n4. **Expected Benefits** (quantified where possible: time, cost, quality)\n5. **Implementation Plan** (phases, milestones, resources needed)\n6. **Cost to Implement** (estimate of effort, tools, or change management)\n7. **ROI Analysis** (simple payback calculation)\n8. **Risks & Mitigations**\n9. **Recommendation & Next Steps**	t	90	0	2026-03-19 22:53:05.95	2026-03-19 22:53:05.95
cmmy2g6qn0021ilvjwlnxhnzw	\N	Press Release	Write a professional press release for a company announcement.	public-relations	marketing	intermediate	{"type": "object", "required": ["companyName", "announcement", "keyFacts", "quote", "contactDetails"], "properties": {"quote": {"type": "string", "title": "Executive Quote", "x-placeholder": "Quote from CEO or relevant executive (or leave blank to draft one)"}, "keyFacts": {"type": "string", "title": "Key Facts & Details", "x-field-type": "textarea", "x-placeholder": "Supporting numbers, dates, specifics"}, "companyName": {"type": "string", "title": "Company Name", "x-placeholder": "e.g. Wren GmbH"}, "announcement": {"type": "string", "title": "The Announcement", "x-field-type": "textarea", "x-placeholder": "What are you announcing? Why does it matter?"}, "contactDetails": {"type": "string", "title": "PR Contact Details", "x-placeholder": "Name, email, phone for media enquiries"}}}	Write a professional press release for the following announcement.\n\nCompany: {{companyName}}\nAnnouncement: {{announcement}}\nKey Facts: {{keyFacts}}\n{{#if quote}}Executive Quote: {{quote}}{{/if}}\nPR Contact: {{contactDetails}}\n\nPress release format:\nFOR IMMEDIATE RELEASE\n\n[Headline — compelling, newsy, 10 words max]\n[Subheadline — adds context, one sentence]\n\n[City, Date] — [Opening paragraph: who, what, when, where, why — the inverted pyramid]\n\n[Second paragraph: context, significance, market relevance]\n\n[Third paragraph: {{#if quote}}Include the quote{{else}}Draft a quote from the CEO{{/if}}]\n\n[Fourth paragraph: additional details, background]\n\n[Boilerplate: 3-sentence company description]\n\n###\n\nMedia Contact:\n{{contactDetails}}\n\nWrite in standard press release style. Avoid superlatives and marketing fluff. Make every sentence newsworthy.	t	45	0	2026-03-19 22:53:05.951	2026-03-19 22:53:05.951
cmmy2g6qo0023ilvjweef1q18	\N	LinkedIn Company Post	Write an engaging LinkedIn post that drives comments and shares.	social-media	marketing	beginner	{"type": "object", "required": ["topic", "keyMessage", "audience"], "properties": {"cta": {"type": "string", "title": "Call to Action", "x-placeholder": "e.g. comment below, share with your team, follow for more"}, "tone": {"enum": ["Professional", "Conversational", "Inspiring", "Educational", "Bold"], "type": "string", "title": "Tone", "x-field-type": "select", "x-enum-labels": ["Professional", "Conversational", "Inspiring", "Educational", "Bold"]}, "topic": {"type": "string", "title": "Post Topic", "x-placeholder": "e.g. Product launch, industry insight, team achievement"}, "audience": {"type": "string", "title": "Target Audience", "x-placeholder": "e.g. HR leaders, CFOs, SMB owners"}, "keyMessage": {"type": "string", "title": "Key Message", "x-field-type": "textarea", "x-placeholder": "What is the one thing you want people to take away?"}}}	Write a LinkedIn company post on the following topic.\n\nTopic: {{topic}}\nKey Message: {{keyMessage}}\nTarget Audience: {{audience}}\nTone: {{tone}}\nCTA: {{cta}}\n\nPost requirements:\n- Hook in the first 2 lines (people only see this before "see more")\n- 150–250 words total\n- Use white space liberally (short paragraphs, line breaks)\n- Include 3–5 relevant hashtags at the end\n- End with a genuine question or CTA to drive engagement\n- Avoid buzzwords like "excited to share", "thrilled to announce"\n- Write as a company voice, not an individual\n\nOutput the post text, ready to copy-paste.	t	20	0	2026-03-19 22:53:05.953	2026-03-19 22:53:05.953
cmmy2g6qq0025ilvjuvcclv6p	\N	Marketing Campaign Brief	Create a comprehensive campaign brief to align teams before launch.	campaign-planning	marketing	intermediate	{"type": "object", "required": ["campaignName", "campaignObjective", "targetAudience", "keyMessage", "budget"], "properties": {"budget": {"type": "string", "title": "Campaign Budget", "x-placeholder": "e.g. €30,000"}, "timeline": {"type": "string", "title": "Campaign Timeline", "x-placeholder": "e.g. 1 April – 31 May 2026"}, "keyMessage": {"type": "string", "title": "Key Message", "x-field-type": "textarea", "x-placeholder": "Core message and value proposition"}, "campaignName": {"type": "string", "title": "Campaign Name", "x-placeholder": "e.g. Q2 Growth Push"}, "targetAudience": {"type": "string", "title": "Target Audience", "x-field-type": "textarea", "x-placeholder": "Who you are targeting — segments, roles, pain points"}, "campaignObjective": {"type": "string", "title": "Campaign Objective", "x-placeholder": "e.g. Generate 200 qualified leads in 6 weeks"}}}	Write a comprehensive marketing campaign brief.\n\nCampaign: {{campaignName}}\nObjective: {{campaignObjective}}\nBudget: {{budget}}\nTimeline: {{timeline}}\n\nTarget Audience:\n{{targetAudience}}\n\nKey Message:\n{{keyMessage}}\n\nBrief structure:\n1. **Campaign Overview** (name, objective, timeline, budget)\n2. **Background & Context** (why this campaign, what's happening in market)\n3. **Target Audience** (primary and secondary segments with persona descriptions)\n4. **Campaign Goal & Success Metrics** (SMART objectives with KPIs)\n5. **Key Message Architecture** (headline message, supporting messages, proof points)\n6. **Channel Strategy** (recommended channels and rationale)\n7. **Creative Direction** (tone, visual style, messaging themes)\n8. **Content Requirements** (assets needed: ads, landing pages, emails, etc.)\n9. **Timeline & Milestones** (phased plan with key dates)\n10. **Budget Allocation** (channel-by-channel breakdown)\n11. **Team & Responsibilities** (RACI)\n12. **Risks & Contingencies**	t	60	0	2026-03-19 22:53:05.955	2026-03-19 22:53:05.955
cmmy2g6qs0027ilvjfxq1scq6	\N	Customer Case Study	Write a compelling customer success story that converts prospects.	content-marketing	marketing	intermediate	{"type": "object", "required": ["customerName", "customerIndustry", "challenge", "solution", "results"], "properties": {"results": {"type": "string", "title": "The Results", "x-field-type": "textarea", "x-placeholder": "Quantified outcomes: %, €, time saved, etc."}, "solution": {"type": "string", "title": "The Solution", "x-field-type": "textarea", "x-placeholder": "How did your product/service solve the problem?"}, "challenge": {"type": "string", "title": "The Challenge", "x-field-type": "textarea", "x-placeholder": "What problem was the customer facing before they used your product?"}, "customerName": {"type": "string", "title": "Customer Company Name", "x-placeholder": "e.g. Müller Logistics"}, "customerQuote": {"type": "string", "title": "Customer Quote (optional)", "x-placeholder": "Direct quote from the customer"}, "customerIndustry": {"type": "string", "title": "Customer Industry", "x-placeholder": "e.g. Logistics & Supply Chain"}}}	Write a customer case study for sales and marketing use.\n\nCustomer: {{customerName}} ({{customerIndustry}})\n\nThe Challenge:\n{{challenge}}\n\nThe Solution:\n{{solution}}\n\nThe Results:\n{{results}}\n\n{{#if customerQuote}}Customer Quote: {{customerQuote}}{{/if}}\n\nCase study structure:\n1. **Headline** (result-focused, specific number if possible)\n2. **At a Glance** (sidebar stats: industry, challenge category, 2–3 key results)\n3. **The Challenge** (customer's situation before — make it relatable)\n4. **Why They Chose Us** (decision factors, what differentiated us)\n5. **The Solution** (how it works for them specifically)\n6. **The Results** (specific, quantified outcomes — the hero of the story)\n{{#if customerQuote}}7. **In Their Words** (the customer quote in full){{/if}}\n8. **What's Next** (future plans — shows ongoing success)\n\nWrite in narrative form — tell a story. Lead with results. Keep jargon-free.	t	90	0	2026-03-19 22:53:05.956	2026-03-19 22:53:05.956
cmmy2g6qu0029ilvjygttx1q3	\N	Email Newsletter Section	Write a section for your company newsletter that informs and engages.	email-marketing	marketing	beginner	{"type": "object", "required": ["sectionType", "topic", "keyPoints", "audience"], "properties": {"topic": {"type": "string", "title": "Topic", "x-placeholder": "What is this section about?"}, "audience": {"type": "string", "title": "Audience", "x-placeholder": "e.g. customers, prospects, employees"}, "keyPoints": {"type": "string", "title": "Key Points to Cover", "x-field-type": "textarea", "x-placeholder": "Main facts or messages to include"}, "sectionType": {"enum": ["Company update", "Product news", "Industry insight", "Customer spotlight", "Team highlight", "Upcoming event"], "type": "string", "title": "Section Type", "x-field-type": "select", "x-enum-labels": ["Company update", "Product news", "Industry insight", "Customer spotlight", "Team highlight", "Upcoming event"]}}}	Write a newsletter section for our company newsletter.\n\nSection Type: {{sectionType}}\nTopic: {{topic}}\nAudience: {{audience}}\n\nKey Points:\n{{keyPoints}}\n\nRequirements:\n- Engaging headline for the section\n- 100–150 words body copy\n- Conversational, warm tone\n- One clear link/CTA if appropriate\n- No jargon, no filler\n- Write to be skimmed — short sentences, active voice\n\nOutput the section headline and body text.	t	20	0	2026-03-19 22:53:05.958	2026-03-19 22:53:05.958
cmmy2g6qw002bilvj35fo2whm	\N	Product Launch Announcement Email	Write a product launch email that generates excitement and drives action.	product-marketing	marketing	intermediate	{"type": "object", "required": ["productName", "targetAudience", "keyBenefit", "launchDate", "cta"], "properties": {"cta": {"type": "string", "title": "Call to Action", "x-placeholder": "e.g. Try it free, Book a demo, See it in action"}, "keyBenefit": {"type": "string", "title": "Key Benefit", "x-field-type": "textarea", "x-placeholder": "What problem does it solve? What's the headline value?"}, "launchDate": {"type": "string", "title": "Launch Date", "x-field-type": "date"}, "productName": {"type": "string", "title": "Product / Feature Name", "x-placeholder": "e.g. Wren Prompt Library"}, "targetAudience": {"type": "string", "title": "Target Audience", "x-placeholder": "e.g. HR teams at mid-sized companies"}, "featureHighlights": {"type": "string", "title": "Feature Highlights (optional)", "x-placeholder": "3 standout features to mention"}}}	Write a product launch announcement email.\n\nProduct: {{productName}}\nAudience: {{targetAudience}}\nLaunch Date: {{launchDate}}\nKey Benefit: {{keyBenefit}}\n{{#if featureHighlights}}Feature Highlights: {{featureHighlights}}{{/if}}\nCTA: {{cta}}\n\nEmail requirements:\n- Subject line: creates curiosity/urgency, < 50 characters\n- Preview text: complements the subject line\n- Opening: lead with the customer problem, not the product\n- Body: 200–250 words\n- 3 feature bullets (specific benefits, not features)\n- Social proof line if available\n- Strong, single CTA button text\n- Warm, confident sign-off\n\nOutput: Subject | Preview Text | Body (formatted)	t	35	0	2026-03-19 22:53:05.96	2026-03-19 22:53:05.96
cmmy2g6qy002dilvjgecl58th	\N	IT Incident Report	Document an IT incident with full technical detail for the incident log.	incident-management	it	intermediate	{"type": "object", "required": ["incidentTitle", "severity", "startTime", "systemsAffected", "timeline", "resolution"], "properties": {"severity": {"enum": ["P1 - Critical", "P2 - High", "P3 - Medium", "P4 - Low"], "type": "string", "title": "Severity", "x-field-type": "select", "x-enum-labels": ["P1 - Critical", "P2 - High", "P3 - Medium", "P4 - Low"]}, "timeline": {"type": "string", "title": "Incident Timeline", "x-field-type": "textarea", "x-placeholder": "Chronological events: detection, actions, resolution"}, "startTime": {"type": "string", "title": "Start Time (UTC)", "x-placeholder": "e.g. 2026-03-14 09:42 UTC"}, "resolution": {"type": "string", "title": "Resolution", "x-field-type": "textarea", "x-placeholder": "What fixed the issue and when it was resolved"}, "incidentTitle": {"type": "string", "title": "Incident Title", "x-placeholder": "e.g. Production Database Unavailable"}, "systemsAffected": {"type": "string", "title": "Systems Affected", "x-field-type": "textarea", "x-placeholder": "Which systems, services, or users were impacted"}}}	Write a formal IT incident report.\n\nIncident: {{incidentTitle}}\nSeverity: {{severity}}\nStart Time: {{startTime}}\nSystems Affected: {{systemsAffected}}\n\nTimeline:\n{{timeline}}\n\nResolution:\n{{resolution}}\n\nReport structure:\n1. **Incident Summary** (title, severity, duration, impact in 3 sentences)\n2. **Affected Systems & Users** (specific systems, number of users impacted)\n3. **Detailed Timeline** (formatted chronological log with timestamps)\n4. **Root Cause** (technical root cause in plain language)\n5. **Resolution Steps** (how the issue was resolved, technically specific)\n6. **Business Impact** (downtime, data affected, service degradation)\n7. **Contributing Factors** (what conditions made this incident happen or worse)\n8. **Preventive Actions** (technical and process changes to prevent recurrence)\n9. **Open Action Items** (remaining tasks with owners and due dates)\n\nInclude technical detail appropriate for engineering review, but summary sections accessible to non-technical management.	t	45	0	2026-03-19 22:53:05.962	2026-03-19 22:53:05.962
cmmy2g6r1002filvj186bp42x	\N	Change Request Document	Write a formal IT change request for CAB review and approval.	change-management	it	intermediate	{"type": "object", "required": ["changeTitle", "changeType", "system", "changeDescription", "businessJustification", "rollbackPlan"], "properties": {"system": {"type": "string", "title": "System / Service", "x-placeholder": "e.g. Production API, Database cluster"}, "changeType": {"enum": ["Standard", "Normal", "Emergency"], "type": "string", "title": "Change Type", "x-field-type": "select", "x-enum-labels": ["Standard (pre-approved)", "Normal (CAB review)", "Emergency (expedited)"]}, "changeTitle": {"type": "string", "title": "Change Title", "x-placeholder": "e.g. Upgrade PostgreSQL from 15 to 16"}, "rollbackPlan": {"type": "string", "title": "Rollback Plan", "x-field-type": "textarea", "x-placeholder": "How to reverse the change if something goes wrong"}, "changeDescription": {"type": "string", "title": "Change Description", "x-field-type": "textarea", "x-placeholder": "Technical details of what will be changed and how"}, "businessJustification": {"type": "string", "title": "Business Justification", "x-placeholder": "Why this change is needed"}}}	Write a formal IT Change Request (CR) document for CAB review.\n\nChange: {{changeTitle}}\nType: {{changeType}}\nSystem: {{system}}\nBusiness Justification: {{businessJustification}}\n\nChange Description:\n{{changeDescription}}\n\nRollback Plan:\n{{rollbackPlan}}\n\nCR Document sections:\n1. **Change Summary** (title, type, system, requestor, requested date)\n2. **Change Description** (technical detail of what is changing)\n3. **Business Justification** (why this change is needed, risk of not doing it)\n4. **Impact Assessment** (systems affected, user impact, dependencies)\n5. **Risk Assessment** (risk of change, risk of failure, risk rating: Low/Medium/High)\n6. **Implementation Plan** (step-by-step technical implementation with estimated durations)\n7. **Testing Plan** (how to verify success before and after change)\n8. **Rollback Plan** (specific steps to reverse if needed, go/no-go decision point)\n9. **Communication Plan** (who to notify and when)\n10. **Approval Required** (change type and approver level)	t	40	0	2026-03-19 22:53:05.965	2026-03-19 22:53:05.965
cmmy2g6r3002hilvje23hwvsc	\N	Technical Runbook	Write an operational runbook for a recurring technical procedure.	documentation	it	intermediate	{"type": "object", "required": ["procedureName", "trigger", "prerequisites", "steps", "successCriteria"], "properties": {"steps": {"type": "string", "title": "Procedure Steps", "minLength": 50, "x-field-type": "textarea", "x-placeholder": "Ordered steps to execute the procedure"}, "trigger": {"type": "string", "title": "When to Use This Runbook", "x-placeholder": "e.g. When primary database is unreachable for > 2 minutes"}, "prerequisites": {"type": "string", "title": "Prerequisites", "x-field-type": "textarea", "x-placeholder": "Access required, tools needed, checks to make first"}, "procedureName": {"type": "string", "title": "Procedure Name", "x-placeholder": "e.g. Database Failover Procedure"}, "successCriteria": {"type": "string", "title": "Success Criteria", "x-placeholder": "How do you know it worked?"}}}	Write a technical runbook for the following operational procedure.\n\nProcedure: {{procedureName}}\nWhen to Use: {{trigger}}\n\nPrerequisites:\n{{prerequisites}}\n\nProcedure Steps:\n{{steps}}\n\nSuccess Criteria: {{successCriteria}}\n\nRunbook format:\n# {{procedureName}} Runbook\n\n## Overview\n[Brief description and when to use this runbook]\n\n## Pre-conditions\n- Required access and permissions\n- Tools and credentials needed\n- Initial checks to confirm you're in the right situation\n\n## Procedure\n\n[Numbered steps with:\n- Exact commands in code blocks where applicable\n- Expected output after each critical step\n- Decision points clearly marked\n- Warning callouts for risky actions]\n\n## Verification\n[How to confirm the procedure succeeded]\n\n## Troubleshooting\n[Common failure points and how to handle them]\n\n## Rollback\n[How to undo if something goes wrong]\n\n## Escalation\n[When and who to escalate to if procedure fails]\n\nWrite with precision. Use code blocks for commands. Assume the reader is on-call and under pressure.	t	60	0	2026-03-19 22:53:05.967	2026-03-19 22:53:05.967
cmmy2g6r4002jilvjcvd7pmal	\N	Technology Evaluation Report	Compare technology options and recommend the best solution for your needs.	architecture	it	advanced	{"type": "object", "required": ["evaluationSubject", "businessRequirements", "options", "evaluationCriteria"], "properties": {"options": {"type": "string", "title": "Options Being Evaluated", "x-field-type": "textarea", "x-placeholder": "List the products, services, or approaches being compared"}, "evaluationSubject": {"type": "string", "title": "What Are You Evaluating?", "x-placeholder": "e.g. Message Queue: Kafka vs RabbitMQ vs SQS"}, "evaluationCriteria": {"type": "string", "title": "Evaluation Criteria", "x-field-type": "textarea", "x-placeholder": "What dimensions matter most (cost, performance, ease of use, support, etc.)"}, "businessRequirements": {"type": "string", "title": "Business Requirements", "x-field-type": "textarea", "x-placeholder": "What does the solution need to do? Volume, latency, scale, budget?"}}}	Write a technology evaluation report.\n\nSubject: {{evaluationSubject}}\n\nBusiness Requirements:\n{{businessRequirements}}\n\nOptions Evaluated:\n{{options}}\n\nEvaluation Criteria:\n{{evaluationCriteria}}\n\nReport structure:\n1. **Executive Summary** (recommendation in 3 sentences with primary rationale)\n2. **Requirements Analysis** (detailed breakdown of must-have vs nice-to-have)\n3. **Options Overview** (brief description of each option)\n4. **Evaluation Matrix** (scored comparison table: each option × each criterion)\n5. **Detailed Analysis** (deep dive on each option's strengths, weaknesses, fit)\n6. **Recommendation** (clear recommendation with full rationale)\n7. **Implementation Considerations** (migration path, learning curve, integration effort)\n8. **Total Cost of Ownership** (licensing, infrastructure, support, training)\n9. **Risk Assessment** (vendor risk, technical risk, adoption risk)\n10. **Decision** (what you recommend and why you didn't choose the alternatives)\n\nBe opinionated. A good technology evaluation report gives a clear recommendation.	t	120	0	2026-03-19 22:53:05.969	2026-03-19 22:53:05.969
cmmy2g6r6002lilvjrdr4b8kz	\N	API Documentation (Endpoint)	Generate clear, developer-friendly API endpoint documentation.	documentation	it	intermediate	{"type": "object", "required": ["endpointMethod", "endpointPath", "description", "requestParams", "responseFormat"], "properties": {"description": {"type": "string", "title": "What This Endpoint Does", "x-field-type": "textarea", "x-placeholder": "Describe the purpose and behaviour"}, "endpointPath": {"type": "string", "title": "Endpoint Path", "x-placeholder": "e.g. /api/v1/prompts/:id/execute"}, "requestParams": {"type": "string", "title": "Request Parameters / Body", "x-field-type": "textarea", "x-placeholder": "Path params, query params, request body fields with types"}, "endpointMethod": {"enum": ["GET", "POST", "PUT", "PATCH", "DELETE"], "type": "string", "title": "HTTP Method", "x-field-type": "select", "x-enum-labels": ["GET", "POST", "PUT", "PATCH", "DELETE"]}, "responseFormat": {"type": "string", "title": "Response Format", "x-field-type": "textarea", "x-placeholder": "Response body structure and fields"}}}	Write API endpoint documentation for the following endpoint.\n\nMethod: {{endpointMethod}}\nPath: {{endpointPath}}\nDescription: {{description}}\n\nRequest:\n{{requestParams}}\n\nResponse:\n{{responseFormat}}\n\nDocumentation format:\n\n## {{endpointMethod}} {{endpointPath}}\n\n### Overview\n[Clear one-sentence description]\n\n### Authentication\n[Auth requirements]\n\n### Request\n\n**Path Parameters** (if any)\n| Parameter | Type | Required | Description |\n\n**Query Parameters** (if any)\n| Parameter | Type | Required | Default | Description |\n\n**Request Body** (if any)\n```json\n[Example request body]\n```\n\n| Field | Type | Required | Description |\n\n### Response\n\n**Success Response (200)**\n```json\n[Example response]\n```\n\n| Field | Type | Description |\n\n**Error Responses**\n| Status | Code | Description |\n\n### Example\n\n```curl\n[Complete curl example]\n```\n\n### Notes\n[Any important caveats, rate limits, or behaviour notes]	t	30	0	2026-03-19 22:53:05.971	2026-03-19 22:53:05.971
cmmy2g6r8002nilvj683dj89p	\N	Security Vulnerability Report	Document a security vulnerability with risk assessment and remediation plan.	security	it	advanced	{"type": "object", "required": ["vulnerabilityTitle", "severity", "systemAffected", "description", "impact", "remediation"], "properties": {"impact": {"type": "string", "title": "Potential Impact", "x-field-type": "textarea", "x-placeholder": "What could an attacker do if they exploited this?"}, "severity": {"enum": ["Critical", "High", "Medium", "Low", "Informational"], "type": "string", "title": "CVSS Severity", "x-field-type": "select", "x-enum-labels": ["Critical (9.0-10.0)", "High (7.0-8.9)", "Medium (4.0-6.9)", "Low (0.1-3.9)", "Informational"]}, "description": {"type": "string", "title": "Vulnerability Description", "x-field-type": "textarea", "x-placeholder": "Technical description of the vulnerability"}, "remediation": {"type": "string", "title": "Proposed Remediation", "x-field-type": "textarea", "x-placeholder": "How to fix it"}, "systemAffected": {"type": "string", "title": "System / Component Affected", "x-placeholder": "e.g. API v1 /users/search endpoint"}, "vulnerabilityTitle": {"type": "string", "title": "Vulnerability Title", "x-placeholder": "e.g. SQL Injection in User Search Endpoint"}}}	Write a security vulnerability report.\n\nVulnerability: {{vulnerabilityTitle}}\nSeverity: {{severity}}\nAffected System: {{systemAffected}}\n\nDescription:\n{{description}}\n\nPotential Impact:\n{{impact}}\n\nProposed Remediation:\n{{remediation}}\n\nReport structure:\n1. **Vulnerability Summary** (title, severity rating, affected system, discovery date)\n2. **Technical Description** (detailed explanation of the vulnerability, how it can be exploited)\n3. **Proof of Concept** (prompt section — describe what evidence exists without including actual exploit code)\n4. **Risk Assessment** (CVSS score rationale: Attack Vector, Complexity, Privileges, Impact)\n5. **Business Impact** (what could happen if exploited — data, reputation, compliance)\n6. **Affected Versions / Scope** (what is and isn't affected)\n7. **Remediation Plan** (specific fix with implementation steps)\n8. **Temporary Mitigations** (what to do immediately before a fix is deployed)\n9. **Verification** (how to confirm the fix worked)\n10. **Timeline & Priority** (recommended fix timeline based on severity)	t	60	0	2026-03-19 22:53:05.973	2026-03-19 22:53:05.973
cmmy2g6ra002pilvjplxqjre7	\N	Board Meeting Update	Write a concise, balanced board update that covers performance and priorities.	board-reporting	executive	advanced	{"type": "object", "required": ["period", "revenueUpdate", "keyAchievements", "keyRisks", "strategicPriorities"], "properties": {"period": {"type": "string", "title": "Reporting Period", "x-placeholder": "e.g. Q1 2026"}, "keyRisks": {"type": "string", "title": "Key Risks & Issues", "x-field-type": "textarea", "x-placeholder": "Top risks the board should be aware of"}, "revenueUpdate": {"type": "string", "title": "Revenue / Financial Update", "x-field-type": "textarea", "x-placeholder": "Key financial metrics vs targets"}, "keyAchievements": {"type": "string", "title": "Key Achievements", "x-field-type": "textarea", "x-placeholder": "3–5 significant accomplishments this period"}, "strategicPriorities": {"type": "string", "title": "Next Period Priorities", "x-field-type": "textarea", "x-placeholder": "Top 3–5 priorities for the next period"}}}	Write a board meeting update document for the following period.\n\nPeriod: {{period}}\n\nFinancial Update:\n{{revenueUpdate}}\n\nKey Achievements:\n{{keyAchievements}}\n\nKey Risks & Issues:\n{{keyRisks}}\n\nNext Period Priorities:\n{{strategicPriorities}}\n\nDocument structure:\n1. **Executive Summary** (1 paragraph — the essential narrative for board members who skim)\n2. **Financial Performance** (vs plan, vs prior period, key drivers, forecast)\n3. **Operational Highlights** (major achievements with metrics)\n4. **Strategic Progress** (progress against annual plan/OKRs)\n5. **People & Organisation** (headcount, key hires, talent risk)\n6. **Risks & Issues** (RAG-rated risk register — top 5)\n7. **Decisions Required** (explicit asks of the board — what do you need approved?)\n8. **Next Period Focus** (priorities for the coming quarter)\n\nTone: direct, factual, confident. Boards appreciate conciseness. Lead with insights, not data dumps. Max 1,000 words.	t	120	0	2026-03-19 22:53:05.975	2026-03-19 22:53:05.975
cmmy2g6rc002rilvjtb86xzmq	\N	OKR Review Document	Write a structured OKR progress review for executive team alignment.	strategy	executive	intermediate	{"type": "object", "required": ["quarter", "objectives", "keyResults", "progressSummary"], "properties": {"quarter": {"type": "string", "title": "Quarter", "x-placeholder": "e.g. Q1 2026"}, "keyResults": {"type": "string", "title": "Key Results & Current Status", "x-field-type": "textarea", "x-placeholder": "Each KR with target, current score, and % complete"}, "objectives": {"type": "string", "title": "Objectives", "x-field-type": "textarea", "x-placeholder": "List your company or team objectives"}, "progressSummary": {"type": "string", "title": "Progress Context", "x-field-type": "textarea", "x-placeholder": "What happened this quarter — wins, blockers, pivots"}}}	Write an OKR progress review document.\n\nQuarter: {{quarter}}\n\nObjectives:\n{{objectives}}\n\nKey Results & Status:\n{{keyResults}}\n\nProgress Context:\n{{progressSummary}}\n\nReview document structure:\n1. **Quarter Overview** (overall OKR health — are we on track to hit our objectives?)\n2. **Objective-by-Objective Review** (for each objective):\n   - Overall confidence score (0–100%)\n   - Each key result with: target, current, status (On Track / At Risk / Off Track)\n   - What's driving progress or blocking it\n   - Actions to accelerate or recover\n3. **Patterns & Insights** (what's the story across all OKRs — what does the data tell us?)\n4. **Learnings** (what have we learned this quarter — update our approach if needed)\n5. **Q+1 Implications** (what should we carry forward or change in next quarter's OKRs?)\n\nBe honest about at-risk and off-track KRs. A good OKR review is a candid conversation, not a celebration.	t	60	0	2026-03-19 22:53:05.977	2026-03-19 22:53:05.977
cmmy2g6re002tilvj6y23dymx	\N	Strategy Memo	Write a strategic memo to align the leadership team on direction and decisions.	strategy	executive	advanced	{"type": "object", "required": ["topic", "context", "recommendation", "keyArguments", "risksAndTradeoffs"], "properties": {"topic": {"type": "string", "title": "Memo Topic", "x-placeholder": "e.g. Market expansion into the DACH region"}, "context": {"type": "string", "title": "Context & Background", "x-field-type": "textarea", "x-placeholder": "What situation or opportunity is this memo addressing?"}, "keyArguments": {"type": "string", "title": "Supporting Arguments", "x-field-type": "textarea", "x-placeholder": "Data, rationale, and evidence for the recommendation"}, "recommendation": {"type": "string", "title": "Recommendation", "x-field-type": "textarea", "x-placeholder": "What are you recommending and why?"}, "risksAndTradeoffs": {"type": "string", "title": "Risks & Trade-offs", "x-field-type": "textarea", "x-placeholder": "What are the downsides and what are you trading off?"}}}	Write a strategic memo for leadership alignment.\n\nTopic: {{topic}}\n\nContext:\n{{context}}\n\nRecommendation:\n{{recommendation}}\n\nSupporting Arguments:\n{{keyArguments}}\n\nRisks & Trade-offs:\n{{risksAndTradeoffs}}\n\nMemo structure (Amazon-style narrative):\n1. **Recommendation** (state it upfront — 2 sentences max)\n2. **Context** (what situation requires a decision, what has changed)\n3. **The Opportunity / Problem** (quantify it — why does this matter now)\n4. **Options Considered** (at least 3 alternatives evaluated)\n5. **Recommended Approach** (detailed rationale for your choice)\n6. **Key Assumptions** (what must be true for this to work)\n7. **Risks & Mitigations** (honest assessment of what could go wrong)\n8. **Resource Requirements** (what it will cost in money, time, and people)\n9. **Success Metrics** (how will you know if it worked)\n10. **Decision & Next Steps** (what you're asking leaders to decide and commit to)\n\nWrite in clear prose, not bullet points. Memos should be readable in 5 minutes.	t	90	0	2026-03-19 22:53:05.978	2026-03-19 22:53:05.978
cmmy2g6rg002vilvjivgjyodb	\N	All-Hands Meeting Presentation Script	Write a compelling all-hands script that informs, motivates, and connects the team.	internal-communications	executive	intermediate	{"type": "object", "required": ["period", "companyHighlights", "challengesToAddress", "lookAhead", "closingMessage"], "properties": {"period": {"type": "string", "title": "Period Covered", "x-placeholder": "e.g. Q1 2026"}, "lookAhead": {"type": "string", "title": "Look Ahead", "x-field-type": "textarea", "x-placeholder": "What's coming up — priorities, initiatives, decisions"}, "closingMessage": {"type": "string", "title": "Closing Theme / Message", "x-placeholder": "The one thing you want people to leave feeling"}, "companyHighlights": {"type": "string", "title": "Company Highlights", "x-field-type": "textarea", "x-placeholder": "Key wins, milestones, and achievements to celebrate"}, "challengesToAddress": {"type": "string", "title": "Challenges to Address Honestly", "x-field-type": "textarea", "x-placeholder": "Things that are hard, slow, or not going to plan"}}}	Write an all-hands meeting presentation script.\n\nPeriod: {{period}}\n\nHighlights to Cover:\n{{companyHighlights}}\n\nChallenges to Address:\n{{challengesToAddress}}\n\nLook Ahead:\n{{lookAhead}}\n\nClosing Message: {{closingMessage}}\n\nScript structure (with timing guidance):\n1. **Opening** (2 min — warm, human opener that doesn't start with a slide)\n2. **The Headline** (1 min — what is the essential story of this period in one sentence)\n3. **Wins to Celebrate** (5 min — specific, named, team-level achievements)\n4. **Honest Update on Challenges** (3 min — transparency builds trust; here's what's hard and what we're doing about it)\n5. **Strategic Context** (3 min — why what we're doing matters; connect team work to company mission)\n6. **Looking Ahead** (3 min — priorities, what to focus on, decisions that have been made)\n7. **Recognition** (2 min — call out specific people or teams)\n8. **Closing** (1 min — energising, human close aligned to {{closingMessage}})\n\nWrite as spoken word — natural, not stiff. The CEO should sound like a person, not a press release. Include [PAUSE] and [EMPHASIS] cues.	t	75	0	2026-03-19 22:53:05.98	2026-03-19 22:53:05.98
cmmy2g6pj000tilvjqj77xone	\N	Account Expansion Email	Craft a compelling upsell/cross-sell email to an existing customer.	account-management	sales	intermediate	{"type": "object", "required": ["customerName", "currentProduct", "expansionOpportunity", "businessCase"], "properties": {"businessCase": {"type": "string", "title": "Business Case for Them", "x-field-type": "textarea", "x-placeholder": "Why this is valuable for them specifically"}, "customerName": {"type": "string", "title": "Customer Name / Contact", "x-placeholder": "e.g. Klaus at Bosch"}, "currentProduct": {"type": "string", "title": "Current Product / Plan", "x-placeholder": "What they already use"}, "successHighlight": {"type": "string", "title": "Their Recent Success (optional)", "x-placeholder": "Something positive you can reference about their usage"}, "expansionOpportunity": {"type": "string", "title": "Expansion Opportunity", "x-placeholder": "What you want to introduce them to"}}}	Write an expansion email to an existing customer.\n\nCustomer: {{customerName}}\nCurrently using: {{currentProduct}}\nExpansion opportunity: {{expansionOpportunity}}\nBusiness case: {{businessCase}}\n{{#if successHighlight}}Recent success to reference: {{successHighlight}}{{/if}}\n\nRequirements:\n- Lead with their success/value they're already getting\n- Introduce the expansion opportunity as a logical next step\n- Make the business case specific to them\n- Include a soft, consultative CTA\n- Keep it under 180 words\n- Tone: warm, trusted advisor — not a sales pitch\n\nOutput subject line and body.	t	25	1	2026-03-19 22:53:05.911	2026-03-19 22:55:35.567
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."Tenant" (id, "clerkOrgId", slug, name, plan, "whiteLabelConfig", settings, "createdAt", "updatedAt") FROM stdin;
cmmy2g6oc0000ilvjeq4tqvxt	org_demo_placeholder	demo	Demo Company	TRIAL	null	{}	2026-03-19 22:53:05.869	2026-03-19 22:53:05.869
\.


--
-- Data for Name: TenantChatSettings; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."TenantChatSettings" (id, "tenantId", "systemPrompt", "welcomeMessage", "launcherLabel", "logoUrl", "brandColor", "accentColor", "widgetTitle", "allowedOrigins", "createdAt", "updatedAt", "translationEnabled", "supportedLanguages", "defaultLanguage") FROM stdin;
cmmy2g6oo0003ilvjauywu7cg	cmmy2g6oc0000ilvjeq4tqvxt	You are Wren, an AI assistant built into the Wren platform. You help users of Demo Company with their work.\n\nThe Wren platform provides:\n- **Prompt Library**: 200+ ready-made AI templates for emails, reports, analysis, and more\n- **Knowledge Base**: Upload company documents and ask questions about them using AI\n- **Chat**: Multi-turn conversations with AI, with access to your company knowledge base\n- **Workflows**: Automate tasks using AI-powered workflows\n\nWhen users ask what you can help with, describe these capabilities. When they ask how to get started, guide them to the Prompt Library or Knowledge Base. Always be helpful, professional and concise.	\N	Chat with us	\N	#0F172A	#22C55E	Wren Assistant	\N	2026-03-19 22:53:05.88	2026-03-20 02:26:16.582	t	{}	cs
\.


--
-- Data for Name: TenantUser; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."TenantUser" (id, "tenantId", "clerkUserId", role, department, "createdAt", "updatedAt") FROM stdin;
cmmy2g6oh0002ilvjwoc119q1	cmmy2g6oc0000ilvjeq4tqvxt	user_...	TENANT_ADMIN	\N	2026-03-19 22:53:05.874	2026-03-19 22:53:05.874
\.


--
-- Data for Name: Workflow; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public."Workflow" (id, "tenantId", "n8nId", name, description, category, "isActive", "runCount", "lastRunAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: wren
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
597e605c-02c2-4480-a983-c70f991cd7f4	84e889b2028afa1468185f797f7c5e6b03e74a8e4656acb1a1a2e563a5b0b409	2026-03-19 23:35:48.955103+00	20260315000001_sprint2_knowledge_base	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260315000001_sprint2_knowledge_base\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: relation "Tenant" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "relation \\"Tenant\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("namespace.c"), line: Some(434), routine: Some("RangeVarGetRelidExtended") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260315000001_sprint2_knowledge_base"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260315000001_sprint2_knowledge_base"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	\N	2026-03-19 22:51:48.535346+00	1
be589b88-6a21-4fae-9519-999fd175c5da	manually-resolved	2026-03-19 23:35:48.955103+00	20260317000001_sprint3_chat_interface	\N	\N	2026-03-19 23:35:48.955103+00	1
440e6192-a62b-449f-ba5b-69a7d9936238	sprint4-translation-fields	2026-03-19 23:36:07.418624+00	20260320000001_sprint4_translation_fields	\N	\N	2026-03-19 23:36:07.418624+00	1
\.


--
-- Name: Agent Agent_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: ChannelConfig ChannelConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ChannelConfig"
    ADD CONSTRAINT "ChannelConfig_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: ChatSession ChatSession_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ChatSession"
    ADD CONSTRAINT "ChatSession_pkey" PRIMARY KEY (id);


--
-- Name: ConversationDocument ConversationDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ConversationDocument"
    ADD CONSTRAINT "ConversationDocument_pkey" PRIMARY KEY (id);


--
-- Name: Conversation Conversation_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_pkey" PRIMARY KEY (id);


--
-- Name: KbChunk KbChunk_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KbChunk"
    ADD CONSTRAINT "KbChunk_pkey" PRIMARY KEY (id);


--
-- Name: KbCollection KbCollection_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KbCollection"
    ADD CONSTRAINT "KbCollection_pkey" PRIMARY KEY (id);


--
-- Name: KbDocument KbDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KbDocument"
    ADD CONSTRAINT "KbDocument_pkey" PRIMARY KEY (id);


--
-- Name: KnowledgeBase KnowledgeBase_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KnowledgeBase"
    ADD CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: Prompt Prompt_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Prompt"
    ADD CONSTRAINT "Prompt_pkey" PRIMARY KEY (id);


--
-- Name: TenantChatSettings TenantChatSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."TenantChatSettings"
    ADD CONSTRAINT "TenantChatSettings_pkey" PRIMARY KEY (id);


--
-- Name: TenantUser TenantUser_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."TenantUser"
    ADD CONSTRAINT "TenantUser_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: Workflow Workflow_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Workflow"
    ADD CONSTRAINT "Workflow_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Agent_tenantId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "Agent_tenantId_idx" ON public."Agent" USING btree ("tenantId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_tenantId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "AuditLog_tenantId_idx" ON public."AuditLog" USING btree ("tenantId");


--
-- Name: ChannelConfig_tenantId_channel_key; Type: INDEX; Schema: public; Owner: wren
--

CREATE UNIQUE INDEX "ChannelConfig_tenantId_channel_key" ON public."ChannelConfig" USING btree ("tenantId", channel);


--
-- Name: ChannelConfig_tenantId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "ChannelConfig_tenantId_idx" ON public."ChannelConfig" USING btree ("tenantId");


--
-- Name: ChatMessage_sessionId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "ChatMessage_sessionId_idx" ON public."ChatMessage" USING btree ("sessionId");


--
-- Name: ChatMessage_tenantId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "ChatMessage_tenantId_idx" ON public."ChatMessage" USING btree ("tenantId");


--
-- Name: ChatSession_tenantId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "ChatSession_tenantId_idx" ON public."ChatSession" USING btree ("tenantId");


--
-- Name: ChatSession_userId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "ChatSession_userId_idx" ON public."ChatSession" USING btree ("userId");


--
-- Name: ConversationDocument_conversationId_documentId_key; Type: INDEX; Schema: public; Owner: wren
--

CREATE UNIQUE INDEX "ConversationDocument_conversationId_documentId_key" ON public."ConversationDocument" USING btree ("conversationId", "documentId");


--
-- Name: ConversationDocument_documentId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "ConversationDocument_documentId_idx" ON public."ConversationDocument" USING btree ("documentId");


--
-- Name: Conversation_tenantId_channel_createdAt_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "Conversation_tenantId_channel_createdAt_idx" ON public."Conversation" USING btree ("tenantId", channel, "createdAt");


--
-- Name: Conversation_tenantId_userId_lastMessageAt_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "Conversation_tenantId_userId_lastMessageAt_idx" ON public."Conversation" USING btree ("tenantId", "userId", "lastMessageAt");


--
-- Name: KbChunk_documentId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "KbChunk_documentId_idx" ON public."KbChunk" USING btree ("documentId");


--
-- Name: KbCollection_knowledgeBaseId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "KbCollection_knowledgeBaseId_idx" ON public."KbCollection" USING btree ("knowledgeBaseId");


--
-- Name: KbDocument_collectionId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "KbDocument_collectionId_idx" ON public."KbDocument" USING btree ("collectionId");


--
-- Name: KbDocument_knowledgeBaseId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "KbDocument_knowledgeBaseId_idx" ON public."KbDocument" USING btree ("knowledgeBaseId");


--
-- Name: KnowledgeBase_tenantId_key; Type: INDEX; Schema: public; Owner: wren
--

CREATE UNIQUE INDEX "KnowledgeBase_tenantId_key" ON public."KnowledgeBase" USING btree ("tenantId");


--
-- Name: Message_conversationId_createdAt_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "Message_conversationId_createdAt_idx" ON public."Message" USING btree ("conversationId", "createdAt");


--
-- Name: Prompt_department_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "Prompt_department_idx" ON public."Prompt" USING btree (department);


--
-- Name: Prompt_tenantId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "Prompt_tenantId_idx" ON public."Prompt" USING btree ("tenantId");


--
-- Name: TenantChatSettings_tenantId_key; Type: INDEX; Schema: public; Owner: wren
--

CREATE UNIQUE INDEX "TenantChatSettings_tenantId_key" ON public."TenantChatSettings" USING btree ("tenantId");


--
-- Name: TenantUser_tenantId_clerkUserId_key; Type: INDEX; Schema: public; Owner: wren
--

CREATE UNIQUE INDEX "TenantUser_tenantId_clerkUserId_key" ON public."TenantUser" USING btree ("tenantId", "clerkUserId");


--
-- Name: TenantUser_tenantId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "TenantUser_tenantId_idx" ON public."TenantUser" USING btree ("tenantId");


--
-- Name: Tenant_clerkOrgId_key; Type: INDEX; Schema: public; Owner: wren
--

CREATE UNIQUE INDEX "Tenant_clerkOrgId_key" ON public."Tenant" USING btree ("clerkOrgId");


--
-- Name: Tenant_slug_key; Type: INDEX; Schema: public; Owner: wren
--

CREATE UNIQUE INDEX "Tenant_slug_key" ON public."Tenant" USING btree (slug);


--
-- Name: Workflow_tenantId_idx; Type: INDEX; Schema: public; Owner: wren
--

CREATE INDEX "Workflow_tenantId_idx" ON public."Workflow" USING btree ("tenantId");


--
-- Name: Agent Agent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChannelConfig ChannelConfig_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ChannelConfig"
    ADD CONSTRAINT "ChannelConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."ChatSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatSession ChatSession_agentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ChatSession"
    ADD CONSTRAINT "ChatSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ChatSession ChatSession_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ChatSession"
    ADD CONSTRAINT "ChatSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConversationDocument ConversationDocument_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ConversationDocument"
    ADD CONSTRAINT "ConversationDocument_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConversationDocument ConversationDocument_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."ConversationDocument"
    ADD CONSTRAINT "ConversationDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."KbDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KbChunk KbChunk_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KbChunk"
    ADD CONSTRAINT "KbChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."KbDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KbCollection KbCollection_knowledgeBaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KbCollection"
    ADD CONSTRAINT "KbCollection_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES public."KnowledgeBase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KbCollection KbCollection_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KbCollection"
    ADD CONSTRAINT "KbCollection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."KbCollection"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: KbDocument KbDocument_collectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KbDocument"
    ADD CONSTRAINT "KbDocument_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES public."KbCollection"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: KbDocument KbDocument_knowledgeBaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KbDocument"
    ADD CONSTRAINT "KbDocument_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES public."KnowledgeBase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KnowledgeBase KnowledgeBase_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."KnowledgeBase"
    ADD CONSTRAINT "KnowledgeBase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Prompt Prompt_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Prompt"
    ADD CONSTRAINT "Prompt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TenantUser TenantUser_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."TenantUser"
    ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Workflow Workflow_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wren
--

ALTER TABLE ONLY public."Workflow"
    ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict c4sjh1QOlWbpCFGrISD6FeBFP9D5AwpUXbvbBnPcLoUvXC9Q0miy41WMTMcmgqI

