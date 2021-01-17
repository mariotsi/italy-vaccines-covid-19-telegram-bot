import serverless from 'serverless-http';
import express from 'express';
import bodyParser from 'body-parser';
import { saveUser, notifyUsers, deleteUser, sendToUser } from './users';
import { getCurrentNumberOfAdministrations, getPreviousNumberOfAdministrations, saveCurrentNumberOfAdministrations } from './administrations';
global.Intl = require('intl');



const app = express()
app.use(bodyParser.json({ strict: false }));




app.post('/bot', async (req, res) => {
    const { text, chat, from } = req.body?.message;

    if (text === '/start') {
        try {
            await saveUser(chat);
            await sendToUser(chat.id, `Ok ${chat.first_name || `@${chat.username}`}! 
Ti invierò aggiornamenti automatici riguardo l'andamento della vaccinazione in Italia.

Se vuoi interrompere gli aggiornamenti scrivimi /stop`)
            const previousAdministrationItaly = await getPreviousNumberOfAdministrations()
            await notifyUsers(previousAdministrationItaly, [chat.id])
        } catch (error) {
            await sendToUser(chat.id, `Ops ${chat.first_name || `@${chat.username}`}, c'è stato un problema, per favore prova ancora ad inviare /start`)
        }
    }
    if (text === '/stop') {
        try {
            await deleteUser(chat);
            await sendToUser(chat.id, `Ok ${chat.first_name || `@${chat.username}`}! 
Non ti invierò più aggiornamenti automatici riguardo l'andamento della vaccinazione in Italia. 

Se cambi idea scrivimi /start`)
        } catch (error) {
            await sendToUser(chat.id, `Ops ${chat.first_name || `@${chat.username}`}, c'è stato un problema, per favore prova ancora ad inviare /stop`)
        }
    }
    console.log(text, chat, from)
    res.sendStatus(200)
})






const crawl = async (req, res) => {
    const { total: currentAdministrationItaly, lastDate } = await getCurrentNumberOfAdministrations()
    const previousAdministrationItaly = await getPreviousNumberOfAdministrations()
    if (currentAdministrationItaly > previousAdministrationItaly) {
        console.log('Saving new administrations since the number changed', previousAdministrationItaly, currentAdministrationItaly)
        await saveCurrentNumberOfAdministrations(currentAdministrationItaly, lastDate)
        await notifyUsers(currentAdministrationItaly);
    } else {
        console.log('No changes in administrations since the last time I checked', previousAdministrationItaly, currentAdministrationItaly)
    }


    if (res.send) {
        res.send({
            currentAdministrationItaly, previousAdministrationItaly
        })
    }
}

app.get('/crawl', crawl)

module.exports.handler = serverless(app)

module.exports.crawl = crawl