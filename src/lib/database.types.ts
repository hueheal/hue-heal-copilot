/* Hue & Heal — Studio Co-pilot database types.
   Hand-authored to match supabase/migrations/0001_social_copilot.sql. When the
   schema grows, regenerate with:  npx supabase gen types typescript --linked */

export type PostFormat = 'carousel' | 'story' | 'quote' | 'newsletter' | 'linkedin' | 'report' | 'square' | 'portrait'
export type Sector = 'hospitality' | 'food_beverage' | 'health_fitness' | 'education'
export type Accent = 'lime' | 'terracotta' | 'copper'
export type PostStatus = 'draft' | 'scheduled' | 'published'

export type ClientStage = 'lead' | 'proposal' | 'active' | 'delivered'
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export interface Slide {
  heading: string
  body: string
}

export interface ProposalPhase {
  name: string
  detail?: string
  fee: number
}

export interface ProposalContent {
  intro?: string
  approach?: string
  timeline?: string
  terms?: string
}

export interface LineItem {
  description: string
  amount: number
}

export interface Database {
  public: {
    Tables: {
      brand_kits: {
        Row: {
          id: string
          owner: string
          name: string
          tokens: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          owner?: string
          name: string
          tokens?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['brand_kits']['Insert']>
        Relationships: []
      }
      social_posts: {
        Row: {
          id: string
          owner: string
          brand_kit_id: string | null
          topic: string
          format: PostFormat
          sector: Sector
          accent: Accent
          status: PostStatus
          scheduled_for: string | null
          headline: string | null
          caption: string | null
          hashtags: string[]
          slides: Slide[]
          image_url: string | null
          platform: string
          design: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner?: string
          brand_kit_id?: string | null
          topic: string
          format: PostFormat
          sector: Sector
          accent: Accent
          status?: PostStatus
          scheduled_for?: string | null
          headline?: string | null
          caption?: string | null
          hashtags?: string[]
          slides?: Slide[]
          image_url?: string | null
          platform?: string
          design?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['social_posts']['Insert']>
        Relationships: []
      }
      post_assets: {
        Row: {
          id: string
          owner: string
          post_id: string
          kind: string
          storage_path: string
          created_at: string
        }
        Insert: {
          id?: string
          owner?: string
          post_id: string
          kind: string
          storage_path: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['post_assets']['Insert']>
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          owner: string
          name: string
          sector: string
          stage: ClientStage
          value_gbp: number | null
          note: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner?: string
          name: string
          sector?: string
          stage?: ClientStage
          value_gbp?: number | null
          note?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
        Relationships: []
      }
      proposals: {
        Row: {
          id: string
          owner: string
          client_id: string | null
          client_name: string
          title: string
          amount_gbp: number
          status: ProposalStatus
          phases: ProposalPhase[]
          content: ProposalContent
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner?: string
          client_id?: string | null
          client_name?: string
          title: string
          amount_gbp?: number
          status?: ProposalStatus
          phases?: ProposalPhase[]
          content?: ProposalContent
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['proposals']['Insert']>
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          owner: string
          client_id: string | null
          proposal_id: string | null
          client_name: string
          title: string
          amount_gbp: number
          status: InvoiceStatus
          due_date: string | null
          issued_at: string | null
          line_items: LineItem[]
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner?: string
          client_id?: string | null
          proposal_id?: string | null
          client_name?: string
          title: string
          amount_gbp?: number
          status?: InvoiceStatus
          due_date?: string | null
          issued_at?: string | null
          line_items?: LineItem[]
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
        Relationships: []
      }
      content_ideas: {
        Row: {
          id: string
          owner: string
          theme: string
          hook: string
          angle: string
          format: PostFormat | null
          platform: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          owner?: string
          theme?: string
          hook: string
          angle?: string
          format?: PostFormat | null
          platform?: string
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['content_ideas']['Insert']>
        Relationships: []
      }
      app_members: {
        Row: {
          id: string
          email: string
          role: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: string
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['app_members']['Insert']>
        Relationships: []
      }
      brand_profiles: {
        Row: {
          id: string
          owner: string
          name: string
          tone_of_voice: string
          writing_guidelines: string
          image_master_prompt: string
          image_negatives: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner?: string
          name: string
          tone_of_voice?: string
          writing_guidelines?: string
          image_master_prompt?: string
          image_negatives?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['brand_profiles']['Insert']>
        Relationships: []
      }
      newsletters: {
        Row: {
          id: string
          owner: string
          subject: string
          preheader: string
          template: string
          blocks: unknown[]
          status: string
          sent_at: string | null
          recipients_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner?: string
          subject?: string
          preheader?: string
          template?: string
          blocks?: unknown[]
          status?: string
          sent_at?: string | null
          recipients_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['newsletters']['Insert']>
        Relationships: []
      }
      subscribers: {
        Row: {
          id: string
          owner: string
          email: string
          name: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          owner?: string
          email: string
          name?: string
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['subscribers']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      post_format: PostFormat
      sector: Sector
      accent: Accent
      post_status: PostStatus
      client_stage: ClientStage
      proposal_status: ProposalStatus
      invoice_status: InvoiceStatus
    }
    CompositeTypes: Record<string, never>
  }
}
