import { useState } from 'react';
import { Plus, Moon, CloudMoon, Trash2, Pencil, Search } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import type { Staff } from '../../types/domain';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Form';
import { StaffForm } from './StaffForm';

export function StaffPage() {
  const { state, dispatch } = useAppStore();
  const { staff, jobRoles, qualifications } = state.data;
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Staff | null>(null);

  const filtered = staff.filter(
    (s) => s.fullName.includes(query) || s.displayName.includes(query),
  );

  function jobRoleNames(s: Staff) {
    return s.jobRoleIds.map((id) => jobRoles.find((r) => r.id === id)?.name).filter(Boolean).join('・') || '未設定';
  }
  function qualificationNames(s: Staff) {
    return s.qualificationIds.map((id) => qualifications.find((q) => q.id === id)?.name).filter(Boolean);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">スタッフ管理</h1>
          <p className="text-sm text-slate-400 mt-0.5">{staff.length}名登録中</p>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          スタッフを追加
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前で検索" className="pl-10" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((s) => (
          <Card key={s.id} className={!s.active ? 'opacity-50' : ''}>
            <CardBody>
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: s.color }}
                >
                  {s.displayName.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{s.fullName}</span>
                    <span className="text-xs text-slate-400">({s.displayName})</span>
                    {s.isNightSpecialist && <Badge color="violet">夜勤専従</Badge>}
                    {!s.active && <Badge color="slate">退職済み</Badge>}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{jobRoleNames(s)} ・ {s.employmentType}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {qualificationNames(s).map((n) => (
                      <Badge key={n} color="sky">{n}</Badge>
                    ))}
                    {s.availability.canWorkNight ? (
                      <Badge color="teal"><Moon size={12} />夜勤可</Badge>
                    ) : (
                      <Badge color="slate"><CloudMoon size={12} />夜勤不可</Badge>
                    )}
                    {s.desiredOffDates.length > 0 && <Badge color="amber">希望休{s.desiredOffDates.length}件</Badge>}
                  </div>
                  {s.note && <div className="text-xs text-slate-400 mt-2 line-clamp-2">{s.note}</div>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setFormOpen(true);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-teal-600"
                    aria-label="編集"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(s)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center text-slate-400 py-16">
            {staff.length === 0 ? 'スタッフが登録されていません。「スタッフを追加」から登録してください。' : '該当するスタッフがいません。'}
          </div>
        )}
      </div>

      <StaffForm open={formOpen} onClose={() => setFormOpen(false)} editingStaff={editing} />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <p className="text-slate-700 font-medium mb-1">{confirmDelete.fullName}さんを削除しますか？</p>
            <p className="text-sm text-slate-400 mb-4">関連する組み合わせルール等も削除されます。この操作は元に戻せません。</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>キャンセル</Button>
              <Button
                variant="danger"
                onClick={() => {
                  dispatch({ type: 'DELETE_STAFF', staffId: confirmDelete.id });
                  setConfirmDelete(null);
                }}
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
