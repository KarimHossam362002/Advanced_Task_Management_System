<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_an_api_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'API User',
            'email' => 'apiuser@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'name', 'email', 'role'],
            ]);
    }

    public function test_user_can_log_in_and_fetch_profile(): void
    {
        $this->seed();

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ]);

        $token = $loginResponse->json('token');

        $loginResponse->assertOk()
            ->assertJsonPath('user.email', 'admin@example.com');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/profile')
            ->assertOk()
            ->assertJsonPath('user.role', 'admin');
    }
}
