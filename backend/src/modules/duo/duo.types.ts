import {BadRequestException} from '@nestjs/common';
import {gemsToRubReferenceMinor,sumGemsMinor} from '../../common/money/gems';
import type {CatalogProductDto} from '../catalog/catalog.types';
export function duoTotals(amounts:number[],budgetRubMinor:number){
 if(!Number.isSafeInteger(budgetRubMinor)||budgetRubMinor<0)throw new BadRequestException('INVALID_BUDGET');
 const totalCoinMinor=sumGemsMinor(amounts),totalRubMinor=gemsToRubReferenceMinor(totalCoinMinor);
 return {totalCoinMinor,totalRubMinor,budgetRubMinor,remainingRubMinor:budgetRubMinor-totalRubMinor,withinBudget:totalRubMinor<=budgetRubMinor};
}
export type DuoSnapshot=ReturnType<typeof duoTotals>&{items:CatalogProductDto[]};
export type DuoQuoteDto=DuoSnapshot&{id:string;expiresAt:string};
