# Configuração do Outlook Calendar

Este guia explica como configurar a conexão OAuth com o Outlook Calendar para o componente de agendamento de reuniões.

## 📋 Pré-requisitos

- Conta Microsoft (Outlook, Office 365, ou Microsoft 365)
- Acesso ao Azure Portal
- Acesso ao Supabase Dashboard

## 🔧 Passo 1: Registrar Aplicativo no Microsoft Entra ID (Azure AD)

### ⚠️ Nota sobre Nomenclatura
O Azure Active Directory agora é chamado de **Microsoft Entra ID**, mas você ainda pode encontrá-lo como "Azure Active Directory" no portal.

### Registrar o Aplicativo

1. **Acesse o Azure Portal**
   - Vá para: https://portal.azure.com/
   - Faça login com sua conta Microsoft

2. **Navegar até Microsoft Entra ID**
   - No menu lateral, procure por **"Microsoft Entra ID"** ou **"Azure Active Directory"**
   - Clique na opção encontrada
   - **Alternativa**: Use a busca no topo do portal e digite "Microsoft Entra ID" ou "Azure AD"

3. **Acessar Registros de Aplicativos**
   - No menu lateral esquerdo, procure por:
     - **"Registros de aplicativos"** (português) ou
     - **"App registrations"** (inglês)
   - Clique na opção

4. **Criar Novo Registro**
   - Clique no botão **"+ Novo registro"** ou **"+ New registration"** (canto superior esquerdo)

5. **Preencher Formulário de Registro**
   
   **Nome** (Name):
   - Digite um nome para seu aplicativo (ex: "Artemis Nebula Calendar")
   
   **Tipos de conta com suporte** (Supported account types):
   - Selecione uma das opções:
     - ✅ **"Contas em qualquer diretório organizacional e contas pessoais da Microsoft"** (recomendado)
     - Ou: "Accounts in any organizational directory and personal Microsoft accounts"
     - Isso permite que qualquer conta Microsoft use o aplicativo
   
   **URI de redirecionamento** (Redirect URI):
   - **Plataforma**: Selecione **"Web"** na lista suspensa
   - **URI**: Digite a URL completa do seu frontend + `/oauth/callback`
     - **Desenvolvimento**: `http://localhost:8080/oauth/callback`
     - **Produção**: `https://seu-dominio.com/oauth/callback`
     - ⚠️ **IMPORTANTE**: A URL deve ser exata, incluindo http/https e porta
   
   **Exemplo de URI de redirecionamento**:
   ```
   http://localhost:8080/oauth/callback
   ```
   ou
   ```
   https://artemis-nebula.vercel.app/oauth/callback
   ```

6. **Registrar**
   - Clique no botão **"Registrar"** ou **"Register"** (canto inferior direito)
   - Aguarde alguns segundos para o registro ser criado

7. **Anotar Informações Importantes**
   - Após o registro, você será redirecionado para a página de visão geral do aplicativo
   - **Application (client) ID**: Copie este valor (você precisará dele)
     - Este é o `OUTLOOK_CALENDAR_CLIENT_ID`
   - **Directory (tenant) ID**: Pode ser útil, mas não é obrigatório para este caso

## 🔑 Passo 2: Criar Client Secret

1. **Acessar Certificados e Segredos**
   - No menu lateral esquerdo da página do aplicativo, procure por:
     - **"Certificados e segredos"** (português) ou
     - **"Certificates & secrets"** (inglês)
   - Clique na opção

2. **Criar Novo Segredo do Cliente**
   - Na seção **"Segredos do cliente"** ou **"Client secrets"**, clique em:
     - **"+ Novo segredo do cliente"** ou
     - **"+ New client secret"**

3. **Configurar o Segredo**
   - **Descrição** (Description): 
     - Digite uma descrição (ex: "Calendar OAuth Secret" ou "Segredo OAuth Calendário")
   - **Expira em** (Expires):
     - Selecione a validade (recomendado: **24 meses** ou **Never** se disponível)
     - ⚠️ Anote a data de expiração para renovar antes de expirar
   
4. **Adicionar**
   - Clique no botão **"Adicionar"** ou **"Add"**

5. **Copiar o Valor do Secret**
   - ⚠️ **CRÍTICO**: Copie o **Valor** (Value) do secret imediatamente
   - O valor só é exibido uma vez
   - Você não poderá vê-lo novamente depois de fechar a página
   - Este é o `OUTLOOK_CALENDAR_CLIENT_SECRET`
   - **Dica**: Cole em um editor de texto temporário antes de fechar a página

## 🔐 Passo 3: Configurar Permissões (API Permissions)

1. **Acessar Permissões de API**
   - No menu lateral esquerdo, procure por:
     - **"Permissões de API"** (português) ou
     - **"API permissions"** (inglês)
   - Clique na opção

2. **Adicionar Permissão**
   - Clique no botão **"+ Adicionar uma permissão"** ou **"+ Add a permission"**

3. **Selecionar Microsoft Graph**
   - Na tela que aparece, você verá duas opções:
     - **"APIs da Microsoft"** ou **"Microsoft APIs"**
     - **"APIs que minha organização usa"** ou **"APIs my organization uses"**
   - Clique em **"APIs da Microsoft"** ou **"Microsoft APIs"**
   - Procure e clique em **"Microsoft Graph"**

4. **Selecionar Tipo de Permissão**
   - Você verá duas opções:
     - **"Permissões delegadas"** (Delegated permissions) - ✅ **Selecione esta**
     - **"Permissões de aplicativo"** (Application permissions)
   - Clique em **"Permissões delegadas"**

5. **Adicionar Permissões Necessárias**
   
   Procure e marque as seguintes permissões:
   
   - ✅ **`Calendars.ReadWrite`**
     - Descrição: "Ler e gravar calendários do usuário"
     - Necessário para criar e ler eventos no calendário
   
   - ✅ **`User.Read`**
     - Descrição: "Entrar e ler o perfil do usuário"
     - Necessário para obter informações básicas do usuário
   
   **Como adicionar**:
   - Use a barra de pesquisa para encontrar as permissões
   - Marque a caixa de seleção ao lado de cada permissão
   - Após marcar todas, clique em **"Adicionar permissões"** ou **"Add permissions"**

6. **Conceder Consentimento do Administrador**
   - Após adicionar as permissões, você verá uma tabela com as permissões
   - Se você for administrador, clique no botão:
     - **"Conceder consentimento do administrador para [nome da organização]"** ou
     - **"Grant admin consent for [organization name]"**
   - Confirme a ação quando solicitado
   - ✅ Isso evita que cada usuário precise autorizar individualmente
   - ⚠️ Se não for administrador, você precisará solicitar ao administrador

## 🌐 Passo 4: Configurar Redirect URIs Adicionais (Opcional mas Recomendado)

1. **Acessar Autenticação**
   - No menu lateral esquerdo, procure por:
     - **"Autenticação"** (português) ou
     - **"Authentication"** (inglês)
   - Clique na opção

2. **Adicionar Redirect URIs Adicionais**
   
   Na seção **"URIs de redirecionamento"** ou **"Redirect URIs"**, você pode adicionar múltiplas URLs:
   
   - **Desenvolvimento**: `http://localhost:8080/oauth/callback`
   - **Produção**: `https://seu-dominio.com/oauth/callback`
   - **Staging/Teste**: `https://seu-dominio-staging.com/oauth/callback` (se aplicável)
   
   **Como adicionar**:
   - Clique em **"+ Adicionar URI"** ou **"+ Add URI"**
   - Digite a URL completa
   - Repita para cada ambiente que você usa

3. **Configurações Avançadas (Opcional)**
   
   Na seção **"Concessões implícitas e fluxos híbridos"** ou **"Implicit grant and hybrid flows"**:
   
   - ✅ Marque **"Tokens de acesso"** (Access tokens)
   - ✅ Marque **"Tokens de ID"** (ID tokens)
   
   ⚠️ **Nota**: Essas opções podem não estar visíveis dependendo da versão do portal. Se não aparecerem, não se preocupe - o fluxo OAuth funcionará mesmo assim.

4. **Salvar**
   - Clique em **"Salvar"** ou **"Save"** no topo da página

## 🔧 Passo 5: Configurar Secrets no Supabase

### Via Dashboard (Recomendado):

1. **Acesse o Supabase Dashboard**
   - Vá para: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/functions

2. **Adicionar Secrets**
   - Clique na aba **"Secrets"** ou **"Secrets"**
   - Clique no botão **"Add new secret"** ou **"Adicionar novo secret"**

3. **Adicionar os Secrets**
   
   Adicione os seguintes secrets (um de cada vez):
   
   **Secret 1**:
   - **Name**: `OUTLOOK_CALENDAR_CLIENT_ID`
   - **Value**: Cole o Application (client) ID que você copiou no Passo 1
   - Clique em **"Add secret"**
   
   **Secret 2**:
   - **Name**: `OUTLOOK_CALENDAR_CLIENT_SECRET`
   - **Value**: Cole o valor do secret que você copiou no Passo 2
   - Clique em **"Add secret"**

   **Alternativa - Usar Mesmas Credenciais do Outlook (Email)**:
   
   Se você já configurou o Outlook para envio de emails, pode usar as mesmas credenciais:
   - **Name**: `OUTLOOK_CLIENT_ID` (ao invés de `OUTLOOK_CALENDAR_CLIENT_ID`)
   - **Name**: `OUTLOOK_CLIENT_SECRET` (ao invés de `OUTLOOK_CALENDAR_CLIENT_SECRET`)
   
   ⚠️ Certifique-se de que as permissões incluem `Calendars.ReadWrite` no Azure AD.

### Via CLI:

```bash
# Configurar Client ID
supabase secrets set OUTLOOK_CALENDAR_CLIENT_ID=seu-application-client-id

# Configurar Client Secret
supabase secrets set OUTLOOK_CALENDAR_CLIENT_SECRET=seu-client-secret-value
```

**Ou se quiser usar as mesmas credenciais do Outlook (email):**

```bash
supabase secrets set OUTLOOK_CLIENT_ID=seu-application-client-id
supabase secrets set OUTLOOK_CLIENT_SECRET=seu-client-secret-value
```

## ✅ Passo 6: Verificar Configuração

1. **Verificar Secrets no Supabase**
   ```bash
   supabase secrets list
   ```
   
   Você deve ver:
   - `OUTLOOK_CALENDAR_CLIENT_ID` (ou `OUTLOOK_CLIENT_ID`)
   - `OUTLOOK_CALENDAR_CLIENT_SECRET` (ou `OUTLOOK_CLIENT_SECRET`)

2. **Testar Conexão**
   - Acesse a página de configuração do componente de agendamento no seu sistema
   - Você deve ver a opção "Outlook Calendar"
   - Clique em **"Conectar com Outlook Calendar"**
   - Você será redirecionado para o Microsoft para autorizar
   - Após autorizar, você será redirecionado de volta para `/oauth/callback`
   - A conexão deve ser estabelecida com sucesso

## 🐛 Troubleshooting

### Erro: "redirect_uri_mismatch"
- **Causa**: A URL de redirecionamento não está registrada no Azure AD
- **Solução**: 
  1. Vá para Azure Portal > Seu App > **Autenticação** (Authentication)
  2. Verifique se a URL exata que aparece no erro está na lista de Redirect URIs
  3. Adicione a URL se não estiver
  4. Certifique-se de que http/https e porta estão corretos
  5. Clique em **Salvar**

### Erro: "invalid_client"
- **Causa**: Client ID ou Client Secret incorretos
- **Solução**: 
  1. Verifique se os secrets estão configurados corretamente no Supabase
  2. Verifique se o Client Secret não expirou (vá em Certificados e segredos)
  3. Se expirou, crie um novo secret e atualize no Supabase

### Erro: "insufficient_privileges" ou "AADSTS65005"
- **Causa**: Permissões não foram concedidas
- **Solução**: 
  1. Vá para Azure Portal > Seu App > **Permissões de API** (API permissions)
  2. Verifique se `Calendars.ReadWrite` e `User.Read` estão adicionadas
  3. Verifique se há um ícone de aviso (⚠️) indicando que o consentimento não foi concedido
  4. Clique em **"Conceder consentimento do administrador"** se for admin
  5. Se não for admin, solicite ao administrador da organização

### Não consegue ver eventos no calendário
- **Causa**: Permissão `Calendars.ReadWrite` não foi concedida ou token expirado
- **Solução**: 
  1. Verifique as permissões no Azure Portal
  2. Re-autorize a conexão após conceder as permissões
  3. Verifique se o token não expirou (pode ser necessário reconectar)

### Portal do Azure com problemas de autenticação
- Consulte o arquivo `TROUBLESHOOTING_AZURE_PORTAL.md` para soluções detalhadas

## 📝 Notas Importantes

1. **Client Secret Expira**: O secret tem validade limitada. Configure um lembrete para renovar antes de expirar.

2. **Redirect URIs**: Certifique-se de adicionar TODAS as URLs que você usa (desenvolvimento, staging, produção).

3. **Permissões**: As permissões `Calendars.ReadWrite` e `User.Read` são necessárias para o funcionamento completo.

4. **Consentimento**: Se você for administrador, conceda consentimento administrativo para evitar que cada usuário precise autorizar individualmente.

5. **Ambiente de Desenvolvimento**: Para desenvolvimento local, use `http://localhost:8080/oauth/callback` como redirect URI.

6. **Nomenclatura**: O Azure AD agora é chamado "Microsoft Entra ID", mas você ainda pode encontrá-lo como "Azure Active Directory" no portal.

## 🔄 Usando as Mesmas Credenciais do Outlook (Email)

Se você já configurou o Outlook para envio de emails, pode usar as mesmas credenciais:

1. Use `OUTLOOK_CLIENT_ID` e `OUTLOOK_CLIENT_SECRET` (sem o sufixo `_CALENDAR`)
2. Certifique-se de que as permissões no Azure AD incluem `Calendars.ReadWrite`
3. A função `oauth-connect` automaticamente usará essas credenciais se `OUTLOOK_CALENDAR_CLIENT_ID` não estiver configurado

## ✅ Checklist Final

Antes de considerar a configuração completa, verifique:

- [ ] Aplicativo registrado no Microsoft Entra ID (Azure AD)
- [ ] Application (client) ID copiado
- [ ] Client Secret criado e valor copiado
- [ ] Permissões `Calendars.ReadWrite` e `User.Read` adicionadas
- [ ] Consentimento administrativo concedido (se aplicável)
- [ ] Redirect URIs configurados (desenvolvimento e produção)
- [ ] Secrets configurados no Supabase
- [ ] Teste de conexão realizado com sucesso
- [ ] Eventos aparecem no calendário do sistema

## 🎉 Pronto!

Após seguir todos os passos, você poderá conectar o Outlook Calendar no componente de agendamento de reuniões. Os eventos do calendário aparecerão na página de Calendário do sistema.

## 📚 Referências

- [Documentação oficial do Microsoft Graph - Calendário](https://learn.microsoft.com/pt-br/graph/api/resources/calendar)
- [Registrar um aplicativo no Microsoft Entra ID](https://learn.microsoft.com/pt-br/azure/active-directory/develop/quickstart-register-app)
- [Permissões do Microsoft Graph](https://learn.microsoft.com/pt-br/graph/permissions-reference)
