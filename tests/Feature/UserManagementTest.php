<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_the_user_management_page(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get(route('users.index'))
            ->assertOk();
    }

    public function test_standard_user_cannot_view_the_user_management_page(): void
    {
        $user = User::factory()->user()->create();

        $this->actingAs($user)
            ->get(route('users.index'))
            ->assertForbidden();
    }

    public function test_admin_can_update_a_user_role(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->user()->create();

        $this->actingAs($admin)
            ->put(route('users.update', $user), [
                'role' => 'admin',
            ])
            ->assertRedirect(route('users.index'));

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'role' => 'admin',
        ]);
    }
}
