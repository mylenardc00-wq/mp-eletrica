import { useState, useEffect } from "react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SB_URL = 'https://ihmkgqwhjhmennvvuupm.supabase.co';
const SB_KEY = 'sb_publishable_SpjXDb0OySkkCkKqNMS0rQ_TziG182Z';
const H  = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
const HU = { ...H, 'Prefer': 'resolution=merge-duplicates,return=representation' };

const sbGet    = async (t,qs='') => { const r=await fetch(`${SB_URL}/rest/v1/${t}${qs}`,{headers:H}); if(!r.ok)throw new Error(await r.text()); return r.json(); };
const sbUpsert = async (t,d)     => { const r=await fetch(`${SB_URL}/rest/v1/${t}`,{method:'POST',headers:HU,body:JSON.stringify(d)}); if(!r.ok)throw new Error(await r.text()); return r.json(); };
const sbPatch  = async (t,qs,d)  => { const r=await fetch(`${SB_URL}/rest/v1/${t}?${qs}`,{method:'PATCH',headers:{...H,'Prefer':'return=representation'},body:JSON.stringify(d)}); if(!r.ok)throw new Error(await r.text()); return r.json(); };
const sbDelete = async (t,qs)    => { const r=await fetch(`${SB_URL}/rest/v1/${t}?${qs}`,{method:'DELETE',headers:H}); if(!r.ok)throw new Error(await r.text()); };

// ─── FALLBACK LOCAL (window.storage — persiste no artifact entre sessões) ─────
const wsGet = async (k,def=null) => { try{const r=await window.storage.get(k);return r?JSON.parse(r.value):def;}catch(e){return def;} };
const wsSet = async (k,v)        => { try{await window.storage.set(k,JSON.stringify(v));}catch(e){} };

// ─── CAMADA HÍBRIDA: Supabase (Vercel) → window.storage (artifact) ────────────
const loadOrcs = async () => {
  try { return (await sbGet('orcamentos','?order=id.desc')).map(r=>r.dados); }
  catch(e) { return wsGet('mp_orcs',[]); }
};
const saveOrc = async (o) => {
  try { await sbUpsert('orcamentos',{id:o.id,dados:o}); }
  catch(e) { const c=await wsGet('mp_orcs',[]);await wsSet('mp_orcs',[...c.filter(x=>x.id!==o.id),o]); }
};
const deleteOrc = async (id) => {
  try { await sbDelete('orcamentos',`id=eq.${id}`); }
  catch(e) { const c=await wsGet('mp_orcs',[]);await wsSet('mp_orcs',c.filter(o=>o.id!==id)); }
};
const loadDesp = async () => {
  try { return await sbGet('despesas_fixas','?order=id.asc'); }
  catch(e) { return wsGet('mp_desp',[]); }
};
const patchDesp = async (id,v) => {
  try { await sbPatch('despesas_fixas',`id=eq.${id}`,{v}); }
  catch(e) { const c=await wsGet('mp_desp',[]);await wsSet('mp_desp',c.map(d=>d.id===id?{...d,v}:d)); }
};
const loadCotacao = async () => {
  try { return (await sbGet('configuracoes','?chave=eq.cotacao'))[0]?.valor||[]; }
  catch(e) { return wsGet('mp_cotacao',[]); }
};
const saveCotacao = async (lista) => {
  try { await sbUpsert('configuracoes',{chave:'cotacao',valor:lista}); }
  catch(e) { await wsSet('mp_cotacao',lista); }
};

// ─── CONSTANTES GLOBAIS ───────────────────────────────────────────────────────
const FATOR = 1.087, AJUSTE = 0.20;
const fmt  = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtK = v => v>=1000?'R$ '+(v/1000).toFixed(1).replace('.',',')+'k':fmt(v);
const round2 = v => Math.round(v*100)/100;
const calcP  = b => b * FATOR * (1+AJUSTE);
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STATUS_COR = {Orçado:'#3b82f6',Aprovado:'#8b5cf6',Executado:'#f59e0b',Pago:'#22c55e',Cancelado:'#ef4444'};
const STATUS_LIST = ['Orçado','Aprovado','Executado','Pago','Cancelado'];

const PARCELAS = [
  {label:'À vista',taxa:0.0309},{label:'2x',taxa:0.1239},{label:'3x',taxa:0.1398},
  {label:'4x',taxa:0.1411},{label:'5x',taxa:0.1706},{label:'6x',taxa:0.1707},
  {label:'7x',taxa:0.1947},{label:'8x',taxa:0.1948},{label:'9x',taxa:0.2244},
  {label:'10x',taxa:0.2340},{label:'11x',taxa:0.2341},{label:'12x',taxa:0.2486},
];

const PRECOS = [
  {s:"ARANDELA, PENDENTE OU SPOT COMUM",c:"Iluminação",min:55,med:70,max:85},
  {s:"LÂMPADA FLUORESCENTE / LED (TUBULAR)",c:"Iluminação",min:60,med:70,max:80},
  {s:"LUSTRES SIMPLES / LUMINÁRIA",c:"Iluminação",min:80,med:90,max:100},
  {s:"LUSTRES GRANDES / LUMINÁRIA",c:"Iluminação",min:120,med:135,max:150},
  {s:"REFLETOR DE JARDIM",c:"Iluminação",min:90,med:110,max:120},
  {s:"REFLETOR DE POSTE COMUM",c:"Iluminação",min:110,med:130,max:150},
  {s:"REFLETOR DE POSTE COM LÂMPADA A VAPOR",c:"Iluminação",min:110,med:130,max:150},
  {s:"INTERRUPTOR SIMPLES ou PULSADOR",c:"Iluminação",min:40,med:50,max:60},
  {s:"INTERRUPTOR TREE-WAY / FOUR WAY",c:"Iluminação",min:50,med:60,max:70},
  {s:"INTERRUPTOR DUPLO / BIPOLAR",c:"Iluminação",min:50,med:60,max:70},
  {s:"INTERRUPTOR E TOMADA (Juntos)",c:"Iluminação",min:50,med:60,max:70},
  {s:"REATOR DE LÂMPADA A VAPOR",c:"Iluminação",min:70,med:80,max:90},
  {s:"FOTOCÉLULA / SENSOR PRESENÇA",c:"Iluminação",min:70,med:85,max:100},
  {s:"REFLETOR LED + FOTOCÉLULA ou SENSOR DE PRESENÇA",c:"Iluminação",min:60,med:75,max:90},
  {s:"LUMINÁRIA DE EMERGÊNCIA DE SOBREPOR",c:"Iluminação",min:70,med:90,max:110},
  {s:"LUMINÁRIA DE EMERGÊNCIA DE EMBUTIR (2x4)",c:"Iluminação",min:50,med:65,max:80},
  {s:"INSTALAÇÃO PERFIL DE LED (metro linear)",c:"Iluminação",min:140,med:160,max:180},
  {s:"LUMINÁRIA TUBULAR - TROCA REATOR PARA LED",c:"Iluminação",min:70,med:85,max:100},
  {s:"TOMADA SIMPLES",c:"Ponto De Utilização",min:30,med:40,max:50},
  {s:"TOMADA DUPLA",c:"Ponto De Utilização",min:40,med:50,max:60},
  {s:"TOMADA TRIPLA",c:"Ponto De Utilização",min:50,med:60,max:70},
  {s:"TOMADA DE PISO E/OU TELEFONE",c:"Ponto De Utilização",min:50,med:60,max:70},
  {s:"TOMADA INDUSTRIAL (3P+T)",c:"Ponto De Utilização",min:80,med:100,max:120},
  {s:"TOMADA DE SOBREPOR COM CANALETA",c:"Ponto De Utilização",min:50,med:60,max:70},
  {s:"CHAVE DE BÓIA SUPERIOR E INFERIOR",c:"Ponto De Utilização",min:100,med:120,max:140},
  {s:"VENTILADOR DE TETO",c:"Ponto De Utilização",min:120,med:140,max:160},
  {s:"VENTILADOR DE PAREDE",c:"Ponto De Utilização",min:80,med:90,max:100},
  {s:"CHUVEIRO ELÉTRICO SIMPLES",c:"Ponto De Utilização",min:80,med:90,max:100},
  {s:"CHUVEIRO LUXO (Eletrônico/Pressurizado/Ducha)",c:"Ponto De Utilização",min:120,med:135,max:150},
  {s:"TROCA DE RESISTÊNCIA DE CHUVEIRO",c:"Ponto De Utilização",min:70,med:80,max:90},
  {s:"TORNEIRA ELÉTRICA",c:"Ponto De Utilização",min:80,med:90,max:100},
  {s:"CAMPAINHA ATÉ 20 MTS",c:"Ponto De Utilização",min:60,med:70,max:80},
  {s:"INTERFONE 1 CHAMADA",c:"Ponto De Utilização",min:130,med:160,max:190},
  {s:"INTERFONE 2 CHAMADAS",c:"Ponto De Utilização",min:170,med:200,max:230},
  {s:"INTERFONE 4 CHAMADAS",c:"Ponto De Utilização",min:370,med:400,max:430},
  {s:"VIDEO PORTEIRO",c:"Ponto De Utilização",min:160,med:185,max:200},
  {s:"CÂMERA CFTV WI-FI (1 câmera)",c:"Ponto De Utilização",min:130,med:150,max:170},
  {s:"CÂMERAS CFTV WI-FI (3 câmeras)",c:"Ponto De Utilização",min:310,med:330,max:350},
  {s:"PORTÃO ELETRÔNICO DESLIZANTE",c:"Ponto De Utilização",min:230,med:250,max:270},
  {s:"PORTÃO ELETRÔNICO PIVOTANTE / BASCULANTE",c:"Ponto De Utilização",min:430,med:460,max:490},
  {s:"BOTOEIRA FECHADURA ELETRÔNICA",c:"Ponto De Utilização",min:50,med:60,max:70},
  {s:"FECHADURA ELETRÔNICA (Portão Social)",c:"Ponto De Utilização",min:130,med:150,max:170},
  {s:"EXAUSTOR COZINHA OU BANHEIRO",c:"Ponto De Utilização",min:200,med:220,max:240},
  {s:"SISTEMA DE ALARME RESIDENCIAL",c:"Ponto De Utilização",min:700,med:850,max:1000},
  {s:"AQUECEDOR ELÉTRICO (com passagem de cabos)",c:"Ponto De Utilização",min:1800,med:2200,max:2700},
  {s:"DETECTOR DE FUMAÇA",c:"Ponto De Utilização",min:1000,med:1500,max:2000},
  {s:"CERCA ELÉTRICA (por metro)",c:"Ponto De Utilização",min:50,med:70,max:90},
  {s:"INSTALAÇÃO DE NOBREAK",c:"Ponto De Utilização",min:250,med:280,max:310},
  {s:"AQUECEDOR A GÁS",c:"Ponto De Utilização",min:270,med:320,max:370},
  {s:"TERMOSTATO / TEMPORIZADOR",c:"Ponto De Utilização",min:80,med:90,max:100},
  {s:"DISJUNTOR MONOFÁSICO",c:"Quadros / Painel",min:40,med:50,max:60},
  {s:"DISJUNTOR BIFÁSICO",c:"Quadros / Painel",min:60,med:70,max:80},
  {s:"DISJUNTOR TRIFÁSICO",c:"Quadros / Painel",min:90,med:100,max:110},
  {s:"IDR (INTERRUPTOR DIFERENCIAL RESIDUAL)",c:"Quadros / Painel",min:110,med:130,max:150},
  {s:"DPS - PROTEÇÃO CONTRA SURTOS",c:"Quadros / Painel",min:95,med:110,max:125},
  {s:"BARRAMENTO PENTE MONOPOLAR NO QDC",c:"Quadros / Painel",min:45,med:60,max:75},
  {s:"BARRAMENTO PENTE BIPOLAR NO QDC",c:"Quadros / Painel",min:55,med:70,max:85},
  {s:"BARRAMENTO PENTE TRIPOLAR NO QDC",c:"Quadros / Painel",min:65,med:80,max:95},
  {s:"BARRAMENTO DE NEUTRO e/ou TERRA",c:"Quadros / Painel",min:65,med:80,max:95},
  {s:"HASTE DE ATERRAMENTO",c:"Quadros / Painel",min:160,med:180,max:200},
  {s:"CONTATOR E/OU RELÉ TÉRMICO",c:"Quadros / Painel",min:170,med:200,max:230},
  {s:"QDC 6 CIRCUITOS + DR + DPS",c:"Quadros / Painel",min:460,med:485,max:510},
  {s:"QDC 12 CIRCUITOS + DR + DPS",c:"Quadros / Painel",min:700,med:725,max:750},
  {s:"QDC 18 CIRCUITOS + DR + DPS",c:"Quadros / Painel",min:875,med:900,max:925},
  {s:"QDC 24 CIRCUITOS + DR + DPS",c:"Quadros / Painel",min:1170,med:1200,max:1230},
  {s:"ENTRADA MONOFÁSICA (QM → QDC)",c:"Passagem De Cabos",min:160,med:190,max:220},
  {s:"ENTRADA BIFÁSICA OU TRIFÁSICA (QM → QDC)",c:"Passagem De Cabos",min:220,med:250,max:280},
  {s:"ALIMENTAÇÃO PARA MOTORES",c:"Passagem De Cabos",min:150,med:180,max:210},
  {s:"CURTO CIRCUITO MONOFÁSICO",c:"Passagem De Cabos",min:120,med:150,max:180},
  {s:"CURTO CIRCUITO BIFÁSICO",c:"Passagem De Cabos",min:150,med:180,max:210},
  {s:"CURTO CIRCUITO TRIFÁSICO",c:"Passagem De Cabos",min:170,med:200,max:230},
  {s:"MEDIDOR MONOFÁSICO 127V ou 220V",c:"Passagem De Cabos",min:1000,med:1300,max:1600},
  {s:"MEDIDOR BIFÁSICO 220V",c:"Passagem De Cabos",min:1200,med:1500,max:1800},
  {s:"MEDIDOR TRIFÁSICO 220V",c:"Passagem De Cabos",min:1400,med:1700,max:2000},
  {s:"LIMPEZA TUBULAÇÃO AR CONDICIONADO",c:"Ar Condicionado",min:50,med:60,max:70},
  {s:"ALIMENTAÇÃO ELÉTRICA PARA AR CONDICIONADO",c:"Ar Condicionado",min:90,med:110,max:130},
  {s:"SPLIT INVERTER 9.000 BTU",c:"Ar Condicionado",min:450,med:500,max:550},
  {s:"SPLIT INVERTER 12.000 BTU",c:"Ar Condicionado",min:450,med:500,max:550},
  {s:"SPLIT INVERTER 18.000 BTU",c:"Ar Condicionado",min:550,med:600,max:650},
  {s:"SPLIT INVERTER 24.000 BTU",c:"Ar Condicionado",min:650,med:700,max:750},
  {s:"SPLIT INVERTER 30.000 BTU",c:"Ar Condicionado",min:800,med:850,max:900},
  {s:"AR CONDICIONADO ON/OFF 9.000 BTU",c:"Ar Condicionado",min:400,med:440,max:480},
  {s:"AR CONDICIONADO ON/OFF 12.000 BTU",c:"Ar Condicionado",min:450,med:490,max:530},
  {s:"AR CONDICIONADO ON/OFF 18.000 BTU",c:"Ar Condicionado",min:500,med:540,max:580},
  {s:"AR CONDICIONADO ON/OFF 24.000 BTU",c:"Ar Condicionado",min:600,med:640,max:680},
  {s:"AR CONDICIONADO ON/OFF 30.000 BTU",c:"Ar Condicionado",min:700,med:740,max:780},
  {s:"ATENDIMENTO EMERGENCIAL (Final de semana)",c:"Emergencial",min:210,med:240,max:270},
  {s:"ATENDIMENTO EMERGENCIAL (Durante a semana)",c:"Emergencial",min:150,med:180,max:210},
  {s:"PAINEL SOLAR (Gerador 8kWp)",c:"Emergencial",min:7500,med:8000,max:8500},
  {s:"QUADRO DE PROTEÇÃO WALLBOX",c:"Emergencial",min:600,med:625,max:650},
];

const MATERIAIS = [
  {n:"BARRAMENTO TRIFÁSICO 150A 16 MINI DISJ DIN",u:"UN",p:308.30},
  {n:"BORNEIRA 12 FUROS C/SUP DIN AZUL ENERBRAS",u:"UN",p:15.29},
  {n:"BORNEIRA 12 FUROS C/SUP DIN VERDE ENERBRAS",u:"UN",p:15.29},
  {n:"CABINHO 750V 2,5MM AZUL (ROLO 100MTS)",u:"RL",p:214.39},
  {n:"CABINHO 750V 2,5MM BRANCO (ROLO 100MTS)",u:"RL",p:214.39},
  {n:"CABINHO 750V 2,5MM PRETO (ROLO 100MTS)",u:"RL",p:214.39},
  {n:"CABINHO 750V 6,0MM VERMELHO (ROLO 100MTS)",u:"RL",p:526.79},
  {n:"CABO 750V FLEX 10MM PRETO (METRO)",u:"MT",p:12.36},
  {n:"CABO 750V FLEX 10MM PRETO (ROLO 100MTS)",u:"RL",p:911.79},
  {n:"CABO DE COBRE NU 10MM (METRO)",u:"MT",p:5.64},
  {n:"CAIXA DE ATERRAMENTO PEQUENA",u:"UN",p:3.95},
  {n:"CONECTOR DE PORCELANA 3P 16MM 68A 600V",u:"UN",p:5.10},
  {n:"CONECTOR DERIVAÇÃO PERFURANTE CDP-150-35",u:"UN",p:28.74},
  {n:"CONTATOR 3P 50A 1NA+1NF 660V 220V",u:"UN",p:445.15},
  {n:"DISJUNTOR CAIXA MOLDADA TRIPOLAR 125A",u:"UN",p:358.60},
  {n:"DISJUNTOR MINI 1P 16A CURVA C 3KA",u:"UN",p:7.90},
  {n:"DISJUNTOR MINI 3P 100A CURVA C 10KA",u:"UN",p:211.15},
  {n:"DISJUNTOR MINI 3P 125A CURVA C 10KA",u:"UN",p:297.64},
  {n:"DISJUNTOR MINI 3P 80A CURVA C 10KA",u:"UN",p:211.15},
  {n:"EVIDENCE 2 TOMADAS 4X2 PAD 2P+T 10A FAME",u:"UN",p:26.10},
  {n:"EVIDENCE 2 TOMADAS 4X2 PAD 2P+T 20A FAME",u:"UN",p:29.50},
  {n:"EVIDENCE 3 TOMADAS 4X2 PAD 2P+T 10A FAME",u:"UN",p:31.49},
  {n:"EVIDENCE INTERRUPTOR 4X2 3 SIMPLES 16A",u:"UN",p:32.79},
  {n:"EVIDENCE INTERRUPTOR 4X2 SIMPLES 16A",u:"UN",p:13.10},
  {n:"EVIDENCE INTERRUPTOR MÓDULO SIMPLES 16A",u:"UN",p:8.60},
  {n:"EVIDENCE INTERRUPTOR SIMPLES + TOM 10A",u:"UN",p:20.65},
  {n:"EVIDENCE INTERRUPTOR SIMPLES + TOM 20A",u:"UN",p:25.58},
  {n:"EVIDENCE PLACA 4X2 C/SUPORTE 01 MÓDULO",u:"UN",p:5.50},
  {n:"EVIDENCE PLACA 4X4 C/SUPORTE 4 MOD",u:"UN",p:9.50},
  {n:"EVIDENCE TOMADA 4X2 PAD 2P+T 10A",u:"UN",p:24.77},
  {n:"EVIDENCE TOMADA 4X2 PAD 2P+T 20A",u:"UN",p:14.05},
  {n:"EVIDENCE TOMADA MÓDULO PAD 2P+T 10A",u:"UN",p:8.39},
  {n:"EVIDENCE TOMADA MÓDULO PAD 2P+T 20A",u:"UN",p:11.20},
  {n:"GRAMPO ATERRAMENTO 3/4\"",u:"UN",p:20.47},
  {n:"HASTE ATERRAMENTO BC 5/8X1,00MT",u:"UN",p:41.16},
  {n:"LUM LED SOBREPOR QUADRADO 24W 6500K",u:"UN",p:39.50},
  {n:"PLAFON EMBUTIR QUADRADO 18W 6500K",u:"UN",p:21.69},
  {n:"PLAFON EMBUTIR QUADRADO 24W 6500K",u:"PC",p:44.50},
  {n:"QUADRO DISTRIB. SOBREPOR 6/8 DISJ TIGRE",u:"UN",p:108.50},
  {n:"QUADRO DISJ EMBUTIR 16 NEMA / 24 DIN FAME",u:"UN",p:196.50},
  {n:"TERMINAL COMPRESSÃO 1F/1C 10MM",u:"UN",p:1.30},
  {n:"TERMINAL GARFO M4 1,5/2,5MM PCT 100",u:"PCT",p:23.66},
  {n:"TERMINAL OLHAL M5 1,5/2,5MM PCT 100",u:"PCT",p:19.80},
  {n:"TERMINAL OLHAL M6 10MM PCT 50",u:"PCT",p:73.46},
  {n:"TERMINAL PINO 1,5/2,5MM PCT 100",u:"PCT",p:17.94},
  {n:"TOMADA DUPLA 2P+T 10A SOBREPOR ENERBRAS",u:"UN",p:18.93},
];

const DESP_FIXAS_DEFAULT = [
  {id:1,cat:"MEI / DAS ou Impostos",v:80.90},
  {id:2,cat:"Contador",v:0},
  {id:3,cat:"Telefone / Internet",v:408.00},
  {id:4,cat:"Ferramentas (manutenção)",v:0},
  {id:5,cat:"WIX (site)",v:42.00},
  {id:6,cat:"OLX",v:115.00},
  {id:7,cat:"Google Ads",v:400.00},
  {id:8,cat:"Canva",v:28.00},
  {id:9,cat:"TIM (celular)",v:160.00},
  {id:10,cat:"ChatGPT",v:99.90},
  {id:11,cat:"Domínio",v:3.33},
  {id:12,cat:"Outros Fixos",v:0},
];

const CATS = [...new Set(PRECOS.map(p=>p.c))];
const iStyle = {width:'100%',padding:'10px 12px',border:'1.5px solid #dde3f0',borderRadius:8,fontSize:14,fontFamily:'system-ui',boxSizing:'border-box',background:'#fff',outline:'none'};
const lStyle = {fontSize:10,fontWeight:700,color:'#8892a4',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Hdr({onBack,title,right}){return(<div style={{background:'linear-gradient(90deg,#0d1b3e,#1a2f5e)',padding:'14px 16px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:10}}>{onBack&&<button onClick={onBack} style={{background:'none',border:'none',color:'#F5C200',fontSize:24,cursor:'pointer',padding:0,lineHeight:1}}>‹</button>}<span style={{color:'#fff',fontWeight:800,fontSize:17,flex:1}}>{title}</span>{right}</div>);}
function Card({title,children,style={}}){return(<div style={{background:'#fff',borderRadius:14,padding:16,border:'1px solid #e0e6f4',...style}}>{title&&<div style={{fontWeight:800,fontSize:13,color:'#1a2f5e',marginBottom:12,textTransform:'uppercase',letterSpacing:0.5}}>{title}</div>}{children}</div>);}
function Toggle({val,onChange,label,sub}){return(<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}><div><div style={{fontSize:13,fontWeight:600,color:'#1a2f5e'}}>{label}</div>{sub&&<div style={{fontSize:11,color:'#8892a4'}}>{sub}</div>}</div><div onClick={()=>onChange(!val)} style={{width:44,height:24,background:val?'#F5C200':'#dde3f0',borderRadius:12,cursor:'pointer',position:'relative',transition:'.2s',flexShrink:0}}><div style={{position:'absolute',top:2,left:val?22:2,width:20,height:20,background:'#fff',borderRadius:'50%',transition:'.2s',boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}/></div></div>);}
function Btn({label,onClick}){return<button onClick={onClick} style={{background:'#0d1b3e',color:'#F5C200',border:'none',borderRadius:12,padding:'13px',fontWeight:800,fontSize:14,cursor:'pointer',width:'100%'}}>{label}</button>;}
function Btn2({label,onClick,dark,danger}){return<button onClick={onClick} style={{background:dark?'#0d1b3e':danger?'#fee2e2':'#e8edf5',color:dark?'#F5C200':danger?'#ef4444':'#1a2f5e',border:'none',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>{label}</button>;}
function StatusBadge({s}){const cor=STATUS_COR[s]||'#888';return<span style={{background:cor+'22',color:cor,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>{s}</span>;}

function LoadingScreen(){
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0a1630,#1a2f5e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'system-ui',gap:16}}>
      <div style={{width:72,height:72,background:'#F5C200',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 30px rgba(245,194,0,.5)',animation:'pulse 1.5s infinite'}}>
        <svg viewBox="0 0 24 24" fill="#0d1b3e" style={{width:36,height:36}}><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>
      </div>
      <div style={{color:'#fff',fontWeight:700,fontSize:16}}>Carregando...</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </div>
  );
}

function ErroScreen({msg,onRetry}){
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0a1630,#1a2f5e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'system-ui',gap:16,padding:24}}>
      <div style={{fontSize:48}}>⚠️</div>
      <div style={{color:'#fff',fontWeight:700,fontSize:16,textAlign:'center'}}>Erro de conexão</div>
      <div style={{color:'rgba(255,255,255,.6)',fontSize:13,textAlign:'center',maxWidth:300}}>{msg}</div>
      <button onClick={onRetry} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:10,padding:'12px 28px',fontWeight:800,cursor:'pointer',fontSize:15}}>Tentar novamente</button>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({qtd,onNovo,onHistorico,onTabela,onDashboard,onDRE,onMateriais}){
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0a1630 0%,#1a2f5e 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui,sans-serif'}}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <div style={{width:88,height:88,background:'#F5C200',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 0 40px rgba(245,194,0,.4)'}}>
          <svg viewBox="0 0 24 24" fill="#0d1b3e" style={{width:44,height:44}}><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>
        </div>
        <h1 style={{color:'#fff',fontSize:30,fontWeight:900,margin:0,letterSpacing:1}}>MP ELÉTRICA</h1>
        <p style={{color:'#F5C200',fontSize:11,margin:'5px 0 0',letterSpacing:3,fontWeight:600}}>SOLUÇÕES EM SERVIÇOS ELÉTRICOS</p>
      </div>
      <div style={{width:'100%',maxWidth:380,display:'flex',flexDirection:'column',gap:10}}>
        {[
          {icon:'📋',label:'Novo Orçamento',sub:'Criar orçamento para cliente',primary:true,onClick:onNovo},
          {icon:'🗂️',label:'Orçamentos Salvos',sub:`${qtd} orçamento(s) registrado(s)`,onClick:onHistorico},
          {icon:'📈',label:'Dashboard',sub:'Gráficos e indicadores',onClick:onDashboard},
          {icon:'📑',label:'DRE Mensal',sub:'Receitas, despesas e lucro',onClick:onDRE},
          {icon:'🔩',label:'Materiais',sub:'Consultar e cotar materiais',onClick:onMateriais},
          {icon:'📊',label:'Tabela de Preços',sub:'Consultar serviços e valores',onClick:onTabela},
        ].map(b=>(
          <button key={b.label} onClick={b.onClick} style={{background:b.primary?'#F5C200':'rgba(255,255,255,.07)',color:b.primary?'#0d1b3e':'#fff',border:b.primary?'none':'1.5px solid rgba(245,194,0,.3)',borderRadius:14,padding:'13px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',textAlign:'left',width:'100%'}}>
            <span style={{fontSize:22}}>{b.icon}</span>
            <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14}}>{b.label}</div><div style={{fontSize:11,opacity:.7,marginTop:1}}>{b.sub}</div></div>
            <span style={{opacity:.4,fontSize:18}}>›</span>
          </button>
        ))}
      </div>
      <p style={{color:'rgba(255,255,255,.2)',fontSize:10,marginTop:28}}>MP Elétrica © 2026 — v3.0 ☁️ Supabase</p>
    </div>
  );
}

// ─── ORÇAMENTO ────────────────────────────────────────────────────────────────
function Orcamento({orc,onSalvar,onVoltar,saving}){
  const hoje=new Date().toISOString().split('T')[0];
  const [aba,setAba]=useState('cliente');
  const [cli,setCli]=useState(orc?.cli||{nome:'',contato:'',endereco:'',cidade:'Rio de Janeiro/RJ',tipo:'Residencial',pgto:'',data:hoje,validade:'30 dias'});
  const [itens,setItens]=useState(orc?.itens||[]);
  const [ex,setEx]=useState(orc?.ex||{mat:0,frete:0,imp:0,moExtra:0,almoco:0,art:0,risco:false});
  const [desl,setDesl]=useState(orc?.desl||{km:0,gas:7,kml:10,desg:0.5,dias:1});
  const [desc,setDesc]=useState(orc?.desc||0);
  const [parcelas,setParcelas]=useState(orc?.parcelas||'6x');
  const [busca,setBusca]=useState('');
  const [catF,setCatF]=useState('Todas');
  const [showTab,setShowTab]=useState(false);

  const moTotal=itens.reduce((s,i)=>s+i.sub,0);
  const exTotal=(ex.mat||0)+(ex.frete||0)+(ex.imp||0)+(ex.moExtra||0)+(ex.almoco||0)+(ex.art||0);
  const custoD=desl.km>0?((desl.km/desl.kml)*desl.gas+desl.km*desl.desg)*desl.dias:0;
  const base=moTotal+exTotal+custoD-(desc||0);
  const risco=ex.risco?base*0.2:0;
  const total=base+risco;
  const parcInfo=PARCELAS.find(p=>p.label===parcelas)||PARCELAS[5];
  const taxa=parcInfo.taxa;
  const totalTaxa=total>0?round2(total/(1-taxa)):0;

  const addItem=p=>{setItens(prev=>[...prev,{id:Date.now(),s:p.s,c:p.c,nivel:'Médio',qty:1,base:p.med,sub:calcP(p.med)}]);setShowTab(false);setAba('itens');};
  const updItem=(id,campo,val)=>setItens(prev=>prev.map(i=>{if(i.id!==id)return i;const n={...i,[campo]:val};if(campo==='nivel'){const ref=PRECOS.find(p=>p.s===i.s);if(ref)n.base=val==='Mínimo'?ref.min:val==='Médio'?ref.med:ref.max;}n.sub=calcP(n.base)*(n.qty||1);return n;}));
  const doSalvar=()=>onSalvar({id:orc?.id||Date.now(),criadoEm:orc?.criadoEm||new Date().toISOString(),cli,itens,ex,desl,desc,parcelas,total,totalTaxa,status:orc?.status||'Orçado'});
  const filtered=PRECOS.filter(p=>(catF==='Todas'||p.c===catF)&&p.s.toLowerCase().includes(busca.toLowerCase()));
  const ABAS=[['cliente','👤 Cliente'],['itens','🔧 Serviços'],['extras','➕ Extras'],['resumo','💰 Resumo']];

  return(
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'system-ui,sans-serif'}}>
      <Hdr onBack={onVoltar} title={orc?'Editar Orçamento':'Novo Orçamento'}/>
      <div style={{display:'flex',background:'#0d1b3e'}}>
        {ABAS.map(([k,v])=><button key={k} onClick={()=>setAba(k)} style={{flex:1,padding:'10px 2px',border:'none',background:'none',color:aba===k?'#F5C200':'#8892a4',borderBottom:aba===k?'2.5px solid #F5C200':'2.5px solid transparent',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{v}</button>)}
      </div>
      <div style={{padding:'16px 14px',maxWidth:600,margin:'0 auto',paddingBottom:40}}>
        {aba==='cliente'&&(<div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Card title="Dados do Cliente">
            {[['Nome *','nome','text','Ex: João Silva'],['Contato / WhatsApp','contato','tel','(21) 99999-9999'],['Endereço','endereco','text','Rua, número, bairro'],['Cidade / UF','cidade','text','Rio de Janeiro/RJ']].map(([lbl,key,tp,ph])=>(<div key={key} style={{marginBottom:10}}><label style={lStyle}>{lbl}</label><input type={tp} value={cli[key]} onChange={e=>setCli({...cli,[key]:e.target.value})} placeholder={ph} style={iStyle}/></div>))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={lStyle}>Tipo</label><select value={cli.tipo} onChange={e=>setCli({...cli,tipo:e.target.value})} style={iStyle}>{['Residencial','Comercial','Industrial','Visita técnica','Manutenção recorrente','Outro'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lStyle}>Forma de Pgto</label><select value={cli.pgto} onChange={e=>setCli({...cli,pgto:e.target.value})} style={iStyle}>{['','Pix','Dinheiro','Débito','Crédito','Boleto','Transferência','Nota de Empenho'].map(t=><option key={t} value={t}>{t||'— Selecione —'}</option>)}</select></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={lStyle}>Data</label><input type="date" value={cli.data} onChange={e=>setCli({...cli,data:e.target.value})} style={iStyle}/></div>
              <div><label style={lStyle}>Validade</label><select value={cli.validade} onChange={e=>setCli({...cli,validade:e.target.value})} style={iStyle}>{['7 dias úteis','15 dias','30 dias','45 dias','60 dias','90 dias'].map(t=><option key={t}>{t}</option>)}</select></div>
            </div>
          </Card>
          <Btn label="Avançar para Serviços →" onClick={()=>setAba('itens')}/>
        </div>)}
        {aba==='itens'&&(<div style={{display:'flex',flexDirection:'column',gap:12}}>
          <button onClick={()=>setShowTab(!showTab)} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:12,padding:'13px 20px',fontWeight:800,fontSize:15,cursor:'pointer'}}>{showTab?'✕ Fechar catálogo':'＋ Adicionar Serviço'}</button>
          {showTab&&(<Card title="Catálogo de Serviços">
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar serviço..." style={{...iStyle,marginBottom:10}}/>
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:8}}>{['Todas',...CATS].map(c=><button key={c} onClick={()=>setCatF(c)} style={{background:catF===c?'#F5C200':'#e8edf5',color:catF===c?'#0d1b3e':'#666',border:'none',borderRadius:20,padding:'4px 11px',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{c}</button>)}</div>
            <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
              {filtered.map(p=><button key={p.s} onClick={()=>addItem(p)} style={{background:'#f8fafc',border:'1px solid #e8edf5',borderRadius:8,padding:'9px 12px',textAlign:'left',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'#1a2f5e'}}>{p.s}</div><div style={{fontSize:10,color:'#8892a4'}}>{p.c}</div></div><div style={{fontSize:11,fontWeight:800,color:'#F5C200',background:'#0d1b3e',borderRadius:6,padding:'3px 8px',marginLeft:8,whiteSpace:'nowrap'}}>{fmt(calcP(p.med))}</div></button>)}
            </div>
          </Card>)}
          {itens.length===0&&!showTab&&<div style={{textAlign:'center',padding:'50px 0',color:'#8892a4'}}><div style={{fontSize:48,marginBottom:10}}>🔧</div><p style={{margin:0}}>Nenhum serviço adicionado</p></div>}
          {itens.map((it,idx)=>(<div key={it.id} style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #e0e6f4'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'#1a2f5e'}}>#{idx+1} {it.s}</div><div style={{fontSize:10,color:'#8892a4'}}>{it.c}</div></div><button onClick={()=>setItens(prev=>prev.filter(i=>i.id!==it.id))} style={{background:'#fee2e2',border:'none',borderRadius:6,padding:'3px 9px',color:'#ef4444',cursor:'pointer',fontWeight:700}}>✕</button></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={lStyle}>Nível</label><select value={it.nivel} onChange={e=>updItem(it.id,'nivel',e.target.value)} style={iStyle}>{['Mínimo','Médio','Máximo'].map(n=><option key={n}>{n}</option>)}</select></div>
              <div><label style={lStyle}>Quantidade</label><input type="number" min="1" value={it.qty} onChange={e=>updItem(it.id,'qty',parseFloat(e.target.value)||1)} style={iStyle}/></div>
            </div>
            <div style={{marginTop:10,background:'#f0f4ff',borderRadius:8,padding:'7px 12px',display:'flex',justifyContent:'space-between'}}><span style={{fontSize:12,color:'#555'}}>Subtotal</span><span style={{fontSize:13,fontWeight:800,color:'#1a2f5e'}}>{fmt(it.sub)}</span></div>
          </div>))}
          {itens.length>0&&<div style={{background:'#0d1b3e',borderRadius:10,padding:'12px 16px',display:'flex',justifyContent:'space-between'}}><span style={{color:'#8892a4',fontSize:13}}>Total mão de obra</span><span style={{color:'#F5C200',fontWeight:800,fontSize:15}}>{fmt(moTotal)}</span></div>}
          <Btn label="Avançar para Extras →" onClick={()=>setAba('extras')}/>
        </div>)}
        {aba==='extras'&&(<div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Card title="Materiais e Custos Extras">
            {[['Materiais (R$)','mat'],['Frete de material (R$)','frete'],['Impostos e taxas (R$)','imp'],['Mão de obra extra (R$)','moExtra'],['Almoço (R$)','almoco'],['ART (R$)','art']].map(([lbl,key])=>(<div key={key} style={{marginBottom:10}}><label style={lStyle}>{lbl}</label><input type="number" min="0" step="0.01" value={ex[key]||''} onChange={e=>setEx({...ex,[key]:parseFloat(e.target.value)||0})} placeholder="0" style={iStyle}/></div>))}
            <div style={{background:'#fffbeb',border:'1px solid #F5C200',borderRadius:8,padding:'10px 12px',marginTop:4}}><Toggle val={ex.risco} onChange={v=>setEx({...ex,risco:v})} label="Adicionar risco de 20%" sub="Sobre o total do orçamento"/></div>
          </Card>
          <Card title="🚗 Deslocamento">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[['KM total','km',1],['Gasolina (R$/L)','gas',0.1],['KM/L do veículo','kml',0.1],['Desgaste (R$/km)','desg',0.1],['Dias no local','dias',1]].map(([lbl,key,step])=>(<div key={key}><label style={lStyle}>{lbl}</label><input type="number" min="0" step={step} value={desl[key]||''} onChange={e=>setDesl({...desl,[key]:parseFloat(e.target.value)||0})} placeholder="0" style={iStyle}/></div>))}
            </div>
            {custoD>0&&<div style={{marginTop:10,background:'#f0f4ff',borderRadius:8,padding:'7px 12px',display:'flex',justifyContent:'space-between'}}><span style={{fontSize:12}}>Custo calculado</span><span style={{fontWeight:800,color:'#1a2f5e'}}>{fmt(custoD)}</span></div>}
          </Card>
          <Card title="🏷️ Desconto"><label style={lStyle}>Desconto (R$)</label><input type="number" min="0" step="0.01" value={desc||''} onChange={e=>setDesc(parseFloat(e.target.value)||0)} placeholder="0" style={iStyle}/></Card>
          <Btn label="Ver Resumo →" onClick={()=>setAba('resumo')}/>
        </div>)}
        {aba==='resumo'&&(<div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'linear-gradient(135deg,#0d1b3e,#1a2f5e)',borderRadius:14,padding:18,color:'#fff'}}>
            <div style={{fontSize:20,fontWeight:900}}>{cli.nome||'—'}</div>
            <div style={{fontSize:11,color:'#8892a4',marginTop:2}}>{cli.tipo} · {cli.cidade}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}>
              {[['Data',cli.data],['Validade',cli.validade],cli.contato&&['Contato',cli.contato],cli.pgto&&['Pagamento',cli.pgto]].filter(Boolean).map(([k,v])=>(<div key={k}><div style={{fontSize:9,color:'#8892a4',letterSpacing:1}}>{k.toUpperCase()}</div><div style={{fontSize:12,marginTop:1}}>{v}</div></div>))}
            </div>
          </div>
          {itens.length>0&&(<Card title={`🔧 Serviços (${itens.length})`}>{itens.map((i,idx)=>(<div key={i.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f0f4ff'}}><div style={{flex:1,fontSize:12,color:'#333',paddingRight:8}}><span style={{color:'#8892a4'}}>#{idx+1}</span> {i.s}<span style={{marginLeft:5,background:'#0d1b3e',color:'#F5C200',borderRadius:4,padding:'1px 5px',fontSize:9}}>{i.nivel}</span>{i.qty>1&&<span style={{color:'#8892a4',fontSize:10}}> ×{i.qty}</span>}</div><span style={{fontWeight:700,color:'#1a2f5e',fontSize:13,whiteSpace:'nowrap'}}>{fmt(i.sub)}</span></div>))}</Card>)}
          <Card title="💳 Parcelamento"><label style={lStyle}>Forma na maquininha</label><select value={parcelas} onChange={e=>setParcelas(e.target.value)} style={iStyle}>{PARCELAS.map(p=><option key={p.label} value={p.label}>{p.label} — taxa de {(p.taxa*100).toFixed(2).replace('.',',')}%</option>)}</select></Card>
          <Card title="💰 Resumo Financeiro">
            {[['Mão de obra',moTotal],['Materiais / Extras',exTotal],custoD>0&&['Deslocamento',custoD],desc>0&&['Desconto',-desc,'#ef4444'],ex.risco&&['Risco 20%',risco]].filter(Boolean).map(([lbl,val,cor])=>(<div key={lbl} style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}><span style={{fontSize:13,color:'#666'}}>{lbl}</span><span style={{fontWeight:700,color:cor||'#1a2f5e'}}>{fmt(val)}</span></div>))}
            <div style={{borderTop:'2px solid #e0e6f0',margin:'8px 0',paddingTop:8,display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:800,fontSize:14}}>TOTAL GERAL</span><span style={{fontWeight:900,fontSize:16,color:'#0d1b3e'}}>{fmt(total)}</span></div>
            <div style={{background:'#fffbeb',borderRadius:10,padding:'12px 14px',border:'1px solid #F5C200'}}>
              <div style={{fontSize:11,color:'#666',marginBottom:6}}>Taxa maquininha (<b>{parcelas}</b>): <b style={{color:'#0d1b3e'}}>{(taxa*100).toFixed(2).replace('.',',')}%</b></div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontWeight:800,fontSize:14,color:'#0d1b3e'}}>Total com taxa</span><span style={{fontWeight:900,fontSize:22,color:'#0d1b3e'}}>{fmt(totalTaxa)}</span></div>
            </div>
          </Card>
          <button onClick={doSalvar} disabled={saving} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:12,padding:16,fontWeight:900,fontSize:16,cursor:saving?'not-allowed':'pointer',width:'100%',opacity:saving?.7:1}}>
            {saving?'💾 Salvando...':'💾 Salvar Orçamento'}
          </button>
        </div>)}
      </div>
    </div>
  );
}

// ─── HISTÓRICO ────────────────────────────────────────────────────────────────
function Historico({lista,onNovo,onEditar,onVer,onExcluir,onVoltar}){
  const [busca,setBusca]=useState('');
  const [filtro,setFiltro]=useState('Todos');
  const [confirmId,setConfirmId]=useState(null);
  const filtrada=[...lista].sort((a,b)=>new Date(b.criadoEm)-new Date(a.criadoEm)).filter(o=>(filtro==='Todos'||o.status===filtro)&&(o.cli?.nome||'').toLowerCase().includes(busca.toLowerCase()));
  return(
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'system-ui,sans-serif'}}>
      <Hdr onBack={onVoltar} title="Orçamentos Salvos" right={<button onClick={onNovo} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:8,padding:'6px 14px',fontWeight:800,cursor:'pointer',fontSize:13}}>＋ Novo</button>}/>
      <div style={{padding:'14px 14px 0'}}>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar por cliente..." style={{...iStyle,marginBottom:10}}/>
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:10}}>{['Todos',...STATUS_LIST].map(s=><button key={s} onClick={()=>setFiltro(s)} style={{background:filtro===s?'#0d1b3e':'#e8edf5',color:filtro===s?'#F5C200':'#555',border:'none',borderRadius:20,padding:'5px 12px',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{s}</button>)}</div>
      </div>
      <div style={{padding:'0 14px 40px',maxWidth:600,margin:'0 auto',display:'flex',flexDirection:'column',gap:10}}>
        {filtrada.length===0&&<div style={{textAlign:'center',padding:'60px 0',color:'#8892a4'}}><div style={{fontSize:44}}>🗂️</div><p>Nenhum orçamento encontrado</p><button onClick={onNovo} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:10,padding:'10px 24px',fontWeight:800,cursor:'pointer'}}>Criar primeiro orçamento</button></div>}
        {filtrada.map(o=>(
          <div key={o.id} style={{background:'#fff',borderRadius:14,padding:14,border:'1px solid #e0e6f4'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><div><div style={{fontWeight:800,fontSize:15,color:'#1a2f5e'}}>{o.cli?.nome||'Sem nome'}</div><div style={{fontSize:11,color:'#8892a4'}}>{o.cli?.tipo} · {new Date(o.criadoEm).toLocaleDateString('pt-BR')}</div></div><StatusBadge s={o.status}/></div>
            {confirmId===o.id?(
              <div style={{background:'#fff5f5',border:'1px solid #fecaca',borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:13,color:'#1a2f5e',fontWeight:600,marginBottom:8}}>Excluir o orçamento de {o.cli?.nome||'cliente'}?</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{onExcluir(o.id);setConfirmId(null);}} style={{flex:1,background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:'8px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Sim, excluir</button>
                  <button onClick={()=>setConfirmId(null)} style={{flex:1,background:'#e8edf5',color:'#1a2f5e',border:'none',borderRadius:8,padding:'8px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Cancelar</button>
                </div>
              </div>
            ):(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontSize:20,fontWeight:900,color:'#0d1b3e'}}>{fmt(o.totalTaxa)}</div><div style={{fontSize:10,color:'#8892a4'}}>{o.parcelas||'—'} · sem taxa: {fmt(o.total)}</div></div>
                <div style={{display:'flex',gap:6}}><Btn2 label="Ver" onClick={()=>onVer(o)} dark/><Btn2 label="Editar" onClick={()=>onEditar(o)}/><Btn2 label="✕" onClick={()=>setConfirmId(o.id)} danger/></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VISUALIZAR ───────────────────────────────────────────────────────────────
function Visualizar({orc:o,onVoltar,onEditar,onPDF}){
  if(!o)return null;
  const parcLabel=o.parcelas||'6x';
  const parcInfo=PARCELAS.find(p=>p.label===parcLabel)||PARCELAS[5];
  const taxa=parcInfo.taxa;
  const [status,setStatus]=useState(o.status);
  return(
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'system-ui,sans-serif'}}>
      <Hdr onBack={onVoltar} title="Detalhes do Orçamento" right={<button onClick={()=>onEditar({...o,status})} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:8,padding:'6px 14px',fontWeight:800,cursor:'pointer',fontSize:13}}>Editar</button>}/>
      <div style={{padding:'16px 14px 40px',maxWidth:600,margin:'0 auto',display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:'linear-gradient(135deg,#0d1b3e,#1a2f5e)',borderRadius:14,padding:20,color:'#fff'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}><div><div style={{fontSize:22,fontWeight:900}}>{o.cli?.nome||'—'}</div><div style={{color:'#8892a4',fontSize:12,marginTop:2}}>{o.cli?.tipo} · {o.cli?.cidade}</div></div><StatusBadge s={o.status}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{[['Data',o.cli?.data],['Validade',o.cli?.validade],o.cli?.contato&&['Contato',o.cli.contato],o.cli?.pgto&&['Pagamento',o.cli.pgto]].filter(Boolean).map(([k,v])=>(<div key={k}><div style={{fontSize:9,color:'#8892a4',letterSpacing:1}}>{k.toUpperCase()}</div><div style={{fontSize:13,marginTop:2}}>{v}</div></div>))}</div>
        </div>
        <Card title="Atualizar Status"><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{STATUS_LIST.map(s=><button key={s} onClick={()=>setStatus(s)} style={{background:status===s?(STATUS_COR[s]||'#888'):'#e8edf5',color:status===s?'#fff':'#555',border:'none',borderRadius:20,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>{s}</button>)}</div></Card>
        {o.itens?.length>0&&(<Card title={`🔧 Serviços (${o.itens.length})`}>{o.itens.map((i,idx)=>(<div key={i.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f0f4ff'}}><div style={{flex:1,fontSize:12,color:'#333',paddingRight:8}}><b>{idx+1}.</b> {i.s}<span style={{marginLeft:5,background:'#0d1b3e',color:'#F5C200',borderRadius:4,padding:'1px 5px',fontSize:9}}>{i.nivel}</span>{i.qty>1&&<span style={{color:'#8892a4',fontSize:10}}> ×{i.qty}</span>}</div><span style={{fontWeight:700,color:'#1a2f5e',fontSize:13,whiteSpace:'nowrap'}}>{fmt(i.sub)}</span></div>))}</Card>)}
        <Card title="💰 Valores">
          <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}><span style={{fontSize:13,color:'#666'}}>Total geral</span><span style={{fontWeight:700,color:'#1a2f5e'}}>{fmt(o.total)}</span></div>
          <div style={{background:'#fffbeb',borderRadius:10,padding:'12px 14px',marginTop:8,border:'1px solid #F5C200'}}>
            <div style={{fontSize:11,color:'#666',marginBottom:4}}>Taxa maquininha (<b>{parcLabel}</b>): <b>{(taxa*100).toFixed(2).replace('.',',')}%</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:800,fontSize:15}}>Total com taxa</span><span style={{fontWeight:900,fontSize:24,color:'#0d1b3e'}}>{fmt(o.totalTaxa)}</span></div>
          </div>
        </Card>
        <button onClick={()=>onPDF(o)} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:12,padding:16,fontWeight:900,fontSize:16,cursor:'pointer',width:'100%',boxShadow:'0 4px 20px rgba(245,194,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>📄 Gerar PDF do Orçamento</button>
      </div>
    </div>
  );
}

// ─── TELA PDF ─────────────────────────────────────────────────────────────────
function TelaPDF({orc:o,onVoltar}){
  if(!o)return null;
  const fmtData=str=>{if(!str)return'';const d=new Date(str+'T00:00:00');if(isNaN(d))return str;return`${d.getDate()} de ${MESES_FULL[d.getMonth()]} de ${d.getFullYear()}`;};
  const fmtBR=v=>'R$ '+(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const exTotal=(o.ex?.mat||0)+(o.ex?.frete||0)+(o.ex?.imp||0)+(o.ex?.moExtra||0)+(o.ex?.almoco||0)+(o.ex?.art||0);
  const custoD=o.desl?.km>0?((o.desl.km/o.desl.kml)*o.desl.gas+o.desl.km*o.desl.desg)*o.desl.dias:0;
  const rows=[];
  (o.itens||[]).forEach(it=>rows.push({desc:it.s,preco:fmtBR(it.sub/(it.qty||1)),qt:it.qty,total:fmtBR(it.sub)}));
  if(exTotal>0)rows.push({desc:'Materiais e custos extras',preco:'—',qt:1,total:fmtBR(exTotal)});
  if(custoD>0)rows.push({desc:'Deslocamento até o local',preco:'—',qt:o.desl.dias,total:fmtBR(custoD)});
  while(rows.length<6)rows.push({desc:'\u00A0',preco:'',qt:'',total:''});
  const condPgto=o.parcelas==='À vista'?'À vista (Pix, Dinheiro ou Cartão de Débito)':`Até ${o.parcelas||'6x'} no cartão de crédito s/ juros.`;
  const td={padding:'14px 12px',fontSize:13,color:'#1a2f5e',border:'1px solid #1a2f5e',height:42};
  const tdC={...td,textAlign:'center'};
  const th={padding:'14px 12px',fontSize:14,fontWeight:800,letterSpacing:1,textAlign:'center',border:'1px solid #1a2f5e'};
  return(
    <div style={{minHeight:'100vh',background:'#e8eaf0',fontFamily:"'Helvetica','Arial',sans-serif"}}>
      <style>{`@media print{.no-print{display:none!important}.pdf-wrap{background:#fff!important;padding:0!important}.pdf-page{box-shadow:none!important;margin:0!important}@page{size:A4;margin:0}}`}</style>
      <div className="no-print" style={{position:'sticky',top:0,zIndex:10,background:'#0d1b3e',padding:'12px 16px',display:'flex',gap:10,alignItems:'center'}}>
        <button onClick={onVoltar} style={{background:'none',border:'none',color:'#F5C200',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{color:'#fff',fontWeight:800,fontSize:15,flex:1}}>Pré-visualização do PDF</span>
        <button onClick={()=>window.print()} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:8,padding:'8px 16px',fontWeight:800,cursor:'pointer',fontSize:13}}>🖨️ Imprimir / Salvar PDF</button>
      </div>
      <div className="no-print" style={{textAlign:'center',color:'#64748b',fontSize:12,padding:'12px 16px 0'}}>Toque em "Imprimir / Salvar PDF" e escolha <b>"Salvar como PDF"</b></div>
      <div className="pdf-wrap" style={{padding:'16px 0',overflowX:'auto'}}>
        <div className="pdf-page" style={{width:'210mm',maxWidth:'100%',minHeight:'297mm',margin:'0 auto',background:'#fff',position:'relative',overflow:'hidden',boxShadow:'0 4px 30px rgba(0,0,0,.12)',WebkitPrintColorAdjust:'exact',printColorAdjust:'exact'}}>
          <div style={{background:'#0d1b3e',height:140,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,width:80,height:110,background:'#F5C200',clipPath:'polygon(0 0,100% 0,0 100%)'}}/>
            <div style={{position:'absolute',top:0,right:0,width:210,height:140,background:'#F5C200',clipPath:'polygon(45% 0,100% 0,100% 100%)'}}/>
            <div style={{position:'absolute',bottom:0,right:0,width:110,height:60,background:'#F5C200',clipPath:'polygon(100% 0,100% 100%,0 100%)'}}/>
            <div style={{position:'relative',zIndex:2,height:'100%',display:'flex',alignItems:'center',padding:'0 40px',justifyContent:'space-between'}}>
              <div style={{color:'#fff',fontSize:11,lineHeight:1.9}}>📞 (21) 96656-9618<br/>🌐 mpeletricaservicos.com.br</div>
              <div style={{display:'flex',alignItems:'center',gap:14,marginRight:50,position:'relative',zIndex:3}}>
                <div style={{width:65,height:65,borderRadius:'50%',background:'#F5C200',display:'flex',alignItems:'center',justifyContent:'center'}}><svg viewBox="0 0 24 24" fill="#0d1b3e" style={{width:36,height:36}}><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg></div>
                <div><div style={{fontSize:30,fontWeight:900,color:'#fff',letterSpacing:1,lineHeight:1}}>MP ELÉTRICA</div><div style={{fontSize:9,color:'#fff',letterSpacing:1.5,marginTop:4}}>SOLUÇÕES EM SERVIÇOS ELÉTRICOS</div></div>
              </div>
            </div>
          </div>
          <div style={{padding:'35px 40px 5px'}}>
            <div style={{background:'#ededf0',borderRadius:10,padding:'13px 24px',marginBottom:10,fontSize:15,fontWeight:700,color:'#1a2f5e'}}>NOME: {(o.cli?.nome||'').toUpperCase()}</div>
            <div style={{background:'#ededf0',borderRadius:10,padding:'13px 24px',fontSize:15,fontWeight:700,color:'#1a2f5e'}}>TELEFONE: {o.cli?.contato||''}</div>
          </div>
          <div style={{padding:'25px 40px 8px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}><h1 style={{fontSize:56,fontWeight:900,color:'#1a2f5e',lineHeight:1,margin:0}}>Orçamento</h1><div style={{fontSize:16,fontWeight:700,color:'#1a2f5e',paddingBottom:10}}>{fmtData(o.cli?.data)}</div></div>
          <div style={{height:2,background:'#1a2f5e',margin:'0 40px 18px'}}/>
          <div style={{padding:'0 40px'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#1a2f5e',color:'#fff'}}><th style={{...th,textAlign:'left',paddingLeft:20}}>DESCRIÇÃO</th><th style={th}>PREÇO</th><th style={th}>QT.</th><th style={th}>TOTAL</th></tr></thead>
              <tbody>{rows.map((r,i)=><tr key={i}><td style={{...td,paddingLeft:20}}>{r.desc}</td><td style={tdC}>{r.preco}</td><td style={tdC}>{r.qt}</td><td style={tdC}>{r.total}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={3} style={{border:'none'}}></td><td style={{border:'1px solid #1a2f5e',textAlign:'center',background:'#fff',padding:'14px 20px',fontSize:18,fontWeight:900,color:'#1a2f5e'}}>Total: {fmtBR(o.totalTaxa)}</td></tr></tfoot>
            </table>
          </div>
          <div style={{padding:'30px 40px',fontSize:16,color:'#1a2f5e',lineHeight:2.1}}>
            <div><strong style={{fontWeight:900}}>Validade do Orçamento:</strong> {o.cli?.validade||'30 dias'}</div>
            <div><strong style={{fontWeight:900}}>Condição de pagamento:</strong> {condPgto}</div>
            <div><strong style={{fontWeight:900}}>Observação:</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({orcs,onVoltar}){
  const [periodo,setPeriodo]=useState('ano');
  const ano=new Date().getFullYear(),mes=new Date().getMonth();
  const filtrar=o=>{const d=new Date(o.criadoEm);if(periodo==='mes')return d.getMonth()===mes&&d.getFullYear()===ano;if(periodo==='ano')return d.getFullYear()===ano;return true;};
  const lista=orcs.filter(filtrar);
  const faturado=lista.filter(o=>o.status==='Pago').reduce((s,o)=>s+(o.totalTaxa||0),0);
  const pendente=lista.filter(o=>['Orçado','Aprovado','Executado'].includes(o.status)).reduce((s,o)=>s+(o.totalTaxa||0),0);
  const ticket=lista.length?lista.reduce((s,o)=>s+(o.totalTaxa||0),0)/lista.length:0;
  const aprovacao=lista.length?(lista.filter(o=>['Aprovado','Executado','Pago'].includes(o.status)).length/lista.length)*100:0;
  const mesesBar=Array.from({length:8},(_,i)=>{const m=(mes-7+i+12)%12,a=mes-7+i<0?ano-1:ano;const v=orcs.filter(o=>{const d=new Date(o.criadoEm);return d.getMonth()===m&&d.getFullYear()===a;}).reduce((s,o)=>s+(o.totalTaxa||0),0);return{label:MESES[m],v,hl:m===mes};});
  const maxBar=Math.max(...mesesBar.map(d=>d.v),1);
  const porStatus=['Orçado','Aprovado','Executado','Pago','Cancelado'].map(s=>({label:s,v:lista.filter(o=>o.status===s).length,cor:STATUS_COR[s]}));
  const servCount={};lista.forEach(o=>(o.itens||[]).forEach(it=>{servCount[it.s]=(servCount[it.s]||0)+(it.qty||1);}));
  const topServ=Object.entries(servCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxServ=topServ[0]?.[1]||1;
  const c={background:'rgba(255,255,255,0.05)',borderRadius:14,padding:'14px 16px',border:'1px solid rgba(255,255,255,0.08)'};
  const lbl={fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:4};
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0a1630,#0d1b3e 60%,#1a2f5e 100%)',fontFamily:'system-ui,sans-serif',color:'#fff',paddingBottom:40}}>
      <div style={{padding:'16px 16px 0',display:'flex',alignItems:'center',gap:10}}>
        <button onClick={onVoltar} style={{background:'none',border:'none',color:'#F5C200',fontSize:24,cursor:'pointer',padding:0}}>‹</button>
        <div style={{flex:1}}><div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:1,textTransform:'uppercase'}}>Indicadores</div><div style={{fontSize:18,fontWeight:900}}>Dashboard</div></div>
        <div style={{display:'flex',gap:3,background:'rgba(255,255,255,.07)',borderRadius:20,padding:3}}>{[['mes','Mês'],['ano','Ano'],['tudo','Tudo']].map(([k,l])=><button key={k} onClick={()=>setPeriodo(k)} style={{background:periodo===k?'#F5C200':'none',color:periodo===k?'#0d1b3e':'rgba(255,255,255,.5)',border:'none',borderRadius:16,padding:'5px 11px',fontSize:11,fontWeight:700,cursor:'pointer'}}>{l}</button>)}</div>
      </div>
      <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{...c,gridColumn:'1/-1'}}>
            <span style={lbl}>Faturamento recebido (pagos)</span>
            <div style={{fontSize:28,fontWeight:900,color:'#22c55e'}}>{fmtK(faturado)}</div>
            <div style={{marginTop:10,display:'flex',alignItems:'flex-end',gap:3,height:40}}>
              {Array.from({length:12},(_,m)=>{const v=orcs.filter(o=>{const d=new Date(o.criadoEm);return d.getMonth()===m&&d.getFullYear()===ano&&o.status==='Pago';}).reduce((s,o)=>s+(o.totalTaxa||0),0);const mx=Math.max(...Array.from({length:12},(_,i)=>orcs.filter(o=>{const d=new Date(o.criadoEm);return d.getMonth()===i&&d.getFullYear()===ano&&o.status==='Pago';}).reduce((s,o)=>s+(o.totalTaxa||0),0)),1);return <div key={m} style={{flex:1,height:Math.max((v/mx)*40,v>0?3:1),background:m===mes?'#22c55e':'rgba(34,197,94,0.3)',borderRadius:'2px 2px 0 0',alignSelf:'flex-end'}}/>;})}</div>
          </div>
          <div style={c}><span style={lbl}>A receber</span><div style={{fontSize:22,fontWeight:900,color:'#f59e0b'}}>{fmtK(pendente)}</div><div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:4}}>{lista.filter(o=>['Orçado','Aprovado','Executado'].includes(o.status)).length} em aberto</div></div>
          <div style={c}><span style={lbl}>Ticket médio</span><div style={{fontSize:22,fontWeight:900}}>{fmtK(ticket)}</div><div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:4}}>{lista.length} orçamentos</div></div>
        </div>
        <div style={c}>
          <span style={lbl}>% de aprovação</span>
          <div style={{fontSize:28,fontWeight:900,color:aprovacao>=60?'#22c55e':aprovacao>=40?'#f59e0b':'#ef4444'}}>{aprovacao.toFixed(0)}%</div>
          <div style={{marginTop:8,height:6,background:'rgba(255,255,255,.1)',borderRadius:3}}><div style={{height:'100%',width:`${aprovacao}%`,background:aprovacao>=60?'#22c55e':aprovacao>=40?'#f59e0b':'#ef4444',borderRadius:3,transition:'width .5s'}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:'rgba(255,255,255,.3)'}}><span>0%</span><span style={{color:'#22c55e'}}>meta: 60%</span><span>100%</span></div>
        </div>
        <div style={c}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={lbl}>Faturamento mensal</span><span style={{fontSize:10,color:'rgba(245,194,0,.7)'}}>últimos 8 meses</span></div>
          <div style={{display:'flex',alignItems:'flex-end',gap:4,height:100}}>{mesesBar.map((d,i)=>(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}><div style={{width:'100%',height:Math.max((d.v/maxBar)*76,d.v>0?3:0),background:d.hl?'#F5C200':'rgba(245,194,0,.28)',borderRadius:'3px 3px 0 0'}}/><span style={{fontSize:9,color:'rgba(255,255,255,.35)',whiteSpace:'nowrap'}}>{d.label}</span></div>))}</div>
        </div>
        <div style={c}>
          <span style={{...lbl,marginBottom:10}}>Distribuição por status</span>
          {porStatus.filter(s=>s.v>0).map(s=>(<div key={s.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><div style={{width:8,height:8,borderRadius:'50%',background:s.cor,flexShrink:0}}/><div style={{flex:1,fontSize:12,color:'rgba(255,255,255,.7)'}}>{s.label}</div><div style={{height:4,width:80,background:'rgba(255,255,255,.1)',borderRadius:2}}><div style={{height:'100%',width:`${(s.v/lista.length)*100}%`,background:s.cor,borderRadius:2}}/></div><div style={{fontSize:13,fontWeight:700,width:20,textAlign:'right'}}>{s.v}</div><div style={{fontSize:10,color:'rgba(255,255,255,.3)',width:30,textAlign:'right'}}>{((s.v/lista.length)*100).toFixed(0)}%</div></div>))}
        </div>
        {topServ.length>0&&(<div style={c}><span style={{...lbl,marginBottom:10}}>Serviços mais orçados</span>{topServ.map(([nome,qtd],i)=>(<div key={nome} style={{marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:11,color:'rgba(255,255,255,.65)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}}>{i+1}. {nome}</span><span style={{fontSize:11,fontWeight:700,color:'#F5C200',flexShrink:0}}>{qtd}×</span></div><div style={{height:3,background:'rgba(255,255,255,.08)',borderRadius:2}}><div style={{height:'100%',width:`${(qtd/maxServ)*100}%`,background:`hsl(${40+i*12},90%,${60-i*4}%)`,borderRadius:2}}/></div></div>))}</div>)}
      </div>
    </div>
  );
}

// ─── DRE ─────────────────────────────────────────────────────────────────────
function DRE({orcs,onVoltar}){
  const ano=new Date().getFullYear();
  const [desp,setDesp]=useState([]);
  const [loadingDesp,setLoadingDesp]=useState(true);
  const [editando,setEditando]=useState(null);
  const [mesSel,setMesSel]=useState(new Date().getMonth());

  useEffect(()=>{
    loadDesp().then(async data=>{
      if(data.length===0){
        await sbUpsert('despesas_fixas',DESP_FIXAS_DEFAULT);
        setDesp(DESP_FIXAS_DEFAULT);
      } else {
        setDesp(data);
      }
      setLoadingDesp(false);
    }).catch(()=>{setDesp(DESP_FIXAS_DEFAULT);setLoadingDesp(false);});
  },[]);

  const updateDesp=async(id,v)=>{
    const nova=desp.map(d=>d.id===id?{...d,v}:d);
    setDesp(nova);
    setEditando(null);
    try{await patchDesp(id,v);}catch(e){console.error('Erro ao salvar despesa:',e);}
  };

  const getOrcsM=m=>orcs.filter(o=>{const d=new Date(o.criadoEm);return d.getMonth()===m&&d.getFullYear()===ano;});
  const receitaM=m=>getOrcsM(m).filter(o=>o.status==='Pago').reduce((s,o)=>s+(o.totalTaxa||0),0);
  const matM=m=>getOrcsM(m).reduce((s,o)=>s+(o.ex?.mat||0)+(o.ex?.frete||0),0);
  const combM=m=>getOrcsM(m).reduce((s,o)=>{const km=o.desl?.km||0,gas=o.desl?.gas||7,kml=o.desl?.kml||10,desg=o.desl?.desg||0.5,dias=o.desl?.dias||1;return s+(km>0?((km/kml)*gas+km*desg)*dias:0);},0);
  const taxaM=m=>getOrcsM(m).reduce((s,o)=>{const t=PARCELAS.find(p=>p.label===(o.parcelas||'6x'))||PARCELAS[5];return s+(o.status==='Pago'?(o.total||0)*t.taxa:0);},0);
  const fixoM=()=>desp.reduce((s,d)=>s+(d.v||0),0);
  const lucroM=m=>receitaM(m)-matM(m)-combM(m)-taxaM(m)-fixoM();

  const rec=receitaM(mesSel),mat=matM(mesSel),comb=combM(mesSel),tax=taxaM(mesSel),fix=fixoM(),lucro=lucroM(mesSel);
  const orcsM=getOrcsM(mesSel);

  const RowDRE=({label,val,cor,sub})=>(<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'8px 0',borderBottom:'1px solid #f0f4ff'}}><div><div style={{fontSize:13,color:'#1a2f5e'}}>{label}</div>{sub&&<div style={{fontSize:10,color:'#8892a4'}}>{sub}</div>}</div><div style={{fontSize:14,fontWeight:700,color:cor||'#1a2f5e',textAlign:'right'}}>{fmt(val)}</div></div>);

  if(loadingDesp) return <div style={{minHeight:'100vh',background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center'}}><LoadingScreen/></div>;

  return(
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'system-ui,sans-serif'}}>
      <Hdr onBack={onVoltar} title="DRE Mensal"/>
      <div style={{padding:'14px 14px 40px',maxWidth:600,margin:'0 auto',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>{MESES.map((m,i)=><button key={i} onClick={()=>setMesSel(i)} style={{background:mesSel===i?'#0d1b3e':'#e8edf5',color:mesSel===i?'#F5C200':'#555',border:'none',borderRadius:20,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{m}</button>)}</div>
        <div style={{background:'linear-gradient(135deg,#0d1b3e,#1a2f5e)',borderRadius:14,padding:18,color:'#fff'}}>
          <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginBottom:4}}>{MESES_FULL[mesSel]} {ano}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:1}}>RECEITA</div><div style={{fontSize:22,fontWeight:900,color:'#22c55e'}}>{fmtK(rec)}</div></div>
            <div><div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:1}}>LUCRO OPERACIONAL</div><div style={{fontSize:22,fontWeight:900,color:lucro>=0?'#22c55e':'#ef4444'}}>{fmtK(lucro)}</div></div>
          </div>
          <div style={{marginTop:10,height:4,background:'rgba(255,255,255,.1)',borderRadius:2}}><div style={{height:'100%',width:`${rec>0?Math.min(Math.abs(lucro/rec)*100,100):0}%`,background:lucro>=0?'#22c55e':'#ef4444',borderRadius:2}}/></div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:4}}>margem: {rec>0?((lucro/rec)*100).toFixed(1):0}%</div>
        </div>
        <Card title="📥 Receitas">
          <RowDRE label="Serviços pagos" val={rec} cor="#22c55e" sub={`${orcsM.filter(o=>o.status==='Pago').length} orçamentos pagos`}/>
          <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:12,color:'#8892a4'}}><span>Orçamentos no mês</span><span>{orcsM.length}</span></div>
        </Card>
        <Card title="📤 Custos Variáveis">
          <RowDRE label="Materiais utilizados" val={-mat} cor="#ef4444" sub="puxado dos orçamentos"/>
          <RowDRE label="Combustível / Deslocamento" val={-comb} cor="#ef4444" sub="puxado dos orçamentos"/>
          <RowDRE label="Taxas (maquininha)" val={-tax} cor="#ef4444" sub="calculado pelos parcelamentos"/>
          <div style={{borderTop:'2px solid #e0e6f0',marginTop:6,paddingTop:6,display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:700,fontSize:13}}>Total variáveis</span><span style={{fontWeight:800,color:'#ef4444'}}>{fmt(-(mat+comb+tax))}</span></div>
        </Card>
        <Card title="🏢 Despesas Fixas">
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            {desp.map(d=>(<div key={d.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #f8f8f8'}}>
              {editando===d.id?(
                <><input defaultValue={d.v} onBlur={e=>updateDesp(d.id,parseFloat(e.target.value)||0)} autoFocus style={{...iStyle,padding:'4px 8px',fontSize:13,width:90,textAlign:'right'}} type="number" min="0" step="0.01"/><span style={{flex:1,fontSize:12,color:'#555'}}>{d.cat}</span></>
              ):(
                <><span style={{flex:1,fontSize:12,color:'#1a2f5e'}}>{d.cat}</span><span style={{fontSize:13,fontWeight:700,color:'#555'}}>{fmt(d.v)}</span><button onClick={()=>setEditando(d.id)} style={{background:'#e8edf5',border:'none',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer',color:'#1a2f5e'}}>✎</button></>
              )}
            </div>))}
          </div>
          <div style={{marginTop:8,borderTop:'2px solid #e0e6f0',paddingTop:8,display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:700,fontSize:13}}>Total fixos</span><span style={{fontWeight:800,color:'#ef4444'}}>{fmt(-fix)}</span></div>
          <div style={{fontSize:10,color:'#8892a4',marginTop:4}}>Toque em ✎ para editar · salvo automaticamente no Supabase ☁️</div>
        </Card>
        <Card title="📊 Resumo do Mês" style={{border:'2px solid #0d1b3e'}}>
          {[['(+) Receita bruta',rec,'#22c55e'],['(-) Materiais',-mat,'#ef4444'],['(-) Combustível',-comb,'#ef4444'],['(-) Taxas cartão',-tax,'#ef4444'],['(-) Despesas fixas',-fix,'#ef4444']].map(([l,v,cor])=><RowDRE key={l} label={l} val={v} cor={cor}/>)}
          <div style={{background:'#0d1b3e',borderRadius:10,padding:'12px 16px',marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'#F5C200',fontWeight:800,fontSize:15}}>LUCRO OPERACIONAL</span><span style={{color:lucro>=0?'#22c55e':'#ef4444',fontWeight:900,fontSize:22}}>{fmt(lucro)}</span></div>
        </Card>
        <Card title="📅 Visão Anual">
          <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:4}}>
            {MESES.map((m,i)=>{const l=lucroM(i),r=receitaM(i);return(<button key={i} onClick={()=>setMesSel(i)} style={{background:mesSel===i?'#0d1b3e':'#f0f4ff',border:'none',borderRadius:8,padding:'8px 4px',cursor:'pointer',textAlign:'center'}}><div style={{fontSize:9,fontWeight:700,color:mesSel===i?'#F5C200':'#8892a4'}}>{m}</div><div style={{fontSize:10,fontWeight:700,color:r>0?(l>=0?'#22c55e':'#ef4444'):'#ccc',marginTop:3}}>{r>0?fmtK(l):'—'}</div></button>);})}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── MATERIAIS ────────────────────────────────────────────────────────────────
function Materiais({onVoltar}){
  const [busca,setBusca]=useState('');
  const [lista,setLista]=useState([]);
  const [aba,setAba]=useState('consulta');

  useEffect(()=>{
    loadCotacao().then(data=>setLista(data||[])).catch(()=>{});
  },[]);

  const salvarLista=async novaLista=>{
    setLista(novaLista);
    try{await saveCotacao(novaLista);}catch(e){console.error('Erro ao salvar cotação:',e);}
  };
  const addItem=mat=>{const exist=lista.find(i=>i.n===mat.n);salvarLista(exist?lista.map(i=>i.n===mat.n?{...i,qty:i.qty+1}:i):[...lista,{...mat,qty:1}]);};
  const updQty=(n,qty)=>salvarLista(qty<=0?lista.filter(i=>i.n!==n):lista.map(i=>i.n===n?{...i,qty}:i));
  const total=lista.reduce((s,i)=>s+i.p*i.qty,0);
  const filtered=MATERIAIS.filter(m=>m.n.toLowerCase().includes(busca.toLowerCase()));

  return(
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'system-ui,sans-serif'}}>
      <Hdr onBack={onVoltar} title="Materiais"/>
      <div style={{display:'flex',background:'#0d1b3e'}}>{[['consulta','🔍 Consulta'],['cotacao',`🛒 Cotação${lista.length>0?` (${lista.length})`:''}`]].map(([k,v])=>(<button key={k} onClick={()=>setAba(k)} style={{flex:1,padding:'10px',border:'none',background:'none',color:aba===k?'#F5C200':'#8892a4',borderBottom:aba===k?'2.5px solid #F5C200':'2.5px solid transparent',fontSize:12,fontWeight:700,cursor:'pointer'}}>{v}</button>))}</div>
      {aba==='consulta'&&(<div style={{padding:'14px 14px 40px',maxWidth:600,margin:'0 auto'}}>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar material..." style={{...iStyle,marginBottom:14}}/>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(m=>(<div key={m.n} style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1px solid #e0e6f4',display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'#1a2f5e'}}>{m.n}</div><div style={{fontSize:10,color:'#8892a4',marginTop:2}}>{m.u} · {fmt(m.p)}</div></div>
            <button onClick={()=>addItem(m)} style={{background:'#0d1b3e',color:'#F5C200',border:'none',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}>+ Cotar</button>
          </div>))}
        </div>
      </div>)}
      {aba==='cotacao'&&(<div style={{padding:'14px 14px 40px',maxWidth:600,margin:'0 auto',display:'flex',flexDirection:'column',gap:12}}>
        {lista.length===0?(<div style={{textAlign:'center',padding:'60px 0',color:'#8892a4'}}><div style={{fontSize:44}}>🛒</div><p>Nenhum item na cotação</p><button onClick={()=>setAba('consulta')} style={{background:'#F5C200',color:'#0d1b3e',border:'none',borderRadius:10,padding:'10px 24px',fontWeight:800,cursor:'pointer'}}>Ir para consulta</button></div>):(
          <>
            <Card title="Itens da Cotação">
              {lista.map(i=>(<div key={i.n} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #f0f4ff'}}>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'#1a2f5e'}}>{i.n}</div><div style={{fontSize:10,color:'#8892a4'}}>{fmt(i.p)} / {i.u}</div></div>
                <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                  <button onClick={()=>updQty(i.n,i.qty-1)} style={{background:'#e8edf5',border:'none',borderRadius:6,width:26,height:26,cursor:'pointer',fontSize:14,fontWeight:700,color:'#1a2f5e'}}>−</button>
                  <span style={{fontSize:13,fontWeight:700,width:20,textAlign:'center'}}>{i.qty}</span>
                  <button onClick={()=>updQty(i.n,i.qty+1)} style={{background:'#e8edf5',border:'none',borderRadius:6,width:26,height:26,cursor:'pointer',fontSize:14,fontWeight:700,color:'#1a2f5e'}}>+</button>
                </div>
                <div style={{fontSize:13,fontWeight:800,color:'#0d1b3e',width:70,textAlign:'right'}}>{fmt(i.p*i.qty)}</div>
              </div>))}
            </Card>
            <div style={{background:'#0d1b3e',borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'rgba(255,255,255,.5)',fontSize:12}}>{lista.length} item(s) · {lista.reduce((s,i)=>s+i.qty,0)} unidade(s)</span><span style={{color:'rgba(255,255,255,.3)',fontSize:10}}>☁️ salvo automaticamente</span></div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'#F5C200',fontWeight:800,fontSize:15}}>CUSTO TOTAL</span><span style={{color:'#fff',fontWeight:900,fontSize:26}}>{fmt(total)}</span></div>
            </div>
            <button onClick={()=>salvarLista([])} style={{background:'#fee2e2',color:'#ef4444',border:'none',borderRadius:10,padding:'10px',fontWeight:700,cursor:'pointer'}}>🗑 Limpar cotação</button>
          </>
        )}
      </div>)}
    </div>
  );
}

// ─── TABELA DE PREÇOS ─────────────────────────────────────────────────────────
function Tabela({onVoltar}){
  const [busca,setBusca]=useState('');const [cat,setCat]=useState('Todas');
  const filtrados=PRECOS.filter(p=>(cat==='Todas'||p.c===cat)&&p.s.toLowerCase().includes(busca.toLowerCase()));
  return(<div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'system-ui,sans-serif'}}>
    <Hdr onBack={onVoltar} title="Tabela de Preços 2026"/>
    <div style={{padding:'14px 14px 0'}}>
      <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar serviço..." style={{...iStyle,marginBottom:10}}/>
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:10}}>{['Todas',...CATS].map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?'#F5C200':'#e8edf5',color:cat===c?'#0d1b3e':'#555',border:'none',borderRadius:20,padding:'4px 11px',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{c}</button>)}</div>
      <p style={{fontSize:10,color:'#8892a4',margin:'0 0 10px'}}>* Preços com reajuste 2026 (×1,087) + ajuste competitivo de 20%</p>
    </div>
    <div style={{padding:'0 14px 40px',maxWidth:600,margin:'0 auto',display:'flex',flexDirection:'column',gap:8}}>
      {filtrados.map(p=>(<div key={p.s} style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1px solid #e0e6f4'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#1a2f5e',marginBottom:4}}>{p.s}</div>
        <div style={{fontSize:10,color:'#8892a4',marginBottom:8}}>{p.c}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
          {[['Mínimo',p.min,'#22c55e'],['Médio',p.med,'#3b82f6'],['Máximo',p.max,'#ef4444']].map(([lbl,v,cor])=>(<div key={lbl} style={{background:'#f8fafc',borderRadius:6,padding:'6px 4px',textAlign:'center'}}><div style={{fontSize:9,color:cor,fontWeight:800,marginBottom:2}}>{lbl}</div><div style={{fontSize:11,fontWeight:800,color:'#1a2f5e'}}>{fmt(calcP(v))}</div><div style={{fontSize:8,color:'#aaa'}}>base: {fmt(v)}</div></div>))}
        </div>
      </div>))}
    </div>
  </div>);
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App(){
  const [tela,setTela]=useState('home');
  const [orcs,setOrcs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [erro,setErro]=useState(null);
  const [saving,setSaving]=useState(false);
  const [orcAtual,setOrcAtual]=useState(null);
  const [orcVer,setOrcVer]=useState(null);
  const [orcPDF,setOrcPDF]=useState(null);

  const recarregar=()=>{
    setLoading(true);setErro(null);
    loadOrcs().then(data=>{setOrcs(data);setLoading(false);}).catch(e=>{setErro(e.message);setLoading(false);});
  };

  useEffect(()=>{recarregar();},[]);

  const salvar=async o=>{
    setSaving(true);
    try{await saveOrc(o);const data=await loadOrcs();setOrcs(data);setTela('historico');}
    catch(e){alert('Erro ao salvar: '+e.message);}
    finally{setSaving(false);}
  };

  const excluir=async id=>{
    try{await deleteOrc(id);setOrcs(prev=>prev.filter(o=>o.id!==id));}
    catch(e){alert('Erro ao excluir: '+e.message);}
  };

  if(loading) return <LoadingScreen/>;
  if(erro) return <ErroScreen msg={erro} onRetry={recarregar}/>;

  if(tela==='novo'||tela==='editar') return <Orcamento orc={orcAtual} onSalvar={salvar} saving={saving} onVoltar={()=>setTela(tela==='editar'?'historico':'home')}/>;
  if(tela==='historico') return <Historico lista={orcs} onNovo={()=>{setOrcAtual(null);setTela('novo');}} onEditar={o=>{setOrcAtual(o);setTela('editar');}} onVer={o=>{setOrcVer(o);setTela('visualizar');}} onExcluir={excluir} onVoltar={()=>setTela('home')}/>;
  if(tela==='tabela') return <Tabela onVoltar={()=>setTela('home')}/>;
  if(tela==='visualizar') return <Visualizar orc={orcVer} onVoltar={()=>setTela('historico')} onEditar={o=>{setOrcAtual(o);setTela('editar');}} onPDF={o=>{setOrcPDF(o);setTela('pdf');}}/>;
  if(tela==='pdf') return <TelaPDF orc={orcPDF} onVoltar={()=>setTela('visualizar')}/>;
  if(tela==='dashboard') return <Dashboard orcs={orcs} onVoltar={()=>setTela('home')}/>;
  if(tela==='dre') return <DRE orcs={orcs} onVoltar={()=>setTela('home')}/>;
  if(tela==='materiais') return <Materiais onVoltar={()=>setTela('home')}/>;

  return <Home qtd={orcs.length} onNovo={()=>{setOrcAtual(null);setTela('novo');}} onHistorico={()=>setTela('historico')} onTabela={()=>setTela('tabela')} onDashboard={()=>setTela('dashboard')} onDRE={()=>setTela('dre')} onMateriais={()=>setTela('materiais')}/>;
}
