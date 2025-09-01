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

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  if (isLoading) {
    return (
      <div className="p-4 text-center" data-testid="loading-notifications">
        <p className="text-sm text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center" data-testid="no-notifications">
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center space-x-2">
            {unreadNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAllNotificationsMutation.mutate()}
                disabled={clearAllNotificationsMutation.isPending}
                data-testid="button-clear-all"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
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