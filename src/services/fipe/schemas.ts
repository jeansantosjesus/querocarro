import { z } from 'zod'



/**

* Esquemas de validação das respostas da API FIPE v2.

* Apenas campos que a API realmente retorna. Campos extras são ignorados;

* campos obrigatórios ausentes invalidam a resposta.

*/

const codeName = z.object({

code: z.string().min(1),

name: z.string().min(1),

})



export const fipeBrandsSchema = z.array(codeName)

export const fipeModelsSchema = z.array(codeName)

export const fipeYearsSchema = z.array(codeName)



export const fipePriceResponseSchema = z.object({

price: z.string().min(1),

brand: z.string().min(1),

model: z.string().min(1),

modelYear: z.number().int(),

fuel: z.string().min(1),

codeFipe: z.string().min(1),

referenceMonth: z.string().min(1),

fuelAcronym: z.string().optional(),

vehicleType: z.number().optional(),

})



export type FipeBrand = z.infer<typeof codeName>

export type FipePriceResponse = z.infer<typeof fipePriceResponseSchema>
