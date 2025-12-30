# Tool: media_sender

## Identificador
`media_sender`

## Descrição
Use para enviar imagens ou vídeos durante as conversas quando a situação corresponder às descrições de uso configuradas para cada mídia.

## Quando Usar

- Quando o lead solicitar visualizar produtos, catálogos, materiais promocionais
- Quando a conversa corresponder às descrições de uso configuradas para cada mídia
- Quando for apropriado enviar material visual para enriquecer a comunicação
- Quando identificar que uma situação específica corresponde à descrição de uso (`usageDescription`) de uma mídia configurada

## Parâmetros Obrigatórios

- **`mediaUrl`** (string): URL pública da mídia a ser enviada. Este valor deve ser obtido do campo `url` da mídia em `component_configurations` para o componente `media_sender`
- **`mediaType`** (string): Tipo da mídia - "image" para imagens ou "video" para vídeos. Este valor deve ser obtido do campo `type` da mídia em `component_configurations`

## Parâmetros Opcionais

Nenhum parâmetro opcional.

## Formato de Chamada

```
[TOOL:media_sender]
[PARAMS:{
  "mediaUrl": "https://exemplo.com/storage/media-sender/organization-id/timestamp.jpg",
  "mediaType": "image"
}]
```

Ou para vídeo:

```
[TOOL:media_sender]
[PARAMS:{
  "mediaUrl": "https://exemplo.com/storage/media-sender/organization-id/timestamp.mp4",
  "mediaType": "video"
}]
```

## Comportamento

- A tool recebe a URL da mídia e o tipo (imagem ou vídeo)
- Envia a mídia via WhatsApp automaticamente
- As mídias são globais e disponíveis para todos os agentes com o componente `media_sender` ativo
- A tool processa o envio e retorna confirmação

## Acesso às Mídias Configuradas

As mídias disponíveis para envio estão configuradas globalmente em `component_configurations` para o componente com identifier `media_sender`. Cada mídia possui:

- **`url`**: URL pública da mídia (use este valor no parâmetro `mediaUrl`)
- **`type`**: Tipo da mídia ("image" ou "video" - use este valor no parâmetro `mediaType`)
- **`fileName`**: Nome do arquivo
- **`usageDescription`**: Descrição clara de quando a mídia deve ser utilizada - **use esta descrição para decidir se deve enviar a mídia**

**IMPORTANTE:** Verifique as descrições de uso (`usageDescription`) de cada mídia disponível e use apenas quando a situação da conversa corresponder claramente à descrição configurada.

## Exemplos de Uso

- Enviar catálogo de produtos: Use quando o lead perguntar sobre produtos ou solicitar visualizar catálogo
- Demonstrar funcionalidades: Use quando o lead demonstrar interesse em conhecer funcionalidades de um serviço
- Compartilhar depoimentos: Use quando for apropriado mostrar depoimentos ou casos de sucesso em vídeo
- Enviar materiais de marketing: Use quando o lead solicitar materiais promocionais ou informativos
- Ilustrar soluções: Use quando precisar mostrar visualmente uma solução para um problema comum

## Importante

- **OBRIGATÓRIO:** Se o componente `media_sender` estiver ativo e você identificar necessidade de enviar mídia, você DEVE usar esta tool. Não envie a mídia diretamente - sempre use a tool para garantir o processamento correto
- Sempre verifique se a situação da conversa corresponde à descrição de uso (`usageDescription`) antes de enviar
- Use mídias de forma contextual e relevante - não envie mídias desnecessárias
- Se múltiplas mídias forem apropriadas, escolha a mais relevante para o contexto atual
- As mídias são globais e compartilhadas entre todos os agentes com o componente ativo
- Verifique as configurações em `component_configurations` para ver quais mídias estão disponíveis e suas descrições de uso

