import React, { useState } from 'react';
import { Plus, Trash2, ShieldAlert, Users2 } from 'lucide-react';
import { useAppStore, newId } from '../../store/AppStore';
import type { PairAvoidLevel, PairRule, SupportPairRule } from '../../types/domain';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select, Input, Checkbox } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

const LEVEL_LABEL: Record<PairAvoidLevel, string> = { 1: 'レベル1：注意', 2: 'レベル2：できるだけ避ける', 3: 'レベル3：同時勤務禁止' };
const LEVEL_COLOR: Record<PairAvoidLevel, 'sky' | 'amber' | 'rose'> = { 1: 'sky', 2: 'amber', 3: 'rose' };

export function PairRulesTab() {
  const { state, dispatch } = useAppStore();
  const { staff, pairRules, supportPairRules } = state.data;
  const activeStaff = staff.filter((s) => s.active);

  const [pairFormOpen, setPairFormOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<PairRule | null>(null);
  const [supportFormOpen, setSupportFormOpen] = useState(false);
  const [editingSupport, setEditingSupport] = useState<SupportPairRule | null>(null);

  function staffName(id: string) {
    return activeStaff.find((s) => s.id === id)?.displayName ?? '(削除済み)';
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-700 flex items-center gap-1.5"><ShieldAlert size={16} className="text-rose-500" />組み合わせ回避ルール</h2>
          <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => { setEditingPair(null); setPairFormOpen(true); }}>
            追加
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">特定のスタッフ同士を同じ勤務帯に配置しないための設定です。理由は管理者のみ閲覧できます。</p>
        <div className="space-y-2">
          {pairRules.map((rule) => (
            <Card key={rule.id}>
              <CardBody className="py-3 flex items-center gap-3 flex-wrap">
                <span className="font-medium text-slate-700 text-sm">{staffName(rule.staffIdA)} × {staffName(rule.staffIdB)}</span>
                <Badge color={LEVEL_COLOR[rule.level]}>{LEVEL_LABEL[rule.level]}</Badge>
                {!rule.active && <Badge color="slate">無効</Badge>}
                <div className="ml-auto flex gap-1">
                  <button onClick={() => { setEditingPair(rule); setPairFormOpen(true); }} className="text-xs font-medium text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50">
                    編集
                  </button>
                  <button onClick={() => dispatch({ type: 'DELETE_PAIR_RULE', id: rule.id })} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
          {pairRules.length === 0 && <div className="text-center text-slate-400 text-sm py-8">組み合わせ回避ルールはまだありません。</div>}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-700 flex items-center gap-1.5"><Users2 size={16} className="text-teal-600" />配置サポートルール</h2>
          <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => { setEditingSupport(null); setSupportFormOpen(true); }}>
            追加
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">新人教育やOJTなど、特定スタッフに必ずサポート要員を同時配置したい場合の設定です。</p>
        <div className="space-y-2">
          {supportPairRules.map((rule) => (
            <Card key={rule.id}>
              <CardBody className="py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-700 text-sm">{staffName(rule.targetStaffId)}さん</span>
                  <span className="text-xs text-slate-400">には</span>
                  <span className="text-sm text-slate-600">{rule.supporterStaffIds.map(staffName).join('・')}</span>
                  <span className="text-xs text-slate-400">のうち誰か1人が必要</span>
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => { setEditingSupport(rule); setSupportFormOpen(true); }} className="text-xs font-medium text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50">
                      編集
                    </button>
                    <button onClick={() => dispatch({ type: 'DELETE_SUPPORT_PAIR_RULE', id: rule.id })} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {rule.purpose && <div className="text-xs text-slate-400 mt-1.5">目的: {rule.purpose}</div>}
              </CardBody>
            </Card>
          ))}
          {supportPairRules.length === 0 && <div className="text-center text-slate-400 text-sm py-8">配置サポートルールはまだありません。</div>}
        </div>
      </section>

      <PairRuleForm open={pairFormOpen} onClose={() => setPairFormOpen(false)} editing={editingPair} staffOptions={activeStaff} />
      <SupportPairRuleForm open={supportFormOpen} onClose={() => setSupportFormOpen(false)} editing={editingSupport} staffOptions={activeStaff} />
    </div>
  );
}

function PairRuleForm({
  open,
  onClose,
  editing,
  staffOptions,
}: {
  open: boolean;
  onClose: () => void;
  editing: PairRule | null;
  staffOptions: { id: string; displayName: string }[];
}) {
  const { dispatch } = useAppStore();
  const [staffIdA, setStaffIdA] = useState(editing?.staffIdA ?? staffOptions[0]?.id ?? '');
  const [staffIdB, setStaffIdB] = useState(editing?.staffIdB ?? staffOptions[1]?.id ?? '');
  const [level, setLevel] = useState<PairAvoidLevel>(editing?.level ?? 2);
  const [reason, setReason] = useState(editing?.reason ?? '');
  const [active, setActive] = useState(editing?.active ?? true);

  React.useEffect(() => {
    if (open) {
      setStaffIdA(editing?.staffIdA ?? staffOptions[0]?.id ?? '');
      setStaffIdB(editing?.staffIdB ?? staffOptions[1]?.id ?? '');
      setLevel(editing?.level ?? 2);
      setReason(editing?.reason ?? '');
      setActive(editing?.active ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const canSave = staffIdA && staffIdB && staffIdA !== staffIdB;

  function save() {
    dispatch({
      type: 'UPSERT_PAIR_RULE',
      item: { id: editing?.id ?? newId('pair'), staffIdA, staffIdB, level, reason, active },
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? '組み合わせ回避ルールを編集' : '組み合わせ回避ルールを追加'}
      footer={<><Button variant="ghost" onClick={onClose}>キャンセル</Button><Button disabled={!canSave} onClick={save}>保存する</Button></>}
    >
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Select value={staffIdA} onChange={(e) => setStaffIdA(e.target.value)}>
          {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
        </Select>
        <Select value={staffIdB} onChange={(e) => setStaffIdB(e.target.value)}>
          {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
        </Select>
      </div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-700 mb-2">回避レベル</div>
        <div className="space-y-2">
          {([1, 2, 3] as PairAvoidLevel[]).map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm ${level === lv ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}`}
            >
              <div className="font-semibold text-slate-700">{LEVEL_LABEL[lv]}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {lv === 1 && '同じ勤務でも許可するが警告表示します'}
                {lv === 2 && '自動作成時は極力別勤務にします(手動で同じ勤務にすると警告)'}
                {lv === 3 && '同じ勤務帯になった場合エラーになります'}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-700 mb-1.5">理由(任意・管理者のみ閲覧可能)</div>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="非公開メモ" />
      </div>
      <Checkbox label="このルールを有効にする" checked={active} onChange={setActive} />
    </Modal>
  );
}

function SupportPairRuleForm({
  open,
  onClose,
  editing,
  staffOptions,
}: {
  open: boolean;
  onClose: () => void;
  editing: SupportPairRule | null;
  staffOptions: { id: string; displayName: string }[];
}) {
  const { dispatch } = useAppStore();
  const [targetStaffId, setTargetStaffId] = useState(editing?.targetStaffId ?? staffOptions[0]?.id ?? '');
  const [supporterStaffIds, setSupporterStaffIds] = useState<string[]>(editing?.supporterStaffIds ?? []);
  const [purpose, setPurpose] = useState(editing?.purpose ?? '');
  const [active, setActive] = useState(editing?.active ?? true);

  React.useEffect(() => {
    if (open) {
      setTargetStaffId(editing?.targetStaffId ?? staffOptions[0]?.id ?? '');
      setSupporterStaffIds(editing?.supporterStaffIds ?? []);
      setPurpose(editing?.purpose ?? '');
      setActive(editing?.active ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  function toggleSupporter(id: string) {
    setSupporterStaffIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const canSave = targetStaffId && supporterStaffIds.length > 0;

  function save() {
    dispatch({
      type: 'UPSERT_SUPPORT_PAIR_RULE',
      item: { id: editing?.id ?? newId('support'), targetStaffId, supporterStaffIds, purpose, active },
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? '配置サポートルールを編集' : '配置サポートルールを追加'}
      footer={<><Button variant="ghost" onClick={onClose}>キャンセル</Button><Button disabled={!canSave} onClick={save}>保存する</Button></>}
    >
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-700 mb-1.5">サポートが必要なスタッフ</div>
        <Select value={targetStaffId} onChange={(e) => setTargetStaffId(e.target.value)}>
          {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
        </Select>
      </div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-700 mb-1.5">サポート要員(誰か1人が同勤務にいれば条件を満たす)</div>
        <div className="flex flex-wrap gap-2">
          {staffOptions.filter((s) => s.id !== targetStaffId).map((s) => (
            <button
              key={s.id}
              onClick={() => toggleSupporter(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                supporterStaffIds.includes(s.id) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {s.displayName}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-700 mb-1.5">用途</div>
        <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="例: 新人教育・OJT" />
      </div>
      <Checkbox label="このルールを有効にする" checked={active} onChange={setActive} />
    </Modal>
  );
}
