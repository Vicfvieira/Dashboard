// Copiado da Lírio (src/data/sp-geo.ts, gerado por scripts/build-sp-geo.ts) para manter os mesmos slugs.
// Fonte: GeoSampa (Prefeitura de São Paulo / SMDU), camada "Distrito" (96 distritos oficiais).
// Centroide: ponto representativo dentro do distrito. Vizinhos: distritos que compartilham fronteira.

export type RegiaoId = "centro" | "oeste" | "sul" | "norte" | "leste";

export interface Regiao {
  id: RegiaoId;
  nome: string;
}

export interface Subprefeitura {
  slug: string;
  nome: string;
  regiao: RegiaoId;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Distrito {
  slug: string;
  nome: string;
  /** Sigla oficial de 3 letras do GeoSampa. */
  sigla: string;
  /** Código oficial do distrito (1 a 96). */
  codigo: number;
  subprefeitura: string;
  regiao: RegiaoId;
  centroide: LatLng;
  areaKm2: number;
  vizinhos: string[];
}

export const REGIOES: readonly Regiao[] = [
  { id: "centro", nome: "Centro" },
  { id: "oeste", nome: "Zona Oeste" },
  { id: "sul", nome: "Zona Sul" },
  { id: "norte", nome: "Zona Norte" },
  { id: "leste", nome: "Zona Leste" },
];

export const SUBPREFEITURAS: readonly Subprefeitura[] = [
  {
    "slug": "aricanduva-formosa-carrao",
    "nome": "Aricanduva/Formosa/Carrão",
    "regiao": "leste"
  },
  {
    "slug": "butanta",
    "nome": "Butantã",
    "regiao": "oeste"
  },
  {
    "slug": "campo-limpo",
    "nome": "Campo Limpo",
    "regiao": "sul"
  },
  {
    "slug": "capela-do-socorro",
    "nome": "Capela do Socorro",
    "regiao": "sul"
  },
  {
    "slug": "casa-verde-cachoeirinha",
    "nome": "Casa Verde/Cachoeirinha",
    "regiao": "norte"
  },
  {
    "slug": "cidade-ademar",
    "nome": "Cidade Ademar",
    "regiao": "sul"
  },
  {
    "slug": "cidade-tiradentes",
    "nome": "Cidade Tiradentes",
    "regiao": "leste"
  },
  {
    "slug": "ermelino-matarazzo",
    "nome": "Ermelino Matarazzo",
    "regiao": "leste"
  },
  {
    "slug": "freguesia-brasilandia",
    "nome": "Freguesia/Brasilândia",
    "regiao": "norte"
  },
  {
    "slug": "guaianases",
    "nome": "Guaianases",
    "regiao": "leste"
  },
  {
    "slug": "ipiranga",
    "nome": "Ipiranga",
    "regiao": "sul"
  },
  {
    "slug": "itaim-paulista",
    "nome": "Itaim Paulista",
    "regiao": "leste"
  },
  {
    "slug": "itaquera",
    "nome": "Itaquera",
    "regiao": "leste"
  },
  {
    "slug": "jabaquara",
    "nome": "Jabaquara",
    "regiao": "sul"
  },
  {
    "slug": "jacana-tremembe",
    "nome": "Jaçanã/Tremembé",
    "regiao": "norte"
  },
  {
    "slug": "lapa",
    "nome": "Lapa",
    "regiao": "oeste"
  },
  {
    "slug": "mboi-mirim",
    "nome": "M'Boi Mirim",
    "regiao": "sul"
  },
  {
    "slug": "mooca",
    "nome": "Mooca",
    "regiao": "leste"
  },
  {
    "slug": "parelheiros",
    "nome": "Parelheiros",
    "regiao": "sul"
  },
  {
    "slug": "penha",
    "nome": "Penha",
    "regiao": "leste"
  },
  {
    "slug": "perus",
    "nome": "Perus",
    "regiao": "norte"
  },
  {
    "slug": "pinheiros",
    "nome": "Pinheiros",
    "regiao": "oeste"
  },
  {
    "slug": "pirituba-jaragua",
    "nome": "Pirituba/Jaraguá",
    "regiao": "norte"
  },
  {
    "slug": "santana-tucuruvi",
    "nome": "Santana/Tucuruvi",
    "regiao": "norte"
  },
  {
    "slug": "santo-amaro",
    "nome": "Santo Amaro",
    "regiao": "sul"
  },
  {
    "slug": "sao-mateus",
    "nome": "São Mateus",
    "regiao": "leste"
  },
  {
    "slug": "sao-miguel",
    "nome": "São Miguel",
    "regiao": "leste"
  },
  {
    "slug": "sapopemba",
    "nome": "Sapopemba",
    "regiao": "leste"
  },
  {
    "slug": "se",
    "nome": "Sé",
    "regiao": "centro"
  },
  {
    "slug": "vila-maria-vila-guilherme",
    "nome": "Vila Maria/Vila Guilherme",
    "regiao": "norte"
  },
  {
    "slug": "vila-mariana",
    "nome": "Vila Mariana",
    "regiao": "sul"
  },
  {
    "slug": "vila-prudente",
    "nome": "Vila Prudente",
    "regiao": "leste"
  }
];

export const DISTRITOS: readonly Distrito[] = [
  {
    "slug": "agua-rasa",
    "nome": "Água Rasa",
    "sigla": "ARA",
    "codigo": 1,
    "subprefeitura": "mooca",
    "regiao": "leste",
    "centroide": {
      "lat": -23.56684,
      "lng": -46.57188
    },
    "areaKm2": 7.2,
    "vizinhos": [
      "belem",
      "mooca",
      "sao-lucas",
      "tatuape",
      "vila-formosa",
      "vila-prudente"
    ]
  },
  {
    "slug": "alto-de-pinheiros",
    "nome": "Alto de Pinheiros",
    "sigla": "API",
    "codigo": 2,
    "subprefeitura": "pinheiros",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.54761,
      "lng": -46.71196
    },
    "areaKm2": 7.4,
    "vizinhos": [
      "butanta",
      "jaguare",
      "lapa",
      "perdizes",
      "pinheiros",
      "vila-leopoldina"
    ]
  },
  {
    "slug": "anhanguera",
    "nome": "Anhanguera",
    "sigla": "ANH",
    "codigo": 3,
    "subprefeitura": "perus",
    "regiao": "norte",
    "centroide": {
      "lat": -23.43088,
      "lng": -46.79295
    },
    "areaKm2": 33.4,
    "vizinhos": [
      "jaragua",
      "perus"
    ]
  },
  {
    "slug": "aricanduva",
    "nome": "Aricanduva",
    "sigla": "ARI",
    "codigo": 4,
    "subprefeitura": "aricanduva-formosa-carrao",
    "regiao": "leste",
    "centroide": {
      "lat": -23.57381,
      "lng": -46.51561
    },
    "areaKm2": 6.9,
    "vizinhos": [
      "carrao",
      "cidade-lider",
      "sao-mateus",
      "sapopemba",
      "vila-formosa"
    ]
  },
  {
    "slug": "artur-alvim",
    "nome": "Artur Alvim",
    "sigla": "AAL",
    "codigo": 5,
    "subprefeitura": "penha",
    "regiao": "leste",
    "centroide": {
      "lat": -23.54015,
      "lng": -46.48581
    },
    "areaKm2": 6.5,
    "vizinhos": [
      "cidade-lider",
      "itaquera",
      "penha",
      "ponte-rasa",
      "vila-matilde"
    ]
  },
  {
    "slug": "barra-funda",
    "nome": "Barra Funda",
    "sigla": "BFU",
    "codigo": 6,
    "subprefeitura": "lapa",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.5212,
      "lng": -46.67409
    },
    "areaKm2": 5.8,
    "vizinhos": [
      "bom-retiro",
      "casa-verde",
      "freguesia-do-o",
      "lapa",
      "limao",
      "perdizes",
      "santa-cecilia"
    ]
  },
  {
    "slug": "bela-vista",
    "nome": "Bela Vista",
    "sigla": "BVI",
    "codigo": 7,
    "subprefeitura": "se",
    "regiao": "centro",
    "centroide": {
      "lat": -23.56086,
      "lng": -46.64758
    },
    "areaKm2": 2.7,
    "vizinhos": [
      "consolacao",
      "jardim-paulista",
      "liberdade",
      "republica",
      "vila-mariana"
    ]
  },
  {
    "slug": "belem",
    "nome": "Belém",
    "sigla": "BEL",
    "codigo": 8,
    "subprefeitura": "mooca",
    "regiao": "leste",
    "centroide": {
      "lat": -23.5376,
      "lng": -46.59482
    },
    "areaKm2": 6,
    "vizinhos": [
      "agua-rasa",
      "bras",
      "mooca",
      "pari",
      "tatuape",
      "vila-guilherme",
      "vila-maria"
    ]
  },
  {
    "slug": "bom-retiro",
    "nome": "Bom Retiro",
    "sigla": "BRE",
    "codigo": 9,
    "subprefeitura": "se",
    "regiao": "centro",
    "centroide": {
      "lat": -23.52607,
      "lng": -46.63681
    },
    "areaKm2": 4.2,
    "vizinhos": [
      "barra-funda",
      "bras",
      "pari",
      "republica",
      "santa-cecilia",
      "santana",
      "se"
    ]
  },
  {
    "slug": "bras",
    "nome": "Brás",
    "sigla": "BRS",
    "codigo": 10,
    "subprefeitura": "mooca",
    "regiao": "leste",
    "centroide": {
      "lat": -23.54375,
      "lng": -46.61747
    },
    "areaKm2": 3.6,
    "vizinhos": [
      "belem",
      "bom-retiro",
      "cambuci",
      "mooca",
      "pari",
      "se"
    ]
  },
  {
    "slug": "brasilandia",
    "nome": "Brasilândia",
    "sigla": "BRL",
    "codigo": 11,
    "subprefeitura": "freguesia-brasilandia",
    "regiao": "norte",
    "centroide": {
      "lat": -23.44859,
      "lng": -46.68839
    },
    "areaKm2": 21,
    "vizinhos": [
      "cachoeirinha",
      "freguesia-do-o",
      "jaragua",
      "pirituba"
    ]
  },
  {
    "slug": "butanta",
    "nome": "Butantã",
    "sigla": "BUT",
    "codigo": 12,
    "subprefeitura": "butanta",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.5702,
      "lng": -46.72628
    },
    "areaKm2": 12.9,
    "vizinhos": [
      "alto-de-pinheiros",
      "jaguare",
      "morumbi",
      "pinheiros",
      "raposo-tavares",
      "rio-pequeno",
      "vila-sonia"
    ]
  },
  {
    "slug": "cachoeirinha",
    "nome": "Cachoeirinha",
    "sigla": "CAC",
    "codigo": 13,
    "subprefeitura": "casa-verde-cachoeirinha",
    "regiao": "norte",
    "centroide": {
      "lat": -23.45442,
      "lng": -46.66209
    },
    "areaKm2": 13.5,
    "vizinhos": [
      "brasilandia",
      "casa-verde",
      "freguesia-do-o",
      "limao",
      "mandaqui"
    ]
  },
  {
    "slug": "cambuci",
    "nome": "Cambuci",
    "sigla": "CMB",
    "codigo": 14,
    "subprefeitura": "se",
    "regiao": "centro",
    "centroide": {
      "lat": -23.56439,
      "lng": -46.61695
    },
    "areaKm2": 3.9,
    "vizinhos": [
      "bras",
      "ipiranga",
      "liberdade",
      "mooca",
      "se",
      "vila-mariana"
    ]
  },
  {
    "slug": "campo-belo",
    "nome": "Campo Belo",
    "sigla": "CBE",
    "codigo": 15,
    "subprefeitura": "santo-amaro",
    "regiao": "sul",
    "centroide": {
      "lat": -23.62808,
      "lng": -46.66791
    },
    "areaKm2": 8.8,
    "vizinhos": [
      "cidade-ademar",
      "itaim-bibi",
      "jabaquara",
      "moema",
      "santo-amaro",
      "saude"
    ]
  },
  {
    "slug": "campo-grande",
    "nome": "Campo Grande",
    "sigla": "CGR",
    "codigo": 16,
    "subprefeitura": "santo-amaro",
    "regiao": "sul",
    "centroide": {
      "lat": -23.67463,
      "lng": -46.68751
    },
    "areaKm2": 12.9,
    "vizinhos": [
      "cidade-ademar",
      "cidade-dutra",
      "pedreira",
      "santo-amaro",
      "socorro"
    ]
  },
  {
    "slug": "campo-limpo",
    "nome": "Campo Limpo",
    "sigla": "CLM",
    "codigo": 17,
    "subprefeitura": "campo-limpo",
    "regiao": "sul",
    "centroide": {
      "lat": -23.63586,
      "lng": -46.7635
    },
    "areaKm2": 12.6,
    "vizinhos": [
      "capao-redondo",
      "jardim-sao-luis",
      "vila-andrade",
      "vila-sonia"
    ]
  },
  {
    "slug": "cangaiba",
    "nome": "Cangaíba",
    "sigla": "CNG",
    "codigo": 18,
    "subprefeitura": "penha",
    "regiao": "leste",
    "centroide": {
      "lat": -23.49696,
      "lng": -46.52045
    },
    "areaKm2": 16.5,
    "vizinhos": [
      "ermelino-matarazzo",
      "penha",
      "ponte-rasa"
    ]
  },
  {
    "slug": "capao-redondo",
    "nome": "Capão Redondo",
    "sigla": "CRE",
    "codigo": 19,
    "subprefeitura": "campo-limpo",
    "regiao": "sul",
    "centroide": {
      "lat": -23.66877,
      "lng": -46.78051
    },
    "areaKm2": 13.7,
    "vizinhos": [
      "campo-limpo",
      "jardim-angela",
      "jardim-sao-luis"
    ]
  },
  {
    "slug": "carrao",
    "nome": "Carrão",
    "sigla": "CAR",
    "codigo": 20,
    "subprefeitura": "aricanduva-formosa-carrao",
    "regiao": "leste",
    "centroide": {
      "lat": -23.55108,
      "lng": -46.53829
    },
    "areaKm2": 7.9,
    "vizinhos": [
      "aricanduva",
      "cidade-lider",
      "tatuape",
      "vila-formosa",
      "vila-matilde"
    ]
  },
  {
    "slug": "casa-verde",
    "nome": "Casa Verde",
    "sigla": "CVE",
    "codigo": 21,
    "subprefeitura": "casa-verde-cachoeirinha",
    "regiao": "norte",
    "centroide": {
      "lat": -23.50099,
      "lng": -46.65744
    },
    "areaKm2": 7.2,
    "vizinhos": [
      "barra-funda",
      "cachoeirinha",
      "limao",
      "mandaqui",
      "santana"
    ]
  },
  {
    "slug": "cidade-ademar",
    "nome": "Cidade Ademar",
    "sigla": "CAD",
    "codigo": 22,
    "subprefeitura": "cidade-ademar",
    "regiao": "sul",
    "centroide": {
      "lat": -23.67379,
      "lng": -46.65681
    },
    "areaKm2": 12.3,
    "vizinhos": [
      "campo-belo",
      "campo-grande",
      "jabaquara",
      "pedreira",
      "santo-amaro"
    ]
  },
  {
    "slug": "cidade-dutra",
    "nome": "Cidade Dutra",
    "sigla": "CDU",
    "codigo": 23,
    "subprefeitura": "capela-do-socorro",
    "regiao": "sul",
    "centroide": {
      "lat": -23.72576,
      "lng": -46.7024
    },
    "areaKm2": 27.9,
    "vizinhos": [
      "campo-grande",
      "grajau",
      "jardim-angela",
      "jardim-sao-luis",
      "parelheiros",
      "pedreira",
      "socorro"
    ]
  },
  {
    "slug": "cidade-lider",
    "nome": "Cidade Líder",
    "sigla": "CLD",
    "codigo": 24,
    "subprefeitura": "itaquera",
    "regiao": "leste",
    "centroide": {
      "lat": -23.56202,
      "lng": -46.4913
    },
    "areaKm2": 10.3,
    "vizinhos": [
      "aricanduva",
      "artur-alvim",
      "carrao",
      "itaquera",
      "parque-do-carmo",
      "sao-mateus",
      "vila-matilde"
    ]
  },
  {
    "slug": "cidade-tiradentes",
    "nome": "Cidade Tiradentes",
    "sigla": "CTI",
    "codigo": 25,
    "subprefeitura": "cidade-tiradentes",
    "regiao": "leste",
    "centroide": {
      "lat": -23.58481,
      "lng": -46.40084
    },
    "areaKm2": 14.9,
    "vizinhos": [
      "guaianases",
      "iguatemi",
      "jose-bonifacio"
    ]
  },
  {
    "slug": "consolacao",
    "nome": "Consolação",
    "sigla": "CON",
    "codigo": 26,
    "subprefeitura": "se",
    "regiao": "centro",
    "centroide": {
      "lat": -23.54869,
      "lng": -46.66023
    },
    "areaKm2": 3.8,
    "vizinhos": [
      "bela-vista",
      "jardim-paulista",
      "perdizes",
      "republica",
      "santa-cecilia"
    ]
  },
  {
    "slug": "cursino",
    "nome": "Cursino",
    "sigla": "CUR",
    "codigo": 27,
    "subprefeitura": "ipiranga",
    "regiao": "sul",
    "centroide": {
      "lat": -23.63142,
      "lng": -46.62072
    },
    "areaKm2": 12,
    "vizinhos": [
      "ipiranga",
      "jabaquara",
      "sacoma",
      "saude",
      "vila-mariana"
    ]
  },
  {
    "slug": "ermelino-matarazzo",
    "nome": "Ermelino Matarazzo",
    "sigla": "ERM",
    "codigo": 28,
    "subprefeitura": "ermelino-matarazzo",
    "regiao": "leste",
    "centroide": {
      "lat": -23.49125,
      "lng": -46.48453
    },
    "areaKm2": 9.4,
    "vizinhos": [
      "cangaiba",
      "ponte-rasa",
      "vila-jacui"
    ]
  },
  {
    "slug": "freguesia-do-o",
    "nome": "Freguesia do Ó",
    "sigla": "FRE",
    "codigo": 29,
    "subprefeitura": "freguesia-brasilandia",
    "regiao": "norte",
    "centroide": {
      "lat": -23.48633,
      "lng": -46.69748
    },
    "areaKm2": 11,
    "vizinhos": [
      "barra-funda",
      "brasilandia",
      "cachoeirinha",
      "lapa",
      "limao",
      "pirituba"
    ]
  },
  {
    "slug": "grajau",
    "nome": "Grajaú",
    "sigla": "GRA",
    "codigo": 30,
    "subprefeitura": "capela-do-socorro",
    "regiao": "sul",
    "centroide": {
      "lat": -23.78965,
      "lng": -46.66872
    },
    "areaKm2": 92.6,
    "vizinhos": [
      "cidade-dutra",
      "parelheiros",
      "pedreira"
    ]
  },
  {
    "slug": "guaianases",
    "nome": "Guaianases",
    "sigla": "GUA",
    "codigo": 31,
    "subprefeitura": "guaianases",
    "regiao": "leste",
    "centroide": {
      "lat": -23.55639,
      "lng": -46.40659
    },
    "areaKm2": 8.9,
    "vizinhos": [
      "cidade-tiradentes",
      "jose-bonifacio",
      "lajeado"
    ]
  },
  {
    "slug": "iguatemi",
    "nome": "Iguatemi",
    "sigla": "IGU",
    "codigo": 33,
    "subprefeitura": "sao-mateus",
    "regiao": "leste",
    "centroide": {
      "lat": -23.61277,
      "lng": -46.42667
    },
    "areaKm2": 19.5,
    "vizinhos": [
      "cidade-tiradentes",
      "jose-bonifacio",
      "parque-do-carmo",
      "sao-mateus",
      "sao-rafael"
    ]
  },
  {
    "slug": "ipiranga",
    "nome": "Ipiranga",
    "sigla": "IPI",
    "codigo": 34,
    "subprefeitura": "ipiranga",
    "regiao": "sul",
    "centroide": {
      "lat": -23.59181,
      "lng": -46.60283
    },
    "areaKm2": 11,
    "vizinhos": [
      "cambuci",
      "cursino",
      "mooca",
      "sacoma",
      "vila-mariana",
      "vila-prudente"
    ]
  },
  {
    "slug": "itaim-bibi",
    "nome": "Itaim Bibi",
    "sigla": "IBI",
    "codigo": 35,
    "subprefeitura": "pinheiros",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.60211,
      "lng": -46.68536
    },
    "areaKm2": 10,
    "vizinhos": [
      "campo-belo",
      "jardim-paulista",
      "moema",
      "morumbi",
      "pinheiros",
      "santo-amaro"
    ]
  },
  {
    "slug": "itaim-paulista",
    "nome": "Itaim Paulista",
    "sigla": "IPA",
    "codigo": 36,
    "subprefeitura": "itaim-paulista",
    "regiao": "leste",
    "centroide": {
      "lat": -23.50335,
      "lng": -46.38632
    },
    "areaKm2": 12.1,
    "vizinhos": [
      "jardim-helena",
      "lajeado",
      "vila-curuca"
    ]
  },
  {
    "slug": "itaquera",
    "nome": "Itaquera",
    "sigla": "ITQ",
    "codigo": 37,
    "subprefeitura": "itaquera",
    "regiao": "leste",
    "centroide": {
      "lat": -23.53402,
      "lng": -46.45594
    },
    "areaKm2": 14.7,
    "vizinhos": [
      "artur-alvim",
      "cidade-lider",
      "jose-bonifacio",
      "lajeado",
      "parque-do-carmo",
      "ponte-rasa",
      "sao-miguel",
      "vila-jacui"
    ]
  },
  {
    "slug": "jabaquara",
    "nome": "Jabaquara",
    "sigla": "JAB",
    "codigo": 38,
    "subprefeitura": "jabaquara",
    "regiao": "sul",
    "centroide": {
      "lat": -23.65055,
      "lng": -46.64591
    },
    "areaKm2": 14,
    "vizinhos": [
      "campo-belo",
      "cidade-ademar",
      "cursino",
      "saude"
    ]
  },
  {
    "slug": "jacana",
    "nome": "Jaçanã",
    "sigla": "JAC",
    "codigo": 39,
    "subprefeitura": "jacana-tremembe",
    "regiao": "norte",
    "centroide": {
      "lat": -23.46013,
      "lng": -46.5749
    },
    "areaKm2": 8.2,
    "vizinhos": [
      "tremembe",
      "tucuruvi",
      "vila-medeiros"
    ]
  },
  {
    "slug": "jaguara",
    "nome": "Jaguara",
    "sigla": "JAG",
    "codigo": 40,
    "subprefeitura": "lapa",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.51103,
      "lng": -46.74713
    },
    "areaKm2": 4.6,
    "vizinhos": [
      "lapa",
      "sao-domingos",
      "vila-leopoldina"
    ]
  },
  {
    "slug": "jaguare",
    "nome": "Jaguaré",
    "sigla": "JRE",
    "codigo": 41,
    "subprefeitura": "lapa",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.54382,
      "lng": -46.74871
    },
    "areaKm2": 6.5,
    "vizinhos": [
      "alto-de-pinheiros",
      "butanta",
      "rio-pequeno",
      "vila-leopoldina"
    ]
  },
  {
    "slug": "jaragua",
    "nome": "Jaraguá",
    "sigla": "JAR",
    "codigo": 42,
    "subprefeitura": "pirituba-jaragua",
    "regiao": "norte",
    "centroide": {
      "lat": -23.44591,
      "lng": -46.74003
    },
    "areaKm2": 28.2,
    "vizinhos": [
      "anhanguera",
      "brasilandia",
      "perus",
      "pirituba",
      "sao-domingos"
    ]
  },
  {
    "slug": "jardim-angela",
    "nome": "Jardim Ângela",
    "sigla": "JDA",
    "codigo": 43,
    "subprefeitura": "mboi-mirim",
    "regiao": "sul",
    "centroide": {
      "lat": -23.71636,
      "lng": -46.76872
    },
    "areaKm2": 37.4,
    "vizinhos": [
      "capao-redondo",
      "cidade-dutra",
      "jardim-sao-luis",
      "parelheiros"
    ]
  },
  {
    "slug": "jardim-helena",
    "nome": "Jardim Helena",
    "sigla": "JDH",
    "codigo": 44,
    "subprefeitura": "sao-miguel",
    "regiao": "leste",
    "centroide": {
      "lat": -23.4837,
      "lng": -46.41309
    },
    "areaKm2": 9.1,
    "vizinhos": [
      "itaim-paulista",
      "sao-miguel",
      "vila-curuca"
    ]
  },
  {
    "slug": "jardim-paulista",
    "nome": "Jardim Paulista",
    "sigla": "JDP",
    "codigo": 45,
    "subprefeitura": "pinheiros",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.56651,
      "lng": -46.66676
    },
    "areaKm2": 6.2,
    "vizinhos": [
      "bela-vista",
      "consolacao",
      "itaim-bibi",
      "moema",
      "perdizes",
      "pinheiros",
      "vila-mariana"
    ]
  },
  {
    "slug": "jardim-sao-luis",
    "nome": "Jardim São Luís",
    "sigla": "JDS",
    "codigo": 46,
    "subprefeitura": "mboi-mirim",
    "regiao": "sul",
    "centroide": {
      "lat": -23.68073,
      "lng": -46.7394
    },
    "areaKm2": 26,
    "vizinhos": [
      "campo-limpo",
      "capao-redondo",
      "cidade-dutra",
      "jardim-angela",
      "santo-amaro",
      "socorro",
      "vila-andrade"
    ]
  },
  {
    "slug": "jose-bonifacio",
    "nome": "José Bonifácio",
    "sigla": "JBO",
    "codigo": 47,
    "subprefeitura": "itaquera",
    "regiao": "leste",
    "centroide": {
      "lat": -23.56739,
      "lng": -46.43266
    },
    "areaKm2": 14.5,
    "vizinhos": [
      "cidade-tiradentes",
      "guaianases",
      "iguatemi",
      "itaquera",
      "lajeado",
      "parque-do-carmo"
    ]
  },
  {
    "slug": "lajeado",
    "nome": "Lajeado",
    "sigla": "LAJ",
    "codigo": 96,
    "subprefeitura": "guaianases",
    "regiao": "leste",
    "centroide": {
      "lat": -23.53361,
      "lng": -46.40866
    },
    "areaKm2": 8.8,
    "vizinhos": [
      "guaianases",
      "itaim-paulista",
      "itaquera",
      "jose-bonifacio",
      "sao-miguel",
      "vila-curuca"
    ]
  },
  {
    "slug": "lapa",
    "nome": "Lapa",
    "sigla": "LAP",
    "codigo": 48,
    "subprefeitura": "lapa",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.52264,
      "lng": -46.70598
    },
    "areaKm2": 10.3,
    "vizinhos": [
      "alto-de-pinheiros",
      "barra-funda",
      "freguesia-do-o",
      "jaguara",
      "perdizes",
      "pirituba",
      "sao-domingos",
      "vila-leopoldina"
    ]
  },
  {
    "slug": "liberdade",
    "nome": "Liberdade",
    "sigla": "LIB",
    "codigo": 49,
    "subprefeitura": "se",
    "regiao": "centro",
    "centroide": {
      "lat": -23.56695,
      "lng": -46.63196
    },
    "areaKm2": 3.6,
    "vizinhos": [
      "bela-vista",
      "cambuci",
      "se",
      "vila-mariana"
    ]
  },
  {
    "slug": "limao",
    "nome": "Limão",
    "sigla": "LIM",
    "codigo": 50,
    "subprefeitura": "casa-verde-cachoeirinha",
    "regiao": "norte",
    "centroide": {
      "lat": -23.49751,
      "lng": -46.67604
    },
    "areaKm2": 6.4,
    "vizinhos": [
      "barra-funda",
      "cachoeirinha",
      "casa-verde",
      "freguesia-do-o"
    ]
  },
  {
    "slug": "mandaqui",
    "nome": "Mandaqui",
    "sigla": "MAN",
    "codigo": 51,
    "subprefeitura": "santana-tucuruvi",
    "regiao": "norte",
    "centroide": {
      "lat": -23.45947,
      "lng": -46.64086
    },
    "areaKm2": 13.2,
    "vizinhos": [
      "cachoeirinha",
      "casa-verde",
      "santana",
      "tremembe",
      "tucuruvi"
    ]
  },
  {
    "slug": "marsilac",
    "nome": "Marsilac",
    "sigla": "MAR",
    "codigo": 52,
    "subprefeitura": "parelheiros",
    "regiao": "sul",
    "centroide": {
      "lat": -23.93531,
      "lng": -46.70786
    },
    "areaKm2": 208.3,
    "vizinhos": [
      "parelheiros"
    ]
  },
  {
    "slug": "moema",
    "nome": "Moema",
    "sigla": "MOE",
    "codigo": 32,
    "subprefeitura": "vila-mariana",
    "regiao": "sul",
    "centroide": {
      "lat": -23.59611,
      "lng": -46.66137
    },
    "areaKm2": 9.1,
    "vizinhos": [
      "campo-belo",
      "itaim-bibi",
      "jardim-paulista",
      "saude",
      "vila-mariana"
    ]
  },
  {
    "slug": "mooca",
    "nome": "Mooca",
    "sigla": "MOO",
    "codigo": 53,
    "subprefeitura": "mooca",
    "regiao": "leste",
    "centroide": {
      "lat": -23.56135,
      "lng": -46.59641
    },
    "areaKm2": 7.9,
    "vizinhos": [
      "agua-rasa",
      "belem",
      "bras",
      "cambuci",
      "ipiranga",
      "vila-prudente"
    ]
  },
  {
    "slug": "morumbi",
    "nome": "Morumbi",
    "sigla": "MOR",
    "codigo": 54,
    "subprefeitura": "butanta",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.59632,
      "lng": -46.70802
    },
    "areaKm2": 11.5,
    "vizinhos": [
      "butanta",
      "itaim-bibi",
      "pinheiros",
      "vila-andrade",
      "vila-sonia"
    ]
  },
  {
    "slug": "parelheiros",
    "nome": "Parelheiros",
    "sigla": "PLH",
    "codigo": 55,
    "subprefeitura": "parelheiros",
    "regiao": "sul",
    "centroide": {
      "lat": -23.82996,
      "lng": -46.71663
    },
    "areaKm2": 152.5,
    "vizinhos": [
      "cidade-dutra",
      "grajau",
      "jardim-angela",
      "marsilac"
    ]
  },
  {
    "slug": "pari",
    "nome": "Pari",
    "sigla": "PRI",
    "codigo": 56,
    "subprefeitura": "mooca",
    "regiao": "leste",
    "centroide": {
      "lat": -23.52719,
      "lng": -46.61751
    },
    "areaKm2": 2.7,
    "vizinhos": [
      "belem",
      "bom-retiro",
      "bras",
      "santana",
      "vila-guilherme"
    ]
  },
  {
    "slug": "parque-do-carmo",
    "nome": "Parque do Carmo",
    "sigla": "PQC",
    "codigo": 57,
    "subprefeitura": "itaquera",
    "regiao": "leste",
    "centroide": {
      "lat": -23.57595,
      "lng": -46.46298
    },
    "areaKm2": 15.4,
    "vizinhos": [
      "cidade-lider",
      "iguatemi",
      "itaquera",
      "jose-bonifacio",
      "sao-mateus"
    ]
  },
  {
    "slug": "pedreira",
    "nome": "Pedreira",
    "sigla": "PDR",
    "codigo": 58,
    "subprefeitura": "cidade-ademar",
    "regiao": "sul",
    "centroide": {
      "lat": -23.70675,
      "lng": -46.64982
    },
    "areaKm2": 18.3,
    "vizinhos": [
      "campo-grande",
      "cidade-ademar",
      "cidade-dutra",
      "grajau"
    ]
  },
  {
    "slug": "penha",
    "nome": "Penha",
    "sigla": "PEN",
    "codigo": 59,
    "subprefeitura": "penha",
    "regiao": "leste",
    "centroide": {
      "lat": -23.52312,
      "lng": -46.52915
    },
    "areaKm2": 11.5,
    "vizinhos": [
      "artur-alvim",
      "cangaiba",
      "ponte-rasa",
      "tatuape",
      "vila-maria",
      "vila-matilde"
    ]
  },
  {
    "slug": "perdizes",
    "nome": "Perdizes",
    "sigla": "PRD",
    "codigo": 60,
    "subprefeitura": "lapa",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.53872,
      "lng": -46.68093
    },
    "areaKm2": 6.3,
    "vizinhos": [
      "alto-de-pinheiros",
      "barra-funda",
      "consolacao",
      "jardim-paulista",
      "lapa",
      "pinheiros",
      "santa-cecilia"
    ]
  },
  {
    "slug": "perus",
    "nome": "Perus",
    "sigla": "PRS",
    "codigo": 61,
    "subprefeitura": "perus",
    "regiao": "norte",
    "centroide": {
      "lat": -23.40792,
      "lng": -46.74613
    },
    "areaKm2": 23.6,
    "vizinhos": [
      "anhanguera",
      "jaragua"
    ]
  },
  {
    "slug": "pinheiros",
    "nome": "Pinheiros",
    "sigla": "PIN",
    "codigo": 62,
    "subprefeitura": "pinheiros",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.56647,
      "lng": -46.68867
    },
    "areaKm2": 8.3,
    "vizinhos": [
      "alto-de-pinheiros",
      "butanta",
      "itaim-bibi",
      "jardim-paulista",
      "morumbi",
      "perdizes"
    ]
  },
  {
    "slug": "pirituba",
    "nome": "Pirituba",
    "sigla": "PIR",
    "codigo": 63,
    "subprefeitura": "pirituba-jaragua",
    "regiao": "norte",
    "centroide": {
      "lat": -23.48085,
      "lng": -46.72628
    },
    "areaKm2": 17.1,
    "vizinhos": [
      "brasilandia",
      "freguesia-do-o",
      "jaragua",
      "lapa",
      "sao-domingos"
    ]
  },
  {
    "slug": "ponte-rasa",
    "nome": "Ponte Rasa",
    "sigla": "PRA",
    "codigo": 64,
    "subprefeitura": "ermelino-matarazzo",
    "regiao": "leste",
    "centroide": {
      "lat": -23.51567,
      "lng": -46.49373
    },
    "areaKm2": 6.6,
    "vizinhos": [
      "artur-alvim",
      "cangaiba",
      "ermelino-matarazzo",
      "itaquera",
      "penha",
      "vila-jacui"
    ]
  },
  {
    "slug": "raposo-tavares",
    "nome": "Raposo Tavares",
    "sigla": "RTA",
    "codigo": 65,
    "subprefeitura": "butanta",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.59245,
      "lng": -46.78561
    },
    "areaKm2": 12.4,
    "vizinhos": [
      "butanta",
      "rio-pequeno",
      "vila-sonia"
    ]
  },
  {
    "slug": "republica",
    "nome": "República",
    "sigla": "REP",
    "codigo": 66,
    "subprefeitura": "se",
    "regiao": "centro",
    "centroide": {
      "lat": -23.54476,
      "lng": -46.64105
    },
    "areaKm2": 2.4,
    "vizinhos": [
      "bela-vista",
      "bom-retiro",
      "consolacao",
      "santa-cecilia",
      "se"
    ]
  },
  {
    "slug": "rio-pequeno",
    "nome": "Rio Pequeno",
    "sigla": "RPE",
    "codigo": 67,
    "subprefeitura": "butanta",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.57139,
      "lng": -46.75887
    },
    "areaKm2": 9.5,
    "vizinhos": [
      "butanta",
      "jaguare",
      "raposo-tavares"
    ]
  },
  {
    "slug": "sacoma",
    "nome": "Sacomã",
    "sigla": "SAC",
    "codigo": 68,
    "subprefeitura": "ipiranga",
    "regiao": "sul",
    "centroide": {
      "lat": -23.63083,
      "lng": -46.59817
    },
    "areaKm2": 14.5,
    "vizinhos": [
      "cursino",
      "ipiranga"
    ]
  },
  {
    "slug": "santa-cecilia",
    "nome": "Santa Cecília",
    "sigla": "SCE",
    "codigo": 69,
    "subprefeitura": "se",
    "regiao": "centro",
    "centroide": {
      "lat": -23.5318,
      "lng": -46.65288
    },
    "areaKm2": 3.7,
    "vizinhos": [
      "barra-funda",
      "bom-retiro",
      "consolacao",
      "perdizes",
      "republica"
    ]
  },
  {
    "slug": "santana",
    "nome": "Santana",
    "sigla": "STN",
    "codigo": 70,
    "subprefeitura": "santana-tucuruvi",
    "regiao": "norte",
    "centroide": {
      "lat": -23.50001,
      "lng": -46.63037
    },
    "areaKm2": 13.1,
    "vizinhos": [
      "bom-retiro",
      "casa-verde",
      "mandaqui",
      "pari",
      "tucuruvi",
      "vila-guilherme"
    ]
  },
  {
    "slug": "santo-amaro",
    "nome": "Santo Amaro",
    "sigla": "SAM",
    "codigo": 71,
    "subprefeitura": "santo-amaro",
    "regiao": "sul",
    "centroide": {
      "lat": -23.64237,
      "lng": -46.7012
    },
    "areaKm2": 16,
    "vizinhos": [
      "campo-belo",
      "campo-grande",
      "cidade-ademar",
      "itaim-bibi",
      "jardim-sao-luis",
      "socorro",
      "vila-andrade"
    ]
  },
  {
    "slug": "sao-domingos",
    "nome": "São Domingos",
    "sigla": "SDO",
    "codigo": 95,
    "subprefeitura": "pirituba-jaragua",
    "regiao": "norte",
    "centroide": {
      "lat": -23.49337,
      "lng": -46.74761
    },
    "areaKm2": 9.9,
    "vizinhos": [
      "jaguara",
      "jaragua",
      "lapa",
      "pirituba"
    ]
  },
  {
    "slug": "sao-lucas",
    "nome": "São Lucas",
    "sigla": "SLU",
    "codigo": 72,
    "subprefeitura": "vila-prudente",
    "regiao": "leste",
    "centroide": {
      "lat": -23.59468,
      "lng": -46.54359
    },
    "areaKm2": 9.7,
    "vizinhos": [
      "agua-rasa",
      "sapopemba",
      "vila-formosa",
      "vila-prudente"
    ]
  },
  {
    "slug": "sao-mateus",
    "nome": "São Mateus",
    "sigla": "SMT",
    "codigo": 73,
    "subprefeitura": "sao-mateus",
    "regiao": "leste",
    "centroide": {
      "lat": -23.60004,
      "lng": -46.48124
    },
    "areaKm2": 12.8,
    "vizinhos": [
      "aricanduva",
      "cidade-lider",
      "iguatemi",
      "parque-do-carmo",
      "sao-rafael",
      "sapopemba"
    ]
  },
  {
    "slug": "sao-miguel",
    "nome": "São Miguel",
    "sigla": "SMI",
    "codigo": 74,
    "subprefeitura": "sao-miguel",
    "regiao": "leste",
    "centroide": {
      "lat": -23.50107,
      "lng": -46.4408
    },
    "areaKm2": 8.6,
    "vizinhos": [
      "itaquera",
      "jardim-helena",
      "lajeado",
      "vila-curuca",
      "vila-jacui"
    ]
  },
  {
    "slug": "sao-rafael",
    "nome": "São Rafael",
    "sigla": "SRA",
    "codigo": 75,
    "subprefeitura": "sao-mateus",
    "regiao": "leste",
    "centroide": {
      "lat": -23.62821,
      "lng": -46.45395
    },
    "areaKm2": 13.1,
    "vizinhos": [
      "iguatemi",
      "sao-mateus"
    ]
  },
  {
    "slug": "sapopemba",
    "nome": "Sapopemba",
    "sigla": "SAP",
    "codigo": 76,
    "subprefeitura": "sapopemba",
    "regiao": "leste",
    "centroide": {
      "lat": -23.60556,
      "lng": -46.50954
    },
    "areaKm2": 13.6,
    "vizinhos": [
      "aricanduva",
      "sao-lucas",
      "sao-mateus",
      "vila-formosa"
    ]
  },
  {
    "slug": "saude",
    "nome": "Saúde",
    "sigla": "SAU",
    "codigo": 77,
    "subprefeitura": "vila-mariana",
    "regiao": "sul",
    "centroide": {
      "lat": -23.61462,
      "lng": -46.64108
    },
    "areaKm2": 9.3,
    "vizinhos": [
      "campo-belo",
      "cursino",
      "jabaquara",
      "moema",
      "vila-mariana"
    ]
  },
  {
    "slug": "se",
    "nome": "Sé",
    "sigla": "SEE",
    "codigo": 78,
    "subprefeitura": "se",
    "regiao": "centro",
    "centroide": {
      "lat": -23.54771,
      "lng": -46.63145
    },
    "areaKm2": 2.2,
    "vizinhos": [
      "bom-retiro",
      "bras",
      "cambuci",
      "liberdade",
      "republica"
    ]
  },
  {
    "slug": "socorro",
    "nome": "Socorro",
    "sigla": "SOC",
    "codigo": 79,
    "subprefeitura": "capela-do-socorro",
    "regiao": "sul",
    "centroide": {
      "lat": -23.68528,
      "lng": -46.71372
    },
    "areaKm2": 11.9,
    "vizinhos": [
      "campo-grande",
      "cidade-dutra",
      "jardim-sao-luis",
      "santo-amaro"
    ]
  },
  {
    "slug": "tatuape",
    "nome": "Tatuapé",
    "sigla": "TAT",
    "codigo": 80,
    "subprefeitura": "mooca",
    "regiao": "leste",
    "centroide": {
      "lat": -23.53868,
      "lng": -46.56745
    },
    "areaKm2": 8.5,
    "vizinhos": [
      "agua-rasa",
      "belem",
      "carrao",
      "penha",
      "vila-formosa",
      "vila-maria",
      "vila-matilde"
    ]
  },
  {
    "slug": "tremembe",
    "nome": "Tremembé",
    "sigla": "TRE",
    "codigo": 81,
    "subprefeitura": "jacana-tremembe",
    "regiao": "norte",
    "centroide": {
      "lat": -23.41716,
      "lng": -46.5895
    },
    "areaKm2": 56.5,
    "vizinhos": [
      "jacana",
      "mandaqui",
      "tucuruvi"
    ]
  },
  {
    "slug": "tucuruvi",
    "nome": "Tucuruvi",
    "sigla": "TUC",
    "codigo": 82,
    "subprefeitura": "santana-tucuruvi",
    "regiao": "norte",
    "centroide": {
      "lat": -23.4757,
      "lng": -46.60604
    },
    "areaKm2": 9.4,
    "vizinhos": [
      "jacana",
      "mandaqui",
      "santana",
      "tremembe",
      "vila-guilherme",
      "vila-medeiros"
    ]
  },
  {
    "slug": "vila-andrade",
    "nome": "Vila Andrade",
    "sigla": "VAN",
    "codigo": 83,
    "subprefeitura": "campo-limpo",
    "regiao": "sul",
    "centroide": {
      "lat": -23.62623,
      "lng": -46.72828
    },
    "areaKm2": 10.3,
    "vizinhos": [
      "campo-limpo",
      "jardim-sao-luis",
      "morumbi",
      "santo-amaro",
      "vila-sonia"
    ]
  },
  {
    "slug": "vila-curuca",
    "nome": "Vila Curuçá",
    "sigla": "VCR",
    "codigo": 84,
    "subprefeitura": "itaim-paulista",
    "regiao": "leste",
    "centroide": {
      "lat": -23.51,
      "lng": -46.41566
    },
    "areaKm2": 9.4,
    "vizinhos": [
      "itaim-paulista",
      "jardim-helena",
      "lajeado",
      "sao-miguel"
    ]
  },
  {
    "slug": "vila-formosa",
    "nome": "Vila Formosa",
    "sigla": "VFO",
    "codigo": 85,
    "subprefeitura": "aricanduva-formosa-carrao",
    "regiao": "leste",
    "centroide": {
      "lat": -23.56786,
      "lng": -46.54599
    },
    "areaKm2": 7.5,
    "vizinhos": [
      "agua-rasa",
      "aricanduva",
      "carrao",
      "sao-lucas",
      "sapopemba",
      "tatuape"
    ]
  },
  {
    "slug": "vila-guilherme",
    "nome": "Vila Guilherme",
    "sigla": "VGL",
    "codigo": 86,
    "subprefeitura": "vila-maria-vila-guilherme",
    "regiao": "norte",
    "centroide": {
      "lat": -23.50918,
      "lng": -46.60577
    },
    "areaKm2": 7.2,
    "vizinhos": [
      "belem",
      "pari",
      "santana",
      "tucuruvi",
      "vila-maria",
      "vila-medeiros"
    ]
  },
  {
    "slug": "vila-jacui",
    "nome": "Vila Jacuí",
    "sigla": "VJA",
    "codigo": 87,
    "subprefeitura": "sao-miguel",
    "regiao": "leste",
    "centroide": {
      "lat": -23.50262,
      "lng": -46.46156
    },
    "areaKm2": 8.3,
    "vizinhos": [
      "ermelino-matarazzo",
      "itaquera",
      "ponte-rasa",
      "sao-miguel"
    ]
  },
  {
    "slug": "vila-leopoldina",
    "nome": "Vila Leopoldina",
    "sigla": "VLE",
    "codigo": 88,
    "subprefeitura": "lapa",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.52927,
      "lng": -46.73437
    },
    "areaKm2": 7,
    "vizinhos": [
      "alto-de-pinheiros",
      "jaguara",
      "jaguare",
      "lapa"
    ]
  },
  {
    "slug": "vila-maria",
    "nome": "Vila Maria",
    "sigla": "VMR",
    "codigo": 89,
    "subprefeitura": "vila-maria-vila-guilherme",
    "regiao": "norte",
    "centroide": {
      "lat": -23.51303,
      "lng": -46.57778
    },
    "areaKm2": 11.8,
    "vizinhos": [
      "belem",
      "penha",
      "tatuape",
      "vila-guilherme",
      "vila-medeiros"
    ]
  },
  {
    "slug": "vila-mariana",
    "nome": "Vila Mariana",
    "sigla": "VMN",
    "codigo": 90,
    "subprefeitura": "vila-mariana",
    "regiao": "sul",
    "centroide": {
      "lat": -23.5865,
      "lng": -46.6358
    },
    "areaKm2": 8.6,
    "vizinhos": [
      "bela-vista",
      "cambuci",
      "cursino",
      "ipiranga",
      "jardim-paulista",
      "liberdade",
      "moema",
      "saude"
    ]
  },
  {
    "slug": "vila-matilde",
    "nome": "Vila Matilde",
    "sigla": "VMT",
    "codigo": 91,
    "subprefeitura": "penha",
    "regiao": "leste",
    "centroide": {
      "lat": -23.53936,
      "lng": -46.51788
    },
    "areaKm2": 8.7,
    "vizinhos": [
      "artur-alvim",
      "carrao",
      "cidade-lider",
      "penha",
      "tatuape"
    ]
  },
  {
    "slug": "vila-medeiros",
    "nome": "Vila Medeiros",
    "sigla": "VMD",
    "codigo": 92,
    "subprefeitura": "vila-maria-vila-guilherme",
    "regiao": "norte",
    "centroide": {
      "lat": -23.48874,
      "lng": -46.57762
    },
    "areaKm2": 7.8,
    "vizinhos": [
      "jacana",
      "tucuruvi",
      "vila-guilherme",
      "vila-maria"
    ]
  },
  {
    "slug": "vila-prudente",
    "nome": "Vila Prudente",
    "sigla": "VPR",
    "codigo": 93,
    "subprefeitura": "vila-prudente",
    "regiao": "leste",
    "centroide": {
      "lat": -23.59255,
      "lng": -46.57278
    },
    "areaKm2": 9.6,
    "vizinhos": [
      "agua-rasa",
      "ipiranga",
      "mooca",
      "sao-lucas"
    ]
  },
  {
    "slug": "vila-sonia",
    "nome": "Vila Sônia",
    "sigla": "VSO",
    "codigo": 94,
    "subprefeitura": "butanta",
    "regiao": "oeste",
    "centroide": {
      "lat": -23.59944,
      "lng": -46.73923
    },
    "areaKm2": 10,
    "vizinhos": [
      "butanta",
      "campo-limpo",
      "morumbi",
      "raposo-tavares",
      "vila-andrade"
    ]
  }
];
