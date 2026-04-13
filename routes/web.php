<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;

Route::get('/', [AuthenticatedSessionController::class, 'create'])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware('role:admin,user')->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::post('projects', [DashboardController::class, 'storeProject'])->name('projects.store');
        Route::post('tasks', [DashboardController::class, 'storeTask'])->name('tasks.store');
        Route::put('tasks/{task}', [DashboardController::class, 'updateTask'])->name('tasks.update');
        Route::delete('tasks/{task}', [DashboardController::class, 'destroyTask'])->name('tasks.destroy');
    });
});

require __DIR__ . '/settings.php';
