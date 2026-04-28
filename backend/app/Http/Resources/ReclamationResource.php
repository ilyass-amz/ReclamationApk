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
            'comments' => $this->whenLoaded('comments'),
        ];
    }
}
