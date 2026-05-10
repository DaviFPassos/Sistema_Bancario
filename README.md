# 🏦 Sistema Bancário DuBom
O Sistema Bancário DuBom é uma aplicação de backend robusta desenvolvida para simular operações bancárias essenciais. O objetivo deste projeto é fornecer uma API escalável e segura para o gerenciamento de contas, usuários e transações financeiras.

# 📖 O que é este projeto?
Este projeto nasceu da necessidade de criar um sistema de gerenciamento financeiro que fosse ao mesmo tempo simples de usar e rigoroso com a integridade dos dados. Ele utiliza o FastAPI para garantir respostas rápidas e documentação automática, integrando-se a um banco de dados MySQL para persistência confiável das informações.

Principais Funcionalidades
Gestão de Clientes: Cadastro, atualização e consulta de usuários.

Controle de Contas: Abertura e monitoramento de contas bancárias vinculadas aos usuários.

Operações Financeiras: Endpoints preparados para lógica de depósitos, saques e transferências (em desenvolvimento).

Segurança de Dados: Uso de variáveis de ambiente para proteção de credenciais sensíveis.

# 🛠️ Pilares Técnicos
O projeto foi construído seguindo padrões de arquitetura modernos:

FastAPI & Uvicorn: Para uma comunicação assíncrona e eficiente.

SQLAlchemy (ORM): Para facilitar a manipulação do banco de dados sem a necessidade de escrever SQL puro em todas as camadas.

Ambientes Isolados (venv): O projeto é mantido em um ambiente virtual estrito para garantir que bibliotecas pesadas (como pacotes de Machine Learning) não interfiram no desempenho da API.

# 🚀 Como este projeto ajuda?
Este sistema serve como base para qualquer aplicação que precise de um controle de fluxo financeiro ou de usuários. Ele foi estruturado para ser facilmente estendido, permitindo a adição de camadas de autenticação JWT ou integração com gateways de pagamento no futuro.

# 💻 Instalação Rápida
Clone o repo: git clone [https://github.com/DaviFPassos/Sistema_Bancario.git](https://github.com/DaviFPassos/Sistema_Bancario.git)

Crie seu ambiente: python3 -m venv venv

Instale as dependências: pip install -r requirements.txt

Configure o seu .env: Adicione suas chaves de banco de dados conforme o modelo example.env.

Rode o servidor: uvicorn main:app --reload
