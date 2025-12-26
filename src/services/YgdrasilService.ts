export interface IYgdrasilRAGRequest {
  fileName: string;
  fileExtension: string;
  mimeType: string;
  fileSize: number;
  fileContent: ArrayBuffer | Blob;
  indexName: string;
  companyName: string;
  embeddingModel?: string;
  vectorDimension?: number;
}

export interface IYgdrasilRAGResponse {
  success: boolean;
  message?: string;
  documentId?: string;
}

export interface IYgdrasilService {
  uploadDocumentForRAG(request: IYgdrasilRAGRequest): Promise<IYgdrasilRAGResponse>;
}

class YgdrasilService implements IYgdrasilService {
  private readonly endpointUrl: string;
  private readonly authToken: string;

  constructor() {
    const url = import.meta.env.VITE_YGDRASIL_API_URL || 'https://yggdrasil.artemisdigital.tech/webhook/a8dc1f44-cbb3-4704-8b1a-6e286bc214a0';
    const token = import.meta.env.VITE_YGDRASIL_AUTH_TOKEN || '6fa4687c02611c991c2d481b21682809cfd7a613daed1e0ee5f14bfacc1f4a19';
    
    this.endpointUrl = url;
    this.authToken = token;
  }

  async uploadDocumentForRAG(request: IYgdrasilRAGRequest): Promise<IYgdrasilRAGResponse> {
    const formData = new FormData();
    
    const fileBlob = request.fileContent instanceof Blob 
      ? request.fileContent 
      : new Blob([request.fileContent], { type: request.mimeType });
    
    const fullFileName = `${request.fileName}.${request.fileExtension}`;
    formData.append('file', fileBlob, fullFileName);
    formData.append('fileName', request.fileName);
    formData.append('fileExtension', request.fileExtension);
    formData.append('mimeType', request.mimeType);
    formData.append('fileSize', request.fileSize.toString());
    formData.append('indexName', request.indexName);
    formData.append('companyName', request.companyName);
    
    if (request.embeddingModel) {
      formData.append('embeddingModel', request.embeddingModel);
    }
    
    if (request.vectorDimension !== undefined) {
      formData.append('vectorDimension', request.vectorDimension.toString());
    }

    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: {
        'Authentication': this.authToken,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || `Erro HTTP: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message || 'Documento enviado com sucesso',
      documentId: data.documentId,
    };
  }
}

export const ygdrasilService = new YgdrasilService();

