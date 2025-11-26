# Guia de Troubleshooting - Erro de Credenciais

## Erro: "invalid_credentials" ou "Invalid login credentials"

Este erro pode ocorrer por várias razões. Siga os passos abaixo para resolver:

### 1. Verificar Credenciais do Supabase no .env

Certifique-se de que o arquivo `.env` contém as credenciais corretas do seu projeto Supabase:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-key
```

**Como obter as credenciais:**
1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/api
2. Copie a **URL do projeto** (Project URL)
3. Copie a **chave anon/public** (anon key)

### 2. Verificar se as Migrations foram Aplicadas

As migrations devem ser aplicadas antes de usar o sistema. Se ainda não aplicou:

**Opção A - Via SQL Editor (Recomendado):**
1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
2. Abra o arquivo `all-migrations.sql` do projeto
3. Cole todo o conteúdo no SQL Editor
4. Execute o SQL

**Opção B - Via CLI:**
```bash
supabase login
supabase link --project-ref lyqcsclmauwmzipjiazs
supabase db push
```

### 3. Criar Primeiro Usuário

Se as migrations foram aplicadas mas você ainda não tem um usuário:

**Opção A - Via Interface Web:**
1. Acesse a página de login: http://localhost:8080/login
2. Clique em "Criar conta"
3. Preencha os dados:
   - Email
   - Senha (mínimo 6 caracteres)
   - Nome da empresa
   - Telefone (opcional)
   - Selecione o plano (Free ou Pro)
4. Clique em "Criar conta"

**Opção B - Via SQL (Criar usuário admin):**
1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
2. Execute o seguinte SQL:

```sql
-- Criar usuário admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@exemplo.com',  -- Altere para seu email
  crypt('senha123', gen_salt('bf')),  -- Altere para sua senha
  now(),
  '{"company_name": "Minha Empresa", "selected_plan": "free"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- O trigger handle_new_user criará automaticamente a organização e o perfil
```

**Importante:** Após criar o usuário via SQL, você precisará fazer login pela primeira vez usando a interface web para que o trigger `handle_new_user` seja executado.

### 4. Verificar Configuração de Email do Supabase

Se você está tentando criar uma conta nova:

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/auth
2. Verifique se o **Email Auth** está habilitado
3. Se estiver em desenvolvimento, você pode desabilitar a confirmação de email:
   - Vá em **Auth > Email Templates**
   - Ou configure um SMTP para receber emails de confirmação

### 5. Verificar Console do Navegador

Abra o console do navegador (F12) e verifique:
- Se há erros de conexão com o Supabase
- Se as variáveis de ambiente estão sendo carregadas
- Se há erros de CORS

### 6. Limpar Cache e Tentar Novamente

```bash
# Limpar localStorage do navegador
# No console do navegador, execute:
localStorage.clear()

# Ou limpar apenas dados do Supabase:
localStorage.removeItem('sb-<project-id>-auth-token')
```

### 7. Verificar se o Servidor está Rodando

Certifique-se de que o servidor de desenvolvimento está rodando:

```bash
npm run dev
```

O servidor deve estar acessível em: http://localhost:8080

### 8. Testar Conexão com Supabase

No console do navegador, execute:

```javascript
// Verificar se as variáveis estão carregadas
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...');

// Testar conexão
const { data, error } = await supabase.from('organizations').select('count');
console.log('Conexão:', error ? 'Erro: ' + error.message : 'OK');
```

## Solução Rápida

Se você acabou de configurar o projeto:

1. ✅ Verifique se o `.env` tem as credenciais corretas
2. ✅ Aplique as migrations (via SQL Editor ou CLI)
3. ✅ Crie uma conta via interface web (http://localhost:8080/login)
4. ✅ Faça login com as credenciais criadas

## Ainda com Problemas?

Se após seguir todos os passos o problema persistir:

1. Verifique os logs do Supabase: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/logs
2. Verifique se o projeto Supabase está ativo
3. Verifique se há limites de uso atingidos no plano do Supabase

