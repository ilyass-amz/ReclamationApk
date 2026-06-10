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
            $table->string('email')->nullable()->unique()->after('name');
            $table->string('phone', 30)->nullable()->unique()->after('email');
        });

        Schema::create('password_reset_requests', function (Blueprint $table) {
            $table->id();
            $table->string('identifier')->unique();
            $table->string('token');
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_reset_requests');

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_email_unique');
            $table->dropUnique('users_phone_unique');
            $table->dropColumn(['email', 'phone']);
        });
    }
};
