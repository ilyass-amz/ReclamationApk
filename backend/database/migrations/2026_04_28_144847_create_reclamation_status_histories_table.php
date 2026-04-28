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
        Schema::create('reclamation_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reclamation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by')->constrained('users')->cascadeOnDelete();
            $table->enum('from_status', ['pending', 'in_progress', 'resolved'])->nullable();
            $table->enum('to_status', ['pending', 'in_progress', 'resolved']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reclamation_status_histories');
    }
};
