import { Card, CardContent } from "@/components/ui/card";

export default function Bilties() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">All Bilties</h1>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No bilties yet. This will be implemented in Phase 4.
        </CardContent>
      </Card>
    </div>
  );
}
