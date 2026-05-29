# RhymArea 🎤

Plataforma de gerenciamento de batalhas de MC. Cadastre MCs, crie batalhas, gerencie chaveamentos e deixe o público votar.

## Tecnologias

**Frontend:** React, TanStack Router, TanStack Query, Tailwind CSS, TypeScript, Netlify  
**Backend:** Node.js, Express, MongoDB, Mongoose, Render

## Como rodar

### Pré-requisitos
- Node.js
- MongoDB rodando localmente para a versão local.
- MongoDB Atlas para a versão online.

### Backend
```bash
cd backend
npm install
node server.js
```

### Frontend
```bash
cd frontend
bun install
bun run dev
```

Acesse 'https://6a19bb979f664f64800d57f1--rhymarea.netlify.app'

## Funcionalidades

- Cadastro de MCs com perfil, histórico e estatísticas
- Criação de batalhas com chaveamento automático
- Sistema de votação do público em tempo real
- Bracket visual por fases (oitavas, quartas, semifinal, final)
- Histórico de batalhas finalizadas e campeões
