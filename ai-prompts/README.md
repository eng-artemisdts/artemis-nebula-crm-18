# AI Prompts - Nebula CRM

Esta pasta contém os prompts oficiais utilizados pelo sistema Nebula CRM para configurar e operar os agentes de IA.

## Estrutura

```
ai-prompts/
├── system/           # Prompts de sistema
│   └── system-prompt.md
├── user/             # Prompts de usuário
│   └── user-prompt.md
└── tools/            # Documentação das tools disponíveis
    ├── auto_lead_status_update.md
    ├── meeting_scheduler.md
    ├── email_sender.md
    ├── artemis_vector_store.md
    └── psql_chat_message.md
```

## Uso

### Prompts de Sistema e Usuário

Os prompts em `system/` e `user/` são utilizados diretamente no n8n para configurar o comportamento do agente de IA. Eles contêm variáveis do n8n (ex: `{{ $json.ai_config.name }}`) que são substituídas dinamicamente durante a execução.

### Documentação de Tools

Os arquivos em `tools/` documentam cada tool disponível para o agente. Eles servem como referência para:
- Entender quando e como usar cada tool
- Conhecer os parâmetros obrigatórios e opcionais
- Ver exemplos de uso
- Resolver problemas comuns

## Manutenção

Estes arquivos são documentações oficiais. Qualquer alteração deve ser:
1. Validada contra a implementação atual
2. Testada no ambiente de desenvolvimento
3. Documentada adequadamente
4. Aprovada antes de ser aplicada em produção

## Notas Importantes

- Todos os prompts usam a sintaxe do n8n para variáveis
- As tools devem seguir a estrutura de `payload` quando aplicável
- Sempre use `status_id` (campo `id` do objeto) e nunca `status_key` diretamente
- Mantenha a consistência entre os prompts e a documentação das tools

## Troubleshooting

Se você encontrar o erro "Received tool input did not match expected schema" ao usar a tool `auto_lead_status_update`, consulte:
- `tools/TROUBLESHOOTING_SCHEMA.md` - Guia completo de diagnóstico e resolução
- `tools/auto_lead_status_update.md` - Seção "Validação e Erros Comuns"

