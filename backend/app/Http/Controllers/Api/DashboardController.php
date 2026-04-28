<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reclamation;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();
        $base = Reclamation::query();

        if ($user->role === 'operator') {
            $base->where('user_id', $user->id);
        } elseif ($user->role === 'department') {
            $base->where('department', $user->department);
        }

        $statusDistribution = (clone $base)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $monthly = (clone $base)
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $recent = (clone $base)
            ->with('user')
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'status_distribution' => $statusDistribution,
            'monthly_reclamations' => $monthly,
            'recent_reclamations' => $recent,
            'totals' => [
                'all' => (clone $base)->count(),
                'pending' => (clone $base)->where('status', 'pending')->count(),
                'in_progress' => (clone $base)->where('status', 'in_progress')->count(),
                'resolved' => (clone $base)->where('status', 'resolved')->count(),
            ],
        ]);
    }
}
