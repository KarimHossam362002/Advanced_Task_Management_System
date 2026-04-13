<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:pending,in_progress,completed'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $tasks = Task::query()
            ->with(['project:id,name', 'assignee:id,name,email', 'creator:id,name,email'])
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['priority'] ?? null, fn ($query, $priority) => $query->where('priority', $priority))
            ->when($filters['project_id'] ?? null, fn ($query, $projectId) => $query->where('project_id', $projectId))
            ->when($filters['assigned_to'] ?? null, fn ($query, $assignedTo) => $query->where('assigned_to', $assignedTo))
            ->latest('updated_at')
            ->get();

        return response()->json([
            'data' => $tasks->map(fn (Task $task): array => $this->transformTask($task))->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateTask($request);

        $task = Task::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        $this->createAssignmentNotification($task);
        $task->load(['project:id,name', 'assignee:id,name,email', 'creator:id,name,email']);

        return response()->json([
            'message' => 'Task created successfully.',
            'data' => $this->transformTask($task),
        ], Response::HTTP_CREATED);
    }

    public function show(Task $task): JsonResponse
    {
        $task->load(['project:id,name', 'assignee:id,name,email', 'creator:id,name,email']);

        return response()->json([
            'data' => $this->transformTask($task),
        ]);
    }

    public function update(Request $request, Task $task): JsonResponse
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

        $task->load(['project:id,name', 'assignee:id,name,email', 'creator:id,name,email']);

        return response()->json([
            'message' => 'Task updated successfully.',
            'data' => $this->transformTask($task),
        ]);
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
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

    protected function transformTask(Task $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'priority' => $task->priority,
            'status' => $task->status,
            'deadline' => $task->deadline?->toISOString(),
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
                'email' => $task->assignee->email,
            ] : null,
            'creator' => $task->creator ? [
                'id' => $task->creator->id,
                'name' => $task->creator->name,
                'email' => $task->creator->email,
            ] : null,
            'created_at' => $task->created_at?->toISOString(),
            'updated_at' => $task->updated_at?->toISOString(),
        ];
    }
}
