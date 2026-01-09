import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  FileText,
  LayoutGrid,
  List,
  Clock,
  AlertTriangle,
  FileDown,
  Trash2,
  ExternalLink,
  Folder,
  ChevronRight,
  Plus,
  Filter,
  FileCheck,
  Briefcase,
  ClipboardList,
  FileSignature,
  Loader2,
  Upload
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { User } from '@supabase/supabase-js';
import { Tables } from '@/integrations/supabase/types';

type FileRow = Tables<'files'>;

interface Document {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  filePath: string;
  fileSize: number;
  complianceScore: number;
}

// Categories definition
const categories = [
  { id: 'Todos', label: 'Todos Arquivos', icon: <Folder size={18} /> },
  { id: 'Editais', label: 'Editais', icon: <FileText size={18} /> },
  { id: 'Ofícios', label: 'Ofícios', icon: <FileSignature size={18} /> },
  { id: 'Minutas', label: 'Minutas', icon: <FileCheck size={18} /> },
  { id: 'Contratos', label: 'Contratos', icon: <Briefcase size={18} /> },
  { id: 'DFD', label: 'DFD', icon: <ClipboardList size={18} /> },
  { id: 'ETP', label: 'ETP', icon: <ClipboardList size={18} /> },
  { id: 'TR', label: 'TR', icon: <ClipboardList size={18} /> },
];

export default function Arquivos() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Auth Effect
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Data Fetching Effect
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("files")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mappedDocs: Document[] = (data || []).map(file => ({
          id: file.id,
          title: file.file_name,
          category: file.folder_name,
          createdAt: file.created_at || new Date().toISOString(),
          filePath: file.file_path,
          fileSize: file.file_size,
          complianceScore: 100
        }));

        setDocuments(mappedDocs);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error loading files:", error);
        toast({
          title: "Erro ao carregar arquivos",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadFiles();
    }
  }, [user, toast]);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = (doc.title?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Determine category: Use selected category or default to 'Outros' if 'Todos' is selected
    const targetCategory = selectedCategory === 'Todos' ? 'Outros' : selectedCategory;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          folder_name: targetCategory,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload concluído!",
        description: `${file.name} salvo em ${targetCategory}.`,
      });

      // Reload files after successful upload
      const { data } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setDocuments(data.map(f => ({
          id: f.id,
          title: f.file_name,
          category: f.folder_name,
          createdAt: f.created_at || new Date().toISOString(),
          filePath: f.file_path,
          fileSize: f.file_size,
          complianceScore: 100
        })));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error uploading:", error);
      toast({
        title: "Erro no upload",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (doc: any) => {
    if (!user) return;
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.filePath]);

      if (storageError) console.warn("Storage delete missed (might be ok):", storageError);

      // Delete from DB
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({
        title: "Documento excluído",
        description: "Arquivo removido com sucesso.",
      });

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Erro ao deletar documento:", error);
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error downloading:", error);
      toast({ title: "Erro", description: "Falha no download: " + message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex font-sans text-slate-900 animate-in fade-in duration-500">

      {/* SIDEBAR */}
      <aside className="w-72 bg-white h-[calc(100vh-2rem)] sticky top-4 m-4 rounded-3xl flex flex-col border border-slate-200 shadow-sm hidden lg:flex">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Folder className="text-blue-600" size={24} />
            Arquivos
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Gestão de Documentos</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                {cat.icon}
                <span className="text-sm font-semibold">{cat.label}</span>
              </div>
              {selectedCategory !== cat.id && (
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 font-bold">
                  {documents.filter(d => cat.id === 'Todos' || d.category === cat.id).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">Usuário Ativo</p>
              <p className="text-[10px] text-slate-400 truncate tracking-tighter">{user?.email || 'Carregando...'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
              <span>Arquivos</span>
              <ChevronRight size={12} />
              <span className="text-blue-600">{selectedCategory}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {selectedCategory === 'Todos' ? 'Repositório Central' : `Pasta: ${selectedCategory}`}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar documentos..."
                className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-64 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative">
              <input
                type="file"
                id="file-upload-main"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <button
                onClick={() => document.getElementById('file-upload-main')?.click()}
                className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isUploading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-black text-slate-500 uppercase">
              <Filter size={12} /> Filtro Ativo: {selectedCategory}
            </div>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-slate-100 text-blue-600' : 'text-slate-400'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600' : 'text-slate-400'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>

        {/* LIST */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="mt-4 text-slate-500 font-bold">Carregando repositório...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white/50 border-2 border-dashed border-slate-200 rounded-[3rem]">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
              <Folder size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-400">Nenhum documento encontrado</h3>
            <p className="text-slate-400 text-sm mt-2">Clique no botão "+" para enviar um arquivo para <strong>{selectedCategory}</strong>.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-3'}>
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                viewMode={viewMode}
                onDelete={() => handleDelete(doc)}
                onDownload={() => handleDownload(doc)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DocumentCard({ doc, viewMode, onDelete, onDownload }: {
  doc: Document;
  viewMode: 'list' | 'grid';
  onDelete: () => void;
  onDownload: () => void;
}) {
  const score = doc.complianceScore || 0;
  // High risk logic placeholder - defaulting to safe for now as we don't calculate it here yet
  const isHighRisk = false;

  if (viewMode === 'list') {
    return (
      <div className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 transition-all flex items-center gap-4 animate-in slide-in-from-bottom-2">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600`}>
          <FileText size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
              {doc.category || 'Geral'}
            </span>
            <h4 className="font-bold text-slate-800 truncate text-sm" title={doc.title}>{doc.title}</h4>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            {new Date(doc.createdAt).toLocaleDateString('pt-BR')} • {(doc.fileSize / 1024).toFixed(1)} KB
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <button onClick={onDownload} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
            <FileDown size={18} />
          </button>
          <button onClick={onDelete} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:shadow-2xl hover:shadow-slate-200 transition-all group relative overflow-hidden animate-in zoom-in-95">
      <div className="flex justify-between items-start mb-6">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <FileText size={30} />
        </div>
        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">
          {doc.category || 'Geral'}
        </span>
      </div>

      <h4 className="font-black text-slate-800 text-lg mb-4 line-clamp-2 leading-tight h-14 italic" title={doc.title}>{doc.title}</h4>

      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock size={14} />
          <span className="text-[10px] font-bold">{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onDownload} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
            <FileDown size={18} />
          </button>
          <button onClick={onDelete} className="p-2 bg-slate-900 text-white rounded-xl hover:scale-105 transition-all shadow-lg shadow-slate-200 hover:bg-red-600">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
