<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_create_projects_and_tasks(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('projects.store'), [
            'name' => 'Internal Launch',
            'description' => 'Project for launch readiness',
        ])->assertRedirect(route('dashboard'));

        $project = Project::first();

        $this->post(route('tasks.store'), [
            'title' => 'Prepare client report',
            'description' => 'Gather analytics and status updates',
            'priority' => 'high',
            'status' => 'pending',
            'deadline' => now()->addDay()->toDateTimeString(),
            'project_id' => $project?->id,
            'assigned_to' => $user->id,
        ])->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('projects', [
            'name' => 'Internal Launch',
        ]);

        $this->assertDatabaseHas('tasks', [
            'title' => 'Prepare client report',
            'project_id' => $project?->id,
            'assigned_to' => $user->id,
            'priority' => 'high',
        ]);
    }
}
