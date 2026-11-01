# BarberPro - Sistema Completo para Barbearias

Sistema completo de gestão para barbearias desenvolvido com Next.js, TypeScript, Prisma e PostgreSQL.

## 🚀 Funcionalidades

### 📱 Aplicativo Cliente
- Busca de barbearias próximas
- Agendamento online
- Histórico de serviços
- Notificações via WhatsApp
- Interface mobile-first

### 🏢 Painel Administrativo (Empresas)
- **Dashboard**: Estatísticas e métricas em tempo real
- **Agendamentos**: Gestão completa de agendamentos
- **Serviços**: Cadastro e gestão de serviços
- **Colaboradores**: Gestão de equipe (barbeiros, admins, etc.)
- **Produtos**: Controle de estoque (bebidas, petiscos, jogos)
- **Caixa**: Módulo financeiro completo
- **Clientes**: Cadastro e histórico de clientes
- **Configurações**: WhatsApp, localização, horários

### 👑 Painel do Proprietário (Super Admin)
- Gestão de todas as empresas cadastradas
- Relatórios financeiros globais
- Controle de planos e pagamentos
- Estatísticas do sistema
- Backup e segurança

### 🌐 Landing Page
- Apresentação do produto
- Planos de preços (Mensal, Trimestral, Anual)
- Sistema de contratação automatizado
- Design responsivo

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT, bcryptjs
- **Validação**: Zod, React Hook Form
- **Ícones**: Lucide React
- **Estilização**: Tailwind CSS

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd barbershop-system
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o banco de dados**
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure as variáveis de ambiente no arquivo .env
# Especialmente a DATABASE_URL
```

4. **Execute as migrações do banco**
```bash
npx prisma generate
npx prisma db push
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

6. **Acesse o sistema**
- Landing Page: http://localhost:3000
- Login: http://localhost:3000/login
- Dashboard: http://localhost:3000/dashboard
- Admin: http://localhost:3000/admin
- Cliente: http://localhost:3000/cliente

## 🗄️ Estrutura do Banco de Dados

O sistema utiliza as seguintes tabelas principais:

- **SystemOwner**: Proprietários do sistema
- **Company**: Empresas (barbearias)
- **User**: Usuários das empresas
- **Service**: Serviços oferecidos
- **Employee**: Colaboradores
- **Product**: Produtos vendidos
- **Client**: Clientes das barbearias
- **Appointment**: Agendamentos
- **Sale**: Vendas realizadas
- **CompanySettings**: Configurações das empresas
- **Notification**: Notificações do sistema

## 🔐 Autenticação

O sistema possui dois tipos de usuários:

1. **Proprietário do Sistema** (`SYSTEM_OWNER`)
   - Acesso total ao sistema
   - Gerencia todas as empresas
   - Acessa `/admin`

2. **Usuário de Empresa** (`COMPANY_USER`)
   - Acesso limitado à sua empresa
   - Gerencia apenas sua barbearia
   - Acessa `/dashboard`

## 💰 Planos de Preços

- **Mensal**: R$ 10,00/mês
- **Trimestral**: R$ 30,00/trimestre (economia de R$ 6)
- **Anual**: R$ 120,00/ano (economia de R$ 24)

## 📱 Funcionalidades por Módulo

### Dashboard Administrativo
- Estatísticas em tempo real
- Gráficos de faturamento
- Agendamentos recentes
- Ações rápidas

### Agendamentos
- Calendário interativo
- Filtros por status, barbeiro, serviço
- Confirmação automática via WhatsApp
- Gestão de horários

### Serviços
- CRUD completo
- Preços e duração
- Status ativo/inativo
- Categorização

### Colaboradores
- Diferentes tipos: Barbeiro, Admin, Marketing, etc.
- Controle de acesso
- Histórico de agendamentos

### Produtos
- Controle de estoque
- Categorias: Bebidas, Petiscos, Jogos
- Alertas de estoque baixo
- Relatórios de vendas

### Caixa
- Registro de vendas
- Múltiplas formas de pagamento
- Relatórios financeiros
- Fechamento de caixa

### Clientes
- Cadastro simplificado (nome + telefone)
- Histórico de agendamentos
- Estatísticas de visitas
- Avaliações

### Configurações
- **WhatsApp**: Mensagens automáticas, lembretes
- **Localização**: GPS, raio de atendimento
- **Horários**: Funcionamento por dia da semana
- **Agendamentos**: Regras e restrições
- **Notificações**: Email, SMS, push

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm run start

# Linting
npm run lint

# Prisma
npx prisma studio      # Interface visual do banco
npx prisma generate    # Gerar cliente Prisma
npx prisma db push     # Aplicar mudanças no banco
npx prisma db pull     # Sincronizar schema com banco
```

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório no Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Docker
```bash
# Build da imagem
docker build -t barbershop-system .

# Executar container
docker run -p 3000:3000 barbershop-system
```

## 🔒 Segurança

- Senhas criptografadas com bcryptjs
- Autenticação JWT
- Validação de dados com Zod
- Sanitização de inputs
- CORS configurado
- Rate limiting (recomendado para produção)

## 📊 Monitoramento

Para produção, recomenda-se implementar:
- Logs estruturados
- Métricas de performance
- Alertas de erro
- Backup automático
- Monitoramento de uptime

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Email: suporte@barberpro.com
- WhatsApp: (11) 99999-9999
- Documentação: [docs.barberpro.com](https://docs.barberpro.com)

## 🎯 Roadmap

### Próximas Funcionalidades
- [ ] Integração com gateways de pagamento
- [ ] App mobile nativo (React Native)
- [ ] Sistema de fidelidade
- [ ] Relatórios avançados
- [ ] Integração com redes sociais
- [ ] Sistema de avaliações
- [ ] Marketplace de produtos
- [ ] IA para recomendações

### Melhorias Técnicas
- [ ] Testes automatizados
- [ ] CI/CD pipeline
- [ ] Monitoramento APM
- [ ] Cache Redis
- [ ] CDN para assets
- [ ] Websockets para tempo real

---

**BarberPro** - Revolucionando a gestão de barbearias! 💈✨
