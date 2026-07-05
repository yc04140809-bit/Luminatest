import { supabase } from "./supabaseClient";

/* ============================================================
   Supabaseデータアクセス層
   - 個人データ(records / scores / user_settings)は行単位で管理
   - shared_cases は全利用者共通(追記のみ・そのまま一覧表示)
   ============================================================ */

/* ---------- 対応記録(records) ---------- */
export async function fetchRecords(userId) {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });
  if (error) {
    console.error("fetchRecords failed:", error);
    return [];
  }
  return (data || []).map(rowToRecord);
}
function rowToRecord(row) {
  return {
    id: row.id,
    date: row.occurred_at,
    situation: row.situation || "",
    place: row.place || "",
    person: row.person || "",
    staff: row.staff || "",
    content: row.content || "",
    result: row.result || "",
    status: row.status || "open",
  };
}
export async function insertRecord(userId, rec) {
  const { data, error } = await supabase
    .from("records")
    .insert({
      user_id: userId,
      occurred_at: rec.date,
      situation: rec.situation,
      place: rec.place,
      person: rec.person,
      staff: rec.staff,
      content: rec.content,
      result: rec.result,
      status: rec.status,
    })
    .select()
    .single();
  if (error) {
    console.error("insertRecord failed:", error);
    return null;
  }
  return rowToRecord(data);
}
export async function updateRecordStatus(id, status) {
  const { error } = await supabase.from("records").update({ status }).eq("id", id);
  if (error) console.error("updateRecordStatus failed:", error);
  return !error;
}
export async function deleteRecord(id) {
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) console.error("deleteRecord failed:", error);
  return !error;
}

/* ---------- 研修スコア(scores) ---------- */
export async function fetchScores(userId) {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("fetchScores failed:", error);
    return [];
  }
  return (data || []).map((r) => ({ id: r.id, date: r.occurred_at, scenario: r.scenario, level: r.level, score: r.score }));
}
export async function insertScore(userId, entry) {
  const { data, error } = await supabase
    .from("scores")
    .insert({ user_id: userId, occurred_at: entry.date, scenario: entry.scenario, level: entry.level, score: entry.score })
    .select()
    .single();
  if (error) {
    console.error("insertScore failed:", error);
    return null;
  }
  return { id: data.id, date: data.occurred_at, scenario: data.scenario, level: data.level, score: data.score };
}

/* ---------- ユーザー設定(user_settings:1ユーザー1行) ---------- */
const DEFAULT_SETTINGS = {
  user_name: "",
  industry: "general",
  sos_name: "",
  sos_phone: "",
  onboarded: false,
  daily: { streak: 0, lastAnsweredDate: "", quizDate: "", quiz: null, answered: null },
};

export async function fetchSettings(userId) {
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("fetchSettings failed:", error);
    return { ...DEFAULT_SETTINGS };
  }
  if (!data) {
    // 初回ログイン:デフォルト行を作成
    const { data: created, error: insErr } = await supabase
      .from("user_settings")
      .insert({ user_id: userId, ...DEFAULT_SETTINGS })
      .select()
      .single();
    if (insErr) {
      console.error("create default settings failed:", insErr);
      return { ...DEFAULT_SETTINGS };
    }
    return created;
  }
  return data;
}
export async function updateSettings(userId, patch) {
  const { data, error } = await supabase
    .from("user_settings")
    .update(patch)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) {
    console.error("updateSettings failed:", error);
    return null;
  }
  return data;
}

/* ---------- みんなのケース共有(shared_cases:全ユーザー共通・追記のみ) ---------- */
export async function fetchSharedCases() {
  const { data, error } = await supabase
    .from("shared_cases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("fetchSharedCases failed:", error);
    return [];
  }
  return (data || []).map((r) => ({
    id: r.id,
    date: r.created_at,
    industry: r.industry,
    situation: r.situation,
    summary: r.summary,
    response: r.response || "",
    result: r.result || "",
    by: r.by || "匿名",
  }));
}
export async function insertSharedCase(entry) {
  const { data, error } = await supabase
    .from("shared_cases")
    .insert({
      industry: entry.industry,
      situation: entry.situation,
      summary: entry.summary,
      response: entry.response,
      result: entry.result,
      by: "匿名",
    })
    .select()
    .single();
  if (error) {
    console.error("insertSharedCase failed:", error);
    return null;
  }
  return { id: data.id, date: data.created_at, industry: data.industry, situation: data.situation, summary: data.summary, response: data.response || "", result: data.result || "", by: data.by };
}
