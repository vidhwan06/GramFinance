/**
 * Database types for GramFinance.
 *
 * ── Regeneration ────────────────────────────────────────────────────────────
 * These mirror the schema created by `supabase/migrations/001` – `010`. Once the
 * Supabase CLI is connected, regenerate the authoritative version with:
 *
 *   npx supabase gen types typescript --project-id <project-ref>
 *
 * and diff it against this file. A hand-maintained copy drifts: the previous
 * version of this file typed `DbQuiz.lesson_id` as non-nullable against a
 * nullable column, and typed `DbUser.id` as a locally generated UUID rather
 * than a foreign key to auth.users.
 *
 * Column names are snake_case to match Postgres exactly. Do not camelCase them
 * or the Supabase client will not map them.
 *
 * ── Use `type`, NOT `interface` ─────────────────────────────────────────────
 * The Supabase client's `GenericTable` constraint requires each table's `Row`
 * to extend `Record<string, unknown>`. TypeScript grants an *implicit index
 * signature* to a type alias of an object literal, but never to an `interface`
 * declaration. Declaring these as interfaces therefore collapses the whole
 * schema to `never` and silently disables checking on every query — while
 * still appearing to compile. A type probe shows the damage clearly:
 *
 *   PostgrestFilterBuilder<..., never, never, never[], "schemes", ...>
 *
 * Do not convert these back to `interface`.
 */

/** Mirrors the `users_language_check` CHECK constraint from migration 001. */
export type UserLanguage = 'en' | 'kn';

/** Mirrors the `lessons_status_check` CHECK constraint from migration 023. */
export type LessonStatus = 'draft' | 'active' | 'archived';

/** Mirrors the `schemes_status_check` CHECK constraint from migration 011. */
export type SchemeStatus = 'draft' | 'active' | 'inactive' | 'expired';

/** Mirrors `scheme_rules_rule_type_check`. */
export type SchemeRuleType = 'eligibility' | 'loan_terms';

/** Mirrors `scheme_rules_group_operator_check`. */
export type RuleGroupOperator = 'AND' | 'OR';

/** Mirrors `scheme_rules_operator_check`. Exactly the V1 operator set. */
export type SchemeRuleOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'IN'
  | 'NOT_IN'
  | 'CONTAINS';

/** Mirrors `user_roles_role_check`. */
export type UserRoleName = 'admin';

/**
 * Profile row. Extends a Supabase Auth account — this is NOT a standalone user
 * table and holds no credentials.
 */
export type DbUser = {
  /** Primary key AND foreign key to `auth.users(id)`. Always the auth user's id. */
  id: string;
  language: UserLanguage;
  state: string | null;
  district: string | null;
  occupation: string | null;
  created_at: string;
};

/** Public reference content. Readable by anon and authenticated. */
export type DbLesson = {
  id: string;
  /**
   * Unconstrained `VARCHAR(50)`. Intended to be a `LessonCategory`
   * (features/learning/types.ts) but the database does not enforce that yet —
   * typed as `string` so this file never claims a guarantee the schema does not
   * make. Narrow it only alongside a CHECK constraint.
   */
  category: string;
  title_en: string;
  title_kn: string;
  content_en: Record<string, unknown>;
  content_kn: Record<string, unknown>;
  /** Unconstrained `VARCHAR(20)`. Same caveat as `category`. */
  difficulty: string;
  /** Lifecycle state added in migration 023 ('draft' | 'active' | 'archived'). */
  status: LessonStatus;
  /** Chapter order within a module (1-5). Added in migration 024. */
  sort_order: number | null;
  updated_at: string;
};

/**
 * Authenticated-only (migrations 008 + 010). The question blobs embed the
 * correct answers, so anon is denied at BOTH the privilege and policy layer.
 */
export type DbQuiz = {
  id: string;
  /** Nullable: the column has no NOT NULL, so a quiz may be unattached. */
  lesson_id: string | null;
  questions_en: Record<string, unknown>[];
  questions_kn: Record<string, unknown>[];
  created_at: string;
};

/** Public reference content. Readable by anon and authenticated. */
export type DbScheme = {
  id: string;
  name_en: string;
  name_kn: string;
  description_en: string;
  description_kn: string;
  target_groups: string[];
  /** Defaults to `{"ALL"}`. Null only if explicitly set to NULL. */
  states: string[] | null;
  required_documents: string[];
  /** UNIQUE (migration 004) — the natural key and the seed's conflict target. */
  official_url: string;
  /** Date the scheme was last manually verified. Surface this to users. */
  last_verified: string;
  /**
   * Lifecycle state. Added by migration 011 with `DEFAULT 'draft'`, so a row
   * inserted without an explicit status is hidden from the public catalogue.
   */
  status: SchemeStatus;
  created_at: string;
};

/**
 * Deterministic eligibility rules. Source of truth for eligibility —
 * `schemes.target_groups` is browse metadata and must never be evaluated.
 *
 * NOTE ON UNITS: monetary `value`s here are INR RUPEES, never paise. The loan
 * engine in features/loan/engine uses integer paise; the two conventions are
 * different and conversion belongs at the integration boundary only.
 */
export type DbSchemeRule = {
  id: string;
  scheme_id: string;
  rule_group: number;
  group_operator: RuleGroupOperator;
  rule_type: SchemeRuleType;
  /** Constrained to the closed registry by `scheme_rules_field_check`. */
  field: string;
  operator: SchemeRuleOperator;
  /** Scalar for = != > >= < <=; array for IN NOT_IN CONTAINS. */
  value: number | string | boolean | Array<number | string | boolean>;
  required: boolean;
  description_en: string | null;
  description_kn: string | null;
  priority: number;
  created_at: string;
};

/**
 * Rule groups for nested rule tree architecture (Phase 5B).
 * Mirrors the `public.rule_groups` table created in migration 016.
 */
export type DbRuleGroup = {
  id: string;
  scheme_id: string;
  parent_group_id: string | null;
  group_operator: RuleGroupOperator;
  group_order: number;
  created_at: string;
};

/**
 * Rule nodes for nested rule tree architecture (Phase 5B).
 * Mirrors the `public.rule_nodes` table created in migration 016.
 */
export type DbRuleNode = {
  id: string;
  group_id: string;
  node_type: 'rule' | 'group';

  // Rule-specific (NULL for group nodes)
  field: string | null;
  operator: SchemeRuleOperator | null;
  value: number | string | boolean | Array<number | string | boolean> | null;
  required: boolean;
  description_en: string | null;
  description_kn: string | null;
  priority: number;

  // Group-specific (NULL for rule nodes)
  child_group_id: string | null;

  created_at: string;
};

/**
 * Authorization foundation for future admin features.
 *
 * RLS is enabled with ZERO policies and all client grants are revoked, so no
 * client — anon or authenticated — can read or write a role record. A `role`
 * column on public.users was rejected because migration 008 lets a user UPDATE
 * their own row, which would have been self-promotion.
 */
export type DbUserRole = {
  /** Primary key AND foreign key to auth.users(id). */
  user_id: string;
  role: UserRoleName;
  created_at: string;
};

// ── Fraud Checker types ─────────────────────────────────────────────
export type FraudInputType = 'message' | 'url' | 'upi' | 'phone' | 'scheme_claim' | 'general';
export type FraudRiskLevel = 'low' | 'medium' | 'high';
export type FraudCheckStatus = 'completed' | 'failed';
export type FraudSignalSeverity = 'low' | 'medium' | 'high';
export type FraudSignalCategory = 'payment' | 'credential' | 'urgency' | 'government_claim' | 'link' | 'identity' | 'general';

export type DbFraudCheck = {
  id: string;
  input_type: FraudInputType;
  input_text: string;
  normalized_text: string;
  risk_level: FraudRiskLevel;
  risk_score: number;
  status: FraudCheckStatus;
  created_at: string;
};

export type DbFraudSignal = {
  id: string;
  code: string;
  name: string;
  description: string;
  severity: FraudSignalSeverity;
  category: FraudSignalCategory;
  weight: number;
  enabled: boolean;
  created_at: string;
};

export type DbFraudCheckSignal = {
  id: string;
  fraud_check_id: string;
  fraud_signal_id: string;
  matched_text: string;
  explanation: string;
  created_at: string;
};

/** Public reference content. Readable by anon and authenticated. */
export type DbFraudPattern = {
  id: string;
  category: string;
  indicator: string;
  explanation_en: string;
  explanation_kn: string;
  recommended_action_en: string;
  recommended_action_kn: string;
};

/**
 * Append-only. A user may insert a row for themselves and read their own rows
 * (migration 008); no UPDATE or DELETE policy exists.
 */
export type DbFeedback = {
  id: string;
  /**
   * Nullable, and `ON DELETE SET NULL` from public.users. A client cannot
   * insert a NULL user_id — the RLS policy compares it against `auth.uid()` —
   * but rows become unattributed when the owning auth account is deleted.
   */
  user_id: string | null;
  module: string;
  /** CHECK (rating >= 1 AND rating <= 5). */
  rating: number;
  comment: string | null;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Insert shapes
// ─────────────────────────────────────────────────────────────────────────────
// A column is REQUIRED on insert only when it is NOT NULL *and* the database
// supplies no DEFAULT. Getting this wrong is not cosmetic: an over-permissive
// Insert type lets you write `.insert({ name_en: 'x' })`, compiles cleanly, and
// then fails at runtime with a 400 from PostgREST.
//
// These mirror what `supabase gen types typescript` emits, so a future
// regeneration diffs cleanly instead of rewriting this section.

/** `users.id` has no DEFAULT — migration 001 removed `gen_random_uuid()`. */
export type DbUserInsert = {
  id: string;
  language?: UserLanguage;
  state?: string | null;
  district?: string | null;
  occupation?: string | null;
  created_at?: string;
};

export type DbLessonInsert = {
  category: string;
  title_en: string;
  title_kn: string;
  content_en: Record<string, unknown>;
  content_kn: Record<string, unknown>;
  id?: string;
  /** Has DEFAULT 'beginner'. */
  difficulty?: string;
  /** Has DEFAULT 'draft'. Omit to keep a lesson unpublished. */
  status?: LessonStatus;
  /** Chapter order within a module (1-5). Added in migration 024. */
  sort_order?: number | null;
  /** Has a DEFAULT. */
  updated_at?: string;
};

export type DbQuizInsert = {
  questions_en: Record<string, unknown>[];
  questions_kn: Record<string, unknown>[];
  id?: string;
  /** Nullable, no DEFAULT. */
  lesson_id?: string | null;
  created_at?: string;
};

export type DbSchemeInsert = {
  name_en: string;
  name_kn: string;
  description_en: string;
  description_kn: string;
  target_groups: string[];
  required_documents: string[];
  official_url: string;
  last_verified: string;
  id?: string;
  /** Has DEFAULT '{"ALL"}'. */
  states?: string[] | null;
  /** Has DEFAULT 'draft'. Omit to keep a scheme unpublished. */
  status?: SchemeStatus;
  created_at?: string;
};

export type DbSchemeRuleInsert = {
  scheme_id: string;
  field: string;
  operator: SchemeRuleOperator;
  value: number | string | boolean | Array<number | string | boolean>;
  /** Has DEFAULT 1. */
  rule_group?: number;
  /** Has DEFAULT 'AND'. */
  group_operator?: RuleGroupOperator;
  /** Has DEFAULT 'eligibility'. */
  rule_type?: SchemeRuleType;
  /** Has DEFAULT TRUE. */
  required?: boolean;
  /** Has DEFAULT 0. */
  priority?: number;
  id?: string;
  description_en?: string | null;
  description_kn?: string | null;
  created_at?: string;
};

/**
 * There is deliberately no client-facing Insert type for user_roles. Role
 * records are created only by a trusted Supabase SQL / admin operation.
 */

export type DbFraudPatternInsert = {
  category: string;
  indicator: string;
  explanation_en: string;
  explanation_kn: string;
  recommended_action_en: string;
  recommended_action_kn: string;
  id?: string;
};

export type DbFraudCheckInsert = {
  input_type: FraudInputType;
  input_text: string;
  normalized_text: string;
  risk_level?: FraudRiskLevel;
  risk_score?: number;
  status?: FraudCheckStatus;
  id?: string;
  created_at?: string;
};

export type DbFraudCheckUpdate = AllOptional<DbFraudCheck>;

export type DbFraudSignalInsert = {
  code: string;
  name: string;
  description: string;
  severity: FraudSignalSeverity;
  category: FraudSignalCategory;
  weight: number;
  enabled?: boolean;
  id?: string;
  created_at?: string;
};

export type DbFraudSignalUpdate = AllOptional<DbFraudSignal>;

export type DbFraudCheckSignalInsert = {
  fraud_check_id: string;
  fraud_signal_id: string;
  matched_text: string;
  explanation: string;
  id?: string;
  created_at?: string;
};

export type DbFraudCheckSignalUpdate = AllOptional<DbFraudCheckSignal>;

export type DbFeedbackInsert = {
  module: string;
  rating: number;
  id?: string;
  /** Nullable, no DEFAULT. */
  user_id?: string | null;
  comment?: string | null;
  created_at?: string;
};

/** Makes every column optional. Correct for UPDATE. */
type AllOptional<T> = { [K in keyof T]?: T[K] };

// ─────────────────────────────────────────────────────────────────────────────
// Supabase client generics
// ─────────────────────────────────────────────────────────────────────────────
// This is the shape `createBrowserClient<Database>()` /
// `createServerClient<Database>()` expect. Derived from the row types above, so
// there is exactly ONE place to edit when the schema changes — never two.

export interface Database {
  public: {
    Tables: {
      users: {
        Row: DbUser;
        Insert: DbUserInsert;
        Update: AllOptional<DbUser>;
        Relationships: [];
      };
      lessons: {
        Row: DbLesson;
        Insert: DbLessonInsert;
        Update: AllOptional<DbLesson>;
        Relationships: [];
      };
      quizzes: {
        Row: DbQuiz;
        Insert: DbQuizInsert;
        Update: AllOptional<DbQuiz>;
        Relationships: [];
      };
      schemes: {
        Row: DbScheme;
        Insert: DbSchemeInsert;
        Update: AllOptional<DbScheme>;
        Relationships: [];
      };
      scheme_rules: {
        Row: DbSchemeRule;
        Insert: DbSchemeRuleInsert;
        Update: AllOptional<DbSchemeRule>;
        Relationships: [];
      };
      user_roles: {
        Row: DbUserRole;
        // No client Insert/Update/Delete is possible: the table has no RLS
        // policies and no client grants, so these shapes exist only for the
        // server-side / service-role path.
        Insert: { user_id: string; role: UserRoleName; created_at?: string };
        Update: Partial<{ role: UserRoleName }>;
        Relationships: [];
      };
      fraud_patterns: {
        Row: DbFraudPattern;
        Insert: DbFraudPatternInsert;
        Update: AllOptional<DbFraudPattern>;
        Relationships: [];
      };
      fraud_checks: {
        Row: DbFraudCheck;
        Insert: DbFraudCheckInsert;
        Update: DbFraudCheckUpdate;
        Relationships: [];
      };
      fraud_signals: {
        Row: DbFraudSignal;
        Insert: DbFraudSignalInsert;
        Update: DbFraudSignalUpdate;
        Relationships: [];
      };
      fraud_check_signals: {
        Row: DbFraudCheckSignal;
        Insert: DbFraudCheckSignalInsert;
        Update: DbFraudCheckSignalUpdate;
        Relationships: [
          {
            foreignKeyName: 'fraud_check_signals_fraud_check_id_fkey';
            columns: ['fraud_check_id'];
            isOneToOne: false;
            referencedRelation: 'fraud_checks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fraud_check_signals_fraud_signal_id_fkey';
            columns: ['fraud_signal_id'];
            isOneToOne: false;
            referencedRelation: 'fraud_signals';
            referencedColumns: ['id'];
          },
        ];
      };
      feedback: {
        Row: DbFeedback;
        Insert: DbFeedbackInsert;
        Update: AllOptional<DbFeedback>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    /**
     * `public.is_admin()` — migration 011.
     *
     * SECURITY DEFINER, STABLE, `search_path = ''`. Takes no arguments and
     * returns whether the calling `auth.uid()` holds the `admin` role in
     * `user_roles`. Declared here so `.rpc('is_admin')` typechecks; the
     * signature must stay in step with the migration.
     *
     * EXECUTE is granted to `authenticated` only (migration 011, tightened by
     * 026), which is why every caller must already hold a session.
     */
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_language: UserLanguage;
      fraud_input_type: FraudInputType;
      fraud_risk_level: FraudRiskLevel;
      fraud_check_status: FraudCheckStatus;
      fraud_signal_severity: FraudSignalSeverity;
      fraud_signal_category: FraudSignalCategory;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type TableName = keyof Database['public']['Tables'];

/** The `Row` type for a table, e.g. `TableRow<'schemes'>`. */
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/** The `Insert` type for a table, e.g. `TableInsert<'feedback'>`. */
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/** The `Update` type for a table, e.g. `TableUpdate<'users'>`. */
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

/**
 * Tables an unauthenticated (anon) caller may read. Everything else is either
 * authenticated-only or owner-scoped. Keep in sync with migrations 008 + 010.
 */
export type PublicTableName = 'lessons' | 'schemes' | 'fraud_patterns' | 'fraud_checks' | 'fraud_signals' | 'fraud_check_signals';
