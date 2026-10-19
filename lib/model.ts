export type ModelFile = { name: string; content: string };
export type Bus = { name: string; baseKV: number; nodes: number[]; volts: number[]; pu: number[]; faultAmps: number[] };
export type Element = { name: string; buses: string[]; phases: number; amps: number[]; kw: number; kvar: number; lossKW: number };
export type Coord = { bus: string; x: number; y: number };
export type ProfileSegment = { name: string; d1: number; v1: number; d2: number; v2: number; phase: number };
export type Result = {
  ok: boolean; circuit: string; converged: boolean; mode: string; iterations: number;
  frequency: number; power: number[]; losses: number[]; buses: Bus[]; elements: Element[];
  engine: string; elapsedMS: number; reports: ModelFile[]; message: string; isolated: boolean;
  coords: Coord[]; profile: ProfileSegment[];
};

export const example = `! OpenDSS 三相配電範例｜60 Hz
! 範例參數僅供練習，請替換為實際電網資料。

Clear
Set DefaultBaseFrequency=60

! 電源：69 kV 公用電網
New Circuit.Demo_Feeder
~ BasekV=69 pu=1.0 Phases=3 Bus1=sourcebus
~ MVAsc3=1000 MVAsc1=1000

! 主變壓器：69 / 11.4 kV，25 MVA
New Transformer.Sub Phases=3 Windings=2 XHL=8
~ Wdg=1 Bus=sourcebus Conn=delta kV=69 kVA=25000 %R=0.5
~ Wdg=2 Bus=bus1 Conn=wye kV=11.4 kVA=25000 %R=0.5

! 饋線阻抗（每公里）
New LineCode.Feeder nphases=3 BaseFreq=60
~ R1=0.20 X1=0.40 R0=0.60 X0=0.90
~ C1=0 C0=0 Units=km

! 線路：bus1 → bus2 → bus3
New Line.L1 Bus1=bus1 Bus2=bus2 Phases=3
~ LineCode=Feeder Length=0.8 Units=km
New Line.L2 Bus1=bus2 Bus2=bus3 Phases=3
~ LineCode=Feeder Length=0.5 Units=km

! 三相負載
New Load.Load1 Bus1=bus2 Phases=3 Conn=wye
~ kV=11.4 kW=800 PF=0.95 Model=1
New Load.Load2 Bus1=bus3 Phases=3 Conn=wye
~ kV=11.4 kW=500 PF=0.95 Model=1

Set VoltageBases=[69, 11.4]
CalcVoltageBases
Set Mode=Snapshot
Solve
`;

export const exampleEn = `! OpenDSS three-phase distribution example | 60 Hz
! Example parameters are for practice only. Replace them with real network data.

Clear
Set DefaultBaseFrequency=60

! Source: 69 kV utility grid
New Circuit.Demo_Feeder
~ BasekV=69 pu=1.0 Phases=3 Bus1=sourcebus
~ MVAsc3=1000 MVAsc1=1000

! Substation transformer: 69 / 11.4 kV, 25 MVA
New Transformer.Sub Phases=3 Windings=2 XHL=8
~ Wdg=1 Bus=sourcebus Conn=delta kV=69 kVA=25000 %R=0.5
~ Wdg=2 Bus=bus1 Conn=wye kV=11.4 kVA=25000 %R=0.5

! Feeder impedance (per km)
New LineCode.Feeder nphases=3 BaseFreq=60
~ R1=0.20 X1=0.40 R0=0.60 X0=0.90
~ C1=0 C0=0 Units=km

! Lines: bus1 → bus2 → bus3
New Line.L1 Bus1=bus1 Bus2=bus2 Phases=3
~ LineCode=Feeder Length=0.8 Units=km
New Line.L2 Bus1=bus2 Bus2=bus3 Phases=3
~ LineCode=Feeder Length=0.5 Units=km

! Three-phase loads
New Load.Load1 Bus1=bus2 Phases=3 Conn=wye
~ kV=11.4 kW=800 PF=0.95 Model=1
New Load.Load2 Bus1=bus3 Phases=3 Conn=wye
~ kV=11.4 kW=500 PF=0.95 Model=1

Set VoltageBases=[69, 11.4]
CalcVoltageBases
Set Mode=Snapshot
Solve
`;
