import { BookOpen, CheckCircle, Clock, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Notification, NotificationType } from "@shared/schema";

interface NotificationItemProps {
  notification: Notification;
}

const notificationIcons: Record<NotificationType, any> = {
  BOOK_BORROWED: BookOpen,
  BOOK_RETURNED: CheckCircle,
  BOOK_DUE_SOON: Clock,
  BOOK_OVERDUE: AlertTriangle,
  BOOK_REQUEST_REJECTED: X,
  EXTENSION_REQUEST_APPROVED: CheckCircle,
  EXTENSION_REQUEST_REJECTED: X,
};

const notificationColors: Record<NotificationType, string> = {
  BOOK_BORROWED: "text-blue-600",
  BOOK_RETURNED: "text-green-600", 
  BOOK_DUE_SOON: "text-amber-600",
  BOOK_OVERDUE: "text-red-600",
  BOOK_REQUEST_REJECTED: "text-red-600",
  EXTENSION_REQUEST_APPROVED: "text-green-600",
  EXTENSION_REQUEST_REJECTED: "text-red-600",
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/notifications/${notification.id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const Icon = notificationIcons[notification.type];
  const iconColor = notificationColors[notification.type];

  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      markAsReadMutation.mutate();
    }
  };

  return (
    <div
      className={`p-3 hover:bg-muted/50 cursor-pointer border-l-4 ${
        notification.isRead 
          ? "border-l-transparent opacity-60" 
          : "border-l-primary bg-muted/20"
      }`}
      onClick={handleMarkAsRead}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`mt-0.5 ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground" data-testid={`notification-title-${notification.id}`}>
            {notification.title}
          </p>
          <p className="text-sm text-muted-foreground mt-1" data-testid={`notification-message-${notification.id}`}>
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-2" data-testid={`notification-time-${notification.id}`}>
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              markAsReadMutation.mutate();
            }}
            disabled={markAsReadMutation.isPending}
            data-testid={`button-mark-read-${notification.id}`}
          >
            Mark read
          </Button>
        )}
      </div>
    </div>
  );
}