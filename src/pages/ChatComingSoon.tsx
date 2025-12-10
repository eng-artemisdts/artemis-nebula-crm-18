import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hourglass } from "lucide-react";

const ChatComingSoon = () => {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 space-y-6">
        <Card className="border-dashed">
          <CardHeader className="space-y-2">
            <Badge variant="secondary" className="w-fit gap-2">
              <Hourglass className="h-4 w-4" />
              Em breve
            </Badge>
            <CardTitle className="text-2xl">Chat WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>Estamos finalizando o módulo de Chat com WhatsApp.</p>
            <p>Assim que estiver disponível, você verá aqui suas conversas e poderá responder em tempo real.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ChatComingSoon;
