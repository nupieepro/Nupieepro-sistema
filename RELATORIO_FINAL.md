# 📋 RELATÓRIO MESTRE: Finalização Nupieepro V9.0

Este documento consolida **TUDO** o que falta para que o sistema saia do estado de "Protótipo Premium" para "Sistema Industrial 100% Funcional".

---

## 1. Módulos de Gestão Geral

### 🛠️ Caixa de Melhorias
*   **O que falta:** Tela para listar sugestões enviadas e permitir que administradores mudem o status (Pendente -> Em Análise -> Implementada).
*   **SQL Necessário:**
    ```sql
    CREATE TABLE melhorias (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id),
        descricao TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```

### 🎙️ NUPICAST / Produção Científica
*   **O que falta:** Repositório de links de episódios e artigos científicos publicados pelos membros.
*   **SQL Necessário:**
    ```sql
    CREATE TABLE producoes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        titulo TEXT NOT NULL,
        tipo TEXT NOT NULL, -- 'nupicast' ou 'artigo'
        link TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```

---

## 2. Coordenadoria de Marketing

### 🛍️ Kanban da Lojinha
*   **O que falta:** Interface de quadro (To-do, Produção, Entrega) para gerenciar pedidos de camisas/canecas.
*   **SQL Necessário:**
    ```sql
    CREATE TABLE lojinha_pedidos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cliente TEXT NOT NULL,
        item TEXT NOT NULL,
        valor DECIMAL(10,2),
        status TEXT DEFAULT 'afazer',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```

### 🤝 Parcerias Estratégicas
*   **O que falta:** CRM simples para listar empresas parceiras e status do convênio.
*   **SQL Necessário:**
    ```sql
    CREATE TABLE parcerias (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome TEXT NOT NULL,
        status TEXT DEFAULT 'prospeccao',
        contato TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```

---

## 3. Coordenadoria de Projetos

### 🎓 Momento ENEGEP / Treinamentos
*   **O que falta:** Sistema de inscrição simples para eventos internos e externos.
*   **SQL Necessário:**
    ```sql
    -- Usar a tabela 'eventos' já existente, mas adicionar flag:
    -- ALTER TABLE eventos ADD COLUMN categoria TEXT DEFAULT 'geral'; 
    -- categorias: 'enegep', 'treinamento', 'visita'
    ```

---

## 4. Coordenadoria de Operações

### 📊 Relatórios ABJ (Histórico)
*   **O que falta:** Tabela para registrar o histórico de relatórios mensais gerados para que possam ser baixados novamente.
*   **SQL Necessário:**
    ```sql
    CREATE TABLE relatorios_historico (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        mes_referencia TEXT,
        url_pdf TEXT,
        gerado_por UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```

### 🗂️ Arquivo Digital (POPs e Atas)
*   **O que falta:** Central de documentos onde o coordenador sobe PDFs e os membros baixam.
*   **SQL Necessário:**
    ```sql
    CREATE TABLE documentos_arquivo (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        titulo TEXT NOT NULL,
        tipo TEXT NOT NULL, -- 'ata', 'pop', 'edital'
        url_arquivo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```

---

## 5. Gestão Global e Governança

### 🗳️ Assembleia e Votações
*   **O que falta:** Interface de votação secreta para pautas de assembleia.
*   **SQL Necessário:**
    ```sql
    CREATE TABLE pautas_votacao (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        titulo TEXT NOT NULL,
        ativa BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE votos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pauta_id UUID REFERENCES pautas_votacao(id),
        user_id UUID REFERENCES auth.users(id),
        escolha TEXT NOT NULL, -- 'sim', 'nao', 'abstencao'
        UNIQUE(pauta_id, user_id)
    );
    ```

---

## 6. Pendências de Infraestrutura (Crítico)

1.  **VAPID Keys (Push):** No dashboard do Supabase, configurar em `Edge Functions` > `Secrets`:
    *   `VAPID_PUBLIC_KEY`
    *   `VAPID_PRIVATE_KEY`
2.  **EmailJS Templates:** Criar os templates no dashboard da EmailJS:
    *   `template_convite`: Para novos membros.
    *   `template_prazo_abj`: Alertas de auditoria.
    *   `template_aniversario`: Parabéns automático.

---

## 🚀 Resumo de Ação do Desenvolvedor (Eu)
Após você rodar o SQL acima, eu vou:
1.  Trocar todos os `mostrarToast('Em breve!')` por funções reais que consultam essas tabelas.
2.  Criar os modais de cadastro para cada um desses itens.
3.  Remover definitivamente a frase "Em Desenvolvimento" de todos os títulos.

**Este documento contém 100% do que resta para a V9.0 Final.**
