import type { PlayerCardStyle } from "@bodobako/shared";
import { signOut as firebaseSignOut, onIdTokenChanged, signInWithPopup, type User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth, googleProvider } from "../lib/firebase";
import { API_BASE } from "../lib/socket";

interface UserProfile {
  displayName: string;
  friendCode: string;
  photoURL?: string;
  cardStyle?: PlayerCardStyle;
  favoriteGames?: string[];
}

interface AuthContextValue {
  firebaseUser: User | null;
  idToken: string | null;
  isAuthLoading: boolean;
  /** UserRegistry に保存されたアプリ独自の表示名 */
  appDisplayName: string | null;
  /** ユーザー固有のフレンドコード（認証済みのみ） */
  friendCode: string | null;
  /** カスタムアバター画像URL（R2にアップロード済み） */
  profilePhotoURL: string | null;
  isProfileLoading: boolean;
  /** プレイヤーカードスタイル */
  cardStyle: PlayerCardStyle | null;
  /** お気に入りゲームIDリスト */
  favoriteGames: string[];
  /** ゲームのお気に入りをトグル（ログイン必須） */
  toggleFavorite: (gameId: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  updateCardStyle: (style: PlayerCardStyle) => Promise<void>;
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
  const [profilePhotoURL, setProfilePhotoURL] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [cardStyle, setCardStyle] = useState<PlayerCardStyle | null>(null);
  const [favoriteGames, setFavoriteGames] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("favoriteGames") ?? "[]") as string[];
    } catch {
      return [];
    }
  });

  function applyProfile(profile: UserProfile) {
    setAppDisplayName(profile.displayName);
    setFriendCode(profile.friendCode || null);
    setProfilePhotoURL(profile.photoURL ? `${profile.photoURL}?v=${Date.now()}` : null);
    setCardStyle(profile.cardStyle ?? null);
    const favs = profile.favoriteGames ?? [];
    setFavoriteGames(favs);
    localStorage.setItem("favoriteGames", JSON.stringify(favs));
  }

  // Firebase トークンの自動更新に対応するため onIdTokenChanged を使う
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
        // プロフィールを UserRegistry から取得
        setIsProfileLoading(true);
        try {
          const res = await fetch(`${API_BASE}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const existing = await res.json() as UserProfile;
            applyProfile(existing);
          } else if (res.status === 404) {
            // 未登録 → Google 表示名・photoURL をデフォルトとして登録
            const defaultName = user.displayName?.slice(0, 20) ?? "ゲスト";
            const putRes = await fetch(`${API_BASE}/users/me`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ displayName: defaultName, photoURL: user.photoURL ?? "" }),
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
        setProfilePhotoURL(null);
        setCardStyle(null);
        setFavoriteGames([]);
        localStorage.removeItem("favoriteGames");
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
    const res = await fetch(`${API_BASE}/users/me`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error ?? "表示名の更新に失敗しました");
    }
    const data = await res.json() as UserProfile;
    applyProfile(data);
  }, [idToken]);

  const updateAvatar = useCallback(async (file: File) => {
    if (!idToken) throw new Error("ログインが必要です");
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch(`${API_BASE}/users/me/avatar`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error ?? "アバターの更新に失敗しました");
    }
    const data = await res.json() as { photoURL: string };
    // サーバーが ?v=timestamp 付きURLを返すのでそのまま使用（二重付与を防ぐ）
    setProfilePhotoURL(data.photoURL);
  }, [idToken]);

  const deleteAvatar = useCallback(async () => {
    if (!idToken) throw new Error("ログインが必要です");
    const res = await fetch(`${API_BASE}/users/me/avatar`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error ?? "アバターの削除に失敗しました");
    }
    setProfilePhotoURL(null);
  }, [idToken]);

  const updateCardStyle = useCallback(async (style: PlayerCardStyle) => {
    if (!idToken) throw new Error("ログインが必要です");
    const res = await fetch(`${API_BASE}/users/me/card-style`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(style),
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error ?? "カードスタイルの更新に失敗しました");
    }
    const data = await res.json() as { cardStyle: PlayerCardStyle };
    setCardStyle(data.cardStyle);
  }, [idToken]);

  const toggleFavorite = useCallback(async (gameId: string) => {
    if (!idToken) return;
    const prev = favoriteGames;
    const next = prev.includes(gameId)
      ? prev.filter((id) => id !== gameId)
      : [...prev, gameId];
    // オプティミスティック更新
    setFavoriteGames(next);
    localStorage.setItem("favoriteGames", JSON.stringify(next));
    try {
      const res = await fetch(`${API_BASE}/users/me/favorites`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ gameIds: next }),
      });
      if (!res.ok) {
        // ロールバック
        setFavoriteGames(prev);
        localStorage.setItem("favoriteGames", JSON.stringify(prev));
      }
    } catch {
      // ロールバック
      setFavoriteGames(prev);
      localStorage.setItem("favoriteGames", JSON.stringify(prev));
    }
  }, [idToken, favoriteGames]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        idToken,
        isAuthLoading,
        appDisplayName,
        friendCode,
        profilePhotoURL,
        isProfileLoading,
        cardStyle,
        favoriteGames,
        toggleFavorite,
        signInWithGoogle,
        signOut,
        updateDisplayName,
        updateAvatar,
        deleteAvatar,
        updateCardStyle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
