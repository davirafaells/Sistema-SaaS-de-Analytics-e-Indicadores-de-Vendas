Plataforma SaaS de BI e Análise de Dados 

Esta é uma plataforma SaaS de BI e análise de dados voltada à centralização de informações financeiras e comerciais, com ingestão de arquivos, tratamento de dados e visualização de indicadores para apoio à tomada de decisão.

O projeto foi desenvolvido para resolver o problema de descentralização de dados, transformando registros brutos em insights estratégicos de forma intuitiva.

🚀 Funcionalidades Principais
Ingestão de Dados Híbrida: Suporte para upload de arquivos CSV com mapeamento dinâmico de colunas e formulário para lançamentos manuais.

Tratamento e Resiliência: Rotinas de Upsert que identificam e cadastram novos produtos automaticamente durante a importação, garantindo a integridade dos dados sem interrupções.

Painel de Indicadores: Dashboard centralizado para acompanhamento de faturamento e métricas comerciais em tempo real.

Gestão de Histórico: Controle total dos registros com funcionalidade de Soft Delete, permitindo a remoção visual sem perda definitiva da integridade do banco de dados.

🛠️ Tecnologias Utilizadas
Backend: Python com FastAPI e SQLAlchemy (ORM).

Banco de Dados: PostgreSQL (Arquitetura Multi-tenant).

Frontend: React com TypeScript e Tailwind CSS.

Processamento: Pydantic para validação e PapaParse para manipulação de CSV.

📈 Evolução e Próximos Passos
O sistema foi projetado para ser escalável. Os próximos marcos de desenvolvimento incluem:

Implementação de filtros dinâmicos por períodos específicos no Dashboard.

Integração de filas de processamento assíncrono (Celery/Redis) para lidar com grandes volumes de dados em larga escala.

Desenvolvido por Davi Rafael Silva.