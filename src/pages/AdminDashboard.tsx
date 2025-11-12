import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileText, BarChart3, Settings, LogOut } from "lucide-react";
import { FormList } from "@/components/admin/FormList";
import { FormBuilder } from "@/components/admin/FormBuilder";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState<"list" | "builder">("list");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleCreateNew = () => {
    setSelectedFormId(null);
    setActiveView("builder");
  };

  const handleEditForm = (formId: string) => {
    setSelectedFormId(formId);
    setActiveView("builder");
  };

  const handleBackToList = () => {
    setActiveView("list");
    setSelectedFormId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">FormBuilder</h1>
              <p className="text-sm text-muted-foreground">Dynamic Form Creator</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeView === "list" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Your Forms</h2>
                <p className="text-muted-foreground mt-1">Create and manage dynamic forms</p>
              </div>
              <Button onClick={handleCreateNew} className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create New Form
              </Button>
            </div>

            <FormList onEditForm={handleEditForm} />
          </div>
        ) : (
          <FormBuilder 
            formId={selectedFormId} 
            onBack={handleBackToList}
          />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
