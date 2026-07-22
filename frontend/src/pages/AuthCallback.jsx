import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase.js';

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

    const exchange = httpsCallable(functions, 'exchangeInstagramCode');
    exchange({ code, redirectUri: import.meta.env.VITE_META_OAUTH_REDIRECT_URI })
      .then(({ data }) => signInWithCustomToken(auth, data.firebaseToken))
      .then(() => navigate('/', { replace: true }))
      .catch((err) => setError(err.message ?? 'Something went wrong connecting your account.'));
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
