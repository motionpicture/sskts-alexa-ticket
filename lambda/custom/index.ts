/* eslint-disable  func-names */
/* eslint-disable  no-console */

import * as  ssktsapi from '@motionpicture/sskts-api-nodejs-client';
import * as Alexa from 'ask-sdk-core';
import { IntentRequest, SessionEndedRequest } from 'ask-sdk-model';
import * as moment from 'moment';

// Alexaスキルアプリでアカウントリンク設定が完了済の想定でこのコードは動作します。
const authClient = new ssktsapi.auth.OAuth2({
    domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.API_CLIENT_ID,
    clientSecret: <string>process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
authClient.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN
});
console.log('authClient:', authClient);

enum OrderState {
    Start = 'Start',
    DateFixed = 'DateFixed',
    EventFixed = 'EventFixed'
}

const LaunchRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome to the Alexa Skills Kit, you can say hello!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    },
};

const HelloWorldIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speechText = 'こんにちは';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    },
};

const HelpIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'こんにちは。と言ってみてください。';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    },
};

const CancelAndStopIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'さようなら';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    },
};

/**
 * 注文開始ハンドラー
 */
const StartOrderIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        // const session = handlerInput.attributesManager.getSessionAttributes();
        // const state = session.state;
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'StartOrder';
        // && state === OrderState.Start;
    },
    async handle(handlerInput) {
        // const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const { requestEnvelope, attributesManager } = handlerInput;
        const request = <IntentRequest>requestEnvelope.request;

        console.log('request.intent.slots:', request.intent.slots);
        const date = (request.intent.slots !== undefined) ? request.intent.slots.Date.value : undefined;

        // 日付の指定がなければ質問
        if (date === undefined) {
            attributesManager.setSessionAttributes({
                eventDate: date,
                state: OrderState.Start
            });

            const speechText = 'いつ見ますか？';
            const repromptText = 'もう一度おっしゃってください';

            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(repromptText)
                .getResponse();
        } else {
            // 日付の指定があればイベント検索
            // イベント検索
            const eventService = new ssktsapi.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: authClient
            });
            let events = await eventService.searchIndividualScreeningEvent({
                startFrom: moment(`${date}T00:00:00+09:00`).toDate(),
                startThrough: moment(`${date}T00:00:00+09:00`).add(1, 'day').toDate()
            });
            // tslint:disable-next-line:no-magic-numbers
            events = events.slice(0, 3);

            attributesManager.setSessionAttributes({
                eventDate: date,
                state: OrderState.DateFixed
            });

            const speechText = `${date}の上映作品は以下の通りです。
<break time="500ms"/>
${events.map((e) => `${moment(e.startDate).format('HH:mm')}<break time="500ms"/>${e.workPerformed.name}<break time="1000ms"/>`)}
何をご覧になりますか？`;

            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(speechText)
                .getResponse();
        }
    }
};

/**
 * イベント開始日受取ハンドラー
 */
const GetEventStartDateIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        // const session = handlerInput.attributesManager.getSessionAttributes();
        // const state = session.state;
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'GetEventStartDate';
        // && state === OrderState.Start;
    },
    async handle(handlerInput) {
        // const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const { requestEnvelope, attributesManager } = handlerInput;
        const request = <IntentRequest>requestEnvelope.request;

        if (request.intent.slots === undefined) {
            throw new Error('スロットが見つかりません');
        }
        console.log('request.intent.slots:', request.intent.slots);
        const date = request.intent.slots.Date.value

        // イベント検索
        const eventService = new ssktsapi.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: authClient
        });
        let events = await eventService.searchIndividualScreeningEvent({
            startFrom: moment(`${date}T00:00:00+09:00`).toDate(),
            startThrough: moment(`${date}T00:00:00+09:00`).add(1, 'day').toDate()
        });
        // tslint:disable-next-line:no-magic-numbers
        events = events.slice(0, 3);

        attributesManager.setSessionAttributes({
            eventDate: date,
            state: OrderState.DateFixed
        });

        const speechText = `${date}の上映作品は以下の通りです。
<break time="500ms"/>
${events.map((e) => `${moment(e.startDate).format('HH:mm')}<break time="500ms"/>${e.workPerformed.name}<break time="1000ms"/>`)}
何をご覧になりますか？`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// const secondHandlers: Alexa.Handlers<any> = Alexa.CreateStateHandler(OrderState.DateFixed, {
//     'FixEvent': async function () {
//         // const date = this.event.attributes.eventDate;
//         const date = this.attributes.eventDate;
//         const movieName = this.event.request.intent.slots.MovieName.value;

//         // イベント検索
//         const eventService = new ssktsapi.service.Event({
//             endpoint: <string>process.env.API_ENDPOINT,
//             auth: authClient
//         });
//         let events = await eventService.searchIndividualScreeningEvent({
//             startFrom: moment(`${date}T00:00:00+09:00`).toDate(),
//             startThrough: moment(`${date}T00:00:00+09:00`).add(1, 'day').toDate()
//         });
//         // tslint:disable-next-line:no-magic-numbers
//         events = events.slice(0, 3);

//         this.attributes.eventDate = date;
//         this.attributes.movieName = movieName;
//         this.handler.state = OrderState.EventFixed;
//         this.emit(':ask', `<p>以下の通り注文を受け付けます。</p>
// <p>${moment(events[0].startDate).format('YYYY-MM-DD HH:mm')}</p>
// <p>${movieName}</p>
// <p>決済方法<break time="500ms"/>クレジットカード</p>
// <p>よろしいですか？</p>`);
//     }
// });

// const thirdHandlers: Alexa.Handlers<any> = Alexa.CreateStateHandler(OrderState.EventFixed, {
//     'ConfirmOrder': async function () {
//         this.handler.state = undefined;
//         this.emit(':tell', `座席を予約しました。
// ご来場お待ちしております。`);
//     }
// });

const SessionEndedRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        //クリーンアップロジックをここに追加しますe
        console.log(`Session ended with reason: ${(<SessionEndedRequest>handlerInput.requestEnvelope.request).reason}`);

        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler: Alexa.ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command. Please say again.')
            .reprompt('Sorry, I can\'t understand the command. Please say again.')
            .getResponse();
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        StartOrderIntentHandler,
        GetEventStartDateIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
