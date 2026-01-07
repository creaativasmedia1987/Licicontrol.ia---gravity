import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/Layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Arquivos from "./pages/Arquivos";
import GeracaoIA from "./pages/GeracaoIA";
import Transparencia from "./pages/Transparencia";
import ControleDespesas from "./pages/ControleDespesas";
import AnaliseImpugnacao from "./pages/AnaliseImpugnacao";
import Relatorios from "./pages/Relatorios";
import MatrizRisco from "./pages/MatrizRisco";
import GeracaoMinutas from "./pages/GeracaoMinutas";
import CotacoesPrecos from "./pages/CotacoesPrecos";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Configuracoes from "./pages/Configuracoes";
import GovSign from "./pages/GovSign";
import GovAuditor from "./pages/GovAuditor";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/analise-impugnacao"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AnaliseImpugnacao />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/arquivos"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Arquivos />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/geracao-ia"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <GeracaoIA />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transparencia"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Transparencia />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/controle-despesas"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ControleDespesas />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matriz-risco"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MatrizRisco />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/geracao-minutas"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <GeracaoMinutas />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Relatorios />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotacoes-precos"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CotacoesPrecos />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/govsign"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <GovSign />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/gov-auditor"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <GovAuditor />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Configuracoes />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;