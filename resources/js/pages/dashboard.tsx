import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    DashboardFilters,
    DashboardStats,
    ProjectSummary,
    TaskItem,
    TaskUser,
} from '@/types';

type TaskFormData = {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
    deadline: string;
    project_id: string;
    assigned_to: string;
};

type ProjectFormData = {
    name: string;
    description: string;
};

type DashboardProps = {
    stats: DashboardStats;
    filters: DashboardFilters;
    projects: ProjectSummary[];
    tasks: TaskItem[];
    users: TaskUser[];
};

const statusOptions: Array<TaskFormData['status']> = [
    'pending',
    'in_progress',
    'completed',
];

const priorityOptions: Array<TaskFormData['priority']> = ['low', 'medium', 'high'];

const statusLabel: Record<TaskFormData['status'], string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
};

const priorityLabel: Record<TaskFormData['priority'], string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
};

const statusTone: Record<TaskFormData['status'], string> = {
    pending: 'border-amber-200 bg-amber-100 text-amber-900',
    in_progress: 'border-sky-200 bg-sky-100 text-sky-900',
    completed: 'border-emerald-200 bg-emerald-100 text-emerald-900',
};

const priorityTone: Record<TaskFormData['priority'], string> = {
    low: 'border-slate-200 bg-slate-100 text-slate-800',
    medium: 'border-orange-200 bg-orange-100 text-orange-900',
    high: 'border-rose-200 bg-rose-100 text-rose-900',
};

const metricCards = (stats: DashboardStats) => [
    {
        label: 'Total Tasks',
        value: stats.totalTasks,
        tone: 'border-slate-200 bg-white text-slate-950',
    },
    {
        label: 'Completed',
        value: stats.completedTasks,
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    },
    {
        label: 'Pending',
        value: stats.pendingTasks,
        tone: 'border-amber-200 bg-amber-50 text-amber-950',
    },
    {
        label: 'Overdue',
        value: stats.overdueTasks,
        tone: 'border-rose-200 bg-rose-50 text-rose-950',
    },
];

function emptyTaskForm(projects: ProjectSummary[]): TaskFormData {
    return {
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        deadline: '',
        project_id: projects[0] ? String(projects[0].id) : '',
        assigned_to: 'unassigned',
    };
}

function toDateTimeLocal(value: string | null): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);

    return local.toISOString().slice(0, 16);
}

function deadlineTone(deadline: string | null, status: TaskItem['status']): string {
    if (!deadline) {
        return 'text-slate-600';
    }

    if (status === 'completed') {
        return 'text-emerald-800';
    }

    const due = new Date(deadline).getTime();
    const now = Date.now();
    const diffHours = (due - now) / 36e5;

    if (diffHours < 0) {
        return 'text-rose-800 font-medium';
    }

    if (diffHours <= 48) {
        return 'text-amber-800 font-medium';
    }

    return 'text-slate-700';
}

export default function Dashboard({
    stats,
    filters,
    projects,
    tasks,
    users,
}: DashboardProps) {
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);

    const projectForm = useForm<ProjectFormData>({
        name: '',
        description: '',
    });

    const taskForm = useForm<TaskFormData>(emptyTaskForm(projects));

    const activeTask = tasks.find((task) => task.id === editingTaskId) ?? null;

    useEffect(() => {
        if (projects.length > 0 && !taskForm.data.project_id && editingTaskId === null) {
            taskForm.setData('project_id', String(projects[0].id));
        }
    }, [projects, editingTaskId, taskForm.data.project_id]);

    function submitProject(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        projectForm.post('/projects', {
            preserveScroll: true,
            onSuccess: () => projectForm.reset(),
        });
    }

    function submitTask(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmittingTask(true);
        taskForm.clearErrors();

        const payload = {
            ...taskForm.data,
            assigned_to:
                taskForm.data.assigned_to === 'unassigned'
                    ? null
                    : Number(taskForm.data.assigned_to),
            project_id: taskForm.data.project_id
                ? Number(taskForm.data.project_id)
                : '',
        };

        if (editingTaskId) {
            router.put(`/tasks/${editingTaskId}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmittingTask(false);
                    setEditingTaskId(null);
                    taskForm.setData(emptyTaskForm(projects));
                },
                onError: (errors) => taskForm.setError(errors),
                onFinish: () => setIsSubmittingTask(false),
            });

            return;
        }

        router.post('/tasks', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmittingTask(false);
                taskForm.setData(emptyTaskForm(projects));
            },
            onError: (errors) => taskForm.setError(errors),
            onFinish: () => setIsSubmittingTask(false),
        });
    }

    function startEdit(task: TaskItem) {
        setEditingTaskId(task.id);
        taskForm.setData({
            title: task.title,
            description: task.description ?? '',
            priority: task.priority,
            status: task.status,
            deadline: toDateTimeLocal(task.deadline),
            project_id: String(task.project_id),
            assigned_to: task.assigned_to ? String(task.assigned_to) : 'unassigned',
        });
    }

    function cancelEdit() {
        setEditingTaskId(null);
        taskForm.setData(emptyTaskForm(projects));
        taskForm.clearErrors();
    }

    function applyFilters(next: Partial<DashboardFilters>) {
        router.get(
            '/dashboard',
            {
                status: next.status ?? filters.status,
                priority: next.priority ?? filters.priority,
                project_id: next.project_id ?? filters.project_id,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] p-4 md:p-6">
                <section className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-6 shadow-sm md:px-7">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-2">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                                Task Management
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                                Clear overview, quick updates, less clutter.
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-600">
                                Track projects, add tasks, and spot overdue work without digging
                                through noisy screens.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <span className="font-semibold text-slate-950">{tasks.length}</span>{' '}
                            visible tasks
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {metricCards(stats).map((card) => (
                        <Card key={card.label} className={`shadow-sm ${card.tone}`}>
                            <CardHeader className="pb-2">
                                <p className="text-sm font-medium opacity-80">{card.label}</p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-slate-950">Projects</CardTitle>
                                <p className="text-sm text-slate-600">Create a project first, then assign tasks to it.</p>
                            </div>
                            <Badge className="border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-100">
                                {projects.length} projects
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={submitProject} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="project-name" className="text-slate-800">Project name</Label>
                                    <Input
                                        id="project-name"
                                        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400"
                                        value={projectForm.data.name}
                                        onChange={(event) => projectForm.setData('name', event.target.value)}
                                        placeholder="Website redesign"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="project-description" className="text-slate-800">Description</Label>
                                    <textarea
                                        id="project-description"
                                        className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-xs outline-none ring-offset-background placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
                                        value={projectForm.data.description}
                                        onChange={(event) => projectForm.setData('description', event.target.value)}
                                        placeholder="Short summary for the team"
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-fit" disabled={projectForm.processing}>
                                    Add Project
                                </Button>
                            </form>

                            <div className="grid gap-3 md:grid-cols-2">
                                {projects.length > 0 ? (
                                    projects.map((project) => (
                                        <div key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">{project.name}</h3>
                                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                                        {project.description || 'No description yet.'}
                                                    </p>
                                                </div>
                                                <Badge className="border-slate-200 bg-white text-slate-700 hover:bg-white">
                                                    {project.tasks_count} tasks
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                                        No projects yet. Create one to unlock task creation.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-950">{activeTask ? 'Edit Task' : 'Create Task'}</CardTitle>
                            <p className="text-sm text-slate-600">
                                {projects.length > 0
                                    ? 'Capture the task details, assignee, and deadline.'
                                    : 'Create at least one project before adding tasks.'}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitTask} className="grid gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="task-title" className="text-slate-800">Title</Label>
                                    <Input
                                        id="task-title"
                                        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400"
                                        value={taskForm.data.title}
                                        onChange={(event) => taskForm.setData('title', event.target.value)}
                                        placeholder="Prepare sprint report"
                                        disabled={projects.length === 0}
                                    />
                                    <InputError message={taskForm.errors.title} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="task-description" className="text-slate-800">Description</Label>
                                    <textarea
                                        id="task-description"
                                        className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-xs outline-none ring-offset-background placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
                                        value={taskForm.data.description}
                                        onChange={(event) => taskForm.setData('description', event.target.value)}
                                        placeholder="Add notes, blockers, or acceptance criteria"
                                        disabled={projects.length === 0}
                                    />
                                    <InputError message={taskForm.errors.description} />
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label className="text-slate-800">Project</Label>
                                        <Select
                                            value={taskForm.data.project_id || undefined}
                                            onValueChange={(value) => taskForm.setData('project_id', value)}
                                            disabled={projects.length === 0}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white text-slate-950">
                                                <SelectValue placeholder="Select project" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projects.map((project) => (
                                                    <SelectItem key={project.id} value={String(project.id)}>
                                                        {project.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={taskForm.errors.project_id} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-slate-800">Assign to</Label>
                                        <Select
                                            value={taskForm.data.assigned_to}
                                            onValueChange={(value) => taskForm.setData('assigned_to', value)}
                                            disabled={projects.length === 0}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white text-slate-950">
                                                <SelectValue placeholder="Choose assignee" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {users.map((user) => (
                                                    <SelectItem key={user.id} value={String(user.id)}>
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={taskForm.errors.assigned_to} />
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label className="text-slate-800">Priority</Label>
                                        <Select
                                            value={taskForm.data.priority}
                                            onValueChange={(value: TaskFormData['priority']) => taskForm.setData('priority', value)}
                                            disabled={projects.length === 0}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white text-slate-950">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {priorityOptions.map((priority) => (
                                                    <SelectItem key={priority} value={priority}>
                                                        {priorityLabel[priority]}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={taskForm.errors.priority} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-slate-800">Status</Label>
                                        <Select
                                            value={taskForm.data.status}
                                            onValueChange={(value: TaskFormData['status']) => taskForm.setData('status', value)}
                                            disabled={projects.length === 0}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white text-slate-950">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statusOptions.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {statusLabel[status]}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={taskForm.errors.status} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="task-deadline" className="text-slate-800">Deadline</Label>
                                        <Input
                                            id="task-deadline"
                                            type="datetime-local"
                                            className="border-slate-300 bg-white text-slate-950"
                                            value={taskForm.data.deadline}
                                            onChange={(event) => taskForm.setData('deadline', event.target.value)}
                                            disabled={projects.length === 0}
                                        />
                                        <InputError message={taskForm.errors.deadline} />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button type="submit" className="bg-slate-950 text-white hover:bg-slate-800" disabled={isSubmittingTask || projects.length === 0}>
                                        {activeTask ? 'Update Task' : 'Create Task'}
                                    </Button>
                                    {activeTask && (
                                        <Button type="button" variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100" onClick={cancelEdit}>
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
                            <p className="text-sm text-slate-600">Manage task status, deadlines, and assignments from one screen.</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <Select
                                value={filters.status}
                                onValueChange={(value: DashboardFilters['status']) => applyFilters({ status: value })}
                            >
                                <SelectTrigger className="min-w-40 border-slate-300 bg-white text-slate-950">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {statusOptions.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {statusLabel[status]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.priority}
                                onValueChange={(value: DashboardFilters['priority']) => applyFilters({ priority: value })}
                            >
                                <SelectTrigger className="min-w-40 border-slate-300 bg-white text-slate-950">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All priorities</SelectItem>
                                    {priorityOptions.map((priority) => (
                                        <SelectItem key={priority} value={priority}>
                                            {priorityLabel[priority]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.project_id}
                                onValueChange={(value) => applyFilters({ project_id: value })}
                            >
                                <SelectTrigger className="min-w-44 border-slate-300 bg-white text-slate-950">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All projects</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={String(project.id)}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {tasks.length > 0 ? (
                            tasks.map((task) => (
                                <Card key={task.id} className="border-slate-200 bg-white shadow-sm">
                                    <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                                                <Badge className={statusTone[task.status]}>
                                                    {statusLabel[task.status]}
                                                </Badge>
                                                <Badge className={priorityTone[task.priority]}>
                                                    {priorityLabel[task.priority]} priority
                                                </Badge>
                                            </div>
                                            <p className="max-w-2xl text-sm leading-6 text-slate-700">
                                                {task.description || 'No description provided.'}
                                            </p>
                                            <div className="flex flex-wrap gap-3 text-sm">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                                    Project: {task.project?.name ?? 'Unknown'}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                                    Assigned: {task.assignee?.name ?? 'Unassigned'}
                                                </span>
                                                <span className={`rounded-full bg-slate-100 px-3 py-1 ${deadlineTone(task.deadline, task.status)}`}>
                                                    Deadline:{' '}
                                                    {task.deadline
                                                        ? new Date(task.deadline).toLocaleString()
                                                        : 'No deadline'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 lg:justify-end">
                                            <Button type="button" variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-800" onClick={() => startEdit(task)}>
                                                Edit
                                            </Button>
                                            {task.status !== 'completed' && (
                                                <Button
                                                    type="button"
                                                    className="bg-sky-700 text-white hover:bg-sky-800"
                                                    onClick={() => {
                                                        router.put(
                                                            `/tasks/${task.id}`,
                                                            {
                                                                title: task.title,
                                                                description: task.description,
                                                                priority: task.priority,
                                                                status: 'completed',
                                                                deadline: task.deadline ? toDateTimeLocal(task.deadline) : '',
                                                                project_id: task.project_id,
                                                                assigned_to: task.assigned_to,
                                                            },
                                                            { preserveScroll: true },
                                                        );
                                                    }}
                                                >
                                                    Mark Complete
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => {
                                                    router.delete(`/tasks/${task.id}`, {
                                                        preserveScroll: true,
                                                    });
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card className="border-dashed shadow-none">
                                <CardContent className="p-8 text-center text-sm text-slate-600">
                                    No tasks match the current filters yet.
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
    ],
};
