import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) throw new Error('Not authenticated');

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: caller.id, _role: 'admin' });
    if (!isAdmin) throw new Error('Not authorized');

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { email, password, full_name, role } = body;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createError) throw createError;

      // Update profile name
      await supabase.from('profiles').update({ full_name }).eq('id', newUser.user.id);

      // Assign role
      if (role) {
        await supabase.from('user_roles').insert({ user_id: newUser.user.id, role });
      }

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const { user_id } = body;
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reset_password') {
      const { user_id, new_password } = body;
      const { error } = await supabase.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
