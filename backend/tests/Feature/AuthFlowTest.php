<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_login_with_matricule(): void
    {
        $registerPayload = [
            'name' => 'Test Operator',
            'email' => 'operator@example.com',
            'matricule' => 'MAT-1001',
            'department' => 'Maintenance',
            'role' => 'operator',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        $registerResponse = $this->postJson('/api/auth/register', $registerPayload);
        $registerResponse->assertCreated()
            ->assertJsonStructure([
                'success',
                'message',
                'errors',
                'token',
                'user' => ['id', 'name', 'matricule', 'department', 'role'],
            ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'matricule' => 'MAT-1001',
            'password' => 'Password123!',
        ]);

        $loginResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'errors',
                'token',
                'user' => ['id', 'name', 'matricule', 'department', 'role'],
            ]);
    }

    public function test_login_fails_with_wrong_password_and_returns_401(): void
    {
        $registerPayload = [
            'name' => 'Test Operator',
            'email' => 'wrongpass@example.com',
            'matricule' => 'MAT-2002',
            'department' => 'Maintenance',
            'role' => 'operator',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        $this->postJson('/api/auth/register', $registerPayload)->assertCreated();

        $loginResponse = $this->postJson('/api/auth/login', [
            'matricule' => 'MAT-2002',
            'password' => 'WrongPassword123!',
        ]);

        $loginResponse->assertUnauthorized()
            ->assertJson([
                'success' => false,
                'message' => 'Invalid matricule or password.',
            ]);
    }

    public function test_register_validation_errors_follow_standard_422_format(): void
    {
        $response = $this->postJson('/api/auth/register', []);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'success',
                'message',
                'errors' => ['name', 'email', 'matricule', 'department', 'role', 'password'],
            ])
            ->assertJson([
                'success' => false,
                'message' => 'Validation failed.',
            ]);
    }

    public function test_login_validation_errors_follow_standard_422_format(): void
    {
        $response = $this->postJson('/api/auth/login', []);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'success',
                'message',
                'errors' => ['matricule', 'password'],
            ])
            ->assertJson([
                'success' => false,
                'message' => 'Validation failed.',
            ]);
    }
}
