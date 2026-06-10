<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('operator')->change();
        });

        Schema::table('reclamations', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
        });

        Schema::table('reclamation_status_histories', function (Blueprint $table) {
            $table->string('from_status')->nullable()->change();
            $table->string('to_status')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Changing it back to original enums
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['operator', 'department', 'admin'])->default('operator')->change();
        });

        Schema::table('reclamations', function (Blueprint $table) {
            $table->enum('status', ['pending', 'in_progress', 'resolved'])->default('pending')->change();
        });

        Schema::table('reclamation_status_histories', function (Blueprint $table) {
            $table->enum('from_status', ['pending', 'in_progress', 'resolved'])->nullable()->change();
            $table->enum('to_status', ['pending', 'in_progress', 'resolved'])->change();
        });
    }
};
