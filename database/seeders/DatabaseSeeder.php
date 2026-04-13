<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
        );

        if (User::query()->where('email', '!=', 'admin@example.com')->count() === 0) {
            User::factory(5)->user()->create();
        }

        if (Project::query()->count() === 0) {
            $users = User::query()
                ->where('id', '!=', $admin->id)
                ->get();

            $projects = Project::factory(3)->create([
                'created_by' => $admin->id,
            ]);

            foreach ($projects as $project) {
                Task::factory(4)->create([
                    'project_id' => $project->id,
                    'created_by' => $admin->id,
                    'assigned_to' => $users->random()->id,
                ]);
            }
        }
    }
}
