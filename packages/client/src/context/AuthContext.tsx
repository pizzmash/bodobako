import { onIdTokenChanged, signInWithPopup, signOut as firebaseSignOut, type User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { auth, googleProvider } from "../lib/firebase";
import { API_BASE } from "../lib/socket";

interface UserProfile {
  displayName: string;
  friendCode: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  idToken: string | null;
  isAuthLoading: boolean;
  /** UserRegistry に保存されたアプリ独自の表示名 */
  appDisplayName: string | null;
  /** ユーザー固有のフレンドコード（認証済みのみ） */
  friendCode: string | null;
  isProfileLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [appDisplayName, setAppDisplayName] = useState<string | null>(null);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const firebaseUserRef = useRef<User | null>(null);

  function applyProfile(profile: UserProfile) {
    setAppDisplayName(profile.displayName);
    setFriendCode(profile.friendCode || null);
  }

  // Firebase トークンの自動更新に対応するため onIdTokenChanged を使う
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      firebaseUserRef.current = user;
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
        const photoURL = user.photoURL ?? "";
        // プロフィールを UserRegistry から取得（photoURL も常に同期）
        setIsProfileLoading(true);
        try {
          const res = await fetch(`${API_BASE}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            // 既存ユーザー: photoURL を最新化するため PUT で上書き
            const existing = await res.json() as UserProfile;
            const putRes = await fetch(`${API_BASE}/users/me`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ displayName: existing.displayName, photoURL }),
            });
            applyProfile(putRes.ok ? await putRes.json() as UserProfile : existing);
          } else if (res.status === 404) {
            // 未登録 → Google 表示名をデフォルトとして登録
            const defaultName = user.displayName?.slice(0, 20) ?? "ゲスト";
            const putRes = await fetch(`${API_BASE}/users/me`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ displayName: defaultName, photoURL }),
            });
            if (putRes.ok) applyProfile(await putRes.json() as UserProfile);
          }
        } catch {
          // ネットワークエラー等は無視（匿名でも続行できる）
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        setIdToken(null);
        setAppDisplayName(null);
        setFriendCode(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
    // onIdTokenChanged が自動的に発火してトークン・プロフィールが更新される
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    if (!idToken) throw new Error("ログインが必要です");
    const photoURL = firebaseUserRef.current?.photoURL ?? "";
    const res = await fetch(`${API_BASE}/users/me`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name, photoURL }),
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error ?? "表示名の更新に失敗しました");
    }
    const data = await res.json() as UserProfile;
    applyProfile(data);
  }, [idToken]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        idToken,
        isAuthLoading,
        appDisplayName,
        friendCode,
        isProfileLoading,
        signInWithGoogle,
        signOut,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
