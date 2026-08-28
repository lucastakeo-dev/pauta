# Pauta

Workspace pessoal keyboard-first no formato do [routine.co](https://routine.co): planner do
dia com time-blocking, tarefas, captura rápida e notas. **v1 completo.**

A documentação vive em `docs/`:

| Arquivo | O que tem |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura (MVC + camadas), stack, comandos, endpoints, convenções de código |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Produto, decisões, aprendizados de cada fase e riscos conhecidos |
| [docs/DESIGN.md](docs/DESIGN.md) | Sistema visual e o porquê de cada token |

## Regras de trabalho

Ficam aqui, e não em `docs/`, por um motivo prático: **este é o único arquivo lido
automaticamente a cada sessão.** O resto precisa ser aberto.

- **Idioma**: conversa em pt-BR. Código e tabelas em inglês; copy de UI, comentários e
  mensagens de erro em pt-BR.
- **Waves**: tarefa grande vira blocos sequenciais, cada um declarando objetivo, arquivos
  afetados, status e próximos passos. **Uma branch por wave.**
- **Commits e branches**: Conventional Commits em inglês, curtos e específicos
  (`fix/login-token-expiry`, não `codex/fix-description`). Sem `Co-Authored-By`.
- **Push só após aprovação explícita.** Ao fim de cada tarefa, apresentar overview com
  mudanças, arquivos, decisões e validações — e esperar.
- **Validar com teste ou comando**, nunca com suposição. Mudanças pequenas, alinhadas ao
  padrão existente. Dúvida importante vira pergunta.
