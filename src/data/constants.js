/* ---------- キャラクター画像(ケイオスちゃん) ---------- */
export const CHAR = {
  normal: "/images/char-normal.jpg",
  sad: "/images/char-sad.jpg",
  point: "/images/char-point.jpg",
  tired: "/images/char-tired.jpg",
  guard: "/images/char-guard.jpg",
};

/* ---------- デザイントークン(高級感のある統一スタイル) ---------- */
export const UI = {
  btnPrimary:
    "bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50",
  btnGold:
    "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-300 text-slate-900 font-bold rounded-full shadow-lg active:scale-95 transition-all",
  card: "bg-white rounded-2xl shadow-md ring-1 ring-slate-100",
  gold: "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 bg-clip-text text-transparent",
};

/* 8つの状況(expr = ケイオスちゃんの表情キー) */
export const SITUATIONS = [
  { id: "yelled", title: "怒鳴られている", badge: "緊急", badgeColor: "bg-red-500", expr: "sad",
    emoji: "😤", tint: "bg-gradient-to-br from-red-100 to-rose-50",
    desc: "強い口調や理不尽な言葉に対する対応",
    phrases: ["ご不快な思いをさせてしまい、大変申し訳ございません。", "まずはお客様のお話を、最後までしっかり伺わせてください。", "状況を確認のうえ、できる限りの対応をさせていただきます。"],
    steps: ["お客様の話を最後まで聞く", "気持ちに共感を示す", "事実関係を確認する", "解決策・代替案を提案する"],
    caution: "反論せず、まず感情を受け止めます。身の危険を感じたらその場を離れ、応援を呼んでください。" },
  { id: "unreasonable", title: "無理な要求をされている", badge: "注意", badgeColor: "bg-amber-500", expr: "point",
    emoji: "🚫", tint: "bg-gradient-to-br from-amber-100 to-yellow-50",
    desc: "対応が難しい要求や過剰な要望への対応",
    phrases: ["ご要望には可能な限り対応いたします。", "そのご要望にはお応えしかねますが、代替案をご提案いたします。", "当社の規定に基づき、対応させていただきます。"],
    steps: ["要求内容を正確に確認する", "できること・できないことを明確に伝える", "代替案を提示する", "やり取りを記録に残す"],
    caution: "その場での安易な約束は禁物です。判断に迷う内容は必ず上司へ確認します。" },
  { id: "detained", title: "長時間拘束されている", badge: "注意", badgeColor: "bg-blue-500", expr: "tired",
    emoji: "⏰", tint: "bg-gradient-to-br from-blue-100 to-sky-50",
    desc: "長時間のクレームや不当な拘束への対応",
    phrases: ["恐れ入りますが、他のお客様の対応もございますため、お時間を区切らせていただきます。", "この件は責任者に引き継ぎ、改めてご連絡させていただきます。", "本日伺った内容は、責任をもって社内で共有いたします。"],
    steps: ["対応時間の目安を伝える", "同僚・上司に合図して交代や同席を依頼", "引き継ぎ・後日回答に切り替える"],
    caution: "長時間の拘束は業務妨害にあたる場合があります。1人で抱え込まず必ず交代してください。" },
  { id: "dogeza", title: "土下座を要求されている", badge: "警戒", badgeColor: "bg-purple-500", expr: "guard",
    emoji: "⚠️", tint: "bg-gradient-to-br from-purple-100 to-violet-50",
    desc: "屈辱的・非人道的な要求への対応",
    phrases: ["誠意をもって謝罪いたしますが、そのようなご要望にはお応えいたしかねます。", "これ以上のご要求が続く場合、しかるべき対応を取らせていただきます。"],
    steps: ["明確に、しかし冷静に拒否する", "必ず複数人で対応する", "日時・発言を記録する", "悪質な場合は警察・弁護士へ相談"],
    caution: "土下座の強要は強要罪(刑法223条)にあたる可能性があります。応じる必要は一切ありません。" },
  { id: "apology", title: "謝罪を強く求められる", badge: "サポート", badgeColor: "bg-slate-500", expr: "point",
    emoji: "🙏", tint: "bg-gradient-to-br from-slate-100 to-gray-50",
    desc: "過度な謝罪要求への適切な対応",
    phrases: ["ご不快な思いをおかけした点について、お詫び申し上げます。", "事実関係を確認のうえ、必要な対応を誠実に行わせていただきます。"],
    steps: ["何に対する謝罪かを明確にする", "事実と感情を切り分ける", "謝罪の範囲を限定して伝える"],
    caution: "全面的な非を認める発言は避け、「不快にさせたこと」への謝罪に留めるのが基本です。" },
  { id: "family", title: "家族対応で困っている", badge: "サポート", badgeColor: "bg-teal-500", expr: "normal",
    emoji: "👨‍👩‍👧", tint: "bg-gradient-to-br from-teal-100 to-emerald-50",
    desc: "ご家族からの要望・苦情への対応",
    phrases: ["ご家族としてご心配なお気持ち、よくわかります。", "経緯をご説明のうえ、今後の対応を一緒に確認させてください。", "いただいたご意見は、担当者・責任者に必ず共有いたします。"],
    steps: ["不安・心配の気持ちに共感する", "経緯を丁寧に説明する", "今後の対応と連絡方法を約束する"],
    caution: "本人とご家族で意向が異なる場合があります。個人情報の取り扱いにも注意してください。" },
  { id: "money", title: "金銭補償を求められる", badge: "警戒", badgeColor: "bg-orange-500", expr: "guard",
    emoji: "💰", tint: "bg-gradient-to-br from-orange-100 to-amber-50",
    desc: "金銭・補償要求への対応",
    phrases: ["補償に関しては、私の一存ではお答えいたしかねます。", "責任者と確認のうえ、改めて正式にご回答させていただきます。"],
    steps: ["その場で金額や補償を約束しない", "要求内容を正確に記録する", "上司・本部へ即時報告する"],
    caution: "不当な金銭要求は恐喝にあたる可能性があります。個人判断での支払いは絶対にしないでください。" },
  { id: "sns", title: "SNS投稿をほのめかされる", badge: "警戒", badgeColor: "bg-indigo-500", expr: "point",
    emoji: "📱", tint: "bg-gradient-to-br from-indigo-100 to-blue-50",
    desc: "「ネットに書くぞ」等の圧力への対応",
    phrases: ["投稿はお客様のご判断ですが、事実と異なる内容につきましては、対応を検討させていただきます。", "本件は真摯に受け止め、社内で確認のうえ誠実に対応いたします。"],
    steps: ["脅しに動揺せず、冷静に対応する", "発言内容を正確に記録する", "上司・広報担当に共有する"],
    caution: "投稿を恐れて不当な要求に応じないこと。虚偽の投稿は法的措置の対象になり得ます。" },
];

/* 研修シナリオ(共通) */
export const SCENARIOS = [
  { id: "kaigo", title: "介護施設でのクレーム対応", desc: "ケアプラン変更に不満を持つご家族への対応", time: "約10分",
    opening: "ちょっと、どうしてうちの母のケアプランを勝手に変更したんですか?説明もなく、納得できません!" },
  { id: "service", title: "サービス提供時のトラブル対応", desc: "サービス内容に対するご指摘への対応", time: "約8分",
    opening: "頼んでいた内容と全然違うじゃないですか。どうしてくれるんですか?" },
  { id: "murinan", title: "理不尽な要求への対応", desc: "過剰な要求やクレームへの適切な対応", time: "約9分",
    opening: "責任者を今すぐ出しなさい!誠意を見せるなら今日中に自宅まで謝罪に来るのが筋でしょう!" },
];

export const LEVELS = [
  { id: "beginner", label: "初級", desc: "基本的な対応を練習したい方", color: "bg-emerald-50 border-emerald-400 text-emerald-700" },
  { id: "intermediate", label: "中級", desc: "実践的な対応を身につけたい方", color: "bg-amber-50 border-amber-400 text-amber-700" },
  { id: "advanced", label: "上級", desc: "複雑なケースに備えたい方", color: "bg-red-50 border-red-400 text-red-700" },
];

export const STATUS = {
  open: { label: "対応中", color: "bg-amber-100 text-amber-700" },
  resolved: { label: "解決済", color: "bg-emerald-100 text-emerald-700" },
  pending: { label: "未対応", color: "bg-red-100 text-red-600" },
};

/* 業種別モード:AIの言葉遣い・研修シナリオが業種特化に切り替わる */
export const INDUSTRIES = [
  { id: "general", label: "共通", icon: "🏢", ctx: "", scenario: null },
  { id: "kaigo", label: "介護・福祉", icon: "🤝", ctx: "介護・福祉施設(ご利用者様・ご家族への対応)",
    scenario: { id: "ind-kaigo", title: "ご家族からのケア内容クレーム", desc: "ケア内容に不安・不満を持つご家族への対応", time: "約10分",
      opening: "最近、母の様子がおかしいんです。ちゃんと見てくれてるんですか?何かあったらどう責任を取るつもりですか!" } },
  { id: "hospital", label: "病院・クリニック", icon: "🏥", ctx: "病院・クリニック(患者様・ご家族への対応)",
    scenario: { id: "ind-hosp", title: "待ち時間へのクレーム対応", desc: "長い待ち時間に怒る患者様への対応", time: "約8分",
      opening: "もう2時間も待ってるんですけど!予約の意味あるんですか?こっちは体調が悪いのに、どういう管理してるんですか!" } },
  { id: "hotel", label: "ホテル・宿泊", icon: "🏨", ctx: "ホテル・宿泊施設(宿泊のお客様への対応)",
    scenario: { id: "ind-hotel", title: "客室内容の相違クレーム", desc: "予約内容と部屋が違うと主張するお客様への対応", time: "約9分",
      opening: "予約した部屋と違うじゃないですか。眺望付きって書いてあったのに壁しか見えない。どういうことですか?" } },
  { id: "food", label: "飲食・小売", icon: "🍽️", ctx: "飲食店・小売店(来店のお客様への対応)",
    scenario: { id: "ind-food", title: "商品・料理へのクレーム対応", desc: "商品への強い不満を訴えるお客様への対応", time: "約8分",
      opening: "この料理に髪の毛が入ってたんだけど!信じられない。責任者を呼んでください!" } },
];

/* AIプロンプトに業種の文脈を注入するヘルパー */
export const indCtx = (ind) =>
  ind && ind.id !== "general"
    ? `\n業種コンテキスト:${ind.ctx}。この業種の現場に合った言葉遣い・具体例で回答すること。`
    : "";
