export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type PersonalRow = { owner_id: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: PersonalRow & {
          id: string;
          sex: "male" | "female";
          birth_date: string;
          height_cm: number;
          weight_kg: number;
          body_fat_pct: number;
          skeletal_muscle_mass_kg: number;
          body_fat_mass_kg: number | null;
          visceral_fat_level: number | null;
          visceral_fat_scale: "inbody_level" | "tanita_rating" | null;
          total_body_water_kg: number | null;
          diet_flags: string[];
          kitchen_flags: string[];
          servings: number;
          created_at: string;
          updated_at: string;
        };
        Insert: PersonalRow & {
          id?: string;
          sex: "male" | "female";
          birth_date: string;
          height_cm: number;
          weight_kg: number;
          body_fat_pct: number;
          skeletal_muscle_mass_kg: number;
          body_fat_mass_kg?: number | null;
          visceral_fat_level?: number | null;
          visceral_fat_scale?: "inbody_level" | "tanita_rating" | null;
          total_body_water_kg?: number | null;
          diet_flags?: string[];
          kitchen_flags?: string[];
          servings?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      training_days: {
        Row: PersonalRow & {
          id: string;
          weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
          setting: "gym" | "home" | "bands" | "bodyweight";
        };
        Insert: PersonalRow & {
          id?: string;
          weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
          setting: "gym" | "home" | "bands" | "bodyweight";
        };
        Update: Partial<Database["public"]["Tables"]["training_days"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      sex: "male" | "female";
      weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
      training_setting: "gym" | "home" | "bands" | "bodyweight";
    };
    CompositeTypes: Record<string, never>;
  };
};
