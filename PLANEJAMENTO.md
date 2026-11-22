# Pouso Crítico: documento de planejamento

> Versão 1.0, de 22/11/2026. "Pouso Crítico" é um nome provisório.
>
> **Como ler:** **[D]** marca o que você decidiu nas perguntas. **[P]** marca uma premissa proposta para completar o plano, que pode ser trocada. Todo valor numérico é ponto de partida e deve ser ajustado jogando.

## 1. Visão geral

Jogo 2D de navegador no gênero de pouso lunar. O jogador controla uma nave sempre vertical com **três motores independentes**. O objetivo é **decolar da base de partida, desviar do cenário e dos perigos, coletar cristais e pousar com suavidade na base de destino** antes que o combustível acabe.

**Laço principal:** observar a fase → planejar a rota → decolar → desviar → pousar ou explodir → reiniciar na hora → buscar as estrelas que faltam e um tempo melhor.

### Pilares

1. **Controle justo:** toda explosão deve parecer culpa do jogador. Os perigos são previsíveis.
2. **Tentativa rápida:** da explosão à nova tentativa em menos de 0,5 s.
3. **Combustível é a tensão:** cada desvio por um cristal tem um custo.
4. **Leitura imediata:** a fase inteira cabe na tela e pode ser planejada antes de voar.

### Inspiração e originalidade

A referência são as mecânicas do gênero: gravidade, inércia, empuxo e combustível limitado. Nome, naves, fases, arte, sons e interface serão criados para este projeto. Nada será copiado de um jogo existente.

## 2. Resumo das decisões

| Tema | Decisão |
|---|---|
| Objetivo do projeto | Aprender e se divertir **[D]** |
| Plataforma | Navegador, em desktop e celular **[D]** |
| Tecnologia | TypeScript + Canvas 2D, sem engine **[D]**; Vite como ferramenta de build **[D]** |
| Objetivo de cada fase | Sair de uma base e pousar em outra, desviando do cenário **[D]** |
| Física | Arcade com inércia **[D]** |
| Controle | Três propulsores, sem rotação **[D]** |
| Gravidade | Única em todos os mundos **[D]** |
| Câmera | Tela fixa, sem rolagem ou zoom **[D]** |
| Estrutura | Campanha de fases, MVP com 10 **[D]** |
| Mundos | 3, diferenciados por paleta, terreno e perigos **[D/P]** |
| Estrelas | 3 objetivos fixos por fase **[D]** |
| Itens | Combustível e cristais **[D]** |
| Perigos | Meteoros, gêiseres, lasers e plataforma móvel **[D]** |
| Falha | Reinício imediato, tentativas ilimitadas **[D]** |
| Progressão | Fases lineares; naves liberadas por total de estrelas **[D]** |
| Persistência | Recordes locais e fantasma opcional **[D]** |
| Visual | Pixel art gerada por código **[D]** |
| Áudio | Efeitos e chiptune sintetizados com Web Audio **[D]** |
| Narrativa | Nenhuma **[D]** |
| Idioma | Português do Brasil **[D]** |
| Entradas | Teclado **[P]**, toque e gamepad **[D]** |

### Fora do MVP

- Vento, atmosfera e gravidade variável
- Resgate, transporte de carga, loja de melhorias, escudo e câmera lenta
- Modo infinito, editor de fases e fases procedurais
- Ranking online, contas, backend, anúncios e monetização
- Inglês e outros idiomas
- Narrativa e diálogos

## 3. Regras do jogo

### 3.1 Início da tentativa **[P]**

- A nave começa apoiada na **base de partida**, e os perigos ficam congelados até o primeiro acionamento do **motor principal**.
- Esse acionamento inicia o cronômetro e o relógio dos perigos. Assim, todas as tentativas e o fantasma começam sincronizados.

### 3.2 Movimento

A tela lógica tem **480 × 270 px**, com Y crescendo para baixo. A nave ocupa cerca de **16 × 16 px**.

| Motor | Efeito | Comando |
|---|---|---|
| Inferior | Empurra para cima | Cima |
| Esquerdo | Empurra para a **direita** | Direita |
| Direito | Empurra para a **esquerda** | Esquerda |

O comando sempre indica **para onde a nave vai**, e não qual motor acende. Os três motores podem funcionar juntos.

```text
ax = (comandoDireita - comandoEsquerda) * empuxoLateral + forçasExternasX
ay = gravidade - comandoCima * empuxoPrincipal + forçasExternasY

v += a * dt          // Euler semi-implícito
v  = limitar(v, velocidadeMáxima)
p += v * dt
```

| Parâmetro | Valor inicial |
|---|---:|
| Passo fixo da simulação (`dt`) | 1/60 s |
| Gravidade | 18 px/s² |
| Velocidade máxima, por eixo | 140 px/s |
| Arrasto | 0 |
| Massa | Constante, mesmo com o consumo de combustível |

**Conferência teórica com a nave inicial:** em uma queda de 200 px a partir do repouso, a frenagem ideal exige cerca de 2,4 s do motor principal, ou 22 unidades. Pairar consome cerca de 3,6 unidades/s; um tanque cheio dura aproximadamente 28 s pairando.

### 3.3 Combustível

- Cada motor ligado consome sua própria taxa por segundo.
- Com tanque zerado, os motores param e a nave segue pela inércia. A tentativa continua até o pouso ou a destruição.
- Um alerta visual e sonoro começa em 20% do tanque.
- A fase define o combustível inicial como percentual do tanque.

### 3.4 Pouso

Só a **base de destino** conclui a fase. O pouso nela só é válido se **todas** as condições forem verdadeiras:

1. Os dois pés estão dentro da plataforma.
2. A nave está descendo em relação à plataforma.
3. A velocidade vertical relativa está dentro da tolerância da nave.
4. A velocidade horizontal relativa está dentro da tolerância da nave.

O contato válido conclui a fase imediatamente. Voltar à **base de partida** dentro das mesmas condições apenas apoia a nave, sem reabastecer; nela, os motores laterais não a arrastam. Ficar ali sem combustível reinicia a tentativa. Na plataforma móvel, a velocidade é **relativa a ela**. Como a nave não gira, não existe critério de ângulo.

O HUD mostra VX e VY em verde quando estão dentro da tolerância e em vermelho com símbolo `!` quando estão fora.

### 3.5 Destruição

- Tocar terreno, laser ligado ou meteoro
- Tocar uma plataforma fora das condições de pouso
- Cair abaixo da tela

A nave nunca sai da tela: há um teto **[P]** e paredes laterais **[D]** invisíveis, que anulam a velocidade contra a borda sem destruir a nave.

A explosão dura até 0,4 s e o reinício é automático. O jogador também pode reiniciar a qualquer momento.

### 3.6 Ordem de cada passo

1. Ler os comandos e avançar o relógio
2. Atualizar perigos e plataforma em função do tempo
3. Consumir combustível e integrar o movimento
4. Coletar itens
5. Verificar perigos
6. Verificar pouso
7. Verificar terreno e limites

Se perigo e pouso ocorrerem no mesmo passo, o **perigo vence**. Só um resultado pode encerrar cada tentativa.

## 4. Conteúdo

### 4.1 Itens

| Item | Efeito | Visual |
|---|---|---|
| Combustível | +25 unidades, limitado ao tanque | Galão amarelo com faixa |
| Cristal | Conta para a estrela de coleta; 1 a 5 por fase | Losango ciano pulsante |

Itens reaparecem a cada tentativa.

### 4.2 Perigos

O meteoro desaparece ao fim do trajeto, e o gêiser age sobre o centro da nave. Com base móvel, o HUD mostra a velocidade horizontal relativa a ela ("VX rel").

A posição e o estado são **funções puras do tempo**, com período e fase definidos em cada nível. Não há aleatoriedade.

| Perigo | Comportamento | Contato | Aviso |
|---|---|---|---|
| Meteoro | Percorre uma reta e reaparece no início | Destrói | Seta piscante na borda por 0,6 s |
| Gêiser | Liga e desliga; empurra em coluna com 60 px/s² | Não destrói | Borbulhas por 0,6 s |
| Laser | Barreira que liga e desliga | Destrói quando ligado | Linha tracejada por 0,4 s |
| Plataforma móvel | Oscila horizontalmente em senoide, a até 20 px/s | É o alvo de pouso | Trilho visível |

### 4.3 Estrelas

| Estrela | Condição |
|---|---|
| Pouso | Pousar com sucesso |
| Coleta | Pousar com todos os cristais coletados na mesma tentativa |
| Economia | Pousar com percentual de combustível igual ou maior que a meta |

As estrelas ficam registradas separadamente e podem ser obtidas em tentativas diferentes **[P]**. A meta de economia usa o percentual do tanque da nave escolhida. **Todas as 30 estrelas precisam ser possíveis com a nave inicial**, para evitar bloqueio de progresso.

### 4.4 Naves

| Atributo | Vaga-lume | Besouro | Libélula |
|---|---:|---:|---:|
| Desbloqueio | Início | 10 estrelas | 20 estrelas |
| Perfil | Equilibrada: serve para aprender tudo | Pesada: freia cedo, mas perdoa o toque | Ágil: freia em cima da hora, mas exige toque preciso |
| Silhueta | Cápsula creme, cabine ciano | Larga e baixa, verde-escura, pernas grossas | Fina e alta, lilás, com asas |
| Empuxo principal (px/s²) | 45 | 32 | 75 |
| Empuxo lateral (px/s²) | 22 | 13 | 48 |
| Tanque (unidades) | 100 | 180 | 60 |
| Consumo principal (un/s) | 9 | 9 | 10,5 |
| Consumo de cada lateral (un/s) | 3 | 3 | 4,5 |
| Tolerância vertical (px/s) | 20 | 30 | 14 |
| Tolerância horizontal (px/s) | 10 | 15 | 7 |
| Distância para frear de 60 px/s (px, teórica) | 67 | 129 | 32 |
| Tempo para anular 40 px/s de lado (s) | 1,8 | 3,1 | 0,8 |
| Tempo pairando com tanque cheio (s) | 27,8 | 35,6 | 23,8 |

Revisão de 22/11/2026: diferenças ampliadas depois do primeiro teste de voo, em que as naves pareceram iguais. Depois, o consumo caiu 25% nas três, porque a travessia entre duas bases exige voos mais longos.

### 4.5 Fases do MVP

Cada fase ensina ou combina poucos elementos. Em **todas**, a linha reta entre as bases é bloqueada pelo cenário e existe uma rota livre; os testes verificam as duas coisas. As dez fases estão desenhadas. Um piloto automático prova que as 30 estrelas são possíveis com a Vaga-lume e que as três naves concluem todas as fases com todos os cristais. Isso não mede a dificuldade para uma pessoa, que ainda precisa ser avaliada jogando.

| # | Mundo | Nome | Ensina ou combina | Cristais | Tanque inicial | Meta de economia |
|---:|---|---|---|---:|---:|---:|
| 1 | Planície Cinza | Primeiro Toque | Decolar, passar o morro e pousar | 1 | 100% | 25% |
| 2 | Planície Cinza | De Lado | Travessia longa: frear de lado | 2 | 100% | 25% |
| 3 | Planície Cinza | Entre Picos | Dois picos, base estreita e cristal no vale | 3 | 100% | 20% |
| 4 | Planície Cinza | Tanque Raso | Galões e destino no alto | 3 | 50% | 30% |
| 5 | Cratera Rubra | Sopro | Gêiseres | 3 | 100% | 30% |
| 6 | Cratera Rubra | Chuva de Pedra | Meteoros | 3 | 100% | 25% |
| 7 | Cratera Rubra | Panela de Pressão | Gêiseres + meteoros, cristal no cânion | 4 | 95% | 30% |
| 8 | Caverna Gélida | Compasso | Lasers em corredor | 3 | 100% | 25% |
| 9 | Caverna Gélida | Alvo Inquieto | Base móvel e estalactite | 4 | 100% | 25% |
| 10 | Caverna Gélida | Pouso Crítico | Gêiser, laser, meteoro, base móvel e galões | 5 | 80% | 25% |

Total: **10 fases, 30 estrelas e 31 cristais**. Pousar libera a próxima fase. Estrelas liberam apenas naves.

## 5. Controles e telas

### 5.1 Controles

| Ação | Teclado | Gamepad | Toque |
|---|---|---|---|
| Subir | ↑, W ou Espaço | A ou RT | Botão à direita |
| Esquerda | ← ou A | Direcional ou analógico | Botão à esquerda |
| Direita | → ou D | Direcional ou analógico | Botão à esquerda |
| Reiniciar | R | Y | Ícone no topo |
| Pausar | Esc ou P | Start | Ícone no topo |
| Fantasma | G | Select | Na pausa |

- As entradas são digitais. No analógico, a zona morta é 0,35.
- Toque usa Pointer Events com multitoque, áreas de pelo menos 48 px CSS e margens para recortes da tela.
- No celular, o jogo é horizontal. Na vertical, pausa e pede para girar o aparelho **[P]**.
- Perder o foco ou desconectar o gamepad limpa os comandos e pausa o jogo.

### 5.2 Fluxo

```text
Título → Seleção de fase → Seleção de nave → Jogo → Resultado → próxima fase
   └→ Opções                                └→ Pausa       └→ repetir
```

| Tela | Conteúdo |
|---|---|
| Título | Jogar, opções |
| Seleção de fase | 10 fases, estrelas, melhor tempo, cadeados |
| Seleção de nave | 3 naves, barras de atributos, requisito de estrelas |
| HUD | Combustível, VX, VY, cristais e tempo |
| Pausa | Continuar, reiniciar, fantasma, opções, sair |
| Resultado | Estrelas, tempo, combustível e novo recorde |
| Opções | Volumes, tremor de tela, flashes, fantasma, apagar progresso com confirmação |

Todos os menus funcionam com as três formas de entrada.

### 5.3 Acessibilidade

- Cor nunca é o único sinal.
- Flashes e tremor podem ser desligados e respeitam `prefers-reduced-motion`.
- Alertas sonoros sempre têm equivalente visual.

## 6. Recordes e fantasma

- Por fase: estrelas, menor tempo e maior combustível restante.
- O fantasma guarda o **pouso mais rápido** da fase, com qualquer nave, e pode ser ligado ou desligado.
- É translúcido, não colide e mostra a nave usada na gravação.
- Grava posição e motores ligados a **20 Hz** e interpola na reprodução. Gravar posição, e não comandos, preserva o replay mesmo se a física for ajustada.
- O limite é de 120 s. Um pouso mais longo registra o tempo, mas não grava fantasma.
- Estimativa: 5 bytes por amostra, ou cerca de 12 KB por gravação máxima e 16 KB em Base64. Dez fantasmas cabem em aproximadamente 160 KB.
- Mudar `version` da fase invalida seu tempo e fantasma, mas preserva estrelas.

```ts
interface SaveData {
  schemaVersion: 1;
  selectedShip: ShipId;
  levels: Record<string, {
    levelVersion: number;
    stars: { landing: boolean; crystals: boolean; fuel: boolean };
    bestTimeMs?: number;
    bestFuelPct?: number;
  }>;
}
```

As fases liberadas e o total de estrelas são deduzidos de `levels`, para não haver dois dados que possam discordar. O fantasma entra no formato em M7 e as opções em M8 e M9. Um save ilegível é copiado para `pouso-critico-save-backup` antes de ser substituído. Só contam voos da campanha, com fase e nave liberadas e valores padrão.

O save fica no `localStorage`. Dados ausentes ou corrompidos não podem impedir o jogo de abrir. Se a gravação falhar, o jogo segue em memória e avisa.

## 7. Arte e áudio

### 7.1 Pixel art por código

- Sprites são matrizes de texto, com um caractere por cor, convertidas em canvas na inicialização.
- Escala inteira sempre que possível, com suavização desligada e faixas laterais quando necessário. Em telas pequenas, a escala fracionária é aceita.
- Até 16 cores por mundo, com cores constantes para nave, cristal, combustível e perigo.
- Terreno: polígonos rasterizados com borda clara e textura determinística.
- Fonte bitmap própria, incluindo `ÁÀÂÃÉÊÍÓÔÕÚÇ`.
- Animações curtas, de 2 a 4 quadros: chamas, cristal, meteoro, gêiser e explosão.

| Mundo | Paleta | Terreno |
|---|---|---|
| Planície Cinza | Azul-noite, cinzas e bege | Colinas e picos |
| Cratera Rubra | Vinho, ferrugem e laranja | Paredões e respiradouros |
| Caverna Gélida | Azul-petróleo, ciano e lilás | Teto, corredores e estalactites |

### 7.2 Áudio sintetizado

| Som | Técnica |
|---|---|
| Motor principal | Ruído com filtro passa-baixa e envelope |
| Motores laterais | Ruído agudo e curto, com panorama estéreo |
| Coleta | Dois tons ascendentes |
| Pouca reserva | Bipe com ritmo crescente |
| Explosão | Ruído com queda de frequência |
| Pouso e estrelas | Arpejo original |
| Música | 1 tema de menu e 1 por mundo, com 2 a 3 vozes |

O áudio começa depois da primeira interação, por exigência dos navegadores. Música e efeitos têm volumes separados.

## 8. Arquitetura

### 8.1 Princípios

- **Simulação separada da apresentação:** o núcleo não acessa DOM, canvas, áudio ou relógio real.
- **Passo fixo com acumulador:** a física independe da taxa da tela. A renderização interpola entre estados, e o atraso por quadro é limitado a 0,25 s.
- **Eventos:** a simulação emite `crystal`, `fuel`, `crash` e `landed`; áudio e partículas reagem.
- **Conteúdo como dados:** fases e naves ficam fora da lógica.
- **Sem dependências em produção:** Vite, TypeScript e Vitest só no desenvolvimento.

### 8.2 Estrutura proposta

```text
moon-lander/
├─ PLANEJAMENTO.md
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ src/
│  ├─ main.ts
│  ├─ core/        # loop, máquina de telas, tempo
│  ├─ sim/         # física, colisão, perigos, pouso, estrelas
│  ├─ data/        # naves, fases, sprites, fonte, textos
│  ├─ input/       # teclado, toque, gamepad
│  ├─ render/      # canvas, sprites, terreno, partículas, HUD
│  ├─ audio/       # efeitos e sequenciador
│  ├─ storage/     # save, migração, fantasma
│  └─ screens/     # título, seleção, jogo, pausa, resultado
└─ tests/
```

### 8.3 Colisão

- Polígonos de terreno são rasterizados em uma máscara `Uint8Array` de 480 × 270, usada também para desenhar a fase.
- A nave testa todos os seus pixels sólidos contra a máscara. A forma vem do próprio desenho, então cada nave tem colisão própria e um pico fino não passa entre os pixels do contorno.
- Plataformas ficam fora da máscara. O pouso verifica se os pés cruzaram o topo entre dois passos.
- A 140 px/s a nave anda no máximo 2,34 px por passo em cada eixo. Terrenos e plataformas devem ter ao menos 4 px de espessura.

### 8.4 Formato das fases

```ts
interface Level {
  id: string;
  version: number;
  name: string;
  world: 'plain' | 'crater' | 'cave';
  base: Pad; // partida
  startFuelPct: number;
  fuelGoalPct: number;
  terrain: Point[][];
  goal: Pad & { motion?: { amplitude: number; period: number; phase: number } }; // destino
  crystals: Point[];
  fuelCans: Point[];
  hazards: Hazard[]; // união discriminada: meteor | geyser | laser
}
```

Na plataforma móvel, a velocidade máxima é `2π × amplitude ÷ período`. Um validador deve conferir esse limite, a posição dos objetos e a existência de IDs únicos.

## 9. Roteiro

| Etapa | Entrega | Critério de conclusão |
|---|---|---|
| M0. Base | Vite, TypeScript, Vitest, canvas e loop fixo | Retângulo se move igual a 30, 60 e 144 Hz |
| M1. Voo | Três motores, gravidade, combustível e teclado | Voar já é divertido com formas simples |
| M2. Pouso | Terreno, colisão, pouso, explosão e reinício | Fase 1 jogável do início ao fim; reinício < 0,5 s |
| M3. Objetivos | Itens, estrelas, HUD e resultado | Três estrelas registradas corretamente |
| M4. Perigos | Quatro perigos e avisos | Uma fase de teste por perigo |
| M5. Campanha | 10 fases, seleção, naves e save | Campanha completa com progresso persistente |
| M6. Entradas | Toque, gamepad e layout responsivo | Campanha jogável nas três entradas |
| M7. Fantasma | Gravação e reprodução | Fantasma alinhado após recarregar a página |
| M8. Arte e som | Sprites, fonte, mundos, efeitos e música | Nenhum elemento provisório |
| M9. Polimento | Balanceamento, acessibilidade e testes finais | Todos os critérios da seção 10 |

A referência é **algumas semanas em tempo parcial**. O principal marco de decisão é M1: se voar não for divertido, os parâmetros devem ser ajustados antes de seguir.

**Se precisar cortar, nesta ordem:** músicas por mundo → fantasma → terceira nave → lasers. As fases 8 e 10 precisariam ser redesenhadas nesse último caso.

### O que cada etapa ensina

- **M0–M2:** game loop, integração numérica, colisão e máquinas de estado
- **M3–M5:** modelagem de dados, tipos e persistência
- **M6–M7:** abstração de entradas, serialização e interpolação
- **M8–M9:** pixel art procedural, síntese sonora e game feel

## 10. Qualidade

### Testes automatizados

- Integração, limite de velocidade e consumo de cada motor
- Pouso em cada tolerância: no limite, abaixo e acima
- Velocidade relativa na plataforma móvel
- Estados dos perigos no início, no meio e na virada do período
- Estrelas, desbloqueios, save corrompido e migração
- Codificação e decodificação do fantasma
- Validação das 10 fases e mesma sequência de comandos → mesmo resultado

### Critérios de aceite do MVP

- [ ] As 10 fases podem ser concluídas e as 30 estrelas obtidas com a Vaga-lume
- [ ] A física não muda com a taxa de atualização da tela
- [ ] O jogo mantém 60 fps em um desktop comum e em um celular intermediário
- [ ] O reinício leva menos de 0,5 s
- [ ] Teclado, toque e gamepad completam todo o fluxo
- [ ] Progresso, recordes e fantasma sobrevivem ao recarregamento
- [ ] Funciona nas versões atuais de Chrome, Edge, Firefox e Safari
- [ ] Não há erro no console durante uma campanha completa
- [ ] Todos os textos estão em português e com acentos corretos

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Voo sem graça | Protótipo em M1 e parâmetros ajustáveis em tempo real |
| Dificuldade injusta | Perigos determinísticos, avisos e testes com outras pessoas |
| Fase ficar presa por combustível | Estrelas de economia opcionais e reinício ilimitado |
| Tela fixa deixar tudo pequeno no celular | Teste em aparelho real já em M2; HUD compacto |
| Arte por código consumir tempo | Paleta curta, sprites pequenos e arte só depois da jogabilidade |
| Chiptune ficar repetitivo | Trechos curtos variados e volume separado |
| Escopo crescer | Novas ideias vão para a lista da seção 12 |

## 12. Depois do MVP

- Segunda campanha com gravidade por mundo
- Escudo e câmera lenta
- Modo infinito procedural
- Editor e compartilhamento de fases por código
- Inglês, cosméticos e fantasma por nave

## 13. Pontos em aberto

Nenhum impede o início do desenvolvimento.

| Questão | Proposta atual | Decidir até |
|---|---|---|
| Nome final e disponibilidade | Manter "Pouso Crítico"; disponibilidade ainda não pesquisada | Antes de publicar |
| Hospedagem | GitHub Pages ou itch.io | M9 |
| Licença do código | Não definida | Antes de publicar |
| Jogo instalável e offline (PWA) | Fora do MVP | Depois do MVP |
| Uso de Git | Decidido: um branch por etapa, commits pequenos com testes passando; no fim, depois do teste de quem joga, o branch entra na `main` e recebe uma marca (`m4`, `m5`...). Ainda sem remoto | Concluído |

## 14. Próximo passo

**Situação em 22/11/2026:** M0 a M5 implementadas. A campanha está completa, com título, seleção de fase e de nave, pausa, resultado e progresso salvo no navegador. M5 está no branch `m5-campanha`, aguardando o teste de quem joga para entrar na `main`.

Pendências: avaliar a dificuldade das dez fases jogando, o ajuste fino das naves e o teste em um celular real.

Próxima etapa: **M6**, com toque, gamepad e layout responsivo.

Para testar: `npm run dev`. A tecla T, durante o jogo, abre o painel de ajustes e as fases de teste. Valores escolhidos no painel devem ser levados para `src/data/physics.ts` e `src/data/ships.ts`.
