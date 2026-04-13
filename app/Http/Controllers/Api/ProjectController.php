<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProjectController extends Controller
{
    public function index(): JsonResponse
    {
        $projects = Project::query()
            ->withCount('tasks')
            ->with('creator:id,name,email')
            ->latest()
            ->get();

        return response()->json([
            'data' => $projects->map(fn (Project $project): array => $this->transformProject($project))->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        $project = Project::create([
            ...$data,
            'created_by' => $request->user()->id,
        ])->loadCount('tasks')->load('creator:id,name,email');

        return response()->json([
            'message' => 'Project created successfully.',
            'data' => $this->transformProject($project),
        ], Response::HTTP_CREATED);
    }

    public function show(Project $project): JsonResponse
    {
        $project->loadCount('tasks')
            ->load([
                'creator:id,name,email',
                'tasks.project:id,name',
                'tasks.assignee:id,name,email',
                'tasks.creator:id,name,email',
            ]);

        return response()->json([
            'data' => $this->transformProject($project, true),
        ]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        $project->update($data);
        $project->loadCount('tasks')->load('creator:id,name,email');

        return response()->json([
            'message' => 'Project updated successfully.',
            'data' => $this->transformProject($project),
        ]);
    }

    public function destroy(Project $project): JsonResponse
    {
        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }

    protected function transformProject(Project $project, bool $includeTasks = false): array
    {
        $data = [
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'created_by' => $project->created_by,
            'tasks_count' => $project->tasks_count,
            'creator' => $project->creator ? [
                'id' => $project->creator->id,
                'name' => $project->creator->name,
                'email' => $project->creator->email,
            ] : null,
            'created_at' => $project->created_at?->toISOString(),
            'updated_at' => $project->updated_at?->toISOString(),
        ];

        if ($includeTasks) {
            $data['tasks'] = $project->tasks->map(fn ($task): array => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'priority' => $task->priority,
                'status' => $task->status,
                'deadline' => $task->deadline?->toISOString(),
                'project_id' => $task->project_id,
                'assigned_to' => $task->assigned_to,
                'created_by' => $task->created_by,
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
            ])->all();
        }

        return $data;
    }
}
