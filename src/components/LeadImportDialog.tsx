import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle2, X, Download, Sparkles } from "lucide-react";
import { LeadImportService } from "@/services/LeadImportService";
import { LeadAIConverterService } from "@/services/LeadAIConverterService";
import { ValidatedLead } from "@/services/validators/LeadDataValidator";
import { ValidationError } from "@/services/validators/LeadDataValidator";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LeadImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export const LeadImportDialog = ({
  open,
  onOpenChange,
  onImportComplete,
}: LeadImportDialogProps) => {
  const { organization } = useOrganization();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [leads, setLeads] = useState<ValidatedLead[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [aiMapping, setAiMapping] = useState<Array<{ sourceField: string; targetField: string; confidence: number }>>([]);
  const [isLocal, setIsLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    setIsLocal(hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0");
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx" && extension !== "xls") {
      toast.error("Formato não suportado. Use CSV ou XLSX.");
      return;
    }

    setFile(selectedFile);
    setLeads([]);
    setErrors([]);
    setImportResult(null);
    setAiMapping([]);
    setParsing(true);

    try {
      if (useAI && isLocal) {
        try {
          const aiConverter = new LeadAIConverterService();
          const result = await aiConverter.convertSpreadsheet(selectedFile);

          setLeads(result.leads);
          setAiMapping(result.mapping);
          setErrors([]);

          if (result.leads.length === 0) {
            toast.error("Nenhum lead encontrado após conversão com IA");
          } else {
            toast.success(`${result.leads.length} lead(s) convertido(s) com IA! Mapeamento: ${result.mapping.length} campo(s) identificado(s).`);
          }
        } catch (aiError: any) {
          console.error("Erro na conversão com IA:", aiError);
          const errorMessage = aiError.message || "Erro desconhecido ao processar com IA";
          
          if (errorMessage.includes("OPENAI_API_KEY")) {
            toast.error("Chave da API OpenAI não configurada. Adicione VITE_OPENAI_API_KEY no arquivo .env.local");
          } else if (errorMessage.includes("ambiente local")) {
            toast.error("Conversão com IA disponível apenas em ambiente local (localhost)");
          } else if (errorMessage.includes("JSON")) {
            toast.error("Erro ao processar resposta da IA. Tente novamente ou use o modo de importação padrão.");
          } else {
            toast.error(`Erro na conversão com IA: ${errorMessage}`);
          }
          
          setParsing(false);
          setFile(null);
          return;
        }
      } else {
        const importService = new LeadImportService(selectedFile);
        const result = await importService.parseFile(selectedFile);

        setLeads(result.leads);
        setErrors(result.errors);

        if (result.leads.length === 0) {
          toast.error("Nenhum lead válido encontrado no arquivo");
        } else if (result.errors.length > 0) {
          toast.warning(`${result.leads.length} lead(s) válido(s), mas há ${result.errors.length} erro(s) de validação`);
        } else {
          toast.success(`${result.leads.length} lead(s) encontrado(s) e pronto(s) para importar`);
        }
      }
    } catch (error: any) {
      toast.error(`Erro ao processar arquivo: ${error.message}`);
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file || leads.length === 0) {
      toast.error("Arquivo ou leads não encontrados");
      return;
    }

    if (!organization || !organization.id) {
      toast.error("Organização não encontrada. Faça login novamente.");
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const importService = new LeadImportService(file);
      const result = await importService.importLeads(leads, organization.id);

      setImportResult(result.message);

      if (result.success) {
        toast.success(result.message);
        setTimeout(() => {
          onImportComplete();
          handleClose();
        }, 1500);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error("Erro detalhado na importação:", error);
      toast.error(`Erro ao importar: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setLeads([]);
    setErrors([]);
    setImportResult(null);
    setUseAI(false);
    setAiMapping([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const handleExportExample = () => {
    const exampleData = [
      {
        nome: "João Silva",
        email: "joao.silva@example.com",
        whatsapp: "5511999999999",
        status: "novo",
        categoria: "Cliente Potencial",
        origem: "Site",
        descricao: "Lead interessado em nossos serviços",
        valor: "1000.00",
        horario_integracao: "09:00",
      },
      {
        nome: "Maria Santos",
        email: "maria.santos@example.com",
        whatsapp: "5511888888888",
        status: "conversa_iniciada",
        categoria: "Cliente VIP",
        origem: "Indicação",
        descricao: "Cliente com alto potencial de conversão",
        valor: "2500.00",
        horario_integracao: "14:30",
      },
      {
        nome: "Pedro Oliveira",
        email: "pedro.oliveira@example.com",
        whatsapp: "5511777777777",
        status: "novo",
        categoria: "Cliente Regular",
        origem: "Redes Sociais",
        descricao: "",
        valor: "",
        horario_integracao: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(exampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    XLSX.writeFile(workbook, "exemplo_importacao_leads.xlsx");
    toast.success("Planilha de exemplo baixada com sucesso!");
  };

  const getFieldErrors = () => {
    const fieldErrors: Record<string, { count: number; examples: ValidationError[] }> = {};

    errors.forEach((error) => {
      if (!fieldErrors[error.field]) {
        fieldErrors[error.field] = { count: 0, examples: [] };
      }
      fieldErrors[error.field].count++;
      if (fieldErrors[error.field].examples.length < 3) {
        fieldErrors[error.field].examples.push(error);
      }
    });

    return fieldErrors;
  };

  const getExpectedFormat = (field: string): string => {
    const formats: Record<string, string> = {
      nome: "Texto (obrigatório)",
      email: "Email válido (ex: usuario@dominio.com)",
      whatsapp: "Número com 10-13 dígitos (ex: 5511999999999)",
      status: "novo, conversa_iniciada, proposta_enviada, link_pagamento_enviado, pago, perdido",
      categoria: "Texto (opcional)",
      origem: "Texto (opcional)",
      descricao: "Texto (opcional)",
      valor: "Número positivo (ex: 1000.00)",
      horario_integracao: "Horário no formato HH:MM (ex: 09:00)",
    };

    return formats[field] || "Verifique o formato do campo";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Upload className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Importar Leads</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                Selecione um arquivo CSV ou XLSX com os dados dos leads. O arquivo deve conter pelo menos a coluna "nome".
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExample}
              className="gap-2 flex-shrink-0 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Baixar Exemplo</span>
              <span className="sm:hidden">Exemplo</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1 sm:mr-0">
          {isLocal ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="ai-conversion" className="font-semibold cursor-pointer text-sm">
                    Usar IA para Conversão Automática
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    A IA mapeará automaticamente os campos da sua planilha para o formato esperado. Requer VITE_OPENAI_API_KEY no .env.local
                  </p>
                </div>
              </div>
              <Switch
                id="ai-conversion"
                checked={useAI}
                onCheckedChange={setUseAI}
                disabled={parsing || !!file}
                className="flex-shrink-0"
              />
            </div>
          ) : (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <span className="text-xs">
                  💡 <strong>Dica:</strong> A conversão automática com IA está disponível apenas em ambiente local. 
                  Configure VITE_OPENAI_API_KEY no arquivo .env.local para usar esta funcionalidade.
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground flex-shrink-0" />
              <div className="text-center w-full min-w-0">
                <p className="text-sm font-medium truncate px-2">
                  {file ? file.name : "Nenhum arquivo selecionado"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos suportados: CSV, XLSX
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {file ? "Trocar Arquivo" : "Selecionar Arquivo"}
              </Button>
            </div>
          </div>

          {aiMapping.length > 0 && (
            <Alert>
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <AlertDescription className="min-w-0">
                <div className="font-semibold mb-2 text-sm">Mapeamento gerado pela IA:</div>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  {aiMapping.map((map, index) => (
                    <div key={index} className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-none">{map.sourceField}</span>
                      <span className="text-muted-foreground flex-shrink-0">→</span>
                      <span className="font-medium flex-shrink-0">{map.targetField}</span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {Math.round(map.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {parsing && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>Processando arquivo...</AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <AlertDescription className="min-w-0">
                <div className="font-semibold mb-3 text-sm">
                  {errors.length} erro(s) de validação encontrado(s) em {new Set(errors.map(e => e.row)).size} linha(s):
                </div>
                <ScrollArea className="h-48 sm:h-64">
                  <div className="space-y-3 pr-4">
                    {Object.entries(getFieldErrors()).map(([field, fieldError]) => (
                      <div key={field} className="border-l-2 border-destructive pl-3 py-2 bg-destructive/5 rounded-r">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            {fieldError.count} erro(s)
                          </Badge>
                          <span className="font-semibold text-xs sm:text-sm">Campo: "{field}"</span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 break-words">
                          <strong>Formato esperado:</strong> {getExpectedFormat(field)}
                        </div>
                        <div className="space-y-1">
                          {fieldError.examples.map((error, index) => (
                            <div key={index} className="text-xs sm:text-sm break-words">
                              <span className="font-medium">Linha {error.row}:</span> {error.message}
                            </div>
                          ))}
                          {fieldError.count > fieldError.examples.length && (
                            <div className="text-xs text-muted-foreground italic">
                              ... e mais {fieldError.count - fieldError.examples.length} erro(s) neste campo
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {leads.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Preview - {leads.length} lead(s) válido(s)
                </h3>
                <span className="text-xs text-muted-foreground">
                  Mostrando até 10 primeiros registros
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="h-48 sm:h-64 w-full">
                  <div className="w-full">
                    <Table className="table-fixed w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">Nome</TableHead>
                          <TableHead className="hidden sm:table-cell w-[25%]">Email</TableHead>
                          <TableHead className="w-[20%]">WhatsApp</TableHead>
                          <TableHead className="hidden md:table-cell w-[15%]">Status</TableHead>
                          <TableHead className="hidden lg:table-cell w-[10%]">Categoria</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.slice(0, 10).map((lead, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium w-[30%] overflow-hidden">
                              <div className="truncate" title={lead.name}>
                                {lead.name}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell w-[25%] overflow-hidden">
                              <div className="truncate" title={lead.contact_email || undefined}>
                                {lead.contact_email || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="w-[20%] overflow-hidden">
                              <div className="truncate" title={lead.contact_whatsapp || undefined}>
                                {lead.contact_whatsapp || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell w-[15%] overflow-hidden">
                              <div className="truncate" title={lead.status}>
                                {lead.status}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell w-[10%] overflow-hidden">
                              <div className="truncate" title={lead.category || undefined}>
                                {lead.category || "-"}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {importResult && (
            <Alert variant={importResult.includes("sucesso") ? "default" : "destructive"}>
              {importResult.includes("sucesso") ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <AlertDescription>{importResult}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || leads.length === 0 || !file}
            className="w-full sm:w-auto"
          >
            {loading ? (
              "Importando..."
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Importar {leads.length} Lead(s)</span>
                <span className="sm:hidden">Importar ({leads.length})</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

