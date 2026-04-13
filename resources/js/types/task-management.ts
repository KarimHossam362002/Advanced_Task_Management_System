export type ProjectSummary = {
    id: number;
    name: string;
    description: string | null;
    tasks_count: number;
    created_at: string;
};

export type TaskUser = {
    id: number;
    name: string;
    email?: string;
};

export type TaskItem = {
    id: number;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
    deadline: string | null;
    project_id: number;
    assigned_to: number | null;
    created_by: number | null;
    project: Pick<ProjectSummary, 'id' | 'name'> | null;
    assignee: Pick<TaskUser, 'id' | 'name'> | null;
    creator: Pick<TaskUser, 'id' | 'name'> | null;
    created_at: string;
    updated_at: string;
};

export type DashboardStats = {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
};

export type DashboardFilters = {
    status: 'all' | 'pending' | 'in_progress' | 'completed';
    priority: 'all' | 'low' | 'medium' | 'high';
    project_id: string;
};
