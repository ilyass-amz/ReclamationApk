<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReclamationRequest;
use App\Http\Requests\UpdateReclamationRequest;
use App\Http\Resources\ReclamationResource;
use App\Models\Reclamation;
use App\Models\ReclamationStatusHistory;
use Illuminate\Http\Request;

class ReclamationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Reclamation::with(['user', 'comments.user', 'comments.attachments', 'statusHistory.changer', 'attachments', 'tasks.technician'])->latest();

        if ($user->role === 'operator') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'department') {
            $query->where('department', $user->department);
        } elseif ($user->role === 'technician') {
            $query->whereHas('tasks', fn ($q) => $q->where('technician_id', $user->id));
        }

        $query
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->when($request->priority, fn ($q, $priority) => $q->where('priority', $priority))
            ->when($request->operator, fn ($q, $operator) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$operator}%")))
            ->when($request->machine, fn ($q, $machine) => $q->where('machine', 'like', "%{$machine}%"))
            ->when($request->search, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            });

        return ReclamationResource::collection($query->paginate((int) $request->get('per_page', 10)));
    }

    public function store(StoreReclamationRequest $request)
    {
        $reclamation = Reclamation::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'status' => 'pending',
        ]);

        $this->handleFileUploads($request, $reclamation);

        return new ReclamationResource($reclamation->load(['user', 'attachments']));
    }

    public function show(Request $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);
        return new ReclamationResource($reclamation->load([
            'user', 
            'comments.user', 
            'comments.attachments', 
            'statusHistory.changer', 
            'attachments', 
            'tasks.technician', 
            'tasks.assignedBy', 
            'tasks.attachments'
        ]));
    }

    public function update(UpdateReclamationRequest $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);
        $previousStatus = $reclamation->status;
        $reclamation->update($request->validated());

        if ($request->filled('status') && $request->status !== $previousStatus) {
            ReclamationStatusHistory::create([
                'reclamation_id' => $reclamation->id,
                'changed_by' => $request->user()->id,
                'from_status' => $previousStatus,
                'to_status' => $request->status,
            ]);
        }

        if ($request->status === 'resolved' && !$reclamation->resolved_at) {
            $reclamation->update(['resolved_at' => now()]);
        }

        $this->handleFileUploads($request, $reclamation);

        return new ReclamationResource($reclamation->fresh([
            'user', 
            'comments.user', 
            'comments.attachments', 
            'statusHistory.changer', 
            'attachments', 
            'tasks.technician', 
            'tasks.assignedBy', 
            'tasks.attachments'
        ]));
    }

    public function destroy(Request $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);
        $reclamation->delete();
        return response()->json(['message' => 'Reclamation deleted']);
    }

    private function handleFileUploads(Request $request, $model): void
    {
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

                $model->attachments()->create([
                    'file_path' => $filePath,
                    'file_name' => $originalName,
                    'file_size' => $size,
                    'user_id' => $request->user()->id,
                ]);
            }
        }
    }

    private function authorizeAccess(Request $request, Reclamation $reclamation): void
    {
        $user = $request->user();
        if ($user->role === 'admin') {
            return;
        }

        if ($user->role === 'operator' && $reclamation->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        if ($user->role === 'department' && $reclamation->department !== $user->department) {
            abort(403, 'Unauthorized');
        }

        if ($user->role === 'technician' && !$reclamation->tasks()->where('technician_id', $user->id)->exists()) {
            abort(403, 'Unauthorized');
        }
    }
}
