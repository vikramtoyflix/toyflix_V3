
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

interface AccessDeniedCardProps {
  user: any;
  userRole: string | undefined;
}

export const AccessDeniedCard: React.FC<AccessDeniedCardProps> = ({ user, userRole }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <Shield className="w-5 h-5" />
          Access Denied
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>Admin privileges required</strong>
            <p className="mt-2">
              Only administrators can import toy data. Please ensure you're logged in with an admin account.
            </p>
            {user && (
              <p className="mt-2 text-sm">
                Current user: {user.email} (Role: {userRole || 'loading...'})
              </p>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
