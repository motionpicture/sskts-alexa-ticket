"use strict";
/* eslint-disable  func-names */
/* eslint-disable  no-console */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ssktsapi = require("@motionpicture/sskts-api-nodejs-client");
const Alexa = require("ask-sdk-core");
const moment = require("moment");
// Alexaスキルアプリでアカウントリンク設定が完了済の想定でこのコードは動作します。
const authClient = new ssktsapi.auth.OAuth2({
    domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.API_CLIENT_ID,
    clientSecret: process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
authClient.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN
});
console.log('authClient:', authClient);
var OrderState;
(function (OrderState) {
    OrderState["Start"] = "Start";
    OrderState["DateFixed"] = "DateFixed";
    OrderState["EventFixed"] = "EventFixed";
})(OrderState || (OrderState = {}));
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
function searchEvents(searchConditions) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = 'いつご覧になりますか？';
        const eventService = new ssktsapi.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: authClient
        });
        const placeService = new ssktsapi.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: authClient
        });
        // 日付の指定がなければ質問
        if (searchConditions.date === undefined) {
            result = 'いつご覧になりますか？';
        }
        else {
            if (searchConditions.theater === undefined) {
                // 劇場未指定であれば質問
                result = `利用可能な劇場は以下の通りです。
${theaters.map((t) => `<break time="500ms"/>${t.name}`)}
<break time="500ms"/>どこでご覧になりますか？
`;
            }
            else {
                if (searchConditions.movie === undefined) {
                    // 作品未指定であれば質問
                    const movieTheater = yield placeService.findMovieTheater({ branchCode: searchConditions.theater });
                    let events = yield eventService.searchIndividualScreeningEvent({
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
            && searchConditions.movie !== undefined) {
            const movieName = searchConditions.movie;
            const movieTheater = yield placeService.findMovieTheater({ branchCode: searchConditions.theater });
            let events = yield eventService.searchIndividualScreeningEvent({
                superEventLocationIdentifiers: [movieTheater.identifier],
                startFrom: moment(`${searchConditions.date}T00:00:00+09:00`).toDate(),
                startThrough: moment(`${searchConditions.date}T00:00:00+09:00`).add(1, 'day').toDate()
            });
            // 検索ワードでイベント検索
            events = events.filter((e) => {
                const regex = new RegExp(movieName);
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
            }
            else {
                result = `${searchConditions.date}
<break time="500ms"/>${movieTheater.name.ja}における
<break time="500ms"/>${movieName}のスケジュールは以下の通りです。
${events.map((e) => `<break time="1000ms"/>${moment(e.startDate).format('HH:mm')}<break time="500ms"/>${e.name.ja}`)}
<break time="500ms"/>どちらをご覧になりますか？`;
            }
        }
        return result;
    });
}
/**
 * スキル呼び出しハンドラー
 */
const LaunchRequestHandler = {
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
const HelloWorldIntentHandler = {
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
const HelpIntentHandler = {
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
const CancelAndStopIntentHandler = {
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
const StartOrderIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'StartOrder';
    },
    handle(handlerInput) {
        return __awaiter(this, void 0, void 0, function* () {
            // const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
            const { requestEnvelope, attributesManager } = handlerInput;
            const request = requestEnvelope.request;
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
            let speechText = yield searchEvents({
                date: sessionAttributes.eventDate,
                theater: sessionAttributes.theater,
                movie: sessionAttributes.movie,
            });
            // 検索条件をセッションに保管
            attributesManager.setSessionAttributes(sessionAttributes);
            return handlerInput.responseBuilder.speak(speechText).reprompt(speechText).getResponse();
        });
    }
};
/**
 * イベント確定ハンドラー
 */
const FixEventIntentHandler = {
    canHandle(handlerInput) {
        const session = handlerInput.attributesManager.getSessionAttributes();
        const state = session.state;
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'FixEvent'
            && state === OrderState.DateFixed;
    },
    handle(handlerInput) {
        return __awaiter(this, void 0, void 0, function* () {
            // const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
            const { requestEnvelope, attributesManager } = handlerInput;
            const request = requestEnvelope.request;
            if (request.intent.slots === undefined) {
                throw new Error('スロットが見つかりません');
            }
            console.log('request.intent.slots:', request.intent.slots);
            const what = request.intent.slots.movie.value;
            const session = handlerInput.attributesManager.getSessionAttributes();
            const eventDate = session.eventDate;
            // イベント検索
            const eventService = new ssktsapi.service.Event({
                endpoint: process.env.API_ENDPOINT,
                auth: authClient
            });
            let events = yield eventService.searchIndividualScreeningEvent({
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
        });
    }
};
/**
 * Yesハンドラー
 */
const YesIntentHandler = {
    canHandle(handlerInput) {
        const session = handlerInput.attributesManager.getSessionAttributes();
        const state = session.state;
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
            && state === OrderState.EventFixed;
    },
    handle(handlerInput) {
        return __awaiter(this, void 0, void 0, function* () {
            // const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
            const { attributesManager } = handlerInput;
            // const request = <IntentRequest>requestEnvelope.request;
            const sessionAttribute = {};
            attributesManager.setSessionAttributes(sessionAttribute);
            const speechText = `座席を予約しました。
ご来場お待ちしております。`;
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(speechText)
                .getResponse();
        });
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // クリーンアップロジックをここに追加しますe
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    },
};
const ErrorHandler = {
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
    .addRequestHandlers(LaunchRequestHandler, HelloWorldIntentHandler, HelpIntentHandler, CancelAndStopIntentHandler, SessionEndedRequestHandler, YesIntentHandler, FixEventIntentHandler, StartOrderIntentHandler)
    .addErrorHandlers(ErrorHandler)
    .lambda();
