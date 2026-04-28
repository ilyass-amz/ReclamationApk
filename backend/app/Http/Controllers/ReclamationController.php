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
        $query = Reclamation::with(['user', 'comments.user'])->latest();

        if ($user->role === 'operator') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'department') {
            $query->where('department', $user->department);
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

        return new ReclamationResource($reclamation->load('user'));
    }

    public function show(Request $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);
        return new ReclamationResource($reclamation->load(['user', 'comments.user', 'statusHistory']));
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

        return new ReclamationResource($reclamation->fresh()->load('user'));
    }

    public function destroy(Request $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);
        $reclamation->delete();
        return response()->json(['message' => 'Reclamation deleted']);
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
    }
}
