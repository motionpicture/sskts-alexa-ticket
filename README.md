# Alexaチケット

Alexaでチケットを管理できるアプリケーションです。

## Table of contents

* [Usage](#usage)
* [License](#license)

## Usage

1. AWS認証情報をセット
2. デプロイ

```sh
ask deploy
```

### Environment variables

| Name                          | Required | Value | Purpose         |
|-------------------------------|----------|-------|-----------------|
| `API_AUTHORIZE_SERVER_DOMAIN` | true     |       | API認可サーバードメイン   |
| `API_CLIENT_ID`               | true     |       | APIクライアントID     |
| `API_CLIENT_SECRET`           | true     |       | APIクライアントシークレット |
| `API_ENDPOINT`                | true     |       | APIエンドポイント      |

## License

ISC

## Additional Resources

### Community

* [Amazon Developer Forums](https://forums.developer.amazon.com/spaces/165/index.html) - Join the conversation!
* [Hackster.io](https://www.hackster.io/amazon-alexa) - See what others are building with Alexa.

### Tutorials & Guides

* [Voice Design Guide](https://developer.amazon.com/designing-for-voice/) - A great resource for learning conversational and voice user interface design.
* [Codecademy: Learn Alexa](https://www.codecademy.com/learn/learn-alexa) - Learn how to build an Alexa Skill from within your browser with this beginner friendly tutorial on Codecademy!

### Documentation

* [Official Alexa Skills Kit Node.js SDK](https://www.npmjs.com/package/ask-sdk) - The Official Node.js SDK Documentation
* [Official Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html) - Official Alexa Skills Kit Documentation