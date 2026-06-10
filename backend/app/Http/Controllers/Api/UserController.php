<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin' && $request->user()->role !== 'department') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = User::orderBy('created_at', 'desc');

        if ($request->user()->role === 'department') {
            $query->where('role', 'technician')
                  ->where('department', $request->user()->department);
        } else {
            if ($request->has('role')) {
                $query->where('role', $request->role);
            }
            if ($request->has('department')) {
                $query->where('department', $request->department);
            }
        }

        $users = $query->get();
        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    /**
     * Store a newly created user (admin only).
     * New accounts are inactive by default.
     */
    public function store(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:30',
            'matricule' => 'required|string|max:50|unique:users,matricule',
            'department' => 'required|string|max:255',
            'role' => ['required', Rule::in(['admin', 'operator', 'department', 'technician'])],
            'password' => 'required|string|min:6',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['is_active'] = false;

        $user = User::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully. Account is inactive by default.',
            'data' => $user
        ], 201);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, string $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);

        // Prevent admin from updating themselves
        if ((int) $user->id === (int) $request->user()->id) {
            return response()->json(['message' => 'Cannot update yourself'], 400);
        }

        $validated = $request->validate([
            'role' => ['sometimes', 'string', Rule::in(['admin', 'operator', 'department', 'technician'])],
            'department' => 'sometimes|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => $user
        ]);
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(Request $request, string $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);
        
        // Prevent admin from deleting themselves
        if ((int) $user->id === (int) $request->user()->id) {
            return response()->json(['message' => 'Cannot delete yourself'], 400);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }
}
