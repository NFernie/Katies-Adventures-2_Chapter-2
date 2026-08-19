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
      goals: {
        Row: PersonalRow & {
          id: string;
          type: "fat_loss" | "fat_loss_retain_muscle" | "recomp" | "maintain";
          target_weight_kg: number | null;
          start_on: string;
          end_on: string;
          weekly_loss_cap_pct: number;
        };
        Insert: PersonalRow & {
          id?: string;
          type: "fat_loss" | "fat_loss_retain_muscle" | "recomp" | "maintain";
          target_weight_kg?: number | null;
          start_on: string;
          end_on: string;
          weekly_loss_cap_pct?: number;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
        Relationships: [];
      };
      plans: {
        Row: PersonalRow & {
          id: string;
          goal_id: string;
          status: "active" | "archived";
        };
        Insert: PersonalRow & {
          id?: string;
          goal_id: string;
          status?: "active" | "archived";
        };
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>;
        Relationships: [];
      };
      plan_versions: {
        Row: PersonalRow & {
          id: string;
          plan_id: string;
          version_n: number;
          bmr_kcal: number;
          pal: number;
          tdee_kcal: number;
          energy_kcal: number;
          protein_g: number;
          carb_g: number;
          fat_g: number;
          split_id: string;
          cardio: Json;
          warnings: string[];
          generator_input: Json;
        };
        Insert: PersonalRow & {
          id?: string;
          plan_id: string;
          version_n: number;
          bmr_kcal: number;
          pal: number;
          tdee_kcal: number;
          energy_kcal: number;
          protein_g: number;
          carb_g: number;
          fat_g: number;
          split_id: string;
          cardio?: Json;
          warnings?: string[];
          generator_input: Json;
        };
        Update: Partial<Database["public"]["Tables"]["plan_versions"]["Insert"]>;
        Relationships: [];
      };
      day_plans: {
        Row: PersonalRow & {
          id: string;
          plan_version_id: string;
          on_date: string;
          is_train_day: boolean;
          training_setting: "gym" | "home" | "bands" | "bodyweight" | null;
          is_deload: boolean;
        };
        Insert: PersonalRow & {
          id?: string;
          plan_version_id: string;
          on_date: string;
          is_train_day: boolean;
          training_setting?: "gym" | "home" | "bands" | "bodyweight" | null;
          is_deload?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["day_plans"]["Insert"]>;
        Relationships: [];
      };
      meal_slots: {
        Row: PersonalRow & {
          id: string;
          day_plan_id: string;
          slot: "breakfast" | "lunch" | "dinner" | "snack";
          recipe_slug: string;
          pinned: boolean;
          eaten: boolean;
        };
        Insert: PersonalRow & {
          id?: string;
          day_plan_id: string;
          slot: "breakfast" | "lunch" | "dinner" | "snack";
          recipe_slug: string;
          pinned?: boolean;
          eaten?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["meal_slots"]["Insert"]>;
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
