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

        return response()->json($comment->load('user'), 201);
    }
}
