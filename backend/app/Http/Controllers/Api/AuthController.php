<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'matricule' => ['required', 'string', 'max:50', 'unique:users,matricule'],
            'department' => ['required', 'string', 'max:255'],
            'role' => ['required', Rule::in(['operator', 'department', 'admin'])],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = User::create($validated);
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'matricule' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('matricule', $credentials['matricule'])->first();
        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['matricule' => ['Invalid credentials.']]);
        }

        $token = $user->createToken('api-token')->plainTextToken;
        return response()->json(['token' => $token, 'user' => $user]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function profile(Request $request)
    {
        return response()->json($request->user());
    }
}
