# Tool: artemis_vector_store

## Identificador
`artemis_vector_store`

## Descrição
Buscar informações específicas da empresa em contexto. Esta é a tool principal para buscar informações específicas da empresa.

## Quando Usar

Sempre que precisar de dados específicos sobre produtos, serviços, políticas, procedimentos ou qualquer informação contextual da organização que não esteja no contexto atual.

## Como Usar

1. Identifique quando você precisa de informações específicas da empresa que não estão no contexto atual
2. Formule uma query de busca clara e específica
3. Chame a tool ArtemisVectorStore com o identifier `artemis_vector_store`
4. A tool retornará informações relevantes da base de conhecimento da empresa
5. Use essas informações para enriquecer sua resposta

## Exemplos de Quando Usar

- Informações sobre produtos ou serviços específicos
- Políticas de atendimento, devolução ou garantia
- Procedimentos internos
- Informações sobre preços e condições
- Histórico de interações ou casos similares
- Qualquer informação que não esteja clara no contexto atual

## Formato de Chamada

```
[TOOL:artemis_vector_store]
[QUERY:"buscar informações sobre política de devolução"]
```

