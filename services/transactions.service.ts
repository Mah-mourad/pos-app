// services/transactions.service.ts
import { supabase } from '../supabaseConfig';

export async function createTransaction(payload: any) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Create transaction error:', error);
    throw error;
  }

  return data;
}
