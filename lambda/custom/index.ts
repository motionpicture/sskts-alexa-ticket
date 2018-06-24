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

const theaters = [
    {
        id: '101',
        name: '池袋'
    },
    {
        id: '112',
        name: '北島'
    },
    {
        id: '118',
        name: '姶良'
    },
    {
        id: '119',
        name: 'ユーカリが丘'
    }
];

async function searchEvents(searchConditions: {
    date?: string;
    theater?: string;
    movie?: string;
}) {
    let result: string = 'いつご覧になりますか？';

    const eventService = new ssktsapi.service.Event({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: authClient
    });
    const placeService = new ssktsapi.service.Place({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: authClient
    });

    // 日付の指定がなければ質問
    if (searchConditions.date === undefined) {
        result = 'いつご覧になりますか？';
    } else {
        if (searchConditions.theater === undefined) {
            // 劇場未指定であれば質問
            result = `利用可能な劇場は以下の通りです。
${theaters.map((t) => `<break time="500ms"/>${t.name}`)}
<break time="500ms"/>どこでご覧になりますか？
`;
        } else {
            if (searchConditions.movie === undefined) {
                // 作品未指定であれば質問
                const movieTheater = await placeService.findMovieTheater({ branchCode: searchConditions.theater });

                let events = await eventService.searchIndividualScreeningEvent({
                    superEventLocationIdentifiers: [movieTheater.identifier],
                    startFrom: moment(`${searchConditions.date}T00:00:00+09:00`).toDate(),
                    startThrough: moment(`${searchConditions.date}T00:00:00+09:00`).add(1, 'day').toDate()
                });
                let workPerformed = events.map((e) => e.superEvent.workPerformed);
                const workPerformedNames = [...new Set(workPerformed.map((p) => p.name))];

                result = `${searchConditions.date}
<break time="500ms"/>${movieTheater.name.ja}における上映作品は以下の通りです。
${workPerformedNames.map((n) => `<break time="500ms"/>${n}`)}
<break time="500ms"/>何をご覧になりますか？
`;
            }
        }
    }

    // 検索条件がそろったらイベント検索
    if (searchConditions.date !== undefined
        && searchConditions.theater !== undefined
        && searchConditions.movie !== undefined
    ) {
        const movieName = searchConditions.movie;
        const movieTheater = await placeService.findMovieTheater({ branchCode: searchConditions.theater });

        let events = await eventService.searchIndividualScreeningEvent({
            superEventLocationIdentifiers: [movieTheater.identifier],
            startFrom: moment(`${searchConditions.date}T00:00:00+09:00`).toDate(),
            startThrough: moment(`${searchConditions.date}T00:00:00+09:00`).add(1, 'day').toDate()
        });

        // 検索ワードでイベント検索
        events = events.filter((e) => {
            const regex = new RegExp(movieName)
            return regex.test(e.name.ja)
                || regex.test(e.name.en)
                || regex.test(e.workPerformed.name)
                || regex.test(e.superEvent.name.ja)
                || regex.test(e.superEvent.name.en)
                || regex.test(e.superEvent.kanaName)
                || regex.test(e.superEvent.alternativeHeadline);
        });

        if (events.length === 0) {
            result = `${searchConditions.date}
<break time="500ms"/>${movieTheater.name.ja}における
<break time="500ms"/>${movieName}のスケジュールは見つかりませんでした。`;
        } else {
            result = `${searchConditions.date}
<break time="500ms"/>${movieTheater.name.ja}における
<break time="500ms"/>${movieName}のスケジュールは以下の通りです。
${events.map((e) => `<break time="1000ms"/>${moment(e.startDate).format('HH:mm')}<break time="500ms"/>${e.name.ja}`)}
<break time="500ms"/>どちらをご覧になりますか？`;
        }
    }

    return result;
}

/**
 * スキル呼び出しハンドラー
 */
const LaunchRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'シネマサンシャインチケットへようこそ。ご用件をおっしゃってください。';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            // .withSimpleCard('Hello World', speechText)
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
        const speechText = 'いつ、どこどこで、何々が見たい、と言ってみてください';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            // .withSimpleCard('Hello World', speechText)
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
            // .withSimpleCard('Hello World', speechText)
            .getResponse();
    },
};

/**
 * 注文開始ハンドラー
 */
const StartOrderIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'StartOrder';
    },
    async handle(handlerInput) {
        // const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const { requestEnvelope, attributesManager } = handlerInput;
        const request = <IntentRequest>requestEnvelope.request;

        const date = (request.intent.slots !== undefined) ? request.intent.slots.date.value : undefined;
        const theater = (request.intent.slots !== undefined
            && request.intent.slots.theater.resolutions !== undefined
            && request.intent.slots.theater.resolutions.resolutionsPerAuthority !== undefined)
            ? request.intent.slots.theater.resolutions.resolutionsPerAuthority[0].values[0].value.id
            : undefined;
        const movie = (request.intent.slots !== undefined) ? request.intent.slots.movie.value : undefined;
        const sessionAttributes = attributesManager.getSessionAttributes();

        // 各検索パラメーターの指定があればセッションに保管
        if (date !== undefined) {
            sessionAttributes.eventDate = date;
            sessionAttributes.theater = undefined;
            sessionAttributes.movie = undefined;
        }
        if (theater !== undefined) {
            sessionAttributes.theater = theater;
        }
        if (movie !== undefined) {
            sessionAttributes.movie = movie;
        }

        let speechText: string = await searchEvents({
            date: sessionAttributes.eventDate,
            theater: sessionAttributes.theater,
            movie: sessionAttributes.movie,
        });

        // 検索条件をセッションに保管
        attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder.speak(speechText).reprompt(speechText).getResponse();
    }
};

/**
 * イベント確定ハンドラー
 */
const FixEventIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        const session = handlerInput.attributesManager.getSessionAttributes();
        const state = session.state;
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'FixEvent'
            && state === OrderState.DateFixed;
    },
    async handle(handlerInput) {
        // const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const { requestEnvelope, attributesManager } = handlerInput;
        const request = <IntentRequest>requestEnvelope.request;

        if (request.intent.slots === undefined) {
            throw new Error('スロットが見つかりません');
        }
        console.log('request.intent.slots:', request.intent.slots);
        const what = request.intent.slots.movie.value

        const session = handlerInput.attributesManager.getSessionAttributes();
        const eventDate = session.eventDate;

        // イベント検索
        const eventService = new ssktsapi.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: authClient
        });
        let events = await eventService.searchIndividualScreeningEvent({
            startFrom: moment(`${eventDate}T00:00:00+09:00`).toDate(),
            startThrough: moment(`${eventDate}T00:00:00+09:00`).add(1, 'day').toDate()
        });
        // tslint:disable-next-line:no-magic-numbers
        events = events.slice(0, 3);

        const sessionAttribute = {
            eventDate: eventDate,
            movieName: what,
            state: OrderState.EventFixed
        };
        attributesManager.setSessionAttributes(sessionAttribute);

        const speechText = `<p>以下の通り注文を受け付けます。</p>
<p>${moment(events[0].startDate).format('YYYY-MM-DD HH:mm')}</p>
<p>${what}</p>
<p>決済方法<break time="500ms"/>クレジットカード</p>
<p>よろしいですか？</p>`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
}

/**
 * Yesハンドラー
 */
const YesIntentHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        const session = handlerInput.attributesManager.getSessionAttributes();
        const state = session.state;
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
            && state === OrderState.EventFixed;
    },
    async handle(handlerInput) {
        // const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const { attributesManager } = handlerInput;
        // const request = <IntentRequest>requestEnvelope.request;

        const sessionAttribute = {
        };
        attributesManager.setSessionAttributes(sessionAttribute);

        const speechText = `座席を予約しました。
ご来場お待ちしております。`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
}

const SessionEndedRequestHandler: Alexa.RequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // クリーンアップロジックをここに追加しますe
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
        const speechText = 'ごめんなさ。よく分かりませんでした。もう一度おっしゃってください。';

        return handlerInput.responseBuilder.speak(speechText).reprompt(speechText).getResponse();
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        YesIntentHandler,
        FixEventIntentHandler,
        StartOrderIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
