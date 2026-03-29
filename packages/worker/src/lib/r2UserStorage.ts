const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateFriendCode(): string {
  return Array.from({ length: 8 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

export function canInviteWithFriendRelations(
  inviterFollowsInvited: boolean,
  invitedFollowsInviter: boolean,
): boolean {
  return inviterFollowsInvited && invitedFollowsInviter;
}

import type { PlayerCardStyle } from "@bodobako/shared";

export interface R2UserProfile {
  uid: string;
  displayName: string;
  friendCode: string;
  photoURL: string;
  cardStyle?: PlayerCardStyle;
  favoriteGames?: string[];
  createdAt: number;
  updatedAt: number;
}

interface R2FollowList {
  uids: string[];
  updatedAt: number;
}

export interface R2Invite {
  inviteId: string;
  inviterUid: string;
  inviterName: string;
  roomCode: string;
  gameId: string;
  status: "unread" | "read";
  createdAt: number;
  readAt: number | null;
}

interface R2InviteList {
  invites: R2Invite[];
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------
const profileKey = (uid: string) => `users/${uid}/profile.json`;
const avatarKey = (uid: string) => `users/${uid}/avatar`;
const followingKey = (uid: string) => `users/${uid}/following.json`;
const followersKey = (uid: string) => `users/${uid}/followers.json`;
const invitesKey = (uid: string) => `users/${uid}/invites.json`;
const friendCodeKey = (code: string) => `friendcodes/${code}`;

const INVITE_RETENTION_MS = 1000 * 60 * 60;
const INVITE_MAX_PER_USER = 200;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function compactInvites(invites: R2Invite[], now: number): R2Invite[] {
  const expireBefore = now - INVITE_RETENTION_MS;
  const filtered = invites.filter((inv) => inv.createdAt >= expireBefore);
  filtered.sort((a, b) => b.createdAt - a.createdAt);
  return filtered.slice(0, INVITE_MAX_PER_USER);
}

/**
 * R2のetagを使った楽観的ロック。updaterを適用した結果をPUTし、
 * 競合(412)が発生した場合はmaxRetriesまでリトライする。
 */
async function updateWithOptimisticLock<T>(
  bucket: R2Bucket,
  key: string,
  updater: (current: T | null) => T,
  maxRetries = 5,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    const obj = await bucket.get(key);
    const etag = obj?.etag ?? null;
    const current = obj ? await obj.json<T>() : null;
    const next = updater(current);

    let result: R2Object | null;
    if (etag !== null) {
      result = (await bucket.put(key, JSON.stringify(next), {
        onlyIf: { etagMatches: etag },
      })) as R2Object | null;
    } else {
      // 新規オブジェクト: 無条件PUT（TOCTOU競合は32^8の空間で無視できるレベル）
      result = await bucket.put(key, JSON.stringify(next));
    }

    if (result !== null) return next;
  }
  throw new Error("同時更新の競合が解決できませんでした");
}

/**
 * 新規ユーザー向けにフレンドコードを払い出す。
 * GET→PUTのTOCTOU競合は32^8≒1兆の空間のため許容する。
 */
async function allocateFriendCode(bucket: R2Bucket, uid: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateFriendCode();
    const existing = await bucket.get(friendCodeKey(code));
    if (existing === null) {
      await bucket.put(friendCodeKey(code), uid);
      return code;
    }
  }
  throw new Error("フレンドコード生成に失敗しました");
}

async function checkMutualFollow(bucket: R2Bucket, uidA: string, uidB: string): Promise<boolean> {
  const [aObj, bObj] = await Promise.all([
    bucket.get(followingKey(uidA)),
    bucket.get(followingKey(uidB)),
  ]);
  const aFollowing = aObj ? (await aObj.json<R2FollowList>()).uids : [];
  const bFollowing = bObj ? (await bObj.json<R2FollowList>()).uids : [];
  return aFollowing.includes(uidB) && bFollowing.includes(uidA);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getProfile(bucket: R2Bucket, uid: string): Promise<R2UserProfile | null> {
  const obj = await bucket.get(profileKey(uid));
  if (!obj) return null;
  return obj.json<R2UserProfile>();
}

export async function upsertProfile(
  bucket: R2Bucket,
  uid: string,
  displayName: string,
  photoURL: string,
): Promise<R2UserProfile> {
  const existing = await getProfile(bucket, uid);
  const friendCode = existing?.friendCode ?? (await allocateFriendCode(bucket, uid));

  return updateWithOptimisticLock<R2UserProfile>(bucket, profileKey(uid), (current) => {
    const now = Date.now();
    return {
      uid,
      displayName,
      photoURL,
      friendCode: current?.friendCode ?? friendCode,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
  });
}

export async function putAvatar(
  bucket: R2Bucket,
  uid: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<void> {
  await bucket.put(avatarKey(uid), data, { httpMetadata: { contentType } });
}

export async function getAvatar(
  bucket: R2Bucket,
  uid: string,
): Promise<R2ObjectBody | null> {
  return bucket.get(avatarKey(uid));
}

export async function updateProfilePhotoURL(
  bucket: R2Bucket,
  uid: string,
  photoURL: string,
): Promise<R2UserProfile | null> {
  const existing = await getProfile(bucket, uid);
  if (!existing) return null;
  return updateWithOptimisticLock<R2UserProfile>(bucket, profileKey(uid), (current) => {
    if (!current) return existing;
    return { ...current, photoURL, updatedAt: Date.now() };
  });
}

export async function updateProfileFields(
  bucket: R2Bucket,
  uid: string,
  fields: Partial<Pick<R2UserProfile, "displayName" | "photoURL" | "cardStyle" | "favoriteGames">>,
): Promise<R2UserProfile | null> {
  const existing = await getProfile(bucket, uid);
  if (!existing) return null;
  return updateWithOptimisticLock<R2UserProfile>(bucket, profileKey(uid), (current) => {
    if (!current) return existing;
    return { ...current, ...fields, updatedAt: Date.now() };
  });
}

export async function getProfileByFriendCode(
  bucket: R2Bucket,
  code: string,
): Promise<R2UserProfile | null> {
  const obj = await bucket.get(friendCodeKey(code.toUpperCase()));
  if (!obj) return null;
  const uid = await obj.text();
  return getProfile(bucket, uid);
}

export async function getFollowing(bucket: R2Bucket, uid: string): Promise<R2UserProfile[]> {
  const obj = await bucket.get(followingKey(uid));
  if (!obj) return [];
  const list = await obj.json<R2FollowList>();
  const profiles = await Promise.all(list.uids.map((id) => getProfile(bucket, id)));
  return profiles.filter((p): p is R2UserProfile => p !== null);
}

export async function getFollowers(
  bucket: R2Bucket,
  uid: string,
): Promise<Array<R2UserProfile & { isFollowing: boolean }>> {
  const [followersObj, followingObj] = await Promise.all([
    bucket.get(followersKey(uid)),
    bucket.get(followingKey(uid)),
  ]);
  if (!followersObj) return [];

  const followersList = await followersObj.json<R2FollowList>();
  const myFollowingUids = followingObj ? (await followingObj.json<R2FollowList>()).uids : [];
  const myFollowingSet = new Set(myFollowingUids);

  const profiles = await Promise.all(followersList.uids.map((id) => getProfile(bucket, id)));
  return profiles
    .filter((p): p is R2UserProfile => p !== null)
    .map((p) => ({ ...p, isFollowing: myFollowingSet.has(p.uid) }));
}

export async function addFollow(
  bucket: R2Bucket,
  ownerUid: string,
  friendUid: string,
): Promise<{ alreadyExists: boolean }> {
  let alreadyExists = false;

  await updateWithOptimisticLock<R2FollowList>(bucket, followingKey(ownerUid), (current) => {
    const uids = current?.uids ?? [];
    if (uids.includes(friendUid)) {
      alreadyExists = true;
      return current ?? { uids: [], updatedAt: Date.now() };
    }
    alreadyExists = false;
    return { uids: [friendUid, ...uids], updatedAt: Date.now() };
  });

  if (!alreadyExists) {
    await updateWithOptimisticLock<R2FollowList>(bucket, followersKey(friendUid), (current) => {
      const uids = current?.uids ?? [];
      if (uids.includes(ownerUid)) return current ?? { uids: [], updatedAt: Date.now() };
      return { uids: [ownerUid, ...uids], updatedAt: Date.now() };
    });
  }

  return { alreadyExists };
}

export async function removeFollow(
  bucket: R2Bucket,
  ownerUid: string,
  friendUid: string,
): Promise<void> {
  await Promise.all([
    updateWithOptimisticLock<R2FollowList>(bucket, followingKey(ownerUid), (current) => ({
      uids: (current?.uids ?? []).filter((uid) => uid !== friendUid),
      updatedAt: Date.now(),
    })),
    updateWithOptimisticLock<R2FollowList>(bucket, followersKey(friendUid), (current) => ({
      uids: (current?.uids ?? []).filter((uid) => uid !== ownerUid),
      updatedAt: Date.now(),
    })),
  ]);
}

export async function getInvites(
  bucket: R2Bucket,
  uid: string,
  statusFilter: "unread" | "all",
): Promise<R2Invite[]> {
  const obj = await bucket.get(invitesKey(uid));
  if (!obj) return [];
  const list = await obj.json<R2InviteList>();
  const compacted = compactInvites(list.invites, Date.now());
  return statusFilter === "all"
    ? compacted.slice(0, 50)
    : compacted.filter((inv) => inv.status === "unread").slice(0, 50);
}

export async function addInvites(
  bucket: R2Bucket,
  inviterUid: string,
  inviterName: string,
  roomCode: string,
  gameId: string,
  invitedUids: unknown[],
): Promise<{ created: number; skipped: number }> {
  const normalizedUids = Array.from(
    new Set(
      invitedUids
        .filter((uid): uid is string => typeof uid === "string")
        .map((uid) => uid.trim())
        .filter((uid) => uid.length > 0 && uid !== inviterUid),
    ),
  ).slice(0, 100);

  let created = 0;
  let skipped = 0;
  const now = Date.now();
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const normalizedGameId = gameId.trim();
  const normalizedInviterName = inviterName.trim();

  for (const invitedUid of normalizedUids) {
    const isMutual = await checkMutualFollow(bucket, inviterUid, invitedUid);
    if (!isMutual) {
      skipped++;
      continue;
    }

    const inviteId = crypto.randomUUID();
    const newInvite: R2Invite = {
      inviteId,
      inviterUid,
      inviterName: normalizedInviterName,
      roomCode: normalizedRoomCode,
      gameId: normalizedGameId,
      status: "unread",
      createdAt: now,
      readAt: null,
    };

    await updateWithOptimisticLock<R2InviteList>(bucket, invitesKey(invitedUid), (current) => {
      const existing = current?.invites ?? [];
      // 同じ招待者・同じルームへの未読招待は最新1件に集約
      const deduped = existing.filter(
        (inv) =>
          !(
            inv.inviterUid === inviterUid &&
            inv.roomCode === normalizedRoomCode &&
            inv.status === "unread"
          ),
      );
      return { invites: compactInvites([newInvite, ...deduped], now), updatedAt: now };
    });

    created++;
  }

  return { created, skipped };
}

export async function markInviteRead(
  bucket: R2Bucket,
  uid: string,
  inviteId: string,
): Promise<void> {
  const now = Date.now();
  await updateWithOptimisticLock<R2InviteList>(bucket, invitesKey(uid), (current) => {
    if (!current) return { invites: [], updatedAt: now };
    return {
      invites: current.invites.map((inv) =>
        inv.inviteId === inviteId ? { ...inv, status: "read" as const, readAt: now } : inv,
      ),
      updatedAt: now,
    };
  });
}

// ---------------------------------------------------------------------------
// 移行用: DO → R2 への一括インポート
// ---------------------------------------------------------------------------

export interface DoExportData {
  users: Array<{
    uid: string;
    display_name: string;
    friend_code: string;
    photo_url: string;
    created_at: number;
    updated_at: number;
  }>;
  friends: Array<{ owner_uid: string; friend_uid: string; created_at: number }>;
  invites: Array<{
    invite_id: string;
    invited_uid: string;
    inviter_uid: string;
    inviter_name: string;
    room_code: string;
    game_id: string;
    status: string;
    created_at: number;
    read_at: number | null;
  }>;
}

export async function importFromDo(bucket: R2Bucket, data: DoExportData): Promise<{
  users: number;
  follows: number;
  invites: number;
}> {
  // プロフィールと friendcodes インデックスを書き込む
  const userWrites = data.users.map(async (u) => {
    const profile: R2UserProfile = {
      uid: u.uid,
      displayName: u.display_name,
      friendCode: u.friend_code,
      photoURL: u.photo_url,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
    await Promise.all([
      bucket.put(profileKey(u.uid), JSON.stringify(profile)),
      u.friend_code ? bucket.put(friendCodeKey(u.friend_code), u.uid) : Promise.resolve(),
    ]);
  });

  // 50件ずつ並列処理
  for (let i = 0; i < userWrites.length; i += 50) {
    await Promise.all(userWrites.slice(i, i + 50));
  }

  // following / followers リストを構築
  const followingMap = new Map<string, string[]>();
  const followersMap = new Map<string, string[]>();

  for (const f of data.friends) {
    if (!followingMap.has(f.owner_uid)) followingMap.set(f.owner_uid, []);
    followingMap.get(f.owner_uid)!.push(f.friend_uid);

    if (!followersMap.has(f.friend_uid)) followersMap.set(f.friend_uid, []);
    followersMap.get(f.friend_uid)!.push(f.owner_uid);
  }

  const followWrites: Promise<R2Object | null>[] = [];
  for (const [uid, uids] of followingMap) {
    followWrites.push(
      bucket.put(followingKey(uid), JSON.stringify({ uids, updatedAt: Date.now() })),
    );
  }
  for (const [uid, uids] of followersMap) {
    followWrites.push(
      bucket.put(followersKey(uid), JSON.stringify({ uids, updatedAt: Date.now() })),
    );
  }
  for (let i = 0; i < followWrites.length; i += 50) {
    await Promise.all(followWrites.slice(i, i + 50));
  }

  // 招待リストを構築（ユーザーごとに集約）
  const inviteMap = new Map<string, R2Invite[]>();
  for (const inv of data.invites) {
    if (!inviteMap.has(inv.invited_uid)) inviteMap.set(inv.invited_uid, []);
    inviteMap.get(inv.invited_uid)!.push({
      inviteId: inv.invite_id,
      inviterUid: inv.inviter_uid,
      inviterName: inv.inviter_name,
      roomCode: inv.room_code,
      gameId: inv.game_id,
      status: inv.status === "read" ? "read" : "unread",
      createdAt: inv.created_at,
      readAt: inv.read_at,
    });
  }

  const inviteWrites: Promise<R2Object | null>[] = [];
  for (const [uid, invites] of inviteMap) {
    inviteWrites.push(
      bucket.put(invitesKey(uid), JSON.stringify({ invites, updatedAt: Date.now() })),
    );
  }
  for (let i = 0; i < inviteWrites.length; i += 50) {
    await Promise.all(inviteWrites.slice(i, i + 50));
  }

  return {
    users: data.users.length,
    follows: data.friends.length,
    invites: data.invites.length,
  };
}
