import { NotificationItem } from "@/components/notification-item";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";
import type { Notification } from "@shared/schema";

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
}

export function NotificationList({ notifications, isLoading }: NotificationListProps) {
  const queryClient = useQueryClient();

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/notifications/clear-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Add safety checks for notifications array
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadNotifications = safeNotifications.filter(n => n && !n.isRead);
  const readNotifications = safeNotifications.filter(n => n && n.isRead);

  if (isLoading) {
    return (
      <div className="p-4 text-center" data-testid="loading-notifications">
        <p className="text-sm text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  if (safeNotifications.length === 0) {
    return (
      <div className="p-4 text-center" data-testid="no-notifications">
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 border-b bg-muted/30">
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Notifications</h3>
          {(unreadNotifications.length > 0 || safeNotifications.length > 0) && (
            <div className="flex gap-2">
              {unreadNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  data-testid="button-mark-all-read"
                  className="text-xs h-7 flex-1"
                >
                  Mark all read
                </Button>
              )}
              {safeNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearAllNotificationsMutation.mutate()}
                  disabled={clearAllNotificationsMutation.isPending}
                  data-testid="button-clear-all"
                  className="text-xs h-7 flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {unreadNotifications.length > 0 && (
        <div>
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Unread ({unreadNotifications.length})
            </p>
          </div>
          {unreadNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}

      {readNotifications.length > 0 && (
        <div>
          {unreadNotifications.length > 0 && <Separator />}
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Read ({readNotifications.length})
            </p>
          </div>
          {readNotifications.slice(0, 5).map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
          {readNotifications.length > 5 && (
            <div className="px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">
                {readNotifications.length - 5} more notifications...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}