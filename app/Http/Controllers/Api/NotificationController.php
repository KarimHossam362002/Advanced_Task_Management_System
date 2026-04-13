<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'data' => $notifications->map(fn (Notification $notification): array => [
                'id' => $notification->id,
                'message' => $notification->message,
                'is_read' => $notification->is_read,
                'created_at' => $notification->created_at?->toISOString(),
                'updated_at' => $notification->updated_at?->toISOString(),
            ])->all(),
        ]);
    }
}
