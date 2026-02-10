
import { supabase } from '../supabaseConfig';

export async function createTransaction(payload: any) {
  // ⚠️ تأكيد: نشيل createdAt لو جاي من أي مكان
  const cleanPayload = { ...payload };
  delete cleanPayload.createdAt;

  const { data, error } = await supabase
    .from('transactions')
    .insert([cleanPayload])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw error;
  }

  return data;
}