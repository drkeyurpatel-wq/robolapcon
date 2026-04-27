export interface Delegate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  speciality: string;
  mci_number: string | null;
  hospital_name: string | null;
  designation: string | null;
  track_preference: string | null;
  day1_tracks: string[];
  day2_tracks: string[];
  dietary_preference: string | null;
  created_at: string;
  invite_code_id: string | null;
  registration_number: string | null;
  status: string;
}

export interface InviteCode {
  id: string;
  code: string;
  label: string | null;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Faculty {
  id: string;
  full_name: string;
  designation: string | null;
  speciality: string | null;
  hospital: string | null;
  city: string | null;
  photo_url: string | null;
  bio: string | null;
  is_keynote: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  track_id: string | null;
  title: string;
  description: string | null;
  session_type: string;
  day_number: number;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  faculty_id: string | null;
  faculty_name?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Track {
  id: string;
  name: string;
  slug: string;
  day_number: number;
  color: string | null;
  description: string | null;
  is_active: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface WhatsAppMessage {
  id: string;
  delegate_id: string;
  template_name: string;
  phone: string;
  status: string;
  aisensy_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface RegistrationPayload {
  p_full_name: string;
  p_email: string;
  p_phone: string;
  p_city: string;
  p_state: string;
  p_speciality: string;
  p_mci_number?: string;
  p_hospital_name?: string;
  p_designation?: string;
  p_track_preference?: string;
  p_day1_tracks?: string[];
  p_day2_tracks?: string[];
  p_dietary_preference?: string;
}
