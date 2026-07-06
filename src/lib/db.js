import { supabase } from "./supabaseClient";

/* ============================================================
   Supabaseデータアクセス層
   - 個人データ(records / scores / user_settings)は行単位で管理
   - shared_cases は「同じ組織」内のみで共有(全体公開ではない)
   - すべての重要操作を audit_log に記録(アクセスログ)
   ============================================================ */

/* ---------- アクセスログ(誰が・いつ・何をしたか) ---------- */
export async function logAudit(userId, orgId, action, meta = {}) {
  try {
    await supabase.from("audit_log").insert({ user_id: userId, org_id: orgId || null, action, meta });
  } catch (e) {
    console.error("logAudit failed:", e);
  }
}

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
export async function insertRecord(userId, orgId, rec) {
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
  logAudit(userId, orgId, "record_create", { record_id: data.id, situation: rec.situation });
  return rowToRecord(data);
}
export async function updateRecordStatus(id, status, userId, orgId) {
  const { error } = await supabase.from("records").update({ status }).eq("id", id);
  if (error) {
    console.error("updateRecordStatus failed:", error);
    return false;
  }
  logAudit(userId, orgId, "record_status_update", { record_id: id, status });
  return true;
}
export async function deleteRecord(id, userId, orgId) {
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) {
    console.error("deleteRecord failed:", error);
    return false;
  }
  logAudit(userId, orgId, "record_delete", { record_id: id });
  return true;
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
  return (data || []).map((r) => ({ id: r.id, date: r.occurred_at, scenario: r.scenario, level: r.level, score: r.score, comment: r.comment || "" }));
}
export async function insertScore(userId, orgId, entry) {
  const { data, error } = await supabase
    .from("scores")
    .insert({ user_id: userId, occurred_at: entry.date, scenario: entry.scenario, level: entry.level, score: entry.score, comment: entry.comment || null })
    .select()
    .single();
  if (error) {
    console.error("insertScore failed:", error);
    return null;
  }
  logAudit(userId, orgId, "training_score", { score: entry.score, scenario: entry.scenario });
  return { id: data.id, date: data.occurred_at, scenario: data.scenario, level: data.level, score: data.score, comment: data.comment || "" };
}

/* ---------- ユーザー設定(user_settings:1ユーザー1行) ---------- */
const DEFAULT_SETTINGS = {
  user_name: "",
  industry: "general",
  sos_name: "",
  sos_phone: "",
  onboarded: false,
  org_id: null,
  is_admin: false,
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

/* ---------- 組織(契約単位):招待コードでの参加・新規作成 ---------- */
export async function createOrganization(name, code) {
  const { data, error } = await supabase.rpc("create_organization", { p_name: name, p_code: code });
  if (error) {
    console.error("createOrganization failed:", error);
    return { error: error.message };
  }
  return { data: data && data[0] };
}
export async function joinOrganization(code) {
  const { data, error } = await supabase.rpc("join_organization", { p_code: code });
  if (error) {
    console.error("joinOrganization failed:", error);
    return { error: error.message };
  }
  return { data: data && data[0] };
}
export async function fetchOrganization(orgId) {
  if (!orgId) return null;
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
  if (error) {
    console.error("fetchOrganization failed:", error);
    return null;
  }
  return data;
}

/* ---------- みんなのケース共有(shared_cases:同じ組織内のみ共有) ---------- */
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
export async function insertSharedCase(entry, userId, orgId) {
  const { data, error } = await supabase
    .from("shared_cases")
    .insert({
      industry: entry.industry,
      situation: entry.situation,
      summary: entry.summary,
      response: entry.response,
      result: entry.result,
      by: "匿名",
      user_id: userId,
      org_id: orgId,
    })
    .select()
    .single();
  if (error) {
    console.error("insertSharedCase failed:", error);
    return null;
  }
  logAudit(userId, orgId, "case_post", { case_id: data.id, situation: entry.situation });
  return { id: data.id, date: data.created_at, industry: data.industry, situation: data.situation, summary: data.summary, response: data.response || "", result: data.result || "", by: data.by };
}
export async function deleteSharedCase(id, userId, orgId) {
  const { error } = await supabase.from("shared_cases").delete().eq("id", id);
  if (error) {
    console.error("deleteSharedCase failed:", error);
    return false;
  }
  logAudit(userId, orgId, "case_delete", { case_id: id });
  return true;
}
export async function reportCase(caseId, orgId, userId, reason) {
  const { error } = await supabase.from("case_reports").insert({ case_id: caseId, org_id: orgId, reporter_id: userId, reason });
  if (error) {
    console.error("reportCase failed:", error);
    return false;
  }
  logAudit(userId, orgId, "case_report", { case_id: caseId, reason });
  return true;
}
export async function dismissCaseReport(reportId) {
  const { error } = await supabase.from("case_reports").delete().eq("id", reportId);
  if (error) {
    console.error("dismissCaseReport failed:", error);
    return false;
  }
  return true;
}
export async function fetchReports(orgId) {
  const { data, error } = await supabase
    .from("case_reports")
    .select("id, case_id, reason, created_at, shared_cases(situation, summary)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchReports failed:", error);
    return [];
  }
  return data || [];
}
