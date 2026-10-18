--
-- PostgreSQL database dump
--

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: kb_articles_search_vector_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kb_articles_search_vector_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.question, '')), 'A') ||
          setweight(to_tsvector('simple', array_to_string(coalesce(NEW.keywords, '{}'::text[]), ' ')), 'B') ||
          setweight(to_tsvector('simple', coalesce(NEW.answer, '')), 'C');
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.kb_articles_search_vector_update() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    user_name character varying(150),
    lead_name character varying(150),
    "timestamp" timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    user_initials character varying(10),
    action character varying(150),
    lead_id character varying(100),
    detail text,
    time_block character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: ai_agent_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_agent_settings (
    id integer DEFAULT 1 NOT NULL,
    master_enabled boolean DEFAULT true,
    bot_name character varying(100) DEFAULT 'Aria'::character varying,
    persona text DEFAULT 'Senior Sales Consultant'::text,
    tone character varying(50) DEFAULT 'professional'::character varying,
    language character varying(50) DEFAULT 'en-IN'::character varying,
    sources jsonb DEFAULT '[]'::jsonb,
    config jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_agent_settings OWNER TO postgres;

--
-- Name: ai_bot_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_bot_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bot_name character varying(100) DEFAULT 'AI Assistant'::character varying,
    tone character varying(50) DEFAULT 'Professional'::character varying,
    system_prompt text,
    auto_reply_enabled boolean DEFAULT true,
    transfer_to_human boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_bot_settings OWNER TO postgres;

--
-- Name: assignment_rules_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_rules_config (
    id integer DEFAULT 1 NOT NULL,
    method character varying(50) DEFAULT 'round_robin'::character varying,
    rules jsonb DEFAULT '[]'::jsonb,
    escalation_rules jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.assignment_rules_config OWNER TO postgres;

--
-- Name: bot_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bot_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    turn_count integer DEFAULT 0 NOT NULL,
    collected_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_user_message_at timestamp with time zone,
    handed_off_at timestamp with time zone,
    handoff_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_bot_conv_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'handed_off'::character varying, 'paused'::character varying, 'closed'::character varying])::text[])))
);


ALTER TABLE public.bot_conversations OWNER TO postgres;

--
-- Name: bot_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bot_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    lead_id uuid,
    direction character varying(20) NOT NULL,
    sender character varying(20) NOT NULL,
    message_type character varying(20) DEFAULT 'text'::character varying NOT NULL,
    content text,
    wa_message_id character varying(255),
    tokens_used integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_bot_msg_dir CHECK (((direction)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[]))),
    CONSTRAINT chk_bot_msg_sender CHECK (((sender)::text = ANY ((ARRAY['bot'::character varying, 'lead'::character varying, 'agent'::character varying])::text[]))),
    CONSTRAINT chk_bot_msg_type CHECK (((message_type)::text = ANY ((ARRAY['template'::character varying, 'text'::character varying])::text[])))
);


ALTER TABLE public.bot_messages OWNER TO postgres;

--
-- Name: bot_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bot_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    display_name character varying(100) DEFAULT 'Aria'::character varying NOT NULL,
    persona text DEFAULT 'Senior Sales Consultant'::text NOT NULL,
    avatar_url text,
    communication_style character varying(50) DEFAULT 'professional'::character varying NOT NULL,
    primary_language character varying(20) DEFAULT 'en'::character varying NOT NULL,
    greeting_template_name character varying(100) DEFAULT 'sales_bot_greeting'::character varying,
    active_sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    qualification_questions jsonb DEFAULT '[{"id": "requirement", "question": "What kind of property or service are you looking for?", "required": true}, {"id": "budget", "question": "What is your preferred budget range?", "required": true}, {"id": "location", "question": "What is your preferred location?", "required": true}, {"id": "timeline", "question": "When are you planning to make a decision?", "required": false}]'::jsonb NOT NULL,
    handoff_keywords jsonb DEFAULT '["human", "agent", "executive", "representative", "call me", "talk to human", "manager", "connect"]'::jsonb NOT NULL,
    max_bot_turns integer DEFAULT 8 NOT NULL,
    working_hours jsonb DEFAULT '{"end": "19:00", "days": [1, 2, 3, 4, 5, 6], "start": "09:00", "enabled": false, "timezone": "Asia/Kolkata"}'::jsonb NOT NULL,
    out_of_hours_message text DEFAULT 'Thank you for reaching out! Our team is currently offline. We have received your inquiry and our sales expert will connect with you during our working hours (9 AM - 7 PM).'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_bot_comm_style CHECK (((communication_style)::text = ANY ((ARRAY['friendly'::character varying, 'professional'::character varying, 'enthusiastic'::character varying, 'concise'::character varying])::text[]))),
    CONSTRAINT chk_bot_primary_lang CHECK (((primary_language)::text = ANY ((ARRAY['en'::character varying, 'hi'::character varying, 'hinglish'::character varying])::text[])))
);


ALTER TABLE public.bot_settings OWNER TO postgres;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    city character varying(100),
    state character varying(100),
    address text,
    phone character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: calls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_name character varying(150) NOT NULL,
    phone character varying(50) NOT NULL,
    direction character varying(20) DEFAULT 'outbound'::character varying,
    duration character varying(20) DEFAULT '00:00'::character varying,
    status character varying(50) DEFAULT 'Completed'::character varying,
    outcome character varying(100) DEFAULT 'Connected'::character varying,
    recording_url text,
    notes text,
    user_id uuid,
    lead_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    agent character varying(150),
    purpose character varying(100) DEFAULT 'Follow-up'::character varying,
    duration_seconds integer DEFAULT 0
);


ALTER TABLE public.calls OWNER TO postgres;

--
-- Name: campaign_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    total_sent integer DEFAULT 0,
    delivered integer DEFAULT 0,
    opened integer DEFAULT 0,
    clicked integer DEFAULT 0,
    unsubscribed integer DEFAULT 0,
    bounced integer DEFAULT 0,
    cost numeric(12,2) DEFAULT 0.00,
    revenue numeric(12,2) DEFAULT 0.00
);


ALTER TABLE public.campaign_results OWNER TO postgres;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    type character varying(50) DEFAULT 'Email'::character varying,
    channel character varying(50) DEFAULT 'Email'::character varying,
    status character varying(50) DEFAULT 'Draft'::character varying,
    target_audience character varying(100) DEFAULT 'All Leads'::character varying,
    leads_count integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    open_rate numeric(5,2) DEFAULT 0.00,
    click_rate numeric(5,2) DEFAULT 0.00,
    conversion_rate numeric(5,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now(),
    scheduled_at timestamp with time zone
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: custom_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label character varying(100) NOT NULL,
    type character varying(50) DEFAULT 'Text Input'::character varying NOT NULL,
    required boolean DEFAULT false NOT NULL,
    show_in_list boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    category character varying(20) DEFAULT 'lead'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_fields_category_check CHECK (((category)::text = ANY ((ARRAY['lead'::character varying, 'company'::character varying])::text[])))
);


ALTER TABLE public.custom_fields OWNER TO postgres;

--
-- Name: custom_industry_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_industry_templates (
    id character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    icon character varying(100) DEFAULT 'ri-building-line'::character varying,
    icon_bg character varying(100) DEFAULT 'bg-indigo-100'::character varying,
    icon_color character varying(100) DEFAULT 'text-indigo-600'::character varying,
    stages integer DEFAULT 0,
    fields integer DEFAULT 0,
    pipeline text,
    is_active boolean DEFAULT false,
    stage_list jsonb DEFAULT '[]'::jsonb,
    field_list jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.custom_industry_templates OWNER TO postgres;

--
-- Name: industry_active_selection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.industry_active_selection (
    id smallint DEFAULT 1 NOT NULL,
    selection_type character varying(20) DEFAULT 'builtin'::character varying NOT NULL,
    selection_key character varying(100) DEFAULT 'real-estate'::character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT single_row CHECK ((id = 1))
);


ALTER TABLE public.industry_active_selection OWNER TO postgres;

--
-- Name: industry_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.industry_templates (
    id character varying(100) DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    icon character varying(100) DEFAULT 'ri-building-4-line'::character varying NOT NULL,
    icon_bg character varying(50) DEFAULT 'bg-indigo-100'::character varying NOT NULL,
    icon_color character varying(50) DEFAULT 'text-indigo-600'::character varying NOT NULL,
    pipeline_summary character varying(500),
    stages jsonb DEFAULT '[]'::jsonb NOT NULL,
    fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    inventory_fields jsonb DEFAULT '[]'::jsonb,
    is_custom boolean DEFAULT false
);


ALTER TABLE public.industry_templates OWNER TO postgres;

--
-- Name: integration_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying(100) DEFAULT 'default'::character varying,
    provider character varying(30) NOT NULL,
    account_name character varying(150) NOT NULL,
    webhook_key character varying(64) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    allowed_domains text[] DEFAULT '{}'::text[],
    last_received_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.integration_accounts OWNER TO postgres;

--
-- Name: integrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    name character varying(150) NOT NULL,
    category character varying(100),
    status character varying(50) DEFAULT 'Disconnected'::character varying,
    icon character varying(100),
    description text,
    config jsonb DEFAULT '{}'::jsonb,
    connected_at timestamp with time zone
);


ALTER TABLE public.integrations OWNER TO postgres;

--
-- Name: inventory_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label character varying(200) NOT NULL,
    field_key character varying(100) NOT NULL,
    type character varying(100) DEFAULT 'Text Input'::character varying,
    required boolean DEFAULT false,
    show_in_list boolean DEFAULT true,
    show_in_form boolean DEFAULT true,
    active boolean DEFAULT true,
    options jsonb DEFAULT '[]'::jsonb,
    sort_order bigint DEFAULT 1,
    placeholder character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inventory_fields OWNER TO postgres;

--
-- Name: inventory_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_fields_id_seq OWNER TO postgres;

--
-- Name: inventory_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_fields_id_seq OWNED BY public.inventory_fields.id;


--
-- Name: kb_articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kb_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    category_id uuid,
    project_id uuid,
    type character varying(50) DEFAULT 'faq'::character varying NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    keywords text[] DEFAULT '{}'::text[] NOT NULL,
    language character varying(20) DEFAULT 'en'::character varying NOT NULL,
    status character varying(20) DEFAULT 'published'::character varying NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp with time zone,
    is_auto_generated boolean DEFAULT false NOT NULL,
    created_by uuid,
    search_vector tsvector,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_kb_article_language CHECK (((language)::text = ANY ((ARRAY['en'::character varying, 'hi'::character varying, 'hinglish'::character varying])::text[]))),
    CONSTRAINT chk_kb_article_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::text[]))),
    CONSTRAINT chk_kb_article_type CHECK (((type)::text = ANY ((ARRAY['faq'::character varying, 'product_info'::character varying, 'policy'::character varying, 'pricing'::character varying, 'objection_handling'::character varying])::text[])))
);


ALTER TABLE public.kb_articles OWNER TO postgres;

--
-- Name: kb_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kb_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.kb_categories OWNER TO postgres;

--
-- Name: kb_unanswered; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kb_unanswered (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    lead_id uuid,
    question_text text NOT NULL,
    bot_conversation_id uuid,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    resolved_article_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_kb_unanswered_status CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'resolved'::character varying, 'ignored'::character varying])::text[])))
);


ALTER TABLE public.kb_unanswered OWNER TO postgres;

--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(250) NOT NULL,
    category character varying(100) DEFAULT 'General'::character varying,
    content text NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    status character varying(50) DEFAULT 'Published'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.knowledge_base OWNER TO postgres;

--
-- Name: knowledge_base_articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_base_articles (
    id character varying(100) NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100) DEFAULT 'FAQ'::character varying,
    active boolean DEFAULT true,
    used_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.knowledge_base_articles OWNER TO postgres;

--
-- Name: lead_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_activities (
    id integer NOT NULL,
    type character varying(50) DEFAULT 'note'::character varying NOT NULL,
    description text NOT NULL,
    performed_by character varying(255) DEFAULT NULL::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    activity_date date,
    activity_time character varying(50),
    scheduled_at timestamp with time zone,
    lead_id uuid
);


ALTER TABLE public.lead_activities OWNER TO postgres;

--
-- Name: lead_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_activities_id_seq OWNER TO postgres;

--
-- Name: lead_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_activities_id_seq OWNED BY public.lead_activities.id;


--
-- Name: lead_capture_forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_capture_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    fields jsonb DEFAULT '[]'::jsonb,
    submissions_count integer DEFAULT 0,
    status character varying(50) DEFAULT 'Active'::character varying,
    redirect_url text,
    created_at timestamp with time zone DEFAULT now(),
    submit_button_text character varying(100) DEFAULT 'Submit Inquiry'::character varying,
    success_message text DEFAULT 'Thank you! We''ll contact you shortly.'::text,
    privacy_policy_checkbox boolean DEFAULT true,
    project_id uuid
);


ALTER TABLE public.lead_capture_forms OWNER TO postgres;

--
-- Name: lead_capture_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_capture_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid,
    form_title character varying(200),
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(50) DEFAULT 'New'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lead_capture_submissions OWNER TO postgres;

--
-- Name: lead_scoring_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_scoring_config (
    id integer DEFAULT 1 NOT NULL,
    method character varying(50) DEFAULT 'automatic'::character varying,
    factors jsonb DEFAULT '[]'::jsonb,
    thresholds jsonb DEFAULT '[]'::jsonb,
    actions jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lead_scoring_config OWNER TO postgres;

--
-- Name: lead_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(20) DEFAULT '#64748b'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    priority character varying(10) DEFAULT 'Low'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT lead_sources_priority_check CHECK (((priority)::text = ANY ((ARRAY['High'::character varying, 'Medium'::character varying, 'Low'::character varying])::text[])))
);


ALTER TABLE public.lead_sources OWNER TO postgres;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    name character varying(255) NOT NULL,
    company character varying(255) DEFAULT ''::character varying,
    phone character varying(50) DEFAULT ''::character varying,
    email character varying(255) DEFAULT ''::character varying,
    source character varying(50) DEFAULT 'Manual'::character varying NOT NULL,
    stage character varying(50) DEFAULT 'New Inquiry'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'Medium'::character varying NOT NULL,
    assigned character varying(255) DEFAULT NULL::character varying,
    industry character varying(100) DEFAULT NULL::character varying,
    value character varying(50) DEFAULT '₹0'::character varying,
    score integer DEFAULT 50 NOT NULL,
    score_factors jsonb DEFAULT '[]'::jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    notes text,
    last_activity timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    project_id character varying(100),
    custom_fields jsonb DEFAULT '{}'::jsonb,
    extra_fields jsonb DEFAULT '{}'::jsonb,
    meta jsonb DEFAULT '{}'::jsonb,
    company_id character varying(100) DEFAULT 'default'::character varying,
    next_activity_at timestamp with time zone,
    scheduled_activity_type character varying(100),
    scheduled_activity_note text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT leads_score_check CHECK (((score >= 0) AND (score <= 100)))
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) DEFAULT 'general'::character varying,
    title character varying(255) NOT NULL,
    description text,
    lead_name character varying(150),
    read boolean DEFAULT false,
    scheduled_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    lead_id uuid,
    activity_id character varying(100)
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: pipeline_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pipeline_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(20) DEFAULT '#64748b'::character varying NOT NULL,
    required boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pipeline_stages OWNER TO postgres;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    level smallint DEFAULT 1 NOT NULL,
    reports_to character varying(100),
    color character varying(9) DEFAULT '#4f46e5'::character varying NOT NULL,
    data_access character varying(20) DEFAULT 'own'::character varying NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT positions_color_check CHECK (((color)::text ~* '^#[0-9a-f]{6}([0-9a-f]{2})?$'::text)),
    CONSTRAINT positions_data_access_check CHECK (((data_access)::text = ANY ((ARRAY['all'::character varying, 'region'::character varying, 'team'::character varying, 'own_team'::character varying, 'own'::character varying, 'view'::character varying])::text[]))),
    CONSTRAINT positions_level_check CHECK (((level >= 1) AND (level <= 10)))
);


ALTER TABLE public.positions OWNER TO postgres;

--
-- Name: project_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.project_inventory OWNER TO postgres;

--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    title character varying(200) NOT NULL,
    status character varying(50) DEFAULT 'To Do'::character varying,
    priority character varying(50) DEFAULT 'Medium'::character varying,
    assigned_to character varying(150),
    due_date date
);


ALTER TABLE public.project_tasks OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    client_name character varying(200),
    lead_id uuid,
    status character varying(50) DEFAULT 'Planning'::character varying,
    progress integer DEFAULT 0,
    budget numeric(12,2) DEFAULT 0.00,
    spent numeric(12,2) DEFAULT 0.00,
    start_date date,
    due_date date,
    team_members jsonb DEFAULT '[]'::jsonb,
    tasks_count integer DEFAULT 0,
    completed_tasks integer DEFAULT 0,
    category character varying(100) DEFAULT 'properties'::character varying,
    selling_type_id uuid,
    color character varying(50) DEFAULT 'indigo'::character varying,
    description text,
    leads integer DEFAULT 0,
    interested integer DEFAULT 0,
    booked integer DEFAULT 0,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    documents jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: quotation_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotation_templates (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text DEFAULT ''::text,
    created_by character varying(150) DEFAULT 'Admin'::character varying,
    items jsonb DEFAULT '[]'::jsonb,
    item_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quotation_templates OWNER TO postgres;

--
-- Name: quotation_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quotation_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quotation_templates_id_seq OWNER TO postgres;

--
-- Name: quotation_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quotation_templates_id_seq OWNED BY public.quotation_templates.id;


--
-- Name: quotations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_number character varying(100) NOT NULL,
    client_name character varying(200) NOT NULL,
    client_email character varying(200),
    total_amount numeric(12,2) DEFAULT 0.00,
    discount numeric(12,2) DEFAULT 0.00,
    tax numeric(12,2) DEFAULT 0.00,
    status character varying(50) DEFAULT 'Draft'::character varying,
    valid_until date,
    created_at timestamp with time zone DEFAULT now(),
    items jsonb DEFAULT '[]'::jsonb,
    lead_id character varying(100),
    client_company character varying(200),
    client_phone character varying(100),
    agent character varying(150),
    terms text DEFAULT ''::text,
    quote_date date DEFAULT CURRENT_DATE,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quotations OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    company_id uuid,
    permissions jsonb DEFAULT '[]'::jsonb,
    additional_controls jsonb DEFAULT '{}'::jsonb,
    is_system_role boolean DEFAULT false,
    created_by uuid
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: scheduled_calls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scheduled_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_name character varying(150) NOT NULL,
    company character varying(150),
    phone character varying(50) NOT NULL,
    scheduled_time timestamp with time zone NOT NULL,
    purpose character varying(100) DEFAULT 'Follow-up'::character varying,
    agent character varying(150),
    notes text,
    status character varying(50) DEFAULT 'Scheduled'::character varying,
    lead_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scheduled_calls OWNER TO postgres;

--
-- Name: selling_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.selling_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    color character varying(50) DEFAULT 'indigo'::character varying,
    inventory_field_ids jsonb DEFAULT '[]'::jsonb,
    track_inventory boolean DEFAULT true,
    item_label character varying(100) DEFAULT 'Unit'::character varying,
    identifier_field character varying(100) DEFAULT 'Unit Number'::character varying,
    available_status character varying(100) DEFAULT 'Available'::character varying,
    sold_status character varying(100) DEFAULT 'Sold'::character varying,
    progress_label character varying(100) DEFAULT 'Units sold'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.selling_types OWNER TO postgres;

--
-- Name: stage_extra_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stage_extra_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_id uuid NOT NULL,
    label character varying(100) NOT NULL,
    type character varying(50) DEFAULT 'Text Input'::character varying NOT NULL,
    required boolean DEFAULT false NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stage_extra_fields OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    leader_id uuid,
    leader_name character varying(150),
    member_ids jsonb DEFAULT '[]'::jsonb,
    member_names jsonb DEFAULT '[]'::jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    additional_controls jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    user_id uuid
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permissions_id_seq OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(20),
    password_hash text NOT NULL,
    role character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    last_login_at timestamp without time zone,
    company_id integer,
    reset_token character varying(255) DEFAULT NULL::character varying,
    reset_token_expiry timestamp without time zone,
    "isActive" boolean DEFAULT true,
    branch text,
    id uuid DEFAULT gen_random_uuid() CONSTRAINT users_id_uuid_not_null NOT NULL,
    created_by uuid,
    branch_id uuid,
    manager_id uuid,
    team character varying(150)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: whatsapp_chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_name character varying(150) NOT NULL,
    phone character varying(50) NOT NULL,
    avatar text,
    unread_count integer DEFAULT 0,
    last_message text,
    last_message_time timestamp with time zone DEFAULT now(),
    channel character varying(50) DEFAULT 'WhatsApp'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    assigned_agent character varying(150),
    assigned_agent_id character varying(100),
    stage character varying(100) DEFAULT 'New Inquiry'::character varying,
    lead_id character varying(100),
    deal_value character varying(100) DEFAULT '₹0'::character varying,
    assignment_history jsonb DEFAULT '[]'::jsonb,
    reassign_reason text,
    reassigned_from character varying(150),
    tags jsonb DEFAULT '[]'::jsonb,
    custom_fields jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.whatsapp_chats OWNER TO postgres;

--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid,
    text text NOT NULL,
    sender character varying(20) DEFAULT 'me'::character varying,
    "timestamp" timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'sent'::character varying,
    media_url text,
    media_type character varying(50),
    read boolean DEFAULT true,
    sender_name character varying(150),
    wamid text
);


ALTER TABLE public.whatsapp_messages OWNER TO postgres;

--
-- Name: whatsapp_quick_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_quick_replies (
    id integer NOT NULL,
    shortcut character varying(100) NOT NULL,
    title character varying(150) NOT NULL,
    message text NOT NULL,
    category character varying(100) DEFAULT 'General'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_quick_replies OWNER TO postgres;

--
-- Name: whatsapp_quick_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.whatsapp_quick_replies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_quick_replies_id_seq OWNER TO postgres;

--
-- Name: whatsapp_quick_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.whatsapp_quick_replies_id_seq OWNED BY public.whatsapp_quick_replies.id;


--
-- Name: whatsapp_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_templates (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    category character varying(100) DEFAULT 'Marketing'::character varying,
    language character varying(50) DEFAULT 'en'::character varying,
    status character varying(50) DEFAULT 'Approved'::character varying,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_templates OWNER TO postgres;

--
-- Name: whatsapp_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.whatsapp_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_templates_id_seq OWNER TO postgres;

--
-- Name: whatsapp_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.whatsapp_templates_id_seq OWNED BY public.whatsapp_templates.id;


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    trigger_type character varying(100),
    actions jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    last_run timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Name: lead_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_activities ALTER COLUMN id SET DEFAULT nextval('public.lead_activities_id_seq'::regclass);


--
-- Name: quotation_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_templates ALTER COLUMN id SET DEFAULT nextval('public.quotation_templates_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: whatsapp_quick_replies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_quick_replies ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_quick_replies_id_seq'::regclass);


--
-- Name: whatsapp_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_templates ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_templates_id_seq'::regclass);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_settings ai_agent_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agent_settings
    ADD CONSTRAINT ai_agent_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_bot_settings ai_bot_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_bot_settings
    ADD CONSTRAINT ai_bot_settings_pkey PRIMARY KEY (id);


--
-- Name: assignment_rules_config assignment_rules_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_rules_config
    ADD CONSTRAINT assignment_rules_config_pkey PRIMARY KEY (id);


--
-- Name: bot_conversations bot_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_conversations
    ADD CONSTRAINT bot_conversations_pkey PRIMARY KEY (id);


--
-- Name: bot_messages bot_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_messages
    ADD CONSTRAINT bot_messages_pkey PRIMARY KEY (id);


--
-- Name: bot_settings bot_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_settings
    ADD CONSTRAINT bot_settings_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: calls calls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_pkey PRIMARY KEY (id);


--
-- Name: campaign_results campaign_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_results
    ADD CONSTRAINT campaign_results_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: custom_fields custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_pkey PRIMARY KEY (id);


--
-- Name: custom_industry_templates custom_industry_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_industry_templates
    ADD CONSTRAINT custom_industry_templates_pkey PRIMARY KEY (id);


--
-- Name: industry_active_selection industry_active_selection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.industry_active_selection
    ADD CONSTRAINT industry_active_selection_pkey PRIMARY KEY (id);


--
-- Name: industry_templates industry_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_pkey PRIMARY KEY (id);


--
-- Name: integration_accounts integration_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_accounts
    ADD CONSTRAINT integration_accounts_pkey PRIMARY KEY (id);


--
-- Name: integration_accounts integration_accounts_webhook_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_accounts
    ADD CONSTRAINT integration_accounts_webhook_key_key UNIQUE (webhook_key);


--
-- Name: integrations integrations_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_key_key UNIQUE (key);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: inventory_fields inventory_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_fields
    ADD CONSTRAINT inventory_fields_pkey PRIMARY KEY (id);


--
-- Name: kb_articles kb_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_pkey PRIMARY KEY (id);


--
-- Name: kb_categories kb_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_categories
    ADD CONSTRAINT kb_categories_pkey PRIMARY KEY (id);


--
-- Name: kb_unanswered kb_unanswered_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_unanswered
    ADD CONSTRAINT kb_unanswered_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_articles knowledge_base_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_articles
    ADD CONSTRAINT knowledge_base_articles_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: lead_capture_forms lead_capture_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_capture_forms
    ADD CONSTRAINT lead_capture_forms_pkey PRIMARY KEY (id);


--
-- Name: lead_capture_submissions lead_capture_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_capture_submissions
    ADD CONSTRAINT lead_capture_submissions_pkey PRIMARY KEY (id);


--
-- Name: lead_scoring_config lead_scoring_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_scoring_config
    ADD CONSTRAINT lead_scoring_config_pkey PRIMARY KEY (id);


--
-- Name: lead_sources lead_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_sources
    ADD CONSTRAINT lead_sources_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pipeline_stages pipeline_stages_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_name_key UNIQUE (name);


--
-- Name: pipeline_stages pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: project_inventory project_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_inventory
    ADD CONSTRAINT project_inventory_pkey PRIMARY KEY (id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: quotation_templates quotation_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_templates
    ADD CONSTRAINT quotation_templates_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_quote_number_key UNIQUE (quote_number);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scheduled_calls scheduled_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_calls
    ADD CONSTRAINT scheduled_calls_pkey PRIMARY KEY (id);


--
-- Name: selling_types selling_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.selling_types
    ADD CONSTRAINT selling_types_pkey PRIMARY KEY (id);


--
-- Name: stage_extra_fields stage_extra_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_extra_fields
    ADD CONSTRAINT stage_extra_fields_pkey PRIMARY KEY (id);


--
-- Name: stage_extra_fields stage_extra_fields_stage_label_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_extra_fields
    ADD CONSTRAINT stage_extra_fields_stage_label_unique UNIQUE (stage_id, label);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: bot_settings uq_bot_settings_company; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_settings
    ADD CONSTRAINT uq_bot_settings_company UNIQUE (company_id);


--
-- Name: kb_categories uq_kb_categories_company_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_categories
    ADD CONSTRAINT uq_kb_categories_company_name UNIQUE (company_id, name);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_chats whatsapp_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_chats
    ADD CONSTRAINT whatsapp_chats_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_quick_replies whatsapp_quick_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_quick_replies
    ADD CONSTRAINT whatsapp_quick_replies_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: idx_bot_conv_comp_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_conv_comp_lead ON public.bot_conversations USING btree (company_id, lead_id);


--
-- Name: idx_bot_conv_comp_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_conv_comp_status ON public.bot_conversations USING btree (company_id, status);


--
-- Name: idx_bot_msg_comp_conv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_msg_comp_conv ON public.bot_messages USING btree (company_id, conversation_id);


--
-- Name: idx_bot_msg_comp_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_msg_comp_lead ON public.bot_messages USING btree (company_id, lead_id);


--
-- Name: idx_bot_msg_wa_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_msg_wa_id ON public.bot_messages USING btree (wa_message_id);


--
-- Name: idx_bot_settings_comp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_settings_comp ON public.bot_settings USING btree (company_id);


--
-- Name: idx_custom_fields_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_fields_active ON public.custom_fields USING btree (active);


--
-- Name: idx_custom_fields_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_fields_category ON public.custom_fields USING btree (category);


--
-- Name: idx_int_acc_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_int_acc_company ON public.integration_accounts USING btree (company_id, provider);


--
-- Name: idx_int_acc_webhook_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_int_acc_webhook_key ON public.integration_accounts USING btree (webhook_key);


--
-- Name: idx_kb_articles_comp_cat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_articles_comp_cat ON public.kb_articles USING btree (company_id, category_id);


--
-- Name: idx_kb_articles_comp_proj; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_articles_comp_proj ON public.kb_articles USING btree (company_id, project_id);


--
-- Name: idx_kb_articles_comp_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_articles_comp_status ON public.kb_articles USING btree (company_id, status);


--
-- Name: idx_kb_articles_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_articles_priority ON public.kb_articles USING btree (company_id, priority DESC);


--
-- Name: idx_kb_articles_search_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_articles_search_vector ON public.kb_articles USING gin (search_vector);


--
-- Name: idx_kb_categories_comp_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_categories_comp_sort ON public.kb_categories USING btree (company_id, sort_order);


--
-- Name: idx_kb_unanswered_comp_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_unanswered_comp_lead ON public.kb_unanswered USING btree (company_id, lead_id);


--
-- Name: idx_kb_unanswered_comp_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_unanswered_comp_status ON public.kb_unanswered USING btree (company_id, status);


--
-- Name: idx_lead_sources_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_sources_sort ON public.lead_sources USING btree (sort_order);


--
-- Name: idx_leads_assigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_assigned ON public.leads USING btree (assigned);


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_created_at ON public.leads USING btree (created_at);


--
-- Name: idx_leads_industry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_industry ON public.leads USING btree (industry);


--
-- Name: idx_leads_last_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_last_activity ON public.leads USING btree (last_activity);


--
-- Name: idx_leads_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_priority ON public.leads USING btree (priority);


--
-- Name: idx_leads_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_score ON public.leads USING btree (score);


--
-- Name: idx_leads_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_search ON public.leads USING gin (to_tsvector('english'::regconfig, (((((name)::text || ' '::text) || (email)::text) || ' '::text) || (company)::text)));


--
-- Name: idx_leads_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_source ON public.leads USING btree (source);


--
-- Name: idx_leads_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_stage ON public.leads USING btree (stage);


--
-- Name: idx_pipeline_stages_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pipeline_stages_active ON public.pipeline_stages USING btree (is_active);


--
-- Name: idx_pipeline_stages_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pipeline_stages_sort ON public.pipeline_stages USING btree (sort_order);


--
-- Name: idx_stage_extra_fields_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_extra_fields_stage ON public.stage_extra_fields USING btree (stage_id);


--
-- Name: idx_users_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_company ON public.users USING btree (company_id);


--
-- Name: idx_users_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_company_id ON public.users USING btree (company_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_whatsapp_messages_wamid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_messages_wamid ON public.whatsapp_messages USING btree (wamid);


--
-- Name: pipeline_stages_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX pipeline_stages_name_idx ON public.pipeline_stages USING btree (name);


--
-- Name: kb_articles trg_kb_articles_search_vector; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_kb_articles_search_vector BEFORE INSERT OR UPDATE OF question, answer, keywords ON public.kb_articles FOR EACH ROW EXECUTE FUNCTION public.kb_articles_search_vector_update();


--
-- Name: bot_conversations bot_conversations_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_conversations
    ADD CONSTRAINT bot_conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: bot_messages bot_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_messages
    ADD CONSTRAINT bot_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.bot_conversations(id) ON DELETE CASCADE;


--
-- Name: bot_messages bot_messages_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_messages
    ADD CONSTRAINT bot_messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: campaign_results campaign_results_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_results
    ADD CONSTRAINT campaign_results_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: kb_articles kb_articles_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.kb_categories(id) ON DELETE SET NULL;


--
-- Name: kb_articles kb_articles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: kb_articles kb_articles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: kb_unanswered kb_unanswered_bot_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_unanswered
    ADD CONSTRAINT kb_unanswered_bot_conversation_id_fkey FOREIGN KEY (bot_conversation_id) REFERENCES public.bot_conversations(id) ON DELETE SET NULL;


--
-- Name: kb_unanswered kb_unanswered_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_unanswered
    ADD CONSTRAINT kb_unanswered_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: kb_unanswered kb_unanswered_resolved_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_unanswered
    ADD CONSTRAINT kb_unanswered_resolved_article_id_fkey FOREIGN KEY (resolved_article_id) REFERENCES public.kb_articles(id) ON DELETE SET NULL;


--
-- Name: lead_capture_submissions lead_capture_submissions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_capture_submissions
    ADD CONSTRAINT lead_capture_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.lead_capture_forms(id) ON DELETE CASCADE;


--
-- Name: project_inventory project_inventory_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_inventory
    ADD CONSTRAINT project_inventory_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_tasks project_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: stage_extra_fields stage_extra_fields_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_extra_fields
    ADD CONSTRAINT stage_extra_fields_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.pipeline_stages(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: users users_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: whatsapp_messages whatsapp_messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict R6FlvfyCEaSOxuKHWBANwiuhkmHCoVKYJNxqyJd6UXbBeqkrsgAxqWzF1SiHa7F

