import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CategoryManager = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [suggestedCategories, setSuggestedCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("lead_categories")
      .select("*")
      .order("name");
    setCategories(data || []);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("lead_categories")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("lead_categories")
          .insert([formData]);
        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }
      
      setFormData({ name: "", description: "" });
      setEditingId(null);
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast.error("Erro ao salvar categoria");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Digite uma descrição para buscar categorias");
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-categories', {
        body: { prompt: aiPrompt }
      });

      if (error) throw error;
      
      setSuggestedCategories(data.categories || []);
      toast.success(`${data.categories.length} categorias sugeridas pela IA!`);
    } catch (error: any) {
      toast.error("Erro ao buscar sugestões de categorias");
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddSuggestedCategory = async (category: any) => {
    try {
      const { error } = await supabase
        .from("lead_categories")
        .insert([category]);
      if (error) throw error;
      toast.success("Categoria adicionada com sucesso!");
      fetchCategories();
      setSuggestedCategories(prev => prev.filter(c => c !== category));
    } catch (error: any) {
      toast.error("Erro ao adicionar categoria");
      console.error(error);
    }
  };

  const handleEdit = (category: any) => {
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setEditingId(category.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase
        .from("lead_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Categoria excluída com sucesso!");
      fetchCategories();
    } catch (error: any) {
      toast.error("Erro ao excluir categoria");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "" });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Categorias</h1>
            <p className="text-muted-foreground mt-1">
              Adicione e organize categorias de leads
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => { setAiPrompt(""); setSuggestedCategories([]); }}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Buscar com IA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Buscar Categorias com IA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Descreva o tipo de negócio ou necessidade</Label>
                    <Textarea
                      id="ai-prompt"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: Preciso de categorias para uma agência de marketing digital..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleAiSuggest} disabled={aiLoading} className="w-full">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {aiLoading ? "Buscando..." : "Buscar Sugestões"}
                  </Button>

                  {suggestedCategories.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h3 className="font-semibold">Categorias Sugeridas:</h3>
                      {suggestedCategories.map((category, index) => (
                        <Card key={index} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{category.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {category.description}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddSuggestedCategory(category)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingId(null); setFormData({ name: "", description: "" }); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar Categoria" : "Nova Categoria"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="Ex: Desenvolvimento Web"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Descrição da categoria..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {category.description || "Sem descrição"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(category)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">
              Nenhuma categoria criada ainda. Clique em "Nova Categoria" para começar.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CategoryManager;
