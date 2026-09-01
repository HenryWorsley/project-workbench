export type ProjectStatus = '筹备中' | '进行中' | '已完成' | '暂停';
export type Health = '正常' | '关注' | '风险';
export type TaskStatus = '未开始' | '进行中' | '已完成' | '受阻';
export type Priority = '高' | '中' | '低';
export type UpdateKind = '进展' | '问题' | '优化' | '决策';
export type StageKey = 'docs' | 'renovation' | 'equipment' | 'people' | 'trial';

export interface Project {
  id: string;
  parentId?: string;
  code: string;
  name: string;
  description: string;
  owner: string;
  start: string;
  end: string;
  progress: number;
  status: ProjectStatus;
  health: Health;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  description: string;
  owner: string;
  start: string;
  end: string;
  progress: number;
  status: TaskStatus;
  priority: Priority;
  health: Health;
  stage?: StageKey;
  dependencies?: string[];
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  date: string;
  note: string;
  status: '未完成' | '已完成';
}

export interface TaskUpdate {
  id: string;
  taskId: string;
  kind: UpdateKind;
  summary: string;
  issue: string;
  optimization: string;
  nextStep: string;
  progress: number;
  author: string;
  createdAt: string;
}

export interface WorkspaceData {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  updates: TaskUpdate[];
}

export const stageLabels: Record<StageKey, string> = {
  docs: '研究与定义',
  renovation: '体验与设计',
  equipment: '核心开发',
  people: '内容与协同',
  trial: '验证与发布',
};

export const stageOrder: StageKey[] = ['docs', 'renovation', 'equipment', 'people', 'trial'];

export const initialWorkspaceData: WorkspaceData = {
  projects: [
    {
      id: 'demo-orbit',
      code: 'DEMO-001',
      name: '数字产品焕新计划',
      description: '从用户研究到正式发布的完整示范项目，用于展示排期、协同、风险与复盘能力。',
      owner: '项目负责人',
      start: '2026-08-10',
      end: '2026-10-25',
      progress: 52,
      status: '进行中',
      health: '关注',
      color: '#386f63',
    },
    {
      id: 'demo-mobile',
      parentId: 'demo-orbit',
      code: 'DEMO-001-A',
      name: '移动端体验适配',
      description: '主项目的子项目，覆盖小屏布局、手势操作与离线体验。',
      owner: '陈诺',
      start: '2026-09-08',
      end: '2026-10-12',
      progress: 18,
      status: '进行中',
      health: '正常',
      color: '#5b67b7',
    },
    {
      id: 'demo-ops',
      code: 'DEMO-002',
      name: '季度运营复盘',
      description: '独立示范项目，用于展示跨项目任务聚合和经营报表。',
      owner: '周琪',
      start: '2026-08-20',
      end: '2026-09-28',
      progress: 61,
      status: '进行中',
      health: '正常',
      color: '#b46942',
    },
  ],
  tasks: [
    { id: 'demo-task-01', projectId: 'demo-orbit', title: '用户访谈与需求归纳', description: '完成典型场景访谈并沉淀需求优先级。', owner: '林川', start: '2026-08-10', end: '2026-08-18', progress: 100, status: '已完成', priority: '高', health: '正常', stage: 'docs', dependencies: [] },
    { id: 'demo-task-02', projectId: 'demo-orbit', title: '信息架构与导航验证', description: '验证一级入口、项目详情和任务记录之间的关系。', owner: '林川', start: '2026-08-15', end: '2026-08-24', progress: 100, status: '已完成', priority: '高', health: '正常', stage: 'docs', dependencies: ['demo-task-01'] },
    { id: 'demo-task-03', projectId: 'demo-orbit', title: '历史数据导入校验', description: '校验字段映射、日期格式和异常记录。', owner: '宋远', start: '2026-08-18', end: '2026-08-29', progress: 72, status: '受阻', priority: '高', health: '风险', stage: 'docs', dependencies: [] },
    { id: 'demo-task-04', projectId: 'demo-orbit', title: '视觉系统与组件规范', description: '统一色彩、层级、圆角、阴影和动效节奏。', owner: '陈诺', start: '2026-08-20', end: '2026-09-04', progress: 84, status: '进行中', priority: '高', health: '正常', stage: 'renovation', dependencies: ['demo-task-02'] },
    { id: 'demo-task-05', projectId: 'demo-orbit', title: '交互原型打磨', description: '完善甘特图拖拽、任务编辑与状态反馈。', owner: '陈诺', start: '2026-08-26', end: '2026-09-08', progress: 68, status: '进行中', priority: '高', health: '关注', stage: 'renovation', dependencies: ['demo-task-04'] },
    { id: 'demo-task-06', projectId: 'demo-orbit', title: '公开演示数据编排', description: '准备覆盖完成、临期、逾期、受阻和未开始状态的模拟数据。', owner: '周琪', start: '2026-08-28', end: '2026-09-02', progress: 46, status: '进行中', priority: '高', health: '关注', stage: 'people', dependencies: [] },
    { id: 'demo-task-07', projectId: 'demo-orbit', title: '甘特图拖拽与缩放', description: '支持整体平移、左右端点缩放以及日期即时预览。', owner: '宋远', start: '2026-08-24', end: '2026-09-06', progress: 58, status: '进行中', priority: '高', health: '正常', stage: 'equipment', dependencies: ['demo-task-02'] },
    { id: 'demo-task-08', projectId: 'demo-orbit', title: '报表导出与完整备份', description: '验证 CSV 报表和 JSON 完整备份。', owner: '宋远', start: '2026-08-30', end: '2026-09-12', progress: 35, status: '进行中', priority: '中', health: '正常', stage: 'equipment', dependencies: [] },
    { id: 'demo-task-09', projectId: 'demo-orbit', title: '使用文档与贡献指南', description: '编写安装、使用、贡献和安全说明。', owner: '周琪', start: '2026-09-01', end: '2026-09-14', progress: 20, status: '进行中', priority: '中', health: '正常', stage: 'people', dependencies: [] },
    { id: 'demo-task-10', projectId: 'demo-orbit', title: '无障碍与键盘操作检查', description: '检查键盘焦点、语义标签和减少动态效果设置。', owner: '林川', start: '2026-09-06', end: '2026-09-18', progress: 0, status: '未开始', priority: '中', health: '正常', stage: 'trial', dependencies: ['demo-task-05'] },
    { id: 'demo-task-11', projectId: 'demo-orbit', title: '公开版本候选发布', description: '完成构建验证、版本说明和示例截图。', owner: '项目负责人', start: '2026-09-18', end: '2026-10-08', progress: 0, status: '未开始', priority: '高', health: '正常', stage: 'trial', dependencies: ['demo-task-08', 'demo-task-09', 'demo-task-10'] },
    { id: 'demo-task-12', projectId: 'demo-orbit', title: '发布复盘与路线图更新', description: '收集反馈并形成下一阶段改进清单。', owner: '项目负责人', start: '2026-10-09', end: '2026-10-25', progress: 0, status: '未开始', priority: '中', health: '正常', stage: 'trial', dependencies: ['demo-task-11'] },
    { id: 'mobile-task-01', projectId: 'demo-mobile', title: '移动端信息密度测试', description: '比较三档信息密度下的阅读效率。', owner: '陈诺', start: '2026-09-08', end: '2026-09-16', progress: 25, status: '进行中', priority: '中', health: '正常', stage: 'renovation', dependencies: [] },
    { id: 'mobile-task-02', projectId: 'demo-mobile', title: '触控拖拽手势适配', description: '优化触控命中区和长按拖拽反馈。', owner: '宋远', start: '2026-09-12', end: '2026-09-24', progress: 10, status: '进行中', priority: '高', health: '正常', stage: 'equipment', dependencies: ['mobile-task-01'] },
    { id: 'mobile-task-03', projectId: 'demo-mobile', title: '离线缓存策略', description: '定义离线读取和冲突恢复行为。', owner: '宋远', start: '2026-09-20', end: '2026-10-04', progress: 0, status: '未开始', priority: '中', health: '正常', stage: 'equipment', dependencies: [] },
    { id: 'mobile-task-04', projectId: 'demo-mobile', title: '小屏回归测试', description: '覆盖常见小屏尺寸和横竖屏切换。', owner: '林川', start: '2026-10-01', end: '2026-10-12', progress: 0, status: '未开始', priority: '中', health: '正常', stage: 'trial', dependencies: ['mobile-task-02', 'mobile-task-03'] },
    { id: 'ops-task-01', projectId: 'demo-ops', title: '关键指标口径确认', description: '统一进度、风险和按期交付率口径。', owner: '周琪', start: '2026-08-20', end: '2026-08-27', progress: 100, status: '已完成', priority: '高', health: '正常', stage: 'docs', dependencies: [] },
    { id: 'ops-task-02', projectId: 'demo-ops', title: '跨项目风险归因', description: '将风险拆分为排期、资源、依赖和质量四类。', owner: '林川', start: '2026-08-26', end: '2026-09-10', progress: 63, status: '进行中', priority: '高', health: '关注', stage: 'people', dependencies: ['ops-task-01'] },
    { id: 'ops-task-03', projectId: 'demo-ops', title: '季度复盘材料发布', description: '生成管理摘要和下一季度行动项。', owner: '项目负责人', start: '2026-09-11', end: '2026-09-28', progress: 0, status: '未开始', priority: '中', health: '正常', stage: 'trial', dependencies: ['ops-task-02'] },
  ],
  milestones: [
    { id: 'demo-ms-01', projectId: 'demo-orbit', name: '需求基线确认', date: '2026-08-24', note: '研究结论和信息架构通过评审。', status: '已完成' },
    { id: 'demo-ms-02', projectId: 'demo-orbit', name: '视觉方案冻结', date: '2026-09-04', note: '组件规范和五套视效方案进入开发。', status: '未完成' },
    { id: 'demo-ms-03', projectId: 'demo-orbit', name: '功能验收完成', date: '2026-09-18', note: '核心交互、导出和无障碍检查完成。', status: '未完成' },
    { id: 'demo-ms-04', projectId: 'demo-orbit', name: '公开版本发布', date: '2026-10-08', note: '公开版本、文档和示例素材同步发布。', status: '未完成' },
    { id: 'demo-ms-05', projectId: 'demo-orbit', name: '路线图确认', date: '2026-10-25', note: '根据反馈确定下一阶段路线图。', status: '未完成' },
    { id: 'mobile-ms-01', projectId: 'demo-mobile', name: '移动端验收', date: '2026-10-12', note: '小屏、触控与离线体验通过验收。', status: '未完成' },
    { id: 'ops-ms-01', projectId: 'demo-ops', name: '复盘发布', date: '2026-09-28', note: '季度复盘材料完成发布。', status: '未完成' },
  ],
  updates: [
    { id: 'demo-update-01', taskId: 'demo-task-04', kind: '进展', summary: '五套视觉方向完成首轮组件验证', issue: '', optimization: '统一使用状态色阶，不再按任务类别堆叠颜色。', nextStep: '验证不同高度和运动速度的可读性。', progress: 84, author: '陈诺', createdAt: '2026-09-01T09:20:00+08:00' },
    { id: 'demo-update-02', taskId: 'demo-task-03', kind: '问题', summary: '发现一批历史日期字段格式不一致', issue: '部分记录使用文本日期，影响排序和甘特图定位。', optimization: '导入时增加日期标准化和异常清单。', nextStep: '完成剩余异常记录复核。', progress: 72, author: '宋远', createdAt: '2026-08-31T17:40:00+08:00' },
    { id: 'demo-update-03', taskId: 'demo-task-05', kind: '优化', summary: '拖拽反馈改为日期即时预览', issue: '', optimization: '移动过程中冻结条形动画，释放后再恢复。', nextStep: '补充触控设备的命中区域。', progress: 68, author: '陈诺', createdAt: '2026-08-31T14:10:00+08:00' },
    { id: 'demo-update-04', taskId: 'demo-task-06', kind: '决策', summary: '公开版本仅使用虚构项目与人员', issue: '', optimization: '', nextStep: '完成全仓库品牌和敏感信息扫描。', progress: 46, author: '项目负责人', createdAt: '2026-08-30T16:30:00+08:00' },
  ],
};
