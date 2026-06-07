import { createClient } from '@supabase/supabase-js';

let supabase: any = null;

export function getSupabase(url?: string, key?: string) {
  if (supabase) return supabase;
  
  const finalUrl = url || localStorage.getItem('tejestock_supabase_url');
  const finalKey = key || localStorage.getItem('tejestock_supabase_key');
  
  if (finalUrl && finalKey) {
    supabase = createClient(finalUrl, finalKey);
    return supabase;
  }
  
  return null;
}

export async function syncYarnsToSupabase(yarns: any[]) {
  const client = getSupabase();
  if (!client) return;

  // Para simplificar al máximo, guardaremos el JSON completo en una tabla de configuración
  // Esto evita tener que crear 5 tablas y relaciones complejas
  const { error } = await client
    .from('inventory')
    .upsert({ id: 1, data: yarns, updated_at: new Date().toISOString() });

  if (error) console.error("Error syncing to Supabase:", error);
}

export async function loadYarnsFromSupabase() {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('inventory')
    .select('data')
    .eq('id', 1)
    .single();

  if (error) {
    console.error("Error loading from Supabase:", error);
    return null;
  }

  return data?.data;
}
