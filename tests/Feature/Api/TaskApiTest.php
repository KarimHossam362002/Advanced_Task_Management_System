<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_manage_projects_and_tasks_via_api(): void
    {
        $admin = User::factory()->admin()->create([
            'password' => 'password',
            'email_verified_at' => now(),
        ]);

        [$plainTextToken, $hashedToken] = User::generateApiToken();
        $admin->forceFill(['api_token' => $hashedToken])->save();

        $projectResponse = $this->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->postJson('/api/projects', [
                'name' => 'API Project',
                'description' => 'Created through the API',
            ]);

        $projectId = $projectResponse->json('data.id');

        $projectResponse->assertCreated()
            ->assertJsonPath('data.name', 'API Project');

        $taskResponse = $this->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->postJson('/api/tasks', [
                'title' => 'API Task',
                'description' => 'Task created through REST API',
                'priority' => 'high',
                'status' => 'pending',
                'deadline' => now()->addDay()->toISOString(),
                'project_id' => $projectId,
                'assigned_to' => null,
            ]);

        $taskId = $taskResponse->json('data.id');

        $taskResponse->assertCreated()
            ->assertJsonPath('data.title', 'API Task');

        $this->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->putJson("/api/tasks/{$taskId}", [
                'title' => 'API Task Updated',
                'description' => 'Updated through REST API',
                'priority' => 'medium',
                'status' => 'completed',
                'deadline' => now()->addDays(2)->toISOString(),
                'project_id' => $projectId,
                'assigned_to' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->deleteJson("/api/tasks/{$taskId}")
            ->assertOk();
    }

    public function test_admin_can_list_users_via_api(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->user()->create();

        [$plainTextToken, $hashedToken] = User::generateApiToken();
        $admin->forceFill(['api_token' => $hashedToken])->save();

        $this->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    ['id', 'name', 'email', 'role'],
                ],
            ]);
    }
}
