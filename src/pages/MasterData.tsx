import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tabs = ["Vehicles", "Drivers", "Locations", "Goods Types"];

export default function MasterData() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Master Data</h1>
      <Tabs defaultValue="Vehicles">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t} value={t}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No {t.toLowerCase()} added yet. This will be implemented in Phase 7.</p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
