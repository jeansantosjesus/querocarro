/**

* Snapshot de respostas REAIS da API FIPE v2 (https://fipe.parallelum.com.br/api/v2),

* capturado em 06/11/2026 (mês de referência: novembro de 2026).

*

* Cada "response" é o corpo bruto retornado por

* GET /cars/brands/{brandId}/models/{modelId}/years/{yearId}.

* Nada foi acrescentado: a API NÃO fornece consumo, seguro, manutenção etc.

*

* Uso: modo demonstração, testes, desenvolvimento e fallback quando a API estiver

* indisponível. Sempre apresentado ao usuário como "referência salva", nunca como

* consulta em tempo real.

*/

export const FIPE_SNAPSHOT_CAPTURED_AT = '2026-11-06'



export interface FipeSnapshotEntry {

brandId: string

modelId: string

yearId: string

response: unknown

}



export const FIPE_SNAPSHOT: readonly FipeSnapshotEntry[] = [

{

brandId: '21',

modelId: '7825',

yearId: '2020-5',

response: {

vehicleType: 1,

price: 'R$ 45.828,00',

brand: 'Fiat',

model: 'MOBI DRIVE 1.0 Flex 6V 5p',

modelYear: 2020,

fuel: 'Flex',

codeFipe: '001480-0',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '21',

modelId: '10392',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 76.387,00',

brand: 'Fiat',

model: 'ARGO DRIVE 1.3 8V Flex Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '001561-0',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '21',

modelId: '9990',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 77.375,00',

brand: 'Fiat',

model: 'CRONOS DRIVE 1.3 8V Flex Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '001554-7',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '21',

modelId: '9646',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 85.095,00',

brand: 'Fiat',

model: 'PULSE DRIVE 1.0 Turbo 200 Flex Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '001543-1',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '21',

modelId: '10754',

yearId: '2024-5',

response: {

vehicleType: 1,

price: 'R$ 96.673,00',

brand: 'Fiat',

model: 'Fastback 1.0 200 Turbo Flex Aut',

modelYear: 2024,

fuel: 'Flex',

codeFipe: '001568-7',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '59',

modelId: '10107',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 68.486,00',

brand: 'VW - VolksWagen',

model: 'Polo 1.0 MPI Flex 12V 5p',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '005533-6',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '59',

modelId: '10108',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 76.116,00',

brand: 'VW - VolksWagen',

model: 'Polo 1.0 TSI Flex 12V 5p',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '005534-4',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '59',

modelId: '11300',

yearId: '2025-5',

response: {

vehicleType: 1,

price: 'R$ 90.250,00',

brand: 'VW - VolksWagen',

model: 'VIRTUS Sense 1.0 Flex 12V 5p Mec. ',

modelYear: 2025,

fuel: 'Flex',

codeFipe: '005551-4',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '59',

modelId: '8186',

yearId: '2021-5',

response: {

vehicleType: 1,

price: 'R$ 86.283,00',

brand: 'VW - VolksWagen',

model: 'VIRTUS Highline 200 TSI 1.0 Flex 12V Aut',

modelYear: 2021,

fuel: 'Flex',

codeFipe: '005484-4',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '59',

modelId: '10376',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 91.739,00',

brand: 'VW - VolksWagen',

model: 'T-Cross Sense 200 TSI 1.0 Flex 5p Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '005520-4',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '59',

modelId: '9150',

yearId: '2022-5',

response: {

vehicleType: 1,

price: 'R$ 94.952,00',

brand: 'VW - VolksWagen',

model: 'Nivus Comfortline 1.0 200 TSI Flex Aut.',

modelYear: 2022,

fuel: 'Flex',

codeFipe: '005525-5',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '59',

modelId: '8323',

yearId: '2021-5',

response: {

vehicleType: 1,

price: 'R$ 46.837,00',

brand: 'VW - VolksWagen',

model: 'Gol 1.0 Flex 12V 5p',

modelYear: 2021,

fuel: 'Flex',

codeFipe: '005490-9',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '23',

modelId: '8949',

yearId: '2022-5',

response: {

vehicleType: 1,

price: 'R$ 61.082,00',

brand: 'GM - Chevrolet',

model: 'ONIX HATCH LT 1.0 12V Flex 5p Mec.',

modelYear: 2022,

fuel: 'Flex',

codeFipe: '004517-9',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '23',

modelId: '8889',

yearId: '2024-5',

response: {

vehicleType: 1,

price: 'R$ 74.487,00',

brand: 'GM - Chevrolet',

model: 'ONIX HATCH 1.0 12V TB Flex 5p Aut.',

modelYear: 2024,

fuel: 'Flex',

codeFipe: '004511-0',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '23',

modelId: '9046',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 90.851,00',

brand: 'GM - Chevrolet',

model: 'TRACKER LT 1.0 Turbo 12V Flex Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '004522-5',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '23',

modelId: '6103',

yearId: '2022-5',

response: {

vehicleType: 1,

price: 'R$ 74.772,00',

brand: 'GM - Chevrolet',

model: 'SPIN LT 1.8 8V Econo.Flex 5p Aut.',

modelYear: 2022,

fuel: 'Flex',

codeFipe: '004415-6',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '23',

modelId: '10402',

yearId: '2024-5',

response: {

vehicleType: 1,

price: 'R$ 97.513,00',

brand: 'GM - Chevrolet',

model: 'MONTANA LT 1.2 Turbo Flex 12V 4p Mec.',

modelYear: 2024,

fuel: 'Flex',

codeFipe: '004540-3',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '26',

modelId: '9906',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 62.837,00',

brand: 'Hyundai',

model: 'HB20 Comfort 1.0 Flex 12V Mec.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '015215-3',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '26',

modelId: '9907',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 78.447,00',

brand: 'Hyundai',

model: 'HB20 Comfort 1.0 TB Flex 12V Aut',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '015214-5',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},
{

brandId: '26',

modelId: '9601',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 103.100,00',

brand: 'Hyundai',

model: 'Creta Comfort 1.0 TB 12V Flex Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '015200-5',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '56',

modelId: '9984',

yearId: '2023-6',

response: {

vehicleType: 1,

price: 'R$ 135.892,00',

brand: 'Toyota',

model: 'Corolla Altis 1.8 16V Aut. (Híbrido)',

modelYear: 2023,

fuel: 'Híbrido',

codeFipe: '002182-2',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'H',

},

},

{

brandId: '56',

modelId: '9326',

yearId: '2022-5',

response: {

vehicleType: 1,

price: 'R$ 124.306,00',

brand: 'Toyota',

model: 'Corolla Cross XRE 2.0 16V Flex Aut.',

modelYear: 2022,

fuel: 'Flex',

codeFipe: '002203-9',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '56',

modelId: '9726',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 82.181,00',

brand: 'Toyota',

model: 'YARIS XL 1.5 Flex 16V 5p Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '002207-1',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '25',

modelId: '10964',

yearId: '2024-5',

response: {

vehicleType: 1,

price: 'R$ 102.652,00',

brand: 'Honda',

model: 'CITY Hatchback EX 1.5 Flex 16V Aut.',

modelYear: 2024,

fuel: 'Flex',

codeFipe: '014115-1',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '25',

modelId: '10217',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 127.988,00',

brand: 'Honda',

model: 'HR-V EX 1.5 Flex Sensing 16V 5p Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '014109-7',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '48',

modelId: '8023',

yearId: '2022-5',

response: {

vehicleType: 1,

price: 'R$ 44.308,00',

brand: 'Renault',

model: 'KWID Zen 1.0 Flex 12V 5p Mec.',

modelYear: 2022,

fuel: 'Flex',

codeFipe: '025266-2',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '48',

modelId: '7993',

yearId: '2020-5',

response: {

vehicleType: 1,

price: 'R$ 70.488,00',

brand: 'Renault',

model: 'DUSTER Dynamique 1.6 Flex 16V Aut.',

modelYear: 2020,

fuel: 'Flex',

codeFipe: '025264-6',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '29',

modelId: '9745',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 97.160,00',

brand: 'Jeep',

model: 'Renegade Long. T270 1.3 TB 4x2 Flex Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '017088-7',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '29',

modelId: '9457',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 121.271,00',

brand: 'Jeep',

model: 'COMPASS LONG. T270 1.3 TB 4x2 Flex Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '017071-2',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '43',

modelId: '9335',

yearId: '2022-5',

response: {

vehicleType: 1,

price: 'R$ 90.518,00',

brand: 'Nissan',

model: 'KICKS Advance 1.6 16V Flex Aut.',

modelYear: 2022,

fuel: 'Flex',

codeFipe: '023180-0',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '43',

modelId: '9233',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 83.266,00',

brand: 'Nissan',

model: 'VERSA Sense 1.6 16V Flex Aut.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '023176-2',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '44',

modelId: '11093',

yearId: '2024-5',

response: {

vehicleType: 1,

price: 'R$ 79.642,00',

brand: 'Peugeot',

model: '208 Allure 1.0 Turbo Flex 5p Aut.',

modelYear: 2024,

fuel: 'Flex',

codeFipe: '024273-0',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '13',

modelId: '10091',

yearId: '2023-5',

response: {

vehicleType: 1,

price: 'R$ 61.352,00',

brand: 'Citroën',

model: 'C3 Feel 1.0 Flex 6V 5p Mec.',

modelYear: 2023,

fuel: 'Flex',

codeFipe: '011224-0',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '238',

modelId: '12124',

yearId: '2024-4',

response: {

vehicleType: 1,

price: 'R$ 99.985,00',

brand: 'BYD',

model: 'Dolphin Mini GS (Elétrico)',

modelYear: 2024,

fuel: 'Elétrico',

codeFipe: '095010-6',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'E',

},

},

{

brandId: '13',

modelId: '11215',

yearId: '2025-5',

response: {

vehicleType: 1,

price: 'R$ 92.554,00',

brand: 'Citroën',

model: 'BASALT Feel 1.0 Flex TB 200 5p Aut.',

modelYear: 2025,

fuel: 'Flex',

codeFipe: '011239-9',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

{

brandId: '21',

modelId: '9647',

yearId: '2022-5',

response: {

vehicleType: 1,

price: 'R$ 83.186,00',

brand: 'Fiat',

model: 'PULSE DRIVE 1.3 8V Flex Aut.',

modelYear: 2022,

fuel: 'Flex',

codeFipe: '001544-0',

referenceMonth: 'novembro de 2026',

fuelAcronym: 'F',

},

},

]
