<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReclamationCommentController;
use App\Http\Controllers\ReclamationController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'profile']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::apiResource('reclamations', ReclamationController::class);
    Route::post('/reclamations/{reclamation}/comments', [ReclamationCommentController::class, 'store']);
});
