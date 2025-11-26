#!/bin/bash

# Script para consolidar todas as migrations em um único arquivo SQL
# Útil para aplicação manual via SQL Editor do Supabase

OUTPUT_FILE="all-migrations.sql"
MIGRATIONS_DIR="supabase/migrations"

echo "📦 Consolidando todas as migrations..."
echo ""

# Limpa o arquivo de saída se existir
> "$OUTPUT_FILE"

# Adiciona cabeçalho
cat >> "$OUTPUT_FILE" << 'EOF'
-- ============================================
-- Migrations Consolidadas
-- ============================================
-- Este arquivo contém todas as migrations do projeto
-- Aplique este arquivo no SQL Editor do Supabase Dashboard
-- https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
-- ============================================
-- IMPORTANTE: Execute este arquivo apenas se o banco estiver vazio
-- ou se você tiver certeza de que as migrations ainda não foram aplicadas
-- ============================================

EOF

# Processa cada migration em ordem cronológica
for migration in $(ls -1 "$MIGRATIONS_DIR"/*.sql | sort); do
    filename=$(basename "$migration")
    echo "-- Migration: $filename" >> "$OUTPUT_FILE"
    echo "-- ============================================" >> "$OUTPUT_FILE"
    cat "$migration" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "-- ============================================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "✅ Processado: $filename"
done

echo ""
echo "✅ Todas as migrations foram consolidadas em: $OUTPUT_FILE"
echo ""
echo "📝 Próximos passos:"
echo "   1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql"
echo "   2. Cole o conteúdo do arquivo $OUTPUT_FILE"
echo "   3. Execute o SQL"

