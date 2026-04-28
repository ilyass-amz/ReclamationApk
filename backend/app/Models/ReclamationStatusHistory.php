<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReclamationStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'reclamation_id',
        'changed_by',
        'from_status',
        'to_status',
    ];

    public function reclamation(): BelongsTo
    {
        return $this->belongsTo(Reclamation::class);
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
