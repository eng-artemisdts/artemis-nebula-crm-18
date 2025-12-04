import { useState, useRef } from "react";
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
import { Upload, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
import { LeadImportService } from "@/services/LeadImportService";
import { ValidatedLead } from "@/services/validators/LeadDataValidator";
import { ValidationError } from "@/services/validators/LeadDataValidator";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setParsing(true);

    try {
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Leads
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo CSV ou XLSX com os dados dos leads. O arquivo deve conter pelo menos a coluna "nome".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
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
              >
                <Upload className="w-4 h-4 mr-2" />
                {file ? "Trocar Arquivo" : "Selecionar Arquivo"}
              </Button>
            </div>
          </div>

          {parsing && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>Processando arquivo...</AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">
                  {errors.length} erro(s) de validação encontrado(s):
                </div>
                <ScrollArea className="h-32">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {errors.slice(0, 10).map((error, index) => (
                      <li key={index}>
                        Linha {error.row}, campo "{error.field}": {error.message}
                      </li>
                    ))}
                    {errors.length > 10 && (
                      <li className="text-muted-foreground">
                        ... e mais {errors.length - 10} erro(s)
                      </li>
                    )}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {leads.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Preview - {leads.length} lead(s) válido(s)
                </h3>
                <span className="text-xs text-muted-foreground">
                  Mostrando até 10 primeiros registros
                </span>
              </div>
              <ScrollArea className="h-64 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.slice(0, 10).map((lead, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.contact_email || "-"}</TableCell>
                        <TableCell>{lead.contact_whatsapp || "-"}</TableCell>
                        <TableCell>{lead.status}</TableCell>
                        <TableCell>{lead.category || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || leads.length === 0 || !file}
          >
            {loading ? (
              "Importando..."
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar {leads.length} Lead(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

