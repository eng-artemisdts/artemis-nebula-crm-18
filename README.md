<div align="center">
  <img src="./src/assets/logo.png" alt="Artemis Nebula" width="400" />
  
  <h1>Artemis Nebula CRM</h1>
  
  <p>
    <strong>CRM do Futuro para Seu Negócio</strong><br/>
    Gerencie leads, automatize processos e impulsione suas vendas com inteligência e simplicidade.
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-5.4.19-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Supabase-2.84.0-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Tailwind%20CSS-3.4.17-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  </p>

  <p>
    <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
    <img src="https://img.shields.io/badge/Status-Active-success" alt="Status" />
    <img src="https://img.shields.io/badge/Version-0.0.0-blue" alt="Version" />
  </p>
</div>

---

## 📋 Sobre o Projeto

O **Artemis Nebula CRM** é uma plataforma moderna e completa de gestão de relacionamento com clientes (CRM) desenvolvida com as mais recentes tecnologias web. O sistema oferece uma solução integrada para gerenciamento de leads, automação de processos de vendas, integração com WhatsApp e inteligência artificial para otimizar conversões.

### 🎯 Objetivo

Fornecer uma plataforma CRM intuitiva, escalável e poderosa que permite aos usuários:
- Gerenciar leads de forma eficiente com visualização Kanban
- Automatizar interações via WhatsApp usando Evolution API
- Utilizar IA para personalizar conversas e aumentar conversões
- Agendar mensagens e interações automaticamente
- Categorizar e segmentar leads inteligentemente
- Acompanhar métricas e estatísticas em tempo real

---

## ✨ Funcionalidades Principais

### 📊 Gestão de Leads
- **Visualização Kanban**: Interface drag-and-drop para gerenciar leads por status
- **Importação em Lote**: Importe leads via CSV ou Excel
- **Busca Avançada**: Sistema de busca inteligente com filtros múltiplos
- **Categorização**: Organize leads por categorias personalizadas
- **Histórico Completo**: Acompanhe todas as interações e mudanças de status

### 🤖 Inteligência Artificial
- **Interações Automatizadas**: Configure a IA para interagir com leads automaticamente
- **Personalização de Conversas**: Defina tom de voz, objetivos e estratégias
- **Sugestão de Categorias**: IA sugere categorias baseadas nas características do lead
- **Configuração Flexível**: Ajuste comportamento da IA conforme suas necessidades

### 💬 Integração WhatsApp
- **Evolution API**: Integração completa com Evolution API para envio de mensagens
- **Agendamento de Mensagens**: Programe mensagens para envio futuro
- **Agendamento de Interações**: Configure interações automáticas com IA
- **Status de Conexão**: Monitore o status da conexão WhatsApp em tempo real

### 📈 Dashboard e Analytics
- **Estatísticas em Tempo Real**: Visualize métricas importantes do seu negócio
- **Gráficos Interativos**: Acompanhe evolução de leads e conversões
- **Cards de Status**: Visualização rápida de leads por status
- **Filtros Dinâmicos**: Filtre e analise dados de forma intuitiva

### 🔧 Configurações e Integrações
- **Configuração de Mensagens**: Personalize templates de mensagens
- **Integração Stripe**: Geração automática de links de pagamento
- **Google Drive**: Upload automático de documentos
- **Google Places**: Busca de negócios próximos
- **Multi-organização**: Suporte para múltiplas organizações

---

## 🏗️ Arquitetura

O projeto segue os princípios de **Domain-Driven Design (DDD)** e **SOLID**, organizando o código em camadas bem definidas:

### Estrutura de Camadas

```
┌─────────────────────────────────────┐
│     Presentation Layer (React)      │
│  - Componentes UI (shadcn/ui)      │
│  - Páginas e Rotas                  │
│  - Hooks e Contextos                │
└─────────────────────────────────────┘
           ↕
┌─────────────────────────────────────┐
│     Application Layer                │
│  - Serviços de Aplicação            │
│  - Casos de Uso                     │
│  - Validações e Parsers             │
└─────────────────────────────────────┘
           ↕
┌─────────────────────────────────────┐
│     Domain Layer                     │
│  - Entidades de Negócio             │
│  - Value Objects                    │
│  - Regras de Domínio                │
└─────────────────────────────────────┘
           ↕
┌─────────────────────────────────────┐
│     Infrastructure Layer             │
│  - Supabase Client                  │
│  - Edge Functions                   │
│  - Integrações Externas             │
└─────────────────────────────────────┘
```

### Padrões de Design

- **SOLID Principles**: Aplicados em toda a arquitetura
- **Repository Pattern**: Para acesso a dados
- **Service Layer**: Para lógica de negócio
- **Dependency Injection**: Para desacoplamento
- **Observer Pattern**: Para reatividade (React Query)

---

## 🛠️ Stack Tecnológica

### Frontend
- **React 18.3.1**: Biblioteca para construção de interfaces
- **TypeScript 5.8.3**: Tipagem estática para maior segurança
- **Vite 5.4.19**: Build tool moderna e rápida
- **React Router 6.30.1**: Roteamento client-side
- **TanStack Query 5.83.0**: Gerenciamento de estado servidor
- **React Hook Form 7.61.1**: Gerenciamento de formulários
- **Zod 3.25.76**: Validação de schemas

### UI/UX
- **shadcn/ui**: Componentes UI baseados em Radix UI
- **Tailwind CSS 3.4.17**: Framework CSS utility-first
- **Radix UI**: Componentes acessíveis e sem estilo
- **Lucide React**: Biblioteca de ícones
- **next-themes**: Gerenciamento de temas (dark/light)
- **Sonner**: Sistema de notificações toast

### Backend & Database
- **Supabase**: Backend-as-a-Service
  - PostgreSQL: Banco de dados relacional
  - Edge Functions: Funções serverless
  - Auth: Autenticação e autorização
  - Storage: Armazenamento de arquivos
  - Realtime: Atualizações em tempo real

### Integrações
- **Evolution API**: Integração WhatsApp
- **Stripe**: Processamento de pagamentos
- **Google Drive API**: Upload de documentos
- **Google Places API**: Busca de negócios

### Ferramentas de Desenvolvimento
- **ESLint**: Linter para qualidade de código
- **TypeScript ESLint**: Regras específicas para TypeScript
- **PostCSS**: Processamento de CSS
- **Autoprefixer**: Compatibilidade de CSS

### Deploy & DevOps
- **Vercel**: Hospedagem frontend e cron jobs
- **Supabase Cloud**: Hospedagem backend e banco de dados

---

## 📁 Estrutura do Projeto

```
artemis-nebula-crm-18/
├── src/
│   ├── components/          # Componentes React reutilizáveis
│   │   ├── ui/             # Componentes shadcn/ui
│   │   └── ...             # Componentes customizados
│   ├── pages/              # Páginas da aplicação
│   ├── hooks/              # Custom hooks
│   ├── services/           # Serviços de aplicação
│   │   ├── parsers/        # Parsers de arquivos
│   │   └── validators/     # Validadores
│   ├── integrations/       # Integrações externas
│   │   └── supabase/       # Cliente Supabase
│   └── lib/                # Utilitários
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── evolution-*    # Funções Evolution API
│   │   ├── handle-stripe-webhook/
│   │   ├── process-scheduled-messages/
│   │   └── ...
│   └── migrations/         # Migrações do banco
├── api/
│   └── cron/               # Cron jobs (Vercel)
├── public/                 # Arquivos estáticos
└── dist/                   # Build de produção
```

---

## 🚀 Como Executar

### Pré-requisitos

- **Node.js** 22+ 
- **Yarn** (gerenciador de pacotes)
- Conta no **Supabase**
- Conta no **Vercel** (para deploy)
- Credenciais das APIs externas (Evolution API, Stripe, Google)

### Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd artemis-nebula-crm-18
```

2. **Instale as dependências**
```bash
yarn install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

4. **Execute as migrações do banco de dados**

```bash
# Aplique todas as migrações
./apply-migrations.sh
```

5. **Inicie o servidor de desenvolvimento**

```bash
yarn dev
```

A aplicação estará disponível em `http://localhost:8080`

### Build para Produção

```bash
yarn build
```

Os arquivos de produção estarão na pasta `dist/`

---

## 🔐 Configuração de Secrets

### Supabase Edge Functions

Configure os secrets necessários para as Edge Functions:

```bash
# Evolution API
supabase secrets set EVOLUTION_API_URL=...
supabase secrets set EVOLUTION_API_KEY=...

# Stripe
supabase secrets set STRIPE_SECRET_KEY=...
supabase secrets set STRIPE_WEBHOOK_SECRET=...

# Google APIs
supabase secrets set GOOGLE_DRIVE_CLIENT_ID=...
supabase secrets set GOOGLE_DRIVE_CLIENT_SECRET=...
supabase secrets set GOOGLE_PLACES_API_KEY=...
```

Consulte os arquivos de documentação na pasta `docs/`:
- `docs/setup/EDGE_FUNCTIONS_SETUP.md`
- `docs/setup/EDGE_FUNCTIONS_SECRETS.md`

---

## 📚 Documentação Adicional

Toda a documentação do projeto está organizada na pasta `docs/`:

### Setup e Configuração (`docs/setup/`)
- `EDGE_FUNCTIONS_SETUP.md`: Configuração das Edge Functions
- `EDGE_FUNCTIONS_SECRETS.md`: Configuração de secrets
- `QUICK_START_EDGE_FUNCTIONS.md`: Guia rápido de Edge Functions
- `SETUP_GOOGLE_PLACES.md`: Configuração do Google Places
- `GOOGLE_OAUTH_SETUP.md`: Configuração do Google OAuth
- `CONFIGURAR_OUTLOOK_CALENDAR.md`: Configuração do Outlook Calendar
- `DEPLOY_OAUTH_FUNCTIONS.md`: Deploy de funções OAuth
- `RESOLVER_ERRO_OAUTH.md`: Resolução de erros OAuth

### Documentação Geral (`docs/`)
- `MIGRATIONS.md`: Documentação das migrações
- `PROMPTS_AI_AGENTE.md`: Documentação dos prompts do agente IA
- `FLUXO_AGENDAMENTO_REUNIOES.md`: Fluxo de agendamento de reuniões
- `AGENDAR_REUNIAO.md`: Guia de agendamento de reuniões
- `DOCUMENTACAO_CLIENTE.md`: Documentação para clientes
- `DOCUMENTACAO_NEBULLA_CLIENTE.md`: Documentação Nebula para clientes

### APIs (`docs/api/`)
- `CURL_EXAMPLE.md`: Exemplos de requisições cURL

---

## 🎨 Design System

O projeto utiliza um design system customizado com tema "cosmic":

- **Cores Principais**: Gradientes cósmicos (cosmic-glow, cosmic-accent)
- **Tema Dark**: Interface otimizada para modo escuro
- **Componentes Acessíveis**: Baseados em Radix UI
- **Animações Suaves**: Transições e animações fluidas

---

## 🔄 Fluxo de Trabalho

### Gestão de Leads

1. **Importação**: Leads são importados via CSV/Excel ou criados manualmente
2. **Categorização**: Sistema sugere categorias ou usuário define manualmente
3. **Visualização Kanban**: Leads organizados por status (Novo → Conversa → Proposta → Pagamento → Pago)
4. **Interação**: WhatsApp ou IA interage com o lead
5. **Acompanhamento**: Dashboard mostra estatísticas e métricas

### Agendamento de Mensagens

1. **Configuração**: Usuário configura mensagem e horário
2. **Armazenamento**: Sistema salva no banco de dados
3. **Processamento**: Cron job (Vercel) processa mensagens agendadas
4. **Envio**: Edge Function envia via Evolution API
5. **Atualização**: Status atualizado no banco

---

## 🧪 Testes

```bash
# Executar linter
yarn lint

# Verificar tipos TypeScript
yarn type-check
```

---

## 📝 Padrões de Código

O projeto segue rigorosamente os princípios:

- **SOLID**: Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
- **DDD**: Domain-Driven Design com camadas bem definidas
- **OOP**: Orientação a Objetos priorizada sobre funções soltas
- **Clean Code**: Código limpo, legível e autoexplicativo
- **Sem Comentários**: Código deve ser autoexplicativo (exceto JSDoc para APIs públicas)

Consulte `.cursorrules` para mais detalhes sobre os padrões.

---

## 🤝 Contribuindo

Este é um projeto proprietário. Para contribuições, entre em contato com a equipe de desenvolvimento.

---

## 📄 Licença

Proprietário - Todos os direitos reservados.

---

## 👥 Equipe

Desenvolvido com ❤️ pela equipe Artemis Nebula

---

<div align="center">
  <p>Feito com React, TypeScript e Supabase</p>
  <p>⭐ Se este projeto foi útil, considere dar uma estrela!</p>
</div>

