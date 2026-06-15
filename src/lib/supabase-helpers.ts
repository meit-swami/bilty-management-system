import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches ALL rows from a Supabase table, bypassing the default 1000-row limit.
 * Uses pagination with .range() to fetch in batches of 1000.
 */
export async function fetchAllRows(
  table: string,
  options?: {
    select?: string;
    order?: { column: string; ascending?: boolean };
    filters?: (query: any) => any;
  }
): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(options?.select || "*");
    
    if (options?.filters) {
      query = options.filters(query);
    }
    
    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      break;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
