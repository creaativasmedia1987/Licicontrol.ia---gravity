import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FloatingAssistant from "../FloatingAssistant";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("Licicontrol.IA");
  const [logoData, setLogoData] = useState<string | null>(null);

  useEffect(() => {
    fetchOrgSettings();
    window.addEventListener('org-settings-updated', fetchOrgSettings);
    return () => window.removeEventListener('org-settings-updated', fetchOrgSettings);
  }, []);

  const fetchOrgSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings' as any)
        .select('org_name, logo_data')
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid 406 if row absent initially

      if (data) {
        if ((data as any).org_name) setOrgName((data as any).org_name);
        if ((data as any).logo_data) setLogoData((data as any).logo_data);
      }
    } catch (error) {
      console.error("Error fetching org settings:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64">
        <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-10 transition-all duration-300">
          <div className="flex items-center gap-3">
            {logoData && <img src={logoData} alt="Logo" className="h-8 w-auto object-contain" />}
            <h2 className="text-xl font-semibold text-primary">{orgName}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
        <div className="container mx-auto p-4 md:p-8">
          {children}
        </div>
        <FloatingAssistant />
      </main>
    </div>
  );
}