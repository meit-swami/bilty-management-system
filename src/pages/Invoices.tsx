import { Card, CardContent } from "@/components/ui/card";

export default function Invoices() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Invoice management will be implemented in Phase 6.
        </CardContent>
      </Card>
    </div>
  );
}
