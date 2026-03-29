import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        const meta = data.user.user_metadata
        await supabase.from('profiles').insert({
          id: data.user.id,
          username: meta.email?.split('@')[0] + '_' + Math.random().toString(36).slice(2, 6),
          full_name: meta.full_name || meta.name || '',
          avatar_url: meta.avatar_url || meta.picture || null,
          email: data.user.email,
        })
      }
      return NextResponse.redirect(`${origin}/feed`)
    }
  }
  return NextResponse.redirect(`${origin}/?error=auth`)
}
