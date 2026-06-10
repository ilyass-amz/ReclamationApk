<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reclamation;
use App\Models\ReclamationComment;
use Illuminate\Http\Request;

class ReclamationCommentController extends Controller
{
    public function store(Request $request, Reclamation $reclamation)
    {
        $validated = $request->validate([
            'comment' => ['required', 'string', 'min:2'],
        ]);

        $comment = ReclamationComment::create([
            'reclamation_id' => $reclamation->id,
            'user_id' => $request->user()->id,
            'comment' => $validated['comment'],
        ]);

        if ($request->hasFile('attachments')) {
            if (!file_exists(public_path('uploads'))) {
                mkdir(public_path('uploads'), 0755, true);
            }
            foreach ($request->file('attachments') as $file) {
                $originalName = $file->getClientOriginalName();
                $size = $file->getSize();
                $fileName = time() . '_' . uniqid() . '_' . preg_replace('/[^a-zA-Z0-9_.-]/', '_', $originalName);
                $file->move(public_path('uploads'), $fileName);
                $filePath = 'uploads/' . $fileName;

                $comment->attachments()->create([
                    'file_path' => $filePath,
                    'file_name' => $originalName,
                    'file_size' => $size,
                    'user_id' => $request->user()->id,
                ]);
            }
        }

        return response()->json([
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
        ], 201);
    }
}
