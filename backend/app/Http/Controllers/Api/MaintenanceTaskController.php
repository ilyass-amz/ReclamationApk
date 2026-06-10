<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MaintenanceTaskResource;
use App\Models\MaintenanceTask;
use App\Models\Reclamation;
use App\Models\ReclamationStatusHistory;
use App\Models\User;
use Illuminate\Http\Request;

class MaintenanceTaskController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MaintenanceTask::with(['reclamation', 'technician', 'assignedBy', 'attachments'])->latest();

        if ($user->role === 'technician') {
            $query->where('technician_id', $user->id);
        } elseif ($user->role === 'department') {
            $query->whereHas('reclamation', fn ($q) => $q->where('department', $user->department));
        } elseif ($user->role === 'admin') {
            // Admin sees everything
        } else {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return MaintenanceTaskResource::collection($query->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'department' && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'reclamation_id' => ['required', 'exists:reclamations,id'],
            'technician_id' => ['required', 'exists:users,id'],
            'description' => ['nullable', 'string'],
        ]);

        $tech = User::findOrFail($validated['technician_id']);
        if ($tech->role !== 'technician') {
            return response()->json(['message' => 'User is not a technician.'], 422);
        }

        $reclamation = Reclamation::findOrFail($validated['reclamation_id']);

        if ($user->role === 'department' && $reclamation->department !== $user->department) {
            return response()->json(['message' => 'Complaint does not belong to your department.'], 403);
        }

        if ($user->role === 'department' && $tech->department !== $user->department) {
            return response()->json(['message' => 'Technician does not belong to your department.'], 403);
        }

        $task = MaintenanceTask::create([
            'reclamation_id' => $validated['reclamation_id'],
            'technician_id' => $validated['technician_id'],
            'assigned_by' => $user->id,
            'description' => $validated['description'] ?? null,
            'status' => 'pending',
        ]);

        // Auto-update reclamation status to in_progress if it was pending
        if ($reclamation->status === 'pending') {
            $previousStatus = $reclamation->status;
            $reclamation->update(['status' => 'in_progress']);

            ReclamationStatusHistory::create([
                'reclamation_id' => $reclamation->id,
                'changed_by' => $user->id,
                'from_status' => $previousStatus,
                'to_status' => 'in_progress',
            ]);
        }

        return new MaintenanceTaskResource($task->load(['reclamation', 'technician', 'assignedBy']));
    }

    public function show(Request $request, MaintenanceTask $task)
    {
        $user = $request->user();

        if ($user->role === 'technician' && $task->technician_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        if ($user->role === 'department' && $task->reclamation->department !== $user->department) {
            abort(403, 'Unauthorized');
        }

        return new MaintenanceTaskResource($task->load(['reclamation', 'technician', 'assignedBy', 'attachments.user']));
    }

    public function update(Request $request, MaintenanceTask $task)
    {
        $user = $request->user();

        if ($user->role !== 'admin' && $task->technician_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:pending,in_progress,completed'],
            'intervention_notes' => ['nullable', 'string'],
        ]);

        $task->update([
            'status' => $validated['status'],
            'intervention_notes' => $validated['intervention_notes'] ?? $task->intervention_notes,
        ]);

        if ($validated['status'] === 'completed' && !$task->completed_at) {
            $task->update(['completed_at' => now()]);
        }

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

                $task->attachments()->create([
                    'file_path' => $filePath,
                    'file_name' => $originalName,
                    'file_size' => $size,
                    'user_id' => $user->id,
                ]);
            }
        }

        return new MaintenanceTaskResource($task->load(['reclamation', 'technician', 'assignedBy', 'attachments']));
    }

    public function destroy(Request $request, MaintenanceTask $task)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $user->role !== 'department') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->role === 'department' && $task->reclamation->department !== $user->department) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $task->delete();
        return response()->json(['message' => 'Task deleted successfully.']);
    }
}
