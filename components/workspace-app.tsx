'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  FileBarChart,
  FileJson,
  Filter,
  FolderPlus,
  FolderKanban,
  PencilLine,
  LayoutDashboard,
  ListChecks,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  initialWorkspaceData,
  type Health,
  type Milestone,
  type Priority,
  type Project,
  type ProjectStatus,
  type StageKey,
  type Task,
  type TaskStatus,
  type UpdateKind,
  type WorkspaceData,
  stageLabels,
  stageOrder,
} from '@/lib/workspace-data';

type ViewId = 'dashboard' | 'projects' | 'tasks' | 'calendar' | 'reports' | 'settings';
type GanttScale = 'day' | 'week' | 'month';
type CalendarScope = 'today' | 'week' | 'month' | 'milestone';
type VisualThemeId = 'verdant' | 'tide' | 'solar' | 'iris' | 'signal';

const STORAGE_KEY = 'project-workbench-public-v1';
const OLD_STORAGE_KEY = 'project-workbench-preview-v0';
const VISUAL_THEME_KEY = 'project-workbench-visual-theme-v1';

const visualThemes: Array<{ id: VisualThemeId; label: string; note: string; swatches: [string, string, string] }> = [
  { id: 'verdant', label: '松墨', note: '沉静、克制、柔和流动', swatches: ['#1f6255', '#64ad92', '#e7c36a'] },
  { id: 'tide', label: '潮汐', note: '清澈、舒展、波浪呼吸', swatches: ['#2468a8', '#38a9c4', '#86d3c2'] },
  { id: 'solar', label: '日晷', note: '温暖、醒目、节奏鲜明', swatches: ['#be543e', '#e7903d', '#f2c85b'] },
  { id: 'iris', label: '鸢尾', note: '精致、通透、柔光漂移', swatches: ['#5f52a7', '#8c6ed0', '#d087ba'] },
  { id: 'signal', label: '信号', note: '锐利、明快、快速扫描', swatches: ['#087f8c', '#11b7a5', '#d9dc3f'] },
];

const navItems: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '总览', icon: LayoutDashboard },
  { id: 'projects', label: '项目', icon: FolderKanban },
  { id: 'tasks', label: '任务', icon: ListChecks },
  { id: 'calendar', label: '日程', icon: CalendarDays },
  { id: 'reports', label: '报表', icon: FileBarChart },
];

const viewTitles: Record<ViewId, string> = {
  dashboard: '项目总览',
  projects: '项目',
  tasks: '任务中心',
  calendar: '日程',
  reports: '项目报表',
  settings: '系统设置',
};

const emptyTaskDraft = {
  title: '',
  projectId: 'demo-orbit',
  parentId: '',
  owner: '项目负责人',
  start: '2026-09-01',
  end: '2026-09-08',
  progress: 0,
  priority: '中' as Priority,
  stage: 'docs' as StageKey,
  description: '',
};

const emptyProjectDraft = {
  name: '',
  code: '',
  parentId: '',
  owner: '项目负责人',
  start: '2026-09-01',
  end: '2026-10-30',
  status: '筹备中' as ProjectStatus,
  description: '',
  color: '#3568d4',
};

const DAY_MS = 86_400_000;

function dateAtMidnight(value: string | Date) {
  const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00`) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, amount: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(value: Date) {
  const date = dateAtMidnight(value);
  const day = date.getDay() || 7;
  return addDays(date, 1 - day);
}

function endOfWeek(value: Date) {
  return addDays(startOfWeek(value), 6);
}

function overlaps(task: Task, start: Date, end: Date) {
  return dateAtMidnight(task.start) <= end && dateAtMidnight(task.end) >= start;
}

function daysBetween(start: string, end: string) {
  const oneDay = 86_400_000;
  return Math.max(0, Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / oneDay));
}

function formatDate(value: string, withYear = false) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return new Intl.DateTimeFormat('zh-CN', {
    ...(withYear ? { year: 'numeric' } : {}),
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function healthClass(health: Health) {
  if (health === '风险') return 'status-risk';
  if (health === '关注') return 'status-watch';
  return 'status-normal';
}

function statusClass(status: TaskStatus) {
  if (status === '已完成') return 'task-status task-status--done';
  if (status === '受阻') return 'task-status task-status--blocked';
  if (status === '进行中') return 'task-status task-status--doing';
  return 'task-status';
}

function taskStatusFromProgress(progress: number, health: Health): TaskStatus {
  if (progress >= 100) return '已完成';
  if (health === '风险') return '受阻';
  if (progress > 0) return '进行中';
  return '未开始';
}

export function WorkspaceApp() {
  const [data, setData] = useState<WorkspaceData>(initialWorkspaceData);
  const [hydrated, setHydrated] = useState(false);
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState('demo-orbit');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskDraft, setNewTaskDraft] = useState(emptyTaskDraft);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState(emptyProjectDraft);
  const [projectMode, setProjectMode] = useState<'gantt' | 'list'>('gantt');
  const [ganttScale, setGanttScale] = useState<GanttScale>('week');
  const [visualTheme, setVisualTheme] = useState<VisualThemeId>('verdant');
  const [searchTerm, setSearchTerm] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'全部' | TaskStatus>('全部');
  const [updateDraft, setUpdateDraft] = useState({
    kind: '进展' as UpdateKind,
    summary: '',
    issue: '',
    optimization: '',
    nextStep: '',
    progress: 50,
  });
  const [scheduleDraft, setScheduleDraft] = useState({ start: '', end: '', delayDays: 1 });

  useEffect(() => {
    try {
      window.localStorage.removeItem(OLD_STORAGE_KEY);
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WorkspaceData;
        if (Array.isArray(parsed.projects) && Array.isArray(parsed.tasks) && Array.isArray(parsed.milestones) && Array.isArray(parsed.updates)) {
          setData(parsed);
        }
      }
      const savedTheme = window.localStorage.getItem(VISUAL_THEME_KEY);
      if (savedTheme && visualThemes.some((theme) => theme.id === savedTheme)) setVisualTheme(savedTheme as VisualThemeId);
    } catch {
      // If a local backup is damaged, keep the bundled sample workspace available.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(VISUAL_THEME_KEY, visualTheme);
  }, [hydrated, visualTheme]);

  const selectedProject = data.projects.find((project) => project.id === selectedProjectId) ?? data.projects[0];
  const selectedTask = data.tasks.find((task) => task.id === selectedTaskId) ?? null;
  const projectTasks = data.tasks.filter((task) => task.projectId === selectedProject?.id);
  const selectedTaskUpdates = data.updates
    .filter((update) => update.taskId === selectedTaskId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filteredTasks = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return data.tasks.filter((task) => {
      const project = data.projects.find((item) => item.id === task.projectId);
      const matchesSearch = !normalized || `${task.title} ${task.owner} ${project?.name ?? ''}`.toLowerCase().includes(normalized);
      const matchesStatus = taskStatusFilter === '全部' || task.status === taskStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data.projects, data.tasks, searchTerm, taskStatusFilter]);

  const filteredProjects = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return data.projects.filter((project) => !normalized || `${project.name} ${project.owner} ${project.code}`.toLowerCase().includes(normalized));
  }, [data.projects, searchTerm]);

  const metrics = useMemo(() => {
    const doing = data.projects.filter((project) => project.status === '进行中').length;
    const completedTasks = data.tasks.filter((task) => task.status === '已完成').length;
    const riskTasks = data.tasks.filter((task) => task.health === '风险').length;
    const progress = Math.round(data.projects.reduce((sum, project) => sum + project.progress, 0) / Math.max(1, data.projects.length));
    return { doing, completedTasks, riskTasks, progress };
  }, [data.projects, data.tasks]);

  function openTask(task: Task) {
    setSelectedTaskId(task.id);
    setUpdateDraft({ kind: '进展', summary: '', issue: '', optimization: '', nextStep: '', progress: task.progress });
    setScheduleDraft({ start: task.start, end: task.end, delayDays: 1 });
    setTaskDetailOpen(true);
  }

  function persistTaskSchedule() {
    if (!selectedTask || !scheduleDraft.start || !scheduleDraft.end || scheduleDraft.end < scheduleDraft.start) return false;
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === selectedTask.id ? { ...task, start: scheduleDraft.start, end: scheduleDraft.end } : task),
    }));
    return true;
  }

  function saveTaskSchedule(event: FormEvent) {
    event.preventDefault();
    persistTaskSchedule();
  }

  function saveTaskScheduleAndClose() {
    if (persistTaskSchedule()) setTaskDetailOpen(false);
  }

  function updateTaskScheduleFromGantt(taskId: string, start: string, end: string) {
    if (!start || !end || end < start) return;
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, start, end } : task),
    }));
  }

  function delayTask() {
    if (!selectedTask || !scheduleDraft.end) return;
    const delayDays = Math.max(1, Math.min(3650, Math.round(Number(scheduleDraft.delayDays) || 1)));
    const end = dateKey(addDays(dateAtMidnight(scheduleDraft.end), delayDays));
    setScheduleDraft((current) => ({ ...current, end, delayDays }));
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === selectedTask.id ? { ...task, end } : task),
    }));
  }

  function openNewTask(projectId = selectedProject?.id ?? data.projects[0]?.id ?? '') {
    setNewTaskDraft({ ...emptyTaskDraft, projectId });
    setNewTaskOpen(true);
  }

  function openNewProject(parentId = '') {
    const parent = data.projects.find((project) => project.id === parentId);
    setEditingProjectId(null);
    setProjectDraft({
      ...emptyProjectDraft,
      parentId,
      start: parent?.start ?? emptyProjectDraft.start,
      end: parent?.end ?? emptyProjectDraft.end,
    });
    setProjectDialogOpen(true);
  }

  function openEditProject(project: Project) {
    setEditingProjectId(project.id);
    setProjectDraft({
      name: project.name,
      code: project.code,
      parentId: project.parentId ?? '',
      owner: project.owner,
      start: project.start,
      end: project.end,
      status: project.status,
      description: project.description,
      color: project.color,
    });
    setProjectDialogOpen(true);
  }

  function saveProject(event: FormEvent) {
    event.preventDefault();
    if (!projectDraft.name.trim()) return;
    if (editingProjectId) {
      setData((current) => ({
        ...current,
        projects: current.projects.map((project) => project.id === editingProjectId ? {
          ...project,
          ...projectDraft,
          parentId: projectDraft.parentId || undefined,
          name: projectDraft.name.trim(),
          code: projectDraft.code.trim() || project.code,
          owner: projectDraft.owner.trim() || '未指定',
          description: projectDraft.description.trim(),
        } : project),
      }));
    } else {
      const project: Project = {
        id: makeId('project'),
        parentId: projectDraft.parentId || undefined,
        name: projectDraft.name.trim(),
        code: projectDraft.code.trim() || `PRJ-${String(data.projects.length + 1).padStart(3, '0')}`,
        owner: projectDraft.owner.trim() || '未指定',
        start: projectDraft.start,
        end: projectDraft.end,
        progress: 0,
        status: projectDraft.status,
        health: '正常',
        description: projectDraft.description.trim(),
        color: projectDraft.color,
      };
      setData((current) => ({ ...current, projects: [...current.projects, project] }));
      setSelectedProjectId(project.id);
    }
    setProjectDialogOpen(false);
    setEditingProjectId(null);
    setProjectDraft(emptyProjectDraft);
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!newTaskDraft.title.trim()) return;
    const progress = Math.max(0, Math.min(100, Number(newTaskDraft.progress)));
    const task: Task = {
      id: makeId('task'),
      projectId: newTaskDraft.projectId,
      parentId: newTaskDraft.parentId || undefined,
      title: newTaskDraft.title.trim(),
      description: newTaskDraft.description.trim(),
      owner: newTaskDraft.owner.trim() || '未指定',
      start: newTaskDraft.start,
      end: newTaskDraft.end,
      progress,
      priority: newTaskDraft.priority,
      stage: newTaskDraft.stage,
      health: '正常',
      status: taskStatusFromProgress(progress, '正常'),
    };
    setData((current) => ({ ...current, tasks: [...current.tasks, task] }));
    setSelectedProjectId(task.projectId);
    setNewTaskOpen(false);
    setNewTaskDraft(emptyTaskDraft);
  }

  function addUpdate(event: FormEvent) {
    event.preventDefault();
    if (!selectedTask || !updateDraft.summary.trim()) return;
    const health: Health = updateDraft.kind === '问题' ? '风险' : selectedTask.health === '风险' ? '关注' : selectedTask.health;
    const progress = Math.max(0, Math.min(100, Number(updateDraft.progress)));
    setData((current) => {
      const tasks = current.tasks.map((task) => task.id === selectedTask.id ? { ...task, progress, health, status: taskStatusFromProgress(progress, health) } : task);
      const related = tasks.filter((task) => task.projectId === selectedTask.projectId);
      const projectProgress = Math.round(related.reduce((sum, task) => sum + task.progress, 0) / Math.max(1, related.length));
      return {
        ...current,
        tasks,
        projects: current.projects.map((project) => project.id === selectedTask.projectId ? {
          ...project,
          progress: projectProgress,
          status: projectProgress >= 100 ? '已完成' : project.status === '暂停' ? '暂停' : '进行中',
        } : project),
        updates: [
          ...current.updates,
          {
            id: makeId('update'),
            taskId: selectedTask.id,
            kind: updateDraft.kind,
            summary: updateDraft.summary.trim(),
            issue: updateDraft.issue.trim(),
            optimization: updateDraft.optimization.trim(),
            nextStep: updateDraft.nextStep.trim(),
            progress,
            author: '项目负责人',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
    setUpdateDraft({ kind: '进展', summary: '', issue: '', optimization: '', nextStep: '', progress });
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `项目工作台-完整数据-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    const header = ['项目', '任务', '负责人', '状态', '优先级', '开始日期', '结束日期', '完成率'];
    const rows = data.tasks.map((task) => {
      const project = data.projects.find((item) => item.id === task.projectId);
      return [project?.name ?? '', task.title, task.owner, task.status, task.priority, task.start, task.end, `${task.progress}%`];
    });
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `项目工作台-任务报表-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function restoreDemo() {
    if (!window.confirm('确认恢复公开演示数据？当前本地修改将被覆盖。')) return;
    setData(initialWorkspaceData);
    setSelectedProjectId('demo-orbit');
  }

  const todayText = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());

  return (
    <main className="workspace-shell min-h-screen text-[#17201f]" data-visual-theme={visualTheme}>
      <aside className="workspace-sidebar fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col text-white lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <div className="text-[17px] font-semibold tracking-[0.12em]">项目工作台</div>
            <div className="mt-0.5 text-[9px] tracking-[0.18em] text-white/45">PROJECT WORKBENCH</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6" aria-label="主导航">
          <p className="mb-3 px-3 text-[10px] font-medium tracking-[0.18em] text-white/35">工作台</p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const count = item.id === 'tasks' ? data.tasks.filter((task) => task.status !== '已完成').length : undefined;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  data-demo-id={`nav-${item.id}`}
                  className={`workspace-nav-item flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors ${
                    activeView === item.id ? 'workspace-nav-item--active' : 'text-white/66 hover:bg-white/7 hover:text-white'
                  }`}
                >
                  <item.icon className="size-[17px]" strokeWidth={1.8} />
                  <span className="flex-1">{item.label}</span>
                  {count ? <span className="rounded-full bg-[#c56e4e] px-1.5 py-0.5 text-[10px] text-white">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="m-3 rounded-xl border border-white/10 bg-white/[.045] p-4">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="size-2 rounded-full bg-[#76b79a] shadow-[0_0_0_3px_rgba(118,183,154,.12)]" />
            本地数据已保存
          </div>
          <p className="mt-2 text-[11px] leading-5 text-white/38">数据仅保存在这台设备</p>
        </div>
        <button onClick={() => setActiveView('settings')} className={`mx-3 mb-5 flex h-10 items-center gap-3 rounded-lg px-3 text-xs ${activeView === 'settings' ? 'bg-white/10 text-white' : 'text-white/48 hover:bg-white/5 hover:text-white'}`}>
          <Settings2 className="size-4" /> 系统设置
        </button>
      </aside>

      <section className="lg:pl-[232px]">
        <header className="workspace-topbar sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-black/[.055] px-5 backdrop-blur md:px-8 xl:px-10">
          <div className="min-w-0">
            <div className="hidden text-[11px] tracking-[0.14em] text-[#7c8582] sm:block">PROJECT WORKBENCH / 项目管理</div>
            <h1 className="mt-1 truncate text-[20px] font-semibold tracking-[-.02em]">{viewTitles[activeView]}</h1>
          </div>
          <div className="flex items-center gap-2">
            <VisualThemePicker value={visualTheme} onChange={setVisualTheme} />
            <div className="relative hidden w-[220px] xl:block">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#929a97]" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索项目、任务或负责人" className="h-9 bg-white pl-9 text-xs" />
            </div>
            <NativeSelect value={activeView} onChange={(event) => setActiveView(event.target.value as ViewId)} className="w-[132px] lg:hidden">
              {navItems.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}
            </NativeSelect>
            <Button variant="outline" size="icon-lg" aria-label="通知" className="hidden bg-white sm:inline-flex"><Bell /></Button>
            <Button onClick={() => openNewTask()} className="workspace-primary-button h-9 gap-2 px-3.5 text-white"><Plus className="size-4" /> <span className="hidden sm:inline">新建任务</span></Button>
            <div className="workspace-avatar ml-1 flex size-9 items-center justify-center rounded-full text-xs font-medium text-white">项</div>
          </div>
        </header>

        <div className="w-full p-5 md:p-8 xl:p-10">
          {activeView === 'dashboard' && (
            <DashboardView
              projects={data.projects}
              tasks={projectTasks}
              updates={data.updates}
              milestones={data.milestones}
              allTasks={data.tasks}
              selectedProject={selectedProject}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
              projectMode={projectMode}
              setProjectMode={setProjectMode}
              ganttScale={ganttScale}
              setGanttScale={setGanttScale}
              metrics={metrics}
              todayText={todayText}
              onOpenTask={openTask}
              onScheduleTask={updateTaskScheduleFromGantt}
              onEditProject={openEditProject}
            />
          )}
          {activeView === 'projects' && (
            <ProjectsView
              projects={filteredProjects}
              tasks={data.tasks}
              onSelect={(project) => { setSelectedProjectId(project.id); setActiveView('dashboard'); }}
              onNewTask={openNewTask}
              onNewProject={openNewProject}
              onEditProject={openEditProject}
            />
          )}
          {activeView === 'tasks' && (
            <TasksView
              tasks={filteredTasks}
              projects={data.projects}
              filter={taskStatusFilter}
              setFilter={setTaskStatusFilter}
              onOpenTask={openTask}
            />
          )}
          {activeView === 'calendar' && <CalendarView tasks={data.tasks} projects={data.projects} milestones={data.milestones} onOpenTask={openTask} />}
          {activeView === 'reports' && <ReportsView data={data} onCsv={downloadCsv} onJson={downloadJson} />}
          {activeView === 'settings' && <SettingsView data={data} onJson={downloadJson} onRestore={restoreDemo} />}
        </div>
      </section>

      <NewTaskDialog
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        draft={newTaskDraft}
        setDraft={setNewTaskDraft}
        projects={data.projects}
        tasks={data.tasks}
        onSubmit={addTask}
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        editingProjectId={editingProjectId}
        draft={projectDraft}
        setDraft={setProjectDraft}
        projects={data.projects}
        onSubmit={saveProject}
      />

      <TaskDetailDialog
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
        task={selectedTask}
        project={selectedTask ? data.projects.find((project) => project.id === selectedTask.projectId) : undefined}
        allTasks={data.tasks}
        updates={selectedTaskUpdates}
        draft={updateDraft}
        setDraft={setUpdateDraft}
        onSubmit={addUpdate}
        scheduleDraft={scheduleDraft}
        setScheduleDraft={setScheduleDraft}
        onScheduleSubmit={saveTaskSchedule}
        onDelay={delayTask}
        onSaveAndClose={saveTaskScheduleAndClose}
      />
    </main>
  );
}

function VisualThemePicker({ value, onChange }: { value: VisualThemeId; onChange: (theme: VisualThemeId) => void }) {
  const activeTheme = visualThemes.find((theme) => theme.id === value) ?? visualThemes[0];
  return (
    <div className="visual-theme-picker" aria-label="全局界面主题">
      <span className="visual-theme-picker__label">主题</span>
      <div className="visual-theme-picker__choices">
        {visualThemes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={`visual-theme-choice ${value === theme.id ? 'visual-theme-choice--active' : ''}`}
            style={{ background: `linear-gradient(135deg, ${theme.swatches[0]} 0 33%, ${theme.swatches[1]} 33% 67%, ${theme.swatches[2]} 67%)` }}
            onClick={() => onChange(theme.id)}
            aria-label={`切换为${theme.label}方案：${theme.note}`}
            aria-pressed={value === theme.id}
            title={`${theme.label} · ${theme.note}`}
            data-demo-id={`theme-${theme.id}`}
          />
        ))}
      </div>
      <span className="visual-theme-picker__name">{activeTheme.label}</span>
    </div>
  );
}

function DashboardView({
  projects,
  tasks,
  updates,
  milestones,
  allTasks,
  selectedProject,
  selectedProjectId,
  setSelectedProjectId,
  projectMode,
  setProjectMode,
  ganttScale,
  setGanttScale,
  metrics,
  todayText,
  onOpenTask,
  onScheduleTask,
  onEditProject,
}: {
  projects: Project[];
  tasks: Task[];
  updates: WorkspaceData['updates'];
  milestones: Milestone[];
  allTasks: Task[];
  selectedProject: Project;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  projectMode: 'gantt' | 'list';
  setProjectMode: (mode: 'gantt' | 'list') => void;
  ganttScale: GanttScale;
  setGanttScale: (scale: GanttScale) => void;
  metrics: { doing: number; completedTasks: number; riskTasks: number; progress: number };
  todayText: string;
  onOpenTask: (task: Task) => void;
  onScheduleTask: (taskId: string, start: string, end: string) => void;
  onEditProject: (project: Project) => void;
}) {
  const recentUpdates = [...updates].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const now = dateAtMidnight(new Date());
  const attentionTasks = allTasks
    .filter((task) => task.status !== '已完成' && (dateAtMidnight(task.end) < now || dateAtMidnight(task.end) <= addDays(now, 7) || task.health === '风险'))
    .sort((a, b) => a.end.localeCompare(b.end));

  return (
    <>
      <section className="dashboard-summary-strip mb-4" aria-label="项目经营摘要">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] text-[#7d8783]"><CalendarDays className="size-3.5" /> {todayText}</div>
          <p className="mt-1 text-sm text-[#707976]">你好，项目负责人</p>
          <p className="mt-0.5 truncate text-[18px] font-semibold tracking-[-.025em]">关键事项，保持在掌控之中</p>
        </div>
        <div className="min-w-0 border-black/[.06] lg:border-l lg:pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: selectedProject.color }} />
            <NativeSelect value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="h-9 min-w-[220px] flex-1">
              {projects.map((project) => <NativeSelectOption key={project.id} value={project.id}>{project.name}</NativeSelectOption>)}
            </NativeSelect>
            <Badge variant="secondary" className={healthClass(selectedProject.health)}>{selectedProject.health === '正常' ? '正常推进' : selectedProject.health}</Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => onEditProject(selectedProject)} className="h-9 shrink-0 bg-white px-3 text-[11px] text-[#405d57]"><PencilLine className="size-3.5" /> 编辑项目</Button>
          </div>
          <p className="mt-1.5 truncate pl-[18px] text-[10px] text-[#7b8481]">{formatDate(selectedProject.start)} — {formatDate(selectedProject.end)} · {selectedProject.owner}负责</p>
        </div>
        <div className="grid grid-cols-4 divide-x divide-black/[.06] rounded-xl bg-[#f6f7f5] px-2 py-2 lg:col-span-2 xl:col-span-1">
          {[
            { label: '进行中', value: String(metrics.doing), tone: 'ink' },
            { label: '已完成', value: String(metrics.completedTasks), tone: 'green' },
            { label: '风险', value: String(metrics.riskTasks), tone: 'orange' },
            { label: '总进度', value: `${metrics.progress}%`, tone: 'blue' },
          ].map((metric) => (
            <div key={metric.label} className="px-2 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#7d8783]"><span className={`metric-dot metric-dot--${metric.tone}`} />{metric.label}</div>
              <div className="mt-1 text-[17px] font-semibold leading-none tabular-nums">{metric.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <article className="w-full overflow-hidden rounded-[14px] border border-black/[.07] bg-white shadow-[0_8px_28px_rgba(25,40,38,.035)]">
          <div className="flex flex-col gap-3 border-b border-black/[.055] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg bg-[#f2f3f1] p-0.5 text-[11px]">
              <button onClick={() => setProjectMode('list')} className={`rounded-md px-3 py-1.5 ${projectMode === 'list' ? 'bg-white font-medium shadow-sm' : 'text-[#777f7d]'}`}>任务列表</button>
              <button onClick={() => setProjectMode('gantt')} className={`rounded-md px-3 py-1.5 ${projectMode === 'gantt' ? 'bg-white font-medium shadow-sm' : 'text-[#777f7d]'}`}>甘特图</button>
              </div>
              <div className="hidden h-6 w-px bg-black/[.07] sm:block" />
              <div className="text-[10px] text-[#7b8481]">项目进度 <strong className="ml-1 text-xs text-[#263b38]">{selectedProject.progress}%</strong></div>
            </div>
            <div className="flex items-center gap-2">
              {projectMode === 'gantt' ? (
                <>
                  <span className="hidden text-[9px] text-[#8a9490] xl:inline">拖动主体平移 · 拖动两端缩放</span>
                  <div className="flex items-center gap-1 rounded-lg border border-black/[.07] bg-white p-0.5 text-[11px]">
                    {([['day', '日'], ['week', '周'], ['month', '月']] as const).map(([value, label]) => (
                      <button key={value} onClick={() => setGanttScale(value)} data-demo-id={`gantt-scale-${value}`} className={`gantt-scale-button rounded-md px-3 py-1.5 transition-colors ${ganttScale === value ? 'gantt-scale-button--active font-medium text-white' : 'text-[#6f7976] hover:bg-[#f2f4f1]'}`}>按{label}</button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {projectMode === 'gantt' ? (
            <GanttTable tasks={tasks} milestones={milestones.filter((milestone) => milestone.projectId === selectedProject.id)} project={selectedProject} scale={ganttScale} onOpenTask={onOpenTask} onScheduleTask={onScheduleTask} />
          ) : (
            <div className="project-task-grid">
              {[...tasks].sort((a, b) => a.end.localeCompare(b.end)).map((task) => {
                const overdue = task.status !== '已完成' && dateAtMidnight(task.end) < now;
                const soon = task.status !== '已完成' && !overdue && dateAtMidnight(task.end) <= addDays(now, 7);
                const tileState = task.status === '已完成' ? 'done' : overdue ? 'overdue' : soon ? 'soon' : task.status === '受阻' ? 'blocked' : task.status === '未开始' ? 'waiting' : 'active';
                return (
                  <button key={task.id} onClick={() => onOpenTask(task)} className={`project-task-tile project-task-tile--${tileState}`}>
                    <span className="project-task-tile__accent" />
                    <span className="project-task-tile__title">{task.title}</span>
                    <span className="project-task-tile__meta">{task.owner} · {formatDate(task.end)}</span>
                    <span className="project-task-tile__progress">{task.progress}%</span>
                  </button>
                );
              })}
              {!tasks.length ? <p className="col-span-full py-8 text-center text-xs text-[#8d9693]">这个项目还没有任务</p> : null}
            </div>
          )}
        </article>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <article className="rounded-[14px] border border-black/[.07] bg-white p-5 shadow-[0_8px_28px_rgba(25,40,38,.03)]">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">时限提醒</h2><span className="text-[11px] text-[#a44c3e]">{attentionTasks.length} 项</span></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {attentionTasks.slice(0, 4).map((task) => {
                const overdue = dateAtMidnight(task.end) < now;
                return (
                  <button key={task.id} onClick={() => onOpenTask(task)} className={`rounded-xl border p-4 text-left transition-colors ${overdue ? 'border-[#f1c1bd] bg-[#fff4f2] hover:border-[#df8780]' : 'border-[#f0d79b] bg-[#fffae9] hover:border-[#e1b94f]'}`}>
                    <div className={`flex items-center gap-2 text-[11px] font-semibold ${overdue ? 'text-[#c23832]' : 'text-[#a46e00]'}`}><CircleAlert className="size-4" /> {overdue ? `已逾期 ${daysBetween(task.end, dateKey(now))} 天` : `${formatDate(task.end)} 截止`}</div>
                    <p className="mt-2 truncate text-xs font-medium">{task.title}</p>
                  </button>
                );
              })}
              {!attentionTasks.length && <p className="py-4 text-xs text-[#8d9693]">当前没有临期或逾期任务</p>}
            </div>
          </article>

          <article className="rounded-[14px] border border-black/[.07] bg-white p-5 shadow-[0_8px_28px_rgba(25,40,38,.03)]">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">最新进展</h2><Badge variant="outline" className="text-[10px] text-[#7a8380]">最近 {recentUpdates.length} 条</Badge></div>
            <div className="mt-5 space-y-5 border-l border-[#dfe3e0] pl-4">
              {recentUpdates.map((update, index) => {
                const task = allTasks.find((item) => item.id === update.taskId);
                return (
                  <button key={update.id} onClick={() => task && onOpenTask(task)} className="relative block w-full text-left">
                    <span className={`activity-dot ${index === 0 ? 'activity-dot--active' : ''}`} />
                    <p className="text-[12px] font-medium leading-5">{update.summary}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-[#969d9a]"><span>{update.author} · {formatDateTime(update.createdAt)}</span><span>{update.kind}</span></div>
                  </button>
                );
              })}
              {!recentUpdates.length && <p className="-ml-4 py-2 text-xs text-[#8d9693]">尚无工作记录。打开任一任务即可记录进展。</p>}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

type TimelinePeriod = { key: string; label: string; startOffset: number; days: number };

function buildTimelinePeriods(project: Project, scale: GanttScale): TimelinePeriod[] {
  const projectStart = dateAtMidnight(project.start);
  const projectEnd = dateAtMidnight(project.end);
  const periods: TimelinePeriod[] = [];
  let cursor = projectStart;
  while (cursor <= projectEnd) {
    let periodEnd = cursor;
    if (scale === 'week') periodEnd = addDays(cursor, 6);
    if (scale === 'month') periodEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    if (periodEnd > projectEnd) periodEnd = projectEnd;
    const days = Math.round((periodEnd.getTime() - cursor.getTime()) / DAY_MS) + 1;
    const label = scale === 'day'
      ? `${cursor.getMonth() + 1}/${cursor.getDate()}`
      : scale === 'week'
        ? `${cursor.getMonth() + 1}/${cursor.getDate()}—${periodEnd.getMonth() + 1}/${periodEnd.getDate()}`
        : `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`;
    periods.push({ key: `${scale}-${dateKey(cursor)}`, label, startOffset: daysBetween(project.start, dateKey(cursor)), days });
    cursor = addDays(periodEnd, 1);
  }
  return periods;
}

function TimelineBackdrop({ periods, dayWidth, project, className = '' }: { periods: TimelinePeriod[]; dayWidth: number; project: Project; className?: string }) {
  const today = dateAtMidnight(new Date());
  const start = dateAtMidnight(project.start);
  const end = dateAtMidnight(project.end);
  const showToday = today >= start && today <= end;
  const mondays: Array<{ key: string; offset: number }> = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    if (cursor.getDay() === 1) mondays.push({ key: dateKey(cursor), offset: daysBetween(project.start, dateKey(cursor)) });
  }
  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      {mondays.map((monday) => <span key={monday.key} className="monday-column" style={{ left: monday.offset * dayWidth, width: dayWidth }} />)}
      {periods.map((period) => <span key={period.key} className="timeline-period-line" style={{ left: period.startOffset * dayWidth, width: period.days * dayWidth }} />)}
      {showToday ? <span className="today-line" style={{ left: daysBetween(project.start, dateKey(today)) * dayWidth + dayWidth / 2 }} /> : null}
    </div>
  );
}

type GanttDragMode = 'move' | 'resize-start' | 'resize-end';
type GanttDragSession = { mode: GanttDragMode; pointerId: number; originX: number; originalStart: string; originalEnd: string; currentStart: string; currentEnd: string; deltaDays: number; moved: boolean };

function GanttTaskBar({ task, tone, motionState, timelineStart, timelineWidth, dayWidth, onOpenTask, onScheduleTask }: {
  task: Task;
  tone: string;
  motionState: 'completed' | 'overdue' | 'soon' | 'blocked' | 'not-started' | 'active';
  timelineStart: string;
  timelineWidth: number;
  dayWidth: number;
  onOpenTask: (task: Task) => void;
  onScheduleTask: (taskId: string, start: string, end: string) => void;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<GanttDragSession | null>(null);
  const suppressClickRef = useRef(false);
  const [preview, setPreview] = useState<{ start: string; end: string; mode: GanttDragMode; deltaDays: number } | null>(null);
  const activeStart = preview?.start ?? task.start;
  const activeEnd = preview?.end ?? task.end;
  const startOffset = daysBetween(timelineStart, activeStart);
  const taskLength = Math.max(1, daysBetween(activeStart, activeEnd) + 1);
  const left = Math.max(0, Math.min(timelineWidth - dayWidth, startOffset * dayWidth));
  const width = Math.max(dayWidth, Math.min(taskLength * dayWidth, timelineWidth - left));

  function beginDrag(event: React.PointerEvent, mode: GanttDragMode) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    barRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      originX: event.clientX,
      originalStart: task.start,
      originalEnd: task.end,
      currentStart: task.start,
      currentEnd: task.end,
      deltaDays: 0,
      moved: false,
    };
    setPreview({ start: task.start, end: task.end, mode, deltaDays: 0 });
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    const requestedDelta = Math.round((event.clientX - session.originX) / dayWidth);
    let start = session.originalStart;
    let end = session.originalEnd;
    let appliedDelta = requestedDelta;
    if (session.mode === 'move') {
      start = dateKey(addDays(dateAtMidnight(session.originalStart), requestedDelta));
      end = dateKey(addDays(dateAtMidnight(session.originalEnd), requestedDelta));
    } else if (session.mode === 'resize-start') {
      const maxDelta = Math.max(0, daysBetween(session.originalStart, session.originalEnd));
      appliedDelta = Math.min(requestedDelta, maxDelta);
      start = dateKey(addDays(dateAtMidnight(session.originalStart), appliedDelta));
    } else {
      const minDelta = -Math.max(0, daysBetween(session.originalStart, session.originalEnd));
      appliedDelta = Math.max(requestedDelta, minDelta);
      end = dateKey(addDays(dateAtMidnight(session.originalEnd), appliedDelta));
    }
    session.currentStart = start;
    session.currentEnd = end;
    session.deltaDays = appliedDelta;
    session.moved = session.moved || Math.abs(event.clientX - session.originX) >= 3;
    setPreview({ start, end, mode: session.mode, deltaDays: appliedDelta });
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>, commit: boolean) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (barRef.current?.hasPointerCapture(event.pointerId)) barRef.current.releasePointerCapture(event.pointerId);
    if (commit && session.moved && (session.currentStart !== task.start || session.currentEnd !== task.end)) {
      onScheduleTask(task.id, session.currentStart, session.currentEnd);
    }
    suppressClickRef.current = session.moved;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    dragRef.current = null;
    setPreview(null);
  }

  const dragLabel = preview
    ? `${preview.mode === 'move' ? '整体移动' : preview.mode === 'resize-start' ? '调整开始' : '调整结束'} ${preview.deltaDays > 0 ? '+' : ''}${preview.deltaDays} 天`
    : '';

  return (
    <div
      ref={barRef}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}，${formatDate(activeStart)}至${formatDate(activeEnd)}。拖动主体移动任务，拖动两端调整长度。`}
      data-demo-id={`gantt-task-${task.id}`}
      className={`gantt-bar gantt-bar--${tone} gantt-bar--motion-${motionState} ${preview ? 'gantt-bar--dragging' : ''}`}
      style={{ left, width }}
      title={`${task.title} · ${task.progress}% · 拖动主体平移，拖动两端调整日期`}
      onPointerDown={(event) => beginDrag(event, 'move')}
      onPointerMove={moveDrag}
      onPointerUp={(event) => finishDrag(event, true)}
      onPointerCancel={(event) => finishDrag(event, false)}
      onClick={() => { if (!suppressClickRef.current) onOpenTask(task); }}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenTask(task); } }}
    >
      {task.progress > 0 ? <span className="gantt-progress-fill" style={{ width: `${task.progress}%` }} /> : null}
      {width >= 62 ? <em className={task.progress < 28 ? 'gantt-progress-label--light' : ''}>{task.progress}%</em> : null}
      <span className="gantt-resize-handle gantt-resize-handle--start" onPointerDown={(event) => beginDrag(event, 'resize-start')} onClick={(event) => event.stopPropagation()} aria-hidden="true" />
      <span className="gantt-resize-handle gantt-resize-handle--end" onPointerDown={(event) => beginDrag(event, 'resize-end')} onClick={(event) => event.stopPropagation()} aria-hidden="true" />
      {preview ? <span className="gantt-drag-preview"><strong>{dragLabel}</strong><span>{formatDate(preview.start)} — {formatDate(preview.end)}</span></span> : null}
    </div>
  );
}

function GanttTable({ tasks, milestones, project, scale, onOpenTask, onScheduleTask }: { tasks: Task[]; milestones: Milestone[]; project: Project; scale: GanttScale; onOpenTask: (task: Task) => void; onScheduleTask: (taskId: string, start: string, end: string) => void }) {
  const timelineProject: Project = {
    ...project,
    start: [project.start, ...tasks.map((task) => task.start), ...milestones.map((milestone) => milestone.date)].sort()[0],
    end: [project.end, ...tasks.map((task) => task.end), ...milestones.map((milestone) => milestone.date)].sort().at(-1) ?? project.end,
  };
  const totalDays = Math.max(1, daysBetween(timelineProject.start, timelineProject.end) + 1);
  const dayWidth = scale === 'day' ? 36 : scale === 'week' ? 18 : 10;
  const timelineWidth = totalDays * dayWidth;
  const labelWidth = 320;
  const rowGrid = { gridTemplateColumns: `${labelWidth}px ${timelineWidth}px` };
  const periods = buildTimelinePeriods(timelineProject, scale);
  const now = dateAtMidnight(new Date());

  return (
    <div className="gantt-scroll overflow-auto">
      <div style={{ minWidth: labelWidth + timelineWidth }}>
        <div className="sticky top-0 z-30 grid border-b border-black/[.08] bg-[#fafaf8] shadow-[0_5px_14px_rgba(25,40,38,.08)]" style={rowGrid}>
          <div className="gantt-label-cell z-20 flex h-12 items-center px-6 text-[11px] font-medium tracking-wide text-[#7c8582]">任务 / 负责人</div>
          <div className="relative h-12 bg-[#fafaf8]">
            <TimelineBackdrop periods={periods} dayWidth={dayWidth} project={timelineProject} />
            {periods.map((period) => (
              <span key={period.key} className="absolute bottom-3 truncate px-2 text-center text-[9px] font-medium text-[#717c78]" style={{ left: period.startOffset * dayWidth, width: period.days * dayWidth }}>{period.label}</span>
            ))}
          </div>
        </div>
        {tasks.length ? stageOrder.map((stage) => {
          const stageTasks = tasks.filter((task) => task.stage === stage);
          if (!stageTasks.length) return null;
          return (
            <div key={stage}>
              <div className="grid border-b border-black/[.055] bg-[#f5f6f3]" style={rowGrid}>
                <div className="gantt-label-cell flex h-9 items-center gap-2 bg-[#f5f6f3] px-6 text-[11px] font-semibold text-[#5d6865]"><span className={`stage-dot stage-dot--${stage}`} />{stageLabels[stage]}</div>
                <div className="relative h-9 bg-[#f5f6f3]"><TimelineBackdrop periods={periods} dayWidth={dayWidth} project={timelineProject} /></div>
              </div>
              {stageTasks.map((task) => {
                const overdue = task.status !== '已完成' && dateAtMidnight(task.end) < now;
                const soon = task.status !== '已完成' && !overdue && dateAtMidnight(task.end) <= addDays(now, 7);
                const tone = task.status === '已完成'
                  ? 'completed'
                  : overdue
                    ? 'overdue'
                    : soon
                      ? 'soon'
                      : task.status === '进行中'
                        ? 'active'
                        : task.status === '受阻'
                          ? 'blocked'
                          : 'not-started';
                const motionState = task.status === '已完成' ? 'completed' : overdue ? 'overdue' : soon ? 'soon' : task.status === '受阻' ? 'blocked' : task.status === '未开始' ? 'not-started' : 'active';
                return (
                  <div key={task.id} className="gantt-task-row grid w-full border-b border-black/[.052] text-left" style={rowGrid}>
                    <button type="button" onClick={() => onOpenTask(task)} className="gantt-label-cell gantt-task-cell flex items-center gap-3 bg-white px-6 text-left">
                      <span className="w-4 shrink-0 border-t border-[#c8cecb]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium">{task.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-[#929a97]"><span>{formatDate(task.start)} — {formatDate(task.end)}</span>{overdue ? <span className="font-semibold text-[#d13832]">已逾期</span> : soon ? <span className="font-semibold text-[#b67800]">即将到期</span> : null}</div>
                      </div>
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#eef0ed] text-[10px] font-medium text-[#66706d]">{task.owner === '待指定' ? '待' : task.owner.slice(0, 1)}</span>
                    </button>
                    <div className="gantt-task-cell relative bg-white">
                      <TimelineBackdrop periods={periods} dayWidth={dayWidth} project={timelineProject} />
                      <GanttTaskBar task={task} tone={tone} motionState={motionState} timelineStart={timelineProject.start} timelineWidth={timelineWidth} dayWidth={dayWidth} onOpenTask={onOpenTask} onScheduleTask={onScheduleTask} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }) : <div className="p-10 text-center text-sm text-[#8a9390]">这个项目还没有任务</div>}
        {milestones.length ? (
          <div>
            <div className="grid border-b border-black/[.055] bg-[#f5f6f3]" style={rowGrid}>
              <div className="gantt-label-cell flex h-9 items-center gap-2 bg-[#f5f6f3] px-6 text-[11px] font-semibold text-[#5d6865]"><span className="milestone-mini-diamond" />关键里程碑</div>
              <div className="relative h-9 bg-[#f5f6f3]"><TimelineBackdrop periods={periods} dayWidth={dayWidth} project={timelineProject} /></div>
            </div>
            {milestones.map((milestone) => {
              const left = Math.min(timelineWidth - 6, daysBetween(timelineProject.start, milestone.date) * dayWidth + dayWidth / 2);
              return (
                <div key={milestone.id} className="grid border-b border-black/[.052]" style={rowGrid}>
                  <div className="gantt-label-cell flex h-11 items-center gap-3 bg-white px-6"><span className="w-4" /><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-medium">{milestone.name}</div><div className="mt-0.5 text-[9px] text-[#9aa19f]">{formatDate(milestone.date)}</div></div></div>
                  <div className="relative h-11 bg-white"><TimelineBackdrop periods={periods} dayWidth={dayWidth} project={timelineProject} /><span className="milestone-gantt-diamond" style={{ left }} /></div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectsView({ projects, tasks, onSelect, onNewTask, onNewProject, onEditProject }: {
  projects: Project[];
  tasks: Task[];
  onSelect: (project: Project) => void;
  onNewTask: (projectId: string) => void;
  onNewProject: (parentId?: string) => void;
  onEditProject: (project: Project) => void;
}) {
  const orderedProjects = [...projects].sort((a, b) => {
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeading title="项目组合" description="项目可独立存在，也可挂在大项目下形成多层计划。" />
        <Button onClick={() => onNewProject()} className="bg-[#25534e] text-white hover:bg-[#1d4540]"><FolderPlus /> 新建项目</Button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {orderedProjects.map((project) => {
          const projectTasks = tasks.filter((task) => task.projectId === project.id);
          const risks = projectTasks.filter((task) => task.health === '风险').length;
          const parent = projects.find((item) => item.id === project.parentId);
          const childCount = projects.filter((item) => item.parentId === project.id).length;
          return (
            <article key={project.id} className={`project-card ${project.parentId ? 'project-card--child' : ''}`}>
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#f0f2ef] px-2 py-1 font-mono text-[10px] text-[#77807d]">{project.code}</span>{parent ? <span className="rounded-md bg-[#edf2ff] px-2 py-1 text-[10px] text-[#4d66a0]">子项目 · {parent.name}</span> : <span className="rounded-md bg-[#eef5f2] px-2 py-1 text-[10px] text-[#477064]">独立项目</span>}</div>
                  <span className={`status-chip ${healthClass(project.health)}`}>{project.health}</span>
                </div>
                <button onClick={() => onSelect(project)} className="mt-6 flex w-full items-center gap-3 text-left">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
                  <h2 className="text-[16px] font-semibold hover:text-[#376c64]">{project.name}</h2>
                  <ChevronRight className="ml-auto size-4 text-[#9ca4a1]" />
                </button>
                <p className="mt-3 min-h-10 text-xs leading-5 text-[#7a8380]">{project.description}</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#edf0ed]"><span className="block h-full rounded-full" style={{ width: `${project.progress}%`, backgroundColor: project.color }} /></div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#8b9390]"><span>{project.progress}% 完成</span><span>{formatDate(project.end)} 截止</span></div>
                <div className="mt-5 grid grid-cols-4 border-t border-black/[.055] pt-4 text-center">
                  <div><div className="text-sm font-semibold">{projectTasks.length}</div><div className="mt-1 text-[10px] text-[#969d9a]">任务</div></div>
                  <div className="border-x border-black/[.055]"><div className="text-sm font-semibold">{risks}</div><div className="mt-1 text-[10px] text-[#969d9a]">风险</div></div>
                  <div className="border-r border-black/[.055]"><div className="text-sm font-semibold">{childCount}</div><div className="mt-1 text-[10px] text-[#969d9a]">子项目</div></div>
                  <div><div className="truncate text-sm font-semibold">{project.owner.slice(0, 2)}</div><div className="mt-1 text-[10px] text-[#969d9a]">负责人</div></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-1 border-t border-black/[.05] pt-3">
                <Button onClick={() => onEditProject(project)} variant="ghost" size="sm" className="text-[#61706c]"><PencilLine /> 名称与描述</Button>
                <Button onClick={() => onNewProject(project.id)} variant="ghost" size="sm" className="text-[#61706c]"><FolderPlus /> 子项目</Button>
                <Button onClick={() => onNewTask(project.id)} variant="ghost" size="sm" className="text-[#61706c]"><Plus /> 任务</Button>
              </div>
            </article>
          );
        })}
        {!orderedProjects.length ? <div className="rounded-[14px] border border-dashed border-[#cfd6d2] bg-white p-12 text-center text-sm text-[#7e8884] md:col-span-2 2xl:col-span-3">没有符合搜索条件的项目</div> : null}
      </div>
    </section>
  );
}

type TaskUrgency = { score: number; level: 'overdue' | 'critical' | 'soon' | 'normal' | 'done'; label: string; color: string; daysLeft: number };

function getTaskUrgency(task: Task, today = dateAtMidnight(new Date())): TaskUrgency {
  const daysLeft = Math.ceil((dateAtMidnight(task.end).getTime() - today.getTime()) / DAY_MS);
  if (task.status === '已完成') return { score: -1000, level: 'done', label: '已完成', color: 'var(--urgency-done)', daysLeft };
  const remaining = 100 - task.progress;
  const priorityWeight = task.priority === '高' ? 22 : task.priority === '中' ? 10 : 0;
  const healthWeight = task.health === '风险' ? 34 : task.health === '关注' ? 15 : 0;
  const score = (daysLeft < 0 ? 145 + Math.abs(daysLeft) * 5 : Math.max(0, 55 - daysLeft * 4)) + remaining * .22 + priorityWeight + healthWeight;
  if (daysLeft < 0) return { score, level: 'overdue', label: `逾期 ${Math.abs(daysLeft)} 天`, color: 'var(--urgency-overdue)', daysLeft };
  if (daysLeft <= 3) return { score, level: 'critical', label: daysLeft === 0 ? '今日截止' : `剩余 ${daysLeft} 天`, color: 'var(--urgency-critical)', daysLeft };
  if (daysLeft <= 7) return { score, level: 'soon', label: `剩余 ${daysLeft} 天`, color: 'var(--urgency-soon)', daysLeft };
  return { score, level: 'normal', label: `${daysLeft} 天后截止`, color: 'var(--urgency-normal)', daysLeft };
}

function fieldNoise(index: number, salt: number) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function taskCloudPositions(count: number, taskCount: number) {
  const points: Array<{ x: number; y: number; ring: number }> = [];
  for (let index = 0; index < count; index += 1) {
    if (index === 0) {
      points.push({ x: -18, y: 18, ring: 0 });
      continue;
    }
    const isTask = index < taskCount;
    const isCoreTask = isTask && index < Math.min(taskCount, 6);
    const angle = index * 2.399963 + (fieldNoise(index, 1) - .5) * 1.15;
    const irregularEdge = .82 + fieldNoise(index, 8) * .3 + Math.sin(angle * 2.7) * .07;
    let radius: number;
    if (isCoreTask) radius = 122 + fieldNoise(index, 2) * 72;
    else if (isTask) radius = 150 + fieldNoise(index, 3) * 190;
    else radius = 92 + Math.sqrt(fieldNoise(index, 4)) * 330 * irregularEdge;
    const x = Math.cos(angle) * radius + (fieldNoise(index, 5) - .5) * 34;
    const y = Math.sin(angle) * radius * (.61 + fieldNoise(index, 6) * .11) + (fieldNoise(index, 7) - .5) * 28;
    points.push({ x, y, ring: Math.max(1, Math.round(radius / 92)) });
  }
  return points;
}

function taskVisualColor(task: Task, project?: Project) {
  const colors: Record<StageKey, string> = {
    docs: 'var(--task-stage-docs)',
    renovation: 'var(--task-stage-design)',
    equipment: 'var(--task-stage-build)',
    people: 'var(--task-stage-collab)',
    trial: 'var(--task-stage-release)',
  };
  return task.stage ? colors[task.stage] : project?.color ?? 'var(--task-stage-docs)';
}

function shortTaskTitle(title: string) {
  const firstPhrase = title.split(/[（(:：/]/)[0].replace(/[·\s]/g, '');
  return firstPhrase.slice(0, 6) || title.slice(0, 6);
}

type PhysicsNode = { baseX: number; baseY: number; size: number; x: number; y: number; vx: number; vy: number; scale: number; scaleVelocity: number; driftX: number; driftY: number; driftPhase: number; driftSpeed: number; driftAmpX: number; driftAmpY: number };
type PhysicsWave = { x: number; y: number; age: number; strength: number };
type TaskPhysics = { width: number; height: number; nodes: PhysicsNode[]; pointer: { x: number; y: number; active: boolean; focusIndex: number }; waves: PhysicsWave[]; lastPulseAt: number; lastHit: number };
type TaskFieldNodeBase = { id: string; xOffset: number; yOffset: number; size: number; color: string; ring: number };
type TaskFieldNode = TaskFieldNodeBase & ({ kind: 'task'; task: Task; urgency: TaskUrgency; project?: Project } | { kind: 'blank' });

function TasksView({ tasks, projects, filter, setFilter, onOpenTask }: { tasks: Task[]; projects: Project[]; filter: '全部' | TaskStatus; setFilter: (value: '全部' | TaskStatus) => void; onOpenTask: (task: Task) => void }) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const physicsRef = useRef<TaskPhysics | null>(null);
  const rankedTasks = useMemo(() => tasks
    .map((task) => ({ task, urgency: getTaskUrgency(task) }))
    .sort((a, b) => b.urgency.score - a.urgency.score), [tasks]);
  const fieldSlotCount = Math.max(61, rankedTasks.length);
  const positions = useMemo(() => taskCloudPositions(fieldSlotCount, rankedTasks.length), [fieldSlotCount, rankedTasks.length]);
  const layoutNodes = useMemo<TaskFieldNode[]>(() => {
    const blankColors = ['var(--task-blank-1)', 'var(--task-blank-2)', 'var(--task-blank-3)', 'var(--task-blank-4)', 'var(--task-blank-5)', 'var(--task-blank-6)'];
    const nodes: TaskFieldNode[] = positions.map((position, index) => {
      const ranked = rankedTasks[index];
      const xOffset = position.x;
      const yOffset = position.y;
      if (!ranked) return {
        kind: 'blank' as const,
        id: `blank-${index}`,
        xOffset,
        yOffset,
        size: 46 + Math.round(fieldNoise(index, 11) * 38),
        color: blankColors[index % blankColors.length],
        ring: position.ring,
      };
      const { task, urgency } = ranked;
      const project = projects.find((item) => item.id === task.projectId);
      return {
        kind: 'task' as const,
        id: task.id,
        task,
        urgency,
        project,
        xOffset,
        yOffset,
        size: Math.round(Math.max(66, Math.min(138,
          68 + fieldNoise(index, 12) * 23
          + Math.max(0, 34 - index * 5)
          + (urgency.daysLeft <= 7 && urgency.level !== 'done' ? 12 : 0)
          + (urgency.level === 'overdue' ? 7 : urgency.level === 'done' ? -10 : 0)
        ))),
        color: taskVisualColor(task, project),
        ring: position.ring,
      };
    });
    for (let pass = 0; pass < 52; pass += 1) {
      for (let first = 0; first < nodes.length; first += 1) {
        for (let second = first + 1; second < nodes.length; second += 1) {
          const a = nodes[first];
          const b = nodes[second];
          const dx = b.xOffset - a.xOffset;
          const dy = b.yOffset - a.yOffset;
          const combinedHalfSize = (a.size + b.size) / 2;
          const edgeOverlap = Math.min(9, Math.min(a.size, b.size) * .08);
          const overlapX = combinedHalfSize - Math.abs(dx) - edgeOverlap;
          const overlapY = combinedHalfSize - Math.abs(dy) - edgeOverlap;
          if (overlapX <= 0 || overlapY <= 0) continue;
          const totalSize = a.size + b.size;
          const aPin = first === 0 ? .18 : 1;
          const bPin = second === 0 ? .18 : 1;
          const aShare = (b.size / totalSize) * aPin;
          const bShare = (a.size / totalSize) * bPin;
          const shareTotal = aShare + bShare;
          if (overlapX < overlapY) {
            const direction = dx >= 0 ? 1 : -1;
            a.xOffset -= direction * overlapX * (aShare / shareTotal) * .76;
            b.xOffset += direction * overlapX * (bShare / shareTotal) * .76;
          } else {
            const direction = dy >= 0 ? 1 : -1;
            a.yOffset -= direction * overlapY * (aShare / shareTotal) * .76;
            b.yOffset += direction * overlapY * (bShare / shareTotal) * .76;
          }
        }
      }
    }
    return nodes;
  }, [positions, projects, rankedTasks]);
  const layoutKey = layoutNodes.map((node) => `${node.id}:${node.size}:${node.xOffset.toFixed(1)}:${node.yOffset.toFixed(1)}:${node.kind === 'task' ? node.urgency.level : 'blank'}`).join('|');

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    nodeRefs.current = nodeRefs.current.slice(0, layoutNodes.length);
    const simulation: TaskPhysics = {
      width: field.clientWidth,
      height: field.clientHeight,
      nodes: layoutNodes.map((node, index) => ({
        baseX: node.xOffset,
        baseY: node.yOffset,
        size: node.size,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        scale: 1,
        scaleVelocity: 0,
        driftX: 0,
        driftY: 0,
        driftPhase: fieldNoise(index, 20) * Math.PI * 2,
        driftSpeed: .12 + fieldNoise(index, 21) * .1,
        driftAmpX: 3 + fieldNoise(index, 22) * 6,
        driftAmpY: 2.5 + fieldNoise(index, 23) * 5.5,
      })),
      pointer: { x: 0, y: 0, active: false, focusIndex: -1 },
      waves: [],
      lastPulseAt: 0,
      lastHit: -1,
    };
    physicsRef.current = simulation;
    const resizeObserver = new ResizeObserver(() => {
      simulation.width = field.clientWidth;
      simulation.height = field.clientHeight;
    });
    resizeObserver.observe(field);
    let frameId = 0;
    let previousTime = performance.now();

    const animate = (time: number) => {
      const delta = Math.min(1.8, Math.max(.45, (time - previousTime) / 16.67));
      previousTime = time;
      const centerX = simulation.width / 2;
      const centerY = simulation.height * .54;

      simulation.nodes.forEach((node, index) => {
        if (!simulation.pointer.active) {
          const seconds = time / 1000;
          node.driftX = Math.sin(seconds * node.driftSpeed + node.driftPhase) * node.driftAmpX
            + Math.sin(seconds * node.driftSpeed * .47 + node.driftPhase * 1.8) * 2.2;
          node.driftY = Math.cos(seconds * node.driftSpeed * .83 + node.driftPhase) * node.driftAmpY
            + Math.sin(seconds * node.driftSpeed * .38 + node.driftPhase * 1.3) * 1.8;
        }
        const actualX = centerX + node.baseX + node.x + node.driftX;
        const actualY = centerY + node.baseY + node.y + node.driftY;
        const distance = simulation.pointer.active ? Math.hypot(simulation.pointer.x - actualX, simulation.pointer.y - actualY) : 999;
        const proximity = simulation.pointer.active ? Math.max(0, 1 - distance / 150) : 0;
        const isFocused = simulation.pointer.active && simulation.pointer.focusIndex === index;
        const targetScale = isFocused ? 1.64 : 1 + proximity * .12;
        node.scaleVelocity += (targetScale - node.scale) * .16 * delta;
        node.scaleVelocity *= Math.pow(.73, delta);
        node.scale += node.scaleVelocity * delta;
        const spring = simulation.pointer.active ? .012 : .02;
        node.vx += -node.x * spring * delta;
        node.vy += -node.y * spring * delta;
      });

      simulation.waves.forEach((wave) => {
        wave.age += 16.67 * delta;
        const front = wave.age * .24;
        const decay = Math.max(0, 1 - wave.age / 1750);
        simulation.nodes.forEach((node) => {
          const dx = node.baseX - wave.x;
          const dy = node.baseY - wave.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const band = Math.max(0, 1 - Math.abs(distance - front) / 58);
          if (!band) return;
          const impulse = band * decay * wave.strength * .56;
          node.vx += (dx / distance) * impulse;
          node.vy += (dy / distance) * impulse;
          node.scaleVelocity += band * decay * .012;
        });
      });
      simulation.waves = simulation.waves.filter((wave) => wave.age < 1750);

      for (let first = 0; first < simulation.nodes.length; first += 1) {
        for (let second = first + 1; second < simulation.nodes.length; second += 1) {
          const a = simulation.nodes[first];
          const b = simulation.nodes[second];
          const dx = (b.baseX + b.x + b.driftX) - (a.baseX + a.x + a.driftX);
          const dy = (b.baseY + b.y + b.driftY) - (a.baseY + a.y + a.driftY);
          const combinedHalfSize = (a.size * a.scale + b.size * b.scale) / 2;
          const edgeOverlap = Math.min(10, Math.min(a.size, b.size) * .085);
          const overlapX = combinedHalfSize - Math.abs(dx) - edgeOverlap;
          const overlapY = combinedHalfSize - Math.abs(dy) - edgeOverlap;
          if (overlapX <= 0 || overlapY <= 0) continue;
          const totalSize = a.size + b.size;
          const aShare = b.size / totalSize;
          const bShare = a.size / totalSize;
          if (overlapX < overlapY) {
            const direction = dx >= 0 ? 1 : -1;
            const correction = overlapX * .42;
            const impulse = overlapX * .018;
            a.x -= direction * correction * aShare;
            b.x += direction * correction * bShare;
            a.vx -= direction * impulse * aShare;
            b.vx += direction * impulse * bShare;
          } else {
            const direction = dy >= 0 ? 1 : -1;
            const correction = overlapY * .42;
            const impulse = overlapY * .018;
            a.y -= direction * correction * aShare;
            b.y += direction * correction * bShare;
            a.vy -= direction * impulse * aShare;
            b.vy += direction * impulse * bShare;
          }
        }
      }

      simulation.nodes.forEach((node, index) => {
        const damping = simulation.pointer.active ? .76 : .83;
        node.vx *= Math.pow(damping, delta);
        node.vy *= Math.pow(damping, delta);
        if (Math.abs(node.vx) < .004) node.vx = 0;
        if (Math.abs(node.vy) < .004) node.vy = 0;
        node.x += node.vx * delta;
        node.y += node.vy * delta;
        const element = nodeRefs.current[index];
        if (!element) return;
        element.style.setProperty('--physics-x', `${(node.x + node.driftX).toFixed(2)}px`);
        element.style.setProperty('--physics-y', `${(node.y + node.driftY).toFixed(2)}px`);
        element.style.setProperty('--physics-scale', node.scale.toFixed(3));
        const rotation = Math.abs(node.vx) < .05 ? 0 : Math.max(-1.6, Math.min(1.6, node.vx * .22));
        element.style.setProperty('--physics-rotate', `${rotation.toFixed(2)}deg`);
      });
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      if (physicsRef.current === simulation) physicsRef.current = null;
    };
  }, [layoutKey]);

  function trackPhysicsPointer(event: React.PointerEvent<HTMLDivElement>) {
    const field = fieldRef.current;
    const simulation = physicsRef.current;
    if (!field || !simulation) return;
    const rect = field.getBoundingClientRect();
    simulation.width = rect.width;
    simulation.height = rect.height;
    simulation.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true, focusIndex: simulation.pointer.focusIndex };
    let nearest = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    simulation.nodes.forEach((node, index) => {
      const x = simulation.width / 2 + node.baseX + node.x + node.driftX;
      const y = simulation.height * .54 + node.baseY + node.y + node.driftY;
      const distance = Math.hypot(simulation.pointer.x - x, simulation.pointer.y - y);
      if (distance < nearestDistance) { nearest = index; nearestDistance = distance; }
    });
    simulation.pointer.focusIndex = nearest >= 0 && nearestDistance < 145 ? nearest : -1;
    const now = performance.now();
    if (nearest >= 0 && nearestDistance < 145 && (nearest !== simulation.lastHit || now - simulation.lastPulseAt > 360)) {
      const source = simulation.nodes[nearest];
      simulation.waves.push({ x: source.baseX, y: source.baseY, age: 0, strength: 1 });
      source.scaleVelocity += .055;
      simulation.lastHit = nearest;
      simulation.lastPulseAt = now;
    }
  }

  function releasePhysicsPointer() {
    const simulation = physicsRef.current;
    if (!simulation) return;
    simulation.pointer.active = false;
    simulation.pointer.focusIndex = -1;
    simulation.lastHit = -1;
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading title="任务动力场" description="近期事项向中心聚合；每一块都在自由漂移，光标经过会把碰撞逐层传向周围。" />
        <div className="flex flex-wrap gap-2">
          {(['全部', '未开始', '进行中', '受阻', '已完成'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`filter-pill ${filter === item ? 'filter-pill--active' : ''}`}>{item}</button>)}
        </div>
      </div>

      <div ref={fieldRef} className="task-universe task-universe--collision mt-6" onPointerMove={trackPhysicsPointer} onPointerLeave={releasePhysicsPointer}>
        <div className="task-universe__shade" />
        <div className="task-universe__hud">
          <div>
            <p className="text-[10px] font-medium tracking-[.18em] text-white/45">TASK DYNAMICS</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-white"><Target className="task-dynamics-icon size-4" /> 任务碰撞场 <span className="text-white/45">· {rankedTasks.length} 项任务</span></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/65"><span>越近、越大，越需优先处理</span><span className="text-white/25">|</span><span>液态水位代表完成度</span></div>
        </div>

        <div className="collision-grid">
          {layoutNodes.map((node, index) => {
            const { xOffset, yOffset, size, color, ring } = node;
            const style = {
              left: `calc(50% + ${xOffset}px)`,
              top: `calc(54% + ${yOffset}px)`,
              width: size,
              height: size,
              zIndex: Math.max(3, 50 - ring * 6 - index),
              '--task-tone': color,
              '--urgency-tone': node.kind === 'task' ? node.urgency.color : color,
              '--physics-x': '0px',
              '--physics-y': '0px',
              '--physics-scale': '1',
              '--physics-rotate': '0deg',
              ...(node.kind === 'task' ? { '--water-level': `${10 + Math.max(0, Math.min(100, node.task.progress)) * .85}%` } : {}),
            } as React.CSSProperties;
            if (node.kind === 'blank') return (
              <div key={node.id} ref={(element) => { nodeRefs.current[index] = element; }} className="collision-node collision-node--blank" style={style} aria-hidden="true">
                <span className="collision-blank"><i /><i /></span>
              </div>
            );
            const { task, urgency, project } = node;
            return (
              <div key={node.id} ref={(element) => { nodeRefs.current[index] = element; }} className={`collision-node ${yOffset > 125 ? 'collision-node--lower' : ''} ${index === 0 ? 'collision-node--primary' : ''} ${size < 75 ? 'collision-node--compact' : ''}`} style={style}>
                {index === 0 ? <span className="collision-node__priority">最紧迫</span> : null}
                <button type="button" className={`collision-block collision-block--${urgency.level}`} onClick={() => onOpenTask(task)} aria-label={`打开任务：${task.title}`} data-demo-id={`task-block-${task.id}`}>
                  <span className="collision-block__water"><i className="collision-wave collision-wave--one" /><i className="collision-wave collision-wave--two" /><i className="collision-wave collision-wave--three" /></span>
                  <span className="collision-block__status">{urgency.label}</span>
                  <strong>{shortTaskTitle(task.title)}</strong>
                  <em>{task.progress}%</em>
                </button>
                <div className="collision-tooltip" role="tooltip">
                  <div className="flex items-center justify-between gap-3"><span className={`task-urgency task-urgency--${urgency.level}`}>{urgency.label}</span><strong className="text-[11px] text-[#263a36]">{task.progress}% 完成</strong></div>
                  <h3 className="mt-3 text-[13px] font-semibold leading-5 text-[#1f302d]">{task.title}</h3>
                  <p className="mt-1 truncate text-[10px] text-[#7a8883]">{project?.name}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/[.07] pt-3 text-[10px] text-[#64736e]"><span>负责人：{task.owner}</span><span className="text-right">{formatDate(task.end)} 截止</span></div>
                </div>
              </div>
            );
          })}
        </div>
        {!layoutNodes.length ? <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-white/55">没有符合条件的任务</div> : null}
      </div>
    </section>
  );
}

function CalendarTaskCard({ task, project, onOpenTask, compact = false }: { task: Task; project?: Project; onOpenTask: (task: Task) => void; compact?: boolean }) {
  const today = dateAtMidnight(new Date());
  const overdue = task.status !== '已完成' && dateAtMidnight(task.end) < today;
  const soon = task.status !== '已完成' && !overdue && dateAtMidnight(task.end) <= addDays(today, 7);
  return (
    <button onClick={() => onOpenTask(task)} className={`calendar-task ${overdue ? 'calendar-task--overdue' : soon ? 'calendar-task--soon' : task.status === '已完成' ? 'calendar-task--done' : ''} ${compact ? 'calendar-task--compact' : ''}`}>
      <span className="calendar-task__color" style={{ backgroundColor: overdue ? '#e43d37' : soon ? '#f0a400' : project?.color ?? '#3568d4' }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{task.title}</span>
        {!compact ? <span className="mt-1 block truncate text-[10px] opacity-60">{project?.name} · {task.owner} · {formatDate(task.end)} 截止</span> : null}
      </span>
      {!compact ? <span className="shrink-0 text-[10px] font-semibold tabular-nums">{task.progress}%</span> : null}
    </button>
  );
}

function CalendarView({ tasks, projects, milestones, onOpenTask }: { tasks: Task[]; projects: Project[]; milestones: Milestone[]; onOpenTask: (task: Task) => void }) {
  const today = dateAtMidnight(new Date());
  const [scope, setScope] = useState<CalendarScope>('today');
  const [monthAnchor, setMonthAnchor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayTasks = tasks.filter((task) => overlaps(task, today, today));
  const weekTasks = tasks.filter((task) => overlaps(task, weekStart, weekEnd));
  const monthTasks = tasks.filter((task) => overlaps(task, monthStart, monthEnd));
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const calendarGridStart = startOfWeek(monthAnchor);
  const monthGridDays = Array.from({ length: 42 }, (_, index) => addDays(calendarGridStart, index));
  const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  function projectFor(task: Task) {
    return projects.find((project) => project.id === task.projectId);
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <PageHeading title="日程" description="在一个入口查看今日、本周、本月工作与关键里程碑。" />
        <div className="grid grid-cols-4 rounded-xl border border-black/[.07] bg-white p-1 shadow-sm">
          {([
            ['today', '今日', todayTasks.length],
            ['week', '本周', weekTasks.length],
            ['month', '本月', monthTasks.length],
            ['milestone', '里程碑', milestones.length],
          ] as const).map(([value, label, count]) => (
            <button key={value} onClick={() => setScope(value)} className={`calendar-scope ${scope === value ? 'calendar-scope--active' : ''}`}><span>{label}</span><strong>{count}</strong></button>
          ))}
        </div>
      </div>

      {scope === 'today' ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <article className="calendar-date-panel">
            <p className="text-[11px] font-medium tracking-[.16em] text-white/50">TODAY</p>
            <div className="mt-8 text-[76px] font-semibold leading-none tracking-[-.08em]">{today.getDate()}</div>
            <p className="mt-4 text-lg font-medium">{today.getFullYear()}年{today.getMonth() + 1}月</p>
            <p className="mt-1 text-sm text-white/55">{weekdayNames[(today.getDay() + 6) % 7]}</p>
            <div className="mt-10 border-t border-white/12 pt-5"><span className="text-3xl font-semibold">{todayTasks.length}</span><span className="ml-2 text-xs text-white/55">项工作覆盖今天</span></div>
          </article>
          <article className="rounded-[14px] border border-black/[.07] bg-white p-5 md:p-6">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">今日工作</h3><span className="text-[11px] text-[#87918d]">{formatDate(dateKey(today), true)}</span></div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {todayTasks.map((task) => <CalendarTaskCard key={task.id} task={task} project={projectFor(task)} onOpenTask={onOpenTask} />)}
              {!todayTasks.length ? <div className="rounded-xl bg-[#f6f7f5] p-10 text-center text-xs text-[#8b9491] lg:col-span-2">今天没有排定工作</div> : null}
            </div>
          </article>
        </div>
      ) : null}

      {scope === 'week' ? (
        <article className="mt-6 overflow-x-auto rounded-[14px] border border-black/[.07] bg-white">
          <div className="grid min-w-[1040px] grid-cols-7">
            {weekDays.map((day, index) => {
              const dayTasks = tasks.filter((task) => overlaps(task, day, day));
              const isToday = dateKey(day) === dateKey(today);
              return (
                <div key={dateKey(day)} className={`min-h-[520px] border-r border-black/[.055] p-3 last:border-r-0 ${isToday ? 'bg-[#f4faf7]' : ''}`}>
                  <div className={`flex items-center justify-between border-b pb-3 ${isToday ? 'border-[#9ecfbe]' : 'border-black/[.055]'}`}><span className="text-[11px] text-[#7d8783]">{weekdayNames[index]}</span><span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-[#27665d] text-white' : ''}`}>{day.getDate()}</span></div>
                  <div className="mt-3 space-y-2">{dayTasks.map((task) => <CalendarTaskCard key={task.id} task={task} project={projectFor(task)} onOpenTask={onOpenTask} compact />)}{!dayTasks.length ? <p className="py-5 text-center text-[10px] text-[#a1a8a5]">无排期</p> : null}</div>
                </div>
              );
            })}
          </div>
        </article>
      ) : null}

      {scope === 'month' ? (
        <article className="mt-6 overflow-hidden rounded-[14px] border border-black/[.07] bg-white">
          <div className="flex items-center justify-between border-b border-black/[.06] px-5 py-4">
            <Button variant="ghost" size="icon" aria-label="上个月" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}><ChevronLeft /></Button>
            <div className="text-sm font-semibold">{monthAnchor.getFullYear()}年 {monthAnchor.getMonth() + 1}月</div>
            <Button variant="ghost" size="icon" aria-label="下个月" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}><ChevronRight /></Button>
          </div>
          <div className="grid grid-cols-7 border-b border-black/[.06] bg-[#fafaf8]">{weekdayNames.map((name) => <div key={name} className="px-3 py-3 text-center text-[10px] font-medium text-[#7d8783]">{name}</div>)}</div>
          <div className="grid min-w-[900px] grid-cols-7">
            {monthGridDays.map((day) => {
              const dayTasks = tasks.filter((task) => overlaps(task, day, day));
              const outside = day.getMonth() !== monthAnchor.getMonth();
              const isToday = dateKey(day) === dateKey(today);
              return (
                <div key={dateKey(day)} className={`min-h-[132px] border-b border-r border-black/[.055] p-2 ${outside ? 'bg-[#fafbf9] text-[#adb4b1]' : ''}`}>
                  <div className={`flex size-6 items-center justify-center rounded-full text-[11px] font-medium ${isToday ? 'bg-[#27665d] text-white' : ''}`}>{day.getDate()}</div>
                  <div className="mt-1 space-y-1">{dayTasks.slice(0, 3).map((task) => <CalendarTaskCard key={task.id} task={task} project={projectFor(task)} onOpenTask={onOpenTask} compact />)}{dayTasks.length > 3 ? <div className="px-2 text-[9px] text-[#7b8581]">另有 {dayTasks.length - 3} 项</div> : null}</div>
                </div>
              );
            })}
          </div>
        </article>
      ) : null}

      {scope === 'milestone' ? <MilestonesView milestones={milestones} projects={projects} embedded /> : null}
    </section>
  );
}

function MilestonesView({ milestones, projects, embedded = false }: { milestones: Milestone[]; projects: Project[]; embedded?: boolean }) {
  const sortedMilestones = [...milestones].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section className={embedded ? 'mt-6' : ''}>
      {!embedded ? <PageHeading title="关键里程碑" description="按时间查看所有项目的重要交付节点。" /> : null}
      <div className={`${embedded ? '' : 'mt-6'} rounded-[14px] border border-black/[.07] bg-white p-5 md:p-7`}>
        <div className="relative ml-3 border-l border-[#d7ddda] pl-8">
          {sortedMilestones.map((milestone) => {
            const project = projects.find((item) => item.id === milestone.projectId);
            return (
              <article key={milestone.id} className="milestone-item block w-full pb-8 text-left last:pb-0">
                <span className={`milestone-dot ${milestone.status === '已完成' ? 'milestone-dot--done' : ''}`} />
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-[11px] font-medium text-[#8c9491]">{formatDate(milestone.date, true)}</p>
                    <h2 className="mt-1 text-[15px] font-semibold">{milestone.name}</h2>
                    <p className="mt-2 text-xs leading-5 text-[#7d8583]">{milestone.note}</p>
                    <p className="mt-1 text-[10px] text-[#9aa19f]">{project?.name}</p>
                  </div>
                  <span className={milestone.status === '已完成' ? 'task-status task-status--done' : 'task-status'}>{milestone.status}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UpdatesView({ updates, tasks, projects, onOpenTask }: { updates: WorkspaceData['updates']; tasks: Task[]; projects: Project[]; onOpenTask: (task: Task) => void }) {
  const sorted = [...updates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section>
      <PageHeading title="工作记录" description="所有进展、问题、优化与决策按时间保留，形成完整执行档案。" />
      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          {sorted.map((update) => {
            const task = tasks.find((item) => item.id === update.taskId);
            const project = projects.find((item) => item.id === task?.projectId);
            return (
              <button key={update.id} onClick={() => task && onOpenTask(task)} className="update-card block w-full text-left">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="flex gap-3">
                    <span className={`update-kind update-kind--${update.kind}`}>{update.kind}</span>
                    <div>
                      <h2 className="text-[14px] font-semibold">{update.summary}</h2>
                      <p className="mt-1 text-[11px] text-[#8b9390]">{project?.name} / {task?.title}</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-[#929a97]"><div>{update.author}</div><div className="mt-1">{formatDateTime(update.createdAt)}</div></div>
                </div>
                {(update.issue || update.optimization || update.nextStep) && (
                  <div className="mt-4 grid gap-3 border-t border-black/[.05] pt-4 md:grid-cols-3">
                    <UpdateExcerpt label="问题" value={update.issue} />
                    <UpdateExcerpt label="优化" value={update.optimization} />
                    <UpdateExcerpt label="下一步" value={update.nextStep} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <aside className="h-fit rounded-[14px] border border-black/[.07] bg-[#182b29] p-5 text-white">
          <p className="text-[10px] tracking-[.16em] text-white/45">记录构成</p>
          <div className="mt-5 space-y-4">
            {(['进展', '优化', '问题', '决策'] as UpdateKind[]).map((kind) => {
              const count = updates.filter((update) => update.kind === kind).length;
              return <div key={kind} className="flex items-center justify-between border-b border-white/10 pb-3 text-xs"><span className="text-white/65">{kind}</span><strong className="font-medium">{count} 条</strong></div>;
            })}
          </div>
          <p className="mt-5 text-[11px] leading-5 text-white/45">记录不会覆盖任务原始计划，适合长期项目的连续复盘。</p>
        </aside>
      </div>
    </section>
  );
}

function ReportsView({ data, onCsv, onJson }: { data: WorkspaceData; onCsv: () => void; onJson: () => void }) {
  const projectStats = data.projects.map((project) => ({ ...project, risk: data.tasks.filter((task) => task.projectId === project.id && task.health === '风险').length }));
  return (
    <section>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading title="经营报表" description="项目进度、风险和任务交付情况的即时快照。" />
        <div className="flex gap-2"><Button variant="outline" onClick={onJson} className="bg-white"><FileJson /> 完整备份</Button><Button onClick={onCsv} className="bg-[#253b39] text-white hover:bg-[#1b2e2c]"><ArrowDownToLine /> 导出任务报表</Button></div>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-[14px] border border-black/[.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">项目完成率</h2><p className="mt-1 text-[11px] text-[#8a9390]">按当前项目进度排序</p></div><TrendingUp className="size-5 text-[#607b74]" /></div>
          <div className="mt-7 space-y-5">
            {[...projectStats].sort((a, b) => b.progress - a.progress).map((project) => (
              <div key={project.id} className="grid grid-cols-[150px_minmax(120px,1fr)_44px] items-center gap-4">
                <div className="truncate text-xs font-medium">{project.name}</div>
                <div className="h-6 bg-[#f0f2ef]"><span className="block h-full" style={{ width: `${project.progress}%`, backgroundColor: project.color }} /></div>
                <span className="text-right text-xs font-semibold tabular-nums">{project.progress}%</span>
              </div>
            ))}
          </div>
        </article>
        <aside className="space-y-5">
          <article className="rounded-[14px] border border-black/[.07] bg-white p-5">
            <h2 className="text-sm font-semibold">交付概况</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <ReportNumber label="已完成" value={data.tasks.filter((task) => task.status === '已完成').length} />
              <ReportNumber label="进行中" value={data.tasks.filter((task) => task.status === '进行中').length} />
              <ReportNumber label="未开始" value={data.tasks.filter((task) => task.status === '未开始').length} />
              <ReportNumber label="受阻" value={data.tasks.filter((task) => task.status === '受阻').length} danger />
            </div>
          </article>
          <article className="rounded-[14px] border border-black/[.07] bg-[#fffaf7] p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-[#8b4933]"><AlertTriangle className="size-4" /> 本期提示</div>
            <p className="mt-3 text-xs leading-6 text-[#716661]">演示项目正从体验设计进入核心功能验收阶段；当前应优先处理历史数据导入风险，并确保公开版本候选按计划完成。</p>
          </article>
        </aside>
      </div>
    </section>
  );
}

function SettingsView({ data, onJson, onRestore }: { data: WorkspaceData; onJson: () => void; onRestore: () => void }) {
  const bytes = new Blob([JSON.stringify(data)]).size;
  return (
    <section>
      <PageHeading title="系统设置" description="管理本地数据、备份和版本信息。" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[14px] border border-black/[.07] bg-white p-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#edf2ef] text-[#41685f]"><Database className="size-5" /></div>
          <h2 className="mt-5 text-[15px] font-semibold">本地数据</h2>
          <p className="mt-2 text-xs leading-6 text-[#7b8581]">当前版本的数据保存在浏览器本机空间，不上传到外部服务器。建议定期下载完整备份。</p>
          <dl className="mt-5 grid grid-cols-3 border-y border-black/[.055] py-4 text-center">
            <div><dt className="text-[10px] text-[#929a97]">项目</dt><dd className="mt-1 text-lg font-semibold">{data.projects.length}</dd></div>
            <div className="border-x border-black/[.055]"><dt className="text-[10px] text-[#929a97]">任务</dt><dd className="mt-1 text-lg font-semibold">{data.tasks.length}</dd></div>
            <div><dt className="text-[10px] text-[#929a97]">占用</dt><dd className="mt-1 text-lg font-semibold">{Math.max(1, Math.round(bytes / 1024))}<small className="ml-0.5 text-[10px] font-normal">KB</small></dd></div>
          </dl>
          <Button onClick={onJson} className="mt-5 bg-[#253b39] text-white hover:bg-[#1b2e2c]"><Archive /> 下载完整备份</Button>
        </article>
        <article className="rounded-[14px] border border-black/[.07] bg-white p-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#f5eeea] text-[#9b563f]"><RotateCcw className="size-5" /></div>
          <h2 className="mt-5 text-[15px] font-semibold">公开演示数据</h2>
          <p className="mt-2 text-xs leading-6 text-[#7b8581]">可恢复到随项目提供的虚构演示数据。恢复前请先下载备份，避免覆盖您已录入的内容。</p>
          <Button onClick={onRestore} variant="outline" className="mt-5 text-[#9b563f]"><RotateCcw /> 恢复演示数据</Button>
          <div className="mt-8 border-t border-black/[.055] pt-5 text-[11px] text-[#9aa19f]">项目工作台 · Web 0.5.0-beta.1</div>
        </article>
      </div>
    </section>
  );
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-[25px] font-semibold tracking-[-.035em]">{title}</h2><p className="mt-2 text-sm text-[#75807c]">{description}</p></div>;
}

function UpdateExcerpt({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-medium text-[#8f9794]">{label}</div><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#5f6966]">{value || '—'}</p></div>;
}

function ReportNumber({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className={`rounded-xl border p-4 ${danger ? 'border-[#ead6ce] bg-[#fffaf7]' : 'border-black/[.055] bg-[#fafaf8]'}`}><div className={`text-xl font-semibold ${danger ? 'text-[#a5573e]' : ''}`}>{value}</div><div className="mt-1 text-[10px] text-[#8e9693]">{label}</div></div>;
}

function ProjectDialog({ open, onOpenChange, editingProjectId, draft, setDraft, projects, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProjectId: string | null;
  draft: typeof emptyProjectDraft;
  setDraft: (draft: typeof emptyProjectDraft) => void;
  projects: Project[];
  onSubmit: (event: FormEvent) => void;
}) {
  const availableParents = projects.filter((candidate) => {
    if (candidate.id === editingProjectId) return false;
    let parentId = candidate.parentId;
    while (parentId) {
      if (parentId === editingProjectId) return false;
      parentId = projects.find((project) => project.id === parentId)?.parentId;
    }
    return true;
  });
  const colors = ['#3568d4', '#5b55d6', '#9a4ed1', '#d94d8c', '#e5543d', '#ef8b1e', '#19a874', '#1587a8'];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[760px] overflow-y-auto p-0">
        <DialogHeader className="border-b border-black/[.06] px-6 py-5">
          <DialogTitle className="text-[17px] font-semibold">{editingProjectId ? '编辑项目' : '新建项目'}</DialogTitle>
          <DialogDescription className="text-xs">{editingProjectId ? '更新项目名称、说明与基本计划。' : '可创建独立项目，也可作为现有项目的子项目。'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
            <FormField label="项目名称" className="sm:col-span-2"><Input autoFocus required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：客户门户升级计划" className="h-9" /></FormField>
            <FormField label="项目编号"><Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="留空将自动生成" className="h-9" /></FormField>
            <FormField label="项目层级"><NativeSelect value={draft.parentId} onChange={(event) => setDraft({ ...draft, parentId: event.target.value })} className="w-full"><NativeSelectOption value="">独立项目（无上级）</NativeSelectOption>{availableParents.map((project) => <NativeSelectOption key={project.id} value={project.id}>作为“{project.name}”的子项目</NativeSelectOption>)}</NativeSelect></FormField>
            <FormField label="负责人"><Input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} className="h-9" /></FormField>
            <FormField label="项目状态"><NativeSelect value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ProjectStatus })} className="w-full"><NativeSelectOption value="筹备中">筹备中</NativeSelectOption><NativeSelectOption value="进行中">进行中</NativeSelectOption><NativeSelectOption value="暂停">暂停</NativeSelectOption><NativeSelectOption value="已完成">已完成</NativeSelectOption></NativeSelect></FormField>
            <FormField label="计划开始"><Input type="date" required value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} className="h-9" /></FormField>
            <FormField label="计划完成"><Input type="date" required min={draft.start} value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} className="h-9" /></FormField>
            <FormField label="项目颜色" className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">{colors.map((color) => <button key={color} type="button" onClick={() => setDraft({ ...draft, color })} className={`project-color-choice ${draft.color === color ? 'project-color-choice--active' : ''}`} style={{ backgroundColor: color }} aria-label={`选择颜色 ${color}`} />)}<Input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} className="h-8 w-11 cursor-pointer p-1" aria-label="自定义项目颜色" /></div>
            </FormField>
            <FormField label="项目描述" className="sm:col-span-2"><Textarea required value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="说明项目目标、范围与最终交付标准" className="min-h-28" /></FormField>
          </div>
          <DialogFooter className="sticky bottom-0 mx-0 mb-0 rounded-none bg-white px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>关闭</Button><Button type="submit" className="bg-[#25534e] px-5 text-white hover:bg-[#1d4540]">保存并关闭</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewTaskDialog({ open, onOpenChange, draft, setDraft, projects, tasks, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: typeof emptyTaskDraft;
  setDraft: (draft: typeof emptyTaskDraft) => void;
  projects: Project[];
  tasks: Task[];
  onSubmit: (event: FormEvent) => void;
}) {
  const parents = tasks.filter((task) => task.projectId === draft.projectId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[760px] overflow-y-auto p-0">
        <DialogHeader className="border-b border-black/[.06] px-6 py-5">
          <DialogTitle className="text-[17px] font-semibold">新建任务</DialogTitle>
          <DialogDescription className="text-xs">将计划、责任和时间一次定义清楚。</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
            <FormField label="任务名称" className="sm:col-span-2"><Input autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：完成发布前回归测试" className="h-9" /></FormField>
            <FormField label="所属项目"><NativeSelect value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value, parentId: '' })} className="w-full">{projects.map((project) => <NativeSelectOption key={project.id} value={project.id}>{project.name}</NativeSelectOption>)}</NativeSelect></FormField>
            <FormField label="父任务（可选）"><NativeSelect value={draft.parentId} onChange={(event) => setDraft({ ...draft, parentId: event.target.value })} className="w-full"><NativeSelectOption value="">无父任务</NativeSelectOption>{parents.map((task) => <NativeSelectOption key={task.id} value={task.id}>{task.title}</NativeSelectOption>)}</NativeSelect></FormField>
            <FormField label="负责人"><Input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} className="h-9" /></FormField>
            <FormField label="优先级"><NativeSelect value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })} className="w-full"><NativeSelectOption value="高">高</NativeSelectOption><NativeSelectOption value="中">中</NativeSelectOption><NativeSelectOption value="低">低</NativeSelectOption></NativeSelect></FormField>
            <FormField label="所属阶段"><NativeSelect value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as StageKey })} className="w-full">{stageOrder.map((stage) => <NativeSelectOption key={stage} value={stage}>{stageLabels[stage]}</NativeSelectOption>)}</NativeSelect></FormField>
            <FormField label="计划开始"><Input type="date" required value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} className="h-9" /></FormField>
            <FormField label="计划完成"><Input type="date" required min={draft.start} value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} className="h-9" /></FormField>
            <FormField label="当前进度"><Input type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} className="h-9" /></FormField>
            <FormField label="任务说明" className="sm:col-span-2"><Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="补充目标、交付标准或注意事项" className="min-h-24" /></FormField>
          </div>
          <DialogFooter className="sticky bottom-0 mx-0 mb-0 rounded-none bg-white px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>关闭</Button><Button type="submit" className="bg-[#ad5d42] px-5 text-white hover:bg-[#944c35]">保存并关闭</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailDialog({ open, onOpenChange, task, project, allTasks, updates, draft, setDraft, onSubmit, scheduleDraft, setScheduleDraft, onScheduleSubmit, onDelay, onSaveAndClose }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  project?: Project;
  allTasks: Task[];
  updates: WorkspaceData['updates'];
  draft: { kind: UpdateKind; summary: string; issue: string; optimization: string; nextStep: string; progress: number };
  setDraft: (draft: { kind: UpdateKind; summary: string; issue: string; optimization: string; nextStep: string; progress: number }) => void;
  onSubmit: (event: FormEvent) => void;
  scheduleDraft: { start: string; end: string; delayDays: number };
  setScheduleDraft: (draft: { start: string; end: string; delayDays: number }) => void;
  onScheduleSubmit: (event: FormEvent) => void;
  onDelay: () => void;
  onSaveAndClose: () => void;
}) {
  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[1080px] overflow-y-auto p-0">
        <DialogHeader className="border-b border-black/[.06] px-6 py-5">
          <div className="flex items-center gap-2"><span className={statusClass(task.status)}>{task.status}</span><span className="text-[10px] text-[#929a97]">{project?.code}</span></div>
          <DialogTitle className="mt-2 pr-8 text-[19px] font-semibold leading-7">{task.title}</DialogTitle>
          <DialogDescription className="text-xs">{project?.name}</DialogDescription>
        </DialogHeader>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="border-b border-black/[.06] p-6 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
              <TaskMeta label="负责人" value={task.owner} />
              <TaskMeta label="优先级" value={`${task.priority}优先级`} />
              <TaskMeta label="计划开始" value={formatDate(task.start)} />
              <TaskMeta label="计划完成" value={formatDate(task.end)} />
            </div>
            <div className="mt-6"><div className="flex items-center justify-between text-[11px]"><span className="text-[#858e8b]">当前进度</span><strong>{task.progress}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0ed]"><span className="block h-full rounded-full bg-[#527b71]" style={{ width: `${task.progress}%` }} /></div></div>
            <form onSubmit={onScheduleSubmit} className="task-schedule-editor mt-6">
              <div className="flex items-start justify-between gap-4">
                <div><h3 className="text-[13px] font-semibold">计划时间</h3><p className="mt-1 text-[10px] text-[#87918d]">修改后会同步到甘特图、日历和时限提醒。</p></div>
                <CalendarDays className="size-4 text-[#47756d]" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <FormField label="开始时间"><Input type="date" required value={scheduleDraft.start} onChange={(event) => setScheduleDraft({ ...scheduleDraft, start: event.target.value })} className="h-9 bg-white" /></FormField>
                <FormField label="结束时间"><Input type="date" required min={scheduleDraft.start} value={scheduleDraft.end} onChange={(event) => setScheduleDraft({ ...scheduleDraft, end: event.target.value })} className="h-9 bg-white" /></FormField>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-black/[.06] pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="mb-2 block text-[11px] font-medium text-[#6f7976]">结束日期延期</span>
                  <div className="flex items-center gap-2"><Input type="number" min="1" max="3650" value={scheduleDraft.delayDays} onChange={(event) => setScheduleDraft({ ...scheduleDraft, delayDays: Number(event.target.value) })} className="h-9 w-24 bg-white" /><span className="text-xs text-[#727d79]">天</span><Button type="button" variant="outline" onClick={onDelay} className="h-9 bg-white"><Clock3 /> 延期</Button></div>
                </div>
                <Button type="submit" className="h-9 bg-[#25534e] text-white hover:bg-[#1d4540]">保存时间</Button>
              </div>
              <p className="mt-3 text-[10px] text-[#929a97]">“延期”只延长结束日期，开始日期保持不变。</p>
            </form>
            <div className="mt-6"><div className="text-[11px] font-medium text-[#858e8b]">任务说明</div><p className="mt-2 text-xs leading-6 text-[#5f6966]">{task.description || '暂无说明'}</p></div>
            {task.dependencies?.length ? (
              <div className="mt-5"><div className="text-[11px] font-medium text-[#858e8b]">开始条件</div><div className="mt-2 flex flex-wrap gap-2">{task.dependencies.map((id) => <span key={id} className="rounded-md bg-[#f0f2ef] px-2 py-1 text-[10px] text-[#68736f]">{allTasks.find((item) => item.id === id)?.title ?? id} 完成</span>)}</div></div>
            ) : null}
            <div className="mt-7 border-t border-black/[.055] pt-6">
              <h3 className="text-sm font-semibold">历史记录</h3>
              <div className="mt-5 space-y-5 border-l border-[#dfe3e0] pl-5">
                {updates.map((update) => <div key={update.id} className="relative"><span className="activity-dot activity-dot--active" /><div className="flex items-center gap-2"><span className={`update-kind update-kind--${update.kind}`}>{update.kind}</span><span className="text-[10px] text-[#939b98]">{formatDateTime(update.createdAt)}</span></div><p className="mt-2 text-xs font-medium leading-5">{update.summary}</p>{update.optimization && <p className="mt-1 text-[11px] leading-5 text-[#74807c]">优化：{update.optimization}</p>}</div>)}
                {!updates.length && <p className="text-xs text-[#929a97]">还没有进展记录</p>}
              </div>
            </div>
          </div>
          <form onSubmit={onSubmit} className="bg-[#fafaf8] p-5">
            <h3 className="text-sm font-semibold">记录本次更新</h3>
            <p className="mt-1 text-[10px] leading-5 text-[#8f9794]">追加记录，不覆盖原有过程。</p>
            <div className="mt-5 space-y-4">
              <FormField label="记录类型"><NativeSelect value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as UpdateKind })} className="w-full"><NativeSelectOption value="进展">进展</NativeSelectOption><NativeSelectOption value="问题">问题</NativeSelectOption><NativeSelectOption value="优化">优化</NativeSelectOption><NativeSelectOption value="决策">决策</NativeSelectOption></NativeSelect></FormField>
              <FormField label="进度（%）"><Input type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} /></FormField>
              <FormField label="本次成果"><Textarea required value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="本次完成了什么" /></FormField>
              <FormField label="遇到的问题"><Textarea value={draft.issue} onChange={(event) => setDraft({ ...draft, issue: event.target.value })} placeholder="没有可留空" /></FormField>
              <FormField label="优化措施"><Textarea value={draft.optimization} onChange={(event) => setDraft({ ...draft, optimization: event.target.value })} placeholder="对原计划做了哪些改善" /></FormField>
              <FormField label="下一步"><Textarea value={draft.nextStep} onChange={(event) => setDraft({ ...draft, nextStep: event.target.value })} placeholder="接下来要推进什么" /></FormField>
              <Button type="submit" className="w-full bg-[#253b39] text-white hover:bg-[#1b2e2c]">保存更新</Button>
            </div>
          </form>
        </div>
        <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-black/[.08] bg-white/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-[#8a9390]">时间调整会同步到甘特图和日历；工作记录请使用右侧“保存更新”。</p>
          <div className="flex shrink-0 justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>关闭</Button><Button type="button" onClick={onSaveAndClose} className="bg-[#25534e] px-5 text-white hover:bg-[#1d4540]">保存时间并关闭</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-[11px] font-medium text-[#6f7976]">{label}</span>{children}</label>;
}

function TaskMeta({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] text-[#919996]">{label}</div><div className="mt-1 font-medium text-[#4e5a56]">{value}</div></div>;
}
