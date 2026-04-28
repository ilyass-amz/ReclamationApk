<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReclamationComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'reclamation_id',
        'user_id',
        'comment',
    ];

    public function reclamation(): BelongsTo
    {
        return $this->belongsTo(Reclamation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
