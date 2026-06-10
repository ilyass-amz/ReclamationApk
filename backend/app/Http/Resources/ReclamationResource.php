<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReclamationResource extends JsonResource
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
            'title' => $this->title,
            'description' => $this->description,
            'machine' => $this->machine,
            'location' => $this->location,
            'department' => $this->department,
            'priority' => $this->priority,
            'status' => $this->status,
            'solution' => $this->solution,
            'resolved_at' => $this->resolved_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'user' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'matricule' => $this->user?->matricule,
                'department' => $this->user?->department,
            ],
            'attachments' => $this->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_path' => asset('uploads/' . basename($attachment->file_path)),
                'file_size' => $attachment->file_size,
                'user_name' => $attachment->user?->name,
            ]),
            'comments' => $this->comments->map(fn ($comment) => [
                'id' => $comment->id,
                'comment' => $comment->comment,
                'created_at' => $comment->created_at,
                'user_id' => $comment->user_id,
                'user' => [
                    'id' => $comment->user?->id,
                    'name' => $comment->user?->name,
                    'role' => $comment->user?->role,
                ],
                'attachments' => $comment->attachments->map(fn ($att) => [
                    'id' => $att->id,
                    'file_name' => $att->file_name,
                    'file_path' => asset('uploads/' . basename($att->file_path)),
                    'file_size' => $att->file_size,
                ]),
            ]),
            'status_history' => $this->statusHistory->map(fn ($history) => [
                'id' => $history->id,
                'from_status' => $history->from_status,
                'to_status' => $history->to_status,
                'created_at' => $history->created_at,
                'changer' => [
                    'id' => $history->changer?->id,
                    'name' => $history->changer?->name,
                    'role' => $history->changer?->role,
                ]
            ]),
            'tasks' => MaintenanceTaskResource::collection($this->whenLoaded('tasks')),
        ];
    }
}
