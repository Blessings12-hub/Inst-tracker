import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase.js';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('No authorization code returned from Instagram.');
      return;
    }

    async function run() {
      const { data, error: fnError } = await supabase.functions.invoke('exchange-instagram-code', {
        body: { code, redirectUri: import.meta.env.VITE_META_OAUTH_REDIRECT_URI },
      });
      if (fnError) throw fnError;

      const { error: otpError } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.tokenHash,
        type: 'magiclink',
      });
      if (otpError) throw otpError;

      navigate('/', { replace: true });
    }

    run().catch((err) => setError(err.message ?? 'Something went wrong connecting your account.'));
  }, [params, navigate]);

  return (
    <div className="login-screen">
      <div className="card login-card">
        {error ? (
          <>
            <h1>Connection failed</h1>
            <p>{error}</p>
            <a className="btn btn-ghost" href="/login">
              Try again
            </a>
          </>
        ) : (
          <>
            <h1>Connecting your account…</h1>
            <p>Hang tight while we set things up.</p>
          </>
        )}
      </div>
    </div>
  );
}
