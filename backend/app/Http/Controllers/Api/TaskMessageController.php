<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceTask;
use App\Models\TaskMessage;
use Illuminate\Http\Request;

class TaskMessageController extends Controller
{
    public function index(Request $request, $taskId)
    {
        $task = MaintenanceTask::findOrFail($taskId);
        $user = $request->user();

        // Check permissions
        if ($user->role === 'technician' && $task->technician_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($user->role === 'department' && $task->reclamation->department !== $user->department) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $messages = $task->messages()->with('user:id,name,role')->get();

        return response()->json([
            'data' => $messages
        ]);
    }

    public function store(Request $request, $taskId)
    {
        $task = MaintenanceTask::findOrFail($taskId);
        $user = $request->user();

        // Check permissions
        if ($user->role === 'technician' && $task->technician_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($user->role === 'department' && $task->reclamation->department !== $user->department) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $message = $task->messages()->create([
            'user_id' => $user->id,
            'message' => $validated['message'],
        ]);

        return response()->json([
            'message' => 'Message sent',
            'data' => $message->load('user:id,name,role')
        ], 201);
    }
}

