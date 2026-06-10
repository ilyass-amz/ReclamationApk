<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetCode;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $supportsPhone = Schema::hasColumn('users', 'phone');

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', $supportsPhone ? 'required_without:phone' : 'required', 'unique:users,email'],
            'phone' => $supportsPhone
                ? ['nullable', 'string', 'max:30', 'required_without:email', 'unique:users,phone']
                : ['nullable'],
            'matricule' => ['required', 'string', 'max:50', 'unique:users,matricule'],
            'department' => ['required', 'string', 'max:255'],
            'role' => ['required', Rule::in(['operator', 'department', 'admin', 'technician'])],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);
        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors()->toArray());
        }
        $validated = $validator->validated();

        if (!empty($validated['email'])) {
            $validated['email'] = Str::lower($validated['email']);
        }
        if ($supportsPhone && !empty($validated['phone'])) {
            $validated['phone'] = $this->normalizePhone($validated['phone']);
        } else {
            unset($validated['phone']);
        }
        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);
        $token = $user->createToken('api-token')->plainTextToken;

        return $this->successResponse('Registration successful.', [
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'matricule' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);
        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors()->toArray());
        }
        $credentials = $validator->validated();

        if (!Auth::attempt(['matricule' => $credentials['matricule'], 'password' => $credentials['password']])) {
            return $this->errorResponse('Invalid matricule or password.', 401);
        }

        $user = Auth::user();

        if (!$user->is_active) {
            Auth::logout();
            return $this->errorResponse('Your account has been deactivated. Please contact an administrator.', 403);
        }

        $token = $user->createToken('api-token')->plainTextToken;
        return $this->successResponse('Login successful.', [
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return $this->successResponse('Logged out.');
    }

    public function profile(Request $request)
    {
        return $this->successResponse('Profile retrieved successfully.', [
            'user' => $request->user(),
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'identifier' => ['required', 'string', 'max:255'],
        ]);
        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors()->toArray());
        }
        $validated = $validator->validated();

        $identifier = trim($validated['identifier']);
        $user = $this->resolveUserFromIdentifier($identifier);

        if (!$user) {
            return $this->errorResponse('No account was found for this identifier.', 422, [
                'identifier' => ['No account was found for this identifier.'],
            ]);
        }

        $canonicalIdentifier = $this->canonicalIdentifier($identifier);

        // Generate a 6-digit OTP code
        $plainCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('password_reset_requests')->updateOrInsert(
            ['identifier' => $canonicalIdentifier],
            [
                'token'      => hash('sha256', $plainCode),
                'expires_at' => Carbon::now()->addMinutes(15),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        // Send the code by email if the user has an email address
        if ($user->email) {
            try {
                Mail::to($user->email)->send(new PasswordResetCode($plainCode, $user->name));
            } catch (\Throwable $e) {
                // Log the error but don't expose it to the client
                \Log::error('Password reset email failed: ' . $e->getMessage());
            }
        }

        $response = [];
        if (config('app.debug')) {
            // Expose the code in debug mode so it can be tested without email
            $response['reset_code'] = $plainCode;
        }

        return $this->successResponse(
            'Un code de réinitialisation a été envoyé à votre adresse e-mail.',
            $response
        );
    }

    public function verifyResetCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'identifier' => ['required', 'string', 'max:255'],
            'code'       => ['required', 'string', 'digits:6'],
        ]);
        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors()->toArray());
        }
        $validated = $validator->validated();

        $canonicalIdentifier = $this->canonicalIdentifier(trim($validated['identifier']));

        $resetRequest = DB::table('password_reset_requests')
            ->where('identifier', $canonicalIdentifier)
            ->where('expires_at', '>', now())
            ->first();

        $isCodeValid = $resetRequest && hash_equals($resetRequest->token, hash('sha256', $validated['code']));
        if (!$isCodeValid) {
            return $this->errorResponse('Le code de réinitialisation est invalide ou expiré.', 422, [
                'code' => ['Le code de réinitialisation est invalide ou expiré.'],
            ]);
        }

        return $this->successResponse('Code valide. Veuillez définir votre nouveau mot de passe.');
    }

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'identifier' => ['required', 'string', 'max:255'],
            'code'       => ['required', 'string', 'digits:6'],
            'password'   => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors()->toArray());
        }
        $validated = $validator->validated();

        $canonicalIdentifier = $this->canonicalIdentifier($validated['identifier']);

        $resetRequest = DB::table('password_reset_requests')
            ->where('identifier', $canonicalIdentifier)
            ->where('expires_at', '>', now())
            ->first();

        $isCodeValid = $resetRequest && hash_equals($resetRequest->token, hash('sha256', $validated['code']));
        if (!$isCodeValid) {
            return $this->errorResponse('Le code de réinitialisation est invalide ou expiré.', 422, [
                'code' => ['Le code de réinitialisation est invalide ou expiré.'],
            ]);
        }

        $user = $this->resolveUserFromIdentifier($canonicalIdentifier);
        if (!$user) {
            return $this->errorResponse('No account was found for this identifier.', 422, [
                'identifier' => ['No account was found for this identifier.'],
            ]);
        }

        $user->password = $validated['password'];
        $user->save();
        $user->tokens()->delete();

        DB::table('password_reset_requests')->where('identifier', $canonicalIdentifier)->delete();

        return $this->successResponse('Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
    }


    private function resolveUserFromIdentifier(string $identifier): ?User
    {
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            return User::where('email', Str::lower($identifier))->first();
        }

        if (!Schema::hasColumn('users', 'phone')) {
            return null;
        }

        return User::where('phone', $this->normalizePhone($identifier))->first();
    }

    private function canonicalIdentifier(string $identifier): string
    {
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            return Str::lower(trim($identifier));
        }

        if (!Schema::hasColumn('users', 'phone')) {
            return Str::lower(trim($identifier));
        }

        return $this->normalizePhone($identifier);
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/[^0-9+]/', '', trim($phone));
    }

    private function errorResponse(string $message, int $status, array $errors = []): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => (object) $errors,
        ], $status);
    }

    private function successResponse(string $message, array $data = [], int $status = 200): \Illuminate\Http\JsonResponse
    {
        return response()->json(array_merge([
            'success' => true,
            'message' => $message,
            'errors' => (object) [],
        ], $data), $status);
    }
}
