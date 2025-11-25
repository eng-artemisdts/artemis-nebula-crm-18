-- Cria bucket para imagens de mensagens promocionais
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true);

-- Políticas RLS para o bucket message-images
CREATE POLICY "Usuários autenticados podem fazer upload de imagens"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-images');

CREATE POLICY "Imagens são publicamente acessíveis"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-images');

CREATE POLICY "Usuários autenticados podem atualizar suas imagens"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'message-images');

CREATE POLICY "Usuários autenticados podem deletar suas imagens"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-images');