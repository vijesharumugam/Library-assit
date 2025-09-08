import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushNotificationSettingsProps {
  className?: string;
}

export function PushNotificationSettings({ className }: PushNotificationSettingsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: CheckCircle,
          text: 'Granted',
          color: 'text-green-600',
          variant: 'default' as const
        };
      case 'denied':
        return {
          icon: AlertCircle,
          text: 'Denied',
          color: 'text-red-600',
          variant: 'destructive' as const
        };
      default:
        return {
          icon: AlertCircle,
          text: 'Not Set',
          color: 'text-yellow-600',
          variant: 'secondary' as const
        };
    }
  };

  if (!isSupported) {
    return (
      <Card className={className} data-testid="push-notification-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Real-time notifications for library updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Not Supported</p>
              <p className="text-xs text-muted-foreground">
                Your browser doesn't support push notifications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getPermissionStatus();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={className} data-testid="push-notification-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant notifications about your books, due dates, and library updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Permission Status</div>
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
              <Badge variant={statusInfo.variant} className="text-xs">
                {statusInfo.text}
              </Badge>
            </div>
          </div>
        </div>

        {/* Subscription Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Mobile Notifications</div>
            <div className="text-xs text-muted-foreground">
              Receive notifications even when the app is closed
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading || permission === 'denied'}
            data-testid="toggle-push-notifications"
          />
        </div>

        {/* Status Message */}
        {permission === 'denied' && (
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Notifications Blocked
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                To enable notifications, click the lock icon in your browser's address bar
              </p>
            </div>
          </div>
        )}

        {isSubscribed && permission === 'granted' && (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <Smartphone className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Notifications Active
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                You'll receive push notifications for library updates
              </p>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Get notified about book due dates</p>
          <p>• Receive updates on book requests and extensions</p>
          <p>• Stay informed about library announcements</p>
        </div>
      </CardContent>
    </Card>
  );
}