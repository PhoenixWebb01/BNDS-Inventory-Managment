// TypeScript types that match your Supabase database schema
// This gives you autocomplete and type-checking when working with data

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id">>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Category, "id">>;
      };
      locations: {
        Row: Location;
        Insert: Omit<Location, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Location, "id">>;
      };
      items: {
        Row: Item;
        Insert: Omit<Item, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Item, "id">>;
      };
      activity_log: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, "id" | "created_at">;
        Update: Partial<Omit<ActivityLog, "id">>;
      };
    };
  };
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "staff";
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  prefix: string;
  color: string;
  icon: string;
  custom_fields: CustomField[];
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  name: string;
  type: "text" | "number" | "date" | "select";
  required: boolean;
  options?: string[]; // for select type
}

export interface Location {
  id: string;
  name: string;
  zone: string | null;
  shelf: string | null;
  building: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  barcode: string;
  name: string;
  description: string | null;
  category_id: string | null;
  location_id: string | null;
  quantity: number;
  min_quantity: number;
  unit: string;
  status: "in_stock" | "low_stock" | "out_of_stock" | "on_order" | "retired" | "disposed";
  photo_url: string | null;
  additional_photos: string[];
  purchase_date: string | null;
  purchase_price: number | null;
  vendor: string | null;
  vendor_sku: string | null;
  warranty_expiration: string | null;
  expiration_date: string | null;
  assigned_to: string | null;
  assigned_date: string | null;
  custom_data: Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Item with its related category and location data joined in
export interface ItemWithRelations extends Item {
  category: Category | null;
  location: Location | null;
  assigned_user: Profile | null;
}

export interface ActivityLog {
  id: string;
  item_id: string;
  user_id: string | null;
  action:
    | "created"
    | "updated"
    | "scanned"
    | "checked_out"
    | "checked_in"
    | "quantity_adjusted"
    | "moved"
    | "photo_added"
    | "retired"
    | "disposed"
    | "restocked"
    | "audit_verified";
  details: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

export interface ActivityLogWithRelations extends ActivityLog {
  user: Profile | null;
  item: Item | null;
}
