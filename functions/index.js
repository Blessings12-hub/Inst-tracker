const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const instagram = require('./lib/instagram.js');
const ai = require('./lib/ai.js');

admin.initializeApp();
const db = admin.firestore();

const META_APP_ID = defineSecret('META_APP_ID');
const META_APP_SECRET = defineSecret('META_APP_SECRET');
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// Tokens live in a subcollection so Firestore rules can block client reads
// of it entirely, while the parent user doc (profile info) stays readable.
// See firestore.rules: /users/{uid}/private/{doc} is admin-only.
function privateDoc(uid) {
  return db.collection('users').doc(uid).collection('private').doc('instagram');
}

/**
 * Exchanges the Meta OAuth `code` from the redirect for tokens, resolves the
 * linked Instagram Business/Creator account, and mints a Firebase custom
 * token so the frontend can sign in. This IS the login for inst-tracker —
 * there's no separate email/password step.
 */
exports.exchangeInstagramCode = onCall(
  { secrets: [META_APP_ID, META_APP_SECRET] },
  async (request) => {
    const { code, redirectUri } = request.data;
    if (!code || !redirectUri) {
      throw new HttpsError('invalid-argument', 'Missing code or redirectUri.');
    }

    const appId = META_APP_ID.value();
    const appSecret = META_APP_SECRET.value();

    const shortLivedToken = await instagram.exchangeCodeForToken({
      code,
      redirectUri,
      appId,
      appSecret,
    });
    const longLivedToken = await instagram.getLongLivedToken({
      shortLivedToken,
      appId,
      appSecret,
    });

    const { igUserId, pageId } = await instagram.getInstagramAccountFromPages(longLivedToken);
    const profile = await instagram.getIgProfile(igUserId, longLivedToken);

    // Deterministic uid so the same Instagram account always maps to the
    // same Firebase user, however they arrive at the OAuth flow.
    const uid = `ig_${igUserId}`;

    await admin
      .auth()
      .getUser(uid)
      .catch(() => admin.auth().createUser({ uid }));

    await db.collection('users').doc(uid).set(
      {
        instagramConnected: true,
        igUserId,
        igUsername: profile.username,
        igAccountType: 'Business',
        pageId,
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
        plan: 'free',
        connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await privateDoc(uid).set({
      accessToken: longLivedToken,
      tokenObtainedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Long-lived tokens last ~60 days — refreshInsights() should refresh
      // this before it expires; see TODO below.
    });

    const firebaseToken = await admin.auth().createCustomToken(uid);
    return { firebaseToken };
  }
);

/**
 * Pulls fresh insights for one user and writes them to Firestore in a shape
 * the frontend charts can read directly. Callable on demand from Settings,
 * and also run daily for every connected user (see dailyRefreshAll below).
 */
exports.refreshInsights = onCall({ secrets: [] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  await refreshInsightsForUser(uid);
  return { ok: true };
});

async function refreshInsightsForUser(uid) {
  const userSnap = await db.collection('users').doc(uid).get();
  const user = userSnap.data();
  const tokenSnap = await privateDoc(uid).get();
  const { accessToken } = tokenSnap.data() ?? {};
  if (!user || !accessToken) return;

  const [accountInsights, media] = await Promise.all([
    instagram.getAccountInsights(user.igUserId, accessToken),
    instagram.getRecentMediaWithInsights(user.igUserId, accessToken, 30),
  ]);

  // Top commenters across the last 30 posts.
  const commentCounts = new Map();
  for (const post of media) {
    const comments = await instagram.getComments(post.id, accessToken).catch(() => []);
    for (const c of comments) {
      if (!c.username) continue;
      commentCounts.set(c.username, (commentCounts.get(c.username) ?? 0) + 1);
    }
  }
  const topCommenters = [...commentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, comments]) => ({ username, comments }));

  await db
    .collection('users')
    .doc(uid)
    .collection('insights')
    .doc('latest')
    .set(
      {
        accountInsights,
        media: media.map(({ id, timestamp, like_count, comments_count, insights }) => ({
          id,
          timestamp,
          likeCount: like_count,
          commentsCount: comments_count,
          insights,
        })),
        topCommenters,
        refreshedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

/** Daily refresh for every connected account. Free tier: 30-day rolling window. */
exports.dailyRefreshAll = onSchedule('every day 06:00', async () => {
  const usersSnap = await db.collection('users').where('instagramConnected', '==', true).get();
  for (const doc of usersSnap.docs) {
    await refreshInsightsForUser(doc.id).catch((err) =>
      console.error(`refreshInsights failed for ${doc.id}:`, err.message)
    );
  }
});

exports.disconnectInstagram = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  await db.collection('users').doc(uid).set({ instagramConnected: false }, { merge: true });
  await privateDoc(uid).delete();
  return { ok: true };
});

exports.suggestCaption = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const { topic } = request.data;
  if (!topic) throw new HttpsError('invalid-argument', 'Missing topic.');
  const caption = await ai.suggestCaption(topic);
  return { caption };
});

exports.suggestHashtags = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const { topic } = request.data;
  if (!topic) throw new HttpsError('invalid-argument', 'Missing topic.');
  const hashtags = await ai.suggestHashtags(topic);
  return { hashtags };
});

/**
 * Premium feature. TODO: this only builds the report data — actually
 * emailing it needs a transactional email provider (SendGrid, Postmark, etc).
 * Wire that in before shipping the Premium tier.
 */
exports.weeklyReportAll = onSchedule('every monday 08:00', async () => {
  const usersSnap = await db
    .collection('users')
    .where('instagramConnected', '==', true)
    .where('plan', '==', 'premium')
    .get();

  for (const doc of usersSnap.docs) {
    const insightsSnap = await db.collection('users').doc(doc.id).collection('insights').doc('latest').get();
    // TODO: render insightsSnap.data() into a PDF/HTML email and send it.
    console.log(`Weekly report ready for ${doc.id}`, Boolean(insightsSnap.exists));
  }
});
