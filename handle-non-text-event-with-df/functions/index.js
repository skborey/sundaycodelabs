const functions = require("firebase-functions");
const line = require("@line/bot-sdk");
const express = require("express");
const {
  postToDialogflow,
  createLineTextEvent,
  convertToDialogflow,
} = require("./dialogflow");

const config = {
  channelAccessToken: functions.config().line.channel_access_token,
  channelSecret: functions.config().line.channel_secret,
};
const app = express();
// app.post("/webhook", line.middleware(config), (req, res) => {
//   console.log("req.body", JSON.stringify(req.body, null, 2));
//   res.status(200).end();
// });

app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(
    req.body.events.map((event) => {
      return handleEvent(req, event);
    })
  );
});

async function handleEvent(req, event) {
  switch (event.type) {
    case "message":
      switch (event.message.type) {
        case "text":
          return handleText(req, event);
        case "location":
          return handleLocation(req, event);
      }
    case "postback":
      return handlePostback(req, event);
    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}

async function handleText(req) {
  return await postToDialogflow(req);
}

function handleLocation(req, event) {
  const message = event.message;
  const newEvent = createLineTextEvent(
    req,
    event,
    `LAT : ${message.latitude}, LNG : ${message.longitude}`
  );
  convertToDialogflow(req, newEvent);
}

function handlePostback(req, event) {
  const data = event.postback.data;
  const newEvent = createLineTextEvent(req, event, `DATE: ${data}`);
  convertToDialogflow(req, newEvent);
}

exports.api = functions.region("asia-northeast1").https.onRequest(app);
