<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateReclamationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'min:10'],
            'machine' => ['sometimes', 'required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'department' => ['sometimes', 'required', 'string', 'max:255'],
            'priority' => ['sometimes', 'required', 'in:low,medium,high'],
            'status' => ['sometimes', 'required', 'in:pending,in_progress,resolved,rejected,closed'],
            'solution' => ['nullable', 'string'],
        ];
    }
}
