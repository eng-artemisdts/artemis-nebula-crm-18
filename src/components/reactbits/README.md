# ReactBits Components

Este diretório contém os componentes da biblioteca [ReactBits](https://reactbits.dev).

## Como adicionar componentes

O ReactBits funciona de forma similar ao shadcn/ui - você copia os componentes diretamente do site para o seu projeto.

### Passos para adicionar um componente:

1. Acesse [reactbits.dev](https://reactbits.dev)
2. Navegue até o componente desejado
3. Copie o código do componente
4. Crie um novo arquivo neste diretório (`src/components/reactbits/`)
5. Cole o código do componente

### Exemplo de uso:

```tsx
import { ComponentName } from "@/components/reactbits/ComponentName";

function MyComponent() {
  return <ComponentName />;
}
```

## Estrutura recomendada

- Componentes individuais: `src/components/reactbits/ComponentName.tsx`
- Componentes relacionados podem ser agrupados em subdiretórios se necessário

## Dependências

Os componentes do ReactBits geralmente dependem de:
- React
- Tailwind CSS (já configurado no projeto)
- Lucide React (já instalado)
- Radix UI (já instalado via shadcn/ui)

Verifique a documentação de cada componente para dependências específicas.

