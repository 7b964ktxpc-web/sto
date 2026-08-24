import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

const allowedStatuses = new Set(['active', 'pending', 'suspended', 'rejected']);

export async function PATCH(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  try {
    const body = await request.json();
    const id = String(body.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'BUSINESS_ID_REQUIRED' }, { status: 400 });

    const patch: Record<string, unknown> = {};
    for (const key of ['name', 'phone', 'description']) {
      if (key in body) patch[key] = body[key] === null ? null : String(body[key]).trim();
    }
    if ('status' in body) {
      const status = String(body.status);
      if (!allowedStatuses.has(status)) return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
      patch.status = status;
    }
    const address = 'address' in body ? (body.address === null ? null : String(body.address).trim()) : undefined;
    if (!Object.keys(patch).length && address === undefined) return NextResponse.json({ error: 'NOTHING_TO_UPDATE' }, { status: 400 });

    const db = getAdminClient();
    const { data: before, error: beforeError } = await db.from('businesses').select('id,name,phone,description,status,owner_user_id').eq('id', id).maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) return NextResponse.json({ error: 'BUSINESS_NOT_FOUND' }, { status: 404 });

    const { data: beforeLocation, error: locationReadError } = await db.from('business_locations').select('id,address').eq('business_id', id).maybeSingle();
    if (locationReadError) throw locationReadError;

    let after = before;
    if (Object.keys(patch).length) {
      const { data: updated, error } = await db.from('businesses').update(patch).eq('id', id).select('id,name,slug,status,rating,reviews_count,phone,description,owner_user_id,created_at').single();
      if (error) throw error;
      after = updated;
    }

    let afterLocation = beforeLocation;
    if (address !== undefined) {
      if (beforeLocation) {
        const { data: updatedLocation, error } = await db.from('business_locations').update({ address }).eq('id', beforeLocation.id).select('id,address').single();
        if (error) throw error;
        afterLocation = updatedLocation;
      } else if (address) {
        const { data: createdLocation, error } = await db.from('business_locations').insert({ business_id: id, address, lat: 0, lng: 0 }).select('id,address').single();
        if (error) throw error;
        afterLocation = createdLocation;
      }
    }

    await db.from('audit_logs').insert({
      actor_user_id: auth.user.id,
      business_id: id,
      action: 'ADMIN_BUSINESS_UPDATE',
      entity_type: 'business',
      entity_id: id,
      before_data: { business: before, location: beforeLocation },
      after_data: { business: after, location: afterLocation },
    });

    return NextResponse.json({ business: { ...after, address: afterLocation?.address ?? null } });
  } catch (error) {
    console.error('admin business update', error);
    return NextResponse.json({ error: 'Не удалось сохранить СТО' }, { status: 503 });
  }
}
