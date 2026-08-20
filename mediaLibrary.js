/**
 * mediaLibrary.js — Phase62 Media Library(BGM・壁紙・テーマ管理)
 *
 * 役割: 運営が管理画面(koufuku-ai.html内)から「公開」したBGM/壁紙/
 * テーマの一覧(data/cms/mediaLibrary.json、GitHub Pages経由で全ユーザー
 * へ配信される静的JSON)を取得・キャッシュし、感情に応じたおすすめや
 * 時間帯/季節に応じたテーマ解決などの「読み取り専用ロジック」だけを
 * 提供する、koufuku-ai.htmlから独立した小さなモジュール。
 *
 * 設計方針(将来Firebaseへ移行する際に配信部分だけ差し替えられるよう、
 * 抽象化してある):
 *   - 実際の配信元(今はGitHub Pages上の静的JSON)への依存は
 *     fetchRemoteManifest()の中だけに閉じ込めてある。Firebase Storage/
 *     Firestoreへ移行する場合は、この関数の中身をFirestore SDK呼び出し
 *     へ差し替えるだけでよく、他の関数(キャッシュ/カテゴリ管理/
 *     おすすめ/時間帯・季節解決)は一切変更不要。
 *   - koufuku-ai.html側の既存Engine/Resolver/Memory/UIには一切依存せず、
 *     このファイル単体でも動作する(唯一の外部依存はCmsStore、
 *     オフラインキャッシュの保存先として利用するだけ)。
 *   - このファイルは「データを取得・解決するだけ」で、実際に画面へ
 *     反映する(壁紙を表示する/BGMを鳴らす)処理はkoufuku-ai.html側の
 *     起動演出コードが、このモジュールが返す値を読むだけの形で行う
 *     (=既存のRoom/BGM Engineには一切触れない、完全に独立した経路)。
 */
(function (global) {
  "use strict";

  const PUBLIC_MANIFEST_PATH = "data/cms/mediaLibrary.json";
  const CACHE_CONFIG_ID = "mediaLibraryCache";
  const DEFAULT_MANIFEST = { configVersion: 1, publishedAt: "", bgm: [], wallpaper: [], theme: [] };

  // メモリ上の同期キャッシュ(getKaosuMemorySync()と同じ「起動時に1回
  // 非同期で読み込み、以後は同期で参照するだけ」パターン)。
  let cache = null;

  function cloneDefault() {
    return JSON.parse(JSON.stringify(DEFAULT_MANIFEST));
  }

  function normalizeManifest(raw) {
    if (!raw || typeof raw !== "object") return cloneDefault();
    return {
      configVersion: Number(raw.configVersion) || 1,
      publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : "",
      bgm: Array.isArray(raw.bgm) ? raw.bgm : [],
      wallpaper: Array.isArray(raw.wallpaper) ? raw.wallpaper : [],
      theme: Array.isArray(raw.theme) ? raw.theme : [],
    };
  }

  // ===== 配信元アクセス(将来Firebaseへ差し替える場合はここだけでよい) =====
  async function fetchRemoteManifest() {
    try {
      const res = await fetch(PUBLIC_MANIFEST_PATH + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      return normalizeManifest(json);
    } catch (e) {
      // 未公開(404)/オフライン/JSON不正のいずれでも、呼び出し側が
      // キャッシュへフォールバックできるようnullを返すだけにする
      // (room-config.json等、既存の「JSON未配置でも壊れない」方針と同じ)。
      return null;
    }
  }

  // ===== オフラインキャッシュ(CmsStoreのIndexedDBを流用。既存の
  // memory/resolverRules等とは完全に独立した新しいidのため、既存Memory
  // 構造には一切影響しない) =====
  async function readCache() {
    try {
      if (typeof CmsStore === "undefined") return null;
      const record = await CmsStore.getConfig(CACHE_CONFIG_ID);
      if (record && record.data) return normalizeManifest(record.data);
    } catch (e) { /* IndexedDB未対応/エラー時はnullのまま */ }
    return null;
  }
  async function writeCache(manifest) {
    try {
      if (typeof CmsStore === "undefined") return;
      await CmsStore.putConfig(CACHE_CONFIG_ID, manifest);
    } catch (e) { /* 保存できなくても致命的ではない */ }
  }

  // ===== 初回起動時の同期: 配信元→失敗ならキャッシュ→それも無ければ
  // 既定値(空)、の順にフォールバックする。成功時は必ずキャッシュを
  // 更新し、次回オフライン時に備える。 =====
  async function syncAndCache() {
    const remote = await fetchRemoteManifest();
    if (remote) {
      cache = remote;
      await writeCache(remote);
      return cache;
    }
    const cached = await readCache();
    cache = cached || cloneDefault();
    return cache;
  }

  function getCachedSync() {
    return cache || DEFAULT_MANIFEST;
  }

  function isPublished(item) {
    return !!item && item.enabled !== false;
  }

  function getBgmList() { return getCachedSync().bgm.filter(isPublished); }
  function getWallpaperList() { return getCachedSync().wallpaper.filter(isPublished); }
  function getThemeList() { return getCachedSync().theme.filter(isPublished); }

  function findByCategory(list, category) {
    if (!category) return null;
    return list.find((it) => it && String(it.category || "").toLowerCase() === String(category).toLowerCase()) || null;
  }

  /* ===== ⑤ AIおすすめ =====
     Emotion(既存のkaosuClassifyMoodFromText等が使う語彙とは別に、
     Media Library独自の4つの大分類: happy/sad/relax/focus)から、
     おすすめのBGM/壁紙/テーマのカテゴリを引く。指示書の例
     (Happy→朝→ピアノ、Sad→雨→夜景、Relax→森林→環境音、Focus→Lo-fi)
     を「壁紙カテゴリ + BGMカテゴリ」のペアとして解釈した。実際に一致
     する公開済みアイテムが無ければ、無理に何かを返さずnullのままにする
     (捏造しない、既存のMemory Recall等と同じ方針)。 */
  const EMOTION_MEDIA_MAP = {
    happy: { wallpaperCategory: "morning", bgmCategory: "piano" },
    sad: { wallpaperCategory: "rain", bgmCategory: "night" },
    relax: { wallpaperCategory: "forest", bgmCategory: "ambient" },
    focus: { wallpaperCategory: "lofi", bgmCategory: "lofi" },
  };
  function recommendForEmotion(emotion) {
    const mapping = EMOTION_MEDIA_MAP[String(emotion || "").toLowerCase()];
    if (!mapping) return { bgm: null, wallpaper: null };
    return {
      bgm: findByCategory(getBgmList(), mapping.bgmCategory),
      wallpaper: findByCategory(getWallpaperList(), mapping.wallpaperCategory),
    };
  }

  /* ===== ⑥ Daily Cycle連携 =====
   * 朝/昼/夕方/夜/深夜の5バンド(既存のgetRoomVisualBand()と同じ時刻
   * 境界だが、このファイル単体で完結させるため独立して定義する)から、
   * timeBandフィールドが一致するテーマを返す。一致するテーマが無ければ
   * null。 */
  function resolveTimeBand(now) {
    const h = (now || new Date()).getHours();
    if (h >= 5 && h <= 10) return "morning";
    if (h >= 11 && h <= 15) return "day";
    if (h >= 16 && h <= 17) return "evening";
    if (h >= 18 && h <= 23) return "night";
    return "midnight";
  }
  function resolveTimeBandTheme(now) {
    const band = resolveTimeBand(now);
    return getThemeList().find((t) => t && t.timeBand === band) || null;
  }

  /* ===== ⑦ 季節イベント =====
   * 気象学的季節(3-5月=春...、既存のgetKaosuSeasonBand()と同じ境界)に
   * 加え、クリスマス/ハロウィン/お正月の期間中はそちらを優先する。 */
  function resolveSeasonBand(now) {
    const month = (now || new Date()).getMonth() + 1;
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  }
  function resolveActiveSeasonalEvent(now) {
    const d = now || new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    if (month === 12 && day >= 20 && day <= 26) return "christmas";
    if (month === 10 && day >= 25 && day <= 31) return "halloween";
    if (month === 1 && day >= 1 && day <= 3) return "newyear";
    return null;
  }
  function resolveSeasonalPriorityTheme(now) {
    const eventKey = resolveActiveSeasonalEvent(now);
    if (eventKey) {
      const eventTheme = getThemeList().find((t) => t && t.season === eventKey);
      if (eventTheme) return eventTheme;
    }
    const seasonKey = resolveSeasonBand(now);
    return getThemeList().find((t) => t && t.season === seasonKey) || null;
  }

  /* 起動演出(⑧)用: 公開済みの壁紙・BGMから1件ずつ選ぶ。季節優先
   * テーマがあればそちらの壁紙/BGM参照を、無ければ公開リストの先頭を
   * 使う(=常に「何かしら」を選ぼうとするが、公開アイテムが1つも
   * 無ければ両方nullを返し、呼び出し側は無音・無壁紙のまま何もしない
   * =既存の起動シーケンスに影響を与えない)。 */
  function pickBootMedia(now) {
    const wallpapers = getWallpaperList();
    const bgms = getBgmList();
    if (!wallpapers.length && !bgms.length) return { wallpaper: null, bgm: null };
    const seasonalTheme = resolveSeasonalPriorityTheme(now) || resolveTimeBandTheme(now);
    let wallpaper = null;
    let bgm = null;
    // 他モジュールを参照する既存の管理画面の慣習(dynamicSelectはidでは
    // なくlabelを参照値にする)に合わせ、テーマ側もwallpaper/bgmを
    // ラベル文字列で参照する。
    if (seasonalTheme) {
      wallpaper = wallpapers.find((w) => w.label === seasonalTheme.wallpaper) || null;
      bgm = bgms.find((b) => b.label === seasonalTheme.bgm) || null;
    }
    if (!wallpaper) wallpaper = wallpapers[0] || null;
    if (!bgm) bgm = bgms[0] || null;
    return { wallpaper, bgm };
  }

  global.KaosuMediaLibrary = {
    PUBLIC_MANIFEST_PATH,
    syncAndCache,
    getCachedSync,
    getBgmList,
    getWallpaperList,
    getThemeList,
    recommendForEmotion,
    resolveTimeBand,
    resolveTimeBandTheme,
    resolveSeasonBand,
    resolveActiveSeasonalEvent,
    resolveSeasonalPriorityTheme,
    pickBootMedia,
    // テスト/管理画面から直接JSONの形を検証したい場合用に公開しておく。
    normalizeManifest,
  };
})(typeof window !== "undefined" ? window : globalThis);
