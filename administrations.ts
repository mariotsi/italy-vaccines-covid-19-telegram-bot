import axios from 'axios';
import AWS from 'aws-sdk';

const VACCINI_TABLE = process.env.VACCINI_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();


enum Fornitore {
    PZIFER = 'Pfizer/BioNTech',
    MODERNA = 'Moderna',
    ASTRAZENECA = 'Vaxzevria (AstraZeneca)',
    JANSEEN = 'Janssen',
}

type SingleAdministration = {
    index: number;
    data_somministrazione: string;
    fornitore: Fornitore
    area: string;
    fascia_anagrafica: string;
    sesso_maschile: number;
    sesso_femminile: number;
    prima_dose: number;
    seconda_dose: number;
    pregressa_infezione: number,
    dose_aggiuntiva: number;
    nome_area: string;
}

type SummaryAdministrations = {
    data: SingleAdministration[]

}


type ResultCurrentAdministrations = { totalDoses: number, peopleFullyCovered: number, lastDate: string, boosterDoses: number }
export const getCurrentNumberOfAdministrations = async (): Promise<ResultCurrentAdministrations> => {
    try {
        const summary: SummaryAdministrations = (await axios.get('https://raw.githubusercontent.com/italia/covid19-opendata-vaccini/master/dati/somministrazioni-vaccini-latest.json')).data
        return summary.data.reduce((acc, instance) => {
            acc.boosterDoses = acc.boosterDoses + instance.dose_aggiuntiva,
                acc.totalDoses = acc.totalDoses + instance.seconda_dose + instance.pregressa_infezione + instance.prima_dose + instance.dose_aggiuntiva
            acc.peopleFullyCovered = acc.peopleFullyCovered + instance.seconda_dose + instance.pregressa_infezione + instance.fornitore === Fornitore.JANSEEN ? instance.prima_dose : 0;
            acc.lastDate = new Date(acc.lastDate || 0) > new Date(instance.data_somministrazione) ? acc.lastDate : instance.data_somministrazione;
            return acc;
        }, { totalDoses: 0, lastDate: '', peopleFullyCovered: 0, boosterDoses: 0 }
        )
    } catch (error) {
        console.error('Cannot fetch new numbers', error)
    }
}

export const getPreviousNumberOfAdministrations = async (): Promise<{
    previousAdministrationItaly: number;
    previousPeopleFullyCoveredItaly: number;
    boosterDosesItaly: number;
}> => {
    try {
        const latestTotalAdministrationItaly = await dynamoDb.get({
            TableName: VACCINI_TABLE,
            Key: {
                type: 'total',
            },
        }).promise()
        return { previousAdministrationItaly: latestTotalAdministrationItaly.Item?.value ?? 0, previousPeopleFullyCoveredItaly: latestTotalAdministrationItaly.Item?.peopleFullyCovered ?? 0, boosterDosesItaly: latestTotalAdministrationItaly.Item?.boosterDoses ?? 0 }
    } catch {
        return {
            previousAdministrationItaly: 0,
            previousPeopleFullyCoveredItaly: 0,
            boosterDosesItaly: 0
        }
    }
}

export const saveCurrentNumberOfAdministrations = async (administrations: number, peopleFullyCovered: number, boosterDoses: number, date: string) => {
    const item = {
        type: 'total',
        value: administrations,
        peopleFullyCovered,
        boosterDoses,
        date,
        lastUpdated: new Date().toISOString()
    }
    try {
        await dynamoDb.put({
            TableName: VACCINI_TABLE,
            Item: item,
        }).promise()

    } catch (error) {
        console.error('Failed to save the new administrations in the table', item, administrations, VACCINI_TABLE, error)
    }
}