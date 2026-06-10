<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceTaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reclamation_id' => $this->reclamation_id,
            'technician_id' => $this->technician_id,
            'assigned_by' => $this->assigned_by,
            'description' => $this->description,
            'status' => $this->status,
            'intervention_notes' => $this->intervention_notes,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'technician' => [
                'id' => $this->technician?->id,
                'name' => $this->technician?->name,
                'matricule' => $this->technician?->matricule,
                'department' => $this->technician?->department,
            ],
            'assigned_by_user' => [
                'id' => $this->assignedBy?->id,
                'name' => $this->assignedBy?->name,
            ],
            'reclamation' => [
                'id' => $this->reclamation?->id,
                'title' => $this->reclamation?->title,
                'machine' => $this->reclamation?->machine,
                'priority' => $this->reclamation?->priority,
                'status' => $this->reclamation?->status,
            ],
            'attachments' => $this->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_path' => asset('uploads/' . basename($attachment->file_path)),
                'file_size' => $attachment->file_size,
                'user_name' => $attachment->user?->name,
            ]),
        ];
    }
}
