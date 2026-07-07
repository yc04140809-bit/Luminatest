/* ============================================================
   Chaos AI Suite — AI社員一覧(将来拡張用データ)
   status: "available" = 利用可能 / "soon" = 準備中
   ※ avatarUrl は今後キャラクター画像を差し替えるためのプレースホルダー
   ============================================================ */
export const AGENTS = [
  {
    id: "sesshoku",
    name: "接遇ガードAI",
    character: "ケイオスちゃん",
    room: "相談室",
    tagline: "現場を守るAI",
    desc: "カスハラ対応・接遇改善・報告書作成をサポート",
    avatarUrl: "/images/char-normal.jpg",
    status: "available",
  },
  {
    id: "documents",
    name: "書類作成AI",
    character: "ネムリちゃん",
    room: "事務室",
    tagline: "業務文書を自動作成",
    desc: "マニュアル・報告書・提案書などを作成予定",
    avatarUrl: null,
    status: "soon",
  },
  {
    id: "training-material",
    name: "研修資料AI",
    character: "アリアちゃん",
    room: "研修室",
    tagline: "社内研修を自動設計",
    desc: "接遇・クレーム対応・新人教育の研修資料を作成予定",
    avatarUrl: null,
    status: "soon",
  },
  {
    id: "dev-spec",
    name: "開発指示書AI",
    character: "レヴィちゃん",
    room: "開発室",
    tagline: "AI開発用の指示書を作成",
    desc: "Manus・Claude Code・Fable5向け指示書を作成予定",
    avatarUrl: null,
    status: "soon",
  },
  {
    id: "sns",
    name: "SNS投稿AI",
    character: "ミライちゃん",
    room: "広報室",
    tagline: "発信文を自動作成",
    desc: "Threads・X・Instagram・note向け投稿文を作成予定",
    avatarUrl: null,
    status: "soon",
  },
  {
    id: "management",
    name: "経営サポートAI",
    character: "セイラちゃん",
    room: "社長室",
    tagline: "優先順位と収益化を整理",
    desc: "今日やること・収益化アイデアを整理予定",
    avatarUrl: null,
    status: "soon",
  },
];
