import AWS from 'aws-sdk';
import axios from 'axios';

const VACCINI_TABLE = process.env.VACCINI_TABLE;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;


const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const saveUser = async (chat) => {
    try {
        await dynamoDb.put({
            TableName: VACCINI_TABLE,
            Item: {
                type: `${chat.id}`, chat
            },
        }).promise()

    } catch (error) {
        console.error('Failed to save the new user in the table', chat, error)
        throw error;
    }
}
export const deleteUser = async (chat) => {
    try {
        await dynamoDb.delete({
            TableName: VACCINI_TABLE,
            Key: { type: `${chat.id}` },
        }).promise()

    } catch (error) {
        console.error('Failed to save the new user in the table', chat, error)
        throw error;
    }
}

export const getAllUsersChatIds = async (): Promise<number[]> => {
    try {
        const scanResult = await dynamoDb.scan({
            TableName: VACCINI_TABLE,
            ProjectionExpression: 'chat.id'
        }).promise()

        return scanResult.Items.map(result => result.chat?.id).filter(Boolean);

    } catch (error) {
        console.error('Failed get all users', error)
        return [];
    }
}


export const sendToUser = async (chat_id, text) => await axios.get(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    params: {
        chat_id,
        text
    }
})
export const notifyUsers = async (currentAdministrationItaly: number, peopleFullyCovered: number, boosterDoses: number, platea: number, users?: number[]) => {
    const userIds = users || await getAllUsersChatIds();
    await Promise.allSettled(userIds.map(id => sendToUser(id, `Persone con ciclo vaccinale completo
${new Intl.NumberFormat('it-IT').format(peopleFullyCovered)} (${new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(peopleFullyCovered / platea * 100)}%)

Dosi booster
${new Intl.NumberFormat('it-IT').format(boosterDoses)}

Totale dosi somministrate
${new Intl.NumberFormat('it-IT').format(currentAdministrationItaly)}`)))
}