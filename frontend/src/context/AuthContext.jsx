import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null); // public.profiles row

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (!cancelled) setProfile(data);
    }
    load();

    // Keep the profile fresh if an Edge Function updates it mid-session.
    const channel = supabase
      .channel(`profiles-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session]);

  const value = {
    user: session?.user ?? null,
    profile,
    loading: session === undefined,
    isInstagramConnected: Boolean(profile?.instagram_connected),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
