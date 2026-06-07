import { createClient } from '@supabase/supabase-js';

let supabase: any = null;
let lastUrl: string | null = null;
let lastKey: string | null = null;

function readEnv(name: string): string | null {
  try {
    const windowValue =
      typeof window !== 'undefined' ? (window as any)?.__ENV__?.[name] : undefined;
    const value = windowValue ?? (import.meta as any)?.env?.[name];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const unquoted =
      (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ? trimmed.slice(1, -1)
        : trimmed;
    return unquoted.trim() || null;
  } catch {
    return null;
  }
}

export function getSupabase(url?: string, key?: string) {
  // Cambio clave: Acceso directo y estático a import.meta.env
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const finalUrl = url || envUrl || localStorage.getItem('tejestock_supabase_url');
  const finalKey = key || envKey || localStorage.getItem('tejestock_supabase_key');

  if (supabase && finalUrl === lastUrl && finalKey === lastKey) return supabase;

  if (finalUrl && finalKey) {
    supabase = createClient(finalUrl, finalKey);
    lastUrl = finalUrl;
    lastKey = finalKey;
    return supabase;
  }
  
  return null;
}

export async function syncYarnsToSupabase(yarns: any[], bags?: any[], projects?: any[]) {
  const client = getSupabase();
  if (!client) return false;

  const data =
    Array.isArray(bags) || Array.isArray(projects)
      ? { yarns, bags: Array.isArray(bags) ? bags : [], projects: Array.isArray(projects) ? projects : [] }
      : yarns;
  const { error } = await client
    .from('inventory')
    .upsert({ id: 1, data, updated_at: new Date().toISOString() });

  if (error) {
    console.error("Error syncing to Supabase:", error);
    return false;
  }
  return true;
}

export async function loadYarnsFromSupabase() {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('inventory')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error("Error loading from Supabase:", error);
    return null;
  }

  return data?.data;
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, message: 'Falta configurar Supabase.' };

  const { error } = await client.from('inventory').select('id').limit(1);
  if (!error) return { ok: true };

  const message =
    error?.message ||
    (typeof error === 'string' ? error : 'No se pudo conectar con Supabase.');

  return { ok: false, message };
}
