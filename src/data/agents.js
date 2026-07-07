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
    desc: "カスハラ対応・接遇改善・報告書作成をAIがサポートします。",
    industries: ["法人", "介護", "医療", "小売", "飲食"],
    avatarUrl: "/images/char-normal.jpg",
    status: "available",
    flagship: true,
  },
  {
    id: "documents",
    name: "書類作成AI",
    character: "ネムリちゃん",
    room: "事務室",
    tagline: "業務文書を自動作成",
    desc: "マニュアル・報告書・提案書などをAIがその場で作成します。",
    avatarUrl: null,
    status: "available",
  },
  {
    id: "training-material",
    name: "研修資料AI",
    character: "アリアちゃん",
    room: "研修室",
    tagline: "社内研修を自動設計",
    desc: "テーマ・業種・目的を入力すると、研修構成からロールプレイ例、確認テストまでAIが作成します。",
    avatarUrl: null,
    status: "available",
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
    desc: "テーマと伝えたい内容を入力すると、Threads・X・Instagram・note向けの投稿文をAIが作成します。",
    avatarUrl: null,
    status: "available",
  },
  {
    id: "management",
    name: "経営サポートAI",
    character: "セイラちゃん",
    room: "社長室",
    tagline: "AI会議室で意思決定を支援",
    desc: "案を入力すると、性格の異なる5人の評議員が忖度なく批評し、セイラちゃんが議長として整理します。",
    avatarUrl: null,
    status: "available",
  },
];
