import { getSupabaseClient } from './supabase/client';

const STORAGE_KEY = 'silent-resonance.star';
const ONLINE_WINDOW_MS = 60_000;

export const FREQUENCIES = [
  { id: 'philosophy', label: '哲学' },
  { id: 'music', label: '音乐' },
  { id: 'literature', label: '文学' },
  { id: 'cinema', label: '电影' },
  { id: 'writing', label: '写作' },
  { id: 'cosmos', label: '宇宙' },
  { id: 'walking', label: '散步' },
  { id: 'mind', label: '心理' },
] as const;

export const STATES = [
  { id: 'solo', label: '想独处' },
  { id: 'understood', label: '想被理解' },
  { id: 'silent', label: '不想说话' },
  { id: 'recovering', label: '正在恢复' },
  { id: 'present', label: '只是静静待着' },
  { id: 'gentle-link', label: '愿意轻微连接' },
] as const;

export type FrequencyId = (typeof FREQUENCIES)[number]['id'];
export type StateId = (typeof STATES)[number]['id'];

export type StoredIdentity = {
  starId: string;
  editToken: string;
};

export type StarFormInput = {
  nickname?: string;
  primaryFrequency: FrequencyId;
  secondaryFrequencies: FrequencyId[];
  currentState: StateId;
};

export type WorldPosition = {
  x: number;
  y: number;
};

export type UniverseStar = {
  id: string;
  nickname: string | null;
  primary_frequency: FrequencyId;
  secondary_frequencies: FrequencyId[];
  current_state: StateId;
  color: string;
  created_at: string;
  updated_at: string;
  last_seen: string | null;
  is_online: boolean;
  world_x: number | null;
  world_y: number | null;
};

export type ResonanceEvent = {
  id: string;
  from_star_id: string;
  to_star_id: string;
  created_at: string;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

export function readStoredIdentity(): StoredIdentity | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredIdentity) : null;
  } catch {
    return null;
  }
}

export function writeStoredIdentity(identity: StoredIdentity) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export async function createStar(input: StarFormInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_star', {
    p_primary: input.primaryFrequency,
    p_secondary: input.secondaryFrequencies,
    p_state: input.currentState,
    p_nickname: input.nickname?.trim() || null,
  });

  if (error) {
    throw error;
  }

  const created = data?.[0];
  if (!created) {
    throw new Error('create_star returned no data');
  }

  const identity = {
    starId: created.star_id as string,
    editToken: created.edit_token as string,
  };

  writeStoredIdentity(identity);
  return identity;
}

export async function updateStar(input: StarFormInput, identity: StoredIdentity) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('update_star_profile', {
    p_star_id: identity.starId,
    p_edit_token: identity.editToken,
    p_primary: input.primaryFrequency,
    p_secondary: input.secondaryFrequencies,
    p_state: input.currentState,
    p_nickname: input.nickname?.trim() || null,
  });

  if (error) {
    throw error;
  }
}

export async function upsertMyStar(input: StarFormInput) {
  const identity = readStoredIdentity();

  if (!identity) {
    return createStar(input);
  }

  try {
    await updateStar(input, identity);
    return identity;
  } catch {
    return createStar(input);
  }
}

export async function touchPresence(
  identity: StoredIdentity,
  worldPosition?: WorldPosition,
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('touch_presence', {
    p_star_id: identity.starId,
    p_edit_token: identity.editToken,
    p_world_x: worldPosition?.x ?? null,
    p_world_y: worldPosition?.y ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function leavePresence(identity: StoredIdentity) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('leave_presence', {
    p_star_id: identity.starId,
    p_edit_token: identity.editToken,
  });

  if (error) {
    throw error;
  }
}

export async function sendResonance(targetStarId: string, identity: StoredIdentity) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('send_resonance', {
    p_from_star_id: identity.starId,
    p_edit_token: identity.editToken,
    p_to_star_id: targetStarId,
  });

  if (error) {
    throw error;
  }
}

export async function fetchUniverse() {
  const supabase = getSupabaseClient();
  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from('stars_live')
    .select('*')
    .eq('is_online', true)
    .gte('last_seen', onlineCutoff)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data as UniverseStar[];
}

export function subscribeUniverse(
  onChange: () => void,
  onResonance?: (event: ResonanceEvent) => void,
) {
  const supabase = getSupabaseClient();

  return supabase
    .channel('silent-resonance-universe')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stars' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'presence' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'resonance' },
      (payload) => {
        onChange();

        if (onResonance && payload.new) {
          onResonance(payload.new as ResonanceEvent);
        }
      },
    )
    .subscribe();
}
