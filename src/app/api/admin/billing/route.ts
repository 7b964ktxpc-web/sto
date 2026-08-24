import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

const money = (n: unknown) => Number(Number(n ?? 0).toFixed(2));

export async function GET() {
  const auth = await requirePlatformRole(['ADMIN','SUPER_ADMIN','FINANCE']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const db = getAdminClient();
  const [{ data: businesses }, { data: invoices }, { data: ledger }, { data: ads }] = await Promise.all([
    db.from('businesses').select('id,name,status,platform_access_status'),
    db.from('platform_invoices').select('id,business_id,period_start,period_end,total,status,issued_at,due_at,paid_at,business:businesses(name)').order('created_at',{ ascending:false }).limit(200),
    db.from('platform_commission_ledger').select('business_id,base_amount,commission_percent,commission_amount,status,period_start,period_end,business:businesses(name)').order('created_at',{ ascending:false }).limit(500),
    db.from('platform_ads').select('id,business_id,title,placement,status,starts_at,ends_at,budget,price_model,price,impressions,clicks,business:businesses(name)').order('created_at',{ ascending:false }).limit(200),
  ]);
  const totals = (ledger ?? []).reduce((a, x: any) => ({ base: a.base + money(x.base_amount), commission: a.commission + money(x.commission_amount) }), { base:0, commission:0 });
  return NextResponse.json({ businesses: businesses ?? [], invoices: invoices ?? [], ledger: ledger ?? [], ads: ads ?? [], totals });
}

export async function PATCH(request: Request) {
  const auth = await requirePlatformRole(['ADMIN','SUPER_ADMIN','FINANCE']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  try {
    const body = await request.json();
    const db = getAdminClient();
    if (body.type === 'commission') {
      const percent = Number(body.commission_percent);
      if (!body.business_id || !Number.isFinite(percent) || percent < 0 || percent > 100) return NextResponse.json({ error: 'INVALID_COMMISSION' }, { status:400 });
      const { error } = await db.from('platform_commission_settings').upsert({ business_id: body.business_id, commission_percent: percent, notes: body.notes ? String(body.notes).slice(0,500) : null, updated_at: new Date().toISOString() });
      if (error) return NextResponse.json({ error: error.message }, { status:400 });
      return NextResponse.json({ ok:true });
    }
    if (body.type === 'access') {
      const allowed = ['active','warning','suspended','removed'];
      if (!body.business_id || !allowed.includes(body.platform_access_status)) return NextResponse.json({ error:'INVALID_ACCESS_STATUS' }, { status:400 });
      const patch:any = { platform_access_status: body.platform_access_status };
      if (body.platform_access_status === 'warning') patch.billing_warning_at = new Date().toISOString();
      if (body.platform_access_status === 'suspended') patch.billing_suspended_at = new Date().toISOString();
      if (body.platform_access_status === 'removed') patch.billing_removed_at = new Date().toISOString();
      const { error } = await db.from('businesses').update(patch).eq('id',body.business_id);
      if (error) return NextResponse.json({ error:error.message },{status:400});
      return NextResponse.json({ok:true});
    }
    if (body.type === 'invoice') {
      const allowed = ['draft','issued','paid','overdue','void'];
      if (!body.invoice_id || !allowed.includes(body.status)) return NextResponse.json({error:'INVALID_INVOICE_STATUS'},{status:400});
      const patch:any={status:body.status,updated_at:new Date().toISOString()};
      if(body.status==='issued') patch.issued_at=new Date().toISOString();
      if(body.status==='paid') patch.paid_at=new Date().toISOString();
      const { error }=await db.from('platform_invoices').update(patch).eq('id',body.invoice_id);
      if(error)return NextResponse.json({error:error.message},{status:400});
      if(body.status==='paid'){
        const { data: inv }=await db.from('platform_invoices').select('business_id,period_start,period_end').eq('id',body.invoice_id).maybeSingle();
        if(inv) await db.from('platform_commission_ledger').update({status:'paid'}).eq('business_id',inv.business_id).gte('period_start',inv.period_start).lte('period_end',inv.period_end);
        if(inv) await db.from('businesses').update({platform_access_status:'active',billing_warning_at:null,billing_suspended_at:null}).eq('id',inv.business_id);
      }
      return NextResponse.json({ok:true});
    }
    if (body.type === 'generate') {
      const periodStart = String(body.period_start || '');
      const periodEnd = String(body.period_end || '');
      if(!periodStart || !periodEnd || periodEnd < periodStart) return NextResponse.json({error:'INVALID_PERIOD'},{status:400});
      const { data: rows, error } = await db.from('platform_commission_ledger').select('id,business_id,commission_amount,base_amount,commission_percent,business:businesses(name)').eq('status','accrued').gte('period_start',periodStart).lte('period_end',periodEnd);
      if(error) return NextResponse.json({error:error.message},{status:400});
      const byBusiness=new Map<string,any>();
      for(const row of rows ?? []) { const item=byBusiness.get(row.business_id) ?? {business_id:row.business_id,total:0,items:[]}; item.total += money(row.commission_amount); item.items.push(row); byBusiness.set(row.business_id,item); }
      const created=[];
      for(const item of byBusiness.values()){
        const { data: inv, error: invError } = await db.from('platform_invoices').upsert({business_id:item.business_id,period_start:periodStart,period_end:periodEnd,subtotal:money(item.total),total:money(item.total),status:'issued',issued_at:new Date().toISOString(),due_at:new Date(Date.now()+7*86400000).toISOString()},{onConflict:'business_id,period_start,period_end'}).select('id,business_id,total,status').single();
        if(invError) continue;
        for(const row of item.items){ await db.from('platform_invoice_items').upsert({invoice_id:inv.id,commission_ledger_id:row.id,description:`Комиссия ${row.commission_percent}%`,quantity:1,unit_amount:row.commission_amount,amount:row.commission_amount},{onConflict:'commission_ledger_id'}); }
        await db.from('platform_commission_ledger').update({status:'invoiced'}).in('id',item.items.map((x:any)=>x.id));
        created.push(inv);
      }
      return NextResponse.json({invoices:created});
    }
    if (body.type === 'ad') {
      if(!body.title || !body.placement || !body.starts_at) return NextResponse.json({error:'INVALID_AD'},{status:400});
      const { data, error }=await db.from('platform_ads').insert({business_id:body.business_id||null,title:String(body.title).slice(0,150),placement:body.placement,status:body.status||'draft',starts_at:body.starts_at,ends_at:body.ends_at||null,budget:Number(body.budget||0),price_model:body.price_model||'PERIOD',price:Number(body.price||0),creative:body.creative||{}}).select().single();
      if(error)return NextResponse.json({error:error.message},{status:400});
      return NextResponse.json({ad:data});
    }
    return NextResponse.json({error:'UNKNOWN_BILLING_OPERATION'},{status:400});
  } catch { return NextResponse.json({error:'INVALID_REQUEST'},{status:400}); }
}
