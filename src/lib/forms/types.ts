// Form definitions (forms.definition) and submissions. Field ids are short strings ("f1"); a field
// posts under its id ("f1"), with parts for names ("f1[first]") and lists for checkboxes ("f1[]").

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'url'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'name'
  | 'date'
  | 'consent'
  | 'section'
  | 'html'
  | 'hidden';

export interface Choice {
  label: string;
  value: string;
  selected?: boolean;
}

export type NamePart = 'prefix' | 'first' | 'middle' | 'last' | 'suffix';

export type Operator = 'is' | 'isnot' | 'contains' | 'starts_with' | 'ends_with' | '>' | '<';

export interface Rule {
  field: string;
  op: Operator;
  value: string;
}

export interface Logic {
  action: 'show' | 'hide';
  match: 'all' | 'any';
  rules: Rule[];
}

/** Column span on the form's 12-column grid. */
export type Width = 'full' | 'three-quarters' | 'two-thirds' | 'half' | 'third' | 'quarter';

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  description?: string;
  descriptionAbove?: boolean;
  placeholder?: string;
  default?: string;
  width?: Width;
  className?: string;
  /** Message shown when the field is missing or invalid (overrides the default). */
  errorMessage?: string;
  choices?: Choice[];
  /** Different stored values from labels (choices). */
  choiceValues?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  /** phone: "us" formats as (###) ###-#### and requires 10 digits. */
  phoneFormat?: 'us' | 'any';
  /** consent: the checkbox's text. */
  consentText?: string;
  /** html: markup shown as-is. */
  html?: string;
  /** name: which parts show, and their labels. First and last always show. */
  nameParts?: Partial<Record<NamePart, { show?: boolean; label?: string }>>;
  logic?: Logic | null;
}

export interface Confirmation {
  type: 'message' | 'page' | 'redirect';
  message?: string;
  /** Entry id of the page to go to. */
  pageId?: number;
  url?: string;
}

export interface Notification {
  id: string;
  name: string;
  active?: boolean;
  /** Comma-separated addresses; merge tags allowed ({admin_email}, {Email:f3}). */
  to: string;
  subject: string;
  message: string;
  replyTo?: string;
  fromName?: string;
}

export interface FormDef {
  id: number;
  title: string;
  description?: string;
  fields: Field[];
  submitLabel?: string;
  labelPlacement?: 'top' | 'left';
  /** Hidden field that bots fill in and people don't. */
  honeypot?: boolean;
  className?: string;
  confirmation?: Confirmation;
  /** Next number for new field ids. */
  nextId?: number;
}

/** A row of the `forms` table. */
export interface FormRow {
  id: number;
  title: string;
  definition: FormDef;
  notifications?: Notification[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Submitted values by field id: text, a list (checkboxes) or parts (names). */
export type Value = string | string[] | Partial<Record<NamePart, string>>;
export type Values = Record<string, Value>;

/** A form's state when re-shown after a failed submission. */
export interface FormState {
  values: Values;
  errors: Record<string, string>;
}

/** Outcome of a submission, handed to the page render. */
export interface FormResult {
  formId: number;
  ok: boolean;
  message: string;
  errors: Record<string, string>;
  values: Values;
  redirect?: string;
}
