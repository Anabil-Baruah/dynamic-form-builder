import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Zap, Shield, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary mb-4">
              <FileText className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Dynamic Form Builder
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create powerful forms with conditional logic, validation rules, and seamless data collection
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="pt-4 flex items-center justify-center gap-3 flex-wrap">
            <Button 
              onClick={() => navigate("/admin")} 
              size="lg"
              className="bg-gradient-primary text-lg px-8 py-6 h-auto"
            >
              Go to Admin Dashboard
            </Button>
            <Button 
              onClick={() => navigate("/forms")}
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 h-auto"
            >
              View Public Forms
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <div className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Build forms in minutes with our intuitive drag-and-drop interface
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Secure & Validated</h3>
              <p className="text-sm text-muted-foreground">
                Built-in validation and security features keep your data safe
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Conditional Logic</h3>
              <p className="text-sm text-muted-foreground">
                Show or hide fields based on user responses for dynamic forms
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
