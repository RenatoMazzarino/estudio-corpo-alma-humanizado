
import { Database } from '../lib/supabase/types';

export type Service = Database['public']['Tables']['services']['Row'];
