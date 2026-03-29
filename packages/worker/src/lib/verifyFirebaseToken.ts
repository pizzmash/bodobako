import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export interface VerifiedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  /** Google アカウントのプロフィール画像URL（Firebase JWT の picture クレーム） */
  picture?: string;
}

const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

export async function verifyFirebaseToken(
  idToken: string,
  projectId: string
): Promise<VerifiedFirebaseToken | null> {
  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });

    const uid = payload.sub;
    if (!uid) return null;

    return {
      uid,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  } catch {
    return null;
  }
}
