<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReclamationCommentController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\MaintenanceTaskController;
use App\Http\Controllers\ReclamationController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/verify-reset-code', [AuthController::class, 'verifyResetCode']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'profile']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::apiResource('reclamations', ReclamationController::class);
    Route::post('/reclamations/{reclamation}/comments', [ReclamationCommentController::class, 'store']);
    Route::apiResource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('departments', DepartmentController::class)->only(['index', 'store', 'destroy']);
    Route::apiResource('tasks', MaintenanceTaskController::class);
    Route::get('/tasks/{task}/messages', [App\Http\Controllers\Api\TaskMessageController::class, 'index']);
    Route::post('/tasks/{task}/messages', [App\Http\Controllers\Api\TaskMessageController::class, 'store']);
});
