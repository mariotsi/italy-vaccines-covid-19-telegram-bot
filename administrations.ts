import axios from 'axios';
import AWS from 'aws-sdk';

const VACCINI_TABLE = process.env.VACCINI_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

type SingleAdministration = {
    index: number;
    data_somministrazione: string;
    area: string;
    totale: number;
    seconda_dose: number;
    sesso_maschile: number;
    sesso_femminile: number;
    categoria_operatori_sanitari_sociosanitari: number;
    categoria_personale_non_sanitario: number;
    categoria_ospiti_rsa: number;
}

type SummaryAdministrations = {
    data: SingleAdministration[]

}

type ResultCurrentAdministrations = { total: number, secondDose: number, lastDate: string }
export const getCurrentNumberOfAdministrations = async (): Promise<ResultCurrentAdministrations> => {
    try {
        const summary: SummaryAdministrations = (await axios.get('https://raw.githubusercontent.com/italia/covid19-opendata-vaccini/master/dati/somministrazioni-vaccini-summary-latest.json')).data
        return summary.data.reduce((acc, instance) => {
            acc.total = acc.total + instance.totale;
            acc.secondDose = acc.secondDose + instance.seconda_dose;
            acc.lastDate = new Date(acc.lastDate || 0) > new Date(instance.data_somministrazione) ? acc.lastDate : instance.data_somministrazione;
            return acc;
        }, { total: 0, lastDate: '', secondDose: 0 }
        )
    } catch (error) {
        console.error('Cannot fetch new numbers', error)
    }
}

export const getPreviousNumberOfAdministrations = async (): Promise<{
    previousAdministrationItaly: number;
    previousPeopleFullyCoveredItaly: number;
}> => {
    try {
        const latestTotalAdministrationItaly = await dynamoDb.get({
            TableName: VACCINI_TABLE,
            Key: {
                type: 'total',
            },
        }).promise()
        return { previousAdministrationItaly: latestTotalAdministrationItaly.Item?.value ?? 0, previousPeopleFullyCoveredItaly: latestTotalAdministrationItaly.Item?.peopleFullyCovered ?? 0 }
    } catch {
        return {
            previousAdministrationItaly: 0,
            previousPeopleFullyCoveredItaly: 0
        }
    }
}

export const saveCurrentNumberOfAdministrations = async (administrations: number, peopleFullyCovered: number, date: string) => {
    const item = {
        type: 'total',
        value: administrations,
        peopleFullyCovered,
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