// Tactical Hub Pro — formations, slot specs, radar labels and pitch geometry.
// Kept dependency-free so the same module runs in the browser and in Node tests.

export const SLOT_SPECS = {
  "4-3-3":   [["GK","GK","C"],["DEF","FB","R"],["DEF","CB","R"],["DEF","CB","L"],["DEF","FB","L"],["MID","CM","R"],["MID","DM","C"],["MID","CM","L"],["ATT","W","R"],["ATT","ST","C"],["ATT","W","L"]],
  "3-5-2":   [["GK","GK","C"],["DEF","CB","R"],["DEF","CB","C"],["DEF","CB","L"],["MID","WB","R"],["MID","CM","R"],["MID","DM","C"],["MID","CM","L"],["MID","WB","L"],["ATT","ST","R"],["ATT","ST","L"]],
  "3-4-2-1": [["GK","GK","C"],["DEF","CB","R"],["DEF","CB","C"],["DEF","CB","L"],["MID","WB","R"],["MID","CM","R"],["MID","CM","L"],["MID","WB","L"],["ATT","AM","R"],["ATT","AM","L"],["ATT","ST","C"]],
  "4-2-3-1": [["GK","GK","C"],["DEF","FB","R"],["DEF","CB","R"],["DEF","CB","L"],["DEF","FB","L"],["MID","DM","R"],["MID","DM","L"],["ATT","W","R"],["ATT","AM","C"],["ATT","W","L"],["ATT","ST","C"]],
  "4-3-2-1": [["GK","GK","C"],["DEF","FB","R"],["DEF","CB","R"],["DEF","CB","L"],["DEF","FB","L"],["MID","CM","R"],["MID","DM","C"],["MID","CM","L"],["ATT","AM","R"],["ATT","AM","L"],["ATT","ST","C"]],
  "3-5-1-1": [["GK","GK","C"],["DEF","CB","R"],["DEF","CB","C"],["DEF","CB","L"],["MID","WB","R"],["MID","DM","C"],["MID","CM","R"],["MID","CM","L"],["MID","WB","L"],["ATT","AM","C"],["ATT","ST","C"]],
  "4-4-2":   [["GK","GK","C"],["DEF","FB","R"],["DEF","CB","R"],["DEF","CB","L"],["DEF","FB","L"],["MID","W","R"],["MID","CM","R"],["MID","CM","L"],["MID","W","L"],["ATT","ST","R"],["ATT","ST","L"]],
  "3-4-3":   [["GK","GK","C"],["DEF","CB","R"],["DEF","CB","C"],["DEF","CB","L"],["MID","WB","R"],["MID","CM","R"],["MID","CM","L"],["MID","WB","L"],["ATT","W","R"],["ATT","ST","C"],["ATT","W","L"]],
  "4-1-4-1": [["GK","GK","C"],["DEF","FB","R"],["DEF","CB","R"],["DEF","CB","L"],["DEF","FB","L"],["MID","DM","C"],["MID","W","R"],["MID","CM","R"],["MID","CM","L"],["MID","W","L"],["ATT","ST","C"]],
  "5-3-2":   [["GK","GK","C"],["DEF","CB","R"],["DEF","CB","C"],["DEF","CB","L"],["MID","WB","R"],["MID","CM","R"],["MID","DM","C"],["MID","CM","L"],["MID","WB","L"],["ATT","ST","R"],["ATT","ST","L"]],
  "4-3-1-2": [["GK","GK","C"],["DEF","FB","R"],["DEF","CB","R"],["DEF","CB","L"],["DEF","FB","L"],["MID","CM","R"],["MID","DM","C"],["MID","CM","L"],["ATT","AM","C"],["ATT","ST","R"],["ATT","ST","L"]],
  "3-4-1-2": [["GK","GK","C"],["DEF","CB","R"],["DEF","CB","C"],["DEF","CB","L"],["DEF","WB","R"],["MID","CM","R"],["MID","CM","L"],["DEF","WB","L"],["ATT","AM","C"],["ATT","ST","R"],["ATT","ST","L"]],
  "3-1-4-2": [["GK","GK","C"],["DEF","CB","R"],["DEF","CB","C"],["DEF","CB","L"],["MID","DM","C"],["MID","W","R"],["MID","CM","R"],["MID","CM","L"],["MID","W","L"],["ATT","ST","R"],["ATT","ST","L"]]
};

// ESPN formationPlace -> slot index. Only formations verified against live
// 2026/27 lineups are listed. Unknown shapes fall back to the Hungarian mapper.
export const FP_SLOT_MAP = {
  "4-2-3-1": {1:0, 2:1, 3:4, 4:6, 5:2, 6:3, 7:7, 8:5, 9:10, 10:8, 11:9},
  "4-3-3":   {1:0, 2:1, 3:4, 4:6, 5:2, 6:3, 7:5, 8:7, 9:9, 10:8, 11:10},
  "3-5-2":   {1:0, 2:4, 3:8, 4:3, 5:2, 6:1, 7:5, 8:7, 9:10, 10:9, 11:6},
  "3-4-2-1": {1:0, 2:4, 3:7, 4:3, 5:2, 6:1, 7:5, 8:6, 9:10, 10:8, 11:9},
  "3-4-1-2": {1:0, 2:4, 3:7, 4:3, 5:2, 6:1, 7:5, 8:6, 9:8, 10:9, 11:10},
  "3-5-1-1": {1:0, 2:4, 3:8, 4:3, 5:2, 6:1, 7:6, 8:7, 9:10, 10:9, 11:5},
  "4-4-2":   {1:0, 2:1, 3:4, 4:6, 5:2, 6:3, 7:5, 8:7, 9:10, 10:9, 11:8},
  "3-4-3":   {1:0, 2:4, 3:7, 4:3, 5:2, 6:1, 7:5, 8:6, 9:9, 10:8, 11:10},
  "4-1-4-1": {1:0, 2:1, 3:4, 4:9, 5:2, 6:3, 7:6, 8:7, 9:8, 10:10, 11:5},
  "3-1-4-2": {1:0, 2:5, 3:8, 4:1, 5:3, 6:2, 7:6, 8:7, 9:10, 10:9, 11:4}
};

// [x%, y%, arrowEndX, arrowEndY, curveControlX?, curveControlY?]
export const FORMATIONS = {
  "4-3-3": [[9.5,50,160,340],[26,84,540,600,400,600],[22,62,320,425],[22,38,310,255],[26,16,620,100,450,95],[48,72,760,400,630,480],[40,50,475,340],[48,28,660,250,580,210],[72,82,830,450,780,540],[80,50,900,340],[72,18,830,240,780,160]],
  "3-5-2": [[9.5,50,160,340],[25,72,420,540],[23,50,320,340],[25,28,480,175,360,185],[46,86,760,590],[52,64,750,430,640,520],[40,50,470,340],[52,36,680,260],[46,14,760,88],[74,58,640,460],[78,40,890,270,830,310]],
  "3-4-2-1": [[9.5,50,160,340],[26,72,410,550],[23,50,320,340],[26,28,400,185],[48,86,760,590],[46,62,690,460,580,500],[44,38,520,260],[48,14,760,90],[68,64,800,410,740,490],[68,36,800,280,740,220],[80,50,900,340]],
  "4-2-3-1": [[9.5,50,160,340],[26,84,600,600],[22,62,320,425],[22,38,310,255],[26,16,470,190,380,150],[42,64,540,430],[42,36,520,250],[68,82,810,440,740,530],[63,50,750,340,680,360],[68,18,810,250,740,190],[80,50,900,340]],
  "4-3-2-1": [[9.5,50,160,340],[26,84,520,600],[22,62,320,425],[22,38,310,255],[26,16,520,120],[46,70,640,480],[42,50,490,340],[46,30,640,240],[68,64,790,400,740,470],[68,36,800,280,740,240],[80,50,900,340]],
  "3-5-1-1": [[9.5,50,160,340],[25,72,410,550],[23,50,320,340],[25,28,390,190],[46,86,750,590],[41,50,480,340],[53,64,720,430,620,500],[51,36,760,280,650,300],[46,14,750,90],[69,34,820,240,770,260],[80,52,900,340]],
  "4-4-2": [[9.5,50,160,340],[26,84,540,600],[22,62,320,425],[22,38,310,255],[26,16,540,100],[48,84,780,580],[44,61,620,420],[44,39,620,260],[48,16,780,100],[78,61,900,400],[78,39,900,280]],
  "3-4-3": [[9.5,50,160,340],[25,72,420,540],[23,50,320,340],[25,28,420,160],[48,86,760,590],[45,62,640,440],[45,38,640,240],[48,14,760,90],[72,80,860,470],[80,50,910,340],[72,20,860,210]],
  "4-1-4-1": [[9.5,50,160,340],[26,84,540,600],[22,62,320,425],[22,38,310,255],[26,16,540,100],[38,50,480,340],[56,82,810,540],[54,62,720,420],[54,38,720,260],[56,18,810,140],[80,50,900,340]],
  "5-3-2": [[9.5,50,160,340],[25,72,410,540],[23,50,320,340],[25,28,410,160],[36,86,690,590],[50,65,700,430],[44,50,530,340],[50,35,700,250],[36,14,690,90],[76,60,890,400],[76,40,890,280]],
  "4-3-1-2": [[9.5,50,160,340],[26,84,540,600],[22,62,320,425],[22,38,310,255],[26,16,540,100],[46,72,690,480],[40,50,490,340],[46,28,690,200],[63,50,780,340],[78,61,900,400],[78,39,900,280]],
  "3-4-1-2": [[9.5,50,160,340],[25,72,420,540],[23,50,320,340],[25,28,420,160],[48,86,760,590],[46,62,690,460,580,500],[44,38,520,260],[48,14,760,90],[68,50,800,340],[78,61,900,400],[78,39,900,280]],
  "3-1-4-2": [[9.5,50,160,340],[25,72,420,540],[23,50,320,340],[25,28,420,160],[38,50,480,340],[52,84,780,580],[48,62,690,430],[48,38,690,250],[52,16,780,100],[78,61,900,400],[78,39,900,280]]
};

export const RADAR_LABELS = {
  off: {
    en: ["Possession","Press resistance","Verticality","Long ball","Crossing","Shot volume","Finishing","Box presence","Aerial threat","Set pieces"],
    it: ["Possesso","Resistenza Press.","Verticalità","Palle Lunghe","Cross","Volume Tiri","Cinismo","Presenza Area","Gioco Aereo","Palle Inattive"],
    desc: [
      "Gestione del pallone e controllo dei ritmi.",
      "Capacità di uscire palla a terra eludendo il primo pressing.",
      "Velocità di trasmissione verticale verso gli spazi aperti.",
      "Frequenza di lanci diretti lunghi verso le punte o cambi campo.",
      "Quantità ed efficacia dei traversoni dalle corsie esterne.",
      "Volume complessivo di conclusioni prodotte a partita.",
      "Efficacia realizzativa rispetto agli xG creati.",
      "Densità offensiva dentro l'area di rigore avversaria.",
      "Pericolosità sui duelli aerei offensivi e colpi di testa.",
      "Qualità e produzione su calci d'angolo, punizioni e rigori."
    ]
  },
  def: {
    en: ["High press","Low block","Solidity","Anticipation","Discipline","Aggressiveness","Physical duels","Endurance","Intensity","Aerial defense"],
    it: ["Pressing Alto","Blocco Basso","Solidità","Anticipo","Disciplina","Aggressività","Duelli Fisici","Resistenza","Intensità","Difesa Aerea"],
    desc: [
      "Altezza media della pressione sulla costruzione rivale.",
      "Capacità di proteggere l'area compatti nei propri 30m.",
      "Bassi Expected Goals concessi (xGA) e protezione della porta.",
      "Aggressività nell'anticipo e negli intercetti preventivi.",
      "Controllo falli e cartellini gialli/rossi subiti.",
      "Veemenza nei contrasti e nei raddoppi sul portatore.",
      "Percentuale di vittoria nei duelli fisici 1vs1.",
      "Tenuta atletica e ritmo negli ultimi 20 minuti.",
      "Rapidità di riaggressione a palla persa (PPDA basso).",
      "Capacità di respingere cross e palle alte in area."
    ]
  }
};

export const LEAGUE_LABELS = {
  serie_a: "Serie A (Italy D1)",
  premier_league: "Premier League (England D1)",
  resto_mondo: "Resto del Mondo"
};
