import type { TradeCategory } from '@/constants/trade-categories';

export type UserRole = 'customer' | 'tradie' | 'admin';

export type JobStatus =
  | 'draft'
  | 'open'
  | 'quotes_received'
  | 'accepted'
  | 'in_progress'
  | 'pending_completion'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export type NotificationType =
  | 'new_job_nearby'
  | 'new_quote_received'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'job_started'
  | 'job_completed'
  | 'payment_released'
  | 'new_message'
  | 'rating_received'
  | 'site_visit_requested'
  | 'site_visit_completed';

export type RewardSlipStatus = 'pending' | 'approved' | 'rejected';

export interface Supplier {
  id: string;
  name: string;
  logo_url: string | null;
  report_emails: string[];
  reward_pct: number;
  commission_pct: number;
  min_slip_amount: number;
  active_from: string | null;
  active_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TradieSupplierAccount {
  id: string;
  tradie_id: string;
  supplier_id: string;
  account_number: string;
  consent_given_at: string;
  consent_version: string;
  created_at: string;
  updated_at: string;
  // joined fields
  supplier?: Supplier;
}

export interface RewardSlip {
  id: string;
  tradie_id: string;
  supplier_id: string;
  image_path: string;
  image_hash: string | null;
  slip_number: string;
  slip_date: string;
  total_amount: number;
  ocr_supplier_name: string | null;
  ocr_total: number | null;
  ocr_date: string | null;
  ocr_confidence: number | null;
  status: RewardSlipStatus;
  flagged_reason: string | null;
  reward_pct_locked: number | null;
  reward_amount: number | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_reason: string | null;
  report_line_id: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  supplier?: Supplier;
}

export type TransactionStatus =
  | 'quoted'
  | 'accepted'
  | 'funds_held'
  | 'completed_by_provider'
  | 'confirmed_by_customer'
  | 'released'
  | 'disputed'
  | 'cancelled';

export type DocumentType = 'licence' | 'insurance' | 'certificate' | 'other';

export type AttachmentType = 'image' | 'document' | 'pdf';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  location: unknown | null; // PostGIS geography
  address_text: string | null;
  suburb: string | null;
  province: string | null;
  push_token: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  bank_account_type: string | null;
  tradesafe_token: string | null;
  onboarding_complete: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface TradieProfile {
  id: string;
  categories: TradeCategory[];
  years_experience: number | null;
  hourly_rate: number | null;
  cipc_number: string | null;
  vat_number: string | null;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
  service_radius_km: number;
  service_towns: string[];
  instagram_url: string | null;
  facebook_url: string | null;
}

export interface Job {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  category: TradeCategory;
  status: JobStatus;
  address_text: string;
  suburb: string | null;
  province: string | null;
  town: string | null;
  ai_image_url: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_start: string | null;
  accepted_quote_id: string | null;
  scheduled_at: string | null;
  completion_photo_url: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  // joined fields
  customer?: Profile;
  images?: JobImage[];
  quote_count?: number;
  latitude?: number;
  longitude?: number;
  payment_status?: TransactionStatus | null;
}

export interface JobImage {
  id: string;
  job_id: string;
  url: string;
  is_ai: boolean;
  sort_order: number;
  created_at: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  job_id: string;
  tradie_id: string;
  amount: number;
  includes_vat: boolean;
  message: string | null;
  timeline_days: number | null;
  quote_document_url: string | null;
  status: QuoteStatus;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  tradie?: Profile;
  tradie_profile?: TradieProfile;
  job?: Job;
}

// Internal ledger row tracking escrow-like status for a job's payment lifecycle,
// mirrored against a real TradeSafe transaction via tradesafe_transaction_id.
export interface Transaction {
  id: string;
  job_id: string;
  quote_id: string;
  customer_id: string;
  tradie_id: string;
  quoted_amount: number;
  commission_pct: number;
  status: TransactionStatus;
  tradesafe_transaction_id: string | null;
  tradesafe_reference: string | null;
  tradesafe_allocation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionStatusHistoryEntry {
  id: string;
  transaction_id: string;
  status: TransactionStatus;
  changed_at: string;
}

export interface RatingImage {
  id: string;
  rating_id: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface Rating {
  id: string;
  job_id: string;
  quote_id: string;
  customer_id: string;
  tradie_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  customer?: Profile;
  images?: RatingImage[];
}

export interface Conversation {
  id: string;
  job_id: string | null;
  customer_id: string;
  tradie_id: string;
  last_message_at: string | null;
  created_at: string;
  // joined fields
  job?: Job;
  customer?: Profile;
  tradie?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: AttachmentType | null;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}

export interface BookingProposal {
  id: string;
  conversation_id: string;
  job_id: string;
  proposed_by: string;
  proposed_datetime: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  proposer?: Profile;
}

// Local-only extension — _pending is never stored in the DB.
// used by useMessages to track optimistic inserts before DB confirmation.
export type LocalMessage = Message & { _pending?: boolean };

export interface TradieDocument {
  id: string;
  tradie_id: string;
  type: DocumentType;
  label: string;
  url: string;
  expiry_date: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface PortfolioImage {
  id: string;
  tradie_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  transaction_id: string | null;
  job_id: string;
  tradie_id: string;
  customer_id: string;
  invoice_number: string;
  type: 'generated' | 'uploaded';
  amount: number;
  vat_amount: number | null;
  description: string | null;
  uploaded_url: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}
