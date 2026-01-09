import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  FileSearch,
  BarChart3,
  Menu,
  X,
  AlertTriangle,
  FileCheck,
  DollarSign,
  Wallet,
  Gavel,
  ShieldCheck,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    title: "Controle Interno",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { name: "Matriz de Risco", icon: AlertTriangle, path: "/matriz-risco" },
      { name: "Análise de Transparência", icon: FileSearch, path: "/transparencia" },
      { name: "Análise de Impugnação", icon: Gavel, path: "/analise-impugnacao" },
      { name: "Relatório Geral de Atividades", icon: BarChart3, path: "/relatorios" },
      { name: "Controle de Despesas", icon: Wallet, path: "/controle-despesas" },
    ],
  },
  {
    title: "Setor de Licitações",
    items: [
      { name: "Arquivos e Documentos", icon: FileText, path: "/arquivos" },
      { name: "Auditor IA", icon: Bot, path: "/gov-auditor" },
      { name: "Cotações de Preços", icon: DollarSign, path: "/cotacoes-precos" },
      { name: "Geração de Minutas", icon: FileCheck, path: "/geracao-minutas" },
      { name: "Geração com IA", icon: Sparkles, path: "/geracao-ia" },
      { name: "Configurações", icon: Menu, path: "/configuracoes" }, // Using Menu icon as placeholder or Settings if imported
    ],
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar transition-transform duration-300",
          "md:translate-x-0 border-r border-sidebar-border",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <h1 className="text-xl font-bold text-sidebar-foreground">
              Licicontrol.IA
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
            {navigation.map((section) => (
              <div key={section.title}>
                <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                  {section.title}
                </h2>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          )
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-sidebar-foreground/60 text-center">
              © 2024 Licicontrol.IA
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
