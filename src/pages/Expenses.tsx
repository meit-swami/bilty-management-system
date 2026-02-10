import { Card, CardContent } from "@/components/ui/card";

export default function Expenses() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Expenses</h1>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Expenses module will be implemented in Phase 9.
        </CardContent>
      </Card>
    </div>
  );
}
