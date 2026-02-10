import { Card, CardContent } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          User management will be implemented in Phase 10.
        </CardContent>
      </Card>
    </div>
  );
}
