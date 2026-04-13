<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:all,pending,in_progress,completed'],
            'priority' => ['nullable', 'in:all,low,medium,high'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
        ]);

        $tasksQuery = Task::query()
            ->with(['project:id,name', 'assignee:id,name', 'creator:id,name'])
            ->latest('updated_at');

        if (($filters['status'] ?? 'all') !== 'all') {
            $tasksQuery->where('status', $filters['status']);
        }

        if (($filters['priority'] ?? 'all') !== 'all') {
            $tasksQuery->where('priority', $filters['priority']);
        }

        if (! empty($filters['project_id'])) {
            $tasksQuery->where('project_id', $filters['project_id']);
        }

        $projects = Project::query()
            ->withCount('tasks')
            ->latest()
            ->get(['id', 'name', 'description', 'created_by', 'created_at']);

        $tasks = $tasksQuery->get()->map(fn (Task $task): array => [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'priority' => $task->priority,
            'status' => $task->status,
            'deadline' => optional($task->deadline)->toISOString(),
            'project_id' => $task->project_id,
            'assigned_to' => $task->assigned_to,
            'created_by' => $task->created_by,
            'project' => $task->project ? [
                'id' => $task->project->id,
                'name' => $task->project->name,
            ] : null,
            'assignee' => $task->assignee ? [
                'id' => $task->assignee->id,
                'name' => $task->assignee->name,
            ] : null,
            'creator' => $task->creator ? [
                'id' => $task->creator->id,
                'name' => $task->creator->name,
            ] : null,
            'created_at' => $task->created_at->toISOString(),
            'updated_at' => $task->updated_at->toISOString(),
        ]);

        $allTasks = Task::query();

        return Inertia::render('dashboard', [
            'stats' => [
                'totalTasks' => (clone $allTasks)->count(),
                'completedTasks' => (clone $allTasks)->where('status', 'completed')->count(),
                'pendingTasks' => (clone $allTasks)->where('status', 'pending')->count(),
                'overdueTasks' => (clone $allTasks)
                    ->where('status', '!=', 'completed')
                    ->whereNotNull('deadline')
                    ->where('deadline', '<', now())
                    ->count(),
            ],
            'filters' => [
                'status' => $filters['status'] ?? 'all',
                'priority' => $filters['priority'] ?? 'all',
                'project_id' => isset($filters['project_id']) ? (string) $filters['project_id'] : 'all',
            ],
            'projects' => $projects->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'tasks_count' => $project->tasks_count,
                'created_at' => $project->created_at->toISOString(),
            ]),
            'tasks' => $tasks,
            'users' => User::query()
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ]),
        ]);
    }

    public function storeProject(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        Project::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project created.')]);

        return to_route('dashboard');
    }

    public function storeTask(Request $request): RedirectResponse
    {
        $data = $this->validateTask($request);

        $task = Task::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        $this->createAssignmentNotification($task);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task created.')]);

        return to_route('dashboard');
    }

    public function updateTask(Request $request, Task $task): RedirectResponse
    {
        $oldAssignedTo = $task->assigned_to;
        $oldStatus = $task->status;
        $data = $this->validateTask($request);

        $task->update($data);

        if ($task->assigned_to !== $oldAssignedTo) {
            $this->createAssignmentNotification($task);
        }

        if ($task->status !== $oldStatus && $task->assigned_to) {
            Notification::create([
                'user_id' => $task->assigned_to,
                'message' => "Task \"{$task->title}\" status changed to {$task->status}.",
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task updated.')]);

        return to_route('dashboard');
    }

    public function destroyTask(Task $task): RedirectResponse
    {
        $task->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task deleted.')]);

        return to_route('dashboard');
    }

    protected function validateTask(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'priority' => ['required', 'in:low,medium,high'],
            'status' => ['required', 'in:pending,in_progress,completed'],
            'deadline' => ['nullable', 'date'],
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);
    }

    protected function createAssignmentNotification(Task $task): void
    {
        if (! $task->assigned_to) {
            return;
        }

        Notification::create([
            'user_id' => $task->assigned_to,
            'message' => "You were assigned to task \"{$task->title}\".",
        ]);
    }
}
