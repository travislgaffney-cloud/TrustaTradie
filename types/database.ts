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

export type PaymentStatus =
  | 'pending'
  | 'held_in_escrow'
  | 'released'
  | 'refunded'
  | 'failed';

export type NotificationType =
  | 'new_job_nearby'
  | 'new_quote_received'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'job_completed'
  | 'payment_released'
  | 'new_message'
  | 'rating_received';

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
  push_token: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  bank_account_type: string | null;
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
  ai_image_url: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_start: string | null;
  accepted_quote_id: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  // joined fields
  customer?: Profile;
  images?: JobImage[];
  quote_count?: number;
  latitude?: number;
  longitude?: number;
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
  job_id: string;
  tradie_id: string;
  amount: number;
  includes_vat: boolean;
  message: string | null;
  timeline_days: number | null;
  status: QuoteStatus;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  tradie?: Profile;
  tradie_profile?: TradieProfile;
  job?: Job;
}

export interface Payment {
  id: string;
  job_id: string;
  quote_id: string;
  customer_id: string;
  tradie_id: string;
  amount_total: number;
  platform_fee: number;
  tradie_payout: number;
  status: PaymentStatus;
  payfast_payment_id: string | null;
  payfast_pf_payment_id: string | null;
  paid_at: string | null;
  released_at: string | null;
  created_at: string;
  // joined fields
  job?: Job;
  quote?: Quote;
  customer?: Profile;
  tradie?: Profile;
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
