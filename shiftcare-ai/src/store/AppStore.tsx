import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type {
  AppData,
  Assignment,
  DayNote,
  FacilityMode,
  FacilityRules,
  FacilitySettings,
  JobRole,
  PairRule,
  Qualification,
  QualificationRequirement,
  Schedule,
  ShiftRequirement,
  ShiftType,
  Staff,
  SupportPairRule,
} from '../types/domain';
import { dataRepository } from '../services/storageService';
import { createEmptyData, createSeedData } from '../data/seed';
import { generateId } from '../utils/id';

type Action =
  | { type: 'LOAD'; data: AppData }
  | { type: 'RESET_WITH_SEED'; mode: FacilityMode; facilityName: string }
  | { type: 'RESET_EMPTY'; mode: FacilityMode; facilityName: string }
  | { type: 'UPDATE_FACILITY'; patch: Partial<FacilitySettings> }
  | { type: 'UPSERT_STAFF'; staff: Staff }
  | { type: 'DELETE_STAFF'; staffId: string }
  | { type: 'UPSERT_SHIFT_TYPE'; shiftType: ShiftType }
  | { type: 'DELETE_SHIFT_TYPE'; shiftTypeId: string }
  | { type: 'UPSERT_JOB_ROLE'; jobRole: JobRole }
  | { type: 'DELETE_JOB_ROLE'; jobRoleId: string }
  | { type: 'UPSERT_QUALIFICATION'; qualification: Qualification }
  | { type: 'DELETE_QUALIFICATION'; qualificationId: string }
  | { type: 'UPSERT_QUALIFICATION_REQUIREMENT'; item: QualificationRequirement }
  | { type: 'DELETE_QUALIFICATION_REQUIREMENT'; id: string }
  | { type: 'UPSERT_SHIFT_REQUIREMENT'; item: ShiftRequirement }
  | { type: 'DELETE_SHIFT_REQUIREMENT'; id: string }
  | { type: 'UPSERT_PAIR_RULE'; item: PairRule }
  | { type: 'DELETE_PAIR_RULE'; id: string }
  | { type: 'UPSERT_SUPPORT_PAIR_RULE'; item: SupportPairRule }
  | { type: 'DELETE_SUPPORT_PAIR_RULE'; id: string }
  | { type: 'UPDATE_FACILITY_RULES'; patch: Partial<FacilityRules> }
  | { type: 'UPSERT_DAY_NOTE'; item: DayNote }
  | { type: 'DELETE_DAY_NOTE'; id: string }
  | { type: 'ENSURE_SCHEDULE'; yearMonth: string }
  | { type: 'SET_SCHEDULE_STATUS'; yearMonth: string; status: Schedule['status'] }
  | { type: 'SET_ASSIGNMENT'; yearMonth: string; staffId: string; date: string; shiftTypeId: string | null; pushHistory?: boolean }
  | { type: 'TOGGLE_LOCK'; yearMonth: string; staffId: string; date: string }
  | { type: 'BULK_SET_ASSIGNMENTS'; yearMonth: string; assignments: Assignment[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

interface StoreState {
  data: AppData;
  loaded: boolean;
  past: Record<string, Assignment>[];
  future: Record<string, Assignment>[];
  historyYearMonth: string | null;
}

function emptyBootstrapData(): AppData {
  return createEmptyData('care', '');
}

function ensureSchedule(data: AppData, yearMonth: string): AppData {
  if (data.schedules[yearMonth]) return data;
  const schedule: Schedule = { yearMonth, assignments: {}, status: 'draft', publishedAt: null };
  return { ...data, schedules: { ...data.schedules, [yearMonth]: schedule } };
}

const MAX_HISTORY = 30;

function pushHistorySnapshot(state: StoreState, yearMonth: string): StoreState {
  const currentAssignments = state.data.schedules[yearMonth]?.assignments ?? {};
  const sameMonth = state.historyYearMonth === yearMonth;
  const past = sameMonth ? state.past.slice(-(MAX_HISTORY - 1)) : [];
  return {
    ...state,
    past: [...past, currentAssignments],
    future: [],
    historyYearMonth: yearMonth,
  };
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, data: action.data, loaded: true };
    case 'RESET_WITH_SEED':
      return {
        ...state,
        data: createSeedData(action.mode, action.facilityName),
        loaded: true,
        past: [],
        future: [],
        historyYearMonth: null,
      };
    case 'RESET_EMPTY':
      return {
        ...state,
        data: createEmptyData(action.mode, action.facilityName),
        loaded: true,
        past: [],
        future: [],
        historyYearMonth: null,
      };
    case 'UPDATE_FACILITY':
      return { ...state, data: { ...state.data, facility: { ...state.data.facility, ...action.patch } } };
    case 'UPSERT_STAFF': {
      const exists = state.data.staff.some((s) => s.id === action.staff.id);
      const staff = exists
        ? state.data.staff.map((s) => (s.id === action.staff.id ? action.staff : s))
        : [...state.data.staff, action.staff];
      return { ...state, data: { ...state.data, staff } };
    }
    case 'DELETE_STAFF':
      return {
        ...state,
        data: {
          ...state.data,
          staff: state.data.staff.filter((s) => s.id !== action.staffId),
          pairRules: state.data.pairRules.filter(
            (p) => p.staffIdA !== action.staffId && p.staffIdB !== action.staffId,
          ),
          supportPairRules: state.data.supportPairRules
            .filter((p) => p.targetStaffId !== action.staffId)
            .map((p) => ({ ...p, supporterStaffIds: p.supporterStaffIds.filter((id) => id !== action.staffId) })),
        },
      };
    case 'UPSERT_SHIFT_TYPE': {
      const exists = state.data.shiftTypes.some((s) => s.id === action.shiftType.id);
      const shiftTypes = exists
        ? state.data.shiftTypes.map((s) => (s.id === action.shiftType.id ? action.shiftType : s))
        : [...state.data.shiftTypes, action.shiftType];
      return { ...state, data: { ...state.data, shiftTypes } };
    }
    case 'DELETE_SHIFT_TYPE':
      return {
        ...state,
        data: {
          ...state.data,
          shiftTypes: state.data.shiftTypes.filter((s) => s.id !== action.shiftTypeId),
          qualificationRequirements: state.data.qualificationRequirements.filter(
            (r) => r.shiftTypeId !== action.shiftTypeId,
          ),
          shiftRequirements: state.data.shiftRequirements.filter((r) => r.shiftTypeId !== action.shiftTypeId),
        },
      };
    case 'UPSERT_JOB_ROLE': {
      const exists = state.data.jobRoles.some((j) => j.id === action.jobRole.id);
      const jobRoles = exists
        ? state.data.jobRoles.map((j) => (j.id === action.jobRole.id ? action.jobRole : j))
        : [...state.data.jobRoles, action.jobRole];
      return { ...state, data: { ...state.data, jobRoles } };
    }
    case 'DELETE_JOB_ROLE':
      return { ...state, data: { ...state.data, jobRoles: state.data.jobRoles.filter((j) => j.id !== action.jobRoleId) } };
    case 'UPSERT_QUALIFICATION': {
      const exists = state.data.qualifications.some((q) => q.id === action.qualification.id);
      const qualifications = exists
        ? state.data.qualifications.map((q) => (q.id === action.qualification.id ? action.qualification : q))
        : [...state.data.qualifications, action.qualification];
      return { ...state, data: { ...state.data, qualifications } };
    }
    case 'DELETE_QUALIFICATION':
      return {
        ...state,
        data: {
          ...state.data,
          qualifications: state.data.qualifications.filter((q) => q.id !== action.qualificationId),
          qualificationRequirements: state.data.qualificationRequirements.filter(
            (r) => r.qualificationId !== action.qualificationId,
          ),
        },
      };
    case 'UPSERT_QUALIFICATION_REQUIREMENT': {
      const exists = state.data.qualificationRequirements.some((r) => r.id === action.item.id);
      const list = exists
        ? state.data.qualificationRequirements.map((r) => (r.id === action.item.id ? action.item : r))
        : [...state.data.qualificationRequirements, action.item];
      return { ...state, data: { ...state.data, qualificationRequirements: list } };
    }
    case 'DELETE_QUALIFICATION_REQUIREMENT':
      return {
        ...state,
        data: {
          ...state.data,
          qualificationRequirements: state.data.qualificationRequirements.filter((r) => r.id !== action.id),
        },
      };
    case 'UPSERT_SHIFT_REQUIREMENT': {
      const exists = state.data.shiftRequirements.some((r) => r.id === action.item.id);
      const list = exists
        ? state.data.shiftRequirements.map((r) => (r.id === action.item.id ? action.item : r))
        : [...state.data.shiftRequirements, action.item];
      return { ...state, data: { ...state.data, shiftRequirements: list } };
    }
    case 'DELETE_SHIFT_REQUIREMENT':
      return {
        ...state,
        data: { ...state.data, shiftRequirements: state.data.shiftRequirements.filter((r) => r.id !== action.id) },
      };
    case 'UPSERT_PAIR_RULE': {
      const exists = state.data.pairRules.some((r) => r.id === action.item.id);
      const list = exists
        ? state.data.pairRules.map((r) => (r.id === action.item.id ? action.item : r))
        : [...state.data.pairRules, action.item];
      return { ...state, data: { ...state.data, pairRules: list } };
    }
    case 'DELETE_PAIR_RULE':
      return { ...state, data: { ...state.data, pairRules: state.data.pairRules.filter((r) => r.id !== action.id) } };
    case 'UPSERT_SUPPORT_PAIR_RULE': {
      const exists = state.data.supportPairRules.some((r) => r.id === action.item.id);
      const list = exists
        ? state.data.supportPairRules.map((r) => (r.id === action.item.id ? action.item : r))
        : [...state.data.supportPairRules, action.item];
      return { ...state, data: { ...state.data, supportPairRules: list } };
    }
    case 'DELETE_SUPPORT_PAIR_RULE':
      return {
        ...state,
        data: { ...state.data, supportPairRules: state.data.supportPairRules.filter((r) => r.id !== action.id) },
      };
    case 'UPDATE_FACILITY_RULES':
      return { ...state, data: { ...state.data, facilityRules: { ...state.data.facilityRules, ...action.patch } } };
    case 'UPSERT_DAY_NOTE': {
      const exists = state.data.dayNotes.some((n) => n.id === action.item.id);
      const list = exists
        ? state.data.dayNotes.map((n) => (n.id === action.item.id ? action.item : n))
        : [...state.data.dayNotes, action.item];
      return { ...state, data: { ...state.data, dayNotes: list } };
    }
    case 'DELETE_DAY_NOTE':
      return { ...state, data: { ...state.data, dayNotes: state.data.dayNotes.filter((n) => n.id !== action.id) } };
    case 'ENSURE_SCHEDULE':
      return { ...state, data: ensureSchedule(state.data, action.yearMonth) };
    case 'SET_SCHEDULE_STATUS': {
      const data = ensureSchedule(state.data, action.yearMonth);
      const schedule = data.schedules[action.yearMonth];
      return {
        ...state,
        data: {
          ...data,
          schedules: {
            ...data.schedules,
            [action.yearMonth]: {
              ...schedule,
              status: action.status,
              publishedAt: action.status === 'published' ? new Date().toISOString() : schedule.publishedAt,
            },
          },
        },
      };
    }
    case 'SET_ASSIGNMENT': {
      let next = state;
      if (action.pushHistory !== false) {
        next = pushHistorySnapshot(state, action.yearMonth);
      }
      const data = ensureSchedule(next.data, action.yearMonth);
      const schedule = data.schedules[action.yearMonth];
      const key = `${action.staffId}__${action.date}`;
      const prev = schedule.assignments[key];
      if (prev?.locked) return { ...next, data };
      const assignment: Assignment = {
        staffId: action.staffId,
        date: action.date,
        shiftTypeId: action.shiftTypeId,
        locked: false,
      };
      const assignments = { ...schedule.assignments, [key]: assignment };
      return {
        ...next,
        data: { ...data, schedules: { ...data.schedules, [action.yearMonth]: { ...schedule, assignments } } },
      };
    }
    case 'TOGGLE_LOCK': {
      const data = ensureSchedule(state.data, action.yearMonth);
      const schedule = data.schedules[action.yearMonth];
      const key = `${action.staffId}__${action.date}`;
      const prev = schedule.assignments[key] ?? { staffId: action.staffId, date: action.date, shiftTypeId: null, locked: false };
      const assignments = { ...schedule.assignments, [key]: { ...prev, locked: !prev.locked } };
      return {
        ...state,
        data: { ...data, schedules: { ...data.schedules, [action.yearMonth]: { ...schedule, assignments } } },
      };
    }
    case 'BULK_SET_ASSIGNMENTS': {
      const withHistory = pushHistorySnapshot(state, action.yearMonth);
      const data = ensureSchedule(withHistory.data, action.yearMonth);
      const schedule = data.schedules[action.yearMonth];
      const assignments = { ...schedule.assignments };
      for (const a of action.assignments) {
        const key = `${a.staffId}__${a.date}`;
        if (assignments[key]?.locked) continue;
        assignments[key] = a;
      }
      return {
        ...withHistory,
        data: { ...data, schedules: { ...data.schedules, [action.yearMonth]: { ...schedule, assignments } } },
      };
    }
    case 'UNDO': {
      if (!state.historyYearMonth || state.past.length === 0) return state;
      const yearMonth = state.historyYearMonth;
      const currentAssignments = state.data.schedules[yearMonth]?.assignments ?? {};
      const prevAssignments = state.past[state.past.length - 1];
      const data = ensureSchedule(state.data, yearMonth);
      const schedule = data.schedules[yearMonth];
      return {
        ...state,
        data: { ...data, schedules: { ...data.schedules, [yearMonth]: { ...schedule, assignments: prevAssignments } } },
        past: state.past.slice(0, -1),
        future: [currentAssignments, ...state.future].slice(0, MAX_HISTORY),
      };
    }
    case 'REDO': {
      if (!state.historyYearMonth || state.future.length === 0) return state;
      const yearMonth = state.historyYearMonth;
      const currentAssignments = state.data.schedules[yearMonth]?.assignments ?? {};
      const nextAssignments = state.future[0];
      const data = ensureSchedule(state.data, yearMonth);
      const schedule = data.schedules[yearMonth];
      return {
        ...state,
        data: { ...data, schedules: { ...data.schedules, [yearMonth]: { ...schedule, assignments: nextAssignments } } },
        past: [...state.past, currentAssignments].slice(-MAX_HISTORY),
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

interface AppStoreContextValue {
  state: StoreState;
  dispatch: React.Dispatch<Action>;
  canUndo: boolean;
  canRedo: boolean;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    data: emptyBootstrapData(),
    loaded: false,
    past: [],
    future: [],
    historyYearMonth: null,
  });

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    dataRepository.load().then((data) => {
      if (data) {
        dispatch({ type: 'LOAD', data });
      } else {
        dispatch({ type: 'LOAD', data: emptyBootstrapData() });
      }
    });
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    dataRepository.save(state.data);
  }, [state.data, state.loaded]);

  const value = useMemo<AppStoreContextValue>(
    () => ({
      state,
      dispatch,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

export function newId(prefix: string): string {
  return generateId(prefix);
}
